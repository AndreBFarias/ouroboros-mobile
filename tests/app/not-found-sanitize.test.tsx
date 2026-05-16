// R-CRIT-1.a (2026-05-15): tests da rota app/+not-found.tsx.
//
// Garantia central: a tela NAO vaza URL bruta nem queryParams. Caso
// concreto que motivou a sprint: deep link OAuth nao resolvido
// (`com.googleusercontent.apps.<id>:/oauthredirect?code=...&state=...`)
// caia no default do expo-router, que imprimia a URL completa na UI
// expondo o `code` OAuth. Esta rota substitui esse default.
//
// Tests:
// 1. Renderiza header "Página não encontrada" com acentuacao.
// 2. Renderiza CTA "Voltar para o início" e mensagem sobria.
// 3. NAO renderiza qualquer URL, queryString ou palavras-chave OAuth.
// 4. CTA chama router.replace('/').
import { render, fireEvent } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  // O componente NAO pode ler params; este mock garante que se algum
  // dia tentar, o objeto vazio nao tem `code` nem `state`.
  useLocalSearchParams: () => ({}),
  usePathname: () => '/+not-found',
}));

import NotFound from '@/../app/+not-found';

describe('app/+not-found (R-CRIT-1.a)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renderiza header com acento e mensagem sobria', () => {
    const { getByText } = render(<NotFound />);
    expect(getByText('Página não encontrada')).toBeTruthy();
    expect(
      getByText(
        'A rota acessada não existe ou expirou. Toque em voltar para retomar de onde parou.'
      )
    ).toBeTruthy();
  });

  it('renderiza CTA primario "Voltar para o início"', () => {
    const { getByText } = render(<NotFound />);
    expect(getByText('Voltar para o início')).toBeTruthy();
  });

  it('NAO renderiza palavras-chave OAuth nem URL bruta', () => {
    const { queryByText, toJSON } = render(<NotFound />);
    // Inspeciona toda a arvore renderizada como JSON e checa que
    // nenhuma string sensivel aparece em texto visivel.
    const arvore = JSON.stringify(toJSON());
    expect(arvore).not.toMatch(/oauthredirect/i);
    expect(arvore).not.toMatch(/com\.googleusercontent/i);
    expect(arvore).not.toMatch(/access_token/i);
    expect(arvore).not.toMatch(/refresh_token/i);
    expect(arvore).not.toMatch(/\?code=/i);
    expect(arvore).not.toMatch(/&scope=/i);
    expect(arvore).not.toMatch(/&state=/i);
    // E nao expoe palavra "Unmatched Route" ou "Page could not be found"
    // que vinham do default do expo-router.
    expect(queryByText(/unmatched route/i)).toBeNull();
    expect(queryByText(/could not be found/i)).toBeNull();
  });

  it('CTA chama router.replace para a raiz', () => {
    const { getByText } = render(<NotFound />);
    fireEvent.press(getByText('Voltar para o início'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
