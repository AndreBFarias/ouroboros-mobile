// Barrel de schemas zod. Toda sprint que cria schema novo adiciona
// linha aqui (CONTRACT seção 1.3). Importar como
// `import { HumorSchema, type HumorMeta } from '@/lib/schemas';`.
export {
  PessoaIdSchema,
  PessoaAutorSchema,
  type PessoaId,
  type PessoaAutor,
  isAutor,
} from './pessoa';
export { HumorSchema, type HumorMeta } from './humor';
export {
  EventoSchema,
  EventoModoSchema,
  type EventoMeta,
  type EventoModo,
} from './evento';
export {
  DiarioEmocionalSchema,
  DiarioEmocionalModoSchema,
  ContextoSocialSchema,
  type DiarioEmocionalMeta,
  type DiarioEmocionalModo,
  type ContextoSocial,
} from './diario_emocional';
export {
  InboxArquivoSchema,
  InboxArquivoSubtipoSchema,
  type InboxArquivoMeta,
  type InboxArquivoSubtipo,
} from './inbox_arquivo';
export {
  ExercicioSchema,
  NivelExercicioSchema,
  HistoricoExecucaoSchema,
  type Exercicio,
  type NivelExercicio,
  type HistoricoExecucao,
} from './exercicio';
export {
  TreinoSessaoSchema,
  ExercicioSessaoSchema,
  type TreinoSessao,
  type ExercicioSessao,
} from './treino_sessao';
export {
  MarcoSchema,
  MarcoOrigemSchema,
  type Marco,
  type MarcoOrigem,
} from './marco';
export {
  MedidasSchema,
  MEDIDAS_CAMPOS,
  MEDIDAS_LABELS,
  type Medida,
  type MedidaCampo,
} from './medidas';
export {
  CicloMenstrualSchema,
  FaseCicloSchema,
  SintomaCicloSchema,
  SINTOMAS_LABELS,
  SINTOMAS_CANONICOS,
  FASES_LABELS,
  FASES_CANONICAS,
  type CicloMenstrualMeta,
  type FaseCiclo,
  type SintomaCiclo,
} from './ciclo_menstrual';
export {
  AlarmeSchema,
  AlarmeTagSchema,
  AlarmeSomSchema,
  DiaSemanaSchema,
  TAG_LABELS,
  SOM_LABELS,
  TAGS_CANONICAS,
  SONS_CANONICOS,
  DIAS_SEMANA_LABELS,
  DIAS_SEMANA_NOMES,
  LIMITE_SCHEDULES,
  slugifyTitulo,
  type Alarme,
  type AlarmeTag,
  type AlarmeSom,
} from './alarme';
export {
  TarefaSchema,
  slugifyTitulo as slugifyTarefa,
  sufixoRandom,
  type Tarefa,
} from './tarefa';
export {
  ContadorSchema,
  slugifyTitulo as slugifyContador,
  sufixoRandom as sufixoRandomContador,
  type Contador,
} from './contador';
export {
  HumorHeatmapCacheSchema,
  HumorHeatmapCellSchema,
  HumorHeatmapEstatisticaSchema,
  type HumorHeatmapCache,
  type HumorHeatmapCell,
  type HumorHeatmapEstatistica,
} from './humor_heatmap_cache';
