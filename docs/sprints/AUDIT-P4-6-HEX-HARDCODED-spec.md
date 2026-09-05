# AUDIT-P4-6-HEX-HARDCODED — substituir hex literais duplicados por tokens já importados

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: baixa (risco de drift futuro, não bug visual — valores
            batem exatamente com os tokens hoje)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-6]/[UI-04/05/06] da auditoria de 2026-07-28.
            Confirmado nesta materialização lendo os 3 arquivos e
            src/theme/tokens.ts, e recontando as ocorrências reais em
            app/_layout.tsx (grep bruto encontra 10 linhas, das quais
            só 7 são código — as outras 3 são menções em comentário).
```

## Problema (token importado, mas valor duplicado como literal)

Três arquivos duplicam o valor de um token de cor já disponível via
import, em vez de referenciar o token — sem diferença visual hoje
(os literais batem exatamente com os tokens), mas com risco de drift
se o token mudar no futuro sem que o literal acompanhe.

### app/_layout.tsx — 7 ocorrências de código (não 9)

O arquivo já importa `colors` de `@/theme/tokens` na linha 55, e usa
o token normalmente em outros pontos (`colors.bgPage` nas linhas 435 e
581). Mesmo assim, o `contentStyle` de 7 `Stack.Screen`/`Stack` usa o
valor literal:

```tsx
// linha 464 (Stack raiz)
contentStyle: { backgroundColor: '#282a36' },   // = colors.bg
// linhas 489, 497, 505, 513, 526, 539 (6 rotas modais)
contentStyle: { backgroundColor: '#14151a' },   // = colors.bgPage
```

`src/theme/tokens.ts:5-6` confirma os valores exatos:
`bgPage: '#14151a'`, `bg: '#282a36'`. A correção original do achado
contava "9 ocorrências", mas o grep bruto de `#282a36|#14151a` no
arquivo encontra **10 linhas**, das quais **3 são apenas menções em
comentário** (linhas 480, 481, 532, explicando por que o
`transparentModal` precisa do fundo opaco) — não são código executável
e não têm risco de drift. As ocorrências reais de código são **7**
(linha 464 + 6 vezes nas linhas 489-539).

### src/components/ui/Screen.tsx:19 — nem importa o tema

```tsx
// Screen.tsx nao importa 'colors' de @/theme/tokens em lugar nenhum
<StatusBar barStyle="light-content" backgroundColor="#14151a" />
```

Este é o wrapper raiz usado por praticamente toda tela do app — o
valor duplica `colors.bgPage` de memória, sem sequer ter o import
disponível para referência cruzada.

### app/recap-memorias.tsx:605 — duplica colorsMemorias.bgGradient[0]

```tsx
// linha 605 (early-return de loading)
<View style={[styles.container, { backgroundColor: '#1a0d2e' }]}>
```

O mesmo arquivo já usa `colorsMemorias.bgGradient[0]` (valor
`'#1a0d2e'`) explicitamente na linha 844 — só o early-return de
loading duplica o literal em vez de reusar a constante já importada.

## Escopo (mínimo)

1. `app/_layout.tsx:464` — trocar `'#282a36'` por `colors.bg`.
2. `app/_layout.tsx:489,497,505,513,526,539` — trocar `'#14151a'` por
   `colors.bgPage` nas 6 ocorrências.
3. `src/components/ui/Screen.tsx:19` — importar `colors` de
   `@/theme/tokens` e trocar `"#14151a"` por `colors.bgPage`.
4. `app/recap-memorias.tsx:605` — trocar `'#1a0d2e'` por
   `colorsMemorias.bgGradient[0]`.
5. NÃO-objetivo: não tocar os comentários das linhas 480, 481, 532 de
   `app/_layout.tsx` (menção textual, sem risco de drift); não tocar as
   exceções documentadas e intencionais — o degrade de 49 cores do
   glifo da marca em `src/components/brand/glifo/geometria.ts`
   (fonte única byte-idêntica ao SVG canônico, documentado no próprio
   cabeçalho do arquivo) e as cores hex de
   `src/components/brand/OuroborosLoader.tsx:81-83`
   (`COR_ESCAMA`/`COR_MANDIBULA_INFERIOR`/`COR_TEXTO_SECUNDARIO`,
   comentário explícito: "Cores hex literais que não tem token ...
   Bate com canon do desktop"); não tocar `HeatmapBase.tsx` (paletas de
   intensidade de data-viz, documentadas e ancoradas em `colors.green`).

## Proof-of-work

