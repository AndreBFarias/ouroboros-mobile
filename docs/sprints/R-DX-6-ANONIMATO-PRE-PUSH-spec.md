# R-DX-6 — M-DX-ANONIMATO-PRE-PUSH

**Tipo**: infra
**Estimativa**: 0.5-1h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-DX → R-DX-6.

Reforçar `scripts/check_anonimato.sh` rodando como hook `pre-push` (atualmente é pre-commit; pre-push captura amend retroativo).

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `hooks/pre-push` (não existe ainda).

## Verificação canônica

```bash
./scripts/smoke.sh
git commit --amend -m "test: violacao anonimato Claude" && git push  # deve bloquear
```

## Proof-of-work

1. Lista de arquivos criados.
2. Hash do commit.
3. Path do worktree + branch.
4. Demo de bloqueio (amend retroativo com Claude no nome — push falha).
