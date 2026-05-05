# Sprint M-SHEET-MODAL-SNAP — Sheets modais abrem em snap pequeno

```
DEPENDE:    auditoria 2026-05-05 (descobriu)
BLOQUEIA:   M41 (release final — UX modal degradada)
ESTIMATIVA: 1-2h
PRIORIDADE: média (descoberto via auditoria; não é regressão de teste, é UX)
```

## 1. Achado / motivação

Auditoria 2026-05-05 (`docs/auditoria-2026-05-05/RELATORIO.md`)
revelou que rotas modais com `<BottomSheet>` em sheet root abrem
**parcialmente fora do viewport**:

- `/humor-rapido` — apenas `<OuroborosLoader compacto>` visível
  no centro; conteúdo do sheet (4 sliders + chips) só aparece
  rolando.
- `/eventos` — DOM contém todo o conteúdo (Modo / Positivo /
  Negativo / Categoria / Sam / Ana / etc), mas viewport só mostra
  loader.
- `/diario-emocional` — mesmo padrão.
- `/scanner` — provavelmente igual (não testado).

Sheet inicia com snap point que cobre ~10-15% do viewport apenas
(rodapé). Esperado: ~70-85% (snap maior).

## 2. Hipóteses a verificar

1. `<BottomSheet ref={ref} index={0}>` — em gorhom v5, `index={0}`
   pode ser o **menor** snap point (não o maior).
2. `snapPoints` array pode estar invertido: `['85%', '40%']` em
   vez de `['40%', '85%']`.
3. M26 corrigiu Armadilha A18 com `index={0}` direto — mas o
   default snap point pode ter mudado em refactor recente.
4. M-CAPTURA-UNIFICADA (B1) modificou `app/_layout.tsx` Stack
   screens com `presentation: 'transparentModal'` — pode ter
   alterado como o sheet calcula altura inicial.

## 3. Tarefa

1. **Diagnóstico**: comparar `humor-rapido.tsx` antes/depois via
   `git log -p`.
2. **Verificar snap points**: cada sheet root usa preset
   (`SHEET_70`, `SHEET_DEFAULT`) — checar se preset retorna
   ordem correta.
3. **Fix**: ajustar `index={N}` ou `snapPoints` para que sheet
   abra cobrindo ~70-85% no mount.

## 4. Verificação

E2E novo `tests/e2e/playwright/m-sheet-modal-snap.e2e.ts`:
- Navegar `/humor-rapido` via Gauntlet.
- Aguardar 2s de mount.
- Verificar `<input type="range">` (sliders) está com
  `getBoundingClientRect().top < window.innerHeight / 2`
  (sheet expandido cobre metade superior).
- Repetir para `/eventos` e `/diario-emocional`.

## 5. Restrições

- Sentence case + acentuação PT-BR.
- TS strict 0.
- Smoke verde.
- Bundle Hermes ≤ 8,85 MB.
- Não regredir M26 (Armadilha A17/A18).
