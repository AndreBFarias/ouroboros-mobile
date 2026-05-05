// Persiste uma nota fiscal capturada pelo scanner. Recebe meta
// validado, body livre, vaultRoot e a fonte de imagem (single .jpg
// ou multi-page .pdf ja consolidado pelo expo-print).
//
// M-VAULT-MD-FIX-scanner (2026-05-04): refatorado para respeitar a
// convencao de companion 1:1 da pasta media/. Antes:
//   - binario .jpg/.pdf -> assets/<ts>-nota[-multipagina].<ext>
//   - md unico -> inbox/financeiro/nota/<ts>-<slug>.md (apontava o
//     binario por path absoluto, sem companion ao lado)
// Agora:
//   - binario para media/scanner/<basename>.<ext> (jpg ou pdf)
//   - md companion 1:1 ao lado em media/scanner/<basename>.md
//     (frontmatter midia_pdf ou midia_foto, padrao M34)
//   - md semantico permanece em inbox/financeiro/nota/<ts>-<slug>.md
//     (schema FinanceiroNotaMeta), agora com wikilink ao binario no
//     body e campo `imagem` apontando para o path canonico real.
//
// Backward-compat: arquivos antigos em assets/ continuam acessiveis
// no vault. Esta sprint apenas redireciona escritas novas.
//
// Slug do .md semantico continua vindo da descricao (kebab-case
// ASCII) ou 'nota' generico quando vazio / muito curto.
import * as FileSystem from 'expo-file-system/legacy';
import {
  formatDateYmdHm,
  inboxFinanceiroNotaPath,
  mediaScannerPath,
  writeVaultFile,
} from '@/lib/vault';
import {
  FinanceiroNotaSchema,
  type FinanceiroNotaMeta,
} from '@/lib/schemas/financeiro_nota';
import { stringifyCompanionMidia } from '@/lib/midia/companion';

export interface SaveNotaArgs {
  meta: FinanceiroNotaMeta;
  body: string;
  vaultRoot: string;
  // URI temporaria do binário (jpg ou pdf) já gerado pelo modulo
  // nativo / expo-print. Caller indica se e PDF via flag isPdf.
  imagemUri: string;
  isPdf: boolean;
}

// Sentinela usado pelo caller no campo `meta.imagem` para passar a
// validacao do schema (min(1)). saveNota sobrescreve com o path
// relativo real apos copiar o binario para media/scanner/. Exportar
// esta constante elimina a string magica espalhada e documenta o
// contrato.
export const IMAGEM_PENDENTE = 'pendente-copia.jpg' as const;

export interface SaveNotaResult {
  // Path absoluto do .md semantico em inbox/financeiro/nota/.
  uri: string;
  // Path relativo ao Vault do binario gravado em media/scanner/.
  imagemRelativa: string;
  // Path relativo ao Vault do .md companion 1:1 ao binario, em
  // media/scanner/<basename>.md (M-VAULT-MD-FIX-scanner).
  companionRelativo: string;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Slug minimal: pega as primeiras 2 palavras do texto, lowercase, sem
// acento, removendo não-alfanumericos. Cai em 'nota' se sobrar vazio.
function slugifyDescricao(s: string): string {
  const norm = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('-');
  return norm.length > 0 ? norm : 'nota';
}

// Wikilink do md semantico para o binario em media/scanner/. Formato
// Obsidian-friendly sem extensao (Obsidian resolve por basename
// global) e com path relativo legivel para humanos abrindo o md em
// outro editor.
function wikilinkParaBinario(basename: string): string {
  return `[[../../../media/scanner/${basename}]]`;
}

export async function saveNota(args: SaveNotaArgs): Promise<SaveNotaResult> {
  const { meta, body, vaultRoot, imagemUri, isPdf } = args;

  const parsed = FinanceiroNotaSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`nota invalida: ${parsed.error.message}`);
  }

  const agora = new Date();
  const prefixo = formatDateYmdHm(agora);

  // Basename canonico compartilhado entre binario e companion .md
  // (regra companion 1:1 da pasta media/scanner/).
  const ext = isPdf ? 'pdf' : 'jpg';
  const basename = isPdf
    ? `${prefixo}-nota-multipagina`
    : `${prefixo}-nota`;
  const basenameComExt = `${basename}.${ext}`;

  // Copia o binário primeiro: se a cópia falhar, não gravamos o .md
  // apontando para arquivo inexistente.
  const imagemRelativa = mediaScannerPath(basename, ext);
  const imagemDestino = joinUri(vaultRoot, imagemRelativa);
  await FileSystem.copyAsync({ from: imagemUri, to: imagemDestino });

  // Companion 1:1 ao lado do binario, mesmo basename. Frontmatter
  // padrao M34 via stringifyCompanionMidia. Tipo midia_pdf para multi
  // page (M-VAULT-MD-FIX-scanner extendeu TipoMidia); midia_foto para
  // single page mantem o tipo canonico.
  const companionRelativo = mediaScannerPath(basename, 'md');
  const companionDestino = joinUri(vaultRoot, companionRelativo);
  const companionConteudo = stringifyCompanionMidia({
    tipo: isPdf ? 'midia_pdf' : 'midia_foto',
    arquivo: basenameComExt,
    data: agora.toISOString(),
    autor: parsed.data.autor,
    para: { tipo: 'mim' },
    legenda:
      parsed.data.descricao.length > 0
        ? `Nota fiscal — ${parsed.data.descricao}`
        : 'Nota fiscal',
  });
  await FileSystem.writeAsStringAsync(companionDestino, companionConteudo);

  // Atualiza meta.imagem com path relativo real ao Vault.
  const metaFinal: FinanceiroNotaMeta = {
    ...parsed.data,
    imagem: imagemRelativa,
  };

  // Body do md semantico: prepende wikilink legivel para o binario
  // (Obsidian renderiza inline) e mantem o texto OCR/livre original.
  const wikilink = wikilinkParaBinario(basenameComExt);
  const bodyComLink = body.length > 0 ? `${wikilink}\n\n${body}` : wikilink;

  const slug = slugifyDescricao(metaFinal.descricao);
  const relCanonico = inboxFinanceiroNotaPath(agora, slug);
  const uri = joinUri(vaultRoot, relCanonico);

  await writeVaultFile<FinanceiroNotaMeta>(uri, metaFinal, bodyComLink);

  return { uri, imagemRelativa, companionRelativo };
}
