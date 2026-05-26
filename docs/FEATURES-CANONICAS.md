# Features Canônicas — Ouroboros

Mapa funcional consolidado do projeto. **Fonte de verdade única
sobre o que o app faz** (assumindo o roadmap M21–M41 fechado).

> **Atualização 2026-05-06 — plano golden-zebra v1.0.0:** após field
> test do APK `v1.0.0-alpha` (commit `ada414e`), 31 sprints atômicas
> dos blocos H–P são executadas até v1.0.0. Decisões durá­veis novas
> documentadas neste arquivo:
>
> - **Vault layout por tipo de arquivo** (não por feature) —
>   `markdown/`, `png/`, `jpg/`, `m4a/`, `mp4/`, `pdf/`, `gif/`. ADR-0023.
> - **Pasta do Vault escolhida pelo usuário** no onboarding (não
>   hardcoded `/sdcard/Documents/Ouroboros/`). ADR-0022.
> - **Onboarding pede 5 permissões** (storage, câmera, microfone,
>   notificações, localização) + `sexoDeclarado` para inferência ciclo.
> - **Aba Memórias renomeada para "Saúde Física"** com 3 abas
>   (Treinos, Evolução Corporal, Exercícios). Aba "Fotos" removida —
>   FAB+ verde cobre.
> - **Recap + Calendário Conquistas unificados** em uma tela só com
>   toggle modo (Lista/Calendário). ADR-0021.
> - **`useNomeDe('ambos')` ramificado**: retorna "Casal" para
>   `tipoCompanhia==='casal'`, "Todos" para `'amigos'`, fallback
>   "Ambos".
> - **Saves resilientes**: cada feature ganha `try/catch + timeout
>   10s` no caller + helper canônico `vaultUriJoin` no writer (impede
>   loader infinito + URI corruption).
> - **Menu lateral**: seção "Ver" → "Acesso Rápido", "Opcionais" →
>   "Utilitários". Foto/nome no cabeçalho clicáveis abrem edição.
>   Scroll position persistente. Botão Configurações com safe-area
>   adequada.

> **Importante — manutenção obrigatória:** este arquivo deve ser
> atualizado **junto com o commit que introduz, modifica ou remove
> uma feature**. Sprints novas devem incluir checklist na seção 8
> da spec ("Checkpoint visual") com o item:
>
> - [ ] `docs/FEATURES-CANONICAS.md` atualizado.
>
> Validador-sprint **recusa** sprint que toca UI ou schema sem
> esta atualização.

> **Para que serve:**
> - Documentação de produto (lista do que o app faz).
> - Base para versão **desktop** do programa (mesmas features,
>   stack diferente).
> - Onboarding de novos contribuidores em <30min.
> - Referência cruzada com `BRIEFING.md` (design system + 24
>   telas) e `ADRs/INDEX.md` (decisões arquiteturais).

> **Atualizado em:** 2026-05-04 (sessão maratona M11.1 → M34
> fechadas; M35 → M41 + corretivas pendentes).

---

## 1. Identidade e onboarding

| Feature | Sprint | Detalhe |
|---|---|---|
| Onboarding 3 frames | M03 + M22 + M23 | Nomes + fotos das pessoas → vault auto-criado em `/sdcard/Documents/Ouroboros` (sem SAF) → confirmação |
| Modo solo / duo (casal) / amigos | M03 + M29 | Definido no onboarding e ajustável em Settings |
| Identidade dinâmica | M03 + M28 | `pessoa_a` / `pessoa_b` com nome + foto + cor (purple `#bd93f9` / pink `#ff79c6`) persistido em SecureStore |
| `useNomeDe(pessoa)` hook | M28 | Hook reativo canônico, todo lugar consome (zero hardcode "Pessoa A") |
| Editar nomes/fotos | M15 + M29 | Settings → "Editar nomes e fotos" |
| Adicionar segunda pessoa | M15 + M29 | Solo → duo via Settings |

## 2. Capturas ativas

### 2.1 Humor Rápido — M05 (Tela 15)

- Sheet 70% com 4 sliders 1-5 (humor / energia / ansiedade / 1
  variável a definir).
- Texto livre de medicação + horas de sono.
- ChipGroup multi de 8 tags fechadas (alegria / ansiedade / calma
  / cansaço / foco / irritação / tranquilidade + 1).
- Textarea opcional de nota.
- Persiste em `markdown/humor-YYYY-MM-DD.md` (H2 layout-por-tipo).
- Detecção de colisão de pessoa (sufixo `-pessoa_<x>.md`).
- Flow alvo <30s.

### 2.2 Diário Emocional — M06 + M33 (Tela 18)

- 3 modos: **Trigger** (com motivo), **Vitória**, **Reflexão**.
- Campos: descrição livre, tags, contexto social.
- Campo `para` (M33): para mim / para [parceiro] / para o casal.
- Foto opcional anexada.
- Persiste em `diario/YYYY-MM-DD/<slug>.md`.

### 2.3 Eventos com lugar — M07 + M33 (Tela 20)

- Subtipos: rolezinho / compras / consulta / trabalho / evento
  social / rotina / exercício / outro.
- "Com quem" — chips dinâmicos (pessoa_a / pessoa_b / ambos).
- Fotos múltiplas (cap 6 por evento via `expo-image-picker`).
- Mídia anexada: Spotify track / YouTube / Foto / Áudio.
- Slider "Como foi?" 1-5.
- Campo `para`.
- Persiste em `eventos/YYYY-MM-DD/<slug>.md`.

### 2.4 Conquistas com mídia obrigatória — M07.x (Telas 18, 20)

- 4 tipos: foto / áudio / vídeo / oEmbed (Spotify, YouTube).
- Mídia obrigatória — sem mídia, não salva.
- Companion `.md` com YAML frontmatter (formalizado em M39).
- Picker de biblioteca YouTube (R-INT-4-YOUTUBE-PICKER): quando o
  YouTube está conectado (`useYouTubeAuth`), a aba YouTube do
  `MidiaPicker` lista a biblioteca (Liked + Watch Later via
  `youtube/biblioteca.ts`); toque preenche a `MidiaYoutube`. Atalho
  "Colar link" e fallback URL + CTA "Conectar YouTube" quando
  desconectado. Consome o client read-only; não toca OAuth/schema.

### 2.5 Microfone — F-14 / M06.5 (Tela 18, **dev-client only**)

- Botão `MicrofoneButton` grava áudio + transcreve on-device
  (`expo-speech-recognition`).
- Modo contínuo até 5min.
- Áudio salvo em `media/audio/`, transcrição vai pro diário
  emocional.

### 2.6 Scanner OCR — M09 (Tela 16, **dev-client only**)

- Câmera nativa em alta resolução.
- Multipágina → consolida em PDF.
- ML Kit text recognition extrai valor / categoria / data /
  bairro.
- Persiste em `financas/notas/YYYY-MM-DD-<slug>.md` + imagem
  original.
- (Pré-M09: aba Finanças mostra "Em desenvolvimento" honesto —
  M35.)

### 2.7 Share Intent Receiver — M08 (Tela 17)

- Recebe via "Compartilhar" do Android: imagem / vídeo / áudio /
  texto / link / PDF / documento / arquivo genérico (8 subtipos
  canônicos).
- Triagem: salvar como evento / diário / conquista / inbox.
- Persiste em `inbox/<area>/<subtipo>/<data>-<slug>.md` + binário ao
  lado. Pasta `inbox/` é **exceção parcial** ao layout-por-tipo
  (ADR-0024, sprint G1) — preserva semântica de triagem temporária;
  arquivos saem do `inbox/` quando classificados como evento, diário
  ou conquista (sprint de triagem futura).

### 2.8 Captura unificada — M-CAPTURA-UNIFICADA (atualizada em R-FAB-2)

