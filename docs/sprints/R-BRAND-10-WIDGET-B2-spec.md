# Sprint R-BRAND-10-WIDGET-B2 — B2 "relógio silencioso" no widget nativo Android

```
ONDA:       R-BRAND-SYSTEM (docs/sprints/_ONDA-R-BRAND-SYSTEM.md), sprint 7 de 7.
            Marcada OPCIONAL no design doc §5 — última da onda, agrupa o
            único rebuild de dev-client de toda a onda.
DEPENDE:    (hard) R-BRAND-7-ESTADOS-VIVOS mergeada — entrega o B2 in-app
            (mini-glifo 30°/hora, snap spring). Esta sprint é a versão WIDGET
            do mesmo conceito; a matemática hora->ângulo e a semântica do
            relógio silencioso vêm de lá. Confirmar antes de iniciar:
            `git log --grep "R-BRAND-7" --oneline` deve mostrar o merge, e
            `ls src/components/brand/conceitos/` deve listar o arquivo do
            conceito B2. Se ausente, PARAR — pré-requisito bloqueante.
            (soft) R-BRAND-3-GLIFO — promove a geometria canônica das 43
            contas + rosto para `src/components/brand/glifo/geometria.ts`. O
            widget não consome esse TS em runtime (RemoteViews é 100% Kotlin),
            mas o asset raster do widget deve ser exportado a partir da MESMA
            anatomia canônica (`docs/design/ouroboros/ouroboros.svg`).
BLOQUEIA:   nada. Folha na árvore de dependências. Opcional por decisão do dono
            (design doc §2 decisão 4).
STATUS:     [todo] (2026-07-14)
ORIGEM:     _ONDA-R-BRAND-SYSTEM.md §5 linha 7 + §2 decisão 4 ("B2 in-app
            agora, widget nativo no fim"). Conceito B2 = `mount_B2` em
            docs/design/ouroboros/coreografias-extraidas.js (linhas 367-393).
```

## Contexto

O conceito B2 do brand system é o "relógio silencioso": a cobra gira 30°
por hora com snap — "relógio da cobra, sabe que horas são sem dizer". A
versão in-app (Reanimated) foi entregue na R-BRAND-7. Esta sprint entrega a
versão **widget de tela inicial Android**: um glifo estático rotacionado ao
ângulo da hora atual, renderizado por `RemoteViews` (sem Reanimated, sem
SVG animado — o widget roda fora do processo do app).

O módulo `modules/widget-homescreen/` já hospeda dois widgets (Humor 4x2/4x4
e Quick To-do 4x2). Esta sprint adiciona um **terceiro provider dedicado**,
sem tocar nos dois existentes.

## Correção de hipótese (investigação obrigatória — lição 4)

O briefing de dispatch supôs que o módulo já usa `AlarmManager`/`WorkManager`
e que bastava seguir "o padrão que o módulo já usa". **A leitura real do
módulo mostra que ele não usa nenhum dos dois.** Estado confirmado:

- `WidgetHomescreenModule.kt` atualiza os widgets por **broadcast push**
  (`sendBroadcast(ACTION_APPWIDGET_UPDATE)` em `forcarUpdateHumor` /
  `forcarUpdateTodo`), disparado pelo JS quando o dado muda (humor salvo,
  boot hook, count de tarefas).
- `res/xml/widget_info_4x2.xml` e afins usam `android:updatePeriodMillis="0"`
  — ou seja, **nenhum tick autônomo** do sistema. Os widgets atuais só se
  atualizam quando o app empurra.

Consequência de design: o widget B2 precisa de tick **autônomo pela hora do
relógio** (o app pode estar morto na virada da hora). Isso introduz o
**primeiro mecanismo de agendamento** do módulo. Ver seção "Decisão de
agendamento" abaixo — é o ponto de projeto mais importante da sprint.

## Escopo (touches autorizados)

Arquivos a criar (módulo nativo):

- `modules/widget-homescreen/android/src/main/java/expo/modules/widgethomescreen/OuroborosRelogioWidgetProvider.kt`
- `modules/widget-homescreen/android/src/main/res/layout/widget_relogio_2x2.xml`
- `modules/widget-homescreen/android/src/main/res/xml/widget_info_relogio_2x2.xml`
- Assets raster do glifo (ver "Renderização"): dois PNG em
  `modules/widget-homescreen/android/src/main/res/drawable-nodpi/`
  (ex.: `ob_relogio_anel.png` = mostrador estático; `ob_relogio_ponteiro.png`
  = cobra+rosto que gira). Diretório `drawable-nodpi/` não existe hoje — criar.

