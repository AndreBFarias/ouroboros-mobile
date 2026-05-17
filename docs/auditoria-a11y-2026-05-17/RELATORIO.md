# Auditoria a11y TalkBack — 2026-05-17

Sprint: **R-A11Y-TALKBACK** (P2-medium, Fase 3).

## Escopo

Auditoria estática de navegação por screen reader em rotas-alvo
(`app/`) + componentes (`src/components/`). Cobre 110 instâncias de
`Pressable` / `TouchableOpacity` em 64 arquivos `.tsx`.

Validação runtime com TalkBack ativo no celular (Nível C) fica como
follow-up para a sprint de release v1.0.0.

## Método

1. Script Python parseia cada arquivo `.tsx`, encontra cada tag
   `<Pressable>` / `<TouchableOpacity>` / `<TouchableHighlight>` /
   `<TouchableWithoutFeedback>`, varre props da tag de abertura.
2. Para cada Pressable **interativo** (com `onPress`/`onLongPress`):
   - verifica presença de `accessibilityLabel` (literal ou JSX expr);
   - verifica presença de `accessibilityRole` (literal ou JSX expr);
   - flagga label vazia ou genérica (`button`, `pressable`, `icon`);
   - flagga label com acento (convenção TalkBack: sem acento);
   - flagga prefixo redundante "Botao"/"Button" (TalkBack já anuncia
     a role).
3. Pressables decorativos (sem handler) são ignorados.

## Resumo geral

| Severidade | Quantidade | Ação |
|---|---|---|
| Crítico (sem label) | 0 | nada a corrigir |
| Alto (label genérica/vazia) | 0 | nada a corrigir |
| Médio (prefixo redundante ou acento) | 6 | **corrigido** nesta sprint |
| Baixo (sem `accessibilityRole`) | 4 | **corrigido** nesta sprint |

Total de findings corrigidos: **10**.

## Baseline antes da correção

O codebase já apresentava cobertura a11y **alta** graças a sprints
anteriores (G-CARD-AUDIO-VIDEO-1, R-NAV-3, M01.5/M01.6):

- 148 arquivos com `accessibilityLabel` (de 192 `.tsx`).
- 101 arquivos com `accessibilityRole`.
- 451 instâncias totais de `accessibilityLabel` no codebase.
- Componentes UI base (`Button`, `IconButton` via `Pressable`,
  `Toggle`, `Slider`, `Chip`, `Input`, `Header`, `FAB`, `PersonAvatar`)
  já injetam role + label de forma consistente.

Não há lacunas críticas. As correções desta sprint são **polish
fino**: normalizar labels conforme convenção TalkBack (sem acento,
verbo-objeto direto, sem prefixo redundante).

## Findings — detalhe

### Médios — labels com prefixo redundante "Botao" (FAB Radial)

`src/components/ui/FABRadial.tsx` linhas 72/80/88/96/104:

| Antes | Depois |
|---|---|
| `'botao humor'` | `'humor'` |
| `'botao camera'` | `'camera'` |
| `'botao exercicios'` | `'exercicios'` |
| `'botao conquista'` | `'conquista'` |
| `'botao crise'` | `'crise'` |

Razão: o Pressable do ActionRadial já tem `accessibilityRole="button"`
(linha 318), então o TalkBack anuncia automaticamente "botão". O
prefixo causa redundância sonora ("botão botão humor"). Verbo-objeto
direto é a convenção do projeto.

Testes atualizados em `tests/components/ui/FABRadial.test.tsx`.

### Médio — label com acento + uppercase

`app/+not-found.tsx:60`:

```diff
-accessibilityLabel="Voltar para a tela inicial"
+accessibilityLabel="voltar para o inicio"
```

Razão: `accessibilityLabel` segue convenção sem acento (BRIEFING
§1.4) e lowercase para evitar ênfase entonacional inadequada do
TalkBack. O label visual do botão (`label="Voltar para o início"`)
mantém acentuação completa — é texto visível, regra diferente.

### Baixo — Recap (nome próprio com inicial maiúscula)

`app/index.tsx:65`:

```diff
-accessibilityLabel="Recap"
+accessibilityLabel="recap"
```

Razão: consistência com o resto do app onde labels são lowercase.
Recap é nome do feature, não nome próprio de pessoa/marca; pode ser
lowercase.

### Baixos — Pressables interativos sem `accessibilityRole`

1. `app/recap-memorias.tsx:523` (zona de tap `"anterior"`)
2. `app/recap-memorias.tsx:535` (zona de tap `"proximo"`, sem acento por convenção TalkBack) <!-- noqa-acento -->
3. `src/components/chrome/MenuLateral.tsx:379` (backdrop do drawer)
4. `src/components/todo/MenuLongPress.tsx:98` (container do menu)

