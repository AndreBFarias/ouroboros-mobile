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
      // P6 (2026-09-08): congela o ternario de duas pessoas como padrao
      // proibido em codigo NOVO. A decisao do dono foi manter o teto de
      // duas agora e impedir que piore -- congelar, nao refatorar. O que
      // ja existe fica como esta.
      //
      // O seletor casa qualquer ConditionalExpression cujos DOIS ramos
      // resolvem para 'pessoa_a' ou 'pessoa_b'. Ele nao olha o teste, de
      // proposito: assim pega tanto a derivacao da outra pessoa
      // (`x === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a'`) quanto a coercao
      // que colapsa o universo em dois (`s === 'pessoa_b' ? 'pessoa_b' :
      // 'pessoa_a'`), e nao escapa pela variante com `!==`.
      //
      // O que ele deliberadamente NAO pega, para nao prometer o que nao
      // cumpre: ternario que deriva ATRIBUTO por pessoa em vez da pessoa
      // (`pessoa === 'pessoa_a' ? colors.purple : colors.pink`, 7 pontos
      // medidos). Aquilo e' outro defeito -- bypass de `corDe()` -- e cai
      // na P7, que torna a cor editavel. Misturar os dois aqui faria a
      // regra da P6 acusar territorio de outra decisao.
      //
      // Severidade 'warn', nao 'error', por dois motivos medidos:
      //   1. o baseline nao nasce verde -- 5 pontos em app/ src/
      //      (SeletorPara.tsx:60, SeletorPessoaDestino.tsx:56,
      //      devicesIndex.ts:115, seedDeterministico.ts:169,
      //      app/index.tsx:155). Como 'error' o smoke abortaria no ato;
      //   2. a alternativa seria allowlist por arquivo, e ela desligaria
      //      a regra para o arquivo INTEIRO -- inclusive app/index.tsx,
      //      que e' a Home e recebe codigo novo com frequencia. Seria um
      //      ponto cego exatamente onde o congelamento importa, e um
      //      override obsoleto nao avisa ninguem. Mesma leitura do bloco
      //      da AUDIT-P3-3 acima: sem arquivo de supressoes, em nenhuma
      //      forma.
      //
      // Sobe para 'error' quando os 5 pontos acima sairem -- na onda de
      // abertura para N pessoas, que ja' reescreve todos eles.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'ConditionalExpression[consequent.value=/^pessoa_[ab]$/][alternate.value=/^pessoa_[ab]$/]',
          message:
            'Ternário entre pessoa_a e pessoa_b assume exatamente duas pessoas: padrão congelado pela decisão P6 (2026-09-08). Em código novo, derive a pessoa por função sobre a lista de pessoas.',
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
