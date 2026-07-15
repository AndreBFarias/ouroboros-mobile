# Sprint R-BRAND-4-ABERTURAS — as duas aberturas da marca (A1 nascer da cobra no boot · A2 semente que expande no onboarding)

```
DEPENDE:    (hard, BLOQUEANTE — verificado 2026-07-14)
            - R-BRAND-3-GLIFO mergeada. Hoje NÃO existe:
              `src/components/brand/glifo/` e `src/components/brand/conceitos/`
              ausentes no repo (ls confirmou; grep OuroborosGlifo em src/ e app/
              = 0 ocorrencias). A1/A2 sao "arquivos finos por conceito" que
              DIRIGEM o glifo (shared values por conta/rosto/anel/wordmark) e
              CONSOMEM `ordenarDaCabeca` — não re-portam o SVG nem o fallback
              web. Sem o glifo base + driver + `ordenarDaCabeca` esta sprint
              NÃO tem sobre o que montar. Ver seção 2 (contrato exigido do glifo).
            - O gate de performance da R-BRAND-3-GLIFO (benchmark C2, 43
              contas/frame, >=45fps no device) define o MOTOR. Se aquele gate
              pivotou para Skia, A1/A2 seguem a mesma decisao de motor. Herdado.
            - useReduceMotion() (src/lib/hooks/useReduceMotion.ts) — JA existe,
              A28-safe (so useState/useEffect + bridge AccessibilityInfo, sem
              Moti/Reanimated), roda no boot path. Consumido incondicional no
              topo de A1 e A2.
BLOQUEIA:   R-BRAND-9-MIGRACAO parcialmente. A1 aposenta 1 dos 14 consumidores
            do OuroborosLoader (o de boot em _layout:440) ja nesta sprint; os
            outros 13 continuam intocados ate a R-BRAND-9.
ESTIMATIVA: 1 sprint unica, 2 conceitos irmaos (A1, A2) que compartilham a
            mesma disciplina (one-shot + onConcluir + reduce-motion), mesmo
            glifo base e mesmo driver. ~1,5-2 dias. Nao dividir: as duas
            aberturas sao a mesma familia de coreografia (cascata de contas +
            rosto em fase + wordmark ao final), diferindo so no gesto de
            entrada (cascata cabeca->cauda vs voo do centro). Somam 2 arquivos
            novos + 2 pontos de montagem. Abaixo do limiar de split (licao 10).
STATUS:     [todo] (2026-07-14) — BLOQUEADA por R-BRAND-3-GLIFO ate merge.
ORIGEM:     Onda R-BRAND-SYSTEM, §4 (mapa conceito->destino) e §5 linha 1
            (`R-BRAND-4-ABERTURAS | A1 boot + A2 onboarding | Gauntlet +
            device`). Design doc aprovado pelo dono 2026-07-14 em
            docs/sprints/_ONDA-R-BRAND-SYSTEM.md. Decisao travada #3: "A1 no
            boot, A2 no onboarding" — não inverter, não unificar.
FONTE DA    docs/design/ouroboros/coreografias-extraidas.js — funções `mount_A1`
COREOGRAFIA:(linhas 147-238) e `mount_A2` (linhas 240-344). Portar a MATEMATICA
            literalmente (ordem das fases, easings, staggers, overshoot, rosto
            em fase). Ver seção "Aritmetica".
```

---

## 1. Contexto

A marca Ouroboros e definida pelo brand system como coreografias sobre uma
anatomia estavel (43 contas + rosto de 4 elementos + anel + wordmark). A onda
R-BRAND-SYSTEM entrega esses 17 conceitos como componentes que dirigem um
glifo canônico único. Esta sprint entrega a **primeira dupla**: as **duas
aberturas** da marca.

- **A1 — nascer da cobra.** A cobra nasce pela cabeca; as contas cascateiam
  pescoco -> cauda com stagger curto; a cauda (`#head-focinho`) chega por
  último, JUNTO com a boca que a morde (a mordida do ouroboros se fecha); o
  wordmark surge ao final. E a **splash canonica de TODO boot**, substituindo o
  `OuroborosLoader` atual no caminho de hidratacao do vault (`app/_layout.tsx`).
- **A2 — semente que expande.** As contas partem do centro (colapsadas em
  `scale(0.15)`) e voam cada uma para sua posicao com overshoot bezier; a cauda
  e a boca fecham ao final; o wordmark surge por último. Metafora: semente ->
  sistema completo = **vault nascendo**. Reveal **exclusivo** do onboarding
  (primeiro uso).

