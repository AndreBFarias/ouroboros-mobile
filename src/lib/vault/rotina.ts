// Helpers de leitura, listagem, escrita e exclusao de Rotinas de
// Treino (Q11.a / M-ROTINA-TREINO). Cada rotina vive em
// markdown/rotina-<slug>.md com frontmatter validado pelo RotinaSchema.
// Slug e a chave: salvar duas vezes com mesmo slug sobrescreve
// (edicao); slug novo cria arquivo novo.
//
// listarRotinas filtra por autor (privacidade visual entre as duas
// pessoas, mesma convencao de ciclo.ts e marcos.ts): cada usuario ve
// apenas as proprias rotinas no SeletorRotina e na lista /rotinas.
//
// Q11 (2026-05-12): segue padrao canonico H2 do layout-por-tipo
// (ADR-0023). Usa vaultUriJoin canonico para tolerar trailing
// whitespace + %20 ofensivo em URIs SAF (A29 do BRIEF).
//
// Comentarios sem acento (convencao shell/CI).
import { deleteVaultFile } from '@/lib/vault/remover';
import {
  rotinaPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import { RotinaSchema, type RotinaMeta } from '@/lib/schemas/rotina';

// AUDIT-P2-8: colisao de prefixo com as marcacoes rapidas de rotina.
// rotinaMarcacaoPath (src/lib/vault/rotina_marcacao.ts) grava em
// markdown/rotina-marcacao-<slug>-<YYYY-MM-DD>.md, que tambem comeca
// com 'rotina-'. Sem esta exclusao, listarRotinas passa a ler e
// parsear com RotinaSchema todo arquivo de marcacao a cada foco de
// /rotinas (N rotinas x 7 dias de leitura + excecao engolida pelo
// catch abaixo). Era latente enquanto nenhuma marcacao era escrita.
//
// A exclusao NAO pode ser por prefixo nu: uma rotina legitima chamada
// "Marcacao de glicemia" tem slug marcacao-de-glicemia e vive em
// markdown/rotina-marcacao-de-glicemia.md, e seria apagada da lista.
// Por isso a ancora e o sufixo de data obrigatorio do arquivo de
// marcacao, que rotina nenhuma tem.
const RE_ARQUIVO_MARCACAO = /^rotina-marcacao-.+-\d{4}-\d{2}-\d{2}\.md$/;

function ehArquivoDeMarcacao(filenameOrUri: string): boolean {
  const decoded = (() => {
    try {
      return decodeURIComponent(filenameOrUri);
    } catch {
      return filenameOrUri;
    }
  })();
  const basename = decoded.split('/').pop() ?? decoded;
  return RE_ARQUIVO_MARCACAO.test(basename);
}

// Lista todas as rotinas do autor. Pasta inexistente => []. Ordena
// asc por nome via localeCompare PT-BR (mesmo padrao de contadores).
export async function listarRotinas(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b'
): Promise<RotinaMeta[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) =>
      !ehSyncConflict(u) &&
      matchesFeaturePrefix(u, 'rotina-') &&
      !ehArquivoDeMarcacao(u)
  );

  const lidas: RotinaMeta[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, RotinaSchema);
      if (result && result.meta.autor === autor) lidas.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }

  lidas.sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );
  return lidas;
}

// Le uma rotina por slug. Retorna null se nao existir.
export async function lerRotina(
  vaultRoot: string,
  slug: string
): Promise<RotinaMeta | null> {
  const rel = rotinaPath(slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  const result = await readVaultFile(uri, RotinaSchema);
  return result ? result.meta : null;
}

// Persiste uma rotina. Caller fornece meta ja validado (revalidamos
// defensivamente). Body livre opcional. Sobrescreve quando slug existe
// (semantica de edicao no detalhe; criacao garante slug unico antes).
export async function escreverRotina(
  vaultRoot: string,
  meta: RotinaMeta,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = RotinaSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`rotina invalida: ${parsed.error.message}`);
  }
  const rel = rotinaPath(parsed.data.slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<RotinaMeta>(uri, parsed.data, body);
  return { uri, rel };
}

// R-ROT-1-D: silencia sugestao de alarme temporal por N dias a partir
// de agora. Usado quando usuario rejeita banner SugestaoAlarmeRotina na
// tela /rotinas/[slug]. Idempotente: silenciar duas vezes apenas
// estende o periodo. Caller passa ISO datetime resolvido por
// `calcularSilenciarAte` do helper inteligenciaTemporal.
//
// No-op silencioso se a rotina nao existe (alinha com semantica de
// silenciarSugestao do alarme e silenciarSugestaoTarefa: feature
// opcional, nao deve quebrar fluxo se o arquivo sumiu por sync race).
export async function silenciarSugestaoRotina(
  vaultRoot: string,
  slug: string,
  ate: string
): Promise<void> {
  const atual = await lerRotina(vaultRoot, slug);
  if (!atual) return;
  const atualizada: RotinaMeta = { ...atual, silenciar_sugestao_ate: ate };
  await escreverRotina(vaultRoot, atualizada, '');
}

// Apaga arquivo de rotina. Idempotente: nao falha se nao existe.
// Delega a deleteVaultFile, que despacha SAF.deleteAsync no nativo e
// useVaultMock.apagarArquivo em web/dev.
//
// AUDIT-INFRA-VAULT-MOCK-DELETE (2026-09-05): ate esta sprint o
// comentario daqui afirmava que em web a exclusao era "no-op
// silencioso" com efeito equivalente para a UI, porque listarRotinas
// pararia de retornar o arquivo apos reload do mock root. Nao era
// verdade: listarRotinas le do mesmo mapa em que o arquivo continuava,
// e o unico "reload" existente era o limpar() do reset, que zera tudo.
// A remocao de UM item so passou a ser observavel com apagarArquivo.
export async function removerRotina(
  vaultRoot: string,
  slug: string
): Promise<void> {
  const rel = rotinaPath(slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  try {
    await deleteVaultFile(uri);
  } catch {
    // Sem arquivo previo ou plataforma sem SAF; ok.
  }
}
