// Mock de react-native para suites de logica que so precisam de Platform.OS
// controlado (backup/vault/services/boot/dev/integracoes).
//
// SDK 56: o react-native-css-interop (runtime do NativeWind) acessa varios
// modulos de react-native no module-init -- disparado cedo pelo getter
// global.fetch do "winter" runtime do Expo SDK 56 (jest-expo setup). Mockar
// react-native so com Platform (como bastava no SDK 54) quebra essas suites
// no load com TypeError. Este helper fornece stubs no-op dos modulos que o
// css-interop toca no init: Appearance, AppState, AccessibilityInfo,
// Dimensions, I18nManager, PixelRatio. Lista mapeada de
// react-native-css-interop/src/runtime/native/{appearance,unit}-observables.
//
// Uso (dentro do factory de jest.mock, que so aceita require, nao closures):
//   jest.mock('react-native', () => require('<rel>/__support__/rnCssInteropMock.cjs')('android'));
//
// Comentarios sem acento (convencao shell/CI).
module.exports = function rnCssInteropMock(os) {
  return {
    __esModule: true,
    Platform: {
      OS: os,
      select: (specifics) =>
        specifics && (os in specifics ? specifics[os] : specifics.default),
    },
    Appearance: {
      getColorScheme: () => 'dark',
      addChangeListener: () => ({ remove: () => {} }),
    },
    AppState: {
      currentState: 'active',
      addEventListener: () => ({ remove: () => {} }),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => {} }),
    },
    Dimensions: {
      get: () => ({ width: 412, height: 892, scale: 2, fontScale: 1 }),
      addEventListener: () => ({ remove: () => {} }),
    },
    I18nManager: { isRTL: false },
    PixelRatio: {
      get: () => 2,
      getFontScale: () => 1,
      getPixelSizeForLayoutSize: (n) => Math.round(n * 2),
      roundToNearestPixel: (n) => Math.round(n),
    },
  };
};
