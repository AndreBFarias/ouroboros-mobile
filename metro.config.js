const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Forca Metro a resolver pacotes pelo condition "react-native" mesmo
// no bundle web. Sem isso, o resolver pega a versao ESM (.mjs) de
// alguns pacotes (ex: zustand) que usam `import.meta.env`, sintaxe
// que o Metro/Hermes nao trata. Resultado anterior: tela branca com
// SyntaxError "Cannot use 'import.meta' outside a module".
config.resolver.unstable_conditionNames = ['require', 'react-native', 'default'];
config.resolver.unstable_enablePackageExports = true;

// M37.1: react-native-calendars usa imports relativos sem extensao
// (./period, ./basic, ./marking) que apontam para pastas com index.js.
// Metro com unstable_enablePackageExports falha em resolver esses
// paths em algumas combinacoes. Custom resolveRequest desambigua
// localmente para esse pacote.
const path = require('path');
const fs = require('fs');
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
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

module.exports = withNativeWind(config, { input: './global.css' });
