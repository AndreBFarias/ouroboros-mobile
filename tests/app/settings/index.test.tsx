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

// Mock de DateTimePicker para evitar UI nativa.
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactMock = require('react');
  const RNMock = require('react-native');
  const DTP = () =>
    ReactMock.createElement(RNMock.View, {
      accessibilityLabel: 'mock-datetimepicker',
    });
  return { __esModule: true, default: DTP };
});

// Mocks de servicos para nao tocar filesystem nem notification API
// real.
jest.mock('@/lib/services/syncStatus', () => ({
  __esModule: true,
  verificarSyncStatus: jest.fn(() =>
    Promise.resolve({
      cor: 'verde',
      ultimaModificacao: new Date(Date.now() - 5 * 60 * 1000),
      conflito: false,
      alvo: '/tmp/vault',
    })
  ),
  descreverDelta: jest.fn(() => 'Atualizado há 5 min.'),
}));

jest.mock('@/lib/services/notificacoesLembretes', () => ({
  __esModule: true,
  agendarLembrete: jest.fn(() => Promise.resolve(true)),
  cancelarLembrete: jest.fn(() => Promise.resolve()),
}));

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

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsTela from '@/../app/(tabs)/settings/index';
import { useSettings } from '@/lib/stores/settings';
import { ToastProvider } from '@/components/ui/Toast';

describe('Tela 23 — Settings', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
    jest.clearAllMocks();
  });

  it('renderiza header e as 7 secoes', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByText('Configurações')).toBeTruthy();
    expect(tree.getByText('Som e vibração')).toBeTruthy();
    expect(tree.getByText('Lembretes')).toBeTruthy();
    expect(tree.getByText('Pessoa')).toBeTruthy();
    expect(tree.getByText('Sync')).toBeTruthy();
    expect(tree.getByText('Features opcionais')).toBeTruthy();
    expect(tree.getByText('Privacidade')).toBeTruthy();
    expect(tree.getByText('Sobre')).toBeTruthy();
  });

  it('toggle de feature persiste em useSettings', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByLabelText('toggle ciclo menstrual'));
    await waitFor(() =>
      expect(useSettings.getState().featureToggles.cicloMenstrual).toBe(true)
    );
  });

  it('toggle som vibracao trigger ligavel pelo usuario', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(useSettings.getState().somVibracao.trigger).toBe(false);
    fireEvent.press(tree.getByLabelText('toggle vibrar trigger'));
    await waitFor(() =>
      expect(useSettings.getState().somVibracao.trigger).toBe(true)
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

  it('forcar sync mostra toast informativo', async () => {
    // Com sync.metodo='nao-uso' (default), o botao "Forçar sync" e o
    // card de status ficam ocultos por design — não faz sentido sem
    // ferramenta externa. Para exercitar o botao, ligamos um metodo.
    useSettings.getState().setSync('metodo', 'syncthing');
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByLabelText('Forçar sync'));
    expect(
      await tree.findByText('Sync gerenciado pelo aplicativo externo.')
    ).toBeTruthy();
  });

  it('selector qualidade scanner persiste 8mp', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByLabelText('qualidade 8mp'));
    await waitFor(() =>
      expect(useSettings.getState().sync.qualidadeScanner).toBe('8mp')
    );
  });

  it('selector metodo sync persiste syncthing', async () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByLabelText('metodo syncthing'));
    await waitFor(() =>
      expect(useSettings.getState().sync.metodo).toBe('syncthing')
    );
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
