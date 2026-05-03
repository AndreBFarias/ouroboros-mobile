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
import { Platform } from 'react-native';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import { useNavegacao } from '@/lib/stores/navegacao';

// __DEV__ e injetado pelo react-native (true em dev, false em release).
// Declarado para typecheck strict.
declare const __DEV__: boolean;

export const GAUNTLET_ATIVO: boolean =
  Platform.OS === 'web' && (typeof __DEV__ !== 'undefined' ? __DEV__ : false);

export interface GauntletEstado {
  onboardingDone: boolean;
  tipoCompanhia: string;
  vaultRoot: string | null;
  nomes: { pessoa_a: string; pessoa_b: string };
  fotos: { pessoa_a: string | null; pessoa_b: string | null };
  ultimaRota: string | null;
  menuAberto: boolean;
  rota: string;
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
}

// Refs internas. routerRef e setado por <InstaladorGauntlet/>
// via setRouterRef. pathnameRef e atualizado por hook que escuta
// usePathname (delegado ao instalador).
let routerRef: RouterLike | null = null;
let pathnameRef: string = '/';

export function setRouterRef(router: RouterLike): void {
  routerRef = router;
}

export function setPathnameRef(pathname: string): void {
  pathnameRef = pathname;
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
}

function aplicarSetNomes(nomeA: string, nomeB?: string | null): void {
  const tipoCompanhia = nomeB ? 'casal' : 'sozinho';
  usePessoa.setState({
    nomes: { pessoa_a: nomeA, pessoa_b: nomeB ?? 'Nome_B' },
  });
  useOnboarding.setState({ tipoCompanhia });
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

const api: GauntletAPI = {
  seed: aplicarSeed,
  reset: aplicarReset,
  setNomes: aplicarSetNomes,
  setVaultRoot: (root) => useVault.setState({ vaultRoot: root }),
  setOnboardingDone: (done) => useOnboarding.setState({ done }),
  setUltimaRota: (rota) => useSessao.setState({ ultimaRota: rota }),
  abrir: navegar,
  abrirMenu: () => useNavegacao.setState({ menuAberto: true }),
  fecharMenu: () => useNavegacao.setState({ menuAberto: false }),
  abrirSheet: async (rota) => {
    // Garante seed minimo antes de tentar abrir sheet (rota modal
    // exige onboarding done + vaultRoot, senao redireciona para
    // /onboarding).
    if (!useOnboarding.getState().done) {
      aplicarSeed();
    }
    await navegar(`/${rota}`);
  },
  estado: lerEstado,
};

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
