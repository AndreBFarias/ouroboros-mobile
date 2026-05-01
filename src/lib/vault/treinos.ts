// Helpers de leitura, listagem, escrita e exclusao de sessoes de
// treino formal no Vault (M11). Cada sessao vive em
// treinos/YYYY-MM-DD-<slug>.md com frontmatter validado pelo
// TreinoSessaoSchema.
//
// Exclusao usa lixeira soft em
// cacheDirectory/lixeira/treinos/<timestamp>-<slug>.md, mesmo padrao
// adotado por exercicios na M13.
//
// Listagem aplica filtro opcional por pessoa (via campo autor) e
// devolve sessoes ordenadas por data desc.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { treinosPath, VAULT_FOLDERS } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export interface ListarTreinosFiltros {
  // Filtra por autor da sessao. null = qualquer autor.
  autor?: PessoaAutor | null;
}

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Lista todas as sessoes de treino do Vault aplicando filtros
// opcionais. Pasta inexistente => [] silenciosamente.
export async function listarTreinos(
  vaultRoot: string,
  filtros: ListarTreinosFiltros = {}
): Promise<TreinoSessao[]> {
  const folderUri = joinUri(vaultRoot, VAULT_FOLDERS.treinos);
  const arquivos = await listVaultFolder(folderUri, '.md');

  const lidos: TreinoSessao[] = [];
  for (const arquivoUri of arquivos) {
    // Pula drafts (treinos/draft/...). Drafts da M13 sao migrados em
    // boot por migrarDraftsParaTreinoSessao; depois disso a pasta de
    // drafts fica vazia. Mesmo assim filtramos defensivamente para
    // nao parsear estrutura antiga durante a janela de migracao.
    const decoded = decodeURIComponent(arquivoUri);
    if (decoded.includes('/treinos/draft/')) continue;

    try {
      const result = await readVaultFile(arquivoUri, TreinoSessaoSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Arquivo invalido; ignora silenciosamente.
    }
  }

  let filtradas = lidos;
  if (filtros.autor) {
    const a = filtros.autor;
    filtradas = filtradas.filter((s) => s.autor === a);
  }

  // Ordenacao desc por data ISO (lexicografica ja respeita ordem).
  filtradas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return filtradas;
}

// Cria ou atualiza uma sessao de treino. Caller fornece slug como
// parte do path; dentro do meta nao ha slug. A combinacao data +
// slug forma o nome do arquivo.
export async function escreverTreino(
  vaultRoot: string,
  slug: string,
  meta: TreinoSessao,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = TreinoSessaoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`treino invalido: ${parsed.error.message}`);
  }
  const dataDate = new Date(parsed.data.data);
  const rel = treinosPath(dataDate, slug);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<TreinoSessao>(uri, parsed.data, body);
  return { uri, rel };
}

// Move sessao para lixeira soft. Path da lixeira incluindo timestamp
// + slug. Caller informa rel (path relativo do .md original) para
// reconstruir o URI absoluto e localizar o arquivo.
export async function excluirTreino(
  vaultRoot: string,
  rel: string
): Promise<{ lixeiraPath: string }> {
  const origemUri = joinUri(vaultRoot, rel);
  const cacheBase = FileSystem.cacheDirectory ?? 'cache://';
  const lixeiraDir = `${cacheBase}lixeira/treinos/`;
  try {
    await FileSystem.makeDirectoryAsync(lixeiraDir, { intermediates: true });
  } catch {
    // Ja existe.
  }

  const ts = formatTimestampLixeira(new Date());
  // Slug deriva do nome do arquivo (ultimo segmento sem .md).
  const nomeArquivo = rel.split('/').pop() ?? 'treino.md';
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
