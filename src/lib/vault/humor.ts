// Helpers de leitura/listagem de registros de humor diario (M05).
// Cada registro vive em daily/YYYY-MM-DD.md (canonico) ou em
// daily/YYYY-MM-DD-pessoa_a.md / -pessoa_b.md quando ha conflito
// Syncthing entre dois dispositivos (Armadilha A5).
//
// Criado em M36 para o Recap agregar humor por periodo. Espelha o
// padrao de listarMarcos / listarTarefas: pasta inexistente => [],
// arquivos malformados sao descartados silenciosamente.
//
// Comentarios sem acento (convencao shell/CI).
import { MARKDOWN_FOLDER, matchesFeaturePrefix } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';

function joinUri(root: string, rel: string): string {
  const trimmed = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmed}/${rel}`;
}

// Lista todos os registros de humor do Vault (layout-por-tipo H2).
// Le markdown/ e filtra por prefixo 'humor-'. Pasta ausente => [].
// Ordenacao desc por data (mais recente primeiro), preservando ordem
// de leitura dentro do mesmo dia (caso 2 pessoas tenham gravado).
export async function listarHumor(vaultRoot: string): Promise<HumorMeta[]> {
  if (!vaultRoot || vaultRoot.startsWith('web://')) {
    return [];
  }
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter((u) => matchesFeaturePrefix(u, 'humor-'));

  const lidos: HumorMeta[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, HumorSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return lidos;
}
