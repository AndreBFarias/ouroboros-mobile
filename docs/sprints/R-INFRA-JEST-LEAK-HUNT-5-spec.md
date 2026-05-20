# R-INFRA-JEST-LEAK-HUNT-5 — Refator estrutural Jest projects + ordering afterEach

**Tipo**: bug fix infra (refator estrutural)
**Prioridade**: P1-high
**Estimativa**: 4-8h
**Fase**: 3
**Origem**: hunt-4 (`R-INFRA-JEST-LEAK-HUNT-4-spec.md`) identificou causa raiz empiricamente mas não conseguiu fix dentro de OFF-LIMITS originais. Causa raiz: colisão `jest.useFakeTimers()` herdado cross-suite  `flushMicroTasks()` do RTL.

## Diagnóstico acumulado (hunt-4 entregou)

**Causa raiz confirmada empiricamente:**

```js
// node_modules/@testing-library/react-native/build/flush-micro-tasks.js
function flushMicroTasks() {
  return new Promise(resolve => setImmediate(resolve));
}
```

Quando `jest.useFakeTimers()` persiste cross-suite (24 arquivos usam),
`setImmediate` herda mock e nunca dispara → timeout 15s em todo
`afterEach` do RTL → cascata de falhas no resto da suite. Suite que
falha muda a cada run porque ordem de execução é aleatória.

**5 hipóteses testadas e reverteram (evidência em log /tmp/final-workerlimit-10.log):**
- RAF polyfill global → piorou
- agendarBackup setInterval cleanup → piorou (eager-load)
- `workerIdleMemoryLimit` 256MB/512MB → mesmo do baseline (memória não é gargalo)
- `jest.useRealTimers()` global no afterEach → 0/5 (LIFO de afterEach impede)
- `maxWorkers=1` → drasticamente pior
- `RNTL_SKIP_AUTO_DETECT_FAKE_TIMERS` → quebra detect dinâmico

**Status hunt-4:** 1/10 verde após todos os fixes (vs 0/7 baseline). Push bloqueado.

## Escopo (3 fixes estruturais)

### A. Migrar `package.json#jest` → `jest.config.js` com `projects`

Separar testes em 2 projects pra isolar workers:

```js
// jest.config.js
module.exports = {
  projects: [
    {
      preset: 'jest-expo',
      displayName: 'lib',
      testMatch: [
        '<rootDir>/tests/lib/**/*.test.ts',
        '<rootDir>/tests/schemas/**/*.test.ts',
      ],
      setupFiles: ['<rootDir>/jest.setup.cjs'],
      // SEM RTL, SEM fakeTimers cross-contamination
    },
    {
      preset: 'jest-expo',
      displayName: 'components',
      testMatch: [
        '<rootDir>/tests/components/**/*.test.tsx',
        '<rootDir>/tests/app/**/*.test.tsx',
      ],
      setupFiles: ['<rootDir>/jest.setup.cjs'],
      setupFilesAfterEnv: ['<rootDir>/jest.afterEach.cjs'],
      // RTL + fakeTimers isolado em workers próprios
    },
  ],
  maxWorkers: 2,
  testTimeout: 15000,  // reverter workaround temporário
};
```

### B. Custom test environment força `useRealTimers` ANTES do RTL afterEach

`tests/__env__/jsdom-realtimers.ts` (ou jest custom env):

```ts
import JSDOMEnvironment from 'jest-environment-jsdom';

class RealTimersFirstEnvironment extends JSDOMEnvironment {
  async teardown() {
    // Garante que setImmediate volte ao real antes do RTL cleanup
    if (typeof this.global.jest !== 'undefined' && typeof this.global.jest.useRealTimers === 'function') {
      this.global.jest.useRealTimers();
    }
    await super.teardown();
  }
}

module.exports = RealTimersFirstEnvironment;
```

Registrar em `jest.config.js`:
```js
testEnvironment: '<rootDir>/tests/__env__/jsdom-realtimers.ts',
```

### C. Auditoria sistemática dos 24 arquivos com `useFakeTimers`

```bash
rg -l "jest\.useFakeTimers" tests/
```

Para cada arquivo:
- Garantir `afterEach(() => jest.useRealTimers())` está presente.
- Garantir que mesmo em early throw (`it()` rejeita), `afterEach`
  consegue restaurar. Usar `try/finally` se necessário ou
  `beforeEach(() => jest.useFakeTimers())` + `afterEach(() => jest.useRealTimers())`
  pattern simétrico.

## Achados colaterais (durante hunt-4) — viram sprints próprias

1. **R-INFRA-WORKTREE-ENV-SYMLINK** — `env.json` + `node_modules` somem em worktrees criados via `git worktree add`. Bloqueia 6 suites por module-not-found e cascata. Fix: `.claude/worktree-init.sh` automático.

2. **R-INFRA-GOOGLE-AUTH-FLOW-TEST-FIX** — `tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts` falha determinística por `jest.mock('../../../env.json')` não sobrescrever (path resolution via require.cache).

3. **R-MICROFONE-USE-AFTER-UNMOUNT** — `src/components/diario/MicrofoneButton.tsx:248` promise chain `stopAndUnloadAsync().then(() => discardRecording(uri))` sem check de unmount. Mesmo pattern hunt-3.

4. **R-INTEGRACOES-CANCELADO-PATTERN** — `src/components/screens/IntegracoesScreen.tsx:245-264` usa `let cancelado` (não bugado, mas refator pra `AbortController` ou mountedRef pra consistência com hunt-3).

## OFF-LIMITS

**Pode tocar (escopo aumentado vs hunt-4):**
- `jest.config.js` (novo, substituir `package.json#jest`)
- `package.json#jest` (remover, migrar pra config separado)
- `jest.setup.cjs`, `jest.afterEach.cjs`
- `tests/__env__/*` (novo, custom test environment)
- `tests/**/*.test.*` (corrigir useFakeTimers pattern)
- Mocks de `moti`, `react-native-reanimated` em `__mocks__/`

**Não pode tocar:**
- `src/components/brand/`, `src/components/ui/` (já auditados)
- Stores em produção
- Schemas, vault, hooks de domínio

## Verificação canônica

```bash
# Critério forte: 10 runs verde
for i in {1..10}; do
  npm test --silent 2>&1 | grep "Test Suites:" | tail -1
  echo "---run $i---"
done

# Crítério adicional: reverter workaround testTimeout=60s (commitado em hunt-4 workaround) pra 15s
grep "testTimeout" jest.config.js
# Esperado: 15000 (defesa diagnóstica do hunt fase 1)
```

## Proof-of-work

1. `jest.config.js` com projects + test env custom (diff completo).
2. Lista dos 24 arquivos auditados com useFakeTimers (correção aplicada).
3. **10/10 runs verde** sem `retryTimes`/`forceExit`/`testTimeout>15s`.
4. Reversão de `testTimeout: 60000` → `15000`.
5. Hash commit.

## Contexto operacional

Hunt-4 deixou workaround temporário `testTimeout: 60000` em
`package.json` pra destravar push de 10 commits. Esta sprint REVERTE
esse workaround após 10/10 verde. Workaround foi explícito (commit
mensagem documenta como TODO).
