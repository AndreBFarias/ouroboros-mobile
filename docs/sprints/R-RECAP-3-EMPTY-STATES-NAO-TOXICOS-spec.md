# R-RECAP-3 — M-RECAP-EMPTY-STATES-NAO-TOXICOS

**Tipo**: feature + copywriting
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-RECAP
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-RECAP → R-RECAP-3.

Recap atual mostra "0 conquistas" — lê como acusação. Filosofia: nem reforço positivo (gamificação proibida ADR-0005) nem acusação. Tom: **constatação serena**.

Pool de 10+ variações em `src/lib/copy/recap-empty-states.ts` com seed determinística por `period+ano+semana`.

## Dependências

- **Bloqueia**: R-RECAP-2 (empty "0" não-tappable depende deste)
- **Bloqueado por**: R0 (lexical)

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `src/lib/copy/recap-empty-states.ts`, `src/components/screens/RecapScreen.tsx` para condicional render.

## Verificação canônica

```bash
./scripts/smoke.sh
```

**Auditoria de tom obrigatória pelo dono** antes de fechar — revisão manual das 10+ frases.

## Proof-of-work

1. Lista de arquivos criados/modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Lista das 10+ frases (PT-BR com acento completo).
7. Comprovação de idempotência (mesma semana → mesma frase em 2 runs).
8. Achados colaterais.
