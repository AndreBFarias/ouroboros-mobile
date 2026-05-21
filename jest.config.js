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
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
  ],
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
  },
};
