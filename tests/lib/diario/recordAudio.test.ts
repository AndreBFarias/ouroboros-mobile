// I-AUDIO (M-SAVE-AUDIO-VALIDA, 2026-05-07): testes do
// saveRecordingToVault e atualizarCompanionAudioComTranscricao.
//
// Padrao i-foto/i-video: writer inline com vaultUriJoin canonico (H1)
// + audioPath/audioCompanionPath (H2 layout-por-tipo / ADR-0023).
// Comportamento testado:
//   - path final via vaultUriJoin (sem trailing space, sem %20, sem
//     barra dupla).
//   - vaultRoot vazio -> throw 'Vault não conectado.'.
//   - companion frontmatter aponta para basename do binario.
//   - transcricao opcional: presente -> frontmatter + body; ausente
//     -> companion sem campo transcricao (semantica null canonica).
//   - atualizar companion com transcricao apos STT sucesso.
//
// Comentarios sem acento (convencao shell/CI).
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

import {
  saveRecordingToVault,
  atualizarCompanionAudioComTranscricao,
} from '@/lib/diario/recordAudio';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';
const URI_TEMP = 'file:///cache/audio-fake-123.m4a';

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
});

describe('saveRecordingToVault (I-AUDIO)', () => {
  it('gera path canonico m4a/audio-YYYY-MM-DD-<rand>.m4a (H2 layout-por-tipo)', async () => {
    // 2026-04-29 12:00 UTC = 09:00 em Sao Paulo (UTC-3) -> data 2026-04-29.
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(rel).toMatch(/^m4a\/audio-2026-04-29-[0-9a-f]{4}\.m4a$/);
  });

  it('chama copyAsync com origem=URI temp e destino=vaultUriJoin(root,path)', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const call = mockCopyAsync.mock.calls[0][0];
    expect(call.from).toBe(URI_TEMP);
    expect(call.to).toBe(`${VAULT_ROOT}/${rel}`);
    // Sem trailing space, sem %20 ofensivo (cobertura H1). Barra dupla
    // do scheme content:// nao conta — checa apenas pos-host:
    expect(call.to).not.toMatch(/[^:]\/\//);
    expect(call.to).not.toMatch(/ $/);
    expect(call.to).not.toContain('%20');
  });

  it('escreve companion .md em markdown/<basename>.md com frontmatter midia_audio', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [destinoCompanion, conteudo] =
      mockWriteAsStringAsync.mock.calls[0];
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

  it('quando transcricao informada vai no frontmatter + body do companion', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data, {
      transcricao: 'oi diario hoje foi um dia bom',
    });
    const [, conteudo] = mockWriteAsStringAsync.mock.calls[0];
    expect(conteudo).toContain('transcricao: "oi diario hoje foi um dia bom"');
    // Body apos o segundo --- replica o texto integral (espelha midia_frase).
    const partes = conteudo.split('---\n');
    expect(partes.length).toBeGreaterThanOrEqual(3);
    expect(partes[2]).toContain('oi diario hoje foi um dia bom');
  });

  it('quando transcricao ausente companion fica sem campo (semantica null canonica)', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    const [, conteudo] = mockWriteAsStringAsync.mock.calls[0];
    expect(conteudo).not.toContain('transcricao:');
    // Body vazio apos os --- (so frontmatter).
    const partes = conteudo.split('---\n');
    expect(partes[2].trim()).toBe('');
  });

  it('persiste binario mesmo quando transcricao ausente (best-effort STT)', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rel = await saveRecordingToVault(URI_TEMP, VAULT_ROOT, data);
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(rel).toMatch(/^m4a\/audio-/);
  });

  it('vaultRoot vazio throw com mensagem PT-BR explicita', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    await expect(saveRecordingToVault(URI_TEMP, '', data)).rejects.toThrow(
      'Vault não conectado.'
    );
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });

  it('vaultRoot com trailing space e normalizado via vaultUriJoin (H1)', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const rootSujo = `${VAULT_ROOT} `;
    await saveRecordingToVault(URI_TEMP, rootSujo, data);
    const call = mockCopyAsync.mock.calls[0][0];
    expect(call.to).toBe(`${VAULT_ROOT}/m4a/${call.to.split('/').pop()}`);
    expect(call.to).not.toMatch(/ \/m4a/);
  });
});

describe('atualizarCompanionAudioComTranscricao (I-AUDIO)', () => {
  it('regrava companion .md com transcricao no frontmatter + body', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    const audioRel = 'm4a/audio-2026-04-29-abcd.m4a';
    await atualizarCompanionAudioComTranscricao(
      VAULT_ROOT,
      audioRel,
      data,
      'oi tudo bem por aqui'
    );
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [destino, conteudo] = mockWriteAsStringAsync.mock.calls[0];
    expect(destino).toBe(`${VAULT_ROOT}/markdown/audio-2026-04-29-abcd.md`);
    expect(conteudo).toContain('tipo: midia_audio');
    expect(conteudo).toContain('arquivo: audio-2026-04-29-abcd.m4a');
    expect(conteudo).toContain('transcricao: "oi tudo bem por aqui"');
    const partes = conteudo.split('---\n');
    expect(partes[2]).toContain('oi tudo bem por aqui');
  });

  it('vaultRoot vazio throw', async () => {
    const data = new Date('2026-04-29T12:00:00.000Z');
    await expect(
      atualizarCompanionAudioComTranscricao(
        '',
        'm4a/audio-2026-04-29-abcd.m4a',
        data,
        'texto qualquer'
      )
    ).rejects.toThrow('Vault não conectado.');
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });
});
