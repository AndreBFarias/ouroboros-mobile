// Helpers de leitura/listagem de eventos (M07). Cada evento vive em
// eventos/YYYY-MM-DD-slug.md com modo 'positivo' ou 'negativo'.
//
// Criado em M36 para o Recap agregar conquistas (modo='positivo') e
// crises (modo='negativo') por periodo. Espelha padrao de listarMarcos.
//
// Comentarios sem acento (convencao shell/CI).
import { MARKDOWN_FOLDER, matchesFeaturePrefix } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';

function joinUri(root: string, rel: string): string {
  const trimmed = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmed}/${rel}`;
}

// Lista todos os eventos do Vault (H2 layout-por-tipo). Le markdown/
// filtrando por prefixo 'evento-'. Pasta inexistente => []. Ordenacao
// desc por data ISO 8601.
//
// V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA, 2026-05-08): early return
// para 'web://...' removido. Reader em web __DEV__ delega ao
// useVaultMock (V4.0).
export async function listarEventos(vaultRoot: string): Promise<EventoMeta[]> {
  if (!vaultRoot) {
    return [];
  }
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'evento-')
  );

  const lidos: EventoMeta[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, EventoSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return lidos;
}
