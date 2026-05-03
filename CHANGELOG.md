# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased] — Refundação v1.0 (2026-05-02 em diante)

### Adicionado

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
