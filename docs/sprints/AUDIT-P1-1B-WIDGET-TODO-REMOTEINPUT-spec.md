# AUDIT-P1-1B-WIDGET-TODO-REMOTEINPUT — anexa o RemoteInput ao PendingIntent do widget de tarefas

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (o widget é instalável, aparece na bandeja do sistema e responde
            ao toque, mas nunca captura texto: a feature inteira é fachada)
DEPENDE:    AUDIT-P1-1A mergeada (sem o dreno plugado, o texto capturado por este
            fix continuaria morrendo no `cacheDir` sem virar tarefa)
ORIGEM:     achado [P1-1] da auditoria de 2026-07-28, camada nativa. Encontrado ao
            ler `OuroborosTodoWidgetProvider.kt` inteiro e notar que a `val
            remoteInput` de `:104-106` não é usada por nenhuma linha subsequente,
            confirmado pelo TODO explícito de `:113-121`. As duas saídas sugeridas
            pelo TODO foram checadas contra o classpath real do módulo antes de
            entrarem no escopo.
```

## Problema (variável órfã: o input do widget nunca retorna texto)

`modules/widget-homescreen/android/src/main/java/expo/modules/widgethomescreen/OuroborosTodoWidgetProvider.kt:100-123`:

```kotlin
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
    // TODO(R-WIDG-FIX-REMOTEINPUTS): a chamada original
    //   RemoteViews(...).setRemoteInputs(R.id.widget_todo_btn_add, arrayOf(remoteInput))
    // era dead code (RemoteViews descartado, sem anexar ao views real
    // de updateAppWidget) e nao compila em compileSdk 35 (assinatura
    // setRemoteInputs nao publica em RemoteViews; precisa
    // RemoteViewsCompat.setRemoteInputs ou Notification Action).
    // Removido temporariamente para destravar build alpha-14. Efeito
    // funcional: input inline do widget pode nao retornar texto via
    // RemoteInput.getResultsFromIntent ate o fix definitivo.
    return pi
  }
