# R-HOME-1 — M-HOJE-PRIORIDADE-RECORRENCIA

**Tipo**: refactor + redesign
**Prioridade**: P1-high
**Estimativa**: 4-5h
**Tranche**: R-HOME
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-HOME → R-HOME-1.

Tela Hoje repensada: prioridade + recorrência. Layout proposto:

1. Cabeçalho (data + saudação + atalho "Reflexão")
2. Próximos (até 3 itens, agenda + alarmes merged)
3. To-do hoje (até 5, checkboxes inline com persist otimista)
4. Status do Casal (condicional — Decisão D1)
5. Botão Recap → `/recap?periodo=dia&data=hoje`
6. FAB roxo + verde

**Remover**: card "Jornada".

**Decisão D1 = C** (dono confirmou em 2026-05-15): **remover ambos**
"Status do Casal" e "Humor+Última". Tela Hoje fica enxuta, foco
em ação (próximos + tarefas). ADR-0026 a registrar com Opção C.

## Dependências

- **Bloqueia**: R-HOME-2, R-HOME-3
- **Bloqueado por**: R0 (lexical), R-CRIT-3 (mídia), Decisão D1

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/index.tsx`, secoes Home (`src/components/screens/Tela01*.tsx`), novo ADR-0026.

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
6. Decisão D1 (A/B/C) citada + ADR-0026 criado.
7. Screenshot primeira-fold 412dp.
8. E2E novo: abrir tela, marcar tarefa, recarregar, tarefa permanece concluída.
9. Achados colaterais.
