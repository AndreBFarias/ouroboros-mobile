// Testes dos helpers do devices index (M38). Cobre lerDevicesIndex
// (file ausente -> vazio, file presente -> registro), escreverDevicesIndex
// (revalida via schema), atualizarDeviceIndex (cria entry primeira vez,
// atualiza ultima_atividade em boots subsequentes, marca substituido_por
// quando SecureStore foi zerado), renomearDispositivo (valida nome,
// preserva demais campos, idempotente).
//
// Mocks: reader/writer + getDeviceId + useVault + usePessoa.
//
// Comentarios sem acento.

const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

// Variaveis prefixadas com 'mock' sao permitidas dentro do factory
// jest.mock (defesa do jest contra closures sobre vars nao inicializadas).
const mockState = {
  deviceId: 'ouro-aaaaaa',
  pessoaAtiva: 'pessoa_a' as 'pessoa_a' | 'pessoa_b',
  vaultRoot: 'content://test/vault' as string | null,
};

jest.mock('@/lib/util/deviceId', () => ({
  __esModule: true,
  getDeviceId: jest.fn(() => Promise.resolve(mockState.deviceId)),
  applyDeviceIdSuffix: jest.fn(),
  DEVICE_ID_KEY: 'ouroboros.device.id',
  _resetDeviceIdCache: jest.fn(),
}));

jest.mock('@/lib/stores/pessoa', () => ({
  __esModule: true,
  usePessoa: {
    getState: () => ({ pessoaAtiva: mockState.pessoaAtiva }),
  },
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => ({ vaultRoot: mockState.vaultRoot }),
  },
}));

import {
  atualizarDeviceIndex,
  DispositivoRegistroSchema,
  escreverDevicesIndex,
  lerDevicesIndex,
  renomearDispositivo,
  type DevicesIndex,
} from '@/lib/vault/devicesIndex';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockState.deviceId = 'ouro-aaaaaa';
  mockState.pessoaAtiva = 'pessoa_a';
  mockState.vaultRoot = VAULT_ROOT;
});

describe('lerDevicesIndex', () => {
  it('arquivo ausente devolve index vazio', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const idx = await lerDevicesIndex(VAULT_ROOT);
    expect(idx).toEqual({ tipo: 'devices_index', registro: {} });
  });

  it('arquivo presente devolve meta', async () => {
    const meta: DevicesIndex = {
      tipo: 'devices_index',
      registro: {
        'ouro-x1': {
          nome_amigavel: 'dispositivo-1',
          pessoa: 'pessoa_a',
          primeira_atividade: '2026-05-01T08:00:00.000Z',
          ultima_atividade: '2026-05-04T18:00:00.000Z',
          substituido_por: null,
        },
      },
    };
    mockReadVaultFile.mockResolvedValueOnce({ meta, body: '' });
    const idx = await lerDevicesIndex(VAULT_ROOT);
    expect(idx.registro['ouro-x1'].nome_amigavel).toBe('dispositivo-1');
  });

  it('schema invalido cai em vazio (nao quebra boot)', async () => {
    mockReadVaultFile.mockRejectedValueOnce(new Error('schema falho'));
    const idx = await lerDevicesIndex(VAULT_ROOT);
    expect(idx.registro).toEqual({});
  });
});

