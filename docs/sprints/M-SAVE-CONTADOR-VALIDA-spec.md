# Sprint I-CONTADOR — M-SAVE-CONTADOR-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Save de contador "dias sem X". Edge cases: criar contador, reset
(preserva histórico — decisão durável M31/M32 §1.8).

## §2 Tarefa

- **Writer**: `src/lib/vault/contadores.ts` — `vaultUriJoin`. Path
  `markdown/contador-slug.md`. Schema `contador.ts` v2 (M32): `titulo`,
  `data_inicio`, `historico_resets[] = [{data, motivo?}]`,
  `dias_sem` (computed), `autor`.
- **Caller**: `app/contadores/novo.tsx` (criar) +
  `app/contadores/[slug].tsx` (reset) — try/catch+timeout.
- **Tests**: `tests/lib/vault/contadores.test.ts` — criar + 3 resets +
  histórico preservado.
- **E2E**: `tests/e2e/playwright/m-save-contador.e2e.ts`.
- **Screenshots**: `A-contador-criado.png`, `A-contador-reset.png`.

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# Criar contador "Sem refrigerante", data_inicio hoje.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/contador-sem-refrigerante.md
# Reset depois: ver historico_resets[] preservado.
```

## §6 Commit

```
feat: i-contador save contador valida criar reset historico
```

## §7 Decisões

- **Reset adiciona ao `historico_resets[]`**: nunca apaga histórico
  (M32 §1.8). `dias_sem` computado a partir do reset mais recente.
