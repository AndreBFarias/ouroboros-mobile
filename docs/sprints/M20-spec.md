# Sprint M20 — Widget de Homescreen Android (Tela 26)

```
DEPENDE:    M00.5 fechada (toggle widgetHomescreen)
            + M00.6 fechada (mockup Tela 26 atualizado)
            + M05 (humor rapido grava daily/)
            + M15 (UI do toggle em Settings)
ESTIMATIVA: 6-7h (inclui plugin nativo Android)
```

## 1. Objetivo

Entregar **widget Android nativo** que aparece na home screen do
celular mostrando humor médio do dia + atalho de captura. Tap em
atalho abre o app diretamente na captura correspondente. Atualiza
ao salvar humor (M05). Configurável em Settings: pessoa única
(filtro) e tamanho (4x2 dp ou 4x4 dp). Toggle off em Settings
desativa via `AppWidgetManager` (widget some das opções de
homescreen).

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/expo-module.config.json`
  — Config do módulo nativo Expo.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/android/src/main/AndroidManifest.xml`
  — Receiver `OuroborosWidgetProvider` declarado.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/android/src/main/java/expo/modules/widgethomescreen/OuroborosWidgetProvider.kt`
  — Subclass de `AppWidgetProvider`. `onUpdate` lê
  `~/Protocolo-Ouroboros/.ouroboros/cache/widget-data.json`
  (escrito pelo JS) e renderiza views.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/android/src/main/res/layout/widget_4x2.xml`
  — Layout pequeno: avatar inicial pessoa + número humor +
  4 botões mini (humor / voz / câmera / vitória).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/android/src/main/res/layout/widget_4x4.xml`
  — Layout médio: tudo do 4x2 + heatmap mini 7 dias + frase do dia.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/android/src/main/res/xml/widget_info_4x2.xml`
  e `widget_info_4x4.xml` — metadados Android (resizeMode, classe
  do receiver, layout default).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/modules/widget-homescreen/src/index.ts`
  — Bridge JS → Kotlin via `requireNativeModule`. Funções:
  - `atualizarWidget(data: WidgetData): Promise<void>`
  - `desativarWidget(): Promise<void>`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/widget/atualizarWidgetHomescreen.ts`
  — Helper que monta `WidgetData` consultando humor do dia,
  pessoa ativa e cache heatmap (M10). Escreve
  `widget-data.json` e chama `atualizarWidget()`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/widget/atualizarWidgetHomescreen.test.ts`
  — Testes mock do helper.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — `expo.plugins` recebe `'./modules/widget-homescreen'`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/humor/saveHumor.ts`
  — após `writeVaultFile` bem sucedido, dispara
  `atualizarWidgetHomescreen()` quando
  `useSettings.featureToggles.widgetHomescreen === true`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/reagendamento.ts`
  — adiciona `atualizarWidgetHomescreen` ao `BOOT_HOOKS` para
  cobrir o caso de o app ser aberto sem novo humor (mostra valor
  do dia anterior).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/biometriaGate.tsx`
  — quando biometria está on **mas** o tap chega via deep link do
  widget, abrir gate normalmente; após autenticar, navegar para
  rota do atalho.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/eas.json`
  — Profile `production` confirma `developmentClient: false`;
  widget só compila em prebuild.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/docs/Ouroboros_22_telas-standalone.html`
  (renomeado em M19 para 24 telas) — Tela 26 já está atualizada
  pela M00.6. Esta sprint só consome.

## 3. APIs reutilizáveis

- `expo-modules-core` — bridge Kotlin → JS.
- `useSettings.featureToggles.widgetHomescreen` — toggle.
- `usePessoa` — pessoa ativa default.
- Cache `humor-heatmap.json` (MOB-bridge-2) — para heatmap mini do
  layout 4x4.
- `src/lib/navigation/captureRoutes.ts` — atalhos do FAB
  reaproveitados para deep links do widget.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** sem aba nova. Deep links do widget abrem rotas
  modais existentes (`/humor-rapido`, `/diario-emocional?modo=audio`,
  `/scanner`, `/diario-emocional?modo=vitoria`).
- **Schema:** sem schema novo (escrita interna do widget é JSON
  fora do Vault, em `cacheDirectory/widget-data.json`).
- **Store:** consome `useSettings.featureToggles.widgetHomescreen`
  e `usePessoa`. Não cria store novo.
- **app.json:** plugin local `./modules/widget-homescreen`.
- **Boot hook:** `atualizarWidgetHomescreen` adicionado a
  `BOOT_HOOKS`.
