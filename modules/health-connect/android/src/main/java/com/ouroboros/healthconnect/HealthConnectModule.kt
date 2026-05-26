package com.ouroboros.healthconnect

// Bridge Health Connect nativa propria do Ouroboros.
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint A.
//
// Substitui react-native-health-connect@3.5.3 (que usa connect-client
// 1.1.0-alpha11 obsoleto e e rejeitado pelo HC moderno como
// SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED).
//
// Sub-sprint A entregou skeleton + availability + permissions. Sub-sprint
// B entregou readRecords. Sub-sprint C entrega insertRecords. Sub-sprint
// D (sync.ts migration) fica para depois.
//
// API JS exposta (compat com src/lib/health/{availability,permissions,sync}.ts):
//   - getSdkStatus(): Promise<Int>           (1 = available, 2 = unavailable, 3 = needs_update)
//   - initialize(): Promise<Boolean>
//   - openHealthConnectSettings(): void
//   - requestPermission(perms): Promise<perms[]>
//   - getGrantedPermissions(): Promise<perms[]>
//   - revokeAllPermissions(): Promise<void>
//   - readRecords(recordType, options): Promise<{records, pageToken}>  (sub-sprint B)
//   - insertRecords(records): Promise<Array<String>>                   (sub-sprint C)
//
// Convencao: comentarios sem acento (shell/CI).

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID

class HealthConnectModule : Module() {

  // Provider padrao do Health Connect (Google).
  private val providerPackageName = "com.google.android.apps.healthdata"

  // Holder do launcher para requestPermission. Registrado sob demanda
  // quando a primeira chamada acontece (precisa de currentActivity).
  // Re-registra se a activity mudar (recreate apos rotacao etc).
  private var permissionLauncher: ActivityResultLauncher<Set<String>>? = null
  private var registeredForActivityHash: Int = 0
  private var pendingPromise: Promise? = null
  private var pendingRequestedPerms: List<Map<String, String>>? = null

