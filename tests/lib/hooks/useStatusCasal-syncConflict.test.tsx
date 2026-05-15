// Teste de regressao do filtro sync-conflict em useStatusCasal
// (sprint AUDIT-T1B6-MIGRATION-FIX, 2026-05-15).
//
// Sem o filtro, listFolderByName devolveria daily/2026-05-06.sync-conflict-...md
// junto com o legitimo; o card de Tela 01 v2 leria 2x o humor do dia e
// poderia mostrar autor/intensidade inconsistente da copia em conflito.
//
// Filtro defensivo: o .sync-conflict permanece no vault para
// Obsidian/Syncthing reconciliar; hook nao o le.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook, waitFor } from '@testing-library/react-native';
import type { HumorMeta } from '@/lib/schemas/humor';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import { useStatusCasal } from '@/lib/hooks/useStatusCasal';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'file:///vault';

function fakeHumor(autor: 'pessoa_a' | 'pessoa_b'): HumorMeta {
  return {
    tipo: 'humor',
    data: '2026-05-06T08:00:00-03:00',
    autor,
    humor: 4,
    energia: 3,
    ansiedade: 2,
    foco: 3,
    tags: [],
  } as HumorMeta;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListVaultFolder.mockResolvedValue([]);
  mockReadVaultFile.mockResolvedValue(null);
  useVault.setState({ vaultRoot: VAULT_ROOT });
});

describe('useStatusCasal — filtro sync-conflict (T1B6)', () => {
  it('nao chama readVaultFile em daily/<data>.sync-conflict-...md', async () => {
    mockListVaultFolder.mockImplementation(
      async (uri: string, ext?: string) => {
        // Primeira chamada: rootUri (listagem raiz do vault).
        if (uri === VAULT_ROOT && ext === undefined) {
          return [
            `${VAULT_ROOT}/daily`,
            `${VAULT_ROOT}/diario`,
            `${VAULT_ROOT}/eventos`,
          ];
        }
        // Segunda chamada: entrada de pasta filha com ext.
        if (uri.endsWith('/daily') && ext === '.md') {
          return [
            `${VAULT_ROOT}/daily/2026-05-06.md`,
            `${VAULT_ROOT}/daily/2026-05-06.sync-conflict-20260506-093412-OURO1.md`,
          ];
        }
        if (uri.endsWith('/diario') && ext === '.md') {
          return [];
        }
        if (uri.endsWith('/eventos') && ext === '.md') {
          return [];
        }
        return [];
      }
    );
    mockReadVaultFile.mockImplementation(async () => ({
      meta: fakeHumor('pessoa_a'),
      body: '',
    }));

    const { result } = renderHook(() =>
      useStatusCasal('2026-05-06')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => u.includes('sync-conflict'))).toBe(false);
    // O legitimo foi lido.
    expect(
      urisLidos.some((u) => u.endsWith('daily/2026-05-06.md'))
    ).toBe(true);
  });

  it('filtra sync-conflict tanto na raiz quanto em subpastas recursivas', async () => {
    mockListVaultFolder.mockImplementation(
      async (uri: string, ext?: string) => {
        if (uri === VAULT_ROOT && ext === undefined) {
          // Raiz com sync-conflict (improvavel mas valido para o regex).
          return [
            `${VAULT_ROOT}/daily`,
            `${VAULT_ROOT}/daily.sync-conflict-20260506-X.md`,
            `${VAULT_ROOT}/diario`,
            `${VAULT_ROOT}/eventos`,
          ];
        }
        if (uri.endsWith('/daily') && ext === '.md') {
          return [
            `${VAULT_ROOT}/daily/2026-05-06.md`,
            `${VAULT_ROOT}/daily/2026-05-06.Sync-Conflict-Y.md`,
          ];
        }
        return [];
      }
    );
    mockReadVaultFile.mockImplementation(async () => ({
      meta: fakeHumor('pessoa_a'),
      body: '',
    }));

    const { result } = renderHook(() =>
      useStatusCasal('2026-05-06')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => /sync-conflict/i.test(u))).toBe(false);
  });
});
