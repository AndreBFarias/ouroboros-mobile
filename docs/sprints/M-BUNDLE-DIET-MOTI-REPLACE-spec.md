# Sprint M-BUNDLE-DIET-MOTI-REPLACE — Substituir Moti por Reanimated puro

```
DEPENDE:    C1 fechada (auditoria bundle); decisão durável dono
            (2026-05-05): incluir em v1.0
BLOQUEIA:   nada (ganho de margem)
ESTIMATIVA: 4-6h (refactor amplo de animações)
PRIORIDADE: média (ganho potencial 333 KB; v1.0)
STATUS:     [todo]
```

## 1. Achado / motivação

C1 (M-BUNDLE-DIET) auditou bundle e identificou
`framer-motion` (333 KB) como dep transitiva via Moti — a maior
gordura removível restante. Decisão original de C1: NÃO mexer
agora, manter margem. Decisão durável do dono em 2026-05-05:
**incluir em v1.0** (sub-sprint dedicada).

## 2. Tarefa

Substituir Moti por Reanimated 4 puro nos componentes que usam
`<MotiView>`, `<AnimatePresence>`, e similares. Mantém
comportamento visual (springs canônicos `springs.snappy`,
`springs.default`, etc) usando `useAnimatedStyle` +
`withSpring` direto.

### Inventário (estimado, auditar via grep)

```bash
grep -rn "from 'moti'\|MotiView\|AnimatePresence" src/ app/ \
  | wc -l
```

Provável superfície:
- `MenuLateral.tsx` — drawer animation
- `MenuCapturaVerde.tsx` — FAB scale
- `BottomSheet.tsx` (wrapper) — backdrop fade
- 4 sheets root (`humor-rapido`, `eventos`, `diario-emocional`,
  `scanner`) — opener
- `OuroborosLoader.tsx` — rotation (já usa Reanimated direto)
- `Toast.tsx` — slide
- `SheetNovaTarefa.tsx` — toggle alarme expand (M-DEBITO-UI-UX-SEED-DUO)
- `Chip.tsx` — press scale
- Alguns avatars/cards com micro-interactions

## 3. Estratégia (incremental)

1. Auditar lista exaustiva via grep.
2. Para cada arquivo, substituir Moti por Reanimated:
   - `<MotiView animate={{ opacity }} transition={spring}>` →
     `<Animated.View style={[base, animatedStyle]}>` +
     `useSharedValue` + `withSpring`.
   - `<AnimatePresence>` → `useEffect` + `runOnJS` para mount/unmount.
3. Cada arquivo migrado fecha em commit próprio (incremental).
4. Após todos migrados, **remover dep `moti`** do package.json e
   roda `npm install` + verifica bundle.

## 4. Restrições

- **Anonimato Regra −1**.
- **Sentence case + acentuação PT-BR** preservada.
- TS strict 0.
- Smoke verde após cada commit.
- Bundle Hermes deve **reduzir** após dep removida (esperado
  ~300 KB).
- Animações visualmente idênticas (springs `springs.snappy`,
  `springs.default` mantidos).

## 5. Verificação por commit

- E2E existentes não regridem (especialmente
  `m-sheet-modal-snap.e2e.ts`, `m34-3-fab-unificado.e2e.ts`,
  `m11-1-*`).
- Visual no Gauntlet sem flicker.
- Smoke + leak check verde.

## 6. E2E novo

- `tests/e2e/playwright/m-bundle-diet-moti-replace.e2e.ts` —
  navegar 5 telas com micro-interações, verificar 0 erros de
  console e que animações disparam (via `requestAnimationFrame`
  count).

## 7. Decisões tomadas

- **Não substituir Reanimated** — base do projeto.
- **Não criar wrapper genérico para "MotiView equivalente"** —
  cada caso é diferente; abstração prematura.
- **AnimatePresence → manual** — RN não tem equivalente direto;
  cada caso usa `useEffect + setVisible(false)` com delay.
- **Removida dep moti**: package.json + tests/setup atualizam.
