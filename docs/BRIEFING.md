# Ouroboros Mobile — Briefing Consolidado

```
DOC: BRIEFING.md
STATUS: Master spec | VERSION: 3.0 | LANG: pt-BR
USO: Este arquivo + CONTEXTO.md + PLANO_TECNICO_APK.md alimentam o
     Claude Code do desktop para desenvolver o App Android numa pasta
     separada de protocolo-ouroboros.
ESCOPO: Design system completo, princípios estéticos, telas, fluxos,
        schemas, estados, anti-features e stack.
```

---

## 0. tl;dr

App Android pessoal para duas pessoas registrarem humor, diário emocional,
eventos, finanças e treino — escrevendo `.md` num Vault Obsidian
compartilhado. Mobile captura, desktop processa. Visual Dracula, mono
font, **estética premium nativa desde o dia um**.

22 telas (18 core + 4 funções adicionais). 4 fluxos críticos com
tempo-alvo em segundos. Design system fechado com hex codes. Arquivo HTML
standalone com mockup interativo das 22 telas já existe
(`Ouroboros 22 telas.html`) e é fonte de verdade visual.

Stack: **Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui**.

Identidade de pessoas no código: **`PESSOA_A` e `PESSOA_B`**, nunca nomes
reais (ver `CONTEXTO.md` Seção 3).

---

## 1. Visão e Princípios

### O Que É

App pessoal de captura. Diário, humor, finanças e eventos compartilhados
entre duas pessoas, com Vault em Markdown sincronizado via Syncthing ou
Obsidian Sync.

Mobile é o lado de **captura ativa**. Edição em massa, análise e
relatórios ficam no desktop (protocolo-ouroboros). O App não tenta
competir com Obsidian — tenta deixar o Vault rodando no bolso sem fricção.

### 6 Princípios

1. **Baixa fricção.** 1-2 taps para registrar qualquer coisa.
2. **Nada de gamificação.** Sem streaks, badges, reforço positivo
   artificial.
3. **Dados são arquivos.** Tudo `.md` no Vault. Portável, auditável.
4. **Dois donos.** Sempre fica claro de quem é o registro.
5. **Mobile captura, desktop processa.** Não duplique funcionalidade.
6. **Estética é função.** Beleza não é adorno, é ferramenta. Um App
   bonito de usar reduz a fricção de abrir.

### Tom

Sóbrio, focado, silencioso. Companheiro de quem já trabalha demais. Não
precisa animar ninguém. Precisa estar ali, registrar, sair do caminho.

**Mensagens da UI** ficam em **lowercase intencional** (parte da
identidade visual mono-font), terminadas em ponto, sem exclamação, sem
emoji. Exemplos: "feito.", "anotado.", "voltou hoje.", "salvo."

**Documentação** (este arquivo, ADRs, comentários de código) usa Title
Case em headings e Sentence case em prosa, com acentuação completa em
PT-BR.

Detalhes da regra de linguagem em `CONTEXTO.md` Seção 5.

---

## 2. Princípios Estéticos (Seção Dedicada — Leia Antes de Codar)

Esses princípios entram **na fundação**. Não são polimento futuro.
Componentes base do M01 já nascem aderindo a eles, e telas herdam de
graça.

### 2.1 Física Acima de Tempo

Transições não usam `duration` linear. Usam **springs com massa, damping,
stiffness**. Isso é o que separa App que parece "construído" de App que
parece "vivo".

```ts
// Errado
<View style={{ transitionDuration: '200ms' }}>

// Certo
<MotiView
  from={{ opacity: 0, translateY: 20 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: 'spring', damping: 18, stiffness: 200 }}
/>
```

Springs respeitam a física que o cérebro espera. 200ms linear parece
robótico. Spring parece humano.

### 2.2 Silêncio Visual e Respiração

Elementos importantes precisam de **muito espaço em volta**. Apertar UI
para "encaixar mais" é tentação constante e quase sempre erro.

- Padding de tela: 20dp lateral (não 16dp)
- Gap entre cards: 12dp mínimo
- Line-height: 1.5+ em qualquer texto, sempre
- Estado vazio: o ícone fica no terço superior, não centralizado
- Título de seção: 24dp de espaço acima dele

Silêncio visual é especialmente importante para TDAH. Cada elemento
disputa atenção — quanto menos disputa, menos custo cognitivo.

### 2.3 Hierarquia por Contraste, Não por Borda

Bordas pesadas são tentação de iniciante. **Profundidade real vem de
contraste de fundo**, não de stroke 1px.

