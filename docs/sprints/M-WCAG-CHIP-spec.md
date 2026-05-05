# Sprint M-WCAG-CHIP — Touch target e contraste do componente Chip

```
DEPENDE:    M-WCAG-COMPLETO (auditoria gerou esta sub-sprint)
BLOQUEIA:   M41 (release final)
ESTIMATIVA: 30min
PRIORIDADE: media (toque e contraste fora de WCAG AA)
```

## 1. Achado / motivacao

Auditoria 2026-05-04 (`docs/auditoria-wcag-2026-05-04/RELATORIO.md`
secao 4) detectou:

- `src/components/ui/Chip.tsx` tem altura efetiva ~32dp
  (`paddingVertical: 8` + texto `text-sm` 14px + borderWidth 1).
  Falta `hitSlop` ou `minHeight: 44`.
- Borda `mutedDecor` em estado rest sobre `bgElev` da razao 1.94:1
  (falha ate WCAG AA texto grande). Quando o Chip aparece dentro
  de um card elevado (Filtro de pessoa em Settings, Categoria em
  Financas) a borda fica invisivel para baixa visao.

## 2. Objetivo

Chip cumpre WCAG AA touch target (>= 44x44dp efetivo) e contraste
de borda (>= 3:1 sobre superficie em que vive).

## 3. Entregaveis

- Edit em `src/components/ui/Chip.tsx`:
  - `hitSlop={8}` ou `minHeight: 44` no Pressable raiz.
  - Trocar `borderColor` rest de `colors.mutedDecor` para
    `colors.muted` (#c9c9cc, ratio 5.54 sobre bgElev) quando o
    Chip nao esta selecionado.
- Atualizar testes em `tests/components/ui/Chip.test.tsx` (se
  existir) para cobrir nova borda.
- E2E `tests/e2e/playwright/m-wcag-chip.e2e.ts` mede touch target
  via `getBoundingClientRect()` em /humor (categoria) e /financas
  (categoria).

## 4. Verificacao

- Chip com `selected=false` tem altura visual ou hitSlop efetivo
  >= 44dp.
- Borda visivel com ratio >= 3:1 contra qualquer superficie do app.
- Smoke verde, tsc 0, todos os testes passam.

## 5. Decisoes tomadas

- Manter `paddingVertical: 8` (visual mantido) e adicionar
  `hitSlop=8` no Pressable -> 32 + 16 = 48dp efetivo.
- Borda em rest passa de `mutedDecor` para `muted` (mais claro,
  mais legivel).
