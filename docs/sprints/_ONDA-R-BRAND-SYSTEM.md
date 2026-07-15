# Onda R-BRAND-SYSTEM — As 17 Animações da Marca

Design doc da onda. Aprovado pelo dono em 2026-07-14 (5 decisões via
checkpoint interativo). Fonte da verdade dos conceitos:
[`docs/design/ouroboros/conceitos-ouroboros.html`](../design/ouroboros/conceitos-ouroboros.html)
(brand system vivo, 7 seções, 17 conceitos A1–G1). Código de referência
de cada coreografia extraído em
[`docs/design/ouroboros/coreografias-extraidas.js`](../design/ouroboros/coreografias-extraidas.js)
(funções `mount_A1` … `mount_G1` — portar a matemática literalmente).

## 1. Contexto

O brand system define a marca como **coreografias sobre uma anatomia
estável**: o SVG canônico (`docs/design/ouroboros/ouroboros.svg`) tem
43 contas (`#conta-01`…`#conta-43`), rosto de 4 elementos
(`#head-coroa` cabeça, `#head-focinho` cauda, `#lingua` boca, `#eye`
olho), anel pontilhado (`#bolinhas-internas`) e wordmark. A
`ouroboros-lib.js` expõe essa anatomia como API (`beads`, `rosto`,
`ring`, `wordmark`, `orderFromHead`) e cada conceito só dirige
opacidade/transform/cor sobre ela.

O app hoje tem duas gerações misturadas em `src/components/brand/`:

- `OuroborosLogo.tsx` — fiel ao canônico (43 contas já portadas como
  dados). Base aproveitável.
- `OuroborosLoader.tsx` — desenho v1 **ultrapassado** (4 anéis
  `gs-spin`, cabeça própria), 14 consumidores.
- `OuroborosLoading.tsx` / `OuroborosFechamento.tsx` (R-BRAND-2) —
  aproximações de C2/E2/C1 que não manipulam a anatomia real.

## 2. Decisões Travadas (2026-07-14)

1. **Substituição total.** O sistema novo substitui o `OuroborosLoader`
   nos 14 pontos; os 3 componentes da geração antiga são aposentados ao
   final da onda (sprint de migração dedicada).
2. **Motor: Reanimated 4 puro** (zero dep nativa nova; dev-client atual
   segue válido; Gauntlet web funciona). Sprint 0 inclui **prova de
   performance** do pior caso (C2, 43 contas/frame) no device real.
   Gate: ≥45fps sustentado; abaixo disso, pivô para Skia documentado
   antes de qualquer sprint seguinte.
3. **A1 no boot, A2 no onboarding.** A1 é a splash canônica de todo
   boot; A2 exclusivo do primeiro uso (semente → sistema = vault
   nascendo).
4. **B2 in-app agora, widget nativo no fim.** Versão widget
   (`modules/widget-homescreen/`, código nativo → rebuild de
   dev-client) vira sprint própria opcional no fim da onda.
5. **Arquitetura: glifo base + 1 arquivo por conceito** (paridade com
   `ouroboros-lib.js` + `mount_XX`).

## 3. Arquitetura

```
src/components/brand/glifo/
  geometria.ts         43 contas [cx, cy, cor] (promovidas de OuroborosLogo.tsx),
                       paths do rosto extraídos de ouroboros.svg, anel, wordmark,
                       CENTRO 158.91/159.84 · RING_CENTER 160.91/159.84 (anti-wobble)
  ordenarDaCabeca.ts   port puro do orderFromHead (ccw/cw) — Jest sem render
  OuroborosGlifo.tsx   render canônico com anatomia animável via driver
src/components/brand/conceitos/
  A1NascerDaCobra.tsx … G1PipelineVivo.tsx   (1 arquivo fino por conceito)
```

**Driver:** o glifo aceita shared values por elemento anatômico
(43 contas + 4 rosto + anel + wordmark) e overrides de cor (B3 tint
`pessoa_a`/`pessoa_b`, C3 vermelho `#ff5555`, G1 segmentos). Cada conta
é sub-componente com `useAnimatedProps`; coreografias contínuas
(C2, D1, D3, G1) usam **um único worklet `useFrameCallback`** que
escreve nas 43 shared values por frame — zero re-render React.

**Web (Gauntlet):** rn-svg-web não propaga `animatedProps` em
`<G>`/`<Circle>` (armadilha M25.2) — mesmo fallback rAF + DOM
`data-anim-id` + `setAttribute` já validado no `OuroborosLoader`,
com UUID por instância (R-CRIT-4) e escopo por ref (defense-in-depth).

**Native (Fabric):** nunca transform string em SVG (A27
ClassCastException) — usar `rotation`/`x`/`y` props ou arrays.

**Reduce-motion:** `useReduceMotion` incondicional no topo de todo
conceito; estado estático canônico definido pelo próprio brand system
(A1/A2 → logo completo; C3 → alerta congelado; D3 → 100%; B* → glifo
em repouso). One-shots com `onConcluir` disparam imediato no mount.

**Tom e estética:** princípios do brand system são lei — nada gira à
toa; fechar é celebrar sem confete; a cobra nunca é ornamento; loading
é apresentação da marca. Compatível com ADR-010 (springs, silêncio
visual, micro-interações pontuais).

## 4. Mapa Conceito → Destino no App

