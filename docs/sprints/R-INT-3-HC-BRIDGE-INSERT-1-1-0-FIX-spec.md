# R-INT-3-HC-BRIDGE-INSERT-1-1-0-FIX — Utils.kt compila contra connect-client 1.1.0

**Tipo:** fix (bug nativo / build-blocking)
**Prioridade:** P1 (bloqueia qualquer build com a bridge HC)
**Estimativa:** 0.5d
**Fase:** infra / integracoes
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-C (`7be4cc6` — escreveu os builders insert)

## Origem (achado de build, 2026-05-26)

A bridge HC nativa (`modules/health-connect/`) **nunca tinha sido compilada num
build real** — o APK alpha-31 usa o estado pre-D (lib upstream
`react-native-health-connect`, removida no NATIVA-D). O primeiro build a incluir
a bridge (dev-client via `build-dev-client.yml`, run `26430535136`) falhou em
`:ouroboros-health-connect:compileDebugKotlin` com 4 erros em `Utils.kt`:

```
e: Utils.kt:154 Cannot access 'constructor(...): Metadata': it is internal
e: Utils.kt:173 Cannot access 'constructor(...): ExerciseSessionRecord': it is internal
e: Utils.kt:235 Argument type mismatch: actual 'Int', but 'Metadata' expected
e: Utils.kt:236 Argument type mismatch: actual 'Metadata', but 'Int' expected
```

Causa-raiz (confirmada via API signature androidx `connect-client` 1.1.0):
- O **construtor publico `Metadata(...)` virou `internal`** na 1.1.0 estavel
  (era publico nas series alpha que o codigo original assumia). Deve-se usar os
  **factory methods** do `Metadata.Companion`.
- A **ordem dos parametros dos construtores de Record mudou**: `metadata` passou a
  vir **antes** de campos como `exerciseType` (ExerciseSessionRecord) e `flow`
  (MenstruationFlowRecord). Weight/BodyFat tem `metadata` por ultimo (inalterado).

E exatamente o que o comentario de `build.gradle:11` ja avisava
(R-INT-3-HC-DOC-VERSION-FIX-RESIDUO): "construtor Metadata virou internal desde
alpha12; usar factory methods".

## API canonica 1.1.0 (verificada via context7 / androidx signature files)

- `Metadata.manualEntry(): Metadata` (sem device) — input do usuario.
- `Metadata.activelyRecorded(device: Device): Metadata` — device **obrigatorio**.
- `Metadata.unknownRecordingMethod(): Metadata`.
- `Device(int type, optional String? manufacturer, optional String? model)` —
  `Device(type = Device.TYPE_PHONE)` valido (TYPE_PHONE = 2).
- `ExerciseSessionRecord(startTime, startZoneOffset, endTime, endZoneOffset,
  metadata, exerciseType, title?, notes?, ...)`.
- `MenstruationFlowRecord(time, zoneOffset, metadata, flow?)`.
- `WeightRecord(time, zoneOffset, weight, metadata)` / `BodyFatRecord(time,
  zoneOffset, percentage, metadata)` — metadata por ultimo (ja corretos).

## Escopo / Entregaveis

`modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt`:
- `buildInsertMetadata(recordingMethod)` deixa de usar o construtor internal;
  branch por recordingMethod -> `activelyRecorded(Device(TYPE_PHONE))` /
  `manualEntry()` / `unknownRecordingMethod()`.
- `ExerciseSessionRecord(...)` e `MenstruationFlowRecord(...)`: reordenar
  `metadata` para a posicao da 1.1.0.
- Trocar import `DataOrigin` (nao mais usado) por `Device`.

## OFF-LIMITS
- NAO mudar o lado read (`recordToMap`/conversores) — nao constroi records.
- NAO mudar a versao `connect-client:1.1.0` (linha 58 do build.gradle).
- NAO mudar o JS/TS da bridge (`src/index.ts`, `sync.ts`).

## Acceptance
1. `:ouroboros-health-connect:compileDebugKotlin` compila (build dev-client verde).
2. `grep -E "= Metadata\(|DataOrigin" Utils.kt` -> 0.
3. Records insert preservam semantica (Exercise=activelyRecorded, demais=manual).
4. Smoke JS inalterado (mudanca e 100% nativa).

## Verificacao
- Build CI `build-dev-client.yml` chega a "Locate APK" / "Upload artifact" verde.
- (Local, se houver android/ prebuildado: `cd android && ./gradlew
  :ouroboros-health-connect:compileDebugKotlin`.)

## Referencias
- Run que pegou o bug: GitHub Actions `26430535136`.
- API: androidx `health/connect/connect-client` 1.1.0 signature files.
- Achado AC-1 de R-INT-3-HC-DOC-VERSION-FIX (`ad2652a`).
