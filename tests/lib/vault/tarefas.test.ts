// Testes dos helpers de Vault para tarefas (M17). Cobre listagem,
// leitura, escrita, marcacao de feito e exclusao para lixeira.
//
// Mocks: reader/writer/SAF/cacheDir para isolar I/O. M31: tambem mocka
// alarmes/escreverAlarme + agendarAlarme para isolar o branch novo de
// criarTarefa.
//
// Comentarios sem acento (convencao shell/CI).
import type { Tarefa } from '@/lib/schemas/tarefa';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockReadAsString = jest.fn();
const mockWriteAsString = jest.fn();
const mockDeleteAsync = jest.fn();
const mockMakeDir = jest.fn();
const mockEscreverAlarme = jest.fn();
const mockAgendarAlarme = jest.fn();

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
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDir(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsString(...args),
  StorageAccessFramework: {
    readAsStringAsync: (...args: unknown[]) => mockReadAsString(...args),
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));
jest.mock('@/lib/vault/alarmes', () => ({
  __esModule: true,
  escreverAlarme: (...args: unknown[]) => mockEscreverAlarme(...args),
}));
jest.mock('@/lib/services/alarmesNotificacoes', () => ({
  __esModule: true,
  agendarAlarme: (...args: unknown[]) => mockAgendarAlarme(...args),
}));

import {
  listarTarefas,
  lerTarefa,
  escreverTarefa,
  criarTarefa,
  marcarFeito,
  reabrirTarefa,
  excluirTarefa,
  silenciarSugestaoTarefa,
} from '@/lib/vault/tarefas';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<Tarefa> = {}): Tarefa {
  // M31: Tarefa v2 inclui categoria/pessoa_destino/alarme com defaults
  // explicitos. Defaults espelham os do schema.
  // R-ROT-1-B: silenciar_sugestao_ate default null (familia recorrente
  // nao silenciada).
  return {
    tipo: 'tarefa',
    data: '2026-04-29',
    autor: 'pessoa_a',
    titulo: 'Comprar pão',
    feito: false,
    feito_em: null,
    categoria: 'outro',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    silenciar_sugestao_ate: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarTarefas', () => {
  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarTarefas(VAULT_ROOT);
    expect(out).toEqual([]);
  });

  it('separa pendentes (data desc) e feitas (feito_em desc)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/tarefa-feita-antiga-aaaa.md`,
      `${VAULT_ROOT}/markdown/tarefa-pendente-bbbb.md`,
      `${VAULT_ROOT}/markdown/tarefa-pendente-cccc.md`,
      `${VAULT_ROOT}/markdown/tarefa-feita-recente-dddd.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('feita-antiga-aaaa.md')) {
        return Promise.resolve({
          meta: fixture({
            data: '2026-04-25',
            titulo: 'Feita antiga',
            feito: true,
            feito_em: '2026-04-25T10:00:00-03:00',
          }),
          body: '',
        });
      }
      if (uri.endsWith('pendente-bbbb.md')) {
        return Promise.resolve({
          meta: fixture({ data: '2026-04-29', titulo: 'B' }),
          body: '',
        });
      }
      if (uri.endsWith('pendente-cccc.md')) {
        return Promise.resolve({
          meta: fixture({ data: '2026-04-28', titulo: 'C' }),
          body: '',
        });
      }
      if (uri.endsWith('feita-recente-dddd.md')) {
        return Promise.resolve({
          meta: fixture({
            data: '2026-04-27',
            titulo: 'Feita recente',
            feito: true,
            feito_em: '2026-04-29T15:00:00-03:00',
          }),
          body: '',
        });
      }
      return Promise.resolve(null);
    });

    const out = await listarTarefas(VAULT_ROOT);
    // Ordenacao esperada: pendentes (29 desc, 28), depois feitas
    // (feito_em 29 desc, 25).
    expect(out.map((t) => t.meta.titulo)).toEqual([
      'B',
      'C',
      'Feita recente',
      'Feita antiga',
    ]);
  });

  it('ignora arquivos malformados sem propagar erro', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/tarefa-ok.md`,
      `${VAULT_ROOT}/markdown/tarefa-quebrada.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('quebrada.md')) {
        return Promise.reject(new Error('schema invalido'));
      }
      return Promise.resolve({ meta: fixture({ titulo: 'OK' }), body: '' });
    });

    const out = await listarTarefas(VAULT_ROOT);
    expect(out.length).toBe(1);
    expect(out[0].meta.titulo).toBe('OK');
  });

  it('expoe rel relativo ao vaultRoot', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/tarefa-foo-bar.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: fixture({ titulo: 'foo' }),
      body: '',
    });
    const out = await listarTarefas(VAULT_ROOT);
    expect(out[0].rel).toBe('markdown/tarefa-foo-bar.md');
  });
});

describe('lerTarefa', () => {
  it('chama reader com URI correto', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await lerTarefa(VAULT_ROOT, 'markdown/tarefa-foo.md');
    expect(mockReadVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-foo.md`,
      expect.anything()
    );
  });

  it('retorna meta quando existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({ meta: fixture(), body: '' });
    const out = await lerTarefa(VAULT_ROOT, 'markdown/tarefa-qualquer.md');
    expect(out).not.toBeNull();
  });

  it('retorna null quando nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await lerTarefa(VAULT_ROOT, 'markdown/tarefa-inexistente.md');
    expect(out).toBeNull();
  });
});