- Item "Câmera" do MenuLateral abre a rota `/captura` (modal raiz
  `transparentModal`, padrão M26) com `<SheetEscolhaCaptura>`:
  dois cards verticais grandes, área de toque ≥ 88dp, sem badge
  e sem cor de festa.
  - **Reflexão com foto** (`ImagePlus` cyan, "Foto + diário
    emocional.") — renomeado em R-FAB-2 (Onda R Fase 2) a partir
    do antigo "Registrar momento". Comportamento novo: dismissa o
    sheet, abre `capturarFoto({origem: 'camera'})` direto, em
    sucesso seedeia o rascunho `diarioEmocional` em `useSessao`
    com `modo='reflexao'` + `midia=[{tipo:'foto', path}]`, e
    navega para `/diario-emocional?modo=reflexao`. O Diário
    Emocional inicializa o form a partir do rascunho — chip
    "Reflexão" pré-selecionado, foto pré-anexada via `MidiaPicker`.
    Cancel da câmera → `router.back()` sem rascunho residual.
  - **Escanear documento** (`ScanLine` cyan, "Nota fiscal,
    comprovante.") → dismissa e navega para `/scanner`
    (`<ScannerSheet>` M09 quando dev-client; em ambiente sem ML
    Kit nativo o sheet mostra `EmptyState` honesto via
    comportamento existente).
- `<MenuCapturaVerde>` permanece em Saúde Física como atalho
  rápido contextualizado para Foto/Música/Vídeo/Frase; `/captura`
  é o ponto de decisão único do menu lateral, agora focado em
  Reflexão (R-FAB-2) ou Documento. Rota está na lista
  `ROTAS_SEM_FAB` para o `<FABMenu>` não competir z-index com o
  sheet de decisão.

### 2.9 MenuCapturaVerde — M34 + M34.3 (em Saúde Física)

- **FAB verde único** no canto direito da tela Saúde Física
  (substituiu os FABs próprios das tabs em M34.3, que colidiam em
  z-order com o FAB verde nas mesmas coordenadas).
- Sheet "Registrar" mostra 5 ações: **1 ação contextual da tab
  ativa** (Novo treino / Adicionar marco / Adicionar exercício) +
  4 ações de captura (Foto / Música / Vídeo / Frase).
- Após L1 a aba "Fotos" foi removida; "Adicionar foto" continua
  acessível via as 4 ações de captura padrão (Foto / Música /
  Vídeo / Frase) — não precisa de aba dedicada.
- Cada captura salva binário em `media/<categoria>/<data-rand>.<ext>`
  + companion `.md` com `tipo`, `arquivo`, `data`, `autor`,
  `para`, `legenda`.
- Item contextual delega para o sheet interno da tab
  (`SheetNovoTreino`, `SheetNovoMarco`) ou para a rota de cadastro
  (`/exercicios/novo` para a aba Exercícios).

## 3. Saúde Física — M11 + L1 (Telas 09, 10, 11)

> **Sprint L1 (M-MEMORIAS-PARA-SAUDE-FISICA, 2026-05-07):** a aba
> "Memórias" foi renomeada para **"Saúde Física"** (rota `/memoria`
> → `/saude-fisica`). As 3 abas atuais são **Treinos /
> Evolução Corporal / Exercícios**. A aba "Fotos" foi REMOVIDA — o
> FAB+ verde do MenuCapturaVerde já cobre "Adicionar foto" sem
> exigir aba dedicada. A aba "Exercícios" foi MOVIDA para dentro
> de `/saude-fisica` (antes era item da seção "Registrar" do menu
> lateral apontando para `/exercicios/novo`).

### 3.1 Treinos
- Heatmap 13×7 (91 dias) com paleta verde, **centralizado
  horizontalmente** (M11.1).
- Stats "X treinos em 90 dias".
- Tap em célula abre detalhe da sessão.
- CRUD de sessão de treino: rotina, duração, observações,
  exercícios feitos, peso/reps.
- "Novo treino" é item do MenuCapturaVerde unificado (M34.3);
  abre `SheetNovoTreino` interno.
- Atalho ghost "Cadastrar exercícios na Galeria" no empty state
  (M11.1) navega para `/exercicios`.

### 3.2 Evolução Corporal (renomeada de "Marcos" em L1)
- Subseção "Evolução corporal" no topo: faixa horizontal de cards
  mensais com foto frontal + peso + delta vs medida anterior. Tap
  abre `/medidas` (Tela 13) com hint `?focus=YYYY-MM-DD`.
- Botão "Registrar evolução" no header da seção navega direto para
  `/medidas/novo`.
- Timeline de marcos manuais + auto-gerados abaixo da subseção.
- Tags: treino / consistência / emocional / vitória / retomada.
- "Adicionar marco" é item do MenuCapturaVerde unificado (M34.3);
  abre `SheetNovoMarco` interno.
- Marcos automáticos (MOB-bridge-3): 5 heurísticas (ex: 7 dias
  seguidos, primeira nota acima de 4) com dedup `sha256`.
- Componente interno: `<EvolucaoCorporalTab>` (renomeado de
  `<MemoriasMarcosTab>` em L1).

### 3.3 Exercícios (movida em L1 para dentro de Saúde Física)
- Galeria reusada da rota `/exercicios` (Tela 07): filtro por
  grupo muscular, campo de busca, grid 2 colunas com GIF preview.
- "Adicionar exercício" é item do MenuCapturaVerde unificado
  (M34.3); navega para `/exercicios/novo`.
- Tap em card abre `/exercicios/[slug]`; long-press abre edição
  em `/exercicios/[slug]/editar`.
- Componente interno: `<MemoriasExerciciosTab>`. A rota standalone
  `/exercicios` continua existindo (mantém o FAB+ verde próprio
  para fluxo direto sem passar por Saúde Física).
- **Player de mídia Q18.b + Q18.x + R-SF-2:** `<MidiaExecucaoPlayer>`
  exibe GIF/JPG/PNG via `<Image>` nativo (GIF anima em Android 9+) e
  vídeo `.mp4`/`.mov`/`.webm` via `<Video>` de expo-av com
  `shouldPlay+isLooping+isMuted` (Q18.x). Convive com música tocando
  em outras telas sem trilha de som concorrente. Empty state usa
  ícone Dumbbell quando `gif` é vazio. **R-SF-2:** mídia com URI
  inválida ou arquivo corrompido cai para `<EmptyStateMidia>` (ícone
  ImageOff + "Mídia indisponível") em vez de tela vermelha; o fallback
  é disparado pelo `onError` do `<Image>`/`<Video>` e preserva o
  `size` (sm omite o texto, só mostra o ícone).

### 3.4 ~~Fotos~~ (REMOVIDA em L1)
- Aba removida porque o FAB+ verde do MenuCapturaVerde já oferece
  "Foto" como ação de captura padrão, com mesma cobertura. Reduz
  superfície e mantém o átomo de UX.

### 3.5 Evolução corporal interna — M11.4 (integração Marcos × Medidas)
- Subseção "Evolução corporal" no topo da aba Evolução Corporal
  (3.2): faixa horizontal de cards mensais com foto frontal +
  peso + delta vs medida anterior. Tap em um card abre `/medidas`
  (Tela 13) com hint `?focus=YYYY-MM-DD`.
- Subtítulo "Última medida há N dias." em PT-BR (singular para
  hoje/ontem).
- Botão "Registrar evolução" no canto direito do header da seção
  navega direto para `/medidas/novo` (atalho coexiste com FAB
  verde unificado, que mantém "Adicionar marco" como ação
  primária da tab — limite de 1 ação extra por tab no protocolo
  M34.3).
- `MarcoSchema` extendido com `medidaRef?: string` opcional
  (slug `YYYY-MM-DD` em `medidas/`). `SheetNovoMarco` exibe
  bloco "Anexar evolução corporal" listando as 3 medidas mais
  recentes como chips selecionáveis (single, opcional). Marco
  salvo carrega o `medidaRef` no frontmatter quando escolhido.
- Recap (M36) consumirá esse vínculo agregando conquistas
  textuais com snapshots corporais por período.

### 3.7 Integração Health Connect Android — Q17 (Onda Q, 2026-05-13)

- App reconhecido em "Conexão Saúde" do Android nativo (Health
  Connect). Listado em "Apps conectados" quando o usuário aceita
  permissões.
- Pacote: `react-native-health-connect@^3.5.0` via Expo Config Plugin.
- Permissões declaradas em `app.json android.permissions`:
  - `READ_STEPS`
  - `READ_EXERCISE` + `WRITE_EXERCISE`
  - `READ_WEIGHT` + `WRITE_WEIGHT`
  - `READ_BODY_FAT` + `WRITE_BODY_FAT`
  - `READ_HEART_RATE`
  - `READ_SLEEP`
  - `READ_MENSTRUATION` + `WRITE_MENSTRUATION`
- Intent-filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
  aponta para `/_internal/health-rationale` (rationale UI explicando
  uso de cada tipo, ADR-0007 zero rede).
- Tela `/settings/integracoes`:
  - Card "Conexão Saúde (Android)" com status SDK (Disponível /
    Atualização necessária / Indisponível).
  - Botão "Conectar" abre sheet de permissões do sistema.
  - Após conectar: lista de tipos permitidos + botões "Abrir Conexão
    Saúde" e "Desconectar".
- Toggle `settings.featureToggles.healthConnectSync` (default `false`)
  liga sync automático Vault→HC:
  - `saveTreino` grava `ExerciseSessionRecord` (best-effort).
  - Hooks futuros (Q17.c.b/c) escrevem `WeightRecord`,
    `BodyFatRecord`, `MenstruationFlowRecord` quando salvar Medida/Ciclo.
- Sync reverso (HC → Ouroboros): `lib/health/sync.ts` expõe helpers
  `sincronizarTreinosDeHC`, `sincronizarPassosDeHC`,
  `sincronizarPesoDeHC` para Saúde Física → Evolução consumir
  registros externos (caminhada Mi Fit, peso balança inteligente, etc.).
- **Q17.d (Onda Q, 2026-05-13)** — bloco "Importados de Conexão
  Saúde" no topo da aba Saúde Física → Evolução. Três cards
  horizontais: passos dos últimos 7 dias com delta vs semana
  anterior, último peso registrado com delta vs leitura anterior,
  e contagem de treinos externos dos últimos 30 dias (tap abre
  sheet com a lista detalhada). Render condicional: só aparece
  quando `featureToggles.healthConnectSync` está ligado **e** há
  ao menos uma permission concedida. Pull on-demand no `focus` da
  tab. Dados não persistem no Vault (apenas RAM do hook). Erro
  silencioso: card individual mostra "Sem dados" se reader falhar.
  Hook canônico: `useHealthConnectResumo`. Helpers puros em
  `lib/health/resumo.ts` (`resumirPassos`, `resumirPeso`,
  `resumirTreinos`).

### 3.7.1 Meta de passos e badge ao vivo — R-INT-3-HC-NOTIF-META-PASSOS (2026-05-25)

- **Meta diária de passos** configurável (default 8000), persistida
  em `settings.metaPassosDia` (SecureStore). Ajustável por stepper
  +/- 1000 no card "Meta diária de passos" em `/settings/integracoes`.
  Setter `setMetaPassosDia` aplica clamp 1..100000.
- **Badge "X / Y passos"** na Tela Hoje (`<BadgePassos>`, abaixo de
  Próximos). Lê os passos de **HOJE ao vivo do Health Connect** via
  `lerPassosHojeHC` (`lib/health/passosHoje.ts`) — janela 00:00 BRT
  até agora. Não usa o Vault porque o autopull filtra o dia em curso.
  Render condicional: oculta quando `featureToggles.healthConnectSync`
  está off ou a leitura retorna `null` (sem módulo nativo / sem
  permissão / erro). Borda verde quando a meta é atingida, ciano caso
  contrário. Separador de milhar PT-BR.
- **Notificação silenciosa de meta** (`checarEnotificarMeta` em
  `lib/notifications/metaPassos.ts`): ao atingir a meta no dia,
  dispara notificação sem som "Meta de passos atingida" / "X passos
  hoje". Guard 1x/dia via SecureStore (`ouroboros.metaPassos.ultimoAviso`
  com a data local BRT). Disparada pelo próprio `<BadgePassos>` ao
  computar os passos. No-op em web/Expo Go.

### 3.8 Hub de Integrações — R-INT-1 (2026-05-16)

- Rota canônica `/integracoes` agrega todos os serviços externos
  suportados em uma só tela. Acessível pelo menu lateral seção
  "Utilitários", ícone `Plug` laranja.
- Cinco cards renderizados:
  - **Saúde Física** (Health Connect Android, Q17) — estado
    Conectado / Desconectado / Indisponível baseado em
    `getSdkStatus` + contagem de permissions. Texto status traz
    sufixo `(sync ligado)` ou `(sync desligado)` espelhando o
    toggle `featureToggles.healthConnectSync`. Tap navega para
    `/settings/integracoes` (detalhe completo de HC mantido para
    retrocompat).
  - **Agenda** (Google Calendar, Q22.B/M37.1) — estado Conectado
    se qualquer pessoa (`pessoa_a` ou `pessoa_b`) tem
    `accessToken` válido. Última sincronização vem de
    `max(ultimaConexao_a, ultimaConexao_b)`. Tap navega para
    `/settings/contas-google` (gerencia OAuth detalhado).
  - **Spotify** (R-INT-4 futura) — placeholder, badge "Em breve",
    desabilitado.
  - **YouTube** (R-INT-4 futura) — placeholder, badge "Em breve",
    desabilitado.
  - **Google Drive** (futura) — placeholder, badge "Em breve",
    desabilitado.
- Decisão técnica R-INT-1: o hub é **read-only sobre stores
  existentes** (`useGoogleAuth`, `useSettings`, helpers de HC
  `availability`/`permissions`). Não recria fluxo OAuth nem
  lógica HC; apenas agrega estado e oferece navegação.
  Retrocompat com `/settings/integracoes` é total (rota antiga
  continua entregando o detalhe rico de HC entregue em Q17).
- Componente: `src/components/screens/IntegracoesScreen.tsx`
  + wrapper em `app/integracoes.tsx`.

## 4. Exercícios — M13 (Telas 02, 07, 08)

- Galeria de exercícios cadastrados (CRUD).
- Cadastro: nome + GIF/foto opcional + grupo muscular +
  descrição.
- Detalhe: histórico de uso + estatísticas.

## 4.5 Rotinas — Q11.a+b+c (Onda Q) + R-ROT-2 (Onda R, escopo expandido)

**R-ROT-2 (2026-05-21):** Rotinas deixaram de ser apenas treino. O
mesmo schema/CRUD serve para **qualquer recorrência**: medicação,
hábito, leitura, saúde física. O campo `categoria` no schema
discrimina o tipo; a UI de criação mostra **chips de categoria**
visíveis no topo e **templates pré-preenchidos** ("Tomar remédio",
"Tomar água", "Caminhar 30min") para baixar a barreira de quem não
quer cadastrar um treino completo. Empty state ampliado lista
exemplos não-exercício.

- Template reutilizável com nome + descrição opcional + lista
  ordenada de exercícios (séries × reps × carga_kg + descanso_seg
  + observação). Cap 20 exercícios. Para rotinas não-treino
  (medicação, hábito) os "exercícios" funcionam como passos/doses
  genéricos (ex: "1 comprimido", "Copo de água").
- `ExercicioRotinaSchema.reps` é string livre (`"12"`, `"8-10"`,
  `"amrap"`, `"ate falha"`, `"30min"`); `sessaoFromRotina` converte
  para number via piso de faixa + fallback 10.
- **Categoria canônica** (R-ROT-2, enum fechado em
  `src/lib/schemas/rotina.ts`):
  - `medicacao` → "Medicação"
  - `saude_fisica` → "Saúde física"
  - `habito` → "Hábito"
  - `outro` → "Outro" (default; aplicado a rotinas legacy sem o
    campo via `z.enum(...).default('outro')`, retro-compat
    silenciosa)
- **Templates pré-preenchidos** (R-ROT-2, em `app/rotinas/novo.tsx`):
  - "Tomar remédio" → categoria `medicacao` + dose genérica
  - "Tomar água" → categoria `habito` + copo
  - "Caminhar 30min" → categoria `saude_fisica` + 30min livre
  - Tap em template preenche nome, descrição, categoria e um
    passo inicial; usuário pode editar antes de salvar.
- CRUD em `/rotinas` (`index`, `novo`, `[slug]`) com filtro por
  autor (`pessoa_a` vê só rotinas próprias). Slug único garantido
  via `slugifyTitulo` + `sufixoRandom` (50 tentativas).
- Selecionável no `SheetNovoTreino` via `<SeletorRotina>` em 2º
  BottomSheet (Q15: sheet de baixo fecha antes de abrir o de cima,
  anti-empilhamento). Modal "Substituir treino atual?" quando há
  edição em curso. (Continua mostrando todas as rotinas — o
  seletor não filtra por categoria; cabe à pessoa escolher.)
- **Snapshot imutável**: editar rotina NÃO afeta sessões já
  registradas. `sessaoFromRotina` retorna cópia mapeada via
  `.map`.
- Path canônico H2: `markdown/rotina-<slug>.md` (frontmatter
  validado com `_schema_version: 1`).
- Entry "Rotinas" no MenuLateral seção "Utilitários" (Q14).
- **Executor Q11.c** em `app/treinos/executar/[slug]`:
  state machine `executando` → `descansando` → `concluido`.
  Timer regressivo do descanso (default `exercicio.descanso_seg`,
  ajustável +/-10s, botão "Pular descanso"). Ao concluir todos
  exercícios, salva uma TreinoSessao no Vault como snapshot imutável.
  Botão "Iniciar" pill verde no header de `/rotinas/<slug>`.

## 4.6 Grupos de Treino — Q19 + Q19.b (Onda Q 2026-05-13)

- Container que agrupa 1..10 rotinas existentes (Treino A/B/C
  sob "Treino do Quaresma" sem duplicar dados).
- Schema `GrupoTreinoSchema` em `src/lib/schemas/grupo_treino.ts`:
  referência por slug (`rotina_slugs: string[]`), sem embedding.
- Path canônico: `markdown/grupo-<slug>.md`.
- CRUD vault em `src/lib/vault/grupo_treino.ts`.
- Rotas `/grupos/`:
  - `index` com FAB+, empty state, lista ordenada PT-BR.
  - `novo` — `FormGrupo` (Input nome + Textarea descrição +
    `SeletorMultiRotinas` multi-select 1..10) + slug único.
  - `[slug]` — detalhe com mesmo `FormGrupo` em modo edição,
    botão "Apagar" (modal confirm) e pill verde "Iniciar" no
    right slot do header.
- **Iniciar treino**: tap na pill verde abre `BottomSheet`
  `SeletorTreinoDoGrupo` listando cada rotina referenciada. Tap
  em uma rotina navega para `/treinos/executar/<slug>` (executor
  Q11.c). Caso o grupo tenha apenas 1 rotina, o sheet é pulado
  (navegação direta).
- Rotinas removidas após a criação do grupo aparecem desabilitadas
  no sheet ("Rotina removida (slug)") sem quebrar a UI.

### 4.6.1 Exposição em Saúde Física — R-SF-1 (Onda R 2026-05-16)

Os mesmos Grupos da seção 4.6 são acessíveis **diretamente em
`/saude-fisica`** sem passar por `/grupos`:

- A `SaudeFisicaScreen` ganhou uma 4ª tab **"Grupos"** ao lado de
  Treinos / Evolução / Exercícios. A tab lista os grupos do autor
  (mesmo store `listarGrupos`) e usa empty state canônico "Crie um
  grupo para reunir várias rotinas (Treino A, B, C).".
- Tap em um card de grupo navega para `/grupos/<slug>` (rota
  existente Q19.b com edição + pill "Iniciar").
- O FAB+ verde (`MenuCapturaVerde`) recebe duas ações contextuais
  novas:
  - **"Iniciar treino"** (fixa, visível em qualquer tab de Saúde
    Física): abre o `BottomSheet` `SeletorGrupoTreino` que lista os
    grupos; ao escolher, navega para `/grupos/<slug>` reusando a
    lógica de iniciar Q19.b (1 rotina = direto, N rotinas = sheet
    `SeletorTreinoDoGrupo`).
  - **"Novo grupo"** (contextual, quando a aba Grupos está ativa):
    navega para `/grupos/novo`.
- Idempotência: alterações feitas via `/grupos/*` ou via a aba em
  `/saude-fisica` compartilham o mesmo `listarGrupos` /
  `escreverGrupo`. `useFocusEffect` recarrega ao voltar.

## 5. Medidas Corporais — M12 (Telas 12, 13)

- Form: peso, cintura, quadril, peito, braço, coxa, gordura
  corporal.
- Comparativo lado-a-lado (atual vs anterior, delta numérico +
  cor).
- Slider de fotos comparativas (frente / lado / costas).
- Persiste em `medidas/YYYY-MM-DD.md`.
- M11.4 expõe a faixa de evolução também na aba Marcos
  (subseção 3.4) e permite vincular um marco a uma medida via
  `medidaRef` opcional em `MarcoSchema`.

## 6. Mini-painéis de leitura

### 6.1 Mini Humor — M10 (Tela 21)
- Heatmap 13×7 = 91 dias.
- Modo único pessoa_a, único pessoa_b, ou **sobreposto** 50%
  opacity.
- Stats 30d (média, registros, melhor/pior dia).
- Modal detalhe do dia.
- Lê `humor-heatmap.json` gerado pelo backend (cache canônico).

### 6.2 Mini Financeiro — M14 + M35 (Tela 22, **DESLIGADO em v1.0**)
- v1 (M14, mantido como código morto): Hero gasto da semana + top
  categorias + lista virtualizada de 20 transações lendo
  `financas-cache.json` gerado pelo backend.
- v1.0 release (M35): a aba `MiniFinanceiroScreen` renderiza apenas um
  EmptyState honesto com a frase **"Em desenvolvimento. Disponível em
  versão futura."**. Não consome o cache backend (que ainda não é
  publicado no Vault).
