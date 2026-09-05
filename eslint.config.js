// Configuracao ESLint flat-config (v9+).
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooks = require('eslint-plugin-react-hooks');

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
      'react-hooks': reactHooks,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      // AUDIT-P3-3 (2026-09-05): plugin de regras de hooks, ausente do
      // projeto desde o M01.1. Adocao em dois tempos, por decisao do dono
      // de 2026-07-29: rules-of-hooks entra ja' bloqueando; exhaustive-deps
      // entra como aviso porque corrigir array de dependencia muda
      // comportamento de runtime e exige validacao caso a caso.
      //
      // exhaustive-deps sobe para 'error' em sprint propria. Baseline
      // medido nesta sprint: 6 avisos em 5 arquivos. Sem arquivo de
      // supressoes, em nenhuma forma -- o padrao de lista de exclusao ja
      // falhou aqui com .ptbr-violations.txt.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // R-BUNDLE-LUCIDE-RESHIM (2026-05-21): bloqueia import root do
      // lucide-react-native fora do shim src/lib/icons.ts. Bypass quebra
      // tree-shake e infla bundle Hermes em ~650 KB (auditoria
      // R-BUNDLE-SIZE-AUDIT). Override do shim canonico fica no proximo
      // bloco com files: ['src/lib/icons.ts'].
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react-native',
              message:
                'Importe de @/lib/icons (shim de tree-shake). Bypass quebra bundle Hermes (R-BUNDLE-LUCIDE-RESHIM 2026-05-21).',
            },
          ],
        },
      ],
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