```bash
grep -n "#282a36\|#14151a" app/_layout.tsx        # so sobram as 3 mencoes em comentario
grep -n "colors" src/components/ui/Screen.tsx     # import presente
grep -n "#1a0d2e" app/recap-memorias.tsx          # so a constante colorsMemorias, sem literal duplicado
npx tsc --noEmit                                  # exit 0
npm test -- Screen                                # suite verde
./gauntlet.sh
# capturar screenshot ANTES/DEPOIS das rotas afetadas (root stack, humor-rapido,
# diario-emocional, eventos, scanner, captura, recap, /recap-memorias loading) --
# paridade visual byte-a-byte esperada (mesmos valores de cor).
./scripts/smoke.sh                                 # verde
```

Sem mudança de comportamento nem de aparência (literal e token resolvem
para o mesmo valor hoje) — dispensa caso E2E novo, seguindo o mesmo
raciocínio já aplicado em
`docs/sprints/R-BRAND-CLEANUP-WARNING-TRANSFORM-ORIGIN-spec.md`
("sem device nem E2E novo") para correções puramente internas sem
delta visual. Evidência = screenshots antes/depois no Gauntlet
confirmando paridade.

## Commit

```
refactor: audit-p4-6-hex-hardcoded substitui hex literais por colors.bg colors.bgpage e colorsmemorias
```

---

## Adendo de execução (2026-09-05)

Registrado na execução, para que o próximo leitor não repita a
investigação. **O corpo do spec acima tem números de linha obsoletos** —
não use nenhum deles; ancore por conteúdo.

### 1. Números de linha do corpo estão errados

`app/_layout.tsx` deslocou ~+145 linhas desde a materialização
(AUDIT-P4-2, fase 1 da auditoria, AUDIT-P3-3, AUDIT-P1-9 e as sprints
paralelas do lote 2). Mapa real no momento da execução:

| Corpo do spec diz | Real (pré-execução) | O que é |
|---|---|---|
| 464 | 609 | `contentStyle` do Stack raiz (`#282a36`) |
| 489, 497, 505, 513, 526, 539 | 634, 642, 650, 658, 671, 684 | as 6 rotas modais (`#14151a`) |
| 480, 481, 532 | 625, 626, 677 | os 3 comentários (NÃO-objetivo, intocados) |
| 435, 581 (`colors.bgPage` já em uso) | 468, 614, 617 | usos pré-existentes do token |

As 6 linhas das rotas modais são textualmente idênticas (mesma
indentação): edição por string única falha, e trocar só uma e declarar
pronto é o erro clássico aqui. A contagem do corpo (7 de código + 3 de
comentário) está correta; só os números não estavam.

### 2. Micro-extensão deliberada: `app/recap-memorias.tsx` (styles.container)

O escopo do corpo cita só o early-return de loading, mas o
proof-of-work exige `grep -n "#1a0d2e" app/recap-memorias.tsx` sem
literal sobrando — impossível de satisfazer sem também trocar
`container: { flex: 1, backgroundColor: '#1a0d2e' }` no
`StyleSheet.create`. As duas linhas foram trocadas por
`colorsMemorias.bgGradient[0]`. Não colide com NÃO-objetivo nenhum,
não muda valor de cor e não remove o override redundante do
early-return (que já herdava o mesmo valor de `styles.container`).

### 3. O passo de paridade byte-a-byte no Gauntlet foi substituído

O corpo pede comparar PNGs antes/depois com `cmp`/hash nas rotas
afetadas. Isso é insatisfazível justamente nas telas nomeadas:
`OuroborosLoader` roda loops Reanimated `withRepeat`, e
`/recap-memorias` anima o gradiente em ciclo de 8s — duas capturas
nunca batem em hash. O `gauntlet.sh` também não tem maquinaria de
comparação de imagem. A paridade foi provada estaticamente, que é
mais forte que o pixel: `src/theme/tokens.ts:5-6` dá
`bgPage: '#14151a'` e `bg: '#282a36'`, `:33` dá
`bgGradient[0] === '#1a0d2e'`, e o snapshot
`tests/components/recap/__snapshots__/ShareCardMemoria.test.tsx.snap`
(que já serializa o token como `"#1a0d2e"`) passou sem `-u`.

### 4. `npm test -- Screen` é gate válido

`tests/components/ui/Screen.test.tsx` existe e renderiza justamente o
componente que ganha o import novo. Executado junto com
`ShareCardMemoria` e `recap-memorias`: 27 suítes / 188 testes /
1 snapshot, todos verdes.
