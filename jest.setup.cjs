// Setup global do jest para o app expo. Mocks dos pacotes nativos que
// nao rodam fora do dispositivo. Convencao: tudo que toca animacao,
// haptic ou storage e silenciado aqui para os testes smoke.

// Reanimated: usa o mock oficial.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Worklets: nada a fazer no ambiente de teste.
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
}));

// Moti: substitui MotiView/Text/Image por View/Text/Image do RN para
// que os testes nao dependam de Reanimated runtime real.
jest.mock('moti', () => {
  const React = require('react');
  const RN = require('react-native');
  const wrap = (Comp) => {
    const W = (props) => {
      const { animate: _a, transition: _t, from: _f, exit: _e, ...rest } = props || {};
      return React.createElement(Comp, rest);
    };
    W.displayName = `MockMoti(${Comp.displayName || Comp.name || 'Component'})`;
    return W;
  };
  return {
    MotiView: wrap(RN.View),
    MotiText: wrap(RN.Text),
    MotiImage: wrap(RN.Image),
    MotiScrollView: wrap(RN.ScrollView),
    View: wrap(RN.View),
    Text: wrap(RN.Text),
    Image: wrap(RN.Image),
    ScrollView: wrap(RN.ScrollView),
    AnimatePresence: ({ children }) => children,
  };
});

// Haptics: silencioso. Mantem assinatura async para nao quebrar awaits.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

// SecureStore: in-memory para testes que tocam o store de pessoa.
jest.mock('expo-secure-store', () => {
  const memory = new Map();
  return {
    getItemAsync: jest.fn((k) => Promise.resolve(memory.get(k) ?? null)),
    setItemAsync: jest.fn((k, v) => {
      memory.set(k, v);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((k) => {
      memory.delete(k);
      return Promise.resolve();
    }),
  };
});

// SafeArea: provider transparente.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(RN.View, null, children),
    SafeAreaView: ({ children, ...rest }) =>
      React.createElement(RN.View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// react-native-svg: substitui primitivas SVG por View para isolamento
// no test runner. Polyline/Circle/Line/Svg viram <View> simples para
// que componentes como HistoricoSparkline renderizem sem erro nos
// testes de unidade.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const RN = require('react-native');
  const stub = (name) => {
    const C = (props) =>
      React.createElement(RN.View, { ...props, accessibilityLabel: name });
    C.displayName = `SvgMock(${name})`;
    return C;
  };
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'),
    Circle: stub('Circle'),
    Polyline: stub('Polyline'),
    Polygon: stub('Polygon'),
    Line: stub('Line'),
    Path: stub('Path'),
    Rect: stub('Rect'),
    G: stub('G'),
    Text: stub('SvgText'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Stop: stub('Stop'),
  };
});

// lucide-react-native: substitui icones por View vazia para nao puxar
// react-native-svg no test runner.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const RN = require('react-native');
  const stub = (name) => {
    const C = (props) =>
      React.createElement(RN.View, { ...props, accessibilityLabel: name });
    C.displayName = `LucideMock(${name})`;
    return C;
  };
  return new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === '__esModule') return true;
        return stub(String(prop));
      },
    }
  );
});

// Slider nativo: substitui por View neutra que expoe value/min/max
// e dispara onValueChange via prop testID. Mantem assinatura.
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const RN = require('react-native');
  const Slider = (props) => {
    const {
      onValueChange: _ovc,
      value,
      minimumValue,
      maximumValue,
      step,
      ...rest
    } = props || {};
    return React.createElement(RN.View, {
      ...rest,
      accessibilityRole: 'adjustable',
      accessibilityValue: { min: minimumValue, max: maximumValue, now: value },
      'data-step': step,
    });
  };
  Slider.displayName = 'MockRNSlider';
  return { __esModule: true, default: Slider };
});

// gorhom/bottom-sheet: substitui o componente principal por View com
// ref que expoe `expand`, `close`, `snapToIndex`, `collapse`. Backdrop
// e BottomSheetView viram View. Suficiente para smoke render.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const RN = require('react-native');
  const BottomSheet = React.forwardRef((props, ref) => {
    React.useImperativeHandle(
      ref,
      () => ({
        expand: () => undefined,
        close: () => undefined,
        snapToIndex: () => undefined,
        snapToPosition: () => undefined,
        collapse: () => undefined,
        forceClose: () => undefined,
      }),
      []
    );
    return React.createElement(
      RN.View,
      { accessibilityLabel: 'bottom-sheet-mock' },
      props.children
    );
  });
  BottomSheet.displayName = 'MockBottomSheet';
  const BottomSheetBackdrop = (props) =>
    React.createElement(RN.View, props);
  const BottomSheetView = ({ children, ...rest }) =>
    React.createElement(RN.View, rest, children);
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetBackdrop,
    BottomSheetView,
  };
});

// gesture-handler: minimal stub. RootView vira View, gestos no-op.
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...rest }) =>
      React.createElement(RN.View, rest, children),
    Directions: {},
    State: {},
    PanGestureHandler: ({ children }) => children,
    TapGestureHandler: ({ children }) => children,
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pan: () => ({ onUpdate: () => ({}), onEnd: () => ({}) }),
      Tap: () => ({ onEnd: () => ({}) }),
    },
  };
});
