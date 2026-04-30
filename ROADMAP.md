# Roadmap — Ouroboros Mobile

Mapa canônico de todas as sprints do projeto. Atualizado a cada
fechamento de sprint.

## Como ler este arquivo

- **Status**:
  - `[ok]` — sprint concluída e mergeada em `main`
  - `[wip]` — sprint em execução agora
  - `[todo]` — planejada, ainda não iniciada
  - `[v2]` — fora do escopo do MVP v1
  - `[para]` — sprint paralela em outro repositório

- **Numeração**:
  - `MNN` — sprint inteira (M04, M05, ...)
  - `MNN.x` — sub-sprint de fix da sprint mãe (M03.1, M03.2, ...)
  - `MNN.5` — sprint intermediária inserida no roadmap (M06.5, M11.5,
    M14.5)
  - `MNN.x` (literal) — feature transversal que afeta múltiplas
    sprints (M07.x)

- **Coluna "Telas"**: número da tela em
  `docs/Ouroboros_22_telas-standalone.html` (mockup canônico).

- **Coluna "Schemas"**: schemas YAML do Vault tocados pela sprint
  (criados ou consumidos), conforme `docs/BRIEFING.md` §7.

## Linha do tempo

| Status | Sprint | Título | Telas | Schemas | Estimativa | Commit / Tag |
|---|---|---|---|---|---|---|
| `[ok]` | Fase 0 | Bootstrap repo | — | — | 1-2h | `b26c973` |
| `[ok]` | M01 | Fundação Estética (15 componentes UI premium) | — | — | 16h | `v0.1.0-m01` |
| `[ok]` | M02 | Vault Bridge + Tela 01 (hoje) | 01 | humor, evento, diario_emocional | 4h | `8cbfbb9` |
| `[ok]` | M02.1 | Fix loop infinito useHoje + labels FAB | 01, 14 | — | 1h | `3071c98`, `6f20df2` |
| `[ok]` | M03 | Onboarding 4 frames + identidade dinâmica | 24 | — | 4h | `35aaa1d` |
| `[ok]` | M03.x | Família de fixes (M03.1 → M03.7) | 24, 14 | — | 5h cumulativos | ver `docs/sprints/M03.x-fixes-consolidados.md` |
| `[ok]` | M00.docs | Orquestração e documentação mestre | — | — | 4h | `1ab70b7` |
| `[ok]` | M04 | FAB Radial integrado | 14 | — | 2h | `4e10f25` |
| `[ok]` | M05 | Humor Rápido (flow alvo <30s) | 15 | humor | 4h | `7da843c` |
| `[ok]` | M05.2 | Estender Input com autoCapitalize/keyboardType | — | — | 0,5h | `13b5659` |
| `[ok]` | M06 | Diário Emocional (trigger / vitória) | 18 | diario_emocional | 5h | `9d63e1c` |
| `[todo]` | M06.X | Estender DiarioEmocionalSchema com contexto_social | — | diario_emocional | 1h | — |
| `[todo]` | M06 | Diário Emocional (modo trigger / vitória) | 18 | diario_emocional | 5h | — |
| `[todo]` | M06.5 | F-14 Microfone (transcrição on-device) | 18 | diario_emocional + audio | 4h | — |
| `[todo]` | M07 | Eventos com lugar (flow <25s) | 20 | evento | 4h | — |
| `[todo]` | M07.x | Conquistas com mídia obrigatória | 18, 20 | diario_emocional, evento | 5h | — |
| `[todo]` | M08 | Share Intent Receiver (flow PIX <5s) | 17 | financeiro | 4h | — |
| `[todo]` | M09 | Scanner OCR (ML Kit on-device) | 16 | financeiro | 6h | — |
| `[todo]` | M10 | Mini Humor (heatmap 90 dias) | 21 | humor + cache | 4h | — |
| `[todo]` | M11 | Memórias e Marcos | 09, 10, 11 | treino_sessao, marco | 5h | — |
| `[todo]` | M11.5 | Calendário visual de conquistas | 25 (nova) | evento, diario_emocional + media | 5h | — |
| `[todo]` | M12 | Medidas (form + comparativo) | 12, 13 | medidas | 4h | — |
| `[todo]` | M13 | Galeria e Detalhe Exercício | 07, 08 | exercicio | 4h | — |
| `[todo]` | M14 | Mini Financeiro (read-only) | 22 | financeiro + cache | 3h | — |
| `[todo]` | M14.5 | Acompanhador de Ciclo Menstrual (opt-in) | 26 (nova) | ciclo_menstrual | 4h | — |
| `[todo]` | M15 | Settings | 23 | (vários) | 5h | — |
| `[todo]` | M16 | F-15 Alarme pessoal (opt-in) | nova | alarme | 4h | — |
| `[todo]` | M17 | F-16 To-do leve (opt-in) | nova | tarefa | 3h | — |
| `[todo]` | M18 | F-17 Contador "dias sem X" (opt-in) | nova | contador | 3h | — |
| `[done]` | — | **MVP v1 fechado** | — | — | — | — |
| `[v2]` | v2 | Widgets de homescreen, Obsidian Sync nativo, etc. | — | — | — | — |

