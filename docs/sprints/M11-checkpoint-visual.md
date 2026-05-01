# Sprint M11 — Checkpoint Visual

```
DATA: 2026-05-01
EXECUTOR: agente executor-sprint (a87ff396644d66983)
ORQUESTRADOR: Claude principal
DECISÃO: APROVADO
```

## Camada A — Agente executor (playwright headless 412x900)

5 screenshots:

- `A-01-tab-treinos-empty.png` — Header "Memórias", tabs Treinos/Fotos/Marcos com underline purple ativa em Treinos, heatmap 13x7 bg-elev (91 cells), hoje destacado outline purple, legenda "Menos / Mais", EmptyState "Vai aparecer aqui assim que você treinar."
- `A-04-tab-marcos-empty.png` — Tab Marcos ativa, EmptyState "Marcos vão aparecer com o tempo."
- `A-06-tab-fotos-galeria.png` — Tab Fotos ativa, EmptyState "Suas fotos vão aparecer aqui conforme você registrar."
- `A-07-sheet-novo-treino.png` — SheetNovoTreino aberto: ROTINA + Slider duração + ChipGroup exercícios (vazio em Vault mock) + OBSERVAÇÕES + Salvar/Cancelar.
- `A-08-sheet-novo-marco.png` — SheetNovoMarco aberto: DESCRIÇÃO + ChipGroup tags [Treino/Consistência/Emocional/Vitória/Retomada] + Salvar/Cancelar.

Acentuação 100% correta nos screenshots.

## Camada V — Validação cruzada via claude-in-chrome MCP

Mínima nesta sprint: o agente já capturou em viewport mobile correto via playwright. Como Vault em web é mock localStorage, fluxos CRUD reais com SAF só rodam em Nível B/C. Aceito Camada A como suficiente.

## Smoke runtime

```
anonimato:    OK
typecheck:    0 erros
testes:       517 passing (68 suites)  [+80 vs baseline 437]
smoke.sh:     OK
expo export:  ~7.75 MB Hermes Android
```

## Integração ao projeto (CONTRACT §2)

- [ok] `app/(tabs)/memoria.tsx` substitui o redirect-stub da M00.5; renderiza `<MemoriasScreen>` com 3 tabs internas.
- [ok] Schemas `TreinoSessaoSchema`, `MarcoSchema`, `ExercicioSessaoSchema`, `MarcoOrigemSchema` exportados via barrel.
- [ok] Helpers de Vault (`listarTreinos`, `escreverTreino`, `excluirTreino`, idem para marcos) exportados.
- [ok] Paths (`treinosPath`, `marcosPath`) exportados.
- [ok] Boot hooks: `migrarDraftsParaTreinoSessao` + `verificarMarcosAuto` plugados em `BOOT_HOOKS`.
- [ok] FAB sem mudança (cada sub-tab tem `+` próprio).
- [ok] Settings sem dependência.

## Decisões implementadas (spec §10)

- [ok] Aba Fotos como galeria agregada (estrutura pronta para crescer com M06.5 e M12)
- [ok] CRUD treinos+marcos completo (criar, editar, duplicar, excluir lixeira soft)
- [ok] Marcos auto: 5 critérios + dedup por hash SHA-256 12 chars
- [ok] Migração drafts da M13: idempotente, plugada em BOOT_HOOKS antes de verificarMarcosAuto
- [ok] Carga drop set: cargas separadas por série quando há variação
- [ok] HeatmapBase abstrato com paleta prop (futura reutilização em M10)

## Achados colaterais

Nenhum bug pré-existente. Anotações operacionais:

1. **Armadilha A13 reincidiu** durante `npm install --no-save playwright` para captura visual. Resolvido com `npm install -D react-test-renderer@19.1.0 --legacy-peer-deps` conforme A13 do BRIEF. package.json/lock limpos no final.
2. **Galeria agregada** lê só de `eventos/` hoje. Hook estruturado para crescer sem mudança quando M06.5 (audio/foto em diário) e M12 (medidas) chegarem.

## Decisão final

**APROVADO.** M11 entrega Memórias + CRUD treinos/marcos + galeria agregada + marcos auto-gerados + migração drafts M13. M11.5 desbloqueada (cooperativo com MOB-bridge-3 quando chegar).

**Próxima sprint executável:** [M12 — Medidas Corporais e Comparativo](M12-spec.md).
