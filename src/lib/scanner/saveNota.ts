// Persiste uma nota fiscal capturada pelo scanner em
// inbox/financeiro/nota/. Recebe meta validado, body livre, vaultRoot
// e a fonte de imagem (single .jpg ou multi-page .pdf já consolidado
// pelo expo-print). Copia para assets/ e grava o .md companion.
//
// Convencoes:
// - Single page: cópia .jpg de URI temporaria para assets/<ts>.jpg.
// - Multi page: cópia .pdf de URI temporaria para
//   assets/<ts>-nota-multipágina.pdf.
// - Slug do .md vem da descrição (kebab-case ASCII) ou 'nota' genérico
//   quando a descrição for vazia / muito curta.
import * as FileSystem from 'expo-file-system/legacy';
import {
  assetsPath,
  formatDateYmdHm,
  inboxFinanceiroNotaPath,
  writeVaultFile,
} from '@/lib/vault';
import {
  FinanceiroNotaSchema,
  type FinanceiroNotaMeta,
} from '@/lib/schemas/financeiro_nota';

export interface SaveNotaArgs {
  meta: FinanceiroNotaMeta;
  body: string;
  vaultRoot: string;
  // URI temporaria do binário (jpg ou pdf) já gerado pelo modulo
  // nativo / expo-print. Caller indica se e PDF via flag isPdf.
  imagemUri: string;
  isPdf: boolean;
}

export interface SaveNotaResult {
  uri: string;
  imagemRelativa: string;
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

export async function saveNota(args: SaveNotaArgs): Promise<SaveNotaResult> {
  const { meta, body, vaultRoot, imagemUri, isPdf } = args;

  const parsed = FinanceiroNotaSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`nota invalida: ${parsed.error.message}`);
  }

  const agora = new Date();
  const prefixo = formatDateYmdHm(agora);

  // Copia o binário primeiro: se a cópia falhar, não gravamos o .md
  // apontando para arquivo inexistente.
  const filename = isPdf
    ? `${prefixo}-nota-multipagina.pdf`
    : `${prefixo}-nota.jpg`;
  const imagemRelativa = assetsPath(filename);
  const imagemDestino = joinUri(vaultRoot, imagemRelativa);
  await FileSystem.copyAsync({ from: imagemUri, to: imagemDestino });

  // Atualiza meta.imagem com path relativo ao Vault.
  const metaFinal: FinanceiroNotaMeta = {
    ...parsed.data,
    imagem: imagemRelativa,
  };

  const slug = slugifyDescricao(metaFinal.descricao);
  const relCanonico = inboxFinanceiroNotaPath(agora, slug);
  const uri = joinUri(vaultRoot, relCanonico);

  await writeVaultFile<FinanceiroNotaMeta>(uri, metaFinal, body);

  return { uri, imagemRelativa };
}
