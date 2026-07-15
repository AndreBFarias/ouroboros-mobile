# Sprint R-BRAND-8-RITUAIS — Rituais da Marca (Virada de Dia, Fim de Mês, Pipeline Vivo)

```
DEPENDE:    R-BRAND-3-GLIFO mergeada (BLOQUEANTE) — entrega
            src/components/brand/glifo/ (geometria.ts, ordenarDaCabeca.ts,
            OuroborosGlifo.tsx) + src/components/brand/conceitos/ com E1/E2/E3.
            Onda R-BRAND-SYSTEM (design doc docs/sprints/_ONDA-R-BRAND-SYSTEM.md),
            sprint 5 do mapa de ondas (§5).
BLOQUEIA:   R-BRAND-9-MIGRACAO (aposenta a geração antiga — F1/F2/G1
            precisam estar no ar antes da varredura de consumidores).
ESTIMATIVA: 5-7h.
```

## 0. Pré-execução obrigatória (verificação de hipótese — lição 4)

Antes de escrever qualquer linha, o executor confirma via `rg`/`ls` que
o contrato do glifo entregue por **R-BRAND-3-GLIFO** existe de fato e
anota os nomes reais exportados:

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
ls src/components/brand/glifo/                 # geometria.ts, ordenarDaCabeca.ts, OuroborosGlifo.tsx
ls src/components/brand/conceitos/             # E1*.tsx, E2*.tsx, E3*.tsx ja existem (R-BRAND-3)
rg "export" src/components/brand/glifo/OuroborosGlifo.tsx
rg "orderFromHead|ordenarDaCabeca|ccw|cw" src/components/brand/glifo/ordenarDaCabeca.ts
rg "export" src/components/brand/glifo/geometria.ts | head
```

Este spec descreve o **contrato esperado** do glifo conforme o design
doc §3 (driver por elemento anatômico: 43 contas + 4 rosto + anel +
wordmark; overrides de cor; `useFrameCallback` único para contínuos;
fallback web rAF + DOM `data-anim-id`; `ordenarDaCabeca` port do
`orderFromHead`). **Se os nomes reais divergirem do descrito aqui,
adaptar aos nomes de R-BRAND-3 — não reimplementar o glifo.** Se algum
driver necessário (ver §3) não existir no glifo, esta sprint o estende
de forma mínima e A27-safe (nunca `transform` string em SVG nativo).

## 1. Objetivo

Entregar os três rituais da marca definidos no design doc §4:

- **F1 — virada de meia-noite:** ao abrir o app (ou voltar ao
  foreground) no primeiro instante após 00:00, um ritual silencioso de
  ~1,5s — a cobra dá uma revolução única, o wordmark cede lugar ao
  overlay `novo dia.` e tudo retorna. **Dispara no máximo uma vez por
  dia**, persistido.
- **F2 — fim de mês:** no primeiro acesso após a virada de mês, o glifo
  desatura, surge um selo `<mês anterior> fechado.` que troca para
  `<mês novo> começa.`, e o glifo resatura. **Dispara no máximo uma vez
  por mês**, persistido na mesma store.
- **G1 — cobra como pipeline vivo:** na tela Sobre
  (`app/settings/sobre.tsx`), a cobra vira o diagrama do pipeline de
  dados com 5 segmentos coloridos rotulados e um pulso de dado viajando
  cabeça→cauda. O diagrama **não gira** (princípio 01 da marca).

Zero gamificação, zero exclamação, zero comparativo — os rituais são
pontuação calma da passagem do tempo, não recompensa (Regra de Tom,
`VALIDATOR_BRIEF.md` §1.8).

## 2. Entregáveis

### Arquivos novos

- `src/lib/rituais/store.ts` — store zustand `useRituais` (pequena),
  persistida via `secureStorage`, chave `ouroboros.rituais.v1`. Guarda
  `ultimoDiaDisparado: string | null` (`YYYY-MM-DD` local) e
  `ultimoMesDisparado: string | null` (`YYYY-MM` local). Setters
  `marcarDiaDisparado(diaKey)`, `marcarMesDisparado(mesKey)`,
  `resetar()`. **NÃO espelha no Vault** (estado efêmero de UI local, mesma
  postura de `driveBackupUltimaSync`/`calendarSyncUltimaSync` em
  `src/lib/stores/settings.ts` — não chamar `escreverEstadoCanonico`).
- `src/lib/rituais/dispatcher.ts` — lógica pura e testável:
  - `chaveDia(agora: Date): string` e `chaveMes(agora: Date): string`
    construídas de **componentes locais** (`getFullYear`/`getMonth`/
    `getDate`), **nunca** `toISOString` (que é UTC e dispararia o ritual
    no horário errado em BRT −03:00 — ver §6 Riscos).
  - `nomeMesPtBr(indice0a11: number): string` — 12 nomes acentuados
    (`janeiro`…`dezembro`, com `março`).
  - `avaliarRituais(agora, estadoStore): { f1: boolean; f2: boolean;
    proxDia: string; proxMes: string; mesFechado?: string;
    mesNovo?: string }` — decide o que disparar **sem** efeito colateral
    (recebe o estado, devolve a decisão). Regra de precedência travada
    em §3.4.
  - `verificarRituais(agora?: Date): 'f1' | 'f2' | null` — orquestra:
    lê `useRituais.getState()`, chama `avaliarRituais`, aciona o ritual
    resultante e persiste os marcadores. `agora` default `new Date()`
    (injetável para teste e Gauntlet).
- `src/lib/rituais/useRituaisDispatcher.ts` — hook fino consumido em
  `app/_layout.tsx`: registra `verificarRituais` no boot (via
  `BOOT_HOOKS.push` de `src/lib/boot/reagendamento.ts`) e num listener
  `AppState 'active'` (espelha o padrão já existente em `_layout.tsx`
  linhas 309-311 / 391-393, com cleanup A26-safe). Expõe o estado
  `ritualAtivo: 'f1' | 'f2' | null` para o overlay renderizar.
- `src/components/brand/conceitos/F1ViradaDeMeiaNoite.tsx` — one-shot,
  consome o glifo com driver de rotação de grupo + wordmark; overlay
  `novo dia.`. Prop `onConcluir(): void`.
- `src/components/brand/conceitos/F2FimDeMes.tsx` — one-shot, consome o
  glifo com driver de dessaturação (filter) + selo. Props
  `mesFechado: string`, `mesNovo: string`, `onConcluir(): void`.
- `src/components/brand/conceitos/G1PipelineVivo.tsx` — contínuo,
  consome o glifo com override de cor por segmento + `useFrameCallback`
  do pulso de dado + rótulos ancorados. Sem props obrigatórias.
- `src/components/brand/conceitos/RitualOverlay.tsx` (ou equivalente) —
  camada full-screen `transparentModal`-like que monta F1 **ou** F2
  quando `ritualAtivo !== null` e desmonta via `onConcluir`. Fundo
  Dracula `#14151a` opaco (armadilha A18: nunca overlay sem fundo).
