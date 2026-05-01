# Sprint M12 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (ad210c106302e0df0)
ORQUESTRADOR: Claude principal
DECISÃO: APROVADO
```

## Camada A — Agente executor (playwright headless 412x900)

7 screenshots:

| Path | sha256 (10) | Estado |
|---|---|---|
| `A-01-tela13-empty.png` | `e40170cb..` | Tela 13 empty: header laranja "Medidas", PERIODO chip "Tudo" purple, EmptyState Inbox + "Suas medidas vão aparecer aqui.", FAB roxo |
| `A-02-tela13-com-cards.png` | `ffe8eb08..` | 4 cards comparativos (Peso, Cintura, Peito, Braço esq) com sparkline cyan polygon fill + delta muted "-2,3 kg vs primeira" / "+2,0 cm vs primeira" — sem cor positivo/negativo (ADR-0005) |
| `A-02-tela13-chip30d-ativo.png` | `74e600cc..` | Chip "30 dias" ativo purple, demais outline |
| `A-03-tela12-form-vazio.png` | `649b62fa..` | Form vazio: 9 inputs com placeholder muted-decor (kg/cm), Acentuação completa em "Braço esquerdo/direito", "Coxa esquerda/direita", bloco Fotos 3 botões 100x100dp |
| `A-03b-tela12-form-fim.png` | `1954152e..` | Scrolled: textareas Reflexão (Como você está se sentindo / Objetivos / Observações) + Salvar |
| `A-04-tela12-form-com-pre-preenchimento.png` | `f4236681..` | Peso 77,7 + Cintura 84,0 + Peito 102,0 em fg branco; demais com placeholder em muted-decor — contraste visual valor real vs sugestão |
| `A-05-slider-fotos-dropdown.png` | `d932566b..` | SliderFotos com dropdown ANTES expandido (15/01/2026 selecionado purple, 29/04/2026 fg) e DEPOIS collapsed |

## Camada V — Validação cruzada via claude-in-chrome MCP

Mínima: o agente já capturou em viewport mobile correto. Aceito Camada A.

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       568 passing (73 suites)  [+51 vs baseline 517]
smoke.sh:     OK
expo export:  ~7.79 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] Sub-rotas `app/(tabs)/medidas/{index,novo}` registradas com `href: null` (acesso via deep link/FAB futuro).
- [ok] Schema `MedidasSchema` exportado via barrel + `MEDIDAS_CAMPOS` + `MEDIDAS_LABELS`.
- [ok] Helpers de Vault (`listarMedidas`, `lerUltimaMedida`, `escreverMedida`, `medidasPath`, `medidasFotoPath`) exportados.
- [ok] **Integração cruzada com M11:** `useFotosAgregadas` da M11 agora consome `medidas/` via novo helper `lerMedidas`. M11 ganha fotos de medidas na galeria sem regredir.
- [ok] FAB sem mudança (não há atalho radial direto para medidas).
- [ok] Settings sem dependência.

## Decisões implementadas (spec §10)

- [ok] Unidades: label "Peso" + placeholder "kg" muted-decor
- [ok] Slider fotos com dropdown de datas selecionáveis
- [ok] Delta absoluto sem cor (`-2,3 kg vs primeira` muted)
- [ok] Pré-preenchimento muted-decor diferenciando sugestão de valor real

## Achados colaterais

Nenhum bug pré-existente. Anotação: playwright instalado via `npm install --no-save` deixou `node_modules/playwright/` dangling (artefato efêmero, não afeta build nem testes).

## Decisão final

**APROVADO.** M12 entrega Telas 12/13 + integração cruzada com M11 (galeria agregada cresceu sem mudança de consumer). Bloco 2 (Captura ativa sem dev-client) **completo**: M08, M13, M11, M12 todos `[ok]`. Próximo bloco: backend Python (MOB-bridge-1 → 2 → 3) destrava M10 e M14.

**Próxima sprint executável:** backend `MOB-bridge-1` no repo `~/Desenvolvimento/protocolo-ouroboros/`. Sessão separada (repo Python) ou pular para **M15 (Settings)** que é independente.
