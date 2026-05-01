// Schema do arquivo treinos/YYYY-MM-DD-slug.md (sessao formal de
// treino). Modelado em docs/sprints/M11-spec.md seção 2.
//
// Sessao formal nasce em duas frentes:
//  1. CRUD direto na Tela 11 / Tela 10 via SheetNovoTreino.
//  2. Migracao de drafts da M13 (treinos/draft/<...>.md) feita uma
//     unica vez no boot (verificarMigracaoDrafts em
//     src/lib/treinos/migrarDraftsParaTreinoSessao.ts).
//
// Cada sessao tem rotina (nome livre, ex: "rotina A"), duracao em
// minutos (1-240), array de exercícios com séries/reps/carga e
// observacoes opcionais.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// ISO 8601 com hora (mesmo padrao de evento.ts e diario_emocional.ts).
const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

// Item da lista de exercícios da sessao. Carga em kg opcional (ex:
// peso corporal). Observacao livre por exercício.
export const ExercicioSessaoSchema = z.object({
  nome: z.string().min(1),
  series: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  carga_kg: z.number().min(0).optional(),
  observacao: z.string().optional(),
});
export type ExercicioSessao = z.infer<typeof ExercicioSessaoSchema>;

export const TreinoSessaoSchema = z.object({
  tipo: z.literal('treino_sessao'),
  data: Iso8601,
  autor: PessoaAutorSchema,
  rotina: z.string().optional(),
  duracao_min: z.number().int().min(1).max(240),
  exercicios: z.array(ExercicioSessaoSchema).min(1),
  observacoes: z.string().optional(),
});

export type TreinoSessao = z.infer<typeof TreinoSessaoSchema>;