describe('escreverDevicesIndex', () => {
  it('escreve no path markdown/_devices.md (H2 layout-por-tipo)', async () => {
    const idx: DevicesIndex = { tipo: 'devices_index', registro: {} };
    await escreverDevicesIndex(VAULT_ROOT, idx);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toBe(`${VAULT_ROOT}/markdown/_devices.md`);
  });

  it('rejeita index com tipo errado', async () => {
    const ruim = {
      tipo: 'outra_coisa',
      registro: {},
    } as unknown as DevicesIndex;
    await expect(escreverDevicesIndex(VAULT_ROOT, ruim)).rejects.toThrow(
      /devices index invalido/
    );
  });

  it('limpa trailing %20 e whitespace via vaultUriJoin (URI SAF MIUI/OneUI)', async () => {
    const idx: DevicesIndex = { tipo: 'devices_index', registro: {} };
    const dirty =
      'content://com.android.externalstorage.documents/tree/primary:Test%20';
    await escreverDevicesIndex(dirty, idx);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    // %20 trailing no root foi removido por vaultUriJoin.
    expect(uri).toBe(
      'content://com.android.externalstorage.documents/tree/primary:Test/markdown/_devices.md'
    );
  });

  it('throw com vaultRoot vazio (vault nao inicializado)', async () => {
    const idx: DevicesIndex = { tipo: 'devices_index', registro: {} };
    await expect(escreverDevicesIndex('', idx)).rejects.toThrow(
      /vault nao inicializado|root vazio/
    );
  });

  it('throw em lerDevicesIndex com vaultRoot vazio', async () => {
    await expect(lerDevicesIndex('')).rejects.toThrow(
      /vault nao inicializado|root vazio/
    );
  });
});

describe('atualizarDeviceIndex', () => {
  it('primeira atividade: cria entry com defaults', async () => {
    await atualizarDeviceIndex();
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [, meta] = mockWriteVaultFile.mock.calls[0] as [
      string,
      DevicesIndex,
      string,
    ];
    const reg = meta.registro['ouro-aaaaaa'];
    expect(reg).toBeDefined();
    expect(reg.pessoa).toBe('pessoa_a');
    expect(reg.nome_amigavel).toBe('dispositivo-1');
    expect(reg.substituido_por).toBe(null);
  });

  it('boot subsequente: so atualiza ultima_atividade', async () => {
    const meta: DevicesIndex = {
      tipo: 'devices_index',
      registro: {
        'ouro-aaaaaa': {
          nome_amigavel: 'meu-celular',
          pessoa: 'pessoa_a',
          primeira_atividade: '2026-05-01T08:00:00.000Z',
          ultima_atividade: '2026-05-01T08:00:00.000Z',
          substituido_por: null,
        },
      },
    };
    mockReadVaultFile.mockResolvedValueOnce({ meta, body: '' });
    await atualizarDeviceIndex();
    const [, escrito] = mockWriteVaultFile.mock.calls[0] as [
      string,
      DevicesIndex,
      string,
    ];
    const reg = escrito.registro['ouro-aaaaaa'];
    // Nome amigavel preservado (nao reseta para default).
    expect(reg.nome_amigavel).toBe('meu-celular');
    expect(reg.primeira_atividade).toBe('2026-05-01T08:00:00.000Z');
    // ultima_atividade atualizou para tempo recente.
    expect(reg.ultima_atividade).not.toBe('2026-05-01T08:00:00.000Z');
  });

  it('reinstall: marca antigo da mesma pessoa como substituido_por', async () => {
    const meta: DevicesIndex = {
      tipo: 'devices_index',
      registro: {
        'ouro-velho1': {
          nome_amigavel: 'dispositivo-1',
          pessoa: 'pessoa_a',
          primeira_atividade: '2026-04-01T08:00:00.000Z',
          ultima_atividade: '2026-04-30T20:00:00.000Z',
          substituido_por: null,
        },
      },
    };
    mockReadVaultFile.mockResolvedValueOnce({ meta, body: '' });
    mockState.deviceId = 'ouro-novo01';
    await atualizarDeviceIndex();
    const [, escrito] = mockWriteVaultFile.mock.calls[0] as [
      string,
      DevicesIndex,
      string,
    ];
    expect(escrito.registro['ouro-velho1'].substituido_por).toBe('ouro-novo01');
    expect(escrito.registro['ouro-novo01']).toBeDefined();
    expect(escrito.registro['ouro-novo01'].pessoa).toBe('pessoa_a');
  });

  it('nao toca dispositivo de outra pessoa em reinstall', async () => {
    const meta: DevicesIndex = {
      tipo: 'devices_index',
      registro: {
        'ouro-outraB': {
          nome_amigavel: 'celular-b',
          pessoa: 'pessoa_b',
          primeira_atividade: '2026-04-01T08:00:00.000Z',
          ultima_atividade: '2026-05-04T20:00:00.000Z',
          substituido_por: null,
        },
      },
    };
    mockReadVaultFile.mockResolvedValueOnce({ meta, body: '' });
    mockState.deviceId = 'ouro-novoA0';
    mockState.pessoaAtiva = 'pessoa_a';
    await atualizarDeviceIndex();
    const [, escrito] = mockWriteVaultFile.mock.calls[0] as [
      string,
      DevicesIndex,
      string,
    ];
    // Dispositivo de pessoa_b preservado intocado.
    expect(escrito.registro['ouro-outraB'].substituido_por).toBe(null);
  });

  it('vault root null faz no-op (boot pre-onboarding)', async () => {
    mockState.vaultRoot = null;
    await atualizarDeviceIndex();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });
});

