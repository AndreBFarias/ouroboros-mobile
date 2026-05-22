package com.ouroboros.healthconnect

// Activity dedicada exigida pelo Health Connect moderno (provider
// com.google.android.apps.healthdata >= 2026.04.16.00.release).
//
// R-INT-3-HC-EMPIRICAL-FINDINGS (2026-05-22): decompile de Tuya e Claude
// revelou que ambos tem uma activity dedicada PermissionsRationaleActivity
// com APENAS o intent-filter androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE
// (sem outros filters), apontada como targetActivity do activity-alias
// ViewPermissionUsageActivity. Sem essa activity dedicada (apontando
// para MainActivity que tem multiplos intent-filters de launcher/deep
// link), o HC moderno retorna getSdkStatus() = 3 mesmo com todas as
// outras provisoes corretas.
//
// Esta activity e um shim minimalista: ao ser disparada pelo HC, redireciona
// imediatamente o usuario para a tela /settings/integracoes do app
// principal via deep link, ou simplesmente fecha se ja estiver visivel.
// A logica de exibir rationale propriamente dita vive em
// app/_internal/health-rationale.tsx no JS (Expo Router).
//
// Comentarios sem acentuacao.
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val deepLink = Intent(Intent.ACTION_VIEW).apply {
      data = Uri.parse("ouroboros://_internal/health-rationale")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    try {
      startActivity(deepLink)
    } catch (_: Throwable) {
      // Se o deep link falhar (Expo Router nao carregado, app fechado etc),
      // apenas finaliza silenciosamente. O usuario ainda pode abrir o app
      // manualmente para gerenciar permissoes em Integracoes > Saude Fisica.
    }
    finish()
  }
}
