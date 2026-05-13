# Q24 — Recap navegável (edição) + modo Memórias (Wrapped)

> **Tamanho:** Médio-Grande. Dividir em 2 sub-sprints discretas:
> - **Q24.a — Recap navegável** (~3h): cards Números clicáveis →
>   listas editáveis. Baixo risco, alto valor, destrava UX imediata.
> - **Q24.b — Recap Memórias / Wrapped** (~6-10h): modo "Stories"
>   tela cheia com Ken Burns, ambient audio, frases sóbrias e
>   navegação tap-left/tap-right. Sem urgência v1.0.
> **Bloqueia v1.0.0?** Q24.a não bloqueia (feature core já entrega
> os números). Q24.b é incremento poético, fica em v1.1.
> **Pré-requisitos:** Recap M36 + L2 já entregues
> (`/recap` Lista/Calendário). Helpers `listarHumor/Diarios/Eventos`
> em `src/lib/vault/` já existem.

## Contexto e visão

O Recap atual (`src/components/screens/RecapScreen.tsx`) entrega 5
seções consumíveis no modo Lista, incluindo o grid 2×3 de **Números**
(Registros, Treinos, Fotos, Eventos positivos, Eventos difíceis,
Tarefas concluídas). Mas:

- **Os 6 cards são read-only**. Ver o número 23 de "Registros" não
  permite ver QUAIS são esses 23 registros. Quem quiser editar ou
  apagar tem que adivinhar onde estão no app.
- **Falta a "alma narrativa"** — Recap entrega métricas, não
  experiência. Tom sóbrio do projeto (ADR-0005) pede algo que
  honre o esforço da semana sem cair em gamificação.

Pedido do dono (2026-05-13 noite):

> "A ideia dele é eu poder ver e editar os registros originais.
> Cliquei em Recap, vi as listas e os números. Se eu clicar em
> 'Registros', abre os registros originais. Se clicar em 'Treinos',
> o mesmo. Fotos, eventos, eventos difíceis e tarefas concluídas.
> Se pudermos fazer um Recap nível Spotify Wrapped / Google Fotos
> ajudaria muito. Tocar as mídias, ter animações, frases de
> incentivo. Pode estudar UI/UX pra melhorarmos isso?"

## Referências de UX estudadas

### Spotify Wrapped

- **Cards full-screen sequenciais** estilo Stories (Instagram).
- **Tap-right**: avança. **Tap-left**: volta. **Tap-hold**: pausa
  o auto-advance.
- **Gradients vibrantes** + tipografia gigante + animação contínua
  (não estática).