describe('renomearDispositivo', () => {
  it('atualiza nome_amigavel preservando demais campos', async () => {
    const meta: DevicesIndex = {
      tipo: 'devices_index',
      registro: {
        'ouro-x1': {
          nome_amigavel: 'dispositivo-1',
          pessoa: 'pessoa_a',
          primeira_atividade: '2026-05-01T08:00:00.000Z',
          ultima_atividade: '2026-05-04T18:00:00.000Z',
          substituido_por: null,
        },
      },
    };
    mockReadVaultFile.mockResolvedValueOnce({ meta, body: '' });
    await renomearDispositivo(VAULT_ROOT, 'ouro-x1', 'celular-andre');
    const [, escrito] = mockWriteVaultFile.mock.calls[0] as [
      string,
      DevicesIndex,
      string,
    ];
    expect(escrito.registro['ouro-x1'].nome_amigavel).toBe('celular-andre');
    expect(escrito.registro['ouro-x1'].primeira_atividade).toBe(
      '2026-05-01T08:00:00.000Z'
    );
  });

  it('rejeita nome vazio', async () => {
    await expect(
      renomearDispositivo(VAULT_ROOT, 'ouro-x1', '   ')
    ).rejects.toThrow(/nao pode ser vazio/);
  });

  it('rejeita nome longo (>80 chars)', async () => {
    await expect(
      renomearDispositivo(VAULT_ROOT, 'ouro-x1', 'a'.repeat(81))
    ).rejects.toThrow(/muito longo/);
  });

  it('rejeita dispositivo desconhecido', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { tipo: 'devices_index', registro: {} } as DevicesIndex,
      body: '',
    });
    await expect(
      renomearDispositivo(VAULT_ROOT, 'ouro-faltante', 'qq')
    ).rejects.toThrow(/dispositivo nao encontrado/);
  });

  it('idempotente: nome igual nao escreve', async () => {
    const meta: DevicesIndex = {
      tipo: 'devices_index',
      registro: {
        'ouro-x1': {
          nome_amigavel: 'mesmo',
          pessoa: 'pessoa_a',
          primeira_atividade: '2026-05-01T08:00:00.000Z',
          ultima_atividade: '2026-05-04T18:00:00.000Z',
          substituido_por: null,
        },
      },
    };
    mockReadVaultFile.mockResolvedValueOnce({ meta, body: '' });
    await renomearDispositivo(VAULT_ROOT, 'ouro-x1', 'mesmo');
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });
});

describe('DispositivoRegistroSchema', () => {
  it('valida registro completo', () => {
    const ok = DispositivoRegistroSchema.safeParse({
      nome_amigavel: 'x',
      pessoa: 'pessoa_a',
      primeira_atividade: '2026-05-04T18:00:00.000Z',
      ultima_atividade: '2026-05-04T18:00:00.000Z',
      substituido_por: null,
    });
    expect(ok.success).toBe(true);
  });

  it('rejeita pessoa nao reconhecida (ambos nao entra)', () => {
    const r = DispositivoRegistroSchema.safeParse({
      nome_amigavel: 'x',
      pessoa: 'ambos',
      primeira_atividade: '2026-05-04T18:00:00.000Z',
      ultima_atividade: '2026-05-04T18:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });
});