- `tests/rituais/dispatcher.test.ts` — Jest do disparo único (§Testes).
- `tests/rituais/store.test.ts` — Jest de persistência/hidratação da
  store.
- `tests/e2e/playwright/r-brand-8-rituais.e2e.ts` — E2E Gauntlet com
  relógio controlado (copiado de `docs/templates/e2e-template.e2e.ts`).
- `docs/sprints/R-BRAND-8-RITUAIS-screenshots-gauntlet/` — mínimo 1 PNG
  real por ritual (F1, F2, G1) + variantes reduce-motion.

### Arquivos modificados

- `app/_layout.tsx` — monta `useRituaisDispatcher()` após `appPronto`
  (boot hooks já disparados) e renderiza `<RitualOverlay />` no topo da
  árvore, acima do conteúdo, guardado por `ritualAtivo`. Não tocar no
  wiring de biometria/share/HC/Calendar existente.
- `app/settings/sobre.tsx` — insere `<G1PipelineVivo />` como bloco
  visual da tela (sugestão: seção "Como o app trata seus dados", acima
  de `<SecaoSobre />` ou logo após o header). Aditivo: não remover
  changelog nem créditos.
- `src/lib/dev/gauntlet.ts` — estende `GauntletAPI` com controle de
  relógio dos rituais (ver §3.5). Guardado por `GAUNTLET_ATIVO`
  (dead-code em release, garantia `Platform.OS === 'web' && __DEV__`).
