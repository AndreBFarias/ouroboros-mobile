// Testes do modulo de vault para medidas. Cobre listagem (filtro
// periodo, ordenacao), lerUltimaMedida e escrita.
import type { Medida } from '@/lib/schemas/medidas';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockEscreverPesoEmHC = jest.fn();
const mockEscreverBodyFatEmHC = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('@/lib/health/sync', () => ({
  __esModule: true,
  escreverPesoEmHC: (...args: unknown[]) => mockEscreverPesoEmHC(...args),
  escreverBodyFatEmHC: (...args: unknown[]) => mockEscreverBodyFatEmHC(...args),
}));
// Toggle healthConnectSync ligado para exercitar o write-back e o guard.
jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: {
    getState: () => ({ featureToggles: { healthConnectSync: true } }),
  },
}));

import {
  listarMedidas,
  lerUltimaMedida,
  escreverMedida,
} from '@/lib/vault/medidas';

const VAULT_ROOT = 'content://test/vault';

const medidaBase: Medida = {
  tipo: 'medidas',
  data: '2026-04-28',
  autor: 'pessoa_a',
  peso: 78.4,
  cintura: 84.0,
  fotos: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarMedidas', () => {
  it('lista medidas do vault', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-2026-04-28.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({ meta: medidaBase, body: '' });
    const lista = await listarMedidas(VAULT_ROOT);
    expect(lista).toHaveLength(1);
    expect(lista[0].peso).toBe(78.4);
  });

  it('devolve [] quando pasta inexistente (listVaultFolder retorna [])', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const lista = await listarMedidas(VAULT_ROOT);
    expect(lista).toEqual([]);
  });

  it('ordena desc por data', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-a.md',
      'content://test/vault/markdown/medidas-b.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      const data = i === 1 ? '2026-04-15' : '2026-04-28';
      return { meta: { ...medidaBase, data }, body: '' };
    });
    const lista = await listarMedidas(VAULT_ROOT);
    expect(lista[0].data).toBe('2026-04-28');
    expect(lista[1].data).toBe('2026-04-15');
  });

  it('filtra periodo 30d (corta registros antigos)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-jan.md',
      'content://test/vault/markdown/medidas-abr.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      const data = i === 1 ? '2026-01-15' : '2026-04-28';
      return { meta: { ...medidaBase, data }, body: '' };
    });
    const hoje = new Date('2026-04-30T12:00:00Z');
    const lista = await listarMedidas(VAULT_ROOT, { periodo: '30d', hoje });
    expect(lista).toHaveLength(1);
    expect(lista[0].data).toBe('2026-04-28');
  });

  it('filtra periodo 90d (mantem registro de 80 dias atras)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-x.md',
      'content://test/vault/markdown/medidas-y.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      // 80 dias antes de 30/04 = ~10 de fevereiro.
      const data = i === 1 ? '2026-02-10' : '2026-04-28';
      return { meta: { ...medidaBase, data }, body: '' };
    });
    const hoje = new Date('2026-04-30T12:00:00Z');
    const lista = await listarMedidas(VAULT_ROOT, { periodo: '90d', hoje });
    expect(lista).toHaveLength(2);
  });

  it('periodo tudo nao corta nada', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-antigo.md',
      'content://test/vault/markdown/medidas-recente.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      const data = i === 1 ? '2025-01-01' : '2026-04-28';
      return { meta: { ...medidaBase, data }, body: '' };
    });
    const hoje = new Date('2026-04-30T12:00:00Z');
    const lista = await listarMedidas(VAULT_ROOT, { periodo: 'tudo', hoje });
    expect(lista).toHaveLength(2);
  });

  it('ignora arquivos malformados sem quebrar', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-ok.md',
      'content://test/vault/markdown/medidas-quebrado.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      if (i === 1) return { meta: medidaBase, body: '' };
      throw new Error('yaml invalido');
    });
    const lista = await listarMedidas(VAULT_ROOT);
    expect(lista).toHaveLength(1);
  });
});

describe('lerUltimaMedida', () => {
  it('retorna a medida mais recente', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/medidas-a.md',
      'content://test/vault/markdown/medidas-b.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      const data = i === 1 ? '2026-04-15' : '2026-04-28';
      return { meta: { ...medidaBase, data, peso: i * 10 }, body: '' };
    });
    const ultima = await lerUltimaMedida(VAULT_ROOT);
    expect(ultima).not.toBeNull();
    expect(ultima?.data).toBe('2026-04-28');
  });

  it('retorna null quando nao ha registros', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const ultima = await lerUltimaMedida(VAULT_ROOT);
    expect(ultima).toBeNull();
  });
});

describe('escreverMedida', () => {
  it('escreve no path canonico markdown/medidas-YYYY-MM-DD.md (H2 layout-por-tipo)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverMedida(VAULT_ROOT, medidaBase);
    expect(out.rel).toBe('markdown/medidas-2026-04-28.md');
    expect(out.uri).toContain('markdown/medidas-2026-04-28.md');
  });

  it('rejeita medida invalida', async () => {
    await expect(
      escreverMedida(VAULT_ROOT, { ...medidaBase, peso: -5 })
    ).rejects.toThrow(/medida invalida/);
  });

  it('aceita registro sem campos numericos (so reflexao)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverMedida(VAULT_ROOT, {
      tipo: 'medidas',
      data: '2026-04-28',
      autor: 'pessoa_a',
      fotos: [],
      reflexao: 'sem medidas hoje, so foto.',
    });
    expect(out.rel).toBe('markdown/medidas-2026-04-28.md');
  });

  it('passa o meta validado para writeVaultFile', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverMedida(VAULT_ROOT, medidaBase, 'corpo livre');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('markdown/medidas-2026-04-28.md');
    expect(meta.peso).toBe(78.4);
    expect(body).toBe('corpo livre');
  });

  // R-INT-3-HC-AUTOPULL-WRITEBACK-GUARD: guard anti-loop HC -> Vault -> HC.
  it('sem opts faz write-back no HC (espelhamento manual preservado)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverMedida(VAULT_ROOT, { ...medidaBase, gordura: 18.2 });
    expect(mockEscreverPesoEmHC).toHaveBeenCalledTimes(1);
    expect(mockEscreverBodyFatEmHC).toHaveBeenCalledTimes(1);
  });

  it('com pularSyncHC=true nao chama escreverPesoEmHC/escreverBodyFatEmHC', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverMedida(VAULT_ROOT, { ...medidaBase, gordura: 18.2 }, '', {
      pularSyncHC: true,
    });
    expect(mockEscreverPesoEmHC).not.toHaveBeenCalled();
    expect(mockEscreverBodyFatEmHC).not.toHaveBeenCalled();
  });
});
