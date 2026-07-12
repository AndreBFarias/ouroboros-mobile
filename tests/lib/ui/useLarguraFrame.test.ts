// Testes do hook useLarguraFrame (M11.3). Cobre:
//  - Em web (Platform.OS = 'web') retorna FRAME_W = 412 mesmo que o
//    viewport seja 1280px (cenario Gauntlet desktop).
//  - Em native (Platform.OS = 'ios' default) retorna a largura real
//    devolvida por useWindowDimensions (cenario celular).
//
// Padrao de mock copiado de tests/lib/vault/permissions-init.test.ts:
// trocamos Platform.OS via Object.defineProperty no teste e
// restauramos no afterEach.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useLarguraFrame, FRAME_W } from '@/lib/ui/useLarguraFrame';

const ORIGINAL_OS = Platform.OS;

function setPlatform(os: 'web' | 'android' | 'ios') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('useLarguraFrame', () => {
  afterEach(() => {
    setPlatform(ORIGINAL_OS as 'web' | 'android' | 'ios');
    jest.restoreAllMocks();
  });

  it('em web retorna FRAME_W (412) ignorando largura do viewport', () => {
    setPlatform('web');
    // Forca useWindowDimensions a devolver 1280 (desktop) para garantir
    // que o hook NAO consome esse valor no branch web.
    jest
      .spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width: 1280, height: 800, scale: 1, fontScale: 1 });

    const { result } = renderHook(() => useLarguraFrame());
    expect(result.current).toBe(FRAME_W);
    expect(result.current).toBe(412);
  });

  it('em native retorna a largura devolvida por useWindowDimensions', () => {
    setPlatform('ios');
    jest
      .spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width: 412, height: 892, scale: 3, fontScale: 1 });

    const { result } = renderHook(() => useLarguraFrame());
    expect(result.current).toBe(412);
  });

  it('em native respeita largura dinamica diferente de 412', () => {
    setPlatform('android');
    jest
      .spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, scale: 2, fontScale: 1 });

    const { result } = renderHook(() => useLarguraFrame());
    expect(result.current).toBe(360);
  });
});
