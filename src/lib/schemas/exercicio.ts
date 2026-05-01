// Schema do arquivo exercicios/<slug>.md (biblioteca de exercícios).
// Modelado em docs/BRIEFING.md seção 7 e docs/sprints/M13-spec.md.
//
// Cada exercício tem nome, lista de grupos musculares, nível,
// equipamento, instrucao em prosa, dicas em bullet, GIF estatico
// referenciado por path relativo a assets/exercicios/, e histórico
// de execucoes (data, carga em kg, séries, reps).
//
// Níveis canonicos: iniciante, intermediario, avancado.
// Grupos musculares: lista aberta (string slugs) para não engessar
// novas categorias. ChipGroup da Tela 02 oferece atalhos para os
// 8 mais comuns (peito, costas, pernas, ombros, biceps, triceps,
// core, cardio); o usuario pode digitar outros valores em texto livre
// no futuro (M13.1).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

// Nível canonico. Lista fechada para garantir consistencia visual
// (ChipGroup single na Tela 02). Slug em portugues sem acento para
// não confundir parser YAML.
export const NivelExercicioSchema = z.enum([
  'iniciante',
  'intermediario',
  'avancado',
]);
export type NivelExercicio = z.infer<typeof NivelExercicioSchema>;

// Slug em kebab-case ASCII. Mesma regra que slugifyEvento usa.
const SlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug deve ser kebab-case ASCII');

// Data ISO 8601 com hora (mesmo regex usado em evento.ts e
// diario_emocional.ts). Granularidade até o minuto e suficiente para
// histórico; segundos ficam opcionais.
const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

// Entrada de histórico: uma execucao registrada do exercício.
// Carga em kg (peso), séries e reps inteiros positivos. Sparkline
// (M13) usa carga como eixo Y.
export const HistoricoExecucaoSchema = z.object({
  data: Iso8601,
  carga: z.number().min(0),
  series: z.number().int().min(1),
  reps: z.number().int().min(1),
});
export type HistoricoExecucao = z.infer<typeof HistoricoExecucaoSchema>;

export const ExercicioSchema = z.object({
  tipo: z.literal('exercicio'),
  slug: SlugSchema,
  nome: z.string().min(1),
  // Lista de grupos musculares afetados. Lista aberta de strings;
  // a UI sugere 8 chips em ChipGroup mas aceita valores customizados.
  grupo_muscular: z.array(z.string()).min(1),
  nivel: NivelExercicioSchema,
  equipamento: z.string().min(1),
  instrucao: z.string().min(1),
  dicas: z.array(z.string()).default([]),
  // Path relativo a assets/exercicios/<slug>.gif. Vazio quando não ha
  // GIF cadastrado; UI mostra placeholder Dumbbell + label "Sem midia".
  gif: z.string().default(''),
  historico: z.array(HistoricoExecucaoSchema).default([]),
});

export type Exercicio = z.infer<typeof ExercicioSchema>;
