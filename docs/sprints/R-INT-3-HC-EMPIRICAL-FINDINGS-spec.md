# R-INT-3-HC-EMPIRICAL-FINDINGS — Investigacao empirica resolveu HC

**Tipo:** investigacao + fix
**Prioridade:** P1 (destravou feature HC)
**Estimativa:** ~6h (investigacao 4h + cleanup 2h)
**Fase:** 3
**Status:** `[ok-live]` 2026-05-22

## Resultado

**Ouroboros agora aparece na lista de apps do Health Connect nativo do Xiaomi HyperOS** ao lado de Claude, Google Fit e Tuya, com **11/11 permissoes health.* concedidas e granted=true** no `dumpsys package`. APK `v1.0.0-alpha-30` validado live.

## Contexto

Apos 8h+ de debug entre alpha-12 e alpha-26, `getSdkStatus()` retornava `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` (codigo 3) permanentemente no Xiaomi 2312DRAABG HyperOS com HC moderno (`com.google.android.apps.healthdata@2026.04.16.00.release`). Pesquisa upstream nao encontrou caminho oficial alternativo. Decompile dos apps que funcionavam (Tuya, Claude) revelou padrao canonico HC-aware faltando.

## Achados (em ordem cronologica)

### Achado 1: Activity-alias `ViewPermissionUsageActivity` obrigatoria

Decompile de `com.tuya.smart` e `com.anthropic.claude` (via `apktool d`) revelou que **ambos** declaram:

```xml
<activity-alias
  android:exported="true"
  android:name=".ViewPermissionUsageActivity"
  android:permission="android.permission.START_VIEW_PERMISSION_USAGE"
  android:targetActivity=".PermissionsRationaleActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW_PERMISSION_USAGE"/>
    <category android:name="android.intent.category.HEALTH_PERMISSIONS"/>
  </intent-filter>
</activity-alias>
```

Nosso APK (alpha-26) tinha **zero matches** para `ViewPermissionUsage`. O plugin `react-native-health-connect` nao injetava esse alias.

### Achado 2: Activity dedicada `PermissionsRationaleActivity` (nao MainActivity)

Tanto Tuya quanto Claude tem uma **activity dedicada** com APENAS o intent-filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`, e o activity-alias aponta para ELA. Nosso plugin punha o intent-filter na MainActivity (que tem N outros filters de launcher/deep link), e o alias apontava para MainActivity.

### Achado 3: `getSdkStatus()=3` e falso positivo

Mesmo com (1) e (2) implementados (alpha-28), `getSdkStatus` continuava retornando 3. Empiricamente: **o HC moderno aceita `requestPermission` mesmo retornando codigo 3 via getSdkStatus**. Ou seja, o gate `status === 'available'` na UI era pessimista demais — bloqueava o fluxo desnecessariamente.

Adicionado handler debug `handleForcarConectar` que ignora o gate. Confirmacao via alpha-30: dialog HC abriu, usuario concedeu permissoes via "Permitir tudo", 11/11 granted=true.

## Mudancas aplicadas

**Bridge nativa (`modules/health-connect/`):**
- `app.plugin.js`: usa `withAndroidManifest` para (a) remover `ACTION_SHOW_PERMISSIONS_RATIONALE` da MainActivity, (b) adicionar `PermissionsRationaleActivity` dedicada (Kotlin shim que redireciona via deep link `ouroboros://_internal/health-rationale`), (c) adicionar `ViewPermissionUsageActivity` alias.
- `PermissionsRationaleActivity.kt`: novo, shim minimalista com tema `NoDisplay`.
- `HealthConnectModule.kt`: bridge JS<->Kotlin com 6 AsyncFunctions (getSdkStatus, initialize, openHealthConnectSettings, requestPermission, getGrantedPermissions, revokeAllPermissions) usando `androidx.health.connect:connect-client:1.1.0` direto, sem `react-native-health-connect`.

**UI (`app/settings/integracoes.tsx`):**
- Removido gate `status === 'available'` — `needs_update` agora trata como utilizavel.
- Label de status: `'needs_update'` mapeia para `'Disponível'` (refletindo realidade).
- Botao "Conectar" aparece sempre que status != `unavailable` e permissoes vazias.

**Build config (`app.json`):**
- `compileSdkVersion` bumped 35 -> 36 (requerido por connect-client 1.1.0).
- ProGuard rule `-keep class com.ouroboros.healthconnect.**` (Expo Module registry usa reflection).

**Plugins (`app.json`):**
- Adicionado `./modules/health-connect/app.plugin.js` (autolink + manifest injection).
- Mantido `react-native-health-connect` plugin por enquanto (provisionamento legacy do `HealthDataSdkService` no manifest — ainda nao migrado para o novo plugin). Sub-sprint D futura remove.

## Evidencias

**APKs decompilados em `/tmp/decompile/`:**
- `tuya-apk/AndroidManifest.xml` linha ~600 (activity-alias)
- `claude-apk/AndroidManifest.xml` linha ~250 (activity-alias)
- `ouro28-apk/AndroidManifest.xml` linha ~95 (nossa estrutura igual depois do fix)

**Versoes de connect-client encontradas via META-INF:**
- Tuya: `1.1.0-alpha12`
- Claude: `1.1.0` (mesma que nos)
- Ouroboros: `1.1.0`

**Runtime live (alpha-30):**
- `adb logcat -s HCBridge:*` mostrou `getSdkStatus(provider=com.google.android.apps.healthdata) = 3`.
- Tap em "Forçar Conectar (debug)" disparou dialog HC com toggle "Permitir tudo".
- `adb shell dumpsys package com.ouroboros.mobile | grep "health.*granted=true"` confirma 11 permissions granted=true post-tap.
- Tela `/settings/health-connect` do HC nativo lista "Ouroboros" entre "Claude", "Google Fit", "Tuya".

## Sub-sprints futuras desbloqueadas

- **R-INT-3-HC-BRIDGE-NATIVA sub-sprint B** (readRecords): implementar leitura de Exercise/Steps/Weight/BodyFat/Sleep/HeartRate/Menstruation no Kotlin.
- **R-INT-3-HC-BRIDGE-NATIVA sub-sprint C** (insertRecords): implementar escrita com factory methods `Metadata.activelyRecorded`.
- **R-INT-3-HC-BRIDGE-NATIVA sub-sprint D** (cleanup): migrar `src/lib/health/sync.ts` do `react-native-health-connect` para o modulo local; remover lib do `package.json`; remover plugin do `app.json`.

## Referencias

- Spec original: `R-INT-3-HC-UPSTREAM-OBSOLETO-spec.md`, `R-INT-3-HC-BRIDGE-NATIVA-spec.md`
- Commits: alpha-20 (`f796f01` sub-sprint A) -> alpha-30 (`dceb0fc` validacao live)
- AndroidX docs: https://developer.android.com/health-and-fitness/guides/health-connect/develop/permissions
- Issue upstream que NAO se aplica mais: https://github.com/matinzd/react-native-health-connect/issues/228 (era do SDK em 1.1.0-alpha11; nosso modulo usa 1.1.0 final via codigo proprio)
