// Setup global pos-framework. Roda em setupFilesAfterEnv, tem acesso
// a beforeAll/afterEach. Objetivos:
//
// 1. (fase 2 / R-INFRA-JEST-LEAK-HUNT) drenar timers module-scoped
//    de escreverEstado.ts que sobrevivem ao unmount React entre testes.
//
// 2. (hunt-5 / R-INFRA-JEST-LEAK-HUNT-5) restaurar useRealTimers como
//    DEFESA EM PROFUNDIDADE no beforeEach (forward order: roda antes
//    do user beforeEach; user ainda pode ativar useFakeTimers depois).
//    Combina com `fakeTimers.doNotFake` em jest.config.js que ja
//    garante setImmediate/queueMicrotask/nextTick reais sempre.
//
// Sintoma original do leak cross-suite: "Exceeded timeout of 15000 ms
// for a hook" no afterEach do RTL quando fakeTimers vaza cross-suite.
// cleanupAsync faz `await unmountAsync()` que precisa que microtasks
// drenem; com fakeTimers ativo SEM doNotFake, microtasks ficam em
// escala de tempo simulado e nunca resolvem.

// Cancela debounce de escreverEstado.ts (cada chamada de salvar gera
// setTimeout DEBOUNCE_MS armazenado em Map module-scoped). Em
// produção e' irrelevante (debounce vira gravacao em <100ms). Em
// testes que mockam fileSystem, o handle so dispara depois que o
// teste acabou, leaking. Stacktrace original:
//   "Cannot log after tests are done"
//   at Timeout.escreverEstadoCanonicoImediato [as _onTimeout]
//      (src/lib/vault/escreverEstado.ts:198:10)
//
// Usamos _resetEscreverEstado (sincrono, drena timers sem awaitar
// o write) ao inves de _flushDebounceEstado (async, gravaria no
// mock fileSystem -- pode disparar setState orfao em ToastProvider
// ja desmontado e re-triggar warning de "Cannot log after").
//
// resolverModulo defensivo: o moduleNameMapper @/ vale para fontes
// TS transformadas via jest-expo, mas o setupFilesAfterEnv roda no
// contexto do CJS puro. Usamos path relativo absoluto via path.resolve.
const path = require('path');
const ESCREVER_ESTADO_PATH = path.resolve(
  __dirname,
  'src',
  'lib',
  'vault',
  'escreverEstado.ts'
);

// HUNT-5: garante que cada teste comeca com timers reais. Custo zero
// quando ja em real timers (no-op). Defesa para it() que ativam
// useFakeTimers sem restore simetrico (ex: it com early throw).
beforeEach(() => {
  if (
    typeof globalThis.setTimeout?._isMockFunction === 'undefined' &&
    typeof globalThis.setTimeout?.clock === 'undefined'
  ) {
    return;
  }
  jest.useRealTimers();
});

afterEach(() => {
  try {
    // require resolve TS via jest-expo transformer; cache do require
    // garante mesma instancia do modulo carregado pelos testes.
    const mod = require(ESCREVER_ESTADO_PATH);
    if (typeof mod._resetEscreverEstado === 'function') {
      mod._resetEscreverEstado();
    }
  } catch (_e) {
    // modulo nao carregado neste teste; ignore.
  }
});
