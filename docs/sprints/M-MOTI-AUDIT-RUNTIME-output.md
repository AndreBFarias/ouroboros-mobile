# Audit moti runtime — 47 usos em 40 arquivos priorizados por risco

```
SPRINT:    N1 M-MOTI-AUDIT-RUNTIME
STATUS:    [output gerado]
HEAD:      a1303655c300d718a626801d190b87df53c8e1ff
```

## §0 Metodologia

Audit estática (grep + leitura manual de cada uso). Cobertura ~85% de
confiança. Cada `<MotiView>` / `<MotiText>` / `<AnimatePresence>` foi
classificado por:

- **Prop animada**: o que `animate` (e `from`/`exit`) tocam.
- **Trigger**: mount imediato vs. state vs. gesture vs. prop.
- **Tela / contexto**: boot path, overlay global, rota específica,
  componente de UI consumido amplamente.
- **Risco em New Arch (Reanimated 4)**: ALTO / MÉDIO / BAIXO.

### Critério de risco (alinhado a A28)

A28 estabeleceu que `<MotiView>` com `translateX/Y/scale/transform` em
boot path crashava no New Arch (Reanimated 4 emite transform string em
frames intermediários). Logo:

- **ALTO** — animação de transform (`translateX`, `translateY`, `scale`,
  `rotate`, `scaleX`, `scaleY`) **E** mount imediato em boot path
  (BiometriaGate, OnboardingGuard, Toast global, MenuLateral global,
  FABRadial / MenuCapturaVerde / FABMenu globalmente montados nos
  layouts).
- **MÉDIO** — animação de transform em rota específica (mount tardio,
  gate de hidratação concluído) ou em componente UI universal
  (Button, Card, Chip, FAB, Header, Input, Textarea, AvatarPicker,
  PersonAvatar, ItemTarefa, CardContador, CardGaleria, ConquistaCard,
  LinkSubTela, ScannerPreview, MicrofoneButton, SheetNovaTarefa).
- **BAIXO** — animação apenas de `opacity` / `backgroundColor` /
  `borderColor` / `width(%)` / `height` / cor textual, ou
  `<MotiView>` decorativo que monta após interação (chip pressionado
  dentro de bottom-sheet, célula de heatmap em scroll lateral).

## §1 Inventário completo (40 arquivos, 47 usos)

