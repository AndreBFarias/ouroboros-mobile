// Schema generico do .md companion de qualquer arquivo recebido via
// share intent (M08, Tela 17). Path canonico:
// inbox/<area>/<subtipo>/YYYY-MM-DD-HHmmss-<slug>.md, onde os 8
// subtipos sao discriminados pelo campo `subtipo`.
//
// Schemas especificos (PIX com valor, nota com OCR) ficam para
// sprints sucessoras (ex.: M09 com FinanceiroNotaSchema). Aqui o
// objetivo e capturar metadado minimo + ponteiro para o binario
// salvo separadamente.
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// ISO 8601 com hora obrigatoria (mesmo regex usado em evento.ts e
// diario_emocional.ts).
const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

// Lista canonica dos 8 subtipos suportados pelo share receiver.
// Ordem nao e UI: os chips sao gerados em src/lib/share/categorias.ts.
export const InboxArquivoSubtipoSchema = z.enum([
  'pix',
  'extrato',
  'nota',
  'exame',
  'receita',
  'garantia',
  'contrato',
  'outro',
]);
export type InboxArquivoSubtipo = z.infer<typeof InboxArquivoSubtipoSchema>;

export const InboxArquivoSchema = z.object({
  tipo: z.literal('inbox_arquivo'),
  subtipo: InboxArquivoSubtipoSchema,
  data: Iso8601,
  autor: PessoaAutorSchema,
  // Path relativo ao Vault root (ex: inbox/financeiro/pix/2026-04-30-1530.pdf).
  arquivo: z.string().min(1),
  // Mime type informado pelo intent. Default 'application/octet-stream'
  // quando o caller nao tem certeza.
  mime_type: z.string().min(1),
  // Tamanho em bytes do binario copiado. Pode ser 0 quando o caller
  // nao consegue medir (ex.: SAF nao expoe size em alguns providers).
  tamanho_bytes: z.number().int().min(0),
  // Identificador opaco do app de origem quando disponivel. Ex:
  // 'com.nu.production'. Permite null quando o intent nao traz.
  origem: z.string().nullable(),
  // Marcador para revisao manual posterior. Default true: todo
  // arquivo recebido entra para inbox de revisao.
  revisar: z.boolean().default(true),
});

export type InboxArquivoMeta = z.infer<typeof InboxArquivoSchema>;