- **FAB:** sem mudança. Atalhos do widget reusam mesmas rotas.
- **Settings:** consome toggle existente.
- **Mockup HTML:** Tela 26 já existe (M00.6).

## 4. Restrições

- **Regra −1**, ADR-0007 (zero rede), Sentence case PT-BR.
- **Sem rede:** widget renderiza apenas dados locais (cache do
  desktop e humor.md do dia).
- **Atualização rate-limited:** máximo 1 update por minuto para
  preservar bateria.
- **Privacidade:** widget mostra apenas inicial da pessoa (não nome
  completo) por padrão. Toggle adicional em Settings
  `widgetMostraNome` se usuário aceitar (default off).
- **Tap em widget abre app:** sem ações inline (evita complexidade
  de `RemoteViews`).
- **Toggle off desativa:** `AppWidgetManager.getAppWidgetIds`
  + `updateAppWidget` envia layout vazio com mensagem `"Widget
  desativado em Configurações."` e instruções para remover da
  homescreen.

## 5. Procedimento sugerido

1. Criar `modules/widget-homescreen/` com estrutura Expo Modules.
2. Implementar `OuroborosWidgetProvider.kt` com `onUpdate` lendo
   JSON local e populando `RemoteViews`.
3. Criar 2 layouts XML (4x2 e 4x4) com paleta Dracula via cores
   hex hardcoded (Android XML não suporta CSS vars).
4. Criar bridge JS → Kotlin via `requireNativeModule`.
5. Implementar `atualizarWidgetHomescreen` helper que monta
   `WidgetData` (avatar, humor, frase, heatmap mini).
6. Plugar em `saveHumor` e em `BOOT_HOOKS`.
7. Configurar `app.json` com plugin local.
8. Rodar `npx expo prebuild --platform android` para gerar `android/`
   nativo (necessário para custom widget; não roda em Expo Go).
9. Build dev-client: `npm run build:dev`.
10. Validar manualmente:
    - Adicionar widget pequeno (4x2) na home — renderiza correto.
    - Adicionar widget médio (4x4) — heatmap mini renderiza.
    - Tap em atalho humor abre `/humor-rapido`.
    - Salvar humor — widget atualiza em <60s.
    - Toggle off em Settings — widget mostra mensagem de
      desativação.
11. Smoke + tests + tsc + expo export.
12. Capturar screenshots em `docs/sprints/M20-screenshots/`
    incluindo widget na home screen real.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo prebuild --platform android --clean
npx expo export --platform android --output-dir /tmp/m20-export

# Build dev-client com widget
npm run build:dev

# adb teste manual
adb install ~/Downloads/ouroboros-dev.apk
# Adicionar widget pela home; tirar screencap
adb exec-out screencap -p > docs/sprints/M20-screenshots/widget-4x2.png
```

Todos exit 0.

## 7. Commit

```
feat: m20 widget homescreen android com atalho radial e humor do dia
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Nível A (Chrome web):** **não cobre** widget nativo. Validar
  apenas o helper `atualizarWidgetHomescreen` via testes
  unitários.
- **Nível B (emulador Android):** validar widget na home do
  emulador (long-press → adicionar widget).
- **Nível C (celular físico):** **só com permissão**. Validar
  widget real na home do Redmi.

Capturar screenshots em `docs/sprints/M20-screenshots/`.

## 9. Definição de Pronto

- [ ] Plugin nativo Expo Module funcional.
- [ ] 2 layouts (4x2 e 4x4) renderizam corretamente.
- [ ] Tap em atalho abre rota correta.
- [ ] Atualização ao salvar humor < 60s.
- [ ] Toggle off em Settings desativa widget.
- [ ] Privacidade: só inicial por default.
- [ ] Cold install funciona após `npm run build:dev`.
- [ ] Smoke + tests + tsc + expo export OK.
- [ ] Screenshots Nível B/C capturadas.

## 10. Decisões tomadas

- **Plugin nativo Expo Module (não `react-native-android-widget`):**
  controle total e zero dependência externa nova.
- **2 tamanhos (4x2 e 4x4):** cobre os 2 casos comuns (mini info
  e info expandida).
- **Privacidade reforçada:** só inicial por default; toggle
  `widgetMostraNome` se usuário aceitar.
- **Atualização event-driven (saveHumor) + boot hook:** garante
  freshness sem polling.
- **Tap abre app:** sem ações inline. `RemoteViews` é limitado e
  adiciona complexidade desnecessária.
- **Rate-limit 1/min:** preserva bateria; suficiente para o caso
  de uso.

Sprint pronta para execução sem perguntas pendentes.
