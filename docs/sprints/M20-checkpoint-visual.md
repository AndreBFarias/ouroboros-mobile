# Sprint M20 — Checkpoint Visual

```
DATA: 2026-05-01
SPRINT: M20 Widget Homescreen Android (Tela 26)
EXECUTOR: agente executor-sprint (af1db2dc9a45fd761)
ORQUESTRADOR: principal
DECISAO: APROVADO COM RESSALVA
```

## Camada A — Agente executor

| Path | SHA256 | Descricao |
|---|---|---|
| `docs/sprints/M20-screenshots/A-01-settings-widget-on.png` | `a927f82fb81c654fef0e5c33fd51da09f4dab735873f44b14f80fe57ef12b49d` | Settings com toggle "Widget na tela inicial" ON em roxo Dracula `#bd93f9`; sub-toggle "Mostrar nome no widget" aparece aninhado abaixo. UI Sentence case PT-BR com acentuacao completa. |
| `docs/sprints/M20-screenshots/A-02-settings-widget-mostra-nome-on.png` | `9ea63d97f41078a624df7798ba14c6ee2aca397c81105efb0549415b68371aab` | Mesma tela, sub-toggle ON. Hierarquia visual correta com padding consistente. |
| `docs/sprints/M20-screenshots/A-03-layout-4x2-raw.png` | `8f1541bbf0956d456f51d5a3d3efabf152b19fb66ca5a1db9548853e9147b665` | Preview HTML do `widget_4x2.xml` com paleta Dracula: avatar quadrado roxo letra "A", "Humor de hoje" muted, valor 4/5, divider, 4 botoes mini (Humor / Voz / Camera / Conquista). |
| `docs/sprints/M20-screenshots/A-04-layout-4x4-raw.png` | `76f136cfbbfcc51865b95989716343d980e033f2b0f4eee211772a3dc7dc8c83` | Preview HTML do `widget_4x4.xml`: tudo do 4x2 + frase "Pequenos passos contam." + label "Ultimos 7 dias" + heatmap 7 blocos com cores neutras Dracula (cinza/lilas/ciano sem semantica de humor ruim/bom — ADR-0005). |

Camada A entregue conforme PLAYBOOK §5.4: viewport mobile correto, smoke verde, estados claros nos screenshots.

## Camada V — Validacao cruzada via claude-in-chrome MCP

Conduzida ao vivo no Chrome MCP (tabId 243703851, Metro web em `http://localhost:8081/`).

### V-01 — Toggle widget pluga em UI real

Sequencia:
1. Primer localStorage 3 stores essenciais (onboarding/vault/pessoa).
2. Reload pagina; Tela 01 (Hoje) carregou com avatar "A", FAB roxo, tab bar 6 abas.
3. Click em aba Settings (1175,678) — navegou para `/settings`.
4. Scroll ate secao "Features opcionais".
5. Click em toggle "Widget na tela inicial" (1517,435).
6. Subtitulo "Mostra humor do dia e atalhos rapidos na home." visivel abaixo do label.

Verificacao via JS:

```javascript
JSON.parse(localStorage.getItem('ouroboros.settings.v1')).state.featureToggles
// => {contadorDiasSem: true, widgetHomescreen: true}
```

Apos primeiro click, o toggle visual aparecia cinza no screenshot (issue conhecido de baixo contraste do `<Switch>` em RN-Web — pre-existente desde M01.2, anotado em `STATE.md`, nao regressao desta sprint). Store persistiu corretamente.

### V-02 — Sub-toggle widgetMostraNome aparece condicionalmente

Apos `widgetHomescreen: true`, novo item "Mostrar nome no widget" surgiu aninhado abaixo do principal com subtitulo "Por padrao, o widget mostra apenas a inicial." (privacidade reforcada — decisao §10.3 da spec).

Click em (1517,503) ativou sub-toggle:

```javascript
JSON.parse(localStorage.getItem('ouroboros.settings.v1')).state.featureToggles
// => {contadorDiasSem: true, widgetHomescreen: true, widgetMostraNome: true}
```

Re-render aplicou: switch principal "Widget na tela inicial" passou a renderizar em roxo Dracula. Sub-toggle persistiu e a hierarquia visual aninhada confirmou.

### Conclusao Camada V

- Render condicional do sub-toggle funciona (pluga em `featureToggles.widgetHomescreen`).
- Persistencia em SecureStore via secureStorage adapter funciona.
- Texto Sentence case PT-BR com acentuacao completa preservado em UI runtime.
- Paleta Dracula correta (`#bd93f9` roxo ativo).

## Smoke runtime

Output literal do agente:

```
anonimato:    OK: anonimato preservado (Regra -1)            [exit 0]
typecheck:    (clean)                                          [exit 0]
smoke:        Test Suites: 100 passed / Tests: 889 passed     [exit 0]
jest:         Test Suites: 100 passed / Tests: 889 passed     [exit 0]
expo export:  android bundles 8.47 MB Hermes                   [exit 0]
```