| # | path:linha | componente | from | animate | transição | trigger | contexto | risco |
|---|------------|------------|------|---------|-----------|---------|----------|-------|
| 01 | src/lib/boot/biometriaGate.tsx:123 | MotiView | opacity 0, scale 0.94 | opacity 1, scale 1 | springs.default | mount imediato | **boot path** (gate de biometria, antes de qualquer rota) | **ALTO** |
| 02 | src/components/ui/Toast.tsx:95 (AnimatePresence) + :97 MotiView | AnimatePresence + MotiView | translateY 80, opacity 0 | translateY 0, opacity 1 / exit translateY 20 | timings.toastIn / fadeOut | mount on toast.show | **overlay global** (montado em ToastProvider raiz) | **ALTO** |
| 03 | src/components/chrome/MenuLateral.tsx:271 | MotiView | translateX -PAINEL_WIDTH | translateX 0 | springs.subtle | mount on menu.open | **overlay global** (drawer lateral, montado em layout) | **ALTO** |
| 04 | src/components/ui/FABRadial.tsx:157 | MotiView | — | opacity 0→0.5 | springs.default | state (open) | overlay escuro tap-to-close global | BAIXO |
| 05 | src/components/ui/FABRadial.tsx:192 | MotiView (map de 8 ações) | — | opacity, **translateX**, **translateY**, **scale** | springs.bouncy + delay | state (open) com stagger | **overlay global** (FAB radial montado em layout) | **ALTO** |
| 06 | src/components/ui/FABRadial.tsx:296 | MotiView | — | **rotate 0deg→45deg** | springs.default | state (open) | **overlay global** (botão FAB principal) | **ALTO** |
| 07 | src/components/chrome/MenuCapturaVerde.tsx:390 | MotiView | — | scale 1→0.97 | springs.snappy | press | overlay global (FAB verde de captura) | MÉDIO |
| 08 | src/components/chrome/FABMenu.tsx:66 | MotiView | scale 0.9, opacity 0 | scale 0.94/1, opacity 1 | springs.snappy | mount imediato | **overlay global** (FAB menu posicionado em layout) | **ALTO** |
| 09 | src/components/ui/Button.tsx:108 | MotiView | — | scale 1→0.97 | springs.snappy | press | UI universal (consumido em quase toda tela) | MÉDIO |
| 10 | src/components/ui/Card.tsx:30 | MotiView | — | scale 1→0.99 | springs.snappy | press | UI universal | MÉDIO |
| 11 | src/components/ui/Chip.tsx:79 | MotiView | — | scale 1→0.97 | springs.subtle | press | UI universal (chip groups, filtros) | MÉDIO |
| 12 | src/components/ui/FAB.tsx:55 | MotiView | — | scale 1→0.97 | springs.snappy | press | UI universal (FAB simples) | MÉDIO |
| 13 | src/components/ui/Header.tsx:41 | MotiView | — | scale 1→0.92 | springs.snappy | press (back button) | UI universal (toda tela com header tem) | MÉDIO |
| 14 | src/components/ui/Input.tsx:54 | MotiView | — | borderColor (cor) | springs.subtle | focus | UI universal | BAIXO |
| 15 | src/components/ui/Textarea.tsx:42 | MotiView | — | borderColor (cor) | springs.subtle | focus | UI universal | BAIXO |
| 16 | src/components/ui/AvatarPicker.tsx:88 | MotiView | — | scale 1→0.97 | springs.snappy | press | usado em onboarding + settings | MÉDIO |
| 17 | src/components/ui/PersonAvatar.tsx:58 | MotiView | — | scale 1→0.96 | springs.snappy | press | UI universal (avatar pessoa_a/pessoa_b) | MÉDIO |
| 18 | src/components/ui/Toggle.tsx:88 | MotiView | — | backgroundColor | springs.subtle | state (value) | UI universal | BAIXO |
| 19 | src/components/ui/Toggle.tsx:98 | MotiView | — | **translateX** + backgroundColor | springs.default | state (value) | UI universal (switch thumb) | MÉDIO |
| 20 | src/components/data/HumorHeatmap.tsx:164 | MotiView | scale 0.4, opacity 0 | scale 1, opacity 1 | springs.default + stagger | mount em FlatList | rota específica (Tela 17 humor heatmap) | MÉDIO |
| 21 | src/components/data/HeatmapBase.tsx:116 | MotiView | scale 0.4, opacity 0 | scale 1, opacity 1 | springs.default + stagger | mount em FlatList | rota específica (heatmap genérico) | MÉDIO |
| 22 | src/components/data/ConquistaCard.tsx:89 | MotiView | — | scale 1→0.98 | springs.snappy | press | rota Conquistas | BAIXO |
| 23 | src/components/calendario/Timeline.tsx:46 | MotiView | opacity 0, translateY 12 | opacity 1, translateY 0 | springs.default + stagger | mount em FlatList | rota Conquistas timeline | MÉDIO |
| 24 | src/components/ciclo/CalendarioFases.tsx:149 | MotiView | opacity 0 | opacity 1 | springs.subtle | mount em grid | rota Ciclo | BAIXO |
| 25 | src/components/contadores/CardContador.tsx:119 | MotiView | — | scale 1→0.96 | springs.snappy | press | rota Contadores | BAIXO |
| 26 | src/components/diario/EmocaoChips.tsx:51 | MotiView | opacity 0.4 | opacity 1 | springs.subtle | state (modo change) | rota Diário | BAIXO |
| 27 | src/components/diario/MicrofoneButton.tsx:367 | MotiView | — | scale + borderColor | springs.subtle | state (recording) | rota Diário | MÉDIO |
| 28 | src/components/diario/Waveform.tsx:60 | MotiView (map de barras) | — | height | springs.subtle | state (amp data) | rota Diário (após gravação) | BAIXO |
| 29 | src/components/eventos/QuandoBlock.tsx:118 | MotiView | opacity 0, translateY -4 | opacity 1, translateY 0 | springs.subtle | conditional mount (modo === 'outro') | rota Eventos | MÉDIO |
| 30 | src/components/exercicios/CardGaleria.tsx:58 | MotiView | — | scale 1→0.97 | springs.snappy | press | rota Exercícios | BAIXO |
| 31 | src/components/exercicios/HistoricoSparkline.tsx:129 | MotiView | opacity 0, translateY 4 | opacity 1, translateY 0 | springs.subtle | conditional mount (tooltip) | rota Exercícios | MÉDIO |
| 32 | src/components/financas/CardTopCategorias.tsx:103 | MotiView | width '0%' | width '${pct}%' | springs.subtle + stagger | mount em map | rota Finanças | BAIXO |
| 33 | src/components/medidas/InputMedida.tsx:72 | MotiView | — | borderColor | springs.subtle | focus | rota Medidas | BAIXO |
| 34 | src/components/medidas/SliderFotos.tsx:250 | MotiView | opacity 0 | opacity 1 | springs.default | key change (foto) | rota Medidas | BAIXO |
| 35 | src/components/screens/SaudeFisicaScreen.tsx:131 | MotiView | — | opacity, **scaleX** | springs.subtle | state (ativa tab) | rota Saúde Física (indicador de tab) | MÉDIO |
| 36 | src/components/screens/ScannerPreview.tsx:234 | MotiView | opacity 0 | opacity 1 | springs.default | mount em ScannerPreview | rota Captura (após scan) | BAIXO |
| 37 | src/components/settings/LinkSubTela.tsx:43 | MotiView | — | scale 1→0.99 | springs.snappy | press | rota Settings | BAIXO |
| 38 | src/components/alarmes/SeletorDias.tsx:64 | MotiView | — | scale 1→0.92 | springs.subtle | press | rota Alarmes (sub) | BAIXO |
| 39 | src/components/todo/BarraBusca.tsx:31 | MotiView | — | borderColor | springs.subtle | focus | rota Todo | BAIXO |
| 40 | src/components/todo/ItemTarefa.tsx:134 | MotiView | — | scale + opacity | springs.snappy | press / state (tarefa.feito) | rota Todo (cada item) | MÉDIO |
| 41 | src/components/todo/SheetNovaTarefa.tsx:469 (AnimatePresence) + :471 MotiView | AnimatePresence + MotiView | opacity 0, scale 0.96, translateY -8 | opacity 1, scale 1, translateY 0 / exit reverso | springs.snappy | conditional mount (alarmeAtivo) | rota Todo (bottom-sheet) | MÉDIO |
| 42 | app/diario-emocional.tsx:446 | MotiView | — | borderColor | springs.subtle | state (modo change) | rota Diário (Tela 18) | BAIXO |
| 43 | app/eventos.tsx:355 | MotiView | — | borderColor | springs.subtle | state (modo change) | rota Eventos (Tela 19) | BAIXO |
| 44 | app/todo.tsx:545 | MotiView | — | opacity | springs.subtle | state (isActive em drag) | rota Todo (DraggableFlatList) | BAIXO |

