# R-OPS-3 — M-OPS-CACHE-CI

**Tipo**: infra
**Estimativa**: 1-2h
**Tranche**: R-OPS
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-OPS → R-OPS-3.

Cachear `node_modules` e Gradle no workflow → reduzir tempo de CI em 30-50%.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: `.github/workflows/build-android-apk.yml` (apenas adicionar steps de cache — com aprovação).

## Verificação canônica

```bash
./scripts/smoke.sh
# Run CI 2x: tempo segunda execucao -30% a -50%
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Hash do commit.
3. Path do worktree + branch.
4. Tempo de CI antes/depois (2 runs comparados).