- Card padrão: fundo `bg-alt` (#1e1f29) sobre `bg` (#282a36)
- Card destacado: borda 1.5px `purple` SEM aumentar peso da fonte
- Divisor: 1px `bg-elev`, **não** 2px

Separação acontece pelo gradiente sutil de cinzas, não por desenho de
caixa.

### 2.4 Tipografia Que Respira

JetBrains Mono em tudo. Mas mono fonte com line-height curto fica
sufocante. **Regra:** line-height nunca abaixo de 1.5. Pesos só 400 e
500 — 600+ engrossa demais e parece "marketing", não "ferramenta".

CAPS LOCK nunca em mensagens da UI. Tudo lowercase mesmo títulos.
Lowercase em mono passa ar de notebook técnico, dossiê pessoal —
exatamente o que o App é. Esta regra **só vale para textos da UI**;
documentação Markdown usa capitalização normal.

### 2.5 Micro-interações em Momentos Específicos

Cada toque tem uma resposta sutil. **Não em todo lugar** — em momentos
que importam:

| Ação | Resposta |
|------|----------|
| Toque em botão primário | scale 0.97 + haptic light |
| Concluir treino | haptic medium + spring de fade na tela de sucesso |
| Salvar humor | haptic light + toast deslizando de baixo |
| Salvar diário emocional (trigger) | sem haptic — momento delicado |
| Salvar diário emocional (vitória) | haptic notification success leve |
| Arrastar para baixo bottom sheet | resistência + snap em pontos |
| FAB expandir | spring leve + radial em sequência (60ms entre botões) |

Haptics seguem padrão Android `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.
Exagero quebra: vibrar em todo toque parece quinquilharia.

### 2.6 Transições Entre Telas

Stack navigation usa **slide horizontal com fade simultâneo**. Não corte
seco, não push agressivo. Transição tem que parecer "isso é lógico, vem
do lado".

Bottom sheets sobem com physics natural — segurar e arrastar para baixo
fecha (gesto nativo, não botão X).

Modais full-screen sobem de baixo com fade do fundo escuro por trás.

### 2.7 Estados São um Espectro, Não Binários

Botão não tem só "ativo" e "inativo". Tem:

- Repouso
- Hover (web, irrelevante mobile)
- Pressionado (scale 0.97)
- Soltando (spring de volta com overshoot leve)
- Desabilitado (opacity 0.4, sem responder a toque)
- Carregando (spinner inline OU skeleton)

Cada estado tem transição explícita para o próximo. `pressed → released`
nunca é instantâneo.

### 2.8 Cores Como Semântica, Não Decoração

Cada cor tem um significado consistente em todo o App. Quebrar isso é
pior que ter feio.

| Cor | Quando Aparece |
|-----|----------------|
| `--purple` | ações primárias, `PESSOA_A`, ativo |
| `--pink` | `PESSOA_B`, trigger negativo emocional |
| `--cyan` | valores numéricos, paths, voz |
| `--green` | sucesso, registrado, confirmado |
| `--yellow` | vitória positiva, atenção suave |
| `--orange` | títulos de tela, câmera, calor |
| `--red` | trigger emocional, destrutivo, erro |

Botão positivo nunca é azul. Botão destrutivo nunca é laranja.
Consistência total elimina pensamento ao usar.

### 2.9 Sombras Com Modéstia

Quase nunca usar `box-shadow` ou `elevation`. Profundidade vem de
sobreposição de fundos. **Exceções:** FAB (precisa flutuar mesmo), bottom
sheet quando aberto (sombra superior leve).

Valores: blur 16dp, offset (0, 4), color `#000000` opacity 30%.

### 2.10 Dark Mode Autêntico

Dracula é identidade, não tema selecionável. **Não implementar light
mode**. Isso simplifica código, garante consistência visual, e é parte
do tom do App. Usuários de CLI/terminal entendem imediatamente.

Cinzas têm que ser **frios** (#282a36 tem tinta azulada). Cinza neutro
puro fica médico. Dracula é elegante porque tem pigmento.

---

## 3. Design System

### Paleta Dracula Adaptada (Hex Codes)

#### Base

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-page` | `#14151a` | fundo do canvas (fora das telas) |
| `--bg` | `#282a36` | fundo da tela |
| `--bg-alt` | `#1e1f29` | cards e containers |
| `--bg-elev` | `#44475a` | bordas e elevação |
| `--fg` | `#f8f8f2` | texto primário |
| `--muted` | `#c9c9cc` | texto secundário legível (WCAG AA) |
| `--muted-decor` | `#6272a4` | hints, placeholders, separadores, anotações |

#### Acentos

| Token | Hex | Uso |
|-------|-----|-----|
| `--purple` | `#bd93f9` | `PESSOA_A`, ações primárias, ativo |
| `--pink` | `#ff79c6` | `PESSOA_B`, trigger negativo |
| `--cyan` | `#8be9fd` | valores, paths, voz |
| `--green` | `#50fa7b` | sucesso, confirmação |
| `--yellow` | `#f1fa8c` | vitória positiva, atenção |
| `--orange` | `#ffb86c` | títulos de tela, câmera |
| `--red` | `#ff5555` | trigger, destrutivo |

### Tipografia

- **Família única:** JetBrains Mono (woff2 local, não Google Fonts CDN)
- Pesos: 400 (regular) e 500 (medium). Nunca 600+
- Hierarquia:
  - heading-1: 24px / line-height 1.4 / weight 500
  - heading-2: 18px / line-height 1.5 / weight 500
  - body: 14px / line-height 1.6 / weight 400
  - caption: 12px / line-height 1.5 / weight 400
  - micro: 11px / line-height 1.4 / weight 400
- Letter-spacing: 0 em tudo exceto micro-caps (letter-spacing +0.02em)
- Mensagens da UI em sentence case lowercase

### Spacing

Base 4dp. Escala: 4 · 8 · 12 · **16 · 20 · 24** · 32 · 48 · 64.

Negrito nos valores mais usados.

- Hit area mínima: 44dp
- Botões principais: 56dp+
- Padding tela: **20dp** lateral (não 16)
- Padding interno padrão de card: 16dp
- Gap em grids: 12dp mínimo
- Espaço em volta de heading-1: 24dp acima, 16dp abaixo
- Espaço entre cards de lista: 12dp

### Cantos

- Inputs: 10dp
- Cards: 12dp
- Toasts: 24dp (pill)
- Modais: 16dp
- Chips: 20dp (pill)
- FAB: 28dp (semi-pill)
- Bottom sheets: 20dp (só cantos superiores)

### Motion (Springs, Não Durations)

```ts
// Presets canônicos para usar em moti/reanimated
spring_subtle:   { type: 'spring', damping: 22, stiffness: 220 }
spring_default:  { type: 'spring', damping: 18, stiffness: 200 }
spring_bouncy:   { type: 'spring', damping: 12, stiffness: 180 }
spring_snappy:   { type: 'spring', damping: 26, stiffness: 320 }

// Timing usado apenas em casos pontuais
fade_out:  { type: 'timing', duration: 180, easing: 'easeOut' }
toast_in:  { type: 'spring', damping: 20, stiffness: 250 }
```

Durações alvo (medidas, não especificadas):

- Toque em botão → resposta visual: <16ms (1 frame)
- Spring de scale: ~150-250ms percebido
- Transição entre telas: ~280ms percebido
- Toast fica em tela: 2.5s
- Toast fade out: 180ms

**Zero confetti, zero bounce exagerado, zero rotação decorativa.**

### Iconografia

- **lucide-react-native** (ícones em stroke, 1.5px, 24x24)
- Cor padrão: `--muted-decor` inativo, `--purple` ativo, `--fg` em
  contexto neutro
- Nunca colorir ícones decorativamente, só semanticamente

### Viewport Alvo

**412x915 dp** — Redmi Note 13 5G Pro (1080x2400 px físicos a ~395 dpi).
É o hardware real dos dois usuários. Não otimizar para Android pequeno.

---

## 4. Componentes Base (M01 Já Constrói Todos)

Estes componentes nascem premium. Telas herdam estética de graça. O
objetivo do M01 é ter esses 14 componentes funcionando em isolamento
antes de qualquer tela.

### 4.1 `<Screen>`
Container raiz de tela. Status bar configurada, safe area, padding 20dp,
fundo `--bg`. Todas as telas herdam.

### 4.2 `<Header>`
Altura 56dp. Título `--orange` mono caption. Chevron de voltar
(`--muted-decor`) animado em scale ao toque. Avatar de pessoa no canto
direito (32dp circular).

### 4.3 `<BottomTabs>`
5 tabs: hoje, rotinas, diário, memória, +. Tab ativa em `--purple` peso
500 com indicador embaixo (linha 2dp). Transição de tab é slide horizontal
em spring_default. "+" abre menu radial (FABRadial) e não navega.

### 4.4 `<FAB>` + `<FABRadial>`
Botão 56dp absoluto canto inferior direito. Ao tocar, expande em arco
semicircular com 6 botões (humor, voz, câmera, exercício, vitória,
trigger). Cada botão surge em sequência com 60ms de delay entre eles
(spring_bouncy). Fundo escurece com overlay 50% que fecha ao tocar fora.

### 4.5 `<Button>`
Variantes: primary (purple), success (green), ghost (transparente com
borda), destructive (red). Altura 56dp. Scale 0.97 ao pressionar com
haptic light. Desabilitado em opacity 0.4.

### 4.6 `<Input>` / `<Textarea>`
Fundo `--bg-alt`, borda 1px `--bg-elev`, foco anima borda para `--purple`
em spring_subtle. Placeholder em `--muted-decor`. AutoExpand para textarea.

### 4.7 `<Slider>`
Thumb 24dp em `--purple`, track 4dp `--bg-elev` com fill `--purple`.
Arrastar tem haptic selection a cada step. Valor numérico em `--cyan`
ao lado.

### 4.8 `<Chip>` / `<ChipGroup>`
Pill 20dp radius, padding 8x12. Estados: rest (`--muted-decor` borda),
selected (cor de acento conforme contexto + texto `--bg`). Single-select
e multi-select. Animação de seleção em spring_subtle.

### 4.9 `<Toggle>`
Switch material com track `--bg-elev` e thumb `--muted`. Ativo: track
`--purple`, thumb `--fg`. Arrastar manual suportado, não só toque.

### 4.10 `<BottomSheet>`
Usa `@gorhom/bottom-sheet`. Snap points configuráveis. Handle visível
no topo (drag indicator). Gesto nativo de fechar arrastando. Fundo
escurece atrás com fade.

### 4.11 `<Toast>`
Sobe de baixo em spring_default a 80dp do bottom. Background `--bg-elev`,
border-left 3px na cor semântica (verde sucesso, vermelho erro).
Desaparece em 2.5s com fade. Swipe horizontal para dispensar antes.

### 4.12 `<EmptyState>`
Ícone 48dp em `--muted-decor`, frase em `--muted` body, espaço generoso
ao redor (terço superior da tela). Sem CTA grande, sem ilustração
decorativa.

### 4.13 `<PersonAvatar>` (Filtro Pessoa)
Circular 32dp. Recebe prop `pessoa: PessoaId`. Cor e inicial vêm do
config (`src/config/pessoas.config.ts`):

```tsx
import { PESSOAS_CONFIG } from '@/config/pessoas.config';
import { colors } from '@/theme/tokens';

const corPorPessoa = {
  pessoa_a: colors.purple,
  pessoa_b: colors.pink,
  ambos: 'gradient',
};

<PersonAvatar pessoa="pessoa_a" />
// Renderiza círculo --purple com inicial "A"
// Lookup da inicial via PESSOAS_CONFIG[pessoa].inicial
```

Toque expande dropdown inline em spring_default com as 3 opções (PESSOA_A,
PESSOA_B, Ambos). **Nunca hardcoded** com nome real.

### 4.14 `<Heatmap>` / `<Sparkline>`
Visualizações de dados. Heatmap 13x7 com cores por intensidade. Sparkline
12 pontos, linha 2px `--cyan`. Animação de entrada: fade + stagger nas
células/pontos (50ms entre cada, max 600ms total).

### 4.15 `<Card>`
Fundo `--bg-alt`, padding 16dp, radius 12dp. Variante "ativa" com borda
1.5px `--purple`. Tap tem scale 0.99 sutil.

---

## 5. Os 4 Fluxos Críticos

Representados como diagramas no HTML standalone. Cada flow tem
**tempo-alvo medido do tap inicial até o toast de confirmação**.

| # | Flow | Tempo-alvo |
|---|------|------------|
| 1 | Comprovante de PIX via share sheet | <= 5 segundos |
| 2 | Registrar tristeza por conflito | <= 30 segundos |
| 3 | Evento positivo com lugar | <= 25 segundos |
| 4 | Scanner de nota fiscal alta resolução | <= 20 segundos |

### Flow 1 — PIX via Share Sheet

```
[App do banco com PDF do PIX]
  | tap "compartilhar"
  v
[Android share sheet nativo]
  | tap ícone do Ouroboros
  v
[Tela 17 - receber arquivo]
  | preview + categoria detectada (pix) + pessoa
  | tap "salvar no inbox"
  v
[Toast verde "salvo"]
  | volta automático para o App do banco
```

**Crítico:** o App nunca abre por completo neste flow. Activity
transparente processa, salva, fecha. Em React Native com Expo, isso é
configurado em `app.json` via intent filters customizados + screen modal
sem stack.

### Flow 2 — Tristeza por Conflito

```
[Qualquer tela com FAB visível]
  | tap FAB (haptic light)
  v
[Tela 14 - menu radial]
  | tap TRIGGER (botão vermelho)
  v
[Tela 18 - diário emocional, modo trigger]
  | chips de emoção + intensidade
  | textarea "o que aconteceu?"
  | chips "com quem"
  | textarea estratégia + "funcionou?"
  | tap "registrar"
  v
[Toast "registrado. respira." sem haptic — momento delicado]
```

### Flow 3 — Evento Positivo com Lugar

```
[Qualquer tela com FAB visível]
  | tap FAB
  v
[Tela 14 - menu radial]
  | tap VITÓRIA (botão amarelo)
  v
[Tela 20 - registro de evento]
  | textarea "o que aconteceu?"
  | input "onde" + "usar localização atual"
  | chips "com quem" (PESSOA_B pré-selecionada)
  | foto opcional
  | slider intensidade
  | tap "registrar"
  v
[Toast "anotado. tao bom." + haptic notification leve]
```

### Flow 4 — Scanner Alta Resolução

```
[Tela 14 - FAB expandido]
  | tap CÂMERA (botão laranja)
  v
[Tela 16 - viewfinder com auto-detecção de bordas]
  | apontar para o recibo, indicador "documento detectado"
  | tap captura (haptic medium)
  v
[Sub-tela de preview]
  | imagem auto-deskew com fade-in
  | OCR preview em ciano
  | form: valor, data, descrição, categoria, pessoa
  | tap "salvar"
  v
[Toast "salvo em alta resolucao"]
```

---

## 6. As 22 Telas

Numeração: 01-06 são as 6 telas-âncora já existentes (renderizadas no HTML
standalone). 07-24 são as 18 novas. As 4 funções adicionais (F-14 a F-17)
ficam na seção E.

### Seção A — Movimento e Memórias (Telas 07-13, 7 Telas)

#### Tela 07 — Galeria de Exercícios Cadastrados
Propósito: navegar exercícios criados pelo usuário fora de contexto de
treino.
Componentes: header "galeria" + chip pessoa, filtros chips (todos, peito,
costas, pernas, ombros, core, cardio), grid 2 colunas de cards 1:1 com GIF
preview + nome em laranja, search opcional, botão secundário "+ novo" abre
tela 02.
Estado vazio: "nenhum exercicio cadastrado ainda. toque + pra criar."

#### Tela 08 — Detalhe de Exercício
Propósito: ler instruções completas, ver histórico, editar.
Componentes: GIF grande full width, chips de grupo muscular em ciano, linha
"iniciante - halteres - 4 kg", bloco instrução, bloco dicas em muted lista
bullet, sparkline histórico 12 execuções, "ultima vez: 23/04, 4 kg, 3x8",
botões editar/adicionar a treino livre/excluir (red text).

#### Tela 09 — Heatmap de Treinos (Memórias)
Propósito: ver histórico denso de treinos como heatmap GitHub-style.
Componentes: tabs treinos/fotos/marcos, heatmap 13 semanas x 7 dias, cores
por intensidade (`--green` 30/60/100%), hoje destacado outline `--purple`
2px, legenda "menos [|||||] mais", stats "26 treinos em 90 dias" cyan.
Estado vazio: "vai aparecer aqui assim que voce treinar."

#### Tela 10 — Modal de Detalhe de Dia Passado
Propósito: ver o que foi feito num dia específico.
Componentes: bottom sheet 60% altura, header "23 de abril, terca" laranja,
subtitle "rotina B - 28 min - PESSOA_A" cyan, lista compacta de exercícios
com check verde + nome + "3x8 - 4 kg", bloco observações em italic muted,
botões editar/duplicar pra hoje.

#### Tela 11 — Marcos (Timeline Gentil)
Propósito: ver conquistas sem gamificação agressiva.
Componentes: linha vertical bg-elev no esquerdo (timeline), cards a direita
do mais recente ao mais antigo, dot 12dp green na timeline, card com data
muted + frase do marco em fg.
Exemplos: "23/04: tres treinos nesta semana", "15/04: voltou apos 9 dias".
Estado vazio: "marcos vao aparecer com o tempo."
Sem ranking, sem níveis, sem pontos.

#### Tela 12 — Form de Medidas Corporais
Propósito: registrar 9 medidas semanais em <2 minutos.
Componentes: form 2 colunas com 9 campos (peso, cintura, peito, braço esq/dir,
coxa esq/dir, barriga, quadril), pré-preenchido com última medida em
muted-decor, bloco fotos (3 botões 100x100dp frente/costas/lado), bloco
reflexão com 3 textareas, botão salvar green full width.

#### Tela 13 — Comparativo de Medidas
Propósito: ver evolução + galeria comparativa de fotos.
Componentes: filtro período 30d/90d/tudo, grid 2 colunas de cards com nome
laranja + valor cyan + sparkline 12 pontos + delta vs primeira em muted
(sem cor positiva/negativa), bloco fotos lado a lado com slider entre 2
datas.

### Seção B — Estado Interno (Telas 15, 18, 19, 20 — 4 Telas)

#### Tela 15 — Form de Humor Rápido
Propósito: registrar humor em 30 segundos.
Componentes: bottom sheet 70%, 4 sliders (humor/energia/ansiedade/foco
1-5), toggle "tomei medicacao", input "horas de sono ontem", chips
multi-select de tags rápidas, textarea opcional 1 linha "uma frase sobre
hoje", botão salvar green.

#### Tela 18 — Diário Emocional Com Contexto
Propósito: registrar tristeza, alegria, raiva com contexto rico para
análise posterior e suporte terapêutico.
Componentes: bottom sheet 90%, toggle inicial trigger (negativo) ou vitória
(positivo), borda esquerda do form muda red 2px ou green 2px, grid 3x2 de
chips de emoção multi-select (negativos: tristeza/raiva/ansiedade/
frustração/medo/solidão; positivos: alegria/alívio/gratidão/conexão/paz/
orgulho), slider intensidade 1-5, textarea livre "o que aconteceu?", chips
"com quem", BLOCO CONDICIONAL se trigger (textarea estratégia + toggle
"funcionou?"), botão opcional "gravar audio" inline, botão final green
(vitória) ou pink (trigger), rodapé micro: "salvo localmente. ninguem ve
alem de voces dois."

#### Tela 19 — Lista Positivos e Negativos do Dia
Propósito: visão do dia em 2 colunas, fácil de adicionar e revisar.
Componentes: filtro temporal (hoje/esta semana/este mês), layout 2 colunas
50% (esquerda "+ positivos" green, direita "- negativos" red), cards mini
com hora muted + texto curto body, tap em card abre tela 18 com dados
pré-preenchidos, botão flutuante "+ adicionar" no fim de cada coluna.
Estado vazio positiva: "registre algo bom de hoje."
Estado vazio negativa: "nada hoje. tudo bem."

#### Tela 20 — Registro de Evento Com Lugar
Propósito: registrar "fui a tal lugar com PESSOA_B" rapidamente.
Componentes: bottom sheet 80%, textarea "o que aconteceu", bloco "onde"
(input + botão "usar localizacao atual" + chip cyan com bairro detectado),
bloco "quando" (chip "agora" default + chip "outro horario" abre time
picker), chips multi-select "com quem" (PESSOA_B auto se Vault compartilhado,
amigo/família/sozinho/outro), chips categoria (exercicio/rolezinho/compras/
consulta/trabalho/evento_social/rotina/outro), bloco fotos opcional, slider
"como foi?" 1-5, botão registrar green.

### Seção C — Captura Ativa (Telas 14, 16, 17 — 3 Telas)

#### Tela 14 — FAB Expandido (Menu Radial de Captura)
Propósito: 6 capturas rápidas em 1 tap.
Componentes: overlay escuro 50% sobre a tela atual, FAB rotacionado 45deg
(vira X), 6 botões circulares 48dp em arco semicircular subindo do FAB:
HUMOR pink, VOZ cyan, CÂMERA orange, EXERCÍCIO green, VITÓRIA yellow,
TRIGGER red. Cada botão com label embaixo em micro fg. Surge em sequência
com 60ms de delay (spring_bouncy). Tap fora fecha o menu (slide-down 200ms).

#### Tela 16 — Câmera Scanner Alta Resolução
Propósito: capturar recibos/PDFs com auto-deskew + OCR preview.
Componentes: tela full screen, viewfinder ao vivo, overlay com cantos de
mira em cyan (auto-detecção de documento), indicador "documento detectado"
quando 4 cantos detectados, indicador resolução no topo "12 MP - alta
qualidade", bottom bar com galeria icon esquerda + botão captura grande
centro 72dp branco + flash toggle direita, modo contínuo (2 toques captura
múltiplas páginas).
Sub-tela após captura: imagem auto-deskew aplicada, overlay OCR em cyan
mono caption, form de validação (valor/data/descrição/categoria/pessoa),
botões regravar/salvar.

#### Tela 17 — Receber Arquivo via Share Intent
Propósito: modal que aparece quando outro App envia arquivo via share sheet.
Componentes: modal full screen, fundo bg, header simples sem bottom tabs,
preview do arquivo (top 50% — PDF: thumbnail; imagem: preview; texto: 5
linhas), bloco "tipo detectado" com chips selecionáveis (comprovante de
pix verde selecionado / extrato bancário / exame médico / nota fiscal /
outro), bloco "destino no inbox" com **path visível em cyan mono caption**
(ex: `inbox/financeiro/pix/2026-04-28-hhmmss.pdf`) que atualiza
dinamicamente, chip pessoa, botão salvar green, botão cancelar muted.
Variante de conflito: aviso yellow "ja existe um arquivo com nome similar",
opções renomear automaticamente / substituir / cancelar.

### Seção D — Sistema e Visualização (Telas 21, 22, 23, 24 — 4 Telas)

#### Tela 21 — Mini Humor (Página Cheia)
Propósito: versão mobile da página humor do dashboard desktop.
Componentes: header "humor" + chip pessoa (com modo "sobreposto" extra),
heatmap 90 dias 13x7, cores por nível (sem registro bg-elev, humor 1 red
70%, humor 2 orange 60%, humor 3 yellow 60%, humor 4 cyan 70%, humor 5
green solid), tap em quadrado abre modal de registro do dia, stats "media
30d: 3.4" cyan + "registros: 22 / 30" muted, modo sobreposto (heatmap
PESSOA_A + heatmap PESSOA_B empilhados 50% opacity), botão "registrar humor
agora" no topo (atalho do FAB).

#### Tela 22 — Mini Financeiro (Somente Leitura)
Propósito: consultar gastos sem abrir notebook.
Componentes: header "financas" laranja, banner micro muted "modo leitura.
edicao no desktop.", card hero ("gasto esta semana" laranja + "R$ 487,30"
cyan heading-1 + "abaixo da media" muted), card "top categorias" (5 itens
com nome + valor + barra horizontal cyan), lista das últimas 20 transações
(nome body + categoria caption muted + valor cyan despesa ou green crédito).
Sem botão de adicionar — readonly explícito.
Estado vazio: "rode o pipeline no desktop pra carregar dados."

