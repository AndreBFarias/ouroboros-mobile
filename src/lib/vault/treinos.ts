// Helpers de leitura, listagem, escrita e exclusao de sessoes de
// treino formal no Vault (M11). Cada sessao vive em
// treinos/YYYY-MM-DD-HHmm-<slug>.md com frontmatter validado pelo
// TreinoSessaoSchema.
//
// EXE-1 (2026-09-08): a hora entrou no nome (ver treinosPath em
// paths.ts) e a listagem passou a devolver o `rel` real do arquivo em
// listarTreinosComRel, no molde de TarefaListada. Antes disso a UI
// remontava o path a partir do conteudo (data + slugifyTreino(rotina)),
// o que so' funcionava enquanto o nome fosse derivavel do conteudo e
// desalinhava exclusao/edicao assim que o usuario renomeava a rotina.
//
// A listagem e' POR PASTA, nunca por padrao de nome: arquivo em formato
// legado (sem hora) continua listado mesmo antes de a migracao one-shot
// rodar. Filtrar por regex de nome aqui apagaria o historico do usuario
// da tela sem erro nenhum -- o mesmo sintoma que
// migrarVaultLayoutPorTipo.ts:59 ja pagou uma vez.
//
// Exclusao usa lixeira soft em
// cacheDirectory/lixeira/treinos/<timestamp>-<slug>.md, mesmo padrao
// adotado por exercícios na M13.
//
// Listagem aplica filtro opcional por pessoa (via campo autor) e
// devolve sessoes ordenadas por data desc.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { moverArquivoParaLixeira } from '@/lib/vault/remover';
import { treinosPath } from '@/lib/vault/paths';
import { listVaultFolder } from '@/lib/vault/reader';
import { readVaultFiles } from '@/lib/vault/leituraLote';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export interface ListarTreinosFiltros {
  // Filtra por autor da sessao. null = qualquer autor.
  autor?: PessoaAutor | null;
  // R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG: filtra por slug canonico de
  // rotina. Sessoes legadas sem o campo sao ignoradas (backward-compat).
  // Consumido por R-ROT-1-D para isolar historico de uma rotina.
  rotina_slug?: string | null;
}

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Sessao lida do Vault: meta + path relativo ao root (ex:
// 'treinos/2026-04-23-0712-rotina-a.md'). O `rel` e' a identidade
// estavel do arquivo: quem exclui ou edita usa exatamente este valor,
// em vez de remontar o nome a partir do conteudo.
export interface TreinoListado {
  meta: TreinoSessao;
  rel: string;
}

// Extrai path relativo a partir de uma URI absoluta. Espelha o trim
// canonico de vaultUriJoin (trailing whitespace, %20 ofensivo, barras
// duplas) antes de remover o prefixo do root. Duplicacao consciente de
// tarefas.ts:64-79: extrair o helper comum e' sprint separada.
function uriParaRelativo(uri: string, root: string): string {
  const trimmedRoot = root
    .trim()
    .replace(/\s+$/, '')
    .replace(/%20+$/, '')
    .replace(/\/+$/, '');
  if (uri.startsWith(`${trimmedRoot}/`)) {
    // Sem decodeURIComponent DE PROPOSITO: o `rel` volta a ser
    // concatenado ao root por joinUri para localizar o arquivo, entao o
    // que importa e' fidelidade de ida e volta, nao legibilidade.
    return uri.slice(trimmedRoot.length + 1);
  }
  // Fallback: treinos vivem em pasta legada propria, entao o ultimo
  // recurso e' recortar a partir de 'treinos/'.
  const idx = uri.lastIndexOf('treinos/');
  return idx >= 0 ? uri.slice(idx) : uri;
}

// Lista todas as sessoes de treino do Vault aplicando filtros
// opcionais. Pasta inexistente => [] silenciosamente. Assinatura
// publica inalterada pela EXE-1: cinco consumidores dependem dela
// (useTreinos, useRecap, recap/saude, marcosAuto, puxadores/exercicio).
export async function listarTreinos(
  vaultRoot: string,
  filtros: ListarTreinosFiltros = {}
): Promise<TreinoSessao[]> {
  const comRel = await listarTreinosComRel(vaultRoot, filtros);
  return comRel.map((t) => t.meta);
}

// Mesma listagem de listarTreinos, devolvendo tambem o path relativo
// real de cada arquivo. Filtros e ordenacao identicos: listarTreinos
// delega aqui e so' descarta o `rel`, entao nao existe caminho onde as
// duas divirjam.
//
// R-AUDIT-VAULT-PERF: treinos vivem em 'treinos/' (nao markdown/), entao
// esta listagem NAO entra na listagem unica de markdown/ do ciclo (o
// Recap colapsa 8 -> 2: 1 de markdown/ + esta de treinos/). Aplicamos so
// a leitura em lote (serial -> readVaultFiles). Os drafts sao pre-
// filtrados ANTES de ler (o loop antigo pulava com `continue` dentro do
// for; pre-filtrar le exatamente o mesmo conjunto).
export async function listarTreinosComRel(
  vaultRoot: string,
  filtros: ListarTreinosFiltros = {}
): Promise<TreinoListado[]> {
  // Treinos formais (M11) ainda em layout legado: pasta 'treinos/'.
  // Migracao para layout-por-tipo H2 fica para sprint dedicada.
  const folderUri = joinUri(vaultRoot, 'treinos');
  const arquivosBrutos = await listVaultFolder(folderUri, '.md');
  const arquivos = arquivosBrutos.filter((u) => {
    if (ehSyncConflict(u)) return false;
    // Pula drafts (treinos/draft/...). Drafts da M13 são migrados em
    // boot por migrarDraftsParaTreinoSessao; depois disso a pasta de
    // drafts fica vazia. Mesmo assim filtramos defensivamente para
    // não parsear estrutura antiga durante a janela de migracao.
    const decoded = decodeURIComponent(u);
    if (decoded.includes('/treinos/draft/')) return false;
    return true;
  });

  const lidos: TreinoListado[] = (
    await readVaultFiles(arquivos, TreinoSessaoSchema)
  ).map((r) => ({
    meta: r.parsed.meta,
    rel: uriParaRelativo(r.uri, vaultRoot),
  }));

  let filtradas = lidos;
  if (filtros.autor) {
    const a = filtros.autor;
    filtradas = filtradas.filter((s) => s.meta.autor === a);
  }
  if (filtros.rotina_slug) {
    const alvo = filtros.rotina_slug;
    // Sessao legada sem o campo => descartada (nao casa filtro).
    filtradas = filtradas.filter((s) => s.meta.rotina_slug === alvo);
  }

  // Ordenacao desc por data ISO (lexicografica já respeita ordem).
  filtradas.sort((a, b) =>
    a.meta.data < b.meta.data ? 1 : a.meta.data > b.meta.data ? -1 : 0
  );
  return filtradas;
}

// Cria ou atualiza uma sessao de treino. Caller fornece slug como
// parte do path; dentro do meta não ha slug. A combinacao data + hora +
// slug forma o nome do arquivo.
//
// EXE-1: `opts.relOverride` escreve exatamente no path informado, sem
// derivar nada do conteudo. E' o caminho da edicao -- a UI passa o `rel`
// que veio da listagem, entao renomear a rotina reescreve o arquivo
// original em vez de criar um segundo.
export async function escreverTreino(
  vaultRoot: string,
  slug: string,
  meta: TreinoSessao,
  body: string = '',
  opts?: { relOverride?: string }
): Promise<{ uri: string; rel: string }> {
  const parsed = TreinoSessaoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`treino invalido: ${parsed.error.message}`);
  }
  const override = opts?.relOverride;
  const dataDate = new Date(parsed.data.data);
  const rel =
    typeof override === 'string' && override.length > 0
      ? override
      : treinosPath(dataDate, slug);
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
    // Já existe.
  }

  const ts = formatTimestampLixeira(new Date());
  // Slug deriva do nome do arquivo (ultimo segmento sem .md).
  const nomeArquivo = rel.split('/').pop() ?? 'treino.md';
  const lixeiraPath = `${lixeiraDir}${ts}-${nomeArquivo}`;

  await moverArquivoParaLixeira(origemUri, lixeiraPath);
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
