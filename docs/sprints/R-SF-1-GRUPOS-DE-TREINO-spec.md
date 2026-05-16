# R-SF-1 — M-SAUDE-FISICA-GRUPOS-DE-TREINO

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-SF
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SF → R-SF-1.

Q19 fechou schema + form de Grupos. Esta sprint **expõe** Grupos dentro de Saúde Física (atualmente só via Rotinas):
- Nova aba "Grupos" em `/saude-fisica`
- CRUD completo de Grupo na aba
- FAB+ com opção "Iniciar Treino" → sheet seletor de Grupo → executor Q11.c
- Rotinas continua tendo acesso paralelo

Idempotência: Rotinas e Saúde Física compartilham mesmo store.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0 (lexical)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/screens/SaudeFisicaScreen.tsx`, novo `src/components/saude-fisica/GruposTab.tsx`, FAB+ da tab.

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Screenshot Gauntlet em `docs/sprints/R-SF-1-screenshots-gauntlet/`.
7. Achados colaterais.
