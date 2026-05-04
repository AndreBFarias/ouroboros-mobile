# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased] — Refundação v1.0 (2026-05-02 em diante)

### Ciclo corretivo M24.1 + M25.2 (2026-05-03)

Pós-revalidação, fechados 2 dos 3 corretivos descobertos. M27.2
deferida para M27.3 — tentativas de fix em React 19 strict mode
causaram `Maximum update depth exceeded`; solução completa exige
refatoração via Suspense boundary, fora de escopo.

- **M24.1 — resume state** — `src/lib/hooks/useUltimaRota.ts`:
  hook ignora o primeiro pathname recebido após mount. Esse era o
  destino de boot (potencialmente o `/` default ou o restaurado pelo
  `SessaoBootGate`), não uma navegação do usuário. Sem essa guarda,
  o pathname inicial sobrescrevia `ultimaRota` antes do useEffect do
  gate ler o valor restaurado. Validação Gauntlet: `seed() +
  setUltimaRota('/memoria') + reload` agora abre app em `/memoria`.
- **M25.2 — animação SVG roda em web** —
  `src/components/brand/OuroborosLoader.tsx`: bloco
  `requestAnimationFrame` (web only via `Platform.OS === 'web'`)
  escreve `transform` direto no DOM. Cada `<AnimatedG>` recebe
  `data-anim-id` único (`useId()`) e o RAF localiza via
  `document.querySelector` + `setAttribute`. Em native, bloco é
  no-op e Reanimated mantém worklet. Timestamp absoluto `Date.now()`
  sobrevive a re-mounts. Validação: g3 (30s/volta) medido em
  ~15°/s; cabeça da cobra muda de posição entre prints.
- **M27.2 — deferida para M27.3.** Vide spec.

Métricas: 1126 testes / 130 suítes mantidos, tsc 0 erros, anonimato
OK, console gauntlet com 0 erros (1 warning React 19 `element.ref`
de dep transitiva ignorado).

### Validação consolidada via Gauntlet — M-REVALIDACAO-M20-M28 (2026-05-03)

Orquestrador rodou 11 casos E2E playwright MCP no Gauntlet,
validando 11 sprints concluídas (M20, M22, M23, M24, M25, M25.1,
M26, M27, M27.1, M28; M21 doc-only). Resultado:

- **PASS (5):** M22, M23, M25, M27, M28
- **FAIL (3):** M24, M25.1, M27.1 — viram corretivas separadas
- **INCONCLUSIVO (2):** M20 (widget Android), M26 (sheets) — exigem Nível B

Achados que viram sprints corretivas bloqueando M29:

- **M24.1** — `setUltimaRota('/memoria') + reload` abre app em `/`
  em vez de `/memoria`. Race entre hidratação assíncrona da
  `useSessao` e o `Redirect` do `SessaoBootGate`. Spec
  `docs/sprints/M24.1-spec.md`.
- **M25.2** — animação `OuroborosLoader` continua parada em web
  mesmo após fix M25.1. Reanimated/SVG web não atualiza atributo
  `transform` dinamicamente. Spec `docs/sprints/M25.2-spec.md`.
- **M27.2** (regressão de M27.1) — boot screen oscila: loader
  Ouroboros volta a sobrepor após conteúdo da rota carregar. Fix
  M27.1 só tratou fontes; gate de sessão re-liga. Spec
  `docs/sprints/M27.2-spec.md`.

Entregáveis:
- `docs/validacao-gauntlet-2026-05-03/RELATORIO.md` (relatório consolidado)
- `docs/validacao-gauntlet-2026-05-03/screenshots/M*/` (12+ screenshots)
- 10 arquivos E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`
- `STATE.md`, `ROADMAP.md` atualizados; M29 represada até corretivos fecharem

### Sprints corretivas fechadas (2026-05-03)

Bloco consolidado de fixes de bugs descobertos durante a validação
manual M22-M28 + execução paralela M25/M27/M28. Aplicados num único
ciclo após smoke verde (1126 testes / 130 suítes / 0 erros tsc).

- **M14.1 — eslint-disable órfão removido.**
  `src/lib/hooks/useFinancasCache.ts:40` tinha
  `// eslint-disable-next-line @typescript-eslint/no-require-imports`
  acima de um `require()` que não acionava mais o warning. ESLint
  reportava `unused-disable`. Linha removida; ESLint silencioso.

- **M25.1 — animação OuroborosLoader gira em torno do centro em web.**
  `react-native-svg-web` converte `<G rotation={N} originX={160}
  originY={160}>` para `<g transform="rotate(N)">` sem `cx`/`cy`,
  fazendo a rotação acontecer em torno de `(0,0)` (varredura para
  fora do `viewBox`). Fix: `useAnimatedProps` agora retorna string
  SVG nativa `transform="rotate(${valor} ${PIVOT} ${PIVOT})"` que
  funciona 1:1 em web (rn-svg-web não toca) e em nativo (rn-svg
  parseia). Teste novo confirma formato exato para os 3 grupos
  rotativos (gs1/gs2/gs3); gs-flow continua usando
  `strokeDashoffset`. +1 teste (1125 → 1126).

- **M27.1 caminhos A + C — boot screen lento e overlay sobreposto.**
  Dois fixes complementares aplicados no mesmo ciclo:
  - **Caminho C** em `src/lib/conquistas/loader.ts`: quando
    `vaultRoot` começa com `web://mock-vault/...`, o reader
    `FileSystem` não tem implementação web e a Promise nunca
    resolve, deixando `useConquistas` preso em `loading=true`
    indefinidamente (FiltrosBar e Calendário não estabilizavam em
    Nível A). Fix: early-return com `{ conquistas: [],
    totaisPorOrigem: { evento_positivo: 0, diario_vitoria: 0 } }`.
  - **Caminho A** em `app/_layout.tsx`: `useFonts` em SDK 54 web
    oscila `loaded=true/false` quando `document.fonts` re-emite
    eventos pós-hidratação, re-montando o early-return e fazendo
    o `OuroborosLoader` piscar sobre a Home. Fix: flag
    `fontesPersistentementeCarregadas` (`useRef`) que vira `true`
    no primeiro `loaded=true` e segura o early-return mesmo se
    `loaded` flicka depois. Re-mount real do app reentra pelo
    SplashScreen via Reanimated/Expo, separado.
  - Caminho D (fade transition) não foi necessário — caminhos A+C
    juntos resolvem ambos os sintomas (~10s de boot no reload
    Chrome + overlay residual). Web é dev-only; dados reais ficam
    em emulador/celular. Screenshot de validação do M25.1 em
    `docs/sprints/M25.1-screenshots/A-cobra-frame1.png`.

### Infraestrutura de validação implementada (2026-05-03)

