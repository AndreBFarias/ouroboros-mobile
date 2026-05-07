// Helpers de leitura, listagem, escrita e exclusao de marcos no
// Vault (M11). Cada marco vive em marcos/YYYY-MM-DD-<slug>.md com
// frontmatter validado pelo MarcoSchema.
//
// Lixeira soft em cacheDirectory/lixeira/marcos/. Listagem com
// filtro opcional por autor; ordenacao desc por data.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import {
  marcoPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { MarcoSchema, type Marco } from '@/lib/schemas/marco';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export interface ListarMarcosFiltros {
  autor?: PessoaAutor | null;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

export async function listarMarcos(
  vaultRoot: string,
  filtros: ListarMarcosFiltros = {}
): Promise<Marco[]> {
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter((u) => matchesFeaturePrefix(u, 'marco-'));

  const lidos: Marco[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, MarcoSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  let filtrados = lidos;
  if (filtros.autor) {
    const a = filtros.autor;
    filtrados = filtrados.filter((m) => m.autor === a);
  }

  filtrados.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return filtrados;
}

export async function escreverMarco(
  vaultRoot: string,
  slug: string,
  meta: Marco,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = MarcoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`marco invalido: ${parsed.error.message}`);
  }
  const dataDate = new Date(parsed.data.data);
  const rel = marcoPath(dataDate, slug);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<Marco>(uri, parsed.data, body);
  return { uri, rel };
}

export async function excluirMarco(
  vaultRoot: string,
  rel: string
): Promise<{ lixeiraPath: string }> {
  const origemUri = joinUri(vaultRoot, rel);
  const cacheBase = FileSystem.cacheDirectory ?? 'cache://';
  const lixeiraDir = `${cacheBase}lixeira/marcos/`;
  try {
    await FileSystem.makeDirectoryAsync(lixeiraDir, { intermediates: true });
  } catch {
    // Já existe.
  }

  const ts = formatTimestampLixeira(new Date());
  const nomeArquivo = rel.split('/').pop() ?? 'marco.md';
  const lixeiraPath = `${lixeiraDir}${ts}-${nomeArquivo}`;

  let raw: string;
  try {
    raw = await StorageAccessFramework.readAsStringAsync(origemUri);
    await FileSystem.writeAsStringAsync(lixeiraPath, raw);
    await StorageAccessFramework.deleteAsync(origemUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`falha ao mover para lixeira: ${msg}`);
  }
  return { lixeiraPath };
}

function formatTimestampLixeira(date: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(date.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}
