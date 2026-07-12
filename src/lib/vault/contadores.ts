// Helpers de leitura, listagem, escrita e exclusao de contadores no
// Vault (M18). Cada contador vive em markdown/contador-<slug>.md com
// frontmatter validado pelo ContadorSchema. Slug e a chave: salvar
// duas vezes com mesmo slug sobrescreve (usado para edicao); slug
// novo cria arquivo novo.
//
// registrarReset coordena: ler contador atual -> calcular dias atuais
// via diasEntre(início, agora) -> comparar com recorde -> atualizar
// recorde se atual > recorde -> adicionar timestamp ao array resets
// -> atualizar início = today() -> reescrever .md. Histórico nunca
// e' apagado (decisão durável dono 2026-05-03 BRIEF §1.8): reset
// preserva todos os timestamps anteriores em resets[] e recorde so
// sobe (Math.max), nunca diminui. Apagar definitivo so via
// excluirContador (long-press + confirm explicito na UI).
//
// I-CONTADOR (M-SAVE-CONTADOR-VALIDA, 2026-05-07): migra joinUri
// local para vaultUriJoin canonico (H1 do plano golden-zebra).
// Helper canonico (paths.ts:27) limpa trailing whitespace/%20/'/'
// que SAF aplicava em runtime real (sintoma A29 em OEMs MIUI/OneUI).
//
// Comentarios sem acento (convencao shell/CI).
import { StorageAccessFramework } from 'expo-file-system/legacy';
// Imports apontam para modulos finais (não para o barrel @/lib/vault)
// para evitar ciclo de carregamento.
import {
  contadorPath,
  formatDateYmd,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import { ContadorSchema, type Contador } from '@/lib/schemas/contador';
import { diasEntre } from '@/lib/util/diasEntre';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

// Lista todos os contadores do Vault. Pasta inexistente => []. Retorna
// asc por titulo (localeCompare PT-BR) para a tela de listagem não
// mostrar ordem aleatoria de filesystem.
export async function listarContadores(vaultRoot: string): Promise<Contador[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'contador-')
  );

  const lidos: Contador[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, ContadorSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidos.sort((a, b) =>
    a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' })
  );
  return lidos;
}

// Le um contador específico por slug do device atual. T2-LOCK-VAULT
// (2026-05-15): saves sempre suffixam '-<deviceId>'; leitura agora
// busca pelo arquivo com suffix do device atual. Fallback no path
// canonico (sem suffix) para legado pre-migration, onde arquivos
// criados antes da T2 ainda existem sem suffix no Vault.
export async function lerContador(
  vaultRoot: string,
  slug: string
): Promise<Contador | null> {
  const relCanonico = contadorPath(slug);
  const deviceId = await getDeviceId();
  const relComSuffix = forceDeviceIdSuffix(relCanonico, deviceId);
  // T2: tenta arquivo deste device primeiro.
  const uriComSuffix = vaultUriJoin(vaultRoot, relComSuffix);
  const resultSuffix = await readVaultFile(uriComSuffix, ContadorSchema);
  if (resultSuffix) return resultSuffix.meta;
  // Fallback legado: arquivo canonico sem suffix (pre-T2 ou pre-migration).
  const uriCanonico = vaultUriJoin(vaultRoot, relCanonico);
  const resultCanonico = await readVaultFile(uriCanonico, ContadorSchema);
  return resultCanonico ? resultCanonico.meta : null;
}

// Persiste um contador. Caller fornece meta já validado (revalidamos
// defensivamente). Body opcional para anotacao livre (motivo opcional
// em prosa, conforme spec seção 3).
//
// T2-LOCK-VAULT (2026-05-15): suffix '-<deviceId>' aplicado sempre,
// eliminando race condition read-then-write entre devices via
// Syncthing. O parametro legado `modoCriacao` foi removido por perder
// sentido (sempre suffix). Callers de criacao e edicao agora chamam
// a mesma assinatura simples; cada device tem seu proprio arquivo.
export async function escreverContador(
  vaultRoot: string,
  meta: Contador,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = ContadorSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`contador invalido: ${parsed.error.message}`);
  }
  const relCanonico = contadorPath(parsed.data.slug);
  const deviceId = await getDeviceId();
  const rel = forceDeviceIdSuffix(relCanonico, deviceId);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<Contador>(uri, parsed.data, body);
  return { uri, rel };
}

// Apaga arquivo de contador. Idempotente: não falha se não existe.
// T2-LOCK-VAULT (2026-05-15): tenta apagar tanto o arquivo canonico
// (legado pre-migration) quanto o com suffix do device atual. Em Web,
// no-op silencioso (não ha vault real).
export async function excluirContador(
  vaultRoot: string,
  slug: string
): Promise<void> {
  const relCanonico = contadorPath(slug);
  const deviceId = await getDeviceId();
  const relComSuffix = forceDeviceIdSuffix(relCanonico, deviceId);
  // Tenta apagar ambos: legado (pre-migration) e do device atual (T2).
  for (const rel of [relComSuffix, relCanonico]) {
    const uri = vaultUriJoin(vaultRoot, rel);
    try {
      await StorageAccessFramework.deleteAsync(uri);
    } catch {
      // Sem arquivo previo ou plataforma sem SAF; ok.
    }
  }
}

// Registra um reset no contador. Coordenacao:
//  1. Le contador atual.
//  2. Calcula dias atuais = diasEntre(início, agora).
//  3. Compara com recorde; recorde não diminui (Math.max).
//  4. Adiciona timestamp ao array resets.
//  5. Atualiza início = data de hoje (YYYY-MM-DD em UTC-3).
//  6. Reescreve o .md preservando body.
//
// Retorna o contador atualizado para o caller refletir na UI.
export async function registrarReset(
  vaultRoot: string,
  slug: string,
  agora: Date = new Date()
): Promise<Contador> {
  const atual = await lerContador(vaultRoot, slug);
  if (!atual) {
    throw new Error(`contador nao encontrado: ${slug}`);
  }

  const diasAtuais = diasEntre(atual.inicio, agora);
  const novoRecorde = Math.max(atual.recorde, diasAtuais < 0 ? 0 : diasAtuais);

  const atualizado: Contador = {
    ...atual,
    recorde: novoRecorde,
    resets: [...atual.resets, agora.toISOString()],
    inicio: formatDateYmd(agora),
  };

  await escreverContador(vaultRoot, atualizado);
  return atualizado;
}