Decisao travada do dono (#3 do design doc): **A1 no boot, A2 no onboarding.**
Não inverter, não unificar. A1 e universal (todo boot); A2 e ritual de primeiro
uso.

Ambas seguem a mesma disciplina do precedente C1
(`src/components/brand/OuroborosFechamento.tsx`, R-BRAND-2): **one-shot**
(sem loop de demo), `useReduceMotion()` incondicional no topo, `onConcluir`
imediato no mount quando reduce-motion, animacao via Reanimated puro (sem Moti,
A28-safe), cleanup com `cancelAnimation`.

---

## 2. Contrato exigido do glifo (dependencia R-BRAND-3-GLIFO)

A1/A2 NÃO renderizam o SVG nem implementam o fallback web. Eles precisam que a
R-BRAND-3-GLIFO exponha, em `src/components/brand/glifo/`:

- `OuroborosGlifo.tsx` — render canônico com anatomia animavel por driver:
  aceita shared values por elemento (43 contas + `cabeca`/`cauda`/`boca`/`olho`
  + anel + wordmark), com no minimo **opacidade** por elemento e **transform**
  por conta (`scale` para o bounce; `translate` para o voo do A2). Transform
  em SVG deve seguir A27 (array/props numericas em Fabric, string so em web) —
  responsabilidade do glifo, não do conceito.
- `ordenarDaCabeca.ts` — port puro do `orderFromHead(beads, 'ccw'|'cw')`.
  A1 e A2 usam a ordem **`ccw`** (anti-horaria, pescoco -> cauda), igual ao demo.
- Fallback web (M25.2): o glifo ja resolve o `data-anim-id` + rAF +
  `setAttribute` com UUID por instancia (R-CRIT-4) e escopo por ref, do mesmo
  jeito ja validado no `OuroborosLoader`. A1/A2 herdam.

**Se, no passo 0.3 da execução, a API do driver da R-BRAND-3-GLIFO divergir
deste contrato (ex.: não expor transform por conta, so opacidade), o executor
PARA e escala** — não improvisa render de SVG dentro do conceito (violaria a
arquitetura "1 arquivo fino por conceito" do design doc §5). Isso e um risco
real porque a R-BRAND-3-GLIFO ainda não foi escrita quando este spec nasce.

---

## 3. Escopo (touches autorizados)

**Arquivos a criar:**

- `src/components/brand/conceitos/A1NascerDaCobra.tsx` — conceito A1, one-shot.
- `src/components/brand/conceitos/A2SementeExpande.tsx` — conceito A2, one-shot.
- `tests/__tests__/brand/A1NascerDaCobra.test.tsx` — Jest (reduce-motion +
  one-shot fire; caminho equivalente ao teste de OuroborosFechamento se existir).
- `tests/__tests__/brand/A2SementeExpande.test.tsx` — Jest.
- `tests/e2e/playwright/r-brand-4-aberturas.e2e.ts` — 1 caso E2E (copia do
  template `tests/e2e/playwright/e2e-template.ts`), asserts de comportamento.
- `docs/sprints/R-BRAND-4-ABERTURAS-screenshots-gauntlet/` — PNGs da validação.

**Arquivos a modificar:**

- `app/_layout.tsx` — trocar `<OuroborosLoader />` (linha 440, dentro do
  early-return de `mostrarBootScreen`) por `<A1NascerDaCobra onConcluir={...} />`.
  Integrar a leave-condition do boot com o `onConcluir` (ver seção 5, decisao D2).
  NÃO mexer em `useAppPronto`, `useFonts`, gates ou hooks de boot — so o slot
  visual + a condicao de saida.
- `app/onboarding.tsx` — montar `A2SementeExpande` no reveal de primeiro uso
  (ver seção 5, decisao D1 — ponto de montagem a travar). Se a decisao for o
  candidato A (reveal de abertura), o spinner do Frame5 (linha 1034) fica
  INTOCADO nesta sprint.
- `src/components/brand/index.ts` — exportar `A1NascerDaCobra` e
  `A2SementeExpande` + tipos de props.
- `docs/FEATURES-CANONICAS.md` — nova subsecao (proposta §1.3) "Marca —
  aberturas (A1 nascer da cobra · A2 semente que expande) — R-BRAND-4". Ver
  seção 8. **Obrigatorio no mesmo commit** (regra do CLAUDE.md; validador
  recusa sprint que introduz feature sem atualizar FEATURES-CANONICAS).

**Arquivos NÃO a tocar (invariantes de escopo):**

- `src/components/brand/OuroborosLoader.tsx` — o loader v1 e seus outros **13**
  consumidores (agenda, recap-memorias, oauthredirect, captura, humor-rapido,
  scanner, eventos, diario-emocional, recap-lista, RecapModoCalendario,
  RecapScreen, e o Frame5 do onboarding). Aposentadoria e migracao sao da
  **R-BRAND-9-MIGRACAO**. Esta sprint so troca o consumidor de **boot**.
- `OuroborosLoading.tsx`, `OuroborosFechamento.tsx`, `OuroborosLogo.tsx` —
  intocados (geracao anterior/base; aposentados na R-BRAND-9).
- Logica de gates de boot (`BiometriaGate`, `VaultBootGate`, `OnboardingGuard`,
  `SessaoBootGate`), `useAppPronto`, `SplashScreen.hideAsync`, `useFonts` —
  territorio fragil (A28, M27.3, oscilacao useFonts SDK 54). So a condicao de
  saida `mostrarBootScreen` e o slot visual mudam.

---

## 4. Hipotese verificada (grep, 2026-07-14)

Comando: `grep -rn "OuroborosLoader\|OuroborosGlifo" app/ src/`.

- **A1 ↔ boot — hipotese CONFIRMADA e limpa.** `app/_layout.tsx:440`:
  `<OuroborosLoader />` dentro do bloco `if (mostrarBootScreen)` (linha 421),
  UI bloqueante enquanto `appPronto` (fontes + 3 stores hidratadas) e falso.
  Envolto em `<FrameMobileDev>`, bg `colors.bgPage`, centralizado. `mostrarBootScreen
  = !appPronto` (linha 160). Este e o slot exato do A1.
- **A2 ↔ onboarding — hipotese PARCIAL, exige decisao.** O ÚNICO
  `OuroborosLoader` em `app/onboarding.tsx` esta na **linha 1034**:
  `<OuroborosLoader compacto />` dentro de `Frame5Concluir`, exibido enquanto
  `iniciando` (requests de permissao rodando apos "Comecar"), depois trocado por
  `<Check>`. E um **spinner indeterminado de conclusao**, NÃO um reveal one-shot
  de abertura. O design doc §4 descreve A2 como "reveal do onboarding (primeiro
  uso) — semente -> sistema = vault nascendo". Ha portanto uma lacuna semantica
  entre o único slot de loader existente (spinner Frame5) e a intencao de design
  (reveal de primeiro uso). Resolucao na seção 5, decisao D1.
