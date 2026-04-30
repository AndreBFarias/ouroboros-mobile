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
      // reanimated/plugin DEVE ser o ultimo (Armadilha A1)
      'react-native-reanimated/plugin',
    ],
  };
};
