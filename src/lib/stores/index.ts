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
// adicionado por M24:
export {
  useSessao,
  RASCUNHO_TEXTO_CAP,
  CANARY_SOFT_LIMIT,
  type SessaoState,
  type RascunhosState,
  type RascunhoKey,
  type RascunhoTipo,
  type PermissaoKey,
  type PermissoesPedidasState,
  type HumorParcial,
  type DiarioParcial,
  type EventoParcial,
  type CicloParcial,
  type AlarmeParcial,
  type ContadorParcial,
  type TarefaParcial,
} from './sessao';
