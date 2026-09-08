// M-GAUNTLET-SEED-DUO unit: o seed do Gauntlet propaga a companhia
// para useSettings.pessoa.tipoCompanhia, que e' de onde SeletorPara,
// SeletorPessoaDestino e ItemTarefa leem desde a M29.
//
// P3 (2026-09-08) reescreveu este arquivo por dois motivos:
//
//   1. O valor mudou. O espelho em useSettings deixou de colapsar
//      casal/amigos em 'duo' e passa a guardar o mesmo valor de
//      useOnboarding ('sozinho' | 'casal' | 'amigos').
//   2. O teste antigo era tautologico: definia uma funcao
//      `simularSeedDuo` que replicava a logica de `aplicarSeed` e
//      entao verificava a propria replica. `aplicarSeed` podia mudar
//      a vontade que o teste continuava verde -- e continuou verde
//      com o codigo real ja gravando 'casal'. Agora exercitamos
//      `gauntlet.seed()` de verdade.
//
// Como chegar no codigo real: `aplicarSeed` roda atras do comGuard de
// GAUNTLET_ATIVO (= Platform.OS === 'web' && __DEV__), false em Jest
// por default. Mockamos react-native com Platform.OS='web' no nivel do
// modulo, mesmo padrao de tests/lib/dev/gauntlet-autoseed-onboarding.
//
// Comentarios sem acento (convencao shell/CI).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'web' },
}));

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

import { gauntlet, GAUNTLET_ATIVO } from '@/lib/dev/gauntlet';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';

describe('seed duo (M-GAUNTLET-SEED-DUO)', () => {
  beforeEach(() => {
    // Reset baseline: sozinho.
    useSettings.setState((s) => ({
      pessoa: { ...s.pessoa, tipoCompanhia: 'sozinho' },
    }));
    useOnboarding.setState({ done: false, tipoCompanhia: 'sozinho' });
  });

  it('GAUNTLET_ATIVO e true com Platform.OS=web mockado (sanity)', () => {
    expect(GAUNTLET_ATIVO).toBe(true);
  });

  it('seed com nomeB null mantem tipoCompanhia sozinho nos dois stores', () => {
    gauntlet.seed({ nomeA: 'Alex', nomeB: null });
    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('sozinho');
    expect(useOnboarding.getState().tipoCompanhia).toBe('sozinho');
  });

  it('seed com nomeB string espelha casal em useSettings, sem colapsar', () => {
    gauntlet.seed({ nomeA: 'Alex', nomeB: 'Sam' });
    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('casal');
    expect(useOnboarding.getState().tipoCompanhia).toBe('casal');
    expect(usePessoa.getState().nomes).toEqual({
      pessoa_a: 'Alex',
      pessoa_b: 'Sam',
    });
  });

  it('seed sozinho apos seed duo volta tipoCompanhia para sozinho', () => {
    gauntlet.seed({ nomeA: 'Alex', nomeB: 'Sam' });
    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('casal');
    gauntlet.seed({ nomeA: 'Alex', nomeB: null });
    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('sozinho');
  });

  it('setTipoCompanhia("amigos") chega aos dois stores', () => {
    // Sem isto o E2E de amigos mudaria so' o rotulo de
    // useNomeDe('ambos') e nao os chips, que leem useSettings.
    gauntlet.setTipoCompanhia('amigos');
    expect(useOnboarding.getState().tipoCompanhia).toBe('amigos');
    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('amigos');
  });
});
