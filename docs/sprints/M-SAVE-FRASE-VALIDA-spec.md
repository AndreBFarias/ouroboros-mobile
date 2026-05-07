# Sprint I-FRASE — M-SAVE-FRASE-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1h (mais simples — só texto)
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Save de frase (FAB+ verde → "Frase") — texto livre + SeletorPara M33.

## §2 Tarefa

- **Writer**: `src/lib/midia/salvarFrase.ts` — `vaultUriJoin`. Path
  `markdown/frase-YYYY-MM-DD-slug.md` (slug = primeiras 5 palavras
  kebab-case). Frontmatter: `texto`, `data`, `autor`, `para`.
- **Caller**: `SheetFrase` (componente do MenuCapturaVerde) —
  try/catch+timeout.
- **Tests**: `tests/lib/midia/salvarFrase.test.ts` — slug generation +
  collision (frase com mesmo prefixo no mesmo dia → suffix `-2`).
- **E2E**: `tests/e2e/playwright/m-save-frase.e2e.ts`.
- **Screenshots**: `A-frase-salva.png`.

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# FAB+ verde → "Frase" → texto "exemplo de frase do dia" → salvar.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/frase-*-exemplo-de-frase-do-dia.md
```

## §6 Commit

```
feat: i-frase save frase resilient slug + para
```

## §7 Decisões

(Padrão.)
