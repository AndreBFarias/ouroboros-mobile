// M-GAUNTLET: modulo central da interface dev de validacao visual.
// Expoe window.__gauntlet quando GAUNTLET_ATIVO em web. APIs JS
// determinisicas para o orquestrador controlar o app sem
// depender de cliques em refs volateis ou eventos sinteticos do
// React-Native-Web.
//
// Garantia anti-vazamento:
//   GAUNTLET_ATIVO = Platform.OS === 'web' && __DEV__.
// Em mobile (Android/iOS), Platform.OS !== 'web' bloqueia.
// Em release web (bundling production), __DEV__ vira false e o
// modulo inteiro e tree-shaken pelo Metro/Hermes.
// __DEV__ e injecao do react-native em build time (sempre disponivel,
// nao depende de env var do shell).
//
// Uso (apenas em modo dev):
//   window.__gauntlet.seed();
//   window.__gauntlet.setNomes('Alice', 'Bob');
//   await window.__gauntlet.abrirSheet('humor-rapido');
//   const e = window.__gauntlet.estado();
//
// Comentarios sem acento (convencao shell/CI).
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import { useNavegacao } from '@/lib/stores/navegacao';
import { useSettings } from '@/lib/stores/settings';
import { useGaleriaMock } from '@/lib/dev/galeriaMock';
import { useHumorMock } from '@/lib/dev/humorMock';
import { useDiarioMock } from '@/lib/dev/diarioMock';
import { useEventosMock } from '@/lib/dev/eventosMock';
// M-GAUNTLET-DEAD-CODE-V2: a flag canonica vive em gauntletAtivo (micro-
// modulo zero-deps). Reexportamos como GAUNTLET_ATIVO aqui para back-compat
// de testes existentes (jest mocks de '@/lib/dev/gauntlet') e do
// gauntletDashboard. Consumidores em runtime de release devem importar
// diretamente de '@/lib/dev/gauntletAtivo' para evitar arrastar este
// modulo pesado.
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';

export const GAUNTLET_ATIVO: boolean = MODO_DEV_WEB;

export interface GauntletEstado {
  onboardingDone: boolean;
  tipoCompanhia: string;
  vaultRoot: string | null;
  nomes: { pessoa_a: string; pessoa_b: string };
  fotos: { pessoa_a: string | null; pessoa_b: string | null };
  ultimaRota: string | null;
  menuAberto: boolean;
  rota: string;
  // Auditoria 2026-05-04 (item 25): timestamp do mount inicial
  // do RootLayout em ms (Date.now()) e ms ate fontes prontas.
  bootIniciadoEm: number;
  bootCompletadoEm: number | null;
  // Auditoria 2026-05-04 (item 24): true quando useFonts resolveu.
  bootCompleto: boolean;
}

export interface SeedOpcoes {
  // Default: 'Nome_A' (Regra-1, defaults genericos).
  nomeA?: string;
  // Default: null (modo sozinho). Quando string, ativa modo casal
  // implicito setando tipoCompanhia 'casal'.
  nomeB?: string | null;
  // Default: 'web://mock-vault/Ouroboros'. Prefixo web:// dispara
  // fallback determiniscao em loaders (M27.1 caminho C).
  vaultRoot?: string;
  // Default: null (sem rota a restaurar; vai para Home).
  ultimaRota?: string | null;
}

// Tipo router minimo. expo-router useRouter retorna isto.
interface RouterLike {
  replace: (rota: string) => void;
  push: (rota: string) => void;
}

export interface GauntletAPI {
  seed(opts?: SeedOpcoes): void;
  reset(): void;
  setNomes(nomeA: string, nomeB?: string | null): void;
  setVaultRoot(root: string): void;
  setOnboardingDone(done: boolean): void;
  setUltimaRota(rota: string | null): void;
  abrir(rota: string): Promise<void>;
  abrirMenu(): void;
  fecharMenu(): void;
  abrirSheet(rota: 'humor-rapido' | 'diario-emocional' | 'eventos' | 'scanner'): Promise<void>;
  estado(): GauntletEstado;
  // APIs novas pos auditoria 2026-05-04.
  // Aguarda fontes carregarem e stores hidratarem. Resolve true
  // quando pronto, false em timeout (default 60s).
  aguardarBoot(timeoutMs?: number): Promise<boolean>;
  // Retorna ms entre primeiro mount do RootLayout e fontes prontas.
  // null se ainda nao completou.
  tempoDeBoot(): number | null;
  // Retorna buffer de console.error capturado nesta sessao.
  consoleErros(): Array<{ ts: number; msg: string }>;
  // M11.1 (§2.6): simula adicao manual de foto na aba Fotos sem
  // chamar expo-image-picker (que nao funciona em RN-Web). Insere
  // entrada in-memory na useGaleriaMock que o useFotosAgregadas
  // mescla quando GAUNTLET_ATIVO. No-op em mobile (guard ja filtra).
  adicionarFotoMock(): Promise<void>;
  // M-GAUNTLET-SEED-V2: popula stores mock com fixtures realistas.
  // 'humores-30d' alimenta useHumorMock (heatmap colorido).
  // 'diarios-3' alimenta useDiarioMock (3 entradas: trigger + vitoria
  // + reflexao). 'eventos-7' alimenta useEventosMock (7 eventos em
  // -7d a hoje). No-op em mobile (guard ja filtra).
  seedComDados(fixture: 'humores-30d' | 'diarios-3' | 'eventos-7'): Promise<void>;
}

