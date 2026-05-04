# Roadmap — Ouroboros Mobile

Mapa canônico de todas as sprints do projeto. Atualizado a cada
fechamento de sprint.

> **Mapa funcional do app:**
> [`docs/FEATURES-CANONICAS.md`](docs/FEATURES-CANONICAS.md)
> consolida o que cada sprint entrega na perspectiva do usuário
> final. Toda sprint que introduz/modifica/remove feature deve
> atualizar esse arquivo no mesmo commit.

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
  `docs/Ouroboros_24_telas-standalone.html` (mockup canônico).

- **Coluna "Schemas"**: schemas YAML do Vault tocados pela sprint
  (criados ou consumidos), conforme `docs/BRIEFING.md` §7.

## Fila de execução (ordem priorizada — 2026-05-04)

Próximas sprints **a executar em ordem**, todas com spec já
materializada em `docs/sprints/`. Orquestrador Opus deve
processar uma a uma via ciclo padrão (planejador → executor →
validador via Gauntlet → commit/push). Ambíguidade em qualquer
spec PARA o ciclo e pede clarificação.

| Posição | Sprint | Título | Spec | Estimativa |
|---|---|---|---|---|
| ~~1~~ | ~~M11.1~~ | ~~Memórias usável~~ — **fechada 2026-05-04** (1136/133, 4 screenshots Gauntlet) | `M11.1-spec.md` | — |
| ~~2~~ | ~~M-GAUNTLET-AUDITORIA~~ | ~~Auditoria externa~~ — **fechada 2026-05-04** | `M-GAUNTLET-AUDITORIA-spec.md` | — |
| ~~1~~ | ~~M27.3~~ | ~~Boot screen sem oscilar~~ — **fechada 2026-05-04** (1143/134, boot 183ms, 0 transições) | `M27.3-spec.md` | — |
| ~~1~~ | ~~M-GAUNTLET-LEAK-CHECK~~ | ~~Script CI~~ — **fechada 2026-05-04** com achado crítico (vazamento revelado). M-GAUNTLET-DEAD-CODE-V2 corretiva criada | `M-GAUNTLET-LEAK-CHECK-spec.md` | — |
| ~~1.6~~ | ~~M-GAUNTLET-SEED-V2~~ | ~~Fixtures realistas~~ — **fechada 2026-05-04** (1157/135) | `M-GAUNTLET-SEED-V2-spec.md` | — |
| ~~1.7~~ | ~~M-GAUNTLET-FAST-BOOT~~ | ~~Pré-cache JetBrainsMono~~ — **fechada com ressalva 2026-05-04** (M-GAUNTLET-FAST-BOOT-FOLLOWUP corretiva) | `M-GAUNTLET-FAST-BOOT-spec.md` | — |
| ~~4~~ | ~~M29~~ | ~~Settings v2~~ — **fechada 2026-05-04** (1162/135) | `M29-spec.md` | — |
| ~~5~~ | ~~M30~~ | ~~AlarmeSchema v2~~ — **fechada 2026-05-04** (1177/136) | `M30-spec.md` | — |
| ~~6~~ | ~~M31~~ | ~~TarefaSchema v2~~ — **fechada 2026-05-04** (1207/136, bundle 8.5 MB) | `M31-spec.md` | — |
| ~~7~~ | ~~M32~~ | ~~Contador v2~~ — **fechada 2026-05-04** (1221/137) | `M32-spec.md` | — |
| ~~8~~ | ~~M33~~ | ~~Campo `para`~~ — **fechada 2026-05-04** (1257/138) | `M33-spec.md` | — |
| ~~9~~ | ~~M34~~ | ~~MenuCapturaVerde tab Memórias~~ — **fechada 2026-05-04** (1289/144, 5 screenshots Gauntlet, 3 sub-sprints colaterais M34.1/M34.2/M11.3) | `M34-spec.md` | — |
| ~~10~~ | ~~M11.3~~ | ~~useLarguraFrame~~ — **fechada 2026-05-04** (1292/145, hook web→412 / native→dim.width, 3 consumidores migrados, sub-sprint M-SLIDER-WEB-LOOP criada) | `M11.3-spec.md` | — |
| ~~11~~ | ~~M-SLIDER-WEB-LOOP~~ | ~~Wrapper Slider web/native~~ — **fechada 2026-05-04** (1293/145, `<input type="range">` em web, RNSlider em native, /medidas + /humor-rapido sem loop) | `M-SLIDER-WEB-LOOP-spec.md` | — |
| ~~12~~ | ~~M34.3~~ | ~~FAB verde unificado~~ — **fechada 2026-05-04** (1293/145, FABs próprios removidos, 5 itens no sheet com Adicionar marco/foto/treino contextual + 4 captura, bundle 8.44 MB) | `M34.3-spec.md` | — |
| ~~13~~ | ~~M34.1~~ | ~~BottomSheet zIndex 100~~ — **fechada com ressalva 2026-05-04** (z-index aplicado, residual visual via M34.1.1) | `M34.1-spec.md` | — |
| ~~14~~ | ~~M34.1.1~~ | ~~FAB esconde quando MenuCapturaVerde abre~~ — **fechada 2026-05-04** (1300/145, flag sheetCapturaAberto, FAB confirmadamente ausente em sheet aberto) | `M34.1.1-spec.md` | — |
| ~~15~~ | ~~M34.2~~ | ~~Button variant primary contraste~~ — **fechada 2026-05-04** (bug sistêmico NativeWind+MotiView, fix style direto, ratio 7.5:1) | `M34.2-spec.md` | — |
| ~~16~~ | ~~M01.7~~ | ~~Button accessibilityLabel desacoplado~~ — **fechada 2026-05-04** (1298/145, label aceita ReactNode) | `M01.7-spec.md` | — |
| ~~17~~ | ~~M11.2~~ | ~~useGaleriaMock useEffect~~ — **fechada 2026-05-04** (subscribe + GAUNTLET_ATIVO guard) | `M11.2-spec.md` | — |
| ~~18~~ | ~~M27.4~~ | ~~SessaoBootGate latch~~ — **fechada 2026-05-04** (bootPronto fast-path) | `M27.4-spec.md` | — |
| ~~19~~ | ~~M-DEBITO-UI-UX-SEED-DUO~~ | ~~3 fixes consolidados~~ — **fechada 2026-05-04** (chip Outro ghost, KeyboardAvoidingView contadores/novo, AnimatePresence toggle alarme) | `M-DEBITO-UI-UX-SEED-DUO-spec.md` | — |
| 19.1 | **M-DEBITO-CATEGORIA-CORES** | 8 categorias de tarefa todas com accent='orange' — atribuir cores Dracula semânticas | `M-DEBITO-CATEGORIA-CORES-spec.md` | 0,5-1h |
| ~~19~~ | ~~M-GAUNTLET-FAST-BOOT-FOLLOWUP~~ | ~~`+html.tsx` aplicar em build estático~~ — **fechada NÃO-FIX 2026-05-04** (aguardar SDK 55+) | `M-GAUNTLET-FAST-BOOT-FOLLOWUP-spec.md` | 1-2h |
| 20 | **M-CAPTURA-UNIFICADA** | Rota `/captura` ramifica Câmera do MenuLateral em "Registrar momento" e "Escanear documento". Pré-M09 = empty state honesto. **Bloqueia M41** | `M-CAPTURA-UNIFICADA-spec.md` | 2-3h |
| 21 | **M-GAUNTLET-DEAD-CODE-V2** | Refactor `gauntletBootstrap.ts` lazy require — bytecode Android sem `__gauntlet`. **Bloqueia M41** | `M-GAUNTLET-DEAD-CODE-V2-spec.md` | 4-6h |
| 12 | M35 | Aba Finanças "Em desenvolvimento" honesto (será absorvido por M-CAPTURA-UNIFICADA empty state caminho documento) | `M35-spec.md` | 1-2h |
| 13 | M36 | Tela Recap (agregação Conquistas/Crises/Evoluções/Números) | `M36-spec.md` | 6-8h |
| 12 | M37.1 | Google Calendar OAuth + leitura | `M37.1-spec.md` | 6-7h (PAUSA para usuário) |
| 13 | M37.2 | Google Calendar escrita | `M37.2-spec.md` | 4-5h |
| 14 | M38 | Conflict resolution para 4 dispositivos via deviceId | `M38-spec.md` | 4-5h |
| 15 | M39 | (próximas — verificar em ROADMAP body abaixo) | — | — |
| ... | M40 | ... | — | — |
| ... | M41 | Release final v1.0.0 (PAUSA para usuário) | `M41-spec.md` | — |

