# Sprint I-ALARME — M-SAVE-ALARME-VALIDA

```
DEPENDE:    H1, H2, H3, J1 (permissão NOTIFICATIONS)
BLOQUEIA:   I-TAREFA (alarme companion), [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Save de alarme falha. Edge cases recorrência: única, diária, semanal,
mensal. Cada uma agenda Notification channel (M30 Android 12+).

## §2 Tarefa

- **Writer**: `src/lib/vault/alarmes.ts` — `vaultUriJoin`. Path
  `markdown/alarme-slug.md`. Schema `alarme.ts` v2 (M30): `titulo`,
  `horario`, `recorrencia`, `dias_semana[]`, `categoria`, `som`,
  `soneca_min`, `ativo`, `data_unica` (se recorrencia=unica).
- **Caller**: `app/alarmes/novo.tsx` — try/catch+timeout. APÓS save,
  agendar notif via `agendarAlarme()` em `src/lib/services/alarmesNotificacoes.ts`.
- **Tests**: `tests/lib/vault/alarmes.test.ts` — 4 recorrências.
- **E2E**: `tests/e2e/playwright/m-save-alarme.e2e.ts`.
- **Screenshots**: `A-alarme-semanal.png`.

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# Alarme: "Acordar", 07:00, semanal, dias seg-sex, categoria geral.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/alarme-acordar.md
# Verificar agendamento via notif:
adb shell dumpsys alarm | grep ouroboros | head -5
```

## §6 Commit

```
feat: i-alarme save alarme valida 4 recorrencias + notif channel
```

## §7 Decisões

- **Save .md ANTES de agendar notif**: se notif scheduling falha,
  alarme persiste e pode ser re-agendado em boot hook.