// Refs internas. routerRef e setado por <InstaladorGauntlet/>
// via setRouterRef. pathnameRef e atualizado por hook que escuta
// usePathname (delegado ao instalador).
let routerRef: RouterLike | null = null;
let pathnameRef: string = '/';

// Auditoria 2026-05-04: timestamps de boot e buffer de erros.
const bootIniciadoEm = Date.now();
let bootCompletadoEm: number | null = null;
const errosCapturados: Array<{ ts: number; msg: string }> = [];

export function setRouterRef(router: RouterLike): void {
  routerRef = router;
}

export function setPathnameRef(pathname: string): void {
  pathnameRef = pathname;
}

// Marca boot completo (chamado pelo RootLayout quando useFonts
// resolve pela primeira vez).
export function marcarBootCompleto(): void {
  if (bootCompletadoEm === null) {
    bootCompletadoEm = Date.now();
  }
}

function lerEstado(): GauntletEstado {
  const ob = useOnboarding.getState();
  const vt = useVault.getState();
  const ps = usePessoa.getState();
  const ss = useSessao.getState();
  const nv = useNavegacao.getState();
  return {
    onboardingDone: ob.done,
    tipoCompanhia: ob.tipoCompanhia,
    vaultRoot: vt.vaultRoot,
    nomes: ps.nomes,
    fotos: ps.fotos,
    ultimaRota: ss.ultimaRota,
    menuAberto: nv.menuAberto,
    rota: pathnameRef,
    bootIniciadoEm,
    bootCompletadoEm,
    bootCompleto: bootCompletadoEm !== null,
  };
}

function aplicarSeed(opts?: SeedOpcoes): void {
  const nomeA = opts?.nomeA ?? 'Nome_A';
  const nomeB = opts?.nomeB ?? null;
  const vaultRoot = opts?.vaultRoot ?? 'web://mock-vault/Ouroboros';
  const ultimaRota = opts?.ultimaRota ?? null;
  const tipoCompanhia = nomeB ? 'casal' : 'sozinho';
  // setState bypassa persist async; estado fica em memoria, suficiente
  // para validacao de UI em web. Reload da pagina perde o seed -- por
  // design.
  useOnboarding.setState({ done: true, tipoCompanhia });
  useVault.setState({ vaultRoot });
  usePessoa.setState({
    nomes: { pessoa_a: nomeA, pessoa_b: nomeB ?? 'Nome_B' },
    fotos: { pessoa_a: null, pessoa_b: null },
  });
  useSessao.setState({ ultimaRota });
  // Auditoria 2026-05-04 (item 6): garantir consistencia com reset.
  useNavegacao.setState({ menuAberto: false });
  // M-GAUNTLET-SEED-DUO: useSettings.pessoa.tipoCompanhia e o canonico
  // atual (M29). Componentes M31/M33 leem dele -- sem isto, modo casal
  // do seed nao reflete em UI nova (chips ficam ocultos).
  // Valores: 'sozinho' | 'duo' (canonico M29, distinto de useOnboarding
  // legado que ainda aceita 'casal'/'amigos').
  const tipoCompanhiaSettings = nomeB ? 'duo' : 'sozinho';
  const settingsAtual = useSettings.getState();
  useSettings.setState({
    pessoa: {
      ...settingsAtual.pessoa,
      tipoCompanhia: tipoCompanhiaSettings,
    },
  });
}

