// Barrel do modulo vault. Importar via '@/lib/vault'.
export {
  formatDateYmd,
  formatDateYmdHm,
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  assetsPath,
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
