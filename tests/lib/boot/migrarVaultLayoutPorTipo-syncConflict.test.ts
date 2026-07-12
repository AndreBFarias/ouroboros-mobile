// Teste de regressao do filtro sync-conflict no boot hook
// migrarVaultLayoutPorTipo (sprint AUDIT-T1B6-MIGRATION-FIX, 2026-05-15).
//
// Cenario critico: usuario com Syncthing pareado em 2+ devices teve um
// conflito real (humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md)
// no layout legado daily/. Sem o filtro, o boot hook moveria essa copia
// para markdown/humor-2026-05-06.sync-conflict-... perpetuando o
// conflito no novo layout (e duplicando o registro humor original que
// tambem existe em daily/).
//
// Filtro defensivo: o arquivo .sync-conflict permanece em daily/ para
// reconciliacao manual via Obsidian/Syncthing; app nao toca.
//
// Comentarios sem acento (convencao shell/CI).
const mockReadDirectoryAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  },
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { useSessao } from '@/lib/stores/sessao';
import { migrarVaultLayoutPorTipo } from '@/lib/boot/migrarVaultLayoutPorTipo';

const VAULT_ROOT_CONTENT = 'content://test/vault';
const VAULT_ROOT_FILE = 'file:///vault';

beforeEach(() => {
  jest.clearAllMocks();
  useSessao.getState().resetar();
  mockGetInfoAsync.mockResolvedValue({ exists: false });
  mockReadDirectoryAsync.mockResolvedValue([]);
});

describe('migrarVaultLayoutPorTipo — filtro sync-conflict (T1B6)', () => {
  it('content://: nao migra humor-<data>.sync-conflict-... de daily/ para markdown/', async () => {
    const arquivosDaily = [
      'content://test/vault/daily/2026-05-06.md',
      'content://test/vault/daily/2026-05-06.sync-conflict-20260506-093412-OURO1.md',
    ];
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('daily')) {
        return Promise.resolve(arquivosDaily);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT_CONTENT);

    // O arquivo legitimo DEVE ter sido migrado.
    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    const legitimo = copyCalls.find(([arg]) =>
      arg.from.endsWith('daily/2026-05-06.md')
    );
    expect(legitimo).toBeDefined();
    expect(legitimo?.[0].to).toMatch(/markdown\/humor-2026-05-06\.md$/);

    // A copia sync-conflict NAO pode ter sido tocada.
    for (const [arg] of copyCalls) {
      expect(arg.from).not.toMatch(/sync-conflict/);
      expect(arg.to).not.toMatch(/sync-conflict/);
    }
  });

  it('file://: nao migra alarme-<slug>.sync-conflict-... de alarmes/ para markdown/', async () => {
    const arquivosAlarmes = [
      'medicacao.md',
      'medicacao.sync-conflict-20260506-093412-OURO1.md',
    ];
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('alarmes')) {
        return Promise.resolve(arquivosAlarmes);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT_FILE);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    const legitimo = copyCalls.find(([arg]) =>
      arg.from.endsWith('alarmes/medicacao.md')
    );
    expect(legitimo).toBeDefined();
    expect(legitimo?.[0].to).toMatch(/markdown\/alarme-medicacao\.md$/);

    for (const [arg] of copyCalls) {
      expect(arg.from).not.toMatch(/sync-conflict/);
      expect(arg.to).not.toMatch(/sync-conflict/);
    }
  });

  it('binarios: nao migra foto-<rand>.sync-conflict-...jpg de media/fotos/', async () => {
    const arquivosFotos = [
      '2026-05-06-abcd.jpg',
      '2026-05-06-abcd.sync-conflict-20260506-093412-OURO1.jpg',
    ];
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('media/fotos')) {
        return Promise.resolve(arquivosFotos);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT_FILE);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;

    // Binario legitimo migra para jpg/foto-...
    const legitimo = copyCalls.find(([arg]) =>
      arg.from.endsWith('media/fotos/2026-05-06-abcd.jpg')
    );
    expect(legitimo).toBeDefined();

    // sync-conflict NAO migra.
    for (const [arg] of copyCalls) {
      expect(arg.from).not.toMatch(/sync-conflict/);
      expect(arg.to).not.toMatch(/sync-conflict/);
    }
  });

  it('agenda/<pessoa>/: nao migra <data>-<evt>.sync-conflict-... ', async () => {
    const arquivosAgendaA = [
      '2026-05-06-evt123.md',
      '2026-05-06-evt123.sync-conflict-20260506-093412-OURO1.md',
    ];
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('agenda/pessoa_a')) {
        return Promise.resolve(arquivosAgendaA);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT_FILE);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    const legitimo = copyCalls.find(([arg]) =>
      arg.from.endsWith('agenda/pessoa_a/2026-05-06-evt123.md')
    );
    expect(legitimo).toBeDefined();
    expect(legitimo?.[0].to).toMatch(
      /markdown\/agenda-pessoa_a-2026-05-06-evt123\.md$/
    );

    for (const [arg] of copyCalls) {
      expect(arg.from).not.toMatch(/sync-conflict/);
      expect(arg.to).not.toMatch(/sync-conflict/);
    }
  });

  it('case-insensitive: detecta variantes .SYNC-CONFLICT- e .Sync-Conflict-', async () => {
    const arquivos = [
      '2026-05-06.md',
      '2026-05-06.SYNC-CONFLICT-20260506-093412-OURO1.md',
      '2026-05-06.Sync-Conflict-20260506-093412-OURO2.md',
    ];
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('daily')) {
        return Promise.resolve(arquivos);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT_FILE);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    // Nao migra nenhuma variante de case do marker.
    for (const [arg] of copyCalls) {
      expect(arg.from.toLowerCase()).not.toMatch(/sync-conflict/);
      expect(arg.to.toLowerCase()).not.toMatch(/sync-conflict/);
    }
  });
});
