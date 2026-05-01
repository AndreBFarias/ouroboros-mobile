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
| `[ok]` | M06.X | Estender DiarioEmocionalSchema com contexto_social | — | diario_emocional | 0,5h | `7bbb8b3` |
| `[todo]` | M06.5 | F-14 Microfone (bloqueado por dev-client EAS) | 18 | diario_emocional + audio | 5-7h | — |
| `[ok]` | M07 | Eventos com lugar (Tela 20) | 20 | evento | 5h | `9deb590` |
| `[ok]` | M00.5 | Infraestrutura: tabs, barrels, EAS, boot hooks | — | — | 4-5h | `9c3e28c` |
| `[ok]` | M00.6 | Polish web Dracula + snap presets + mockup HTML 24 telas | — | — | 3-4h | `ae16a40` |
| `[ok]` | M08 | Share Intent Receiver Tela 17 (8 subtipos + InboxArquivoSchema) | 17 | inbox_arquivo | 4-5h | `9202273` |
| `[ok]` | M13 | Galeria + Detalhe + Cadastro Exercícios CRUD (Telas 02/07/08) | 02, 07, 08 | exercicio | 8-10h | `82cc519` |
| `[ok]` | M11 | Memórias + CRUD treinos/marcos + galeria agregada + marcos auto | 09, 10, 11 | treino_sessao, marco | 8-10h | `ca77ed3` |
| `[ok]` | M12 | Medidas Corporais Telas 12/13 + integração galeria M11 | 12, 13 | medidas | 5-6h | `d6a2b43` |
| `[ok]` | M15 | Settings 7 grupos + biometria + export ZIP + toggles reativos | 23 | (vários) | 7-8h | `27f6bbd` |
| `[ok]` | M14.5 | Ciclo Menstrual opt-in (calendário fases + tom sóbrio) | nova | ciclo_menstrual | 5-6h | `5a6e578` |
| `[ok]` | M16 | Alarme Pessoal opt-in (snooze + sons CC0 + Android 12+) | nova | alarme | 5-6h | `739b993` |
| `[ok]` | M17 | To-do leve opt-in (drag&drop + busca + lixeira soft) | nova | tarefa | 4-5h | `2c3fbf6` |
| `[ok]` | M18 | Contador "Dias sem X" opt-in (histórico + sem celebração) | nova | contador | 4h | `3989851` |
| `[ok]` | M20 | Widget Homescreen Android (módulo Expo nativo + 2 layouts + bridge JS + helper TS + 10 testes) | 26 | — | 6-7h | `9c1851f` |
| `[ok]` | M20.1 | Fix gitignore — recuperar módulo Android excluído por `android/` genérico | — | — | 0,2h | `40efd06` |
| `[todo]` | M00.5.x | Fix Rules of Hooks em `(tabs)/index.tsx:81` (achado colateral M00.5) | — | — | 2h | — |
| `[todo]` | M19.x | Bundle HTML toolchain regenerar (achado colateral M00.6) | — | — | 3h | — |
| `[todo]` | M20.x | Validação Nível B/C real do widget na home (após `npm run build:dev`) | 26 | — | 1-2h | — |
| `[todo]` | M06.5 | F-14 Microfone (transcrição on-device) | 18 | diario_emocional + audio | 5-7h | — |
| `[todo]` | M07.x | Conquistas com mídia obrigatória (4 tipos) | 18, 20 | diario_emocional, evento, midia | 5-7h | — |
| `[todo]` | M08 | Share Intent Receiver (flow PIX <5s) | 17 | inbox_arquivo + financeiro | 4-5h | — |
| `[todo]` | M09 | Scanner OCR + multipágina + bairro auto | 16 | financeiro_nota | 7-9h | — |
| `[todo]` | M10 | Mini Humor (heatmap 90 dias + tooltip + stale banner) | 21 | humor_heatmap_cache | 4-5h | — |
| `[todo]` | M11 | Memórias e Marcos (CRUD completo + galeria fotos agregada) | 09, 10, 11 | treino_sessao, marco | 8-10h | — |
| `[todo]` | M11.5 | Calendário visual de conquistas (oEmbed + filtros) | 25 | evento, diario_emocional + media | 5-7h | — |
| `[todo]` | M12 | Medidas (form + comparativo) | 12, 13 | medidas | 5-6h | — |
| `[todo]` | M13 | Galeria + Detalhe + Cadastro Exercícios (CRUD) | 07, 08, 02 | exercicio | 8-10h | — |
| `[todo]` | M14 | Mini Financeiro (read-only) | 22 | financas_cache | 4-5h | — |
| `[todo]` | M14.5 | Acompanhador de Ciclo Menstrual (opt-in) | nova | ciclo_menstrual | 5-6h | — |
| `[todo]` | M15 | Settings (7 grupos + biometria + export) | 23 | (vários) | 7-8h | — |
| `[todo]` | M16 | F-15 Alarme pessoal opt-in (com snooze + actions) | nova | alarme | 5-6h | — |
| `[todo]` | M17 | F-16 To-do leve opt-in (com drag&drop + busca) | nova | tarefa | 4-5h | — |
| `[todo]` | M18 | F-17 Contador "dias sem X" opt-in (com histórico) | nova | contador | 4h | — |
| `[todo]` | M19 | APK Release Hardening v1.0.0 (icon + splash + E2E + tag) | — | — | 6-8h | — |
| `[done]` | — | **MVP v1 fechado** | — | — | — | tag `v1.0.0` |