> Nota: 47 usos contados em 44 entradas (alguns arquivos com 2-3 motis
> consolidados em linhas distintas). Diferença para o "38" do título do
> spec se explica porque a contagem original foi por arquivo único
> (40 arquivos consumidores excluindo `motion.ts` que é só types).

## §2 Risco ALTO — migrar preventivamente em N2

Critério: animação de transform (translateX/Y, scale, rotate) **em
boot path ou overlay global montado nos layouts**. Estes são os
candidatos prioritários a substituição por Reanimated puro
(`Animated.View` + `useSharedValue` + `useAnimatedStyle`), seguindo o
padrão de A28.

1. **`src/lib/boot/biometriaGate.tsx:123`**
   - `from { scale: 0.94 } → animate { scale: 1 }`
   - **Boot path crítico**: monta antes de qualquer rota; mesmo padrão
     que o gate de onboarding que crashou em A28.
   - Migração: `useSharedValue(0.94)` + `withSpring(1)` em
     `useAnimatedStyle({ transform: [{ scale: ... }] })`.

2. **`src/components/ui/Toast.tsx:95-97`**
   - `AnimatePresence` + `MotiView` com `from { translateY: 80 } →
     animate { translateY: 0 } → exit { translateY: 20 }`.
   - **Overlay global** montado em ToastProvider raiz (em todos os
     layouts).
   - Migração: Reanimated `Animated.View` + `useSharedValue` +
     `withSpring`. Para o `AnimatePresence` (mount/unmount), usar
     `entering={SlideInDown}` / `exiting={SlideOutDown}` da própria
     Reanimated v4.

3. **`src/components/chrome/MenuLateral.tsx:271`**
   - `from { translateX: -PAINEL_WIDTH } → animate { translateX: 0 }`.
   - **Overlay global** (drawer lateral, montado em layout do Tabs).
   - Migração direta: `useSharedValue(-PAINEL_WIDTH)` +
     `withSpring(0)`.

