// R-CRIT-3 (2026-05-16): testes dos novos comportamentos em
// midiaCompanion.ts introduzidos para fechar o bug "midia ausente em
// Recap e galeria":
//
//   1. listarMidiasStandalone retorna companions com prefixo canonico
//      (foto-/audio-/video-/frase-/scanner-) filtrados de sync-conflict
//      e malformados.
//   2. escreverMidiaComCompanion delete o binario orfao quando write
//      do companion falha (atomicidade best-effort).
//
// Mocks: SAF readDirectoryAsync devolve URIs de companions; SAF
// readAsStringAsync devolve YAML para cada companion.
//
// Comentarios sem acento (convencao shell/CI).
import type { MidiaCompanion } from '@/lib/schemas/midia-companion';

const mockCopyAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  StorageAccessFramework: {
    readDirectoryAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
  },
}));

// Mock @/lib/vault/reader para listarMidiasStandalone: o helper usa
// listVaultFolder + readVaultFile, ambos da mesma origem que galeria.ts
// (Q9). Mocka direto evita ter que simular Platform.OS / __DEV__.
jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import {
  escreverMidiaComCompanion,
  listarMidiasStandalone,
} from '@/lib/vault/midiaCompanion';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockGetInfoAsync.mockResolvedValue({ exists: false });
  mockDeleteAsync.mockResolvedValue(undefined);
});

describe('listarMidiasStandalone (R-CRIT-3)', () => {
  beforeEach(() => {
    mockListVaultFolder.mockReset();
    mockReadVaultFile.mockReset();
  });

  it('retorna itens midia_foto / midia_audio / midia_video com prefixos canonicos', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/foto-2026-05-15-aaaa.md`,
      `${VAULT_ROOT}/markdown/audio-2026-05-14-bbbb.md`,
      `${VAULT_ROOT}/markdown/video-2026-05-13-cccc.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: {
          tipo: 'midia_foto',
          arquivo: 'foto-2026-05-15-aaaa.jpg',
          data: '2026-05-15T10:00:00-03:00',
          autor: 'pessoa_a',
          para: { tipo: 'mim' },
        },
        body: '',
      })
      .mockResolvedValueOnce({
        meta: {
          tipo: 'midia_audio',
          arquivo: 'audio-2026-05-14-bbbb.m4a',
          data: '2026-05-14T10:00:00-03:00',
          autor: 'pessoa_a',
          para: { tipo: 'mim' },
        },
        body: '',
      })
      .mockResolvedValueOnce({
        meta: {
          tipo: 'midia_video',
          arquivo: 'video-2026-05-13-cccc.mp4',
          data: '2026-05-13T10:00:00-03:00',
          autor: 'pessoa_a',
          para: { tipo: 'mim' },
        },
        body: '',
      });

    const out = await listarMidiasStandalone(VAULT_ROOT);

    expect(out).toHaveLength(3);
    const porTipo: Record<string, number> = {};
    for (const i of out) {
      porTipo[i.tipo] = (porTipo[i.tipo] ?? 0) + 1;
    }
    expect(porTipo.midia_foto).toBe(1);
    expect(porTipo.midia_audio).toBe(1);
    expect(porTipo.midia_video).toBe(1);

    // Ordenacao desc por data.
    expect(out[0]?.data).toBe('2026-05-15');
    expect(out[2]?.data).toBe('2026-05-13');

    // binarioPath inferido da extensao do meta.arquivo.
    const foto = out.find((i) => i.tipo === 'midia_foto');
    expect(foto?.binarioPath).toBe('jpg/foto-2026-05-15-aaaa.jpg');
    const audio = out.find((i) => i.tipo === 'midia_audio');
    expect(audio?.binarioPath).toBe('m4a/audio-2026-05-14-bbbb.m4a');
    const video = out.find((i) => i.tipo === 'midia_video');
    expect(video?.binarioPath).toBe('mp4/video-2026-05-13-cccc.mp4');
  });

  it('ignora companions de outros tipos (humor-, evento-, marco-)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/humor-2026-05-15.md`,
      `${VAULT_ROOT}/markdown/evento-2026-05-15-festa.md`,
      `${VAULT_ROOT}/markdown/foto-2026-05-15-zzzz.md`,
    ]);
    // humor- e evento- nao casam com nenhum prefixo midia_*; ja sao
    // descartados antes do readVaultFile (loop continue). Apenas o
    // foto- chega ao read.
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'midia_foto',
        arquivo: 'foto-2026-05-15-zzzz.jpg',
        data: '2026-05-15T10:00:00-03:00',
        autor: 'pessoa_a',
        para: { tipo: 'mim' },
      },
      body: '',
    });

    const out = await listarMidiasStandalone(VAULT_ROOT);

    expect(out).toHaveLength(1);
    expect(out[0]?.tipo).toBe('midia_foto');
    // Garante que readVaultFile so foi chamado uma vez (humor- e
    // evento- nao caem no schema-pesado).
    expect(mockReadVaultFile).toHaveBeenCalledTimes(1);
  });

  it('filtra companions com sync-conflict no nome', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/foto-2026-05-15-aaaa.md`,
      `${VAULT_ROOT}/markdown/foto-2026-05-15-aaaa.sync-conflict-20260515-100000-OURO1.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'midia_foto',
        arquivo: 'foto-2026-05-15-aaaa.jpg',
        data: '2026-05-15T10:00:00-03:00',
        autor: 'pessoa_a',
        para: { tipo: 'mim' },
      },
      body: '',
    });

    const out = await listarMidiasStandalone(VAULT_ROOT);

    expect(out).toHaveLength(1);
    expect(out[0]?.companionUri).not.toContain('sync-conflict');
  });

  it('ignora companions malformados (read falha / schema invalido) sem crash', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/foto-2026-05-15-good.md`,
      `${VAULT_ROOT}/markdown/foto-2026-05-15-bad.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({
        meta: {
          tipo: 'midia_foto',
          arquivo: 'foto-2026-05-15-good.jpg',
          data: '2026-05-15T10:00:00-03:00',
          autor: 'pessoa_a',
          para: { tipo: 'mim' },
        },
        body: '',
      })
      // 2a chamada: lanca (representa parse/schema fail). O helper
      // captura o throw e continua para o proximo item.
      .mockRejectedValueOnce(new Error('schema fail'));

    const out = await listarMidiasStandalone(VAULT_ROOT);

    expect(out).toHaveLength(1);
    expect(out[0]?.binarioPath).toBe('jpg/foto-2026-05-15-good.jpg');
  });
});

