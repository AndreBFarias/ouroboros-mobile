// Persiste uma nota fiscal capturada pelo scanner. Recebe meta
// validado, body livre, vaultRoot e a fonte de imagem (single .jpg
// ou multi-page .pdf ja consolidado pelo expo-print).
//
// I-SCANNER (M-SAVE-SCANNER-VALIDA + M-SCANNER-LAYOUT-POR-TIPO,
// 2026-05-07): migrado para layout-por-tipo (H2). Antes (path legado): // ptbr-allow: comentario tecnico, path
//   - binario .jpg/.pdf -> media/scanner/<basename>.<ext> // ptbr-allow: comentario tecnico, path
//   - md companion 1:1 -> media/scanner/<basename>.md // ptbr-allow: comentario tecnico, path
//   - md semantico -> inbox/financeiro/nota/<ts>-<slug>.md
//   - concatenacao via joinUri local (sem trim agressivo de
//     trailing whitespace e %20 ofensivo do SAF MIUI/HyperOS).
// Agora:
//   - binario -> <ext>/scanner-<slug>.<ext> (jpg ou pdf), via
//     scannerPath(slug, ext).
//   - md companion 1:1 -> markdown/scanner-<slug>.md, via
//     scannerCompanionPath(slug).
//   - md semantico -> markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md,
//     via notaPath(date, slug). Wikilink no body aponta o binario
//     em <ext>/scanner-<slug>.<ext>.
//   - vaultUriJoin (H1) substitui joinUri local: trata trailing
//     whitespace, %20 ofensivo, barras duplas + lanca erro claro
//     quando vaultRoot vazio.
//
// Slug unico por captura: timestamp YYYY-MM-DD-HHmmss + descricao
// kebab-case ASCII. Garante que multiplas notas no mesmo segundo
// nao colidam binario/companion. Fallback 'nota' quando descricao
// vazia/curta.
//
// ML Kit OCR fica no caller (ScannerPreview); aqui so persistimos
// o binario + companion + md semantico ja com texto OCR no body e
// ocr_confianca + revisar no frontmatter (FinanceiroNotaSchema).
import * as FileSystem from 'expo-file-system/legacy';
import {
  formatDateYmdHms,
  notaPath,
  scannerPath,
  scannerCompanionPath,
  vaultUriJoin,
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
// relativo real apos copiar o binario para <ext>/scanner-<slug>.<ext>.
// Exportar esta constante elimina a string magica espalhada e
// documenta o contrato.
export const IMAGEM_PENDENTE = 'pendente-copia.jpg' as const;

export interface SaveNotaResult {
  // Path absoluto do .md semantico em markdown/nota-...md.
  uri: string;
  // Path relativo ao Vault do binario em <ext>/scanner-<slug>.<ext>.
  imagemRelativa: string;
  // Path relativo ao Vault do .md companion 1:1 ao binario, em
  // markdown/scanner-<slug>.md.
  companionRelativo: string;
}

// Slug minimal: pega as primeiras 2 palavras do texto, lowercase, sem
// acento, removendo nao-alfanumericos. Cai em 'nota' se sobrar vazio.
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

// Wikilink do md semantico para o binario em <ext>/scanner-<slug>.<ext>.
// Formato Obsidian-friendly sem extensao (Obsidian resolve por
// basename global) e com path relativo legivel para humanos abrindo
// o md em outro editor. md semantico vive em markdown/, binario em
// <ext>/, entao subimos um nivel via '../<ext>/scanner-<slug>'.
function wikilinkParaBinario(ext: 'jpg' | 'pdf', slug: string): string {
  return `[[../${ext}/scanner-${slug}]]`;
}

export async function saveNota(args: SaveNotaArgs): Promise<SaveNotaResult> {
  const { meta, body, vaultRoot, imagemUri, isPdf } = args;

  const parsed = FinanceiroNotaSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`nota invalida: ${parsed.error.message}`);
  }

  const agora = new Date();
  const ts = formatDateYmdHms(agora);
  const slugDescricao = slugifyDescricao(parsed.data.descricao);

  // Slug unico por captura: timestamp + descricao. Garante que
  // multiplas notas no mesmo segundo nao colidam binario/companion.
  const slugScanner = `${ts}-${slugDescricao}`;
  const ext: 'jpg' | 'pdf' = isPdf ? 'pdf' : 'jpg';

  // 1. Copia o binário primeiro: se a copia falhar, nao gravamos
  //    nem companion nem md semantico apontando para arquivo
  //    inexistente. Path canonico: <ext>/scanner-<slug>.<ext>.
  const imagemRelativa = scannerPath(slugScanner, ext);
  const imagemDestino = vaultUriJoin(vaultRoot, imagemRelativa);
  await FileSystem.copyAsync({ from: imagemUri, to: imagemDestino });

  // 2. Companion .md 1:1 ao lado em markdown/. Mesmo slug do
  //    binario (regra layout-por-tipo). Frontmatter padrao M34 via
  //    stringifyCompanionMidia. Tipo midia_pdf para multi page,
  //    midia_foto para single page.
  const companionRelativo = scannerCompanionPath(slugScanner);
  const companionDestino = vaultUriJoin(vaultRoot, companionRelativo);
  const basenameBin = `scanner-${slugScanner}.${ext}`;
  const companionConteudo = stringifyCompanionMidia({
    tipo: isPdf ? 'midia_pdf' : 'midia_foto',
    arquivo: basenameBin,
    data: agora.toISOString(),
    autor: parsed.data.autor,
    para: { tipo: 'mim' },
    legenda:
      parsed.data.descricao.length > 0
        ? `Nota fiscal — ${parsed.data.descricao}`
        : 'Nota fiscal',
  });
  await FileSystem.writeAsStringAsync(companionDestino, companionConteudo);

  // 3. Md semantico em markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md
  //    (FinanceiroNotaMeta com OCR + revisar). Atualiza meta.imagem
  //    com path relativo real ao Vault.
  const metaFinal: FinanceiroNotaMeta = {
    ...parsed.data,
    imagem: imagemRelativa,
  };

  // Body do md semantico: prepende wikilink legivel para o binario
  // (Obsidian renderiza inline) e mantem o texto OCR/livre original.
  const wikilink = wikilinkParaBinario(ext, slugScanner);
  const bodyComLink = body.length > 0 ? `${wikilink}\n\n${body}` : wikilink;

  const relCanonico = notaPath(agora, slugDescricao);
  const uri = vaultUriJoin(vaultRoot, relCanonico);

  await writeVaultFile<FinanceiroNotaMeta>(uri, metaFinal, bodyComLink);

  return { uri, imagemRelativa, companionRelativo };
}
