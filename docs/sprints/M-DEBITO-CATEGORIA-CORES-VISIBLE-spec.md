# Sprint M-DEBITO-CATEGORIA-CORES-VISIBLE — Chip rest mostra accent

```
DEPENDE:    B3 fechada (CATEGORIA_ACCENTS mapping); C2.x.1 fechada
            (Chip borda muted 5.30 ratio em rest)
BLOQUEIA:   nada
ESTIMATIVA: 0,5-1h
PRIORIDADE: baixa (achado da auditoria 2026-05-05)
```

## 1. Achado

Auditoria 2026-05-05 confirmou via DOM que chips de categoria
em estado **rest** têm `borderColor: rgb(0,0,0)` (uniforme) e
fundo escuro idêntico — visualmente quase impossível distinguir
qual categoria é qual antes de selecionar.

Cor accent (cyan/pink/purple/etc) só aparece quando **selected**.

Decisão de design original: cor distingue ESTADO. Aceitável mas
sub-ótimo: usuário precisa hover/tap para descobrir mapping.

## 2. Tarefa

Aplicar accent **levemente** em rest, mantendo selected mais
saturado. Sugestão:
- Rest: `borderColor: hexToRgba(accentHex, 0.4)` (40% opacity).
- Selected: `borderColor: accentHex` (100%).
- Mantém `colors.muted` ratio 5.30 do C2.x.1 como **fallback**
  para `accent='ghost'` (Outro).

Outras categorias mantêm seu accent semântico em rest com 40%
opacity. Visualmente: borda colorida discreta, com uma das chips
em destaque ao selected.

## 3. Entregáveis

- `src/components/ui/Chip.tsx` — adicionar branch rest com accent
  opacity.
- 1 case Jest novo em `tests/components/ui/Chip.test.tsx`
  (`borderColor` em rest com accent presente).
- 1 caso E2E `tests/e2e/playwright/m-debito-categoria-cores-visible.e2e.ts`
  mede `getComputedStyle.borderColor` em 8 chips rest e exige
  cores **distintas** (Set.size === 8 exceto Outro=ghost).

## 4. Verificação

- 8 chips em rest com 8 cores diferentes (incluindo Outro=muted).
- WCAG ratio mantém ≥ 3:1 (large) em todos accents x bgElev.

## 5. Decisões tomadas

- **Opacity 40%** vs filled — borda preserva minimalismo Dracula;
  fill saturado pode ficar pesado em sheet com 8 chips.
- **Ghost permanece muted** — não tem cor, então usa o fallback
  da C2.x.1.
