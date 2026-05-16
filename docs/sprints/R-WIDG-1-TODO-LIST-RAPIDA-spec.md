# R-WIDG-1 — M-WIDGET-TODO-LIST-RAPIDA

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 4-6h
**Tranche**: R-WIDG
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-WIDG → R-WIDG-1.

Widget homescreen "Quick To-do" 4x2:
- Campo de texto + botão "+"
- Tap adiciona tarefa ao Vault sem abrir o app (configuration activity ou direct intent)
- Tarefa visível em `/tarefas` na próxima abertura
- Widget atualiza count de tarefas pendentes a cada save

Combinado com M20.x (validação Nível B widget — backlog).

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: M20 (widget base, já `[ok]`), R0

## OFF-LIMITS

Padrão T1. **Pode tocar**: módulo Android nativo do widget (`android/app/src/main/java/.../widget/`), `app/widget-config.tsx` (configuration activity).

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
6. Validação Nível C: widget adicionado à home, tarefa criada via widget, tarefa visível em `/tarefas`.
7. Achados colaterais.
