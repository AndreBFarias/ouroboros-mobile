// Custom test environment: estende o react-native-env (que extends
// NodeEnvironment) e força jest.useRealTimers() antes do super.teardown().
//
// Restaura setImmediate/setTimeout/setInterval reais no global, mitigando
// R-INFRA-JEST-LEAK-HUNT-5 — fakeTimers herdado cross-suite contamina
// setImmediate usado por flushMicroTasks() do @testing-library/react-native,
// causando timeout em afterEach global do RTL na proxima suite.
//
// O teardown da environment roda DEPOIS de todos os afterEach do teste,
// mas ANTES de jest descartar o worker. Garantir realTimers aqui significa
// que mesmo se um teste deixou fakeTimers ativo (early throw, it() faltando
// restore), a proxima suite no mesmo worker comeca sempre em estado limpo.
//
// IMPORTANTE: estende react-native-env (NodeEnvironment + customExportConditions
// 'react-native'), nao jest-environment-jsdom. JSDOM tem setImmediate
// implementado de forma incompativel com setImmediate de Node, e
// flushMicroTasks do RTL ficaria esperando indefinidamente.
//
// Mantemos .js puro (CJS) — extensao .ts exigiria que jest-expo transforme
// o arquivo de environment, mas environments rodam fora do pipeline de
// transform.

const RNEnv = require('react-native/jest/react-native-env.js');

class RealTimersFirstEnvironment extends RNEnv {
  async teardown() {
    // Restaura timers reais antes do cleanup posterior. Em ambiente
    // normal isso e' redundante (afterEach simetrico ja restaurou). Em
    // ambiente flake (it() sem restore, early throw) garante que o
    // estado nao vaze para a proxima suite no worker.
    try {
      if (
        this.global &&
        typeof this.global.jest !== 'undefined' &&
        typeof this.global.jest.useRealTimers === 'function'
      ) {
        this.global.jest.useRealTimers();
      }
    } catch (_e) {
      // Defensivo: se this.global ja foi limpo, ignore.
    }
    await super.teardown();
  }
}

module.exports = RealTimersFirstEnvironment;
module.exports.default = RealTimersFirstEnvironment;
module.exports.TestEnvironment = RealTimersFirstEnvironment;