- Item "Finanças" é removido do menu lateral por padrão. Volta a
  aparecer quando o usuário liga o toggle **"Mostrar finanças em
  desenvolvimento"** em Settings → Features opcionais (default OFF).
- `useFinancasCache`, `lerFinancasCache` e
  `src/lib/schemas/financas-cache.ts` ficam marcados como
  `@deprecated v1.0 (M35)`. Os componentes `BannerLeitura`,
  `CardHero`, `CardTopCategorias` e `ListaTransacoes` permanecem no
  repositório, sem consumidores, prontos para retomada futura.

### 6.3 Galeria unificada (Vault Explorer) — Q9 (entregue)

Tela acessível pelo item **Galeria** do menu lateral (seção "Acesso
Rápido"). Mostra **todos os registros salvos no Vault** agrupados
visualmente em um grid de 2 colunas, com filtros rápidos por tipo:

- **Tudo** — todos os tipos canônicos.
- **Fotos** — apenas `markdown/foto-*.md` (companion das imagens).
- **Áudios** — apenas `markdown/audio-*.md`.
- **Vídeos** — apenas `markdown/video-*.md`.
- **Textos** — diário emocional, frases e notas (texto livre).
- **Mais** — humor, ciclo, eventos, marcos, tarefas, alarmes,
  contadores, exercícios e documentos.

Cada card mostra título curto (derivado do frontmatter ou
humanização do slug), data formatada `dd/mm/aaaa` e a tag do tipo
com cor de acento sóbria (faixa lateral de 3dp, ADR-0005). Tap no
card abre `/galeria/detalhe/[slug]` com visualização read-only do
frontmatter completo e do corpo .md.

Implementação: `src/lib/vault/galeria.ts` itera `markdown/` uma
vez, filtra por prefixo canônico de feature e lê apenas o
frontmatter de cada item (não carrega binários — performance
crítica). Ordenação desc por data, tie-break por slug asc. Arquivos
malformados são silenciosamente ignorados (mesmo padrão de
`listarRegistrosCiclo`).

## 7. Recap (Lista + Calendário) — M36 + L2 (entregue)

> Unificado em L2 (`M-RECAP-CALENDARIO-UNIFICAR`, ADR-0021,
> 2026-05-07): a antiga seção 8 ("Calendário Visual de Conquistas
> — M11.5 / Tela 25") foi consolidada aqui como **modo Calendário**
> do Recap. A rota top-level `/calendario` foi apagada; o item
> "Calendário" do menu lateral foi removido. Subrota
> `/calendario/[id]` (detalhe individual da conquista) permanece
> intacta, acessada via tap em `<ConquistaCard>` dentro do modo
> Calendário.

- Rota modal raiz `/recap`, acessível via item "Recap" do menu
  lateral (M27).
- **Toggle de modo no header** (L2): par de botões pill
  alternando entre **Lista** (default) e **Calendário**.
  Animação de fade do conteúdo via Reanimated puro
  (`useSharedValue` + `withTiming`) — não Moti, mitigando A28.
- **Modo Lista** — comportamento M36 preservado: chips de período
  + 5 seções empilhadas em ScrollView.
- **Modo Calendário** — calendário mensal
  (`react-native-calendars` com locale PT-BR registrado em
  M37.1.1) com dots roxos nos dias que têm conquistas. Tap em um
  dia mostra a lista vertical de `<ConquistaCard>` daquele dia
  abaixo do calendário. Reusa `useConquistas` (loader do Vault +
  filtros — os 5 filtros M11.5 ficam no estado, exposição visual
  embutida volta em sprint subsequente).
- Períodos selecionáveis (modo Lista) via `<ChipGroup mode="single">`:
  **Dia** (00:00–23:59:59 do dia local atual), **Semana** (últimos 7
  dias), **Mês** (últimos 30 dias), **Ano** (últimos 365 dias) e
  **Personalizado** (dois inputs `AAAA-MM-DD`). O período inicial
  respeita o query param `?periodo=dia|semana|mes|ano` quando o Recap
  é aberto pela Tela Hoje (`router.push('/recap?periodo=dia')` —
  R-RECAP-PERIODO-DIA, 2026-05-21). Sem param o default histórico é
  `semana`.
- 5 seções no modo Lista:
  - **Conquistas** — vitórias do diário (`modo='vitoria'`), eventos
    positivos, marcos, contadores em sequência (≥ 7 dias) e tarefas
    concluídas no período.
  - **Crises** — triggers do diário e eventos negativos, ordenados
    por intensidade desc. Microcopy: "Você passou por isso e está aqui."
  - **Evoluções** — humor médio (a partir de 2 registros), treinos
    concluídos no período (sessões + minutos totais), contadores em
    alta (sequência ≥ 30 dias).
  - **Tarefas concluídas** — detalhe agrupado por categoria
    (Trabalho, Casa, Rotina, Finanças, etc.), com data abreviada
    (`seg 28/04`). Subtotais por categoria. Pendentes ignoradas.
  - **Números** — grid 2×3 de cards: registros, treinos, fotos,
    eventos positivos, eventos difíceis, tarefas concluídas. Cada
    card é Pressable (Q24.a) e abre `/recap-lista?tipo=<chave>&de=…&ate=…`
    preservando o período do Recap (R-RECAP-2 revalidou 100% e
    padronizou accessibilityLabel sem acento — `<count> <tipo> no periodo`).
    Tap em "fotos" redireciona para `/galeria?filtro=foto`
    (R-CROSS-FLOW-AUDIT).
- Seções integrativas adicionais (calculadas no container, injetadas
  por prop, render condicional próprio — ocultam-se sem dado):
  - **Saúde essa semana** (R-INT-3-HC-RECAP-CARD) — passos, treinos,
    sono e última medida vindos do autopull Health Connect; cada linha
    navega para a rota canônica do dado.
  - **Agenda essa semana** (R-INT-2-CALENDAR-RECAP-CARD) — total de
    eventos do Google Calendar no período (cache local `.md`, soma
    pessoa_a + pessoa_b) com resumo "N dias com compromisso · próximo:
    <título>". Card clicável navega para `/agenda`. Oculta sem evento.
    Agregador `calcularAgendaRecap` em `src/lib/recap/agenda.ts`. O
    resumo é por contagem de dias (não por organizador — o
    `AgendaEventoSchema` não tem campo organizador).
  - Ambas entram no predicado de "recap vazio" (`temDadoSaude` /
    `temDadoAgenda`): usuário com somente esse dado vê a seção, não o
    EmptyState.
- **Insight semanal de passos** (R-INT-3-HC-INSIGHT-SEMANAL) — card no
  topo do Recap (antes de todas as seções) com uma frase factual e
  sóbria quando a soma de passos dos últimos 7 dias supera a dos 7 dias
  anteriores. Ex.: "Você caminhou 18% mais que a semana passada."
  **POSITIVE ONLY (ADR-0005):** nunca gera comparativo negativo — se o
  delta for ≤ 0 ou abaixo do limiar (5%), o card não renderiza. Exige
  ao menos 3 dias com registro em cada janela para evitar base ruim.
  Agregador `calcularInsightSaude` em `src/lib/recap/insights.ts`;
  componente puro `CardInsightSaude`. Decoração: não entra no predicado
  de "recap vazio" (`totalRecap`).
- `<OuroborosLoader compacto />` durante agregação (vault grande pode
  levar 1-3s para o período "Ano").
- Empty state silencioso por seção; "Nenhum registro neste período."
  quando o agregado total é zero.
- Sem cache: cada abertura relê todo o vault dentro do período.
- Tom esperançoso, ADR-0005 sem gamificação: nenhuma celebração,
  nenhum badge, nenhum comparativo "X% melhor".
- Filtro de tarefas: `feito === true && feito_em ∈ [de, ate]`.
- Helpers de leitura novos: `listarHumor`, `listarDiarios`,
  `listarEventos` (`src/lib/vault/`).

### 7.1 Modo Memórias (slideshow Wrapped) — Q24.b / R-RECAP-3 a R-RECAP-6

Slideshow full-screen estilo Instagram Stories/Spotify Wrapped acessado
do Recap. Rota: `/recap-memorias?de=…&ate=…`.

- **Slides candidatos** gerados por `useRecapMemorias` a partir do
  agregado de `useRecap`: abertura, números (registros/treinos/tarefas),
  vitórias com frase principal, mídias capturadas (fotos/áudios/vídeos),
  crises/triggers, encerramento.
- **Auto-advance configurável** (R-RECAP-4) via
  `settings.recap.slideshowIntervaloS` (default 4s, range 2-10s).
- **Tap-right avança, tap-left volta, long-press pausa** (zonas
  invisíveis sobre o conteúdo).
- **Background animado** entre 3 cores do gradient
  `colorsMemorias.bgGradient` (roxo → magenta → cyan). Re-anima
  ciclicamente via Reanimated puro.
- **Ken Burns** (R-RECAP-4): 4 presets rotativos determinísticos por
  hash do slide id; respeita `pausado`.
- **Frase de transição** rotativa por slide id (pool curado, sem
  exclamação nem comparativo).
- **Áudio ambient embutido CC0** (R-RECAP-4): toggle off por default
  via `settings.featureToggles.recapAmbientAudio`. Loop com fade-in/out
  500ms ao pausar/fechar.
- **Áudio anexado por slide** (R-MEDIA-2): slides `vitorias`/`crises`
  carregam `audioPath` da última conquista/trigger relevante; tocam em
  cross-fade com o ambient. Toggle on por default via
  `settings.featureToggles.recapAudioAnexadoAutoplay`.
- **Header**:
  - Esquerda: Pausar (Play/Pause toggle) + Compartilhar (R-RECAP-6,
    `Share2`, left=64dp, ao lado direito do Pausar).
  - Direita: Fechar (X) — volta ao Recap.
- **Compartilhamento** (R-RECAP-6, 2026-05-16): tap em Compartilhar
  pausa o slideshow, captura o slide visível como PNG **1080×1920**
  (formato Instagram Stories, dimensões forçadas via
  `react-native-view-shot` `captureRef` com `width`/`height`), salva
  em `cacheDirectory/recap-share-<slideId>-<timestamp>.png` e dispara
  share intent nativo via `expo-sharing` (`mimeType: 'image/png'`,
  `dialogTitle: 'Compartilhar'`). **Export efêmero** — não persiste
  no Vault. Cleanup do PNG temp após o share sheet fechar
  (best-effort). Em web devolve toast "Compartilhamento indisponível.";
  erros de captura mostram toast "Não foi possível capturar." sem
  travar a UI. Double-tap protegido pelo estado `compartilhando`.
- **Tom ADR-0005** preservado: zero exclamação, frases de testemunha
  calma ("Você esteve presente.", "Passaram por aqui.", "Continue.").
- Paleta `colorsMemorias` exclusiva (gradient + dourado pálido)
  — quebra visual intencional vs cotidiano sóbrio Dracula.

## 8. Calendário Visual de Conquistas — consolidado em §7 (L2)

> **Histórico:** M11.5 / Tela 25 entregou esta tela como rota
> top-level `/calendario` com grid mensal, filtros e timeline
> horizontal de cards. ADR-0021 (L2, 2026-05-07) consolidou a
> ideia em **modo Calendário do Recap** (§7 acima). A subrota
> `/calendario/[id]` (detalhe individual) permanece como destino
> de `<ConquistaCard>`. O componente legacy
> `CalendarioConquistasScreen` foi removido. A `<Timeline>`
> horizontal foi substituída pela visão calendário mensal +
> lista vertical do dia selecionado.

## 9. Tela Hoje — M02 → M40 (Tela 01)

### 9.1 v1 (M02)
- Lista do dia: humor + diário + eventos.

### 9.2 v2 — M40 (entregue)
- **Header** com avatar(es) + botão "Recap" no canto superior
  direito. Modo sozinho: 1 avatar (md). Modo casal: 2 avatares
  pequenos lado a lado (purple e pink).
- **Recap** abre rota `/recap` (criada pela M36).
- **Status do casal** — só renderiza em modo casal/duo. Mostra 2
  cards lado a lado com foto, nome (via `useNomeDe`), humor 1-5 ou
  "—" e última atividade do dia ("Última: 14:30 evento" / "Última:
  09:15 humor"). Sem comparativo, sem julgamento (ADR-0005).
- **Próximos** — agrega três fontes em timeline única ordenada
  cronologicamente, limitada a 3 itens (R-HOME-1 estabeleceu o
  contrato visual): eventos da agenda Google (M37.1.2 - cache local
  pós sync OAuth), alarmes pessoais (M16/M30) cujo próximo disparo
  cai nas próximas 4h e tarefas (M17/M31) com alarme vinculado
  ainda hoje. Lista compacta com micro-ícone de origem + hora à
  esquerda + título; cor diferencia evento (purple/`Calendar`),
  alarme (cyan/`Bell`) e tarefa (green/`Check`). Devices sem OAuth
  conectado: graceful fallback mostrando apenas alarmes/tarefas,
  sem mensagem de erro de auth (R-HOME-2).
- **Humor do dia** — mantida.
- **Esta jornada** — substitui as duas listas separadas
  (Diário emocional + Eventos) por uma timeline cronológica única
  ordenada por hora descendente. Cor da borda: vermelho para
  trigger/negativo, verde para vitória/positivo.
- **`useHoje` aceita filtro `para`** (`'todos'` | `'mim'` |
  `'pessoa_a'` | `'pessoa_b'` | `'casal'`) para futuras telas que
  precisem segmentar por destinatário emocional sem reescrever o
  hook.
- Botão "Ver storybook de componentes" gateado em `__DEV__` (some
  no release APK).

### 9.3 v3 — R-HOME-1 + R-HOME-3 (2026-05-15 / 2026-05-16, ADR-0026)

**Decisão D1=C**: a Tela Hoje vira foco em ação. Status do Casal,
Humor do dia (sliders disabled) e Esta jornada (timeline) foram
removidos por redundância com Recap. O usuário entra na Home pra
agir, não pra ler retrospectiva.

Layout R-HOME-1:
- **Cabeçalho** com data por extenso ("Quarta, 16 de maio") +
  pílula "Reflexão" (cyan) que abre `/diario-emocional?modo=reflexao`.
- **Saudação personalizada** ("Boa noite, <nome>") em fg.
- **Próximos** (mantido, sem mudança).
- **To-do hoje** — até 5 tarefas pendentes em lista compacta com
  checkbox inline. Empty state breve "Sem tarefas pendentes. Toque
  + para criar." Long-press na lista navega para `/todo` (CRUD
  completo).
- **Botão Recap** centralizado em pill roxa. Abre
  `/recap?periodo=dia` (R-RECAP-PERIODO-DIA, 2026-05-21) para fechar
  o ciclo Tela Hoje → Recap do dia atual; demais períodos seguem
  acessíveis via ChipGroup dentro do Recap.
- Header simples ("Hoje"); sem avatar (filtro de pessoa vive no
  MenuLateral).

R-HOME-3 (refinamento do checkbox de R-HOME-1):
- **CheckboxTarefaInline 32dp** (`src/components/tarefas/`) com
  hitSlop 16dp → área efetiva 64dp (WCAG AAA).
- **Animação Moti spring** (`springs.snappy`) no toggle e no ícone
  Check, sem timing linear (ADR-010).
- **Strike-through** + cor `muted` no título quando feita.
- **Persistência otimista**: UI atualiza antes do `marcarFeito`
  resolver no vault. Em erro, rollback automático + haptic erro.
- **Toast "Desfazer" 5s** (`useToastUndo` em `src/lib/hooks/`)
  padrão Material Design. Tap reverte o estado e refaz o save.
  Só aparece quando o usuário marca como **feita** (reabrir
  manual feito→pendente não precisa de undo).

`accessibilityRole="checkbox"` + `accessibilityLabel="marcar tarefa
<titulo>"` (sem acento — convenção screen reader) +
`accessibilityState={ checked }`.

## 10. Opt-ins (toggle on em Settings, default ON)

### 10.1 Acompanhador de Ciclo Menstrual — M14.5 + R-NAV-1

- Calendário mensal com fases (menstrual / folicular / ovulatória
  / lútea).
- Tom sóbrio, sem gamificação.
- Sintomas opcionais.
- Persiste em `ciclo/YYYY-MM-DD.md`.
- **R-NAV-1 (2026-05-17):** botão "Registrar hoje" inline do rodapé
  foi removido. FAB+ verde canônico (`MenuCapturaVerde`) hospedado na
  tela `/ciclo` ganhou a ação contextual "Registrar ciclo", que abre o
  `SheetRegistroCiclo` (3 atalhos: Registrar hoje, Adicionar sintoma,
  Anotação livre — todos para `/ciclo/registrar`). Padronização com
  Saúde Física e demais telas; alinhamento vertical via
  `useSafeBottomMargin`.

### 10.2 Alarme Pessoal — F-15 / M16 + M30 v2

- CRUD de alarmes.
- **Recorrência** (M30): única / diária / semanal / mensal.
- Categoria: medicação / treino / outro.
- **Som** CC0: suave / normal / forte.
- **Soneca** configurável.
- **Channel Android v2** com `vibrationPattern: [0,250,500,250]`.
- Notification actions: "Soneca" / "Desligar" — listener canônico
  registra histórico de soneca + agenda re-disparo (R-ROT-1-A,
  2026-05-21).
- **Sugestão temporal de horário** (R-ROT-1-A): após 3 sonecas
  recentes consistentes (≥80% mesma duração), banner em
  `/alarmes/[slug]` propõe mover o alarme; aceitar atualiza
  horário, rejeitar silencia por 30 dias.
- Migração one-shot lembretes v1 → alarmes pré-cadastrados off
  (M30).

### 10.3 To-do Leve — F-16 / M17 + M31 v2

- CRUD de tarefas.
- **Categoria** (M31): trabalho / casa / rotina / finanças /
  desenvolvimento pessoal / obrigações / saúde / outro.
- **Pessoa destino** (M31): mim / outra / casal / terceiro (com
  nome).
- **Alarme vinculado** opcional (cria companion em
  `alarmes/<slug>-alarme.md`).
- Drag & drop reordering.
- Busca por título.
- **Aba Concluídas** collapsable (default colapsada se >5 itens).
- **Long-press em concluída**: Reabrir / Apagar definitivo.
- Lixeira soft (apagar não é definitivo até 30 dias).

### 10.4 Contador "Dias sem X" — F-17 / M18 + M32 v2 + R-RECAP-5

- CRUD de contadores.
- Reset preserva histórico (recorde + lista de resets).
- **Mensagens de apoio** sóbrias (M32) em 6 faixas: 0 / <5 / <30
  / <100 / <365 / ≥365 dias.
- **Indicador de marcos** discreto: 5d / 30d / 100d / 365d
  (cinza-violeta 11dp letter-spacing 1, sem cor de festa).
- Campo `para` (M33).
- **Eventos pontuais do Contador** (R-RECAP-5, 2026-05-16): cada
  contador aceita registros pontuais com humor (slider 1-5),
  descrição livre (até 280 caracteres), tags (até 5 de 16 chars
  cada com acentuação PT-BR) e mídias opcionais (foto, áudio,
  Spotify, YouTube). Persistido em
  `markdown/evento-contador-<contadorId>-<YYYY-MM-DD>-<slug>.md`
  com schema `evento_contador` versão 1. Exibido como timeline
  vertical na tela de detalhe do contador, com slideshow básico
  quando há fotos. Sem celebração visual (ADR-0005): cards são
  cyan discreto, mesmo padrão dos demais Recap.

## 11. Configurações — M15 + M29

- **Som e vibração** (M29 v2): mestre `geral` + 3 contextuais
  (`despertar` / `conquista` / `botões`). Geral off silencia tudo.
- **Pessoa**: vault compartilhado on/off, editar nomes/fotos,
  reinicializar pasta do Vault, adicionar segunda pessoa.
- **Opcionais**: 6 toggles default ON.
- **Privacidade**: biometria ao abrir / ocultar transcrições /
  `widgetMostraNome` (off por default).
- **Mídia**: cap por registro (default 4), permitir áudio.
- **Dados**:
  - **Exportar todos os meus dados** (M15 + M-EXPORT-COMPLETO): gera
    ZIP no `cacheDirectory` com todos os `.md` recursivos das 19
    subpastas canônicas, todos os binários (jpg/m4a/mp4/pdf) com
    bytes preservados, todos os companion `.md` (M34/M39), o cache
    `.ouroboros/cache/*.json` e um snapshot `snapshot-settings.json`
    com `useSettings` + `useOnboarding` + `usePessoa`. Manifest
    `MANIFEST.json` na raiz lista cada arquivo com sha256 para
    verificação no restore.
  - **Importar backup** (M-EXPORT-COMPLETO): document picker para
    `.zip`, valida cada arquivo via sha256 do MANIFEST antes de
    escrever, restore default não-destrutivo em
    `restaurado-<YYYY-MM-DD>/` (sobrescrever o Vault existente exige
    confirmação explícita do usuário). Schema versionado
    (`EXPORT_SCHEMA_VERSION = 1`).
  - **Limpar cache local**: remove `ouroboros-export-*.zip` do
    cacheDirectory (M15).
- **Sobre**: versão, contribuidores anônimos, ADRs.

## 12. Widget Homescreen Android — M20 (Tela 26)

- Módulo Expo nativo (Glance JetPack).
- 2 layouts: 4×2 (compacto) e 4×4 (expandido).
- Mostra humor do dia + nome (configurável via
  `widgetMostraNome` toggle) + 1 alarme próximo.
- Bridge JS → atualizar widget ao registrar humor.

## 13. Calendário Google — M37.1 (entregue 2026-05-05) + M37.2 (todo)

- OAuth via `expo-auth-session` com **split clientId** Expo Go
  (proxy `auth.expo.io`) vs dev-client/release (custom-scheme
  `ouroboros://oauth-callback`). Detecção automática via
  `Constants.appOwnership`. Armadilha A21.
- **Leitura — M37.1** (entregue 2026-05-05, Nível A validado):
  rota raiz `/agenda` mostra eventos dos próximos 30 dias com 5
  estados explícitos:
  - `nao-conectado` — empty + botão "Conectar conta Google".
  - `conectando` — `<OuroborosLoader compacto>`.
  - `online` — `<CalendarGrid>` mensal Dracula com dots por
    dia + lista de "Eventos do dia" abaixo.
  - `offline` — banner "Sem conexão. Mostrando eventos do
    cache." sobre UI normal (cache stale aceito).
  - `invalido` — banner vermelho "Sua conexão Google
    expirou. Reconecte." + botão de reconectar.
- **Escrita — M37.2** (todo, depende M37.1): criar / atualizar
  / deletar evento. Pede reconsentimento subindo escopo de
  `calendar.events.readonly` para `calendar.events`.
- **Cache em arquivo** `media/cache/agenda-<pessoa>.json` no
  Vault (Armadilha A20 — tokens só em SecureStore, eventos em
  arquivo). TTL 1h com fallback stale-while-revalidate.
- **Escopo mínimo M37.1**: `https://www.googleapis.com/auth/calendar.events.readonly`.
- **Sub-tela** `/settings/contas-google`: lista contas
  conectadas por pessoa, email, "Conectado há X dias", botão
  Revogar.
- **Privacidade absoluta**: tokens só em SecureStore local
  (chave `ouroboros.google.v1`). Sem servidor próprio, sem
  proxy, sem analytics. Documentado em ADR-0018.
- **Credenciais**: `client_id` lido de `env.json` (gitignored)
  via `import env from '../../env.json'` — nunca hardcoded
  nem em env vars de bundle. Pacote `com.ouroboros.mobile`
  + SHA-1 cadastrado no Google Cloud Console.
- **Locale PT-BR completo (M37.1.1, fechada 2026-05-05)**:
  header "Maio de 2026", dias "Dom Seg Ter Qua Qui Sex Sáb",
  registro em `src/components/agenda/calendarLocalePtBr.ts`.
- **Persistência canônica em `.md` individual (M37.1.2,
  fechada 2026-05-05 — ADR-0019)**: cada evento espelhado do
  Google Calendar é um `.md` próprio em
  `agenda/<pessoa>/YYYY-MM-DD-<eventId>.md`, com frontmatter
  zod (`AgendaEventoSchema`). Boot hook idempotente migra
  caches JSON legados de M37.1 para o novo formato. Sem
  mudança de UX.
- **Sub-sprints ainda abertas**:
  - M37.1.3 (bug-fix corretivo — mock dev-web de
    `calendarApi.listarEventos` para o fluxo "Conectar"
    funcionar end-to-end no Gauntlet).
  - M37.1-checkpoint-nivel-B (OAuth real no emulador, 3
    screenshots — APK fresh `dev-client-20260505-91710ab.apk`
    pronto em `builds/`).

## 14. Compartilhamento via Syncthing — M38 (4 dispositivos)

- **`deviceId` por instalação** — gerado uma única vez no primeiro
  uso e persistido em SecureStore (`ouroboros.device.id`,
  `ouro-<6chars>` alfanuméricos). Cabe em < 32 bytes (limite A20).
  Reinstall sem backup gera novo deviceId; o antigo fica marcado
  como `substituido_por: <novoId>` no devices index para o usuário
  entender a transição em Settings.
- **Conflict resolution via suffix de deviceId no slug do arquivo
  `.md`** — caminho feliz mantém nome canônico
  (`markdown/humor-YYYY-MM-DD.md`); colisão real entre devices via Syncthing
  aplica `<canonico>-<deviceId>.md` (cobre 4 nós). Substitui o
  legado `-pessoa_<a|b>.md` (cobria só 2 devices) em humor / diário
  emocional / eventos / tarefas / contadores / alarmes.
- **Backward-compat**: arquivos legados `-pessoa_a.md` /
  `-pessoa_b.md` continuam sendo lidos pelos listers (filtram por
  basename data sem olhar suffix). M38 só altera o futuro padrão de
  naming.
- **Devices index** em `markdown/_devices.md` — registra cada deviceId
  com `nome_amigavel` (editável), `pessoa`, `primeira_atividade`,
  `ultima_atividade`, `substituido_por`. Last-write-wins por subkey
  via Syncthing (cada device sobrescreve só sua própria entrada).
- **Boot hook `atualizarDeviceIndex`** atualiza
  `ultima_atividade` do deviceId atual a cada boot do app.
  Idempotente, swallow-erro tolerado (CONTRACT §7.9).
- **Sub-tela Settings → Pessoa → "Dispositivos pareados"**
  (`/settings/dispositivos`) — lista todos os deviceIds com
  nome amigável editável, marca o atual com "(este aparelho)" e
  inativos com "(inativo)".
- **Suporta até 4 dispositivos pareados** (2 desktops + 2 celulares).
  36^6 = 2.1 bi combinações de deviceId; zero risco de colisão.
- **Política Last-Write-Wins por timestamp** + suffix de deviceId
  para preservar ambos quando há colisão genuína.
- **Zero rede** (ADR-0007): detecção é local via varredura do Vault.
  Syncthing é externo e gerenciado pelo usuário.

## 15. Estrutura de mídia — M39 (formaliza ADR-0017)

- Pasta canônica `media/<categoria>/<data-rand>.<ext>`.
- Categorias: `fotos` / `audios` / `videos` / `frases` / `scanner`
  (PDFs multipágina, A3.x.4) / `avatares` (sem companion, exceção
  ADR-0017).
- **Companion `.md`** sempre acompanha o binário, com YAML
  frontmatter:
  - `tipo` (`midia_foto` / `midia_audio` / `midia_video` /
    `midia_frase` / `midia_pdf`)
  - `arquivo` (basename do binário)
  - `data` (ISO datetime)
  - `autor` (`pessoa_a` / `pessoa_b`)
  - `para` (`mim` / `outra:pessoa_<a|b>` / `casal`)
  - `legenda` (opcional, texto livre)
  - `transcricao` (opcional, áudio)
  - `duracao_seg` (opcional, áudio/vídeo)
  - `medida_ref` (opcional, reverse-link para `medidas/YYYY-MM-DD.md`)
  - `origem` / `origem_ref` (opcionais, schema-mãe que originou o
    binário — ex: `evento`, `diario_emocional`)
- **Schema zod canônico:** `MidiaCompanionSchema` em
  `src/lib/schemas/midia-companion.ts` (M39, ADR-0017). Reexportado
  no barrel `src/lib/schemas/index.ts`.
- **Helpers canônicos** em `src/lib/vault/midiaCompanion.ts` (M39):
  - `escreverMidiaComCompanion(vaultRoot, binarioUri, meta)` —
    grava par binário + companion `.md` 1:1, idempotente (não
    sobrescreve se basename já existe).
  - `lerCompanion(vaultRoot, binarioPath)` — lê e valida companion
    via zod; retorna `null` quando ausente ou inválido.
  - `migrarAssetsLegacyParaMedia(vaultRoot)` — varre `assets/` e
    move binários legados para `media/<categoria>/`. Idempotente.
    Plugado em `BOOT_HOOKS` (roda uma vez por boot).
- **Serializador determinístico legado** em
  `src/lib/midia/companion.ts` (M34 + extensões A3.x.3 / A3.x.4)
  permanece como fonte do `.md` de saída — mantém ordem de chaves
  e escape de aspas para snapshot tests. M39 reaproveita
  internamente; consumidores existentes continuam funcionando sem
  mudança de comportamento.
- **Migração de writers para o helper canônico:** entrega
  incremental. M39 entrega schema + helpers + boot hook + testes;
  migração dos 9 writers existentes (`capturarFoto`,
  `capturarMusica`, `capturarVideo`, `salvarFrase`, `recordAudio`,
  `saveEvento.copiarFotos`, `medidas/novo`, `scanner/saveNota`,
  `adicionarFotoManual`) fica para M39.1 dedicada (escopo
  controlado, anti-débito).

## 16. Vault físico

- **Desktop:** `~/Protocolo-Ouroboros/`
- **Android:** `/sdcard/Documents/Ouroboros/`
- **Sync:** Syncthing (P2P, sem servidor central).

### Estrutura canônica (v1.0.0+, ADR-0023 layout-por-tipo)

```
markdown/                              # TODOS os .md de TODAS as features
  humor-YYYY-MM-DD.md
  diario-YYYY-MM-DD-HHmm-<slug>.md
  evento-YYYY-MM-DD-<slug>.md
  marco-YYYY-MM-DD-<slug>.md
  medidas-YYYY-MM-DD.md
  exercicio-<slug>.md
  ciclo-YYYY-MM-DD.md
  alarme-<slug>.md
  tarefa-<slug>.md
  contador-<slug>.md
  nota-YYYY-MM-DD-HHmmss-<slug>.md     # nota financeira
  foto-YYYY-MM-DD-<rand>.md            # companion de jpg/png
  audio-YYYY-MM-DD-<rand>.md           # companion de m4a
  video-YYYY-MM-DD-<rand>.md           # companion de mp4
  frase-YYYY-MM-DD-<slug>.md
  scanner-<slug>.md                    # companion de scan
  agenda-<pessoa>-YYYY-MM-DD-<eventId>.md
  _devices.md                          # devices index
png/  jpg/  m4a/  mp4/  pdf/  gif/     # binários por extensão
.ouroboros/cache/                      # gerados pelo backend
  humor-heatmap.json
  financas-cache.json
```

> Layout legado pré-H2 (por feature: `daily/`, `eventos/`, `media/fotos/`,
> `inbox/...`) está sendo migrado automaticamente pelo boot hook
> `migrarVaultLayoutPorTipo` no primeiro boot pós-update.

## 17. Schemas YAML canônicos (19 ativos)

Todos os paths abaixo são pós-H2 (ADR-0023 layout-por-tipo).

| Schema | Sprint origem | Path típico |
|---|---|---|
| `alarme` | M16 + M30 v2 | `markdown/alarme-<slug>.md` |
| `ciclo_menstrual` | M14.5 | `markdown/ciclo-YYYY-MM-DD.md` |
| `contador` | M18 + M32 + M33 | `markdown/contador-<slug>.md` |
| `diario_emocional` | M06 + M33 | `markdown/diario-YYYY-MM-DD-HHmm-<slug>.md` |
| `evento` | M07 + M33 | `markdown/evento-YYYY-MM-DD-<slug>.md` |
| `exercicio` | M13 | `markdown/exercicio-<slug>.md` (+ `gif/exercicio-<slug>.gif`) |
| `financas-cache` | M14 (backend) | `.ouroboros/cache/financas-cache.json` |
| `financeiro_nota` | M09 | `markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md` (+ `<ext>/nota-...`) |
| `humor` | M05 | `markdown/humor-YYYY-MM-DD.md` |
| `humor_heatmap_cache` | M10 (backend) | `.ouroboros/cache/humor-heatmap.json` |
| `inbox_arquivo` | M08 | `inbox/<area>/<subtipo>/...md` (legado pré-H2; sprint dedicada migra) |
| `marco` | M11 + M33 | `markdown/marco-YYYY-MM-DD-<slug>.md` |
| `medidas` | M12 | `markdown/medidas-YYYY-MM-DD.md` |
| `midia` | M07.x + M34 + M39 | companion em `markdown/<prefix>-<basename>.md`, binário em `<ext>/` |
| `para` (componente) | M33 | discriminatedUnion compartilhada |
| `pessoa` | M03 + M28 | SecureStore |
| `rotina` | M-ROTINA-TREINO (proposta) | `markdown/rotina-<slug>.md` |
| `tarefa` | M17 + M31 v2 | `markdown/tarefa-<slug>.md` |
| `treino_sessao` | M11 | `treinos/YYYY-MM-DD-<slug>.md` (legado pré-H2; sprint dedicada migra) |

## 18. Princípios invioláveis

- **Anonimato absoluto** (Regra −1) — zero IA, zero autoria, zero
  nomes reais hardcoded.
- **Privacidade por design** — nada na nuvem (exceto Google
  Calendar opt-in com escopo mínimo).
- **Vault local** — sincronização via Syncthing P2P.
- **PT-BR sentence case + acentuação completa** em UI.
- **Estética Dracula** — paleta hex fixa.
- **JetBrains Mono** font única, pesos 400/500.
- **ADR-0010** — física acima de tempo, silêncio visual,
  hierarquia por contraste.
- **ADR-0005** — zero gamificação.
- **Sem APIs pagas** (ADR-0007).

## 19. Implicações para a versão desktop

A versão desktop pode reusar **schemas + Vault físico + helpers
de leitura** quase 1:1 (são plain MD/JSON). Pontos de divergência
natural:

| Feature | Mobile | Desktop equivalente |
|---|---|---|
| Captura ativa (humor/diário/evento) | Sheets nativos + ImagePicker | Modal HTML + drag&drop file API |
| Share Intent (M08) | Android share intent | **Inbox de arquivos** robusto: drag&drop, file picker batch, watch folder |
| Microfone (M06.5) | `expo-speech-recognition` on-device | Web Audio API + Whisper local (privacidade) |
| Scanner OCR (M09) | ML Kit nativo | Tesseract local ou wrapper ML Kit |
| Calendário Google (M37) | expo-auth-session redirect | OAuth via redirect URI customizado (mesmo escopo) |
| Widget homescreen (M20) | Glance JetPack | **Tray icon** com mini-painel + notificação desktop |
| Recap/heatmaps/galerias | RN componentes | Telas frias, fáceis de portar (HTML/CSS) |
| Backend Python | repo paralelo `protocolo-ouroboros` | Mesmo backend, mesmos caches |

## 20. Como manter este arquivo

1. Toda spec nova adiciona checklist em §8 (Checkpoint visual):
   - [ ] `docs/FEATURES-CANONICAS.md` atualizado.
2. Sprint corretiva pequena (`M<NN>.<x>`): atualizar apenas se
   muda comportamento visível ao usuário.
3. Sprint de schema (mudança em `src/lib/schemas/`): atualizar §17.
4. Sprint que cria/remove rota: atualizar §1-15 conforme.
5. ADR novo: atualizar §18.
6. Validador-sprint **recusa** sprint sem este check em §8.

## Referências cruzadas

- `STATE.md` — onde estamos agora.
- `ROADMAP.md` — fila de execução priorizada.
- `GUIDE.md` — regras invioláveis.
- `VALIDATOR_BRIEF.md` — invariantes do projeto.
- `HOW_TO_RESUME.md` — guia de retomada em sessão fresh.
- `docs/BRIEFING.md` — design system + 24 telas + schemas YAML
  detalhados.
- `docs/CONTEXTO.md` — ecossistema de duas pessoas + contrato
  MobileBackend.
- `docs/ADRs/INDEX.md` — decisões arquiteturais formalizadas.
- `docs/GAUNTLET.md` — validação visual via Gauntlet.