- **M-GAUNTLET fechada** — orquestrador implementou sozinho, sem
  dispatch de agentes (pedido explícito do usuário).
  - `src/lib/dev/gauntlet.ts` (módulo central, ~200 L):
    - `GAUNTLET_ATIVO = Platform.OS === 'web' && __DEV__`. Substitui
      a abordagem original com `EXPO_PUBLIC_GAUNTLET=1` (env var não
      injetada em runtime browser sem `.env` file). `__DEV__` é
      injetado pelo react-native em build time, sempre disponível,
      `false` em release.
    - `window.__gauntlet` com 11 APIs: `seed(opts)`, `reset()`,
      `setNomes(a, b?)`, `setVaultRoot(root)`, `setOnboardingDone(d)`,
      `setUltimaRota(r)`, `abrir(rota)`, `abrirMenu()`,
      `fecharMenu()`, `abrirSheet(rota)`, `estado()`.
    - `setRouterRef`/`setPathnameRef` para o `_layout.tsx` injetar
      runtime do expo-router (router só existe em hooks).
    - Idempotente em hot-reload (Metro re-monta).
  - `src/lib/dev/seedDeterministico.ts` — helpers
    `seedSozinho`/`seedDuo`/`seedCustom`/`resetTotal` + stubs para
    versão 2 (humores, diários, eventos).
  - `src/lib/boot/biometriaGate.tsx` — prop `bypass?: boolean`
    pula auth e renderiza children direto. `app/_layout.tsx` passa
    `bypass={GAUNTLET_ATIVO}`.
  - `app/_layout.tsx` — `FrameMobileGauntlet` envolve toda UI em
    container 412×892dp centralizado com fundo cinza `#0a0a0e`
    fora do frame e Dracula `#14151a` dentro. **Aplica em TODAS as
    rotas em modo dev**, não só `/_dev/*` (atendendo pedido do
    usuário: "ajustar a tela também do gauntlet pra ser limitada
    horizontalmente igual um celular"). Em mobile nativo
    (Platform.OS !== 'web'), pass-through. Boot screen também
    envolto pelo frame.
  - `app/_dev/_layout.tsx` — Stack interno com banner amarelo
    "MODO GAUNTLET ATIVO" no topo. `Redirect` `/` em produção.
    Frame mobile movido para raiz (não duplicar).
  - `app/_dev/gauntlet.tsx` — dashboard com 5 botões coloridos
    (Seed verde, Reset vermelho, Seed casal verde, Abrir/Fechar
    menu purple), painel JSON do estado auto-refresh 500ms, lista
    de rotas em 4 seções (Ver/Registrar/Opcionais/Dev). Acentuação
    PT-BR completa nas strings de UI; `accessibilityLabel` SEM
    acento.
  - `tests/e2e/playwright/00-bootstrap.e2e.ts` — caso E2E que
    confirma `window.__gauntlet` exposto + `seed()` funcional. Não
    rodado por Jest (`testMatch` filtra `*.test.ts/tsx`); executado
    pelo orquestrador via playwright MCP.
  - `docs/templates/e2e-template.e2e.ts` — template canônico para
    sprints futuras adicionarem casos E2E.
  - `docs/GAUNTLET.md` — guia completo: como ativar, API
    `window.__gauntlet`, fluxo do orquestrador, limitações
    conhecidas.
  - 4 screenshots Nível A+ em `docs/sprints/M-GAUNTLET-screenshots/`:
    `A-dashboard-funcionando.png`, `A-dashboard-pos-seed.png`,
    `A-dashboard-frame-mobile.png`, `A-frame-mobile-aplicado.png`.
    `window.__gauntlet.seed()` confirmado retornando
    `{ onboardingDone: true, vaultRoot: 'web://mock-vault/Ouroboros',
    nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' }, ... }`.
  - **Garantia anti-vazamento confirmada**: `npx expo export
    --platform android` + `grep -rn __gauntlet` retorna vazio.
    Em release mobile, módulo é dead-code.
  - **Issue conhecido residual**: `useFonts` SDK 54 web demora
    30-45s em sessão fresh. M27.1 caminho A guard atenuou
    parcialmente. Aceito como dev-only — não afeta release mobile.
  - **Métricas**: 1126 testes / 130 suítes mantidas (não regrediu),
    bundle Hermes Android 8.75 MB.

### Decisões de infraestrutura (2026-05-03)

- **Gauntlet de validação visual — substitui Nível A puro como
  pipeline padrão.** Validação manual M22-M28 revelou 6 limitações
  estruturais do Chrome web puro (BiometriaGate redirect; useFonts
  SDK 54 oscilante; useConquistas travado em web; localStorage
  seed incompatível com zustand persist; MouseEvent sintético não
  dispara handlers RN-Web; `@gorhom/bottom-sheet` em web não
  monta). 2 sprints novas materializadas para resolver:
  - **M-GAUNTLET** (`docs/sprints/M-GAUNTLET-spec.md`, 6-8h,
    crítica) — interface dev `/_dev/gauntlet` com
    `window.__gauntlet` API JS determinística, bypass de gates
    em `EXPO_PUBLIC_GAUNTLET=1`, frame mobile 412dp em `/_dev/*`,
    8 E2E novos em `tests/e2e/playwright/`,
    `docs/GAUNTLET.md` documentação. Substitui pipeline
    3-tentativas.
  - **M-REVALIDACAO-M20-M28**
    (`docs/sprints/M-REVALIDACAO-M20-M28-spec.md`, 4-6h, alta) —
    re-valida 11 sprints concluídas via Gauntlet com 1 E2E por
    sprint. Bugs descobertos viram corretivas separadas. Bloqueia
    M29 em diante até zerar FAIL.
  Toda sprint nova que toca UI a partir de 2026-05-04 deve
  incluir 1 E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`.
  Documentação atualizada: `CLAUDE.md` (Regra de Validação
  Visual ganha 4 níveis A/A+/B/C), `HOW_TO_RESUME.md` (política
  de validação), `VALIDATOR_BRIEF.md` §1.9 (Nível A+ Gauntlet
  detalhado), `STATE.md` + `ROADMAP.md` (sprints novas
  destacadas como infraestrutura), `docs/PROMPT-CONTINUACAO-OPUS.md`
  (próxima sessão começa por M-GAUNTLET).

### Decisões de produto

- **2026-05-03 — Histórico preservado, nunca apagado por padrão.**
  Decisão do usuário: ao marcar tarefa como feita, o app **não
  remove mais** o registro — move para uma seção "Concluídas" abaixo
  das pendentes. Recap (M36) puxa essas tarefas concluídas no período
  como parte de "Conquistas" + seção dedicada "Tarefas concluídas"
  + card "Tarefas concluídas" em "Números". Long-press em concluída
  abre menu "Reabrir" (volta para pendentes) ou "Apagar definitivo"
  (com confirm). Justificativa: app é espelho do que aconteceu;
  Recap em momento difícil mostra tudo que foi feito, não só o que
  falta. Patches aplicados em:
  - `docs/sprints/M31-spec.md` — UI com 2 seções (Pendentes /
    Concluídas collapsable se >5 itens), `<SecaoConcluidas>`
    componente novo, `reabrirTarefa()` helper em
    `src/lib/vault/tarefas.ts`, opacidade 60% + line-through em
    item concluído, long-press menu com 2 ações novas.
  - `docs/sprints/M36-spec.md` — passa de 4 para 5 seções:
    adiciona `<RecapSecaoTarefas>` (lista agrupada por categoria
    com subtotais). `RecapData.numeros.tarefas_concluidas` novo.
    `useRecap` consome `listarTarefas` filtrado por
    `feito === true && feito_em in [de, ate]`. `RecapSecaoNumeros`
    vira grid 2×3 com card "Tarefas concluídas".
  - `VALIDATOR_BRIEF.md` §1.8 — regra transversal aplicável a M17
    (tarefa), M18 (contador, decidido por M32 quando reset) e M11
    (marco, naturalmente persistente).

### Adicionado

- **M28 (2026-05-03)** — Varredura de identidade: nomes reais em
  todas as UIs (substitui literais "Pessoa A"/"Pessoa B"/"Ambos").
  - `src/lib/stores/pessoa.ts` ganha hook reativo
    `useNomeDe(pessoa)`. `nomeDe()` síncrono mantido para usos
    fora de componentes (logging, sort).
  - `src/config/pessoas.config.ts` e `pessoas.config.example.ts`:
    `PESSOAS_CONFIG.ambos.nome` muda de `'Ambos'` para `'Casal'`
    — termo afetuoso e claro, "Ambos" era ambíguo em outros
    contextos.
  - `src/components/screens/MiniHumorScreen.tsx`: chips
    `CHIP_OPTIONS_COMPARTILHADO` e `CHIP_OPTIONS_PRIVADO` viram
    `useMemo` + `useNomeDe`. Literal `'Sobreposto'` preservado
    (rótulo de modo de visualização compartilhada, não pessoa).
  - `src/components/calendario/FiltrosBar.tsx`: chips de filtro
    pessoa via `useMemo` + `useNomeDe`. Inclui "Casal" para
    `'ambos'`.
  - `app/settings/editar-pessoa.tsx`: títulos `"Pessoa A"`/`"Pessoa B"`
    agora dinâmicos via `useNomeDe('pessoa_a')` / `'pessoa_b'`.
  - `src/components/screens/ScannerPreview.tsx`: constante
    estática `PESSOAS` substituída por `useMemo` + `useNomeDe`.
  - `src/components/screens/ShareReceiver.tsx`: fallbacks
    `?? 'Pessoa A'` substituídos por `?? nomeDe('pessoa_a')`
    (versão síncrona, fora de componentes reativos).
  - `src/components/data/HumorHeatmapStats.tsx`: constante
    `NOMES_CURTOS` removida; rótulos sobreposto vêm de
    `useNomeDe`.
  - `tests/lib/stores/pessoa.test.ts` novo (7 testes): cobre
    `nomeDe('ambos') → 'Casal'`, defaults `Nome_A`/`Nome_B`,
    reatividade do hook quando `usePessoa.setNomes()` muda.
  - `tests/config/pessoas.config.test.ts`: assert atualizado
    para `'Casal'`.
  - 2 screenshots Nível A em `docs/sprints/M28-screenshots/`:
    `A-humor-chips-nomes-reais.png` (chips Nome_A/Nome_B/Sobreposto
    com defaults genéricos respeitando Regra −1),
    `A-settings-radio-nomes.png` (títulos uppercase NOME_A/NOME_B
    via `useNomeDe`).
  - **Achado colateral M28-COLAT-01** (não fixado inline,
    proposto como sprint dedicada): rota `/calendario` não
    estabiliza paint em web Nível A. `useConquistas` chama
    `lerConquistas(vaultRoot)` que em web com `vaultRoot` mock
    fica preso em `loading=true`. Combinado com aparente
    oscilação `loaded` em `useFonts`, `OuroborosLoader` retorna
    ao paint mesmo após app montar árvore. Validação visual de
    `FiltrosBar` reservada para Nível B (emulador).
  - Varredura final: `grep -rn "'Pessoa A'\|'Pessoa B'"
    app/ src/ | grep -v accessibilityLabel | grep -v test`
    retorna vazio. Único hit residual é `'Sobreposto'` em
    `MiniHumorScreen.tsx:85` (intencional, label de modo).
  - **Métricas**: 1118 → 1125 testes (+7), 129 → 130 suites (+1),
    bundle Hermes 8.75 MB.

- **M27 (2026-05-03)** — Refundação estrutural de navegação:
  MenuLateral substitui bottom tabs e FABRadial.
  - **Movimentação estrutural** (33 arquivos `git mv`): todo o group
    `app/(tabs)/` migrou para a raiz de `app/`. Subgrupos
    (`settings/`, `exercicios/`, `medidas/`, `alarmes/`,
    `contadores/`, `ciclo/`) movidos com seus `_layout.tsx` internos
    intactos. `app/(tabs)/_layout.tsx` apagado.
  - `src/components/chrome/MenuLateral.tsx` novo: drawer custom
    com `<MotiView>` (springs.default, translateX -300→0), backdrop
    `<Pressable bg-black-50%>` tap-close, `<ScrollView>` interno.
    Header com avatar pessoa ativa + chip alternar pessoa em duo.
    3 seções (Ver/Registrar/Opcionais) com header micro-orange.
    Rodapé fixo com link Configurações. 6 itens em Ver, 6 em
    Registrar (cores diferenciadas: pink/cyan/orange/green/yellow/red),
    até 4 em Opcionais (controlado por `featureToggles`).
  - `src/components/chrome/FABMenu.tsx` novo: FAB redondo 72dp
    purple `position: absolute, left: spacing.lg, bottom: spacing.xl`,
    ícone `Menu` lucide. `onPress` aciona `useNavegacao.abrir()`.
  - `src/lib/stores/navegacao.ts` novo: store zustand leve
    (não-persistido) com `menuAberto`/`abrir`/`fechar`/`alternar`.
  - `src/lib/navigation/rotasSemFAB.ts` novo: lista canônica
    `ROTAS_SEM_FAB` + função `rotaEsconderFAB(pathname)`. Cobre
    `/onboarding`, `/share-receive`, 4 modais de captura, `/recap`
    (M36 cria a rota; FAB já some). `/calendario` mantém FAB
    (tela de view, não modal).
  - `app/_layout.tsx` ganha overlays globais
    `<MenuLateral />` + `<FABMenu />` fora da `<Stack>`, com
    z-index declarado (FABMenu 10, MenuLateral 20) conforme
    CONTRACT §7.10. A18 preservada em todas as 4 rotas modais
    (`presentation: 'transparentModal'` + `contentStyle.backgroundColor:
    '#14151a'`).
  - **Migração crítica do `useSessao.ultimaRota`**:
    `src/lib/stores/sessao.ts` ganha `version: 2` no zustand persist
    + função `migrate(state, version)` que normaliza
    `/(tabs)/X` → `/X` para qualquer boot pré-M27. Sem isso,
    usuários antigos com `ultimaRota` persistida em SecureStore
    crashariam em runtime ao tentar `router.replace` para rota
    inexistente.
  - `app/_components.tsx:90` fixado de `router.replace('/(tabs)')`
    para `router.replace('/')`. Storybook ganha seção "Menu lateral
    (M27)" com botão programático para abrir o drawer (suporte a
    captura visual em web headless).
  - `app/index.tsx`: removido `<FABRadial>` + import órfão.
    `FABRadial.tsx` em `src/components/ui/` preservado mas órfão
    (pode ser removido em sprint futura).
  - `src/lib/navigation/captureRoutes.ts`: paths sem `(tabs)`.
  - Apaga: `src/components/chrome/BottomTabs.tsx` e
    `tests/components/chrome/BottomTabs.test.tsx` (6 testes).
  - Cria: `tests/components/chrome/MenuLateral.test.tsx` (6 testes —
    3 seções renderizadas, items condicionais via `featureToggles`)
    + `tests/components/chrome/FABMenu.test.tsx` (3 testes — render
    à esquerda, abre menu ao tocar).
  - Atualiza paths sem mudar contagem em
    `tests/lib/navigation/captureRoutes.test.ts`,
    `tests/lib/hooks/useUltimaRota.test.tsx`,
    `tests/lib/stores/sessao.test.ts`,
    `tests/app/memoria.test.tsx`,
    `tests/app/settings/index.test.tsx`.
  - 5 screenshots Nível A em `docs/sprints/M27-screenshots/`:
    `A-fab-esquerda.png`, `A-menu-aberto.png`, `A-secao-ver.png`,
    `A-secao-registrar.png`, `A-secao-opcionais.png`. Capturados
    via Playwright headed Chromium na rota `/_components`
    (storybook M01) + dispatch programático para contornar limite
    de Moti em web sem Reanimated nativo.
  - Hits residuais de `(tabs)`: 11/14 (varia conforme grep), todos
    em comentários históricos ou no literal de migração de
    `sessao.ts:235-246`. Nenhum em router/import/registro ativo.
  - **Métricas**: 1115 → 1118 testes (−6 BottomTabs.test + 9 novos),
    128 → 129 suites, bundle Hermes 8.75 MB.
  - **Checkpoint intermediário** §10.6: 127 suites / 1109 testes /
    0 fail após apagar BottomTabs e antes de criar MenuLateral.
  - Veredito validador-sprint: APROVADO (sem ressalvas).

- **M26 (2026-05-03)** — 4 rotas modais com `<Screen>` opaco +
  `index={0}` direto (resolve A17/A18 "tela infinita preta").
  - `app/humor-rapido.tsx`, `app/diario-emocional.tsx`,
    `app/eventos.tsx` envolvem `<BottomSheet>` em
    `<Screen padded={false}>`. `<OuroborosLoader compacto />` atrás
    do sheet em `<View pointerEvents="none">` centralizado — feedback
    visual de marca mesmo se Reanimated falhar. Sheet abre em
    `index={0}` direto (não `-1` + `useEffect expand()`); pan-down-to-close
    fecha via `onChange={(idx) => idx === -1 && router.back()}`.
  - `app/scanner.tsx` ganha `<OuroborosLoader compacto />` em
    `position: 'absolute'` atrás do `<ScannerSheet>` (já tinha
    `<Screen>` no nível externo).
  - `app/_layout.tsx` registra 4 `<Stack.Screen>` com
    `presentation: 'transparentModal'`,
    `contentStyle.backgroundColor: '#14151a'`,
    `animation: 'fade_from_bottom'`. Garante que o root Stack
    fundo (#282a36) não vaze.
  - `VALIDATOR_BRIEF.md` Armadilha A18 auditada — texto preservado,
    referência ajustada para "Solução padrão M26 (aplicado
    2026-05-03)". `INTEGRATION-CONTRACT.md` §7.10 não criou
    `rotasSemFAB.ts` (nasce em M27).
  - `jest.setup.cjs` mock BottomSheet expõe `index` via
    `accessibilityHint` para os novos asserts.
  - `tests/app/humor-rapido.test.tsx`, `tests/app/diario-emocional.test.tsx`,
    `tests/app/eventos.test.tsx` ganham 1 caso M26 cada — render
    contém `<Screen>` E `<BottomSheet>`. Suítes pré-existentes
    ampliadas; spec §10 foi corrigida pela honestidade do executor
    (não criar suítes duplicadas).
  - 4 screenshots Nível A em `docs/sprints/M26-screenshots/`:
    `A-humor-sheet-opaco.png`, `A-diario-sheet-opaco.png`,
    `A-eventos-sheet-opaco.png`, `A-scanner-sheet-opaco.png`.
    Limitação reconhecida: 3 mostram frame de onboarding
    (BiometriaGate redireciona em web); scanner prova fundo Dracula
    opaco + OuroborosLoader visível. Validação completa do sheet
    aberto exige Nível B (emulador Android).
  - **Métricas**: 1112 → 1115 testes (+3), 128 suites mantidas,
    bundle Hermes 8.75 MB.
  - Veredito validador-sprint: APROVADO (sem ressalvas).
  - Achado colateral arquivado: planejador-sprint deve checar
    existência de arquivos de teste antes de declarar "+N suites"
    em §10. Melhoria do agente meta — não bloqueia M27.

- **M25 (2026-05-03)** — OuroborosLogo + OuroborosLoader (SVG nativo
  animado).
  - `src/components/brand/OuroborosLogo.tsx` novo (204 L): versão
    estática do glifo. Replica fielmente o SVG de
    `versão desktop/ouroboros-redesign-v1/index.html` linhas 110-194
    em react-native-svg — viewBox 320x320, `<LinearGradient id="og1">`
    purple→pink, `<RadialGradient id="og-glow">` purple 22%→0%, 4
    grupos (ambient glow, outer dotted orbit, inner flow ring, main
    snake com 4 arcos), cabeça com mandíbulas, olho, língua bífida,
    wordmark "OUROBOROS"/"PROTOCOLO" via `<Text fontFamily="monospace">`
    (fallback explícito porque JetBrains Mono ainda não carregou na
    boot screen — spec §10.3). Props `tamanho` (default 320) e
    `mostrarTexto` (default true).
  - `src/components/brand/OuroborosLoader.tsx` novo (287 L): versão
    animada com 4 shared values Reanimated 4 — gs1 (snake principal)
    90s linear, gs2 (orbit dotted) 60s reverso, gs3 (inner flow ring)
    30s linear, flow (stroke-dashoffset) 6s linear. Aplica
    `useAnimatedProps` com `rotation`/`originX:160`/`originY:160`
    (bug conhecido do `<G>` SVG não aceita `transform: [{ rotate }]`
    via shared value — spec §10 patch 3). Cleanup com
    `cancelAnimation` em todas 4 shared values. Props `tamanho`
    (default 320) e `compacto` (default false → 96px sem texto).
  - `src/components/brand/index.ts` novo: barrel.
  - `tests/components/brand/OuroborosLogo.test.tsx` (3 testes):
    snapshot estático, prop `mostrarTexto={false}` esconde wordmark,
    prop `tamanho` ajusta SVG width/height.
  - `tests/components/brand/OuroborosLoader.test.tsx` (6 testes):
    render base, valor inicial das 4 shared values, cleanup
    `cancelAnimation` no unmount.
  - `app/_layout.tsx` substitui `if (!loaded) return null` por
    `<View bg-page><OuroborosLoader /></View>` (boot screen UI
    bloqueante, não BOOT_HOOK — CONTRACT §7.9). Loader fica dentro
    do early return enquanto fontes carregam (~500ms-1s).
  - `app/onboarding.tsx` Frame 2 "Tudo pronto" troca placeholder
    `<ActivityIndicator>` por `<OuroborosLoader compacto />`.
  - `jest.setup.cjs` ampliado: stubs `RadialGradient` e `Ellipse`
    para o mock `react-native-svg` (CONTRACT §7.8 + spec §10.1) +
    mock `react-native-worklets` ganha `createSerializable`,
    `executeOnUIRuntimeSync`, `RuntimeKind`,
    `serializableMappingCache`, `WorkletsModule`, `makeShareable`,
    `isWorkletFunction`, `callMicrotasks` como no-ops. Necessário
    porque `OuroborosLoader` é o primeiro arquivo em `src/` a
    importar `react-native-reanimated` direto (M01-M24 só usavam
    via `moti`, completamente mockado). **Armadilha A22 nova** —
    registrada no `VALIDATOR_BRIEF.md` §6.
  - 3 screenshots Nível A capturados via Playwright + system Chrome
    `executablePath` em `docs/sprints/M25-screenshots/`:
    `A-loader-boot.png`, `A-loader-compacto.png`, `A-logo-estatico.png`.
  - **Métricas**: 1103 → 1112 testes (+9), 126 → 128 suites (+2),
    bundle Hermes 8.74 MB.
  - Veredito validador-sprint: APROVADO_COM_RESSALVAS — todas
    ressalvas eram docs vivos (STATE/ROADMAP/CHANGELOG/BRIEF
    desatualizados), aplicadas inline pelo orquestrador antes do
    commit.

- **M24 (2026-05-03)** — Resume state e auto-save de rascunhos.
  - `src/lib/stores/sessao.ts` novo: store zustand persist com
    `ultimaRota`, `rascunhos` (7 chaves: humorRapido, diarioEmocional,
    eventos, cicloRegistrar, alarmesNovo, contadoresNovo, tarefasNova),
    `permissoesPedidas` (4 chaves: storage, notif, camera, mic),
    `atualizadoEm`. Persist key `ouroboros.sessao.v1` via
    `secureStorage` adapter.
  - `src/lib/hooks/useAutoSaveRascunho.ts` novo: hook genérico
    debounced 500ms com cleanup correto.
  - `src/lib/hooks/useUltimaRota.ts` novo: tracking via
    `usePathname()` + função pura `isRotaRestauravel(path)` que
    exclui rotas modais (`/onboarding`, `/share-receive`,
    `/humor-rapido`, `/diario-emocional`, `/eventos`, `/scanner`,
    `/_components`).
  - `app/_layout.tsx` ganha `<SessaoBootGate />` via `useEffect`
    direto (não BOOT_HOOKS — vide CONTRACT §7.9): espera as 3
    stores hidratarem (`useOnboarding`, `useVault`, `useSessao`),
    valida `done && vaultRoot && rota não-modal`, faz
    `router.replace(ultimaRota)` uma única vez por mount via
    lock `restauradoRef`.
  - **A20 implementada** (BRIEF §4): cap 2000 chars por textarea
    livre (texto, frase, estrategia, lugar, titulo, medicacao)
    truncado silenciosamente em `salvarRascunho`; canário em
    `__DEV__` log warning se snapshot serializado > 1500B (margem
    para o teto prático de ~2KB do EncryptedSharedPreferences
    Android).
  - 7 formulários plugados com hidratação de rascunho (lazy
    `useState`) + auto-save (`useAutoSaveRascunho`) + limpar
    pós-save:
    - `app/humor-rapido.tsx`
    - `app/diario-emocional.tsx` (filtro `'ambos'` ao restaurar
      `com[]` — UI usa `PessoaAutor[]` enquanto Meta aceita
      `PessoaIdSchema`)
    - `app/eventos.tsx` (idem + `EventoParcial.texto?` opcional
      para preservar texto livre que vive no body do `.md`)
    - `app/(tabs)/ciclo/registrar.tsx`
    - `app/(tabs)/alarmes/novo.tsx` (discrimina criar vs editar:
      em editar, rascunho ignorado — fonte é alarme persistido)
    - `app/(tabs)/contadores/novo.tsx`
    - `src/components/todo/SheetNovaTarefa.tsx` (guard de modo:
      rascunho hidrata só em criar quando `tituloInicial === ''`)
  - 32 testes novos (3 suítes): 22 em `sessao.test.ts` (incluindo
    cap+canário), 5 em `useAutoSaveRascunho.test.tsx` (debounce,
    cleanup), 5 em `useUltimaRota.test.tsx` (função pura).
  - **Métricas**: 1080 → 1103 testes (+23), 123 → 126 suites (+3),
    bundle Hermes 8.73 MB.
  - Veredito do orquestrador (validador-sprint atingiu rate limit;
    validação manual via inspeção do diff): APROVADO. A20 e §7.9
    implementadas exemplarmente. Pendência R1: 2 screenshots
    Nível B/C exigem boot real do app (`A-rascunho-restaurado.png`,
    `A-rota-restaurada.png`).

- **M23 (2026-05-02)** — Onboarding 3 frames sem SAF/Sync.
  - `app/onboarding.tsx` reduzido de 5 frames (621L) para 3 frames
    (466L, -25%): boas-vindas+nome → companhia+nome parceiro →
    "Tudo pronto" + botão "Começar".
  - Botão "Começar" chama `inicializarVaultCanonico()` (M22) e
    distingue 3 caminhos do retorno: `auto` (silencioso), `saf-fallback`
    (toast warning amarelo "Pasta criada em local alternativo." sem
    bloquear), exceção (toast erro vermelho "Não foi possível criar
    a pasta. Tente novamente.").
  - `useOnboarding` shape v2: removido `syncMethod`/`SyncMethod`/`setSync`,
    bump persist key `ouroboros.onboarding.v1` → `v2` (usuários v1
    refazem onboarding — aceitável na refundação).
  - Indicador de progresso `[0,1,2,3,4].map` → `[0,1,2].map` (3 segmentos).
  - Removidos imports legados `useVault`, `requestVaultPermission`,
    `Folder`, `SyncMethod`, componentes `<Frame2Vault>` e `<Frame3Sync>`.
  - Toasts pré-existentes corrigidos com acentuação PT-BR completa
    (Regra BRIEF §1.4): "Escolha uma das opções.", "Vocês são casal
    ou amigos?".
  - 9 testes novos em `tests/app/onboarding.test.tsx` cobrindo 3
    frames + caminho saf-fallback + caminho erro.
  - 3 screenshots Nível A capturados via Playwright headless em
    viewport mobile 412×915 @2x:
    `docs/sprints/M23-screenshots/A-frame{0,1,2}-*.png`.
  - **Métricas**: 1071 → 1080 testes (+9), 122 → 123 suites (+1),
    bundle Hermes 8.71 MB.
  - Veredito `validador-sprint`: APROVADO_COM_RESSALVAS. 14/14 checks
    universais OK ou n/a. 4 ressalvas (3 toasts sem acento + TODO
    enganoso em `permissions.ts`) fixadas inline antes do commit.

- **M22 (2026-05-02)** — Vault canônico auto-criado em
  `/sdcard/Documents/Ouroboros/` sem prompt SAF interativo.
  - `src/lib/vault/permissions.ts` ganha `inicializarVaultCanonico()`,
    `garantirSubpastas()`, `pedirPermissaoStorage()`,
    `probeVaultWritable()` e constante `SUBPASTAS_CANONICAS` com 19
    paths leaf (9 raiz + 3 inbox + 6 media + 1 cache).
  - **A19 implementada (BRIEF §4)**: probe write+read+delete num
    arquivo `.ouroboros-probe` antes de marcar vault como válido. Se
    probe falhar (MIUI/Xiaomi/OneUI restritivo), fallback automático
    para `requestVaultPermission()` SAF legacy. Modo retornado:
    `'auto' | 'saf-fallback' | 'web'`.
  - `src/lib/vault/paths.ts` ganha 6 helpers `mediaXxxPath` e 6
    entries em `VAULT_FOLDERS`.
  - `app.json` adiciona 3 permissões Android: `WRITE_EXTERNAL_STORAGE`,
    `READ_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`.
  - `app/_layout.tsx` ganha `<VaultBootGate />` via `useEffect`
    direto (NÃO `BOOT_HOOKS`, vide CONTRACT §7.9 — falha precisa
    propagar à UI via toast).
  - `jest.setup.cjs` ganha mocks dual CJS+ESM para
    `PermissionsAndroid` e `expo-intent-launcher` (vide CONTRACT
    §7.8).
  - Nova dep direta `expo-intent-launcher@~13.0.8`.
  - 14 testes novos em `tests/lib/vault/permissions-init.test.ts`
    cobrindo Android <30, ≥30, web no-op, idempotência, probe
    sucesso/falha, fallback SAF cancelado, contagem 19 subpastas.
  - **Métricas**: 1057 → 1071 testes (+14), 121 → 122 suites,
    bundle Hermes Android 8.72 MB.
  - **Pendência R1**: screenshot Nível B/C
    (`docs/sprints/M22-screenshots/A-permissao-pedida.png`) capturar
    quando emulador `ouroboros-test` ou Redmi Note 13 do usuário
    estiverem disponíveis (sprint sem UI direta — só infra de boot).
  - Veredito `validador-sprint`: APROVADO_COM_RESSALVAS. 14/14
    checks universais passaram (ou n/a). Ressalvas eram cosméticas
    (contagem "18+/12+/17 leaves" desatualizada vs real 19) —
    fixadas inline antes do commit.

A `v1.0.0-rc1` foi retirada do GitHub Releases por bugs críticos
descobertos no uso real (vault inacessível, captura "tela infinita
preta", FAB radial sem callbacks ligados, alarmes mudos, identidade
hardcoded "Pessoa A/B"). 21 sprints (M21–M41) refazem a v1.0
mantendo a numeração — não há v1.1. APK fica salvo localmente em
`builds/` para histórico; tag git `v1.0.0` é recriada no fim da
refundação apontando para o commit final.

### Pendentes (M21–M41)

| Sprint | Título | Estimativa |
|---|---|---|
| M21 | Despublicar release v1.0.0 do GitHub Releases | 0,3h |
| M22 | Vault canônico auto-criado em /sdcard/Documents/Ouroboros | 5–6h |
| M23 | Onboarding 3 frames (remove SAF e Sync) | 3–4h |
| M24 | Resume state e auto-save de rascunhos | 5–6h |
| M25 | Componentes OuroborosLogo + OuroborosLoader (SVG nativo) | 4–5h |
| M26 | Refatorar 4 rotas modais (Screen opaco + index=0) | 3h |
| M27 | MenuLateral substitui (tabs) + FABMenu purple esquerda | 6–7h |
| M28 | Nomes reais via rotuloPessoa/useRotuloPessoa | 3–4h |
| M29 | Settings v2: vibração simples + features default ON | 4h |
| M30 | AlarmeSchema v2 + channel com vibrationPattern | 5–6h |
| M31 | TarefaSchema v2 + categoria + pessoa_destino + alarme | 5–6h |
| M32 | Contador v2: mensagens de apoio + marcos discretos | 2–3h |
| M33 | Campo `para` em diário/evento/contador/marco | 3–4h |
| M34 | MenuCapturaVerde nas tabs Memórias (foto/música/vídeo/frase) | 6–7h |
| M35 | Aba Finanças: empty state "Em desenvolvimento" | 1–2h |
| M36 | Tela Recap: agregação Conquistas/Crises/Evoluções/Números | 6–8h |
| M37 | Integração Google Calendar via OAuth (R+W) | 10–12h |
| M38 | Conflict resolution para 4 nós Syncthing via deviceId | 4–5h |
| M39 | Estrutura canônica de mídia + .md companion (ADR-0017) | 4–5h |
| M40 | Tela 01 Hoje v2: Recap + status do casal + próximos | 4–5h |
| M41 | APK Release v1.0.0 final + GitHub Release público | 3–4h |

### Documentação criada nesta materialização

- 21 specs autocontidas em `docs/sprints/M21-spec.md` a
  `docs/sprints/M41-spec.md`, cada uma seguindo o template de 9 seções
  + INTEGRATION-CONTRACT (§3.5 Integração + §9 Decisões tomadas +
  Definição de Pronto). Permite que um Claude novo, sem contexto da
  conversa de planejamento, execute cada sprint isoladamente lendo
  apenas `STATE.md` + a spec.
- ADR-0016 (`docs/ADRs/0016-vault-auto-criado-sem-saf.md`) — estende
  ADR-0014; vault Android auto-criado em `/sdcard/Documents/Ouroboros/`
  sem prompt SAF; usa `MANAGE_EXTERNAL_STORAGE` em Android ≥ 11
  (aceitável fora da Play Store).
- ADR-0017 (`docs/ADRs/0017-midia-companion-md.md`) — formaliza
  estrutura de mídia: cada binário em `media/<categoria>/<basename>.<ext>`
  ganha `.md` companion no mesmo diretório com mesmo basename, com
  frontmatter `tipo`/`arquivo`/`data`/`autor`/`transcricao`/`legenda`/
  `para`/`origem`. Compatível com Obsidian + Desktop ETL Python.
- `STATE.md`, `ROADMAP.md`, `README.md` atualizados com header de
  refundação em curso e tabela das 21 sprints.

### Próximo passo concreto

M21 fechado (commit `228b51e` + materialização anterior). Próxima:
**M22** (vault canônico auto-criado em
`/sdcard/Documents/Ouroboros/` com probe write+read+delete e
fallback SAF se OEM bloquear).

### Patches em massa pós-teste de auto-implementação (commits após `228b51e`)

3 agentes independentes leram specs M22, M27 e M37 sem contexto da
conversa de planejamento e produziram planos de implementação. As
ressalvas identificadas viraram patches cobrindo todas as 21 sprints
via docs centralizados:

- **`VALIDATOR_BRIEF.md` §4**: Armadilhas A19 (scoped storage
  Android 11+ + OEM agressivo — exige probe write+read+delete +
  fallback SAF), A20 (SecureStore Android limite ~2KB por valor),
  A21 (OAuth scheme custom precisa split clientId Expo Go proxy
  vs dev-client/release).
- **`docs/sprints/INTEGRATION-CONTRACT.md` §7**: padrões §7.8
  (mocks Jest canônicos para `PermissionsAndroid`,
  `expo-intent-launcher`, `expo-notifications`, `expo-auth-session`,
  `expo-web-browser`), §7.9 (critério `BOOT_HOOKS` vs `useEffect`
  direto), §7.10 (overlay z-index global + lista canônica de rotas
  sem FAB).
- **M37 splitado**: `M37-spec.md` removido. Substituído por
  `M37.1-spec.md` (leitura, escopo `calendar.events.readonly`,
  6-7h) e `M37.2-spec.md` (escrita, escopo `calendar.events`,
  4-5h, exige reconsentimento).
- **ADR-0018**: OAuth Google split clientId + cache em arquivo
  + escopo mínimo + sem servidor próprio. Estende ADR-0007.
- **M22 patcheada**: §4 absorve A19; §5 substitui
  `Environment.isExternalStorageManager` (não-existente em RN/Expo)
  por probe write+read+delete; §5 declara `useEffect` direto
  (não `BOOT_HOOKS`) por A19; §6 ganha comandos
  `dumpsys package | grep MANAGE` e validação probe; §9 expande
  decisões explicitando modo de retorno (`auto | saf-fallback | web`).
- **M24 patcheada**: §4 cap de 2000 chars por textarea no rascunho
  + canário > 1500 bytes (A20); §9 plano-B split de chaves se
  estourar.
- **M27 patcheada**: §2 corrige fato (`app/index.tsx` não existe
  hoje); §2 documenta que subgrupos carregam `_layout.tsx` interno
  no `git mv`; §2 cria `src/lib/navigation/rotasSemFAB.ts`
  canônico; §4 declara z-index e A18-preservada; §5 lista 6 itens
  completos da seção "Registrar"; §5 grep exaustivo de `(tabs)`.
- **M30 patcheada**: §4 obriga novo channel ID
  `ouroboros-default-v2` (Android não permite editar canais
  existentes); §4 hook crítico via `useEffect` direto (não
  `BOOT_HOOKS`); §9 mock `expo-notifications`.
- **M38 patcheada**: §4 detecta reinstall sem backup
  (`substituido_por`); §4 confirma deviceId < 32 bytes cabe em
  SecureStore.

## [1.0.0-rc1] — 2026-05-02 (não lançado, retirado do GitHub Releases)

> Tag git `v1.0.0` permanece como marco histórico do bundle dessa
> versão; release público foi despublicado em M21. APK salvo em
> `builds/ouroboros-1.0.0.apk` para histórico.

### Added
- **M19 — APK Release Hardening v1.0.0.** Versão final do MVP.
  - `app.json`: `version: 1.0.0`, `runtimeVersion: 1.0.0`,
    `android.versionCode: 1`. Adaptive icon e splash apontam para
    novos PNGs polidos.
  - `eas.json` production: `gradleCommand: :app:bundleRelease`,
    `autoIncrement: versionCode`, `env.NODE_ENV: production`.
  - Assets gráficos: `assets/icon.png` (1024×1024 com fundo
    Dracula bg-page #14151a + anel Ouroboros purple→cyan + ponto
    da cabeça da serpente), `assets/icon-foreground.png` (foreground
    do adaptive icon Android, transparent), `assets/splash.png`
    (2400×2400 com ícone centralizado).
  - 5 fluxos Maestro em `tests/e2e/`: `onboarding-completo.yaml`,
    `flow1-pix.yaml`, `flow2-trigger.yaml`, `flow3-evento.yaml`,
    `flow4-scanner.yaml` (cobrem onboarding + 4 críticos do
    BRIEFING §5).
  - `scripts/release-apk.sh` — pipeline completo: anonimato +
    typecheck + tests + smoke + expo export (limite Hermes
    12 MB) + EAS build production + polling até FINISHED +
    download do .aab.
  - `docs/RELEASE.md` — processo canônico de release (pre-reqs,
    pipeline, validação manual ponta-a-ponta, rollback, limites
    hard, semver).
  - `credentials/README.md` — instruções de geração de keystore
    via `eas credentials`. `.gitignore` exclui `keystore.jks`
    e `keystore.json`.
  - HTML mockup renomeado de `Ouroboros_22_telas-standalone.html`
    para `Ouroboros_24_telas-standalone.html` (refletindo as 24
    telas do MVP). Refs atualizadas em README, ROADMAP,
    HOW_TO_RESUME, VALIDATOR_BRIEF, CHANGELOG, CONTEXTO,
    MOCKUPS-INVENTARIO e código fonte.
  - Tag git `v1.0.0` marca o fechamento do MVP.

### Changed
- `package.json`: versão bumpada para 1.0.0; novos scripts
  `test:e2e` e `release`.

## [Unreleased]

### Added
- **M06.5 (a commitar) — Microfone com transcrição on-device + áudio anexo
  (dev-client).** Novo `<MicrofoneButton>` press-and-hold inline no
  diário emocional (Tela 18) acima do textarea. Press dispara
  haptic medium + Audio.Recording (expo-av preset HIGH_QUALITY);
  release encerra, salva `.m4a` em `assets/<YYYY-MM-DD-HHmm>-<rand>.m4a`
  do Vault e dispara `transcribeStream` via @react-native-voice/voice
  (PT-BR, on-device). Texto transcrito faz append no textarea (preserva
  digitação). Limite hard 60s com toast. Gate em
  `useSettings.midia.permitirAudio`. Permissão negada: 1ª vez toast,
  2ª vez deep link Settings. Novo `<Waveform>` 24 barras animadas
  com metering em dB. Novo helper `assetsAudioPath(date, suffix)` em
  `paths.ts`. Novos módulos `src/lib/diario/{permissions,recordAudio,transcribe}.ts`.
  Plugins `expo-av` e `@react-native-voice/voice` em `app.json` com
  permissões PT-BR. NOVO BUILD EAS NECESSÁRIO PARA VALIDAÇÃO NÍVEL
  C — APK atual (15da107f) não inclui módulos nativos.

### Quality
- **INFRA-acentuacao-comentarios (a commitar) — 145 arquivos.**
  Varredura mecânica de comentários PT-BR sem acento em `app/`
  e `src/`. Dicionário fechado de ~80 termos aplicado token-a-token
  apenas em comentários (`//` e `/* */`); strings literais,
  identifiers e JSX preservados. 715 substituições 1:1 (zero
  código adicionado/removido). Volume residual 3 (todas
  referências legítimas a paths/arquivos no filesystem que
  permanecem sem acento), redução 99.3% (419 → 3). 889 testes,
  100 suites, bundle Hermes 8.47 MB delta 0. Cumpre tabela de
  linguagem do CLAUDE.md "Comentários no código PT-BR Sentence
  case Sim, completa".

### Documentation
- **M19.x (a commitar) — Inventário de mockups visuais.**
  Novo `docs/MOCKUPS-INVENTARIO.md` (151 linhas) mapeando cada
  Tela NN ↔ bundle HTML / JSX-fonte / sprint dona, com nota
  explícita sobre conflito de numeração (Tela 25/26 ambíguas:
  M11.5/M20 vs M06.5/M16). Stub `scripts/build-mockups.mjs`
  documenta o desafio da toolchain JSX→HTML para M19 final.
  Nova seção §7.1 em `docs/CONTEXTO.md` formaliza o sistema
  (bundle 22 telas frozen, Ouroboros_telas_25_26 editável,
  screenshots por sprint = fonte canônica). 889 testes
  mantidos; toolchain completa fica para M19 final.

### Fixed
- **M00.5.x (a commitar) — Rules of Hooks em `app/(tabs)/index.tsx:81`.**
  Hook `useOnboarding((s) => s.tipoCompanhia)` foi movido para o topo
  do componente (linha 43, junto aos outros `useOnboarding`) antes
  dos early returns das linhas 70 e 76. ESLint passa limpo agora
  (`npx eslint "app/(tabs)/index.tsx"` exit 0). 889 testes mantidos.
  Achado novo registrado: `INFRA-acentuacao-comentarios` (comentários
  sem acento conflitam com CLAUDE.md — débito histórico amplo).

### Added
- **M20 (a commitar) — Widget Homescreen Android.** Plugin nativo
  Expo Module local em `modules/widget-homescreen/` com 2 layouts
  (4x2 e 4x4), 2 receivers (`OuroborosWidgetProvider` e `Large`),
  bridge JS via `requireOptionalNativeModule` (no-op silencioso em
  ausência), helper TS `atualizarWidgetHomescreen` (event-driven
  via `saveHumor` + boot hook idempotente; rate-limit 60s; fallback
  heatmap vazio quando cache M10 ausente), sub-toggle
  `widgetMostraNome` aninhado em Settings (privacidade reforçada
  por default — só inicial). Paleta Dracula em colors.xml,
  strings.xml PT-BR Sentence case com acentuação, deep links
  `ouroboros://capturar/<atalho>?source=widget`. **889 testes
  (+11) / 100 suites.** Bundle Hermes 8.47 MB. Ressalva Nível
  B/C pendente (M20.x) para sessão dev-client EAS.
- **Sessão maratona 2026-05-01 — 11 sprints fechadas em sequência.**
  Bloco 1 (infraestrutura M00.5/M00.6) + Bloco 2 (captura ativa
  M08/M13/M11/M12) + Bloco 5 (settings + opt-ins
  M15/M14.5/M16/M17/M18) entregues. Detalhes em
  `docs/SESSION-2026-05-01-log.md`.
  - **M00.5** (`9c3e28c`) — `app/(tabs)/_layout.tsx` com 5 abas
    fixas + 5 condicionais; `BottomTabs.tsx` chrome custom;
    barrels de schemas/stores; `useSettings` shape completo;
    `eas.json` 3 profiles; helpers boot
    (`deepLink`/`biometriaGate` placeholder/`reagendamento`).
    Move `app/index.tsx` → `app/(tabs)/index.tsx`. **288
    testes (+29).** Achado M00.5.x registrado (Rules of Hooks
    em `(tabs)/index.tsx:81`).
  - **M00.6** (`ae16a40`) — `SHEET_PRESETS` (60/70/80/90/DEFAULT);
    `draculaPolish.ts` injection web; mockup HTML novo
    `Ouroboros_telas_25_26-standalone.html` para Tela 25
    (calendário) e Tela 26 (widget). **295 testes (+7).**
    Achado M19.x registrado (bundle HTML toolchain).
  - **M08** (`9202273`) — Share Intent Receiver Tela 17 com 8
    subtipos (`pix`/`extrato`/`nota`/`exame`/`receita`/`garantia`/
    `contrato`/`outro`); `InboxArquivoSchema`; estende
    `deepLink.ts` para `action.SEND`; intent filters em
    `app.json`. Cópia foreground com indicador. **376 testes
    (+81).**
  - **M13** (`82cc519`) — CRUD completo de Exercícios (Telas
    02/07/08): galeria com filtros, detalhe com sparkline +
    tooltip cyan, cadastro com `expo-document-picker`. Substitui
    `/em-breve` no `captureRoutes.ts` e **deleta**
    `app/em-breve.tsx`. "Adicionar a treino livre" cria draft.
    **437 testes (+61).**
  - **M11** (`ca77ed3`) — Memórias com 3 sub-tabs
    (Treinos/Fotos/Marcos); schemas `treino_sessao` + `marco`;
    galeria agregada de 5 fontes; CRUD completo;
    `migrarDraftsParaTreinoSessao` em `BOOT_HOOKS`; 5 heurísticas
    de marcos auto com dedup hash SHA-256. **517 testes (+80).**
  - **M12** (`d6a2b43`) — Medidas (Telas 12/13) com sparkline
    cyan polygon fill + delta absoluto sem cor (ADR-0005).
    Integração cruzada com M11: `useFotosAgregadas` cresceu para
    ler `medidas/`. **568 testes (+51).**
  - **M15** (`27f6bbd`) — Settings 7 grupos com biometria gate
    real (`LocalAuthentication`); lembretes via
    `expo-notifications`; export ZIP via `jszip` +
    `expo-sharing`; toggles reativos confirmados. **618 testes
    (+50).**
  - **M14.5** (`5a6e578`) — Ciclo menstrual opt-in com tom
    sóbrio absoluto; calendário 28/35 dias adaptativo; fase
    inferida + override; abas separadas por pessoa; pasta
    dedicada `inbox/saude/ciclo/`. **663 testes (+45).**
  - **M16** (`739b993`) — Alarme com Snooze via category com
    action buttons; `SCHEDULE_EXACT_ALARM` Android 12+; sons
    CC0 gerados via ffmpeg sine wave. **740 testes (+77).**
  - **M17** (`2c3fbf6`) — To-do com drag&drop via
    `react-native-draggable-flatlist`; busca textual sem
    acento; lixeira soft 30 dias em `BOOT_HOOKS`. A17
    reincidiu, resolvido inline. **813 testes (+73).**
  - **M18** (`3989851`) — Contador "Dias sem X" com histórico
    timeline; sem celebração visual absoluta (ADR-0005);
    `diasEntre` UTC sem horas; recorde nunca diminui. Stream
    timeout do agente no final, fechamento manual. **878
    testes (+65).**
- **`docs/ORCHESTRATOR_PLAYBOOK.md`** — playbook mestre de
  orquestração para próximas sessões (filosofia, ciclo,
  template de prompt do executor, padrão de validação Chrome
  MCP, padrões aprendidos, erros e recuperação, mapa de
  blocos).
- **`docs/SESSION-2026-05-01-log.md`** — log narrativo das 11
  sprints com decisões arquiteturais e métricas finais.
- **`HOW_TO_RESUME.md` Passo 0** — orientação para identificar
  papel (orquestrador/executor/usuário humano) antes dos demais
  passos.

### Changed
- **Política de validação visual descontinuada para dual
  obrigatório.** Após M00.5, validação Chrome MCP pelo
  orquestrador substitui o checkpoint Expo Go por sprint. Expo
  Go vira gate exclusivo da M19 (release final) e sprints com
  APIs nativas pesadas. `INTEGRATION-CONTRACT.md` §2.3
  atualizado.

### Changed
- **Meta-sprint 2026-04-30 — Contrato de integração e zero v2.**
  Reescrita das 17 specs pendentes para garantir que cada sprint
  futura entregue feature **integrada ao projeto final**, sem
  código solto, e que **todas as features antes adiadas para v2**
  entrem no MVP v1.
  - Novo documento mestre `docs/sprints/INTEGRATION-CONTRACT.md`
    formaliza pontos canônicos de plug (tabs layout, schemas
    barrel, stores barrel, settings store, captureRoutes, boot
    hooks, app.json, eas.json, package scripts) e o checklist
    obrigatório por sprint.
  - 5 sprints novas adicionadas:
    - **M00.5 — Infraestrutura:** cria `app/(tabs)/_layout.tsx`,
      `BottomTabs.tsx`, barrels de schemas/stores, `useSettings`
      shape completo, `eas.json`, helpers de boot
      (`deepLink.ts`, `biometriaGate.tsx`, `reagendamento.ts`).
    - **M00.6 — Polish:** Dracula no Web, snap presets nomeados,
      mockup HTML standalone com Tela 25 (calendário) e Tela 26
      (widget).
    - **M19 — APK Release Hardening v1.0.0:** ícone, splash,
      versão, keystore, smoke E2E Maestro dos 4 flows críticos,
      tag.
    - **M20 — Widget Homescreen Android (Tela 26):** plugin
      nativo Expo Module com layouts 4x2 e 4x4, atalho radial,
      humor médio do dia.
    - **MOB-bridge-3 — Marcos auto-gerados pelo backend:** 5
      heurísticas (3 treinos em 7d, retorno após hiato, humor
      consecutivo, 30d sem trigger, primeira vitória da semana)
      com idempotência via hash.
  - 17 specs reescritas (M06.5, M07.x, M08, M09, M10, M11,
    M11.5, M12, M13, M14, M14.5, M15, M16, M17, M18,
    MOB-bridge-1, MOB-bridge-2):
    - Cada uma ganha §3.5 "Integração ao projeto" referenciando
      o CONTRACT.
    - § "Dúvidas em aberto" substituída por § "Decisões tomadas"
      com decisões explícitas e justificadas.
    - § "Definição de Pronto" adicionada com checklist de
      integração + qualidade.
    - Itens antes marcados "fora de escopo / v2 / sprint futura"
      absorvidos: CRUD completo treinos+marcos+exercícios,
      galeria de fotos agregada, modo contínuo do scanner,
      auto-bairro do scanner, snooze do alarme, drag&drop+busca
      do todo, histórico de resets do contador, mídia
      obrigatória nas 4 abas (Spotify oEmbed sem auth + YouTube
      thumb + foto + áudio), filtros adicionais do calendário
      (intensidade + bairro), tooltip do sparkline, fase
      manual+auto do ciclo, abas separadas por pessoa do ciclo,
      cache stale banner do Mini Humor, bairro auto cross-feature
      no scanner, atomic write robusto do MOB-bridge-2.
  - `VALIDATOR_BRIEF.md` §5 reescrita com 5 grupos de checks
    (estrutural, qualidade, visual, doc, integração).
  - `BRIEFING.md` §9 (anti-features) deixa de listar widget de
    homescreen — entra como sprint M20.
  - `ROADMAP.md` ganha 5 sprints novas, grafo de dependências
    atualizado e nota explícita "Nada permanece como v2".
  - `STATE.md` aponta M00.5 como próxima.
  - Ordem de execução recomendada: M00.5 → M00.6 → M08 →
    M11/M12/M13 → backend (MOB-bridge-1/2/3) → M10/M14 → M15 →
    M14.5/M16/M17/M18 → M06.5 → M07.x → M11.5 → M09 → M20 →
    M19 (release v1.0.0).

### Added
- **Sprint M07 — Eventos com lugar (Tela 20).** Substitui o stub
  da rota `/eventos` criado na M04 pela tela de captura de evento
  rica em contexto, com persistência em
  `eventos/YYYY-MM-DD-<slug>.md` no Vault.
  - `app/eventos.tsx` — bottom sheet 80% que abre ao montar.
    Toggle Positivo/Negativo no header (verde/vermelho) com
    borda esquerda animada, padrão idêntico ao da Tela 18.
    Textarea "O que aconteceu?" obrigatória (mínimo 1 caractere).
    Bloco "Onde" combinando input livre + botão "Usar localização
    atual" (`expo-location`) + chip cyan opcional do bairro
    detectado. Bloco "Quando" com chips single-select Agora /
    Outro horário (este abre `<DateTimePicker mode="time">`).
    `<ChipGroup mode="multi">` "Com quem" auto-selecionando
    `pessoa_b` quando `tipoCompanhia` é `'casal'` ou `'amigos'`
    (decisão M07 §9 item 1). `<ChipGroup mode="single">` de
    Categoria com 8 slugs fechados. `<FotosBlock>` opcional via
    `expo-image-picker` (cap interno de 6 fotos). Slider 1-5 de
    intensidade. Botão Registrar variant `success` em modo
    positivo / `destructive` em modo negativo. Sem haptic em modo
    negativo (mesmo princípio M06).
  - `src/components/eventos/LocalizacaoBlock.tsx`,
    `src/components/eventos/QuandoBlock.tsx`,
    `src/components/eventos/FotosBlock.tsx` — três blocos
    auxiliares com estado controlado pelo container e API
    pequena. FotosBlock mostra grid de thumbnails 80dp com botão
    `X` red para remover; ao atingir o cap, o botão "Adicionar
    foto" exibe o label `"Limite de 6 fotos atingido"` e fica
    disabled.
  - `src/lib/eventos/categorias.ts` — lista fechada
    `EVENTO_CATEGORIAS_SLUGS = ['rolezinho','compras','consulta',
    'trabalho','evento_social','rotina','exercicio','outro']` em
    snake_case ASCII no frontmatter. Helper `formatCategoria`
    com dicionário `EVENTO_CATEGORIAS_LABELS` acentuado em
    Sentence case PT-BR (Exercício, Evento social) e fallback
    mecânico para slugs desconhecidos. Decisão M07 §9 item 2:
    `exercicio` mantido na lista como registro casual; treino
    estruturado vai para a M13.
  - `src/lib/eventos/slug.ts` — helper `slugifyEvento` em
    cascata (bairro > texto > categoria > `'evento'`) gerando
    kebab-case ASCII com cap de 24 chars sem cortar palavra.
  - `src/lib/eventos/localizacao.ts` — wrapper `getBairroAtual`
    sobre `expo-location` (request permission > current position
    > reverse geocode). Extrai `district` com fallback em
    `subregion`. Erros silenciosos (devolve `null`).
  - `src/lib/eventos/saveEvento.ts` — função pura que valida
    via `EventoSchema.safeParse`, copia cada foto para
    `assets/<formatDateYmdHm>-evento-<idx>.jpg` via
    `expo-file-system/legacy`, atualiza `meta.fotos` com paths
    relativos ao Vault, resolve colisão de path com sufixo
    numérico crescente e chama `writeVaultFile<EventoMeta>`.
  - `tests/app/eventos.test.tsx` (16 testes),
    `tests/lib/eventos/saveEvento.test.ts` (12 testes),
    `tests/lib/eventos/categorias.test.ts` (16 testes),
    `tests/lib/eventos/slug.test.ts` (15 testes),
    `tests/lib/eventos/localizacao.test.ts` (10 testes).
    Total de testes salta de 194 para 259 (+65).
  - `app.json` ganha plugin `expo-location` com
    `locationAlwaysAndWhenInUsePermission` e plugin
    `@react-native-community/datetimepicker`.
    `expo-location@~19.0.8` e
    `@react-native-community/datetimepicker@8.4.4` instalados
    via `npx expo install`. `expo-image-picker@~17.0.11` já
    estava presente desde M03.2.
  - Bundle Hermes Android: 7,46 MB → 7,55 MB.

- **Sprint M06.X — Estende `DiarioEmocionalSchema` com `contexto_social`.**
  Fecha o achado da M06: o schema v1 só aceitava `PessoaId` em
  `com`, deixando `amigos`/`sozinho` apenas em prosa no corpo do
  `.md`. Agora o schema tem campo separado
  `contexto_social: ('amigos'|'sozinho')[]` com default `[]` (compat
  com arquivos antigos). `app/diario-emocional.tsx` divide o estado
  da UI em `meta.com` (PessoaIds) + `meta.contexto_social` (flags).
  O corpo livre do `.md` mantém a linha "Com:" para legibilidade no
  Obsidian (redundância intencional). 6 testes novos em
  `tests/schemas/diario_emocional.test.ts` (188 → 194 testes).

- **Sprint M06 — Diário emocional (Tela 18).** Substitui o stub da
  rota `/diario-emocional` criado na M04 pela tela de captura
  emocional rica em contexto, com persistência em
  `inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md` no Vault.
  - `app/diario-emocional.tsx` — bottom sheet 90% que abre ao
    montar. Toggle inicial trigger ↔ vitória renderizado como dois
    chips (red / green) que mudam a borda esquerda animada do form
    via `MotiView` com spring subtle. Grid de chips de emoção
    multi-select (6 negativos em modo trigger, 6 positivos em modo
    vitória) com acentuação completa PT-BR via dicionário de
    labels. Slider 1-5 de intensidade. Textarea livre obrigatória
    (mínimo 1 caractere; bloqueia save com toast warn se vazia).
    `<ChipGroup mode="multi">` "Com quem" com 4 opções fixas
    (`pessoa_a`, `pessoa_b`, `amigos`, `sozinho`). Bloco
    condicional em modo trigger com textarea Estratégia + Toggle
    Funcionou. Botão final variant `destructive` (trigger) ou
    `success` (vitória). Microcopy de rodapé `"Salvo localmente.
    Ninguém vê além de vocês dois."` em muted-decor. Modo `audio`
    inicializa em vitória e marca flag interna `audioRequested`
    para a M06.5 acoplar a UI de gravação. Sem haptic no save em
    modo trigger (momento delicado, BRIEFING §2.5); em modo
    vitória dispara `haptics.success()` leve.
  - `src/components/diario/EmocaoChips.tsx` — wrapper sobre
    `<ChipGroup mode="multi">` com prop `modo` que troca o
    conjunto de opções. `MotiView` com `key` re-mountável dispara
    spring subtle no opacity ao trocar de modo (hop visual sem
    jump-cut).
  - `src/lib/diario/emocoes.ts` — listas fixas
    `EMOCOES_NEGATIVAS = ['tristeza','raiva','ansiedade','frustracao','medo','solidao']`
    e `EMOCOES_POSITIVAS = ['alegria','alivio','gratidao','conexao','paz','orgulho']`
    em snake_case ASCII no frontmatter. Helper `formatEmocao(slug)`
    com dicionário de labels acentuados (frustração, alívio,
    gratidão, conexão, solidão) e fallback mecânico para slugs
    desconhecidos. Sets `EMOCOES_NEGATIVAS_OPTIONS` (accent red) e
    `EMOCOES_POSITIVAS_OPTIONS` (accent green) prontos para o
    ChipGroup.
  - `src/lib/diario/saveDiario.ts` — função pura que resolve
    `diarioEmocionalPath(new Date(), slug)` (slug derivado da
    primeira emoção ou `'registro'`), valida via
    `DiarioEmocionalSchema.safeParse`, aplica sufixo numérico
    crescente em colisão improvável de mesmo arquivo no mesmo
    minuto e chama `writeVaultFile<DiarioEmocionalMeta>`.
  - `tests/app/diario-emocional.test.tsx` (15 testes),
    `tests/components/diario/EmocaoChips.test.tsx` (6 testes),
    `tests/lib/diario/saveDiario.test.ts` (8 testes),
    `tests/lib/diario/emocoes.test.ts` (12 testes). Total de
    testes salta de 147 para 188 (+41).
  - **Achado registrado para sprint nova**: o
    `DiarioEmocionalSchema` v1 só aceita `PessoaId` em `com`,
    bloqueando os flags `amigos` e `sozinho` exigidos pela UI.
    Solução provisória nesta sprint: persistir em `meta.com`
    apenas os PessoaIds válidos e anotar contexto extra no corpo
    livre do `.md` em prosa ("Com: Amigos, Sozinho."). Nova
    sprint M06.X deve estender o schema com campo
    `contexto_social: ('amigos'|'sozinho')[]`.

- **Sprint M05.2 — Estender `<Input>` com `autoCapitalize` e
  `keyboardType`.** O componente passa a expor essas duas props
  opcionais (defaults `'sentences'` e `'default'`), repassadas
  diretamente ao `TextInput` interno. Achado pelo executor da M05
  ao não conseguir aplicar `autoCapitalize="sentences"` no campo
  Medicação e `keyboardType="numeric"` no campo Horas de sono.
  `app/humor-rapido.tsx` atualizado para usar as novas props.
  4 testes novos em `tests/components/ui/Input.test.tsx` (total
  144 → 147 testes, 28 suites).

- **Sprint M05 — Humor rápido (Tela 15).** Substitui o stub da
  rota `/humor-rapido` criado na M04 pela primeira tela de captura
  real do app, com persistência em `daily/YYYY-MM-DD.md` no Vault.
  - `app/humor-rapido.tsx` — bottom sheet 70% que abre ao montar.
    Quatro sliders 1-5 (humor, energia, ansiedade, foco) com
    default 3, input de medicação (texto livre opcional, decisão
    da §9), input de horas de sono (numérico), `<ChipGroup
    mode="multi">` com 8 tags rápidas fechadas, textarea de uma
    frase opcional e botão Salvar verde. Após salvar dispara
    `haptics.success()`, toast `"Salvo."` e `router.back()`.
  - `src/lib/humor/saveHumor.ts` — função pura que resolve
    `dailyPath(new Date())`, detecta colisão de pessoa A5
    (`pessoa_a` × `pessoa_b` no mesmo dia via Syncthing) lendo o
    arquivo canônico antes de escrever, aplica sufixo
    `-pessoa_<x>.md` quando outro autor já escreveu, e chama
    `writeVaultFile<HumorMeta>` com corpo vazio (frase fica no
    frontmatter, decisão M05).
  - `src/lib/humor/tagsRapidas.ts` — lista fechada de 8 slugs
    canônicos (`trabalho_pesado`, `boa_conversa`, `cansaco`,
    `exercicio`, `foco_dificil`, `dormi_mal`, `treino_bom`,
    `dia_leve`) + helper `formatTag` que converte snake_case em
    Sentence case para exibição.
  - `tests/app/humor-rapido.test.tsx` (10 testes), 
    `tests/lib/humor/saveHumor.test.ts` (5 testes), 
    `tests/lib/humor/tagsRapidas.test.ts` (8 testes). Total de 
    testes salta de 120 para 143.

- **Sprint M04 — FAB Radial integrado em capturas.** Commit
  `4e10f25` (15 arquivos, 285 inserções, 7 remoções).
  - `src/lib/navigation/captureRoutes.ts` — módulo novo que mapeia
    cada `FABRadialKey` para `Href` literal do Expo Router. Rotas
    com params (`?modo=trigger|vitoria|audio`) já preparadas para
    M06 e M06.5.
  - `app/index.tsx` — `<FABRadial>` agora chama `router.push()` via
    `routeForCapture()`, substituindo o toast antigo "FAB radial
    chega na M04".
  - 5 stubs novos em `app/`: `em-breve.tsx`, `humor-rapido.tsx`,
    `diario-emocional.tsx`, `eventos.tsx`, `scanner.tsx`. Cada um
    usa `<EmptyState>` informando em qual sprint a tela chega.
  - `tests/lib/navigation/captureRoutes.test.ts` — 8 testes novos
    cobrindo as 6 chaves do FAB. Total: 118/118 passando.
  - 7 screenshots Nível A (Chrome web) em
    `docs/sprints/M04-screenshots/` capturados via playwright MCP.
  - Bundle Hermes Android estável em 7,46 MB.

- **Sprint M00.docs — Orquestração Mestre.** 47 arquivos
  novos/atualizados em 5 commits.
  - 3 docs raiz: `ROADMAP.md` (mapa das 22+ sprints),
    `STATE.md` (estado vivo), `HOW_TO_RESUME.md` (guia de retomada
    em 5 passos). Pensados para qualquer Opus retomar fresh sem
    histórico.
  - Template fixo: `docs/sprints/_template-spec.md` com 9 seções
    obrigatórias para toda spec futura.
  - **15 ADRs em `docs/ADRs/`**: 11 históricos formalizados
    (0001-0011) a partir do `PLANO_TECNICO_APK.md` §4 + 4 novos
    (0012 cache mobile readonly, 0013 capitalização revogada,
    0014 vault dedicado, 0015 pessoas runtime com foto). Índice
    em `docs/ADRs/INDEX.md`.
  - **18 specs Mobile detalhadas** em `docs/sprints/M04-spec.md`
    a `docs/sprints/M18-spec.md`, incluindo M06.5 (microfone),
    M07.x (mídia obrigatória em conquistas), M11.5 (calendário
    visual de conquistas) e M14.5 (acompanhador de ciclo
    menstrual, opt-in, tom sóbrio).
  - **2 specs Backend** em `docs/sprints/backend/`: MOB-bridge-1
    (refactor pessoa_a/b no Python) e MOB-bridge-2 (caches
    `humor-heatmap.json` e `financas-cache.json`).
  - Consolidação histórica em
    `docs/sprints/M03.x-fixes-consolidados.md` (M03.1 a M03.7).
  - Decisões: F-15/16/17 promovidas a v1 como M16/M17/M18 (opt-in
    via Settings da M15). Ciclo menstrual entra como M14.5
    (opt-in, sem gamificação). Calendário visual entra como M11.5.

### Changed
- `VALIDATOR_BRIEF.md`: nova seção 6 (Roadmap canônico) apontando
  para `ROADMAP.md`. Nova seção 7 (Estado atual) apontando para
  `STATE.md`. Nova seção 8 (Como retomar) apontando para
  `HOW_TO_RESUME.md`. Stack header atualizada (Expo SDK 54,
  Reanimated 4, NativeWind 4).
- `CLAUDE.md`: adicionada seção "Como retomar em sessão fresh"
  apontando para `HOW_TO_RESUME.md`.
- `README.md`: aviso destacado no topo apontando para
  `STATE.md`/`ROADMAP.md`/`HOW_TO_RESUME.md`.
- `docs/BRIEFING.md`: marcação de obsolescência na regra "lowercase
  intencional" (§1) com aviso apontando para ADR-0013.
- `docs/CONTEXTO.md`: §4 ganha aviso sobre mudança do path do Vault
  para `~/Protocolo-Ouroboros/` (ADR-0014).
- `docs/PLANO_TECNICO_APK.md`: §4 ganha aviso de que ADRs canônicos
  agora vivem em `docs/ADRs/`. Texto em prosa fica como referência
  histórica.

- `install-dev.sh` reescrito como instalador único: pede sudo uma
  vez no início e mantém cacheado, configura `~/.zshrc` com
  `ANDROID_HOME` e PATH automaticamente, detecta hardware (cores
  lógicos, RAM total) e cria AVD `ouroboros-test` com config
  otimizada (`hw.cpu.ncore`, `hw.ramSize`, `vm.heapSize`, GPU host,
  KVM). Cold boot inicial com snapshot `default_boot` para boots
  seguintes em menos de 10s.
- `scripts/start-emulator.sh` — inicia emulador com flags de
  performance (`-gpu host`, `-accel auto`, `-no-boot-anim`, snapshot)
  e aguarda `sys.boot_completed=1`. Aceita `--headless` e `--cold`.
- `scripts/mirror-device.sh` — abre janela `scrcpy` espelhando o
  device ADB ativo (celular físico ou emulador) com latência <50ms.
- `run.sh` ganhou flags `--emulator` (sobe AVD antes do Metro) e
  `--mirror` (abre `scrcpy` em paralelo). `--web` continua sem
  conflito com celular físico.

### Added
- Sprint M03.2 — foto de perfil. `<AvatarPicker pessoa={...}>` em
  `src/components/ui/AvatarPicker.tsx` abre galeria via
  `expo-image-picker`, copia a foto escolhida para
  `documentDirectory/avatars/<pessoa>.jpg` (URI estável entre
  sessões) e persiste em `usePessoa.fotos`. Placeholder dashed em
  borda da cor da pessoa quando vazio. `<PersonAvatar>` ganha prop
  opcional `photoUri` que sobrepõe a inicial colorida com a imagem
  real. Frame 0 do onboarding mostra o picker acima do input de
  nome; Frame 1 (se duo) mostra o picker da segunda pessoa abaixo
  do input. `app.json` ganha plugin `expo-image-picker` com
  permissions strings PT-BR.
- `expo-image-picker@~17.0.11` instalado via `npx expo install`.

### Fixed
- Sprint M03.1 — flicker de redirect resolvido. Stores zustand-persist
  hidratam de forma assíncrona do SecureStore. Adicionado hook
  `useHasHydrated(useStore)` em `src/lib/stores/hydrated.ts` que
  observa `persist.onFinishHydration`. `app/index.tsx` agora aguarda
  as 3 stores (onboarding, vault, pessoa) hidratarem antes de
  qualquer `<Redirect>`. Durante a janela de hidratação mostra
  `<Screen>` vazio (bg-page) — sem flicker.
- Sprint M03.1 — labels micro-laranja do onboarding com Sentence
  case + acentuação completa: `"Antes de começar"`, `"Companhia"`,
  `"Vault"`, `"Sincronização"`. Removido `textTransform: 'lowercase'`
  do helper `MicroOrange`.
- Sprint M03.1 — gap entre cards do Frame 3 (Sincronização) subiu
  para `spacing.xl` (24dp), reforçando a separação visual entre
  Syncthing / Obsidian Sync / Não uso ainda.

### Changed
- Vault físico do Mobile passa a ser **`~/Protocolo-Ouroboros/`**
  (decisão de 2026-04-29). Pasta dedicada sincronizada via Syncthing
  entre desktop Pop!_OS e celular Note13-Andre, **separada do Vault
  humano do Obsidian** em `~/Controle de Bordo/`. Reduz risco de
  conflito com arquivos pessoais e simplifica o contrato com o
  backend desktop. `VALIDATOR_BRIEF.md` e `scripts/seed_vault_demo.sh`
  atualizados; o script agora cria pastas `daily/`, `eventos/`,
  `inbox/mente/diario/` na pasta nova.

### Fixed
- Sprint M02.1 — corrigido loop infinito em `useHoje` causado por
  `now: Date = new Date()` no parâmetro default do hook (criava nova
  referência a cada render, disparando o useEffect em loop). Hook
  agora aceita `ymdOverride?: string` opcional e calcula a data
  dentro do effect. Sintoma: tela "Hoje" piscava entre Carregando e
  Empty State.
- Sprint M02.1 — labels do FAB radial ajustados: Trigger → Crise,
  Exercício → Exercícios, Vitória → Conquista (evita confusão com
  nome próprio "Vitória" e termo técnico "Trigger").
  ARC_RADIUS 175→210 e ângulos voltaram para range matemático
  180–270°. Teste de a11y atualizado para os novos labels.
- Sprint M02.2 — labels do FAB radial sem largura fixa: o `width:
  140` invadia o ícone do botão adjacente ao centralizar o texto.
  Agora o `<Text>` ajusta ao tamanho do conteúdo. Sintoma corrigido:
  rótulos sobrepondo ícones (visível no checkpoint 70717).

### Added
- Sprint M02 — Vault Bridge + Tela 01 (hoje). Primeira sprint que
  conecta o app a dados reais. `src/lib/vault/` com paths canônicos
  (`daily/`, `eventos/`, `inbox/mente/diario/`), parser de YAML
  frontmatter, reader/writer/permissions sobre SAF do Android via
  `expo-file-system/legacy`. Schemas zod para `humor`,
  `diario_emocional` e `evento` espelhando `BRIEFING.md` §7. Store
  global `useVault` com URI raiz persistido em SecureStore. Hook
  `useHoje` lê os três tipos em paralelo, filtra pela pessoa ativa,
  retorna estado uniforme para a UI. `app/index.tsx` substitui o
  re-export do storybook por Tela 01 real (modal de permissão
  full-screen quando Vault não foi concedido; cards de humor com
  sliders readonly, lista de diários e eventos com borda colorida
  por modo, FAB que mostra toast informando que radial chega na
  M04). `scripts/seed_vault_demo.sh` popula o Vault físico com 3
  arquivos de exemplo (`pessoa_a`) idempotente. Total de 105 testes
  (40 novos: paths, frontmatter, três schemas).
- Sprint M01.6.2: FAB radial repensado pós-feedback usuário. FAB
  principal 56→72dp, botões de ação 48→64dp, ícones aumentados,
  labels reposicionadas à esquerda do círculo com fundo sólido
  `bgElev` e fonte 14 weight medium.
- Sprint M01.6.3: ajuste angular para evitar sobreposição
  Vitória/Trigger detectada no checkpoint visual. Espaçamento
  18°→22° entre itens, ARC_RADIUS 150→175, ângulos redistribuídos
  175-285°.
- Sprint M01 finalizada — endorso visual do usuário no celular real:
  "as animações do mais e o menu radial é muito foda".
  Tag `v0.1.0-m01` marca a Fundação Estética concluída.

### Changed
- **Regra de capitalização da UI revogada e substituída** durante
  checkpoint visual M01.5 (2026-04-28). `BRIEFING.md` §1 e §2.4
  prescreviam "lowercase intencional" em toda a UI. Decisão do dono
  do projeto: strings de UI passam a usar **Sentence case com
  acentuação completa PT-BR**. `accessibilityLabel` continua sem
  acento; comentários em código continuam sem acento. `VALIDATOR_BRIEF.md`
  §1.4 e `CLAUDE.md` (regra de linguagem) atualizados.
- Line-height de body subiu de 1,5 para 1,6.

### Added
- Sprint M01.5: checkpoint visual M01 no celular real (Redmi Note 13
  5G Pro via Expo Go LAN). 4 screenshots commitadas em
  `docs/sprints/M01.5-screenshots/`. Estética aprovada com 4
  ressalvas a tratar em Sprint M01.6 (capitalização, acentos
  faltantes, densidade visual alta, warning SafeAreaView). Documento
  completo em `docs/sprints/M01.5-checkpoint-visual.md`.
- Sprint M01.4: 5 componentes UI complexos em `src/components/ui/`
  (Slider, Toast + ToastProvider + useToast, BottomSheet, FAB,
  FABRadial). FABRadial implementa o menu radial da Tela 14 com 6
  botões em arco semicircular (humor pink, voz cyan, câmera orange,
  exercício green, vitória yellow, trigger red), surgindo em sequência
  com 60ms de delay (`springs.bouncy`). Toast sobe a 80dp do bottom em
  `springs.default`, fade out em 180ms, swipe horizontal para
  dispensar. `app/_layout.tsx` envolto em `<GestureHandlerRootView>` +
  `<ToastProvider>` (única alteração mínima autorizada de arquivo
  fechado).
- 16 testes novos (3 Slider + 4 Toast + 2 BottomSheet + 3 FAB + 4
  FABRadial) — total 65 testes em 18 suítes.
- `@react-native-community/slider@5.0.1` instalado via `npx expo
  install` (Armadilha A11).
- `jest.setup.cjs` ampliado com mocks de slider, gorhom/bottom-sheet e
  gesture-handler.
- Sprint M01.3: 10 componentes UI premium estáticos em
  `src/components/ui/` (Screen, Header, Button, Card, Input, Textarea,
  Chip + ChipGroup, Toggle, PersonAvatar, EmptyState) + barrel
  `index.ts`. Cada componente nasce com springs (`@/lib/motion`),
  haptics (`@/lib/haptics`), scale 0.97 ao pressionar, classes
  Tailwind da paleta Dracula, strings de UI em lowercase intencional e
  `accessibilityRole` + `accessibilityLabel`. Storybook caseiro em
  `app/_components.tsx` mostrando todos os componentes em isolamento.
- 27 testes novos (13 suítes, 49 testes ao total) cobrindo render,
  press handlers, haptics e variantes via
  `@testing-library/react-native@^13.3.3` (peer
  `react-test-renderer@19.1.0`).
- `jest.setup.cjs` para silenciar transformações do nativewind/babel
  no setup global do jest (Armadilha A12 — registrar no BRIEF).
- Sprint M01.2: fundação da camada de bibliotecas internas em `src/`.
  Tokens visuais (`src/theme/tokens.ts`) com cores Dracula, spacing 4dp,
  radius por superfície e tipografia (pesos 400/500, line-height ≥ 1,5).
  Motion (`src/lib/motion.ts`) com 4 spring presets canônicos
  (subtle 22/220, default 18/200, bouncy 12/180, snappy 26/320) e 2
  timings (fadeOut linear 180ms, toastIn spring). Haptics
  (`src/lib/haptics.ts`) com 5 helpers tipados (`light`, `medium`,
  `selection`, `success`, `error`) sobre `expo-haptics`. Schemas zod
  (`src/lib/schemas/pessoa.ts`): `PessoaIdSchema`, `PessoaAutorSchema`
  e `isAutor`. Config genérica (`src/config/pessoas.config.ts` e
  `pessoas.config.example.ts`) com defaults `Nome_A`/`Nome_B`/`Ambos` —
  Regra −1 preservada. Store zustand (`src/lib/stores/pessoa.ts`) com
  `pessoaAtiva`, `filtroPessoa`, `nomes`, persistido em SecureStore via
  adapter (`src/lib/stores/persist.ts`) sob a chave
  `ouroboros.pessoa.v1`.
- Suíte de testes unitários em `tests/` com jest-expo (22 casos em 3
  suites). Cobertura: schemas (parse/rejeição/type-guard), motion
  (números exatos dos presets) e config (defaults genéricos não casam
  regex de nomes reais).
- `package.json`: script `test` (`jest --watchAll=false`), bloco `jest`
  com preset `jest-expo`, `testMatch` restrito a `tests/`,
  `transformIgnorePatterns` para módulos RN/Expo/Moti/NativeWind e
  `moduleNameMapper` para resolver alias `@/*` (espelha tsconfig).
  Dev deps adicionadas via `npx expo install --dev`: `jest-expo` 54.0.17,
  `jest` 29.7.0, `@types/jest` 29.5.14.
- `.npmrc` com `legacy-peer-deps=true` para destravar peer deps do
  `@gluestack-ui/themed` (legado) com React 19.
- VALIDATOR_BRIEF Armadilhas A8/A9/A10/A11 documentando achados de
  M01.1 (Reanimated 4, ESLint flat config, gluestack legacy, peer deps
  do SDK 54).
- Sprint M01.1: bootstrap Expo SDK 54 em-place preservando docs.
  Stack confirmada: Expo Router, NativeWind 4, Reanimated 4,
  Moti, gluestack-ui, @gorhom/bottom-sheet, JetBrains Mono via
  `@expo-google-fonts/jetbrains-mono`, zustand, zod, yaml.
  Configs: `tailwind.config.js` com paleta Dracula completa,
  `babel.config.js` com `nativewind/babel` antes e
  `react-native-reanimated/plugin` por último (Armadilha A1),
  `metro.config.js` com `withNativeWind`, `tsconfig.json` strict
  + paths `@/*`, `app.json` com tema dark e package
  `com.ouroboros.mobile`. Telas placeholder em `app/_layout.tsx`
  e `app/index.tsx` com classes Tailwind.
- Bootstrap do repositório git (Fase 0).
- Layout canônico `docs/` com `BRIEFING.md`, `CONTEXTO.md`,
  `PLANO_TECNICO_APK.md`, `Ouroboros_24_telas-standalone.html` e
  pastas `ADRs/`, `sprints/`, `design-canvas-export/`.
- Scripts de validação: `check_anonimato.sh`, `check_test_data.sh`,
  `smoke.sh`, `sprint_iniciar.sh`.
- Hooks `pre-commit` e `pre-push` ativos via `core.hooksPath=hooks`.
- `LICENSE` GPL-3.0, `README.md`, `CLAUDE.md` com regras invioláveis,
  `.gitignore` com exceção para `pessoas.config.runtime.json`.

### Changed
- `docs/design-canvas-export/project/BRIEFING_PARTE3_SPEC.md` marcado
  como `SUPERSEDED` (legado, stack era Kotlin/Compose).
