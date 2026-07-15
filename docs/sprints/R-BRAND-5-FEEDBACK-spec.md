# SPRINT R-BRAND-5-FEEDBACK: C1 fiel + C2 fiel + C3 rejeição atenta

Onda `R-BRAND-SYSTEM` — sprint 2 de 7. Fonte:
[`docs/sprints/_ONDA-R-BRAND-SYSTEM.md`](_ONDA-R-BRAND-SYSTEM.md) §4 e §5.
Coreografias de referência:
[`docs/design/ouroboros/coreografias-extraidas.js`](../design/ouroboros/coreografias-extraidas.js)
(`mount_C1` linhas 454-541, `mount_C2` 543-570, `mount_C3` 572-665).

## Contexto

O grupo C do brand system é o feedback de estado: fechar um ciclo (C1),
digerir uma operação longa (C2), rejeitar um dado com atenção sem susto
(C3). Hoje o app tem apenas aproximações da geração R-BRAND-2 que não
manipulam a anatomia real da cobra: `OuroborosFechamento.tsx` (arco
único que fecha) e `OuroborosLoading.tsx` variant `sync` (anel que gira).
Esta sprint entrega as três versões **fiéis** sobre o glifo canônico (43
contas + rosto de 4 elementos) e cria o C3, que ainda não existe em
lugar nenhum.

Escopo derivado do design doc §4 (mapa conceito→destino) e §5 (sprint 2).

## Pré-requisito bloqueante

**`R-BRAND-3-GLIFO` mergeada.** As três coreografias dirigem opacidade,
transform e cor sobre a anatomia exposta pelo `OuroborosGlifo` (driver
com shared values por elemento: 43 contas + `cabeca`/`cauda`/`boca`/`olho`
+ anel + wordmark, mais overrides de cor). Sem o glifo base e o port
`ordenarDaCabeca` (equivalente ao `orderFromHead`), nenhum conceito
desta sprint tem substrato para renderizar.

Estado verificado na redação deste spec (2026-07-14): `src/components/
brand/glifo/` e `src/components/brand/conceitos/` **ainda não existem**;
não há commit `R-BRAND-3-GLIFO` mergeado. O executor DEVE confirmar,
antes do passo 1, que a sprint 0 fechou e que `OuroborosGlifo`,
`ordenarDaCabeca` e `geometria.ts` estão em disco — e ler a **API real
do driver** (nomes de props e shape das shared values) direto do código
mergeado, sem assumir os identificadores citados abaixo (lição 4). Os
nomes usados neste spec (`OuroborosGlifo`, `ordenarDaCabeca`, elementos
`cabeca`/`cauda`/`boca`/`olho`) vêm do **contrato** do design doc §3 e da
coreografia de referência, não de código já existente.

Se a API do glifo divergir do contrato, PARE e escale (achado colateral
→ sprint derivada), não improvise nomes.

## Escopo (touches autorizados)

### Arquivos a criar
- `src/components/brand/conceitos/C1FechamentoDoCiclo.tsx` — versão fiel
  de C1 (cascata + flash boca/cauda + conta final scale 1.5 + wordmark).
- `src/components/brand/conceitos/C2Digestao.tsx` — versão fiel de C2
  (pulso gaussiano contínuo, rosto em fase).
- `src/components/brand/conceitos/C3RejeicaoAtenta.tsx` — **NOVO** (erro
  sem susto: cabeça e boca em vermelho, 6 pulsos, recover suave).
- `tests/components/brand/conceitos/C1FechamentoDoCiclo.test.tsx`
- `tests/components/brand/conceitos/C2Digestao.test.tsx`
- `tests/components/brand/conceitos/C3RejeicaoAtenta.test.tsx`
- `tests/e2e/playwright/rbrand-5-feedback.e2e.ts` — caso E2E Gauntlet.

### Arquivos a modificar
- `app/humor-rapido.tsx` — trocar `OuroborosFechamento` por
  `C1FechamentoDoCiclo` no overlay de fechamento (linha ~352, dentro do
  `View accessibilityLabel="fechando o ciclo"`). Haptic (`haptics.humor()`
  linha 178) **permanece intocado no caller**.
