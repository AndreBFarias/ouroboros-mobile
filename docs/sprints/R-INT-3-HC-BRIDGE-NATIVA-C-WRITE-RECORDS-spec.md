# R-INT-3-HC-BRIDGE-NATIVA-C — insertRecords nos 4 tipos canonicos

**Tipo:** feature (bridge nativa Kotlin com writers)
**Prioridade:** P1 (desbloqueia D + escritas reversas pro HC)
**Estimativa:** 1d
**Fase:** 3
**Depende de:** sub-sprint B (readRecords + Utils.kt conversores ja existentes em `db3604e`)

## Contexto

Sub-sprint A entregou skeleton + availability + permissions (`f796f01`).
Sub-sprint B entregou `readRecords` + 7 conversores `recordToMap` em
`Utils.kt` (`db3604e`). Sub-sprint C precisa expor a operacao inversa
(`insertRecords`) com 4 writers canonicos que espelham os callers ja
implementados em `src/lib/health/sync.ts` (`escreverTreinoEmHC`,
`escreverPesoEmHC`, `escreverBodyFatEmHC`, `escreverMenstruacaoEmHC`).

Sub-sprint D fara a migracao do require em `sync.ts` (hoje em
`react-native-health-connect`) para `modules/health-connect`. Esta
sprint nao toca `sync.ts`.

### Realidade do SDK (confirmada via javap em
`connect-client-1.1.0-alpha11.aar` resolvido do `build.gradle:58`)

- `Metadata(id, dataOrigin, lastModifiedTime, clientRecordId,
  clientRecordVersion, device, recordingMethod)` — construtor **publico**
  no SDK resolvido. Existem constantes `RECORDING_METHOD_UNKNOWN`,
  `RECORDING_METHOD_ACTIVELY_RECORDED`, `RECORDING_METHOD_MANUAL_ENTRY`,
  `RECORDING_METHOD_AUTOMATICALLY_RECORDED`.
- **Nao existem** factory methods `Metadata.activelyRecorded(...)` /
  `Metadata.manualEntry()` neste SDK (Companion object so tem
  `EMPTY`/`EMPTY_ID`). A premissa antiga do spec foi removida.
- `Mass.kilograms(double)` existe no Companion (static).
- `Percentage(double)` e construtor publico.
- `MenstruationFlowRecord(time, zoneOffset, flow, metadata)` — flow:
  `FLOW_LIGHT=1`, `FLOW_MEDIUM=2`, `FLOW_HEAVY=3`.
- `WeightRecord(time, zoneOffset, weight: Mass, metadata)`.
- `ExerciseSessionRecord` — construtor tem variantes; usaremos o que
  aceita `(startTime, startZoneOffset, endTime, endZoneOffset,
  exerciseType, title, notes, metadata)`. Sub-sprint executora confirma
  signature exata via Android Studio / `gradlew assembleDebug`.
- `HealthConnectClient.insertRecords(List<Record>): InsertRecordsResponse`
  — suspend; resposta tem `recordIdsList: List<String>`.

## Objetivo

Adicionar 1 AsyncFunction `insertRecords(records: Array<Map>):
Promise<Array<String>>` no `HealthConnectModule.kt` que cria objetos
`Record` a partir de mapas JS + persiste via
`HealthConnectClient.insertRecords(...)` em coroutine IO.

Tipos suportados (espelha writers de `src/lib/health/sync.ts:254-356`):

- `ExerciseSession` (TreinoSessao -> ExerciseSessionRecord)
- `Weight` (Medida.peso_kg -> WeightRecord)
- `BodyFat` (Medida.gordura_pct -> BodyFatRecord)
- `MenstruationFlow` (RegistroCiclo.fase=menstrual -> MenstruationFlowRecord)

## API JS (camada `modules/health-connect/src/index.ts`)

