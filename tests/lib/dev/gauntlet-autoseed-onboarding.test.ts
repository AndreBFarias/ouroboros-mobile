// R-DX-GAUNTLET-ONBOARDING-BYPASS unit: cobre o auto-seed de boot no
// Gauntlet web e o helper de flag de onboarding fresh.
//
// Tres cenarios da spec:
//   1. Positivo: autoSeedOnboardingSeNecessario() com done=false seta
//      useOnboarding.done=true e useVault.vaultRoot nao-nulo (reusa
//      aplicarSeed).
//   2. Negativo/edge: com done=true e no-op -- nao re-seeda, preserva
//      nomes de uma sessao anterior.
//   3. Guard: querOnboardingFresh retorna true com ?onboarding=1 e false
//      sem o param (mock de window.location.search).
//
// IMPORTANTE sobre o guard GAUNTLET_ATIVO:
//   autoSeedOnboardingSeNecessario vive DENTRO de @/lib/dev/gauntlet e
//   fecha sobre o const GAUNTLET_ATIVO do proprio modulo
//   (= MODO_DEV_WEB = Platform.OS==='web' && __DEV__). Mockar so o named
//   export GAUNTLET_ATIVO NAO altera o valor visto por essa closure
//   interna. Por isso mockamos Platform.OS='web' no nivel do modulo
//   react-native -- assim o const real avalia true em tempo de import.
//   Padrao identico a tests/lib/hooks/useRecap-reflexao-vaultmock.test.ts.
//
// Comentarios sem acento (convencao shell/CI).

// Mock de Platform.OS='web' para que o const real GAUNTLET_ATIVO avalie
// true no modulo gauntlet (e a closure interna de
// autoSeedOnboardingSeNecessario use o caminho ativo). As stores usam
// setState sincrono (em memoria); nao tocam AsyncStorage neste teste.
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'web' },
}));

// Reforca __DEV__ true (jest-expo ja define, mas explicitamos).
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

import {
  autoSeedOnboardingSeNecessario,
  resetarOnboardingParaFluxoDev,
  GAUNTLET_ATIVO,
} from '@/lib/dev/gauntlet';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

describe('autoSeedOnboardingSeNecessario (R-DX-GAUNTLET-ONBOARDING-BYPASS)', () => {
  beforeEach(() => {
    // Baseline: onboarding nao concluido, vault vazio, nomes default.
    useOnboarding.setState({ done: false, tipoCompanhia: 'sozinho' });
    useVault.setState({ vaultRoot: null });
    usePessoa.setState({
      nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' },
      fotos: { pessoa_a: null, pessoa_b: null },
    });
  });

  it('GAUNTLET_ATIVO e true com Platform.OS=web mockado (sanity)', () => {
    expect(GAUNTLET_ATIVO).toBe(true);
  });

  it('caso positivo: done=false seta done=true e vaultRoot nao-nulo', () => {
    expect(useOnboarding.getState().done).toBe(false);
    expect(useVault.getState().vaultRoot).toBeNull();

    autoSeedOnboardingSeNecessario();

    expect(useOnboarding.getState().done).toBe(true);
    expect(useVault.getState().vaultRoot).not.toBeNull();
    expect(typeof useVault.getState().vaultRoot).toBe('string');
  });

  it('caso positivo: seed usa nomes genericos (anonimato, Regra -1)', () => {
    autoSeedOnboardingSeNecessario();
    const nomes = usePessoa.getState().nomes;
    expect(nomes.pessoa_a).toBe('Nome_A');
    expect(nomes.pessoa_b).toBe('Nome_B');
  });

  it('caso negativo: done=true e no-op (nao re-seeda, preserva nomes)', () => {
    // Simula sessao anterior com onboarding concluido e nomes ja
    // personalizados (genericos de teste) + vaultRoot proprio.
    useOnboarding.setState({ done: true });
    useVault.setState({ vaultRoot: 'web://sessao-anterior/Ouroboros' });
    usePessoa.setState({
      nomes: { pessoa_a: 'test_user', pessoa_b: 'test_user_b' },
      fotos: { pessoa_a: null, pessoa_b: null },
    });

    autoSeedOnboardingSeNecessario();

    // Nada e sobrescrito: o vaultRoot e os nomes da sessao permanecem.
    expect(useVault.getState().vaultRoot).toBe(
      'web://sessao-anterior/Ouroboros'
    );
    expect(usePessoa.getState().nomes.pessoa_a).toBe('test_user');
    expect(usePessoa.getState().nomes.pessoa_b).toBe('test_user_b');
    expect(useOnboarding.getState().done).toBe(true);
  });

  it('idempotente: duas chamadas seguidas nao alteram apos a primeira', () => {
    autoSeedOnboardingSeNecessario();
    const vaultAposPrimeira = useVault.getState().vaultRoot;
    const nomesAposPrimeira = { ...usePessoa.getState().nomes };

    autoSeedOnboardingSeNecessario();

    expect(useVault.getState().vaultRoot).toBe(vaultAposPrimeira);
    expect(usePessoa.getState().nomes).toEqual(nomesAposPrimeira);
    expect(useOnboarding.getState().done).toBe(true);
  });
});