describe('escreverTarefa', () => {
  it('grava em path informado', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture();
    const { rel, uri } = await escreverTarefa(
      VAULT_ROOT,
      'markdown/tarefa-comprar-pao-7k2x.md',
      meta
    );
    expect(rel).toBe('markdown/tarefa-comprar-pao-7k2x.md');
    expect(uri).toBe(`${VAULT_ROOT}/${rel}`);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/${rel}`,
      expect.objectContaining({ titulo: 'Comprar pão' }),
      ''
    );
  });

  it('rejeita meta invalido', async () => {
    const inv = fixture({ data: '29/04/2026' });
    await expect(
      escreverTarefa(VAULT_ROOT, 'markdown/tarefa-x.md', inv)
    ).rejects.toThrow(/tarefa invalida/);
  });
});

describe('criarTarefa T2-LOCK-VAULT', () => {
  it('deriva path markdown/tarefa-<slug>-ouro-<id>.md com suffix sempre', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({ data: '2026-04-29' });
    const { rel } = await criarTarefa(VAULT_ROOT, meta, 'comprar-pao-7k2x');
    expect(rel).toMatch(
      /^markdown\/tarefa-comprar-pao-7k2x-ouro-[a-z0-9]{6}\.md$/
    );
  });

  it('M31: nao cria alarme companion quando meta.alarme === null', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({ alarme: null });
    await criarTarefa(VAULT_ROOT, meta, 'tarefa-1234');
    expect(mockEscreverAlarme).not.toHaveBeenCalled();
    expect(mockAgendarAlarme).not.toHaveBeenCalled();
  });

  it('M31: nao cria alarme companion quando ativo=false', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({
      alarme: {
        ativo: false,
        data_hora_iso: null,
        recorrencia: 'unica',
      },
    });
    await criarTarefa(VAULT_ROOT, meta, 'tarefa-1234');
    expect(mockEscreverAlarme).not.toHaveBeenCalled();
  });

  it('M31: cria alarme companion quando ativo=true e popula slug_vinculado', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    mockEscreverAlarme.mockResolvedValueOnce({
      uri: `${VAULT_ROOT}/alarmes/foo-1234-alarme.md`,
      rel: 'alarmes/foo-1234-alarme.md',
    });
    mockAgendarAlarme.mockResolvedValueOnce({ ids: ['x'], estourou: false });

    const meta = fixture({
      titulo: 'Reuniao',
      alarme: {
        ativo: true,
        data_hora_iso: '2026-05-01T14:00:00-03:00',
        recorrencia: 'unica',
      },
    });
    await criarTarefa(VAULT_ROOT, meta, 'foo-1234');

    expect(mockEscreverAlarme).toHaveBeenCalledTimes(1);
    expect(mockAgendarAlarme).toHaveBeenCalledTimes(1);
    // T2: tarefa final tem slug_vinculado canonico (<slug>-alarme) e
    // path com suffix de deviceId.
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /markdown\/tarefa-foo-1234-ouro-[a-z0-9]{6}\.md$/
      ),
      expect.objectContaining({
        alarme: expect.objectContaining({
          slug_vinculado: 'foo-1234-alarme',
        }),
      }),
      ''
    );
  });

  it('M31: cria tarefa mesmo se escreverAlarme falhar (graceful)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    mockEscreverAlarme.mockRejectedValueOnce(new Error('vault offline'));

    const meta = fixture({
      alarme: {
        ativo: true,
        data_hora_iso: '2026-05-01T14:00:00-03:00',
        recorrencia: 'unica',
      },
    });
    await expect(
      criarTarefa(VAULT_ROOT, meta, 'foo-1234')
    ).resolves.toMatchObject({
      rel: expect.stringMatching(
        /^markdown\/tarefa-foo-1234-ouro-[a-z0-9]{6}\.md$/
      ),
    });
    expect(mockWriteVaultFile).toHaveBeenCalled();
  });
});

describe('reabrirTarefa (M31)', () => {
  it('inverte feito de true para false e zera feito_em', async () => {
    const atual = fixture({
      feito: true,
      feito_em: '2026-04-29T10:00:00-03:00',
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const out = await reabrirTarefa(VAULT_ROOT, 'markdown/tarefa-foo.md');
    expect(out.feito).toBe(false);
    expect(out.feito_em).toBeNull();
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-foo.md`,
      expect.objectContaining({ feito: false, feito_em: null }),
      ''
    );
  });

  it('idempotente em tarefa ja pendente', async () => {
    const atual = fixture({ feito: false, feito_em: null });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const out = await reabrirTarefa(VAULT_ROOT, 'markdown/tarefa-foo.md');
    expect(out.feito).toBe(false);
  });

  it('lanca quando arquivo nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await expect(
      reabrirTarefa(VAULT_ROOT, 'markdown/tarefa-inexistente.md')
    ).rejects.toThrow(/nao encontrada/);
  });
});