## Backend paralelo (repo `protocolo-ouroboros`)

| Status | Sprint | Título | Bloqueia |
|---|---|---|---|
| `[para]` `[todo]` | MOB-bridge-1 | Refactor `pessoa_a`/`pessoa_b` no Python | nada (paralelo) |
| `[para]` `[todo]` | MOB-bridge-2 | Caches `humor-heatmap.json` e `financas-cache.json` | M10, M14 |

Specs em `docs/sprints/backend/`.

## Dependências críticas

```
M01 -> M02 -> M03 -> M00.docs -> M04 -> M05 -> M06 -> M07
                                              |     |
                                              +-> M06.5 (paralelo a M07)
                                              |
                                              +-> M07.x (transversal)
                                                    |
                                                    +-> M11.5

M02 -> M08 (independente)
M02 -> M09 (precisa dev-client)
MOB-bridge-2 -> M10
MOB-bridge-2 -> M14
M11 -> M11.5
M03 -> M15 (Settings precisa do onboarding feito)
M15 -> M14.5 (ativação opt-in via Settings)
M15 -> M16, M17, M18 (idem)
```

## Funções F-14 a F-17 (Seção E do BRIEFING)

| Função | Sprint | Status |
|---|---|---|
| F-14 Microfone | M06.5 | `[todo]` (promovido a v1) |
| F-15 Alarme pessoal | M16 | `[todo]` (promovido a v1) |
| F-16 To-do leve | M17 | `[todo]` (promovido a v1) |
| F-17 Contador "dias sem X" | M18 | `[todo]` (promovido a v1) |

Originalmente o BRIEFING marcava as 4 como v2. Decisão durante M00.docs:
todas entram em v1 como sprints opt-in (toggle em Settings da M15).

## Tags Git

- `v0.1.0-m01` — Fundação Estética concluída (M01 fim).
- `v0.2.0-m00-docs` (planejada) — Orquestração mestre concluída (M00.docs fim).
- `v1.0.0` (planejada) — MVP v1 fechado (M18 fim).

## Onde está cada coisa

| Pergunta | Onde achar |
|---|---|
| Onde estamos agora? | `STATE.md` |
| Como retomo o trabalho? | `HOW_TO_RESUME.md` |
| Por que decidiram X? | `docs/ADRs/<NNNN>-<slug>.md` |
| O que essa sprint entrega? | `docs/sprints/MNN-spec.md` |
| Quais regras invioláveis? | `CLAUDE.md`, `VALIDATOR_BRIEF.md` |
| Mockup visual de cada tela | `docs/Ouroboros_22_telas-standalone.html` |
| Schemas YAML completos | `docs/BRIEFING.md` §7 |
| Política de validação A/B/C | `VALIDATOR_BRIEF.md` §1.9 |
| Histórico de fixes | `CHANGELOG.md` + `docs/sprints/M03.x-fixes-consolidados.md` |
