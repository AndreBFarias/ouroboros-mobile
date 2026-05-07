# Sprint I-AUDIO — M-SAVE-AUDIO-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   I-DIARIO (companion áudio)
ESTIMATIVA: ~2h
STATUS:     [todo]
```

> Segue padrão `_TEMPLATE-SAVE-FEATURE.md`.

## §1 Achado

Save de áudio (microfone do diário) falha. Edge cases: gravação curta
(<3s), longa (>30s), transcrição STT funciona, transcrição STT falha
(sem rede / módulo nativo ausente em Expo Go).

## §2 Tarefa

- **Writer**: `src/lib/diario/recordAudio.ts` (já existe via M06.5) — usar
  `vaultUriJoin`. Path novo: `m4a/audio-YYYY-MM-DD-rand.m4a` + companion
  `markdown/audio-YYYY-MM-DD-rand.md` com frontmatter `tipo: audio`,
  `duracao_ms`, `transcricao`, `origem: 'diario' | 'standalone'`,
  `autor`.
- **Caller**: `MicrofoneButton.tsx` — try/catch+timeout. Áudio salva
  mesmo se transcribe falha (transcribe é best-effort).
- **Tests**: `tests/lib/diario/recordAudio.test.ts` — mock recorder +
  verificar copy + companion criado.
- **E2E**: `tests/e2e/playwright/m-save-audio.e2e.ts` — Gauntlet com
  recorder mockado.
- **Screenshots**: `A-audio-gravando.png`, `A-audio-salvo.png`.

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding + permissão MIC + diário emocional + tap microfone.
# Gravar 5s, soltar.
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/m4a/audio-*.m4a
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/audio-*.md
# Frontmatter deve ter `transcricao` (mesmo vazia se STT falhou).
```

## §6 Commit

```
feat: i-audio save audio resilient transcribe best-effort
```

## §7 Decisões

- **Áudio salva ANTES de transcribe**: transcribe é best-effort, não
  bloqueia save.
- **Companion separado (não embutido no diário)**: permite re-uso.
