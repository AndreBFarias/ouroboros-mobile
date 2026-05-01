package expo.modules.widgethomescreen

// Bridge JS -> Kotlin. Expoe duas funcoes para o JS:
//   - atualizarWidget(jsonString): grava o JSON em cacheDir/widget-data.json
//     e dispara updateAppWidget para todos os IDs ativos.
//   - desativarWidget(): grava JSON com ativo=false e dispara update.
// A logica pesada de RemoteViews fica no provider; aqui so invoca.

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class WidgetHomescreenModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("WidgetHomescreen")

    AsyncFunction("atualizarWidget") { jsonString: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("react context indisponivel")
      val file = File(context.cacheDir, "widget-data.json")
      file.writeText(jsonString, Charsets.UTF_8)
      forcarUpdate()
      return@AsyncFunction true
    }

    AsyncFunction("desativarWidget") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("react context indisponivel")
      val file = File(context.cacheDir, "widget-data.json")
      file.writeText("{\"ativo\":false}", Charsets.UTF_8)
      forcarUpdate()
      return@AsyncFunction true
    }
  }

  private fun forcarUpdate() {
    val context = appContext.reactContext ?: return
    val mgr = AppWidgetManager.getInstance(context)
    listOf(
      OuroborosWidgetProvider::class.java,
      OuroborosWidgetProviderLarge::class.java
    ).forEach { providerClass ->
      val cn = ComponentName(context, providerClass)
      val ids = mgr.getAppWidgetIds(cn)
      if (ids.isNotEmpty()) {
        val intent = Intent(context, providerClass).apply {
          action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intent)
      }
    }
  }
}