- `docs/FEATURES-CANONICAS.md` — nova subseção 1.3 (Marca — rituais F1/
  F2 + pipeline vivo G1), no mesmo commit (§9 checklist obrigatório).
- `CHANGELOG.md` — entrada em `[Unreleased]`.
- `STATE.md` / `ROADMAP.md` — avanço da onda R-BRAND-SYSTEM (sprint 5).

## 3. Contrato de cada ritual (portar a matemática literalmente)

Fonte: `docs/design/ouroboros/coreografias-extraidas.js`, funções
`mount_F1` (linhas 971-1034), `mount_F2` (1036-1093), `mount_G1`
(1098-1198). Portar a matemática, **adaptando durações ao app**
(one-shots executam uma vez; contínuos vivem só enquanto o estado que os
justifica durar — design doc §4, diferença consciente do HTML que roda
em loop).

### 3.1 F1 — Virada de meia-noite (one-shot ~1,5s)

- **Coreografia:** cobra + rosto giram **juntos** (mesma origem
  `CENTER` do glifo) uma revolução única `0deg → 360deg` com a curva
  `cubic-bezier(.55,.05,.35,1)`. `360 ≡ 0`, o snap de volta é invisível.
  O wordmark faz fade-out durante a rotação; o overlay `novo dia.`
  (cor `#f1fa8c`, fonte mono do tema, `letter-spacing:.02em`) surge no
  meio e some antes do fim; o wordmark retorna ao concluir.
- **Orçamento de tempo:** a demo HTML soma ~2,6s (rotação 1600ms +
  janelas de overlay). O **ritual no app é ~1,5s** (design doc §4):
  condensar as janelas de `setTimeout` (rotação e overlay) para caber em
  ~1500ms mantendo a curva e a ordem cabeça→overlay→retorno. Ao término,
  chamar `onConcluir()` (desmonta o overlay).
- **Texto:** `novo dia.` — **minúsculo com ponto, intencional** (elemento
  de marca, análogo ao wordmark lowercase; diretriz explícita do design
  doc + task). Sem acento no texto (não há caractere acentuado). Zero
  exclamação, zero gamificação — conforme Regra de Tom.
- **Rotação em nativo:** driver de rotação de **grupo** via prop
  `rotation`/`rotate` numérica ou `useAnimatedProps` numérico — **nunca
  `transform` string** (armadilha A27, ClassCastException no Fabric).
  Confirmar em §0 se `OuroborosGlifo` já expõe esse driver (B2 em
  R-BRAND-7 também precisa dele); se não, estender o glifo minimamente.
- **Reduce-motion (decisão travada):** o design doc §3 manda one-shots
  dispararem `onConcluir` imediato no mount, com estático canônico =
  logo completo. Um ritual sem mensagem visível seria inútil; portanto,
  em reduce-motion, **F1 mostra o glifo estático + o overlay `novo dia.`
  segurado por ~800ms (sem rotação, sem fade animado), depois
  `onConcluir`**. Honra a mensagem e o pedido de não-movimento.

### 3.2 F2 — Fim de mês (one-shot ~3s)

- **Coreografia:** contas + rosto dessaturam **juntos**
  `filter: saturate(0.12) brightness(0.7)` com transição `900ms ease`;
  selo (pill `rgba(189,147,249,.14)` borda `rgba(189,147,249,.32)`,
  texto `#f8f8f2`) faz fade-in exibindo `<mês anterior> fechado.`;
  ~1400ms depois troca o texto para `<mês novo> começa.`; ~2600ms
  resatura (`filter: none`); ~3200ms selo some. `onConcluir()` ao fim.
  Glifo com `hideWordmark`.
