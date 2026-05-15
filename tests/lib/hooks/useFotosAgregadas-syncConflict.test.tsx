// Teste de regressao do filtro sync-conflict em useFotosAgregadas
// (sprint AUDIT-T1B6-MIGRATION-FIX, 2026-05-15).
//
// Sem o filtro, listVaultFolder devolveria foto-<rand>.sync-conflict-...jpg
// junto com foto-<rand>.jpg legitima; a galeria exibiria thumbnail
// duplicado da mesma imagem. Idem para evento-<slug>.sync-conflict-...md
// e medidas-<data>.sync-conflict-...md (parse poderia falhar no .md ou
// passar e duplicar registro).
//
// Filtro defensivo: a copia .sync-conflict permanece no vault; hook
// nao a inclui na agregacao.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook, waitFor } from '@testing-library/react-native';
import type { EventoMeta } from '@/lib/schemas/evento';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

// useFocusEffect: stub minimo (nao precisamos disparar via focus em teste).
jest.mock('expo-router', () => ({
  __esModule: true,
  useFocusEffect: () => {
    // No-op para teste; o useEffect padrao do hook ja dispara carregar.
  },
}));

import { useFotosAgregadas } from '@/lib/hooks/useFotosAgregadas';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

const VAULT_ROOT = 'file:///vault';

function fakeEvento(modo: 'positivo' | 'negativo'): EventoMeta {
  return {
    tipo: 'evento',
    data: '2026-05-06',
    autor: 'pessoa_a',
    modo,
    categoria: 'show',
    intensidade: 4,
    fotos: ['jpg/foto-2026-05-06-abcd.jpg'],
    com: [],
    midia: [],
    para: { tipo: 'mim' },
  } as unknown as EventoMeta;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListVaultFolder.mockResolvedValue([]);
  mockReadVaultFile.mockResolvedValue(null);
  useVault.setState({ vaultRoot: VAULT_ROOT });
  usePessoa.setState({
    pessoaAtiva: 'pessoa_a',
    filtroPessoa: 'ambos',
  });
});

describe('useFotosAgregadas — filtro sync-conflict (T1B6)', () => {
  it('nao chama readVaultFile em evento-<slug>.sync-conflict-...md', async () => {
    mockListVaultFolder.mockImplementation(async (folder: string) => {
      if (folder.endsWith('markdown')) {
        return [
          `${VAULT_ROOT}/markdown/evento-show.md`,
          `${VAULT_ROOT}/markdown/evento-show.sync-conflict-20260506-093412-OURO1.md`,
        ];
      }
      return [];
    });
    mockReadVaultFile.mockImplementation(async () => ({
      meta: fakeEvento('positivo'),
      body: '',
    }));

    const { result } = renderHook(() => useFotosAgregadas());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => u.includes('sync-conflict'))).toBe(false);
  });

  it('nao inclui binarios foto-<rand>.sync-conflict-...jpg em galeria-manual', async () => {
    mockListVaultFolder.mockImplementation(
      async (folder: string, ext: string) => {
        if (folder.endsWith('markdown')) return [];
        if (folder.endsWith('jpg') && ext === '.jpg') {
          return [
            `${VAULT_ROOT}/jpg/foto-2026-05-06-abcd.jpg`,
            `${VAULT_ROOT}/jpg/foto-2026-05-06-abcd.sync-conflict-20260506-093412-OURO1.jpg`,
          ];
        }
        return [];
      }
    );

    const { result } = renderHook(() => useFotosAgregadas());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // A foto legitima entrou; a copia sync-conflict NAO.
    const uris = result.current.fotos.map((f) => f.uri);
    expect(uris.some((u) => u.includes('sync-conflict'))).toBe(false);
    expect(uris.some((u) => u.endsWith('foto-2026-05-06-abcd.jpg'))).toBe(true);
  });

  it('detecta sync-conflict case-insensitive em todos os tipos', async () => {
    mockListVaultFolder.mockImplementation(
      async (folder: string, ext: string) => {
        if (folder.endsWith('markdown')) {
          return [
            `${VAULT_ROOT}/markdown/evento-a.md`,
            `${VAULT_ROOT}/markdown/evento-a.SYNC-CONFLICT-X.md`,
            `${VAULT_ROOT}/markdown/evento-a.Sync-Conflict-Y.md`,
          ];
        }
        if (folder.endsWith('jpg') && ext === '.jpg') {
          return [
            `${VAULT_ROOT}/jpg/foto-2026-05-06-x.jpg`,
            `${VAULT_ROOT}/jpg/foto-2026-05-06-x.SYNC-CONFLICT-Z.jpg`,
          ];
        }
        return [];
      }
    );
    mockReadVaultFile.mockImplementation(async () => ({
      meta: fakeEvento('positivo'),
      body: '',
    }));

    const { result } = renderHook(() => useFotosAgregadas());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => /sync-conflict/i.test(u))).toBe(false);

    const uris = result.current.fotos.map((f) => f.uri);
    expect(uris.some((u) => /sync-conflict/i.test(u))).toBe(false);
  });
});