- `app/diario-emocional.tsx` — idem no overlay (linha ~718, `View
  accessibilityLabel="fechando o ciclo"`). Haptics (`haptics.vitoria()`/
  `haptics.trigger()`) permanecem no caller.
- `src/components/settings/SecaoBackupAutomatico.tsx` — trocar
  `<OuroborosLoading variant="sync" tamanho={22} />` (linha ~235) por
  `<C2Digestao tamanho={22} />` dentro do `View accessibilityLabel=
  "fazendo backup"`.
- `src/components/screens/ScannerPreview.tsx` — no `catch` do OCR (linhas
  ~115-117, hoje só `toast.show('Falha no reconhecimento de texto.',
  'error')`) montar o overlay one-shot `C3RejeicaoAtenta`. O toast
  PT-BR permanece para leitor de tela e clareza.
- `app/share-receive.tsx` — no `catch` de `executarSave` (linhas
  ~319-322, hoje `toast.show('Falha ao salvar.', 'error')`) montar o
  overlay one-shot `C3RejeicaoAtenta` no caso de arquivo ilegível. Toast
  permanece.
- `src/components/brand/conceitos/index.ts` — barrel dos conceitos
  (criar se `R-BRAND-3-GLIFO` não criou; senão acrescentar os 3 exports).
- `docs/FEATURES-CANONICAS.md` — §1.2 (marca — loaders animados):
  apontar C1 e C2 para os novos conceitos fiéis e **acrescentar a linha
  de C3** (rejeição atenta no scanner e no import). Obrigatório no mesmo
  commit (validador-sprint recusa sprint sem isso).

### Arquivos NÃO a tocar
- `src/components/brand/OuroborosFechamento.tsx` e
  `src/components/brand/OuroborosLoading.tsx` — **não deletar nem editar
  o corpo**. A aposentadoria da geração antiga é a sprint
  `R-BRAND-9-MIGRACAO` (design doc §5 linha 6). Manter os exports no
  barrel `src/components/brand/index.ts` até lá para não quebrar imports.
- `src/components/brand/glifo/*` — consumir a API, nunca alterá-la.
- `src/components/brand/OuroborosLoader.tsx` — os 14 consumidores dele
  são da sprint de migração.
- `src/components/midia/MidiaYoutubeTab.tsx` e `MidiaSpotifyTab.tsx` —
  usam `OuroborosLoading variant="inline"` (E2), fora do escopo desta
  sprint (E2 é entrega da sprint 0).

## Acceptance criteria

1. Existem `C1FechamentoDoCiclo.tsx`, `C2Digestao.tsx` e
   `C3RejeicaoAtenta.tsx` em `src/components/brand/conceitos/`, cada um
   renderizando sobre `OuroborosGlifo` (anatomia real, não anel
   aproximado).
2. C1 porta a matemática de `mount_C1`: cascata da cabeça (`ordenarDaCabeca`
   `ccw`) com stagger, flash de boca e cauda ao "clique", conta final
   com `scale(1.5)→1`, wordmark surgindo ao fim. One-shot; `onConcluir`
   dispara ao término do budget (default 350ms) e é quem navega no caller.
3. C2 porta `mount_C2`: pulso gaussiano `0.15 + 0.85·exp(-d²·80)` varrendo
   as 43 contas em ordem `cw` a 2.4s/rev, com o rosto acendendo **em fase**
   (`face = 0.3 + 0.7·exp(-dh²·60)`, olho `face·0.65`). Contínuo enquanto
   o backup executa; para quando o estado que o justifica termina.
4. C3 porta `mount_C3`: default tudo apagado (contas e rosto em 0.08);
   cabeça e boca acendem em vermelho `#ff5555` (`colors.red`), cauda e
   olho permanecem apagados; 6 pulsos de 170ms; recover suave (fade
   600ms, cor volta ao roxo só depois do fade, sem snap). One-shot ~2.5s;
   `onConcluir` limpa o overlay ao término.