- **Nomes de mês (PT-BR acentuado):** `nomeMesPtBr` devolve os 12 nomes
  com acentos corretos — atenção a **`março`** (ç). Semântica: o mês
  **fechado** é o mês de calendário anterior a `agora`
  (`(mesAtual + 11) % 12`, com wrap de ano: janeiro → `dezembro
  fechado.` / `janeiro começa.`); o mês que **começa** é o mês de
  `agora`.
- **Texto do selo:** `<mês> fechado.` / `<mês> começa.` — minúsculo com
  ponto, intencional (marca). `começa` leva ç. `março` leva ç. Manter
  acentuação correta; se o `check_strings_ui_ptbr.py` sinalizar o estilo
  lowercase, marcar a linha com `// ptbr-allow: overlay de marca (design
  doc §4)`.
- **Reduce-motion (decisão travada):** sem animação de filtro; mostra o
  glifo estático (saturado) + selo já no texto final `<mês novo>
  começa.` por ~1000ms, depois `onConcluir`.

### 3.3 G1 — Pipeline vivo (contínuo 5,2s/rev, NÃO gira)

- **Segmentos (5, sobre as 43 contas ordenadas da cabeça, `ccw`):**

  | Faixa (índices) | Cor | Rótulo (PT-BR) |
  |---|---|---|
  | 0–7 | `#fc7ac8` | extração |
  | 8–16 | `#e284dd` | normalização |
  | 17–25 | `#d18bea` | deduplicação |
  | 26–34 | `#c092f7` | categorização |
  | 35–42 | `#bd93f9` | saída |

  Os rótulos descem dos nomes de etapa da demo
  (`extração/normalização/dedup/categorização/saída · irpf`),
  reescritos em PT-BR pleno para a tela Sobre. O sufixo `· irpf` da demo
  é específico do exemplo financeiro — **default sem ele** (`saída`).
  Ver §6 Dúvidas: confirmar com o dono se o G1 da Sobre ilustra o
  pipeline de **Finanças** especificamente (aí `saída · irpf` cabe) ou o
  fluxo de dados geral do app.
- **Pulso de dado (NÃO gira o diagrama):** um único `useFrameCallback`
  escreve nas 43 shared values de opacidade por frame. Port literal:
  `t = ((now - start) / 5200) % 1`; `frente = t * NB`; para cada conta
  `i`: `d = frente - i; if (d < 0) d += NB;`
  `glow = Math.exp(-d*d*0.35)`; `opacidade = 0.4 + 0.6*glow`. Cabeça→
  cauda: entra cru na extração, sai categorizado na saída. Rosto brilha
  discreto (não compete com rótulos). O diagrama fica **estático em
  posição** (girar desalinharia rótulos e violaria o princípio 01).
- **Rótulos ancorados por lado** (nunca saem da caixa) — 5 chips de
  texto posicionados como no `mount_G1` (esquerda-topo, esquerda-baixo,
  baixo, direita-baixo, direita-topo), cada um na cor do seu segmento,
  fundo `rgba(15,16,21,.88)`.
- **Reduce-motion:** design doc §3 → estático canônico. Sem pulso: as 43
  contas ficam nos segmentos coloridos em opacidade plena (`1.0`), com
  os rótulos. A arquitetura fica legível, apenas sem o dado viajando.

### 3.4 Precedência F1 × F2 (regra travada, testável)

Quando `agora` é **virada de dia E virada de mês** simultâneas (primeiro
acesso no dia 1º de um mês novo): **F2 tem precedência e F1 não dispara
nesse dia.** F2 é o ritual "superset" da passagem de tempo; disparar
dois rituais em cascata seria fadiga. Mesmo suprimindo F1, o dispatcher
**atualiza os dois marcadores** (`ultimoDiaDisparado` e
`ultimoMesDisparado` recebem as chaves de `agora`), de modo que F1 não
dispara mais tarde no mesmo dia. Regra codificada em `avaliarRituais` e
coberta por teste dedicado.

