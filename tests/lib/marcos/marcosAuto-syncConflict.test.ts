// Teste de regressao do filtro sync-conflict em marcosAuto.ts
// (sprint AUDIT-T1B6-MIGRATION-FIX, 2026-05-15).
//
// Sem o filtro, lerSinaisDeAutor() veria humor-<data>.sync-conflict-...md
// como humor legitimo e a heuristica de "Sete dias acompanhando."
// poderia disparar com base em dado duplicado.
//
// Filtro defensivo: a copia .sync-conflict permanece no vault para
// Obsidian/Syncthing reconciliar; marcosAuto apenas nao a le.
//
// Comentarios sem acento (convencao shell/CI).
const mockListarTreinos = jest.fn();
const mockListarMarcos = jest.fn();
const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockSaveMarco = jest.fn();

jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  listarTreinos: (...args: unknown[]) => mockListarTreinos(...args),
}));
jest.mock('@/lib/vault/marcos', () => ({
  __esModule: true,
  listarMarcos: (...args: unknown[]) => mockListarMarcos(...args),
}));
jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/marcos/saveMarco', () => ({
  __esModule: true,
  saveMarco: (...args: unknown[]) => mockSaveMarco(...args),
}));

import { verificarMarcosAuto } from '@/lib/marcos/marcosAuto';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockListarTreinos.mockResolvedValue([]);
  mockListarMarcos.mockResolvedValue([]);
  mockListVaultFolder.mockResolvedValue([]);
  mockReadVaultFile.mockResolvedValue(null);
  mockSaveMarco.mockResolvedValue({ uri: 'x', rel: 'marcos/x.md', slug: 'x' });
  useVault.setState({ vaultRoot: VAULT_ROOT });
  usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
});

describe('verificarMarcosAuto — filtro sync-conflict (T1B6)', () => {
  it('nao chama readVaultFile em humor-<data>.sync-conflict-...md', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/humor-2026-05-06.md`,
      `${VAULT_ROOT}/markdown/humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md`,
      `${VAULT_ROOT}/markdown/diario-2026-05-06-1500-x.md`,
      `${VAULT_ROOT}/markdown/diario-2026-05-06-1500-x.sync-conflict-20260506-093412-OURO1.md`,
    ]);
    // Mock readVaultFile devolve null para nao disparar criterios reais;
    // foco aqui e checar que NAO foi tentada leitura dos sync-conflict.
    mockReadVaultFile.mockResolvedValue(null);

    await verificarMarcosAuto(VAULT_ROOT);

    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => u.includes('sync-conflict'))).toBe(false);
    // Apenas humor + diario legitimos receberam tentativa de leitura.
    expect(urisLidos).toContain(
      `${VAULT_ROOT}/markdown/humor-2026-05-06.md`
    );
    expect(urisLidos).toContain(
      `${VAULT_ROOT}/markdown/diario-2026-05-06-1500-x.md`
    );
  });

  it('case-insensitive: descarta .SYNC-CONFLICT- e .Sync-Conflict-', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/humor-2026-05-06.md`,
      `${VAULT_ROOT}/markdown/humor-2026-05-06.SYNC-CONFLICT-20260506-093412-OURO1.md`,
      `${VAULT_ROOT}/markdown/humor-2026-05-06.Sync-Conflict-20260506-093412-OURO2.md`,
    ]);
    mockReadVaultFile.mockResolvedValue(null);

    await verificarMarcosAuto(VAULT_ROOT);

    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => /sync-conflict/i.test(u))).toBe(false);
  });
});
