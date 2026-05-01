package expo.modules.widgethomescreen

// AppWidgetProvider canonico do Ouroboros. Le widget-data.json do
// cacheDir do app e popula RemoteViews para os 2 tamanhos (4x2 e
// 4x4). Quando a flag `ativo` esta false, renderiza layout vazio
// com mensagem instruindo o usuario a reativar em Configuracoes.
//
// Decisoes da sprint M20:
//   - Sem rede (ADR-0007).
//   - Sem gamificacao (ADR-0005): nao colore numero do humor.
//   - Privacidade: avatar mostra apenas inicial por padrao;
//     nome completo so quando widgetMostraNome=true no JSON.
//   - Tap em qualquer atalho abre o app via deep link
//     (ouroboros://...) repassado pelo PendingIntent.

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File

open class OuroborosWidgetProvider : AppWidgetProvider() {

  protected open val layoutId: Int = R.layout.widget_4x2
  protected open val isLarge: Boolean = false

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val data = readWidgetData(context)
    appWidgetIds.forEach { id ->
      val views = if (data == null || !data.ativo) {
        buildDisabledViews(context)
      } else {
        buildActiveViews(context, data)
      }
      appWidgetManager.updateAppWidget(id, views)
    }
  }

  private fun buildDisabledViews(context: Context): RemoteViews {
    return RemoteViews(context.packageName, R.layout.widget_desativado)
  }

  private fun buildActiveViews(
    context: Context,
    data: WidgetData
  ): RemoteViews {
    val views = RemoteViews(context.packageName, layoutId)

    views.setTextViewText(R.id.widget_avatar_inicial, data.avatarLetra)
    views.setInt(
      R.id.widget_avatar_inicial,
      "setBackgroundColor",
      parseColorOrDefault(data.avatarCor, 0xFFBD93F9.toInt())
    )

    val humorTexto = if (data.humor == null) {
      context.getString(R.string.widget_sem_registro)
    } else {
      "${data.humor}/5"
    }
    views.setTextViewText(R.id.widget_humor_valor, humorTexto)

    if (isLarge) {
      val frase = data.frase?.takeIf { it.isNotBlank() }
        ?: context.getString(R.string.widget_frase_default)
      views.setTextViewText(R.id.widget_frase, frase)
      paintHeatmap(views, data.heatmap)
    }

    bindShortcut(context, views, R.id.widget_btn_humor, "humor")
    bindShortcut(context, views, R.id.widget_btn_voz, "voz")
    bindShortcut(context, views, R.id.widget_btn_camera, "camera")
    bindShortcut(context, views, R.id.widget_btn_vitoria, "vitoria")

    return views
  }

  private fun paintHeatmap(views: RemoteViews, heatmap: List<Int>) {
    val ids = listOf(
      R.id.widget_heat_0,
      R.id.widget_heat_1,
      R.id.widget_heat_2,
      R.id.widget_heat_3,
      R.id.widget_heat_4,
      R.id.widget_heat_5,
      R.id.widget_heat_6
    )
    ids.forEachIndexed { index, viewId ->
      val valor = heatmap.getOrNull(index) ?: 0
      val color = colorForHumor(valor)
      views.setInt(viewId, "setBackgroundColor", color)
    }
  }

  private fun colorForHumor(valor: Int): Int {
    // Sem gamificacao: mantem paleta neutra. Variacao apenas em
    // intensidade (alpha alterado via cores discretas Dracula).
    return when (valor) {
      0 -> 0xFF44475A.toInt()
      1, 2 -> 0xFF6272A4.toInt()
      3 -> 0xFFBD93F9.toInt()
      4, 5 -> 0xFF8BE9FD.toInt()
      else -> 0xFF44475A.toInt()
    }
  }

  private fun bindShortcut(
    context: Context,
    views: RemoteViews,
    viewId: Int,
    atalho: String
  ) {
    val uri = Uri.parse("ouroboros://capturar/$atalho?source=widget")
    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val pi = PendingIntent.getActivity(
      context,
      atalho.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(viewId, pi)
  }

  private fun parseColorOrDefault(hex: String?, fallback: Int): Int {
    if (hex.isNullOrBlank()) return fallback
    return try {
      android.graphics.Color.parseColor(hex)
    } catch (_: Throwable) {
      fallback
    }
  }

  private fun readWidgetData(context: Context): WidgetData? {
    val file = File(context.cacheDir, "widget-data.json")
    if (!file.exists()) return null
    return try {
      val raw = file.readText(Charsets.UTF_8)
      WidgetData.fromJson(JSONObject(raw))
    } catch (_: Throwable) {
      null
    }
  }
}

// Variante 4x4. Reusa toda a logica acima trocando layoutId.
class OuroborosWidgetProviderLarge : OuroborosWidgetProvider() {
  override val layoutId: Int = R.layout.widget_4x4
  override val isLarge: Boolean = true
}

internal data class WidgetData(
  val ativo: Boolean,
  val avatarLetra: String,
  val avatarCor: String?,
  val humor: Int?,
  val frase: String?,
  val heatmap: List<Int>
) {
  companion object {
    fun fromJson(obj: JSONObject): WidgetData {
      val heatmapArr = obj.optJSONArray("heatmap")
      val heatmap = mutableListOf<Int>()
      if (heatmapArr != null) {
        for (i in 0 until heatmapArr.length()) {
          heatmap.add(heatmapArr.optInt(i, 0))
        }
      }
      return WidgetData(
        ativo = obj.optBoolean("ativo", false),
        avatarLetra = obj.optString("avatarLetra", "?"),
        avatarCor = obj.optString("avatarCor", null),
        humor = if (obj.has("humor") && !obj.isNull("humor")) {
          obj.optInt("humor", 0).takeIf { it in 1..5 }
        } else {
          null
        },
        frase = if (obj.has("frase") && !obj.isNull("frase")) {
          obj.optString("frase", "")
        } else {
          null
        },
        heatmap = heatmap
      )
    }
  }
}