describe('marcarFeito', () => {
  it('alterna pendente para feito gravando feito_em', async () => {
    const atual = fixture();
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const agora = new Date('2026-04-29T15:30:00-03:00');
    const out = await marcarFeito(
      VAULT_ROOT,
      'markdown/tarefa-foo.md',
      true,
      agora
    );
    expect(out.feito).toBe(true);
    expect(out.feito_em).toBe(agora.toISOString());
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-foo.md`,
      expect.objectContaining({ feito: true }),
      ''
    );
  });

  it('alterna feito para pendente zerando feito_em', async () => {
    const atual = fixture({
      feito: true,
      feito_em: '2026-04-29T10:00:00-03:00',
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const out = await marcarFeito(VAULT_ROOT, 'markdown/tarefa-foo.md', false);
    expect(out.feito).toBe(false);
    expect(out.feito_em).toBeNull();
  });

  it('lanca quando arquivo nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await expect(
      marcarFeito(VAULT_ROOT, 'markdown/tarefa-inexistente.md', true)
    ).rejects.toThrow(/nao encontrada/);
  });
});

describe('excluirTarefa', () => {
  it('le origem, escreve em lixeira e apaga origem', async () => {
    mockMakeDir.mockResolvedValueOnce(undefined);
    mockReadAsString.mockResolvedValueOnce('---\nconteudo\n---\n');
    mockWriteAsString.mockResolvedValueOnce(undefined);
    mockDeleteAsync.mockResolvedValueOnce(undefined);

    const out = await excluirTarefa(VAULT_ROOT, 'markdown/tarefa-foo-bar.md');
    expect(out.lixeiraPath).toMatch(
      /^cache:\/\/test\/lixeira\/tarefas\/\d{8}-\d{6}-tarefa-foo-bar\.md$/
    );
    expect(mockReadAsString).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-foo-bar.md`
    );
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-foo-bar.md`
    );
  });

  it('propaga falha quando SAF lanca', async () => {
    mockMakeDir.mockResolvedValueOnce(undefined);
    mockReadAsString.mockRejectedValueOnce(new Error('sem permissao'));
    await expect(
      excluirTarefa(VAULT_ROOT, 'markdown/tarefa-foo.md')
    ).rejects.toThrow(/lixeira/);
  });
});

// I-TAREFA (M-SAVE-TAREFA-VALIDA, 2026-05-07): cobertura do path
// canonico via vaultUriJoin (H1). vaultRoot vazio throw + %20
// ofensivo normalizado + trailing whitespace tratado. Espelha o
// padrao de M-SAVE-AUDIO-VALIDA (I-AUDIO).
describe('vaultUriJoin canonico (I-TAREFA)', () => {
  it('criarTarefa T2 monta uri via markdown/tarefa-<slug>-ouro-<id>.md', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const meta = fixture({ titulo: 'Limpar gatos', categoria: 'saude' });
    const { uri, rel } = await criarTarefa(
      VAULT_ROOT,
      meta,
      'limpar-gatos-7k2x'
    );

    // T2: suffix sempre presente.
    expect(rel).toMatch(
      /^markdown\/tarefa-limpar-gatos-7k2x-ouro-[a-z0-9]{6}\.md$/
    );
    expect(uri).toBe(`${VAULT_ROOT}/${rel}`);
  });

  it('escreverTarefa lanca quando vaultRoot vazio', async () => {
    const meta = fixture();
    await expect(
      escreverTarefa('', 'markdown/tarefa-x.md', meta)
    ).rejects.toThrow(/vaultUriJoin: root vazio/);
  });

  it('criarTarefa lanca quando vaultRoot vazio (sem silenciar)', async () => {
    const meta = fixture();
    await expect(criarTarefa('', meta, 'foo-1234')).rejects.toThrow(
      /vaultUriJoin: root vazio/
    );
  });

  it('lerTarefa lanca quando vaultRoot vazio', async () => {
    await expect(lerTarefa('', 'markdown/tarefa-x.md')).rejects.toThrow(
      /vaultUriJoin: root vazio/
    );
  });

  it('normaliza trailing %20 + whitespace no vaultRoot SAF (A29)', async () => {
    // Origem A29: tree URI SAF do MIUI vinha com '%20' ofensivo
    // no fim, vazando para todas URIs filhas via concat ad-hoc.
    // vaultUriJoin agora trata trim antes de concatenar.
    const VAULT_SUJO = `${VAULT_ROOT}%20 `;
    mockReadVaultFile.mockResolvedValueOnce(null);
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const meta = fixture({ titulo: 'Comprar pão' });
    const { uri } = await criarTarefa(VAULT_SUJO, meta, 'comprar-pao-7k2x');

    // T2: suffix sempre + root limpo.
    expect(uri).toMatch(
      /^content:\/\/test\/vault\/markdown\/tarefa-comprar-pao-7k2x-ouro-[a-z0-9]{6}\.md$/
    );
    expect(uri).not.toMatch(/%20/);
    expect(uri).not.toMatch(/\s/);
  });

  it('normaliza trailing slashes no vaultRoot', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const meta = fixture();
    const { uri } = await escreverTarefa(
      `${VAULT_ROOT}//`,
      'markdown/tarefa-foo.md',
      meta
    );

    expect(uri).toBe(`${VAULT_ROOT}/markdown/tarefa-foo.md`);
    // Sem barra dupla logo antes do segmento markdown.
    expect(uri).not.toMatch(/\/\/markdown/);
  });

  it('listarTarefas usa vaultUriJoin e expoe rel correto pos-trim', async () => {
    // Mesmo com vaultRoot sujo, o rel devolvido fica enxuto.
    const VAULT_SUJO = `${VAULT_ROOT} `;
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/tarefa-foo-bar.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: fixture({ titulo: 'foo' }),
      body: '',
    });
    const out = await listarTarefas(VAULT_SUJO);
    expect(out[0].rel).toBe('markdown/tarefa-foo-bar.md');
  });
});

