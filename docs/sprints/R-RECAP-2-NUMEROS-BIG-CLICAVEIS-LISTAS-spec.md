# R-RECAP-2 — M-RECAP-NUMEROS-BIG-CLICAVEIS-LISTAS

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-RECAP
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-RECAP → R-RECAP-2.

Big numbers no Recap → Números (ex. "12 humores", "3 conquistas") tappáveis abrem lista filtrada (tipo + período do Recap). Q24.a fechou parte; revalidar 100% dos big numbers.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0, R-RECAP-1, R-RECAP-3 (empty states "0" não-tappable)

## OFF-LIMITS

Padrão T1. **Pode tocar**: cards Números do Recap, `app/recap-lista.tsx`, query params `?periodo=&data=`.

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
6. Lista de big numbers auditados (100% dos tipos).
7. Achados colaterais.
