# Sprint R-BRAND-ASSETS-APP — integrar a marca Ouroboros ao app (logo + animacoes de loading)

```
DEPENDE:    R-BRAND-1-LOGO nao depende de nada (assets estaticos; icone/
            splash/logo in-app). R-BRAND-2-ANIMACOES DEPENDE de
            R-AUDIT-A11Y-MOVIMENTO (consome o hook useReduceMotion()).
BLOQUEIA:   nada estrutural. R-BRAND-2-ANIMACOES nao pode ir antes de
            R-AUDIT-A11Y-MOVIMENTO existir (senao a animacao chamaria
            AccessibilityInfo direto e teria que ser refeita — o mesmo
            erro que a A11Y-MOVIMENTO existe para evitar).
ESTIMATIVA: R-BRAND-1-LOGO ~0.5 dia (rasterizar PNGs + editar app.json +
            atualizar OuroborosLogo.tsx + rebuild). R-BRAND-2-ANIMACOES
            ~1-1.5 dia (portar 1-2 tratamentos de loading pro RN + hook +
            testes + E2E). Total ~1.5-2 dias.
STATUS:     [done] (2026-07-14) — R-BRAND-1-LOGO mergeada em cea3a12;
            R-BRAND-2-ANIMACOES mergeada em 1775d4c. Proximos passos da
            marca: onda R-BRAND-SYSTEM (_ONDA-R-BRAND-SYSTEM.md), que
            SUBSTITUI o contrato de variants desta spec pelo glifo
            canonico animavel (R-BRAND-3-GLIFO em diante).
ORIGEM:     pedido do dono 2026-07-12 — integrar assets de
            ~/Desktop/assets-ouroboros-loading-logo. Decisao: cuidar SO das
            animacoes de APP; as de SITE (projeto irmao protocolo-ouroboros:
            pipeline ETL + dashboard financeiro) sao outro escopo e devem
            ser EXCLUIDAS. Usar a logo ouroboros como icone/splash/logo
            in-app. Integrar a marca em README/docs.
            Decisao de estrutura (dono 2026-07-12): a troca da logo e'
            prioridade e NAO depende de reduce-motion (assets estaticos) —
            separar em duas sub-sprints com IDs proprios.
VISAO:      publico com depressao/TDAH/ansiedade/autismo. A marca so' entra
            se respeitar os 4 principios da doc de marca (respirar / fechar
            e' celebrar / pertencer ao momento / a espera e' materia), que
            casam 1:1 com a Regra de Estetica (ADR-010) e a Regra de Tom
            (zero gamificacao). Toda animacao honra reduce-motion — para o
            publico autista/ansioso movimento continuo e' gatilho, nao
            enfeite.
```

> **Duas sub-sprints, IDs proprios, ordem propria.** Esta spec cobre AMBAS
> em secoes separadas. **R-BRAND-1-LOGO** (assets estaticos) pode ir cedo
> (Fase 1 ou 2), independe de reduce-motion, mas exige REBUILD do
> dev-client/APK para ver no device. **R-BRAND-2-ANIMACOES** (loading
> animado in-app) e' JS puro (Metro live, sem rebuild) mas DEPENDE de
> R-AUDIT-A11Y-MOVIMENTO. Executar 1 antes de 2 nao e' obrigatorio, mas 2
> nao pode comecar antes da A11Y-MOVIMENTO estar mergeada.

---

## 1. Objetivo

Integrar a marca Ouroboros ao app em tres frentes, EXCLUINDO tudo que e'
superficie do projeto irmao de site (pipeline ETL + dashboard financeiro):

1. **Logo -> icone / splash / logo in-app** (R-BRAND-1-LOGO). Rasterizar o
   SVG canonico `ouroboros.svg` para os PNGs que o Expo exige (icon 1024,
   adaptive-icon foreground, splash) e alinhar o componente in-app
   `src/components/brand/OuroborosLogo.tsx` ao glifo canonico do SVG.
   Assets estaticos, sem dependencia de reduce-motion.

2. **Animacao(oes) de loading de APP portada(s) pro RN** (R-BRAND-2-ANIMACOES).
   Trazer o tratamento visual de loading da marca (anel/contas/percentual)
   para o RN, consumindo o hook `useReduceMotion()` do R-AUDIT-A11Y-MOVIMENTO.
   Aproveitar so' a face de APP dos conceitos; DESCARTAR o cenario-demo de
   processamento de arquivos financeiros (extrato.ofx, fatura, holerite,
   das_mei), que e' fluxo do site.

3. **Marca em README / docs** (parte de R-BRAND-1-LOGO). Usar o lockup
   (ou o monomark wordmark+ponto E3) no README, mantendo o anonimato
   absoluto (Regra -1) — o wordmark e' o nome do PRODUTO, nao de pessoa.

