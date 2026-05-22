package com.ouroboros.healthconnect

// Bridge Health Connect nativa propria do Ouroboros.
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint A.
//
// Substitui react-native-health-connect@3.5.3 (que usa connect-client
// 1.1.0-alpha11 obsoleto e e rejeitado pelo HC moderno como
// SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED).
//
// Sub-sprint A entrega skeleton + availability + permissions. Sub-sprints
// B (readRecords), C (insertRecords), D (sync.ts migration) ficam para
// depois.
//
// API JS exposta (compat com src/lib/health/{availability,permissions}.ts):
//   - getSdkStatus(): Promise<Int>           (1 = available, 2 = unavailable, 3 = needs_update)
//   - initialize(): Promise<Boolean>
//   - openHealthConnectSettings(): void
//   - requestPermission(perms): Promise<perms[]>
//   - getGrantedPermissions(): Promise<perms[]>
//   - revokeAllPermissions(): Promise<void>
//
// Convencao: comentarios sem acento (shell/CI).

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
  // SLEEP, MENSTRUATION (Health Connect 1.2.0-alpha04).
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
