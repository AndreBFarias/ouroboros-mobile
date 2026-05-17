# R-INFRA-METRO-CACHE-GC — GC cache Metro órfão

**Tipo**: infra
**Prioridade**: P3-low
**Estimativa**: 1-2h
**Fase**: 3
**Origem**: achado R-DX-GAUNTLET-MULTI-PORTA (commit `e8e0d62`)

## Problema

`/tmp/metro-cache/<bucket>/<hash>` mantém transformed code de worktrees já deletados. Sintoma: stack traces e source maps em bundle de novo worktree referenciam paths fantasmas (ex: `agent-a865c1c5a6f9ac202` que não existe mais).

Não afeta runtime visível (cache é só metadata), mas é fonte real de instabilidade em multi-worktree intensivo.

## Solução

Hook periódico de limpeza por GC: cruzar `git worktree list` com paths em cache.

```bash
# scripts/gc-metro-cache.sh
ACTIVE_WTS=$(git worktree list --porcelain | grep "^worktree " | awk '{print $2}')
for cache_dir in /tmp/metro-cache/*/; do
  # Inspeciona metadata pra ver worktree origem
  # Se worktree não está mais em git worktree list, remove o cache
done
```

Pode rodar:
- Manualmente após `git worktree remove`
- Via hook `post-checkout` ou `post-rewrite`
- Cron diário se quiser passivo

## Entregáveis

- `scripts/gc-metro-cache.sh` (novo)
- `gauntlet.sh`: chamar GC opcional no início (flag `--gc`)
- Doc em `docs/GAUNTLET.md` seção "Limpeza de cache órfão"

## OFF-LIMITS

**Pode tocar**: criar script, estender gauntlet.sh (não-bloqueante), doc.

**Não pode tocar**: metro.config.js (R-DX-GAUNTLET-MULTI-PORTA entregou), node_modules.

## Verificação

```bash
# Setup
git worktree add .claude/worktrees/test-gc
cd .claude/worktrees/test-gc && ./gauntlet.sh &
sleep 60 && kill %1
cd ../../.. && git worktree remove --force .claude/worktrees/test-gc
# Cache antes de gc:
find /tmp/metro-cache -name "*test-gc*" | head -3
./scripts/gc-metro-cache.sh
# Cache depois de gc:
find /tmp/metro-cache -name "*test-gc*" | wc -l  # esperado 0
```

## Decisão

- P3 porque cache órfão é metadata, não afeta runtime visível.
- Pode coexistir com R-DX-GAUNTLET-MULTI-PORTA (DX.2 já mergeada).