Arquivos a criar (JS/TS):

- `src/lib/widget/relogioB2.ts` — helper puro `anguloRelogioB2(date)` +
  disparo de refresh do widget no foreground/boot.
- `tests/lib/widget/relogioB2.test.ts` — teste Jest da matemática hora->ângulo.

Arquivos a modificar (mínimo cirúrgico):

- `modules/widget-homescreen/android/src/main/AndroidManifest.xml` — adicionar
  o `<receiver>` do novo provider (+ intent-filter do tick e, se a decisão de
  agendamento exigir, `RECEIVE_BOOT_COMPLETED` + `ACTION_BOOT_COMPLETED`).
- `modules/widget-homescreen/android/src/main/res/values/strings.xml` —
  `widget_label_relogio` + eventuais `contentDescription`.
- `modules/widget-homescreen/android/src/main/java/expo/modules/widgethomescreen/WidgetHomescreenModule.kt`
  — nova `AsyncFunction` de refresh push do provider de relógio (paridade com
  `forcarUpdateHumor`/`forcarUpdateTodo`).
- `modules/widget-homescreen/src/index.ts` — expor a função de refresh na
  bridge (com no-op fora do Android, mesmo padrão das demais).
- `docs/FEATURES-CANONICAS.md` §12 — registrar o terceiro widget
  (obrigatório no mesmo commit; validador recusa sem isto).

Arquivos que NÃO se toca:

- `OuroborosWidgetProvider.kt` / `OuroborosWidgetProviderLarge` / layouts
  `widget_4x2`/`widget_4x4` (widget Humor — M20).
- `OuroborosTodoWidgetProvider.kt` / `widget_todo_4x2` (widget To-do — R-WIDG-1).
- `src/lib/widget/atualizarWidgetHomescreen.ts` / `sincronizarWidget.ts`
  (pipeline do widget Humor/To-do — sem relação com o relógio).
- `src/components/brand/**` (glifo/conceitos in-app — o widget é Kotlin puro,
  não consome o TS do glifo em runtime).

## Semântica canônica do B2 (portar literalmente de `mount_B2`)

Leitura de `docs/design/ouroboros/coreografias-extraidas.js` linhas 367-393:

1. `OB.create(el, { hideWordmark: true })` — **wordmark oculto**, anel VISÍVEL.
2. Só a **cobra (`api.snake`, as 43 contas) + o rosto (`api.rosto`, 4 elementos)
   giram JUNTOS**, com a mesma `transformOrigin = CENTER`. O **anel
   (`api.ring`) NÃO recebe transform** — fica estático. Metáfora do relógio:
   anel = mostrador fixo; cobra+rosto = ponteiro que aponta a hora.
3. Rosto sempre visível — "é o mostrador do relógio" (comentário no fonte).
4. Ângulo = passo de 30° por hora, com snap (no demo web, transição CSS
   `400ms cubic-bezier(.2,.9,.2,1.15)`).

