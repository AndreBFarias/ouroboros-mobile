# R-INFRA-EXPO-AV-MIGRACAO — Migrar expo-av para expo-audio + expo-video

> **Status:** `[todo]` — pré-requisito da onda Expo SDK 56 (não bloqueia v1.0.0 no SDK 54).
> **Tipo:** refactor · **Prioridade:** P2 (bloqueia SDK 56) · **Estimativa:** ~1–2 dias.
> **Origem:** achado da validação live SDK 56 no Xiaomi (2026-05-27).

## Contexto

O `expo-av` foi **removido do Expo SDK 56** (ausente do `bundledNativeModules`,
substituído por `expo-audio ~56.0.11` e `expo-video ~56.1.2`). A tentativa de upgrade
SDK 56 crashou no boot do device com:

```
java.lang.NoClassDefFoundError: Failed resolution of: Lexpo/modules/kotlin/types/LazyKType;
  at expo.modules.av.video.VideoViewModule.definition(VideoViewModule.kt:118)
```

O `AppContext` registra todos os módulos nativos no boot; a mera presença do `expo-av`
(que referencia `LazyKType`, removida do `expo-modules-core` 56) derruba o app. Enquanto
o `expo-av` for dependência, o projeto **não pode subir para o SDK 56**.

O SDK 54 (atual) ainda tem `expo-av@~16.0.8` funcional, então esta sprint **não é
urgente** — ela existe para desbloquear uma futura onda SDK 56.

## Inventário (12 arquivos)

### Áudio — `expo-av` `Audio` → `expo-audio` (10 arquivos)

| Arquivo | API usada |
|---|---|
| `src/lib/diario/recordAudio.ts` | `Audio.Recording`, `RecordingOptionsPresets`, `setAudioModeAsync`, `InterruptionModeAndroid` (núcleo) |
| `src/components/diario/MicrofoneButton.tsx` | `Audio.Recording` |
| `src/components/diario/TranscreverButton.tsx` | `Audio.Recording` |
| `app/diario-emocional.tsx` | `Audio.Recording` |
| `src/components/alarmes/PreviewSomButton.tsx` | `Audio.Sound` (playback) |
| `src/components/midia/WaveformPreview.tsx` | `Audio.Sound` |
| `src/components/screens/DetalheConquista.tsx` | `Audio.Sound` |
| `app/recap-memorias.tsx` | `Audio.Sound` |
| `src/lib/permissoes/requestOnboarding.ts` | `Audio.getPermissionsAsync` / `requestPermissionsAsync` |
| `src/lib/diario/permissions.ts` | `Audio.requestPermissionsAsync` |

### Vídeo — `expo-av` `Video` → `expo-video` (2 arquivos)

| Arquivo | API usada |
|---|---|
| `src/components/exercicios/MidiaExecucaoPlayer.tsx` | `Video`, `ResizeMode` |
| `app/_layout.tsx` | import de `expo-av` (verificar se é uso real ou morto) |

## Mapa de API (expo-av → expo-audio / expo-video)

- **Permissões:** `Audio.requestPermissionsAsync()` → `AudioModule.requestRecordingPermissionsAsync()`
  (função imperativa, sem hook — serve para `requestOnboarding.ts` / `permissions.ts`).
- **Gravação:** `new Audio.Recording()` + `prepareToRecordAsync` → hook `useAudioRecorder(preset)`
  **ou** o construtor imperativo `new AudioRecorder()` (verificar disponibilidade na versão).
  **Risco:** `recordAudio.ts` é lib imperativa (não-componente); se `expo-audio` só expõe
  gravação via hook, será necessário refatorar para um wrapper de componente ou usar a API
  imperativa de baixo nível. **Este é o ponto de maior risco da sprint.**
- **Playback:** `Audio.Sound.createAsync(src)` → `createAudioPlayer(src)` (imperativo) ou
  `useAudioPlayer(src)` (hook). Os 4 usos de `Audio.Sound` são em componentes (podem usar hook).
- **Vídeo:** `<Video source resizeMode={ResizeMode.X}/>` → `useVideoPlayer(src)` + `<VideoView player contentFit="X"/>`.
  `ResizeMode.CONTAIN/COVER` → `contentFit="contain"/"cover"`.

## Passos

1. Mapear cada um dos 12 arquivos; confirmar se `app/_layout.tsx` tem uso real de `expo-av`
   (provável import morto — remover).
2. Resolver o caso `recordAudio.ts` primeiro (maior risco): decidir entre wrapper de hook
   ou API imperativa de baixo nível do `expo-audio`. Validar gravação real no device.
3. Migrar playback (`Audio.Sound` → `useAudioPlayer`/`createAudioPlayer`) nos 4 componentes.
4. Migrar permissões (2 arquivos) para `AudioModule.*`.
5. Migrar vídeo (`MidiaExecucaoPlayer.tsx`) para `expo-video`.
6. `expo install expo-audio expo-video` + remover `expo-av` do `package.json`.
7. Atualizar mocks de teste (`jest.mock('expo-av')` → `expo-audio`/`expo-video`).

## Proof-of-work esperado

- `npx tsc --noEmit` → 0 erros.
- `./scripts/smoke.sh` → verde (ajustar mocks dos testes de diário/recap/exercícios).
- `grep -rl "expo-av" src/ app/` → vazio; `grep expo-av package.json` → ausente.
- **Live no device obrigatória** (esta é a razão da sprint): gravar áudio no diário,
  reproduzir som de alarme, tocar vídeo de exercício, conceder permissão de microfone —
  tudo no dev-client. Só a live valida (o crash original era de runtime).

## Definição de Pronto

- [ ] Os 12 arquivos migrados; `expo-av` removido das deps.
- [ ] Smoke verde + tsc 0.
- [ ] Gravação/playback/vídeo validados live no device.
- [ ] `docs/FEATURES-CANONICAS.md` inalterado em comportamento (migração é interna; UX idêntica).
- [ ] Habilita retomar a onda SDK 56 (`sdk56-experiment`) sem o crash de boot.
