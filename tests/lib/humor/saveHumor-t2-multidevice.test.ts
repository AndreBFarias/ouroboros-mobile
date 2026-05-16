// Regressao T2-LOCK-VAULT: simula 2 devices salvando humor no mesmo
// dia. Cada device escreve no SEU arquivo com suffix proprio, sem
// race condition. Listagem agrega ambos.
//
// Antes do T2: arquivo canonico humor-2026-05-15.md poderia ser
// sobrescrito silenciosamente quando dois devices capturavam no mesmo
// segundo (read-then-write race). Sintoma B7 da auditoria 2026-05-15.
//
// Comentarios sem acento (convencao shell/CI).
import type { HumorMeta } from '@/lib/schemas/humor';
import * as SecureStore from 'expo-secure-store';
import {
  _resetDeviceIdCache,
  DEVICE_ID_KEY,
} from '@/lib/util/deviceId';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: HumorMeta; body: string } | null>,
  [string, unknown]
>();

jest.mock('@/lib/vault', () => {
  const actual = jest.requireActual('@/lib/vault');
  return {
    ...actual,
    writeVaultFile: (...args: [string, unknown, string]) =>
      mockWriteVaultFile(...args),
    readVaultFile: (...args: [string, unknown]) => mockReadVaultFile(...args),
  };
});

import { saveHumor } from '@/lib/humor/saveHumor';

const VAULT_ROOT = 'content://test/vault';

const baseHumor: HumorMeta = {
  tipo: 'humor',
  data: '2026-05-15',
  autor: 'pessoa_a',
  humor: 4,
  energia: 3,
  ansiedade: 2,
  foco: 4,
  tags: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  jest.useFakeTimers().setSystemTime(new Date('2026-05-15T12:00:00.000Z'));
});

afterEach(async () => {
  jest.useRealTimers();
  // Limpa SecureStore entre testes para nao herdar deviceId de outro
  // cenario (cada teste seta o seu via beforeEach especifico).
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  _resetDeviceIdCache();
});

describe('saveHumor multi-device T2-LOCK-VAULT (regressao B7)', () => {
  it('Device A e Device B salvam mesmo dia: arquivos distintos', async () => {
    // Device A: seta deviceId A no SecureStore.
    await SecureStore.setItemAsync(DEVICE_ID_KEY, 'ouro-deva01');
    _resetDeviceIdCache();
    const outA = await saveHumor(baseHumor, VAULT_ROOT);

    // Device B: simula uma nova instalacao. Limpa cache + SecureStore,
    // seta deviceId B.
    _resetDeviceIdCache();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, 'ouro-devb02');
    const outB = await saveHumor(baseHumor, VAULT_ROOT);

    // Cada save vai para seu proprio path com suffix proprio.
    expect(outA.uri).toMatch(/humor-2026-05-15-ouro-deva01\.md$/);
    expect(outB.uri).toMatch(/humor-2026-05-15-ouro-devb02\.md$/);
    expect(outA.uri).not.toBe(outB.uri);

    // Nenhum dos saves sobrescreveu canonico. Os 2 writes foram em
    // paths distintos do mesmo dia.
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(2);
    const [uriA] = mockWriteVaultFile.mock.calls[0];
    const [uriB] = mockWriteVaultFile.mock.calls[1];
    expect(uriA).toMatch(/humor-2026-05-15-ouro-deva01\.md$/);
    expect(uriB).toMatch(/humor-2026-05-15-ouro-devb02\.md$/);
  });

  it('Device A salva duas vezes no mesmo dia: mesmo arquivo (idempotencia)', async () => {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, 'ouro-deva01');
    _resetDeviceIdCache();
    // Primeiro save.
    const out1 = await saveHumor(baseHumor, VAULT_ROOT);
    // Segundo save do mesmo device no mesmo dia (regravacao).
    const out2 = await saveHumor({ ...baseHumor, humor: 5 }, VAULT_ROOT);

    // T2: ambos vao para o MESMO path (cada device dono do seu arquivo).
    expect(out1.uri).toMatch(/humor-2026-05-15-ouro-deva01\.md$/);
    expect(out2.uri).toBe(out1.uri);

    // Segundo write sobrescreve o mesmo arquivo (edicao legitima).
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(2);
    const [uri1] = mockWriteVaultFile.mock.calls[0];
    const [uri2] = mockWriteVaultFile.mock.calls[1];
    expect(uri1).toBe(uri2);
  });

  it('readVaultFile previo nao influencia path final do save (T2)', async () => {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, 'ouro-deva01');
    _resetDeviceIdCache();

    // Simula que arquivo canonico (de outro device pre-T2) ja existe.
    mockReadVaultFile.mockResolvedValue({
      meta: { ...baseHumor, autor: 'pessoa_b' },
      body: '',
    });

    const out = await saveHumor(baseHumor, VAULT_ROOT);
    // T2: read-previo nao muda a decisao do path. Save sempre escreve
    // no arquivo do device atual com suffix.
    expect(out.uri).toMatch(/humor-2026-05-15-ouro-deva01\.md$/);
    // Nao deve haver duplicacao no path nem fallback estranho.
    expect(out.uri.match(/ouro-/g)?.length).toBe(1);
  });
});
