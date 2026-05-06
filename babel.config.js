module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Transforma import.meta para um objeto vazio. Necessario porque
      // zustand devtools middleware usa import.meta.env (sintaxe Vite)
      // que quebra em Metro/Hermes (Web e Mobile). Sem esse plugin, o
      // bundle web nao carrega e dispara SyntaxError no boot.
      ['babel-plugin-transform-import-meta', { module: 'ES6' }],
      // worklets/plugin DEVE ser o ultimo (Armadilha A1). SDK 54 +
      // Reanimated 4 mudaram de 'react-native-reanimated/plugin'
      // para 'react-native-worklets/plugin'. Em dev funcionava por
      // fallback do transformer, mas release Hermes minificado
      // quebrava worklets silenciosamente, causando crash imediato
      // no boot do APK preview/production. Confirmado 2026-05-06.
      'react-native-worklets/plugin',
    ],
  };
};
