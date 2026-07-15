# Sprint R-BRAND-7-ESTADOS-VIVOS — a marca respira, marca o tempo e mostra as duas presenças (B1 · B2 in-app · B3)

```
ONDA:       R-BRAND-SYSTEM (docs/sprints/_ONDA-R-BRAND-SYSTEM.md), sprint 4 de 7.
            Mapa conceito -> destino em §4 daquele doc; esta sprint entrega a
            faixa "B · Estados Vivos" (B1 respiração ambiente, B2 relógio
            silencioso in-app, B3 dupla presença).
DEPENDE:    (hard, bloqueante para TODAS as peças)
            - R-BRAND-3-GLIFO mergeada. Hoje NÃO existe: o diretório
              src/components/brand/glifo/ está ausente (confirmado por
              `ls src/components/brand/glifo/` falha) e
              src/components/brand/conceitos/ também não existe. Esta sprint
              consome a base do glifo daquela sprint: geometria.ts (43 contas
              [cx, cy, cor] + paths do rosto + anel + wordmark + constantes de
              centro), ordenarDaCabeca.ts (port do orderFromHead) e o driver
              OuroborosGlifo.tsx (shared values por elemento anatômico +
              overrides de cor + `data-anim-id` por elemento para o fallback
              web). Sem esse driver, B1/B2/B3 não têm anatomia animável e a
              sprint NÃO inicia.
            - useReduceMotion() (src/lib/hooks/useReduceMotion.ts) — JÁ EXISTE
              (entregue por R-AUDIT-A11Y-MOVIMENTO; confirmado por read).
              Toda peça nova consome esse hook no topo.
BLOQUEIA:   nada estrutural. É folha na árvore da onda; R-BRAND-9-MIGRACAO
            (aposentar Loader/Loading/Fechamento v1) e R-BRAND-10-WIDGET-B2
            (widget nativo do relógio) vêm depois e são independentes desta.
ESTIMATIVA: sprint única (3 peças na mesma área arquitetural — componentes de
            marca + 4 pontos de wire-up de UI). ~2-2.5 dias. Ver §12 (arquivos
            tocados) para a justificativa de não dividir.
STATUS:     [todo] — BLOQUEIO ATIVO: aguarda R-BRAND-3-GLIFO mergeada. Não
            despachar executor enquanto `ls src/components/brand/glifo/` falhar.
ORIGEM:     design doc da onda aprovado pelo dono em 2026-07-14
            (docs/sprints/_ONDA-R-BRAND-SYSTEM.md §4/§5) e coreografias de
            referência em docs/design/ouroboros/coreografias-extraidas.js
            (funções mount_B1, mount_B2, mount_B3 — portar a matemática
            literalmente).
VISÃO:      público com depressão/TDAH/ansiedade/autismo. Princípios do brand
            system são lei: nada gira à toa; a cobra parada respirando já é
            presença suficiente (princípio 01); contínuos vivem só enquanto o
            estado que os justifica durar (princípio 03). Compatível com
            ADR-010 e a Regra de Tom (zero alarme, zero gamificação).
```

> **Peça-mãe de referência de formato**: docs/sprints/R-BRAND-3-ESTADOS-VIVOS-spec.md
> (nomenclatura antiga, mapeava C3/F2/D1 antes da reorganização da onda em
> 2026-07-14; NÃO confundir — aquela sprint foi absorvida/renomeada pela onda
> R-BRAND-SYSTEM). O formato de bloco de cabeçalho, aritmética e proof-of-work
> segue aquele precedente.

---

## 1. Contexto

O brand system trata a marca como coreografias sobre uma anatomia estável (o
glifo canônico: 43 contas, rosto de 4 elementos — cabeça `#head-coroa`, cauda
`#head-focinho`, boca `#lingua`, olho `#eye` —, anel pontilhado e wordmark).
A faixa "B · Estados Vivos" traz três estados contínuos que a cobra assume em
repouso, sem loading nem evento: **respirar** (B1, presença idle), **marcar a
hora** (B2, relógio silencioso) e **mostrar as duas pessoas** (B3, dupla
presença tingida por pessoa_a/pessoa_b). Nenhum deles é ornamento: cada um
tem um lugar semântico no app.

Esta sprint depende do glifo base (R-BRAND-3-GLIFO) porque B1/B2/B3 precisam
dirigir opacidade/transform/cor sobre a anatomia real — não são anéis
genéricos como o OuroborosLoading atual. Enquanto o glifo não estiver
mergeado, a sprint fica bloqueada (§ cabeçalho, STATUS).

---

## 2. Escopo (touches autorizados)

### Arquivos a criar

- `src/components/brand/conceitos/B1Respiracao.tsx` — presença idle: rosto
  pulsa (`obPulse` 4s, stagger 0.1s/elemento), corpo respira (`obBreath` 4s,
  atraso 0.2s), anel gira 60s reverso. Consome `useReduceMotion()`.
- `src/components/brand/conceitos/B2RelogioSilencioso.tsx` — mini-glifo
  relógio in-app: cobra + rosto giram JUNTOS 30° por hora REAL do relógio,
  com snap `cubic-bezier(.2,.9,.2,1.15)` 400ms; ângulo acumula sem desenrolar.
  Consome `useReduceMotion()`.
