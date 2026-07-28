# Sprint R-BRAND-3-GLIFO — fundação do glifo animável + monomarks E1/E2/E3 + benchmark C2 (gate da onda)

```
ONDA:       R-BRAND-SYSTEM (design doc: docs/sprints/_ONDA-R-BRAND-SYSTEM.md).
            Esta é a SPRINT 0 (fundação) — bloqueia todas as demais.
DEPENDE:    - Hook useReduceMotion() já existe em src/lib/hooks/useReduceMotion
              (importado por OuroborosLoader.tsx:63, confirmado). Não é
              pré-requisito pendente.
            - Referências de design em docs/design/ouroboros/ (svg canônico,
              ouroboros-lib.js, coreografias-extraidas.js) presentes.
BLOQUEIA:   R-BRAND-4-ABERTURAS, R-BRAND-5-FEEDBACK, R-BRAND-6-LONGA-DURACAO,
            R-BRAND-7-ESTADOS-VIVOS, R-BRAND-8-RITUAIS, R-BRAND-9-MIGRACAO.
            Nenhuma pode iniciar antes do GATE de performance desta sprint.
ESTIMATIVA: ~1,5 a 2 dias. Sprint única (não sub-dividida): apesar de tocar
            fundação + 3 conceitos + benchmark, é uma única área arquitetural
            (o sistema de glifo novo) e o design doc §5 a define como uma
            entrega atômica cujo gate justifica o custo de 1 sprint isolada.
STATUS:     [ok] código mergeado em 2026-07-28 por AUDIT-P0-2 (glifo/,
            conceitos/, bench-c2 e os dois casos de teste). A sprint estava
            pronta no disco e fora do controle de versão desde 2026-07-14.
            RESSALVA: o gate de performance C2 (mediana >=45fps no device)
            NÃO foi medido — segue pendente do dono e continua bloqueando
            R-BRAND-4 e R-BRAND-7.
ORIGEM:     design doc _ONDA-R-BRAND-SYSTEM.md §3 (arquitetura) e §5 (linha 0
            da tabela de ondas). Decisões travadas pelo dono em 2026-07-14
            (motor Reanimated 4 puro; glifo base + 1 arquivo por conceito;
            prova de performance do pior caso C2 como primeira entrega).
VISAO:      a marca é uma anatomia estável (43 contas + rosto de 4 elementos +
            anel + wordmark) sobre a qual cada conceito dirige apenas
            opacidade/transform/cor. Esta sprint constrói essa anatomia como
            componente React Native animável por um driver de shared values,
            entrega os 3 monomarks mais simples (E1/E2/E3) como primeiros
            consumidores, e PROVA no device real que o pior caso contínuo (C2,
            43 contas escritas por frame) sustenta 45fps. Se não sustentar, a
            onda pausa e o pivô para Skia é redigido antes de qualquer sprint
            seguinte — limitando o risco de retrabalho a 1 sprint, não 7.
```

> **Nota de reconciliação de nome (não-objetivo).** Existe em disco um
> `docs/sprints/R-BRAND-3-ESTADOS-VIVOS-spec.md` **anterior** ao mapa de
> ondas atual. No design doc vigente (`_ONDA-R-BRAND-SYSTEM.md` §5) o
> conceito ESTADOS-VIVOS foi remapeado para `R-BRAND-7-ESTADOS-VIVOS`
> (onda 4), e o ID `R-BRAND-3` passou a ser a fundação do glifo. Esta
> sprint **NÃO toca** o arquivo antigo. Renomear/arquivar aquele spec é
> uma tarefa documental separada, fora de escopo aqui.

---

## 1. Contexto

O app tem hoje duas gerações de marca misturadas em `src/components/brand/`:
`OuroborosLogo.tsx` (fiel ao canônico, com as 43 contas já portadas como
dados) e `OuroborosLoader.tsx` / `OuroborosLoading.tsx` / `OuroborosFechamento.tsx`
(geração v1/R-BRAND-2, aproximações que não manipulam a anatomia real). O
brand system aprovado (design doc §1-§3) redefine a marca como **coreografias
sobre uma anatomia estável**: um glifo base expõe cada elemento anatômico
(43 contas, cabeça, cauda, boca, olho, anel, wordmark) como algo animável, e
cada um dos 17 conceitos (A1…G1) só dirige propriedades sobre esse glifo.

