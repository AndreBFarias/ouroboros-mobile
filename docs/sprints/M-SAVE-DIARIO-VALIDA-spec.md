# Sprint I-DIARIO — M-SAVE-DIARIO-VALIDA

```
DEPENDE:    H1, H2, H3, I-AUDIO (companion áudio se gravação)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1.5h
STATUS:     [todo]
```

> Segue padrão `_TEMPLATE-SAVE-FEATURE.md`.

## §1 Achado

Save de diário emocional falha em runtime. 3 modos: **trigger** (algo
ruim aconteceu), **vitória** (algo bom), **reflexão** (sem polaridade).
Se microfone foi usado, salvar áudio + companion (vide I-AUDIO).

## §2 Tarefa

- **Writer**: `src/lib/diario/saveDiario.ts` — usar `vaultUriJoin`. Path
  novo: `markdown/diario-YYYY-MM-DD-HHmm-slug.md` (H2). Schema
  `diario_emocional.ts` inclui: `data`, `modo`, `emocoes`, `texto`,
  `intensidade`, `audio_path` (opcional), `transcricao` (opcional),
  `autor`.
- **Caller**: `app/diario-emocional.tsx` — try/catch+timeout. Botão
  "Salvar". Se áudio gravado, salva áudio primeiro (I-AUDIO), depois
  diário com `audio_path` apontando.
- **Tests**: `tests/lib/diario/saveDiario.test.ts` — 3 modos + edge
  case com áudio + sem áudio.
- **E2E**: `tests/e2e/playwright/m-save-diario.e2e.ts` — 3 modos.
- **Screenshots**: `A-diario-trigger.png`, `A-diario-vitoria.png`,
  `A-diario-reflexao.png`.

## §3 Restrições

(Padrão.)

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="(diario|saveDiario)"
```

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding + diário modo trigger: emoção raiva, intensidade 7,
# texto "exemplo".
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/diario-*.md
# Modo vitória: emoção alegria, intensidade 8.
# Modo reflexão: sem emoção, texto longo.
```

## §6 Commit

```
feat: i-diario save diario emocional 3 modos resilient
```

## §7 Decisões

- **Salva áudio antes do diário**: se diário save falha, áudio fica
  órfão mas é recuperável via filename canônico. Inverso (diário com
  `audio_path` apontando para arquivo que falhou) é pior.
