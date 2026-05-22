# R-INT-3-HC-BRIDGE-NATIVA-C — insertRecords nos 4 tipos canonicos

**Tipo:** feature (bridge nativa Kotlin com factory methods)
**Prioridade:** P1 (desbloqueia D + escritas reversas pro HC)
**Estimativa:** 1d
**Fase:** 3
**Depende de:** sub-sprint B (readRecords + Utils.kt conversores ja existentes)

## Contexto

Em `connect-client:1.1.0` final, o construtor `Metadata(...)` virou `internal`. Apps modernos usam factory methods (`Metadata.activelyRecorded`, `Metadata.manualEntry`, `Metadata.autoRecorded`, `Metadata.unknownRecordingMethod`). Sub-sprint A nao precisou disso (avail+perms). Sub-sprint B nao precisou (read). Sub-sprint C precisa para escrever.

## Objetivo

Adicionar 1 AsyncFunction `insertRecords(records: Array<Map>): Promise<Array<String>>` no `HealthConnectModule.kt` que cria objetos `Record` a partir de JS via factory methods + persiste via `HealthConnectClient.insertRecords(records)`.

Tipos escrita suportados (espelha `src/lib/health/sync.ts` writers existentes):

- `ExerciseSessionRecord` (TreinoSessao -> ExerciseSession)
- `WeightRecord` (Medida -> Weight)
- `BodyFatRecord` (Medida -> BodyFat)
- `MenstruationFlowRecord` (RegistroCiclo -> MenstruationFlow)

## API

```ts
export interface InsertRecordInput {
  recordType: 'ExerciseSession' | 'Weight' | 'BodyFat' | 'MenstruationFlow';
  // campos especificos por recordType (validados no Kotlin via when)
  [k: string]: unknown;
}

export async function insertRecords(
  records: InsertRecordInput[]
): Promise<string[]>;  // retorna ids gerados pelo HC
```

## Escopo

### A. Investigacao obrigatoria

```bash
# Confirma sub-sprint B entregue (Utils.kt + readRecords):
grep -c "fun recordToMap" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt
# Esperado: 1

grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
# Esperado: 1
```

### B. Implementacao Kotlin

1. `Utils.kt`: adicionar `mapToRecord(input: Map<String, Any?>): Record` que despacha por `recordType`:
   - `"ExerciseSession"` -> `ExerciseSessionRecord(start, end, type, title, notes, metadata=Metadata.activelyRecorded(...))`
   - `"Weight"` -> `WeightRecord(time, Mass.kilograms(value), metadata=Metadata.manualEntry(...))`
   - `"BodyFat"` -> `BodyFatRecord(time, Percentage(value), metadata=Metadata.manualEntry(...))`
   - `"MenstruationFlow"` -> `MenstruationFlowRecord(time, flow, metadata=Metadata.manualEntry(...))`

2. `HealthConnectModule.kt`:
```kotlin
AsyncFunction("insertRecords") Coroutine { inputs: List<Map<String, Any?>> ->
  val client = HealthConnectClient.getOrCreate(context, providerPackageName)
  val records = inputs.map { mapToRecord(it) }
  val response = client.insertRecords(records)
  return@Coroutine response.recordIdsList
}
```

3. JS `src/index.ts`: `insertRecords` na `NativeModuleShape` + funcao publica + fallback no-op (retorna `[]`).

### C. Testes

- `tests/lib/health/insertRecords-mock.test.ts`: mocka native, valida que `mapToRecord` gera factory method correto para cada tipo (snapshot ou estrutural).

## OFF-LIMITS

**Pode tocar:** `modules/health-connect/android/.../{HealthConnectModule,Utils}.kt`, `modules/health-connect/src/index.ts`, tests novos.

**Nao pode tocar:** `src/lib/health/sync.ts` (sub-sprint D faz migracao), schemas, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
# Build APK alpha-XX via tag para confirmar Kotlin compila com factory methods.
```

## Proof-of-work

1. Lista de arquivos modificados.
2. `npx jest --silent | tail -5` (+N testes).
3. Hash commit + build APK successful.
4. Validacao live opcional: criar TreinoSessao no Ouroboros, abrir HC nativo, confirmar ExerciseSession listado em "Exercicios" do Ouroboros.

## Referencias

- API nova HC client 1.1.0+: https://developer.android.com/reference/androidx/health/connect/client/records/metadata/Metadata
- Factory methods: `activelyRecorded(device)`, `manualEntry()`, `autoRecorded(device)`, `unknownRecordingMethod()`.