```ts
// Tipos de input. Discriminated union por recordType. Caller monta o
// shape em src/lib/health/sync.ts (sub-sprint D fara o port).
export interface InsertExerciseSessionInput {
  recordType: 'ExerciseSession';
  startTime: string;  // ISO 8601
  endTime: string;
  exerciseType: number;  // codigo HC (ex: 2 = BODY_WEIGHT_WORKOUT)
  title?: string;
  notes?: string;
}

export interface InsertWeightInput {
  recordType: 'Weight';
  time: string;
  weight: { value: number; unit: 'kilograms' };  // shape ja usado em sync.ts:295
}

export interface InsertBodyFatInput {
  recordType: 'BodyFat';
  time: string;
  percentage: number;  // 0..100 (escala usada por sync.ts:321)
}

export interface InsertMenstruationFlowInput {
  recordType: 'MenstruationFlow';
  time: string;
  flow: 1 | 2 | 3;  // FLOW_LIGHT|MEDIUM|HEAVY
}

export type InsertRecordInput =
  | InsertExerciseSessionInput
  | InsertWeightInput
  | InsertBodyFatInput
  | InsertMenstruationFlowInput;

// Retorna ids gerados pelo HC (response.recordIdsList). Em ambiente
// sem modulo nativo retorna [] (no-op seguro, igual readRecords).
export async function insertRecords(
  records: InsertRecordInput[]
): Promise<string[]>;
```

A `NativeModuleShape` ganha:

```ts
insertRecords(records: Array<Record<string, unknown>>): Promise<string[]>;
```

## Escopo

### A. Investigacao obrigatoria (5 min)

```bash
# Confirma sub-sprint B entregue (Utils.kt + readRecords):
grep -c "fun recordToMap" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt
# Esperado: 1

grep -c 'AsyncFunction("readRecords")' modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
# Esperado: 1

# Confirma assinatura insertRecords no SDK resolvido:
javap -classpath $(find ~/.gradle/caches -name 'connect-client-1.1.0-alpha11.aar' -print0 | xargs -0 -I{} sh -c 'unzip -p "{}" classes.jar > /tmp/hc.jar && echo /tmp/hc.jar') androidx.health.connect.client.HealthConnectClient | grep -i insert
# Esperado: insertRecords(List, Continuation): InsertRecordsResponse
```

### B. Implementacao Kotlin

1. **`Utils.kt`** — append (nao reescreve), novos helpers privados.
   Padronizar `Metadata` construtor com:
   - `id = ""` (HC gera UUID automatico em insert)
   - `dataOrigin = DataOrigin("")` (HC preenche com packageName do app)
   - `lastModifiedTime = Instant.now()`
   - `clientRecordId = null`
   - `clientRecordVersion = 0L`
   - `device = null`
   - `recordingMethod = Metadata.RECORDING_METHOD_MANUAL_ENTRY` (ou
     `RECORDING_METHOD_ACTIVELY_RECORDED` para ExerciseSession)

   ```kotlin
   internal fun mapToRecord(input: Map<String, Any?>): Record {
     val recordType = input["recordType"] as? String
       ?: throw IllegalArgumentException("recordType ausente")
     return when (recordType) {
       "ExerciseSession" -> buildExerciseSession(input)
       "Weight" -> buildWeight(input)
       "BodyFat" -> buildBodyFat(input)
       "MenstruationFlow" -> buildMenstruationFlow(input)
       else -> throw IllegalArgumentException(
         "recordType nao suportado para insertRecords: $recordType"
       )
     }
   }
   ```

   Cada builder le campos do mapa (com type guards), constroi unidades
   (`Mass.kilograms(value)`, `Percentage(value)`), passa `Metadata(...)`
   completo. `zoneOffset = null` em todos (HC preserva timezone via
   `Instant`).

   **Atencao a `weight`**: input JS tem `weight: { value: number; unit:
   'kilograms' }`. O builder deve extrair `value` do sub-mapa e chamar
   `Mass.kilograms(...)`. Outras unidades ficam rejeitadas com
   `IllegalArgumentException` (sub-sprint D so usa kg).

