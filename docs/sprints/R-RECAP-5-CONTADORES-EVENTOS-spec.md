# R-RECAP-5 — M-RECAP-CONTADORES-EVENTOS

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-CONT (coberto neste R-RECAP-5 também)
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-RECAP → R-RECAP-5 (e §R-CONT).

Contador hoje exibe apenas número de dias. Esta sprint:
- Botão "+ Evento" no detalhe do contador
- Evento aceita humor (slider), descrição, foto/áudio/vídeo, tags
- Persiste em `eventos/contador-<id>-<data>.md` (ou convenção a definir)
- Vista "Recap do Contador" com timeline de eventos + slideshow mídias

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R0, R-CRIT-3 (mídia ausente)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/contadores/[slug].tsx`, novo `src/components/screens/RecapContador.tsx`, schema `EventoContador`.

**Atenção**: se introduzir convenção nova de path (`eventos/contador-<id>-<data>.md`), **deve atualizar `VALIDATOR_BRIEF.md` §2.x** — vai precisar de aprovação explícita do maestro pra essa modificação.

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
6. Path convention proposta + aprovação do maestro registrada.
7. E2E: criação + leitura no recap.
8. Achados colaterais.
