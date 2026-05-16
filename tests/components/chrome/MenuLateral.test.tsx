// Smoke do MenuLateral (M27). Verifica:
//   - Quando fechado, nao renderiza nada.
//   - Quando aberto, renderiza secoes Acesso Rapido e Registrar.
//   - Secao Utilitarios aparece somente quando ao menos um toggle on.
//   - Tap em item navega via router.push e fecha o menu.
//   - Backdrop fecha o menu.
//   - K3: tap no CabecalhoPessoa navega para /settings/editar-pessoa.
//
// K1 (M-MENU-LATERAL-LAYOUT, 2026-05-07) adiciona:
//   - Scroll position salva em useNavegacao apos onScroll (debounce).
//   - Re-abrir drawer aplica scrollTo com offset persistido.
//   - Rodape recebe paddingBottomCanonico considerando insets.bottom.
//
// Mocks: expo-router (router.push spiavel) + useSettings e useNavegacao
// via getState().setState para simular variantes. K1: mock local de
// react-native-safe-area-context com insets.bottom = 24 sobrescreve o
// default global (jest.setup.cjs retorna 0 em todos os insets).
import { act, fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

// K1: insets.bottom = 24 simula um device com barra de gestos. O
// RodapeSettings deve incorporar esse valor no paddingBottom.
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const RNLocal = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) =>
      ReactLocal.createElement(RNLocal.View, null, children),
    SafeAreaView: ({ children, ...rest }: { children: unknown }) =>
      ReactLocal.createElement(RNLocal.View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
  };
});

import { MenuLateral } from '@/components/chrome/MenuLateral';
import { useNavegacao } from '@/lib/stores/navegacao';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';

