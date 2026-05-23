# R-INT-3-HC-BRIDGE-NATIVA-B — readRecords nos 7 tipos canonicos

**Tipo:** feature (bridge nativa Kotlin + tipos TS)
**Prioridade:** P1 (desbloqueia autopull)
**Estimativa:** 1d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA sub-sprint A (`f796f01`) + EMPIRICAL-FINDINGS (`601ab30`)

## Contexto

Sub-sprint A entregou bridge nativa com 6 AsyncFunctions de availability + permissions. `getSdkStatus=3 falso positivo` ja foi documentado e contornado em `R-INT-3-HC-EMPIRICAL-FINDINGS-spec.md`. Falta implementar `readRecords` para o app puxar dados do HC.

## Objetivo

Adicionar 1 AsyncFunction `readRecords` no `modules/health-connect/android/.../HealthConnectModule.kt` que envolve `HealthConnectClient.readRecords(ReadRecordsRequest)` do `androidx.health.connect:connect-client:1.1.0`, suportando os 7 tipos:

- `ExerciseSessionRecord`
- `StepsRecord`
- `WeightRecord`
- `BodyFatRecord`
- `HeartRateRecord`
- `SleepSessionRecord`
- `MenstruationFlowRecord` (manter o usado na sub-sprint A em `recordTypeToKClass`; o SDK 1.1.0 expoe AMBAS `MenstruationFlowRecord` e `MenstruationPeriodRecord` como classes distintas — Flow = evento de fluxo unico; Period = janela do periodo. Sub-sprint A escolheu Flow; B mantem esta escolha)

## API

```ts
// modules/health-connect/src/index.ts
export interface TimeRangeFilterBetween {
  operator: 'between';
  startTime: string;  // ISO 8601 com offset
  endTime: string;
}

export interface ReadRecordsOptions {
  timeRangeFilter: TimeRangeFilterBetween;
  ascendingOrder?: boolean;
  pageSize?: number;
  pageToken?: string;
}

export interface ReadRecordsResult {
  records: Array<Record<string, unknown>>;  // shape dependente do recordType
  pageToken?: string;
}

export async function readRecords(
  recordType: string,
  options: ReadRecordsOptions
): Promise<ReadRecordsResult>;
```

Shape dos records JSON conversao no Kotlin via `Utils.kt` (novo arquivo no modulo):
- Comum: `metadata.id`, `metadata.dataOrigin`, `metadata.lastModifiedTime`
- Exercise: `startTime`, `endTime`, `title`, `exerciseType`, `notes`
- Steps: `startTime`, `endTime`, `count`
- Weight: `time`, `weight.inKilograms`
- BodyFat: `time`, `percentage`
- HeartRate: `startTime`, `endTime`, `samples: [{time, beatsPerMinute}]`
- Sleep: `startTime`, `endTime`, `title`, `stages`
- Menstruation: `time`, `flow` (1=light, 2=medium, 3=heavy)

## Escopo

### A. Investigacao obrigatoria

```bash
# Confirma sub-sprint A entregue:
grep -c "AsyncFunction(\"getSdkStatus\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
# Esperado: >= 1

# Confirma SDK ja referenciado:
grep "connect-client" modules/health-connect/android/build.gradle
# Esperado: 1.1.0
```

### B. Implementacao Kotlin

1. Novo arquivo `modules/health-connect/android/.../Utils.kt`: conversores `Record -> Map<String, Any?>` para os 7 tipos. Funcao despachadora `recordToMap(record: Record): Map<String, Any?>` com `when` por classe.

2. `HealthConnectModule.kt`:
```kotlin
AsyncFunction("readRecords") Coroutine { recordType: String, options: Map<String, Any?> ->
  val context = appContext.reactContext ?: throw ...
  val client = HealthConnectClient.getOrCreate(context, providerPackageName)
  val recordClass = resolveRecordClass(recordType)  // helper
  val timeFilter = resolveTimeFilter(options["timeRangeFilter"] as Map<*, *>)
  val request = ReadRecordsRequest(
    recordType = recordClass,
    timeRangeFilter = timeFilter,
    ascendingOrder = (options["ascendingOrder"] as? Boolean) ?: true,
    pageSize = (options["pageSize"] as? Int) ?: 1000,
    pageToken = options["pageToken"] as? String
  )
  val response = client.readRecords(request)
  return@Coroutine mapOf(
    "records" to response.records.map { recordToMap(it) },
    "pageToken" to response.pageToken
  )
}
```

3. JS `src/index.ts`: adicionar `readRecords` na `NativeModuleShape` + funcao publica + fallback no-op (retorna `{ records: [] }`).

### C. Testes

- `tests/lib/health/readRecords-mock.test.ts`: mocka o native module e valida shape de conversao para cada um dos 7 tipos.

## OFF-LIMITS

**Pode tocar:** `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/*.kt`, `modules/health-connect/src/index.ts`, tests novos.

**Nao pode tocar:** `src/lib/health/sync.ts` (sub-sprint D faz a migracao), schemas, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
# Build APK alpha-XX via tag para confirmar Kotlin compila com novos conversores
```

## Proof-of-work

1. Lista de arquivos modificados (esperado: HealthConnectModule.kt, Utils.kt novo, index.ts, tests).
2. `npx jest --silent | tail -5` (+N testes).
3. Hash do commit no worktree.
4. Build APK successful (link GH Actions).
5. Validacao live opcional: `adb shell` chama Ouroboros, lista records do HC (depende de sub-sprint D pra integrar no JS de fato).

## Referencias

- Padrao Kotlin para read em `node_modules/react-native-health-connect/android/src/main/java/dev/matinzd/healthconnect/records/` (so para referencia da API HC, NAO copiar — usar SDK direto).
- AndroidX docs: https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data
