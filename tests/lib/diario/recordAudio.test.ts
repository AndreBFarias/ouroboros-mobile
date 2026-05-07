// Testes do saveRecordingToVault (M06.5).
//
// M-VAULT-MD-FIX-diario-audio (2026-05-04): destino canonico migrou
// de assets/<HHmm>-<rand>.m4a para media/audios/<YYYY-MM-DD>-<rand>.m4a
// + companion .md 1:1. Os testes refletem o novo path canonico e
// validam que o companion .md e' escrito ao lado do binario com
// frontmatter midia_audio bem-formado.
const mockCopyAsync = jest.fn<Promise<void>, [{ from: string; to: string }]>();
const mockWriteAsStringAsync = jest.fn<Promise<void>, [string, string]>();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: [{ from: string; to: string }]) => mockCopyAsync(...args),
  writeAsStringAsync: (...args: [string, string]) =>
    mockWriteAsStringAsync(...args),
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

// Mock minimo do store usePessoa para o default de autor (a sprint
// permite caller passar autor explicito; sem isso lemos do store).
jest.mock('@/lib/stores/pessoa', () => ({
  __esModule: true,
  usePessoa: {
    getState: () => ({ pessoaAtiva: 'pessoa_a' as const }),
  },
}));

import { saveRecordingToVault } from '@/lib/diario/recordAudio';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';
const URI_TEMP = 'file:///cache/audio-fake-123.m4a';

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
});

describe('saveRecordingToVault', () => {
  it('gera path no formato m4a/audio-YYYY-MM-DD-<rand>.m4a (H2 layout-por-tipo)', async () => {
    // 2026-04-29 12:00 UTC = 09:00 em Sao Paulo (UTC-3) -> data 2026-04-29.
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(rel).toMatch(/^m4a\/audio-2026-04-29-[0-9a-f]{4}\.m4a$/);
  });

  it('chama copyAsync com origem=URI temp e destino=vaultRoot+path', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const call = mockCopyAsync.mock.calls[0][0];
    expect(call.from).toBe(URI_TEMP);
    expect(call.to).toBe(`${VAULT_ROOT}/${rel}`);
  });

  it('escreve companion .md ao lado do binario com frontmatter midia_audio', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [destinoCompanion, conteudo] =
      mockWriteAsStringAsync.mock.calls[0];
    // H2 layout-por-tipo: companion em markdown/<basename>.md (mesmo
    // basename do binario, mas em pasta diferente).
    const basenameSemExt = (rel.split('/').pop() ?? '').replace(/\.m4a$/, '');
    expect(destinoCompanion).toBe(
      `${VAULT_ROOT}/markdown/${basenameSemExt}.md`
    );
    // Frontmatter minimo esperado: tipo + arquivo + data + autor + para.
    expect(conteudo).toContain('tipo: midia_audio');
    expect(conteudo).toMatch(/arquivo: audio-2026-04-29-[0-9a-f]{4}\.m4a/);
    expect(conteudo).toContain('data: 2026-04-29T12:00:00.000Z');
    expect(conteudo).toContain('autor: pessoa_a');
    expect(conteudo).toContain('para: mim');
  });

  it('respeita opcoes.autor, opcoes.para e opcoes.legenda quando informados', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data, {
      autor: 'pessoa_b',
      para: { tipo: 'casal' },
      legenda: 'oi diario hoje foi bom',
    });
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [, conteudo] = mockWriteAsStringAsync.mock.calls[0];
    expect(conteudo).toContain('autor: pessoa_b');
    expect(conteudo).toContain('para: casal');
    expect(conteudo).toContain('legenda: "oi diario hoje foi bom"');
  });
});