function aplicarReset(): void {
  useOnboarding.setState({ done: false, tipoCompanhia: 'sozinho' });
  useVault.setState({ vaultRoot: null });
  usePessoa.setState({
    nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' },
    fotos: { pessoa_a: null, pessoa_b: null },
  });
  useSessao.setState({ ultimaRota: null });
  useNavegacao.setState({ menuAberto: false });
  // M-GAUNTLET-SEED-DUO: reset tambem do canonico useSettings.
  const settingsAtual = useSettings.getState();
  useSettings.setState({
    pessoa: { ...settingsAtual.pessoa, tipoCompanhia: 'sozinho' },
  });
  // M11.1: galeria mock zerada para que cada caso E2E comece limpo.
  useGaleriaMock.getState().limpar();
  // M-GAUNTLET-SEED-V2: zerar stores de dados (humor, diario, eventos)
  // para isolar casos E2E.
  useHumorMock.getState().limpar();
  useDiarioMock.getState().limpar();
  useEventosMock.getState().limpar();
  // Auditoria 2026-05-04 (item 7): limpar localStorage do persist
  // em web para que reload nao re-hidrate estado anterior. Em mobile,
  // o GAUNTLET_ATIVO=false ja impede chegar ate aqui.
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.removeItem('ouroboros.onboarding');
      window.localStorage?.removeItem('ouroboros.onboarding.v2');
      window.localStorage?.removeItem('ouroboros.onboarding.v3');
      window.localStorage?.removeItem('ouroboros.vault');
      window.localStorage?.removeItem('ouroboros.pessoa');
      window.localStorage?.removeItem('ouroboros.sessao.v1');
      window.localStorage?.removeItem('ouroboros.settings.v2');
    } catch {
      // ignora -- modo privado, iframe sem permissao.
    }
  }
  // Reseta pathnameRef interno.
  pathnameRef = '/';
}

function aplicarSetNomes(nomeA: string, nomeB?: string | null): void {
  const tipoCompanhia = nomeB ? 'casal' : 'sozinho';
  usePessoa.setState({
    nomes: { pessoa_a: nomeA, pessoa_b: nomeB ?? 'Nome_B' },
  });
  useOnboarding.setState({ tipoCompanhia });
  // M-GAUNTLET-SEED-DUO: espelha em useSettings (canonico M29).
  const tipoCompanhiaSettings = nomeB ? 'duo' : 'sozinho';
  const settingsAtual = useSettings.getState();
  useSettings.setState({
    pessoa: {
      ...settingsAtual.pessoa,
      tipoCompanhia: tipoCompanhiaSettings,
    },
  });
}

function navegar(rota: string): Promise<void> {
  if (!routerRef) {
    throw new Error('Gauntlet: router nao instalado. Aguarde o mount.');
  }
  routerRef.replace(rota);
  // Pequeno delay para o expo-router processar antes do caller
  // consumir snapshot (Promise resolve no proximo macrotask).
  return new Promise((resolve) => setTimeout(resolve, 50));
}

// Helper: noop em mobile/release; chama fn em dev/web.
// Auditoria 2026-05-04 (item 3, 5): cada metodo publico checa
// GAUNTLET_ATIVO antes de tocar nas stores. Sem isto, import direto
// da const `gauntlet` em mobile real vazaria bypass.
function comGuard<T extends unknown[], R>(fn: (...args: T) => R, fallback: R): (...args: T) => R {
  return (...args: T): R => {
    if (!GAUNTLET_ATIVO) return fallback;
    return fn(...args);
  };
}

const ESTADO_MOCK_MOBILE: GauntletEstado = {
  onboardingDone: false,
  tipoCompanhia: 'sozinho',
  vaultRoot: null,
  nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' },
  fotos: { pessoa_a: null, pessoa_b: null },
  ultimaRota: null,
  menuAberto: false,
  rota: '/',
  bootIniciadoEm: 0,
  bootCompletadoEm: null,
  bootCompleto: false,
};

