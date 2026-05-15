// Wrappers tipados sobre `react-native-health-connect` para checar
// disponibilidade do SDK e inicializa-lo em runtime. Q17.a
// (Onda Q, 2026-05-13).
//
// SdkAvailabilityStatus do modulo nativo retorna codigo numerico:
//   1 = SDK_AVAILABLE
//   2 = SDK_UNAVAILABLE
//   3 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
//
// Mapeamos para union de strings legivel para a UI usar diretamente
// (`'available' | 'needs_update' | 'unavailable'`).
//
// Lazy require: o modulo nativo nao carrega em Expo Go (web/jest).
// Caller que tentar usar em ambiente sem suporte recebe 'unavailable'
// sem crashar o bundle.
//
// Comentarios sem acento (convencao shell/CI).

export type HealthSdkStatus = 'available' | 'needs_update' | 'unavailable';

interface HealthConnectModule {
  getSdkStatus: (providerPackageName?: string) => Promise<number>;
  initialize: (providerPackageName?: string) => Promise<boolean>;
  openHealthConnectSettings: () => void;
}

const STATUS_AVAILABLE = 1;
const STATUS_UNAVAILABLE = 2;
const STATUS_PROVIDER_UPDATE_REQUIRED = 3;

function carregarModulo(): HealthConnectModule | null {
  try {
    const mod =
      require('react-native-health-connect') as Partial<HealthConnectModule>;
    if (
      typeof mod.getSdkStatus !== 'function' ||
      typeof mod.initialize !== 'function' ||
      typeof mod.openHealthConnectSettings !== 'function'
    ) {
      return null;
    }
    return mod as HealthConnectModule;
  } catch {
    return null;
  }
}

// Retorna o status atual do SDK do Health Connect.
// 'unavailable' inclui (a) modulo nativo ausente, (b) Android < 8
// sem provider instalado, (c) erro generico na chamada do SDK.
export async function verificarDisponibilidade(): Promise<HealthSdkStatus> {
  const mod = carregarModulo();
  if (!mod) return 'unavailable';
  try {
    const code = await mod.getSdkStatus();
    if (code === STATUS_AVAILABLE) return 'available';
    if (code === STATUS_PROVIDER_UPDATE_REQUIRED) return 'needs_update';
    if (code === STATUS_UNAVAILABLE) return 'unavailable';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

// Inicializa o cliente do Health Connect. Idempotente: pode ser
// chamado varias vezes sem efeito colateral. Retorna true se OK.
export async function inicializarHealthConnect(): Promise<boolean> {
  const mod = carregarModulo();
  if (!mod) return false;
  try {
    return await mod.initialize();
  } catch {
    return false;
  }
}

// Abre o app de configuracoes do Health Connect (settings activity
// nativa do sistema). No-op se modulo indisponivel.
export function abrirSettingsHealthConnect(): void {
  const mod = carregarModulo();
  if (!mod) return;
  try {
    mod.openHealthConnectSettings();
  } catch {
    // Sem fallback: usuario pode procurar manualmente em Configuracoes
    // do Android se intent falhar.
  }
}
