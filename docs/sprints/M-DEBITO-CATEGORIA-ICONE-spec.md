# Sprint M-DEBITO-CATEGORIA-ICONE — Ícone categoria reflete accent

```
DEPENDE:    B3 fechada (CATEGORIA_ACCENTS); B6 ou anteriores
ESTIMATIVA: 0,5h
PRIORIDADE: baixa (AC-1 herdado de B3 + auditoria 2026-05-05)
```

## 1. Achado

`src/components/todo/SheetNovaTarefa.tsx:300,375` (linha
aproximada): ícone Lucide do header (briefcase) e ícone da
categoria selecionada estão **hardcoded** com `colors.orange`
em vez de refletir a cor accent da categoria.

Validação visual: ao selecionar "Saúde" (vermelho) o ícone
deveria ficar vermelho. Ao selecionar "Trabalho" (cyan), cyan.
Atual: sempre laranja (cor antiga, pré-B3).

## 2. Tarefa

Substituir cor literal do ícone por `colors[CATEGORIA_ACCENTS[categoria]]`
(ou helper equivalente).

```ts
// Antes:
<Briefcase color={colors.orange} />

// Depois:
const accent = CATEGORIA_ACCENTS[categoriaSelecionada] ?? 'orange';
<Briefcase color={colors[accent] ?? colors.muted} />
```

Tratamento especial para `accent='ghost'`: ícone permanece em
`colors.muted` (não tem cor).

## 3. Entregáveis

- `src/components/todo/SheetNovaTarefa.tsx` — fix nas linhas
  apontadas.
- 1 case Jest novo em `tests/components/todo/SheetNovaTarefa.test.tsx`
  validando `color` do ícone para cada accent.
- 1 caso E2E `tests/e2e/playwright/m-debito-categoria-icone.e2e.ts`.

## 4. Verificação

- Selecionar "Saúde" → ícone vermelho.
- Selecionar "Trabalho" → ícone cyan.
- Selecionar "Outro" → ícone muted.
- Smoke verde, PT-BR check OK.

## 5. Decisões tomadas

- **Helper inline em SheetNovaTarefa** vs novo helper canônico:
  inline é mais simples e cirúrgico.
- **`accent='ghost'` → `colors.muted`** para preservar semântica
  neutra.
