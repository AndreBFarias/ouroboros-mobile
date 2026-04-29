// Schema do arquivo daily/YYYY-MM-DD.md (humor do dia).
// Modelado em docs/BRIEFING.md secao 7. Quatro sliders 1-5
// (humor/energia/ansiedade/foco), tags livres, frase opcional,
// metadata de medicacao e horas de sono.
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

const Slider1a5 = z.number().int().min(1).max(5);

export const HumorSchema = z.object({
  tipo: z.literal('humor'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
  autor: PessoaAutorSchema,
  humor: Slider1a5,
  energia: Slider1a5,
  ansiedade: Slider1a5,
  foco: Slider1a5,
  medicacao: z.boolean().optional(),
  horas_sono: z.number().min(0).max(24).optional(),
  tags: z.array(z.string()).default([]),
  frase: z.string().optional(),
});

export type HumorMeta = z.infer<typeof HumorSchema>;