- Cada slide é UMA estatística + UMA frase contextual ("Você
  ouviu X mais que 95% dos usuários" tipo de fórmula).
- **Música tocando** ao fundo (ambient, low volume).
- Compartilhável (export PNG/IG Stories).

### Google Photos — Memórias

- **Carrossel horizontal** de cards "Memória" na home (tipo "Há 1
  ano hoje", "Melhores do mês").
- Cada card abre **slideshow full-screen** com 5-7 fotos do
  período.
- **Ken Burns effect** em fotos estáticas: pan + zoom suave
  contínuo (4-6s por foto).
- Frase contextual em cima ("Em algum momento desta semana...").
- Auto-advance + tap-pausa + swipe-dismiss.
- Música opcional (instrumental).

### Adaptação ao Ouroboros (ADR-0005 + Tom sóbrio)

- **Sem cores berrantes** — mantém paleta Dracula (purple/pink/cyan
  pontuais, base #1f1d2e).
- **Frases sóbrias** — sem exclamação, sem emoji, sem comparativo.
  Tom de testemunha calma, não de hype.
  Exemplos:
  - "Você esteve presente 23 vezes."
  - "Quatro vitórias passaram por aqui."
  - "Um treino. Suficiente."
  - "Olhe o que ficou."
- **Auto-advance lento**: 5s/slide. Tap-hold pausa.
- **Mídias do vault no período**: se houver foto, slide tipo Ken
  Burns. Se houver áudio do diário, opção tap-play (default mute).
  Sem trilha sonora artificial.
- **Sem badges, sem conquistas explícitas** — o objetivo é apenas
  refletir, não recompensar.

## Q24.a — Recap navegável (Números clicáveis → listas editáveis)

### Objetivo

Cada um dos 6 cards Números (e por extensão, headers de cada seção
do modo Lista) vira **tappable**. Tap abre uma rota dedicada com a
lista filtrada por tipo + período, com `<ConquistaCard>` ou cards
similares, e cada item da lista navega pra rota de edição
existente.

### Mapeamento card → destino

| Card | Tipos vault agregados | Destino tap | Rota item → editor |
|---|---|---|---|
| Registros | `humor` + `diario_emocional` + `marco` | `/recap/lista?tipo=registros&de=YYYY-MM-DD&ate=YYYY-MM-DD` | humor: tap abre sheet humor pré-preenchido / diário: `/diario-emocional?slug=X` (modo edit) / marco: `/galeria/detalhe/marco-YYYY-MM-DD-<slug>` |
| Treinos | `treino_sessao` | `/recap/lista?tipo=treinos&...` | `/treinos/detalhe/[slug]` (criar — ainda não existe; sub-sprint) |
| Fotos | `midia_foto` (companion de `jpg/*`) | `/recap/lista?tipo=fotos&...` (grid 2 cols) | `/galeria/detalhe/[slug]` (já existe) |
| Eventos positivos | `evento` com `categoria positiva` | `/recap/lista?tipo=eventos_pos&...` | `/eventos/[slug]` (criar rota — Q24.a.b) |
| Eventos difíceis | `evento` com categoria negativa + `diario.modo='trigger'` | `/recap/lista?tipo=eventos_neg&...` | mesma rota dos eventos pos + `/diario-emocional?slug=X` pros triggers |
| Tarefas concluídas | `tarefa` com `feito=true` | `/recap/lista?tipo=tarefas&...` | tap abre sheet edição tarefa (componente já existe em `/tarefas`) |

### Arquivos a criar

- `app/recap/lista.tsx` — rota nova, recebe `tipo` + `de` + `ate`
  via query params. Renderiza lista vertical de cards via
  `<ConquistaCard>` reutilizado ou variante por tipo. Cada card
  tem `Pressable` que faz `router.push` pra rota de edição.
- `src/components/recap/CardListaItem.tsx` — variante leve do
  ConquistaCard que aceita `onPress` + label tipo. Sub-tipos
  visuais por categoria (humor=cyan dot, treino=purple dot,
  foto=thumbnail mini, etc.).
- `src/lib/hooks/useRecapLista.ts` — hook que lê o vault filtrando
  por `tipo` + janela `[de, ate]`. Reusa `listarHumor`,
  `listarDiarios`, `listarEventos`, `listarMedidas`, `listarTarefas`
  já existentes em `src/lib/vault/`.

### Arquivos a modificar

- `src/components/screens/RecapSecaoNumeros.tsx` — cada card vira
  `<Pressable onPress={() => router.push('/recap/lista?tipo=...')}>`.
- `src/components/screens/RecapSecaoConquistas.tsx`,
  `RecapSecaoCrises.tsx`, `RecapSecaoEvolucoes.tsx`,
  `RecapSecaoTarefas.tsx`, `RecapSecaoReflexoes.tsx` —
  cards individuais (já listados) também ficam tappable se ainda
  não estiverem.

### Decisões técnicas firmes

- **Query params** em vez de path params: simplifica passagem de
  `de`/`ate` ISO.
- **Reusar componentes de edição existentes**, não duplicar UI.
- **Não criar tela de edição nova** nesta sprint — só rota de
  lista + navegação. Telas de edição faltantes (treinos detalhe,
  eventos detalhe) viram sub-sprints Q24.a.b/c.
- **Sem cache**: lista sempre relê vault (consistente com Recap
  atual). Período de tela é pequeno (semana/mês), não justifica
  cache.

### Critérios de aceite Q24.a

- [ ] Cada um dos 6 cards Números é tappable e navega para
      `/recap/lista?tipo=...&de=...&ate=...`
- [ ] Rota `/recap/lista` renderiza cards filtrados ordenados por
      data desc, com microcopy do contexto ("23 registros da
      última semana.")
- [ ] Tap em card de humor abre o registro original em modo
      edição (sheet humor pré-preenchido).
- [ ] Tap em card de diário abre `/diario-emocional?slug=X` com
      campos pré-preenchidos.
- [ ] Tap em foto abre `/galeria/detalhe/<slug>` (rota existente).
- [ ] Tap em treino: provisório — abre toast "Em breve" + spec
      Q24.a.b documentada.
- [ ] Tap em evento positivo/difícil: provisório — toast + spec
      Q24.a.c documentada.
- [ ] Tap em tarefa abre sheet edição (componente existente em
      `/tarefas`).
- [ ] Botão "voltar" da rota lista retorna pro Recap preservando
      período selecionado (`/recap` state).
- [ ] Empty state silencioso quando lista vazia.
- [ ] Smoke verde (incluindo drift contract — schemas não mudam).

## Q24.b — Modo Memórias (Wrapped)

### Objetivo

Adicionar **terceiro modo** ao toggle do header do Recap, ao lado
de Lista e Calendário: **Memórias** (default = Lista). Quando
ativado:

- Tela vira um **slideshow full-screen** com 5-10 slides gerados
  do conteúdo do período.
- Auto-advance 5s/slide com indicador de progresso top (barras
  finas).
- Tap-right avança, tap-left volta, tap-hold pausa, swipe-down
  fecha.
- Cada slide tem tipografia grande + frase sóbria + media
  contextual (foto Ken Burns, áudio tap-play opcional, gráfico
  minimalista).

### Slides candidatos (em ordem de geração)

Slide só renderiza se houver dado pra mostrar; caso contrário, é
pulado.

1. **Abertura** — fundo neutro animado (partículas lentas?
   ondulação?), tipografia centralizada: "[período] - YYYY".
   Subtexto: "Olhe o que ficou."
2. **Números essenciais** — 3 estatísticas grandes empilhadas
   (registros + treinos + tarefas) com fade-in sequencial. Frase:
   "Você esteve presente."
3. **Foto destaque** — 3-5 fotos do período em Ken Burns
   sequencial (4s cada com cross-fade). Frase em overlay: "Olhe
   pra elas. Você estava lá." Tap libera play do áudio do diário
   correspondente, se houver `medida_ref` ou `marco_ref`.
4. **Vitórias do diário** — texto curto da vitória mais recente,
   fundo sutil cyan. Frase: "Quatro vitórias passaram por aqui."
   (número dinâmico). Se houver áudio anexo, ícone play
   discreto canto inferior.
5. **Treino — destaque** — só se houver pelo menos 1 treino. Nome
   do treino + duração + 3 exercícios principais (top peso). Frase:
   "Um treino. Suficiente." (singular se 1, "X treinos. Continue."
   plural).
6. **Marco da semana** — se houver marco, mostra título + texto +
   foto se anexada. Frase: "Você marcou este momento."
7. **Crises** — só se houver, mostra contagem e frase sóbria:
   "Três triggers passaram. Você seguiu." (sem detalhe pra evitar
   re-trauma; tap "ver detalhe" abre `/recap/lista?tipo=eventos_neg`).
8. **Encerramento** — frase curta única: "Continue." +
   "[Compartilhar memória]" pill (futuro Q24.b.x — export PNG
   stories).

### Arquivos a criar

- `app/recap/memorias.tsx` — rota full-screen modal apresentando
  o slideshow.
- `src/components/recap/SlideShow.tsx` — controller dos slides
  (state machine `slideIndex` + auto-advance + gesture handlers).
- `src/components/recap/slides/SlideAbertura.tsx`,
  `SlideNumeros.tsx`, `SlideFoto.tsx`, `SlideVitorias.tsx`,
  `SlideTreino.tsx`, `SlideMarco.tsx`, `SlideCrises.tsx`,
  `SlideEncerramento.tsx`.
- `src/lib/hooks/useRecapMemorias.ts` — agrega o que tem no
  período e devolve `Slide[]` (lista das renderizações ativas).
- `src/lib/animacao/kenBurns.ts` — helper Reanimated que gera
  o pan+zoom suave em `<Image>`.

### Arquivos a modificar

- `src/components/screens/RecapScreen.tsx` — toggle MODOS ganha
  terceira opção `'memorias'` + branch render.

### Decisões técnicas firmes

- **Reanimated puro**, não Moti (mantém consistência A28).
- **Ken Burns** via `useSharedValue` controlando `translate` +
  `scale` em loop `withRepeat(withTiming(...))`.
- **Auto-advance 5s/slide** (decisão dono 2026-05-13). Via
  `useEffect` + `setTimeout`, cancelável.
- **Áudio tap-play opcional por slide** via `expo-av Audio.Sound`.
  Tap-play é manual por slide; default mute.
- **Ambient audio toggle em Settings** (decisão dono 2026-05-13).
  Novo `featureToggles.recapAmbientAudio` em
  `src/lib/stores/settings.ts`, default `false` (ADR-0005 zero
  trilha artificial). Quando ON, slideshow toca trilha instrumental
  CC0 baixinha durante TODO o slideshow (volume 0.3, fade-in/out).
  Trilha embarcada local em `assets/audio/recap-ambient.mp3`
  (~30-60s loopable). Item de UI em Configurações: "Trilha sonora
  durante Memórias" com subtítulo "Toca ambiente baixinho enquanto
  você revisa a semana."
- **Paleta vibrante exclusiva ao modo Memórias** (decisão dono
  2026-05-13). Quebra visual intencional vs cotidiano sóbrio do
  resto do app. Tokens novos em `src/theme/tokens.ts` sob namespace
  `colorsMemorias`:
  - `bg`: gradient animado roxo profundo `#1a0d2e` → magenta
    `#3a1755` → cyan elétrico `#0f4d6b`, oscilação lenta (8s ciclo).
  - `fg`: branco quente `#fdf6e3` (não `#f8f8f2` do Dracula base).
  - `accent`: dourado pálido `#f5d97c` (substitui `--purple` em
    elementos de destaque tipo barra de progresso e tipografia
    grande).
  - Mantém `purple/pink/cyan` originais como cores secundárias
    pra elementos contextuais (humor, vitória, evento).
  - Partículas/dots sutis brancos translúcidos animados no fundo
    (densidade baixa, velocidade lenta — sem "festa").
- **Gestos** via `react-native-gesture-handler` (já no bundle):
  `Tap.numberOfTaps(1)` zonas esquerda/direita, `LongPress` pausa,
  `Pan` vertical detecta swipe-down dismiss.
- **Sem export pra IG Stories nesta sub-sprint** — fica em
  Q24.b.x. Botão "Compartilhar" disabled visual.
- **Performance**: max 10 slides. Fotos lazy load. Áudio só
  carrega quando tap-play.
- **Frases**: lista sugerida abaixo é guia. Dono delegou a redação
  final pro executor (decisão 2026-05-13) — confiança dada,
  manter ADR-0005 (sentence case, sem exclamação, sem emoji, sem
  comparativo).

### Critérios de aceite Q24.b

- [ ] Toggle Recap header tem 3 opções: Lista / Calendário /
      Memórias.
- [ ] Tap em "Memórias" → slideshow full-screen abre com fade-in.
- [ ] Auto-advance 5s/slide, indicador top barras finas progride.
- [ ] Tap-right avança. Tap-left volta. Tap-hold pausa
      progressbar.
- [ ] Swipe-down fecha o slideshow (volta pro modo anterior).
- [ ] Slides pulam quando sem dado (ex: sem treino → sem slide
      treino).
- [ ] Ken Burns em fotos não estranha (zoom suave, sem jank).
- [ ] Áudio tap-play funciona com 1 fonte por vez.
- [ ] Frases respeitam ADR-0005 (sem exclamação, sem emoji, sem
      comparativo).
- [ ] Smoke verde + screenshot Gauntlet Nível A+ do modo Memórias.

## Proof-of-work esperado

### Q24.a

```bash
# Lista navegável funciona
npx jest tests/lib/hooks/useRecapLista.test.ts --silent
# Esperado: testes do agregador por tipo verdes.

# Smoke completo
./scripts/smoke.sh
# Esperado: 195+ suítes / 1932+ testes verde.

# Live no celular: alpha-6 instalado, recap → tap em "Registros" 23
# → lista 23 cards → tap em humor de 2026-05-12 → sheet humor 5
# pré-selecionado → editar → salvar → voltar pra Recap.
```

### Q24.b

```bash
# Hook agregador
npx jest tests/lib/hooks/useRecapMemorias.test.ts --silent

# Smoke completo
./scripts/smoke.sh

# Validação visual Gauntlet (Nível A+ obrigatório, ADR durável
# 2026-05-04):
./gauntlet.sh
# Navegar manualmente: /recap → toggle Memórias → percorrer
# slideshow inteiro.
```

## Anti-débito

Achados colaterais previsíveis em Q24.a:

- **Q24.a.b**: Tela `/treinos/detalhe/[slug]` ainda não existe
  (só `/treinos/executar`). Spec separada pra criar a tela de
  detalhe/edição.
- **Q24.a.c**: Tela `/eventos/[slug]` ainda não existe (eventos
  hoje só editáveis via galeria detalhe). Spec separada.

Achados colaterais previsíveis em Q24.b:

- **Q24.b.x**: Export "Memória" como PNG ou vídeo curto stories
  IG. Requer `react-native-view-shot` + ffmpeg/web canvas.
  Documentar separado quando dono pedir compartilhamento.

## Pontos de UX confirmados pelo dono (2026-05-13)

1. **Auto-advance 5s/slide** — firme, não configurável.
2. **Ambient audio opcional** — toggle em Settings
   (`featureToggles.recapAmbientAudio`), default OFF.
3. **Paleta vibrante exclusiva no modo Memórias** — quebra
   intencional vs cotidiano. Tokens `colorsMemorias` definidos nas
   decisões técnicas (roxo profundo → magenta → cyan + dourado
   pálido + branco quente + partículas).
4. **Frases delegadas ao executor** — confiança dada. Manter
   ADR-0005.

## Estimativa

| Sub-sprint | Custo dev | Sub-tarefas externas |
|---|---|---|
| Q24.a | 3h | Q24.a.b (treinos detalhe ~2h), Q24.a.c (eventos detalhe ~2h) — se acionadas durante implementação |
| Q24.b | 6-10h | Q24.b.x (export memorias ~3h, opcional) |
| Total | 9-13h | + 5h em sub-débito eventual |

Q24.a tem retorno imediato. Q24.b ganha **alma narrativa** que
muda como o usuário se relaciona com o app — alto retorno
emocional, custo médio, sem urgência v1.0.
