// Schema do .md companion para compartilhamentos financeiros
// auto-classificados via regex (Q10). Cobre Pix, boleto e extrato
// vindos de share intent do banco/app de pagamento, complementando o
// fluxo manual ja existente em inbox_arquivo.ts.
//
// Diferenca vs FinanceiroNotaSchema (notas fiscais via OCR M09):
// - Nao precisa de OCR; o classifier opera sobre texto compartilhado
//   pelo proprio app emissor (ex: comprovante Pix do Nubank).
// - Valor e opcional; pode vir nulo quando o regex falha em capturar.
// - Carrega metadados estruturais (EndToEndID, linha digitavel) que o
//   InboxArquivoSchema generico nao prevê.
//
// Path canonico: inbox/financeiro/<categoria>/YYYY-MM-DD-HHmmss-<slug>.md
// (binario opcional ao lado, com mesmo stem).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// As 3 categorias auto-classificadas. Pix e extrato ja existem em
// InboxArquivoSubtipoSchema; boleto e introduzido aqui pela primeira
// vez (sprint Q10).
export const FinanceiroCategoriaSchema = z.enum(['pix', 'boleto', 'extrato']);
export type FinanceiroCategoria = z.infer<typeof FinanceiroCategoriaSchema>;

// Data no formato YYYY-MM-DD (sem hora). Usado para data_transacao
// extraida do texto do comprovante e para data do save (fallback).
const DataYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD');

export const FinanceiroSchema = z.object({
  tipo: z.literal('financeiro'),
  categoria: FinanceiroCategoriaSchema,
  // Refinamento opcional: 'envio', 'recebimento', 'duplicata' etc.
  // Permanece nullable porque nem sempre o regex captura nuance.
  subcategoria: z.string().nullable(),
  // Valor em reais decimal (12.50, nao centavos). Nullable porque o
  // classifier pode falhar em capturar (texto sem 'R$').
  valor: z.number().nullable(),
  moeda: z.string().default('BRL'),
  // Data da transacao extraida do texto (YYYY-MM-DD).
  data_transacao: DataYmd.nullable(),
  // Nome do banco, pessoa ou empresa contraparte.
  contraparte: z.string().nullable(),
  // EndToEndID Pix (formato Exxxxxxxxxxxxxx).
  end_to_end_id: z.string().nullable(),
  // Linha digitavel do boleto (47 digitos com mascara).
  linha_digitavel: z.string().nullable(),
  // Instituicao financeira detectada (Nubank, Itau, etc.).
  instituicao: z.string().nullable(),
  // Path relativo ao Vault root para anexo binario (PDF, imagem).
  // Nullable porque share pode ser texto puro sem arquivo.
  arquivo_anexo: z.string().nullable(),
  // Texto compartilhado original (truncado para preservar espaco).
  texto_origem: z.string().nullable(),
  autor: PessoaAutorSchema,
  // Data do save (YYYY-MM-DD).
  data: DataYmd,
});

export type FinanceiroMeta = z.infer<typeof FinanceiroSchema>;
