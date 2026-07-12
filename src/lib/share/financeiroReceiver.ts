// Receiver auto-classificador para share intent financeiro (Q10).
// Quando o classifier de categorias.ts identifica Pix, boleto ou
// extrato no conteudo compartilhado, este modulo gera o path canonico
// dentro de inbox/financeiro/<categoria>/ e prepara a metadata rica
// (FinanceiroMeta) para gravar o .md companion.
//
// Pure-mostly: nao executa I/O nem importa expo-file-system. O caller
// (app/share-receive.tsx) usa o resultado para chamar copyAsync e
// writeVaultFile na sequencia. Mantemos esta separacao para o helper
// continuar testavel via Jest sem mock pesado.

import {
  classificarFinanceiro,
  type ClassificacaoFinanceira,
} from '@/lib/share/categorias';
import { formatDateYmd, inboxFinanceiroPath } from '@/lib/vault/paths';
import {
  FinanceiroSchema,
  type FinanceiroMeta,
  type FinanceiroCategoria,
} from '@/lib/schemas/financeiro';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export interface ConteudoCompartilhado {
  readonly texto?: string | null;
  readonly uri?: string | null;
  readonly mimeType?: string | null;
  readonly nomeArquivo?: string | null;
}

export interface ResultadoReceiverFinanceiro {
  readonly categoria: FinanceiroCategoria;
  readonly relBinario: string | null;
  readonly relMd: string;
  readonly meta: FinanceiroMeta;
  readonly classificacao: ClassificacaoFinanceira;
}

// Deduz a extensao do anexo a partir do mime type. Mantemos a logica
// local (sem reuso de share/intent.ts) porque aqui o conjunto e
// restrito ao financeiro (pdf, jpg, png). Devolve string vazia quando
// nao identifica.
function extensaoAnexo(
  mime: string | null | undefined,
  nome: string | null | undefined
): string {
  if (typeof nome === 'string' && nome.includes('.')) {
    const idx = nome.lastIndexOf('.');
    const ext = nome
      .slice(idx + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (ext.length > 0 && ext.length <= 6) return ext;
  }
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return '';
}

// Slug curto derivado do nome de arquivo (so a-z0-9- minusculo).
// Cap em 24 chars para nao explodir nomes. Usado para tornar o path
// reconhecivel sem depender so de timestamp.
function slugDeNome(nome: string | null | undefined): string {
  if (typeof nome !== 'string') return '';
  const base = nome.toLowerCase();
  const idx = base.lastIndexOf('.');
  const semExt = idx > 0 ? base.slice(0, idx) : base;
  const limpo = semExt.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return limpo.length === 0 ? '' : limpo.slice(0, 24).replace(/-+$/g, '');
}

// Trunca texto para preservar espaco no frontmatter. 600 chars cobrem
// um comprovante Pix tipico inteiro sem virar wall-of-text.
function truncar(texto: string | null | undefined, max: number): string | null {
  if (typeof texto !== 'string') return null;
  const trim = texto.trim();
  if (trim.length === 0) return null;
  return trim.length <= max ? trim : trim.slice(0, max);
}

// Tenta classificar o conteudo. Se categoria === null, devolve null
// (caller mantem fluxo manual). Caso contrario, monta meta + path.
export function processarShareFinanceiro(args: {
  conteudo: ConteudoCompartilhado;
  autor: PessoaAutor;
  agora: Date;
}): ResultadoReceiverFinanceiro | null {
  const { conteudo, autor, agora } = args;
  const textoBase =
    (typeof conteudo.texto === 'string' && conteudo.texto.length > 0
      ? conteudo.texto
      : null) ??
    (typeof conteudo.nomeArquivo === 'string' && conteudo.nomeArquivo.length > 0
      ? conteudo.nomeArquivo
      : null);

  const classificacao = classificarFinanceiro(textoBase);
  if (classificacao.categoria === null) {
    return null;
  }

  const categoria: FinanceiroCategoria = classificacao.categoria;
  const slug = slugDeNome(conteudo.nomeArquivo) || categoria;
  const ext = extensaoAnexo(conteudo.mimeType, conteudo.nomeArquivo);
  const temBinario =
    typeof conteudo.uri === 'string' && conteudo.uri.length > 0;

  const relBinario =
    temBinario && ext.length > 0
      ? inboxFinanceiroPath(categoria, agora, { ext, slug })
      : null;
  const relMd = inboxFinanceiroPath(categoria, agora, { ext: 'md', slug });

  const meta: FinanceiroMeta = {
    tipo: 'financeiro',
    categoria,
    subcategoria: null,
    valor: classificacao.valor,
    moeda: 'BRL',
    data_transacao: null,
    contraparte: null,
    end_to_end_id: classificacao.endToEndId,
    linha_digitavel: classificacao.linhaDigitavel,
    instituicao: classificacao.instituicao,
    arquivo_anexo: relBinario,
    texto_origem: truncar(textoBase, 600),
    autor,
    data: formatDateYmd(agora),
  };

  const validacao = FinanceiroSchema.safeParse(meta);
  if (!validacao.success) {
    throw new Error(`financeiro invalido: ${validacao.error.message}`);
  }

  return {
    categoria,
    relBinario,
    relMd,
    meta: validacao.data,
    classificacao,
  };
}
