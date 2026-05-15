// Testes dos helpers de Vault para contadores (M18). Cobre listagem,
// leitura, escrita, exclusao e registrarReset (atualiza recorde se
// dias > recorde, preserva se nao, atualiza inicio e adiciona ao
// array resets).
//
// Mocks: reader/writer/SAF para isolar I/O.
//
// Comentarios sem acento (convencao shell/CI).
import type { Contador } from '@/lib/schemas/contador';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'cache://test/',
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import {
  listarContadores,
  lerContador,
  escreverContador,
  excluirContador,
  registrarReset,
} from '@/lib/vault/contadores';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<Contador> = {}): Contador {
  return {
    tipo: 'contador',
    slug: 'sem-cigarro',
    titulo: 'Sem cigarro',
    inicio: '2026-04-01',
    recorde: 0,
    resets: [],
    criado_em: '2026-02-04T14:00:00-03:00',
    para: { tipo: 'mim' },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarContadores', () => {
  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarContadores(VAULT_ROOT);
    expect(out).toEqual([]);
  });

  it('ordena por titulo asc com localeCompare PT-BR', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/contador-c.md`,
      `${VAULT_ROOT}/markdown/contador-a.md`,
      `${VAULT_ROOT}/markdown/contador-b.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('contador-a.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'a', titulo: 'Sem álcool' }),
          body: '',
        });
      if (uri.endsWith('contador-b.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'b', titulo: 'Sem cigarro' }),
          body: '',
        });
      if (uri.endsWith('contador-c.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'c', titulo: 'Sem rede social' }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarContadores(VAULT_ROOT);
    expect(out.map((c) => c.titulo)).toEqual([
      'Sem álcool',
      'Sem cigarro',
      'Sem rede social',
    ]);
  });

  it('ignora arquivos malformados sem propagar erro', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/contador-ok.md`,
      `${VAULT_ROOT}/markdown/contador-quebrada.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('quebrada.md')) {
        return Promise.reject(new Error('schema invalido'));
      }
      return Promise.resolve({ meta: fixture({ slug: 'ok' }), body: '' });
    });
    const out = await listarContadores(VAULT_ROOT);
    expect(out.length).toBe(1);
    expect(out[0].slug).toBe('ok');
  });
});

describe('lerContador', () => {
  it('chama reader com URI correto', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await lerContador(VAULT_ROOT, 'sem-cigarro');
    expect(mockReadVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/contador-sem-cigarro.md`,
      expect.anything()
    );
  });

  it('retorna meta quando existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({ meta: fixture(), body: '' });
    const out = await lerContador(VAULT_ROOT, 'sem-cigarro');
    expect(out).not.toBeNull();
    expect(out?.titulo).toBe('Sem cigarro');
  });

  it('retorna null quando nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await lerContador(VAULT_ROOT, 'inexistente');
    expect(out).toBeNull();
  });
});

describe('escreverContador', () => {
  it('grava em path canonico markdown/contador-<slug>.md (H2 layout-por-tipo)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture();
    const { rel, uri } = await escreverContador(VAULT_ROOT, meta);
    expect(rel).toBe('markdown/contador-sem-cigarro.md');
    expect(uri).toBe(`${VAULT_ROOT}/${rel}`);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/${rel}`,
      expect.objectContaining({ titulo: 'Sem cigarro' }),
      ''
    );
  });

  it('rejeita meta invalido', async () => {
    const inv = fixture({ recorde: -5 });
    await expect(escreverContador(VAULT_ROOT, inv)).rejects.toThrow(
      /contador invalido/
    );
  });

  // I-CONTADOR: vaultUriJoin lanca erro claro quando root vazio
  // (sentinel de bug em estado anterior do app, ADR-0023).
  it('lanca erro quando vaultRoot vazio', async () => {
    const meta = fixture();
    await expect(escreverContador('', meta)).rejects.toThrow(
      /vaultUriJoin: root vazio/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  // I-CONTADOR: vaultUriJoin canonico (paths.ts:27) faz, em ordem:
  //  1. trim() externo,
  //  2. replace(/\s+$/, '') trailing whitespace,
  //  3. replace(/%20+$/, '') trailing %20 percent-encoded,
  //  4. replace(/\/+$/, '') trailing slashes.
  //
  // Para um root tipico SAF contaminado com trailing %20 (sintoma A29
  // em OEMs MIUI/OneUI), o path final fica limpo. Cobertura aqui
  // garante que o caller (escreverContador) realmente roteia pelo
  // helper canonico, e nao mais pelo joinUri local que existia antes
  // desta sprint.
  it('produz path final via vaultUriJoin (limpa trailing %20 do SAF)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}%20`;
    const meta = fixture();
    const { uri } = await escreverContador(rootSujo, meta);
    expect(uri).toBe(`${VAULT_ROOT}/markdown/contador-sem-cigarro.md`);
    // Sem barras duplas no path final (so a do scheme content://).
    expect(uri.split('//').length).toBe(2);
  });

  it('produz path final via vaultUriJoin (limpa trailing slashes)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}//`;
    const meta = fixture();
    const { uri } = await escreverContador(rootSujo, meta);
    expect(uri).toBe(`${VAULT_ROOT}/markdown/contador-sem-cigarro.md`);
  });
});