  override fun definition() = ModuleDefinition {
    Name("OuroborosHealthConnect")

    // ---------- AVAILABILITY ----------

    // Retorna o codigo bruto do SDK:
    //   HealthConnectClient.SDK_AVAILABLE                            = 1
    //   HealthConnectClient.SDK_UNAVAILABLE                          = 2
    //   HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 3
    // src/lib/health/availability.ts mapeia para union de string.
    AsyncFunction("getSdkStatus") {
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
      return@AsyncFunction HealthConnectClient.getSdkStatus(context, providerPackageName)
    }

    // Inicializa o cliente do HC. Aqui validamos que getOrCreate funciona;
    // caller JS espera Boolean. Idempotente: chamadas multiplas sao OK.
    AsyncFunction("initialize") {
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
      return@AsyncFunction try {
        HealthConnectClient.getOrCreate(context, providerPackageName)
        true
      } catch (_: Throwable) {
        false
      }
    }

    // Abre a tela de configuracoes do Health Connect (acoes do usuario:
    // gerenciar permissions, ver dados, desconectar). No-op se intent
    // falhar (mantemos comportamento do caller upstream).
    Function("openHealthConnectSettings") {
      val context = appContext.reactContext
        ?: return@Function Unit
      try {
        val intent = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      } catch (_: Throwable) {
        // Sem fallback. Usuario pode procurar manualmente em Configuracoes
        // do Android se o intent falhar.
      }
    }

    // ---------- PERMISSIONS ----------

    // Solicita permissions ao sistema. O HC abre tela nativa propria
    // com lista checkable; usuario aceita tudo / subset / nada. Retorno
    // e a lista efetivamente concedida (subset de input).
    //
    // Input shape (vindo de src/lib/health/permissions.ts):
    //   [ { accessType: 'read'|'write', recordType: 'Steps'|... }, ... ]
    //
    // Implementacao: convertemos pra Set<String> (HealthPermission tokens)
    // antes do launch. Apos resultado, chamamos getGrantedPermissions
    // do HC e re-traduzimos pra shape JS.
    AsyncFunction("requestPermission") { perms: List<Map<String, String>>, promise: Promise ->
      val activity = appContext.currentActivity
        ?: return@AsyncFunction promise.reject(
          CodedException("ERR_NO_ACTIVITY", "currentActivity nao disponivel", null)
        )

      if (activity !is ComponentActivity) {
        return@AsyncFunction promise.reject(
          CodedException(
            "ERR_ACTIVITY_TYPE",
            "currentActivity nao e ComponentActivity (tipo=${activity.javaClass.simpleName})",
            null
          )
        )
      }

      if (pendingPromise != null) {
        return@AsyncFunction promise.reject(
          CodedException(
            "ERR_REQUEST_IN_PROGRESS",
            "Outra chamada requestPermission ainda esta pendente",
            null
          )
        )
      }

      val permissionTokens: Set<String> = try {
        perms.map { mapToHealthPermissionToken(it) }.toSet()
      } catch (e: Throwable) {
        return@AsyncFunction promise.reject(
          CodedException(
            "ERR_INVALID_PERMS",
            "Falha ao traduzir permission tokens: ${e.message}",
            e
          )
        )
      }

      activity.runOnUiThread {
        try {
          ensureLauncherRegistered(activity)
          pendingPromise = promise
          pendingRequestedPerms = perms
          permissionLauncher?.launch(permissionTokens)
            ?: run {
              pendingPromise = null
              pendingRequestedPerms = null
              promise.reject(
                CodedException(
                  "ERR_LAUNCHER_NULL",
                  "Launcher nao registrado",
                  null
                )
              )
            }
        } catch (e: Throwable) {
          pendingPromise = null
          pendingRequestedPerms = null
          promise.reject(
            CodedException(
              "ERR_LAUNCH_FAILED",
              "Falha ao abrir tela de permissions: ${e.message}",
              e
            )
          )
        }
      }
    }

    // Lista as permissions atualmente concedidas. Util para UI mostrar
    // "Conectado: N tipos" vs "Desconectado".
    AsyncFunction("getGrantedPermissions") { promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.reject(
          CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
        )
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val client = HealthConnectClient.getOrCreate(context, providerPackageName)
          val granted = client.permissionController.getGrantedPermissions()
          val mapped = granted.mapNotNull { token -> healthPermissionTokenToMap(token) }
          promise.resolve(mapped)
        } catch (e: Throwable) {
          promise.reject(
            CodedException(
              "ERR_GET_GRANTED",
              "Falha ao listar permissions concedidas: ${e.message}",
              e
            )
          )
        }
      }
    }

    // Revoga todas as permissions concedidas. Android 14+ pode aplicar
    // somente no proximo restart do app (limitacao do sistema, nao nossa).
    AsyncFunction("revokeAllPermissions") { promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.reject(
          CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
        )
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val client = HealthConnectClient.getOrCreate(context, providerPackageName)
          client.permissionController.revokeAllPermissions()
          promise.resolve(null)
        } catch (e: Throwable) {
          promise.reject(
            CodedException(
              "ERR_REVOKE",
              "Falha ao revogar permissions: ${e.message}",
              e
            )
          )
        }
      }
    }

    // ---------- READ RECORDS ----------

    // Le registros do HC dentro do janela de tempo. Suporta paginacao via
    // pageSize/pageToken. Retorna shape consumido em src/index.ts:
    //   { records: Array<Map>, pageToken: String? }
    //
    // Input:
    //   recordType: String  (Steps, ExerciseSession, Weight, BodyFat,
    //                       HeartRate, SleepSession, MenstruationFlow)
    //   options: Map<String, Any?> com chaves:
    //     - timeRangeFilter: { operator: 'between', startTime: ISO, endTime: ISO }
    //     - ascendingOrder?: Boolean (default true)
    //     - pageSize?: Int (default 1000)
    //     - pageToken?: String
    //
    // Reusa recordTypeToKClass() e Utils.recordToMap() para conversao.
    // Roda em Dispatchers.IO (suspend call do HC + paginacao podem
    // bloquear thread principal).
    AsyncFunction("readRecords") { recordType: String, options: Map<String, Any?>, promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.reject(
          CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
        )

      val recordClass = recordTypeToKClass(recordType)
        ?: return@AsyncFunction promise.reject(
          CodedException(
            "ERR_UNKNOWN_RECORD_TYPE",
            "recordType desconhecido: $recordType",
            null
          )
        )

      val timeRangeFilter = try {
        buildTimeRangeFilter(options["timeRangeFilter"])
      } catch (e: Throwable) {
        return@AsyncFunction promise.reject(
          CodedException(
            "ERR_INVALID_TIME_RANGE",
            "timeRangeFilter invalido: ${e.message}",
            e
          )
        )
      }

      val ascendingOrder = (options["ascendingOrder"] as? Boolean) ?: true
      val pageSize = (options["pageSize"] as? Number)?.toInt() ?: 1000
      val pageToken = options["pageToken"] as? String

      CoroutineScope(Dispatchers.IO).launch {
        try {
          val client = HealthConnectClient.getOrCreate(context, providerPackageName)
          val request = ReadRecordsRequest(
            recordType = recordClass,
            timeRangeFilter = timeRangeFilter,
            dataOriginFilter = emptySet(),
            ascendingOrder = ascendingOrder,
            pageSize = pageSize,
            pageToken = pageToken
          )
          val response = client.readRecords(request)
          val records = response.records.mapNotNull { recordToMap(it) }
          promise.resolve(
            mapOf(
              "records" to records,
              "pageToken" to response.pageToken
            )
          )
        } catch (e: Throwable) {
          promise.reject(
            CodedException(
              "ERR_READ_RECORDS",
              "Falha ao ler records: ${e.message}",
              e
            )
          )
        }
      }
    }

    // ---------- INSERT RECORDS ----------

    // Persiste records no HC. Caller envia Array<Map> com chave 'recordType'
    // discriminada (ExerciseSession | Weight | BodyFat | MenstruationFlow).
    // Conversao Map -> Record feita em Utils.mapToRecord() (suspend nao,
    // apenas alocacao). insertRecords do client e suspend, roda em
    // Dispatchers.IO. Retorna Array<String> com os ids gerados pelo HC
    // (resp.recordIdsList) na mesma ordem do input.
    //
    // Idempotencia: HC nao dedupa por padrao. Sub-sprint D pode prover
    // clientRecordId no shape JS para habilitar dedup pelo lado do HC;
    // sub-sprint C nao implementa.
    //
    // Validacao de input em parse-time: shape invalido (recordType
    // desconhecido, campo obrigatorio ausente, unidade nao suportada)
    // resolve a promise em rejeicao com ERR_INVALID_INPUT antes de
    // qualquer chamada de rede.
    AsyncFunction("insertRecords") { inputs: List<Map<String, Any?>>, promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.reject(
          CodedException("ERR_NO_CONTEXT", "react context indisponivel", null)
        )

      val records = try {
        inputs.map { mapToRecord(it) }
      } catch (e: Throwable) {
        return@AsyncFunction promise.reject(
          CodedException(
            "ERR_INVALID_INPUT",
            "Falha ao converter input: ${e.message}",
            e
          )
        )
      }

      CoroutineScope(Dispatchers.IO).launch {
        try {
          val client = HealthConnectClient.getOrCreate(context, providerPackageName)
          val response = client.insertRecords(records)
          promise.resolve(response.recordIdsList)
        } catch (e: Throwable) {
          promise.reject(
            CodedException(
              "ERR_INSERT_RECORDS",
              "Falha ao inserir records: ${e.message}",
              e
            )
          )
        }
      }
    }
  }

  // Constroi TimeRangeFilter a partir do shape JS. Apenas operator='between'
  // suportado na sub-sprint B; before/after/none ficam para sub-sprints
  // futuras se a UI precisar (today autopull usa between).
  private fun buildTimeRangeFilter(raw: Any?): TimeRangeFilter {
    val map = raw as? Map<*, *>
      ?: throw IllegalArgumentException("timeRangeFilter ausente ou nao e Map")
    val operator = map["operator"] as? String
      ?: throw IllegalArgumentException("timeRangeFilter.operator ausente")
    return when (operator) {
      "between" -> {
        val startTime = map["startTime"] as? String
          ?: throw IllegalArgumentException("timeRangeFilter.startTime ausente")
        val endTime = map["endTime"] as? String
          ?: throw IllegalArgumentException("timeRangeFilter.endTime ausente")
        TimeRangeFilter.between(Instant.parse(startTime), Instant.parse(endTime))
      }
      else -> throw IllegalArgumentException("operator nao suportado: $operator")
    }
  }

  // Registra o ActivityResultLauncher sob demanda. Re-registra se a
  // activity foi recriada (hash mudou). Precisa rodar na main thread.
  private fun ensureLauncherRegistered(activity: ComponentActivity) {
    if (permissionLauncher != null && registeredForActivityHash == activity.hashCode()) {
      return
    }
    val contract = PermissionController.createRequestPermissionResultContract()
    // Usa activityResultRegistry diretamente para evitar requisito do
    // registerForActivityResult de ser chamado antes do STARTED state.
    val key = "ouroboros-hc-req-${UUID.randomUUID()}"
    permissionLauncher = activity.activityResultRegistry.register(
      key,
      contract
    ) { grantedSet: Set<String> ->
      val promise = pendingPromise
      val perms = pendingRequestedPerms
      pendingPromise = null
      pendingRequestedPerms = null
      if (promise == null) {
        return@register
      }
      try {
        // Reconverte tokens concedidos para shape JS, filtrando para
        // manter apenas o que veio no input original (caller espera
        // subset, nao a lista global).
        val grantedJs = grantedSet.mapNotNull { healthPermissionTokenToMap(it) }
        val requested = perms ?: emptyList()
        val intersection = grantedJs.filter { gMap ->
          requested.any { rMap ->
            rMap["accessType"] == gMap["accessType"] &&
              rMap["recordType"] == gMap["recordType"]
          }
        }
        promise.resolve(intersection)
      } catch (e: Throwable) {
        promise.reject(
          CodedException(
            "ERR_RESULT_PARSE",
            "Falha ao processar resultado de permission: ${e.message}",
            e
          )
        )
      }
    }
    registeredForActivityHash = activity.hashCode()
  }

  // Converte { accessType, recordType } em token HealthPermission do
  // androidx (string canonica que o HC SDK aceita). Lanca se recordType
  // for desconhecido ou accessType invalido.
  private fun mapToHealthPermissionToken(perm: Map<String, String>): String {
    val accessType = perm["accessType"]
      ?: throw IllegalArgumentException("accessType ausente em $perm")
    val recordType = perm["recordType"]
      ?: throw IllegalArgumentException("recordType ausente em $perm")

    val klass = recordTypeToKClass(recordType)
      ?: throw IllegalArgumentException("recordType desconhecido: $recordType")

    return when (accessType) {
      "read" -> HealthPermission.getReadPermission(klass)
      "write" -> HealthPermission.getWritePermission(klass)
      else -> throw IllegalArgumentException("accessType invalido: $accessType")
    }
  }

  // Reverte token HealthPermission para shape JS. Retorna null se token
  // nao for reconhecido (deixa caller filtrar).
  private fun healthPermissionTokenToMap(token: String): Map<String, String>? {
    // Tokens canonicos da AndroidX Health Connect tem prefixo
    // "android.permission.health.READ_..." ou "..._WRITE_...".
    // PermissionController.getGrantedPermissions devolve nessa forma.
    val readPrefix = "android.permission.health.READ_"
    val writePrefix = "android.permission.health.WRITE_"
    val (accessType, body) = when {
      token.startsWith(readPrefix) -> "read" to token.removePrefix(readPrefix)
      token.startsWith(writePrefix) -> "write" to token.removePrefix(writePrefix)
      else -> return null
    }
    val recordType = androidPermissionBodyToRecordType(body) ?: return null
    return mapOf("accessType" to accessType, "recordType" to recordType)
  }

  // Mapeia recordType (string canonica do JS) para KClass<out Record>.
  // Sub-sprint A cobre apenas os 7 tipos do PERMISSOES_CANONICAS em
  // src/lib/health/permissions.ts (Steps, ExerciseSession, Weight,
  // BodyFat, HeartRate, SleepSession, MenstruationFlow). Sub-sprints
  // B/C adicionam outros.
  private fun recordTypeToKClass(
    recordType: String
  ): kotlin.reflect.KClass<out androidx.health.connect.client.records.Record>? {
    return when (recordType) {
      "Steps" -> androidx.health.connect.client.records.StepsRecord::class
      "ExerciseSession" -> androidx.health.connect.client.records.ExerciseSessionRecord::class
      "Weight" -> androidx.health.connect.client.records.WeightRecord::class
      "BodyFat" -> androidx.health.connect.client.records.BodyFatRecord::class
      "HeartRate" -> androidx.health.connect.client.records.HeartRateRecord::class
      "SleepSession" -> androidx.health.connect.client.records.SleepSessionRecord::class
      "MenstruationFlow" -> androidx.health.connect.client.records.MenstruationFlowRecord::class
      else -> null
    }
  }

  // Reverte body do permission token canonico em recordType JS.
  // Tokens canonicos: STEPS, EXERCISE, WEIGHT, BODY_FAT, HEART_RATE,
  // SLEEP, MENSTRUATION (Health Connect 1.1.0).
  private fun androidPermissionBodyToRecordType(body: String): String? {
    return when (body) {
      "STEPS" -> "Steps"
      "EXERCISE" -> "ExerciseSession"
      "WEIGHT" -> "Weight"
      "BODY_FAT" -> "BodyFat"
      "HEART_RATE" -> "HeartRate"
      "SLEEP" -> "SleepSession"
      "MENSTRUATION" -> "MenstruationFlow"
      else -> null
    }
  }
}