- **Glifo — CONFIRMADO ausente.** `src/components/brand/glifo/` e
  `src/components/brand/conceitos/` nao existem. Dependencia bloqueante.

---

## 5. Decisoes de design a travar no passo 0.3 (GUIDE §1 — expor, não presumir)

### D1 — Ponto de montagem do A2 no onboarding

O design pede "reveal do onboarding (primeiro uso)"; o repo so oferece o spinner
indeterminado do Frame5. Dois candidatos:

- **Candidato A (RECOMENDADO) — reveal de abertura.** A2 monta full-screen no
  topo de `app/onboarding.tsx`, gated a primeiro uso (`onboarding.concluido ===
  false` e antes do Frame 0). Toca 1x; `onConcluir` revela o Frame 0. NAO toca no
  spinner do Frame5 (linha 1034 fica para a R-BRAND-9). E a leitura mais fiel de
  "reveal do onboarding (primeiro uso)" + "semente -> vault nascendo" e casa
  perfeitamente com a disciplina one-shot (toca uma vez, entrega via onConcluir,
  reduce-motion revela imediato). Paralelo limpo com A1 (splash do app) : A2
  (splash da jornada de primeiro uso).
- **Candidato B — swap direto no Frame5.** A2 substitui o
  `<OuroborosLoader compacto />` da linha 1034. Direto, mas o slot atual e um
  spinner de espera INDETERMINADA (`iniciando`), o que forca reconciliar
  one-shot × espera de duracao desconhecida (o A2 teria que segurar em estado
  final ate `iniciando` virar false). Semanticamente mais fraco ("vault nascendo"
  no encerramento em vez da abertura).

**Recomendacao do planejador: candidato A.**

