import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SecaoLista } from '@/components/settings/SecaoLista';

describe('SecaoLista', () => {
  it('renderiza titulo em uppercase com filhos', () => {
    const { getByText, getByLabelText } = render(
      <SecaoLista titulo="Som e vibração">
        <Text>filho</Text>
      </SecaoLista>
    );
    // Componente aplica textTransform via style; a string original
    // segue como esta. Verifica que ela aparece no DOM.
    expect(getByText('Som e vibração')).toBeTruthy();
    expect(getByText('filho')).toBeTruthy();
    // a11y default deriva do titulo lowercase.
    expect(getByLabelText('secao som e vibração')).toBeTruthy();
  });

  it('aceita accessibilityLabel customizado sem acento', () => {
    const { getByLabelText } = render(
      <SecaoLista titulo="Sync" accessibilityLabel="secao sync">
        <Text>x</Text>
      </SecaoLista>
    );
    expect(getByLabelText('secao sync')).toBeTruthy();
  });

  it('renderiza multiplos filhos em sequencia', () => {
    const { getByText } = render(
      <SecaoLista titulo="Pessoa">
        <Text>linha 1</Text>
        <Text>linha 2</Text>
        <Text>linha 3</Text>
      </SecaoLista>
    );
    expect(getByText('linha 1')).toBeTruthy();
    expect(getByText('linha 2')).toBeTruthy();
    expect(getByText('linha 3')).toBeTruthy();
  });
});
