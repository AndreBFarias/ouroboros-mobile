# R-BUNDLE-DIET-CALENDARS-REPLACE — Substituir react-native-calendars por calendário custom

**Tipo**: refactor (bundle diet)
**Prioridade**: P3-low
**Estimativa**: 3-5d (refactor grande — atrasa o release; dono optou por incluir)

> **AVISO:** sprint grande e arriscada. Era descopada para v1.1 (R-BUNDLE-SIZE-AUDIT
> achado #3: react-native-calendars + transitivas lodash/moment/recyclerlistview ≈ 1 MB).
> Dono optou por executar antes do v1.0.0 (2026-05-26), ciente do atraso. Pode ficar
> **parcial/iterativa** numa sessão — entregar incrementalmente, sem regressão.

## Fonte canônica

`R-BUNDLE-SIZE-AUDIT-spec.md` (`docs/auditoria-bundle-2026-05-21/`) achado #3 + `_BACKLOG.md`.
`react-native-calendars@1.x` puxa `lodash` + `moment` + `recyclerlistview` (~1 MB Hermes) e
foi a origem da armadilha A25 (resolveRequest custom em `metro.config.js`).

## Hipóteses técnicas (validar via grep)

1. `react-native-calendars` é usado em **3 pontos** (grep `react-native-calendars src/ app/`):
   - `src/components/agenda/CalendarGrid.tsx` (tela `/agenda`, M37.1).
   - `src/components/screens/RecapModoCalendario.tsx` (modo Calendário do Recap, L2).
   - `src/components/agenda/calendarLocalePtBr.ts` (registro de locale PT-BR — some com a lib).
2. Funcionalidade usada: calendário mensal com **dots** por dia (eventos/conquistas), header
   "Maio de 2026", dias "Dom..Sáb", tap em dia → callback. É um subconjunto pequeno.
3. `metro.config.js` tem `resolveRequest` custom só para `react-native-calendars` (A25) —
   **remover** após a substituição (verificar que nada mais depende).

## Entregáveis

- `src/components/agenda/CalendarMes.tsx` (novo) — calendário mensal custom: grid 7×6,
  header mês/ano PT-BR, navegação mês anterior/próximo, dots por dia (prop
  `marcados: Record<'YYYY-MM-DD', {dots}>`), `onDiaPress`. Dracula tokens, JetBrains Mono,
  springs. Sem deps externas (só RN + datetime helpers do projeto).
- `src/components/agenda/CalendarGrid.tsx` — trocar `<Calendar>` da lib pelo `<CalendarMes>`.
- `src/components/screens/RecapModoCalendario.tsx` — idem.
- Remover `react-native-calendars` de `package.json` + `calendarLocalePtBr.ts` (obsoleto) +
  o bloco `resolveRequest` de `react-native-calendars` em `metro.config.js` (A25).
- Testes: `CalendarMes` (render mês, dots, navegação, tap) + atualizar os de CalendarGrid/Recap.

## OFF-LIMITS
- Pode: os 3 arquivos acima + `CalendarMes.tsx` novo + `package.json` (remover a lib) +
  `metro.config.js` (remover só o resolveRequest de calendars) + testes.
- **`package.json`/`metro.config.js` exigem confirmação** — autorizado nesta sprint (dono
  pediu). Não tocar outras deps nem outros resolveRequest.

## Restrições
- Paridade visual com o atual (Gauntlet comparativo antes/depois). Locale PT-BR mantido.
- UI PT-BR + acento; springs (ADR-010); sem emoji; TS strict; worktree.
- Atualizar `VALIDATOR_BRIEF.md §4` (A25 pode ser removida se calendars era o único caso).

## Verificação canônica
```bash
./scripts/bootstrap-worktree.sh && npx tsc --noEmit
npm test --silent -- --testPathPattern="Calendar|agenda|RecapModoCalendario"
./scripts/smoke.sh
npx expo export --platform android  # bundle deve REDUZIR (~1MB); confirmar < ADR-0027 e sem o erro A25
```
Validação visual Gauntlet OBRIGATÓRIA (`/agenda` + Recap modo Calendário) — antes/depois.

## Proof-of-work
1. diff. 2. jest verde. 3. smoke. 4. **bundle antes/depois** (ganho ~1MB). 5. screenshots
   comparativos. 6. hash+branch. 7. Se parcial: o que ficou + sprint de continuação.
