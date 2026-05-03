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
  `docs/Ouroboros_24_telas-standalone.html` (mockup canônico).

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
| `[ok]` | M00.5.x | Fix Rules of Hooks em `(tabs)/index.tsx:81` — hook movido para topo antes dos early returns; ESLint exit 0 prova fix | — | — | 0,3h | `1f7ac8a` |
| `[ok]` | INFRA-acentuacao-comentarios | Varrer `app/` e `src/` corrigindo comentários PT-BR sem acento — 145 arquivos, 715 substituições 1:1, residual 3 (paths legítimos sem acento), redução 99.3% | — | — | 3h | `a792156` |
| `[ok]` | M19.x | Inventário de mockups + stub build-mockups + seção CONTEXTO §7.1 (fechada parcialmente; toolchain JSX→HTML completa fica para M19 final) | — | — | 1,5h | `ce0b187` |
| `[todo]` | M20.x | Validação Nível B/C real do widget na home (após `npm run build:dev`) | 26 | — | 1-2h | — |
| `[todo]` | M06.5 | F-14 Microfone (transcrição on-device) | 18 | diario_emocional + audio | 5-7h | — |
| `[todo]` | M07.x | Conquistas com mídia obrigatória (4 tipos) | 18, 20 | diario_emocional, evento, midia | 5-7h | — |
| `[todo]` | M08 | Share Intent Receiver (flow PIX <5s) | 17 | inbox_arquivo + financeiro | 4-5h | — |
| `[todo]` | M09 | Scanner OCR + multipágina + bairro auto | 16 | financeiro_nota | 7-9h | — |
| `[ok]` | M10 | Mini Humor Tela 21 — heatmap 13x7 (91 dias), modo sobreposto pessoa_a+pessoa_b 50% opacity, stats 30d, modal detalhe dia, empty state. Cache readonly via SAF (ADR-0012). +23 testes (889→912 / 100→103 suites). Validacao Nivel A capturou empty state (SAF Android-only); render colorido fica para M10-checkpoint-visual em Nivel B/C | 21 | humor_heatmap_cache | 4-5h | `b98458e` |
| `[todo]` | M10-checkpoint-visual | Capturar 4 screenshots em Nivel B/C (emulador ouroboros-test ou APK celular fisico carsvg7du8kfnrlj) com cache real sincronizado: heatmap pessoa_a, heatmap pessoa_b, modo sobreposto, DiaHumorModal aberto. Origem: ponto-cego do validador M10 (render real nao evidenciado em runtime Android) | 21 | — | 0,5-1h | — |
| `[todo]` | M11 | Memórias e Marcos (CRUD completo + galeria fotos agregada) | 09, 10, 11 | treino_sessao, marco | 8-10h | — |
| `[todo]` | M11.5 | Calendário visual de conquistas (oEmbed + filtros) | 25 | evento, diario_emocional + media | 5-7h | — |
| `[todo]` | M12 | Medidas (form + comparativo) | 12, 13 | medidas | 5-6h | — |
| `[todo]` | M13 | Galeria + Detalhe + Cadastro Exercícios (CRUD) | 07, 08, 02 | exercicio | 8-10h | — |
| `[ok]` | M14 | Mini Financeiro Tela 22 readonly — header laranja, banner modo leitura, CardHero (gasto semana cyan + delta), top 5 categorias com barras, lista virtualizada de 20 últimas transações (despesa cyan, crédito green), empty state, hook `useFinancasCache`, fixture web. +25 testes (912→937 / 103→108 suites). Reader em `src/lib/cache/` (uniformidade canônica com M10). Validação Nível A capturou render real via fixture | 22 | financas_cache | 4-5h | `29f0472` |
| `[todo]` | M14-checkpoint-visual | Capturar 4 screenshots em Nível B/C com cache real do Vault sincronizado: hero com gasto semana real, top categorias preenchido, lista transações reais, empty state. Origem: ponto-cego do validador M14 (screenshot Nível A foi via fixture, não cache real) | 22 | — | 0,5-1h | — |
| `[todo]` `[para]` | M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL | Backend Python (`MOB-bridge-2`/`mobile_cache.financas_cache`) gera `delta_textual` sem acentuação completa (ex.: `"abaixo da media"` em vez de `"abaixo da média"`). Mobile só renderiza string opaca (ADR-0005). Fix em `src/mobile_cache/financas_cache.py` no Python | 22 | financas_cache | 0,5h | — |
| `[todo]` | M14.1 | Micro-fix: warning eslint `unused-disable` em `src/lib/hooks/useFinancasCache.ts:40` (disable do `no-require-imports` sem problema reportado). Remoção trivial. | — | — | 0,1h | — |
| `[todo]` | M14.5 | Acompanhador de Ciclo Menstrual (opt-in) | nova | ciclo_menstrual | 5-6h | — |
| `[todo]` | M15 | Settings (7 grupos + biometria + export) | 23 | (vários) | 7-8h | — |
| `[todo]` | M16 | F-15 Alarme pessoal opt-in (com snooze + actions) | nova | alarme | 5-6h | — |
| `[todo]` | M17 | F-16 To-do leve opt-in (com drag&drop + busca) | nova | tarefa | 4-5h | — |
| `[todo]` | M18 | F-17 Contador "dias sem X" opt-in (com histórico) | nova | contador | 4h | — |
| `[ok]` | M19 | APK Release Hardening v1.0.0-rc1 — RETIRADO em 2026-05-02 (refundação M21-M41). 1057 testes / 121 suites. APK preservado em `builds/` localmente. | — | — | 6-8h | tag `v1.0.0` (mantida) |
| `[done]` | — | **MVP v1.0-rc1 retirado — refundação em curso** | — | — | — | — |