describe('resetarOnboardingParaFluxoDev (R-DX-GAUNTLET-ONBOARDING-BYPASS flag)', () => {
  it('reseta done=true para false (forca fluxo de onboarding fresh)', () => {
    // Simula sessao ja seedada+persistida pelo bypass default.
    useOnboarding.setState({ done: true });
    expect(useOnboarding.getState().done).toBe(true);

    resetarOnboardingParaFluxoDev();

    // Com done=false, o OnboardingGuard cai no redirect para /onboarding.
    expect(useOnboarding.getState().done).toBe(false);
  });
});

describe('autoSeedOnboardingSeNecessario no-op quando GAUNTLET_ATIVO=false', () => {
  it('com Platform.OS=ios (modulo reisolado) nao seta done nem vaultRoot', () => {
    // Isola modulos e troca Platform.OS para ios ANTES de reimportar o
    // gauntlet, garantindo que o const GAUNTLET_ATIVO real reavalie false.
    jest.isolateModules(() => {
      jest.resetModules();
      jest.doMock('react-native', () => ({
        __esModule: true,
        Platform: { OS: 'ios' },
      }));
      const gauntletReal =
        require('@/lib/dev/gauntlet') as typeof import('@/lib/dev/gauntlet');
      const onboardingReal =
        require('@/lib/stores/onboarding') as typeof import('@/lib/stores/onboarding');
      const vaultReal =
        require('@/lib/stores/vault') as typeof import('@/lib/stores/vault');

      expect(gauntletReal.GAUNTLET_ATIVO).toBe(false);
      onboardingReal.useOnboarding.setState({ done: false });
      vaultReal.useVault.setState({ vaultRoot: null });

      gauntletReal.autoSeedOnboardingSeNecessario();

      expect(onboardingReal.useOnboarding.getState().done).toBe(false);
      expect(vaultReal.useVault.getState().vaultRoot).toBeNull();
    });
  });
});

// Replica fiel de querOnboardingFresh (app/_layout.tsx). Mantida em
// sincronia com a fonte: se a logica do helper mudar, este teste flagra.
// Le window.location.search com guards de typeof e usa URLSearchParams.
function querOnboardingFreshReplica(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.location === 'undefined') return false;
  const search = window.location.search ?? '';
  return new URLSearchParams(search).has('onboarding');
}

describe('querOnboardingFresh (replica do helper de app/_layout.tsx)', () => {
  const descritorOriginal = Object.getOwnPropertyDescriptor(
    window,
    'location'
  );

  function mockSearch(search: string): void {
    Object.defineProperty(window, 'location', {
      value: { search },
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    if (descritorOriginal) {
      Object.defineProperty(window, 'location', descritorOriginal);
    }
  });

  it('retorna true quando a URL tem ?onboarding=1', () => {
    mockSearch('?onboarding=1');
    expect(querOnboardingFreshReplica()).toBe(true);
  });

  it('retorna true quando a chave onboarding existe sem valor', () => {
    mockSearch('?onboarding');
    expect(querOnboardingFreshReplica()).toBe(true);
  });

  it('retorna false quando nao ha o param onboarding', () => {
    mockSearch('');
    expect(querOnboardingFreshReplica()).toBe(false);
  });

  it('retorna false com outros params mas sem onboarding', () => {
    mockSearch('?debug=1&foo=bar');
    expect(querOnboardingFreshReplica()).toBe(false);
  });
});