Esta sprint 0 constrói a fundação: a geometria canônica em dados, o porte puro
do ordenador de contas, o componente-glifo com driver de shared values, e os
3 monomarks estáticos/quase-estáticos (E1/E2/E3). Fecha com o **benchmark do
pior caso (C2)** no device real — o gate que decide se a onda inteira segue em
Reanimated 4 puro ou pivota para Skia.

---

## 2. Estado atual (arquivo:linha, confirmado por grep/read)

### 2.1 Dados geométricos já portados (fonte a promover)

- `src/components/brand/OuroborosLogo.tsx`:
  - `CONTAS` (:40-84): 43 tuplas `[cx, cy, hex]` idênticas às `#conta-01…#conta-43`
    do SVG (`docs/design/ouroboros/ouroboros.svg`:12-54, conferido conta a conta).
    `RAIO_CONTA = 7.5` (:85).
  - `D_ANEL_INTERNO` (:88-89) == path de `#bolinhas-internas` (svg:6). Atributos:
    `stroke=#bd93f9`, `strokeWidth=1.998`, `strokeDasharray=[0.6282, 6.2824]`,
    `strokeLinecap=round`, `opacity=0.55`.
  - `D_CAUDA` (:92) == `#head-focinho`, fill roxo `rgb(189,147,249)` = `#bd93f9`.
  - `D_CABECA` (:95) == `#head-coroa`, fill rosa `rgb(253,122,199)` = `#fc7ac8`.
  - `D_BOCA` (:98) == `#lingua`, fill `#4a1e64`, `fillOpacity=0.39`.
  - Olho (:153): `Circle cx=160.97 cy=41.39 r=1.9 fill=rgb(40,25,74) opacity=0.65`.
  - `viewBox="20.77 21.49 276.17 276.17"` (:125).
  - Wordmark renderizado como `<Text>` monospace (decisão M25 §10.3: evita
    pisca de fallback da fonte de marca mid-frame; **manter**, não vetorizar).

### 2.2 Constantes de centro (anti-wobble)

- `docs/design/ouroboros/ouroboros-lib.js`:125-126 e `coreografias-extraidas.js`:35:
  centro geométrico do logo `CENTRO = 158.91 / 159.84` (user units). Usado por
  `orderFromHead` e por todas as rotações do corpo.
- `coreografias-extraidas.js`:36 e o `transform-origin` de `#bolinhas-internas`
  no svg: `RING_CENTER = 160.91 / 159.84` — centro **real** do anel pontilhado,
  distinto do centro do corpo. Usar o RING_CENTER como origem de rotação do anel
  evita o wobble (o anel "gira torto" se rotacionado em 158.91/159.84).

> **Divergência a resolver no porte.** `OuroborosLogo.tsx` define
> `CENTRO_X=158.855 / CENTRO_Y=159.575` (:109-110), que é o centro do *viewBox*,
> usado só para posicionar o `<Text>` do wordmark. O centro **canônico de
> animação** é `158.91 / 159.84` (lib). `geometria.ts` deve exportar os dois
> valores canônicos do design doc (`CENTRO` e `RING_CENTER`) e nunca reaproveitar
> o centro-de-viewBox para rotação.

### 2.3 Ordenador de contas (a portar puro)

- `docs/design/ouroboros/ouroboros-lib.js`:123-155 — `orderFromHead(beads, direction)`:
  - `CX=158.91, CY=159.84`.
  - Calcula `atan2(cy-CY, cx-CX)` de cada conta, ordena crescente.
  - Âncora da cabeça: `atan2(41.39-CY, 160.97-CX)` (posição do olho). Acha a
    conta de ângulo mais próximo e rotaciona o array para começar nela.
  - `ccw`: `[rotated[0]] + rotated.slice(1).reverse()` → **conta-01 (pescoço,
    cx=119.63 cy=49.3) em [0]** e **conta-43 (perto da boca, cx=214.76 cy=54.58)
    em [42]**.
  - `cw`: `rotated` sem inverter.