describe('excluirContador', () => {
  it('chama SAF.deleteAsync com URI correto', async () => {
    mockDeleteAsync.mockResolvedValueOnce(undefined);
    await excluirContador(VAULT_ROOT, 'sem-cigarro');
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/contador-sem-cigarro.md`
    );
  });

  it('e idempotente quando arquivo nao existe', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error('nao existe'));
    await expect(
      excluirContador(VAULT_ROOT, 'sem-cigarro')
    ).resolves.toBeUndefined();
  });
});

describe('registrarReset', () => {
  it('atualiza recorde quando dias atuais > recorde', async () => {
    const atual = fixture({
      inicio: '2026-04-01',
      recorde: 10,
      resets: [],
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    // Agora = 2026-04-29 (28 dias depois de 2026-04-01).
    const agora = new Date('2026-04-29T15:30:00Z');
    const out = await registrarReset(VAULT_ROOT, 'sem-cigarro', agora);
    expect(out.recorde).toBe(28);
    expect(out.resets).toEqual([agora.toISOString()]);
    expect(out.inicio).toBe('2026-04-29');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/contador-sem-cigarro.md`,
      expect.objectContaining({ recorde: 28 }),
      ''
    );
  });

  it('preserva recorde quando dias atuais < recorde', async () => {
    const atual = fixture({
      inicio: '2026-04-25',
      recorde: 30,
      resets: ['2026-04-25T08:00:00Z'],
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    // Agora = 2026-04-29 (4 dias < 30 do recorde).
    const agora = new Date('2026-04-29T15:30:00Z');
    const out = await registrarReset(VAULT_ROOT, 'sem-cigarro', agora);
    expect(out.recorde).toBe(30);
    expect(out.resets).toHaveLength(2);
    expect(out.inicio).toBe('2026-04-29');
  });

  it('mantem recorde quando dias atuais = recorde', async () => {
    const atual = fixture({
      inicio: '2026-04-21',
      recorde: 8,
      resets: [],
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    // 2026-04-29 - 2026-04-21 = 8 dias (igual ao recorde).
    const agora = new Date('2026-04-29T15:30:00Z');
    const out = await registrarReset(VAULT_ROOT, 'sem-cigarro', agora);
    expect(out.recorde).toBe(8);
  });

  it('lanca quando contador nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await expect(registrarReset(VAULT_ROOT, 'inexistente')).rejects.toThrow(
      /nao encontrado/
    );
  });

  it('preserva criado_em ao atualizar', async () => {
    const atual = fixture({
      criado_em: '2026-02-04T14:00:00-03:00',
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const out = await registrarReset(
      VAULT_ROOT,
      'sem-cigarro',
      new Date('2026-04-29T15:30:00Z')
    );
    expect(out.criado_em).toBe('2026-02-04T14:00:00-03:00');
  });

  it('acumula resets em ordem cronologica', async () => {
    const atual = fixture({
      resets: ['2026-03-04T10:30:00Z', '2026-04-01T08:00:00Z'],
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const agora = new Date('2026-04-29T15:30:00Z');
    const out = await registrarReset(VAULT_ROOT, 'sem-cigarro', agora);
    expect(out.resets).toHaveLength(3);
    expect(out.resets[2]).toBe(agora.toISOString());
  });

  // I-CONTADOR: BRIEF §1.8 (decisão durável dono 2026-05-03) -- reset
  // preserva historico de resets anteriores, NUNCA apaga. Recorde so
  // sobe via Math.max. Apagar definitivo so via excluirContador
  // (long-press + confirm explicito na UI).
  it('preserva historico de resets anteriores (BRIEF §1.8)', async () => {
    const resetsAnteriores = [
      '2026-01-15T08:00:00Z',
      '2026-02-20T18:30:00Z',
      '2026-03-10T12:00:00Z',
    ];
    const atual = fixture({
      inicio: '2026-04-01',
      recorde: 50,
      resets: resetsAnteriores,
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const agora = new Date('2026-04-29T15:30:00Z');
    const out = await registrarReset(VAULT_ROOT, 'sem-cigarro', agora);

    // Historico preservado: 3 anteriores + 1 novo = 4 entradas.
    expect(out.resets).toHaveLength(4);
    // Os 3 timestamps originais permanecem na mesma ordem.
    expect(out.resets.slice(0, 3)).toEqual(resetsAnteriores);
    // Novo reset fica no fim.
    expect(out.resets[3]).toBe(agora.toISOString());
    // Recorde nao diminui mesmo com dias atuais (28) < recorde (50).
    expect(out.recorde).toBe(50);
    // Inicio atualiza para hoje.
    expect(out.inicio).toBe('2026-04-29');
  });

  // I-CONTADOR: registrarReset usa vaultUriJoin canonico via
  // escreverContador. Path final correto mesmo com root sujo.
  it('produz path final via vaultUriJoin no reset', async () => {
    const atual = fixture();
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const rootSujo = `${VAULT_ROOT}%20`;
    await registrarReset(
      rootSujo,
      'sem-cigarro',
      new Date('2026-04-29T15:30:00Z')
    );
    // O write final usa path limpo, mesmo o root tendo trailing %20.
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/contador-sem-cigarro.md`,
      expect.anything(),
      ''
    );
  });
});
