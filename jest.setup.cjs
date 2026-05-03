// Setup global do jest para o app expo. Mocks dos pacotes nativos que
// nao rodam fora do dispositivo. Convencao: tudo que toca animacao,
// haptic ou storage e silenciado aqui para os testes smoke.

// Reanimated: usa o mock oficial.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Worklets: nada a fazer no ambiente de teste. M25 ampliou o mock
// para cobrir simbolos que o reanimated/index.ts usa em module-init
// quando o arquivo de teste (ou source) importa diretamente
// react-native-reanimated. Ate M25 todo uso passava por moti (que ja
// esta mockado), entao runOnJS/runOnUI bastavam. Com OuroborosLoader
// importando Animated.createAnimatedComponent direto, precisamos
// expor createSerializable, executeOnUIRuntimeSync, RuntimeKind,
// serializableMappingCache, WorkletsModule, makeShareable,
// isWorkletFunction, callMicrotasks como no-ops.
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  createSerializable: (value) => value,
  makeShareable: (value) => value,
  isWorkletFunction: () => false,
  executeOnUIRuntimeSync: (fn) => fn,
  callMicrotasks: () => undefined,
  serializableMappingCache: {
    set: () => undefined,
    get: () => undefined,
  },
  RuntimeKind: { UI: 'UI', Worker: 'Worker', Default: 'Default' },
  WorkletsModule: {},
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
    RadialGradient: stub('RadialGradient'),
    Ellipse: stub('Ellipse'),
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

// expo-notifications: mock in-memory de schedule. Mantem identifiers
// agendados num Map para que listarAgendados/cancelar funcionem nos
// testes sem tocar API nativa.
jest.mock('expo-notifications', () => {
  const memory = new Map();
  const categorias = new Map();
  const canais = new Map();
  return {
    __esModule: true,
    SchedulableTriggerInputTypes: {
      DAILY: 'daily',
      WEEKLY: 'weekly',
      TIME_INTERVAL: 'timeInterval',
    },
    AndroidImportance: {
      MIN: 1,
      LOW: 2,
      DEFAULT: 3,
      HIGH: 4,
      MAX: 5,
    },
    AndroidNotificationVisibility: {
      UNKNOWN: 0,
      PUBLIC: 1,
      PRIVATE: 2,
      SECRET: -1,
    },
    getPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, canAskAgain: true })
    ),
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, canAskAgain: true })
    ),
    scheduleNotificationAsync: jest.fn(({ identifier, content, trigger }) => {
      memory.set(identifier, { identifier, content, trigger });
      return Promise.resolve(identifier);
    }),
    cancelScheduledNotificationAsync: jest.fn((identifier) => {
      memory.delete(identifier);
      return Promise.resolve();
    }),
    getAllScheduledNotificationsAsync: jest.fn(() =>
      Promise.resolve(Array.from(memory.values()))
    ),
    setNotificationCategoryAsync: jest.fn((id, actions) => {
      categorias.set(id, actions);
      return Promise.resolve();
    }),
    setNotificationChannelAsync: jest.fn((id, channel) => {
      canais.set(id, channel);
      return Promise.resolve();
    }),
    __memory: memory,
    __categorias: categorias,
    __canais: canais,
  };
});

// expo-local-authentication: mock controlavel. Default: hardware on,
// enrolled, success em authenticate. Testes podem sobrescrever.
jest.mock('expo-local-authentication', () => ({
  __esModule: true,
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

// expo-sharing: mock em modo "disponivel" e shareAsync resolvendo.
jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// expo-av: mock minimo do Audio.Recording. Testes que precisam
// inspecionar comportamento detalhado do recording sobrescrevem com
// jest.mock local (ver MicrofoneButton.test.tsx).
jest.mock('expo-av', () => ({
  __esModule: true,
  Audio: {
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(() => Promise.resolve()),
      startAsync: jest.fn(() => Promise.resolve()),
      stopAndUnloadAsync: jest.fn(() => Promise.resolve()),
      getURI: jest.fn(() => 'file:///cache/mock.m4a'),
      getStatusAsync: jest.fn(() =>
        Promise.resolve({ canRecord: false, durationMillis: 1000 })
      ),
      setOnRecordingStatusUpdate: jest.fn(),
    })),
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true })
    ),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

// expo-speech-recognition: mock minimo. Substituiu @react-native-voice/voice
// (deprecated, conflito de manifest no Gradle 8). Testes que precisam
// disparar eventos sobrescrevem com jest.mock local capturando o callback
// passado em addListener.
jest.mock('expo-speech-recognition', () => ({
  __esModule: true,
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    isRecognitionAvailable: jest.fn(() => true),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// jszip: usa o real (puro JS, sem nativo) para nao reimplementar a
// API toda em mock. So precisa do path correto via moduleNameMapper.

// M22: PermissionsAndroid e expo-intent-launcher mockados para que
// inicializarVaultCanonico() rode em testes sem tocar APIs nativas.
// Default: request resolve 'granted', Intent resolve resultCode -1
// (ok vazio). Testes especificos sobrescrevem com mockResolvedValueOnce
// para simular cenario de probe falhando (vide A19).
//
// O barrel 'react-native' resolve PermissionsAndroid via
// require('./Libraries/.../PermissionsAndroid').default. Por isso o mock
// precisa expor tanto .default (CommonJS) quanto as chaves (ESM).
jest.mock(
  'react-native/Libraries/PermissionsAndroid/PermissionsAndroid',
  () => {
    const stub = {
      request: jest.fn().mockResolvedValue('granted'),
      check: jest.fn().mockResolvedValue(true),
      requestMultiple: jest.fn().mockResolvedValue({}),
      PERMISSIONS: {
        WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
        READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      },
    };
    return { __esModule: true, default: stub, ...stub };
  }
);

jest.mock('expo-intent-launcher', () => ({
  __esModule: true,
  startActivityAsync: jest.fn().mockResolvedValue({ resultCode: -1 }),
  ActivityAction: {
    APPLICATION_DETAILS_SETTINGS:
      'android.settings.APPLICATION_DETAILS_SETTINGS',
    MANAGE_APP_ALL_FILES_ACCESS_PERMISSION:
      'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
  },
}));

// expo-file-system/legacy: mock minimo para inicializarVaultCanonico
// e tests de probe write+read+delete. memoria interna por arquivo;
// makeDirectoryAsync no-op idempotente; StorageAccessFramework devolve
// granted=true por default. Substituivel por jest.mock local quando o
// teste precisa simular EACCES ou cancelamento de SAF.
jest.mock('expo-file-system/legacy', () => {
  const memory = new Map();
  const dirs = new Set();
  return {
    __esModule: true,
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    makeDirectoryAsync: jest.fn((uri) => {
      dirs.add(uri);
      return Promise.resolve();
    }),
    getInfoAsync: jest.fn((uri) =>
      Promise.resolve({
        exists: memory.has(uri) || dirs.has(uri),
        isDirectory: dirs.has(uri),
        uri,
      })
    ),
    writeAsStringAsync: jest.fn((uri, content) => {
      memory.set(uri, content);
      return Promise.resolve();
    }),
    readAsStringAsync: jest.fn((uri) => {
      if (!memory.has(uri)) {
        return Promise.reject(new Error(`ENOENT: ${uri}`));
      }
      return Promise.resolve(memory.get(uri));
    }),
    deleteAsync: jest.fn((uri) => {
      memory.delete(uri);
      return Promise.resolve();
    }),
    StorageAccessFramework: {
      requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({
        granted: true,
        directoryUri:
          'content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FOuroboros',
      }),
    },
    __memory: memory,
    __dirs: dirs,
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
