// Setup global pos-framework. Roda em setupFilesAfterEnv, tem acesso
// a beforeAll/afterEach. Objetivo unico: drenar timers module-scoped
// que sobrevivem ao unmount da arvore React entre testes, causando
// handle leak no worker pool do Jest (sintoma: "Cannot log after
// tests are done" + worker forcado a exit, suites estourando timeout
// em paralelo enquanto passam isoladas).
//
// Fix de R-INFRA-JEST-LEAK-HUNT (fase 2).

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
