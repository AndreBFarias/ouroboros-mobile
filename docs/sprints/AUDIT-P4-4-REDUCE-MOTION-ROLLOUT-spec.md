# AUDIT-P4-4-REDUCE-MOTION-ROLLOUT — estender useReduceMotion aos primitivos de UI compartilhados

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (acessibilidade parcial — ADR-010 pede física e o
            público do app inclui pessoas sensíveis a movimento; mas o
            rollout já está em andamento e priorizado corretamente, não
            e negligência)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-4]/[UI-09] da auditoria de 2026-07-28. Recomputado
            nesta materialização com `grep -rl MotiView src/ app/` (45
            arquivos) e `grep -rl useReduceMotion src/ app/` (13
            arquivos) via `comm -23`, e verificado arquivo a arquivo
            quais dos 13 realmente usam o componente MotiView.
```

## Correções feitas na execução (2026-09-05)

Três números e uma classificação deste spec estavam errados quando a
sprint foi executada. Ficam registrados aqui porque o spec cobrava a
prova-de-trabalho contra eles.

1. **A lista era de 43, não 44.**
   `src/components/calendario/Timeline.tsx` foi deletado por
   `AUDIT-P2-10` (commit `b378905`, "remove tres orfaos confirmados").
   O diretório `src/components/calendario/` só tem `FiltrosBar.tsx`.

2. **`src/components/ui/Toast.tsx` era falso positivo do grep — e ainda
   assim tinha o defeito.** O único casamento de `MotiView` no arquivo
   é um comentário (`Toast.tsx:16`, "Substitui MotiView+AnimatePresence
   por"); a animação real usa `Animated.View` da Reanimated. Mas o
   buraco de acessibilidade era real e estava logo abaixo: `entering`
   e `exiting` sem nenhum guard de reduce-motion, num provider global
   (`app/_layout.tsx`). Com "Reduzir movimento" ligado, todo toast do
   app continuava deslizando. Corrigido nesta sprint com a técnica que
   a Reanimated pede (`entering`/`exiting` recebem `undefined`), não
   com `transicaoMovimento`. O critério do escopo item 1 é
   acessibilidade dos 12 primitivos, não a saída de um grep.

3. **A contagem final é 31, não 32.** Como Toast entrou de fato no
   escopo e passou a importar `useReduceMotion`, ele também sai do
   `comm -23`: 43 − 12 = 31. Nenhum arquivo de `src/components/ui/`
   permanece na lista.

4. **Dois mocks parciais de teste precisaram de uma linha cada.**
   `tests/components/ui/SeletorPara.test.tsx` (chega em `Chip` via
   `ChipGroup`) e `tests/components/midia/MidiaPicker.test.tsx` (chega
   em `Button`, `Chip` e `ToastProvider`) substituem
   `@/lib/stores/settings` por um estado falso que não tinha
   `featureToggles`. Sem acrescentá-lo, `useReduceMotion` estoura em
   `Cannot read properties of undefined (reading 'reduzirMovimento')` e
   derruba 18 testes. Estes dois arquivos entram no diff legítimo da
   sprint.

## Problema (rollout real é mais estreito do que a aproximação "~34 de 45")

`src/lib/hooks/useReduceMotion.ts` é um hook bem construído — combina
`AccessibilityInfo.isReduceMotionEnabled()` do sistema com o toggle de
Configurações via OR simples (o toggle só adiciona redução, nunca
desfaz o pedido do sistema; decisão travada do dono, documentada no
próprio arquivo, datada R-AUDIT-A11Y-MOVIMENTO 2026-07-13):

```ts
// src/lib/hooks/useReduceMotion.ts:52
return reduzirSistema || Boolean(reduzirToggle);
```

O achado original estimava "~34 de 45 arquivos com MotiView não
consultam o hook". Recomputando com o próprio comando pedido
(`grep -rl MotiView src/ app/` menos os que importam
`useReduceMotion`), o número real é **44 de 45** — não ~34. A causa da
diferença: dos 13 arquivos que importam `useReduceMotion`, só **1**
(`app/diario-emocional.tsx`) de fato usa o componente `MotiView`; os
outros 10 arquivos "cobertos" citados pelo achado original
(`OuroborosLoader.tsx`, `OuroborosLoading.tsx`,
`OuroborosFechamento.tsx`, `glifo/OuroborosGlifo.tsx`,
`conceitos/E1HeadOnly.tsx`, `conceitos/E2RingOnly.tsx`,
`recap/KenBurns.tsx`, `app/recap-memorias.tsx`, `app/humor-rapido.tsx`,
`app/settings/index.tsx`) implementam a animação com primitivos
`Animated`/`AnimatedG` do Reanimated diretamente (controle fino de
rotação/spring), não com o wrapper `MotiView` do pacote `moti`. São
tecnicas equivalentes e igualmente validas — mas isso significa que a
cobertura de reduce-motion e a população de usuários de `MotiView` são
dois conjuntos quase disjuntos, e não um subconjunto um do outro como o
cálculo aproximado presumia.

Isto **não é negligência**: os 11 arquivos cobertos (10 via Reanimated
+ 1 via MotiView) são exatamente as animações mais continuas e
intensas do app — loaders de marca, glifo animado, Ken Burns do
slideshow de Memórias — o tipo de movimento mais desconfortável para
quem tem sensibilidade vestibular. A priorização foi correta; só não
alcancou ainda os componentes de UI de uso cotidiano.

Cenário de falha concreto: uma pessoa com sensibilidade a movimento liga
"Reduzir movimento" (ou o sistema já tem essa preferência ativa) e abre
a tela `/todo`. Os loaders de marca respeitam a preferência, mas o
`Chip` de filtro, o `Toggle`, o `Card`, o botão de limpar busca em
`BarraBusca` e o item de tarefa em `ItemTarefa` continuam animando com
a física de mola completa (`springs.subtle`/`springs.default`) a cada
interação, porque nenhum deles chama `useReduceMotion()`. A pessoa
configurou a preferência corretamente e o app a ignora na maior parte
da superfície de uso diário.

### Lista original (44) — histórica, corrigida na execução para 43

Mantida como estava para não apagar o rastro do recálculo. Ler junto
com a correção 1 acima: `src/components/calendario/Timeline.tsx` já
não existe. A lista do que **de fato falta hoje** está mais abaixo, em
"Registro do que sobrou (31)".

```
app/eventos.tsx
app/onboarding.tsx
app/todo.tsx
src/components/alarmes/PreviewSomButton.tsx
src/components/alarmes/SeletorDias.tsx
src/components/calendario/Timeline.tsx
src/components/chrome/FABMenu.tsx
src/components/chrome/MenuCapturaVerde.tsx
src/components/chrome/MenuLateral.tsx
src/components/ciclo/CalendarioFases.tsx
src/components/contadores/CardContador.tsx
src/components/data/ConquistaCard.tsx
src/components/data/HeatmapBase.tsx
src/components/data/HumorHeatmap.tsx
src/components/diario/EmocaoChips.tsx
src/components/diario/MicrofoneButton.tsx
src/components/diario/TranscreverButton.tsx
src/components/diario/Waveform.tsx
src/components/eventos/QuandoBlock.tsx
src/components/exercicios/CardGaleria.tsx
src/components/exercicios/HistoricoSparkline.tsx
src/components/financas/CardTopCategorias.tsx
src/components/medidas/InputMedida.tsx
src/components/medidas/SliderFotos.tsx
src/components/screens/SaudeFisicaScreen.tsx
src/components/screens/ScannerPreview.tsx
src/components/settings/LinkSubTela.tsx
src/components/tarefas/CheckboxTarefaInline.tsx
src/components/todo/BarraBusca.tsx
src/components/todo/ItemTarefa.tsx
src/components/todo/SheetNovaTarefa.tsx
src/components/ui/AvatarPicker.tsx
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Chip.tsx
src/components/ui/FAB.tsx
src/components/ui/FABRadial.tsx
src/components/ui/Header.tsx
src/components/ui/Input.tsx
src/components/ui/PersonAvatar.tsx
src/components/ui/Textarea.tsx
src/components/ui/Toast.tsx
src/components/ui/Toggle.tsx
src/lib/boot/biometriaGate.tsx
```

(`src/lib/boot/biometriaGate.tsx` usa MotiView só no próprio gate de
carregamento — baixo risco, mas entra na lista por completude.)

### Registro do que sobrou (31) — entrega do item 2 do escopo

Recomputado depois da execução, com o mesmo comando. Nenhum arquivo de
`src/components/ui/` aparece aqui: os 12 primitivos estão cobertos.
Esta é a fila da sprint de continuação, que não precisa re-auditar do
zero.

```
app/eventos.tsx
app/onboarding.tsx
app/todo.tsx
src/components/alarmes/PreviewSomButton.tsx
src/components/alarmes/SeletorDias.tsx
src/components/chrome/FABMenu.tsx
src/components/chrome/MenuCapturaVerde.tsx
src/components/chrome/MenuLateral.tsx
src/components/ciclo/CalendarioFases.tsx
src/components/contadores/CardContador.tsx
src/components/data/ConquistaCard.tsx
src/components/data/HeatmapBase.tsx
src/components/data/HumorHeatmap.tsx
src/components/diario/EmocaoChips.tsx
src/components/diario/MicrofoneButton.tsx
src/components/diario/TranscreverButton.tsx
src/components/diario/Waveform.tsx
src/components/eventos/QuandoBlock.tsx
src/components/exercicios/CardGaleria.tsx
src/components/exercicios/HistoricoSparkline.tsx
src/components/financas/CardTopCategorias.tsx
src/components/medidas/InputMedida.tsx
src/components/medidas/SliderFotos.tsx
src/components/screens/SaudeFisicaScreen.tsx
src/components/screens/ScannerPreview.tsx
src/components/settings/LinkSubTela.tsx
src/components/tarefas/CheckboxTarefaInline.tsx
src/components/todo/BarraBusca.tsx
src/components/todo/ItemTarefa.tsx
src/components/todo/SheetNovaTarefa.tsx
src/lib/boot/biometriaGate.tsx
```

Aviso para quem pegar a continuação: esta lista sai de um `grep` por
`MotiView`, e um grep **não** é o critério de acessibilidade. Ela não
enxerga animação feita direto com Reanimated (`withTiming`,
`withSpring`, `entering`/`exiting`) — foi exatamente assim que o
defeito do `Toast` quase escapou. Varra também
`grep -rln "entering=\|exiting=\|withSpring\|withTiming" src app`.

### Como o rollout ficou implementado

`src/lib/a11y/transicaoMovimento.ts` (arquivo novo) expõe a constante
`SEM_MOVIMENTO` (`{ type: 'timing', duration: 0 }`) e a função pura
`transicaoMovimento(reduzir, preset)`. Nasce fora de `src/lib/motion.ts`
de propósito: motion.ts guarda os presets canônicos do ADR-010 e é
não-objetivo declarado; ausência de física não é um preset de física.

Cada primitivo chama `useReduceMotion()` **literalmente** no corpo do
componente — sem hook-wrapper intermediário — e passa
`transition={transicaoMovimento(reduzirMovimento, springs.X)}`. Quando
a redução está desligada a função devolve o próprio preset **por
referência**, o que garante paridade exata com o comportamento anterior
(não-objetivo 3). É isso que `tests/lib/a11y/transicaoMovimento.test.ts`
trava, com `toBe` e não `toEqual`.

## Escopo (mínimo)

1. Cobrir primeiro os 12 primitivos de design system compartilhados —
   maior alavancagem por serem reusados em quase toda tela:
   `src/components/ui/{AvatarPicker,Button,Card,Chip,FAB,FABRadial,
   Header,Input,PersonAvatar,Textarea,Toast,Toggle}.tsx`. Em cada um,
   chamar `useReduceMotion()` e trocar a prop `transition` do
   `MotiView` para `{ type: 'timing', duration: 0 }` quando `true`,
   mantendo `springs.*` quando `false` — replicando o padrão já usado
   em `recap-memorias.tsx` (`!reduzirMovimento` antes de disparar
   `withTiming`).
2. Documentar a lista completa dos 44 arquivos (acima) como registro
   rastreável do que falta além do item 1, para a próxima sprint de
   continuação não precisar re-auditar do zero.
3. Caso E2E: `tests/e2e/playwright/audit-p4-4-reduce-motion-rollout.e2e.ts`,
   modelado no padrão já usado por
   `tests/e2e/playwright/r-audit-a11y-movimento.e2e.ts` (`page.emulateMedia`).
   Abrir `/settings` via `__gauntlet.abrir`, acionar um `Toggle` com
   `reducedMotion: 'reduce'` emulado e confirmar que a cor final já
   está aplicada no primeiro frame após o toque (sem estado
   intermediário de spring observável); repetir com
   `reducedMotion: 'no-preference'` como controle e confirmar que o
   estado intermediário volta a existir (sem regressão da física
   default).
4. NÃO-objetivo: não cobrir nesta sprint os 32 arquivos fora de
   `src/components/ui/` (chrome/, todo/, diario/, data/, alarmes/,
   medidas/, exercicios/, financas/, eventos/, tarefas/, ciclo/,
   calendario/, contadores/, screens/, boot/, e as 3 rotas
   `app/eventos.tsx`, `app/onboarding.tsx`, `app/todo.tsx`) — ficam
   listados para sprint de continuação com ID próprio; não alterar
   `src/lib/motion.ts` nem os presets de spring; não mudar o
   comportamento visual quando reduzir-movimento está desligado
   (paridade obrigatória com o estado atual).

## Proof-of-work

```bash
# lista real recomputada: encolhe de 43 para 31 (12 corrigidos).
# 43, nao 44 -> Timeline.tsx foi deletado em b378905 (correcao 1).
# 31, nao 32 -> Toast.tsx tambem entrou no escopo (correcao 3).
comm -23 <(grep -rl MotiView src app | sort) <(grep -rl useReduceMotion src app | sort) | wc -l   # 31

# nenhum primitivo de ui pode sobrar na lista
comm -23 <(grep -rl MotiView src app | sort) <(grep -rl useReduceMotion src app | sort) | grep components/ui   # vazio

npx tsc --noEmit                                                     # exit 0
npx jest tests/lib/a11y tests/components/ui tests/components/midia    # verdes
npx --no-install eslint app/ src/                                     # exit 0 (P3-2: reprova de verdade)
./gauntlet.sh                                                         # abrir /settings
# rodar o caso via automacao de browser (playwright), coletar screenshots em
# docs/sprints/AUDIT-P4-4-REDUCE-MOTION-ROLLOUT-screenshots-gauntlet/
./scripts/smoke.sh                                                    # verde
```

Inspeção do diff: 12 fontes em `src/components/ui/` + 2 arquivos novos
(`src/lib/a11y/transicaoMovimento.ts`,
`tests/lib/a11y/transicaoMovimento.test.ts`) + o caso E2E + 2 mocks de
teste (correção 4) + este spec. `git diff --stat src/lib/motion.ts` tem
de sair vazio.

## Commit

```
fix: audit-p4-4-reduce-motion-rollout propaga useReduceMotion aos primitivos de ui compartilhados
```