### 2.4 Padrões de armadilha já validados no repo (copiar, não redescobrir)

- **M25.2 (web sem animatedProps em `<G>`/`<Circle>`):** fallback rAF + DOM
  `data-anim-id` + `setAttribute`, escopo por ref do `<Svg>`. Referência viva:
  `OuroborosLoader.tsx`:164-224.
- **R-CRIT-4 (colisão de `useId` entre árvores irmãs):** UUID por instância via
  `useRef`. Referência: `OuroborosLoader.tsx`:104-113 (`gerarUuidInstancia`) e
  :145-149 (`refUuid`).
- **A27 (Fabric rejeita transform string em SVG — `ClassCastException`):** em
  native usar prop `rotation`/`x`/`y` (ou array), nunca string; ramificar por
  `Platform.OS === 'web'`. Referência: `OuroborosLoader.tsx`:288-306; VALIDATOR_BRIEF §4 A27.
- **useReduceMotion incondicional:** `src/lib/hooks/useReduceMotion` (importado
  em `OuroborosLoader.tsx`:63); early-return sem armar loops quando reduzir.

### 2.5 Infra de suporte

- Tokens: `src/theme/tokens.ts` — `purple #bd93f9` (:12), `pink #ff79c6` (:13),
  `cyan #8be9fd` (:14), `red #ff5555` (:18), `fg #f8f8f2` (:9).
- Rotas dev: `app/_dev/_layout.tsx` faz gate por `MODO_DEV_WEB`
  (`@/lib/dev/gauntletAtivo`); rotas `/_dev/*` viram dead-code em release.
- Gauntlet: `./gauntlet.sh` sobe `./run.sh --web` + navega `/_dev/gauntlet`.
  API `window.__gauntlet` (reset/seed/abrir/estado) e sonda equivalente ao
  `window.__obProbe()` do brand system (opacidade computada do rosto por fase).
- Testes Jest: `jest.config.js`:55-58 casa `tests/**/*.test.ts(x)`.
- E2E: template real em `tests/e2e/playwright/e2e-template.ts`.

---

## 3. Escopo (touches autorizados)

**Arquivos a criar:**

- `src/components/brand/glifo/geometria.ts` — dados canônicos.
- `src/components/brand/glifo/ordenarDaCabeca.ts` — port puro de `orderFromHead`.
- `src/components/brand/glifo/OuroborosGlifo.tsx` — render canônico + driver.
- `src/components/brand/glifo/index.ts` — barrel do glifo.
- `src/components/brand/conceitos/E1HeadOnly.tsx` — head-only (blink olho 5s).
- `src/components/brand/conceitos/E2RingOnly.tsx` — só-anel (rotação 40s).
- `src/components/brand/conceitos/E3Wordmark.tsx` — wordmark + ponto (estático).
- `src/components/brand/conceitos/index.ts` — barrel dos conceitos.
- `app/_dev/bench-c2.tsx` — protótipo do benchmark C2 (dev-only, dead-code em
  release; mede fps do driver de 43 contas no device).
- `tests/components/ordenarDaCabeca.test.ts` — teste unitário puro (sem render).
- `tests/e2e/playwright/r-brand-3-glifo.e2e.ts` — caso E2E (cópia do template).

**Arquivos a modificar:**

- `src/components/brand/OuroborosLogo.tsx` — **refatoração cirúrgica**: substituir
  os `const` inline (`CONTAS`, `RAIO_CONTA`, `D_ANEL_INTERNO`, `D_CAUDA`,
  `D_CABECA`, `D_BOCA`, olho, viewBox) por imports de `geometria.ts`, com valores
  **byte-idênticos**. Objetivo: fonte única, sem duas cópias das 43 contas
  divergindo. Paridade visual obrigatória (§9). Se a paridade não fechar, reverter
  a refatoração do Logo e registrar como sub-sprint colateral (`geometria.ts` é
  entregue mesmo assim; o Logo consome numa sprint dedicada).
- `src/components/brand/index.ts` — reexportar `glifo/` e `conceitos/`.
- `docs/FEATURES-CANONICAS.md` — nova subseção §1.3 (obrigatório, mesmo commit;
  validador-sprint recusa sem esta atualização).

