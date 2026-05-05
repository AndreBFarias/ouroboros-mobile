// M39: testes dos helpers canonicos de midia + companion 1:1.
// Cobre escreverMidiaComCompanion (write par, idempotencia, basename
// custom), lerCompanion (parse + null safety) e
// migrarAssetsLegacyParaMedia (idempotencia, filtragem por extensao).
//
// Mocks: expo-file-system/legacy substituido por jest.fn() para
// observar copy/write/read/getInfo/delete sem tocar disco. SAF tambem
// mockado: readDirectoryAsync para enumerar assets/, readAsStringAsync
// para ler companion ja escrito.
//
// Comentarios sem acento (convencao shell/CI).
import type { MidiaCompanion } from '@/lib/schemas/midia-companion';

const mockCopyAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockSAFReadDirectoryAsync = jest.fn();
const mockSAFReadAsStringAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  StorageAccessFramework: {
    readDirectoryAsync: (...args: unknown[]) =>
      mockSAFReadDirectoryAsync(...args),
    readAsStringAsync: (...args: unknown[]) =>
      mockSAFReadAsStringAsync(...args),
  },
}));

import {
  escreverMidiaComCompanion,
  lerCompanion,
  migrarAssetsLegacyParaMedia,
} from '@/lib/vault/midiaCompanion';
import { TipoMidiaSchema } from '@/lib/schemas/midia-companion';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockGetInfoAsync.mockResolvedValue({ exists: false });
  mockDeleteAsync.mockResolvedValue(undefined);
});

describe('escreverMidiaComCompanion (M39)', () => {
  it('grava par binario+companion sob media/<categoria>/ com basename gerado', async () => {
    const meta: Omit<MidiaCompanion, 'arquivo'> = {
      tipo: 'midia_foto',
      data: '2026-05-04T12:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
    };

    const r = await escreverMidiaComCompanion(
      VAULT_ROOT,
      'file:///cache/foto-temp.jpg',
      meta
    );

    expect(r.binarioPath.startsWith('media/fotos/')).toBe(true);
    expect(r.binarioPath.endsWith('.jpg')).toBe(true);
    expect(r.companionPath.startsWith('media/fotos/')).toBe(true);
    expect(r.companionPath.endsWith('.md')).toBe(true);

    // Mesmo basename para binario e companion.
    expect(r.binarioPath.replace(/\.jpg$/, '.md')).toBe(r.companionPath);

    // copy chamado uma vez (binario novo).
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const copyArg = mockCopyAsync.mock.calls[0][0] as {
      from: string;
      to: string;
    };
    expect(copyArg.from).toBe('file:///cache/foto-temp.jpg');
    expect(copyArg.to).toContain('media/fotos/');

    // writeAsString chamado uma vez (companion).
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const wArg = mockWriteAsStringAsync.mock.calls[0] as [string, string];
    expect(wArg[0]).toContain('media/fotos/');
    expect(wArg[0].endsWith('.md')).toBe(true);
    expect(wArg[1]).toContain('tipo: midia_foto');
    expect(wArg[1]).toContain('autor: pessoa_a');
    expect(wArg[1]).toContain('para: mim');
  });

  it('respeita basename custom passado em meta.arquivo', async () => {
    const r = await escreverMidiaComCompanion(
      VAULT_ROOT,
      'file:///cache/x.jpg',
      {
        tipo: 'midia_foto',
        data: '2026-05-04T12:00:00.000Z',
        autor: 'pessoa_a',
        para: { tipo: 'mim' },
        arquivo: 'medidas-2026-05-04-frente.jpg',
        legenda: 'Evolução corporal — frente',
        medida_ref: '2026-05-04',
      }
    );

    expect(r.binarioPath).toBe('media/fotos/medidas-2026-05-04-frente.jpg');
    expect(r.companionPath).toBe('media/fotos/medidas-2026-05-04-frente.md');

    const wArg = mockWriteAsStringAsync.mock.calls[0] as [string, string];
    expect(wArg[1]).toContain('arquivo: medidas-2026-05-04-frente.jpg');
    expect(wArg[1]).toContain('medida_ref: 2026-05-04');
  });

  it('roteia midia_audio para media/audios/, midia_video para media/videos/', async () => {
    const rAudio = await escreverMidiaComCompanion(
      VAULT_ROOT,
      'file:///cache/a.m4a',
      {
        tipo: 'midia_audio',
        data: '2026-05-04T12:00:00.000Z',
        autor: 'pessoa_b',
        para: { tipo: 'mim' },
      }
    );
    expect(rAudio.binarioPath.startsWith('media/audios/')).toBe(true);
    expect(rAudio.binarioPath.endsWith('.m4a')).toBe(true);

    const rVideo = await escreverMidiaComCompanion(
      VAULT_ROOT,
      'file:///cache/v.mp4',
      {
        tipo: 'midia_video',
        data: '2026-05-04T12:00:00.000Z',
        autor: 'pessoa_a',
        para: { tipo: 'casal' },
      }
    );
    expect(rVideo.binarioPath.startsWith('media/videos/')).toBe(true);
    expect(rVideo.binarioPath.endsWith('.mp4')).toBe(true);
  });

  it('idempotente: nao sobrescreve binario quando arquivo ja existe', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });

    await escreverMidiaComCompanion(
      VAULT_ROOT,
      'file:///cache/foto.jpg',
      {
        tipo: 'midia_foto',
        data: '2026-05-04T12:00:00.000Z',
        autor: 'pessoa_a',
        para: { tipo: 'mim' },
        arquivo: 'fixo.jpg',
      }
    );

    expect(mockCopyAsync).not.toHaveBeenCalled();
    // Companion ainda e' (re)escrito — caller pode atualizar legenda.
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
  });

  it('valida meta via zod e rejeita data invalida', async () => {
    await expect(
      escreverMidiaComCompanion(VAULT_ROOT, 'file:///cache/x.jpg', {
        tipo: 'midia_foto',
        data: 'data-quebrada',
        autor: 'pessoa_a',
        para: { tipo: 'mim' },
      })
    ).rejects.toThrow();
  });
});

