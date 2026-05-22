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
// R-ROT-2: categoria amplia a semantica de Rotina alem de treino. O
// app trata Rotina como template recorrente generico (medicacao,
// habito, leitura, saude_fisica). Default 'outro' garante retro-compat
// silenciosa com rotinas existentes sem o campo. Enum fechado evita
// drift textual entre dispositivos sincronizados via Syncthing.
//
// R-ROT-1-D: silenciar_sugestao_ate opcional permite que o usuario
// rejeite o banner de sugestao de alarme temporal (derivado do helper
// inteligenciaTemporal de treino) por 30 dias. Default null garante
// retro-compat silenciosa com rotinas anteriores a esta sprint. ISO
// datetime com offset alinhado aos demais campos do projeto.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from './pessoa';

// ISO datetime com offset (ex: 2026-06-20T15:00:00-03:00). Mesmo padrao
// usado em alarme.ts e silenciar_sugestao_ate de tarefa.ts.
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

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
  // Q18.b: path relativo ao vaultRoot da midia de execucao (GIF/JPG/MP4).
  // Snapshot na hora de criar/editar a rotina; o executor renderiza esse
  // path diretamente. Optional pra retro-compat com rotinas anteriores.
  gif: z.string().optional(),
});
export type ExercicioRotina = z.infer<typeof ExercicioRotinaSchema>;

// R-ROT-2: categorias canonicas de Rotina. Enum fechado evita drift
// textual entre dispositivos sincronizados (Syncthing) e simplifica
// filtros futuros. Default 'outro' para retro-compat com rotinas
// gravadas antes desta sprint.
//
// Semantica:
//  - medicacao    : remedio recorrente (diario, com horario fixo).
//  - saude_fisica : treino, caminhada, alongamento (uso historico Q11).
//  - habito       : leitura, beber agua, meditar, escrever.
//  - outro        : default catch-all e legacy migration.
export const ROTINA_CATEGORIAS = [
  'medicacao',
  'saude_fisica',
  'habito',
  'outro',
] as const;

export type RotinaCategoria = (typeof ROTINA_CATEGORIAS)[number];

export const ROTINA_CATEGORIA_LABELS: Record<RotinaCategoria, string> = {
  medicacao: 'Medicação',
  saude_fisica: 'Saúde física',
  habito: 'Hábito',
  outro: 'Outro',
};

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
  // R-ROT-2: categoria amplia semantica de Rotina alem de treino.
  // Default 'outro' para retro-compat silenciosa com rotinas que nao
  // tinham o campo (parse de .md antigo vira meta com categoria 'outro'
  // automaticamente).
  categoria: z.enum(ROTINA_CATEGORIAS).default('outro'),
  // R-ROT-1-D: ate quando suprimir banner de sugestao temporal de
  // alarme derivado do helper inteligenciaTemporal de treino. Default
  // null (nunca silenciado). Setado quando usuario rejeita banner
  // (silencio de 30 dias). Mesma semantica de silenciar_sugestao_ate
  // em alarme.ts e tarefa.ts.
  silenciar_sugestao_ate: IsoDatetime.nullable().default(null),
});
export type RotinaMeta = z.infer<typeof RotinaSchema>;
