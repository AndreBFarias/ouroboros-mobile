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
export { ParaSchema, type Para } from './para';
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
  RecorrenciaSchema,
  RECORRENCIA_LABELS,
  RECORRENCIAS_CANONICAS,
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
  type Recorrencia,
} from './alarme';
export {
  TarefaSchema,
  TarefaPessoaDestinoSchema,
  TarefaAlarmeSchema,
  TAREFA_CATEGORIAS,
  TAREFA_CATEGORIA_LABELS,
  slugifyTitulo as slugifyTarefa,
  sufixoRandom,
  type Tarefa,
  type TarefaCategoria,
  type TarefaPessoaDestino,
  type TarefaAlarme,
} from './tarefa';
export {
  ContadorSchema,
  slugifyTitulo as slugifyContador,
  sufixoRandom as sufixoRandomContador,
  type Contador,
} from './contador';
export {
  EventoContadorSchema,
  slugifyDescricao as slugifyEventoContador,
  sufixoRandomEvento as sufixoRandomEventoContador,
  type EventoContador,
} from './evento_contador';
export {
  RotinaSchema,
  ExercicioRotinaSchema,
  type RotinaMeta,
  type ExercicioRotina,
} from './rotina';
export { GrupoTreinoSchema, type GrupoTreino } from './grupo_treino';
export {
  MidiaSchema,
  MidiaSpotifySchema,
  MidiaYoutubeSchema,
  MidiaFotoSchema,
  MidiaAudioSchema,
  type Midia,
  type MidiaSpotify,
  type MidiaYoutube,
  type MidiaFoto,
  type MidiaAudio,
} from './midia';
export {
  MidiaCompanionSchema,
  TipoMidiaSchema,
  subpastaPara,
  tipoPorSubpasta,
  tipoPorExtensao,
  type MidiaCompanion,
  type TipoMidiaCanonico,
} from './midia-companion';
export {
  HumorHeatmapCacheSchema,
  HumorHeatmapCellSchema,
  HumorHeatmapEstatisticaSchema,
  type HumorHeatmapCache,
  type HumorHeatmapCell,
  type HumorHeatmapEstatistica,
} from './humor_heatmap_cache';
export {
  FinancasCacheSchema,
  FinancasTransacaoSchema,
  FinancasTopCategoriaSchema,
  FinancasTipoSchema,
  type FinancasCache,
  type FinancasTransacao,
  type FinancasTopCategoria,
  type FinancasTipo,
} from './financas-cache';
export {
  FinanceiroNotaSchema,
  CategoriaNotaSchema,
  type FinanceiroNotaMeta,
  type CategoriaNota,
} from './financeiro_nota';
