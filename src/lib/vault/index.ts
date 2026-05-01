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
  exerciciosPath,
  exerciciosGifPath,
  treinosDraftPath,
  treinosPath,
  marcosPath,
  medidasPath,
  medidasFotoPath,
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
  VAULT_ROOT_STORAGE_KEY,
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
