# Sprint M-DEBITO-UI-UX-SEED-DUO — 3 achados visuais consolidados

```
DEPENDE:    nada
BLOQUEIA:   nada
ESTIMATIVA: 1-2h (3 fixes pequenos consolidados)
PRIORIDADE: média (UX/cosmético; não funcional crítico)
STATUS:     [todo]
```

## 1. Achado / motivação

Validação visual M-GAUNTLET-SEED-DUO (2026-05-04) registrou 3 achados
informais no CHANGELOG como "anotados para sprint corretiva futura".
Consolidados aqui:

### 1.1 Chip "Outro" categoria de Tarefa (M31)

Renderiza em **laranja accent** sendo opção neutra/genérica
(incoerência semântica de cor). Outras 7 categorias usam cores
contextuais semânticas: trabalho/casa/rotina/finanças/etc. "Outro"
deveria ser **muted** (`colors.muted` ou variant ghost) para não
competir visualmente com as opções específicas.

**Localização:** `src/components/screens/SheetNovaTarefa.tsx` ChipGroup
de categoria.

### 1.2 Botão "Salvar" do Novo contador fora do viewport

Em `app/contadores/novo.tsx`, ao preencher título e descer no form,
o botão Salvar pode ficar **abaixo do dobre** do viewport mobile
(precisa scroll). Não é bloqueador, mas reduz descoberta. Em UX
mobile, primary action sempre visível ou via botão fixo no rodapé
(estilo M30 alarmes/novo).

**Localização:** `app/contadores/novo.tsx`. Confirmar via Gauntlet
com seed + abrir + scroll.

### 1.3 M30 toggle alarme — animação não-validada

`SheetNovaTarefa` (M31) tem toggle "Lembrar com alarme" que expande
bloco DateTimePicker quando ON. Animação de expansão **não foi
validada visualmente** durante M-SEED-DUO (DOM aparece OK, mas
transição entre ON/OFF nunca foi capturada em screenshot).

**Localização:** `src/components/screens/SheetNovaTarefa.tsx`. Validar
spring/timing.

## 2. Caminhos por achado

- **1.1**: trocar variant do chip "Outro" para `ghost` ou cor
  `muted`. Conferir se ChipGroup já tem prop para isso ou se exige
  ajuste no `<Chip>` quando `value === 'outro'`.
- **1.2**: dois caminhos — (a) `<Button>` Salvar fixo no rodapé via
  KeyboardAvoidingView + sticky bottom; (b) ScrollView com
  `contentContainerStyle.paddingBottom: spacing.huge * 2` para
  garantir que botão sempre cabe acima do teclado virtual.
  Decidir na execução.
- **1.3**: capturar animação via Gauntlet (3 screenshots: OFF,
  meio-da-transição, ON) e confirmar spring `springs.snappy` ou
  similar coerente com ADR-010 (física, não duration linear).

## 3. Entregáveis

- 3 fixes nos arquivos respectivos.
- Screenshots em
  `docs/sprints/M-DEBITO-UI-UX-SEED-DUO-screenshots-gauntlet/`:
  - `A-chip-outro-muted.png`
  - `B-novo-contador-salvar-visivel.png`
  - `C-toggle-alarme-expandido.png`
- 1 caso E2E `tests/e2e/playwright/m-debito-ui-ux-seed-duo.e2e.ts`
  consolidado.

## 4. Verificação

- 1.1: chip "Outro" renderiza com cor `colors.muted` ou `ghost`
  variant em `SheetNovaTarefa`.
- 1.2: botão Salvar visível no viewport 412×892 ao montar
  `/contadores/novo` e ao preencher campos.
- 1.3: toggle alarme alterna ON/OFF com transição visível e
  DateTimePicker monta/desmonta sem flicker.

## 5. Decisões tomadas

- **Consolidação em 1 sprint**: 3 fixes pequenos (≤30min cada) em
  arquivos diferentes mas mesma natureza (cosmético/microinteração)
  têm overhead menor consolidados. Caso vire complexo na execução,
  sub-spritar.
- **Variant `ghost` para chip neutro**: convenção do design system
  (ADR-010 "hierarquia por contraste"); evita criar novo variant
  só para isso.