5. C1 substitui `OuroborosFechamento` nos dois saves (humor e diário)
   preservando o wrapper `accessibilityLabel="fechando o ciclo"` — a
   E2E de R-BRAND-2 (`rbrand-loading.e2e.ts`) continua verde sem edição.
6. C2 substitui a variant `sync` do backup em `SecaoBackupAutomatico`
   preservando o `accessibilityLabel="fazendo backup"`.
7. C3 monta na falha de OCR (`ScannerPreview`) e no arquivo ilegível do
   import (`share-receive`), sem susto, sem bloquear a recuperação do
   usuário (form do scanner continua editável; modal de share não é
   desmontado — só o overlay some ao fim).
8. **Reduce-motion** (via `useReduceMotion`, hook incondicional no topo
   de cada conceito): C1 dispara `onConcluir` imediato e renderiza estado
   final estático; C2 fica em repouso (sem worklet armado); C3 renderiza
   o **estado estático canônico = alerta congelado** (contas e rosto em
   0.08, cabeça e boca em vermelho e opacidade 1, sem pulso nem recover).
9. `FEATURES-CANONICAS.md` §1.2 atualizado no mesmo commit.
10. `./scripts/smoke.sh` verde (Jest + anonimato + auditoria PT-BR).

## Invariantes a preservar

- **A27 (Fabric rejeita transform string em SVG).** Nunca `transform`
  string em native. Usar `rotation`/`x`/`y`/arrays ou props numéricas.
  Ramificar por `Platform.OS` quando o web precisar de string (web) e o
  native de prop numérica — mesmo padrão já validado no `OuroborosLoader`/
  `OuroborosLoading`. Ref: BRIEF §4 A27.
- **M25.2 / web sem `animatedProps` em `<G>`/`<Circle>`.** O rn-svg-web
  não propaga animatedProps; fallback canônico rAF + DOM `data-anim-id`
  + `setAttribute`, com UUID por instância (R-CRIT-4) e escopo por ref
  do `<Svg>` (defense-in-depth). Copiar o padrão do `OuroborosLoading`,
  não redescobrir. Ref: design doc §3 (Web/Gauntlet).
- **A22 (mock de `react-native-worklets`).** Conceitos importam
  Reanimated direto; se algum novo símbolo de worklet for usado (ex.:
  `useFrameCallback`), garantir stub no-op no `jest.setup.cjs` antes de
  os testes rodarem. Ref: BRIEF §4 A22.
- **Um único worklet por coreografia contínua (C2).** As 43 shared
  values escritas num `useFrameCallback`/rAF por frame — zero re-render
  React. Ref: design doc §3 (Driver).
- **Regra de Tom.** Erro sem susto (C3): zero exclamação, zero
  gamificação, zero comparativo. Fechar (C1) é celebrar sem confete.
- **Regra −1 / anonimato.** Nenhum nome de IA/pessoa em código.
- **Regra de Linguagem.** Strings de UI (toasts que permanecem)
  Sentence case + acentuação PT-BR completa; `accessibilityLabel` sem
  acento (convenção screen reader); comentários de código sem acento
  (convenção shell/CI), prosa/docstrings com acentuação.
- **ADR-010 (estética).** Física acima de tempo; micro-interações
  pontuais; loading é apresentação da marca, não ornamento.
- **Contrato de props do C1 = contrato do `OuroborosFechamento`.**
  Manter `onConcluir`, `duracaoMs` (default 350), `tamanho`,
  `accessibilityLabel` para troca drop-in nos dois callers sem mexer na
  lógica de `handleSave`/`goBackOnce`.

## Plano de implementação

1. **Confirmar pré-requisito.** `ls src/components/brand/glifo/` e
   `src/components/brand/conceitos/`; ler a API pública do `OuroborosGlifo`
   (props do driver, nomes das shared values, override de cor). Registrar
   os nomes reais. Se ausente/divergente do contrato do design doc §3,
   PARAR e escalar.