2. **`HealthConnectModule.kt`** — adicionar 1 AsyncFunction `insertRecords`
   no bloco `definition()`, antes do fecho da chave `}`:

   ```kotlin
   // ---------- INSERT RECORDS ----------
   AsyncFunction("insertRecords") { inputs: List<Map<String, Any?>>, promise: Promise ->
     val context = appContext.reactContext
       ?: return@AsyncFunction promise.reject(
         CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
       )
     val records = try {
       inputs.map { mapToRecord(it) }
     } catch (e: Throwable) {
       return@AsyncFunction promise.reject(
         CodedException("ERR_INVALID_INPUT", "Falha ao converter input: ${e.message}", e)
       )
     }
     CoroutineScope(Dispatchers.IO).launch {
       try {
         val client = HealthConnectClient.getOrCreate(context, providerPackageName)
         val response = client.insertRecords(records)
         promise.resolve(response.recordIdsList)
       } catch (e: Throwable) {
         promise.reject(
           CodedException("ERR_INSERT_RECORDS", "Falha ao inserir records: ${e.message}", e)
         )
       }
     }
   }
   ```

3. **`modules/health-connect/src/index.ts`**:
   - Adicionar `insertRecords` na interface `NativeModuleShape`.
   - Adicionar tipos `InsertExerciseSessionInput` / `InsertWeightInput` /
     `InsertBodyFatInput` / `InsertMenstruationFlowInput` / union
     `InsertRecordInput`.
   - Adicionar funcao publica `insertRecords(records)` com fallback
     no-op `[]` se `getNative()` retornar `null` ou catch.
   - Exportar no `_default`.

   Atualizar comentarios topo do arquivo: marcar sub-sprint C como
   entregue e B como entregue.

### C. Testes

- Novo: `tests/lib/health/insertRecords-mock.test.ts`
  (~120 linhas, 4-6 casos):
  - Mocka `requireOptionalNativeModule` para devolver native fake.
  - Verifica que `insertRecords([{recordType:'Weight', time:'...',
    weight:{value:75.5, unit:'kilograms'}}])` chama `native.insertRecords`
    1x com o mesmo array (Kotlin valida shape).
  - Verifica que `insertRecords` em ambiente sem native retorna `[]`.
  - Verifica passthrough do `recordIdsList` do native.
  - 1 caso de cada recordType (ExerciseSession, Weight, BodyFat,
    MenstruationFlow) — apenas confirma que JS passa o shape limpo
    sem mutacao (Kotlin e contrato HC ficam para validacao live).

  Esses testes ficam no nivel JS (sem instrumentacao Kotlin). Validacao
  Kotlin/HC e feita em sub-sprint D + live (item D abaixo).

### D. Validacao live (mandatoria pos build)

Apos `eas build --profile preview` (ou local `./run.sh` em dev-client),
em celular HyperOS com HC instalado:

1. Abrir Ouroboros, salvar 1 medida com peso 75.5kg + gordura 18%.
2. Esperar sync.ts (apos sub-sprint D, nao desta) — **nao aplicavel
   aqui**: sub-sprint C nao toca sync.ts, portanto o caminho live
   so e exercitavel via testes manuais chamando
   `modulesHealthConnect.insertRecords([...])` dentro de um devtool ou
   sprint D. Spec C declara-se "build-clean" como criterio principal:
   APK compila com `connect-client:1.1.0` sem warnings de visibility.

Se houver tempo extra, o executor pode adicionar **botao temporario
no `app/(tabs)/integracoes.tsx`** chamando `insertRecords` manual com
mock data — desde que **removido no mesmo commit** (`git diff` mostra
apenas o que e canonico).

## OFF-LIMITS

**Pode tocar:**
- `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt`
- `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt` (apenas APPEND; nao modificar conversores existentes)
- `modules/health-connect/src/index.ts`
- `tests/lib/health/insertRecords-mock.test.ts` (NOVO)
- Atualizacao de comentarios topo dos arquivos tocados.

**Nao pode tocar:**
- `src/lib/health/sync.ts` (sub-sprint D faz migracao do `require`)
- `src/lib/health/permissions.ts` / `availability.ts`
- `app/`, schemas, stores
- `CLAUDE.md`, `ROADMAP.md`, `STATE.md`, `VALIDATOR_BRIEF.md`,
  `Checkpoint.md`, `docs/FEATURES-CANONICAS.md` (este nao tem mudanca
  funcional user-facing — soma a D para entrar)
