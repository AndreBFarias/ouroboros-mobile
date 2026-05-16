# R-OPS-1 — M-OPS-GITHUB-ACTIONS-RELEASE-FLOW

**Tipo**: infra
**Estimativa**: 3-4h
**Tranche**: R-OPS
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-OPS → R-OPS-1.

Workflow GitHub Actions completo: tag `v*` → build APK via EAS local → upload artifact → criar GitHub Release com APK + CHANGELOG entry. Atualmente parece manual.

## Dependências

- **Bloqueia**: M41 (release final automatizado)
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: `.github/workflows/release.yml` (criar — com aprovação explícita do dono pra mudanças em `.github/workflows/`).

## Verificação canônica

```bash
./scripts/smoke.sh
gh workflow run release.yml --ref v1.0.0  # dry-run
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Hash do commit.
3. Path do worktree + branch.
4. Dry-run do workflow OK.
