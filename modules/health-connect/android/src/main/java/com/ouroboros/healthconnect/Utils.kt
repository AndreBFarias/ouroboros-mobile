package com.ouroboros.healthconnect

// Conversores Record -> Map<String, Any?> usados em readRecords e
// builders inversos Map -> Record usados em insertRecords.
// R-INT-3-HC-BRIDGE-NATIVA sub-sprints B (readRecords) e C (insertRecords).
//
// Cada conversor produz a chave shape consumida em src/index.ts pelo JS.
// Tipos primitivos (String, Long, Int, Double, Map, List) viajam por
// expo-modules-core sem encoder custom. java.time.Instant vira ISO 8601
// via toString() (formato "2026-05-22T10:15:30.123Z").
//
// Builders inversos da sub-sprint C cobrem 4 tipos canonicos (Exercise
// Session, Weight, BodyFat, MenstruationFlow), espelhando os writers
// existentes em src/lib/health/sync.ts que sub-sprint D ira portar para
// chamar esta bridge.
//
// Convencao: comentarios sem acento (shell/CI).

import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.MenstruationFlowRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Mass
import androidx.health.connect.client.units.Percentage
import java.time.Instant

// Despachador principal. Cobre os 7 tipos canonicos da sub-sprint A
// (Steps, ExerciseSession, Weight, BodyFat, HeartRate, SleepSession,
// MenstruationFlow). Outros tipos retornam null para o caller filtrar.
internal fun recordToMap(record: Record): Map<String, Any?>? = when (record) {
  is StepsRecord -> stepsToMap(record)
  is ExerciseSessionRecord -> exerciseSessionToMap(record)
  is WeightRecord -> weightToMap(record)
  is BodyFatRecord -> bodyFatToMap(record)
  is HeartRateRecord -> heartRateToMap(record)
  is SleepSessionRecord -> sleepSessionToMap(record)
  is MenstruationFlowRecord -> menstruationFlowToMap(record)
  else -> null
}

// ---------- Comuns ----------

private fun metadataToMap(metadata: Metadata): Map<String, Any?> = mapOf(
  "id" to metadata.id,
  "dataOrigin" to mapOf("packageName" to metadata.dataOrigin.packageName),
  "lastModifiedTime" to metadata.lastModifiedTime.toString()
)

// ---------- Conversores por tipo ----------

private fun stepsToMap(record: StepsRecord): Map<String, Any?> = mapOf(
  "startTime" to record.startTime.toString(),
  "endTime" to record.endTime.toString(),
  "count" to record.count,
  "metadata" to metadataToMap(record.metadata)
)

private fun exerciseSessionToMap(record: ExerciseSessionRecord): Map<String, Any?> = mapOf(
  "startTime" to record.startTime.toString(),
  "endTime" to record.endTime.toString(),
  "exerciseType" to record.exerciseType,
  "title" to record.title,
  "notes" to record.notes,
  "metadata" to metadataToMap(record.metadata)
)

private fun weightToMap(record: WeightRecord): Map<String, Any?> = mapOf(
  "time" to record.time.toString(),
  "weight" to mapOf("inKilograms" to record.weight.inKilograms),
  "metadata" to metadataToMap(record.metadata)
)

private fun bodyFatToMap(record: BodyFatRecord): Map<String, Any?> = mapOf(
  "time" to record.time.toString(),
  "percentage" to record.percentage.value,
  "metadata" to metadataToMap(record.metadata)
)

private fun heartRateToMap(record: HeartRateRecord): Map<String, Any?> = mapOf(
  "startTime" to record.startTime.toString(),
  "endTime" to record.endTime.toString(),
  "samples" to record.samples.map { sample ->
    mapOf(
      "time" to sample.time.toString(),
      "beatsPerMinute" to sample.beatsPerMinute
    )
  },
  "metadata" to metadataToMap(record.metadata)
)

private fun sleepSessionToMap(record: SleepSessionRecord): Map<String, Any?> = mapOf(
  "startTime" to record.startTime.toString(),
  "endTime" to record.endTime.toString(),
  "title" to record.title,
  "notes" to record.notes,
  "stages" to record.stages.map { stage ->
    mapOf(
      "startTime" to stage.startTime.toString(),
      "endTime" to stage.endTime.toString(),
      "stage" to stage.stage
    )
  },
  "metadata" to metadataToMap(record.metadata)
)

private fun menstruationFlowToMap(record: MenstruationFlowRecord): Map<String, Any?> = mapOf(
  "time" to record.time.toString(),
  "flow" to record.flow,
  "metadata" to metadataToMap(record.metadata)
)

// ---------- Builders inversos (sub-sprint C) ----------
//
// Cada builder recebe um Map JS e produz um Record do SDK pronto para
// insertRecords. recordType invalido lanca IllegalArgumentException (o
// caller em HealthConnectModule traduz para CodedException JS).
//
// Metadata para inserts: id vazio (HC gera UUID), dataOrigin vazio (HC
// preenche com packageName do app), lastModifiedTime=Instant.now(),
// clientRecordId=null (caller pode prover dedup futuramente em
// sub-sprint D), clientRecordVersion=0, device=null,
// recordingMethod=ACTIVELY_RECORDED para ExerciseSession e
// MANUAL_ENTRY para Weight/BodyFat/MenstruationFlow (input do usuario).
//
// zoneOffset=null em todos (Instant ja carrega timezone via UTC; HC
// preserva offset quando o caller envia ISO 8601 com offset).

