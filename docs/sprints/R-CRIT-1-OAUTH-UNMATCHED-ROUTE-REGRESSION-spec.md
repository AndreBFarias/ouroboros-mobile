# R-CRIT-1 — M-OAUTH-UNMATCHED-ROUTE-REGRESSION

**Tipo**: fix (regression de Q22.B)
**Prioridade**: P0-critical
**Estimativa**: 2-4h
**Tranche**: R-CRIT
**Fase**: 1 (bloqueia F1 — field test não roda sem agenda)

## Fonte canônica

Briefing completo em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-CRIT → R-CRIT-1.

**Sintoma**: após consent screen do Google, app cai em "Unmatched
Route" exibindo `ouroboros://oauthredirect?...&code=...` na UI.

**Hipóteses técnicas**:
- `maybeCompleteAuthSession` não chamado em algum cenário (cold vs warm boot)
- Esquema `ouroboros://oauthredirect` não registrado como rota declarativa
- Regressão introduzida entre alpha-9 (`d8e594a` funcional) e alpha-11 (`ea10ce8`)

**Sub-sprint colateral R-CRIT-1.a**: Unmatched Route não pode imprimir URL bruta (vaza `code` OAuth).

## Dependências

- **Bloqueia**: R-INT-1, R-INT-3, F1 (field test)
- **Bloqueado por**: R0 (lexical) — pode rodar em paralelo se OAuth não tocar copy

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/lib/services/googleAuthFlow.ts`,
`app/_layout.tsx`, `src/lib/services/oauthFlow.ts` (se existir),
listeners de deep link. **Pode revisar**: `app.json` scheme array
(mas mudança vai precisar de aprovação explícita).

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test minimo:
adb logcat -c
adb shell am start -n com.ouroboros.mobile/.MainActivity
# Trigger OAuth via Drawer → Agenda → Conectar
adb logcat -d --pid=$(adb shell pidof com.ouroboros.mobile) | grep -iE "oauth|deeplink|unmatched"
```

## Proof-of-work

1. Lista de arquivos modificados.
2. **Diff do `_layout.tsx` mostrando `maybeCompleteAuthSession` top-level preservado**.
3. Saída `npx jest --silent | tail -5`.
4. Saída `./scripts/smoke.sh`.
5. **Hash do commit (OBRIGATÓRIO)**.
6. Path do worktree + branch.
7. Caso E2E novo `tests/e2e/playwright/oauth-redirect.e2e.ts` (mock deep link).
8. Diff de `git log d8e594a..HEAD -- src/lib/services/googleAuthFlow.ts app/_layout.tsx` analisado para identificar regressão.
9. Achados colaterais.
