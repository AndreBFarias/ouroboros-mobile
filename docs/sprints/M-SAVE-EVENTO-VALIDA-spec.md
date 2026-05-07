# Sprint I-EVENTO — M-SAVE-EVENTO-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Segue padrão `_TEMPLATE-SAVE-FEATURE.md`.

## §1 Achado

Save de evento falha. Edge cases: positivo, negativo, com/sem foto, com/sem bairro detectado via `expo-location`.

## §2 Tarefa

- **Writer**: `src/lib/eventos/saveEvento.ts` — `vaultUriJoin`. Path
  `markdown/evento-YYYY-MM-DD-slug.md`. Schema `evento.ts` inclui:
  `data`, `titulo`, `tipo` ('positivo' | 'negativo'), `local`,
  `bairro` (opcional, auto-detectado), `descricao`, `fotos: string[]`
  (paths companion), `autor`, `para`.
- **Caller**: `app/eventos.tsx` — try/catch+timeout. Botão "Salvar evento".
- **Tests**: `tests/lib/eventos/saveEvento.test.ts` — positivo+negativo,
  com+sem foto, com+sem bairro.
- **E2E**: `tests/e2e/playwright/m-save-evento.e2e.ts`.
- **Screenshots**: `A-evento-positivo.png`, `A-evento-negativo.png`,
  `A-evento-com-foto.png`.

## §3-§4 (Padrão)

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# Evento "Café com amigo", positivo, com bairro auto, 1 foto.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/evento-*.md
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/jpg/foto-*.jpg
```

## §6 Commit

```
feat: i-evento save evento valida positivo negativo foto bairro
```

## §7 Decisões

- **Foto salva como evento separado** (com companion próprio em
  `markdown/foto-...md`) ou referência embutida no evento? Default:
  referência (path no campo `fotos: string[]`), foto tem companion
  próprio. Permite re-uso da foto em outro evento se necessário.
