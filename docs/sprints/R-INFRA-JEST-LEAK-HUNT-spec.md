# R-INFRA-JEST-LEAK-HUNT — Caçar handle leak no worker pool Jest

**Tipo**: bug fix infra
**Prioridade**: P2-medium
**Estimativa**: 2-4h
**Fase**: 3
**Origem**: achado durá­vel R-INFRA-JEST-FLAKY-TIMEOUT fase 1 (commit pendente, baseline `0333b3c`)

## Diagnóstico (fase 1 entregou)

6 iterações de config-only descartadas. Causa raiz **NÃO é timeout**, é **handle leak no worker pool do Jest**:

```
A worker process has failed to exit gracefully and has been force exited.
This is likely caused by tests leaking due to improper teardown.
Active timers can also cause this, ensure that .unref() was called on them.
Try running with --detectOpenHandles to find leaks.
```

**Evidência**:
- Suítes que passam em <2s isoladas estouram timeout em paralelo
- Suíte falhante muda a cada run (FAB, Toast, Slider, RecapSecao*, ConfirmarExclusao, etc — não é teste específico quebrado)
- `--detectOpenHandles` desabilita worker pool e o leak não reproduz (3 suítes em 1.6s vs 60s+ em paralelo)

## Escopo

1. Rodar `npx jest --detectOpenHandles` em suítes hot-spot (FAB, Toast, RecapSecaoCrises, useToastUndo) capturando stacktrace literal do leak
2. Auditar componentes candidatos:
   - **`src/components/ui/Toast.tsx`** (SUSPECT #1 — auto-dismiss usa setTimeout)
   - **`src/components/ui/OuroborosLoader.tsx`** (Animated.createAnimatedComponent direto)
   - **`src/components/chrome/FAB*.tsx`** e **`FABMenu*.tsx`**
   - **`src/components/ui/Sheet*.tsx`** (gorhom mock retorna useImperativeHandle)
   - Buscar: `setTimeout` sem `clearTimeout` em useEffect cleanup, Promise pending sem cancelToken, zustand subscribers sem unsubscribe
3. Auditar `jest.setup.cjs` procurando mocks com factories que retornam Promise.resolve() em ciclo de vida (suspect #2)
4. Adicionar `afterEach` explícito `cleanup()` em suítes top-flaky para forçar serialização
5. **Critério forte**: smoke verde **10/10 runs consecutivos** sem `retryTimes` nem `forceExit` (workaround mascararia bug)

## Carry-over de R-INFRA-JEST-FLAKY-TIMEOUT fase 1

- `package.json`: `testTimeout: 15000` mantido como defesa diagnóstica (não mascara nada, só dá mensagem de erro melhor)
- `CHANGELOG.md` / `docs/CONTEXTO.md` — entradas honestas sobre o débito (commitadas)

## OFF-LIMITS

**Pode tocar**:
- `jest.setup.cjs`
- `src/components/ui/Toast.tsx`, `OuroborosLoader.tsx`, `Sheet*.tsx`
- `src/components/chrome/FAB*.tsx`, `FABMenu*.tsx`
- `tests/**/*.test.*` (adicionar afterEach explícito)
- `package.json#jest` (ajustes config defensivos)

**Não pode tocar**:
- Schemas, stores, vault, hooks de domínio
- Lógica de produção fora dos suspects

## Verificação canônica

```bash
# Critério forte: 10 runs consecutivos
for i in {1..10}; do
  ./scripts/smoke.sh 2>&1 | grep -E "Test Suites:|Tests:" | tail -2
  echo "---"
done
# Esperado: 10/10 verde, sem fail flaky
```

## Proof-of-work

1. `--detectOpenHandles` stacktrace de pelo menos 1 leak identificado
2. Lista de arquivos modificados (esperado: 1-3 componentes + maybe jest.setup.cjs)
3. **10/10 runs consecutivos verde** (logs anexos)
4. Hash do commit (OBRIGATÓRIO)
5. Branch do worktree
6. Achados colaterais

## Decisão

- P2 porque estabilizar smoke é pré-requisito pra validação confiável de futuras sprints
- Crítério forte 10/10: estabelece baseline determinístico
- Sprint 2-4h justificada pelo débito de ~30+ sprints sofrendo com flakiness intermitente
