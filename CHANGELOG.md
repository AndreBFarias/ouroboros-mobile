# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
  `PLANO_TECNICO_APK.md`, `Ouroboros_22_telas-standalone.html` e
  pastas `ADRs/`, `sprints/`, `design-canvas-export/`.
- Scripts de validação: `check_anonimato.sh`, `check_test_data.sh`,
  `smoke.sh`, `sprint_iniciar.sh`.
- Hooks `pre-commit` e `pre-push` ativos via `core.hooksPath=hooks`.
- `LICENSE` GPL-3.0, `README.md`, `CLAUDE.md` com regras invioláveis,
  `.gitignore` com exceção para `pessoas.config.runtime.json`.

### Changed
- `docs/design-canvas-export/project/BRIEFING_PARTE3_SPEC.md` marcado
  como `SUPERSEDED` (legado, stack era Kotlin/Compose).