| ID | Conceito | Destino | Modo |
|----|----------|---------|------|
| A1 | nascer da cobra | splash do boot (`_layout`, hidratação do vault) | one-shot 1.2s |
| A2 | semente que expande | reveal do onboarding (primeiro uso) | one-shot 1.4s |
| B1 | respiração ambiente | header da Home (presença idle) | contínuo 4s |
| B2 | relógio silencioso | mini-glifo in-app (30°/hora, snap spring); widget → sprint final | contínuo |
| B3 | dupla presença | card "vocês" · onboarding tela 24 · Recap (tint pessoa_a/b, boca cyan) | contínuo 32s |
| C1 | fechamento do ciclo | save humor/diário/treino (cascata 10ms + flash boca/cauda + haptic) | one-shot 350ms |
| C2 | digestão onda contínua | sync/backup do vault (pulso gaussiano, rosto em fase) | contínuo 2.4s/rev |
| C3 | rejeição atenta | OCR falhou no scanner · arquivo ilegível no import | one-shot ~2.5s |
| D1 | contas por arquivo | import em lote (arquivo n/N no rodapé) | progresso real |
| D2 | fluxo vault | sync Obsidian/Syncthing (sparks com nomes reais dos .md — runtime local, Regra −1 ok) | contínuo |
| D3 | logo com percentual | processamento longo com % real (prop 0→1) | progresso real |
| E1 | head-only | contextos nano (blink do olho 5s opcional) | quase-estático |
| E2 | ring-only | chips · bullets · loading inline (rotação 40s) | contínuo |
| E3 | wordmark + ponto | tela Sobre · rodapé settings | estático |
| F1 | virada de meia-noite | app aberto na virada — "novo dia." 1.5s, **1x/dia persistido** | ritual |
| F2 | fim de mês | primeiro acesso após virada de mês — desatura + badge "junho fechado. / julho começa." | ritual |
| G1 | cobra como pipeline | tela Sobre — 5 segmentos ETL coloridos + pulso de dado cabeça→cauda (não gira) | contínuo 5.2s |

Diferença consciente do HTML: demos rodam em loop para exposição; no
app, one-shots executam uma vez e contínuos vivem só enquanto o estado
que os justifica durar (princípio 03).

## 5. Ondas de Sprint

| # | Sprint | Entrega | Gate de saída |
|---|--------|---------|---------------|
| 0 | `R-BRAND-3-GLIFO` | geometria + ordenarDaCabeca + OuroborosGlifo + E1/E2/E3 + **benchmark C2 no device** | ≥45fps sustentado via dev-client; senão pivô Skia documentado e onda pausada |
| 1 | `R-BRAND-4-ABERTURAS` | A1 boot + A2 onboarding | Gauntlet + device |
| 2 | `R-BRAND-5-FEEDBACK` | C1 fiel + C2 fiel + C3 | haptic C1 = checkpoint Nível C curto |
| 3 | `R-BRAND-6-LONGA-DURACAO` | D3 + D2 + D1 | progresso real (nunca simulado) |
| 4 | `R-BRAND-7-ESTADOS-VIVOS` | B1 + B2 in-app + B3 | tint canônico pessoa_a/b |
| 5 | `R-BRAND-8-RITUAIS` | F1 + F2 + G1 | disparo 1x/dia/mês persistido e testado |
| 6 | `R-BRAND-9-MIGRACAO` | migra 14 consumidores; aposenta Loader/Loading/Fechamento v1 | zero referência à geração antiga no bundle |
| 7 | `R-BRAND-10-WIDGET-B2` (opcional) | B2 no widget nativo | rebuild dev-client agrupado aqui |

Cada sprint segue o rito integral: spec própria em `docs/sprints/`
(via planejador-sprint, com proof-of-work), caso E2E playwright,
screenshots Gauntlet A+, reduce-motion validado nas duas vias,
`FEATURES-CANONICAS.md` atualizado no mesmo commit, smoke verde, push.

## 6. Riscos e Armadilhas Mapeadas

- **43 contas/frame** é hipótese não provada em RN — por isso o gate
  de perf é a primeira entrega da onda (risco de retrabalho limitado a
  1 sprint, não 7).
- **M25.2** (web sem animatedProps em G) e **A27** (Fabric rejeita
  transform string) já têm padrão validado no repo — copiar, não
  redescobrir.
- **R-CRIT-4** (colisão de useId entre árvores) — UUID por instância.
- **Fontes dos overlays** (D2 sparks, D3 percentual, F1 "novo dia."):
  usar a fonte mono do tema, `fontVariant: tabular-nums` no percentual.
- **F1/F2 persistência**: store zustand pequena com data do último
  disparo (dia para F1, mês para F2); testes de virada em Jest com
  clock mockado.
- **D2 nomes reais dos .md**: exibição runtime local apenas — nunca
  fixture versionada com nome real (Regra de Dados de Teste).

## 7. Proof-of-work da Onda (resumo)

- Benchmark C2: gravação de tela + medição de fps no device
  (dev-client + Metro USB), registrado no spec da sprint 0.
- `window.__obProbe()` do brand system tem equivalente: cada conceito
  expõe estado inspecionável no Gauntlet (`window.__gauntlet`) para os
  asserts E2E (opacidade do rosto por fase, ângulo do B2, disparo único
  do F1).
- Paridade visual: screenshot do Gauntlet lado a lado com o demo do
  `conceitos-ouroboros.html` aberto no Chrome, por conceito entregue.
