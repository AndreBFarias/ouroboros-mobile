# R-DX-2 — M-DX-GAUNTLET-RECORD-VIDEO

**Tipo**: infra
**Estimativa**: 2-3h
**Tranche**: R-DX
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-DX → R-DX-2.

Comando `npm run gauntlet:record` grava MP4 do fluxo Playwright. Já temos screenshots; vídeo facilita revisão pós-sprint.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1. **Pode tocar**: `package.json` (apenas adicionar script — com aprovação), `tests/e2e/playwright/playwright.config.ts`.

## Verificação canônica

```bash
./scripts/smoke.sh
npm run gauntlet:record  # gera MP4
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Hash do commit.
3. Path do worktree + branch.
4. Vídeo de exemplo em `docs/gauntlet-videos/exemplo.mp4`.
