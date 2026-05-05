// Helpers de leitura/listagem de registros de diario emocional (M06).
// Cada registro vive em inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md
// com modo 'trigger' ou 'vitoria'.
//
// Criado em M36 para o Recap agregar conquistas (modo='vitoria') e
// crises (modo='trigger') por periodo. Espelha padrao de listarMarcos:
// pasta inexistente => [], arquivos malformados descartados em silencio.
//
// Comentarios sem acento (convencao shell/CI).
import { VAULT_FOLDERS } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';

function joinUri(root: string, rel: string): string {
  const trimmed = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmed}/${rel}`;
}

// Lista todos os registros de diario emocional do Vault. Pasta
// inexistente => []. Ordenacao desc por data (ISO 8601 ordena
// lexicograficamente). Caller filtra por modo conforme necessidade.
export async function listarDiarios(
  vaultRoot: string
): Promise<DiarioEmocionalMeta[]> {
  if (!vaultRoot || vaultRoot.startsWith('web://')) {
    return [];
  }
  const folderUri = joinUri(vaultRoot, VAULT_FOLDERS.inboxMenteDiario);
  const arquivos = await listVaultFolder(folderUri, '.md');

  const lidos: DiarioEmocionalMeta[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, DiarioEmocionalSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return lidos;
}
