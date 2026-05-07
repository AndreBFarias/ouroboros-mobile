# Sprint I-VIDEO — M-SAVE-VIDEO-VALIDA

```
DEPENDE:    H1, H2, H3, J1 (permissão CAMERA)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Save de vídeo via FAB+ verde → "Vídeo" — fluxo similar a foto mas binário maior.

## §2 Tarefa

- **Writer**: `src/lib/midia/capturarVideo.ts` — `vaultUriJoin`. Path
  `mp4/video-YYYY-MM-DD-rand.mp4` + companion
  `markdown/video-YYYY-MM-DD-rand.md` com `duracao_ms`, `dimensions`.
- **Caller**: MenuCapturaVerde item "Vídeo" — try/catch+timeout (15s para
  vídeos longos), race fix BottomSheet.
- **Tests**: `tests/lib/midia/capturarVideo.test.ts`.
- **E2E**: `tests/e2e/playwright/m-save-video.e2e.ts`.
- **Screenshots**: `A-video-salvo.png`.

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# FAB+ verde → "Vídeo" → gravar 10s → confirmar.
adb shell run-as com.ouroboros.mobile ls -lh /sdcard/Documents/Ouroboros/mp4/
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/video-*.md
```

## §6 Commit

```
feat: i-video save video resilient
```

## §7 Decisões

- **Timeout 15s** (vs 10s default): vídeos >30s podem demorar para copy.