### 3.5 Controle de relógio no Gauntlet (extensão de GauntletAPI)

O `window.__gauntlet` **não tem** controle de data/relógio hoje
(confirmado em `src/lib/dev/gauntlet.ts`). Adicionar à interface
`GauntletAPI` (linha 102) e ao objeto `api` (linha 657), guardado por
`GAUNTLET_ATIVO`:

- `setUltimoRitual(dia: string | null, mes: string | null): void` —
  presta `useRituais.setState({ ultimoDiaDisparado: dia,
  ultimoMesDisparado: mes })`, para o E2E pré-posicionar "ontem" / "mês
  passado".
- `dispararRituais(agoraISO?: string): 'f1' | 'f2' | null` — chama
  `verificarRituais(agoraISO ? new Date(agoraISO) : new Date())` e
  devolve o ritual acionado, para o E2E controlar o "agora".
- `estadoRituais(): { ultimoDiaDisparado: string | null;
  ultimoMesDisparado: string | null; ritualAtivo: 'f1' | 'f2' | null }`
  — snapshot para asserts (ou estender o `estado()` existente).

Todos no-op fora de `GAUNTLET_ATIVO` (dead-code em release Android —
manter a garantia verificada `npx expo export --platform android` +
grep `__gauntlet` vazio).

## 4. APIs reutilizáveis (paths confirmados via grep)

- `src/components/brand/glifo/OuroborosGlifo.tsx` + `geometria.ts` +
  `ordenarDaCabeca.ts` — **contrato de R-BRAND-3** (verificar em §0). Os
  três conceitos consomem o glifo; não redesenhar anatomia.
- `src/components/brand/conceitos/` — E1/E2/E3 já lá (R-BRAND-3); F1/F2/
  G1 entram como irmãos finos (1 arquivo por conceito, design doc §3).
- `src/lib/hooks/useReduceMotion.ts` (`export function useReduceMotion(): boolean`)
  — chamar **incondicionalmente no topo** de cada conceito (design doc
  §3). Combina reduce-motion do sistema OR toggle de Configurações.
- `src/lib/stores/persist.ts` (`secureStorage`) + padrão `persist` +
  `createJSONStorage` — copiar o esqueleto de `src/lib/stores/settings.ts`
  (persist com `name`, `storage`, `version`) para `useRituais`, sem o
  `merge`/`migrate` pesados (store nova, shape mínimo).
- `src/lib/boot/reagendamento.ts` (`BOOT_HOOKS.push(fn)`) — registrar o
  check de rituais no boot.
- Padrão `AppState.addEventListener('change', s => s === 'active' && ...)`
  com cleanup — já em `app/_layout.tsx` (309-311 / 391-393); espelhar.
- `src/theme/tokens.ts` (`colors`, `typography`, `spacing`) — cores
  Dracula e fonte mono `JetBrainsMono_400Regular`/`_500Medium`; overlay
  amarelo = `colors.yellow` (`#f1fa8c`). Hex literal só em `tokens.ts`/
  `tailwind.config.js` — conceitos consomem via token (exceção: as cores
  dos 5 segmentos do G1 são degradê de marca definido pela coreografia;
  se não houver token, declarar constante local comentada como cor de
  marca do pipeline).
- Nomes de mês PT-BR: já existem arrays locais em
  `src/components/screens/DetalheConquista.tsx` e
  `DetalheDiaTreinoModal.tsx` — **não refatorar** esses; criar
  `nomeMesPtBr` local no dispatcher (fonte única para os rituais).

## 5. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. `VALIDATOR_BRIEF.md` §1.1.
- **Identidade de pessoas:** `pessoa_a`/`pessoa_b`/`ambos` em código;
  G1/F1/F2 não exibem nomes reais.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação PT-BR** — **exceção
  travada:** overlays de marca `novo dia.`, `<mês> fechado.`,
  `<mês> começa.` são lowercase intencional (design doc §4 + task),
  análogos ao wordmark. Acentuação dos nomes de mês (`março`) e de
  `começa` (ç) **obrigatória e correta**.
