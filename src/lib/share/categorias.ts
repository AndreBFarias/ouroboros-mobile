// Categorias do share intent receiver (Tela 17, M08). Mapa entre o
// chip selecionado pelo usuario e a pasta de destino dentro do
// Vault.
//
// Granularidade canonica: inbox/<area>/<subtipo>/, com 4 areas e 8
// subtipos. Ordem dos chips na UI segue a ordem desta lista
// (financeiro primeiro, outros por ultimo) para alinhar com o flow
// PIX-em-5s prometido.
import type { ChipOption } from '@/components/ui';
import type { InboxArquivoSubtipo } from '@/lib/schemas/inbox_arquivo';

// Areas canonicas. Mantidas como union literal para garantir tipagem
// ao longo do path-resolver.
export type InboxArea = 'financeiro' | 'saude' | 'casa' | 'outros';

// Mapa estatico subtipo -> area + chave de pasta em VAULT_FOLDERS.
// O `folderKey` referência diretamente as entradas adicionadas em
// src/lib/vault/paths.ts (M08). Usar string literal aqui evitaria
// a importacao circular com paths.ts.
interface SubtipoMeta {
  readonly area: InboxArea;
  // Caminho relativo da pasta dentro do Vault. Mantemos como string
  // literal para evitar dependencia circular com paths.ts; os testes
  // de path-resolver checam que estes valores baten com VAULT_FOLDERS.
  readonly folder: string;
  readonly label: string;
  readonly accent: ChipOption['accent'];
}

export const INBOX_SUBTIPOS: Record<InboxArquivoSubtipo, SubtipoMeta> = {
  pix: {
    area: 'financeiro',
    folder: 'inbox/financeiro/pix',
    label: 'PIX',
    accent: 'green',
  },
  extrato: {
    area: 'financeiro',
    folder: 'inbox/financeiro/extrato',
    label: 'Extrato',
    accent: 'green',
  },
  nota: {
    area: 'financeiro',
    folder: 'inbox/financeiro/nota',
    label: 'Nota',
    accent: 'green',
  },
  exame: {
    area: 'saude',
    folder: 'inbox/saude/exame',
    label: 'Exame',
    accent: 'cyan',
  },
  receita: {
    area: 'saude',
    folder: 'inbox/saude/receita',
    label: 'Receita',
    accent: 'cyan',
  },
  garantia: {
    area: 'casa',
    folder: 'inbox/casa/garantia',
    label: 'Garantia',
    accent: 'orange',
  },
  contrato: {
    area: 'casa',
    folder: 'inbox/casa/contrato',
    label: 'Contrato',
    accent: 'orange',
  },
  outro: {
    area: 'outros',
    folder: 'inbox/outros',
    label: 'Outro',
    accent: 'purple',
  },
};

// Ordem visual canonica para o ChipGroup. Financeiro primeiro
// (suporta o flow PIX), saude e casa em sequência, 'outro' como
// fallback no fim.
export const INBOX_SUBTIPOS_ORDEM: readonly InboxArquivoSubtipo[] = [
  'pix',
  'extrato',
  'nota',
  'exame',
  'receita',
  'garantia',
  'contrato',
  'outro',
];

// Pronto para consumo direto pelo <ChipGroup mode="single">.
export const INBOX_SUBTIPO_OPTIONS: readonly ChipOption[] =
  INBOX_SUBTIPOS_ORDEM.map((s) => ({
    value: s,
    label: INBOX_SUBTIPOS[s].label,
    accent: INBOX_SUBTIPOS[s].accent,
  }));

// Helper: devolve o folder canonico (path relativo ao Vault) para um
// subtipo. Lanca quando recebe valor desconhecido em vez de retornar
// fallback silencioso, para não mascarar bug.
export function pastaParaSubtipo(subtipo: InboxArquivoSubtipo): string {
  const meta = INBOX_SUBTIPOS[subtipo];
  if (!meta) {
    throw new Error(`subtipo desconhecido: ${subtipo}`);
  }
  return meta.folder;
}

// Inferencia heuristica de subtipo default a partir do mime type.
// Quando o intent traz application/pdf, comecamos em 'extrato'
// (caso PIX o usuario re-seleciona). Imagens entram em 'nota' por
// default (foto de comprovante e o caso mais comum). Esses defaults
// são apenas pre-selecao do chip; o usuario pode trocar antes de
// salvar.
export function subtipoDefault(mimeType: string): InboxArquivoSubtipo {
  if (mimeType.startsWith('image/')) return 'nota';
  if (mimeType === 'application/pdf') return 'extrato';
  return 'outro';
}

// ============================================================
// Q10 — Classifier automatico para share intent financeiro
// ============================================================
//
// Heuristica regex que detecta Pix, boleto ou extrato a partir do
// texto compartilhado pelo app emissor (banco, gerenciador de
// pagamentos). Diferente do mapa estatico INBOX_SUBTIPOS, este
// classifier:
//   - Retorna categoria=null quando nada casa (caller mantem fluxo
//     manual de chip).
//   - Captura metadados estruturais (EndToEndID, linha digitavel,
//     valor numerico, instituicao) que o usuario nao precisa
//     transcrever a mao.
//   - Inclui 'boleto' como categoria nova (nao existe em
//     InboxArquivoSubtipoSchema; vive apenas em FinanceiroSchema).

