const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Forca Metro a resolver pacotes pelo condition "react-native" mesmo
// no bundle web. Sem isso, o resolver pega a versao ESM (.mjs) de
// alguns pacotes (ex: zustand) que usam `import.meta.env`, sintaxe
// que o Metro/Hermes nao trata. Resultado anterior: tela branca com
// SyntaxError "Cannot use 'import.meta' outside a module".
config.resolver.unstable_conditionNames = [
  'require',
  'react-native',
  'default',
];
config.resolver.unstable_enablePackageExports = true;

// M37.1: react-native-calendars usa imports relativos sem extensao
// (./period, ./basic, ./marking) que apontam para pastas com index.js.
// Metro com unstable_enablePackageExports falha em resolver esses
// paths em algumas combinacoes. Custom resolveRequest desambigua
// localmente para esse pacote.
const path = require('path');
const fs = require('fs');

// R-DX-GAUNTLET-MULTI-PORTA: shim de expo-router/_ctx.web.
//
// Em worktree paralelo (multiplos `gauntlet.sh` simultaneos em portas
// distintas), o cache compartilhado do Metro pode contaminar o
// EXPO_ROUTER_APP_ROOT que babel-preset-expo inlina em
// `node_modules/expo-router/_ctx.web.js` -- com nodes_modules sendo
// symlink, o realpath pode resolver no main repo e nao no worktree.
// Resultado: Chrome exibe "Welcome to Expo" porque o require.context
// indexa o `app/` errado.
//
// Solucao: quando `EXPO_ROUTER_APP_ROOT` esta exportado (gauntlet.sh
// em worktree exporta), interceptamos os requires de
// `expo-router/_ctx.web` (ou `.../node_modules/expo-router/_ctx.web.js`)
// e devolvemos o shim local `<projectRoot>/_ctx.web.local.js`. O shim
// chama `require.context('./app', ...)` com path literal -- Metro
// resolve `./app` relativo ao shim, ou seja, `<projectRoot>/app` do
// worktree atual. Bypass completo do babel-inline-env.
const projectRoot = __dirname;
const ctxShimPath = path.join(projectRoot, '_ctx.web.local.js');

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Shim de _ctx.web SO em worktree (EXPO_ROUTER_APP_ROOT exportado
  // por gauntlet.sh) e plataforma web. Casa tanto `expo-router/_ctx`
  // (resolucao por extensao .web.js) quanto requires diretos a
  // `_ctx.web` ou `_ctx.web.js`.
  if (
    process.env.EXPO_ROUTER_APP_ROOT &&
    platform === 'web' &&
    fs.existsSync(ctxShimPath) &&
    (moduleName === 'expo-router/_ctx' ||
      moduleName === 'expo-router/_ctx.web' ||
      moduleName === 'expo-router/_ctx.web.js' ||
      moduleName.endsWith('/expo-router/_ctx.web.js'))
  ) {
    return { type: 'sourceFile', filePath: ctxShimPath };
  }

  // M37.1: react-native-calendars imports relativos sem extensao.
  if (
    moduleName.startsWith('./') &&
    typeof context.originModulePath === 'string' &&
    context.originModulePath.includes('react-native-calendars/src/')
  ) {
    const dir = path.dirname(context.originModulePath);
    const candidates = [
      path.resolve(dir, `${moduleName}.tsx`),
      path.resolve(dir, `${moduleName}.ts`),
      path.resolve(dir, `${moduleName}.js`),
      path.resolve(dir, moduleName, 'index.tsx'),
      path.resolve(dir, moduleName, 'index.ts'),
      path.resolve(dir, moduleName, 'index.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return { type: 'sourceFile', filePath: c };
      }
    }
  }
  if (typeof originalResolver === 'function') {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// AUDIT-DX-E2E-WEB-WATCHER: subtrai os artefatos do runner e2e web da
// observacao do Metro.
//
// tests/e2e/harness/playwright.config.ts grava em <raiz>/test-results/ e
// <raiz>/playwright-report/ -- dentro da arvore que o Metro observa. Sem
// watchman instalado, o metro-file-map cai no FallbackWatcher, que faz
// fs.watch() diretorio a diretorio. O Playwright apaga o outputDir ao
// iniciar o run; quando isso acontece durante o crawl inicial do watcher,
// o fs.watch() sincrono sobre um diretorio que acabou de sumir lanca
// ENOENT nao tratado e mata o bundler:
//
//   Error: ENOENT: no such file or directory, watch '.../test-results/e2e-web'
//       at FallbackWatcher._watchdir (metro-file-map/.../FallbackWatcher.js:119)
//
// A partir dai todo caso devolve ERR_CONNECTION_REFUSED, e o sintoma
// aponta para o caso e2e em vez do bundler morto. So acontecia na SEGUNDA
// execucao seguida, porque na primeira o diretorio ainda nao existia
// quando o Metro subiu.
//
// A blockList chega ao watcher nesta versao do Metro (0.83.x): o
// createFileMap combina resolver.blockList em ignorePattern e o repassa
// como ignorePatternForWatch ao FallbackWatcher, que usa o padrao no
// filterDir do walker -- o diretorio nem chega a ser visitado, entao
// nunca entra em fs.watch.
//
// O padrao casa o SEGMENTO em qualquer profundidade porque o watcher
// testa o caminho nas duas formas: absoluto (filterDir, ignoreForCrawl) e
// relativo a raiz (doIgnore). Nao ha nenhum outro diretorio com esses
// nomes em app/, src/ ou node_modules/ -- se um dia houver, ele tambem
// sera ignorado pelo bundler.
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  /(^|[\\/])(test-results|playwright-report)([\\/]|$)/,
];

module.exports = withNativeWind(config, { input: './global.css' });
