# R-HOME-3 — M-HOJE-TODO-INLINE-CHECK

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 1-2h
**Tranche**: R-HOME
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-HOME → R-HOME-3.

Checkbox 32dp (hitSlop 16) à esquerda de cada tarefa na Home. Tap = check instantâneo (≤16ms perceived) + animação Moti 200ms + strike-through. Persistência otimista — Vault write em background. Erro: rollback visual + toast. "Desfazer" toast 5s.

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: R-HOME-1

## OFF-LIMITS

Padrão T1. **Pode tocar**: componente novo `<CheckboxTarefaInline>`, `src/lib/tarefas/saveTarefa.ts` (apenas leitura — pode rever), secao Tarefas da Home.

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
6. E2E completo: mark + reload + assert + undo.
7. Achados colaterais.
