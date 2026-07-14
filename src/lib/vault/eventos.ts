// Helpers de leitura/listagem de eventos (M07). Cada evento vive em
// eventos/YYYY-MM-DD-slug.md com modo 'positivo' ou 'negativo'.
//
// Criado em M36 para o Recap agregar conquistas (modo='positivo') e
// crises (modo='negativo') por periodo. Espelha padrao de listarMarcos.
//
// Comentarios sem acento (convencao shell/CI).
import { MARKDOWN_FOLDER, matchesFeaturePrefix } from '@/lib/vault/paths';
import { listVaultFolder } from '@/lib/vault/reader';
import { readVaultFiles } from '@/lib/vault/leituraLote';
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
//
// R-AUDIT-VAULT-PERF: `opts.listagem` (aditivo/retrocompativel) reusa a
// listagem unica de markdown/ do ciclo; leitura serial trocada por
// readVaultFiles (lote). Saida/ordenacao inalteradas.
export async function listarEventos(
  vaultRoot: string,
  opts?: { listagem?: string[] }
): Promise<EventoMeta[]> {
  if (!vaultRoot) {
    return [];
  }
  const todos =
    opts?.listagem ??
    (await listVaultFolder(joinUri(vaultRoot, MARKDOWN_FOLDER), '.md'));
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'evento-')
  );

  const lidos = (await readVaultFiles(arquivos, EventoSchema)).map(
    (r) => r.parsed.meta
  );

  lidos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return lidos;
}