**Diferença consciente demo -> widget** (princípio 03 da onda, "nada gira à
toa"):

- O demo usa `hour++` **cumulativo** (contador de exposição que só cresce,
  para nunca desenrolar 330° para trás). É artefato de demo.
- O **widget usa a HORA REAL do relógio de parede**: ângulo =
  `(horaAtual % 12) * 30`. Não acumula. Snap instantâneo a cada virada de hora.
- O widget **não anima transição** entre ângulos: `RemoteViews` troca a
  imagem de forma instantânea a cada `updateAppWidget`. Isso satisfaz
  reduce-motion **por construção** (não há movimento contínuo; é um snap
  discreto uma vez por hora). Nenhum tratamento especial de reduce-motion é
  necessário no widget — registrar essa justificativa no PR.

## Matemática hora -> ângulo (contrato cross-language)

Fórmula canônica única, espelhada em TS (testável) e Kotlin (runtime):

```
angulo(hora) = (hora mod 12) * 30    // graus, sentido horário
```

Tabela de referência (usar como casos do teste Jest):

| hora (24h) | hora % 12 | ângulo |
|-----------:|----------:|-------:|
| 0 (meia-noite) | 0 | 0° |
| 1 | 1 | 30° |
| 3 | 3 | 90° |
| 6 | 6 | 180° |
| 11 | 11 | 330° |
| 12 (meio-dia) | 0 | 0° |
| 13 | 1 | 30° |
| 23 | 11 | 330° |

- **TS** (`src/lib/widget/relogioB2.ts`): `anguloRelogioB2(date: Date): number`
  retorna `(date.getHours() % 12) * 30`. Função pura, sem efeito colateral.
- **Kotlin** (`OuroborosRelogioWidgetProvider`): calcula o ângulo a cada tick a
  partir de `Calendar`/`LocalTime.now().hour` com a **mesma fórmula**
  (`(hour % 12) * 30`), com comentário cruzado apontando para o helper TS como
  contrato. O Kotlin é a autoridade de runtime (o app pode estar morto na
  virada da hora; JS não roda nesse instante).
- O helper TS serve para: (a) travar o contrato via teste Jest; (b) computar
  o ângulo inicial que a bridge empurra no refresh de foreground/boot, para o
  widget dar snap correto assim que o app é aberto.

## Renderização (RemoteViews não roda Reanimated nem SVG animado)

`RemoteViews` não suporta rotação arbitrária de `View` de forma remotável
confiável. O caminho canônico e robusto é **bitmap pré-rotacionado** via
`Matrix`, entregue por `setImageViewBitmap`:

1. Layout `widget_relogio_2x2.xml`: um `FrameLayout` quadrado com **um único
   `ImageView`** (`@id/widget_relogio_glifo`) de fundo `dracula_bg_page`.
2. No provider, a cada `onUpdate`/tick:
   - Carregar o bitmap do **anel/mostrador** (estático) e o bitmap da
     **cobra+rosto** (ponteiro) dos drawables.
   - Compor num `Canvas`: desenhar o anel sem rotação; desenhar cobra+rosto
     com `Matrix().postRotate(angulo, cx, cy)`, onde `(cx, cy)` = centro do
     bitmap correspondente ao `CENTER` canônico (158.91 / 159.84, ver
     _ONDA §3), escalado à resolução do bitmap.
   - `views.setImageViewBitmap(R.id.widget_relogio_glifo, bitmapComposto)`.
3. Alternativa aceitável (documentar se escolhida): dois `ImageView`
   empilhados no `FrameLayout` (anel embaixo estático, ponteiro em cima) e
   rotacionar só o de cima. Preterida porque a rotação de `ImageView` em
   `RemoteViews` não é garantida em todo OEM — o bitmap composto num
   `ImageView` só é o caminho seguro. Escolha do executor, com justificativa.

Assets (exportar da anatomia canônica, não redesenhar):

- Fonte: `docs/design/ouroboros/ouroboros.svg` (anatomia canônica: 43 contas
  `#conta-01..43`, rosto `#head-coroa`/`#head-focinho`/`#lingua`/`#eye`, anel
  `#bolinhas-internas`, wordmark).
- Exportar **wordmark oculto** (paridade com `hideWordmark: true`).
- Exportar em duas camadas: (a) anel; (b) cobra+rosto. Resolução alvo ~300px
  para 2x2 (ajustar em `drawable-nodpi/`).
- Cores canônicas já disponíveis em `res/values/colors.xml` do módulo
  (`dracula_purple` #bd93f9, `dracula_pink` #ff79c6, `dracula_cyan`, etc.) —
  não introduzir cor nova.

Armadilha **A27** (Fabric rejeita transform string em SVG) **não se aplica
aqui**: é restrição do render RN/SVG nativo, não do `Canvas`/`Matrix` Kotlin
do `RemoteViews`. Registrar essa distinção no PR para não confundir o
validador.

## Decisão de agendamento (tick autônomo pela hora)

Como o módulo hoje não tem scheduler algum, esta sprint escolhe o mecanismo.
Requisito: virar o ângulo no topo de cada hora mesmo com o app morto.

- **PRIMÁRIO (recomendado): `AlarmManager` inexato auto-reagendado.**
  - No `onUpdate` e num `ACTION` de tick dedicado, renderizar o ângulo atual
    e **reagendar o próximo alarme para o próximo topo de hora** (calcular ms
    até o próximo `:00`).
  - Usar `setAndAllowWhileIdle` (dispara mesmo em Doze; janela ~9 min é
    aceitável para relógio de hora — não precisa precisão de segundo).
  - **Sem** `SCHEDULE_EXACT_ALARM` (evita a permissão do Android 12+): alarme
    inexato basta para um relógio silencioso de hora.
  - Reagendar também em `ACTION_BOOT_COMPLETED` — exige
    `<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>`
    e o intent-filter no receiver. Confirmar `minSdkVersion` do app antes.
- **FALLBACK documentado: `android:updatePeriodMillis="3600000"`** no
  `widget_info_relogio_2x2.xml`. Zero código de agendamento, re-registrado
  pelo sistema no boot. Preterido como primário porque o sistema faz batching
  e **não dispara em Doze**, podendo congelar o relógio por horas — ruim para
  algo cuja correção "ao relance" é o ponto. Manter como plano B se o
  `AlarmManager` for morto pelo OEM.
- **Cinto e suspensório:** a bridge JS empurra um refresh sempre que o app vai
  a foreground/boot (via `WidgetHomescreenModule` + boot hook), de modo que o
  widget dá snap correto sempre que o usuário abre o app, independente do
  agendamento nativo.

**Risco OEM (HyperOS / A32-family):** HyperOS mata agendamentos de background
com agressividade. Validar o tick de virada de hora no device real (Nível C)
é obrigatório — não confiar só no emulador. Se o `AlarmManager` não sobreviver
no device do dono, cair para o fallback `updatePeriodMillis` e registrar a
decisão no PR + memória.

## Acceptance criteria

1. Existe um terceiro widget instalável na tela inicial ("Ouroboros relógio"),
   distinto dos widgets Humor e To-do, com provider/layout/info/receiver
   próprios.
2. O glifo do widget aparece rotacionado ao ângulo `(hora % 12) * 30` da hora
   atual: anel estático como mostrador, cobra+rosto como ponteiro girado.
   Verificável por screenshot no device com a hora do sistema conhecida.
3. Na virada de hora, o widget atualiza o ângulo autonomamente (app fechado),
   validado no device real (Nível C) — ou, se o OEM matar o alarme, o fallback
   `updatePeriodMillis` é adotado e documentado.
4. Ao abrir o app, o widget dá snap para o ângulo correto (refresh push da
   bridge).
5. `anguloRelogioB2(date)` é uma função TS pura coberta por teste Jest com os 8
   casos da tabela (incluindo meia-noite=0°, meio-dia=0°, 23h=330°).
6. Os widgets Humor e To-do continuam funcionando sem regressão (diff não toca
   seus arquivos; smoke e testes verdes).
7. `docs/FEATURES-CANONICAS.md` §12 atualizado no mesmo commit descrevendo o
   widget de relógio.
8. Fora do Android (web/Gauntlet/Jest não-Android), a bridge é no-op silencioso
   (mesmo padrão de `requireOptionalNativeModule` já usado em `index.ts`).

## Invariantes a preservar

- **Regra −1 (Anonimato):** o widget de relógio não mostra dado pessoal algum
  (só a hora, de forma abstrata). Nenhuma string com nome, autoria ou marca de
  IA. Sem "feito por".
- **Regra de Tom:** zero emoji, zero exclamação, zero gamificação. O relógio é
  silencioso — não anuncia hora em texto, não celebra viradas.
- **ADR-0007 (sem rede):** o widget não faz rede. Só lê o relógio local.
- **ADR-0005 (sem gamificação):** coerente com os widgets existentes
  (`colorForHumor` mantém paleta neutra); o relógio não colore/pontua nada.
- **Regra de Identidade / cores fixas:** usar apenas cores Dracula canônicas de
  `res/values/colors.xml`; roxo `#bd93f9` = `pessoa_a`, rosa `#ff79c6` =
  `pessoa_b` permanecem reservados — o glifo do relógio usa a coloração
  canônica da anatomia (não tinta por pessoa; B2 não é o conceito de dupla
  presença, isso é o B3).
- **Regra de Linguagem:** comentários Kotlin/JS **sem acentuação** (convenção
  shell/CI, como todo o módulo); strings de UI (`strings.xml`) e docstrings
  **com acentuação PT-BR completa** (ex.: `Relógio`, `Configurações`).
- **Estética ADR-010:** física acima de tempo, snap discreto (o widget não
  anima linearmente — snap por hora é a "física" possível no RemoteViews).
- **Cirúrgico (GUIDE §3):** provider separado; não refatorar os providers
  existentes "de passagem".

## Plano de implementação

1. Confirmar pré-requisito: `git log --grep "R-BRAND-7" --oneline` mostra
   merge e `ls src/components/brand/conceitos/` lista o conceito B2. Se não,
   PARAR.
2. Exportar os dois assets raster (anel; cobra+rosto sem wordmark) de
   `ouroboros.svg` para `drawable-nodpi/`. Conferir centro e proporção contra
   `CENTER` 158.91/159.84.
3. Criar `src/lib/widget/relogioB2.ts` com `anguloRelogioB2(date)` puro +
   função de refresh (chama a bridge; no-op fora do Android).
4. Criar `tests/lib/widget/relogioB2.test.ts` cobrindo os 8 casos da tabela.
   Rodar `npm test` — verde antes de tocar Kotlin.
5. Criar `OuroborosRelogioWidgetProvider.kt`: `onUpdate` calcula ângulo pela
   hora, compõe bitmap (anel estático + cobra/rosto rotacionado via `Matrix`)
   e `setImageViewBitmap`; agenda o próximo tick (decisão de agendamento).
6. Criar `widget_relogio_2x2.xml` (FrameLayout + ImageView) e
   `widget_info_relogio_2x2.xml` (`targetCellWidth/Height=2`,
   `updatePeriodMillis` conforme decisão).
7. Registrar o receiver em `AndroidManifest.xml` (+ boot/permissão se
   `AlarmManager`). Adicionar `widget_label_relogio` em `strings.xml`.
8. Adicionar `AsyncFunction` de refresh no `WidgetHomescreenModule.kt` +
   expor na bridge `index.ts`; plugar o refresh push no boot hook/foreground
   (paridade com o widget Humor, sem tocar o pipeline dele).
9. Atualizar `docs/FEATURES-CANONICAS.md` §12.
10. **Rebuild do dev-client** (mudança nativa — ver seção dedicada). Instalar
    no device e validar (Nível B emulador + Nível C device).
11. Rodar `./scripts/smoke.sh`; corrigir até verde. Screenshot de proof-of-work.

## Aritmética

Sem meta de redução de linhas (sprint aditiva, não refactor). Aritmética de
testes:

- `FAIL_BEFORE = 0` (baseline verde atual; confirmar com `npm test` antes de
  iniciar — a baseline exata em suítes/testes evolui; o gate é "não
  regredir").
- Delta esperado: **+1 suíte** (`relogioB2.test.ts`) com ~8 casos novos.
- `FAIL_AFTER = 0`. Nenhuma suíte existente pode passar a falhar.

## Testes

- **Jest (obrigatório):** `tests/lib/widget/relogioB2.test.ts` — os 8 casos da
  tabela hora->ângulo, incluindo `getHours()` de meia-noite (0°) e meio-dia
  (0°) e 23h (330°). Cobrir também que a função é pura (mesma entrada, mesma
  saída; sem depender de `Date.now`).
- **Bridge no-op:** teste que fora do Android a função de refresh não lança
  (paridade com os testes já existentes em
  `tests/lib/widget/atualizarWidgetHomescreen.test.ts`).
- **E2E Playwright/Gauntlet — N/A justificado.** O render do widget é 100%
  nativo (`RemoteViews` fora do processo do app); não há superfície web nem
  in-app que o Gauntlet possa navegar. A superfície in-app do B2 já tem seu
  E2E na R-BRAND-7. O contrato desta sprint é travado pelo teste Jest da
  matemática + screenshot no device. Registrar essa exceção explicitamente no
  PR para o validador-sprint (que normalmente recusa sprint sem E2E) — a
  justificativa é a ausência de superfície web/in-app, não folga de rigor.

## Rebuild do dev-client (mudança nativa — obrigatório)

Esta sprint adiciona um provider Kotlin novo + receiver no `AndroidManifest`.
Isso é **código nativo novo**: os dev-clients antigos **deixam de valer** (precisam de rebuild). Protocolo
canônico (CLAUDE.md "Protocolo canônico de teste no device", 2026-05-25):

1. **BACKUP do Vault ANTES de qualquer troca de app no device:**
   `./scripts/adb-vault-pull.sh`. Nunca instalar por cima sem esse backup —
   troca de assinatura (debug vs release) apaga dados do app.
2. **Rebuildar o dev-client** com os módulos nativos atuais (o dev-client
   antigo não conhece o novo receiver/provider). Preferir mesma keystore do
   release (Q17.e) para permitir update in-place sem wipe.
3. **Instalar com bypass HyperOS (A32):**
   `./scripts/adb-install-bypass.sh` (ou `adb shell pm install -r -t`).
4. `adb reverse tcp:8081 tcp:8081` + Metro dev-client; abrir o app uma vez
   para o boot hook empurrar o refresh inicial.
5. **Instalar o widget na tela inicial** (long-press na home -> widgets ->
   Ouroboros relógio) e capturar `screencap`.

## Proof-of-work esperado

- **Diff final** (todos os arquivos do escopo).
- **Runtime real:**
  - Smoke completo: `./scripts/smoke.sh` verde (inclui anonimato +
    `check_strings_ui_ptbr.py` + typecheck + testes).
  - Unit: `npm test` — nova suíte `relogioB2` verde, `FAIL_AFTER = 0`.
- **Screenshot do widget no device** com a hora do sistema anotada, mostrando
  o glifo no ângulo esperado (ex.: 15h -> `(15 % 12) * 30 = 90°`). Salvar em
  `docs/sprints/R-BRAND-10-WIDGET-B2-screenshots-device/`. Ideal: dois shots
  em horas diferentes (ex.: uma perto do topo da hora, para evidenciar a
  virada) — Nível C, motivo declarado, sessão curta.
- **Evidência do tick autônomo** (app fechado): screenshot antes/depois de uma
  virada de hora, ou (se inviável esperar) evidência via `adb shell` disparando
  o `ACTION` de tick e capturando o novo ângulo. Se o OEM matou o alarme e o
  fallback `updatePeriodMillis` foi adotado, documentar a decisão.
- **FEATURES-CANONICAS.md §12 atualizado** no mesmo commit.
- **Acentuação periférica:** varredura PT-BR em todos os arquivos modificados
  (`strings.xml` com `Relógio`/`Configurações` corretos; docstrings TS/comentários
  de UI com acento; comentários Kotlin/JS sem acento por convenção). O
  `check_strings_ui_ptbr.py` roda no smoke.
- **Hipótese verificada:** `rg` dos identificadores citados no diff
  (`OuroborosRelogioWidgetProvider`, `widget_relogio_2x2`,
  `anguloRelogioB2`, `widget_label_relogio`) para confirmar que existem após a
  implementação.

## Riscos e não-objetivos

- **Não-objetivo:** tint por pessoa (`pessoa_a`/`pessoa_b`) no relógio — isso é
  o conceito B3 (dupla presença), não B2. O relógio usa a coloração canônica.
- **Não-objetivo:** animar transição de ângulo no widget — `RemoteViews` troca
  imagem de forma discreta; snap por hora é o comportamento correto.
- **Não-objetivo:** widget iOS — o módulo é Android-only; iOS fica fora.
- **Risco (agendamento):** OEM (HyperOS) matando `AlarmManager`. Mitigação:
  fallback `updatePeriodMillis` + refresh push no foreground. Se aparecer
  trabalho maior de confiabilidade de background (ex.: WorkManager + retry
  policy), **registrar como sprint nova** (protocolo anti-débito), não expandir
  esta.
- **Risco (asset):** exportar o glifo com centro errado faz o ponteiro
  "bambear" ao girar. Mitigação: conferir centro contra `CENTER`
  158.91/159.84 (anti-wobble, _ONDA §3) e validar visualmente às 6h (ponteiro
  deve apontar reto para baixo, 180°).

## Referências

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§2 decisão 4, §4
  linha B2, §5 linha 7).
- Coreografia canônica: `docs/design/ouroboros/coreografias-extraidas.js`
  linhas 367-393 (`mount_B2`).
- Anatomia: `docs/design/ouroboros/ouroboros.svg` +
  `docs/design/ouroboros/ouroboros-lib.js`.
- Módulo nativo existente (padrão a copiar): `modules/widget-homescreen/`
  (`OuroborosWidgetProvider.kt`, `OuroborosTodoWidgetProvider.kt`,
  `WidgetHomescreenModule.kt`, `src/index.ts`).
- Bridge JS existente: `src/lib/widget/atualizarWidgetHomescreen.ts`,
  `src/lib/boot/reagendamento.ts` (boot hook).
- Protocolo device: CLAUDE.md "Protocolo canônico de teste no device"
  + `scripts/adb-vault-pull.sh` + `scripts/adb-install-bypass.sh`.
- VALIDATOR_BRIEF: `VALIDATOR_BRIEF.md` (contratos de runtime, armadilha A27,
  A32 HyperOS install bypass).
- Pré-requisito: R-BRAND-7-ESTADOS-VIVOS (B2 in-app).