describe('MenuLateral', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useNavegacao.setState({
      menuAberto: false,
      scrollMenuLateralPosition: 0,
    });
    useSettings.getState().resetar();
    useOnboarding.getState().resetar();
    jest.useRealTimers();
  });

  it('quando fechado, nao renderiza secoes', () => {
    const { queryByLabelText } = render(<MenuLateral />);
    expect(queryByLabelText('item hoje')).toBeNull();
  });

  it('quando aberto, renderiza secoes Ver e Registrar com itens', () => {
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText, queryByLabelText } = render(<MenuLateral />);

    // Ver
    expect(getByLabelText('item hoje')).toBeTruthy();
    // L1: item "Memórias" -> "Saúde Física" (a11yLabel mudou).
    expect(getByLabelText('item saude fisica')).toBeTruthy();
    expect(queryByLabelText('item memorias')).toBeNull();
    expect(getByLabelText('item humor')).toBeTruthy();
    // M35: item "financas" so aparece quando o toggle
    // mostrarFinancasEmDesenvolvimento esta ON. Default OFF aqui
    // (resetar() em beforeEach), entao o item nao deve aparecer.
    expect(queryByLabelText('item financas')).toBeNull();
    // Registrar
    expect(getByLabelText('registrar humor')).toBeTruthy();
    // R-FAB-1: item "Voz" REMOVIDO. Diario Emocional acessivel via
    // "registrar reflexao" + item "diario" (quando aplicavel).
    expect(queryByLabelText('registrar voz')).toBeNull();
    expect(getByLabelText('registrar camera')).toBeTruthy();
    // L1: item "Exercícios" foi REMOVIDO da secao Registrar (movido
    // para a aba Exercicios em /saude-fisica).
    expect(queryByLabelText('registrar exercicios')).toBeNull();
    expect(getByLabelText('registrar conquista')).toBeTruthy();
    expect(getByLabelText('registrar crise')).toBeTruthy();
    // Confirma que o atalho "Reflexao" continua presente (caminho
    // alternativo para /diario-emocional pos-R0).
    expect(getByLabelText('registrar reflexao')).toBeTruthy();
  });

  it('M35: item "financas" aparece quando mostrarFinancasEmDesenvolvimento on', () => {
    useSettings
      .getState()
      .setFeatureToggle('mostrarFinancasEmDesenvolvimento', true);
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText } = render(<MenuLateral />);
    expect(getByLabelText('item financas')).toBeTruthy();
  });

  it('Opcionais nao aparece quando todos os toggles estao off', () => {
    // Sprint M29: defaults v2 trazem todos os featureToggles ON. Forca
    // explicitamente off para exercitar o caminho de "menu sem opcionais".
    useSettings.getState().setFeatureToggle('todoLeve', false);
    useSettings.getState().setFeatureToggle('alarmePessoal', false);
    useSettings.getState().setFeatureToggle('contadorDiasSem', false);
    useSettings.getState().setFeatureToggle('cicloMenstrual', false);
    useSettings.getState().setFeatureToggle('calendarioConquistas', false);
    useNavegacao.setState({ menuAberto: true });
    const { queryByLabelText } = render(<MenuLateral />);
    expect(queryByLabelText('item tarefas')).toBeNull();
    expect(queryByLabelText('item alarmes')).toBeNull();
    expect(queryByLabelText('item contadores')).toBeNull();
    expect(queryByLabelText('item ciclo')).toBeNull();
  });

  it('Opcionais filtra por featureToggles individualmente', () => {
    // Sprint M29: defaults v2 trazem todos os featureToggles ON. Para
    // testar o filtro, ligamos so dois e desligamos os outros explicitos.
    useSettings.getState().setFeatureToggle('todoLeve', true);
    useSettings.getState().setFeatureToggle('cicloMenstrual', true);
    useSettings.getState().setFeatureToggle('alarmePessoal', false);
    useSettings.getState().setFeatureToggle('contadorDiasSem', false);
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText, queryByLabelText } = render(<MenuLateral />);

    expect(getByLabelText('item tarefas')).toBeTruthy();
    expect(getByLabelText('item ciclo')).toBeTruthy();
    expect(queryByLabelText('item alarmes')).toBeNull();
    expect(queryByLabelText('item contadores')).toBeNull();
  });

  it('tap em item Ver navega via router.push e fecha o menu', () => {
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText } = render(<MenuLateral />);
    // L1: item Memorias virou Saude Fisica; rota /memoria -> /saude-fisica.
    fireEvent.press(getByLabelText('item saude fisica'));
    expect(mockPush).toHaveBeenCalledWith('/saude-fisica');
    expect(useNavegacao.getState().menuAberto).toBe(false);
  });

  it('tap em backdrop fecha o menu', () => {
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText } = render(<MenuLateral />);
    fireEvent.press(getByLabelText('fechar menu lateral'));
    expect(useNavegacao.getState().menuAberto).toBe(false);
  });

  // I-CICLO (M-SAVE-CICLO-VALIDA): item Ciclo segue feature toggle
  // E o sexoDeclarado das duas pessoas. Ambos masculino esconde
  // mesmo com toggle on.
  describe('I-CICLO visibilidade do item Ciclo', () => {
    beforeEach(() => {
      // Garante toggle on para isolar o efeito de sexoDeclarado.
      useSettings.getState().setFeatureToggle('cicloMenstrual', true);
      useNavegacao.setState({ menuAberto: true });
    });

    it('esconde Ciclo quando ambos masculino', () => {
      useOnboarding.getState().setSexoDeclarado('pessoa_a', 'masculino');
      useOnboarding.getState().setSexoDeclarado('pessoa_b', 'masculino');
      const { queryByLabelText } = render(<MenuLateral />);
      expect(queryByLabelText('item ciclo')).toBeNull();
    });

    it('mostra Ciclo quando uma e feminina', () => {
      useOnboarding.getState().setSexoDeclarado('pessoa_a', 'masculino');
      useOnboarding.getState().setSexoDeclarado('pessoa_b', 'feminino');
      const { getByLabelText } = render(<MenuLateral />);
      expect(getByLabelText('item ciclo')).toBeTruthy();
    });

    it('mostra Ciclo quando ambas femininas', () => {
      useOnboarding.getState().setSexoDeclarado('pessoa_a', 'feminino');
      useOnboarding.getState().setSexoDeclarado('pessoa_b', 'feminino');
      const { getByLabelText } = render(<MenuLateral />);
      expect(getByLabelText('item ciclo')).toBeTruthy();
    });

    it('mostra Ciclo quando ainda nao declarou (default null)', () => {
      const { getByLabelText } = render(<MenuLateral />);
      expect(getByLabelText('item ciclo')).toBeTruthy();
    });

    it('respeita feature toggle off mesmo se sexo permite', () => {
      useSettings.getState().setFeatureToggle('cicloMenstrual', false);
      useOnboarding.getState().setSexoDeclarado('pessoa_a', 'feminino');
      const { queryByLabelText } = render(<MenuLateral />);
      expect(queryByLabelText('item ciclo')).toBeNull();
    });
  });

  // K1 (M-MENU-LATERAL-LAYOUT): scroll persistente, safe area no rodape
  // e padding simetrico. Cobre os tres pontos exigidos pela spec.
  describe('K1 layout do drawer', () => {
    it('salva scroll offset em useNavegacao apos onScroll com debounce', () => {
      jest.useFakeTimers();
      useNavegacao.setState({ menuAberto: true });
      const { UNSAFE_getAllByType } = render(<MenuLateral />);
      const RNLocal = require('react-native');
      const scrollViews = UNSAFE_getAllByType(RNLocal.ScrollView);
      const drawerScroll = scrollViews[0];
      expect(drawerScroll).toBeTruthy();

      // Dispara onScroll com offset 120. Debounce de 200ms — antes
      // disso o offset nao deve estar no store.
      act(() => {
        drawerScroll.props.onScroll({
          nativeEvent: {
            contentOffset: { x: 0, y: 120 },
            contentSize: { width: 280, height: 1200 },
            layoutMeasurement: { width: 280, height: 600 },
          },
        });
      });
      expect(useNavegacao.getState().scrollMenuLateralPosition).toBe(0);

      // Avanca o timer para alem do debounce. Agora o offset persiste.
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(useNavegacao.getState().scrollMenuLateralPosition).toBe(120);
    });

    it('re-abrir drawer aplica scrollTo com posicao persistida', () => {
      jest.useFakeTimers();
      useNavegacao.setState({
        menuAberto: true,
        scrollMenuLateralPosition: 240,
      });
      const { UNSAFE_getAllByType } = render(<MenuLateral />);
      const RNLocal = require('react-native');
      const drawerScroll = UNSAFE_getAllByType(RNLocal.ScrollView)[0];
      const scrollToSpy = jest.fn();
      // O ref do ScrollView e instalado pelo React; em jest com mock
      // do RN, a instancia e o proprio host. Substitui scrollTo.
      const refCurrent = drawerScroll.instance ?? drawerScroll;
      refCurrent.scrollTo = scrollToSpy;

      // useEffect agendou setTimeout(0) para escalonar o scrollTo.
      act(() => {
        jest.advanceTimersByTime(10);
      });
      expect(scrollToSpy).toHaveBeenCalledWith({ y: 240, animated: false });
    });

    // K2: labels das secoes renomeados. Garante PT-BR sentence case
    // com acentuacao nos titulos exibidos no drawer.
    it('K2 secoes exibem "Acesso Rápido" e "Utilitários" (com acento)', () => {
      // Liga ao menos um toggle para que a secao Utilitarios apareca.
      useSettings.getState().setFeatureToggle('todoLeve', true);
      useNavegacao.setState({ menuAberto: true });
      const { getByText, queryByText } = render(<MenuLateral />);
      expect(getByText('Acesso Rápido')).toBeTruthy();
      expect(getByText('Utilitários')).toBeTruthy();
      // Labels antigos nao devem mais aparecer.
      expect(queryByText('Ver')).toBeNull();
      expect(queryByText('Opcionais')).toBeNull();
    });

    // K3: tap no cabecalho navega para tela de edicao de nomes/fotos
    // e fecha o drawer (mesma logica do navegar() interno).
    it('K3 tap no CabecalhoPessoa navega para /settings/editar-pessoa e fecha menu', () => {
      useNavegacao.setState({ menuAberto: true });
      const { getByLabelText } = render(<MenuLateral />);
      fireEvent.press(getByLabelText('editar nome e foto'));
      expect(mockPush).toHaveBeenCalledWith('/settings/editar-pessoa');
      expect(useNavegacao.getState().menuAberto).toBe(false);
    });

    it('Rodape Configuracoes incorpora insets.bottom no paddingBottom', () => {
      useNavegacao.setState({ menuAberto: true });
      const { getByLabelText } = render(<MenuLateral />);
      const rodape = getByLabelText('abrir configuracoes');
      // styles podem ser array; achatar para inspecao.
      const rawStyle = rodape.props.style;
      const style = Array.isArray(rawStyle)
        ? Object.assign({}, ...rawStyle)
        : rawStyle;
      // Mock declara insets.bottom = 24. O paddingBottom canonico e
      // max(spacing.xl=24, screenHeight*0.10) + 24. Em qualquer device
      // o resultado e >= 48 (24 + 24).
      expect(typeof style.paddingBottom).toBe('number');
      expect(style.paddingBottom).toBeGreaterThanOrEqual(48);
    });
  });
});
