# R-DX-1 — M-DX-SPRINT-TEMPLATE-V2

**Tipo**: infra
**Estimativa**: 1h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-DX → R-DX-1.

Criar `docs/sprints/_TEMPLATE-FEATURE-V2.md` com seções: Contexto / Comportamento esperado / AC / Hipóteses técnicas / Dependências / Decisões abertas / Notas anti-débito. Hoje há apenas `_TEMPLATE-SAVE-FEATURE.md` para saves.

## Dependências

- **Bloqueia**: padronização de specs Q-series e M-series (seção 9 atualmente inconsistente)
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar template novo em `docs/sprints/`.

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos criados.
2. Hash do commit.
3. Path do worktree + branch.