**Arquivos NÃO a tocar (invariantes):**

- `src/components/brand/OuroborosLoader.tsx` — 14 consumidores; só é aposentado
  na R-BRAND-9. Serve apenas como **referência** dos padrões M25.2/R-CRIT-4/A27.
- `src/components/brand/OuroborosLoading.tsx`, `OuroborosFechamento.tsx` — geração
  R-BRAND-2; aposentadas na R-BRAND-9, intocadas aqui.
- Os `mount_*` de `coreografias-extraidas.js` e o SVG canônico — são **fonte de
  leitura**; portar a matemática literalmente, nunca editar os arquivos de design.

---

## 4. Acceptance criteria

1. `geometria.ts` exporta as 43 contas (`[cx, cy, hex]`), `RAIO_CONTA=7.5`, os
   4 paths/elementos do rosto, o anel (path + atributos), o wordmark (constantes
   de texto), `CENTRO={x:158.91,y:159.84}`, `RING_CENTER={x:160.91,y:159.84}` e
   o `viewBox` canônico — todos byte-idênticos aos valores confirmados em §2.
2. `ordenarDaCabeca.ts` é **função pura** (opera sobre dados `{id,cx,cy}`, sem
   DOM/render) e reproduz `orderFromHead`: para `ccw`, `ordem[0].id==='conta-01'`
   e `ordem[42].id==='conta-43'`; para `cw`, a ordem é a rotação sem inversão.
   Coberto por teste Jest verde.
3. `OuroborosGlifo.tsx` renderiza o glifo canônico idêntico (paridade visual) ao
   `OuroborosLogo` atual quando estático, e aceita um **driver** opcional de shared
   values por elemento anatômico (43 contas + cabeça + cauda + boca + olho + rotação
   do anel) além de overrides de cor. Sem driver → estático. Props de recorte
   (`hideBeads`/`hideRosto`/`hideRing`/`hideWordmark`, subset de contas, override
   de viewBox) equivalentes às `opts` do `OB.create`.
4. Em web (Gauntlet), o driver anima via fallback rAF+DOM `data-anim-id` (M25.2)
   com UUID por instância (R-CRIT-4) e escopo por ref; em native nunca emite
   transform string em SVG (A27). `useReduceMotion` incondicional no topo; com
   reduce-motion ativo, todo conceito assume seu **estado estático canônico**
   (E1: head-only visível; E2: anel parado; E3: já é estático).
5. E1/E2/E3 renderizam fiéis aos respectivos `mount_E1`/`mount_E2`/`mount_E3`:
   - **E1** (`E1HeadOnly`): viewBox recortado `90 30 140 55`, apenas contas
     `01/02/42/43` + rosto visíveis, blink do olho (opacity 0.65↔0) a cada ~5,2s;
     rosto sempre visível por design.
   - **E2** (`E2RingOnly`): só o anel, rotação contínua 40s/rev com origem em
     `RING_CENTER` (sem wobble).
   - **E3** (`E3Wordmark`): lockup estático — ponto em degradê (pink→purple),
     "ouroboros" (mono, roxo) e "protocolo" (mono, secundário, tracking largo).
6. **Benchmark C2 medido no device real** (dev-client + Metro USB) com resultado
   numérico registrado no proof-of-work. Gate: **fps sustentado ≥ 45** (§7). Abaixo
   disso, a onda **pausa** e um spec de pivô Skia é redigido antes de R-BRAND-4.
7. Smoke verde (`./scripts/smoke.sh`): anonimato (Regra −1), strings UI PT-BR,
   `tsc --noEmit`, eslint, `npm test`. Baseline Jest ≥ 1126 testes, sem regressão.
8. `docs/FEATURES-CANONICAS.md` §1.3 atualizado no mesmo commit; caso E2E presente;
   screenshots Gauntlet A+ em `docs/sprints/R-BRAND-3-GLIFO-screenshots-gauntlet/`.

---

## 5. Invariantes a preservar

- **Regra −1 (anonimato).** Zero nome de pessoa/IA/ferramenta em código. O único
  texto permitido é o wordmark (nome do PRODUTO: "ouroboros"/"protocolo").
