module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // reanimated/plugin DEVE ser o ultimo (Armadilha A1)
    plugins: ['react-native-reanimated/plugin'],
  };
};
