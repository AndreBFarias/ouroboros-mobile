package expo.modules.widgethomescreen

// AppWidgetProvider do widget Quick To-do (R-WIDG-1, 2026-05-17;
// captura reescrita na AUDIT-P1-1B, 2026-09-05).
// Layout 4x2 com:
//   - TextView com cara de campo, que abre a janela de captura ao toque.
//   - Botao "+" que abre a mesma janela.
//   - TextView com count de tarefas pendentes (lido de
//     cacheDir/widget-todo-count.json gravado pelo JS).
//
// Fluxo:
//   1. Usuario tapa o campo ou o "+" -> PendingIntent.getActivity abre a
//      TodoQuickAddActivity, uma janela com tema de dialogo sobre a tela
//      inicial. Nao ha campo de digitacao dentro do widget: RemoteInput
//      inline nao tem API publica (ver TodoQuickAddActivity).
//   2. Usuario confirma na janela -> ela envia broadcast ACTION_TODO_ADD
//      para este provider com o titulo em EXTRA_TODO_TITULO.
//   3. onReceive le o texto, anexa entry em cacheDir/widget-todo-queue.json
//      e re-renderiza. O count exibido soma o que o JS ja drenou com o
//      tamanho da fila nativa, entao a captura aparece na hora -- sem
//      isso, sucesso e falha ficariam identicos na tela.
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
      // Dois caminhos, uma fila so. EXTRA_TODO_TITULO e o caminho vivo,
      // vindo da TodoQuickAddActivity. O RemoteInput fica como fallback
      // para nao quebrar um PendingIntent antigo que ainda esteja
      // pendurado num widget do sistema.
      val titulo = intent.getStringExtra(EXTRA_TODO_TITULO)
        ?: extractRemoteInputText(intent)
      if (!titulo.isNullOrBlank()) {
        appendEntry(context, titulo.trim())
        refreshAllInstances(context)
      }
    }
  }

  private fun buildViews(context: Context, count: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_todo_4x2)

    // Campo "input" do widget: TextView que abre a janela de captura
    // quando tocado. Botao "+" reusa o mesmo PendingIntent para
    // ergonomia: tocar em qualquer lugar abre a janela.
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

  // Constroi o PendingIntent do toque no widget: abre a
  // TodoQuickAddActivity, a janela onde a pessoa digita de fato.
  //
  // Historico (AUDIT-P1-1B, 2026-09-05): aqui existia um broadcast com um
  // RemoteInput construido e descartado, e um TODO mandando o proximo
  // leitor usar RemoteViewsCompat.setRemoteInputs. Essa API nao existe --
  // nem em androidx.core:core-remoteviews (para em 1.1.0), nem em
  // RemoteViews no android.jar da API 36. Sem caminho publico de
  // RemoteInput inline, o dono escolheu a saida (B): activity com tema de
  // dialogo, gravando na mesma fila. A (A), direct-reply por notificacao,
  // tiraria a digitacao da tela inicial.
  //
  // FLAG_IMMUTABLE: nada precisa ser preenchido por quem dispara -- o
  // texto so passa a existir depois que a Activity roda.
  private fun buildAddPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, TodoQuickAddActivity::class.java).apply {
      // Obrigatorio para iniciar Activity fora de um contexto de
      // Activity. A task e propria (taskAffinity="" no manifest), entao
      // isso nao traz a Stack do app para a frente.
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  // Caminho antigo, mantido como fallback: le o texto de um RemoteInput
  // anexado ao intent. Nenhum PendingIntent novo carrega RemoteInput
  // desde a AUDIT-P1-1B, mas um widget ja colocado na tela inicial pode
  // ter um intent velho pendurado ate o proximo update.
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

  // Le count pendente: o que o JS ja drenou MAIS o que ainda esta na fila
  // nativa.
  //
  // AUDIT-P1-1B: antes somava so' o COUNT_FILENAME, gravado pelo JS em
  // atualizarCountTodo -- que so' roda com o app aberto. Enquanto o
  // caminho de escrita nativo estava morto (o RemoteInput nunca entregava
  // texto) isso nao era observavel. Com a janela de captura funcionando,
  // viraria o primeiro defeito visivel: a pessoa digita, confirma, a
  // janela fecha e o widget continua exibindo o MESMO numero ate abrir o
  // app. Sucesso e falha ficariam indistinguiveis na tela.
  //
  // Somar a fila resolve sem duplicar contagem: drenarFilaTodoWidget
  // esvazia o arquivo da fila no mesmo boot em que atualiza o count, entao
  // uma entry conta de um lado ou do outro, nunca dos dois.
  private fun readPendingCount(context: Context): Int {
    return readCountDoJs(context) + readTamanhoFila(context)
  }

  // Count gravado pelo JS. Ausente -> 0. Malformado -> 0 (defesa em
  // profundidade: cache cheio ou escrita truncada nao pode crashar o
  // widget).
  private fun readCountDoJs(context: Context): Int {
    val file = File(context.cacheDir, COUNT_FILENAME)
    if (!file.exists()) return 0
    return try {
      val raw = file.readText(Charsets.UTF_8)
      JSONObject(raw).optInt("count", 0)
    } catch (_: Throwable) {
      0
    }
  }

  // Entries capturadas pelo widget e ainda nao drenadas pelo app.
  private fun readTamanhoFila(context: Context): Int {
    val file = File(context.cacheDir, FILA_FILENAME)
    if (!file.exists()) return 0
    return try {
      JSONArray(file.readText(Charsets.UTF_8)).length()
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
    // AUDIT-P1-1B: titulo enviado pela TodoQuickAddActivity.
    const val EXTRA_TODO_TITULO = "expo.modules.widgethomescreen.EXTRA_TODO_TITULO"
    const val FILA_FILENAME = "widget-todo-queue.json"
    const val COUNT_FILENAME = "widget-todo-count.json"
  }
}
