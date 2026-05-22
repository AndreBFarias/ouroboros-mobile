// Wrappers tipados sobre `ouroboros-health-connect` (modulo local
// Expo, vide modules/health-connect/) para checar disponibilidade do
// SDK e inicializa-lo em runtime. Q17.a (Onda Q, 2026-05-13).
//
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint A (2026-05-22): trocado o
// require de `react-native-health-connect@3.5.3` (pendurado em
// connect-client 1.1.0-alpha11 obsoleto) por modulo local proprio
// `ouroboros-health-connect` que usa connect-client 1.2.0-alpha04.
// O modulo local ja faz no-op silencioso em ambiente sem suporte
// (requireOptionalNativeModule devolve null), entao o Reflect.get
// defensivo da hardening anterior (Proxy do upstream que lancava ao
// acessar getter) nao e mais necessario aqui. Mantemos o lazy require
// para preservar a forma de mock em testes (jest.doMock por escopo).
//
// SdkAvailabilityStatus do modulo nativo retorna codigo numerico:
//   1 = SDK_AVAILABLE
//   2 = SDK_UNAVAILABLE
//   3 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
//
// Mapeamos para union de strings legivel para a UI usar diretamente
// (`'available' | 'needs_update' | 'unavailable'`).
//
// Comentarios sem acento (convencao shell/CI).

export type HealthSdkStatus = 'available' | 'needs_update' | 'unavailable';

interface HealthConnectModule {
  getSdkStatus: () => Promise<number>;
  initialize: () => Promise<boolean>;
  openHealthConnectSettings: () => void;
}

const STATUS_AVAILABLE = 1;
const STATUS_UNAVAILABLE = 2;
const STATUS_PROVIDER_UPDATE_REQUIRED = 3;

function carregarModulo(): HealthConnectModule | null {
  try {
    // Path relativo segue padrao do projeto (vide
    // src/lib/widget/atualizarWidgetHomescreen.ts importando
    // ../../../modules/widget-homescreen/src). Sem criar pacote
    // npm publishavel desnecessario.
    const mod = require('../../../modules/health-connect/src');
    const getSdkStatus = mod?.getSdkStatus;
    const initialize = mod?.initialize;
    const openHealthConnectSettings = mod?.openHealthConnectSettings;
    if (
      typeof getSdkStatus !== 'function' ||
      typeof initialize !== 'function' ||
      typeof openHealthConnectSettings !== 'function'
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
