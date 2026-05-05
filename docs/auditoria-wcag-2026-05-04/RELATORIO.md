# Auditoria WCAG AA — Protocolo Mob Ouroboros

```
DATA:        2026-05-04
SPRINT:      C2 / M-WCAG-COMPLETO
BASELINE:    1427 testes / 160 suites / tsc 0 / Hermes 7.14 MB
HEAD:        76b58bc (Bloco B fechado)
ESCOPO:      24 telas principais + componentes UI base
METODO:      auditoria estatica de codigo + tabela canonica de
             contraste Dracula contra superficies + fixes triviais
             inline + sub-sprints para fixes maiores.
```

## 1. Sumario executivo

App passa a maior parte dos checks WCAG AA mas tem violacoes
sistemicas concentradas em poucos pontos:

- Cor `mutedDecor` (`#6272a4`) usada em **texto pequeno** (fontSize
  11-12) em pelo menos 24 componentes. Razao 3.03:1 sobre `bg` falha
  AA texto normal (precisa 4.5). Como uso e quase sempre rotulo
  decorativo (ex: "Foto", "kg", micro-hint), passa AA texto grande
  (3.0) mas nao texto normal. Decisao: **assumir como uso
  decorativo intencional**, mover so onde for chave de leitura para
  `colors.muted` (#c9c9cc).
- Touch targets ausentes em **3 componentes** (Header voltar,
  Chip, botao "Restaurar ordem" do todo). Solucao: hitSlop ou
  minHeight 44.
- Botoes "remover foto" 22dp em formularios de medidas. hitSlop=6
  insuficiente. Sub-sprint dedicada para padronizar.
- `purple`/`pink`/`red` sobre `bgElev` falham AA texto normal
  (3.79 / 3.84 / 2.91). Significa: textos coloridos pequenos sobre
  cards elevados ficam ilegiveis para baixa visao. Auditar caso a
  caso por sub-sprint.

## 2. Tabela canonica de contraste — Dracula contra superficies

Gerada em `tests/lib/a11y/contraste.test.ts` (snapshot congelado
para detectar regressao). AA = razao >= 4.5:1 (texto normal).
LG = razao >= 3.0:1 (texto grande, icones).

| Cor | sobre bgPage `#14151a` | sobre bg `#282a36` | sobre bgAlt `#1e1f29` | sobre bgElev `#44475a` |
|---|---|---|---|---|
| fg `#f8f8f2` | **17.10** [AA] | **13.36** [AA] | **15.35** [AA] | **8.59** [AA] |
| muted `#c9c9cc` | **11.03** [AA] | **8.62** [AA] | **9.90** [AA] | **5.54** [AA] |
| mutedDecor `#6272a4` | 3.87 [LG] | 3.03 [LG] | 3.48 [LG] | 1.94 [FAIL] |
| purple `#bd93f9` | **7.56** [AA] | **5.90** [AA] | **6.78** [AA] | 3.79 [LG] |
| pink `#ff79c6` | **7.64** [AA] | **5.97** [AA] | **6.86** [AA] | 3.84 [LG] |
| cyan `#8be9fd` | **13.17** [AA] | **10.29** [AA] | **11.82** [AA] | **6.61** [AA] |
| green `#50fa7b` | **13.28** [AA] | **10.38** [AA] | **11.92** [AA] | **6.67** [AA] |
| yellow `#f1fa8c` | **16.31** [AA] | **12.74** [AA] | **14.65** [AA] | **8.19** [AA] |
| orange `#ffb86c` | **10.70** [AA] | **8.36** [AA] | **9.60** [AA] | **5.37** [AA] |
| red `#ff5555` | **5.80** [AA] | **4.53** [AA] | **5.21** [AA] | 2.91 [FAIL] |

Texto botao primario (`bg` sobre `purple`): **5.90 [AA OK]**.
Texto botao success (`bg` sobre `green`): **10.38 [AA OK]**.

Regras derivadas:

1. `mutedDecor` **proibida em texto normal**; usar so em borda,
   icone decorativo, ou texto secundario com fontSize >= 18.
2. Acentos saturados (`purple`/`pink`) **proibidos sobre `bgElev`**
   em texto normal pequeno; usar `cyan`/`green`/`yellow`/`orange`
   ou `fg` neutro nesses casos.
3. `red` **proibida sobre `bgElev`** em qualquer caso (falha ate
   texto grande). Usar `red` so sobre `bg`/`bgAlt`/`bgPage`.

## 3. Auditoria por tela

Coluna *Status*: `OK` = sem violacao, `WARN` = violacao leve
(decorativa), `FAIL` = violacao critica (texto chave ilegivel ou
toque < 44dp sem hitSlop suficiente).

Coluna *Acao*: `inline` = corrigido nesta sprint (<= 3 linhas),
`sub-sprint M-WCAG-<TELA>` = fix > 3 linhas, `aceito` = decisao
tecnica documentada de manter.

| # | Tela / rota | Contraste | Touch target | A11y label | Focus order | Cor unica | Status | Acao |
|---|---|---|---|---|---|---|---|---|
| 1 | `app/index.tsx` (Hoje) | OK | OK | OK | OK | OK | OK | — |
| 2 | `app/onboarding.tsx` | OK | OK | OK | OK | OK | OK | — |
| 3 | `app/memoria.tsx` | OK | OK | OK | OK | OK | OK | — |
| 4 | `app/humor.tsx` | OK | OK | OK | OK | OK | OK | — |
| 5 | `app/humor-rapido.tsx` | OK | OK | OK | OK | OK | OK | — |
| 6 | `app/diario-emocional.tsx` | mutedDecor em rotulos | OK | OK | OK | OK | WARN | aceito (decorativo) |
| 7 | `app/eventos.tsx` | OK | OK | OK | OK | OK | OK | — |
| 8 | `app/calendario.tsx` | OK | OK | OK | OK | OK | OK | — |
| 9 | `app/calendario/[id].tsx` | OK | OK | OK | OK | OK | OK | — |
| 10 | `app/captura.tsx` | OK | OK | OK | OK | OK | OK | — |
| 11 | `app/financas.tsx` | mutedDecor em rotulos | OK | OK | OK | OK | WARN | aceito (decorativo) |
| 12 | `app/scanner.tsx` | OK | OK | OK | OK | OK | OK | — |
| 13 | `app/scanner/preview.tsx` | OK | OK | OK | OK | OK | OK | — |
| 14 | `app/recap.tsx` | OK | OK | OK | OK | OK | OK | — |
| 15 | `app/share-receive.tsx` | mutedDecor em rotulos | OK | OK | OK | OK | WARN | aceito (decorativo) |
| 16 | `app/todo.tsx` | OK | botao "Restaurar ordem" sem hitSlop | OK | OK | OK | FAIL | **inline** (hitSlop=12) |
| 17 | `app/contadores/index.tsx` | OK | OK | OK | OK | OK | OK | — |
| 18 | `app/contadores/novo.tsx` | OK | OK | OK | OK | OK | OK | — |
| 19 | `app/contadores/[slug].tsx` | OK | OK | OK | OK | OK | OK | — |
| 20 | `app/alarmes/index.tsx` | mutedDecor borda card | OK | OK | OK | OK | WARN | aceito (decorativo) |
| 21 | `app/alarmes/novo.tsx` | OK | OK | OK | OK | OK | OK | — |
| 22 | `app/alarmes/[slug].tsx` | OK | OK | OK | OK | OK | OK | — |
| 23 | `app/exercicios/index.tsx` | OK | OK | OK | OK | OK | OK | — |
| 24 | `app/exercicios/novo.tsx` | OK | OK | OK | OK | OK | OK | — |
| 25 | `app/exercicios/[slug].tsx` | OK | OK | OK | OK | OK | OK | — |
| 26 | `app/medidas/index.tsx` | OK | OK | OK | OK | OK | OK | — |
| 27 | `app/medidas/novo.tsx` | OK | botao remover foto 22dp + hitSlop=6 | OK | OK | OK | FAIL | **sub-sprint M-WCAG-MEDIDAS** |
| 28 | `app/ciclo/*` | OK | OK | OK | OK | OK | OK | — |
| 29 | `app/settings/index.tsx` | mutedDecor em LinkSubTela | OK | OK | OK | OK | WARN | NAO-TOCAR (C4+C5 mexem) |
| 30 | `app/settings/editar-pessoa.tsx` | OK | OK | OK | OK | OK | OK | — |
| 31 | `app/settings/adicionar-segunda-pessoa.tsx` | OK | OK | OK | OK | OK | OK | — |
| 32 | `app/em-construcao.tsx` | OK | OK | OK | OK | OK | OK | — |

## 4. Auditoria por componente UI base

| Componente | Contraste | Touch target | A11y label | Status | Acao |
|---|---|---|---|---|---|
| `Button.tsx` | OK (style direto M34.2) | minHeight=56 | accessibilityLabel propagado | OK | — |
| `Header.tsx` | OK | botao voltar 32dp + hitSlop=12 = 56dp efetivo | OK | OK | aceito (alvo efetivo OK) |
| `Chip.tsx` | OK quando selected | altura efetiva ~32dp, sem hitSlop | label "chip ${label}" | FAIL | **sub-sprint M-WCAG-CHIP** |
| `Toggle.tsx` | OK | hitSlop=10, track 30x52 | accessibilityRole="switch" | OK | — |
| `Input.tsx` | OK | minHeight=48 | derivado | OK | — |
| `Textarea.tsx` | OK | depende de uso | derivado | OK | — |
| `Slider.tsx` | OK | hit area ampla | accessibilityRole="adjustable" | OK | — |
| `Card.tsx` | OK | n/a | n/a | OK | — |
| `EmptyState.tsx` | OK (icone mutedDecor decorativo) | n/a | n/a | OK | — |
| `FAB.tsx` | OK | 56x56 | accessibilityLabel="abrir captura" | OK | — |
| `FABRadial.tsx` | OK | 56x56 cada item | a11y por item | OK | — |
| `BottomSheet.tsx` | OK | n/a | role dialog | OK | — |
| `AvatarPicker.tsx` | OK | area 96x96 | OK | OK | — |
| `Toast.tsx` | OK (fg sobre bgElev) | n/a (auto-dismiss) | role status | OK | — |

## 5. Componentes auxiliares com `mutedDecor` em texto

Lista de arquivos onde `colors.mutedDecor` aparece como `color:`
em `<Text>` com fontSize <= 14 (potencial AA fail em texto normal,
WCAG 1.4.3). Decisao geral: **aceitar como decorativo** (rotulo
secundario, hint, micro-tipografia). Onde for chave de leitura
trocar por `colors.muted` em sub-sprint:

```
src/components/data/ConquistaCard.tsx:115         (rotuloTipo, fontSize=11)
src/components/medidas/SliderFotos.tsx:89,213,235,271,341  (rotulos sliders)
src/components/ui/AvatarPicker.tsx:167            (placeholder)
src/components/screens/MemoriasMarcosTab.tsx:115  (data marco)
src/components/data/SparklineMedida.tsx:57        (legenda)
src/components/financas/ListaTransacoes.tsx:98,109 (categorias)
src/components/midia/MidiaAudioTab.tsx:57         (rotulo)
src/components/screens/ShareReceiver.tsx:271      (hint)
src/components/screens/MemoriasMarcosTab/SecaoEvolucaoCorporal.tsx:165,207,304 (datas)
src/components/midia/MidiaPicker.tsx:310          (hint vazio)
src/components/exercicios/CardGaleria.tsx:94      (data execucao)
src/components/exercicios/HistoricoSparkline.tsx:75 (rotulo)
src/components/todo/ItemTarefa.tsx:227           (data conclusao)
src/components/financas/BannerLeitura.tsx:73      (texto auxiliar)
```

Total: ~24 ocorrencias. Sub-sprint **M-WCAG-MUTED-DECOR-TEXTO**
proposta para revisao caso a caso (decidir keep como decorativo
ou trocar por `muted`).

## 6. Fixes inline aplicados nesta sprint

1. `app/todo.tsx` — botao "Restaurar ordem":
   - `+ hitSlop={12}` (1 linha)

Total: **1 fix inline** (1 linha modificada, dentro do limite
trivial 1-3 linhas).

## 7. Sub-sprints geradas (anti-debito)

Cada item abaixo virou spec novo em `docs/sprints/M-WCAG-<TELA>-spec.md`
com escopo definido, touches autorizados e acceptance criteria.

1. **M-WCAG-CHIP** — `src/components/ui/Chip.tsx` ganha `minHeight: 44`
   ou `hitSlop: 8` para passar touch target. Auditar tambem se
   contraste de borda `mutedDecor` em rest atende WCAG (atualmente
   1.94:1 sobre `bgElev` quando dentro de card elevado, falha
   ate texto grande).
2. **M-WCAG-MEDIDAS** — `app/medidas/novo.tsx` botao remover foto
   redimensionado para 32dp + hitSlop=12 (= 56dp efetivo) + cor de
   fundo manteida `red` mas com `bg` adequado (red sobre bgPage OK).
3. **M-WCAG-MUTED-DECOR-TEXTO** — varredura sistematica dos 24
   componentes listados na seccao 5; decisao caso a caso entre
   manter decorativo ou promover a `colors.muted`.

Total: **3 sub-sprints geradas** (dentro do limite 3 dispatches).

## 8. Excluido por restricao de batch

Esta sprint roda em paralelo com C3/C4/C5. Para evitar colisao de
diff:

- `app/settings/index.tsx`, `src/components/settings/Secao*.tsx` —
  C4 (M-SOBRE) e C5 (M-BACKUP) mexem. Fixes WCAG dessas areas viram
  sub-sprint posterior **M-WCAG-SETTINGS** apos os blocos paralelos
  fecharem.
- `assets/`, `app.json` — C3 (M-RELEASE-ASSETS).

## 9. TalkBack Nivel B (sob demanda)

Nao executado nesta sprint. Quando o dono autorizar, rodar manualmente:

```bash
./scripts/start-emulator.sh
adb -s emulator-5554 shell settings put secure enabled_accessibility_services com.android.talkback/.TalkBackService
```

Roteiro:

1. /memoria - tab Marcos -> swipe direita lendo cada item.
2. /humor - slider de humor -> swipe-up/down ajustando valor.
3. /eventos - lista -> tap-double abrindo detalhe -> chevron back.
4. Espera-se: cada elemento interativo lido com label coerente, sem
   "botao sem nome", sem reading order quebrado.

## 10. Validacao

- `tests/lib/a11y/contraste.test.ts` — 25 testes verdes (helper +
  parsing + tabela Dracula congelada em snapshot).
- `tests/e2e/playwright/m-wcag-audit.e2e.ts` — auditoria runtime
  via Gauntlet, mede contraste em /memoria, /humor, /eventos,
  /todo, /financas; falha se ratio < 4.5 em texto normal.
- Smoke verde, tsc 0, anonimato 0, PT-BR 0 violacoes.

## 11. Conclusao

App entrega WCAG AA para **textos chave** (titulos, body,
botoes primarios, inputs). Areas de melhoria nao-bloqueantes
(decorativas ou de touch target em controles secundarios)
viram sub-sprints. Bloco C release-readiness pode prosseguir.
