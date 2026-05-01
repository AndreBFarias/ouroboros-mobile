// Testes do modulo de vault para ciclo menstrual (M14.5). Cobre
// inferirFase (funcao pura) com conjunto canonico de datas, e os
// helpers I/O (listarRegistrosCiclo, lerRegistroCiclo,
// escreverRegistroCiclo) com mock do reader/writer.
//
// Comentarios sem acento (convencao shell/CI).
import type { CicloMenstrualMeta } from '@/lib/schemas/ciclo_menstrual';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import {
  listarRegistrosCiclo,
  lerRegistroCiclo,
  escreverRegistroCiclo,
  inferirFase,
  duracaoCicloDetectada,
  ultimaDataInicio,
} from '@/lib/vault/ciclo';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<CicloMenstrualMeta> = {}): CicloMenstrualMeta {
  return {
    tipo: 'ciclo_menstrual',
    data: '2026-04-29',
    autor: 'pessoa_a',
    data_inicio: '2026-04-12',
    fase: 'lutea',
    sintomas: [],
    intensidade: null,
    humor_associado: null,
    texto: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('inferirFase', () => {
  const inicio = '2026-04-01';

  it('dia 1 e menstrual', () => {
    expect(inferirFase('2026-04-01', inicio)).toBe('menstrual');
  });

  it('dia 5 ainda e menstrual', () => {
    expect(inferirFase('2026-04-05', inicio)).toBe('menstrual');
  });

  it('dia 6 ja e folicular', () => {
    expect(inferirFase('2026-04-06', inicio)).toBe('folicular');
  });

  it('dia 13 e ultimo folicular', () => {
    expect(inferirFase('2026-04-13', inicio)).toBe('folicular');
  });

  it('dia 14 e ovulatoria', () => {
    expect(inferirFase('2026-04-14', inicio)).toBe('ovulatoria');
  });

  it('dia 16 e ultimo ovulatoria', () => {
    expect(inferirFase('2026-04-16', inicio)).toBe('ovulatoria');
  });

  it('dia 17 e lutea', () => {
    expect(inferirFase('2026-04-17', inicio)).toBe('lutea');
  });

  it('dia 28 ainda e lutea', () => {
    expect(inferirFase('2026-04-28', inicio)).toBe('lutea');
  });

  it('dia 35 (alongado) ainda devolve lutea', () => {
    expect(inferirFase('2026-05-05', inicio)).toBe('lutea');
  });

  it('quando dataInicioUltimoCiclo e null cai em menstrual', () => {
    expect(inferirFase('2026-04-29', null)).toBe('menstrual');
  });

  it('data anterior ao inicio cai em menstrual (fallback estavel)', () => {
    expect(inferirFase('2026-03-30', inicio)).toBe('menstrual');
  });
});

describe('listarRegistrosCiclo', () => {
  it('retorna lista vazia quando pasta nao existe', async () => {
    mockListVaultFolder.mockResolvedValue([]);
    const out = await listarRegistrosCiclo(VAULT_ROOT, 'pessoa_a');
    expect(out).toEqual([]);
  });

  it('filtra por autor (privacidade visual)', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-04-10.md`,
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-04-12.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-04-10', autor: 'pessoa_a' }),
        body: '',
      })
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-04-12', autor: 'pessoa_b' }),
        body: '',
      });
    const out = await listarRegistrosCiclo(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2026-04-10');
  });

  it('ordena asc por data', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-04-15.md`,
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-04-10.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-04-15' }),
        body: '',
      })
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-04-10' }),
        body: '',
      });
    const out = await listarRegistrosCiclo(VAULT_ROOT, 'pessoa_a');
    expect(out.map((r) => r.data)).toEqual(['2026-04-10', '2026-04-15']);
  });

  it('aplica filtro de periodo 28d', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-01-01.md`,
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-04-29.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-01-01' }),
        body: '',
      })
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-04-29' }),
        body: '',
      });
    const hoje = new Date('2026-04-29T12:00:00Z');
    const out = await listarRegistrosCiclo(VAULT_ROOT, 'pessoa_a', {
      periodo: '28d',
      hoje,
    });
    expect(out.map((r) => r.data)).toEqual(['2026-04-29']);
  });

  it('ignora arquivos malformados sem quebrar', async () => {
    mockListVaultFolder.mockResolvedValue([
      `${VAULT_ROOT}/inbox/saude/ciclo/quebrado.md`,
      `${VAULT_ROOT}/inbox/saude/ciclo/2026-04-10.md`,
    ]);
    mockReadVaultFile
      .mockRejectedValueOnce(new Error('yaml invalido'))
      .mockResolvedValueOnce({
        meta: fixture({ data: '2026-04-10' }),
        body: '',
      });
    const out = await listarRegistrosCiclo(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2026-04-10');
  });
});

describe('lerRegistroCiclo', () => {
  it('retorna meta quando arquivo existe', async () => {
    mockReadVaultFile.mockResolvedValue({
      meta: fixture({ data: '2026-04-10' }),
      body: '',
    });
    const out = await lerRegistroCiclo(VAULT_ROOT, '2026-04-10');
    expect(out).not.toBeNull();
    expect(out?.data).toBe('2026-04-10');
  });

  it('retorna null quando arquivo nao existe', async () => {
    mockReadVaultFile.mockResolvedValue(null);
    const out = await lerRegistroCiclo(VAULT_ROOT, '2026-04-10');
    expect(out).toBeNull();
  });
});

describe('escreverRegistroCiclo', () => {
  it('persiste registro valido derivando o path da data', async () => {
    mockWriteVaultFile.mockResolvedValue(undefined);
    const meta = fixture({ data: '2026-04-29' });
    const out = await escreverRegistroCiclo(VAULT_ROOT, meta, '');
    expect(out.rel).toBe('inbox/saude/ciclo/2026-04-29.md');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('lanca quando meta e invalido', async () => {
    const meta = { ...fixture(), fase: 'invalida' } as unknown as CicloMenstrualMeta;
    await expect(
      escreverRegistroCiclo(VAULT_ROOT, meta, '')
    ).rejects.toThrow(/invalido/);
  });
});

describe('duracaoCicloDetectada', () => {
  it('default 28 quando nao ha dois inicios', () => {
    expect(duracaoCicloDetectada([])).toBe(28);
    expect(
      duracaoCicloDetectada([fixture({ data_inicio: '2026-04-01' })])
    ).toBe(28);
  });

  it('detecta duracao real com dois inicios distintos', () => {
    const lista: CicloMenstrualMeta[] = [
      fixture({ data: '2026-03-01', data_inicio: '2026-03-01' }),
      fixture({ data: '2026-04-01', data_inicio: '2026-04-01' }),
    ];
    expect(duracaoCicloDetectada(lista)).toBe(31);
  });

  it('default 28 quando duracao detectada esta fora dos limites', () => {
    const lista: CicloMenstrualMeta[] = [
      fixture({ data: '2026-03-01', data_inicio: '2026-03-01' }),
      fixture({ data: '2026-03-15', data_inicio: '2026-03-15' }),
    ];
    expect(duracaoCicloDetectada(lista)).toBe(28);
  });
});

describe('ultimaDataInicio', () => {
  it('retorna null quando nao ha registro com data_inicio', () => {
    expect(ultimaDataInicio([])).toBeNull();
    expect(
      ultimaDataInicio([fixture({ data_inicio: null })])
    ).toBeNull();
  });

  it('retorna data_inicio mais recente', () => {
    const lista: CicloMenstrualMeta[] = [
      fixture({ data: '2026-03-01', data_inicio: '2026-03-01' }),
      fixture({ data: '2026-03-15', data_inicio: null }),
      fixture({ data: '2026-04-01', data_inicio: '2026-04-01' }),
    ];
    expect(ultimaDataInicio(lista)).toBe('2026-04-01');
  });
});
