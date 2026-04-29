// Schema do arquivo inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md
// (diario emocional). Modelado em docs/BRIEFING.md secao 7.
//
// Modos:
// - 'trigger' = momento dificil. Estrategia + funcionou opcionais.
// - 'vitoria' = anonimato-allow: superacao, sucesso. So texto e emocoes.
//
// 'funcionou' so faz sentido em modo trigger (estrategia foi
// efetiva?). Quando modo === 'vitoria', funcionou deve ser undefined.
import { z } from 'zod';
import { PessoaAutorSchema, PessoaIdSchema } from '@/lib/schemas/pessoa';

export const DiarioEmocionalModoSchema = z.enum(['trigger', 'vitoria']);
export type DiarioEmocionalModo = z.infer<typeof DiarioEmocionalModoSchema>;

const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

export const DiarioEmocionalSchema = z
  .object({
    tipo: z.literal('diario_emocional'),
    data: Iso8601,
    autor: PessoaAutorSchema,
    modo: DiarioEmocionalModoSchema,
    emocoes: z.array(z.string()).default([]),
    intensidade: z.number().int().min(1).max(5),
    com: z.array(PessoaIdSchema).default([]),
    texto: z.string(),
    estrategia: z.string().optional(),
    funcionou: z.boolean().optional(),
    audio: z.string().nullable().optional(),
  })
  .refine(
    (v) => v.modo === 'trigger' || v.funcionou === undefined,
    { message: 'funcionou so pode ser definido em modo trigger', path: ['funcionou'] }
  );

export type DiarioEmocionalMeta = z.infer<typeof DiarioEmocionalSchema>;