2. **C1FechamentoDoCiclo.tsx.** Consome `OuroborosGlifo` + `ordenarDaCabeca`
   (`ccw`). Effect one-shot: reset (contas e rosto em 0.12, wordmark 0) →
   cabeça e olho lideram → cascata das contas com stagger derivado de
   `duracaoMs` (ver Aritmética) → no clique final: conta final `scale
   1.5→1`, flash de boca e cauda (brilho/drop-shadow em web; equivalente
   de opacidade/cor em native, respeitando A27) → wordmark surge. Ao fim
   do budget, `onConcluir()`. Reduce-motion: `onConcluir()` imediato e
   glifo em estado final estático. `useReduceMotion` no topo, incondicional.
3. **C2Digestao.tsx.** Consome `OuroborosGlifo` + `ordenarDaCabeca` (`cw`).
   Um único worklet (`useFrameCallback` native / rAF web) escreve as 43
   contas por frame com `t = (elapsed/2400)%1`, `d = min(|t−i/N|, 1−|t−i/N|)`,
   opacidade `0.15 + 0.85·exp(−d²·80)`; rosto em fase `face = 0.3 +
   0.7·exp(−dh²·60)` com `dh = min(t, 1−t)`, olho `face·0.65`. Contínuo.
   Reduce-motion: early-return sem armar loop (glifo em repouso). Prop
   `tamanho` (default herdado do uso no backup, ~22). Wordmark oculto.
