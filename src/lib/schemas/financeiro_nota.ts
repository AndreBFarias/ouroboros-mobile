// Schema do .md companion de uma nota fiscal capturada pelo scanner
// (Tela 16, M09). Path canonico:
// inbox/financeiro/nota/YYYY-MM-DD-HHmmss-<slug>.md.
//
// Diferenca vs InboxArquivoSchema genérico:
// - Carrega valor numerico, descrição e categoria estruturados
//   (extraidos por OCR + heurística regex; usuário revisa no
//   preview).
// - Carrega ocr_confianca para o caller decidir flag 'revisar'.
// - Bairro detectado via getBairroAtual e opcional (usuário aceita
//   ou ignora chip).
// - Imagem pode ser .jpg single-page ou .pdf multi-page consolidado
//   via expo-print.
//
// Categorias canonicas batem 1:1 com a CategoriaCanonica de
// src/lib/scanner/parsing.ts. Chaves sem acento (convencao schema).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// ISO 8601 com hora obrigatoria (mesmo regex usado em evento.ts).
const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

export const CategoriaNotaSchema = z.enum([
  'mercado',
  'farmacia',
  'transporte',
  'alimentacao',
  'outro',
]);
export type CategoriaNota = z.infer<typeof CategoriaNotaSchema>;

export const FinanceiroNotaSchema = z.object({
  tipo: z.literal('financeiro'),
  subtipo: z.literal('nota'),
  data: Iso8601,
  autor: PessoaAutorSchema,
  // Valor em reais. Nao negativo. Pode ser 0 quando OCR não detectou
  // e usuário salvou mesmo assim para revisar depois.
  valor: z.number().min(0),
  descricao: z.string().min(1),
  categoria: CategoriaNotaSchema,
  // Path relativo ao Vault root. Aceita .jpg (single) ou .pdf (multi).
  imagem: z.string().min(1),
  // Bairro detectado via getBairroAtual (M07). Opcional: usuário
  // pode ignorar o chip. Quando ausente, omite no frontmatter.
  bairro: z.string().optional(),
  // Confianca derivada do OCR (0..1). Caller calcula a partir da
  // densidade de blocos retornados pelo ML Kit (ver text-recognition.ts).
  ocr_confianca: z.number().min(0).max(1),
  // Marcador para revisao manual posterior. Default false; vira
  // true quando ocr_confianca < 0.8 (regra do preview).
  revisar: z.boolean().default(false),
});

export type FinanceiroNotaMeta = z.infer<typeof FinanceiroNotaSchema>;
