// Schema do cache JSON gerado pelo backend (ADR-0012). Mobile so le;
// nunca escreve. Estrutura espelha
// ~/Protocolo-Ouroboros/.ouroboros/cache/humor-heatmap.json gerado
// pela sprint MOB-bridge-2.
//
// schema_version 1 e o unico aceito; valores diferentes devolvem
// erro explicito para o reader, que exibe EmptyState orientando o
// usuario a rodar o pipeline atualizado.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

const Slider1a5 = z.number().int().min(1).max(5);

// Celula: 1 registro de humor para uma pessoa em um dia. Usuario
// pode ter dois registros no mesmo dia (humor manha + noite, ou
// pessoa_a + pessoa_b); o cache lista todas as ocorrencias.
export const HumorHeatmapCellSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
  autor: PessoaAutorSchema,
  humor: Slider1a5,
  energia: Slider1a5,
  ansiedade: Slider1a5,
  foco: Slider1a5,
  tags: z.array(z.string()).optional(),
  frase: z.string().optional(),
});

export type HumorHeatmapCell = z.infer<typeof HumorHeatmapCellSchema>;

// Estatisticas agregadas por pessoa em janela de 30 dias. media_humor_30d
// considera somente dias com registro (decisao spec §10).
export const HumorHeatmapEstatisticaSchema = z.object({
  media_humor_30d: z.number().min(0).max(5),
  registros_30d: z.number().int().min(0),
  registros_total: z.number().int().min(0),
});

export type HumorHeatmapEstatistica = z.infer<
  typeof HumorHeatmapEstatisticaSchema
>;

export const HumorHeatmapCacheSchema = z.object({
  schema_version: z.literal(1),
  gerado_em: z.string().min(1),
  periodo_dias: z.number().int().positive(),
  pessoas: z.array(PessoaAutorSchema).min(1),
  celulas: z.array(HumorHeatmapCellSchema),
  estatisticas: z.object({
    pessoa_a: HumorHeatmapEstatisticaSchema,
    pessoa_b: HumorHeatmapEstatisticaSchema,
  }),
});

export type HumorHeatmapCache = z.infer<typeof HumorHeatmapCacheSchema>;