## Refundação v1.0 (2026-05-02 → fechamento M41)

| Status | Sprint | Título | Telas | Schemas | Estimativa | Spec |
|---|---|---|---|---|---|---|
| `[ok]` | M21 | Despublicar release v1.0.0 do GitHub e marcar como rc1. Estado já alcançado (release deletado em sessão anterior; APK preservado em `builds/ouroboros-1.0.0-rc1.apk`; CHANGELOG/STATE/README atualizados na materialização) | — | — | 0,3h | commit `3708190` (materialização) |
| `[ok]` | M22 | Vault auto-criado em /sdcard/Documents/Ouroboros sem SAF (probe + fallback SAF + 19 subpastas + useEffect direto + mocks Jest dual CJS+ESM). +14 testes (1057→1071). Bundle Hermes 8.72 MB. Pendência R1 (screenshot Nível B/C) | — | — | 5-6h | M22-spec.md (commit pós) |
| `[ok]` | M23 | Onboarding 3 frames (remove Vault SAF e Sync). useOnboarding v2 sem syncMethod, indicador 3-segmentos, handleConcluir 3 caminhos (auto/saf-fallback/erro), 3 screenshots Nível A. +9 testes (1071→1080). Bundle Hermes 8.71 MB | 24 | — | 3-4h | M23-spec.md (commit pós) |
| `[ok]` | M24 | Resume state e auto-save de rascunhos. `useSessao` store novo (7 rascunhos + 4 permissões + `ultimaRota`); `useAutoSaveRascunho` debounced 500ms; `SessaoBootGate` useEffect direto; A20 cap 2000 chars + canário 1500B. +23 testes (1080→1103, 126 suites). Bundle Hermes 8.73 MB | — | — | 5-6h | M24-spec.md (commit pós) |
| `[ok]` | M25 | OuroborosLogo + OuroborosLoader SVG nativo. 4 anéis Reanimated 4 com `useAnimatedProps` (gs1 90s, gs2 60s reverso, gs3 30s, flow 6s); pivot 160,160; cleanup `cancelAnimation` 4x; modo compacto 96px sem texto. Boot screen substitui `return null` por loader em `bg-page` (§7.9). Onboarding Frame 2 troca `ActivityIndicator` por loader compacto. Mock SVG ampliado (RadialGradient/Ellipse) e mock `react-native-worklets` ampliado (Armadilha A22). +9 testes (1103→1112, 126→128 suites). Bundle Hermes 8.74 MB | — | — | 4-5h | `M25-spec.md` |
| `[ok]` | M26 | 4 rotas modais (humor-rapido, diario-emocional, eventos, scanner) envolvidas em `<Screen padded={false}>` com `<OuroborosLoader compacto />` atrás do `<BottomSheet>`; sheet abre com `index={0}` direto sem `useEffect+expand` (elimina A17/A18). `_layout.tsx` registra 4 `<Stack.Screen>` com `presentation: 'transparentModal'` + `contentStyle.backgroundColor: '#14151a'` + `animation: 'fade_from_bottom'`. Mock BottomSheet em `jest.setup.cjs` expõe `index` via `accessibilityHint`. +3 testes em 3 suítes existentes (1112→1115, 128 mantidas). Bundle Hermes 8.75 MB | 15, 18, 20, 16 | — | 3h | `M26-spec.md` |
| `[wip]` | M27 | MenuLateral substitui bottom tabs e FABRadial | — | navegacao | 6-7h | `M27-spec.md` |
| `[todo]` | M28 | Nomes reais em todas as UIs (substitui Pessoa A/B/Sobreposto) | — | — | 3-4h | `M28-spec.md` |
| `[todo]` | M29 | Settings v2: vibração simples + features default ON + sync removido | 23 | settings v2 | 4h | `M29-spec.md` |
| `[todo]` | M30 | AlarmeSchema v2: recorrência + channel com vibração + lembretes integrados | nova | alarme v2 | 5-6h | `M30-spec.md` |
| `[todo]` | M31 | TarefaSchema v2: categoria + pessoa_destino + alarme | nova | tarefa v2 | 5-6h | `M31-spec.md` |
| `[todo]` | M32 | Contador v2: mensagens de apoio + indicador de marcos | nova | — | 2-3h | `M32-spec.md` |
| `[todo]` | M33 | Campo `para` em Diário/Evento/Contador/Marco (anotação para o casal) | múltiplas | 4 schemas | 3-4h | `M33-spec.md` |
| `[todo]` | M34 | MenuCapturaVerde na tab Memórias (Foto/Música/Vídeo/Frase) | 09-11 | — | 6-7h | `M34-spec.md` |
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
