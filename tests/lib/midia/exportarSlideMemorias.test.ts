// R-RECAP-6 (2026-05-16): testes do export de slide Memorias.
// Cobre captura mockada, dimensoes alvo (1080x1920), cleanup do PNG
// temporario, fallback em web, erro de captureRef (toast no caller).
//
// Mocks locais sobrescrevem os defaults do jest.setup.cjs quando o
// teste precisa simular erro especifico (captureRef rejecting,
// Sharing indisponivel, copyAsync falhando).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';

jest.mock(
  'react-native-view-shot',
  () => ({
    __esModule: true,
    captureRef: jest.fn(),
  }),
  { virtual: true }
);

jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'file:///mock/cache/',
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  exportarSlideMemorias,
  compartilharSlidePng,
  removerSlidePngTemp,
  RECAP_SHARE_LARGURA,
  RECAP_SHARE_ALTURA,
} from '@/lib/midia/exportarSlideMemorias';

const captureRefSpy = captureRef as unknown as jest.Mock;
const isAvailableSpy = Sharing.isAvailableAsync as unknown as jest.Mock;
const shareAsyncSpy = Sharing.shareAsync as unknown as jest.Mock;
const copyAsyncSpy = FileSystem.copyAsync as unknown as jest.Mock;
const deleteAsyncSpy = FileSystem.deleteAsync as unknown as jest.Mock;

describe('exportarSlideMemorias (R-RECAP-6)', () => {
  beforeEach(() => {
    captureRefSpy.mockReset();
    isAvailableSpy.mockReset();
    shareAsyncSpy.mockReset();
    copyAsyncSpy.mockReset();
    deleteAsyncSpy.mockReset();
    copyAsyncSpy.mockResolvedValue(undefined);
    deleteAsyncSpy.mockResolvedValue(undefined);
    // Default ambiente: mobile.
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
      writable: true,
    });
  });

  it('dimensoes alvo sao 1080x1920 (formato Instagram Stories)', () => {
    expect(RECAP_SHARE_LARGURA).toBe(1080);
    expect(RECAP_SHARE_ALTURA).toBe(1920);
  });

  it('captura mockada retorna URI valida em cacheDirectory', async () => {
    captureRefSpy.mockResolvedValue('file:///tmp/native-capture.png');
    const ref = { current: {} };
    const res = await exportarSlideMemorias({
      slideRef: ref,
      slideId: 'numeros',
      timestamp: 1747400000000,
    });
    expect(res.motivo).toBeNull();
    expect(res.uri).toBe(
      'file:///mock/cache/recap-share-numeros-1747400000000.png'
    );
  });

  it('passa width/height 1080x1920 ao captureRef', async () => {
    captureRefSpy.mockResolvedValue('file:///tmp/native-capture.png');
    const ref = { current: {} };
    await exportarSlideMemorias({
      slideRef: ref,
      slideId: 'abertura',
      timestamp: 1,
    });
    expect(captureRefSpy).toHaveBeenCalledTimes(1);
    const opts = captureRefSpy.mock.calls[0][1];
    expect(opts.width).toBe(1080);
    expect(opts.height).toBe(1920);
    expect(opts.format).toBe('png');
    expect(opts.result).toBe('tmpfile');
  });

  it('limpa tmpfile origem apos copy (best-effort)', async () => {
    captureRefSpy.mockResolvedValue('file:///tmp/native-capture.png');
    const ref = { current: {} };
    await exportarSlideMemorias({
      slideRef: ref,
      slideId: 'midias',
      timestamp: 42,
    });
    expect(copyAsyncSpy).toHaveBeenCalledWith({
      from: 'file:///tmp/native-capture.png',
      to: 'file:///mock/cache/recap-share-midias-42.png',
    });
    expect(deleteAsyncSpy).toHaveBeenCalledWith(
      'file:///tmp/native-capture.png',
      { idempotent: true }
    );
  });

  it('fallback para URI tmpfile se copyAsync falhar', async () => {
    captureRefSpy.mockResolvedValue('file:///tmp/fallback.png');
    copyAsyncSpy.mockRejectedValueOnce(new Error('EACCES'));
    const ref = { current: {} };
    const res = await exportarSlideMemorias({
      slideRef: ref,
      slideId: 'vitorias',
      timestamp: 100,
    });
    expect(res.uri).toBe('file:///tmp/fallback.png');
    expect(res.motivo).toBeNull();
  });

  it('devolve { uri: null, motivo: "erro" } se captureRef rejeitar', async () => {
    captureRefSpy.mockRejectedValueOnce(new Error('view not mounted'));
    const ref = { current: null };
    const res = await exportarSlideMemorias({
      slideRef: ref,
      slideId: 'crises',
    });
    expect(res.uri).toBeNull();
    expect(res.motivo).toBe('erro');
  });

  it('em web devolve { uri: null, motivo: "web" } sem chamar captureRef', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      configurable: true,
      writable: true,
    });
    const ref = { current: {} };
    const res = await exportarSlideMemorias({
      slideRef: ref,
      slideId: 'encerramento',
    });
    expect(res.uri).toBeNull();
    expect(res.motivo).toBe('web');
    expect(captureRefSpy).not.toHaveBeenCalled();
  });
});