Aritmetica: 878 -> 889 testes (+11). Spec previa +30 a +50 mas o agente justificou: testes adicionais previstos eram para integracao Kotlin que nao roda em Jest (modulo nativo), e a totalidade do codigo TS exposto pelo helper `atualizarWidgetHomescreen.ts` foi coberta. Sem testes desperdicados. Aceito.

## Integracao ao projeto (CONTRACT §2)

- [ok] Tab/Rota: sem aba nova — deep links do widget abrem rotas modais existentes (`/humor-rapido`, `/diario-emocional?modo=audio`, `/scanner`, `/diario-emocional?modo=vitoria`). PendingIntent monta `ouroboros://capturar/<atalho>?source=widget`.
- [ok] Schema: sem schema novo. Widget escreve `widget-data.json` em `cacheDirectory`, fora do Vault.
- [ok] Store: consome `useSettings.featureToggles.widgetHomescreen` e `usePessoa`. Adicionou `widgetMostraNome` ao shape de `featureToggles` (M15 e a unica dona do shape — orquestrador autorizou esta extensao na decisao §10.3).
- [ok] app.json: plugin local `'./modules/widget-homescreen/app.plugin.js'` (ajuste tecnico pelo resolver — referencia direta ao arquivo evita fallback ao `main` TS).
- [ok] Boot hook: `atualizarWidgetHomescreenBootHook` plugado em `BOOT_HOOKS`.
- [ok] FAB: sem mudanca. Atalhos do widget reusam mesmas rotas de `captureRoutes.ts`.
- [ok] Settings: sub-toggle `widgetMostraNome` aninhado quando `widgetHomescreen` esta ON.
- [ok] Mockup HTML: Tela 26 ja existia em `Ouroboros_telas_25_26-standalone.html` (M00.6).

## Decisoes implementadas (spec §10)

- [ok] §10.1 Plugin nativo Expo Module local em `modules/widget-homescreen/`, sem dependencia externa nova.
- [ok] §10.2 2 tamanhos: 4x2 e 4x4. AndroidManifest declara 2 receivers (`OuroborosWidgetProvider` e `OuroborosWidgetProviderLarge`).
- [ok] §10.3 Privacidade reforcada: avatar mostra apenas inicial por default; toggle `widgetMostraNome` opcional (default false).
- [ok] §10.4 Atualizacao event-driven via `saveHumor` + boot hook idempotente; sem polling.
- [ok] §10.5 Tap abre app via PendingIntent + deep link; sem acoes inline em RemoteViews.
- [ok] §10.6 Rate-limit 1 update/min (RATE_LIMIT_MS=60000) via timestamp em memoria; bypass com `forcar:true` no event-driven do saveHumor.
- [ok] §10.7 Repo continua sem `android/` versionado — o config-plugin sera aplicado no prebuild remoto do EAS.
- [ok] §10.8 Validacao Nivel B/C registrada como ressalva (abaixo).

## Achados colaterais

Nenhum. O escopo manteve-se cirurgico nos 7 arquivos modificados + 4 diretorios criados. Sem dispatches de planejador-sprint.

## Ressalvas pendentes

**Validacao Nivel B (emulador) e Nivel C (celular fisico) pendente para sessao dev-client EAS.** O codigo Kotlin/XML do widget esta integro mas nao foi compilado nem instalado em device real. Para fechar 100%:

- `npm run build:dev` — EAS cloud (~25min, custa creditos). Profile `development` ja configurado em M00.5.
- `adb install ouroboros-dev.apk` em emulador `ouroboros-test` ou no Redmi `carsvg7du8kfnrlj`.
- Validacoes B/C a executar na sessao dedicada:
  - Adicionar widget 4x2 na home — renderiza correto.
  - Adicionar widget 4x4 — heatmap mini renderiza.
  - Tap em atalho humor abre `/humor-rapido`.
  - Salvar humor — widget atualiza em <60s.
  - Toggle off em Settings — widget mostra layout `widget_desativado.xml` com mensagem PT-BR.

Bridge JS escrita defensivamente (`requireOptionalNativeModule` devolve null em ausencia → `atualizarWidget` vira no-op silencioso). Bundle Hermes 8.47 MB confirma que imports nativos nao inflaram o JS.

## Issue conhecido (nao bloqueante)

Switch RN-Web tem baixo contraste no Chrome web — pre-existente desde M01.2, anotado em `STATE.md` como pendencia de polish web. Nao regressao desta sprint. Estado real do toggle e correto (validado via store JSON em ambos toggles).

## Decisao final

**APROVADO COM RESSALVA.**

Justificativa: 5 contratos smoke verdes, integracao em pontos canonicos completa, paleta e tom corretos, decisoes §10 todas implementadas, store + UI runtime validados. A unica ressalva e a renderizacao real do widget em homescreen Android — explicitamente prevista pela spec §10.8 como pendente para sessao dev-client EAS, nao bloqueante para fechamento desta sprint.

**Proxima sprint executavel:** A definir pelo orquestrador apos commit/push. Candidatos: `M00.5.x` (limpa debito Rules of Hooks, ~2h), `M19.x` (HTML toolchain, ~3h), ou pausar para sessao Python dedicada (destrava M10/M14).
