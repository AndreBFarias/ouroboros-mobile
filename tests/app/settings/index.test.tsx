// Mock de expo-router para nao depender de um RootProvider real.
// Defined antes dos imports para evitar issue de hoisting com nativewind
// (armadilha A12). Funcoes inline dentro do factory para nao referenciar
// variaveis fora de escopo.
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
  Redirect: () => null,
}));

// expo-constants: versao + extras fake estavel para a secao Sobre.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '0.1.0',
      extra: { repoUrl: 'https://example.test/repo', license: 'GPL-3.0' },
    },
  },
}));

// Mocks de servicos para nao tocar filesystem nem APIs reais.
jest.mock('@/lib/services/exportarVault', () => ({
  __esModule: true,
  exportarVaultZip: jest.fn(() =>
    Promise.resolve({ uri: '/tmp/export.zip', totalArquivos: 3 })
  ),
}));

jest.mock('@/lib/services/limparCache', () => ({
  __esModule: true,
  limparCache: jest.fn(() => Promise.resolve({ arquivosRemovidos: 2 })),
}));

jest.mock('@/lib/vault/permissions', () => ({
  __esModule: true,
  inicializarVaultCanonico: jest.fn(() =>
    Promise.resolve({ ok: true, vaultRoot: '/tmp/vault' })
  ),
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsTela from '@/../app/settings/index';
import { useSettings } from '@/lib/stores/settings';
import { ToastProvider } from '@/components/ui/Toast';

describe('Tela 23 — Settings v2 (sprint M29)', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
    jest.clearAllMocks();
  });

  it('renderiza header e as 5 secoes (sem Lembretes nem Sync)', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByText('Configurações')).toBeTruthy();
    expect(tree.getByText('Som e vibração')).toBeTruthy();
    expect(tree.getByText('Pessoa')).toBeTruthy();
    expect(tree.getByText('Features opcionais')).toBeTruthy();
    expect(tree.getByText('Privacidade')).toBeTruthy();
    expect(tree.getByText('Sobre')).toBeTruthy();
    // Removidas em v2:
    expect(tree.queryByText('Lembretes')).toBeNull();
    expect(tree.queryByText('Sync')).toBeNull();
  });

  it('toggle de feature persiste em useSettings (default true; alterna para false)', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(useSettings.getState().featureToggles.cicloMenstrual).toBe(true);
    fireEvent.press(tree.getByLabelText('toggle ciclo menstrual'));
    await waitFor(() =>
      expect(useSettings.getState().featureToggles.cicloMenstrual).toBe(false)
    );
  });

  it('toggle vibrar geral atua como mestre (default true; desliga)', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(useSettings.getState().somVibracao.geral).toBe(true);
    fireEvent.press(tree.getByLabelText('toggle vibrar geral'));
    await waitFor(() =>
      expect(useSettings.getState().somVibracao.geral).toBe(false)
    );
  });

  it('toggle vibrar botoes alterna para false', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(useSettings.getState().somVibracao.botoes).toBe(true);
    fireEvent.press(tree.getByLabelText('toggle vibrar botoes'));
    await waitFor(() =>
      expect(useSettings.getState().somVibracao.botoes).toBe(false)
    );
  });

  it('quando geral off, toggle dos demais nao altera estado (disabled)', async () => {
    useSettings.getState().setSomVibracao('geral', false);
    useSettings.getState().setSomVibracao('despertar', true);
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByLabelText('toggle vibrar despertar'));
    // disabled => onChange ignorado, valor permanece.
    await waitFor(() =>
      expect(useSettings.getState().somVibracao.despertar).toBe(true)
    );
  });

  it('linha "Adicionar segunda pessoa" so aparece se sozinho', () => {
    useSettings.getState().setPessoa('tipoCompanhia', 'duo');
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.queryByLabelText('adicionar segunda pessoa')).toBeNull();
  });

  it('linha "Adicionar segunda pessoa" aparece se sozinho', () => {
    useSettings.getState().setPessoa('tipoCompanhia', 'sozinho');
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByLabelText('adicionar segunda pessoa')).toBeTruthy();
  });

  it('link "Reinicializar pasta do Vault" chama o servico e mostra toast', async () => {
    // require sincrono evita TypeError do dynamic import sem
    // --experimental-vm-modules.
    const {
      inicializarVaultCanonico,
    } = require('@/lib/vault/permissions') as {
      inicializarVaultCanonico: jest.Mock;
    };
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByLabelText('reinicializar pasta do vault'));
    await waitFor(() => expect(inicializarVaultCanonico).toHaveBeenCalled());
    expect(await tree.findByText('Pasta verificada.')).toBeTruthy();
  });

  it('versao da Sobre exibe valor de Constants', () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByText('0.1.0')).toBeTruthy();
  });

  it('botao GitHub renderiza com label canonico', () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByText('Ver no GitHub')).toBeTruthy();
    expect(tree.getByLabelText('abrir github')).toBeTruthy();
  });
});
