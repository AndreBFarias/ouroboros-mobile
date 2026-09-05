// Configuracao Jest migrada do package.json#jest (R-INFRA-JEST-LEAK-HUNT-5).
//
// Causa raiz do flake (descoberta nesta sprint, complementa hunt-4):
// jest.useFakeTimers() default substitui setImmediate, queueMicrotask
// e process.nextTick por versoes fake. O flushMicroTasks() do
// @testing-library/react-native (chamado em todo afterEach) e' definido
// como:
//
//     function flushMicroTasks() {
//       return new Promise(resolve => setImmediate(resolve));
//     }
//
// Em ambiente NORMAL (real timers), setImmediate dispara no proximo
// tick e a Promise resolve em <1ms. Em ambiente com fakeTimers herdado
// de suite anterior (cross-worker leak), setImmediate fica em escala
// de tempo simulado e nunca dispara — afterEach trava ate testTimeout
// (15s default). Mesmo testes que NAO usam fakeTimers herdam quando
// estao no mesmo worker pool de uma suite anterior que vazou.
//
// Fix canonico: `fakeTimers.doNotFake` no jest config global. Garante
// que setImmediate/queueMicrotask/nextTick SEMPRE sejam reais, mesmo
// quando jest.useFakeTimers() e' chamado sem argumentos (config local
// herda do global via spread em _toSinonFakeTimersConfig). Validado:
// 10/10 runs verde, 276 suites, 2580 testes.
//
// Defesa em profundidade adicional:
//
//   - testEnvironment custom (tests/__env__/rn-realtimers.js): restaura
//     jest.useRealTimers() antes de super.teardown(), prevenindo leak
//     entre arquivos do mesmo worker se algum teste por bug deixar
//     fakeTimers ativo apos seu afterEach.
//
//   - jest.afterEach.cjs adiciona beforeEach global que restaura
//     realTimers antes de cada teste (forward order; user beforeEach
//     ainda pode ativar fakeTimers depois).
//
//   - tests/components/chrome/MenuLateral.test.tsx ganhou afterEach
//     simetrico no describe K1 (it() chamavam useFakeTimers sem
//     restaurar).
//
// Documentacao: https://jestjs.io/docs/configuration#faketimers-object

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.afterEach.cjs'],
  testTimeout: 15000,
  maxWorkers: 2,
  fakeTimers: {
    // R-INFRA-JEST-LEAK-HUNT-5: nunca mockar setImmediate/queueMicrotask/
    // nextTick. Sao primitivos do flushMicroTasks() do RTL — sem isso,
    // afterEach trava 15s quando fakeTimers vaza cross-suite.
    doNotFake: ['queueMicrotask', 'setImmediate', 'nextTick'],
  },
  // AUDIT-P3-7 (2026-09-05): piso de cobertura contra REGRESSAO. Nao e'
  // piso aspiracional -- a decisao do dono (2026-07-29) fixou "patamar
  // atual medido, arredondado para baixo", justamente para que qualquer
  // queda apareca sem que o piso nasca vermelho.
  //
  // Medicao desta sprint (`npx jest --coverage --ci`, duas execucoes,
  // 374 suites / 3567 testes, ~37s cada). Vale a MENOR das leituras:
  //
  //   leitura 1: 74.53 stmts | 63.43 branch | 74.12 funcs | 76.25 lines
  //   leitura 2: 74.56 stmts | 63.44 branch | 74.18 funcs | 76.29 lines
  //   piso      = floor(menor) = 74 / 63 / 74 / 76
  //
  // Divergencia registrada: a decisao do dono cita 62 em branches, medido
  // sobre 2026-07-28 (62.83%). Hoje branches mede 63.43% e a REGRA da
  // propria decisao (floor do medido) da 63. A regra e' o arredondamento
  // para baixo, nao uma folga escolhida caso a caso, entao o valor segue
  // a regra. Os outros tres numeros batem com os literais da decisao.
  //
  // ONDE O PISO E' COBRADO: apenas no job `coverage-floor` do
  // .github/workflows/ci.yml, que e' um job SEPARADO do `quality-gate`.
  // Fora do `npm test` (package.json nao passa --coverage), fora do
  // scripts/smoke.sh e fora do pre-push. Motivo: a AUDIT-P3-1 pretende
  // promover `quality-gate` a required status check, e piso rente ao
  // medido dentro de um gate obrigatorio bloqueia merge por ruido
  // decimal. Para coletar localmente: `npm run test:coverage`.
  //
  // DUAS ARMADILHAS de quem for mexer aqui:
  //
  //   1. Nao existe `collectCoverageFrom` (deliberado). O Jest so
  //      instrumenta os arquivos EFETIVAMENTE carregados, entao o
  //      denominador e' dinamico: um PR que so acrescenta um teste
  //      importando um modulo grande e pouco coberto AUMENTA o
  //      denominador e pode derrubar o percentual global. A folga mais
  //      apertada e' `functions` (74.12% medido contra piso 74, ~4
  //      funcoes em 2964). Se isso reprovar um PR que so' somou teste,
  //      o certo e' remedir e reaplicar a regra do floor -- nao afrouxar
  //      o piso a olho.
  //
  //   2. Threshold global vale para QUALQUER invocacao com --coverage.
  //      Depois desta config, `npx jest <subconjunto> --coverage` sem
  //      `--collectCoverageFrom` reprova por threshold, porque o
  //      subconjunto carrega poucos arquivos. Ao medir um arquivo so',
  //      restrinja o escopo:
  //      `npx jest tests/lib/stores/persist.test.ts --coverage \
  //         --collectCoverageFrom='src/lib/stores/persist.ts'`
  coverageThreshold: {
    global: {
      statements: 74,
      branches: 63,
      functions: 74,
      lines: 76,
    },
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  // testEnvironment custom: estende react-native-env (node + RN export
  // conditions) e restaura realTimers antes do super.teardown como
  // defesa em profundidade. NAO usa jsdom — setImmediate de jsdom e
  // incompativel com flushMicroTasks do RTL.
  testEnvironment: '<rootDir>/tests/__env__/rn-realtimers.js',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|moti|react-clone-referenced-element|@react-native-picker|@react-navigation|nativewind|react-native-css-interop|lucide-react-native)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^yaml$': '<rootDir>/node_modules/yaml/dist/index.js',
    '^lucide-react-native/dist/esm/icons/(.*)\\.mjs$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
    // env.json (credenciais OAuth) e gitignored e ausente no CI. Todo
    // import estatico de env.json resolve para um fixture de mock, para
    // as suites nao dependerem do arquivo real. Testes que precisam de
    // valores especificos sobrescrevem via jest.mock/doMock local.
    '(\\.\\./)+env\\.json$': '<rootDir>/tests/__fixtures__/env.mock.json',
  },
};
