# R-INFRA-JEST-LEAK-HUNT-4 — Causa raiz do flake aleatório cross-suite

**Tipo**: bug fix infra (continuação)
**Prioridade**: P1-high (bloqueia push de qualquer commit que toque src/)
**Estimativa**: 4-6h
**Fase**: 3
**Origem**: 2 sprints anteriores (fase 2 + hunt-3) eliminaram leaks documentados em Toast.tsx + escreverEstado + SecaoBackupAutomatico, mas flake aleatório persistente. Cada run falha 1 suite diferente.

## Diagnóstico acumulado (fases anteriores)

- Fase 2 (`25ca020`): fix Toast cleanup + jest.afterEach.cjs com `_resetEscreverEstado` + `maxWorkers: 2`.
- Hunt-3 (`85979b3`): fix `SecaoBackupAutomatico` use-after-unmount (mountedRef).
- 8 ocorrências do pattern `let cancelado = false` auditadas — apenas SecaoBackupAutomatico estava bugado.

Pós-fixes: ainda 0/7 runs verde. Sempre 1 suite timeout, sempre diferente.

## Hipóteses suspeitas (do agent hunt-3)

1. **Moti pending springs** — `react-native-moti` deixa `requestAnimationFrame` pendente após unmount. RTL `afterEach` chama `cleanup()` que tenta unmount mas aguarda RAF que nunca dispara em jsdom.
2. **`Animated.loop()`/`withRepeat(-1)` ativos** — `OuroborosLoader`, `KenBurns`, animações infinitas. `cancelAnimation` em cleanup mas worklet pode bloquear.
3. **`requestAnimationFrame` global ausente em jest.setup.cjs** — vira `setTimeout(16)` no jsdom, acumula handles.
4. **Fake/real timer mixing** — algumas suites usam `jest.useFakeTimers()`, outras não. Cross-suite contamina worker.
5. **Zustand store sem reset entre suites** — `useVault`, `useSessao`, `useSettings`, `useTema`, `useToast` carregam estado.

## Escopo

### A. Investigação obrigatória

```bash
# Audit RAF/setTimeout/setInterval em moti, animation, brand
rg -n "requestAnimationFrame|withRepeat|Animated\.loop|setInterval" src/components/brand src/components/ui --type tsx --type ts
# Audit fake-timer mixing
rg -n "useFakeTimers|useRealTimers" tests/
# Audit zustand stores sem reset
rg -n "create<.*>\(" src/lib/stores/ --type ts
```

Documentar findings.

### B. Possíveis fixes (escolher 1-3 baseado em finding)

1. **Mock RAF global em jest.setup.cjs**:
   ```js
   global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
   global.cancelAnimationFrame = (id) => clearTimeout(id);
   ```

2. **Mock moti completo em jest.setup.cjs** (já existe parcial?):
   - Verificar `jest.mock('react-native-reanimated')` e `'moti'`.

3. **Zustand reset global no afterEach**:
   ```js
   afterEach(() => {
     useVault.setState(useVault.getInitialState());
     useSessao.setState(useSessao.getInitialState());
     // ...
   });
   ```
   Validar se stores expõem `getInitialState`.

4. **`workerIdleMemoryLimit: '500MB'`** em jest config — força worker restart antes de saturar handles.

### C. Critério forte

```bash
for i in {1..10}; do
  npm test --silent 2>&1 | grep "Test Suites:" | tail -1
done
```

Esperado: **10/10 verde**, sem retryTimes nem forceExit.

## OFF-LIMITS

**Pode tocar**:
- `jest.setup.cjs`, `jest.afterEach.cjs`
- `package.json#jest`
- `tests/__mocks__/*` (criar mocks globais se necessário)
- Mocks de `moti`, `react-native-reanimated` em `__mocks__/`

**Não pode tocar**:
- Código de produção em `src/components/brand/`, `src/components/ui/` (esses já foram auditados nas fases 2 + hunt-3; problema é em infra de teste, não em componentes).
- Stores (`src/lib/stores/*`) — reset deve ser via mock externo, não modificar store em produção.

## Proof-of-work

1. Stacktrace `--detectOpenHandles` da causa raiz.
2. Diff dos arquivos modificados.
3. **10/10 runs verde** (LOG completo).
4. Hash commit.

## Decisão

P1 porque destrava push de 8+ commits já mergeados em main locally (R-SEC-5, R-DX-ENFORCE-V2, R-SEC-3, R-METRO-GC, R-JEST-LEAK fase 2, hunt-3). Sem fix, qualquer mudança em `src/` ou outro arquivo testado bloqueia push pelo pre-push hook.

## Contexto operacional

**Orquestrador estará aguardando este fix pra empacotar push de todos os commits anteriores.** Critério 10/10 verde é gating crítico. Se infactível em <6h, escalar pra dono (decisão entre relaxar critério temporariamente vs. esperar fix completo).
