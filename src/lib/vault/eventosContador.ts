// Vault helper para listagem e leitura de eventos de Contador
// (R-RECAP-5, 2026-05-16). Cada evento vive em
//   markdown/evento-contador-<contadorId>-<YYYY-MM-DD>-<slug>-<deviceId>.md
//
// Filtragem por prefixo "evento-contador-<contadorId>-" permite agrupar
// todos os eventos do mesmo contador independente da data. Ordenacao
// padrao: desc por criado_em (mais recente primeiro), como o resto do
// recap.
//
// Padroes reutilizados:
//   - listVaultFolder: enumera URIs sob a pasta markdown/.
//   - readVaultFile: parseia frontmatter + body, valida via schema.
//   - ehSyncConflict: filtra arquivos "*-sync-conflict-*" do Syncthing.
//   - matchesFeaturePrefix: confirma prefixo da feature no filename.
//
// Comentarios sem acento (convencao shell/CI).
import {
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import {
  EventoContadorSchema,
  type EventoContador,
} from '@/lib/schemas/evento_contador';

// Lista todos os eventos de um Contador especifico. Ordenacao desc
// por criado_em (mais recente primeiro). Pasta inexistente => [].
export async function listarEventosContador(
  vaultRoot: string,
  contadorId: string
): Promise<EventoContador[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');

  // Prefixo do filename: "evento-contador-<contadorId>-".
  // matchesFeaturePrefix checa apos a ultima barra da URI.
  const prefixoContador = `evento-contador-${contadorId}-`;
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, prefixoContador)
  );

  const lidos: EventoContador[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, EventoContadorSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados (parsing falha silenciosa).
    }
  }

  // Ordena desc por criado_em (mais recente primeiro). Empate raro
  // dado o ISO datetime com segundos; localeCompare pra estabilidade.
  lidos.sort((a, b) => {
    if (a.criado_em === b.criado_em) {
      return a.slug.localeCompare(b.slug);
    }
    return a.criado_em < b.criado_em ? 1 : -1;
  });
  return lidos;
}

// Lista todos os eventos de TODOS os contadores (uso futuro: recap
// agregado por mes/ano). Por padrao nao usado pela tela de detalhe.
export async function listarTodosEventosContador(
  vaultRoot: string
): Promise<EventoContador[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');

  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'evento-contador-')
  );

  const lidos: EventoContador[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, EventoContadorSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidos.sort((a, b) => {
    if (a.criado_em === b.criado_em) {
      return a.slug.localeCompare(b.slug);
    }
    return a.criado_em < b.criado_em ? 1 : -1;
  });
  return lidos;
}
