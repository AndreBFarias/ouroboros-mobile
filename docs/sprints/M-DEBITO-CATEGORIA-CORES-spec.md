# Sprint M-DEBITO-CATEGORIA-CORES — 8 categorias de tarefa todas laranja

```
DEPENDE:    M-DEBITO-UI-UX-SEED-DUO fechada (corrigiu Outro→ghost)
BLOQUEIA:   nada
ESTIMATIVA: 0,5-1h
PRIORIDADE: baixa (cosmético)
STATUS:     [todo]
```

## 1. Achado / motivação

Achado colateral durante M-DEBITO-UI-UX-SEED-DUO (2026-05-04):
spec original do M-DEBITO afirmava que "outras 7 categorias têm
cores semânticas: trabalho/casa/rotina/finanças/etc.", mas o
código real em `src/components/todo/SheetNovaTarefa.tsx` tem
**todas as 8 categorias com `accent: 'orange'`**.

M-DEBITO corrigiu apenas Outro→ghost (escopo declarado). As outras
7 continuam orange — divergência entre spec e código real.

## 2. Caminho

Atribuir cores semânticas Dracula por slug:

```ts
const CATEGORIA_ACCENTS: Record<CategoriaTarefa, ChipAccent> = {
  trabalho: 'cyan',         // produtivo
  casa: 'pink',             // doméstico íntimo
  rotina: 'purple',         // hábito/automático
  financas: 'green',        // dinheiro
  desenvolvimento: 'yellow',// estudo
  obrigacoes: 'orange',     // urgente
  saude: 'red',             // crítico
  outro: 'ghost',           // neutro (já feito por M-DEBITO)
};
```

Decisão final pode variar — design system tem latitude. Validar
com olhar UI/UX no Gauntlet.

## 3. Entregáveis

- Refactor em `src/components/todo/SheetNovaTarefa.tsx`
  `CATEGORIA_ACCENTS`.
- Screenshot novo em
  `docs/sprints/M-DEBITO-CATEGORIA-CORES-screenshots-gauntlet/A-categorias-coloridas.png`.
- 1 caso E2E confirma cores distintas via getComputedStyle.

## 4. Verificação

- Gauntlet: `/todo` → Nova tarefa → 8 chips com cores distintas
  (não todas laranja).
- WCAG: cada chip tem contraste mínimo no fundo do sheet.

## 5. Decisões pendentes

- Mapeamento exato slug→cor — o spec sugere uma combinação mas
  decisão final é durante implementação com olhar visual.