- `src/components/brand/conceitos/B3DuplaPresenca.tsx` — duas cobras tintadas
  lado a lado: contas + cabeça + cauda em `colors.purple` (#bd93f9, pessoa_a)
  e `colors.pink` (#ff79c6, pessoa_b); boca `colors.cyan` (#8be9fd) nas duas;
  ambas no sentido horário, 32s/rev. Consome `useReduceMotion()`.
- `docs/sprints/R-BRAND-7-screenshots-gauntlet/` — pasta de evidências
  (Gauntlet A+), criada na execução.
- `tests/e2e/playwright/rbrand7-estados-vivos.e2e.ts` — caso E2E (copiar de
  `tests/e2e/playwright/e2e-template.ts`; retorna `ResultadoE2E`).
- `tests/components/brand/B2RelogioSilencioso.test.tsx` (e testes irmãos B1/B3
  conforme §10) — testes unitários da aritmética do ângulo + early-return de
  reduce-motion.

### Arquivos a modificar

- `src/components/brand/index.ts` — barrel: exportar os 3 componentes novos e
  seus tipos de props (padrão dos exports já presentes).
- `app/index.tsx` — integrar B1 discreto no cabeçalho da Home (`CabecalhoHoje`,
  :242-284). Ver §5.1 para a proposta de posicionamento (investigada).
- `src/components/hoje/CardVoces.tsx` — integrar B3 (dupla presença) no card
  "Vocês" (:130-179). Em modo sozinho (título "Você"), degradar para presença
  única (ver §5.3).
- `app/onboarding.tsx` — integrar B3 no Frame 1 ("Mais alguém usa este Vault
  com você?", `Frame1`/`Frame1Expand`, :575-694) quando `duo === true`
  (a "tela 24" do design é este frame de segunda pessoa).
- `src/components/screens/RecapScreen.tsx` — integrar B3 no Recap (§5.3
  detalha o ponto exato; investigar o cabeçalho do modo Lista/Calendário).
- `docs/FEATURES-CANONICAS.md` — registrar B1/B2/B3 como features de marca no
  MESMO commit (§1.2 "Marca — loaders animados" é a seção-âmbito; adicionar
  linha da faixa "Estados Vivos"). Validador-sprint recusa sprint que toca
  UI/feature sem este update.
- `app/_dev/showcase.tsx` — expor B1/B2/B3 no showcase para captura e para o
  E2E de ângulo do B2 rodar em superfície determinística (host-independente).
- `CHANGELOG.md`, `STATE.md`, `ROADMAP.md`, `docs/sprints/ORDEM-EXECUCAO-V1.md`
  — status da sprint no merge (§14).

### Arquivos NÃO a tocar

- `modules/` — decisão travada 4 do design doc: o widget nativo do B2 é a
  sprint R-BRAND-10-WIDGET-B2 (código nativo, rebuild de dev-client). Esta
  sprint é 100% JS puro. NÃO tocar `modules/widget-homescreen/` nem qualquer
  bridge nativa.
- `src/components/brand/OuroborosLoader.tsx`, `OuroborosLoading.tsx`,
  `OuroborosFechamento.tsx` — a geração antiga é aposentada na
  R-BRAND-9-MIGRACAO, NÃO aqui. Nenhum dos 14 consumidores do
  `OuroborosLoader` muda nesta sprint.
- `src/lib/hooks/useHumorCasal.ts`, `src/lib/hooks/useRecap.ts` — B3 é camada
  de apresentação. NÃO alterar agregação de humor nem números do Recap.
- `src/lib/hooks/useReduceMotion.ts` — consumir, não modificar.
- Assinaturas de `src/lib/dev/gauntlet.ts` — o estado inspecionável do B2 é
  exposto por um probe dev-only próprio (`window.__obBrandProbe`, §5.2), não
  por nova API no objeto `__gauntlet` (evita inflar aquele contrato).

---

## 3. Estado atual (arquivo:linha, confirmado por grep/read)

> Nota de leitura: o `grep` via shell nesta base às vezes embaralha tokens
> (ex.: `OuroborosLoader` aparece como `l`); os paths e os números de linha
> são confiáveis e o conteúdo abaixo foi confirmado por leitura direta.

### 3.1 Infra do glifo (pré-requisito — R-BRAND-3-GLIFO)

- `src/components/brand/glifo/` **NÃO existe ainda**. Ao mergear, esperada a
  API descrita no design doc §3: `geometria.ts` (43 contas + rosto + anel +
  wordmark, centro 158.91/159.84, RING_CENTER 160.91/159.84),
  `ordenarDaCabeca.ts` (`orderFromHead(beads, 'ccw'|'cw')`) e
  `OuroborosGlifo.tsx` (driver com shared values por elemento + overrides de
  cor + `data-anim-id` por elemento no web). **Confirmar a assinatura real por
  `rg` pós-merge (lição 4/7) antes de editar** — não presumir nomes.
- Coreografia de referência (portar literalmente):
  `docs/design/ouroboros/coreografias-extraidas.js` — `mount_B1` (:349-365),
  `mount_B2` (:367-393), `mount_B3` (:395-449). Constantes de centro em
  `_boot` (:35-36). Keyframes `obPulse`/`obBreath`/`obSpin` são CSS no HTML de
  demo; no RN viram Reanimated (opacidade/scale/rotação) + fallback web rAF.

### 3.2 Hook reduce-motion (existe)

- `src/lib/hooks/useReduceMotion.ts:23` `export function useReduceMotion(): boolean`
  — OR de reduce-motion do sistema (`AccessibilityInfo.isReduceMotionEnabled`,
  reativo via `reduceMotionChanged`) com o toggle `featureToggles.reduzirMovimento`
  (:29,:52). Em web, o react-native-web mapeia para
  `matchMedia('(prefers-reduced-motion: reduce)')`, que o
  `page.emulateMedia({ reducedMotion })` do playwright controla (mecanismo
  canônico do E2E, §11).

### 3.3 Superfície do B1 — cabeçalho da Home (investigado)

- `app/index.tsx` — Tela Hoje. O cabeçalho é `CabecalhoHoje` (:242-284): duas
  linhas dentro de `<View style={{ gap: spacing.sm }}>`:
  - Linha 1 (:249-270): `flexDirection:'row'`, `justifyContent:'space-between'`
    — data por extenso (`dataExtenso`, flex:1) à esquerda + pill `AtalhoReflexao`
    (cyan, :61-104) à direita.
  - Linha 2 (:271-282): saudação "`${saudacao}, ${nome}`" em `colors.fg`.
  - O `<Header title="Hoje" />` (:205) é a barra de topo global; `CabecalhoHoje`
    é o bloco de saudação DENTRO do ScrollView (:216-219). O B1 idle entra
    aqui (não no `<Header>` global) — ver proposta em §5.1.

### 3.4 Superfície do B3 — card "Vocês" (investigado)

- `src/components/hoje/CardVoces.tsx` — card garantido no topo do feed
  (`FeedHoje`). `CardVoces` (:130-179): título "Vocês"/"Você"
  (`tipoCompanhia === 'sozinho'`, :139) + `<Card>` com uma `LinhaPessoa`
  (:46-128) por pessoa. Cores canônicas já aplicadas:
  `cor = pessoa === 'pessoa_a' ? colors.purple : colors.pink` (:54). Modo
  sozinho renderiza só a linha de pessoa_a (:166-174). `useHumorCasal()`
  fornece `{ pessoaA, pessoaB, ehSozinho, loading }` (:132).

### 3.5 Superfície do B3 — onboarding Frame 1 / "tela 24" (investigado)

- `app/onboarding.tsx` — Frame 1 é "Mais alguém usa este Vault com você?"
  (`Frame1`, :575-626; expansão `Frame1Expand`, :631-694). Quando
  `duo === true` (:611), abre chips Casal/Amigos (:671-681), input do nome da
  pessoa_b (:682-687) e `AvatarPicker pessoa="pessoa_b"` (:689). É a superfície
  natural do B3 no onboarding (o momento em que a segunda presença nasce).
  `Frame1Expand` já usa Reanimated puro (`useSharedValue`/`withSpring`,
  :646-657) — A28-safe; o B3 entra dentro desse padrão.

### 3.6 Superfície do B3 — Recap (investigado)

- `src/components/screens/RecapScreen.tsx` (548 linhas). Cabeçalho com X
  (:31 `X` icon), toggle Lista/Calendário, `ChipGroup` de período
  (`PERIODOS`, :65-71). Renderiza `<OuroborosLoader compacto />` durante a
  agregação (:33 import). O B3 entra como marca de dupla presença no cabeçalho
  do Recap quando `tipoCompanhia !== 'sozinho'`. **Confirmar o ponto exato do
  render na execução** (o arquivo tem 548 linhas; ler o corpo antes de editar).

### 3.7 Superfície de validação — showcase e gauntlet

- `app/_dev/showcase.tsx` — renderiza componentes em scroll para captura
  (VALIDATOR_BRIEF §1.9). Host determinístico do E2E de ângulo do B2.
- `src/lib/dev/gauntlet.ts` — `window.__gauntlet` (APIs: `seed`, `reset`,
  `abrir`, `estado`, etc.; :102-239). `estado()` retorna `GauntletEstado`
  (:66-81) — NÃO tem estado de marca por componente. O ângulo do B2 é exposto
  por probe próprio (§5.2), fora deste objeto.

### 3.8 Tokens e precedentes

- `src/theme/tokens.ts:12-14,18` — `purple: '#bd93f9'`, `pink: '#ff79c6'`,
  `cyan: '#8be9fd'`, `red: '#ff5555'`. Batem 1:1 com as cores do `mount_B3`
  (pessoa_a #bd93f9, pessoa_b #ff79c6, boca #8be9fd).
- Hora local BRT: precedente em `app/index.tsx:319-329` (`saudacaoPorHora`
  usa `date.getTime() + -180*60_000` + `.getUTCHours()`) e helpers em
  `src/lib/datetime/local.ts` (`offsetMinutos`, `dataHoraLocalYmdHm`,
  `TZ_DEFAULT = 'America/Sao_Paulo'`). B2 deriva a hora local por um desses
  caminhos (confirmar na execução; não inventar função nova sem grep).
- Padrão web animatedProps -> DOM: `OuroborosLoading.tsx:143-170` escreve
  `transform` via `data-anim-id` + `setAttribute` no rAF (armadilha M25.2:
  rn-svg-web não propaga animatedProps em `<g>`). O glifo R-BRAND-3 herda
  esse padrão por elemento — B1/B2/B3 usam o mesmo mecanismo no web.

---

## 4. Acceptance criteria

1. **B1** renderiza no cabeçalho da Home (`app/index.tsx`) como presença
   idle discreta: rosto pulsa com stagger, corpo respira, anel gira 60s
   reverso; com reduce-motion o glifo fica em repouso estático (logo completo,
   sem pulso/respiro/giro). Não desloca nem quebra o layout das duas linhas do
   cabeçalho existente.
2. **B2** renderiza como mini-glifo relógio: cobra + rosto giram JUNTOS,
   ângulo = função da hora REAL do relógio (30°/hora), com snap
   `cubic-bezier(.2,.9,.2,1.15)` 400ms; o ângulo ACUMULA (nunca desenrola
   330° para trás na virada de hora). Tick disparado por mudança de hora real
   (não timer fixo de 2s — o 2s do demo era só exposição). Com reduce-motion,
   o mostrador é estático na hora corrente, sem transição animada.
3. **B3** renderiza duas cobras lado a lado com tint canônico: pessoa_a
   #bd93f9, pessoa_b #ff79c6 (contas + cabeça + cauda), boca #8be9fd nas duas;
   ambas horário 32s/rev. Aparece no card "Vocês" (Home), no Frame 1 do
   onboarding (quando `duo === true`) e no Recap (quando não-sozinho). Com
   reduce-motion, as duas cobras ficam paradas com o tint aplicado (sem giro).
4. **Modo sozinho**: B3 degrada para uma única presença tingida (pessoa_a),
   sem a segunda cobra — coerente com o título "Você" do card e o Recap
   sozinho. Nunca renderiza uma cobra pessoa_b "vazia".
5. **Reduce-motion**: todo componente computa `useReduceMotion()` no topo, sem
   condicionar a CHAMADA de hooks do Reanimated (regra dos hooks); loops/rAF
   viram no-op e o estado estático é o glifo canônico em repouso (princípio 01
   da marca).
6. **Sem dep nativa nova**: só Reanimated + react-native-svg (via o driver do
   glifo). `modules/` intocado. Nenhum dos 14 consumidores do `OuroborosLoader`
   alterado.
7. **FEATURES-CANONICAS.md** atualizado no mesmo commit com B1/B2/B3.
8. **Proof-of-work** entregue: E2E playwright com assert do ângulo do B2 via
   estado inspecionável + assert de reduce-motion; screenshots Gauntlet A+;
   smoke verde; paridade visual com o demo do
   `conceitos-ouroboros.html`/`coreografias-extraidas.js`.

---

## 5. Design (por peça)

### 5.1 B1 — respiração ambiente (Home header)

Port literal de `mount_B1` (coreografias-extraidas.js:349-365):

- wordmark em opacidade 0.9 (se o glifo do B1 mostrar wordmark; no header
  discreto provavelmente `hideWordmark` — decidir no visual checkpoint);
- **rosto pulsa** (`obPulse` 4s): cada um dos 4 elementos do rosto anima
  opacidade com stagger de `i * 0.1s` (organicidade, nunca constante);
- **corpo respira** (`obBreath` 4s, atraso 0.2s): pulso suave de scale no
  grupo de contas;
- **anel gira 60s reverso** (`obSpin` reverso), com `transformOrigin` no
  RING_CENTER (anti-wobble).

**Posicionamento (investigado, decisão de visual checkpoint)**: o cabeçalho
`CabecalhoHoje` (app/index.tsx:242-284) tem a linha 1 com data (flex:1) +
pill Reflexão à direita. Proposta discreta e de baixo risco: um glifo B1
pequeno (~24-28dp) inline no início da linha 1, antes da data, com a data
recuando para `flex:1` remanescente; OU um mark tênue à esquerda da saudação
(linha 2). Princípio 01: a cobra parada respirando já é presença suficiente —
o tamanho é pequeno, o movimento é lento, nunca compete com a leitura. A
posição pixel-exata fica para o checkpoint visual no Gauntlet (não inventar
layout novo às cegas). NÃO usar `w-10` fixo nem `Button.tsx` genérico
(reference_header_right_slot / A33): se precisar de wrapper, `View`/`Pressable`
inline.

**Reduce-motion**: sem pulso/respiro/giro — o glifo B1 aparece completo e
imóvel (estado canônico de repouso do brand system).

### 5.2 B2 — relógio silencioso (mini-glifo in-app)

Port de `mount_B2` (coreografias-extraidas.js:367-393), com a diferença
consciente do design doc §4 (o demo roda em timer de 2s para exposição; o app
usa a hora REAL):

- cobra (`snake`) + rosto (`rosto`) giram JUNTOS, mesma `transformOrigin`
  (CENTER); rosto sempre visível por design (é o mostrador);
- transição de giro: `cubic-bezier(.2,.9,.2,1.15)` 400ms (o "snap" do
  ponteiro);
- **ângulo em repouso** para a hora local `H` (0-23):
  `angulo = ((H % 12) * 30) mod 360` (12 horas -> 360°, 30° por hora);
- **acumula sem desenrolar**: na virada de hora, o transform avança +30° para
  frente (nunca -330°). Em native, isso implica manter um contador de ângulo
  monotônico (não recomputar `H*30` cru na virada 11->0). No web (fallback
  rAF/DOM) o mesmo: escrever um ângulo que só cresce.
- tick: reagir à mudança de hora real. Implementação sugerida: computar a hora
  local (via precedente app/index.tsx:319-329 ou src/lib/datetime/local.ts),
  agendar o próximo tick para o topo da próxima hora (ou revalidar no
  `AppState` active). NÃO usar `setInterval(2000)` fixo — 2s era só demo.

**Host in-app (decisão de checkpoint — GUIDE §1, ambiguidade declarada)**: o
design doc §4 pinta o B2 como "mini-glifo in-app" mas NÃO fixa a tela de
produção (o lar definitivo é o widget nativo, adiado para R-BRAND-10). B1 já
ocupa o header da Home, então B2 e B1 não devem competir no mesmo slot.
Candidatos investigados que existem: cabeçalho do Recap (semântica de tempo/
período), tela Sobre/rodapé de settings. **Entregável desta sprint**: o
componente `B2RelogioSilencioso.tsx` completo + registrado no
`app/_dev/showcase.tsx` (superfície de validação determinística) + montado em
UM host de produção discreto a confirmar no checkpoint (recomendação default:
cabeçalho do Recap). Se o dono preferir só showcase nesta sprint e o host de
produção junto do widget em R-BRAND-10, registrar como sub-decisão — não
inflar o escopo às cegas.

**Estado inspecionável (para o E2E de ângulo)**: expor um probe dev-only
`window.__obBrandProbe()` (guardado por `__DEV__ && Platform.OS === 'web'`,
mesmo racional do `window.__obProbe` do demo, coreografias-extraidas.js:85-104)
retornando `{ b2Angulo: number }` (ângulo atual em graus, mod 360). Além
disso, para determinismo em CI (a hora de parede não é reproduzível), o B2
aceita uma prop dev-only `horaOverride?: number` (0-23) usada só no
showcase/gauntlet: com `horaOverride = H`, o ângulo em repouso deve ser
`((H % 12) * 30)`. O E2E injeta `horaOverride` e lê `b2Angulo` (ou o
`transform` do `data-anim-id` do grupo, fallback DOM já usado no
OuroborosLoading) e assere o valor esperado. Fora de dev, `horaOverride`
inexiste (dead-code em release, verificar no bundle export).

**Reduce-motion**: mostrador estático na hora corrente (sem transição de snap
entre horas); o glifo aponta o ângulo da hora atual e não anima.

### 5.3 B3 — dupla presença (card "Vocês" · onboarding Frame 1 · Recap)

Port de `mount_B3` (coreografias-extraidas.js:395-449):

- duas instâncias do glifo lado a lado (`hideWordmark`, `hideRing`), com label
  opcional por baixo (no app, o label já vem do contexto — nome/pessoa — então
  o glifo B3 provavelmente dispensa o label textual próprio do demo);
- **tint 100% por pessoa**: contas + cabeça + cauda em `colors.purple`
  (pessoa_a) e `colors.pink` (pessoa_b); **boca `colors.cyan` nas duas** (o
  encontro);
- ambas no sentido HORÁRIO (sem reverse), snake + rosto giram juntos,
  `obSpin` 32s/rev.

**Três superfícies**:

1. **Card "Vocês"** (`CardVoces.tsx`): B3 como marca do card. As cores já
   existem no componente (:54); reusar `colors.purple`/`colors.pink`. Em
   `ehSozinho`, degradar para presença única pessoa_a (uma cobra tingida),
   coerente com o título "Você" (:139) e a linha única (:166-174).
2. **Onboarding Frame 1** (`Frame1Expand` em `app/onboarding.tsx`): B3 aparece
   quando `duo === true` (:611), reforçando visualmente "as duas presenças no
   mesmo Vault". Respeitar o `Frame1Expand` A28-safe (Reanimated puro).
3. **Recap** (`RecapScreen.tsx`): B3 no cabeçalho quando não-sozinho (marca de
   que o Recap é do casal). Confirmar o ponto de render na execução.

**Reduce-motion**: as duas cobras paradas com o tint aplicado (sem giro de
32s). O tint é estado estático, não animação — permanece.

**Perf (nota honesta)**: B3 é **rotação de grupo** (um transform no `<g>` de
cada glifo, 2 transforms/frame no total), NÃO pulso por conta. Não confundir
com o pior caso C2 (43 `useAnimatedProps` por frame) do benchmark da
R-BRAND-3-GLIFO. Duas cobras girando o grupo inteiro é barato. Se o driver do
glifo só oferecer animação per-bead, usar a via de rotação de grupo (o glifo
deve expor rotação do conjunto — confirmar API pós-merge).

---

## 6. Invariantes a preservar

- **Regra de Identidade de Pessoas (CLAUDE.md)**: `pessoa_a` -> `--purple`
  (#bd93f9), `pessoa_b` -> `--pink` (#ff79c6). O tint do B3 usa exatamente
  esses tokens; nunca nomes reais em código. Boca cyan (#8be9fd) é o encontro.
- **Reduce-motion incondicional (design doc §3)**: `useReduceMotion()` no topo
  de todo conceito; estado estático = glifo em repouso. Não condicionar a
  chamada de hooks do Reanimated (regra dos hooks; A11Y-MOVIMENTO §3.4).
- **A27 (Fabric/New Arch, VALIDATOR_BRIEF)**: nunca `transform` string em SVG
  nativo — usar props `rotation`/`x`/`y` ou arrays; ramificar por
  `Platform.OS` (web=string via DOM, native=rotação numérica). É o padrão já
  no OuroborosLoading (:186-195) e herdado pelo glifo.
- **M25.2 (web, design doc §3)**: rn-svg-web não propaga animatedProps em
  `<g>`/`<Circle>` — usar o fallback rAF + `data-anim-id` + `setAttribute`,
  com id único por instância (R-CRIT-4) e escopo por ref (defense-in-depth).
- **A28 (boot path)**: onboarding usa Reanimated puro, não Moti. B3 no
  `Frame1Expand` segue esse padrão (sem `<MotiView>`).
- **Regra de Tom (CLAUDE.md)**: zero gamificação, zero exclamação, zero
  comparativo. B1/B2/B3 são presença calma, não recompensa.
- **Regra de Estética / ADR-010**: física acima de tempo (o snap do B2 é
  spring, não linear), silêncio visual, micro-interações pontuais.
- **Princípio 01 e 03 do brand system**: nada gira à toa; contínuos vivem só
  enquanto o estado dura. B1/B2/B3 são estados de repouso legítimos (presença,
  hora, casal) — justificados, não decorativos.
- **Anonimato (Regra -1)**: zero menção a IA/nomes proibidos em `src/`, `app/`,
  `tests/` (`./scripts/check_anonimato.sh` no smoke).

---

## 7. Plano de implementação

Ordem linear (não iniciar antes de R-BRAND-3-GLIFO mergeada):

1. **Pré-flight (lição 4/7)**: `ls src/components/brand/glifo/` deve existir;
   `rg` a assinatura real do driver `OuroborosGlifo` (props de shared value
   por elemento, overrides de cor, `data-anim-id` por elemento) e de
   `ordenarDaCabeca`. Registrar a API confirmada antes de escrever qualquer
   componente. Se divergir do design doc §3, parar e reportar.
2. **B1Respiracao.tsx**: implementar com o driver do glifo — opacidade do
   rosto com stagger 0.1s, respiro no corpo, anel 60s reverso; early-return de
   reduce-motion (glifo em repouso). Teste unitário do early-return.
3. **B2RelogioSilencioso.tsx**: implementar a aritmética do ângulo
   (`((H%12)*30) mod 360`, acumulando), snap 400ms, tick por hora real, prop
   dev-only `horaOverride`, probe `window.__obBrandProbe` (guardado). Testes
   unitários da função pura de ângulo (H=0/3/6/11/12/23 -> ângulo esperado) e
   do early-return de reduce-motion.
4. **B3DuplaPresenca.tsx**: duas instâncias tingidas (purple/pink, boca cyan),
   giro de grupo 32s horário, degradê para presença única em `ehSozinho`;
   early-return de reduce-motion (tint estático, sem giro). Teste unitário do
   ramo sozinho e do reduce-motion.
5. **Barrel** (`src/components/brand/index.ts`): exportar os 3 + tipos.
6. **Wire-up B1** no `CabecalhoHoje` (app/index.tsx), posicionamento discreto
   (§5.1), sem quebrar o layout das duas linhas.
7. **Wire-up B3** no `CardVoces.tsx` (Home), `Frame1Expand` (onboarding,
   `duo === true`) e `RecapScreen.tsx` (não-sozinho). Confirmar cada ponto de
   render por read antes de editar.
8. **Wire-up B2** no host de produção (recomendação: cabeçalho do Recap) +
   `app/_dev/showcase.tsx` (B1/B2/B3 para captura e E2E).
9. **FEATURES-CANONICAS.md** (§1.2): linha da faixa "Estados Vivos" (B1/B2/B3),
   destino e comportamento reduce-motion, no mesmo commit.
10. **Testes**: Jest verde (baseline, 0 falhas novas) + E2E playwright
    (`rbrand7-estados-vivos.e2e.ts`) + screenshots Gauntlet A+.
11. **Smoke** (`./scripts/smoke.sh`) verde: anonimato + strings UI PT-BR + tsc
    + jest.
12. **Docs de fecho**: CHANGELOG, STATE, ROADMAP, ORDEM-EXECUCAO-V1.

---

## 8. Aritmética (meta numérica — ângulo do B2)

O B2 tem contrato numérico exato (o executor valida antes de fechar — lição 7):

- **30° por hora**. Ângulo em repouso para a hora local `H` (0-23):
  `angulo(H) = ((H % 12) * 30) mod 360`. Tabela de verdade a cobrir em teste
  unitário puro (sem render):
  - `H = 0`  -> `0`
  - `H = 3`  -> `90`
  - `H = 6`  -> `180`
  - `H = 9`  -> `270`
  - `H = 11` -> `330`
  - `H = 12` -> `0` (12 % 12 = 0)
  - `H = 15` -> `90`
  - `H = 23` -> `330`
- **Acumula sem desenrolar**: entre H=11 (330°) e H=12 (0°), o transform
  aplicado avança para 360° (equivalente a 0° visual), NUNCA -330°. O contador
  de ângulo entregue ao transform é monotônico crescente; só o valor
  observável mod 360 casa com a tabela acima. O E2E assere o valor mod 360 no
  repouso (com `horaOverride`), e a monotonicidade via dois ticks consecutivos
  (o ângulo bruto do segundo tick >= o do primeiro).
- **Snap**: transição `cubic-bezier(.2,.9,.2,1.15)`, 400ms — o E2E, após
  injetar a hora, aguarda o settle (>= ~450ms) antes de ler o ângulo.

### Aritmética do B3 (rotação e contagem)

- 2 glifos, cada um 43 contas + 4 rosto + anel. Rotação de GRUPO: 2
  transforms/frame (um `<g>` por glifo), não 86 `useAnimatedProps`/frame.
  Período 32s/rev, sentido horário nas duas. Custo de frame comparável a uma
  rotação simples — bem abaixo do pior caso C2 do benchmark da R-BRAND-3-GLIFO.
- Modo sozinho: 1 glifo (43+4+anel), 1 transform/frame.

---

## 9. Testes

- **Jest** (`tests/components/brand/`): função pura de ângulo do B2 (tabela §8);
  early-return de reduce-motion em B1/B2/B3 (com `useReduceMotion` mockado
  `true`, nenhum loop/rAF é armado); ramo `ehSozinho` do B3 (uma só presença).
- Baseline: `FAIL_BEFORE = 0` (suítes atuais verdes). Esperado
  `FAIL_AFTER = 0` — sprint aditiva; não quebrar suítes de CardVoces, Home,
  RecapScreen, onboarding.
- E2E (rodado via playwright MCP, não Jest — `testPathIgnorePatterns` exclui
  `/e2e/`): ver §11.

---

## 10. Proof-of-work esperado (runtime real)

Comandos-base (VALIDATOR_BRIEF; `package.json`):

```bash
npx --no-install tsc --noEmit      # typecheck limpo
npm test                           # jest verde (baseline, 0 falhas novas)
./scripts/smoke.sh                 # anonimato + strings UI PT-BR + tsc + jest
```

### Gauntlet (Nível A+, obrigatório — toca UI)

```bash
EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web    # ou ./gauntlet.sh
# playwright MCP em http://localhost:8081/_dev/gauntlet e /_dev/showcase
```

E2E `tests/e2e/playwright/rbrand7-estados-vivos.e2e.ts` (copiar de
`tests/e2e/playwright/e2e-template.ts`; retornar `ResultadoE2E` com
`sprint`/`aspecto`/`status`/`detalhe`/`screenshots`). Asserts:

- **B2 — ângulo (estado inspecionável)**: no `/_dev/showcase`, injetar
  `horaOverride = 3` no B2, aguardar o settle do snap (~500ms) e assertar
  `window.__obBrandProbe().b2Angulo === 90` (mod 360); repetir `H=6 -> 180`,
  `H=12 -> 0`. Fallback se o probe não vingar: ler o `transform` do
  `data-anim-id` do grupo do B2 e parsear o `rotate(...)`.
- **B2 — acumula sem desenrolar**: dois ticks consecutivos de hora (11 -> 12),
  assertar que o ângulo bruto do transform cresce (não regride 330°).
- **B3 — tint canônico**: assertar que as contas/cabeça/cauda do glifo
  pessoa_a estão em #bd93f9, pessoa_b em #ff79c6, e a boca das duas em #8be9fd
  (via `getComputedStyle`/`fill` no DOM web, mesmo racional do `__obProbe`).
- **Reduce-motion** (`page.emulateMedia({ reducedMotion: 'reduce' })`): B1
  não pulsa/gira (glifo estático entre 2 frames — transform/opacidade estáveis);
  B2 mostra a hora corrente sem transição de snap; B3 mostra o tint sem giro.
  Mecanismo canônico = `emulateMedia` (NÃO um setter `__gauntlet` inexistente).
- Validação navegada e clicada como app real (Home com B1, card "Vocês" com
  B3, Recap com B3, showcase com B2) antes de declarar `[ok]`.
- Screenshots em `docs/sprints/R-BRAND-7-screenshots-gauntlet/`, incluindo
  paridade lado-a-lado com o demo do
  `docs/design/ouroboros/conceitos-ouroboros.html` (seções B1/B2/B3) aberto no
  Chrome.

### Nível C (device) — só se houver haptic

- B1/B2/B3 são presença contínua sem haptic por padrão (Regra de Tom). Nível C
  dispensável, salvo se o dono pedir um toque `Light` pontual em algum estado
  (decisão de checkpoint). Se dispensável, a validação fica no Gauntlet.

### FEATURES-CANONICAS (exigência de execução)

- `docs/FEATURES-CANONICAS.md` §1.2 atualizado com B1/B2/B3 no MESMO commit.
  Validador-sprint recusa a sprint sem esse update. Registrar destino
  (B1 header Home, B2 mini-glifo in-app, B3 card Vocês/onboarding/Recap) e o
  comportamento reduce-motion de cada um.

### Higiene antes de retornar

- `rg` dos identificadores citados (confirmar que existem antes de editar —
  lição 4): `CabecalhoHoje`, `CardVoces`, `Frame1Expand`, `RecapScreen`,
  `useReduceMotion`, `useHumorCasal`, `colors.purple/pink/cyan`,
  `OuroborosGlifo`/`ordenarDaCabeca` (pós-merge do glifo).
- Varredura de acentuação nos arquivos modificados:
  `python3 scripts/check_strings_ui_ptbr.py` (roda dentro do smoke). Strings
  UI novas em Sentence case com acentuação completa.

---

## 11. Reduce-motion (obrigatório, todas as peças)

- `const reduzir = useReduceMotion();` no topo de B1/B2/B3; aplicar o estado
  ESTÁTICO quando `reduzir`, sem condicionar a chamada dos hooks do Reanimated.
  `withRepeat`/`withTiming`/rAF viram no-op.
- Fallbacks canônicos (design doc §3, "B* -> glifo em repouso"):
  - **B1**: glifo completo e imóvel (sem pulso/respiro/giro).
  - **B2**: mostrador estático na hora corrente (sem snap animado).
  - **B3**: duas cobras paradas com o tint aplicado (sem giro de 32s).
- Mecanismo E2E: `page.emulateMedia({ reducedMotion: 'reduce' })` (igual
  R-AUDIT-A11Y-MOVIMENTO §5.1 e ao rbrand-loading.e2e.ts existente).

---

## 12. Arquivos tocados (justificativa de não dividir)

- Criar: 3 componentes (`B1`/`B2`/`B3`) + 1 E2E + 2-3 testes unitários.
- Modificar: barrel, `app/index.tsx`, `CardVoces.tsx`, `app/onboarding.tsx`,
  `RecapScreen.tsx`, `showcase.tsx`, `FEATURES-CANONICAS.md` (+ docs de fecho).
- Total de wire-up de produção: 4 superfícies (Home header, card Vocês,
  onboarding, Recap) + host do B2. Todas na MESMA área arquitetural
  (componentes de marca + montagem em telas). Não cruza serviços/stores/
  schemas como a antiga R-BRAND-3 (que cruzava toast + store persistido +
  plumbing de progresso e por isso foi dividida em 3a/3b/3c). Aqui as 3 peças
  compartilham o driver do glifo e o mesmo padrão de reduce-motion — dividir
  fragmentaria uma entrega coesa. **Sprint única.**
- Baseline de testes: `FAIL_BEFORE = 0`, `FAIL_AFTER = 0` (aditiva).

---

## 13. Anonimato e PT-BR

- Zero menção a IA/nomes proibidos em `src/`, `app/`, `tests/`
  (`./scripts/check_anonimato.sh` exit 0 no smoke).
- Nomes reais nunca em código: B3 usa `pessoa_a`/`pessoa_b` e os tokens de cor;
  os nomes exibidos vêm de `useNomeDe` em runtime (SecureStore).
- Strings UI novas (se houver label): Sentence case, acentuação completa PT-BR
  (`scripts/check_strings_ui_ptbr.py` no smoke). `accessibilityLabel` sem
  acento (convenção screen reader).

---

## 14. Checklist de docs

- `docs/FEATURES-CANONICAS.md` §1.2 — B1/B2/B3 (bloqueante; mesmo commit).
- `CHANGELOG.md` — entrada da sprint no merge.
- `STATE.md` / `ROADMAP.md` — status.
- `docs/sprints/ORDEM-EXECUCAO-V1.md` — posição na onda (sprint 4/7, depende
  de R-BRAND-3-GLIFO).
- `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` §5 — marcar a linha 4 como entregue no
  merge.
- `VALIDATOR_BRIEF.md` — só se surgir invariante novo (ex.: "todo conceito de
  marca expõe estado inspecionável via `__obBrandProbe`"); caso contrário, não
  tocar.
- Screenshots em `docs/sprints/R-BRAND-7-screenshots-gauntlet/`.

---

## 15. Riscos e não-objetivos

- **Bloqueio duro não satisfeito**: a sprint NÃO inicia sem
  `src/components/brand/glifo/` mergeado. Confirmar por `ls`/`rg` (lição 4/7).
  Se o benchmark C2 da R-BRAND-3-GLIFO tiver pivotado para Skia, revalidar o
  motor de B1/B2/B3 antes de escrever (herdar a decisão da sprint 0).
- **Host de produção do B2 em aberto** (GUIDE §1): o design doc não fixa a tela
  in-app do B2 (o lar real é o widget, R-BRAND-10). Recomendação default:
  cabeçalho do Recap; alternativa: só showcase nesta sprint + produção junto do
  widget. Decidir no checkpoint, não inventar tela.
- **Widget nativo (modules/) é R-BRAND-10**: não tocar. Anti-débito — se
  aparecer necessidade de widget durante a execução, é sprint nova, não infla
  esta.
- **Aposentar a geração antiga é R-BRAND-9**: não remover
  OuroborosLoader/Loading/Fechamento nem migrar os 14 consumidores aqui.
- **Perf do B3**: garantir rotação de GRUPO (barato), não pulso per-bead. Se o
  driver do glifo só expuser per-bead, reportar como achado (pode exigir ajuste
  no glifo — sprint nova, não expandir esta).
- **Determinismo do E2E de ângulo**: a hora de parede não é reproduzível em CI;
  por isso o `horaOverride` dev-only + probe. Não assertar contra
  `new Date()` real.
- **Layout do header (B1)**: risco de competir com a pill Reflexão / quebrar a
  linha 1. Manter discreto e validar no Gauntlet antes de fechar (A33: nada de
  `w-10` fixo nem Button genérico no slot).

---

## 16. Referências

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§3 arquitetura,
  §4 mapa conceito->destino, §5 ondas, §6 armadilhas, §7 proof-of-work).
- Coreografias: `docs/design/ouroboros/coreografias-extraidas.js`
  (`mount_B1` :349-365, `mount_B2` :367-393, `mount_B3` :395-449; `__obProbe`
  :85-104).
- Conceitos (paridade visual): `docs/design/ouroboros/conceitos-ouroboros.html`.
- Pré-requisito: R-BRAND-3-GLIFO (spec própria; geometria + ordenarDaCabeca +
  OuroborosGlifo + benchmark C2).
- Precedente de formato: `docs/sprints/R-BRAND-3-ESTADOS-VIVOS-spec.md`
  (nomenclatura antiga).
- Loaders R-BRAND-2 (padrão web/reduce-motion): `src/components/brand/
  OuroborosLoading.tsx` (:80-199), `OuroborosLoader.tsx`.
- E2E precedente: `tests/e2e/playwright/rbrand-loading.e2e.ts` (reduce-motion
  via `emulateMedia`), template `tests/e2e/playwright/e2e-template.ts`.
- Superfícies: `app/index.tsx` (:242-284), `src/components/hoje/CardVoces.tsx`
  (:130-179), `app/onboarding.tsx` (:575-694),
  `src/components/screens/RecapScreen.tsx`.
- Hook: `src/lib/hooks/useReduceMotion.ts`.
- Gauntlet: `src/lib/dev/gauntlet.ts`, VALIDATOR_BRIEF §1.9 (A27, M25.2,
  R-CRIT-4, `__gauntlet`, showcase, Frame mobile 412dp).
- Tokens: `src/theme/tokens.ts` (:12-14,18).
- FEATURES-CANONICAS: `docs/FEATURES-CANONICAS.md` §1.1/§1.2 (marca).
```
