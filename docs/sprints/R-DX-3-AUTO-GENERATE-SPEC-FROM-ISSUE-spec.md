# R-DX-3 — M-DX-AUTO-GENERATE-SPEC-FROM-ISSUE

**Tipo**: infra + automation
**Estimativa**: 2-3h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-DX → R-DX-3.

Script `scripts/spec-from-issue.sh <num>` pega título + body de uma issue GitHub via `gh` CLI e gera skeleton de spec em `docs/sprints/`.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R-DX-1 (template v2 como base)

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `scripts/spec-from-issue.sh`.

## Verificação canônica

```bash
./scripts/smoke.sh
./scripts/spec-from-issue.sh 42  # gera spec exemplo
```

## Proof-of-work

1. Lista de arquivos criados.
2. Hash do commit.
3. Path do worktree + branch.
4. Saída do script rodando contra uma issue real.
