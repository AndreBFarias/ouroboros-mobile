// Testes do saveRecordingToVault (M06.5). Mocka expo-file-system
// para validar que o helper monta o path canonico
// 'assets/<YYYY-MM-DD-HHmm>-<rand>.m4a' e copia o URI temporario
// via copyAsync.
const mockCopyAsync = jest.fn<Promise<void>, [{ from: string; to: string }]>();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: [{ from: string; to: string }]) => mockCopyAsync(...args),
}));

// expo-av nao precisa rodar, mas o modulo recordAudio importa
// Audio.setAudioModeAsync etc. Mock minimo para nao quebrar import.
jest.mock('expo-av', () => ({
  __esModule: true,
  Audio: {
    Recording: jest.fn(),
    setAudioModeAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

import { saveRecordingToVault } from '@/lib/diario/recordAudio';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';
const URI_TEMP = 'file:///cache/audio-fake-123.m4a';

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
});

describe('saveRecordingToVault', () => {
  it('gera path no formato assets/YYYY-MM-DD-HHmm-<rand>.m4a', async () => {
    // 2026-04-29 12:00 UTC = 09:00 em Sao Paulo (UTC-3).
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(rel).toMatch(/^assets\/2026-04-29-0900-[0-9a-f]{4}\.m4a$/);
  });

  it('chama copyAsync com origem=URI temp e destino=vaultRoot+path', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const call = mockCopyAsync.mock.calls[0][0];
    expect(call.from).toBe(URI_TEMP);
    expect(call.to).toBe(`${VAULT_ROOT}/${rel}`);
  });
});
