# R-RECAP-1 — M-RECAP-LISTA-ITENS-CLICAVEIS

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 3-4h
**Tranche**: R-RECAP
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-RECAP → R-RECAP-1.

Cada item nos agrupamentos do Recap (Conquistas/Crises/Evoluções/Tarefas) navega para detalhe canônico (`/diario/[id]`, `/conquista/[id]` etc.) — Stack `card` permitindo editar e voltar com scroll position.

Q24.a fechou cards Números clicáveis. Esta sprint estende para **todos os agrupamentos**.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0 (lexical), R-CRIT-3 (mídia nos detalhes)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/screens/RecapScreen.tsx`, `app/recap-lista.tsx`, `src/lib/hooks/useRecap.ts`, cards de agrupamento.

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
6. Caso E2E cobrindo Conquistas + Crises + Tarefas (Evoluções via fixture).
7. Achados colaterais.
