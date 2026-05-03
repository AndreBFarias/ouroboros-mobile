// Barrel de stores zustand. Toda sprint que cria store novo adiciona
// linha aqui (CONTRACT seção 1.4). Importar como
// `import { usePessoa, useVault } from '@/lib/stores';`.
export { usePessoa, nomeDe } from './pessoa';
export { useVault } from './vault';
export {
  useOnboarding,
  type TipoCompanhia as OnboardingTipoCompanhia,
} from './onboarding';
export { useHasHydrated } from './hydrated';
export {
  useSettings,
  type SettingsState,
  type SyncMethod,
  type ScannerQualidade,
  type TipoCompanhia,
  type Lembrete,
} from './settings';