describe('escreverMidiaComCompanion atomicidade (R-CRIT-3)', () => {
  it('quando write do companion falha, deleta binario orfao (best-effort)', async () => {
    mockCopyAsync.mockResolvedValue(undefined);
    mockWriteAsStringAsync.mockRejectedValueOnce(new Error('EIO write fail'));

    const meta: Omit<MidiaCompanion, 'arquivo'> = {
      tipo: 'midia_foto',
      data: '2026-05-15T10:00:00-03:00',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
    };

    await expect(
      escreverMidiaComCompanion(
        VAULT_ROOT,
        'file:///cache/foto-temp.jpg',
        meta
      )
    ).rejects.toThrow('EIO write fail');

    // copy chamado (binario foi gravado)
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    // delete chamado para o destino do binario (idempotente)
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
    const [deletedUri, opts] = mockDeleteAsync.mock.calls[0] as [
      string,
      { idempotent: boolean },
    ];
    expect(deletedUri).toContain('/jpg/');
    expect(opts.idempotent).toBe(true);
  });

  it('quando binario ja existia (idempotencia), NAO deleta em caso de erro de companion', async () => {
    // Primeira chamada de getInfoAsync devolve exists=true (binario
    // ja existia antes); copy nao chamado; mas write companion falha.
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockWriteAsStringAsync.mockRejectedValueOnce(new Error('EIO'));

    // arquivo opcional para forcar idempotencia com basename fixo
    // (mock getInfoAsync devolve exists=true no destino calculado).
    const meta: Omit<MidiaCompanion, 'arquivo'> & { arquivo?: string } = {
      tipo: 'midia_foto',
      data: '2026-05-15T10:00:00-03:00',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      arquivo: 'foto-2026-05-15-zzz.jpg',
    };

    await expect(
      escreverMidiaComCompanion(VAULT_ROOT, 'file:///cache/x.jpg', meta)
    ).rejects.toThrow('EIO');

    // copy nao chamado (idempotencia)
    expect(mockCopyAsync).not.toHaveBeenCalled();
    // delete tambem NAO chamado: o binario nao era novo desta operacao.
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('valida meta ANTES de copy (evita binario orfao quando schema falha)', async () => {
    // Meta com data invalida: schema.parse vai falhar.
    const metaInvalido = {
      tipo: 'midia_foto' as const,
      data: 'lixo-nao-iso',
      autor: 'pessoa_a' as const,
      para: { tipo: 'mim' as const },
    };

    await expect(
      escreverMidiaComCompanion(VAULT_ROOT, 'file:///cache/x.jpg', metaInvalido)
    ).rejects.toThrow();

    // copy NAO chamado -- a validacao subiu para antes da copia.
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });
});
