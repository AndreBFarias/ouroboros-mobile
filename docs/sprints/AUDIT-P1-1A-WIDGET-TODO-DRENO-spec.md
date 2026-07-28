# AUDIT-P1-1A-WIDGET-TODO-DRENO — pluga o dreno da fila do widget de tarefas no boot e dá entrada de UI

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (perda silenciosa de dado do usuário: a fila mora no `cacheDir`,
            que o Android apaga sob pressão de armazenamento, e nenhum caminho
            automático a drena)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-1] da auditoria de 2026-07-28, camadas JS e UI. Encontrado
            ao cruzar o comentário de `src/lib/widget/sincronizarWidget.ts:169`
            ("Plugado em BOOT_HOOKS (reagendamento.ts)") com o registro real em
            `src/lib/boot/reagendamento.ts:221-263`, e ao procurar quem navega
            para `/widget-config`. Verificado por varredura de call sites em
            `src/`, `app/`, `tests/`, `modules/` e `docs/`.
```

## Problema (feature completa que nunca é chamada)

O widget "Quick To-do" (R-WIDG-1) está quebrado em **três camadas independentes**,
cada uma com teste verde na própria fatia. Esta sprint cobre as camadas **JS** e
**UI**. A camada nativa é a `AUDIT-P1-1B-WIDGET-TODO-REMOTEINPUT`.

### 1. O boot hook não está plugado (e o comentário afirma que está)

`src/lib/widget/sincronizarWidget.ts:168-173`:

```ts
// Boot hook wrapper. Drena fila + sincroniza count em uma chamada
// idempotente. Plugado em BOOT_HOOKS (reagendamento.ts).
export async function sincronizarWidgetTodoBootHook(): Promise<void> {
  await drenarFilaTodoWidget();
  await sincronizarCountPendentes();
}
```

Varredura do repositório inteiro por `sincronizarWidgetTodoBootHook` devolve **uma
única ocorrência**: a própria linha `170` da definição. Zero call sites — nem em
`src/`, nem em `app/`, nem em `tests/`.

Do outro lado, `src/lib/boot/reagendamento.ts:221-263` registra **15 hooks** (a
contagem foi conferida programaticamente sobre o bloco `BOOT_HOOKS.push(...)`),
inclusive o vizinho de mesmo módulo `atualizarWidgetHomescreenHook` na linha
`231` — o hook do widget de **humor** (M20), não o de tarefas. O de tarefas não
está na lista.

O cabeçalho do mesmo arquivo (`reagendamento.ts:5-11`) também mente, por outro
motivo: diz *"Lista canonica plugada (5 hooks)"* e enumera **6** bullets, quando
o `push` real tem **15** entradas.

### 2. A única rota que drena a fila é órfã

`app/widget-config.tsx` é o único lugar do app que chama `drenarFilaTodoWidget`
(`:57`) e `sincronizarCountPendentes` (`:80`). Ela mesma descreve o ponto de
entrada que deveria existir (`app/widget-config.tsx:11-12`):

```
// Acesso: o item "Widget tarefas" em Settings -> Features aponta
// pra aqui via deep link /widget-config.
```

Esse item não existe. `SecaoFeatures` (`app/settings/index.tsx:309-375`) só tem
`ToggleRow` — inclusive os dois do widget (`widgetHomescreen` em `:348-354` e o
aninhado `widgetMostraNome` em `:355-363`) — e nenhum `LinkSubTela` para
`/widget-config`. Fora do próprio arquivo, a única menção literal a
`widget-config` em todo o repositório é o spec histórico
`docs/sprints/R-WIDG-1-TODO-LIST-RAPIDA-spec.md:28`.

### Cenário de falha concreto

`pessoa_a` instala o widget na tela inicial (o receiver está registrado e
`exported="true"` em
`modules/widget-homescreen/android/src/main/AndroidManifest.xml:33-44`, então o
widget aparece na bandeja do sistema e é plenamente funcional do lado do Android).
Ela digita "comprar pão", confirma, e o provider Kotlin anexa a entry em
`context.cacheDir/widget-todo-queue.json`
(`OuroborosTodoWidgetProvider.kt:136-158`). Ela abre o app: nenhum boot hook lê
essa fila. Ela navega por todas as telas: não há caminho para `/widget-config`.
A tarefa não existe em lugar nenhum da UI, e o count do widget continua no valor
antigo. Quando o Android limpar o `cacheDir` sob pressão de armazenamento — que é
exatamente o contrato desse diretório — a entry some sem erro, sem log e sem
aviso.

### Por que os testes não pegaram

`tests/lib/widget/sincronizarWidget.test.ts` tem 7 casos verdes que exercitam
`drenarFilaTodoWidget` e `sincronizarCountPendentes` chamando-as diretamente.
Eles provam que as funções funcionam; nunca que alguém as chama.

### Esta sprint sozinha não conserta a feature inteira

Com o dreno plugado, a fila passa a virar `Tarefa` real no Vault — mas hoje
**nada chega à fila** em um device real, porque o `RemoteInput` do provider é
construído e nunca anexado ao `PendingIntent`
(`OuroborosTodoWidgetProvider.kt:104-122`); é a `AUDIT-P1-1B`. O valor desta
sprint é eliminar a **perda de dados de qualquer item que chegue à fila** — o que
inclui entries já enfileiradas em devices com o widget instalado antes de
`alpha-14`, entries criadas por qualquer caminho futuro, e o próprio destravamento
da 1B (sem o dreno, o texto capturado pelo fix nativo continuaria morrendo no
`cacheDir`).

## Escopo (mínimo)

1. **Registrar `sincronizarWidgetTodoBootHook` em `BOOT_HOOKS`**, no padrão de
   wrapper com `await import()` lazy usado por todos os outros hooks do arquivo
   (`reagendamento.ts:99-103` é o vizinho mais próximo em forma).

   **Posição: por último**, depois de `reconciliarTipoCompanhiaHook`
   (`reagendamento.ts:262`). Justificativa a partir das dependências já
   documentadas no próprio arquivo:

   - **Depende do layout final do Vault.** `drenarFilaTodoWidget` grava via
     `criarTarefa` (`src/lib/vault/tarefas.ts:272`) e `sincronizarCountPendentes`
     lê via `listarTarefas`, que varre `MARKDOWN_FOLDER`
     (`src/lib/vault/tarefas.ts:96`). Logo precisa rodar **depois** de
     `migrarLayoutVaultHook` (`:244`, H2/ADR-0023, consolida tudo em `markdown/`)
     e **depois** de `migrarT2DeviceIdSuffixHook` (`:250`, renomeia canônicos para
     `-<deviceId>.md`). Rodar antes faria a tarefa recém-criada nascer no meio de
     uma reorganização de layout e o count ser calculado sobre uma varredura de
     pasta que ainda vai mudar.
   - **Depende de `vaultRoot`** (`sincronizarWidget.ts:104`), como
     `migrarAssetsHook`, `migrarCacheAgendaHook` e `atualizarDeviceIndexHook` —
     todos já posicionados na metade final da lista pelo mesmo motivo.
   - **É I/O pesado e não é pré-requisito de ninguém.** `listarTarefas` faz
     `listVaultFolder` + `readVaultFiles` do diretório inteiro. Vale aqui o
     argumento que o arquivo já usa para `migrarAssetsHook`
     (`reagendamento.ts:233-236`): *"não depende de notificacoes nem de stores
     reagendados, e seu custo ... nao deve atrasar arranque interativo do app"*.
     Nenhum outro hook consome a saída deste, então nada precisa rodar depois.

   Comentário de registro deve declarar essas três razões, no estilo dos blocos
   vizinhos.

2. **Corrigir os dois comentários mentirosos**:
   - `sincronizarWidget.ts:169` — passa a ser verdade após o item 1; conferir a
     redação e manter (ou ajustar para citar a posição na fila).
   - `reagendamento.ts:5-11` — cabeçalho diz "5 hooks" e lista 6 bullets, com 15
     registrados de fato (16 depois desta sprint). Atualizar a contagem e a lista.

3. **Entrada de UI para `/widget-config`**: adicionar `LinkSubTela` com
   `titulo="Widget tarefas"` em `SecaoFeatures` (`app/settings/index.tsx:309-375`),
   **dentro do bloco condicional já existente** de `featureToggles.widgetHomescreen`
   (`:355-363`), logo após o toggle "Mostrar nome no widget", com
   `onPress={() => router.push('/widget-config')}` e
   `accessibilityLabel="widget tarefas"` (sem acento, convenção screen reader).

   Fatos já verificados que a implementação pode assumir:
   - `LinkSubTela` já está importado em `app/settings/index.tsx:36` e sua API é
     `{ titulo, onPress, subtitulo?, accessibilityLabel? }`
     (`src/components/settings/LinkSubTela.tsx:16-22`).
   - `SecaoLista` aceita filhos heterogêneos por contrato
     (`src/components/settings/SecaoLista.tsx:3`).
   - A rota é auto-registrada pelo Expo Router (roteamento por arquivo); **não**
     precisa de `Stack.Screen` em `app/_layout.tsx`. Precedente na mesma tela:
     `router.push('/settings/permissoes')` em `app/settings/index.tsx:609`, cuja
     rota também não aparece na lista de `Stack.Screen`.
   - Condicionar ao toggle é seguro: quem desligar `widgetHomescreen` perde o link,
     mas o próprio toggle continua na mesma seção para religar. Se a execução
     preferir o link sempre visível, documentar a troca — é decisão de UI, não de
     correção.

4. **Teste Jest novo** em `tests/lib/boot/reagendamento-widget-todo.test.ts`:
   - `reagendarTodosBootHooks()` invoca `sincronizarWidgetTodoBootHook` exatamente
     uma vez (mock de `@/lib/widget/sincronizarWidget`);
   - a ordem relativa está correta: comparar `mock.invocationCallOrder` do dreno
     contra o de `migrarVaultLayoutPorTipo` (mock de
     `@/lib/boot/migrarVaultLayoutPorTipo`) — o dreno tem de ser maior;
   - `BOOT_HOOKS.length` sai de **15** para **16**.

5. **Caso E2E** em `tests/e2e/playwright/audit-p1-1a-widget-todo-dreno.e2e.ts`
   (modelo: `tests/e2e/playwright/e2e-template.ts`), com asserts de comportamento:
   - após `__gauntlet.seed()`, `__gauntlet.abrir('/settings')` mostra a linha
     "Widget tarefas" na seção "Features opcionais";
   - **clicar** nela leva a `/widget-config` (assertar o header "Widget tarefas" e
     os botões "Sincronizar agora" e "Atualizar contador", que são a razão de a
     rota existir);
   - `__gauntlet.disparaBootHooks()` resolve sem lançar e `__gauntlet.estado()`
     continua devolvendo objeto válido depois — prova que o hook novo não quebra a
     cadeia de boot. Precedente de forma:
     `tests/e2e/playwright/m39-midia-companion.e2e.ts:74`.

   **Limite honesto a declarar no caso**: a drenagem em si **não** é observável na
   web. `getNative()` devolve `null` fora do Android
   (`modules/widget-homescreen/src/index.ts:52-57`), então `lerFilaTodoWidget`
   sempre retorna `[]` e `drenarFilaTodoWidget` sai cedo. O E2E cobre o ponto de
   entrada de UI e a integridade do boot; a drenagem real é evidência da `1B`, no
   device.

6. **Atualizar `docs/FEATURES-CANONICAS.md`**, seção 12 (`:1189-1195`). Hoje ela
   descreve **apenas** o widget de humor do M20 (2 layouts, humor do dia, nome,
   alarme próximo); o widget Quick To-do do R-WIDG-1 não está documentado em lugar
   nenhum do arquivo. Documentar: widget 4×2 de tarefas, count de pendentes,
   drenagem no boot, tela `/widget-config` e como chegar nela.

7. **NÃO-objetivo**: qualquer arquivo em
   `modules/widget-homescreen/android/` — o `RemoteInput` órfão é a `AUDIT-P1-1B`.

8. **NÃO-objetivo**: trocar o `cacheDir` por armazenamento durável, criar a
   Android Configuration Activity nativa (pulada de propósito, ver
   `app/widget-config.tsx:3-9`), ou mexer no widget de humor do M20
   (`atualizarWidgetHomescreenHook`, `reagendamento.ts:231`).

## Proof-of-work

```bash
npx tsc --noEmit                                  # exit 0

# registro do hook: antes 1 ocorrencia (a definicao), depois >= 2
rg -n "sincronizarWidgetTodoBootHook" src/ app/ tests/    # >= 2 apos o fix

# entrada de UI: antes so o comentario do proprio arquivo + spec historico
rg -n "widget-config" src/ app/ tests/            # inclui app/settings/index.tsx

npm test -- reagendamento-widget-todo             # 3 casos novos verdes
npm test -- sincronizarWidget                     # 7 casos existentes seguem verdes
npm test -- settings                              # UI nova nao quebra a suite de settings

# E2E no Gauntlet (Nivel A+ obrigatorio)
./gauntlet.sh                                     # navegar /settings -> Widget tarefas -> /widget-config
npm run test:e2e:web -- --grep audit-p1-1a        # caso novo PASS

./scripts/smoke.sh                                # verde
```

Screenshots em `docs/sprints/AUDIT-P1-1A-WIDGET-TODO-DRENO-screenshots-gauntlet/`:
seção "Features opcionais" com a linha "Widget tarefas" visível, e a tela
`/widget-config` alcançada por clique (não por `__gauntlet.abrir`).

## Commit

```
fix: audit-p1-1a pluga dreno da fila do widget de tarefas no boot e da entrada de ui
```