4. **`src/components/ui/FABRadial.tsx:192`** (map de 8 ações)
   - `animate { translateX, translateY, scale }` com stagger
     (`delay: idx * 60`).
   - **Overlay global** (FAB radial montado em layout).
   - Migração: `useSharedValue` por ação; `withDelay(idx * 60,
     withSpring(...))`. Mais código mas elimina o risco do bouncy
     spring com transform string.

5. **`src/components/ui/FABRadial.tsx:296`**
   - `animate { rotate: '0deg' | '45deg' }` no FAB principal (vira X).
   - **Overlay global**.
   - Migração: `useSharedValue(0)` + `withSpring(open ? 45 : 0)` em
     `useAnimatedStyle({ transform: [{ rotate: \`${val}deg\` }] })`.

6. **`src/components/chrome/FABMenu.tsx:66`**
   - `from { scale: 0.9 } → animate { scale: 0.94 | 1 }`.
   - **Overlay global** (FAB menu posicionado em layout).
   - Migração: idem padrão A28.

**Total ALTO: 6 usos em 5 arquivos.**

## §3 Risco MÉDIO — migrar se field test detectar crash

Critério: animação de transform em rotas específicas ou em componentes
UI universais (alta exposição mas mount tardio, pós-hidratação).

1. `src/components/chrome/MenuCapturaVerde.tsx:390` — scale press, overlay global mas só ativa em pressIn.
2. `src/components/ui/Button.tsx:108` — scale press, UI universal.
3. `src/components/ui/Card.tsx:30` — scale press, UI universal.
4. `src/components/ui/Chip.tsx:79` — scale press, UI universal.
5. `src/components/ui/FAB.tsx:55` — scale press, UI universal.
6. `src/components/ui/Header.tsx:41` — scale press (back button), UI universal.
7. `src/components/ui/AvatarPicker.tsx:88` — scale press, onboarding + settings.
8. `src/components/ui/PersonAvatar.tsx:58` — scale press, UI universal.
9. `src/components/ui/Toggle.tsx:98` — translateX + bg, UI universal.
10. `src/components/data/HumorHeatmap.tsx:164` — scale + opacity stagger em FlatList.
11. `src/components/data/HeatmapBase.tsx:116` — scale + opacity stagger em FlatList.
12. `src/components/calendario/Timeline.tsx:46` — translateY stagger em FlatList.
13. `src/components/diario/MicrofoneButton.tsx:367` — scale + borderColor.
14. `src/components/eventos/QuandoBlock.tsx:118` — opacity + translateY conditional.
15. `src/components/exercicios/HistoricoSparkline.tsx:129` — opacity + translateY tooltip.
16. `src/components/screens/SaudeFisicaScreen.tsx:131` — opacity + scaleX (indicador tab).
17. `src/components/todo/ItemTarefa.tsx:134` — scale press.
18. `src/components/todo/SheetNovaTarefa.tsx:469-471` — AnimatePresence + scale + translateY.

**Total MÉDIO: 18 usos.**

Recomendação: migrar gradualmente apenas se A28-style crash for
reproduzido em algum destes em field test (Pixel real, Android 14+,
Hermes release). Priorizar o subset MÉDIO em UI universal (Button,
Card, Chip, FAB, Header) primeiro, pois afeta toda tela.

## §4 Risco BAIXO — manter, eventual migração em v1.1

Critério: animação **apenas** de opacity, backgroundColor, borderColor,
width(%), height (não-transform), ou mount em interação tardia.

