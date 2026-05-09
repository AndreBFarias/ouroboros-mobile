// Barrel do modulo vault. Importar via '@/lib/vault'.
export {
  vaultUriJoin,
  formatDateYmd,
  formatDateYmdHm,
  formatDateYmdHms,
  // H2 helpers canonicos (layout-por-tipo, ADR-0023)
  humorPath,
  diarioPath,
  eventoPath,
  marcoPath,
  medidasPath,
  medidasFotoPath,
  medidasFotoCompanionPath,
  exercicioPath,
  exercicioGifPath,
  cicloPath,
  alarmePath,
  tarefaPath,
  contadorPath,
  notaPath,
  notaArquivoPath,
  fotoPath,
  fotoCompanionPath,
  audioPath,
  audioCompanionPath,
  videoPath,
  videoCompanionPath,
  frasePath,
  scannerPath,
  scannerCompanionPath,
  avatarPath,
  agendaEventoPath,
  devicesIndexPath,
  humorHeatmapCachePath,
  financasCachePath,
  // Constantes de pasta canonicas
  MARKDOWN_FOLDER,
  PNG_FOLDER,
  JPG_FOLDER,
  M4A_FOLDER,
  MP4_FOLDER,
  PDF_FOLDER,
  GIF_FOLDER,
  CACHE_FOLDER,
  VAULT_FOLDERS,
  // Helpers utilitarios
  fileMatchesDate,
  matchesFeaturePrefix,
  // Helpers legados (compatibilidade fora do escopo H2)
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  assetsPath,
  assetsAudioPath,
  inboxFinanceiroPath,
  inboxFinanceiroNotaPath,
  exerciciosPath,
  exerciciosGifPath,
  treinosDraftPath,
  treinosPath,
  marcosPath,
  alarmesPath,
  tarefasPath,
  contadoresPath,
  mediaFotosPath,
  mediaAudiosPath,
  mediaVideosPath,
  mediaFrasesPath,
  mediaAvataresPath,
  mediaScannerPath,
  agendaPessoaFolder,
} from './paths';
export type { VaultFolder } from './paths';

export { parseFrontmatter, stringifyFrontmatter } from './frontmatter';
export type { ParsedFrontmatter } from './frontmatter';

export { readVaultFile, listVaultFolder } from './reader';
export { writeVaultFile } from './writer';

export {
  requestVaultPermission,
  loadVaultRoot,
  clearVaultRootStorage,
  inicializarVaultEscolhido,
  garantirSubpastas,
  pedirPermissaoStorage,
  safTreeUriToFileUri,
  sanearTrailingSpaceFolder,
  sugestaoVaultPathDefault,
  sugestaoVaultUriDefault,
  SUBPASTAS_CANONICAS,
  VAULT_ROOT_STORAGE_KEY,
} from './permissions';
export type {
  ModoInicializacao,
  ResultadoInicializacao,
} from './permissions';

export {
  listarExercicios,
  lerExercicio,
  escreverExercicio,
  excluirExercicio,
} from './exercicios';
export type { ListarExerciciosFiltros } from './exercicios';

export {
  listarTreinos,
  escreverTreino,
  excluirTreino,
} from './treinos';
export type { ListarTreinosFiltros } from './treinos';

export {
  listarMarcos,
  escreverMarco,
  excluirMarco,
} from './marcos';
export type { ListarMarcosFiltros } from './marcos';

export {
  listarMedidas,
  lerUltimaMedida,
  escreverMedida,
} from './medidas';
export type { ListarMedidasFiltros, MedidasPeriodo } from './medidas';

export {
  listarRegistrosCiclo,
  lerRegistroCiclo,
  escreverRegistroCiclo,
  inferirFase,
  duracaoCicloDetectada,
  ultimaDataInicio,
} from './ciclo';
export type { ListarRegistrosCicloFiltros, CicloPeriodo } from './ciclo';

export {
  listarAlarmes,
  lerAlarme,
  escreverAlarme,
  excluirAlarme,
} from './alarmes';

export {
  listarContadores,
  lerContador,
  escreverContador,
  excluirContador,
  registrarReset,
} from './contadores';

// M36: helpers de leitura agregada para o Recap.
export { listarHumor } from './humor';
export { listarDiarios } from './diario';
export { listarEventos } from './eventos';

export {
  escreverMidiaComCompanion,
  lerCompanion,
  migrarAssetsLegacyParaMedia,
} from './midiaCompanion';
export type {
  EscreverMidiaResultado,
  MigracaoResultado,
} from './midiaCompanion';
