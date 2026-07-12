// Testes do migration boot one-shot que escreve a primeira copia
// canonica dos 5 stores em vault/_estado/. R-VAULT-CANONICAL-
// COMPLETE-A.
//
// Cobre:
//   - Idempotencia: flag estadoMigradoParaVault=true bloqueia re-run
//   - Vault inacessivel (root null): no-op silencioso, sem marcar flag
//   - Run feliz: escreve 5 keys e marca a flag
//   - Falha parcial: marca flag mesmo se algum write falhar (proximos
//     boots delegam para subscribers das stores)
//
// Mocks: stores reais (zustand vanilla), apenas useVault.getState
// mockado para controlar vaultRoot. escreverEstadoCanonicoImediato
// mockado pra observar quais keys foram disparadas.
//
// Comentarios sem acento.

const mockEscreverImediato = jest.fn().mockResolvedValue(undefined);
const mockEscreverDebounced = jest.fn();

jest.mock('@/lib/vault/escreverEstado', () => ({
  __esModule: true,
  escreverEstadoCanonicoImediato: (...args: unknown[]) =>
    mockEscreverImediato(...args),
  // Subscribers de cada store chamam escreverEstadoCanonico (debounced);
  // mockamos como no-op pra nao poluir mockEscreverImediato.
  escreverEstadoCanonico: (...args: unknown[]) =>
    mockEscreverDebounced(...args),
}));

const mockUseVaultState = { vaultRoot: 'content://test/vault' as string | null };
jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => mockUseVaultState,
  },
}));

// Stores ficam REAIS para que getState() devolva o shape canonico
// inteiro. Os imports abaixo importam o codigo de produção, exceto
// useVault e o escreverEstadoImediato.
import { migrarEstadoParaVault } from '@/lib/boot/migrarEstadoParaVault';
import { useSessao } from '@/lib/stores/sessao';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';
import { useNavegacao } from '@/lib/stores/navegacao';

describe('migrarEstadoParaVault', () => {
  beforeEach(() => {
    mockEscreverImediato.mockReset().mockResolvedValue(undefined);
    mockUseVaultState.vaultRoot = 'content://test/vault';
    // Reseta apenas a flag-alvo, preservando demais por isolamento
    // (resetar() inteiro nuke-ar ia mexer em outros testes paralelos).
    useSessao.setState((s) => ({
      flags: { ...s.flags, estadoMigradoParaVault: false },
    }));
  });

  it('e idempotente: nao escreve quando flag ja true', async () => {
    useSessao.setState((s) => ({
      flags: { ...s.flags, estadoMigradoParaVault: true },
    }));
    await migrarEstadoParaVault();
    expect(mockEscreverImediato).not.toHaveBeenCalled();
  });

  it('no-op silencioso quando vault nao autorizado (root null)', async () => {
    mockUseVaultState.vaultRoot = null;
    await migrarEstadoParaVault();
    expect(mockEscreverImediato).not.toHaveBeenCalled();
    // NAO marca a flag: tentaremos novamente no proximo boot.
    expect(useSessao.getState().flags.estadoMigradoParaVault).toBe(false);
  });

  it('run feliz: escreve as 5 keys e marca a flag', async () => {
    await migrarEstadoParaVault();
    expect(mockEscreverImediato).toHaveBeenCalledTimes(5);

    const keysEscritas = mockEscreverImediato.mock.calls.map((c) => c[0]);
    expect(keysEscritas).toEqual([
      'settings',
      'sessao',
      'onboarding',
      'pessoa',
      'navegacao',
    ]);

    expect(useSessao.getState().flags.estadoMigradoParaVault).toBe(true);
  });

  it('snapshots refletem estado atual dos stores (settings)', async () => {
    useSettings.setState((s) => ({
      somVibracao: { ...s.somVibracao, geral: false },
    }));
    await migrarEstadoParaVault();
    const settingsCall = mockEscreverImediato.mock.calls.find(
      (c) => c[0] === 'settings'
    );
    expect(settingsCall).toBeDefined();
    const payload = settingsCall![1] as Record<string, unknown>;
    expect(payload.somVibracao).toMatchObject({ geral: false });
  });

  it('snapshots refletem estado atual dos stores (pessoa)', async () => {
    usePessoa.setState((s) => ({
      nomes: { ...s.nomes, pessoa_a: 'Teste_A' },
    }));
    await migrarEstadoParaVault();
    const pessoaCall = mockEscreverImediato.mock.calls.find(
      (c) => c[0] === 'pessoa'
    );
    expect(pessoaCall).toBeDefined();
    const payload = pessoaCall![1] as Record<string, unknown>;
    expect(payload.nomes).toMatchObject({ pessoa_a: 'Teste_A' });
  });

  it('snapshots refletem estado atual dos stores (navegacao)', async () => {
    useNavegacao.setState({ menuAberto: true });
    await migrarEstadoParaVault();
    const navCall = mockEscreverImediato.mock.calls.find(
      (c) => c[0] === 'navegacao'
    );
    expect(navCall).toBeDefined();
    const payload = navCall![1] as Record<string, unknown>;
    expect(payload.menuAberto).toBe(true);
  });

  it('falha parcial: marca a flag mesmo se algum write rejeita', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Falha apenas o segundo write (sessao). Demais resolvem.
    mockEscreverImediato
      .mockResolvedValueOnce(undefined) // settings
      .mockRejectedValueOnce(new Error('vault read-only')) // sessao
      .mockResolvedValueOnce(undefined) // onboarding
      .mockResolvedValueOnce(undefined) // pessoa
      .mockResolvedValueOnce(undefined); // navegacao

    await migrarEstadoParaVault();
    // Continua todas as 5 chamadas mesmo com a 2a rejeitada.
    expect(mockEscreverImediato).toHaveBeenCalledTimes(5);
    // Marca a flag pra evitar loop de retry.
    expect(useSessao.getState().flags.estadoMigradoParaVault).toBe(true);
    warnSpy.mockRestore();
  });

  it('nao apaga SecureStore: stores continuam com mesmo state apos migracao', async () => {
    const stateAntes = {
      settings: useSettings.getState().somVibracao,
      sessao: useSessao.getState().ultimaRota,
      onboarding: useOnboarding.getState().done,
      pessoa: usePessoa.getState().pessoaAtiva,
      navegacao: useNavegacao.getState().menuAberto,
    };
    await migrarEstadoParaVault();
    expect(useSettings.getState().somVibracao).toEqual(stateAntes.settings);
    expect(useSessao.getState().ultimaRota).toBe(stateAntes.sessao);
    expect(useOnboarding.getState().done).toBe(stateAntes.onboarding);
    expect(usePessoa.getState().pessoaAtiva).toBe(stateAntes.pessoa);
    expect(useNavegacao.getState().menuAberto).toBe(stateAntes.navegacao);
  });
});
