// Configuracao ESLint flat-config (v9+).
// Mantem-se minima no M01.1; regras especificas serao adicionadas em M01.2+.
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'android/**',
      'ios/**',
      'assets/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // R-BUNDLE-LUCIDE-RESHIM (2026-05-21): bloqueia import root do
      // lucide-react-native fora do shim src/lib/icons.ts. Bypass quebra
      // tree-shake e infla bundle Hermes em ~650 KB (auditoria
      // R-BUNDLE-SIZE-AUDIT). Override do shim canonico fica no proximo
      // bloco com files: ['src/lib/icons.ts'].
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'lucide-react-native',
          message: 'Importe de @/lib/icons (shim de tree-shake). Bypass quebra bundle Hermes (R-BUNDLE-LUCIDE-RESHIM 2026-05-21).',
        }],
      }],
    },
  },
  {
    // Override: o proprio shim precisa importar do pacote root para
    // re-exportar named-imports. Sem este override o shim entraria
    // em conflito com a regra acima.
    files: ['src/lib/icons.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
