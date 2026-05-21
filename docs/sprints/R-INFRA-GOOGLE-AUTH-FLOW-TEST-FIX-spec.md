# R-INFRA-GOOGLE-AUTH-FLOW-TEST-FIX — Flakiness em pickClientIdSafe.test

**Tipo:** fix (test infra)
**Prioridade:** P3-low (não bloqueou hunt-5 — passou no 10/10)
**Status:** `[ok-resolvido-em-hunt-5]` — flakiness resolvida implicitamente pelo `fakeTimers.doNotFake` global do hunt-5 (`b5a57bb`). Suite passa 10/10 isolada pré e pós-mudança. Único touch foi comentário durável de +12 linhas no test file explicando o achado (sem código novo).
**Estimativa:** 30min-1h
**Fase:** 3 (Onda 3K, achado colateral de R-INFRA-JEST-LEAK-HUNT-5)
**ADR sugerida:** nenhuma

## Contexto

`tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts`
apresenta flakiness determinística quando rodado em isolation:
`jest.mock('../../../env.json')` não sobrescreve via
`require.cache` em alguns runs. O hunt-5 (R-INFRA-JEST-LEAK-HUNT-5)
não conseguiu confirmar se essa flakiness é causa raiz do flake
JEST cross-suite, mas suite passou no critério 10/10 após o fix
global `fakeTimers.doNotFake`. Pode ter sido resolvido
implicitamente, ou flake intermitente persiste.

## Hipotese técnica

`jest.mock('../../../env.json')` em test file ativa
`virtualMocks`, mas se `env.json` foi carregado por outro test
no mesmo worker antes (via import direto em `googleAuthFlow.ts`),
o `require.cache` mantém referência antiga. `jest.resetModules()`
limparia, mas se falta no setup do teste, comportamento é
indeterminado.

Alternativa: usar `jest.doMock()` dentro de `beforeEach` (forma
imperativa, garante reset por teste) ou injetar factory.

## Escopo

### A. Investigação obrigatória

```bash
# Rodar suite isolada 10x para confirmar flakiness
for i in {1..10}; do
  npm test -- tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts --silent 2>&1 | grep "Tests:" | tail -1
  echo "run $i"
done

# Inspecionar test file
cat tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts
```

Se 10/10 verde → confirma que hunt-5 fix resolveu. Apenas documentar
o achado como resolvido. Se ainda flakey → aplicar fix técnico.

### B. Fix técnico (se 10/10 não atingido)

Substituir `jest.mock('../../../env.json')` por padrão `jest.doMock`
em `beforeEach`:

```ts
beforeEach(() => {
  jest.resetModules();
  jest.doMock('../../../env.json', () => ({
    installed: { client_id: 'test-client-id' },
  }));
});

afterEach(() => {
  jest.dontMock('../../../env.json');
});
```

E re-importar `googleAuthFlow` dentro de cada `it()` para garantir
módulo fresco.

### C. Documentação

Se o fix for aplicado, adicionar comentário inline na suite
explicando porque `doMock` é necessário ao invés de `jest.mock`
estático.

## OFF-LIMITS

**Pode tocar:**
- `tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts`

**Não pode tocar:**
- `src/lib/services/googleAuthFlow.ts` (código de produção)
- `env.json` real (gitignored, contém OAuth client_id)
- `env.json.example`
- Schemas, stores, outros tests
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`

## Verificação canônica

```bash
./scripts/check_anonimato.sh
./scripts/smoke.sh

# Crítico: 10 runs ISOLADO da suite affected
for i in {1..10}; do
  npm test -- tests/lib/services/googleAuthFlow-pickClientIdSafe.test.ts --silent 2>&1 | grep "Tests:" | tail -1
  echo "run $i"
done
# Esperado: 10/10 verde

# Sanity: smoke completo 3 runs
for i in 1 2 3; do
  npm test --silent 2>&1 | grep "Test Suites:" | tail -1
done
```

## Proof-of-work esperado

1. Reproducao da flakiness (ou confirmacao 10/10 verde apos hunt-5).
2. Se fix aplicado: diff do test file + 10/10 verde pós-fix.
3. Se não houver flakiness: spec marcada `[ok-resolvido-em-hunt-5]`
   sem código novo (registro durável).
4. Hash commit no worktree (se aplicável).

## Decisão

P3 porque não bloqueia nada hoje (hunt-5 atingiu 10/10 sem
investigar essa suite). Mas é dívida latente — `jest.mock` com
`require.cache` poluído pode reaparecer em outra suite. Fix
mecânico recomendado.

## Origem

Achado colateral do agente `a49390704fe24f1d3` ao executar
`R-INFRA-JEST-LEAK-HUNT-5`. Citado textualmente:
"Não consegui investigar — não rodei isolado, mas suite passou
no critério forte 10/10. Pode ter sido corrigido implicitamente
pelo doNotFake, ou estava passando antes mesmo do leak. Não posso
confirmar."