**REAVALIACAO DE ESCOPO (dono 2026-07-13):** a v1 desta spec excluiu 5
conceitos por estarem rotulados "site". Revendo a doc-fonte (os 17
conceitos em `Conceitos Ouroboros.html`, cada um traz sua propria tag
`app`/`site`/`app site`), o dono apontou que MUITO do "site" serve ao app.
Reavaliacao caso a caso (o CENARIO do site sai; o TRATAMENTO VISUAL fica e
e' readaptado a uma superficie de app real):

- **B1 respiracao ambiente** — era "site" (header do dashboard). ENTRA no
  app: e' o estado idle/ambiente calmo E o **fallback canonico de
  reduce-motion** (cobra parada "respirando" ja e' presenca — principio 01
  da marca). Alto valor pro publico ansioso/autista.
- **C3 rejeicao atenta** — era "site" (OCR falhou). ENTRA no app readaptado
  a **estados de erro do app** (save falhou, sync falhou, OAuth negado,
  permissao negada): "atencao sem susto", sem alarme — casa com a Regra de
  Tom. Descartar so' o cenario OCR/banco.
- **F2 fim de mes** — era "site" (dashboard). ENTRA no app como **ritual
  mensal ligado ao Recap** (o app tem Recap mensal/marcos temporais): mes
  fecha desatura, novo abre, badge silencioso. Descartar so' o dashboard.
- **D1 contas por arquivo** — era "site" (arquivos financeiros do ETL).
  ENTRA PARCIAL: reaproveitar o MECANISMO (segmentar a cobra por N itens de
  progresso — sync de N notas do Vault, backup de N fotos, import) sem o
  rodape "nome do arquivo financeiro".
- **G1 cobra como pipeline ETL** — UNICO que permanece FORA: e' o diagrama
  de arquitetura (ARCHITECTURE.md) do projeto-irmao ETL, nao UI de app.

**PERMANECE FORA (nao entra no app):** apenas **G1** (diagrama ETL) e o
mecanismo de INTEGRACAO documentado nas telas 01-05 (`st.components.html`/
`st.fragment` = Streamlit do site) — porta-se o tratamento visual pro RN,
nao o codigo Streamlit.

---

## 2. Estado atual (arquivo:linha, confirmado)

### 2.1 Assets de icone/splash hoje

- `app.json` — `icon: "./assets/icon.png"`, `splash.image:
  "./assets/splash.png"` (resizeMode `cover`, backgroundColor `#14151a`),
  `android.adaptiveIcon.foregroundImage: "./assets/icon-foreground.png"`
  (backgroundColor `#14151a`), `web.favicon: "./assets/favicon.png"`.
- `assets/` contem: `icon.png`, `icon-foreground.png`, `adaptive-icon.png`,
  `splash.png`, `splash-icon.png`, `favicon.png` (PNGs existentes, a serem
  substituidos pela nova marca).
- Fundo de splash atual `#14151a`; a doc de marca sugere `#191724` (bg-page
  Dracula da marca). Decidir 1 valor canonico na secao 3.1.

### 2.2 Logo in-app hoje

- `src/components/brand/OuroborosLogo.tsx` — logo estatico em
  react-native-svg (SEM dependencia nova; rn-svg ja e dep direta (nao peer)). Reproduz o
  glifo do desktop `ouroboros-redesign-v1/index.html`. Props `tamanho`
  (default 320) e `mostrarTexto` (wordmark on/off). Usa `fontFamily=
  "monospace"` literal para evitar pisca de fallback no boot (decisao M25).
- `src/components/brand/OuroborosLoader.tsx` — versao ANIMADA (4 aneis
  girando 90s/60s/30s + fluxo 6s via Reanimated 4 + rAF no web). Ja e' o
  loader de boot e de loaders inline. **Consumidores confirmados (~11-14):**
  `app/_layout.tsx` (boot), `app/onboarding.tsx`, `app/scanner.tsx`,
  `app/agenda.tsx`, `app/eventos.tsx`, `app/captura.tsx`,
  `app/diario-emocional.tsx`, `app/humor-rapido.tsx`, `app/oauthredirect.tsx`,
  `app/recap-memorias.tsx`, `app/recap-lista.tsx`,
  `src/components/screens/RecapScreen.tsx`, `RecapModoCalendario.tsx`,
  `src/lib/hooks/useRecap.ts`.
- `src/components/brand/index.ts` — barrel export.

### 2.3 Splash mechanism

- `app/_layout.tsx:100` — `SplashScreen.preventAutoHideAsync()`;
  `:143` `useFonts(...)`; `:170-171` `hideAsync` idempotente (guard por
  ref; useFonts SDK 54 demora 30-60s). Enquanto carrega,
  `OuroborosLoader` bloqueante e' renderizado. Ou seja: o splash NATIVO
  (PNG do expo-splash) aparece primeiro, depois o loader ANIMADO JS assume
  ate as fontes/stores hidratarem.

### 2.4 Reduce-motion hoje

- **Zero infra** (confirmado por R-AUDIT-A11Y-MOVIMENTO §2). O hook
  `useReduceMotion()` e' introduzido POR aquela sprint. O `OuroborosLoader`
  atual gira sempre, sem checar reduce-motion — a A11Y-MOVIMENTO ja lista o
  loader (`:214-252`, `:155-212`) como um dos 3 componentes que passam a
  consumir o hook. **Consequencia para esta sprint:** qualquer animacao de
  marca nova DEVE nascer ja consumindo o hook; e o loader existente ja
  tera' o early-return quando a A11Y-MOVIMENTO mergear.

### 2.5 Fonte dos assets (read-only, fora do repo)

- `~/Desktop/assets-ouroboros-loading-logo/ouroboros.svg` — LOCKUP circular
  completo. viewBox `20.77 21.49 276.17 276.17` (arte ~276x276 quadrada),
  width/height declarado 320x320. Anel de 43-44 contas formando a serpente
  que morde a cauda; cabeca ROSA (#fc7ac8 ~ pessoa_b) mordendo cauda ROXA
  (#c092f7 ~ pessoa_a); degrade rosa->roxo; anel pontilhado interno;
  wordmark central `PROTOCOLO OUROBOROS` vetorizado (PATHS, nao <text>) num
  grupo separavel `<g id="wordmark">` (filhos wordmark-protocolo cinza
  #7c7e8c + wordmark-ouroboros roxo #bd93f9). Vetor puro, sem raster
  embutido, sem <defs> de gradiente.
- `~/Desktop/.../Ouroboros documentado.svg` — BYTE-IDENTICO ao anterior
  (40083 bytes, diff = identico). NAO shipar; redundante.
- **Anonimato: OK** (lente D confirmou). grep por andre/vitoria/farias/
  claude/anthropic/gpt/openai/gemini/autor/@/.com/copyright = 0
  ocorrencias. Unicos textos: aria-label + <title>s de camada anonimos +
  wordmark `PROTOCOLO OUROBOROS` (nome do produto). Nada a remover.
- Ferramentas presentes na maquina: `rsvg-convert` + ImageMagick (ok para
  rasterizar).

---

## 3. Design

### SUB-SPRINT R-BRAND-1-LOGO — logo estatica (icone + splash + in-app)

> Prioridade do dono. Assets estaticos. NAO depende de A11Y-MOVIMENTO. Pode
> ir na Fase 1 ou 2. Exige REBUILD para ver icone/splash no device.

#### 3.1 SVG -> app icon (1024 quadrado)

- **Fonte:** `ouroboros.svg`. Para o ICONE (app launcher, favicon), usar a
  variante **so'-simbolo** — ocultar/remover o grupo `<g id="wordmark">`
  antes de rasterizar (o wordmark central nao le' em tamanho de icone; ver
  conceito E1 head-only / monomark). O anel + cabeca/cauda com o degrade
  rosa->roxo e' reconhecivel.
- **Pipeline:** `rsvg-convert -w 1024 -h 1024` sobre um SVG derivado
  (wordmark oculto), sobre fundo da marca. Gerar:
  - `assets/icon.png` — 1024x1024, fundo `#191724` (ou `#14151a` se
    mantivermos o atual; DECIDIR e usar UM valor em todo o app.json).
  - `assets/icon-foreground.png` — foreground do adaptive icon Android:
    simbolo centralizado com **safe zone** (o Android mascara ~66% central;
    o glifo nao pode encostar nas bordas). Fundo TRANSPARENTE (o
    backgroundColor do adaptiveIcon pinta atras).

> **CRITICO (achado do painel de revisao — ALTO):** hoje o
> `icon-foreground.png` e' DUPLO-USO — alem do adaptive-icon, e' o
> `icon` do plugin **expo-notifications** em `app.json` (~linha 83,
> `color: "#bd93f9"`). O Android renderiza icone de notificacao como
> **mascara MONOCROMATICA** (branco sobre transparente); um simbolo
> COLORIDO rosa->roxo viraria um **blob branco solido ilegivel**. Num app
> de saude mental cujas notificacoes de humor/remedio sao feature CORE,
> isso e' regressao shipada. **Correcao obrigatoria:** gerar um asset
> SEPARADO `assets/notification-icon.png` — **silhueta monocromatica
> branca sobre transparente** (so' o contorno do anel/cabeca, sem degrade)
> — e apontar `expo-notifications.icon` para ele. O `icon-foreground.png`
> colorido serve SO' ao adaptive-icon. Enumerar o plugin expo-notifications
> na lista de edicoes de `app.json` (§4).
  - `assets/adaptive-icon.png` — se ainda referenciado; alinhar com o
    foreground.
  - `assets/favicon.png` — 48x48 (ou 32/64), so'-simbolo.
- **backgroundColor do adaptiveIcon:** manter cor solida da marca (nao
  transparente), casando com `splash.backgroundColor`.

#### 3.2 SVG -> splash (expo-splash-screen)

- **Fonte:** `ouroboros.svg` COMPLETO (com wordmark) — no splash ha' espaco
  e o lockup `PROTOCOLO OUROBOROS` e' desejavel/legivel (conceitos
  02-percentual / 04-contas descrevem boot/splash da marca; face de APP).
- **Pipeline:** rasterizar centralizado sobre fundo escuro da marca, lockup
  ocupando ~40-50% da largura. Gerar `assets/splash.png` no tamanho que o
  expo-splash espera. **Reavaliar `resizeMode`:** o atual e' `cover` — para
  um lockup centralizado sem cropar, `contain` e' mais seguro. DECIDIR: se
  o PNG ja e' full-bleed com o lockup centralizado, `cover` ok; se e' so' o
  glifo num canvas menor, usar `contain`.
- **Splash e' NATIVO (PNG estatico), nao animado.** O momento animado do
  boot ja e' coberto pelo `OuroborosLoader` JS que assume apos o splash
  nativo sumir (2.3). Nao introduzir splash animado nativo nesta sprint.

#### 3.3 Logo in-app (`OuroborosLogo.tsx`)

- **Manter react-native-svg** (sem dep nova). Alinhar o glifo do componente
  ao SVG canonico `ouroboros.svg` (hoje ele reproduz o glifo do desktop
  `ouroboros-redesign-v1`, que pode divergir do SVG entregue). Se houver
  divergencia visual relevante (numero de contas, degrade, anatomia da
  cabeca), atualizar os paths do componente para bater com `ouroboros.svg`.
- **Variantes por superficie** (do conceito de monomarks):
  - Header/topbar: variante **so'-simbolo** ~28-40dp (`mostrarTexto={false}`
    ja existe). O texto interno nao le' pequeno.
  - Onboarding (Tela 24) e tela Sobre: LOCKUP completo (`mostrarTexto`).
  - Theming: em tema claro, garantir contraste do olho/contorno escuro
    (o app e' `userInterfaceStyle: dark` hoje — baixo risco, mas registrar).
- **NAO** trocar a implementacao para renderizar o arquivo `.svg` cru via
  loader — manter os paths inline em rn-svg (nitido, sem asset extra,
  padrao ja adotado no projeto).

#### 3.4 README / docs (marca)

- Rasterizar um PNG do lockup (ex. 512x512 sobre fundo escuro) e referenciar
  no README via `<img width="200">` (GitHub sanitiza SVG inline em
  markdown; PNG e' mais seguro). Alternativa: monomark E3 (wordmark+ponto)
  no hero/changelog.
- Integrar SO' em README/docs. Anonimato OK (nome de produto).

### SUB-SPRINT R-BRAND-2-ANIMACOES — loading animado in-app (RN)

> JS puro (Metro live, sem rebuild). DEPENDE de R-AUDIT-A11Y-MOVIMENTO
> (consome `useReduceMotion()`). Nao comecar antes daquela sprint mergeada.

#### 3.5 Quais conceitos de animacao entram (APP) e quais saem (SITE)

**ENTRAM no app (16 dos 17 conceitos — reavaliacao 2026-07-13):**

| ID | Conceito | Superficie de APP | Origem |
|---|---|---|---|
| A1 | Nascer da cobra | boot/splash (reveal da marca) | app site |
| A2 | Semente que expande | splash (abertura) | app site |
| B1 | Respiracao ambiente | estado idle calmo + **fallback reduce-motion** | reclass. de site |
| B2 | Relogio silencioso | notification tray / widget home | app |
| B3 | Dupla presenca | card 'voces' · onboarding Tela 24 · Recap | app |
| C1 | Fechamento do ciclo | save de humor/diario · treino concluido | app site |
| C2 | Digestao / onda continua | processamento indeterminado · sync do Vault | app site |
| C3 | Rejeicao atenta | **estados de erro do app** (save/sync/OAuth/permissao) | reclass. de site |
| D1 | Contas por arquivo | **mecanismo** de progresso segmentado (N notas/fotos) | reclass. parcial |
| D2 | Fluxo vault | sync Obsidian/Syncthing · import de Vault | app site |
| D3 | Logo com percentual | operacao longa com percentual real | app site |
| E1 | Head-only (monomark) | app icon (ja coberto em R-BRAND-1) | app site |
| E2 | Ring-only (monomark) | chips · bullets · dividers · loading inline | app site |
| E3 | Wordmark+ponto (monomark) | tela Sobre · changelog · footer README | app site |
| F1 | Virada de meia-noite (ritual) | app aberto 23:59 / 1a interacao pos-00:00 | app |
| F2 | Fim de mes (ritual) | **ritual mensal ligado ao Recap** | reclass. de site |

**SAI (unico exclusivo de SITE):**

| ID | Conceito | Por que sai |
|---|---|---|
| G1 | Cobra como pipeline ETL | diagrama de arquitetura (ARCHITECTURE.md do projeto-irmao) |

**As 5 telas prototipadas de loading (01-terminal, 02-percentual, 03-anel,
04-contas, 05-combo):** o hub as recomenda para superficies de APP —
01 "Entrada", 02 "boot/splash", 03 "operacoes pontuais", 04 "boot da
marca / rotina completa", 05 "processamento pesado" (ex.: export do Vault,
geracao do Recap). Reaproveitar o TRATAMENTO VISUAL (anel/contas/percentual/
barra) em todas; DESCARTAR apenas o codigo de integracao Streamlit
(`st.components.html`/`st.fragment`) e qualquer rotulo de arquivo financeiro.

#### 3.6 Escopo minimo desta sub-sprint (o que de fato se implementa agora)

O app JA tem um loader de marca funcional (`OuroborosLoader.tsx`, 4 aneis
girando). Para nao inflar escopo (Regra 2 — simplicidade), esta sub-sprint
implementa um subconjunto pequeno e de alto valor, cada peca ja consumindo
`useReduceMotion()`:

1. **C2 — Digestao / onda continua.** REANCORADO (frente A 2026-07-14): NAO
   existe "sync do Vault" como loader in-app — o Syncthing roda FORA do app.
   A superficie real de operacao longa indeterminada e' o **botao de backup**
   (`src/components/settings/SecaoBackupAutomatico.tsx:220`, hoje so' o texto
   `'Fazendo backup…'` SEM spinner — trocar por `OuroborosLoading
   variant="sync"`). O `executando` da `:66` gateia o estado. `CardStatus.tsx`
   e' status estatico, NAO candidato. Loader indeterminado sem ansiedade
   (1 revolucao / 2.4s). Reduce-motion: onda desliga, anel estatico/parado.
2. **C1 — Fechamento do ciclo** no save de humor/diario. GAP DE INTEGRACAO
   (frente A): o save FECHA A TELA na hora — `humor-rapido.tsx:164-173`
   (`close()` → toast → `haptics.humor()` → `router.back()`) e
   `diario-emocional.tsx` idem (`router.back()` via `fecharUmaVez :183-190`).
   A cascata de 350ms nao seria vista. **DECISAO (dono, via orquestrador
   2026-07-14): micro-overlay de fechamento de ~350ms ANTES do `router.back()`**
   — so' nos 2 saves, suave, e' o "momento de marca" (conclusao calma, nao
   gamificacao); 350ms nao e' friccao para o publico ansioso, e' feedback de
   conclusao. NAO mexer no Toast global (afetaria todos os toasts). O **haptic
   de C1 JA existe** (`haptics.humor()`/`.vitoria()`) — C1 agrega SO' o visual.
   Reduce-motion: sem cascata/flash — estado final direto (corte), sem atrasar
   o dismiss (com reduce-motion o `router.back()` roda imediato).
3. **E2 — Ring-only** como loading inline **MINIMAL**: so' o anel (SEM cobra/
   cabeca/wordmark), para chips/dividers/bullets onde o `OuroborosLoader
   compacto` (96px, glifo completo, ja usado em ~14 telas) e' grande demais.
   E2 = `OuroborosLoading variant="inline"` (ring puro) — distinto do
   `OuroborosLoader compacto`; NAO duplicar o que ja existe.
4. **B1 — Respiracao ambiente** como o **fallback canonico de
   reduce-motion** dos itens acima (cobra parada "respirando": halo pulsa
   lento OU totalmente estatica). Entra AGORA porque e' o estado que C1/C2/E2
   assumem quando `useReduceMotion()` = true — nao e' peca separada, e' o
   destino do early-return. Alinha com o principio 01 da marca.

**Reavaliados como app mas em sprint propria (R-BRAND-3-ESTADOS-VIVOS,
para nao inflar esta):** C3 (estados de erro), F2 (ritual mensal no Recap),
D1-mecanismo (progresso segmentado). **Backlog ja existente:** A1/A2
(reveal de boot — o boot ja tem loader), B2 (relogio/tray/widget — depende
de superficie nativa de widget), B3 (dupla presenca — card voces/onboarding),
F1 (ritual de meia-noite), D2/D3 (fluxo vault com nomes / percentual real —
precisam de dado real de progresso). Todos no §8.

#### 3.7 Tecnica de porte pro RN

- **JS puro preferido (Reanimated + react-native-svg)** — mesma stack do
  `OuroborosLoader` atual (Reanimated 4 `useSharedValue`/`withRepeat`/
  `withTiming` no nativo; `useAnimatedProps` com string SVG `rotate(a cx cy)`
  para paridade web, ver comentario M25.1 no loader). **NENHUMA dependencia
  nativa nova** (nao lottie, nao skia). Se em algum momento uma animacao
  exigir lottie-react-native ou @shopify/react-native-skia, isso e' uma dep
  NATIVA e obriga rebuild + gate — FLAGAR como interacao com a Fase 3 (bump
  de infra) e NAO adicionar nesta sprint. **Objetivo desta sprint: manter
  tudo JS puro.**
- **Consumo do hook (obrigatorio):** cada componente novo computa
  `const reduzir = useReduceMotion();` no topo. Quando `reduzir`: aplicar o
  estilo ESTATICO (nao condicionar a CHAMADA dos hooks de Reanimated — regra
  dos hooks; ver R-AUDIT-A11Y-MOVIMENTO §3.4). Loops `withRepeat` viram
  no-op / valor final; rAF web nao arma.
- **Haptic (C1):** usar o helper de haptics ja existente do projeto; so' no
  save concluido, pontual (Regra de Estetica principio 4). Haptic e' API
  nativa -> checkpoint Nivel C no device.

---

## 4. Entregaveis

### R-BRAND-1-LOGO

- **Assets (substituir os PNGs existentes):**
  - `assets/icon.png` (1024x1024, so'-simbolo, fundo da marca)
  - `assets/icon-foreground.png` (adaptive foreground, safe-zone, transparente)
  - `assets/adaptive-icon.png` (se referenciado)
  - `assets/splash.png` (lockup completo centralizado)
  - `assets/favicon.png` (so'-simbolo)
  - **`assets/notification-icon.png`** (silhueta MONOCROMATICA branca sobre
    transparente — para o plugin expo-notifications; ver §3.1 CRITICO)
  - (opcional) `assets/brand/ouroboros-lockup-512.png` para README
- **Edicoes `app.json`:** confirmar/ajustar `icon`, `splash.image`,
  `splash.resizeMode` = **`contain`** (canonico; lockup centralizado sem
  crop), `splash.backgroundColor` = **`#14151a`** (canonico — mesmo valor do
  atual; aplicar IDENTICO em splash.backgroundColor + adaptiveIcon.background
  Color para nao haver salto de cor no boot), `android.adaptiveIcon.
  foregroundImage` + `backgroundColor`, **`plugins` -> `expo-notifications`
  -> `icon: "./assets/notification-icon.png"`** (mantendo `color: "#bd93f9"`),
  `web.favicon`. Bump `android.versionCode` (assets mudam o binario).
- **`src/components/brand/OuroborosLogo.tsx`** — alinhar glifo ao
  `ouroboros.svg` canonico se divergente.
- **README** — bloco de marca com o lockup.
- **Script de rasterizacao** (opcional, para reprodutibilidade): um
  `scripts/gen-brand-assets.sh` que roda `rsvg-convert`/ImageMagick sobre a
  fonte SVG. (A fonte fica fora do repo, read-only; documentar o caminho.)

### R-BRAND-2-ANIMACOES

- **`src/components/brand/OuroborosLoading.tsx`** (novo) — variantes de
  loading da marca: `variant="sync"` (C2 onda continua), `variant="inline"`
  (E2 ring-only minimal). Consome `useReduceMotion()`. **CONTRATO OBRIGATORIO
  (frente A):** `R-BRAND-3-ESTADOS-VIVOS` ja assume este componente e o
  ESTENDE com `variant="progresso"` (D1), estado de erro (C3) e ritual (F2).
  Nomear `OuroborosLoading.tsx` com prop `variant` extensivel NAO e' opcional —
  a sprint seguinte depende deste contrato. NAO estender o `OuroborosLoader`
  existente in-place (14 consumidores; risco de regressao) — sao pecas irmas.
- **`src/components/brand/OuroborosFechamento.tsx`** (novo, ou extensao do
  loader) — C1 fechamento do ciclo para save de humor/diario. Consome o
  hook + haptic pontual.
- **Barrel `src/components/brand/index.ts`** — exportar os novos.
- **Wire-up:** ligar C2 ao sync do Vault (onde o app ja mostra progresso de
  sync) e C1 ao save de humor/diario (`app/humor-rapido.tsx` e/ou
  `diario-emocional.tsx`).
- **Testes Jest** — render + assert de que com `useReduceMotion()=true` o
  componente nao arma loop (mockar o hook).
- **1 caso E2E** `tests/e2e/playwright/rbrand-loading.e2e.ts` — assert de
  comportamento (loading aparece durante operacao; com reduce-motion
  ligado, sem movimento) e nao so' presenca visual.
- **Screenshots** `docs/sprints/R-BRAND-2-ANIMACOES-screenshots-gauntlet/`.

---

## 5. Proof-of-work

### R-BRAND-1-LOGO (assets estaticos — NAO e' JS live)

- **Mudar icone/splash/adaptive-icon EXIGE REBUILD** do dev-client/APK para
  ver no device. Nao aparece via Metro live (sao recursos do binario nativo,
  resolvidos no prebuild/gradle). Declarar isto no PR: validacao do icone/
  splash e' **Nivel C device apos rebuild** (dev-client rebuildado, ver
  protocolo canonico no CLAUDE.md — backup do Vault antes via
  `adb-vault-pull.sh`).
- O `OuroborosLogo.tsx` in-app E' JS (Metro live) — validavel via Gauntlet
  sem rebuild.
- Validacao visual Nivel A+ Gauntlet para o logo in-app; Nivel C device
  para icone/splash (screencap do launcher + do splash no boot).

### R-BRAND-2-ANIMACOES (JS — Metro live)

- Animacao in-app e' JS: Metro entrega ao vivo, sem rebuild.
- **Caso E2E Gauntlet/playwright** para o loading in-app (COPIAR do template
  obrigatorio `tests/e2e/playwright/e2e-template.ts` (template canonico pos-scrub)): navegar a rota do
  sync/save, assert que o loader aparece. Para reduce-motion, usar
  **emulacao `prefers-reduced-motion` do playwright** (`page.emulateMedia({
  reducedMotion: 'reduce' })`) — MESMO mecanismo canonico do
  R-AUDIT-A11Y-MOVIMENTO §5.1 — NAO um setter `window.__gauntlet.
  reduzirMovimento` (esse setter nao esta entre as 23 APIs do `__gauntlet` e
  so' existe DENTRO da A11Y-MOVIMENTO). Assert que nao ha movimento (transform
  estavel entre 2 frames). Evitar sobreposicao com o E2E de reduce-motion ja
  previsto na propria A11Y-MOVIMENTO (este cobre os componentes de MARCA).
- Validacao visual Nivel A+ Gauntlet (sprint navegada e clicada como app
  real) antes de declarar [ok]. Checkpoint Nivel C so' para o C1 (haptic
  nativo no save).

---

## 6. Reduce-motion (obrigatorio) — R-BRAND-2-ANIMACOES

- **DEPENDE de R-AUDIT-A11Y-MOVIMENTO.** Todo componente de animacao novo
  consome `useReduceMotion()`. Sem isso, a animacao chamaria
  `AccessibilityInfo` direto e teria de ser refeita — exatamente o
  anti-padrao que a A11Y-MOVIMENTO existe para prevenir (ela e' o "lugar
  unico para perguntar posso animar?").
- **Comportamento com reduce-motion ON:** C2 onda para (anel estatico), C1
  sem cascata/flash (estado final direto), E2 ring parado. Fallback
  estatico OBRIGATORIO — o publico autista/ansioso e' o motivo.
- **Alinhamento com os 4 principios da marca:** o principio 01 (Respirar —
  "cobra parada respirando ja e' presenca; critico p/ reduce-motion") ja
  antecipa este requisito; a implementacao apenas o cumpre.
- O `OuroborosLoader` existente ja recebe o early-return de reduce-motion
  DENTRO do R-AUDIT-A11Y-MOVIMENTO (nao nesta sprint) — nao duplicar.

---

## 7. Anonimato (Regra -1)

- Assets shipados NAO carregam nome real nem metadata de autoria. A lente D
  confirmou: grep por andre/vitoria/farias/claude/anthropic/gpt/openai/
  gemini/autor/@/.com/copyright nos SVGs = 0 ocorrencias; sem <desc>, sem
  comentario de autoria. Unicos textos: aria-label + <title>s de camada
  anonimos + wordmark `PROTOCOLO OUROBOROS` (nome do PRODUTO, permitido).
- Ao rasterizar, garantir que ImageMagick/rsvg nao injete metadata de
  autor/host — usar `-strip` (ImageMagick) nos PNGs finais.
- README usa o nome do produto, nunca nome de pessoa/IA.

---

## 8. Checklist de docs

- **README** — bloco de marca (lockup + monomark). [R-BRAND-1-LOGO]
- **`docs/FEATURES-CANONICAS.md`** — registrar a feature de branding/splash/
  icone e (na R-BRAND-2) os loaders de marca (C1/C2/E2) como features de UI.
  Validador-sprint recusa sprint que introduz feature sem atualizar este
  arquivo no mesmo commit.
- **CHANGELOG** — na hora de cada merge.
- **`docs/sprints/ORDEM-EXECUCAO-V1.md`** — adicionar:
  - **R-BRAND-1-LOGO** na **Fase 1 ou 2** (assets estaticos, JS/UI;
    independe de A11Y-MOVIMENTO; exige rebuild para device). Pode ir cedo.
  - **R-BRAND-2-ANIMACOES** na **Fase 2**, **APOS R-AUDIT-A11Y-MOVIMENTO**
    (consome o hook). JS puro. **Se** algum conceito futuro exigir dep
    nativa (lottie/skia), revisar aquele item para Fase 3/4 (bump de infra
    com gate) — mas o escopo desta sprint e' JS puro, entao permanece Fase 2.
  - Registrar a dependencia-chave: "R-BRAND-2-ANIMACOES depois de
    R-AUDIT-A11Y-MOVIMENTO".
- **Backlog de conceitos adiados** (§3.6): A1/A2, B2, F1, D2/D3 — anotar em
  R-AUDIT-BACKLOG.md ou num R-BRAND-3 futuro.

---

## 9. Riscos e nao-objetivos

- **NAO integrar apenas G1** (diagrama ETL em ARCHITECTURE.md) nem o codigo
  de integracao Streamlit das telas 01-05. B1/C3/F2/D1 foram REAVALIADOS
  como app (§3.5, reavaliacao 2026-07-13) — porta-se o tratamento visual,
  descarta-se o cenario de site.
- **NAO adicionar dependencia nativa** (lottie-react-native, skia) se a
  animacao puder ser JS puro (Reanimated + rn-svg). Se alguma exigir,
  FLAGAR interacao com a Fase 3 (bump de infra + gate) e NAO mergear sem
  gate. Objetivo desta sprint: zero dep nativa nova.
- **Icone/splash exigem rebuild** — nao sao JS live; planejar checkpoint
  Nivel C no device apos rebuildar o dev-client (backup do Vault antes).
- **Divergencia glifo desktop vs SVG entregue** — o `OuroborosLogo.tsx`
  atual reproduz o glifo do desktop `ouroboros-redesign-v1`, que pode nao
  ser byte-igual ao `ouroboros.svg`. Risco de a marca in-app divergir do
  icone. Mitigar: escolher `ouroboros.svg` como fonte-de-verdade unica e
  alinhar o componente.
- **`Ouroboros documentado.svg` e' duplicata** — nao shipar.
- **Nao inflar escopo de animacao** (Regra 2): implementar o subconjunto
  C1/C2/E2 agora; A1/A2/B2/F1/D2/D3 ficam no backlog.
- **Cor de fundo** — CANONICO FIXADO: **`#14151a`** (o atual do app.json;
  minimo churn, ja consistente entre splash e adaptiveIcon). Usar IDENTICO em
  icon bg + splash bg + adaptiveIcon bg. resizeMode CANONICO: **`contain`**.

---

## 10. Ajustes do painel adversarial (incorporados nesta versao)

Revisao de 6 lentes reprovou a v1 para a fila; correcoes aplicadas:

- **[ALTO] Icone de notificacao (resolvido, §3.1 + §4):** `icon-foreground.png`
  era duplo-uso (adaptive + expo-notifications). Agora ha asset SEPARADO
  `assets/notification-icon.png` monocromatico e o plugin expo-notifications
  aponta pra ele. Sem isso, o icone de notificacao (feature core do app de
  saude mental) viraria blob branco ilegivel.
- **[MEDIO] Mecanismo de E2E reduce-motion (resolvido, §5):** usar
  `page.emulateMedia({ reducedMotion: 'reduce' })` do playwright (canonico da
  A11Y-MOVIMENTO), nao um setter `__gauntlet` inexistente. Copiar do
  `tests/e2e/playwright/e2e-template.ts` (template canonico pos-scrub).
- **[MEDIO] Gate de dependencia (registrado):** R-BRAND-2-ANIMACOES so' INICIA
  com `src/lib/hooks/useReduceMotion.ts` de fato MERGEADO na branch de trabalho
  (nao apenas em ancestral). Confirmar `ORDEM-EXECUCAO-V1.md` restaurado antes
  de editar o checklist de docs.
- **[BAIXO] Valores canonicos fixados (§4, §9):** backgroundColor `#14151a`,
  resizeMode `contain` — sem ramos indecididos.
- **[BAIXO] Contagem de consumidores do OuroborosLoader:** 14 consumidores
  efetivos (§2.2 lista ~14; numero exato = 14).

STATUS pos-ajuste: pronta para a fila (R-BRAND-1-LOGO Fase 1/2 independente;
R-BRAND-2-ANIMACOES Fase 2 apos R-AUDIT-A11Y-MOVIMENTO).