// Despachador inverso. Cobre 4 tipos suportados pelos writers existentes
// em src/lib/health/sync.ts (TreinoSessao, Peso, BodyFat, Menstruacao).
// Outros recordTypes lancam IllegalArgumentException para sinalizar
// shape nao suportado pelo bridge nesta sub-sprint.
internal fun mapToRecord(input: Map<String, Any?>): Record {
  val recordType = input["recordType"] as? String
    ?: throw IllegalArgumentException("recordType ausente em input")
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

// Metadata canonico para inserts. O construtor publico Metadata(...) virou
// internal na connect-client 1.1.0 estavel; usa-se os factory methods do
// companion. ACTIVELY_RECORDED exige um Device nao-nulo -> usamos o proprio
// telefone (TYPE_PHONE, o app roda nele). MANUAL_ENTRY (input do usuario)
// dispensa Device. id, dataOrigin e lastModifiedTime sao preenchidos pelo
// HC no momento do insert. recordingMethod mantido por caller
// (ExerciseSession=ACTIVELY_RECORDED, demais=MANUAL_ENTRY).
private fun buildInsertMetadata(recordingMethod: Int): Metadata =
  when (recordingMethod) {
    Metadata.RECORDING_METHOD_ACTIVELY_RECORDED ->
      Metadata.activelyRecorded(Device(type = Device.TYPE_PHONE))
    Metadata.RECORDING_METHOD_MANUAL_ENTRY -> Metadata.manualEntry()
    else -> Metadata.unknownRecordingMethod()
  }

private fun buildExerciseSession(input: Map<String, Any?>): ExerciseSessionRecord {
  val startTime = (input["startTime"] as? String)
    ?: throw IllegalArgumentException("ExerciseSession.startTime ausente")
  val endTime = (input["endTime"] as? String)
    ?: throw IllegalArgumentException("ExerciseSession.endTime ausente")
  val exerciseType = (input["exerciseType"] as? Number)?.toInt()
    ?: throw IllegalArgumentException("ExerciseSession.exerciseType ausente")
  val title = input["title"] as? String
  val notes = input["notes"] as? String
  // Ordem dos parametros na connect-client 1.1.0: metadata ANTES de
  // exerciseType (mudou em relacao ao alpha que o codigo original assumia).
  return ExerciseSessionRecord(
    /* startTime = */ Instant.parse(startTime),
    /* startZoneOffset = */ null,
    /* endTime = */ Instant.parse(endTime),
    /* endZoneOffset = */ null,
    /* metadata = */ buildInsertMetadata(Metadata.RECORDING_METHOD_ACTIVELY_RECORDED),
    /* exerciseType = */ exerciseType,
    /* title = */ title,
    /* notes = */ notes
  )
}

private fun buildWeight(input: Map<String, Any?>): WeightRecord {
  val time = (input["time"] as? String)
    ?: throw IllegalArgumentException("Weight.time ausente")
  // Caller passa weight como sub-mapa { value: number, unit: 'kilograms' }
  // (mesmo shape de src/lib/health/sync.ts). Unidade diferente de
  // 'kilograms' e rejeitada — sub-sprint D so usa kg.
  val weightMap = input["weight"] as? Map<*, *>
    ?: throw IllegalArgumentException("Weight.weight ausente ou nao e Map")
  val value = (weightMap["value"] as? Number)?.toDouble()
    ?: throw IllegalArgumentException("Weight.weight.value ausente")
  val unit = weightMap["unit"] as? String
  if (unit != null && unit != "kilograms") {
    throw IllegalArgumentException("Weight.weight.unit nao suportado: $unit")
  }
  return WeightRecord(
    /* time = */ Instant.parse(time),
    /* zoneOffset = */ null,
    /* weight = */ Mass.kilograms(value),
    /* metadata = */ buildInsertMetadata(Metadata.RECORDING_METHOD_MANUAL_ENTRY)
  )
}

private fun buildBodyFat(input: Map<String, Any?>): BodyFatRecord {
  val time = (input["time"] as? String)
    ?: throw IllegalArgumentException("BodyFat.time ausente")
  // Caller envia escala 0..100 (mesmo shape de src/lib/health/sync.ts:321).
  val percentage = (input["percentage"] as? Number)?.toDouble()
    ?: throw IllegalArgumentException("BodyFat.percentage ausente")
  return BodyFatRecord(
    /* time = */ Instant.parse(time),
    /* zoneOffset = */ null,
    /* percentage = */ Percentage(percentage),
    /* metadata = */ buildInsertMetadata(Metadata.RECORDING_METHOD_MANUAL_ENTRY)
  )
}

private fun buildMenstruationFlow(input: Map<String, Any?>): MenstruationFlowRecord {
  val time = (input["time"] as? String)
    ?: throw IllegalArgumentException("MenstruationFlow.time ausente")
  // flow: 1=LIGHT, 2=MEDIUM, 3=HEAVY (constantes do MenstruationFlowRecord).
  val flow = (input["flow"] as? Number)?.toInt()
    ?: throw IllegalArgumentException("MenstruationFlow.flow ausente")
  if (flow !in 1..3) {
    throw IllegalArgumentException(
      "MenstruationFlow.flow fora do intervalo 1..3: $flow"
    )
  }
  // Ordem na connect-client 1.1.0: metadata ANTES de flow.
  return MenstruationFlowRecord(
    /* time = */ Instant.parse(time),
    /* zoneOffset = */ null,
    /* metadata = */ buildInsertMetadata(Metadata.RECORDING_METHOD_MANUAL_ENTRY),
    /* flow = */ flow
  )
}