describe('lerCompanion (M39)', () => {
  it('parseia companion .md valido ao lado do binario', async () => {
    const md = [
      '---',
      'tipo: midia_foto',
      'arquivo: 2026-05-04-abcd.jpg',
      'data: 2026-05-04T12:00:00.000Z',
      'autor: pessoa_a',
      'para: mim',
      'legenda: foto teste',
      '---',
      '',
    ].join('\n');
    mockSAFReadAsStringAsync.mockResolvedValueOnce(md);

    const meta = await lerCompanion(
      VAULT_ROOT,
      'media/fotos/2026-05-04-abcd.jpg'
    );

    expect(meta).not.toBeNull();
    expect(meta?.tipo).toBe('midia_foto');
    expect(meta?.arquivo).toBe('2026-05-04-abcd.jpg');
    expect(meta?.autor).toBe('pessoa_a');
    expect(meta?.para).toEqual({ tipo: 'mim' });
    expect(meta?.legenda).toBe('foto teste');
  });

  it('retorna null quando companion nao existe', async () => {
    mockSAFReadAsStringAsync.mockRejectedValueOnce(new Error('ENOENT'));
    const meta = await lerCompanion(
      VAULT_ROOT,
      'media/fotos/inexistente.jpg'
    );
    expect(meta).toBeNull();
  });

  it('retorna null quando companion tem yaml invalido', async () => {
    mockSAFReadAsStringAsync.mockResolvedValueOnce('sem frontmatter');
    const meta = await lerCompanion(
      VAULT_ROOT,
      'media/fotos/lixo.jpg'
    );
    expect(meta).toBeNull();
  });
});

describe('migrarAssetsLegacyParaMedia (M39)', () => {
  it('move .jpg para media/fotos/, .m4a para media/audios/, .pdf para media/scanner/', async () => {
    mockSAFReadDirectoryAsync.mockResolvedValueOnce([
      'content://test/Vault/assets/2026-04-30-foto.jpg',
      'content://test/Vault/assets/2026-04-30-1430-audio.m4a',
      'content://test/Vault/assets/nota.pdf',
    ]);
    mockGetInfoAsync.mockResolvedValue({ exists: false });

    const r = await migrarAssetsLegacyParaMedia(VAULT_ROOT);

    expect(r.migrados).toBe(3);
    expect(r.existentes).toBe(0);
    expect(r.pulados).toBe(0);

    expect(mockCopyAsync).toHaveBeenCalledTimes(3);
    const destinos = mockCopyAsync.mock.calls.map(
      (c) => (c[0] as { to: string }).to
    );
    expect(destinos.some((d) => d.includes('media/fotos/'))).toBe(true);
    expect(destinos.some((d) => d.includes('media/audios/'))).toBe(true);
    expect(destinos.some((d) => d.includes('media/scanner/'))).toBe(true);

    // Apos copia, originais sao deletados.
    expect(mockDeleteAsync).toHaveBeenCalledTimes(3);
  });

  it('idempotente: pula arquivos que ja estao no destino', async () => {
    mockSAFReadDirectoryAsync.mockResolvedValueOnce([
      'content://test/Vault/assets/2026-04-30-foto.jpg',
    ]);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });

    const r = await migrarAssetsLegacyParaMedia(VAULT_ROOT);

    expect(r.migrados).toBe(0);
    expect(r.existentes).toBe(1);
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('pula extensao desconhecida (txt, json) sem mover', async () => {
    mockSAFReadDirectoryAsync.mockResolvedValueOnce([
      'content://test/Vault/assets/notas.txt',
      'content://test/Vault/assets/cache.json',
      'content://test/Vault/assets/exercicios', // subpasta sem ext
    ]);

    const r = await migrarAssetsLegacyParaMedia(VAULT_ROOT);

    expect(r.migrados).toBe(0);
    expect(r.pulados).toBe(3);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('lida com assets/ inexistente devolvendo zeros sem erro', async () => {
    mockSAFReadDirectoryAsync.mockRejectedValueOnce(new Error('ENOENT'));

    const r = await migrarAssetsLegacyParaMedia(VAULT_ROOT);

    expect(r).toEqual({ migrados: 0, existentes: 0, pulados: 0 });
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('continua migrando quando uma copia falha (best-effort)', async () => {
    mockSAFReadDirectoryAsync.mockResolvedValueOnce([
      'content://test/Vault/assets/a.jpg',
      'content://test/Vault/assets/b.jpg',
    ]);
    mockGetInfoAsync.mockResolvedValue({ exists: false });
    mockCopyAsync
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined);

    const r = await migrarAssetsLegacyParaMedia(VAULT_ROOT);

    expect(r.migrados).toBe(1);
    expect(r.pulados).toBe(1);
  });
});

describe('schema MidiaCompanion equivalencia com TipoMidia (M34)', () => {
  it('TipoMidiaSchema cobre os 5 tipos do TipoMidia legado', () => {
    const tipos = TipoMidiaSchema.options;
    expect(tipos).toEqual(
      expect.arrayContaining([
        'midia_foto',
        'midia_audio',
        'midia_video',
        'midia_frase',
        'midia_pdf',
      ])
    );
    expect(tipos.length).toBe(5);
  });
});
