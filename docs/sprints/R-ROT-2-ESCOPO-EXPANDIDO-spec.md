# R-ROT-2 — M-ROTINAS-ESCOPO-EXPANDIDO

**Tipo**: docs + feature (mínimo código)
**Prioridade**: P3-low
**Estimativa**: 1-2h
**Tranche**: R-ROT
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-ROT → R-ROT-2.

Rotinas serve para **qualquer coisa recorrente**: medicação, hábitos, leitura. Categorias visíveis no form de criação: Medicação, Saúde física, Hábito, Outro. Templates de exemplo: "Tomar remédio", "Tomar água", "Caminhar 30min". Empty state inclui exemplo não-exercício.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/rotinas/novo.tsx`, `src/lib/schemas/rotina.ts` (apenas campo `categoria`).

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
6. Documentação `docs/FEATURES-CANONICAS.md` §4.5 atualizada (categoria + templates).
7. Achados colaterais.
