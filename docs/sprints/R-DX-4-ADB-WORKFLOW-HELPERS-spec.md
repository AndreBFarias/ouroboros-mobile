# R-DX-4 — M-DX-ADB-WORKFLOW-HELPERS

**Tipo**: infra
**Estimativa**: 1-2h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-DX → R-DX-4.

3 helpers em `scripts/`:
- `adb-pull-vault.sh` — pull do `/sdcard/Documents/Ouroboros/`
- `adb-logcat-app.sh` — filtra logs do app
- `adb-clear-data.sh` — reset estado para validação fresh

Complementa o `scripts/diag.sh` (criado em AUDIT-T3-DX).

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar 3 scripts em `scripts/`.

## Verificação canônica

```bash
./scripts/smoke.sh
./scripts/adb-pull-vault.sh /tmp/vault-snapshot
./scripts/adb-logcat-app.sh | head -20
```

## Proof-of-work

1. Lista de arquivos criados (3 scripts + permissão executável).
2. Hash do commit.
3. Path do worktree + branch.
