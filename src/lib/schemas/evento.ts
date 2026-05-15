// Schema do arquivo eventos/YYYY-MM-DD-slug.md.
// Modelado em docs/BRIEFING.md seção 7. Modo positivo/negativo,
// lugar e bairro livres, lista de pessoas envolvidas (PessoaId
// permite 'ambos'), categoria livre, intensidade 1-5, anexos.
import { z } from 'zod';
import { PessoaAutorSchema, PessoaIdSchema } from '@/lib/schemas/pessoa';
import { MidiaSchema } from '@/lib/schemas/midia';
import { ParaSchema } from '@/lib/schemas/para';

export const EventoModoSchema = z.enum(['positivo', 'negativo']);
export type EventoModo = z.infer<typeof EventoModoSchema>;

const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

export const EventoSchema = z
  .object({
    tipo: z.literal('evento'),
    data: Iso8601,
    autor: PessoaAutorSchema,
    modo: EventoModoSchema,
    lugar: z.string().optional(),
    bairro: z.string().optional(),
    com: z.array(PessoaIdSchema).default([]),
    categoria: z.string().optional(),
    intensidade: z.number().int().min(1).max(5),
    fotos: z.array(z.string()).default([]),
    // Midia anexada (M07.x). Array vazio default para arquivos
    // legados sem o campo. Refine abaixo bloqueia save de positivo
    // sem ao menos uma midia (conquistas exigem peso emocional).
    midia: z.array(MidiaSchema).default([]),
    // Destinatario / tema da anotacao (M33). Discriminado: mim /
    // outra(pessoa) / casal. Default {tipo:'mim'} para .md v1.
    para: ParaSchema,
  })
  .refine((v) => v.modo !== 'positivo' || v.midia.length > 0, {
    message: 'positivo exige pelo menos uma midia',
    path: ['midia'],
  });

export type EventoMeta = z.infer<typeof EventoSchema>;