**Sprints checkpoint visual paralelas** (rodar em paralelo, baixa
prioridade, requerem emulador ou APK dev-client):

| Sprint | Título | Spec | Estimativa |
|---|---|---|---|
| M10-checkpoint-visual | Heatmap em runtime Android real | `M10-checkpoint-visual-spec.md` | 0,5-1h |
| M14-checkpoint-visual | Mini Financeiro em runtime Android real | `M14-checkpoint-visual-spec.md` | 0,5-1h |
| M20.x | Validação Nível B widget homescreen | `M20.x-spec.md` | 1-2h |

**Sprint paralela em outro repositório** (Backend Python):

| Sprint | Título | Spec | Estimativa |
|---|---|---|---|
| M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL | Acentuação PT-BR no Python | `M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL-spec.md` | 0,5h |

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
| `[ok]` | M00.5.x | Fix Rules of Hooks em `(tabs)/index.tsx:81` — hook movido para topo antes dos early returns; ESLint exit 0 prova fix | — | — | 0,3h | `1f7ac8a` |
| `[ok]` | INFRA-acentuacao-comentarios | Varrer `app/` e `src/` corrigindo comentários PT-BR sem acento — 145 arquivos, 715 substituições 1:1, residual 3 (paths legítimos sem acento), redução 99.3% | — | — | 3h | `a792156` |
| `[ok]` | M19.x | Inventário de mockups + stub build-mockups + seção CONTEXTO §7.1 (fechada parcialmente; toolchain JSX→HTML completa fica para M19 final) | — | — | 1,5h | `ce0b187` |
| `[todo]` | M20.x | Validação Nível B real do widget no emulador `ouroboros-test` (4 screenshots: 4x2, 4x4, pós-humor, toggle off) | 26 | — | 1-2h | `M20.x-spec.md` |
| `[todo]` | M06.5 | F-14 Microfone (transcrição on-device) | 18 | diario_emocional + audio | 5-7h | — |
| `[todo]` | M07.x | Conquistas com mídia obrigatória (4 tipos) | 18, 20 | diario_emocional, evento, midia | 5-7h | — |
| `[todo]` | M08 | Share Intent Receiver (flow PIX <5s) | 17 | inbox_arquivo + financeiro | 4-5h | — |
| `[todo]` | M09 | Scanner OCR + multipágina + bairro auto | 16 | financeiro_nota | 7-9h | — |
| `[ok]` | M10 | Mini Humor Tela 21 — heatmap 13x7 (91 dias), modo sobreposto pessoa_a+pessoa_b 50% opacity, stats 30d, modal detalhe dia, empty state. Cache readonly via SAF (ADR-0012). +23 testes (889→912 / 100→103 suites). Validacao Nivel A capturou empty state (SAF Android-only); render colorido fica para M10-checkpoint-visual em Nivel B/C | 21 | humor_heatmap_cache | 4-5h | `b98458e` |
| `[todo]` | M10-checkpoint-visual | Capturar 4 screenshots em Nível B (emulador) com cache real: heatmap pessoa_a, heatmap pessoa_b, modo sobreposto, DiaHumorModal | 21 | — | 0,5-1h | `M10-checkpoint-visual-spec.md` |
| `[todo]` | M11 | Memórias e Marcos (CRUD completo + galeria fotos agregada) | 09, 10, 11 | treino_sessao, marco | 8-10h | — |
| `[todo]` | M11.5 | Calendário visual de conquistas (oEmbed + filtros) | 25 | evento, diario_emocional + media | 5-7h | — |
| `[todo]` | M12 | Medidas (form + comparativo) | 12, 13 | medidas | 5-6h | — |
| `[todo]` | M13 | Galeria + Detalhe + Cadastro Exercícios (CRUD) | 07, 08, 02 | exercicio | 8-10h | — |
| `[ok]` | M14 | Mini Financeiro Tela 22 readonly — header laranja, banner modo leitura, CardHero (gasto semana cyan + delta), top 5 categorias com barras, lista virtualizada de 20 últimas transações (despesa cyan, crédito green), empty state, hook `useFinancasCache`, fixture web. +25 testes (912→937 / 103→108 suites). Reader em `src/lib/cache/` (uniformidade canônica com M10). Validação Nível A capturou render real via fixture | 22 | financas_cache | 4-5h | `29f0472` |
| `[todo]` | M14-checkpoint-visual | Capturar 4 screenshots em Nível B com cache real: hero gasto semana, categorias, lista transações, banner modo leitura | 22 | — | 0,5-1h | `M14-checkpoint-visual-spec.md` |
| `[todo]` `[para]` | M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL | Backend Python: corrigir `delta_textual` para emitir acentuação PT-BR completa | 22 | financas_cache | 0,5h | `M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL-spec.md` |
| `[ok]` | M14.1 | Micro-fix: warning eslint `unused-disable` em `src/lib/hooks/useFinancasCache.ts:40` (disable do `no-require-imports` sem problema reportado). Remoção trivial. Fechado 2026-05-03 no ciclo corretivo M14.1+M25.1+M27.1 | — | — | 0,1h | — |
| `[todo]` | M14.5 | Acompanhador de Ciclo Menstrual (opt-in) | nova | ciclo_menstrual | 5-6h | — |
| `[todo]` | M15 | Settings (7 grupos + biometria + export) | 23 | (vários) | 7-8h | — |
| `[todo]` | M16 | F-15 Alarme pessoal opt-in (com snooze + actions) | nova | alarme | 5-6h | — |
| `[todo]` | M17 | F-16 To-do leve opt-in (com drag&drop + busca) | nova | tarefa | 4-5h | — |
| `[todo]` | M18 | F-17 Contador "dias sem X" opt-in (com histórico) | nova | contador | 4h | — |
| `[ok]` | M19 | APK Release Hardening v1.0.0-rc1 — RETIRADO em 2026-05-02 (refundação M21-M41). 1057 testes / 121 suites. APK preservado em `builds/` localmente. | — | — | 6-8h | tag `v1.0.0` (mantida) |
| `[done]` | — | **MVP v1.0-rc1 retirado — refundação em curso** | — | — | — | — |