async function aguardarBoot(timeoutMs: number = 60000): Promise<boolean> {
  if (!GAUNTLET_ATIVO) return false;
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    if (bootCompletadoEm !== null) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

function tempoDeBoot(): number | null {
  if (!GAUNTLET_ATIVO) return null;
  if (bootCompletadoEm === null) return null;
  return bootCompletadoEm - bootIniciadoEm;
}

function consoleErros(): Array<{ ts: number; msg: string }> {
  if (!GAUNTLET_ATIVO) return [];
  return errosCapturados.slice();
}

// M-GAUNTLET-SEED-V2: aplica fixture nas stores mock. Import dinamico
// para evitar ciclo (seedDeterministico importa gauntlet). require()
// resolve sob demanda, mas TS strict precisa de tipo explicito.
async function aplicarSeedComDados(
  fixture: 'humores-30d' | 'diarios-3' | 'eventos-7'
): Promise<void> {
  // Import dinamico do seedDeterministico para quebrar ciclo. Em
  // tempo de execucao web/dev, o bundle ja inclui ambos os modulos.
  const seed = await import('@/lib/dev/seedDeterministico');
  if (fixture === 'humores-30d') {
    seed.seedHumores(30);
  } else if (fixture === 'diarios-3') {
    seed.seedDiarios(3);
  } else if (fixture === 'eventos-7') {
    seed.seedEventos(7);
  }
}

// M11.1: insere entrada deterministica em useGaleriaMock simulando
// "usuario tocou FAB + escolheu foto". Path nao bate em arquivo
// real -- e so um marcador para o useFotosAgregadas mostrar a
// thumbnail no grid quando estiver em web/dev.
async function aplicarAdicionarFotoMock(): Promise<void> {
  const ts = Date.now();
  const data = new Date(ts).toISOString().slice(0, 10);
  const slug = `mock-${ts}`;
  useGaleriaMock.getState().adicionar({
    uri: `web://mock/foto-${ts}.jpg`,
    data,
    origemPath: `media/fotos/mock-${ts}.jpg`,
    origemSlug: slug,
  });
}

const api: GauntletAPI = {
  seed: comGuard(aplicarSeed, undefined as void),
  reset: comGuard(aplicarReset, undefined as void),
  setNomes: comGuard(aplicarSetNomes, undefined as void),
  setVaultRoot: comGuard(
    (root: string) => useVault.setState({ vaultRoot: root }),
    undefined as void
  ),
  setOnboardingDone: comGuard(
    (done: boolean) => useOnboarding.setState({ done }),
    undefined as void
  ),
  setUltimaRota: comGuard(
    (rota: string | null) => useSessao.setState({ ultimaRota: rota }),
    undefined as void
  ),
  abrir: async (rota) => {
    if (!GAUNTLET_ATIVO) return;
    return navegar(rota);
  },
  abrirMenu: comGuard(() => useNavegacao.setState({ menuAberto: true }), undefined as void),
  fecharMenu: comGuard(() => useNavegacao.setState({ menuAberto: false }), undefined as void),
  abrirSheet: async (rota) => {
    if (!GAUNTLET_ATIVO) return;
    // Garante seed minimo antes de tentar abrir sheet (rota modal
    // exige onboarding done + vaultRoot, senao redireciona para
    // /onboarding).
    if (!useOnboarding.getState().done) {
      aplicarSeed();
    }
    // Auditoria 2026-05-04 (item 14): aviso explicito da limitacao
    // @gorhom/bottom-sheet em web.
    if (typeof console !== 'undefined' && typeof window !== 'undefined') {
      console.warn(
        '[gauntlet] abrirSheet em web pode redirecionar para chrome-error pela limitacao @gorhom/bottom-sheet. Use Nivel B para sheets.'
      );
    }
    await navegar(`/${rota}`);
  },
  estado: () => (GAUNTLET_ATIVO ? lerEstado() : ESTADO_MOCK_MOBILE),
  aguardarBoot,
  tempoDeBoot,
  consoleErros,
  adicionarFotoMock: async () => {
    if (!GAUNTLET_ATIVO) return;
    await aplicarAdicionarFotoMock();
  },
  seedComDados: async (fixture) => {
    if (!GAUNTLET_ATIVO) return;
    await aplicarSeedComDados(fixture);
  },
};

// Auditoria 2026-05-04 (item 27): captura console.error para o
// orquestrador inspecionar via __gauntlet.consoleErros(). So ativa
// em modo dev web para nao impactar perf de release.
if (GAUNTLET_ATIVO && typeof console !== 'undefined') {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    try {
      const msg = args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ');
      errosCapturados.push({ ts: Date.now(), msg });
      if (errosCapturados.length > 200) errosCapturados.shift();
    } catch {
      // nao deixa o capturador derrubar console.error original.
    }
    origError(...(args as Parameters<typeof console.error>));
  };
}

export function instalarGauntlet(): void {
  if (!GAUNTLET_ATIVO) return;
  if (typeof globalThis === 'undefined') return;
  // Idempotente: chamadas repetidas substituem a referencia, util
  // em hot-reload do Metro.
  (globalThis as unknown as { __gauntlet: GauntletAPI }).__gauntlet = api;
}

export function desinstalarGauntlet(): void {
  if (typeof globalThis === 'undefined') return;
  delete (globalThis as unknown as { __gauntlet?: GauntletAPI }).__gauntlet;
}

// Exporta direto para casos onde o orquestrador prefere
// import vs window. Em testes Jest, esta API tambem fica disponivel
// via mock direto da modulo.
export const gauntlet: GauntletAPI = api;
