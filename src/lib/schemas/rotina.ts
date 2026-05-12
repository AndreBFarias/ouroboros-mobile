// Schema de Rotina de Treino reusavel (Q11.a, M-ROTINA-TREINO).
// Modelado em docs/FEATURES-CANONICAS.md §4.5: template reutilizavel
// com lista ordenada de exercicios (carga + series + reps + descanso
// + observacao). Cap de 20 exercicios por rotina (cache de UX, manter
// scroll razoavel no form).
//
// Path canonico Q11 (layout-por-tipo H2): markdown/rotina-<slug>.md.
// Slug e a chave: salvar duas vezes no mesmo slug sobrescreve (usado
// para edicao); slug novo cria arquivo novo. Slug derivado do nome
// via kebab-case ASCII.
//
// reps e' string para tolerar formatos heterogeneos canonicos no
// treino livre: "12" (numero exato), "8-10" (faixa), "amrap" (as many
// as possible), "ate falha". sessaoFromRotina converte em number
// (default 10) quando precisa casar com TreinoSessaoSchema rigido.
//
// carga_kg null = peso corporal (flexao, barra, abdominal).
//
// Snapshot imutavel: sessoes ja salvas guardam copia dos exercicios
// (sessaoFromRotina retorna copia), entao editar rotina nao retroage.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from './pessoa';

// YYYY-MM-DD. Aceita 1900..2099, MM 01-12, DD 01-31.
const DataYmd = z
  .string()
  .regex(
    /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    'data deve estar em YYYY-MM-DD'
  );

// Item da lista de exercicios da rotina. Diferente de ExercicioSessao
// (treino_sessao.ts) que tem reps como numero rigido: aqui aceitamos
// string livre para refletir vocabulario real (8-10, amrap, ate falha).
export const ExercicioRotinaSchema = z.object({
  nome: z.string().min(1),
  // null = peso corporal (flexao, barra, abdominal). Numero >= 0
  // representa kg. Sem upper-bound para nao limitar atletas avancados.
  carga_kg: z.number().min(0).nullable(),
  series: z.number().int().positive(),
  reps: z.string().min(1),
  descanso_seg: z.number().int().positive().default(90),
  observacao: z.string().nullable(),
});
export type ExercicioRotina = z.infer<typeof ExercicioRotinaSchema>;

export const RotinaSchema = z.object({
  tipo: z.literal('rotina_treino'),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1),
  descricao: z.string().nullable(),
  // Cap 20 exercicios (feature-canonica §4.5). Min 1 para nao salvar
  // rotina vazia (caso usuario tente abreviar criacao).
  exercicios: z.array(ExercicioRotinaSchema).min(1).max(20),
  data_criacao: DataYmd,
  autor: PessoaAutorSchema,
});
export type RotinaMeta = z.infer<typeof RotinaSchema>;
