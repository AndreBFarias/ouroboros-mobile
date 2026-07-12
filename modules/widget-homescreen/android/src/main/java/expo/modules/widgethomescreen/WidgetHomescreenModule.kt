package expo.modules.widgethomescreen

// Bridge JS -> Kotlin do widget homescreen (M20 + R-WIDG-1).
//
// M20 - widget Humor (4x2 e 4x4):
//   - atualizarWidget(jsonString): grava o JSON em cacheDir/widget-data.json
//     e dispara updateAppWidget para todos os IDs ativos.
//   - desativarWidget(): grava JSON com ativo=false e dispara update.
//
// R-WIDG-1 - widget Quick To-do (4x2 dedicado):
//   - atualizarCountTodo(count: number): grava count em
//     cacheDir/widget-todo-count.json e dispara update do provider To-do.
//   - lerFilaTodo(): le cacheDir/widget-todo-queue.json e devolve JSON
//     string (array de entries). JS parseia e cria Tarefa real no Vault.
//   - limparFilaTodo(): sobrescreve a fila com array vazio. Chamado
//     pelo JS depois de drenar.
//
// A logica pesada de RemoteViews fica no provider; aqui so invoca.

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
      forcarUpdateHumor()
      return@AsyncFunction true
    }

    AsyncFunction("desativarWidget") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("react context indisponivel")
      val file = File(context.cacheDir, "widget-data.json")
      file.writeText("{\"ativo\":false}", Charsets.UTF_8)
      forcarUpdateHumor()
      return@AsyncFunction true
    }

    // R-WIDG-1: bridge para widget Quick To-do.
    AsyncFunction("atualizarCountTodo") { count: Int ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("react context indisponivel")
      val file = File(
        context.cacheDir,
        OuroborosTodoWidgetProvider.COUNT_FILENAME
      )
      // JSON minimo: { "count": <int> }. clamp em 0 para evitar
      // valores negativos chegando ao Kotlin que renderiza plural.
      val sane = count.coerceAtLeast(0)
      file.writeText("{\"count\":$sane}", Charsets.UTF_8)
      forcarUpdateTodo()
      return@AsyncFunction true
    }

    AsyncFunction("lerFilaTodo") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("react context indisponivel")
      val file = File(
        context.cacheDir,
        OuroborosTodoWidgetProvider.FILA_FILENAME
      )
      return@AsyncFunction if (file.exists()) {
        try {
          file.readText(Charsets.UTF_8)
        } catch (_: Throwable) {
          "[]"
        }
      } else {
        "[]"
      }
    }

    AsyncFunction("limparFilaTodo") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("react context indisponivel")
      val file = File(
        context.cacheDir,
        OuroborosTodoWidgetProvider.FILA_FILENAME
      )
      try {
        file.writeText("[]", Charsets.UTF_8)
      } catch (_: Throwable) {
        // Silencia: idempotente. Proxima escrita por appendEntry
        // sobrescreve corrompido com array unitario.
      }
      return@AsyncFunction true
    }
  }

  private fun forcarUpdateHumor() {
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

  // R-WIDG-1: refresh dedicado do widget To-do (provider separado).
  private fun forcarUpdateTodo() {
    val context = appContext.reactContext ?: return
    val mgr = AppWidgetManager.getInstance(context)
    val cn = ComponentName(context, OuroborosTodoWidgetProvider::class.java)
    val ids = mgr.getAppWidgetIds(cn)
    if (ids.isNotEmpty()) {
      val intent = Intent(
        context,
        OuroborosTodoWidgetProvider::class.java
      ).apply {
        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      }
      context.sendBroadcast(intent)
    }
  }
}