```

`remoteInput` é construído e descartado. O `PendingIntent` devolvido não carrega
nenhum `RemoteInput`.

### Fluxo real, ponta a ponta

1. `buildViews` (`:71-95`) monta o `RemoteViews` do layout `widget_todo_4x2` e
   liga **o mesmo** `PendingIntent` ao campo de texto e ao botão "+"
   (`:77-79`), por ergonomia declarada no comentário `:74-76`. Os dois alvos são
   `TextView` no layout (`res/layout/widget_todo_4x2.xml`), não `EditText` — o
   texto só poderia vir de um `RemoteInput`.
2. O toque dispara o broadcast `ACTION_TODO_ADD`. O receiver está declarado com o
   `intent-filter` correspondente e `exported="true"`
   (`AndroidManifest.xml:33-44`), então o broadcast **chega**.
3. `onReceive` (`:60-69`) chama `extractRemoteInputText` (`:125-128`):

   ```kotlin
   private fun extractRemoteInputText(intent: Intent): String? {
     val bundle: Bundle = RemoteInput.getResultsFromIntent(intent) ?: return null
     return bundle.getCharSequence(ACTION_TODO_INPUT_KEY)?.toString()
   }
   ```

   Sem `RemoteInput` anexado, o sistema nunca abre o campo de resposta e nunca
   preenche os resultados: `getResultsFromIntent` devolve `null`,
   `extractRemoteInputText` devolve `null`, e o guard `if (!titulo.isNullOrBlank())`
   de `:64` descarta tudo.
4. Consequência: `appendEntry` (`:136-158`) nunca roda,
   `cacheDir/widget-todo-queue.json` nunca ganha entry, e toda a cadeia JS a
   jusante — `lerFilaTodo` / `limparFilaTodo` / `atualizarCountTodo` no bridge
   (`WidgetHomescreenModule.kt:51,66,84`, expostos em
   `modules/widget-homescreen/src/index.ts:83-133`) e o
   `drenarFilaTodoWidget` do JS — opera sobre uma fila permanentemente vazia.

Do ponto de vista do usuário: o widget existe, tem título "Tarefas", campo com o
hint "Nova tarefa", botão "+" roxo e contador de pendentes; toca-se e **nada
acontece**.

### Correções ao enunciado do TODO (checadas antes de escrever)

O TODO aponta duas saídas. As duas precisam de ajuste factual:

- **`RemoteViewsCompat.setRemoteInputs` não está no classpath.**
  `androidx.core.widget.RemoteViewsCompat` **não existe** em `androidx.core:core`.
  Verificado abrindo o `classes.jar` do `core-1.16.0.aar` no cache Gradle local:
  as únicas classes com "RemoteInput" no nome são `androidx/core/app/RemoteInput*`
  — que é justamente o import já usado em `:41`. `RemoteViewsCompat` é publicado no
  artefato **separado** `androidx.core:core-remoteviews`, que não está no cache e
  não é declarado em `modules/widget-homescreen/android/build.gradle:39-41`
  (o bloco `dependencies` tem exatamente uma linha:
  `implementation project(":expo-modules-core")`). Ou seja: adotar essa saída exige
  **primeiro** adicionar a dependência, e **depois** confirmar empiricamente que a
  classe resolvida expõe de fato `setRemoteInputs` — o que a auditoria não pôde
  verificar sem o artefato em disco.
- **A premissa do "compileSdk 35" está desatualizada.**
  `modules/widget-homescreen/android/build.gradle:15` usa
  `compileSdkVersion safeExtGet("compileSdkVersion", 35)` — o `35` é apenas
  *fallback*; o valor efetivo vem do `rootProject.ext`, que o
  `expo-build-properties` preenche com `"compileSdkVersion": 36` (`app.json:122`).
  A execução deve re-testar o bloqueio contra **36** antes de escolher o contorno:
  é possível que a assinatura original já resolva, ou que o erro seja outro.

### Rastro de dívida

O TODO cita o identificador `R-WIDG-FIX-REMOTEINPUTS`. Varredura em `docs/` não
encontra spec, ROADMAP ou backlog com esse ID — a dívida nunca foi materializada;
ficou como comentário no código desde o `alpha-14`. Esta sprint é a materialização.

## Escopo (mínimo)

1. **Re-verificar a premissa antes de contornar.** Restaurar a chamada direta
   (`views.setRemoteInputs(R.id.widget_todo_btn_add, arrayOf(remoteInput))` sobre
   o `RemoteViews` **real** de `buildViews`, não sobre um descartado) e compilar
   contra o compileSdk efetivo (36). Registrar no PR o erro literal do compilador
   se ainda falhar. Sem esse passo, o contorno pode estar resolvendo um problema
   que não existe mais.

2. **Anexar o `RemoteInput` de fato.** Escolher **uma** das saídas abaixo; a
   escolha é **decisão do dono**, porque muda a experiência na tela inicial. A
   auditoria recomenda (b) por ser 100% API pública e não exigir dependência nova,
   e registra (c) como plano de fuga.

   - **(a) `androidx.core:core-remoteviews` + `RemoteViewsCompat.setRemoteInputs`.**
     Melhor UX (campo inline no próprio widget, sem sair da tela inicial).
     Pré-requisitos: adicionar `implementation "androidx.core:core-remoteviews:<versão>"`
     em `modules/widget-homescreen/android/build.gradle:39-41` e **provar** que a
     API existe na versão resolvida. Se não existir, cair para (b).
   - **(b) Notification Action com direct-reply.** O toque no widget dispara o
     broadcast, que posta uma notificação com
     `NotificationCompat.Action.Builder(...).addRemoteInput(remoteInput)` apontando
     de volta para `ACTION_TODO_ADD`. A resposta chega ao mesmo receiver e
     `extractRemoteInputText` (`:125-128`) funciona **sem alteração**. Custos a
     declarar: canal de notificação (o app já registra canais em
     `app/_layout.tsx` via `registrarCategoriasAlarme`; reusar o canal v2 em vez
     de criar um novo) e permissão `POST_NOTIFICATIONS` no Android 13+ — se
     negada, a captura falha e o widget precisa dizer isso.
   - **(c) Activity transparente com campo de texto real.** O `PendingIntent` abre
     uma Activity leve que coleta o título e escreve na mesma fila
     (`appendEntry`, `:136-158`). API totalmente pública, zero dependência nova,
     zero permissão. Custo: sai da tela inicial, que é o ponto da feature.

   **Proibido**: alcançar a assinatura oculta da plataforma por reflexão. É API
   restrita, quebra em atualização de OEM e é exatamente o tipo de fragilidade que
   originou esta dívida.

3. **Preservar o contrato da fila.** O formato `{ titulo, criadoEmMs }` gravado por
   `appendEntry` (`:147-151`) e o cap de 200 caracteres (`:148`) são consumidos
   pelo JS em `modules/widget-homescreen/src/index.ts:105-117` e por
   `montarTarefaDeEntry` (`src/lib/widget/sincronizarWidget.ts:56-89`). Qualquer
   saída escolhida grava no **mesmo** arquivo, no **mesmo** formato. Nenhuma
   mudança em `FILA_FILENAME` / `COUNT_FILENAME` (`:191-192`).

4. **Remover o TODO e sanear os comentários que descrevem o fluxo como se
   funcionasse**: cabeçalho do provider (`:12-20`, passos 1 e 2 descrevem o
   "RemoteInput fill-in") e cabeçalho do bridge
   (`modules/widget-homescreen/src/index.ts:6-15`). Se a saída escolhida for (b) ou
   (c), os dois textos passam a estar errados e precisam refletir o fluxo real.

5. **Atualizar `docs/FEATURES-CANONICAS.md`**, seção 12 (`:1189-1195`). Depende da
   `AUDIT-P1-1A`, que já introduz a descrição do widget de tarefas nessa seção;
   aqui entra o mecanismo de captura efetivamente escolhido (inline, notificação
   ou tela) e, no caso (b), a dependência de `POST_NOTIFICATIONS`.

6. **NÃO-objetivo — caso E2E novo no Gauntlet.** A feature é **intestável na web**:
   `getNative()` devolve `null` quando `Platform.OS !== 'android'`
   (`modules/widget-homescreen/src/index.ts:52-57`), e o `RemoteInput` é uma API do
   sistema Android sem qualquer contraparte no navegador. Esta sprint não toca UI
   JS, então a regra de E2E obrigatório do arquivo de regras da raiz (que vale
   para sprint que toca UI) não se aplica. A cobertura equivalente é a validação **Nível C** abaixo.

7. **NÃO-objetivo**: `cacheDir` como local da fila; a Android Configuration
   Activity nativa; o widget de humor do M20 (`OuroborosWidgetProvider.kt`,
   `OuroborosWidgetProviderLarge`); e a camada JS/UI, que é a `AUDIT-P1-1A`.

## Protocolo obrigatório de validação (código nativo)

Esta sprint muda **código nativo Kotlin**. Vale o protocolo canônico registrado no
arquivo de regras da raiz, seção *"Protocolo canônico de teste no device (decisão
durável 2026-05-25)"*, item 1:

> Mudança em código nativo (ex: a bridge `modules/health-connect/`,
> `modules/widget-homescreen/`) **inválida** dev-clients antigos — é preciso
> **rebuildar o dev-client**. Mudança apenas de JS ... **NÃO** exige rebuild.

Consequências operacionais, em ordem:

1. `./scripts/adb-vault-pull.sh` — backup do Vault do device **antes** de qualquer
   troca de app (a instalação pode exigir desinstalar, o que apaga dados).
2. Rebuildar o dev-client (o módulo `widget-homescreen` mudou; um dev-client
   anterior a esta sprint **não** contém o fix, e testar nele produz falso
   negativo).
3. Instalar com bypass HyperOS: `scripts/adb-install-bypass.sh`
   (`adb shell pm install -r -t`).
4. `adb reverse tcp:8081 tcp:8081` + Metro em `--dev-client`.
5. APK do git (release/preview) só no fim, nunca como ferramenta de iteração.

A validação de fim de sprint é **Nível C — celular físico**, que pelo arquivo de
regras da raiz exige **permissão explícita do dono** antes da sessão. Declarar o motivo (API
nativa: `RemoteInput`, `AppWidgetProvider`, broadcast do sistema) e manter a
sessão curta.

## Proof-of-work

```bash
# 1. Compila (o passo que a dívida original travou)
npx expo prebuild --platform android --clean
cd android && ./gradlew :widget-homescreen:assembleDebug   # exit 0, sem warning de variavel nao usada