- **Identidade de pessoas / cores fixas.** `pessoa_a → #bd93f9`, `pessoa_b → #ff79c6`.
  O tint por pessoa (B3) NÃO é desta sprint, mas o driver de cor deve ser desenhado
  para acomodá-lo depois (override de fill por conta/rosto).
- **Regra de Tom / ADR-010.** Nada gira à toa (E2 gira porque é anel-loading; E1
  respira só no olho; E3 é estático). Springs/física, silêncio visual, sem confete,
  sem gamificação. A cobra nunca é ornamento.
- **Regra de Linguagem.** Comentários de código em PT-BR **sem acento** (convenção
  CI); strings de UI em PT-BR **com acento** completo; commit **sem acento**.
- **Reduce-motion (VALIDATOR_BRIEF §4, R-AUDIT-A11Y-MOVIMENTO).** `useReduceMotion`
  incondicional; estado estático canônico definido pelo próprio brand system.
- **Armadilhas VALIDATOR_BRIEF §4:** A27 (sem transform string em Fabric), M25.2
  (rAF+DOM em web), R-CRIT-4 (UUID por instância), A42 (nunca envolver `gauntlet.sh`
  em `nohup ... &`; deixar o script gerenciar Metro).
- **Anti-wobble.** Rotação do corpo em `CENTRO`; rotação do anel em `RING_CENTER`.
  Não misturar.
- **Fonte única de geometria.** Depois desta sprint, as 43 contas e os paths vivem
  só em `geometria.ts`. Nenhum outro arquivo redeclara os dados.

---

## 6. Plano de implementação

### 6.1 `geometria.ts`

1. Exportar `CONTAS: ReadonlyArray<readonly [number, number, string]>` — copiar
   `OuroborosLogo.tsx`:40-84 verbatim. Manter os comentários `// conta-NN`.
2. Exportar `RAIO_CONTA = 7.5`, `VIEWBOX = '20.77 21.49 276.17 276.17'`.
3. Exportar os paths e atributos do rosto e anel: `ANEL` (`{ d, stroke, strokeWidth,
   dash, cap, opacity }`), `CAUDA` (`{ d, fill:'#bd93f9' }`), `CABECA`
   (`{ d, fill:'#fc7ac8' }`), `BOCA` (`{ d, fill:'#4a1e64', fillOpacity:0.39 }`),
   `OLHO` (`{ cx:160.97, cy:41.39, r:1.9, fill:'rgb(40,25,74)', opacity:0.65 }`).
4. Exportar `CENTRO = { x: 158.91, y: 159.84 }` e `RING_CENTER = { x: 160.91, y: 159.84 }`.
5. Exportar o wordmark como constantes de texto (`WORDMARK = { primaria:'OUROBOROS',
   secundaria:'PROTOCOLO', ... }`) — mantém a decisão M25 §10.3 (`<Text>` monospace,
   não vetorizado).
6. Comentário de cabeçalho **sem acento** citando o SVG canônico como origem.

### 6.2 `ordenarDaCabeca.ts`

1. Assinatura pura: `ordenarDaCabeca(contas: { id:string; cx:number; cy:number }[],
   direction: 'ccw' | 'cw'): { id:string; cx:number; cy:number }[]`.
2. Portar `orderFromHead` (lib:123-155) literalmente: `atan2` relativo a `CENTRO`,
   sort crescente, âncora da cabeça `atan2(41.39-159.84, 160.97-158.91)`, rotação
   para a conta mais próxima, e a inversão condicional do `ccw`.
3. Sem dependência de DOM/Reanimated — roda em Node/Jest.
4. Helper opcional `contasComId()` em `geometria.ts` ou aqui para produzir a lista
   `{id:'conta-01',cx,cy}` a partir de `CONTAS` (os ids seguem a ordem de `CONTAS`,
   que é `conta-01…conta-43`).

### 6.3 `OuroborosGlifo.tsx`

1. Props: `tamanho`, `mostrarTexto`, recortes (`hideBeads`/`hideRosto`/`hideRing`/
   `hideWordmark`), `contasVisiveis?: string[]` (subset — para E1), `viewBox?`
   (override — para E1), e `driver?` (objeto de shared values + overrides de cor).
