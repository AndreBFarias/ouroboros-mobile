// R-CRIT-1 (2026-05-15): tests da rota app/oauthredirect.tsx.
//
// Garantias verificadas:
// 1. Mount chama WebBrowser.maybeCompleteAuthSession() de forma
//    idempotente (defensive contra warm-boot onde o _layout top-level
//    nao re-executa).
// 2. Mount dispara router.replace para a ultima rota restauravel
//    quando ha uma em useSessao.
// 3. Sem ultima rota restauravel, fallback para /settings/integracoes.
// 4. NAO renderiza URL bruta nem queryParams na UI (regressao da
//    Unmatched Route que vazava o `code` OAuth).
//
// Mocks:
// - expo-router useRouter() expoe replace spiavel.
// - expo-web-browser maybeCompleteAuthSession spiavel.
// - useSessao retorna ultimaRota mockada.
import { render } from '@testing-library/react-native';

const mockReplace = jest.fn();
let mockUltimaRota: string | null = null;

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@/lib/stores/sessao', () => ({
  __esModule: true,
  useSessao: {
    getState: () => ({ ultimaRota: mockUltimaRota }),
  },
}));

jest.mock('@/components/brand', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const ReactModule = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const RNModule = require('react-native');
  return {
    __esModule: true,
    OuroborosLoader: () =>
      ReactModule.createElement(RNModule.View, { testID: 'ouroboros-loader' }),
  };
});

import OAuthRedirect from '@/../app/oauthredirect';
import * as WebBrowser from 'expo-web-browser';

describe('app/oauthredirect (R-CRIT-1)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    (WebBrowser.maybeCompleteAuthSession as jest.Mock).mockClear();
    mockUltimaRota = null;
  });

  it('chama WebBrowser.maybeCompleteAuthSession no mount (idempotente)', () => {
    render(<OAuthRedirect />);
    expect(WebBrowser.maybeCompleteAuthSession).toHaveBeenCalledTimes(1);
  });

  it('redireciona para ultima rota restauravel quando existe', () => {
    mockUltimaRota = '/settings/integracoes';
    render(<OAuthRedirect />);
    expect(mockReplace).toHaveBeenCalledWith('/settings/integracoes');
  });

  it('fallback para /settings/integracoes quando ultimaRota e null', () => {
    mockUltimaRota = null;
    render(<OAuthRedirect />);
    expect(mockReplace).toHaveBeenCalledWith('/settings/integracoes');
  });

  it('fallback quando ultimaRota e rota nao restauravel (modal)', () => {
    mockUltimaRota = '/share-receive';
    render(<OAuthRedirect />);
    expect(mockReplace).toHaveBeenCalledWith('/settings/integracoes');
  });

  it('renderiza loader sem vazar URL/params', () => {
    mockUltimaRota = null;
    const { queryByText, getByTestId } = render(<OAuthRedirect />);
    // Loader presente.
    expect(getByTestId('ouroboros-loader')).toBeTruthy();
    // Nenhum vazamento de palavras-chave OAuth na UI.
    expect(queryByText(/code/i)).toBeNull();
    expect(queryByText(/oauthredirect/i)).toBeNull();
    expect(queryByText(/scope/i)).toBeNull();
    expect(queryByText(/state/i)).toBeNull();
  });

  it('redirecionamento ocorre uma unica vez mesmo em re-render', () => {
    mockUltimaRota = '/settings/integracoes';
    const { rerender } = render(<OAuthRedirect />);
    rerender(<OAuthRedirect />);
    // Lock por ref evita disparar duas vezes.
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
