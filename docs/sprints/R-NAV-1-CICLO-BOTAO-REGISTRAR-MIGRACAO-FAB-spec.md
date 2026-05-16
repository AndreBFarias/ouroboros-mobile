# R-NAV-1 — M-CICLO-BOTAO-REGISTRAR-MIGRACAO-FAB

**Tipo**: refactor (UX)
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Tranche**: R-NAV
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-NAV → R-NAV-1.

Remover botão "Registrar hoje" inline na tela de Ciclo. Padronizar com FAB+ canônico (alinhado via Q22.D `useSafeBottomMargin`). FAB+ abre sheet com "Registrar hoje" + outras opções (sintomas, anotação livre).

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/ciclo/index.tsx`, `src/components/ciclo/SheetRegistroCiclo.tsx`, FAB+ canônico.

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
6. E2E fluxo completo (FAB+ → sheet → registrar).
7. Achados colaterais.
