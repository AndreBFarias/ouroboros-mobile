package com.ouroboros.healthconnect

// Conversores Record -> Map<String, Any?> usados em readRecords.
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint B (readRecords).
//
// Cada conversor produz a chave shape consumida em src/index.ts pelo JS.
// Tipos primitivos (String, Long, Int, Double, Map, List) viajam por
// expo-modules-core sem encoder custom. java.time.Instant vira ISO 8601
// via toString() (formato "2026-05-22T10:15:30.123Z").
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
import androidx.health.connect.client.records.metadata.Metadata

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
