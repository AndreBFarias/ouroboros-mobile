// Testes do MidiaExecucaoPlayer (R-SF-2). Cobre:
//   - Render sem path -> empty state Dumbbell ("ausente")
//   - Render com GIF valido -> Image com testID midia-execucao-image
//   - Render com MP4 valido -> Video com testID midia-execucao-video
//   - GIF com URI invalida (onError no Image) -> EmptyStateMidia
//   - MP4 corrompido (onError no Video) -> EmptyStateMidia
//   - JPG invalido (onError no Image) -> EmptyStateMidia
//
// Mock local de expo-av (jest.setup.cjs nao exporta Video/ResizeMode).
// useVault setado via setState com vaultRoot fictio.
//
// Comentarios sem acento (convencao shell/CI).

// Mock local de expo-av: Video como forwardRef que renderiza View.
// Necessario porque jest.setup.cjs nao exporta Video/ResizeMode
// (so Audio.Recording). Importa react e react-native lazy dentro do
// factory para evitar "out-of-scope variables" do babel-jest.
jest.mock('expo-av', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const VideoMock = React.forwardRef(function VideoMock(
    props: Record<string, unknown>,
    ref: unknown,
  ) {
    React.useImperativeHandle(ref, () => ({}), []);
    const { onError: _onError, source: _source, ...rest } = props || {};
    return React.createElement(RN.View, rest);
  });
  return {
    __esModule: true,
    Video: VideoMock,
    ResizeMode: { COVER: 'cover', CONTAIN: 'contain', STRETCH: 'stretch' },
  };
});

import { fireEvent, render } from '@testing-library/react-native';
import { MidiaExecucaoPlayer } from '@/components/exercicios/MidiaExecucaoPlayer';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  useVault.setState({ vaultRoot: VAULT_ROOT });
});

describe('MidiaExecucaoPlayer empty state', () => {
  it('renderiza placeholder Dumbbell quando path e null', () => {
    const { getByLabelText } = render(<MidiaExecucaoPlayer path={null} />);
    expect(
      getByLabelText('midia de execucao do exercicio ausente')
    ).toBeTruthy();
  });

  it('renderiza placeholder Dumbbell quando path e string vazia', () => {
    const { getByLabelText } = render(<MidiaExecucaoPlayer path="" />);
    expect(
      getByLabelText('midia de execucao do exercicio ausente')
    ).toBeTruthy();
  });

  it('renderiza placeholder Dumbbell quando path e undefined', () => {
    const { getByLabelText } = render(
      <MidiaExecucaoPlayer path={undefined} />
    );
    expect(
      getByLabelText('midia de execucao do exercicio ausente')
    ).toBeTruthy();
  });
});

describe('MidiaExecucaoPlayer render por tipo', () => {
  it('renderiza Image para GIF valido', () => {
    const { getByTestId, queryByLabelText } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/agachamento.gif" />
    );
    expect(getByTestId('midia-execucao-image')).toBeTruthy();
    expect(queryByLabelText('midia indisponivel')).toBeNull();
  });

  it('renderiza Image para JPG valido', () => {
    const { getByTestId } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/agachamento.jpg" />
    );
    expect(getByTestId('midia-execucao-image')).toBeTruthy();
  });

  it('renderiza Video para MP4 valido', () => {
    const { getByTestId, queryByLabelText } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/agachamento.mp4" />
    );
    expect(getByTestId('midia-execucao-video')).toBeTruthy();
    expect(queryByLabelText('midia indisponivel')).toBeNull();
  });

  it('renderiza Video para MOV valido', () => {
    const { getByTestId } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/agachamento.mov" />
    );
    expect(getByTestId('midia-execucao-video')).toBeTruthy();
  });

  it('renderiza Video para WEBM valido', () => {
    const { getByTestId } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/agachamento.webm" />
    );
    expect(getByTestId('midia-execucao-video')).toBeTruthy();
  });
});

describe('MidiaExecucaoPlayer fallback onError (R-SF-2)', () => {
  it('GIF com URI invalida cai para EmptyStateMidia', () => {
    const { getByTestId, getByLabelText, getByText, queryByTestId } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/quebrado.gif" />
    );
    // Antes do erro: Image presente.
    expect(getByTestId('midia-execucao-image')).toBeTruthy();
    // Dispara onError simulando falha de carga (URI invalida).
    fireEvent(getByTestId('midia-execucao-image'), 'error');
    // Depois do erro: Image sumiu, EmptyStateMidia renderizado.
    expect(queryByTestId('midia-execucao-image')).toBeNull();
    expect(getByLabelText('midia de execucao do exercicio')).toBeTruthy();
    expect(getByText('Mídia indisponível')).toBeTruthy();
  });

  it('JPG invalido cai para EmptyStateMidia', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/corrompido.jpg" />
    );
    fireEvent(getByTestId('midia-execucao-image'), 'error');
    expect(queryByTestId('midia-execucao-image')).toBeNull();
    expect(getByText('Mídia indisponível')).toBeTruthy();
  });

  it('MP4 corrompido cai para EmptyStateMidia', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <MidiaExecucaoPlayer path="midia/exercicios/corrompido.mp4" />
    );
    expect(getByTestId('midia-execucao-video')).toBeTruthy();
    fireEvent(getByTestId('midia-execucao-video'), 'error');
    expect(queryByTestId('midia-execucao-video')).toBeNull();
    expect(getByText('Mídia indisponível')).toBeTruthy();
  });

  it('preserva size sm no fallback de erro (icone sem texto)', () => {
    const { getByTestId, queryByText, getByLabelText } = render(
      <MidiaExecucaoPlayer
        path="midia/exercicios/corrompido.gif"
        size="sm"
      />
    );
    fireEvent(getByTestId('midia-execucao-image'), 'error');
    // sm omite o label "Mídia indisponível" textual; mas mantem
    // o accessibilityLabel propagado do caller.
    expect(getByLabelText('midia de execucao do exercicio')).toBeTruthy();
    expect(queryByText('Mídia indisponível')).toBeNull();
  });
});

describe('MidiaExecucaoPlayer vaultRoot resolution', () => {
  it('compoe URI com vaultRoot quando definido', () => {
    useVault.setState({ vaultRoot: 'content://x/y' });
    const { getByTestId } = render(
      <MidiaExecucaoPlayer path="midia/foo.gif" />
    );
    const img = getByTestId('midia-execucao-image');
    expect(img.props.source.uri).toBe('content://x/y/midia/foo.gif');
  });

  it('usa path puro quando vaultRoot e null', () => {
    useVault.setState({ vaultRoot: null });
    const { getByTestId } = render(
      <MidiaExecucaoPlayer path="midia/foo.gif" />
    );
    const img = getByTestId('midia-execucao-image');
    expect(img.props.source.uri).toBe('midia/foo.gif');
  });
});