## Refundação v1.0 (2026-05-02 → fechamento M41)

### Infraestrutura de validação (bloqueia M29 em diante)

| Status | Sprint | Título | Telas | Schemas | Estimativa | Spec |
|---|---|---|---|---|---|---|
| `[ok]` | M-GAUNTLET | Teste visual unificado em Chrome controlável. `src/lib/dev/gauntlet.ts` com `GAUNTLET_ATIVO = Platform.OS === 'web' && __DEV__` (dead-code em release mobile, verificado: bundle export sem `__gauntlet`). `window.__gauntlet` com 11 APIs (`seed`/`reset`/`setNomes`/`setVaultRoot`/`setOnboardingDone`/`setUltimaRota`/`abrir`/`abrirMenu`/`fecharMenu`/`abrirSheet`/`estado`). `BiometriaGate` ganha prop `bypass`. `FrameMobileGauntlet` em `_layout.tsx` raiz envolve TODAS as rotas em modo dev em container 412×892dp centralizado. `/_dev/_layout.tsx` com banner amarelo + `/_dev/gauntlet.tsx` dashboard com 5 botões coloridos + JSON estado auto-refresh + lista de rotas. `tests/e2e/playwright/00-bootstrap.e2e.ts` + template. `docs/GAUNTLET.md` documentação completa. Métricas: 1126/130 mantidas, bundle Hermes 8.75 MB | — | — | 6-8h | `M-GAUNTLET-spec.md` |
| `[ok]` | M-REVALIDACAO-M20-M28 | Revalidação executada via Gauntlet em 2026-05-03. 11 casos E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`. Resultado: 5 PASS (M22, M23, M25, M27, M28), 3 FAIL (M24, M25.1, M27.1), 2 INCONCLUSIVO (M20 widget Android, M26 sheets — exigem Nível B). Relatório em `docs/validacao-gauntlet-2026-05-03/RELATORIO.md`. **3 sprints corretivas geradas (M24.1, M25.2, M27.2) bloqueiam M29** | — | — | 4-6h | `M-REVALIDACAO-M20-M28-spec.md` |
| `[ok]` | M11.1 | Memórias usável. FAB Fotos (`adicionar foto`) com `expo-image-picker` em mobile e `__gauntlet.adicionarFotoMock()` em web/dev. Atalho "Cadastrar exercícios na Galeria" no empty state da aba Treinos navega para `/exercicios`. `<HeatmapBase>` envolto em container centralizado (`getBoundingClientRect()` confirma diff=0px no frame 412dp). Helper `adicionarFotoManual` com 3 caminhos (web/dev mock, web release no-op, mobile real). Store auxiliar `useGaleriaMock` (web-only). `lerGaleriaManual()` no `useFotosAgregadas` mescla mock por cima do Vault. `FotoOrigem` ganha `'galeria-manual'`. 3 E2E + 3 suítes Jest novas (+10 cases). 1126→1136 testes (+10), 130→133 suítes. 4 screenshots Gauntlet em `docs/sprints/M11.1-screenshots-gauntlet/` | — | — | 3-4h | `M11.1-spec.md` |
| `[ok]` | M-GAUNTLET-AUDITORIA | Auditoria externa cega do Gauntlet (30 itens / 7 seções). 4 SIM, 12 NÃO, 14 PARCIAL. Aplicados: guard `GAUNTLET_ATIVO` em cada método público, `bypass && __DEV__` no BiometriaGate, `gauntlet.sh` v2 (validação de PID, rotação de log, `setsid`/`kill -- -PGID`), 4 APIs novas (`aguardarBoot`/`tempoDeBoot`/`consoleErros`/`reset` v2), `app/_dev/showcase.tsx`, reset() em 11 E2E + template, seção Troubleshooting em GAUNTLET.md, V_BRIEF §1.9 sem ambiguidade. Sub-sprints: M-GAUNTLET-LEAK-CHECK, M-GAUNTLET-SEED-V2, M-GAUNTLET-FAST-BOOT. Tempo de boot medido: 187ms | — | — | 4-6h | `M-GAUNTLET-AUDITORIA-spec.md` |
| `[ok]` | M-GAUNTLET-LEAK-CHECK | Script `scripts/check_gauntlet_leak.sh` roda `expo export --platform android` e checa 6 marcadores em `_expo/static/js/android/*.hbc`. **Achado crítico revelado:** 5 dos 6 markers vazaram (causa raiz: `app/_layout.tsx` importa direto de `@/lib/dev/gauntlet`). Sprint corretiva `M-GAUNTLET-DEAD-CODE-V2-spec.md` criada (bloqueia M41) | — | — | 1-2h | `M-GAUNTLET-LEAK-CHECK-spec.md` |
| `[todo]` | M-GAUNTLET-DEAD-CODE-V2 | Refactor: `gauntletBootstrap.ts` com `require` lazy guardado por `__DEV__`. `app/_layout.tsx` substitui imports diretos. **Bloqueia M41 (release final)** | — | — | 4-6h | `M-GAUNTLET-DEAD-CODE-V2-spec.md` |
| `[ok]` | M-GAUNTLET-SEED-V2 | Fixtures determinísticas: humores-30d (33 registros), diarios-3 (trigger/vitória/reflexão), eventos-7. Stores mock isoladas (`humorMock`/`diarioMock`/`eventosMock`). API `seedComDados(fixture)` (16ª no `__gauntlet`). `useHumorHeatmap` assina mock. Validação Gauntlet: 23/91 células coloridas, "Média 30d: 3,6 Registros: 23/30". 1143→1157 testes (+14), 134→135 suítes. Bundle 8.79 MB | — | — | 3-4h | `M-GAUNTLET-SEED-V2-spec.md` |
| `[ok]` | M-GAUNTLET-FAST-BOOT | Pré-cache JetBrainsMono em `public/fonts/` (115 KB cada), CSS de flash inicial em `public/styles/`, `app/+html.tsx` com `<link rel="preload">`. Servidos pelo Metro (200). Em dev `+html.tsx` é ignorado (limitação Expo Router); sprint M-GAUNTLET-FAST-BOOT-FOLLOWUP investiga aplicar em build estático. tempoDeBoot 123ms | — | — | 2-3h | `M-GAUNTLET-FAST-BOOT-spec.md` |
| `[ok]` | M-GAUNTLET-FAST-BOOT-FOLLOWUP | **NÃO-FIX documentado (2026-05-04).** A: `web.output: "static"` quebra com `__extends` de `tslib` no SSR de `framer-motion` (via `moti@0.30`); B: `web.output: "single"` exporta mas `+html.tsx` não é lido (template padrão); C: injeção JS no `_layout` perde paralelismo. Decisão: aguardar Expo SDK 55+. Arquivos preload permanecem versionados (sem regressão). VALIDATOR_BRIEF §4 A23 registrada. | — | — | 1-2h | `M-GAUNTLET-FAST-BOOT-FOLLOWUP-spec.md` |
| `[ok]` | M-GAUNTLET-SEED-DUO | `aplicarSeed`/`aplicarSetNomes`/`aplicarReset` propagam `tipoCompanhia` para `useSettings.pessoa.tipoCompanhia` (canônico M29). Destrava validação visual de M31/M33 chips Para mim/X/casal. 1257→1260 testes (+3), 138→139 suítes | — | — | 0,5h | `M-GAUNTLET-SEED-DUO-spec.md` |
| `[ok]` | M24.1 | Resume state. `useUltimaRota` ignora o primeiro pathname após mount. Antes ele sobrescrevia `ultimaRota` antes do `SessaoBootGate` ler. Validação Gauntlet: `seed() + setUltimaRota('/memoria') + reload` abre `/memoria`. | — | — | 0,5h | (este ciclo) |
| `[ok]` | M25.2 | Animação Reanimated não rodava em SVG web. Fix: `OuroborosLoader.tsx` ganha bloco `requestAnimationFrame` (web only) que localiza `<g>` por `data-anim-id` + setAttribute('transform', ...) direto. Native mantém Reanimated. g3 medido em ~15°/s. | — | — | 1h | (este ciclo) |
| `[ok]` | M27.3 | Boot screen sem oscilar. Hook `useAppPronto` agrega `loaded` (useFonts) + `useHasHydrated` das 3 stores criticas (onboarding/vault/sessao). Latch via `useBootStatus` (zustand sem persist) — uma vez `true`, sempre `true`. `app/_layout.tsx` usa conditional render (não Suspense throw — decisão por seguranca em RN+Reanimated 4). `splashEsconderRef` garante `hideAsync` UMA vez. `marcarBootCompleto` sinalizado uma vez. Validação Gauntlet: boot 183ms, 0 transições do loader em 4 rotas (/, /humor, /settings, /memoria). 1136→1143 testes (+7), 133→134 suítes. Bundle Hermes 8.4 MB. Achado pré-existente: `SessaoBootGate` cascata em reset+navega rápido — sprint M27.4 sugerida | — | — | 4-6h | `M27.3-spec.md` |

### Linha principal

| Status | Sprint | Título | Telas | Schemas | Estimativa | Spec |
|---|---|---|---|---|---|---|
| `[ok]` | M21 | Despublicar release v1.0.0 do GitHub e marcar como rc1. Estado já alcançado (release deletado em sessão anterior; APK preservado em `builds/ouroboros-1.0.0-rc1.apk`; CHANGELOG/STATE/README atualizados na materialização) | — | — | 0,3h | commit `3708190` (materialização) |
| `[ok]` | M22 | Vault auto-criado em /sdcard/Documents/Ouroboros sem SAF (probe + fallback SAF + 19 subpastas + useEffect direto + mocks Jest dual CJS+ESM). +14 testes (1057→1071). Bundle Hermes 8.72 MB. Pendência R1 (screenshot Nível B/C) | — | — | 5-6h | M22-spec.md (commit pós) |
| `[ok]` | M23 | Onboarding 3 frames (remove Vault SAF e Sync). useOnboarding v2 sem syncMethod, indicador 3-segmentos, handleConcluir 3 caminhos (auto/saf-fallback/erro), 3 screenshots Nível A. +9 testes (1071→1080). Bundle Hermes 8.71 MB | 24 | — | 3-4h | M23-spec.md (commit pós) |
| `[ok]` | M24 | Resume state e auto-save de rascunhos. `useSessao` store novo (7 rascunhos + 4 permissões + `ultimaRota`); `useAutoSaveRascunho` debounced 500ms; `SessaoBootGate` useEffect direto; A20 cap 2000 chars + canário 1500B. +23 testes (1080→1103, 126 suites). Bundle Hermes 8.73 MB | — | — | 5-6h | M24-spec.md (commit pós) |
| `[ok]` | M25 | OuroborosLogo + OuroborosLoader SVG nativo. 4 anéis Reanimated 4 com `useAnimatedProps` (gs1 90s, gs2 60s reverso, gs3 30s, flow 6s); pivot 160,160; cleanup `cancelAnimation` 4x; modo compacto 96px sem texto. Boot screen substitui `return null` por loader em `bg-page` (§7.9). Onboarding Frame 2 troca `ActivityIndicator` por loader compacto. Mock SVG ampliado (RadialGradient/Ellipse) e mock `react-native-worklets` ampliado (Armadilha A22). +9 testes (1103→1112, 126→128 suites). Bundle Hermes 8.74 MB | — | — | 4-5h | `M25-spec.md` |
| `[ok]` | M26 | 4 rotas modais (humor-rapido, diario-emocional, eventos, scanner) envolvidas em `<Screen padded={false}>` com `<OuroborosLoader compacto />` atrás do `<BottomSheet>`; sheet abre com `index={0}` direto sem `useEffect+expand` (elimina A17/A18). `_layout.tsx` registra 4 `<Stack.Screen>` com `presentation: 'transparentModal'` + `contentStyle.backgroundColor: '#14151a'` + `animation: 'fade_from_bottom'`. Mock BottomSheet em `jest.setup.cjs` expõe `index` via `accessibilityHint`. +3 testes em 3 suítes existentes (1112→1115, 128 mantidas). Bundle Hermes 8.75 MB | 15, 18, 20, 16 | — | 3h | `M26-spec.md` |
| `[ok]` | M27 | Refundação estrutural de navegação. Apaga group `(tabs)` (33 arquivos `git mv` para raiz) e `BottomTabs.tsx`. Cria `MenuLateral` (drawer Moti, 3 seções) + `FABMenu` (purple esquerda) + `useNavegacao` store + `rotasSemFAB.ts`. Overlays globais em `_layout.tsx` com z-index 10/20 (CONTRACT §7.10). `useSessao` persist version: 2 + migrate `/(tabs)/X` → `/X`. A18 preservada nas 4 modais. Aritmética: 1115→1118 testes (-6 BottomTabs +9 novos), 128→129 suites. Bundle Hermes 8.75 MB | — | navegacao | 6-7h | `M27-spec.md` |
| `[ok]` | M28 | Varredura de identidade. Adiciona `useNomeDe(pessoa)` hook reativo em `pessoa.ts` (mantém `nomeDe` síncrono). `PESSOAS_CONFIG.ambos.nome` `'Ambos'`→`'Casal'`. Migra `MiniHumorScreen`, `FiltrosBar`, `editar-pessoa`, `ScannerPreview`, `ShareReceiver`, `HumorHeatmapStats` para o hook. "Sobreposto" mantido (label de modo). +7 testes em 1 suite nova (1118→1125, 129→130). Bundle Hermes 8.75 MB. 2/3 screenshots Nível A (FiltrosBar travada em web — achado COLAT-01) | — | — | 3-4h | `M28-spec.md` |
| `[ok]` | M25.1 | Fix animação OuroborosLoader em web. `useAnimatedProps` agora retorna string SVG nativa `transform="rotate(N 160 160)"` (rn-svg-web converte `<G rotation>` perdendo `cx`/`cy`; rotação caía em `(0,0)`). +1 teste novo confirma formato (1125→1126). Caminhos não invocados: nenhum — fix direto e isolado | — | — | 30min | `M25.1-spec.md` |
| `[ok]` | M27.1 | Fix combinado caminhos A+C. **Caminho C** em `lerConquistas`: early-return `{ conquistas: [], totaisPorOrigem: ... }` quando `vaultRoot.startsWith('web://')` (Promise FileSystem nunca resolvia em web mock). **Caminho A** em `_layout.tsx`: `useRef` `fontesPersistentementeCarregadas` segura o early-return contra oscilação de `useFonts` SDK 54 web. Caminho D (fade transition) não invocado | — | — | 1-2h | `M27.1-spec.md` |
| `[ok]` | M29 | Settings v2. `useSettings` shape v2 com `somVibracao` 4-toggle (geral mestre/despertar/conquista/botoes), `featureToggles` 6/7 default ON, `lembretes` e `sync` REMOVIDOS. Persist key `ouroboros.settings.v2` + migration v1→v2 conservadora. `haptics.ts` refatorado. `app/settings/index.tsx` 938→561L (-377L) sem `<SecaoLembretes/Sync/SelectorQualidade>`, com `<LinkSubTela>` "Reinicializar pasta do Vault". Refactor inevitável em 7 arquivos (consumidores). Validação Gauntlet: render correto. 1157→1162 testes (+5). Bundle 8.78 MB | 23 | settings v2 | 4h | `M29-spec.md` |
| `[ok]` | M30 | AlarmeSchema v2 com `recorrencia` (única/diária/semanal/mensal) + `data_unica` ISO opcional + `superRefine`. `agendarAlarme()` switch por recorrência (DATE/DAILY/WEEKLY/MONTHLY). `ALARME_CHANNEL_ID = 'ouroboros-default-v2'` com `vibrationPattern: [0,250,500,250]`, `enableVibrate`. `apagarChannelsLegadosUmaVez()` apaga `'default'`/`'alarmes'` legados via `useSessao.flags.canalV1Deletado`. `PermissaoNotificacaoGate` no `_layout` via `useEffect` direto. `app/alarmes/novo.tsx` ChipGroup recorrência condiciona seletor. `migrarLembretes.ts` boot hook idempotente para migrar v1→v2. 1162→1177 testes (+15), 135→136 suítes. Bundle 8.8 MB. Validação Gauntlet OK em `/alarmes/novo`. Pendência Nível B (vibração real via logcat) | nova | alarme v2 | 5-6h | `M30-spec.md` |
| `[ok]` | M31 | TarefaSchema v2 com `categoria` (8 slugs canônicos), `pessoa_destino` discriminatedUnion (mim/outra/casal/terceiro), `alarme` (vincula slug em `alarmes/`). `criarTarefa()` branch alarme cria companion; `reabrirTarefa()` novo. `SeletorPessoaDestino` (novo, ciência de tipoCompanhia), `SecaoConcluidas` (collapsable >5 itens), `SheetNovaTarefa` reescrito com ChipGroup categoria + alarme expansível. `MenuLongPress` extendido (backwards-compat) com prop `acoes` para Reabrir/Apagar definitivo. 1177→1207 testes (+30). Bundle 8.8→**8.5 MB** (-300 KB). Validação Gauntlet `/todo` empty state OK | nova | tarefa v2 | 5-6h | `M31-spec.md` |
| `[ok]` | M32 | Contador v2: `mensagemApoio(dias)` 6 faixas (0/<5/<30/<100/<365/≥365), `marcoAtingido(dias)` retorna marco em `[5,30,100,365]`. `app/contadores/[slug].tsx` ganha 2 `<Text>` em muted/mutedDecor 11dp letter-spacing 1 (ADR-0005 zero gamificação). 1207→1221 testes (+14), 136→137 suítes | nova | — | 2-3h | `M32-spec.md` |
| `[ok]` | M33 | Campo `para` discriminatedUnion (mim/outra/casal) em 4 schemas + componente `<SeletorPara>` plugado em 4 telas. Esconde em modo sozinho. Default `{tipo:'mim'}` backward-compat. 1221→1257 testes (+36), 137→138 suítes. TODO `useHoje` filtro adiado para M40 | múltiplas | 4 schemas | 3-4h | `M33-spec.md` |
| `[ok]` | M34 | MenuCapturaVerde tab Memórias. FAB verde Dracula `#50fa7b` canto inferior direito + BottomSheet com 4 ações (Foto/Música/Vídeo/Frase). 4 wrappers em `src/lib/midia/` + helper `companion.ts` (DRY) + `SheetFrase` com SeletorPara M33. `useFotosAgregadas` varre extensões ampliadas. Companion .md preliminar (M39 expande). 1260→1289 testes (+29), 139→144 suítes (+5). 5 screenshots Gauntlet validados. 3 sub-sprints colaterais: M34.1 (FABMenu z-index sobrepõe sheet), M34.2 (botão Registrar foto contraste), M11.3 (grid useWindowDimensions ignora frame) | 09-11 | — | 6-7h | `M34-spec.md` |
| `[todo]` | M34.1 | FABMenu z-index sobrepõe SheetFrase — `BottomSheet` default `containerStyle.zIndex: 30` | — | — | 1-2h | `M34.1-spec.md` |
| `[todo]` | M34.2 | Botão "Registrar foto" empty state Fotos com contraste insuficiente — diagnosticar + fix | — | — | 0,5h | `M34.2-spec.md` |
| `[ok]` | M11.3 | `useLarguraFrame()` hook centralizador: web → constante 412, native → `useWindowDimensions().width` real. 3 consumidores migrados (`MemoriasFotosTab`, `medidas`, `exercicios/[slug]`). Validação Gauntlet: 4 thumbs 118×118 em grid 3+1 contidas no frame (left=455, right=825). Bug pré-existente RTCSliderWebComponent revelado em /medidas + /exercicios — sub-sprint M-SLIDER-WEB-LOOP criada. 1289→1292 testes (+3), 144→145 suítes (+1). Bundle Hermes 8.84 MB | — | — | 1h | `M11.3-spec.md` |
| `[ok]` | M-SLIDER-WEB-LOOP | Wrapper `<Slider>` ramifica por `Platform.OS`: web → `<input type="range">` com CSS Dracula injetado idempotente, native → `RNSlider` preservado. Interface pública intacta — 8 consumidores migrados sem mudança. Bug original RTCSliderWebComponent loop infinito em /medidas + /exercicios resolvido. 1292→1293 testes (+1). Bundle Hermes 8.85 MB | — | — | 1-2h | `M-SLIDER-WEB-LOOP-spec.md` |
| `[todo]` | M34.3 | FAB verde do `MenuCapturaVerde` sobrepõe FABs próprios das abas (Fotos "adicionar foto" + Marcos "adicionar marco" — coordenadas 769,900 batem 1:1). Caminho A: FAB verde absorve ações contextuais por tab. Caminho C: M-CAPTURA-UNIFICADA já endereça via `/captura` modal. Bloqueia M-CAPTURA-UNIFICADA até decisão UX | — | — | 1-2h | `M34.3-spec.md` |
| `[todo]` | M35 | Aba Finanças: empty state honesto "Em desenvolvimento" | 22 | — | 1-2h | `M35-spec.md` |
| `[todo]` | M36 | Tela Recap: agregação de período (Conquistas/Crises/Evoluções/Números) | nova | — | 6-8h | `M36-spec.md` |
| `[todo]` | M37.1 | Google Calendar OAuth + leitura de eventos (rota /agenda) | nova | googleAuth | 6-7h | `M37.1-spec.md` (split do M37 original) |
| `[todo]` | M37.2 | Google Calendar escrita (criar e deletar evento) | nova | googleAuth | 4-5h | `M37.2-spec.md` (split do M37 original) |
| `[todo]` | M38 | Conflict resolution para 4 dispositivos via deviceId no slug | — | — | 4-5h | `M38-spec.md` |
| `[todo]` | M39 | Estrutura canônica de mídia + .md companion (formal ADR-0017) | — | midia-companion | 4-5h | `M39-spec.md` |
| `[todo]` | M40 | Tela 01 Hoje v2: Recap + status do casal + próximos | 01 | — | 4-5h | `M40-spec.md` |
| `[todo]` | M41 | APK Release v1.0.0 final + GitHub Release público | — | — | 3-4h | `M41-spec.md` |

**Total estimado refundação**: 85–110h. Plano em
[`/home/andrefarias/.claude/plans/distributed-sauteeing-kettle.md`](/home/andrefarias/.claude/plans/distributed-sauteeing-kettle.md).

## Backend paralelo (repo `protocolo-ouroboros`)

| Status | Sprint | Título | Bloqueia |
|---|---|---|---|
| `[para]` `[ok]` | MOB-bridge-1 | Refactor `pessoa_a`/`pessoa_b` no Python (escopo expandido: schema XLSX migrado, dashboard via `nome_de()`, ADRs 23+24) — Python `afcc240` | MOB-bridge-2, MOB-bridge-3 |
| `[para]` `[ok]` | MOB-bridge-2 | Caches `humor-heatmap.json` e `financas-cache.json` (atomic write, idempotência, schema_version=1, pacote em `src/mobile_cache/`) — Python `5be23a7` | M10, M14 |
| `[para]` `[ok]` | MOB-bridge-3 | Marcos auto-gerados via heurísticas (5 tipos) com dedup `sha256(tipo+data+descricao)[:12]` simétrico com M11 — Python `ef20366` | M11 (cooperativo, fallback client) |

Specs em `docs/sprints/backend/`.

## Dependências críticas e ordem de execução

### Caminho linear recomendado

> **Atualização 2026-05-01**: EAS dev-client build #1 finalizado (`15da107f`,
> 20m51s, APK 207 MB). Bloco 6 destravado — M06.5/M09/M07.x/M11.5 podem
> rodar quando a sessão correspondente abrir. Ver `STATE.md` § "EAS
> dev-client — instruções de uso para sessão dev-client" para passos
> de instalação e Metro bundler.

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
| Mockup visual de cada tela | `docs/Ouroboros_24_telas-standalone.html` |
| Schemas YAML completos | `docs/BRIEFING.md` §7 |
| Política de validação A/B/C | `VALIDATOR_BRIEF.md` §1.9 |
| Histórico de fixes | `CHANGELOG.md` + `docs/sprints/M03.x-fixes-consolidados.md` |
