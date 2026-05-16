# R-OPS-4 — M-OPS-BRANCH-PROTECTION

**Tipo**: infra
**Estimativa**: 0.5h
**Tranche**: R-OPS
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-OPS → R-OPS-4.

Settings GitHub: `main` requer PR + smoke verde + Gauntlet verde + 1 review (mesmo solo, força auto-review explícito).

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R-OPS-1 (workflow de status checks)

## OFF-LIMITS

Padrão T1. Configuração GitHub web UI (não-versionada). **Documentar em** `docs/RELEASE.md`.

## Verificação canônica

```bash
./scripts/smoke.sh
gh api repos/AndreBFarias/ouroboros-mobile/branches/main/protection
```

## Proof-of-work

1. Documentação atualizada.
2. Hash do commit (apenas docs).
3. Path do worktree + branch.
4. Screenshot da configuração no GitHub.
