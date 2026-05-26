// R-DX-GAUNTLET-ONBOARDING-BYPASS unit (cenario mobile): garante que o
// auto-seed e' no-op (dead-code) quando GAUNTLET_ATIVO=false, ou seja, em
// qualquer build mobile/release (Platform.OS !== 'web').
//
// Arquivo SEPARADO do gauntlet-autoseed-onboarding.test.ts porque o cenario
// exige Platform.OS='ios' desde o import (GAUNTLET_ATIVO e' um const avaliado
// em module-init). No jest do SDK 56, jest.doMock dentro de isolateModules NAO
// sobrescreve o jest.mock hoisted do topo de um arquivo, entao nao da pra ter
// 'web' e 'ios' no mesmo arquivo via re-isolamento. Aqui o topo mocka 'ios'.
//
// Cobertura complementar: o gate de dead-code do build release (npx expo export
// + grep dos markers gauntlet = 0) prova o mesmo em nivel de bundle.
//
// Comentarios sem acento (convencao shell/CI).

jest.mock('react-native', () =>
  require('../../__support__/rnCssInteropMock.cjs')('ios')
);

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

import { autoSeedOnboardingSeNecessario, GAUNTLET_ATIVO } from '@/lib/dev/gauntlet';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';

describe('autoSeedOnboardingSeNecessario no-op em mobile (GAUNTLET_ATIVO=false)', () => {
  it('GAUNTLET_ATIVO e false com Platform.OS=ios (sanity)', () => {
    expect(GAUNTLET_ATIVO).toBe(false);
  });

  it('nao seta done nem vaultRoot quando inativo', () => {
    useOnboarding.setState({ done: false });
    useVault.setState({ vaultRoot: null });

    autoSeedOnboardingSeNecessario();

    expect(useOnboarding.getState().done).toBe(false);
    expect(useVault.getState().vaultRoot).toBeNull();
  });
});
