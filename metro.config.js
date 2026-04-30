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

module.exports = withNativeWind(config, { input: './global.css' });