- Versao do `connect-client` no `build.gradle` (continua `1.1.0`)

## Aritmetica esperada

- **+1 AsyncFunction** em `HealthConnectModule.kt` (`insertRecords`).
- **+1 funcao publica** em `Utils.kt` (`mapToRecord`) **+ 4 builders
  privados** (`buildExerciseSession`, `buildWeight`, `buildBodyFat`,
  `buildMenstruationFlow`) — total +5 funcoes em Utils.kt.
- **+1 funcao publica JS** em `src/index.ts` (`insertRecords`).
- **+5 tipos JS** em `src/index.ts` (`InsertRecordInput` + 4 variantes).
- **+1 metodo** na interface `NativeModuleShape`.
- **+1 arquivo novo** de teste (`insertRecords-mock.test.ts`).
- **+4-6 testes** Jest (baseline 2758 -> 2762-2764).

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh   # baseline atual 2758 -> esperado 2762-2764
# Build APK (alpha-32 sugerido) para confirmar Kotlin compila com
# Metadata(...) construtor publico em 1.1.0-alpha11.
```

## Proof-of-work

1. Lista de arquivos modificados (espera `git diff --stat`):
   - `modules/health-connect/android/.../HealthConnectModule.kt` (~+40 linhas)
   - `modules/health-connect/android/.../Utils.kt` (~+90 linhas)
   - `modules/health-connect/src/index.ts` (~+70 linhas)
   - `tests/lib/health/insertRecords-mock.test.ts` (NOVO, ~120 linhas)
2. `npx jest --silent | tail -5` mostrando +N testes verde.
3. Hash do commit + build APK successful (output do `eas build` ou
   `./scripts/build-local-apk.sh`).
4. Validacao manual opcional documentada em comentario do PR (botao
   debug removido no mesmo commit OU adiada para sub-sprint D).

## Riscos / lacunas conhecidas

- **R1:** Construtor `Metadata` aceita 7 parametros posicionais; se
  Kotlin/Java reclamar de `null` em `device`, fallback e instanciar
  `Device()` vazio. Executor decide em runtime durante o
  `gradlew assembleDebug` da sub-sprint.
- **R2:** `ExerciseSessionRecord` tem multiplas variantes do construtor
  (com/sem `laps`, `segments`, `exerciseRoute`). Spec usa a mais
  enxuta: `(startTime, startZoneOffset=null, endTime,
  endZoneOffset=null, exerciseType, title, notes, metadata)`. Se IDE
  apontar overload diferente, executor ajusta para o disponivel.
- **R3:** Idempotencia — `insertRecords` chamado 2x **cria 2 records
  duplicados**. Deduplicacao e responsabilidade do caller
  (`sync.ts` em sub-sprint D, usando `clientRecordId` derivado do
  uuid do Vault). Spec C nao implementa dedup — apenas documenta
  a limitacao no comentario topo do `insertRecords` em `src/index.ts`.
- **R4:** SDK declarado `1.1.0` mas o Gradle resolve para
  `1.1.0-alpha11` (ultimo publicado na linha 1.1.0). Comentarios em
  `Utils.kt`/`index.ts` mencionam tanto "1.1.0" quanto "1.2.0-alpha04"
  em pontos diferentes — sub-sprint C **nao corrige** essa
  inconsistencia (escopo de cleanup separado).

## Referencias

- SDK efetivo: `~/.gradle/caches/modules-2/files-2.1/androidx.health.connect/connect-client/1.1.0-alpha11/*.aar`
- Sub-sprint A: commit `f796f01`
- Sub-sprint B: commit `db3604e`
- Callers existentes (read pelo planejador, off-limits para C):
  `src/lib/health/sync.ts:244-356`
- Padrao AsyncFunction + Coroutine: `HealthConnectModule.kt:250-310`
  (`readRecords`, ja entregue)
