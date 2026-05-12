// Q9 (Onda Q): testes do modulo de galeria unificada (vault explorer).
// Mocka listVaultFolder + readVaultFile e exercita listarItensGaleria
// com casos canonicos: listagem completa, filtro por tipo, filtro por
// mes, ordenacao desc, pasta inexistente, arquivos malformados.
//
// Comentarios sem acento (convencao shell/CI).

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import { listarItensGaleria } from '@/lib/vault/galeria';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  // resetAllMocks limpa tambem a fila pendente de mockResolvedValueOnce
  // (clearAllMocks limpa so .mock.calls). Sem isso, valores empilhados
  // de um teste vazam para o seguinte na ordem que sao consumidos.
  jest.resetAllMocks();
});

describe('listarItensGaleria - listagem completa', () => {
  it('agrega registros de tipos heterogeneos com data e titulo', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/markdown/humor-2026-05-01.md`,
      `${VAULT_ROOT}/markdown/foto-2026-05-02-abcd.md`,
      `${VAULT_ROOT}/markdown/diario-2026-05-03-1430-momento-feliz.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: { tipo: 'humor', data: '2026-05-01', autor: 'pessoa_a' },
        body: '',
      })
      .mockResolvedValueOnce({
        meta: {
          tipo: 'midia_foto',
          arquivo: 'foto-2026-05-02-abcd.jpg',
          data: '2026-05-02T10:00:00-03:00',
          autor: 'pessoa_a',
          para: { tipo: 'mim' },
          legenda: 'Pôr do sol bonito',
        },
        body: '',
      })
      .mockResolvedValueOnce({
        meta: {
          tipo: 'diario_emocional',
          data: '2026-05-03T14:30:00-03:00',
          autor: 'pessoa_b',
          modo: 'reflexao',
          texto: 'um momento de paz',
        },
        body: '',
      });

    const out = await listarItensGaleria(VAULT_ROOT);

    expect(out).toHaveLength(3);
    const tipos = out.map((i) => i.tipo);
    expect(tipos).toContain('humor');
    expect(tipos).toContain('foto');
    expect(tipos).toContain('diario');
    const itemFoto = out.find((i) => i.tipo === 'foto');
    expect(itemFoto?.titulo).toBe('Pôr do sol bonito');
    expect(itemFoto?.slug).toBe('abcd');
  });
});

describe('listarItensGaleria - filtro por tipo', () => {
  it('retorna so itens do tipo solicitado', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/markdown/humor-2026-05-01.md`,
      `${VAULT_ROOT}/markdown/foto-2026-05-02-abcd.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: { tipo: 'humor', data: '2026-05-01', autor: 'pessoa_a' },
        body: '',
      })
      .mockResolvedValueOnce({
        meta: {
          tipo: 'midia_foto',
          arquivo: 'foto-2026-05-02-abcd.jpg',
          data: '2026-05-02T10:00:00-03:00',
          autor: 'pessoa_a',
          para: { tipo: 'mim' },
        },
        body: '',
      });

    const out = await listarItensGaleria(VAULT_ROOT, { tipo: 'foto' });
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe('foto');
  });
});

describe('listarItensGaleria - filtro por mes', () => {
  it('aceita YYYY-MM e exclui meses diferentes', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/markdown/humor-2026-04-15.md`,
      `${VAULT_ROOT}/markdown/humor-2026-05-01.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: { tipo: 'humor', data: '2026-04-15', autor: 'pessoa_a' },
        body: '',
      })
      .mockResolvedValueOnce({
        meta: { tipo: 'humor', data: '2026-05-01', autor: 'pessoa_a' },
        body: '',
      });

    const out = await listarItensGaleria(VAULT_ROOT, { mes: '2026-05' });
    expect(out.map((i) => i.data)).toEqual(['2026-05-01']);
  });
});

describe('listarItensGaleria - ordenacao desc', () => {
  it('mais recente primeiro, com tie-break por slug asc', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/markdown/evento-2026-05-01-aaa.md`,
      `${VAULT_ROOT}/markdown/evento-2026-05-10-bbb.md`,
      `${VAULT_ROOT}/markdown/evento-2026-05-10-aaa.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValue(null) // forca uso de fallback (data do filename)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const out = await listarItensGaleria(VAULT_ROOT);
    expect(out.map((i) => `${i.data}|${i.slug}`)).toEqual([
      '2026-05-10|aaa',
      '2026-05-10|bbb',
      '2026-05-01|aaa',
    ]);
  });
});

describe('listarItensGaleria - pasta inexistente', () => {
  it('retorna [] quando listVaultFolder devolve []', async () => {
    mockListVaultFolder.mockResolvedValue([]);
    const out = await listarItensGaleria(VAULT_ROOT);
    expect(out).toEqual([]);
  });
});

describe('listarItensGaleria - arquivo malformado', () => {
  it('ignora arquivo que rejeita read e mantem demais', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/markdown/humor-quebrado.md`,
      `${VAULT_ROOT}/markdown/humor-2026-05-01.md`,
    ]);
    mockReadVaultFile
      .mockRejectedValueOnce(new Error('yaml invalido'))
      .mockRejectedValueOnce(new Error('fallback tambem falha'))
      .mockResolvedValueOnce({
        meta: { tipo: 'humor', data: '2026-05-01', autor: 'pessoa_a' },
        body: '',
      });
    const out = await listarItensGaleria(VAULT_ROOT);
    // humor-quebrado.md nao tem data no filename nem meta -> excluido.
    // humor-2026-05-01.md entra normal.
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2026-05-01');
  });
});

describe('listarItensGaleria - filenames sem padrao', () => {
  it('ignora arquivos fora do conjunto canonico de prefixos', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/markdown/_devices.md`,
      `${VAULT_ROOT}/markdown/agenda-pessoa_a-2026-05-01-evt123.md`,
      `${VAULT_ROOT}/markdown/medidas-2026-05-01.md`,
      `${VAULT_ROOT}/markdown/humor-2026-05-01.md`,
    ]);
    mockReadVaultFile.mockResolvedValue({
      meta: { tipo: 'humor', data: '2026-05-01', autor: 'pessoa_a' },
      body: '',
    });
    const out = await listarItensGaleria(VAULT_ROOT);
    expect(out).toHaveLength(1);
    expect(out[0].tipo).toBe('humor');
  });
});