## Backend paralelo (repo `protocolo-ouroboros`)

| Status | Sprint | Título | Bloqueia |
|---|---|---|---|
| `[para]` `[todo]` | MOB-bridge-1 | Refactor `pessoa_a`/`pessoa_b` no Python | MOB-bridge-2, MOB-bridge-3 |
| `[para]` `[todo]` | MOB-bridge-2 | Caches `humor-heatmap.json` e `financas-cache.json` | M10, M14 |
| `[para]` `[todo]` | MOB-bridge-3 | Marcos auto-gerados via heurísticas (5 tipos) | M11 (cooperativo, fallback client) |

Specs em `docs/sprints/backend/`.

## Dependências críticas e ordem de execução

### Caminho linear recomendado

```
1. M00.5 (infra: tabs/barrels/eas/boot)
2. M00.6 (polish web + snap presets + mockup HTML)
   |
   +---> [BACKEND PARALELO em outro repo]
   |     MOB-bridge-1 -> MOB-bridge-2 -> MOB-bridge-3
   |
3. M08 (share intent — sem dev-client)
4. M13 (exercícios CRUD + Tela 02; REMOVE app/em-breve.tsx)
5. M11 (memórias usa ChipGroup de exercícios da M13)
6. M12 (medidas)
7. M10 (mini humor — precisa MOB-bridge-2)
8. M14 (mini financeiro — precisa MOB-bridge-2)
9. M15 (settings: hub central + biometria + export ZIP)
10. M14.5 (ciclo opt-in)
11. M16 (alarme opt-in com snooze)
12. M17 (todo opt-in com drag&drop)
13. M18 (contador opt-in com histórico)
14. M06.5 (microfone — primeira a usar dev-client)
15. M07.x (mídia obrigatória — depende M06.5)
16. M11.5 (calendário conquistas — depende M07.x e M11)
17. M09 (scanner — dev-client; pode rodar paralelo a M06.5)
18. M20 (widget homescreen — depende M15 toggle)
19. M19 (APK Release v1.0.0; tag git)
```

### Grafo de dependências por bloco

```
M01 -> M02 -> M03 -> M00.docs -> M04 -> M05 -> M06 -> M07 (já feitos)

[Bloco 1 — Infraestrutura]
M00.5 -> M00.6

[Bloco 2 — Captura ativa sem dev-client]
M00.5 -> M08
M00.5 -> M13 -> M11
M00.5 -> M12

[Bloco 3 — Backend (paralelo, repo protocolo-ouroboros)]
MOB-bridge-1 -> MOB-bridge-2 -> {M10, M14}
MOB-bridge-1 -> MOB-bridge-3 -> M11 (cooperativo, fallback client)

[Bloco 4 — Cache readers]
MOB-bridge-2 -> M10 -> M14

[Bloco 5 — Settings + opt-ins]
M00.5 (shape) + M02 + M03 -> M15
M15 -> {M14.5, M16, M17, M18}

[Bloco 6 — Dev-client features]
M06 + dev-client -> M06.5 -> M07.x -> M11.5
M00.5 (eas.json) + dev-client -> M09

[Bloco 7 — Release final]
M00.6 (Tela 26) + M15 (toggle) -> M20
TUDO acima -> M19 (tag v1.0.0)
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
Em 2026-04-30 também foram promovidas a v1: widget homescreen (M20),
calendário visual (M11.5), CRUD completo de exercícios e treinos
(M11+M13), histórico de resets (M18), drag&drop e busca de tarefas
(M17), snooze de alarme (M16). Nada permanece como v2.

## Tags Git

- `v0.1.0-m01` — Fundação Estética concluída (M01 fim).
- `v0.2.0-m00-docs` (planejada) — Orquestração mestre concluída (M00.docs fim).
- `v1.0.0` (planejada) — MVP v1 fechado (M19 fim).

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
