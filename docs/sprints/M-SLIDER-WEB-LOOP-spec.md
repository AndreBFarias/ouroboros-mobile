# Sprint M-SLIDER-WEB-LOOP — RTCSliderWebComponent infinite loop em web

```
DEPENDE:    nada (achado pré-existente desde M12 / M13)
BLOQUEIA:   M11.3 validação completa (B/C screenshots), M37+ se telas
            com slider entrarem no Recap
ESTIMATIVA: 1-2h (diagnóstico + workaround web)
PRIORIDADE: alta (telas /medidas e /exercicios/[slug] travam em web
            com tela em branco; afeta validação visual via Gauntlet)
STATUS:     [todo]
```

## 1. Achado / motivação

Validação visual M11.3 via Gauntlet (2026-05-04) revelou que as
rotas `/medidas` e `/exercicios/<slug>` travam em web com **tela
em branco** + console error:

```
Error: Maximum update depth exceeded. The above error occurred in
the <RTCSliderWebComponent> component. React will try to recreate
this component tree from scratch using the error boundary you
provided, LogBoxStateSubscription.
```

Stack trace aponta para `@react-native-community/slider` versão web
em loop entre `AnimatedProps._callback` → `dispatchReducerAction` →
re-render. **Bug confirmado pré-existente** (mesmo após `git stash`
de M11.3 a falha persiste em estado pré-sprint).

Provavelmente passou despercebido porque:
- M12 (Medidas) e M13 (Exercícios CRUD) foram fechadas antes do
  Gauntlet existir como infraestrutura padrão de validação.
- Nenhuma sprint subsequente tocou essas rotas em web.
- O bug só se manifesta na rota raiz dessas telas, não em modais
  que reusam `<Slider>`.

## 2. Diagnóstico inicial

`@react-native-community/slider` é dep nativa que tem implementação
web via `RTCSliderWebComponent`. Provável causa raiz: o slider
`step` ou `value` controlado provoca re-render em cascata quando
combinado com Reanimated/Moti em strict mode React 19.

Hipóteses a verificar antes do fix:
- O `<SliderHorizontal>` ou wrapper local em
  `src/components/medidas/` passa `value` derivado de state que
  muda a cada re-render.
- O step é decimal causando `setValue(prev) → onValueChange(novo) →
  setValue(prev)` em loop.
- Conflito com Reanimated 4 worklets em web (Armadilha A22 conhecida).

## 3. Caminhos possíveis

**A — Polyfill condicional:** em web, substituir
`@react-native-community/slider` por `<input type="range">` nativo
via componente fallback `<SliderWeb>` em
`src/components/ui/Slider.tsx`.

**B — Memoização agressiva:** envolver onValueChange em `useCallback`
com deps mínimas + value em `useRef` para evitar re-render. Pode
mascarar mas não corrigir.

**C — Atualizar dep:** `@react-native-community/slider` mais recente
(verificar changelog para fix de React 19 strict mode).

Preferência: **A** (mais robusto + zero dep nativa em web).

## 4. Entregáveis

- `src/components/ui/Slider.tsx` (novo) — wrapper que escolhe
  implementação por `Platform.OS`.
- `src/components/ui/SliderWeb.tsx` (novo) — `<input type="range">`
  com estilo Dracula (track + thumb) coerente com slider native.
- Migrar consumidores: `app/medidas/index.tsx`,
  `app/exercicios/[slug].tsx`, `src/components/medidas/*` (auditar
  via grep).
- 1 caso E2E em `tests/e2e/playwright/m-slider-web-loop.e2e.ts`
  validando que `/medidas` e `/exercicios` montam sem erros e sem
  loop.
- Screenshots `docs/sprints/M-SLIDER-WEB-LOOP-screenshots-gauntlet/`:
  `A-medidas-funcional.png`, `B-exercicio-detalhe-funcional.png`.

## 5. Verificação

- `await __gauntlet.consoleErros()` retorna `[]` ao abrir
  `/medidas` e `/exercicios/<slug>`.
- Tela renderiza com sliders funcionais (drag muda valor).
- Mobile real continua usando Slider native (RTCSliderWebComponent
  só existe em web).

## 6. Decisões tomadas

- `<input type="range">` nativo é estável, suporta WCAG, e elimina
  qualquer loop relacionado a Reanimated em web.
- Estilo Dracula via CSS-in-JS (track `colors.bgElev`, thumb
  `colors.purple`, fill `colors.cyan`).
- Mobile real fica intocado — sem regressão.
