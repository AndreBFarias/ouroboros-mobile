// Tests do helper atualizarWidgetHomescreen (M20). Mock pesado da
// bridge nativa e do FileSystem (cacheDirectory + heatmap cache) +
// readVaultFile via @/lib/vault.
//
// Cobre:
//   - rate-limit (1 update por minuto, segundo no-op)
//   - toggle widgetHomescreen=false -> desativarWidget chamado
//   - toggle on, sem cache heatmap -> array []
//   - toggle on, com cache heatmap -> 7 entradas clamp 0..5
//   - toggle on, sem humor do dia -> humor=null
//   - toggle on, humor existente do mesmo autor -> humor preenchido
//   - autor divergente -> humor=null (privacidade Syncthing A5)
//   - montarWidgetData devolve shape correto
//
// Comentarios sem acentuacao.
import {
  atualizarWidgetHomescreen,
  montarWidgetData,
  _resetRateLimit,
} from '@/lib/widget/atualizarWidgetHomescreen';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';

// Mock da bridge nativa. Variaveis `mock*` sao permitidas no factory
// hoisting do jest.mock; outros prefixos quebram.
const mockAtualizarWidget = jest.fn(() => Promise.resolve());
const mockDesativarWidget = jest.fn(() => Promise.resolve());
jest.mock('../../../modules/widget-homescreen/src', () => ({
  atualizarWidget: (...args: unknown[]) =>
    (mockAtualizarWidget as unknown as (...a: unknown[]) => Promise<void>)(...args),
  desativarWidget: () => mockDesativarWidget(),
}));

// Mock do reader de vault: controla o humor do dia retornado.
const mockReadVaultFile = jest.fn();
jest.mock('@/lib/vault', () => {
  const actual = jest.requireActual('@/lib/vault');
  return {
    ...actual,
    readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
  };
});

// Mock do FileSystem para cacheDirectory + heatmap cache.
const mockGetInfoAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock/cache/',
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
}));

describe('atualizarWidgetHomescreen', () => {
  beforeEach(() => {
    _resetRateLimit();
    mockAtualizarWidget.mockClear();
    mockDesativarWidget.mockClear();
    mockReadVaultFile.mockReset();
    mockGetInfoAsync.mockReset();
    mockReadAsStringAsync.mockReset();

    useSettings.getState().resetar();
    usePessoa.getState().resetar();
    useVault.getState().setVaultRoot('content://mock/vault');

    // Defaults: heatmap inexistente; humor inexistente.
    mockGetInfoAsync.mockResolvedValue({ exists: false });
    mockReadVaultFile.mockResolvedValue(null);
  });

  describe('toggle off', () => {
    it('chama desativarWidget e nao chama atualizarWidget', async () => {
      // Toggle vem default off do resetar()
      await atualizarWidgetHomescreen();
      expect(mockDesativarWidget).toHaveBeenCalledTimes(1);
      expect(mockAtualizarWidget).not.toHaveBeenCalled();
    });
  });

  describe('toggle on', () => {
    beforeEach(() => {
      useSettings.getState().setFeatureToggle('widgetHomescreen', true);
    });

    it('monta payload com humor null quando vault nao tem registro', async () => {
      await atualizarWidgetHomescreen();
      expect(mockAtualizarWidget).toHaveBeenCalledTimes(1);
      const arg = (mockAtualizarWidget.mock.calls[0] as unknown[])[0] as {
        ativo: boolean;
        avatarLetra: string;
        humor: number | null;
        heatmap: number[];
      };
      expect(arg.ativo).toBe(true);
      expect(arg.avatarLetra).toBe('A');
      expect(arg.humor).toBeNull();
      expect(arg.heatmap).toEqual([]);
    });

    it('le humor do dia e propaga frase quando autor coincide', async () => {
      mockReadVaultFile.mockResolvedValueOnce({
        meta: {
          tipo: 'humor',
          data: '2026-05-01',
          autor: 'pessoa_a',
          humor: 4,
          energia: 3,
          ansiedade: 2,
          foco: 4,
          tags: [],
          frase: 'pequenos passos contam',
        },
      });
      await atualizarWidgetHomescreen();
      const arg = (mockAtualizarWidget.mock.calls[0] as unknown[])[0] as {
        humor: number | null;
        frase: string | null;
      };
      expect(arg.humor).toBe(4);
      expect(arg.frase).toBe('pequenos passos contam');
    });

    it('autor divergente devolve humor null por privacidade', async () => {
      mockReadVaultFile.mockResolvedValueOnce({
        meta: {
          tipo: 'humor',
          data: '2026-05-01',
          autor: 'pessoa_b',
          humor: 5,
          energia: 4,
          ansiedade: 1,
          foco: 5,
          tags: [],
        },
      });
      await atualizarWidgetHomescreen();
      const arg = (mockAtualizarWidget.mock.calls[0] as unknown[])[0] as {
        humor: number | null;
      };
      expect(arg.humor).toBeNull();
    });

    it('le heatmap quando cache existe e clampa 0..5', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      mockReadAsStringAsync.mockResolvedValueOnce(
        JSON.stringify([1, 2, 7, -3, 0, 4, 5])
      );
      await atualizarWidgetHomescreen();
      const arg = (mockAtualizarWidget.mock.calls[0] as unknown[])[0] as {
        heatmap: number[];
      };
      expect(arg.heatmap).toEqual([1, 2, 5, 0, 0, 4, 5]);
    });

    it('cache heatmap corrompido vira array vazio (nao crasha)', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      mockReadAsStringAsync.mockResolvedValueOnce('nao e json');
      await atualizarWidgetHomescreen();
      const arg = (mockAtualizarWidget.mock.calls[0] as unknown[])[0] as {
        heatmap: number[];
      };
      expect(arg.heatmap).toEqual([]);
    });

    it('rate-limit: segundo update no mesmo minuto e no-op', async () => {
      await atualizarWidgetHomescreen();
      expect(mockAtualizarWidget).toHaveBeenCalledTimes(1);
      await atualizarWidgetHomescreen();
      expect(mockAtualizarWidget).toHaveBeenCalledTimes(1);
    });

    it('forcar=true bypassa rate-limit', async () => {
      await atualizarWidgetHomescreen();
      await atualizarWidgetHomescreen({ forcar: true });
      expect(mockAtualizarWidget).toHaveBeenCalledTimes(2);
    });

    it('vault sem root devolve humor null mas ainda atualiza widget', async () => {
      useVault.getState().clearVaultRoot();
      await atualizarWidgetHomescreen();
      expect(mockAtualizarWidget).toHaveBeenCalledTimes(1);
      const arg = (mockAtualizarWidget.mock.calls[0] as unknown[])[0] as {
        humor: number | null;
      };
      expect(arg.humor).toBeNull();
    });
  });
});

describe('montarWidgetData', () => {
  it('devolve shape WidgetData com ativo=true', () => {
    const data = montarWidgetData({
      pessoaAtiva: 'pessoa_a',
      inicial: 'A',
      cor: '#bd93f9',
      humor: 3,
      frase: 'oi',
      heatmap: [1, 2, 3, 4, 5, 0, 0],
    });
    expect(data).toEqual({
      ativo: true,
      avatarLetra: 'A',
      avatarCor: '#bd93f9',
      humor: 3,
      frase: 'oi',
      heatmap: [1, 2, 3, 4, 5, 0, 0],
    });
  });
});