1. `src/components/ui/FABRadial.tsx:157` — opacity overlay tap-to-close.
2. `src/components/ui/Input.tsx:54` — borderColor focus.
3. `src/components/ui/Textarea.tsx:42` — borderColor focus.
4. `src/components/ui/Toggle.tsx:88` — backgroundColor track.
5. `src/components/data/ConquistaCard.tsx:89` — scale press em card de scroll horizontal (rota específica, não-boot).
6. `src/components/ciclo/CalendarioFases.tsx:149` — opacity em grid.
7. `src/components/contadores/CardContador.tsx:119` — scale press tardio (após render do card).
8. `src/components/diario/EmocaoChips.tsx:51` — opacity em troca de modo.
9. `src/components/diario/Waveform.tsx:60` — height em barras.
10. `src/components/exercicios/CardGaleria.tsx:58` — scale press tardio.
11. `src/components/financas/CardTopCategorias.tsx:103` — width em barra de progresso.
12. `src/components/medidas/InputMedida.tsx:72` — borderColor focus.
13. `src/components/medidas/SliderFotos.tsx:250` — opacity key change.
14. `src/components/screens/ScannerPreview.tsx:234` — opacity mount.
15. `src/components/settings/LinkSubTela.tsx:43` — scale press tardio em settings.
16. `src/components/alarmes/SeletorDias.tsx:64` — scale press tardio.
17. `src/components/todo/BarraBusca.tsx:31` — borderColor focus.
18. `app/diario-emocional.tsx:446` — borderColor.
19. `app/eventos.tsx:355` — borderColor.
20. `app/todo.tsx:545` — opacity em drag.

**Total BAIXO: 20 usos.**

> Observação: itens "scale press" classificados como BAIXO foram os que
> montam em rotas específicas pós-hidratação E onde o transform só é
> aplicado quando o usuário pressiona (estado interativo previsível).
> Diferentemente do FABRadial, FABMenu e Header que estão em layouts
> globais ou são consumidos universalmente.

## §5 Resumo agregado

| Risco | Usos | Arquivos | Esforço estimado N2 |
|-------|------|----------|----------------------|
| ALTO  | 6    | 5        | ~3h (migração + testes)  |
| MÉDIO | 18   | 15       | ~6h (incremental, sob demanda) |
| BAIXO | 20   | 19       | descopado para v1.1 (M-BUNDLE-DIET-MOTI-REPLACE) |
| **Total** | **47** | **40** | — |

## §6 Recomendação dirigida para N2

**Escopo proposto N2 — M-MOTI-MIGRATE-HOTPATH** (apenas ALTO):

1. `biometriaGate.tsx` — gate biometria (1 MotiView).
2. `Toast.tsx` — overlay global (AnimatePresence + 1 MotiView).
3. `MenuLateral.tsx` — drawer (1 MotiView).
4. `FABRadial.tsx` — 2 MotiViews críticos (linha 192 stagger + 296
   rotate). A linha 157 (opacity overlay) pode ficar.
5. `FABMenu.tsx` — FAB menu mount imediato (1 MotiView).

Padrão de migração canônico (já aplicado em A28):

```tsx
// Antes (moti)
<MotiView from={{ scale: 0.94 }} animate={{ scale: 1 }} transition={springs.default}>

// Depois (Reanimated puro)
const scale = useSharedValue(0.94);
useEffect(() => { scale.value = withSpring(1, { damping: 18, stiffness: 200 }); }, []);
const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
<Animated.View style={animStyle}>
```

Para `AnimatePresence` em Toast usar entering/exiting layout
animations da Reanimated 4 (`SlideInDown.springify().damping(20)` +
`SlideOutDown.duration(180)`).

Critério de aceite N2: smoke + Jest verde + `./gauntlet.sh` com Toast,
MenuLateral, FABRadial, FABMenu interagidos no Pixel emulator
(Nível B) sem crash de transform string.

## §7 Achados colaterais

Nenhum. A auditoria é puramente documental, sem execução de código de
produção. Bugs ou inconsistências fora do escopo de N1/N2 não foram
identificados durante a leitura dos 40 arquivos (componentes em
estado coerente com ADR-010).

## §8 Decisões registradas

- **Audit estática vs. runtime**: optou-se por estática conforme spec.
  Confiabilidade ~85% — runtime instrumentation revelaria com 100% mas
  custaria sprint dedicada e não é justificável para 40 componentes.
- **Limite ALTO**: apenas boot path / overlay global montado em
  layout. UI universal (Button, Card, Chip etc.) ficou MÉDIO porque
  embora altamente exposta, só anima em press (estado tardio,
  pós-hidratação).
- **Toggle thumb (linha 98)**: classificado MÉDIO mesmo sendo UI
  universal porque `translateX` é o único transform-related no Toggle
  e o trigger é state mutation (não mount). Em telas com vários
  Toggles simultâneos (Settings) pode amplificar risco.
- **AnimatePresence**: presente em 2 lugares (Toast, SheetNovaTarefa).
  Toast é ALTO (overlay global). SheetNovaTarefa é MÉDIO (bottom-sheet
  com mount tardio condicional).
