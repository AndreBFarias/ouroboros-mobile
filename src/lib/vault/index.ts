// Barrel do modulo vault. Importar via '@/lib/vault'.
export {
  formatDateYmd,
  formatDateYmdHm,
  formatDateYmdHms,
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  assetsPath,
  inboxFinanceiroPath,
  inboxFinanceiroNotaPath,
  exerciciosPath,
  exerciciosGifPath,
  treinosDraftPath,
  treinosPath,
  marcosPath,
  medidasPath,
  medidasFotoPath,
  cicloPath,
  alarmesPath,
  contadoresPath,
  mediaFotosPath,
  mediaAudiosPath,
  mediaVideosPath,
  mediaFrasesPath,
  mediaAvataresPath,
  mediaScannerPath,
  fileMatchesDate,
  VAULT_FOLDERS,
} from './paths';
export type { VaultFolderKey } from './paths';

export { parseFrontmatter, stringifyFrontmatter } from './frontmatter';
export type { ParsedFrontmatter } from './frontmatter';

export { readVaultFile, listVaultFolder } from './reader';
export { writeVaultFile } from './writer';

export {
  requestVaultPermission,
  loadVaultRoot,
  clearVaultRootStorage,
  inicializarVaultCanonico,
  garantirSubpastas,
  pedirPermissaoStorage,
  SUBPASTAS_CANONICAS,
  VAULT_ROOT_STORAGE_KEY,
  VAULT_CANONICO_PATH,
  VAULT_CANONICO_URI,
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