Todos receberam `accessibilityRole="button"` (3 primeiros) e
`accessibilityRole="menu"` (último — semanticamente é container de
ações, não botão).

## Cobertura — componentes UI base

Verificação manual confirmou que todos os primitivos do design system
já injetam role + label corretamente:

| Componente | Role | Label |
|---|---|---|
| `Button` | `button` | derivado de `label` ou `accessibilityLabel` |
| `FAB` | `button` | default `"acao rapida"` (label TalkBack, sem acento) ou override | <!-- noqa-acento -->
| `FABRadial` (principal) | `button` | `"abrir acoes"` / `"fechar acoes"` (sem acento) | <!-- noqa-acento -->
| `FABRadial` (actions) | `button` | derivado de `ActionDescriptor.acentLabel` |
| `Header` (botão voltar) | `button` | `voltar` |
| `Toggle` | `switch` | `accessibilityLabel` + `accessibilityState{checked, disabled}` |
| `Slider` | `adjustable` | label + `accessibilityValue{min, max, now}` |
| `Chip` | `button` | `chip ${label}` |
| `Input` | (auto) | label/placeholder/`accessibilityLabel` |
| `PersonAvatar` | `button`/`image` (cond.) | `avatar pessoa ${pessoa}` |
| `MicrofoneButton` | `button` | + `accessibilityHint="press-and-hold..."` |
| `TranscreverButton` | `button` | + `accessibilityHint="press-and-hold..."` |
| `ToastUndo` | `alert` (container) + `button` (Desfazer) | `toast undo ${msg}` + `desfazer` |
| `MenuLateral` (Drawer) | `accessibilityViewIsModal` | + backdrop com role agora |
| `BottomSheet` (Gorhom) | injetado pela lib | injetado pela lib |

## Boas práticas observadas (e mantidas)

1. **Convenção de label sem acento** — 100% do codebase já segue.
2. **Verbo-objeto direto** — labels como `"voltar"`, `"fechar"`,
   `"salvar"`, `"abrir menu"` cobrem a grande maioria.
3. **`accessibilityHint`** usado em gestos não-óbvios
   (press-and-hold para gravar voz).
4. **`accessibilityState`** usado em Toggle (checked/disabled) e
   Button (disabled).
5. **`accessibilityValue`** usado em Slider (min/max/now).
6. **`accessibilityElementsHidden` + `importantForAccessibility`**
   usado em CheckboxTarefaInline e ItemTarefa para evitar leitura
   duplicada de texto + decoração.
7. **`accessibilityViewIsModal`** usado em MenuLateral (drawer)
   para travar foco TalkBack dentro do drawer aberto.

## Lacunas conhecidas (fora-escopo)

- **TalkBack runtime real** — não validado em celular físico nesta
  sprint. Fica como checkpoint Nível C antes do release v1.0.0.
  Cenários sugeridos: navegação por swipe entre seções da Tela Hoje,
  abrir FAB radial e selecionar ação, marcar tarefa como concluída e
  ouvir feedback de undo, abrir BottomSheet e fechar com tap fora.
- **Focus order em telas com layout absoluto** — overlay do FAB
  Radial usa `pointerEvents` mas pode confundir TalkBack quando 5
  ações aparecem em arco. Validar no Nível C.
- **`accessibilityActions`** customizadas (long-press, swipe) — não
  presentes hoje. Considerar para Onda T se houver demanda.
- **Live regions** (`accessibilityLiveRegion`) — Toast e Undo usam
  `accessibilityRole="alert"` que cobre o caso 80%; live regions
  Android-only nativas podem ser usadas para mensagens críticas
  futuras.

## Arquivos modificados

- `src/components/ui/FABRadial.tsx` (5 labels)
- `app/+not-found.tsx` (1 label)
- `app/index.tsx` (1 label)
- `app/recap-memorias.tsx` (2 roles)
- `src/components/chrome/MenuLateral.tsx` (1 role)
- `src/components/todo/MenuLongPress.tsx` (1 role)
- `tests/components/ui/FABRadial.test.tsx` (atualiza expectativas)
- `tests/a11y/talkback-labels.test.tsx` (novo — sweep estática)

## Próximos passos

1. Sprint **R-A11Y-RUNTIME** (Onda futura): validação Nível C com
   TalkBack ativo no Redmi Note 13 5G Pro. Roteiro: 10 fluxos
   principais navegados só com swipe + double-tap.
2. Sprint **R-A11Y-DYNAMIC-TYPE**: respeitar tamanho de fonte de
   sistema (escalamento até 200%). Hoje a fonte é fixa em sp-mapped
   `fontSize`; validar quebras de layout.
3. Sprint **R-A11Y-CONTRAST-AAA**: hoje cobertura é AA (Dracula).
   Auditar onde podemos atingir AAA sem quebrar identidade visual.
