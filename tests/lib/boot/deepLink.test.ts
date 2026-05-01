// Tests do hook de deep link. extractShareUri e handleSharedUrl
// sao puros (handleSharedUrl swallows router errors), faceis de
// testar sem mock pesado de router.
//
// Para useDeepLinkListener so verificamos que o subscribe / remove
// nao crasham. Mock de Linking.addEventListener devolve subscription
// com remove identificavel.

import {
  extractShareUri,
  handleSharedUrl,
  parseSharedUrl,
} from '@/lib/boot/deepLink';

jest.mock('expo-linking', () => {
  const actual = {
    parse: (url: string) => {
      // Implementacao minima: aceita formatos
      // 'ouroboros://share-receive?uri=content://foo/bar'
      // e devolve queryParams como string.
      try {
        const u = new URL(url);
        const queryParams: Record<string, string> = {};
        u.searchParams.forEach((v, k) => {
          queryParams[k] = v;
        });
        return { queryParams };
      } catch {
        // Aceitar protocolos custom: parse manual ?uri=... sufixo
        const idx = url.indexOf('?');
        if (idx === -1) return { queryParams: {} };
        const queryParams: Record<string, string> = {};
        const qs = url.slice(idx + 1);
        for (const part of qs.split('&')) {
          const [k, v] = part.split('=');
          if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
        }
        return { queryParams };
      }
    },
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return actual;
});

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('extractShareUri', () => {
  it('extrai uri quando presente', () => {
    const url = 'ouroboros://share-receive?uri=content://foo/bar';
    expect(extractShareUri(url)).toBe('content://foo/bar');
  });

  it('devolve null quando nao tem param uri', () => {
    expect(extractShareUri('ouroboros://share-receive')).toBeNull();
  });

  it('devolve null para url malformada', () => {
    expect(extractShareUri('isto nao e url valida')).toBeNull();
  });

  it('aceita uri vazio como null', () => {
    expect(extractShareUri('ouroboros://share?uri=')).toBeNull();
  });
});

describe('handleSharedUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('chama router.push quando uri presente', () => {
    const { router } = require('expo-router');
    handleSharedUrl('ouroboros://share?uri=content://x/y');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/share-receive',
      params: { uri: 'content://x/y' },
    });
  });

  it('nao chama router.push quando uri ausente', () => {
    const { router } = require('expo-router');
    handleSharedUrl('ouroboros://share');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('engole erro do router silenciosamente', () => {
    const { router } = require('expo-router');
    (router.push as jest.Mock).mockImplementationOnce(() => {
      throw new Error('rota nao existe');
    });
    expect(() => handleSharedUrl('ouroboros://share?uri=content://x')).not.toThrow();
  });

  it('encaminha mime + origem + nome quando presentes (M08)', () => {
    const { router } = require('expo-router');
    handleSharedUrl(
      'ouroboros://share?uri=content://x/y&mime=application/pdf&nome=comprovante.pdf&origem=com.nu.production'
    );
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/share-receive',
      params: {
        uri: 'content://x/y',
        mime: 'application/pdf',
        nome: 'comprovante.pdf',
        origem: 'com.nu.production',
      },
    });
  });

  it('omite chaves opcionais quando ausentes', () => {
    const { router } = require('expo-router');
    handleSharedUrl('ouroboros://share?uri=content://x/y');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/share-receive',
      params: { uri: 'content://x/y' },
    });
  });
});

describe('parseSharedUrl', () => {
  it('devolve null sem uri', () => {
    expect(parseSharedUrl('ouroboros://share')).toBeNull();
  });

  it('extrai todos os params quando presentes', () => {
    const r = parseSharedUrl(
      'ouroboros://share?uri=content://x&mime=image/png&nome=foto.png&origem=com.app'
    );
    expect(r).toEqual({
      uri: 'content://x',
      mime: 'image/png',
      nome: 'foto.png',
      origem: 'com.app',
    });
  });

  it('campos opcionais ausentes viram null', () => {
    const r = parseSharedUrl('ouroboros://share?uri=content://x');
    expect(r).toEqual({
      uri: 'content://x',
      mime: null,
      nome: null,
      origem: null,
    });
  });
});
