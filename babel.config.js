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
    env: {
      // AUDIT-P1-9 (2026-09-05): so' no ambiente de teste.
      //
      // babel-preset-expo preserva `import()` dinamico verbatim, e o VM
      // CJS do Jest rejeita com "A dynamic import callback was invoked
      // without --experimental-vm-modules". Como reagendarTodosBootHooks
      // isola a excecao de cada hook, o erro era engolido: TODO mock de
      // modulo registrava zero chamadas, e o teste passava verde tanto
      // com o hook plugado quanto sem ele. O flag supportsDynamicImport
      // do caller NAO resolve -- a saida do preset e' identica com true
      // e com false.
      //
      // Fora de `test` nada muda: no bundle Metro (mobile e web) o
      // import() dinamico funciona normalmente, e e' ele que quebra o
      // ciclo entre @/lib/boot/* e os modulos donos.
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
