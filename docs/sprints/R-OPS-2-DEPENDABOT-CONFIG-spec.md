# R-OPS-2 — M-OPS-DEPENDABOT-CONFIG

**Tipo**: infra
**Estimativa**: 0.5h
**Tranche**: R-OPS
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-OPS → R-OPS-2.

`.github/dependabot.yml` com policy: npm weekly, GitHub Actions weekly, security updates immediate. **Excluir** upgrades majors de Expo/RN/Reanimated (alto risco em alpha).

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `.github/dependabot.yml` (com aprovação para `.github/`).

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos criados.
2. Hash do commit.
3. Path do worktree + branch.
