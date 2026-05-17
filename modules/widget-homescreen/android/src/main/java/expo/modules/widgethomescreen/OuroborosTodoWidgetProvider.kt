package expo.modules.widgethomescreen

// AppWidgetProvider do widget Quick To-do (R-WIDG-1, 2026-05-17).
// Layout 4x2 com:
//   - EditText para o usuario digitar titulo da tarefa.
//   - Botao "+" que envia broadcast ACTION_TODO_ADD com texto via
//     RemoteInput (modal sutil; o EditText em RemoteViews nao
//     responde a input fora de RemoteInput).
//   - TextView com count de tarefas pendentes (lido de
//     cacheDir/widget-todo-count.json gravado pelo JS).
//
// Fluxo:
//   1. Usuario tapa botao "+" -> Android abre input nativo (RemoteInput
//      fill-in).
//   2. Usuario confirma -> Android envia broadcast ACTION_TODO_ADD para
//      este provider com texto no extra ACTION_TODO_INPUT_KEY.
//   3. onReceive le o texto, anexa entry em cacheDir/widget-todo-queue.json
//      e renderiza widget com count atualizado (ainda nao processado).
//   4. Quando o app abre (boot hook sincronizarWidgetTodoBootHook), JS
//      le a fila e cria Tarefa real no Vault.
//
// Persistencia: arquivos em context.cacheDir (filtrado, sem SAF).
//   - widget-todo-queue.json: array de { titulo, criadoEmMs }.
//   - widget-todo-count.json: { count: <int> }.
//
// Decisoes:
//   - Sem rede (ADR-0007).
//   - Sem gamificacao (ADR-0005): nao colore numero.
//   - Privacidade: titulos so vivem no cacheDir do app + Vault privado;
//     widget renderiza apenas count, nunca lista de titulos.
//   - PendingIntent.FLAG_IMMUTABLE obrigatorio (Android 31+).

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.RemoteViews
import androidx.core.app.RemoteInput
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class OuroborosTodoWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val count = readPendingCount(context)
    appWidgetIds.forEach { id ->
      val views = buildViews(context, count)
      appWidgetManager.updateAppWidget(id, views)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_TODO_ADD) {
      val titulo = extractRemoteInputText(intent)
      if (!titulo.isNullOrBlank()) {
        appendEntry(context, titulo.trim())
        refreshAllInstances(context)
      }
    }
  }

  private fun buildViews(context: Context, count: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_todo_4x2)

    // Campo "input" do widget: TextView que abre input nativo
    // (RemoteInput) quando tocado. Botao "+" reusa o mesmo
    // PendingIntent para ergonomia: tocar em qualquer lugar abre input.
    val pi = buildAddPendingIntent(context)
    views.setOnClickPendingIntent(R.id.widget_todo_input, pi)
    views.setOnClickPendingIntent(R.id.widget_todo_btn_add, pi)

    // Count de pendentes. 0 -> texto neutro PT-BR. Maior -> contagem
    // simples sem badge colorido (ADR-0005 sem gamificacao).
    val texto = if (count <= 0) {
      context.getString(R.string.widget_todo_sem_pendentes)
    } else {
      context.resources.getQuantityString(
        R.plurals.widget_todo_pendentes,
        count,
        count
      )
    }
    views.setTextViewText(R.id.widget_todo_count, texto)

    return views
  }

  // Constroi PendingIntent que dispara ACTION_TODO_ADD com RemoteInput.
  // Caller adiciona resultado em extra ACTION_TODO_INPUT_KEY via
  // RemoteInput.addResultsToIntent.
  private fun buildAddPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, OuroborosTodoWidgetProvider::class.java).apply {
      action = ACTION_TODO_ADD
    }
    val remoteInput = RemoteInput.Builder(ACTION_TODO_INPUT_KEY)
      .setLabel(context.getString(R.string.widget_todo_input_hint))
      .build()
    val pi = PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
    )
    // RemoteInput precisa ser anexado ao PendingIntent via Notification
    // Action ou diretamente via setRemoteInputs no RemoteViews. Como
    // este widget nao tem Notification, anexamos diretamente.
    RemoteViews(context.packageName, R.layout.widget_todo_4x2)
      .setRemoteInputs(R.id.widget_todo_btn_add, arrayOf(remoteInput))
    return pi
  }

  private fun extractRemoteInputText(intent: Intent): String? {
    val bundle: Bundle = RemoteInput.getResultsFromIntent(intent) ?: return null
    return bundle.getCharSequence(ACTION_TODO_INPUT_KEY)?.toString()
  }

  // Anexa nova entry no arquivo JSON da fila. Append-only: array de
  // objetos { titulo: string, criadoEmMs: number }. Cria o arquivo
  // se inexistente. Resiliente a corrupcao: trata JSON quebrado como
  // array vazio e sobrescreve com array unitario contendo a nova entry
  // (perde entries antigas quando havia corrupcao; trade off aceitavel
  // para nao bloquear adicao).
  private fun appendEntry(context: Context, titulo: String) {
    val file = File(context.cacheDir, FILA_FILENAME)
    val current: JSONArray = try {
      if (file.exists()) {
        JSONArray(file.readText(Charsets.UTF_8))
      } else {
        JSONArray()
      }
    } catch (_: Throwable) {
      JSONArray()
    }
    val entry = JSONObject().apply {
      put("titulo", titulo.take(200))
      put("criadoEmMs", System.currentTimeMillis())
    }
    current.put(entry)
    try {
      file.writeText(current.toString(), Charsets.UTF_8)
    } catch (_: Throwable) {
      // Silencia: usuario pode ter o cache cheio; falha de adicao nao
      // deve crashar o widget.
    }
  }

  // Le count pendente do cache gravado pelo JS. Ausente -> 0.
  // Malformado -> 0 (defesa em profundidade).
  private fun readPendingCount(context: Context): Int {
    val file = File(context.cacheDir, COUNT_FILENAME)
    if (!file.exists()) return 0
    return try {
      val raw = file.readText(Charsets.UTF_8)
      JSONObject(raw).optInt("count", 0)
    } catch (_: Throwable) {
      0
    }
  }

  // Dispara update broadcast para todas as instancias deste provider.
  // Usado depois de appendEntry para re-renderizar o widget.
  private fun refreshAllInstances(context: Context) {
    val mgr = AppWidgetManager.getInstance(context)
    val cn = ComponentName(context, OuroborosTodoWidgetProvider::class.java)
    val ids = mgr.getAppWidgetIds(cn)
    if (ids.isNotEmpty()) {
      val intent = Intent(context, OuroborosTodoWidgetProvider::class.java).apply {
        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      }
      context.sendBroadcast(intent)
    }
  }

  companion object {
    const val ACTION_TODO_ADD = "expo.modules.widgethomescreen.ACTION_TODO_ADD"
    const val ACTION_TODO_INPUT_KEY = "todo_input"
    const val FILA_FILENAME = "widget-todo-queue.json"
    const val COUNT_FILENAME = "widget-todo-count.json"
  }
}