# 2. Nenhum residuo da divida
rg -n "R-WIDG-FIX-REMOTEINPUTS|Removido temporariamente" modules/   # 0 ocorrencias

# 3. Suites que dependem do contrato da fila seguem verdes
npx tsc --noEmit                       # exit 0
npm test -- sincronizarWidget          # 7 casos verdes (formato da fila intacto)
./scripts/smoke.sh                     # verde

# 4. Nivel C — device fisico (exige permissao explicita do dono)
./scripts/adb-vault-pull.sh                                  # backup ANTES
./scripts/adb-install-bypass.sh builds/dev-client-<hash>.apk # dev-client REBUILDADO
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client

#    a) adicionar o widget "Ouroboros tarefas" na tela inicial
#    b) tocar no campo, digitar "pessoa_a comprar pao", confirmar
#    c) a fila deve ganhar a entry:
adb shell run-as com.ouroboros.mobile cat cache/widget-todo-queue.json
#       -> [{"titulo":"pessoa_a comprar pao","criadoEmMs":<epoch>}]
#    d) abrir o app; o boot hook da AUDIT-P1-1A drena a fila:
adb shell run-as com.ouroboros.mobile cat cache/widget-todo-queue.json
#       -> []  (fila zerada por limparFilaTodoWidget)
#    e) a tarefa aparece em /todo e o contador do widget sobe:
adb shell run-as com.ouroboros.mobile cat cache/widget-todo-count.json
adb exec-out screencap -p > /tmp/widget-todo-depois.png
```

Evidência obrigatória no PR: os dois `cat` da fila (antes/depois do drain), o
`cat` do count, e screenshots do widget na tela inicial e da tarefa criada em
`/todo`. Sem o par "fila com entry" → "tarefa no Vault", a sprint não está provada.

## Commit

```
fix: audit-p1-1b anexa remoteinput ao pendingintent do widget de tarefas
```
