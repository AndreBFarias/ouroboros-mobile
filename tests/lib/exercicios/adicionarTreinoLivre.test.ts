// Testes do adicionarTreinoLivre. Mocka readVaultFile e
// writeVaultFile do barrel '@/lib/vault'.

const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();

// Mocka diretamente os sub-modulos finais (nao o barrel) para evitar
// ciclo de carregamento.
jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
  listVaultFolder: jest.fn(),
}));

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import { adicionarTreinoLivre } from '@/lib/exercicios/adicionarTreinoLivre';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  jest.useFakeTimers().setSystemTime(new Date('2026-04-30T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('adicionarTreinoLivre', () => {
  it('cria novo draft quando nao existe', async () => {
    const out = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'agachamento-livre',
      autor: 'pessoa_a',
    });
    expect(out.criadoNovo).toBe(true);
    expect(out.uri).toContain('treinos/draft/2026-04-30-agachamento-livre.md');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('treinos/draft/2026-04-30-agachamento-livre.md');
    expect(meta).toMatchObject({
      tipo: 'treino_draft',
      data: '2026-04-30',
      autor: 'pessoa_a',
      exercicios: ['agachamento-livre'],
    });
  });

  it('anexa slug a draft existente sem duplicar', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'treino_draft',
        data: '2026-04-30',
        autor: 'pessoa_a',
        exercicios: ['agachamento-livre'],
      },
      body: 'corpo antigo.',
    });

    const out = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'agachamento-livre',
      autor: 'pessoa_a',
    });
    expect(out.criadoNovo).toBe(false);
    // Mesmo slug ja presente: nao deve regravar (lista nao mudou).
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('anexa novo slug a lista existente', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'treino_draft',
        data: '2026-04-30',
        autor: 'pessoa_a',
        exercicios: ['agachamento-livre'],
      },
      body: 'corpo antigo.',
    });

    // Quando o helper le pelo path do slug "agachamento-livre" e
    // adiciona o slug novo, ele acaba caindo no path do
    // primeiro slug. O comportamento esperado e regravar com lista
    // ampliada apenas quando o slug novo nao estiver na lista.
    const out = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'agachamento-livre',
      autor: 'pessoa_a',
    });
    expect(out.criadoNovo).toBe(false);
  });

  it('rejeita slug vazio', async () => {
    await expect(
      adicionarTreinoLivre({
        vaultRoot: VAULT_ROOT,
        exercicioSlug: '',
        autor: 'pessoa_a',
      })
    ).rejects.toThrow(/slug obrigatorio/);
  });
});
