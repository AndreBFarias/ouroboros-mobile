# R-NAV-2 — M-ALARMES-SONS-FUNCIONAIS

**Tipo**: bug
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-NAV
**Fase**: 1 (promovido — sintoma original que motivou refundação v1.0)

## Fonte canônica

Briefing completo em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-NAV → R-NAV-2.

**Sintoma**: alarmes mudos — bug crítico que motivou a refundação
v1.0 mas ainda não foi totalmente eliminado.

**Hipóteses técnicas**:
- `expo-notifications` requer `sound` no canal Android nativo +
  arquivo em `android/app/src/main/res/raw/<sound>.mp3`
- HyperOS pode restringir alarmes em background sem "exact alarm"
  permission
- Snooze actions (M16) podem estar quebrando o canal

## Dependências

- **Bloqueia**: F1 (validação live) — bug crítico
- **Bloqueado por**: R0 (lexical, paralelo possível)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `src/lib/alarmes/*`,
`android/app/src/main/res/raw/`, `app.json` android.permissions
(com aprovação), canais de notificação canônicos.

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test:
# 1. Criar alarme via /alarmes/novo para t+30s
# 2. Aguardar disparo
# 3. Confirmar som audível no Xiaomi
adb logcat -d | grep -iE "alarm|notification|exoplayer"
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Sons CC0 ≥5 cadastrados em `android/app/src/main/res/raw/` (lista de paths).
7. Validação Nível C: 3 alarmes consecutivos disparam com som no Xiaomi 2312DRAABG.
8. Achados colaterais (snooze quebrado? permission exact alarm?).
