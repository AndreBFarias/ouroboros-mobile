# Sprint I-AGENDA — M-SAVE-AGENDA-VALIDA

```
DEPENDE:    H1, H2, H3, I2-OAUTH (sem erro 400)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1h
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

M37.1.2 implementou cache agenda em .md individual. Validar que continua
funcionando após H1+H2+H3 + OAuth fix (I2-OAUTH).

## §2 Tarefa

- **Writer**: `src/lib/vault/agenda.ts` (já feito M37.1.2) — auditar
  uso de `vaultUriJoin`. Path muda em H2 para
  `markdown/agenda-pessoa_a-YYYY-MM-DD-eventId.md`.
- **`sincronizarSnapshotAgenda`** continua entry point principal —
  apenas adapta paths.
- **Tests**: `tests/lib/vault/agenda.test.ts` (já tem 19 cases) —
  validar paths novos.
- **E2E**: `tests/e2e/playwright/m37-1-2-cache-agenda-md.e2e.ts` (já
  existe) — confirmar que continua passando.
- **Screenshots**: re-capturar `A-agenda-md-individual.png` com novo
  layout.

## §5 Validação adb

```bash
# Após I2-OAUTH funcionando:
adb shell pm clear com.ouroboros.mobile
# Onboarding + permissões + agenda → Conectar Google.
# Após OAuth completar:
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/markdown/agenda-*.md
```

## §6 Commit

```
feat: i-agenda valida pos h1 h2 h3 + i2-oauth
```

## §7 Decisões

- **Migração de paths antigos**: boot hook `migrarVaultLayoutPorTipo`
  (de H2) cobre. Não precisa migration específica desta sprint.