#### Tela 23 — Settings (Configurações)
Propósito: controlar todos comportamentos do App.
Componentes: lista agrupada de toggles e selects:
- Seção "som e vibracao": toggles por evento
- Seção "lembretes": medicação/treino/humor diário com horário
- Seção "pessoa": radio PESSOA_A/PESSOA_B + toggle Vault compartilhado +
  nota muted "ambos veem todos os registros."
- Seção "sync": card status colorido (verde sincronizado / amarelo atrasado
  / vermelho conflito), **path visível em muted micro** (ex: "ultimo:
  inbox/mente/humor/2026-04-28.md"), botão "forcar sync", selector método
  (radio Obsidian Sync / Syncthing), selector qualidade scanner (8MP/12MP/
  máxima)
- Seção "privacidade": biometria pra abrir [toggle], ocultar transcrições
  na lista [toggle], botão exportar todos meus dados, botão limpar cache
  local muted
- Seção "sobre": versão 0.1.0, link "ver no github" purple, "licenca: GPL-3.0"

#### Tela 24 — Onboarding (3 Frames Sequenciais)
Propósito: primeiro uso, sem fricção, 3 telas e pronto.

Frame 1 — "voce e quem?": tela limpa, pergunta laranja, subtitle muted
"voces compartilham um vault. so escolha.", dois cards 160x200dp com
avatar circular A purple 80dp + label vindo de `PESSOAS_CONFIG.pessoa_a.nome`
e B pink 80dp + label vindo de `PESSOAS_CONFIG.pessoa_b.nome`. Tap define
pessoa ativa (`pessoa_a` ou `pessoa_b` na store), avança para o frame 2.

Frame 2 — "como deve te lembrar?": pergunta laranja, 3 opções empilhadas
(card A "todo dia, manha" + time picker default 09:00, card B "todo dia,
noite" + time picker default 21:00, card C "so quando eu quiser"), card
selecionado borda 2px purple, botão "continuar" purple no bottom.

Frame 3 — "como sincroniza?": pergunta laranja, 2 opções empilhadas (card
A "obsidian sync" + descrição 2 linhas, card B "syncthing" + descrição 2
linhas), botão "comecar" purple full width. Após frame 3 abre direto na
tela 01 (hoje).

### Seção E — Funções Adicionais (F-14 a F-17, **Decisão v1 ou v2 Pendente**)

Estão no HTML standalone como exploração. **Trate todas como v2** até
decisão explícita do usuário.

- **F-14 microfone + transcrição:** captura por voz, transcreve on-device,
  gera .md + áudio anexado.
- **F-15 alarme pessoal:** alarmes recorrentes salvos como .md, schema
  próprio.
- **F-16 to-do leve:** lista de tarefas sem projetos / subtarefas /
  due-date complexo.
- **F-17 contador "dias sem X":** streak pessoal sem celebração visual.

### Resumo

| Seção | Telas | Quantidade |
|-------|-------|------------|
| Já existentes (01-06) | 01, 02, 03, 04, 05, 06 | 6 |
| A — Movimento e memórias | 07, 08, 09, 10, 11, 12, 13 | 7 |
| B — Estado interno | 15, 18, 19, 20 | 4 |
| C — Captura ativa | 14, 16, 17 | 3 |
| D — Sistema e visualização | 21, 22, 23, 24 | 4 |
| E — Funções adicionais (v2) | F-14, F-15, F-16, F-17 | 4 |
| **Total** | | **28** |

---

## 7. Modelo de Dados — Schemas .md

Vault em pasta local sincronizada via Syncthing ou Obsidian Sync. Cada
registro vira `.md` com YAML frontmatter + corpo em Markdown.

**Importante:** o campo `autor` sempre usa `pessoa_a` ou `pessoa_b`,
**nunca nomes reais**. Ver `CONTEXTO.md` Seção 3.

### Estrutura de Pastas do Vault

```
vault/
├─ daily/
│  └─ 2026-04-28.md              ← humor + entrada do dia
├─ eventos/
│  └─ 2026-04-28-cafe.md         ← evento positivo/negativo com lugar
├─ inbox/
│  ├─ financeiro/
│  │  ├─ pix/
│  │  │  └─ 2026-04-28-143200.md
│  │  ├─ extrato/
│  │  ├─ exame/
│  │  └─ nota/
│  └─ mente/
│     ├─ humor/
│     │  └─ 2026-04-28.md
│     └─ diario/
│        └─ 2026-04-28-conflito.md
├─ treinos/
│  └─ 2026-04-28-rotina-b.md
├─ medidas/
│  └─ 2026-04-28.md
├─ marcos/
│  └─ 2026-04-28-tres-treinos-semana.md
├─ tarefas/                       ← v2 (F-16)
├─ alarmes/                       ← v2 (F-15)
├─ contadores/                    ← v2 (F-17)
├─ assets/
│  └─ 2026-04-28-pix.jpg
└─ .ouroboros/
   └─ cache/
      └─ financas-cache.json     ← gerado pelo desktop
```

### Schema · daily/YYYY-MM-DD.md (Humor do Dia)

```yaml
---
tipo: humor
data: 2026-04-28
autor: pessoa_a
humor: 4
energia: 3
ansiedade: 2
foco: 4
medicacao: true
horas_sono: 7
tags: [trabalho_pesado, exercicio, boa_conversa]
frase: "dia denso mas terminei tranquilo."
---
```

### Schema · eventos/YYYY-MM-DD-slug.md

```yaml
---
tipo: evento
data: 2026-04-28T10:30:00-03:00
autor: pessoa_a
modo: positivo                  # positivo | negativo
lugar: "padaria do bairro"
bairro: "bela vista"
com: [pessoa_b]
categoria: rolezinho
intensidade: 4                  # 1-5
fotos: [./assets/2026-04-28-cafe.jpg]
---

café da manhã sem pressa.
conversa boa.
```

### Schema · inbox/financeiro/pix/YYYY-MM-DD-HHmmss.md

```yaml
---
tipo: financeiro
subtipo: pix
data: 2026-04-28T14:32:00-03:00
autor: pessoa_a
valor: 87.40
destino: "mercado luiza"
categoria: mercado
imagem: ./assets/2026-04-28-pix.jpg
ocr_confianca: 0.94
revisar: false
---
```

### Schema · inbox/mente/diario/YYYY-MM-DD-slug.md (Diário Emocional)

```yaml
---
tipo: diario_emocional
data: 2026-04-28T19:15:00-03:00
autor: pessoa_a
modo: trigger                   # trigger | vitoria
emocoes: [tristeza, frustracao]
intensidade: 4
com: [pessoa_b]
texto: "discussão sobre dinheiro. saí da conversa cedo."
estrategia: "respirei fundo e fui caminhar 20 min."
funcionou: true
audio: null                     # ou ./assets/2026-04-28-1915.m4a
---
```

### Schema · medidas/YYYY-MM-DD.md

```yaml
---
tipo: medidas
data: 2026-04-28
autor: pessoa_a
peso: 78.4
cintura: 84.0
peito: 102.0
braco_esq: 33.0
braco_dir: 33.5
coxa_esq: 56.0
coxa_dir: 56.5
barriga: 89.0
quadril: 96.0
fotos: [./assets/m-2026-04-28-frente.jpg, ./assets/m-2026-04-28-costas.jpg]
reflexao: "dorso sentindo melhor depois das semanas de cardio."
---
```

---

## 8. Estados Especiais

### Empty States
Sempre com microcopy específico, nunca genérico. Seguir padrão da Seção
2.2 (terço superior, espaço generoso, ícone 48dp `--muted-decor`).

Exemplos canônicos:
- "memorias vao aparecer aqui conforme voce treinar."
- "nada hoje. tudo bem."
- "comece quando quiser."
- "rode o pipeline no desktop pra carregar dados."
- "edicao e no desktop."

### Erros

- OCR falha → form manual com fade-in dos campos.
- Sync falha → banner persistente em ajustes (não toast).
- I/O no Vault → modal bloqueante com path do problema.
- **Toast = info; modal/banner = problema.** Nunca toast para erro
  crítico.

### Permissões

Câmera, mic, storage e notificação pedidas just-in-time, no momento do
uso. Cada negação tem fallback:

- Sem câmera → scanner desabilitado (botão opacity 0.4 + tooltip).
- Sem mic → botão de voz invisível.
- Sem notificação → lembrete noturno desativado em settings.
- Sem storage → modal bloqueante explicando.

Settings sempre tem deep-link para reabilitar via `Linking.openSettings()`.

---

## 9. Anti-features

Lista consolidada do que **não** construir:

- Streaks visíveis com fogo, troféus ou celebração
- Rede social, feed compartilhado público, comentários
- Ranking entre PESSOA_A e PESSOA_B, comparativo competitivo
- Push motivacional ("voce consegue!", "nao desista")
- Analytics, telemetria ou crash reporter remoto
- Edição em massa ou bulk operations no Mobile
- Relatórios PDF / export complexo — fica no desktop
- Integração com bancos, open banking, scraping de extrato
- IA generativa para "sugerir como você se sente"
- Light mode ou tema selecionável — só Dracula, é a identidade
- Tour interativo, tooltips persistentes, coach marks
- Widget de homescreen no v1 (talvez v2)
- Backup automático na nuvem do App — Syncthing já cobre
- Multi-idioma — só pt-BR
- Splash screen com logo gigante — abertura direta para tela 01

---

## 10. Stack Técnica

### Decisão: Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui

ADR-006 detalha a decisão em `PLANO_TECNICO_APK.md`. Resumo dos motivos:

- **Expo Go** instala App preview na Play Store, escaneia QR code do
  terminal, código aparece rodando no celular sem build, sem Android
  Studio
- **Fast refresh <1s** entre salvar e ver no celular
- **React Native** = nativo de verdade, 60fps, gestos fluidos
- **NativeWind** = Tailwind classes, sintaxe que o usuário já conhece de web
- **Moti** = animações declarativas com spring físico, não timing linear
- **Reanimated** = 60fps real, animações na thread nativa (UI thread)
- **gluestack-ui** = primitivos modais/sheets/inputs já com física certa
- **Ecossistema gigantesco** = qualquer LLM ajuda muito bem
- **Codebase reutilizável como PWA** se quiser depois

### Dependências

```
Runtime principal:
- expo SDK 51+
- react native 0.74+
- typescript 5
- nativewind 4 (tailwindcss 3 underneath)
- moti (animações declarativas)
- react-native-reanimated 3 (motor de animação)
- react-native-gesture-handler

UI primitives:
- @gluestack-ui/themed (modais, sheets, inputs sob spring físico)
- @gorhom/bottom-sheet (bottom sheets premium com gestos)
- lucide-react-native (ícones stroke)
- expo-haptics (vibração sutil)
- expo-blur (efeitos de blur quando precisar)
- @expo-google-fonts/jetbrains-mono (font local)

Storage e cache:
- expo-file-system (escrita no Vault)
- expo-secure-store (config sensível)
- @op-engineering/op-sqlite (cache rápido em SQLite)
- yaml (parser frontmatter)

Captura:
- expo-camera (alta resolução)
- expo-image-manipulator (deskew, crop)
- @react-native-ml-kit/text-recognition (OCR on-device)
- @react-native-ml-kit/document-scanner (auto-deskew)
- expo-av (gravação áudio)
- @react-native-voice/voice (transcrição on-device)

Sistema:
- expo-notifications (lembretes)
- expo-sharing + expo-intent-launcher (share intent)
- expo-location (lugar opcional)
- expo-local-authentication (biometria)
- expo-linking (deep-links para settings)

Dev:
- expo-dev-client (build customizado quando precisar)
- @testing-library/react-native (unit tests)
- jest (test runner)
- maestro (e2e tests)
- prettier 3 + eslint
```

### Estrutura de Pastas

Detalhada em `PLANO_TECNICO_APK.md`. Resumo:

```
ouroboros-mobile/
├─ app/                          # Expo Router (file-based)
├─ src/
│  ├─ components/
│  │  ├─ ui/                     # 14 componentes base do M01
│  │  ├─ chrome/
│  │  └─ data/
│  ├─ lib/
│  │  ├─ vault/
│  │  ├─ schemas/
│  │  ├─ stores/
│  │  ├─ haptics.ts
│  │  └─ motion.ts
│  ├─ config/
│  │  └─ pessoas.config.ts       # ÚNICO lugar com nomes reais
│  └─ theme/
│     └─ tokens.ts
├─ assets/
├─ scripts/
├─ docs/
├─ hooks/
└─ tests/
```

### Sync Delegado (ADR-002)

Syncthing ou Obsidian Sync rodam fora do App. Ouroboros não gerencia
sync — só observa o status (conectado/syncing/conflito) e mostra na tela
de ajustes (tela 23). Conflitos resolvidos no desktop via merge manual.

---

## 11. Ordem de Implementação

Cada etapa é PR fechado, com as telas envolvidas funcionando ponta-a-ponta
antes de passar para a próxima. Detalhamento operacional e protocolo
formal de sprint em `PLANO_TECNICO_APK.md`.

1. **M01 — Fundação Estética.** Projeto rodando no celular via Expo Go,
   14 componentes base implementados, paleta + tipografia + tokens +
   spring presets configurados, sample screen mostrando todos componentes
   em isolamento ("storybook caseiro"), `pessoas.config.ts` definido.
2. **M02 — Vault Bridge.** SAF + leitura/escrita .md tipada com zod,
   tela 01 (hoje) lendo arquivos reais.
3. **M03 — Onboarding (Tela 24).** 3 frames com transição spring entre eles.
4. **M04 — FAB Radial (Tela 14).** Central de captura.
5. **M05 — Humor Rápido (Tela 15).** Primeiro fluxo de captura completo.
6. **M06 — Diário Emocional (Tela 18).** Flow 2.
7. **M07 — Eventos (Tela 20).** Flow 3.
8. **M08 — Share Intent Receiver (Tela 17).** Flow 1.
9. **M09 — Scanner (Tela 16).** Flow 4.
10. **M10 — Heatmap Humor (Tela 21).**
11. **M11 — Memórias / Treinos (Telas 09, 10, 11).**
12. **M12 — Medidas (Telas 12, 13).**
13. **M13 — Galeria + Detalhe Exercício (Telas 07, 08).**
14. **M14 — Finanças Readonly (Tela 22).**
15. **M15 — Settings (Tela 23).**

Após M15, MVP funcional. Waves seguintes (notificações, dossiê remoto,
funções adicionais Seção E) são expansão.

---

## 12. Mockup HTML Standalone — Fonte de Verdade Visual

O arquivo `Ouroboros 22 telas.html` contém **render real** das 22 telas
em viewport 412x915 dp. É um design canvas zoomável. Ao implementar uma
tela, abrir o HTML, encontrar o artboard correspondente, e replicar
fielmente.

Paleta + tipografia + spacing já estão no `<style>` do HTML — copiar para
`src/theme/tokens.ts` no começo do projeto.

---

## 13. Anexos Relacionados

- `CONTEXTO.md` — o que é o protocolo-ouroboros existente, como o Mobile
  se encaixa, regras invioláveis (anonimato, tom, identidade de pessoas),
  interface com o backend
- `PLANO_TECNICO_APK.md` — playbook operacional: setup Expo Go, ADRs
  detalhadas, hooks, scripts, fluxo de validação ao vivo, **protocolo de
  sprint com TODO list dupla (humano + agente)**, como crescer sem
  quebrar
- `Ouroboros 22 telas.html` — mockup interativo das 22 telas

---

*"O App que serve a vida que vocês tentam ter, não a vida ideal que nunca
vai existir."*
