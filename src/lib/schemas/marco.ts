// Schema do arquivo marcos/YYYY-MM-DD-slug.md (marco / conquista
// pessoal). Modelado em docs/sprints/M11-spec.md seção 2.
//
// Marcos podem ser criados manualmente (Tela 11 botao +) ou
// automaticamente por:
//  - MOB-bridge-3 (backend). Origem 'backend'.
//  - verificarMarcosAuto (cliente). Origem 'client'.
//
// Hash de conteudo evita duplicacao quando ambas as origens rodam.
// Sentence case PT-BR + sem gamificacao: não ha rank, badge ou
// pontuacao no schema. Frase descritiva neutra.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';
import { ParaSchema } from '@/lib/schemas/para';

const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

export const MarcoOrigemSchema = z.enum(['backend', 'client']);
export type MarcoOrigem = z.infer<typeof MarcoOrigemSchema>;

export const MarcoSchema = z.object({
  tipo: z.literal('marco'),
  data: Iso8601,
  autor: PessoaAutorSchema,
  descricao: z.string().min(1),
  tags: z.array(z.string()).default([]),
  // auto: true quando o marco veio de heuristica (backend ou client).
  // Default false (manual).
  auto: z.boolean().default(false),
  // origem: somente preenchido quando auto = true. backend = MOB-bridge-3
  // gerou; client = verificarMarcosAuto na Mobile gerou.
  origem: MarcoOrigemSchema.optional(),
  // hash: SHA-256 truncado 12 chars do conteudo canonical (autor +
  // descricao). Idempotencia entre client e backend.
  hash: z.string().length(12).optional(),
  // Destinatario / tema do marco (M33). Discriminado: mim /
  // outra(pessoa) / casal. Default {tipo:'mim'} para .md v1.
  para: ParaSchema,
  // M11.4: vinculo opcional Marco -> Medida. Quando presente, e o
  // slug curto da medida (data YYYY-MM-DD em medidas/), permitindo
  // ao Recap (M36) correlacionar conquista textual com snapshot
  // corporal. Slug, nao path absoluto, para facilitar backup/restore.
  medidaRef: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'medidaRef deve estar em YYYY-MM-DD')
    .optional(),
});

export type Marco = z.infer<typeof MarcoSchema>;
