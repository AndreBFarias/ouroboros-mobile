# R-SF-3 — M-SAUDE-FISICA-MARCACAO-RAPIDA-MED

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-SF
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-SF → R-SF-3.

Botão "marcar" (32dp, hitSlop 16) em cada item de Rotina recorrente. Tap registra `{ rotina_id, marcado_em: <ISO-timestamp> }` em `rotinas/<id>/historico-<data>.md`. Histórico visível como timeline + % aderência semanal. Lembrete silenciado se marcado antes.

Caso de uso primário do dono: marcar "Venvanse" em 1 tap.

## Dependências

- **Bloqueia**: nenhuma
- **Bloqueado por**: R-ROT-1 (compartilha inteligência temporal)

## OFF-LIMITS

Padrão T1. **Pode tocar**: novo `src/lib/rotinas/marcacao.ts`, `src/components/rotinas/BotaoMarcar.tsx`, esquema de histórico.

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
6. E2E com 3 marcações + histórico visível + lembrete silenciado.
7. Achados colaterais.
