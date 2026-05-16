# R-NAV-3 — M-FAB-CONSISTENCIA-EDIT-DELETE

**Tipo**: refactor (UX)
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Tranche**: R-NAV
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-NAV → R-NAV-3.

Padrão de header consistente em todas as telas de edição: menu (esquerda) + título (centro) + ações `+` (salvar) e `−` (excluir) (direita). Confirmação de exclusão via Alert nativo.

Aplicar em: Alarme, Tarefa, Contador, Rotina, Evento, Conquista, Crise, Reflexão, Exercício, Grupo (10+ telas).

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0 (lexical), R-NAV-1 (FAB canônico)

## OFF-LIMITS

Padrão T1. **Pode tocar**: 10+ rotas `app/<feature>/[slug].tsx`, componente `<HeaderEdicao>` (criar).

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
6. E2E cobrindo salvar + excluir em 3 telas distintas.
7. Achados colaterais.