describe('compartilharSlidePng (R-RECAP-6)', () => {
  beforeEach(() => {
    isAvailableSpy.mockReset();
    shareAsyncSpy.mockReset();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
      writable: true,
    });
  });

  it('chama Sharing.shareAsync quando disponivel', async () => {
    isAvailableSpy.mockResolvedValue(true);
    shareAsyncSpy.mockResolvedValue(undefined);
    const ok = await compartilharSlidePng(
      'file:///mock/cache/recap-share-numeros-1.png'
    );
    expect(ok).toBe(true);
    expect(shareAsyncSpy).toHaveBeenCalledWith(
      'file:///mock/cache/recap-share-numeros-1.png',
      expect.objectContaining({
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar',
      })
    );
  });

  it('devolve false quando Sharing indisponivel', async () => {
    isAvailableSpy.mockResolvedValue(false);
    const ok = await compartilharSlidePng('file:///mock/cache/x.png');
    expect(ok).toBe(false);
    expect(shareAsyncSpy).not.toHaveBeenCalled();
  });

  it('devolve false se shareAsync rejeitar (usuario cancela)', async () => {
    isAvailableSpy.mockResolvedValue(true);
    shareAsyncSpy.mockRejectedValueOnce(new Error('cancelled'));
    const ok = await compartilharSlidePng('file:///mock/cache/x.png');
    expect(ok).toBe(false);
  });

  it('em web devolve false sem checar Sharing', async () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      configurable: true,
      writable: true,
    });
    const ok = await compartilharSlidePng('file:///mock/cache/x.png');
    expect(ok).toBe(false);
    expect(isAvailableSpy).not.toHaveBeenCalled();
  });
});

describe('removerSlidePngTemp (R-RECAP-6)', () => {
  beforeEach(() => {
    deleteAsyncSpy.mockReset();
    deleteAsyncSpy.mockResolvedValue(undefined);
  });

  it('chama deleteAsync com idempotent=true', async () => {
    await removerSlidePngTemp('file:///mock/cache/recap-share-x-1.png');
    expect(deleteAsyncSpy).toHaveBeenCalledWith(
      'file:///mock/cache/recap-share-x-1.png',
      { idempotent: true }
    );
  });

  it('silencia erro de delete (best-effort)', async () => {
    deleteAsyncSpy.mockRejectedValueOnce(new Error('ENOENT'));
    await expect(
      removerSlidePngTemp('file:///mock/cache/nao-existe.png')
    ).resolves.toBeUndefined();
  });
});