4. **C3RejeicaoAtenta.tsx** (NOVO). Consome `OuroborosGlifo`. Override de
   cor vermelho `colors.red` (#ff5555) só em cabeça e boca — manipular a
   propriedade de cor, **nunca reescrever o style/attr inteiro** (era o
   bug da versão anterior no HTML: cabeça/boca ficavam presas acesas).
   Sequência: reset (contas e rosto 0.08) → cabeça e boca acendem em
   vermelho (opacidade 1, 140ms); cauda e olho ficam em 0.08 → 6 pulsos
   alternando 1 ↔ 0.35 a 170ms → após 340ms, fade de cabeça e boca para
   0.08 em 600ms; cor volta ao roxo só 650ms depois (sem snap) →
   `onConcluir()`. Props: `onConcluir`, `tamanho`, `accessibilityLabel`
   (sem acento). Reduce-motion: **estado estático canônico = alerta
   congelado** (contas e rosto 0.08; cabeça e boca vermelhas, opacidade
   1) e `onConcluir()` imediato.
5. **Swap C1 nos saves.** Em `app/humor-rapido.tsx` e
   `app/diario-emocional.tsx`: trocar o import e o JSX
   `OuroborosFechamento` → `C1FechamentoDoCiclo`, preservando o wrapper
   `View accessibilityLabel="fechando o ciclo"` e o `onConcluir`
   existente (`() => router.back()` / `goBackOnce`). Não tocar em
   `handleSave`, no haptic nem no fluxo de reduce-motion do caller.
6. **Swap C2 no backup.** Em `SecaoBackupAutomatico.tsx`: trocar
   `<OuroborosLoading variant="sync" tamanho={22} />` por
   `<C2Digestao tamanho={22} />`, preservando o `View
   accessibilityLabel="fazendo backup"` e o texto `Fazendo backup…`.
7. **Montar C3 no scanner.** Em `ScannerPreview.tsx`: estado local
   `erroOcr` setado no `catch`; renderizar overlay absoluto com
   `C3RejeicaoAtenta` sobre o form; `onConcluir` limpa `erroOcr`. Manter
   o toast. O form permanece editável por baixo (o usuário pode preencher
   manualmente).
8. **Montar C3 no import.** Em `app/share-receive.tsx`: estado local
   `arquivoIlegivel` setado no `catch` de `executarSave`; overlay
   absoluto com `C3RejeicaoAtenta`; `onConcluir` limpa o estado (não
   chamar `router.dismissAll()` aqui — o usuário pode tentar de novo).
   Manter o toast. Confirmar via leitura que este é o hook de leitura/
   cópia do binário (falha de `gravarBinario`/`copyAsync`).
9. **Barrel + FEATURES.** Exportar os 3 conceitos em
   `conceitos/index.ts`; atualizar `FEATURES-CANONICAS.md` §1.2.
10. **Testes.** Unit (item Testes) + E2E (item Proof-of-work).

## Aritmética (metas numéricas)

Não há meta de contagem de linhas nesta sprint. Metas numéricas de
timing e frame:

- **C1 — tensão budget × cascata.** `mount_C1` usa stagger de 10ms ×
  43 contas = 420ms só de cascata, mais flash (260ms) e wordmark
  (finalTime+520 ≈ 940ms) — o demo roda em loop de 4200ms. O app pede
  **one-shot 350ms** (design doc §4; contrato herdado do
  `OuroborosFechamento` e da E2E de R-BRAND-2 que espera o overlay
  montado ~350ms e depois navegando). Decisão de implementação: **manter
  `onConcluir` em `duracaoMs` (default 350ms)** e **escalar o stagger ao
  budget** (`stagger ≈ duracaoMs / 43 ≈ 8ms`), preservando a identidade
  visual (cascata + flash + conta final + wordmark) comprimida ao tempo
  da interação. É a "diferença consciente" do design doc §4 (demos em
  loop; app em one-shot dentro do orçamento da interação). Registrar a
  decisão no comentário-cabeçalho do C1.
- **C3 — orçamento ~2.5s.** 140ms (acender) + 6 × 170ms (pulsos, 1020ms)
  + 340ms (espera) + 600ms (fade) = ~2100ms; a cor volta ao roxo +650ms
  após o início do fade, fechando em ~2150-2500ms. Bate com o "one-shot
  ~2.5s" do design doc §4.
- **C2 — 43 contas/frame.** Invariante de perf provado em
  `R-BRAND-3-GLIFO` (gate ≥45fps). Esta sprint não re-mede, mas o worklet
  único (não 43 re-renders) é obrigatório para manter o orçamento.

## Testes

Unitários (Jest, sem render de animação — asserts de contrato):

- `C1FechamentoDoCiclo.test.tsx`: com reduce-motion, `onConcluir`
  chamado imediato (mock); sem reduce-motion, `onConcluir` chamado após
  `duracaoMs` (timers falsos). Estado estático em reduce-motion.
- `C2Digestao.test.tsx`: com reduce-motion, nenhum loop armado
  (early-return); shape das shared values / worklet montado sem reduce.
- `C3RejeicaoAtenta.test.tsx`: com reduce-motion, estado congelado
  (cabeça e boca acesas em vermelho, resto 0.08) e `onConcluir`
  imediato; sem reduce, `onConcluir` após ~2.5s (timers falsos).

Regressão obrigatória: `tests/e2e/playwright/rbrand-loading.e2e.ts`
(R-BRAND-2) permanece verde — o swap de C1 mantém o
`aria-label="fechando o ciclo"`.

- Baseline: rodar `npx jest` antes para fixar `FAIL_BEFORE` (esperado 0
  — suíte verde; CLAUDE.md registra baseline ~1126 testes). Meta
  `FAIL_AFTER ≤ FAIL_BEFORE`. Novos testes entram verdes.

## Proof-of-work esperado

- Diff final das 3 criações + 6 modificações + FEATURES-CANONICAS.
- Runtime real (BRIEF §2 — contratos de runtime):
  - Smoke: `./scripts/smoke.sh` (Jest + anonimato + auditoria PT-BR).
  - Unit dos conceitos: `npx jest tests/components/brand/conceitos`.
  - Auditoria de strings UI: `python3 scripts/check_strings_ui_ptbr.py`.
- **E2E Gauntlet** `tests/e2e/playwright/rbrand-5-feedback.e2e.ts`,
  rodado via Playwright MCP no `/_dev/gauntlet`, com asserts de
  comportamento (não só presença):
  - C1: sem reduce, o overlay `[aria-label="fechando o ciclo"]` monta
    ~350ms e depois navega; com `emulateMedia reducedMotion: reduce`,
    navega imediato sem montar o overlay (mesmo mecanismo canônico da
    E2E de R-BRAND-2 — matchMedia, não setter `__gauntlet` inexistente).
  - C2: no fluxo de backup, o glifo da onda aparece durante a operação e
    some ao fim; com reduce-motion o glifo fica em repouso.
  - C3: forçar falha de OCR (scanner) e/ou arquivo ilegível (import) via
    Gauntlet, observar o overlay de rejeição montar e desmontar ao fim do
    one-shot; com reduce-motion, o overlay mostra o **estado estático
    canônico = alerta congelado** (cabeça e boca vermelhas, resto
    apagado) e limpa imediato.
- **Paridade visual:** screenshots do Gauntlet lado a lado com os demos
  C1/C2/C3 de `docs/design/ouroboros/conceitos-ouroboros.html` abertos no
  Chrome, salvos em `docs/sprints/R-BRAND-5-FEEDBACK-screenshots-gauntlet/`.
- **Estado estático canônico C3:** um PNG do C3 em reduce-motion
  (alerta congelado) + sha256 do arquivo.
- **Checkpoint Nível C curto (haptic do C1).** Gate de saída da sprint
  (design doc §5). Motivo declarado: confirmar no device que o haptic
  (`haptics.humor()`/`.vitoria()`/`.trigger()`, já no caller e não
  alterado) dispara em sincronia com a conclusão da cascata fiel do C1.
  Usuário aprova, sessão <2min, via dev-client + Metro USB (mudança é só
  JS — sem rebuild). Registrar observação no proof-of-work.
- **Acentuação periférica:** `python3 ~/.config/zsh/scripts/validar-acentuacao.py
  --paths <cada arquivo .md/.tsx modificado>` exit 0; comentários de
  código sem acento (convenção shell/CI), prosa com acentuação.
- **Hipótese verificada (lição 4):** `rg` confirmando os identificadores
  do glifo (`OuroborosGlifo`, `ordenarDaCabeca`, elementos do rosto) no
  código mergeado de `R-BRAND-3-GLIFO` **antes** de escrever os conceitos.

## Riscos e não-objetivos

- **Bloqueio duro em `R-BRAND-3-GLIFO`.** Se a sprint 0 não fechou, esta
  não começa. Não recriar o glifo aqui.
- **Órfãos após o swap.** `OuroborosFechamento` fica sem consumidores e
  a variant `sync` de `OuroborosLoading` também. **Não deletar** — a
  remoção e a limpeza do barrel são de `R-BRAND-9-MIGRACAO` (design doc
  §5 linha 6). Manter os testes existentes desses componentes verdes.
- **E2 (variant `inline`) fora de escopo.** As abas de mídia continuam
  no `OuroborosLoading variant="inline"`; a migração para o conceito E2
  é da sprint 0 / migração, não desta.
- **Perf de C2 (43 contas/frame)** já tem gate na sprint 0; se o device
  regredir abaixo de 45fps no backup, é achado colateral → sprint
  derivada (protocolo anti-débito), não fix improvisado aqui.
- **Ambiguidade do hook "arquivo ilegível".** Confirmar por leitura que
  o `catch` de `executarSave` (falha de `copyAsync`/leitura do binário)
  é o ponto correto; se surgir um fluxo de import distinto, registrar e
  escalar em vez de espalhar C3 por catches genéricos.

## Referências

- Design doc: [`docs/sprints/_ONDA-R-BRAND-SYSTEM.md`](_ONDA-R-BRAND-SYSTEM.md) §3, §4, §5, §6.
- Coreografias: [`docs/design/ouroboros/coreografias-extraidas.js`](../design/ouroboros/coreografias-extraidas.js) `mount_C1`/`mount_C2`/`mount_C3`.
- Precedente: `R-BRAND-2-ANIMACOES` (aproximações C1/C2 e E2E de reduce-motion `tests/e2e/playwright/rbrand-loading.e2e.ts`).
- BRIEF: [`VALIDATOR_BRIEF.md`](../../VALIDATOR_BRIEF.md) §1.9 (Gauntlet), §4 A22/A27, §2 (runtime).
- Regras: `CLAUDE.md` (Tom, Linguagem, Anonimato, Validação Visual Gauntlet).
