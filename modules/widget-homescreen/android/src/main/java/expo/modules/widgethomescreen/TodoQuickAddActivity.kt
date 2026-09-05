package expo.modules.widgethomescreen

// Janela de captura rapida do widget Quick To-do (AUDIT-P1-1B, saida (B)
// decidida pelo dono em 2026-09-05).
//
// Por que uma Activity e nao um campo dentro do widget: o RemoteInput
// inline nao existe. A API que o TODO antigo mandava usar
// (RemoteViewsCompat.setRemoteInputs) nao esta publicada em nenhuma versao
// de androidx.core:core-remoteviews, e RemoteViews tambem nao a expoe no
// android.jar. As saidas viaveis eram direct-reply por notificacao (tira a
// digitacao da tela inicial) ou esta: uma janelinha com EditText de
// verdade, sobre a tela inicial, que grava na mesma fila.
//
// Fluxo:
//   1. Toque no widget -> PendingIntent.getActivity abre esta janela.
//   2. Pessoa digita e confirma -> broadcast ACTION_TODO_ADD para o
//      OuroborosTodoWidgetProvider com o titulo em EXTRA_TODO_TITULO.
//   3. O provider anexa a entry na fila e re-renderiza o widget. Esta
//      Activity NAO conhece o formato da fila nem o nome do arquivo: quem
//      grava continua sendo appendEntry, num lugar so.
//
// Regras de comportamento:
//   - Nunca abre a Stack principal do app. Task propria
//     via taskAffinity="" no manifest; aparece, grava e fecha.
//   - Toque fora cancela sem gravar (setFinishOnTouchOutside).
//   - Texto vazio ou so espacos nao enfileira nada.
//   - Rotacao e morte de processo: o texto sobrevive pelo save automatico
//     da view hierarchy (o EditText tem id e freezesText). Reabrir pelo
//     widget reaproveita a mesma instancia (launchMode singleTask), entao
//     sair e voltar tambem preserva o rascunho.
//
// Comentarios sem acentuacao.

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.Toast

class TodoQuickAddActivity : Activity() {

  private lateinit var campo: EditText

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_todo_quick_add)

    // Explicito porque o default depende do tema herdado: tocar fora da
    // janela fecha sem gravar.
    setFinishOnTouchOutside(true)

    campo = findViewById(R.id.todo_quick_add_campo)
    // Sem restaurar texto manualmente: o proprio sistema ja devolveu o
    // conteudo do EditText a partir do savedInstanceState antes daqui.
    // Reescrever aqui apagaria o que ele restaurou.
    campo.setOnEditorActionListener { _, actionId, _ ->
      if (actionId == EditorInfo.IME_ACTION_DONE) {
        confirmar()
        true
      } else {
        false
      }
    }

    findViewById<Button>(R.id.todo_quick_add_confirmar).setOnClickListener { confirmar() }
    findViewById<Button>(R.id.todo_quick_add_cancelar).setOnClickListener { finish() }
  }

  // AUDIT-P1-1B: a janela nao sobrevive a ida para segundo plano.
  //
  // Com launchMode=singleTask + excludeFromRecents e SEM isto, sair pelo
  // Home em vez de Cancelar deixava a task viva, invisivel e inalcancavel
  // pelo multitarefa. Dias depois, o toque no widget caia em onNewIntent
  // da MESMA instancia e reabria a janela com o texto antigo ja digitado
  // -- exatamente o "rascunho ressurgindo dias depois" que se descartou
  // ao decidir nao persistir rascunho em disco. O comportamento pedido e
  // "aparece, grava e fecha".
  //
  // Rotacao continua coberta: ali o sistema chama onSaveInstanceState e
  // recria a Activity, sem passar por onStop com isFinishing falso.
  override fun onStop() {
    super.onStop()
    if (!isFinishing) finish()
  }

  private fun confirmar() {
    val titulo = campo.text?.toString()?.trim().orEmpty()
    if (titulo.isEmpty()) {
      // Nao fecha: a pessoa abriu a janela para escrever algo. Fechar em
      // silencio pareceria que a tarefa foi gravada.
      Toast.makeText(this, R.string.widget_todo_dialog_vazio, Toast.LENGTH_SHORT).show()
      return
    }
    val intent = Intent(this, OuroborosTodoWidgetProvider::class.java).apply {
      action = OuroborosTodoWidgetProvider.ACTION_TODO_ADD
      putExtra(OuroborosTodoWidgetProvider.EXTRA_TODO_TITULO, titulo)
    }
    sendBroadcast(intent)
    finish()
  }
}