2. Cada conta é um `AnimatedCircle` com `useAnimatedProps` lendo
   `driver?.contas?.[i]` (opacity); rosto e anel idem. Sem driver, render estático
   com os valores de repouso da `geometria.ts`.
3. Coreografias contínuas usam **um único worklet** `useFrameCallback` que escreve
   nas shared values — nunca `setState` por frame. (Nesta sprint só E2 usa rotação
   contínua; E1 usa um timer simples de blink; o worklet de 43 contas é exercido
   pelo benchmark 6.5.)
4. Web (M25.2): `useEffect` com `Platform.OS==='web'` + rAF que escreve
   `opacity`/`transform`/`stroke-dashoffset` via `data-anim-id`+`setAttribute`,
   escopado ao `refSvg`. UUID por instância via `useRef` (R-CRIT-4, reusar o
   `gerarUuidInstancia` — extrair para util compartilhado ou replicar).
5. Native (A27): rotação via prop `rotation` + `originX/originY`; nunca string.
6. `useReduceMotion` no topo; se reduzir, não arma loops nem rAF.
7. Paridade com `OuroborosLogo` estático: mesma ordem de desenho (anel → 43 contas
   → cauda → cabeça → olho → boca → wordmark).

### 6.4 Conceitos E1/E2/E3

1. `E1HeadOnly.tsx`: consome `OuroborosGlifo` com `hideRing hideWordmark`,
   `contasVisiveis=['conta-01','conta-02','conta-42','conta-43']`,
   `viewBox='90 30 140 55'`. Blink: `setInterval` ~5200ms mexendo só a opacity do
   olho (0.65→0→0.65 em ~140ms). Reduce-motion: sem blink, olho em 0.65.
2. `E2RingOnly.tsx`: `OuroborosGlifo` com `hideBeads hideRosto hideWordmark`;
   rotação do anel 40s/rev com origem `RING_CENTER`. A27/M25.2 pelos padrões do
   driver. Reduce-motion: anel parado.
3. `E3Wordmark.tsx`: composição RN estática (não dirige a anatomia) — ponto em
   degradê pink→purple + `<Text>` "ouroboros" (mono, `colors.purple`) + `<Text>`
   "protocolo" (mono, secundário, tracking largo, uppercase). Usar as constantes
   de `WORDMARK` da `geometria.ts`.
4. Barrels e reexport no `src/components/brand/index.ts`.

### 6.5 Benchmark C2 (protótipo, `app/_dev/bench-c2.tsx`)

1. Rota dev-only (herdando o gate `MODO_DEV_WEB` do `app/_dev/_layout.tsx`;
   dead-code em release, como o gauntlet).
2. Renderiza `OuroborosGlifo` completo (43 contas + rosto) com um driver C2:
   **um** `useFrameCallback` que a cada frame computa a onda gaussiana de
   `mount_C2` (coreografias:543-570) e escreve as shared values:
   ```
   t = ((now - start) / 2400) % 1
   para i em [0,43):  d = |t - i/43|;  se d>0.5: d = 1-d
                      contas[i].value = 0.15 + 0.85 * exp(-d*d*80)
   dh = t>0.5 ? 1-t : t;  face = 0.3 + 0.7*exp(-dh*dh*60)
   cabeca=cauda=boca=face;  olho=face*0.65
   ```
   Total: **47 shared values escritas por frame** (43 contas + 4 do rosto), zero
   re-render React.
3. Instrumentação de fps (§7): contador no próprio worklet + `runOnJS` a cada 1s
   reportando/zerando; overlay de fps na tela para o screencap.
4. Este protótipo **não** é o C2 final (a entrega fiel de C2 é a R-BRAND-5); é só o
   pior caso para o gate. Manter mínimo.

---

## 7. Aritmética do benchmark (gate numérico da onda)

Esta é a **meta numérica** da sprint. Não há meta de linhas; o número que fecha é o fps.