> **DECISÃO TRAVADA (dono, 2026-07-14): candidato A aceito.** A2 é o
> reveal full-screen de abertura do onboarding; o spinner do Frame5
> (linha 1034) permanece intocado nesta sprint e migra na R-BRAND-9.
> O executor NÃO precisa reconfirmar no 0.3 — o candidato B abaixo fica
> registrado só como alternativa histórica.

> Nota de UX a validar no device (candidato A): em primeiro uso o usuário ve
> A1 (boot) e logo em seguida A2 (abertura do onboarding) em sequencia. E
> intencional (decisao travada #3 quer as duas), mas o "feel" das duas aberturas
> em sequencia deve ser aprovado no checkpoint de device — pode-se querer um
> corte mais seco entre elas.

### D2 — Como o `onConcluir` do A1 conversa com o gate de boot

Hoje `mostrarBootScreen = !appPronto`. O A1 e one-shot (~1,2-2,5s dependendo do
tempo final — ver Aritmetica); `appPronto` pode chegar antes (boot quente) ou
muito depois (useFonts SDK 54 pode levar 30-60s, per comentarios do _layout).

- **Recomendado — piso minimo de splash via onConcluir.**
  `mostrarBootScreen = !appPronto || !bootRevealConcluido`, onde
  `bootRevealConcluido` (useState local) e setado pelo `onConcluir` do A1.
  Efeito: a splash SEMPRE toca por inteiro (sem corte no meio da cascata) E o
  boot so sai quando as stores hidratam. Seguranca: o A1 e one-shot com timer
  deterministico (igual OuroborosFechamento) — `onConcluir` SEMPRE dispara; com
  reduce-motion dispara imediato no mount (sem adicionar atraso). Sem risco de
  boot travado.
- **Alternativa — sem piso (mudanca minima).** Mantem `mostrarBootScreen =
  !appPronto`; A1 toca 1x e segura o logo completo estatico ate `appPronto`.
  Mais cirurgico (não toca no gate), mas em boot quente a cascata pode ser
  cortada no meio.

**Recomendacao: piso minimo (honra "entrega via onConcluir" do brief do dono).**
Tradeoff a aprovar: todo boot passa a ter piso de ~1,2s de splash. Ajustavel no
device.

---

## 6. Acceptance criteria

1. `A1NascerDaCobra.tsx` existe, e one-shot (NÃO ha `withRepeat`/loop), consome
   `useReduceMotion()` incondicional no topo, e chama `onConcluir` exatamente
   uma vez ao fim da coreografia.
2. `A2SementeExpande.tsx` idem, com a coreografia de voo do centro (translate +
   scale por conta) portada do `mount_A2`.
3. A ordem das fases de A1 bate com `mount_A1`: cabeca+olho primeiro; cascata
   `ccw` pescoco->cauda com stagger; cauda+boca por último (a mordida fecha);
   overshoot na conta final; wordmark ao final.
4. A ordem das fases de A2 bate com `mount_A2`: cabeca+olho primeiro; contas
   voam do centro (colapso `scale(0.15)` no centro -> posicao real com overshoot
   bezier, stagger 22ms literal); cauda+boca ao final; bounce na última conta;
   wordmark ao final.
5. Reduce-motion (sistema OU toggle Configurações): A1 e A2 renderizam o **logo
   completo estatico** (43 contas + rosto visiveis, olho ~0.65, wordmark
   visivel) e chamam `onConcluir` IMEDIATO no mount, sem cascata nem atraso.
6. A1 substitui o loader de boot em `app/_layout.tsx`: o boot exibe A1 no lugar
   do `OuroborosLoader`, e a saida do boot respeita a decisao D2 travada.
7. A2 monta no onboarding conforme decisao D1 travada, so em primeiro uso.
8. Nenhum dos 13 outros consumidores do `OuroborosLoader` e alterado (grep
   confirma OuroborosLoader ainda importado/usado nos 13 pontos restantes).
9. Suite Jest verde (FAIL_AFTER <= FAIL_BEFORE) incluindo os 2 testes novos.
10. `docs/FEATURES-CANONICAS.md` atualizado no mesmo commit (subsecao das
    aberturas). `./scripts/smoke.sh` verde (inclui anonimato + auditoria PT-BR).
11. 1 caso E2E playwright no Gauntlet com asserts de comportamento (não so
    presenca), rodado como app real, + screenshots em ambos os modos
    (normal e reduce-motion).

---

## 7. Aritmetica (CRÍTICA — ha meta numerica no design doc §4)

O design doc §4 rotula **A1 one-shot 1.2s** e **A2 one-shot 1.4s**. O port
LITERAL das funções `mount_A1`/`mount_A2` (com 43 contas) NÃO fecha nesses
tempos — fecha em ~2,5s e ~2,9s. Este e o ponto que o executor DEVE validar
antes de codar (licao 7). Detalhamento:

### A1 — soma literal (N = 43, do `mount_A1`)

| Fase | Formula | Tempo |
|---|---|---|
| cascata comeca | `beadStart` | 700ms |
| última conta acende | `700 + 17*(43-1)` | 1414ms |
| `finalTime` (cauda+boca+bounce) | `700 + 17*42` | 1414ms |
| bounce conta final assenta | `finalTime + 220 + 300` | 1934ms |
| wordmark comeca | `finalTime + 620` | 2034ms |
| wordmark assenta (onConcluir) | `2034 + 500` | **~2534ms** |

### A2 — soma literal (N = 43, do `mount_A2`)

| Fase | Formula | Tempo |
|---|---|---|
| voo das contas comeca | `beadStart` | 480ms |
| última conta inicia voo | `480 + 22*42` | 1404ms |
| `finalTime` | `480 + 22*42 + 780` | 2184ms |
| cauda+boca+bounce | `finalTime - 200` | 1984ms |
| wordmark comeca | `finalTime + 200` | 2384ms |
| wordmark assenta (onConcluir) | `2384 + 500` | **~2884ms** |

### Reconciliacao com §4 (decisao a travar)

Razoes: A1 `1200/2534 ≈ 0,47`; A2 `1400/2884 ≈ 0,49`. Um único fator de
**TEMPO ≈ 0,5** aplicado a TODAS as constantes de timing atinge ambos os alvos
preservando as proporcoes (a SHAPE da coreografia — ordem, easings, overshoot —
fica literal; so a escala temporal muda). Proposta de constantes escaladas
(TEMPO = 0,5, arredondado):

| Constante | Literal (demo) | Escalada ×0,5 (proposta §4) |
|---|---|---|
| A1 `beadStart` | 700 | 350 |
| A1 `stagger` | 17 | 8 |
| A1 fade conta | 260 | 130 |
| A1 cauda/boca fade | 340 | 170 |
| A1 wordmark delay+fade | 620 + 500 | 310 + 250 |
| A1 total projetado | ~2534 | **~1246ms (~1,25s)** |
| A2 `beadStart` | 480 | 240 |
| A2 `stagger` | 22 | 11 |
| A2 voo transform | 780 | 390 |
| A2 cauda/boca fade | 340 | 170 |
| A2 wordmark delay+fade | 200 + 500 | 100 + 250 |
| A2 total projetado | ~2884 | **~1442ms (~1,44s)** |

**Plano:** portar a coreografia com as constantes nomeadas e um único
multiplicador `TEMPO` no topo de cada conceito; entregar com `TEMPO = 0,5`
(fecha §4). **DECISÃO TRAVADA (dono, 2026-07-14): escala 0,5× aceita** —
o ajuste fino do valor final continua no checkpoint de device (o "feel"
da cascata). Se o feel pedir o tempo literal do demo (~2,5s / ~2,9s), basta
`TEMPO = 1` — as duas variantes ficam documentadas. `onConcluir` dispara no
tempo final REAL (a soma acima × TEMPO), nunca num numero cravado a mao.

---

## 8. Atualizacao de FEATURES-CANONICAS.md (obrigatoria no commit)

Adicionar apos §1.2 uma subsecao (proposta §1.3) "Marca — aberturas
(A1 nascer da cobra · A2 semente que expande) — R-BRAND-4-ABERTURAS", com tabela
no mesmo formato de §1.2:

| Conceito | Componente | Onde | Comportamento |
|---|---|---|---|
| A1 — nascer da cobra | `src/components/brand/conceitos/A1NascerDaCobra.tsx` (dirige `OuroborosGlifo`) | Splash de boot (`app/_layout.tsx`, caminho de hidratacao do vault) | Cascata cabeca->cauda; a mordida fecha na cauda; wordmark ao final. One-shot, entrega via `onConcluir`. Reduce-motion: logo completo estatico + onConcluir imediato |
| A2 — semente que expande | `src/components/brand/conceitos/A2SementeExpande.tsx` (dirige `OuroborosGlifo`) | Reveal do onboarding (primeiro uso, `app/onboarding.tsx`) — conforme decisao D1 | Contas voam do centro para a posicao com overshoot; cauda+boca fecham; wordmark ao final. Semente -> sistema = vault nascendo. One-shot. Reduce-motion: logo completo estatico + onConcluir imediato |

Manter a nota de que ambos consomem `useReduceMotion()` e o glifo base da
R-BRAND-3-GLIFO. Nao inventar caminhos: linkar so os arquivos que a sprint cria.

---

## 9. Invariantes a preservar

- **Anonimato absoluto (Regra −1, CLAUDE.md).** Zero nome de IA/pessoa em codigo.
  Wordmark literal e "ouroboros" / "OUROBOROS" (marca), não autoria.
- **Regra de Tom.** Zero emoji, zero exclamacao, zero gamificacao. A abertura e
  apresentacao calma da marca, não "voce conseguiu". O brand system e explicito:
  "loading e apresentacao da marca; nada gira a toa".
- **Regra de Estetica (ADR-010).** Fisica > tempo (springs/beziers, não durations
  lineares cruas), silencio visual, micro-interacoes pontuais (o overshoot da
  conta final e o único "acento"). O design doc marca isso como lei.
- **A27 (Fabric/New Arch).** Nunca `transform` string em SVG no nativo — o glifo
  resolve via array/props; o conceito so escreve shared values. Nao reintroduzir
  string transform no conceito.
- **A28 (boot path).** A1 roda no boot: **Reanimated puro** (useSharedValue +
  withTiming + useAnimatedProps), NUNCA `<MotiView>`. useReduceMotion ja e
  A28-safe. Espelhar OuroborosLoader/OuroborosFechamento.
- **M25.2 (web sem animatedProps em G/Circle).** Fallback rAF + `data-anim-id` +
  setAttribute e responsabilidade do glifo (R-BRAND-3); o conceito não
  redescobre.
- **R-CRIT-4.** UUID por instancia (não `useId`) para evitar colisao de
  querySelector entre A1 (boot) e A2 (onboarding) montados na mesma sessão —
  garantido pelo glifo.
- **useReduceMotion incondicional no topo** (regra dos hooks): so o corpo do
  effect ramifica; os useAnimatedProps seguem declarados.
- **Acentuacao PT-BR (M-PT-BR-AUDIT).** Se A1/A2 introduzirem string UI, ela
  passa por `scripts/check_strings_ui_ptbr.py`. `accessibilityLabel` fica SEM
  acento (convencao screen reader) — ex.: `accessibilityLabel="nascer da cobra"`.
- **Comentarios de codigo sem acento** (convencao shell/CI); docstrings/UI com
  acento completo.

---

## 10. Plano de implementacao

0. **0.3 — confirmar dependencia e decisoes.** Verificar que R-BRAND-3-GLIFO
   esta mergeada e que o driver expoe transform+opacidade por conta (seção 2).
   Travar D1 (ponto de montagem do A2) e D2 (gate de boot) com o dono. Confirmar
   `TEMPO` alvo (seção 7). Se o glifo não existir, PARAR — sprint bloqueada.
1. Criar `A1NascerDaCobra.tsx`: props `{ onConcluir: () => void; tamanho?:
   number; accessibilityLabel?: string }` (espelhar `OuroborosFechamentoProps`).
   `useReduceMotion()` no topo. Com reduce: renderizar glifo em estado final
   completo + `onConcluirRef.current()` no useEffect + return (sem armar timers).
   Sem reduce: usar `ordenarDaCabeca(contas, 'ccw')`; dirigir shared values de
   opacidade das contas na cascata (`beadStart + i*stagger`), do rosto em fase
   (cabeca+olho primeiro; cauda+boca no finalTime), scale da conta final
   (overshoot), opacidade do wordmark ao final; `setTimeout(onConcluirRef.current,
   totalReal)`; cleanup com `cancelAnimation` + clearTimeout. Todas as constantes
   de timing nomeadas × `TEMPO`.
2. Criar `A2SementeExpande.tsx`: idem, com a matematica de voo do `mount_A2`
   (cada conta parte de `translate(-dx,-dy) scale(0.15)` no centro CENTRO
   158.91/159.84 e vai para `translate(0,0) scale(1)` com bezier overshoot,
   stagger 22ms × TEMPO); cauda+boca ao final; bounce da última conta; wordmark
   ao final. Reduce-motion identico ao A1.
3. Exportar ambos em `src/components/brand/index.ts` + tipos de props.
4. `app/_layout.tsx`: trocar `<OuroborosLoader />` (linha 440) por
   `<A1NascerDaCobra onConcluir={...} />`. Aplicar a decisao D2 (gate de boot).
   Não tocar em hooks/gates de boot.
5. `app/onboarding.tsx`: montar `A2SementeExpande` conforme D1 (candidato A:
   reveal full-screen de abertura, gated a primeiro uso, `onConcluir` revela o
   Frame 0). Se D1 = candidato B, swap no Frame5.
6. Expor sonda de inspecao para o E2E (equivalente ao `window.__obProbe()` do
   brand system): o conceito deve permitir ao E2E ler o estado da fase e o
   disparo único de `onConcluir` (ex.: via atributo DOM `data-fase` na raiz web
   e/ou contador exposto em `window.__gauntlet.estado()`). Alinhar com o padrão
   ja usado pela R-BRAND-3-GLIFO.
7. Testes Jest (seção 11) + E2E (seção 12) + FEATURES-CANONICAS (seção 8).
8. Rodar smoke, Gauntlet, screenshots, device checkpoint. Push apos verde
   (autorizacao duravel de push automático).

---

## 11. Testes Jest

- `A1NascerDaCobra.test.tsx`:
  - reduce-motion ON -> `onConcluir` chamado 1x imediato no mount (mock de
    `useReduceMotion` -> true), sem avancar timers.
  - reduce-motion OFF + fake timers -> `onConcluir` chamado exatamente 1x apos o
    tempo total real (avancar `jest.advanceTimersByTime` ate o total); nunca
    chamado 2x (prova one-shot, sem loop).
  - consome `ordenarDaCabeca(..., 'ccw')` (spy/mock do modulo do glifo).
- `A2SementeExpande.test.tsx`: espelho, incluindo assert de que as contas partem
  do centro (mock do driver capturando o transform inicial `scale(0.15)`).
- Baseline: **FAIL_BEFORE = suite atual** (o executor confirma rodando
  `./scripts/smoke.sh` / jest ANTES; o CLAUDE.md cita baseline ~1126 pass).
  Esperado **FAIL_AFTER <= FAIL_BEFORE**, com +2 testes verdes.
- Nota: testes E2E (`*.e2e.ts`) NÃO rodam no Jest (`testPathIgnorePatterns`
  exclui `/e2e/`).

---

## 12. Proof-of-work esperado

- **Diff final** dos 2 conceitos + 2 pontos de montagem + index + FEATURES-CANONICAS.
- **Runtime real (contratos do BRIEF §1.9):**
  - Smoke: `./scripts/smoke.sh` (inclui anonimato + auditoria PT-BR) verde.
  - Unit: jest verde, FAIL_AFTER <= FAIL_BEFORE, +2 testes.
  - Gauntlet (Nivel A+, OBRIGATORIO): `./gauntlet.sh` (ou
    `EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web` + `/_dev/gauntlet`), navegado e
    clicado como app real via playwright MCP.
- **E2E** `tests/e2e/playwright/r-brand-4-aberturas.e2e.ts` (copia do template),
  com asserts de COMPORTAMENTO:
  - A1: apos `reset()` + boot simulado, o glifo chega ao estado completo (43
    contas opacidade 1 + wordmark visivel) e o disparo de `onConcluir` acontece
    1x (contador/sonda). Assert de ORDEM: a cauda/boca so acendem depois das
    contas (ler `data-fase` ou opacidade da cauda em t intermediario < t final).
  - A1 reduce-motion: `window.__gauntlet` seta reduce-motion (ou o E2E aciona o
    toggle); assert de que o estado ja e final no primeiro frame e `onConcluir`
    disparou imediato.
  - A2: via `__gauntlet.reset()` + rota de onboarding primeiro uso, assert de que
    A2 toca e revela o Frame 0 (ou o slot D1 escolhido); contas partem do centro
    (transform inicial) -> posicao final.
  - A2 reduce-motion: estado final imediato + onConcluir imediato.
  - Anti-loop: assert de que `onConcluir` NAO dispara uma segunda vez apos o fim
    (esperar > total e reconferir o contador).
- **Screenshots** em `docs/sprints/R-BRAND-4-ABERTURAS-screenshots-gauntlet/`:
  A1 (frames inicio/meio/fim + reduce-motion estatico), A2 (idem). Paridade
  visual lado a lado com o demo de `docs/design/ouroboros/conceitos-ouroboros.html`
  aberto no Chrome (per design doc §7).
- **Reduce-motion validado nas DUAS vias** (sistema e toggle) para A1 e A2.
- **Device checkpoint (Nivel C, breve)**: validar o "feel" das aberturas no boot
  real e no onboarding real (dev-client + Metro USB; A1/A2 sao so JS -> não exige
  rebuild do dev-client). Aprovar o `TEMPO` final e a sequencia A1->A2 em primeiro
  uso (decisao D1 nota de UX). Backup do vault antes se houver troca de app.
- **Hipotese verificada**: `rg` confirmando que `OuroborosGlifo`/`ordenarDaCabeca`
  existem (pos R-BRAND-3) e que os 13 outros consumidores do `OuroborosLoader`
  seguem intocados.
- **Acentuacao periferica**: varredura em todos os arquivos .md/.tsx modificados.

---

## 13. Riscos e nao-objetivos

**Riscos:**

- **Dependencia não mergeada.** R-BRAND-3-GLIFO não existe hoje. Se o driver do
  glifo não expuser transform por conta (so opacidade), A1 (bounce) e sobretudo
  A2 (voo do centro) ficam inviaveis sem retrabalho no glifo — escalar, não
  improvisar (seção 2).
- **Meta numerica do §4 (1.2s/1.4s) não bate com o port literal (~2.5s/2.9s).**
  Tratado na seção 7 via `TEMPO`. Se o executor iniciar sem travar isso,
  entrega tempo errado (bomba-relogio, licao 7).
- **Gate de boot fragil** (A28, M27.3, oscilacao useFonts). A decisao D2 mexe na
  condicao de saida do boot — testar boot quente E frio; garantir que
  `onConcluir` sempre dispara (timer deterministico + reduce-motion imediato)
  para nunca travar o boot.
- **Perf de 43 contas one-shot.** Herdada do benchmark C2 da R-BRAND-3 (pior
  caso continuo). One-shot e mais leve; mas se o benchmark pivotou para Skia,
  A1/A2 seguem o mesmo motor.
- **Sequencia A1->A2 em primeiro uso** pode parecer redundante (duas aberturas
  seguidas) — validar no device (nota de UX em D1).

**Nao-objetivos (protocolo anti-debito — se aparecer, vira sprint nova):**

- Migrar os outros 13 consumidores do `OuroborosLoader` (e da R-BRAND-9).
- Aposentar `OuroborosLoader`/`OuroborosLoading`/`OuroborosFechamento` v1
  (R-BRAND-9).
- Implementar qualquer outro conceito (B*, C*, D*, E*, F*, G*) — cada um tem sua
  sprint na onda.
- Tocar no spinner do Frame5 do onboarding se D1 = candidato A.
- Widget nativo / codigo nativo — nenhum. A1/A2 sao 100% JS (Metro live).

---

## 14. Referencias

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§4 mapa, §5 ondas
  linha 1, decisao travada #3).
- Coreografia fonte: `docs/design/ouroboros/coreografias-extraidas.js`
  (`mount_A1` linhas 147-238, `mount_A2` linhas 240-344), `ouroboros-lib.js`,
  `ouroboros.svg`, `conceitos-ouroboros.html`.
- Precedente de disciplina one-shot + onConcluir + reduce-motion:
  `src/components/brand/OuroborosFechamento.tsx` (R-BRAND-2, C1).
- Hook: `src/lib/hooks/useReduceMotion.ts`.
- Pontos de montagem: `app/_layout.tsx:440` (boot), `app/onboarding.tsx:1034`
  (spinner Frame5, referencia da decisao D1).
- Dependencia: R-BRAND-3-GLIFO (`src/components/brand/glifo/` — a criar naquela
  sprint).
- BRIEF: `VALIDATOR_BRIEF.md` §1.9 (Gauntlet A+), armadilhas A27/A28/M25.2/R-CRIT-4.
- Regras: `CLAUDE.md` (Regra −1 anonimato, Regra de Tom, ADR-010, validação
  visual Gauntlet obrigatoria, FEATURES-CANONICAS no commit).
- Template E2E: `tests/e2e/playwright/e2e-template.ts`.
- FEATURES-CANONICAS: `docs/FEATURES-CANONICAS.md` §1.1/§1.2 (formato das
  subsecoes de marca).
```