// I-TAREFA: edge case de marcarFeito preservar resto do meta. Garante
// que ao concluir uma tarefa nao perdemos categoria, pessoa_destino
// nem alarme companion vinculado (regra M31 de historico preservado).
describe('marcarFeito preserva campos M31 (I-TAREFA)', () => {
  it('atualiza feito + feito_em sem perder categoria/destino/alarme', async () => {
    const atual = fixture({
      titulo: 'Reuniao',
      categoria: 'trabalho',
      pessoa_destino: { tipo: 'casal' },
      alarme: {
        ativo: true,
        data_hora_iso: '2026-05-08T09:00:00-03:00',
        recorrencia: 'unica',
        slug_vinculado: 'reuniao-1234-alarme',
      },
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const agora = new Date('2026-05-08T10:30:00-03:00');
    const out = await marcarFeito(
      VAULT_ROOT,
      'markdown/tarefa-reuniao-1234.md',
      true,
      agora
    );

    expect(out.feito).toBe(true);
    expect(out.feito_em).toBe(agora.toISOString());
    expect(out.titulo).toBe('Reuniao');
    expect(out.categoria).toBe('trabalho');
    expect(out.pessoa_destino).toEqual({ tipo: 'casal' });
    expect(out.alarme).toEqual({
      ativo: true,
      data_hora_iso: '2026-05-08T09:00:00-03:00',
      recorrencia: 'unica',
      slug_vinculado: 'reuniao-1234-alarme',
    });
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-reuniao-1234.md`,
      expect.objectContaining({
        feito: true,
        categoria: 'trabalho',
        pessoa_destino: { tipo: 'casal' },
      }),
      ''
    );
  });
});

// R-ROT-1-B: writer canonico que persiste silenciar_sugestao_ate na
// tarefa. Espelha semantica do silenciarSugestao do alarme: idempotente,
// silencioso em arquivo ausente, regrava o frontmatter completo via
// escreverTarefa.
describe('silenciarSugestaoTarefa (R-ROT-1-B)', () => {
  it('grava silenciar_sugestao_ate preservando demais campos', async () => {
    const atual = fixture({
      titulo: 'Tomar remedio',
      categoria: 'saude',
      pessoa_destino: { tipo: 'mim' },
    });
    // duas leituras: silenciarSugestaoTarefa -> lerTarefa, depois
    // escreverTarefa faz outra leitura defensiva para checar metaAntigo.
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const ate = '2026-06-20T15:00:00+00:00';
    await silenciarSugestaoTarefa(
      VAULT_ROOT,
      'markdown/tarefa-tomar-remedio-1234.md',
      ate
    );

    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/tarefa-tomar-remedio-1234.md`,
      expect.objectContaining({
        silenciar_sugestao_ate: ate,
        titulo: 'Tomar remedio',
        categoria: 'saude',
      }),
      ''
    );
  });

  it('idempotente em tarefa inexistente (no-op silencioso)', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await expect(
      silenciarSugestaoTarefa(
        VAULT_ROOT,
        'markdown/tarefa-fantasma.md',
        '2026-06-20T15:00:00+00:00'
      )
    ).resolves.toBeUndefined();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('aceita atualizar uma data ja silenciada (estende periodo)', async () => {
    const atual = fixture({
      silenciar_sugestao_ate: '2026-06-01T00:00:00+00:00',
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockReadVaultFile.mockResolvedValueOnce({ meta: atual, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);

    const novaAte = '2026-07-15T00:00:00+00:00';
    await silenciarSugestaoTarefa(
      VAULT_ROOT,
      'markdown/tarefa-foo.md',
      novaAte
    );

    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ silenciar_sugestao_ate: novaAte }),
      ''
    );
  });
});
