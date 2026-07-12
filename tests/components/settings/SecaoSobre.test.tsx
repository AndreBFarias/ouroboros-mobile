// Testes do componente SecaoSobre. Garante que versao, build e
// commit hash sao lidos de Constants e renderizados em sentence case
// PT-BR. Mock de expo-constants para isolar do runtime real.

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
      android: { versionCode: 42 },
      extra: {
        repoUrl: 'https://github.com/teste/repo',
        license: 'GPL-3.0',
        commitHash: 'abcdef1234567890',
      },
    },
  },
}));

import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SecaoSobre } from '@/components/settings/SecaoSobre';

const openURLSpy = jest
  .spyOn(Linking, 'openURL')
  .mockImplementation(() => Promise.resolve());

describe('SecaoSobre', () => {
  beforeEach(() => {
    openURLSpy.mockClear();
  });

  it('renderiza versao lida de expoConfig.version', () => {
    const { getByText } = render(<SecaoSobre />);
    expect(getByText('Versão')).toBeTruthy();
    expect(getByText('1.0.0')).toBeTruthy();
  });

  it('renderiza build lido de android.versionCode', () => {
    const { getByText } = render(<SecaoSobre />);
    expect(getByText('Build')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });

  it('renderiza commit truncado em 7 chars', () => {
    const { getByText } = render(<SecaoSobre />);
    expect(getByText('Commit')).toBeTruthy();
    expect(getByText('abcdef1')).toBeTruthy();
  });

  it('renderiza licenca em sentence case com acento', () => {
    const { getByText } = render(<SecaoSobre />);
    expect(getByText('Licença')).toBeTruthy();
    expect(getByText('GPL-3.0')).toBeTruthy();
  });

  it('botao do github dispara Linking.openURL com url do repo', () => {
    const { getByLabelText } = render(<SecaoSobre />);
    const botao = getByLabelText('abrir repositorio no github');
    fireEvent.press(botao);
    expect(openURLSpy).toHaveBeenCalledWith('https://github.com/teste/repo');
  });

  it('renderiza titulo "Sobre" por default na SecaoLista', () => {
    const { getByLabelText } = render(<SecaoSobre />);
    expect(getByLabelText('secao sobre')).toBeTruthy();
  });

  it('omite titulo da secao quando semTituloDeSecao=true', () => {
    const { queryByLabelText, getByLabelText } = render(
      <SecaoSobre semTituloDeSecao />
    );
    expect(queryByLabelText('secao sobre')).toBeNull();
    expect(getByLabelText('bloco sobre')).toBeTruthy();
  });
});