- `accessibilityLabel` sem acento (screen reader). Dar `accessibilityLabel`
  ao overlay do ritual (ex.: `ritual novo dia`, `ritual fim de mes`,
  `diagrama pipeline`).
- Comentários em `.ts`/`.tsx` sem acento (convenção shell/CI).
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
- Imports via alias `@/*`.
- **Motion:** springs, não durations lineares (ADR-010, BRIEF §1.6). As
  transições dos rituais que usam `cubic-bezier`/`filter`-ease vêm da
  coreografia canônica da marca (curva de física específica portada
  literalmente) — documentar no comentário que é port fiel do
  `mount_F1`/`mount_F2`, não duration arbitrária.
- **A18:** overlay de ritual sempre com fundo Dracula opaco — nunca
  camada transparente que deixe "tela preta infinita".
- **A27:** nunca `transform` string em SVG nativo — rotação do F1 via
  prop numérica/array.
- **M25.2 / web:** rn-svg-web não propaga `animatedProps` em `G`/
  `Circle` — usar o fallback rAF + DOM `data-anim-id` já validado no
  glifo (R-BRAND-3), com UUID por instância (R-CRIT-4).
- Não tocar em arquivos fechados de outras sprints sem necessidade
  (só os listados em §2).

## 6. Riscos, não-objetivos e dúvidas

### Riscos / armadilhas

- **UTC vs local (crítico):** construir `chaveDia`/`chaveMes` de
  componentes **locais** (`getFullYear`/`getMonth`/`getDate`). Usar
  `toISOString()` fixaria a virada na meia-noite UTC — em BRT (−03:00) o
  ritual dispararia às 21h do dia anterior. Teste dedicado com `Date`
  em fuso local cobre isso.