**Carga por frame:** 43 contas (`AnimatedCircle`/`useAnimatedProps` de opacity) +
4 elementos do rosto = **47 escritas de shared value/frame** no UI thread, via 1
worklet `useFrameCallback`. Custo dominante hipotético: o commit de ~43 props SVG
por frame no device mid-range.

**Orçamento de frame:**

- 60fps ideal → 16,7ms/frame.
- Gate 45fps → 22,2ms/frame (`1000/45`).

**Janela de medição:** 20s de animação contínua após 3s de warm-up, no device
**real do dono** (Galaxy A32 / HyperOS, mid-range — o alvo mais fraco; ver
memórias A32). Frames esperados na janela: 60fps→1200; 45fps→900.
`fps_sustentado = frames_medidos / segundos_medidos`.

**Método de medição (dois, para corroborar):**

- Primário: contador de frames no worklet do driver, reportado por `runOnJS` a
  cada 1s; mediana da janela de 20s.
- Corroboração: Perf Monitor nativo (overlay UI/JS fps) e/ou
  `adb shell dumpsys gfxinfo <pkg> framestats`.
- Evidência: `adb shell screenrecord` de ~20s da tela `/_dev/bench-c2` + log de fps
  colado no proof-of-work.

**Critério de gate (3 execuções):**

- `mediana(fps_sustentado) ≥ 45` → **GATE APROVADO**. A onda segue para
  R-BRAND-4-ABERTURAS mantendo Reanimated 4 puro. Registrar o número real.
- `mediana(fps_sustentado) < 45` → **GATE REPROVADO**. A onda **PAUSA**. Redigir o
  spec de pivô (`R-BRAND-3b-SKIA-PIVOT-spec.md` ou equivalente) — driver de contas
  em `@shopify/react-native-skia` — **antes** de qualquer sprint seguinte. O número
  reprovado e o screenrecord vão no spec de pivô como baseline.

---

## 8. Testes

- **Jest (novo):** `tests/components/ordenarDaCabeca.test.ts`
  - `ccw`: `ordem[0].id === 'conta-01'` e `ordem[42].id === 'conta-43'`; comprimento 43.
  - `cw`: primeira conta é a mais próxima da âncora da cabeça e a ordem não é
    invertida em relação ao `ccw` no restante.
  - Determinismo: mesma entrada → mesma saída (sem dependência de ordem de `CONTAS`).
  - Baseline: `FAIL_BEFORE = 0` (arquivo novo), `FAIL_AFTER = 0`. Suite total
    ≥ 1126 verde, sem regressão.
- **E2E (novo):** `tests/e2e/playwright/r-brand-3-glifo.e2e.ts` (cópia de
  `tests/e2e/playwright/e2e-template.ts`): navega ao showcase/gauntlet, renderiza
  E1/E2/E3, e faz asserts de comportamento (não só presença):
  - E1: olho existe e pisca (opacity oscila) — checar via sonda de opacidade.
  - E2: anel presente e `transform`/rotação avança entre dois frames (não estático).
  - E3: wordmark "ouroboros"/"protocolo" presente e ponto renderizado.
  - Reduce-motion (via toggle do gauntlet, se disponível): E2 estático.

---

## 9. Proof-of-work esperado

- **Diff final** dos arquivos criados/modificados (§3).
- **Runtime real:**
  - Smoke: `./scripts/smoke.sh` (anonimato + strings PT-BR + `tsc --noEmit` +
    eslint + `npm test`).
  - Unit alvo: `npm test -- tests/components/ordenarDaCabeca.test.ts`.
  - Typecheck: `npx --no-install tsc --noEmit`.
  - Gauntlet web: `./gauntlet.sh` → navegar `/_dev/gauntlet` (e showcase),
    renderizar E1/E2/E3, clicar/observar como app real antes de declarar `[ok]`.
  - Benchmark device: `./run.sh --device` (dev-client + Metro USB), abrir
    `/_dev/bench-c2`, medir fps (3 execuções), `adb shell screenrecord`,
    `adb shell dumpsys gfxinfo` — números colados aqui (§7).
