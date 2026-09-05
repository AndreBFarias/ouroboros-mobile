// AUDIT-P2-11: integracao do controle de filtros no modo Calendario.
//
// A suite da FiltrosBar prova que a barra chama os setters certos. Esta
// prova o que faltava fechar: que mexer num filtro muda de fato a lista
// do dia, que o indicador acende so quando ha filtro deste controle, e
// que o usuario nunca fica preso num vazio sem caminho de volta.
//
// O useConquistas nao e mockado -- ele e o objeto sob teste aqui, junto
// da tela. Mockamos a camada abaixo dele (loader do Vault) para semear
// conquistas determinísticas.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { DIA_FIXTURE as DIA } from './__fixtures_p2_11__';

jest.mock('@/lib/conquistas/loader', () => ({
  __esModule: true,
  lerConquistas: () =>
    Promise.resolve({
      conquistas: jest.requireActual('./__fixtures_p2_11__').CONQUISTAS_FIX,
      totaisPorOrigem: { evento_positivo: 2, diario_vitoria: 0 },
    }),
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: (sel: (s: { vaultRoot: string }) => unknown) =>
    sel({ vaultRoot: 'file:///vault' }),
}));

jest.mock('@/lib/stores/filtroEfetivo', () => ({
  __esModule: true,
  useFiltroPessoaEfetivo: () => 'ambos',
  useVaultCompartilhado: () => true,
}));

jest.mock('@/lib/stores/pessoa', () => ({
  __esModule: true,
  useNomeDe: (quem: string) =>
    quem === 'pessoa_a'
      ? 'Pessoa A'
      : quem === 'pessoa_b'
        ? 'Pessoa B'
        : 'Ambos',
  usePessoa: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({ pessoaAtiva: 'pessoa_a', tipoCompanhia: 'Casal' }),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useFocusEffect: () => undefined,
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// react-native-calendars nao roda em jsdom; vira um View com um botao
// por dia marcado, que dispara onDayPress igual ao real.
jest.mock('react-native-calendars', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  return {
    __esModule: true,
    LocaleConfig: {
      locales: {} as Record<string, unknown>,
      defaultLocale: 'pt-BR',
    },
    Calendar: function Calendar(props: {
      markedDates: Record<string, unknown>;
      onDayPress: (d: { dateString: string }) => void;
    }) {
      return r.createElement(
        RN.View,
        { accessibilityLabel: 'calendario' },
        Object.keys(props.markedDates).map((dia) =>
          r.createElement(RN.Pressable, {
            key: dia,
            accessibilityLabel: `dia ${dia}`,
            onPress: () => props.onDayPress({ dateString: dia }),
          })
        )
      );
    },
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  return {
    __esModule: true,
    BottomSheetView: function BottomSheetView(props: { children: unknown }) {
      return r.createElement(RN.View, null, props.children);
    },
  };
});

// O BottomSheet real usa Reanimated + portal; aqui basta renderizar o
// conteudo inline para que a FiltrosBar seja alcancavel pelo teste.
jest.mock('@/components/ui/BottomSheet', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  return {
    __esModule: true,
    BottomSheet: r.forwardRef(function BottomSheet(
      props: { children: unknown },
      ref: { current: unknown }
    ) {
      r.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        close: jest.fn(),
      }));
      return r.createElement(RN.View, null, props.children);
    }),
  };
});

import { RecapModoCalendario } from '@/components/screens/RecapModoCalendario';

async function montar() {
  const utils = render(<RecapModoCalendario />);
  await waitFor(() => utils.getByLabelText('calendario'));
  return utils;
}

describe('RecapModoCalendario — controle de filtros', () => {
  it('o controle aparece e comeca sem indicador de filtro ativo', async () => {
    const { getByText, queryByLabelText } = await montar();
    expect(getByText('Filtros')).toBeTruthy();
    // Sem filtro deste controle, nao ha caminho de "Limpar" para mostrar.
    expect(queryByLabelText('limpar filtros de conquistas')).toBeNull();
  });

  it('filtrar por midia muda a lista do dia selecionado', async () => {
    const { getByLabelText, getByText, queryByText } = await montar();
    fireEvent.press(getByLabelText(`dia ${DIA}`));
    await waitFor(() =>
      expect(getByText('2 conquistas neste dia.')).toBeTruthy()
    );

    fireEvent.press(getByLabelText('chip Spotify'));
    await waitFor(() =>
      expect(getByText('1 conquista neste dia.')).toBeTruthy()
    );
    expect(queryByText('2 conquistas neste dia.')).toBeNull();
  });

  it('com filtro aplicado, o contador e o Limpar aparecem', async () => {
    const { getByLabelText, getByText } = await montar();
    fireEvent.press(getByLabelText('chip Spotify'));
    await waitFor(() =>
      expect(getByLabelText('limpar filtros de conquistas')).toBeTruthy()
    );
    // O rotulo do controle carrega a contagem: e o que o leitor de
    // tela anuncia, e desambigua do "1 conquista neste dia." da lista.
    expect(getByLabelText('abrir filtros de conquistas, 1 ativo')).toBeTruthy();
  });

  it('limpar devolve a lista ao estado anterior', async () => {
    const { getByLabelText, getByText } = await montar();
    fireEvent.press(getByLabelText(`dia ${DIA}`));
    fireEvent.press(getByLabelText('chip Spotify'));
    await waitFor(() =>
      expect(getByText('1 conquista neste dia.')).toBeTruthy()
    );

    fireEvent.press(getByLabelText('limpar filtros de conquistas'));
    await waitFor(() =>
      expect(getByText('2 conquistas neste dia.')).toBeTruthy()
    );
  });

  it('o controle do filtro de mes nao existe dentro do Recap', async () => {
    const { queryByText } = await montar();
    expect(queryByText('Filtrar por mês')).toBeNull();
    expect(queryByText('Este mês')).toBeNull();
  });

  it('filtro que zera a lista mantem o caminho de volta na tela', async () => {
    // O galho semAposFiltro era inalcancavel antes desta sprint. Agora
    // que da para chegar nele, ele nao pode ser um beco sem saida.
    const { getByLabelText, getByText } = await montar();
    fireEvent.changeText(getByLabelText('filtro bairro'), 'Bairro Inexistente');
    await waitFor(() =>
      expect(
        getByText('Nenhuma conquista passa pelos filtros de agora.')
      ).toBeTruthy()
    );
    expect(getByLabelText('limpar filtros de conquistas')).toBeTruthy();
  });
});