- **App em foreground através da meia-noite sem backgrounding:** o
  dispatch cobre boot + `AppState 'active'` (retomar o app é a "primeira
  interação após 00:00" do design doc §4). O caso de o app ficar aberto
  e visível cruzando 00:00 sem nunca ir a background **não** é coberto
  por esses dois gatilhos. **Não-objetivo desta sprint** um timer de
  meia-noite; registrar como melhoria futura se o dono pedir (sprint
  nova, protocolo anti-débito).
- **Contrato do glifo (R-BRAND-3):** se o driver de rotação de grupo
  (F1) ou o override de cor por conta (G1) não vier pronto, esta sprint
  estende o glifo minimamente — risco de crescer além de "arquivo fino".
  Mitigar confirmando o contrato no passo §0 antes de codar.
- **Fadiga de ritual:** precedência F2 sobre F1 (§3.4) evita cascata
  dupla no dia 1º.

### Não-objetivos

- Widget nativo, B2 relógio, D1/D2/D3, C1/C2/C3, A1/A2, B1/B3 — de
  outras sprints da onda. Esta sprint é só F1 + F2 + G1.
- Migração/aposentadoria da geração antiga (`OuroborosLoader`/`Loading`/
  `Fechamento`) — é R-BRAND-9.

### Dúvidas em aberto

- **G1 rótulo de saída:** `saída` (genérico do fluxo de dados) vs
  `saída · irpf` (se a Sobre ilustra o pipeline de **Finanças**
  especificamente). Default do spec: `saída`. Confirmar com o dono no
  checkpoint visual.

## 7. Aritmética (orçamento — sem meta de contagem de linhas)

Sprint de feature, não refactor: **não há meta `arquivo.tsx <NNN L`**.
Orçamento de tamanho para manter "1 arquivo fino por conceito" (design
doc §3):

- `F1ViradaDeMeiaNoite.tsx` ≈ 120-180 L (overlay + driver de rotação).
- `F2FimDeMes.tsx` ≈ 120-180 L (selo + driver de filtro).
- `G1PipelineVivo.tsx` ≈ 160-220 L (segmentos + `useFrameCallback` +
  5 rótulos).
- `rituais/store.ts` ≈ 60-90 L. `rituais/dispatcher.ts` ≈ 90-140 L.
  `useRituaisDispatcher.ts` ≈ 50-80 L. `RitualOverlay.tsx` ≈ 50-90 L.

Se algum conceito estourar ~250 L, revisar se lógica de glifo vazou para
o conceito (deveria estar no glifo/driver de R-BRAND-3).

## 8. Testes

### Jest (lógica pura + persistência — sem render)

`tests/rituais/dispatcher.test.ts` (clock mockado via `Date` injetado —
não precisa de fake timers para a decisão):

1. F1 dispara quando `ultimoDiaDisparado` é `null`; marca a chave de
   hoje; segunda chamada no mesmo dia → **não** dispara.
2. F1 dispara de novo no dia seguinte (chave de dia diferente).
3. F2 dispara quando `ultimoMesDisparado` difere do mês de `agora`;
   marca a chave; segunda chamada no mesmo mês → não dispara.
4. Precedência §3.4: `agora` = dia 1º com dia **e** mês novos →
   `avaliarRituais` devolve `f2` (não `f1`), e **ambos** os marcadores
   são atualizados (F1 fica suprimido o dia todo).
5. `chaveDia`/`chaveMes` usam data **local** (teste com `Date` cujo
   `toISOString` cairia em outro dia — assert de que a chave segue o
   componente local, não UTC).
6. `nomeMesPtBr`: mapeamento completo com acentos, incluindo
   `março` (índice 2) e o wrap janeiro→`dezembro` como mês fechado.

`tests/rituais/store.test.ts`:

7. `useRituais` hidrata com `null/null`; `marcarDiaDisparado` /
   `marcarMesDisparado` persistem; `resetar` volta a `null/null`.

### E2E Gauntlet (relógio controlado)

`tests/e2e/playwright/r-brand-8-rituais.e2e.ts` (copiado do template
`docs/templates/e2e-template.e2e.ts`), rodado via playwright MCP:

- **F1:** `setUltimoRitual('2026-07-13', '2026-07')` (ontem) →
  `dispararRituais('2026-07-14T00:01:00-03:00')` → assert overlay
  `novo dia.` visível + `estadoRituais().ritualAtivo === 'f1'`; após
  `onConcluir`, `estadoRituais().ultimoDiaDisparado === '2026-07-14'`;
  segundo `dispararRituais` mesmo dia → retorna `null` (sem segundo
  disparo).
- **F2:** `setUltimoRitual('2026-06-30', '2026-06')` →
  `dispararRituais('2026-07-01T09:00:00-03:00')` → assert selo com
  `junho fechado.` depois `julho começa.`; precedência confirma que F1
  **não** aparece nesse disparo (§3.4).
- **G1:** navegar a `/settings/sobre`; assert presença dos 5 rótulos
  acentuados (`extração`, `normalização`, `deduplicação`,
  `categorização`, `saída`) e que o diagrama não gira (posição estável).
- **Reduce-motion:** ativar `setFeatureToggle('reduzirMovimento', true)`
  e repetir F1/F2/G1 → assert overlay/selo/segmentos presentes **sem**
  movimento (rotação/filtro/pulso ausentes; mensagem ainda visível).

### Baseline

- `FAIL_BEFORE = 0` (suite verde; 355 arquivos de teste no baseline).
- `FAIL_AFTER = 0`. Total de testes **sobe** (7+ casos novos de rituais).
  Nunca reduzir contagem (template §Sumário de testes).

## 9. Proof-of-work esperado

- **Diff final** dos arquivos de §2.
- **Runtime real** (`VALIDATOR_BRIEF.md` §2, todos exit 0):
  ```bash
  cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
  ./scripts/check_anonimato.sh
  npx tsc --noEmit
  npm test --silent
  ./scripts/smoke.sh
  npx expo export --platform android --output-dir /tmp/r-brand-8-export \
    && grep -r "__gauntlet" /tmp/r-brand-8-export && echo "VAZAMENTO" || echo "dead-code ok" \
    ; rm -rf /tmp/r-brand-8-export
  ```
- **Validação visual Gauntlet (Nível A+, OBRIGATÓRIO):** `./gauntlet.sh`,
  navegar/clicar como app real, capturar PNGs reais em
  `docs/sprints/R-BRAND-8-RITUAIS-screenshots-gauntlet/`:
  - F1 overlay `novo dia.` (normal + reduce-motion).
  - F2 selo `junho fechado.` → `julho começa.` (normal + reduce-motion).
  - G1 pipeline na tela Sobre com os 5 rótulos (normal + reduce-motion).
  - **Paridade visual:** screenshot do Gauntlet lado a lado com o demo
    `docs/design/ouroboros/conceitos-ouroboros.html` aberto no Chrome,
    por conceito (design doc §7).
- **Checkpoint Nível C (celular físico):** F1/F2/G1 são JS puro
  (Reanimated 4, sem código nativo novo) — **dev-client atual segue
  válido, sem rebuild**. Pedir ao dono checkpoint visual curto (<2 min)
  ao fim: abrir a tela Sobre (G1) e, se possível, exercer F1/F2 via a
  extensão de relógio no dev-client. Declarar motivo, aguardar permissão.
- **Acentuação periférica:** varredura em todos os arquivos modificados:
  ```bash
  python3 scripts/check_strings_ui_ptbr.py
  python3 /home/andrefarias/.config/zsh/scripts/validar-acentuacao.py \
    --paths docs/sprints/R-BRAND-8-RITUAIS-spec.md docs/FEATURES-CANONICAS.md
  ```
- **Hipótese verificada:** rodar os `rg` do passo §0 e confirmar que os
  identificadores do glifo citados existem antes de construir sobre eles.

### Checklist obrigatório de manutenção (§9 do template)

- [ ] `docs/FEATURES-CANONICAS.md` — nova subseção 1.3 (rituais F1/F2 +
  pipeline G1) **no mesmo commit** (validador-sprint recusa sprint que
  toca UI sem esta atualização).
- [ ] `STATE.md` atualizado (HEAD + avanço da onda).
- [ ] `ROADMAP.md` atualizado (R-BRAND-8 fechada; próxima R-BRAND-9).
- [ ] `CHANGELOG.md` atualizado em `[Unreleased]`.
- [ ] Pasta de screenshots com ≥1 PNG real por ritual (não `.gitkeep`;
  BRIEF §1.9.2).

## 10. Commit

```
feat: r-brand-8-rituais f1 virada de dia + f2 fim de mes + g1 pipeline vivo na tela sobre
```

Disparo único por dia/mes persistido e testado (jest clock mockado + e2e
gauntlet com relogio controlado), reduce-motion nas duas vias,
features-canonicas atualizado.

## 11. Referências

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§3
  arquitetura, §4 mapa conceito→destino, §5 ondas, §6 armadilhas F1/F2
  persistência).
- Coreografias canônicas: `docs/design/ouroboros/coreografias-extraidas.js`
  — `mount_F1` (971-1034), `mount_F2` (1036-1093), `mount_G1` (1098-1198).
- Brand system vivo: `docs/design/ouroboros/conceitos-ouroboros.html`.
- BRIEF: `VALIDATOR_BRIEF.md` (§1.6 motion, §1.8 tom, §1.9 Gauntlet,
  A18/A27/A28 armadilhas).
- Template de spec: `docs/sprints/_template-spec.md`.
- Precedente de store persistida: `src/lib/stores/settings.ts`,
  `src/lib/stores/onboarding.ts`.
- Precedente de conceito animado + reduce-motion: R-BRAND-2-ANIMACOES
  (`src/components/brand/OuroborosFechamento.tsx`) e
  `docs/FEATURES-CANONICAS.md` §1.2.
