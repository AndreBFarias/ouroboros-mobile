// Testes da funcao saveDiario. Mocka writeVaultFile e readVaultFile
// do barrel '@/lib/vault' para isolar a logica pura sem tocar SAF.
//
// T2-LOCK-VAULT (2026-05-15): saveDiario agora sempre aplica suffix
// '-<deviceId>'. Race condition de read-then-write foi eliminada
// estruturalmente.
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: DiarioEmocionalMeta; body: string } | null>,
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

import { saveDiario } from '@/lib/diario/saveDiario';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const baseTrigger: DiarioEmocionalMeta = {
  tipo: 'diario_emocional',
  data: '2026-04-29T15:30:00-03:00',
  autor: 'pessoa_a',
  modo: 'trigger',
  emocoes: ['raiva', 'frustracao'],
  intensidade: 4,
  com: ['pessoa_b'],
  contexto_social: [],
  texto: 'discussao sobre planejamento.',
  estrategia: 'respirei e sai do comodo.',
  funcionou: true,
  audio: null,
  midia: [],
  para: { tipo: 'mim' },
};

const baseSucesso: DiarioEmocionalMeta = {
  tipo: 'diario_emocional',
  data: '2026-04-29T19:45:00-03:00',
  autor: 'pessoa_a',
  modo: 'vitoria',
  emocoes: ['gratidao', 'alegria'],
  intensidade: 4,
  com: [],
  contexto_social: ['sozinho'],
  texto: 'consegui terminar o que comecei hoje.',
  audio: null,
  // M07.x: vitoria exige midia, mas o teste deste modulo so checa
  // o saveDiario (writeVaultFile + path canonico). Como o modulo
  // recebe meta ja validado e nao reaplica refine, manter midia
  // populada com um item reduz risco de mock futuro pegar refine.
  midia: [{ tipo: 'foto', path: 'assets/2026-04-29-1945-stub.jpg' }],
  para: { tipo: 'mim' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  // Fixa relogio para tornar o path canonico determinista.
  // 2026-04-29 12:00 UTC = 09:00 em Sao Paulo (UTC-3).
  jest.useFakeTimers().setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('saveDiario T2-LOCK-VAULT', () => {
  it('grava sempre com suffix de deviceId no path canonico', async () => {
    const out = await saveDiario(baseTrigger, 'corpo livre.', VAULT_ROOT);
    expect(out.uri).toMatch(
      /markdown\/diario-2026-04-29-0900-raiva-ouro-[a-z0-9]{6}\.md$/
    );
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toMatch(
      /markdown\/diario-2026-04-29-0900-raiva-ouro-[a-z0-9]{6}\.md$/
    );
    expect(meta).toMatchObject({
      tipo: 'diario_emocional',
      modo: 'trigger',
      autor: 'pessoa_a',
    });
    expect(body).toBe('corpo livre.');
  });

  it('usa slug "registro" quando emocoes esta vazio (com suffix)', async () => {
    const sem: DiarioEmocionalMeta = { ...baseSucesso, emocoes: [] };
    const out = await saveDiario(sem, 'sem emocoes.', VAULT_ROOT);
    expect(out.uri).toMatch(
      /markdown\/diario-2026-04-29-0900-registro-ouro-[a-z0-9]{6}\.md$/
    );
  });

  it('grava modo vitoria sem funcionou (com suffix)', async () => {
    const out = await saveDiario(baseSucesso, 'feliz.', VAULT_ROOT);
    expect(out.uri).toMatch(/-gratidao-ouro-[a-z0-9]{6}\.md$/);
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect((meta as DiarioEmocionalMeta).funcionou).toBeUndefined();
  });

  it('normaliza root com barra final na concatenacao', async () => {
    await saveDiario(baseTrigger, '', `${VAULT_ROOT}/`);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).not.toContain('//markdown/');
    expect(uri).toMatch(/\/markdown\/diario-/);
  });

  it('read-previo do canonico nao influencia path final (T2)', async () => {
    // T2: arquivo existente nao muda a decisao do path. Save sempre
    // escreve no rel com suffix do device atual.
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      if (/-raiva\.md$/.test(uri)) {
        return Promise.resolve({ meta: baseTrigger, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveDiario(baseTrigger, 'corpo.', VAULT_ROOT);
    // T2: suffix sempre presente. Sem fallback timestamp porque sem
    // race condition existir.
    expect(out.uri).toMatch(/-raiva-ouro-[a-z0-9]{6}\.md$/);
  });
});

describe('saveDiario validacao', () => {
  it('rejeita payload com funcionou em modo vitoria', async () => {
    const invalido = {
      ...baseSucesso,
      funcionou: true,
    } as unknown as DiarioEmocionalMeta;
    await expect(saveDiario(invalido, '', VAULT_ROOT)).rejects.toThrow(
      /diario emocional invalido/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('rejeita intensidade fora do intervalo 1-5', async () => {
    const invalido = {
      ...baseTrigger,
      intensidade: 7,
    } as unknown as DiarioEmocionalMeta;
    await expect(saveDiario(invalido, '', VAULT_ROOT)).rejects.toThrow(
      /diario emocional invalido/
    );
  });
});

// I-DIARIO (M-SAVE-DIARIO-VALIDA, 2026-05-07): cobertura explicita
// dos 2 modos canonicos do schema (trigger, vitoria), edge case
// vaultRoot vazio, path final via vaultUriJoin (sem trailing space,
// sem %20 ofensivo, sem barras duplas) e save com audio companion
// presente (campo audio: string apontando para m4a/...).
describe('I-DIARIO modos canonicos', () => {
  it('modo trigger gera path com slug da emocao primaria (com suffix)', async () => {
    const out = await saveDiario(baseTrigger, 'corpo trigger.', VAULT_ROOT);
    expect(out.uri).toMatch(
      /markdown\/diario-2026-04-29-0900-raiva-ouro-[a-z0-9]{6}\.md$/
    );
    const [uri, meta] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toMatch(
      /markdown\/diario-2026-04-29-0900-raiva-ouro-[a-z0-9]{6}\.md$/
    );
    expect(meta).toMatchObject({ modo: 'trigger', funcionou: true });
  });

  it('modo vitoria gera path com slug da emocao primaria (com suffix)', async () => {
    const out = await saveDiario(baseSucesso, 'corpo vitoria.', VAULT_ROOT);
    expect(out.uri).toMatch(
      /markdown\/diario-2026-04-29-0900-gratidao-ouro-[a-z0-9]{6}\.md$/
    );
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect(meta).toMatchObject({ modo: 'vitoria' });
    // funcionou nao se aplica em vitoria; nao deve aparecer.
    expect((meta as DiarioEmocionalMeta).funcionou).toBeUndefined();
  });
});

describe('I-DIARIO audio companion', () => {
  it('persiste o campo audio quando microfone gravou (path m4a)', async () => {
    const comAudio: DiarioEmocionalMeta = {
      ...baseTrigger,
      audio: 'm4a/audio-2026-04-29-1530-abc123.m4a',
    };
    await saveDiario(comAudio, 'corpo com audio.', VAULT_ROOT);
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect((meta as DiarioEmocionalMeta).audio).toBe(
      'm4a/audio-2026-04-29-1530-abc123.m4a'
    );
  });

  it('mantem audio=null quando microfone nao foi usado', async () => {
    await saveDiario(baseTrigger, 'corpo sem audio.', VAULT_ROOT);
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect((meta as DiarioEmocionalMeta).audio).toBeNull();
  });
});

describe('I-DIARIO vaultRoot e path canonico', () => {
  it('vaultRoot vazio propaga erro claro do vaultUriJoin', async () => {
    await expect(saveDiario(baseTrigger, 'x', '')).rejects.toThrow(
      /root vazio/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('vaultRoot SAF com trailing space e %20 ofensivo limpa antes de concatenar', async () => {
    // Caso real: tree URI SAF do MIUI/HyperOS as vezes vem com
    // trailing %20 (espaco da pasta original). vaultUriJoin trata.
    const ROOT_SUJO =
      'content://com.android.externalstorage/tree/primary:Test%20';
    const out = await saveDiario(baseTrigger, 'corpo.', ROOT_SUJO);
    expect(out.uri).toMatch(
      /^content:\/\/com\.android\.externalstorage\/tree\/primary:Test\/markdown\/diario-2026-04-29-0900-raiva-ouro-[a-z0-9]{6}\.md$/
    );
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).not.toMatch(/%20\/markdown/);
    expect(uri).not.toContain('//markdown');
  });
});