// EndToEndID Pix: prefixo 'E' + 14 a 31 alfanumericos (a especificacao
// Pix permite ate 32 chars no total). Capturado quando rodeado por
// nao-alfanumerico (linha, espaco, ponto, fim de string).
const RE_PIX_E2E = /(?:^|[^A-Za-z0-9])(E[A-Z0-9]{14,31})(?=$|[^A-Za-z0-9])/i;

// Valor monetario com prefixo R$. Captura "R$ 12,50", "R$1.234,56",
// "R$ 50" — parseValor lida com formatacao depois.
const RE_VALOR_RS = /R\$\s*([\d.]+(?:,\d{2})?)/;

// Linha digitavel de boleto (47 digitos com mascara
// "XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX").
const RE_BOLETO = /\b(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})\b/;

// Lista de bancos brasileiros relevantes. Usado para identificar
// 'extrato' e tambem como 'instituicao' em qualquer categoria.
// Nao usa \b porque 'Itaú' termina em char Unicode (acentuado), e o
// \b padrao trata acentuado como nao-word — quebra a captura. Usamos
// lookarounds com classes ASCII para preservar o comportamento.
const RE_INSTITUICAO =
  /(?:^|[^A-Za-z])(Nubank|Ita[uú]|Bradesco|Santander|Inter|C6|Caixa|BB|Banco do Brasil|PicPay|Mercado Pago|Stone|PagSeguro)(?=$|[^A-Za-z])/i;

// Palavras-chave de extrato bancario. Confirmam categoria quando ja
// ha mencao a banco no texto. Lookarounds ASCII pelo mesmo motivo do
// RE_INSTITUICAO (palavras com acento como 'Lancamentos').
const RE_EXTRATO_PALAVRAS =
  /(?:^|[^A-Za-z])(Saldo|Lan[cç]amentos?|Extrato|Movimenta[cç][aã]o)(?=$|[^A-Za-z])/i;

// Palavras-chave que reforcam Pix mesmo sem EndToEndID (ex: copia
// e cola de comprovante simples).
const RE_PIX_PALAVRAS = /\b(Pix|PIX)\b/;

export interface ClassificacaoFinanceira {
  readonly categoria: 'pix' | 'boleto' | 'extrato' | null;
  readonly valor: number | null;
  readonly endToEndId: string | null;
  readonly linhaDigitavel: string | null;
  readonly instituicao: string | null;
}

// Converte "R$ 1.234,56" -> 1234.56, "R$ 50" -> 50, "R$50,00" -> 50.
// Devolve null em formato invalido. Exportado para teste direto.
export function parseValorBrl(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const trim = raw.trim();
  if (trim.length === 0) return null;
  // Remove pontos (separador de milhar) e troca virgula por ponto.
  const semMilhar = trim.replace(/\./g, '').replace(',', '.');
  const num = Number.parseFloat(semMilhar);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

// Classifica texto compartilhado em uma das 3 categorias financeiras
// auto-detectaveis. Retorna { categoria: null } quando nada casa; o
// caller mantem o fluxo manual (UI de chips).
export function classificarFinanceiro(
  texto: string | null | undefined
): ClassificacaoFinanceira {
  const vazio: ClassificacaoFinanceira = {
    categoria: null,
    valor: null,
    endToEndId: null,
    linhaDigitavel: null,
    instituicao: null,
  };
  if (typeof texto !== 'string' || texto.trim().length === 0) {
    return vazio;
  }

  const matchE2E = texto.match(RE_PIX_E2E);
  const matchBoleto = texto.match(RE_BOLETO);
  const matchInst = texto.match(RE_INSTITUICAO);
  const matchExtrato = texto.match(RE_EXTRATO_PALAVRAS);
  const matchPix = texto.match(RE_PIX_PALAVRAS);
  const matchValor = texto.match(RE_VALOR_RS);

  const valor = matchValor ? parseValorBrl(matchValor[1] ?? null) : null;
  const instituicao = matchInst ? matchInst[1] ?? null : null;

  // Boleto tem precedencia: linha digitavel e marcador inequivoco.
  if (matchBoleto) {
    return {
      categoria: 'boleto',
      valor,
      endToEndId: null,
      linhaDigitavel: matchBoleto[1] ?? null,
      instituicao,
    };
  }

  // Pix: EndToEndID ou palavra 'Pix' + valor.
  if (matchE2E) {
    return {
      categoria: 'pix',
      valor,
      endToEndId: matchE2E[1] ?? null,
      linhaDigitavel: null,
      instituicao,
    };
  }
  if (matchPix && (valor !== null || instituicao !== null)) {
    return {
      categoria: 'pix',
      valor,
      endToEndId: null,
      linhaDigitavel: null,
      instituicao,
    };
  }

  // Extrato: banco + palavra chave de extrato.
  if (matchInst && matchExtrato) {
    return {
      categoria: 'extrato',
      valor,
      endToEndId: null,
      linhaDigitavel: null,
      instituicao,
    };
  }

  return vazio;
}
