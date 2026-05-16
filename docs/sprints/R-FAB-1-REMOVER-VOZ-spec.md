# R-FAB-1 — M-FAB-REMOVER-VOZ

**Tipo**: refactor
**Prioridade**: P2-medium
**Estimativa**: 0.5h
**Tranche**: R-FAB
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-FAB → R-FAB-1.

Botão "Voz" no FAB radial removido. Diário Emocional permanece acessível via MenuLateral + atalho "Reflexão" (pós R0).

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: R0 (atalho "Reflexão" existe pós R0)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/components/chrome/FAB*.tsx`, testes E2E que clicavam em "Voz".

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
6. Confirmação que Diário continua acessível por outros caminhos.
7. Achados colaterais.
