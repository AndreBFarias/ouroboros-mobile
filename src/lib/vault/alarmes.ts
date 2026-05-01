// Helpers de leitura, listagem e escrita de alarmes pessoais no Vault
// (M16). Cada alarme vive em alarmes/<slug>.md com frontmatter validado
// pelo AlarmeSchema. Slug e a chave: salvar duas vezes com mesmo slug
// sobrescreve (usado para edicao); slug novo cria arquivo novo.
//
// Comentarios sem acento (convencao shell/CI).
import { alarmesPath, VAULT_FOLDERS } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { AlarmeSchema, type Alarme } from '@/lib/schemas/alarme';

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Lista todos os alarmes do Vault. Pasta inexistente => []. Retorna
// asc por horario (HH:MM lex), depois por titulo, para a tela de
// listagem não mostrar ordem aleatoria de filesystem.
export async function listarAlarmes(vaultRoot: string): Promise<Alarme[]> {
  const folderUri = joinUri(vaultRoot, VAULT_FOLDERS.alarmes);
  const arquivos = await listVaultFolder(folderUri, '.md');

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

// Le um alarme específico por slug. Retorna null se não existir.
export async function lerAlarme(
  vaultRoot: string,
  slug: string
): Promise<Alarme | null> {
  const rel = alarmesPath(slug);
  const uri = joinUri(vaultRoot, rel);
  const result = await readVaultFile(uri, AlarmeSchema);
  return result ? result.meta : null;
}

// Persiste um alarme. Caller fornece meta já validado (revalidamos
// defensivamente). Escreve em alarmes/<slug>.md derivando o nome do
// slug. Body opcional para anotacao livre (tipicamente vazio).
export async function escreverAlarme(
  vaultRoot: string,
  meta: Alarme,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = AlarmeSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`alarme invalido: ${parsed.error.message}`);
  }
  const rel = alarmesPath(parsed.data.slug);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<Alarme>(uri, parsed.data, body);
  return { uri, rel };
}

// Apaga arquivo de alarme. Idempotente: não falha se não existe.
// SAF.deleteAsync no nativo; em Web cai em no-op silencioso (não ha
// vault real). Caller responsável por cancelar schedules antes (caso
// contrario as notificações persistem orfas).
export async function excluirAlarme(
  vaultRoot: string,
  slug: string
): Promise<void> {
  const rel = alarmesPath(slug);
  const uri = joinUri(vaultRoot, rel);
  try {
    await StorageAccessFramework.deleteAsync(uri);
  } catch {
    // Sem arquivo previo ou plataforma sem SAF; ok.
  }
}