- **Validação visual (UI):** screenshots Gauntlet A+ em
  `docs/sprints/R-BRAND-3-GLIFO-screenshots-gauntlet/` (E1, E2, E3, glifo estático),
  com **paridade lado a lado** contra os demos correspondentes de
  `docs/design/ouroboros/conceitos-ouroboros.html` abertos no Chrome. Incluir sha256
  dos PNGs. Paridade do `OuroborosLogo` refatorado vs. versão atual (antes/depois).
- **Acentuação periférica:** `python3 scripts/check_strings_ui_ptbr.py` + varredura
  manual de strings UI em todos os arquivos modificados (E3 tem texto de UI).
- **Hipótese verificada (lição 4):** `rg` dos identificadores citados neste spec
  (`orderFromHead`, `mount_C2`, `mount_E1`, `gerarUuidInstancia`, `useReduceMotion`,
  `MODO_DEV_WEB`, `CONTAS`, `RAIO_CONTA`, `useFrameCallback`) antes de iniciar.
- **FEATURES-CANONICAS.md** atualizado no mesmo commit: nova subseção **§1.3
  R-BRAND-3-GLIFO** — descreve o glifo base (`OuroborosGlifo` + `geometria.ts` +
  `ordenarDaCabeca.ts`), a tabela E1/E2/E3 e o **resultado do gate de performance**
  (fps medido, Reanimated puro confirmado OU pivô Skia acionado).

---

## 10. Riscos e não-objetivos

- **Não-objetivo:** implementar A1/A2/B*/C1/C2-fiel/C3/D*/F*/G1. Só E1/E2/E3 +
  fundação + benchmark. Qualquer conceito além disso é sprint da onda (§5 do design doc).
- **Não-objetivo:** migrar os 14 consumidores do `OuroborosLoader` (isso é R-BRAND-9).
- **Não-objetivo:** aposentar `OuroborosLoader`/`OuroborosLoading`/`OuroborosFechamento`
  (R-BRAND-9).
- **Não-objetivo:** tint por pessoa (B3), widget nativo (B2), reconciliar o nome do
  spec antigo `R-BRAND-3-ESTADOS-VIVOS`.
- **Risco (mapeado no design doc §6):** 43 contas/frame é hipótese não provada em RN
  — por isso o benchmark é a entrega desta sprint; reprovação limita retrabalho a 1
  sprint (pivô Skia), não a onda inteira.
- **Risco:** refatorar `OuroborosLogo` para consumir `geometria.ts` pode introduzir
  divergência visual sutil. Mitigação: paridade antes/depois obrigatória (§9); se
  falhar, entregar `geometria.ts` sem tocar o Logo e adiar o consumo.
- **Protocolo anti-débito:** se durante a execução surgir escopo novo (ex.: um util
  compartilhado de UUID, ou a necessidade de expor uma sonda `__obProbe` no
  gauntlet), registrar como sprint/sub-sprint nova em vez de inflar esta.

---

## 11. Referências

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§3 arquitetura, §5
  ondas, §6 armadilhas).
- Coreografias: `docs/design/ouroboros/coreografias-extraidas.js`
  (`mount_C2`:543-570, `mount_E1`:893-930, `mount_E2`:932-951, `mount_E3`:953-966,
  `CENTER`/`RING_CENTER`:35-36).
- Anatomia: `docs/design/ouroboros/ouroboros-lib.js` (`orderFromHead`:123-155).
- Glifo canônico: `docs/design/ouroboros/ouroboros.svg` (`#conta-01…43`, `#head-coroa`,
  `#head-focinho`, `#eye`, `#lingua`, `#bolinhas-internas`, `#wordmark`).
- Base aproveitável: `src/components/brand/OuroborosLogo.tsx` (dados) e
  `OuroborosLoader.tsx` (padrões M25.2/R-CRIT-4/A27).
- Armadilhas: `VALIDATOR_BRIEF.md` §1.9 (Gauntlet), §4 (A27, M25.2, R-CRIT-4, A42).
- Regras de projeto: `CLAUDE.md` (Regra −1, Tom, Linguagem, Validação Visual).
- Precedente de spec da mesma onda: `docs/sprints/R-BRAND-ASSETS-APP-spec.md`,
  `docs/sprints/R-BRAND-3-ESTADOS-VIVOS-spec.md` (formato).
</content>
</invoke>
