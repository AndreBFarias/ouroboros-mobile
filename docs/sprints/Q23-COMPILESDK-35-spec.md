# Q23 — Bump compileSdk/targetSdk 34 → 35 para destravar CI alpha-5

> **Status:** [ok] entregue em commit `46bec14` (2026-05-13 00:25 UTC).
> Spec foi escrita após o fato; achada stale durante validação live
> 2026-05-13 tarde. `app.json` declara compileSdkVersion 35 +
> targetSdkVersion 35 via expo-build-properties.
> **Tamanho original:** Trivial (15 min).
> **Bloqueia v1.0.0?** Não.
> **Pré-requisitos:** nenhum.

## Contexto

Tentativa de build alpha-5 no GitHub Actions (run `25775737751`,
2026-05-13 03:23 UTC) falhou em `CheckAarMetadataWorkAction`:

```
Dependency 'androidx.lifecycle:lifecycle-runtime-compose-android:2.9.0'
requires libraries and applications that depend on it to compile
against version 35 or later of the Android APIs.
:app is currently compiled against android-34.

Recommended action: Update this project to use a newer compileSdk
of at least 35, for example 36.
```

19 dependências do bundle (`androidx.compose.ui:ui-android:1.9.0`,
`androidx.lifecycle:*:2.9.0`, `androidx.core:core-ktx:1.16.0`) exigem
`compileSdk >= 35`. O Expo SDK 54 ainda usa `compileSdk=34` por
default; o plugin `expo-build-properties` permite override.

Sub-armadilha: `46bec14` (sessão paralela) já tocou no compileSdk
mas o build ainda falhou — vale auditar se o bump entrou no
`app.json` final ou só no `gradle.properties` (que é regenerado pelo
prebuild).

## Objetivo

Bump `compileSdkVersion: 35` e `targetSdkVersion: 34` em
`expo-build-properties` no `app.json`. Manter `targetSdk` em 34 por
ora — atualizar `targetSdk` opta-in em novos behaviors de runtime
(Android 15) que podem ter regressões a auditar em sprint dedicada.

## Decisões técnicas firmes

- **Apenas `compileSdkVersion`.** Não tocar em `targetSdk` (mantém
  comportamento runtime do Android 14).
- **Não tocar em `android/app/build.gradle` direto.** Esse arquivo é
  regenerado pelo `expo prebuild` no CI. Mudanças manuais somem.
- **Validar via dry-run prebuild local antes do push** se o ambiente
  tiver Android SDK instalado.

## Arquivos a modificar

- `app.json` — campo `plugins.expo-build-properties.android.compileSdkVersion`
  passa de implícito (default 34) para explícito `35`.

## Proof-of-work esperado

1. **Diff isolado:**
   ```bash
   git diff app.json
   # Esperado: apenas linha compileSdkVersion: 35 adicionada.
   ```

2. **Workflow Actions roda até o fim:**
   ```bash
   git push origin main
   gh workflow run build-android-apk.yml
   # Esperado: build completa (assembleRelease) com APK em artifacts.
   # Tempo esperado: 15-25 min após prebuild cacheado.
   ```

3. **APK gerado é instalável no Xiaomi HyperOS** (validação live,
   parte de "Validação live alpha-5"):
   ```bash
   adb shell pm install -r -t /data/local/tmp/app.apk
   ```

## Critérios de aceite

- [ ] `app.json` declara compileSdkVersion 35 via `expo-build-properties`
- [ ] Workflow `build-android-apk.yml` completa sem erro
      `CheckAarMetadataWorkAction`
- [ ] APK gerado tem ABI `arm64-v8a` (já restrito em sprint anterior)
- [ ] Tag `v1.0.0-alpha-5` criada com `gh release create`
- [ ] Sprint marcada `[ok]` em ROADMAP

## Anti-débito

Se o build continuar falhando após o bump (ex: outra dep agora exige
36), abrir Q23.b cobrindo a versão mínima atual do bundle Expo.
Próximo bump natural: SDK 55 que normaliza compileSdk em 35.
