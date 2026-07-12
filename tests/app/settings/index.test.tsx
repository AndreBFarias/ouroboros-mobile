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

// M-EXPORT-COMPLETO (A5): mock de restaurarVaultZip e document picker
// para o botao "Importar backup".
jest.mock('@/lib/services/restaurarVault', () => ({
  __esModule: true,
  restaurarVaultZip: jest.fn(() =>
    Promise.resolve({
      ok: true,
      raizDestino: '/tmp/vault/restaurado-2026-05-04',
      totalEscritos: 5,
      totalIgnorados: 0,
      falhas: [],
    })
  ),
}));

jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: '/tmp/import-backup.zip',
          name: 'import-backup.zip',
          mimeType: 'application/zip',
          size: 1024,
        },
      ],
    })
  ),
}));

jest.mock('@/lib/vault/permissions', () => ({
  __esModule: true,
  inicializarVaultEscolhido: jest.fn(() =>
    Promise.resolve({
      ok: true,
      vaultRoot: '/tmp/vault',
      criado: true,
      modo: 'auto',
    })
  ),
  sugestaoVaultPathDefault: () => '/sdcard/Ouroboros/',
  sugestaoVaultUriDefault: () => 'file:///sdcard/Ouroboros/',
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

  it('link "Vault" navega para sub-tela /settings/vault', () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByLabelText('vault')).toBeTruthy();
    expect(tree.getByText('Vault')).toBeTruthy();
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

  it('botao "Exportar todos os meus dados" renderiza com label canonico', () => {
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    expect(tree.getByText('Exportar todos os meus dados')).toBeTruthy();
  });

  it('botao "Importar backup" renderiza e dispara restaurarVaultZip', async () => {
    const { restaurarVaultZip } = require('@/lib/services/restaurarVault') as {
      restaurarVaultZip: jest.Mock;
    };
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    const botao = tree.getByText('Importar backup');
    expect(botao).toBeTruthy();
    fireEvent.press(botao);
    await waitFor(() => expect(restaurarVaultZip).toHaveBeenCalled());
    expect(await tree.findByText('Restauração concluída.')).toBeTruthy();
  });

  it('importar com falhas mostra toast com contagem', async () => {
    const { restaurarVaultZip } = require('@/lib/services/restaurarVault') as {
      restaurarVaultZip: jest.Mock;
    };
    restaurarVaultZip.mockResolvedValueOnce({
      ok: false,
      raizDestino: '/tmp/vault/restaurado-2026-05-04',
      totalEscritos: 3,
      totalIgnorados: 0,
      falhas: [
        { path: 'daily/2026-05-01.md', motivo: 'sha-divergente' as const },
        { path: 'media/fotos/x.jpg', motivo: 'arquivo-ausente' as const },
      ],
    });
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByText('Importar backup'));
    expect(
      await tree.findByText('Restauração concluída com 2 falha(s).')
    ).toBeTruthy();
  });

  it('importar cancelado nao chama restaurarVaultZip', async () => {
    const DocumentPicker = require('expo-document-picker') as {
      getDocumentAsync: jest.Mock;
    };
    const { restaurarVaultZip } = require('@/lib/services/restaurarVault') as {
      restaurarVaultZip: jest.Mock;
    };
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });
    const tree = render(
      <ToastProvider>
        <SettingsTela />
      </ToastProvider>
    );
    fireEvent.press(tree.getByText('Importar backup'));
    await waitFor(() => {
      expect(restaurarVaultZip).not.toHaveBeenCalled();
    });
  });
});
