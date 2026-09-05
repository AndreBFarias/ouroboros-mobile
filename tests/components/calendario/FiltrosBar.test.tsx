// AUDIT-P2-11: primeira cobertura da FiltrosBar.
//
// A barra existia desde M11.5, completa e testada nas funcoes puras,
// mas sem nenhuma suite propria -- porque nenhum caller a montava. Ao
// religa-la dentro do Recap, o comportamento dela passa a ser
// alcancavel pelo usuario e precisa de rede.
//
// O Slider e mockado por um Pressable que dispara onChange com um
// valor fixo: o alvo do teste NAO e o gesto de arrastar (isso e do
// Slider, ja coberto), e sim o clamp cruzado que a FiltrosBar aplica
// no onChange -- min nunca passa o max e vice-versa.
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('@/lib/stores/pessoa', () => ({
  __esModule: true,
  useNomeDe: (quem: string) =>
    quem === 'pessoa_a'
      ? 'Pessoa A'
      : quem === 'pessoa_b'
        ? 'Pessoa B'
        : 'Ambos',
}));

let mockVaultCompartilhado = true;
jest.mock('@/lib/stores/filtroEfetivo', () => ({
  __esModule: true,
  useVaultCompartilhado: () => mockVaultCompartilhado,
}));

// Slider vira um botao que empurra mockValorSlider para o onChange.
let mockValorSlider = 4;
jest.mock('@/components/ui', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  const real = jest.requireActual('@/components/ui');
  return {
    ...real,
    __esModule: true,
    Slider: function Slider(props: {
      onChange: (n: number) => void;
      accessibilityLabel?: string;
    }) {
      return r.createElement(RN.Pressable, {
        accessibilityLabel: props.accessibilityLabel,
        onPress: () => props.onChange(mockValorSlider),
      });
    },
  };
});

import { FiltrosBar } from '@/components/calendario/FiltrosBar';
import { FILTROS_DEFAULT } from '@/lib/conquistas/filtros';

function montar(over: Record<string, unknown> = {}) {
  const spies = {
    onPessoa: jest.fn(),
    onMes: jest.fn(),
    onTipoMidia: jest.fn(),
    onIntensidade: jest.fn(),
    onBairro: jest.fn(),
  };
  const utils = render(
    <FiltrosBar filtros={FILTROS_DEFAULT} {...spies} {...over} />
  );
  return { ...utils, ...spies };
}

beforeEach(() => {
  mockVaultCompartilhado = true;
  mockValorSlider = 4;
});

describe('FiltrosBar — os quatro filtros religados', () => {
  it('tocar num chip de midia chama onTipoMidia com o id', () => {
    const { getByText, onTipoMidia } = montar();
    fireEvent.press(getByText('Foto'));
    expect(onTipoMidia).toHaveBeenCalledWith('foto');
  });

  it('tocar num chip de pessoa chama onPessoa com o id', () => {
    const { getByText, onPessoa } = montar();
    fireEvent.press(getByText('Pessoa B'));
    expect(onPessoa).toHaveBeenCalledWith('pessoa_b');
  });

  it('digitar no bairro chama onBairro com o texto', async () => {
    jest.useFakeTimers();
    const { getByLabelText, onBairro } = montar();
    fireEvent.changeText(getByLabelText('filtro bairro'), 'Centro');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(onBairro).toHaveBeenCalledWith('Centro');
    jest.useRealTimers();
  });
});

describe('FiltrosBar — clamp cruzado da intensidade', () => {
  it('subir o minimo acima do maximo empurra o maximo junto', () => {
    mockValorSlider = 5;
    const { getByLabelText, onIntensidade } = montar({
      filtros: { ...FILTROS_DEFAULT, intensidade: { min: 1, max: 3 } },
    });
    fireEvent.press(getByLabelText('filtro intensidade minima'));
    expect(onIntensidade).toHaveBeenCalledWith({ min: 5, max: 5 });
  });

  it('baixar o maximo abaixo do minimo puxa o minimo junto', () => {
    mockValorSlider = 2;
    const { getByLabelText, onIntensidade } = montar({
      filtros: { ...FILTROS_DEFAULT, intensidade: { min: 4, max: 5 } },
    });
    fireEvent.press(getByLabelText('filtro intensidade maxima'));
    expect(onIntensidade).toHaveBeenCalledWith({ min: 2, max: 2 });
  });
});

describe('FiltrosBar — debounce do bairro', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('tres teclas em sequencia disparam onBairro uma vez so', async () => {
    const { getByLabelText, onBairro } = montar();
    const input = getByLabelText('filtro bairro');
    fireEvent.changeText(input, 'C');
    fireEvent.changeText(input, 'Ce');
    fireEvent.changeText(input, 'Cen');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(onBairro).toHaveBeenCalledTimes(1);
    expect(onBairro).toHaveBeenCalledWith('Cen');
  });

  it('desmontar dentro da janela de 300ms nao dispara onBairro', async () => {
    // O cleanup existe porque a barra vive num sheet: fechar o sheet
    // durante a janela desmontaria o componente com o timer pendente.
    const { getByLabelText, onBairro, unmount } = montar();
    fireEvent.changeText(getByLabelText('filtro bairro'), 'Centro');
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(onBairro).not.toHaveBeenCalled();
  });
});

describe('FiltrosBar — privacidade do Vault', () => {
  it('sem Vault compartilhado, o chip de ambos nao e renderizado', () => {
    mockVaultCompartilhado = false;
    const { queryByText, getByText } = montar();
    expect(queryByText('Ambos')).toBeNull();
    expect(getByText('Pessoa A')).toBeTruthy();
    expect(getByText('Pessoa B')).toBeTruthy();
  });

  it('sem Vault compartilhado, desmarcar cai em pessoa_a e nunca em ambos', () => {
    mockVaultCompartilhado = false;
    const { getByText, onPessoa } = montar({
      filtros: { ...FILTROS_DEFAULT, pessoa: 'pessoa_a' },
    });
    // Tocar no chip ja selecionado desmarca: o ChipGroup emite null.
    fireEvent.press(getByText('Pessoa A'));
    expect(onPessoa).toHaveBeenCalledWith('pessoa_a');
    expect(onPessoa).not.toHaveBeenCalledWith('ambos');
  });

  it('com Vault compartilhado, o chip de ambos volta', () => {
    const { getByText } = montar();
    expect(getByText('Ambos')).toBeTruthy();
  });
});

describe('FiltrosBar — bloco de mes', () => {
  it('aparece por default, para quem ja consumia a barra inteira', () => {
    const { getByText } = montar();
    expect(getByText('Filtrar por mês')).toBeTruthy();
  });

  it('some com mostrarMes false, sem levar os vizinhos junto', () => {
    const { queryByText, getByText } = montar({ mostrarMes: false });
    expect(queryByText('Filtrar por mês')).toBeNull();
    expect(queryByText('Este mês')).toBeNull();
    expect(getByText('Pessoa')).toBeTruthy();
    expect(getByText('Filtrar por mídia')).toBeTruthy();
    expect(getByText('Bairro')).toBeTruthy();
  });
});
