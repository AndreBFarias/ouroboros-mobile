// Helpers de leitura, listagem e escrita de alarmes pessoais no Vault
// (M16). Cada alarme vive em markdown/alarme-<slug>.md com frontmatter
// validado pelo AlarmeSchema (H2 layout-por-tipo, ADR-0023). Slug e a
// chave: salvar duas vezes com mesmo slug sobrescreve (usado para
// edicao); slug novo cria arquivo novo.
//
// I-ALARME (M-SAVE-ALARME-VALIDA, 2026-05-07): migrou de joinUri local
// para vaultUriJoin canonico (H1 do plano golden-zebra). Helper canonico
// trata trailing whitespace + barras duplas + percent-encoding ofensivo
// (%20) que vinha contaminando saves em OEMs MIUI/OneUI/HyperOS (A29).
//
// Comentarios sem acento (convencao shell/CI).
import {
  alarmePath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { AlarmeSchema, type Alarme } from '@/lib/schemas/alarme';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

// Lista todos os alarmes do Vault. Pasta inexistente => []. Retorna
// asc por horario (HH:MM lex), depois por titulo, para a tela de
// listagem não mostrar ordem aleatoria de filesystem.
export async function listarAlarmes(vaultRoot: string): Promise<Alarme[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'alarme-')
  );

  const lidos: Alarme[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, AlarmeSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidos.sort((a, b) => {
    if (a.horario !== b.horario) return a.horario < b.horario ? -1 : 1;
    // localeCompare PT-BR ordena 'Água' antes de 'Medicação'; comparacao
    // direta de strings cairia em codepoint (193 > 77) e inverteria.
    return a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' });
  });
  return lidos;
}

// Le um alarme específico por slug do device atual. T2-LOCK-VAULT
// (2026-05-15): saves sempre suffixam '-<deviceId>'; leitura busca
// pelo arquivo com suffix do device atual primeiro, com fallback no
// canonico (legado pre-migration).
export async function lerAlarme(
  vaultRoot: string,
  slug: string
): Promise<Alarme | null> {
  const relCanonico = alarmePath(slug);
  const deviceId = await getDeviceId();
  const relComSuffix = forceDeviceIdSuffix(relCanonico, deviceId);
  // T2: tenta arquivo deste device primeiro.
  const uriComSuffix = vaultUriJoin(vaultRoot, relComSuffix);
  const resultSuffix = await readVaultFile(uriComSuffix, AlarmeSchema);
  if (resultSuffix) return resultSuffix.meta;
  // Fallback legado: arquivo canonico sem suffix.
  const uriCanonico = vaultUriJoin(vaultRoot, relCanonico);
  const resultCanonico = await readVaultFile(uriCanonico, AlarmeSchema);
  return resultCanonico ? resultCanonico.meta : null;
}

// Persiste um alarme. Caller fornece meta já validado (revalidamos
// defensivamente). Escreve em alarmes/<slug>.md derivando o nome do
// slug. Body opcional para anotacao livre (tipicamente vazio).
//
// T2-LOCK-VAULT (2026-05-15): suffix '-<deviceId>' aplicado sempre,
// eliminando race condition read-then-write entre devices via
// Syncthing. O parametro legado `modoCriacao` foi removido por perder
// sentido (sempre suffix). Callers de criacao e edicao agora chamam
// a mesma assinatura simples; cada device tem seu proprio arquivo.
export async function escreverAlarme(
  vaultRoot: string,
  meta: Alarme,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = AlarmeSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`alarme invalido: ${parsed.error.message}`);
  }
  const relCanonico = alarmePath(parsed.data.slug);
  const deviceId = await getDeviceId();
  const rel = forceDeviceIdSuffix(relCanonico, deviceId);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<Alarme>(uri, parsed.data, body);
  return { uri, rel };
}

// Apaga arquivo de alarme. Idempotente: não falha se não existe.
// T2-LOCK-VAULT (2026-05-15): tenta apagar tanto o arquivo canonico
// (legado pre-migration) quanto o com suffix do device atual. Em Web,
// no-op silencioso. Caller responsável por cancelar schedules antes
// (caso contrario as notificações persistem orfas).
export async function excluirAlarme(
  vaultRoot: string,
  slug: string
): Promise<void> {
  const relCanonico = alarmePath(slug);
  const deviceId = await getDeviceId();
  const relComSuffix = forceDeviceIdSuffix(relCanonico, deviceId);
  // Tenta apagar ambos: legado (pre-migration) e do device atual.
  for (const rel of [relComSuffix, relCanonico]) {
    const uri = vaultUriJoin(vaultRoot, rel);
    try {
      await StorageAccessFramework.deleteAsync(uri);
    } catch {
      // Sem arquivo previo ou plataforma sem SAF; ok.
    }
  }
}
