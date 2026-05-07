# Sprint I-SCANNER — M-SAVE-SCANNER-VALIDA

```
DEPENDE:    H1, H2, H3, J1 (permissão CAMERA)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~2h (inclui ML Kit OCR)
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Save de nota fiscal via Scanner (M09). Edge cases: 1 página JPG,
multi-página → PDF consolidado, OCR confiança baixa (<0.8 → revisar=true).

## §2 Tarefa

- **Writer**: `src/lib/scanner/saveNota.ts` — `vaultUriJoin`. Paths:
  - 1 página: `jpg/scanner-slug.jpg` + `markdown/scanner-slug.md`.
  - Multi: `pdf/scanner-slug.pdf` + `markdown/scanner-slug.md`.
- **OCR**: `extrairTexto()` (M09, ML Kit lazy require). Salva campo
  `ocr_confianca` no companion.
- **Caller**: `app/scanner/preview.tsx` — try/catch+timeout. Banner
  "Revisar campos" se confiança <0.8 (ADR-0009 zod).
- **Tests**: `tests/lib/scanner/saveNota.test.ts` — 1pg, multipg, OCR
  confiança baixa.
- **E2E**: pular Gauntlet (ML Kit é nativo). Validação humana adb obrigatória.
- **Screenshots**: `A-scanner-1pg.png`, `A-scanner-multi-pdf.png`.

## §5 Validação adb (obrigatória — ML Kit é nativo)

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding + permissão CAMERA + FAB+ verde → "Scanner" → "Capturar nota".
# Documento simples 1 pg → confirmar.
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/jpg/scanner-*.jpg
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/scanner-*.md
# Multi-pg: 3 páginas → PDF.
adb shell run-as com.ouroboros.mobile ls -lh /sdcard/Documents/Ouroboros/pdf/scanner-*.pdf
```

## §6 Commit

```
feat: i-scanner save nota valida 1pg jpg + multipg pdf + ocr companion
```

## §7 Decisões

- **OCR roda APÓS save do binário**: se OCR falha, .md companion ainda
  é criado com `ocr_confianca: 0` (revisar=true) e usuário corrige
  manualmente.
