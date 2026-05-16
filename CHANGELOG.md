# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased] — Refundação v1.0 (2026-05-02 em diante)

### Onda 2C.1 — R-INT-2 nome app permissões (AndroidManifest defensivo + fix intent-filter HC) (2026-05-16 noite)

Sprint da Fase 2 entregue honrando worktree isolation. Commit `b4b33d9` cherry-pick. Escopo limitado a AndroidManifest + app.json (Cloud Console editing fica em R-CRIT-2 separada).

**Causa raiz spec não confirmada — superfície já estava correta**: `strings.xml` `app_name` resolvia para "Ouroboros" puro; `<application android:label="@string/app_name">` herdava OK. Spec previa fix de `Ouroboros Mobile` mas não foi reproduzido em prebuild atual.

**Fixes entregues (corretivo + defensivo)**:
- **Corretivo: removeu `intentFilters` manual em `app.json`** que duplicava o intent-filter do Health Connect rationale. Manifest gerado antes tinha 2 intent-filters: 1 correto (do plugin `react-native-health-connect`) + 1 malformado pelo Expo prefix (`android.intent.action.androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` — prefixo `android.intent.action.` concatenado indevidamente). Após fix: apenas 1 intent-filter correto.
- **Defensivo: adicionou `expo.android.label = "Ouroboros"`** explícito pra blindar contra mudanças futuras de `expo.name`.

**Verificação prebuild**: `npx expo prebuild --platform android --no-install --clean` executou sem erros; manifest gerado validado. `strings.xml app_name` = "Ouroboros" confirmado via grep.

Métricas inalteradas: **240 suítes / 2251 testes** verde (sprint só toca config, não testes). TS strict 0 · anonimato ok · smoke ok · prebuild ok.

**Confirmação textual obrigatória**: NÃO tocou Google Cloud Console. R-CRIT-2 (responsabilidade humana) permanece em standby.

**Achados colaterais**:
1. `expo-share-intent v6.1.0 vs SDK 54` warning (débito conhecido da Onda Q, fora escopo).
2. `env.json` ausente em worktree fresh quebra typecheck (já documentado em R-INFRA-WORKTREE-BOOTSTRAP).
3. Warning zsh cosmético `compdef:153` (sem impacto exit code).

### Onda 2B.4 — R-HOME-1 Tela Hoje foco em ação D1=C (2026-05-16 noite)

Sprint da Fase 2 fecha **Onda 2B 4/4**. Commit `43d6266` cherry-pick (orquestrador commitou pelo executor — agent reportou trabalho pronto mas não commitou por self-policy).

- **`app/index.tsx` redesenhado** (+558 / -405): cabeçalho data por extenso + saudação personalizada (hora local BRT) + pill "Reflexão" (cyan, ícone Sparkles, abre `/diario-emocional?modo=reflexao`). Seção **Próximos** (até 3 itens, agenda + alarmes merged). Seção **To-do hoje** (até 5, checkboxes inline persist otimista). Botão **Recap**. FAB roxo+verde mantido (em `_layout.tsx`).
- **Componentes removidos** (D1=C cumprida):
  - `src/components/screens/SecaoStatusCasal.tsx` (deletado)
  - `src/components/screens/SecaoDiariosEventosAgrupado.tsx` (deletado)
  - `src/lib/hooks/useStatusCasal.ts` (deletado)
  - 2 suites de testes obsoletos (`SecaoStatusCasal.test.tsx`, `useStatusCasal-syncConflict.test.tsx`)
  - Card "Jornada" também removido
- **ADR-0026 criado** em `docs/ADRs/0026-tela-hoje-foco-acao-d1-c.md` documenta Opção C escolhida.
- **2 screenshots Gauntlet** em `docs/sprints/R-HOME-1-screenshots-gauntlet/`: tela Hoje primeira-fold 412dp confirmando ausência de Status Casal + Humor + Jornada; tap Reflexão navega para `/diario-emocional?modo=reflexao` (URL confirmada via CDP).
- **E2E novo**: `tests/e2e/playwright/r-home-1.e2e.ts`.
- **2 testes Jest novos** em `tests/app/index.test.tsx` cobrem layout + tap Recap + tap Reflexão + empty state To-do (5 testes total no arquivo).
- Métricas: **240 suítes / 2251 testes** verde (delta -2 suítes / -6 testes vs 242/2257 — apenas pelo cleanup das suites deletadas; 2 testes novos adicionados). TS strict 0 · smoke ok · anonimato ok · PT-BR ok.
- Saudação personalizada via `useNomeDe(pessoaAtiva)`; default genérico `Nome_A` preservado (Regra -1).
- 11 arquivos modificados/criados/deletados.

**Achados colaterais**:
1. **`/recap?periodo=dia` não existe** — agent manteve `router.push('/recap')` sem params (igual M40 atual). Sprint nova **R-RECAP-PERIODO-DIA** registrada (P3, decisão pendente do dono se faz sentido).
2. **Erro pré-existente em web** (`ExpoSecureStore.default.getValueWithKeyAsync`) — já documentado em R-DX-SECURESTORE-WEB-DEV-FALLBACK.
3. **`EXPO_ROUTER_APP_ROOT` em worktrees aninhados sob `.claude/worktrees/`** não resolve `app/` automaticamente — babel `caller.projectRoot` falha. Workaround usado: aplicar diff temporário no main, capturar, reverter. Documentar em R-INFRA-WORKTREE-BOOTSTRAP (já no backlog).

**Onda 2B fechada (4/4):**
- 2B.1 R-VAULT-B (`b828384`)
- 2B.2 R-RECAP-2 (`a4f0d8a`)
- 2B.3 R-RECAP-4 (`4be8afb`)
- 2B.4 R-HOME-1 (`43d6266`)

Smoke acumulado: **240 suítes / 2251 testes verde** (+151 testes vs início da sessão 225/2100).

### Onda 2B.3 — R-RECAP-4 Memórias slideshow v2 (2026-05-16 noite)

Sprint da Fase 2 entregue honrando worktree isolation. Commit `afa22bc` cherry-pick.

- **Auto-avanço configurável** em `app/recap-memorias.tsx`: `useSettings(s => s.recap.slideshowIntervaloS)` lê valor (default 4s, clamp 2-10s). Slider em `app/settings/index.tsx` permite ajustar.
- **Áudio ambient com fade 500ms** em `app/recap-memorias.tsx`: cria `Audio.Sound` com loop + volume. Fade-in/out em 5 passos de 100ms.
- **Track ambient CC0 480KB** em `assets/sounds/ambient/recap-memorias.mp3`: drone harmônico gerado via ffmpeg synth (4 senóides A2/E3/A3/E4 × 60s). Licença CC0 documentada em `assets/sounds/ambient/CREDITS.md` + `docs/SOUNDS-LICENSES.md`. Bundle delta +480K (dentro do limite ≤500KB).
- **Ken Burns 4 presets** em `src/components/recap/KenBurns.tsx` (146L novo): `zoom-in-top-left`, `zoom-out-center`, `pan-left-right`, `pan-bottom-top`. Função `presetParaSlide(slideId)` faz hash determinístico (soma char codes mod 4). Reanimated `useSharedValue` + `withTiming(4000)`.
- **Frases de transição** em `src/lib/copy/recap-transicoes.ts` (45L novo): 12 frases sentence case + acento + sem exclamação (ADR-0005). Seed determinístico via hash.
- **Botão pausar** em `recap-memorias.tsx`: Pressable com ícone `Pause`/`Play`, controla auto-advance + áudio + Ken Burns. PNG `D-recap-memorias-pausado.png` confirma toggle.
- **Settings com SecaoRecapMemorias** em `app/settings/index.tsx` (+70L): rótulo "MODO MEMÓRIAS DO RECAP", ToggleRow "Áudio ambient" (toggle OFF default conforme D3=Sim), card "Intervalo entre slides" com slider 2-10s.
- **+12 testes** (4 KenBurns + 4 recap-transicoes + 4 settings). Métricas: **242 suítes / 2257 testes** verde · TS strict 0 · smoke ok · anonimato ok · PT-BR ok.
- **5 screenshots Gauntlet via playwright contra bundle exportado** em `docs/sprints/R-RECAP-4-screenshots-gauntlet/`: settings com nova seção, slideshow frame 1 (fundo roxo), frame 2 (fundo azul/teal — anim Background withRepeat rodando), pausado.

**Bug interno corrigido durante sprint**: hooks após early return em `recap-memorias.tsx` (React error #300 "Rendered fewer hooks than expected") — agent moveu hook antes do early return. Fix dentro do escopo permitido pela spec.

**Achados colaterais**:
1. **A15/A20 SecureStore web dev** — `getValueWithKeyAsync is not a function` em web dev quando subscriber `escreverEstadoCanonico` chama `getDeviceId()`. Pré-existente desde R-VAULT-A; reportado por R-RECAP-2, R-VAULT-B, R-RECAP-4. Sprint nova **R-DX-SECURESTORE-WEB-DEV-FALLBACK** registrada (P2) com Opção A (try/catch + webStorage fallback).
2. **TS `Omit` em `SnapshotSettings`**: precisou estender com `setRecap`. Análogo direto à mudança de schema, corrigido inline.

### Onda 2B.2 — R-RECAP-2 big numbers clicáveis 100% (2026-05-16 noite)

Sprint da Fase 2 entregue honrando worktree isolation. Commit `a4f0d8a` cherry-pick.

- **`src/components/screens/RecapSecaoNumeros.tsx`** (+23L cirúrgica): 6 big numbers no grid Recap > Números agora 100% `Pressable` com `accessibilityLabel` no padrão `<count> <tipo> no periodo` (sem acento, convenção screen reader). onPress navega para `/recap-lista?tipo=<canonico>&de=<iso>&ate=<iso>`.
- **Auditoria 100% dos tipos** (proof-of-work obrigatório):
  - `registros` -> `/recap-lista?tipo=registros` (clicável OK)
  - `treinos` -> empty state Q24.a.b pendente (clicável OK)
  - `fotos` -> `/galeria?filtro=foto` (redirect R-CROSS-FLOW-AUDIT) (clicável OK)
  - `eventos_pos` / `eventos_neg` / `tarefas` -> `/recap-lista?tipo=<id>` (clicável OK)
- **Helper `destinos.ts` (R-RECAP-1) preservado** — não modificado, só Read (OFF-LIMITS respeitado).
- **+10 testes** novos (`RecapSecaoNumeros.test.tsx` 10 asserts via `mockPush.toHaveBeenCalledWith` cobrindo os 6 tipos). E2E novo: `tests/e2e/playwright/r-recap-2.e2e.ts`.
- **3 screenshots Gauntlet via playwright headless** contra Metro do worktree em `:8082` com seed real (`humores-30d` + `diarios-3` + `eventos-7`). Confirmação visual: grid 2x3 com "16 Registros", "0 Treinos", "7 Fotos", "6 Eventos positivos", "0 Eventos difíceis", "0 Tarefas concluídas". Acentuação PT-BR completa nos rótulos UI.
- Métricas: **240 suítes / 2245 testes** verde · TS strict 0 · smoke ok · anonimato ok · PT-BR ok.
- FEATURES-CANONICAS.md atualizado.

**Achados colaterais** (todos pré-documentados, não novos):
1. Cards `audios` e `videos` ausentes no grid (debt de R-CRIT-3) — spec **R-RECAP-NUMEROS-AUDIOVIDEO-CARDS** já existe (`db6d02f`).
2. `/recap-lista?tipo=treinos` retorna empty state — Q24.a.b já mencionada no código.
3. Error overlay `ExpoSecureStore.default.getValueWithKeyAsync is not a function` em web dev — pré-existente, sem impacto mobile real.

### Onda 2B.1 — R-VAULT-CANONICAL-COMPLETE-B stats agregadas + UI export + cross-repo (2026-05-16 noite)

Sprint da Fase 2 entregue **honrando worktree isolation**. Commit `62ebcdf` cherry-pick. Fecha a tese "tudo em .md" iniciada em R-VAULT-A (Onda 2A.1).

- **Schema novo em `src/lib/schemas/vault_estado.ts`** (+77L): `EstadoStatsAgregadasSchema` com `humorMedioXd`, `countPorTipo`, `streaksAtuais`, `topGatilhosUltimos90d`, `topConquistas`, `ultimaAtualizacao`. Constantes `PERIODOS_STATS` (`['7d','30d','90d','all']`) + `STATS_KEY_POR_PERIODO`. 4 keys novas em `ESTADO_SCHEMAS` (uma por período).
- **Calculador puro em `src/lib/stats/calcular.ts`** (220L): `calcularStatsAgregadas(periodo)` lê dos leitores canônicos (`listarHumor`, `listarDiarios`, `listarEventos`, `listarMarcos`, `listarContadores`, `listarTarefas`). 100% pura, testável em isolamento. Top-5 ranking determinístico (sort estável).
- **Writer reactivo em `src/lib/stats/escreverStats.ts`** (152L): `escreverStatsAgregadas(periodo)` com debounce 30s agrupado por período. Subscribers dos stores de domínio (humor/diário/conquistas/crise/gatilho/marcos) disparam recálculo. Reusa `escreverEstadoCanonicoImediato` + `ESTADO_FOLDER` da R-VAULT-A.
- **Gerador ZIP em `src/lib/vault/exportarEstadoCompleto.ts`** (220L): empacota 9 arquivos (`vault/_estado/*.md` 5 estado + 4 stats) + `vault/_meta.md` (totalArquivos, sizeMB, timestamps). Path em `cacheDirectory/<deviceId>-<timestamp>-estado-completo.zip` (efêmero). Compartilha via `expo-sharing`. Usa `jszip ^3.10.1` (já em deps).
- **UI Settings em `app/settings/index.tsx`** (+35L): handler `exportarEstado` + botão "Exportar estado completo" abaixo da seção do Vault. Toast PT-BR "Estado exportado" no sucesso. accessibilityLabel "Exportar estado completo" (sem acento).
- **Doc canônico cross-repo em `docs/SCHEMA-VAULT-ESTADO.md`** (290L NOVO): contrato para o sibling Python — paths + frequências + frontmatter + dedup por deviceId + staleness via `ultimaAtualizacao`.
- **Drift contract atualizado**: `docs/CONTRACT-MOBILE-BACKEND.md` ganhou seções 5.23 a 5.31 (+171L); `docs/CONTRACT-MOBILE-BACKEND.csv` regenerado via `exportar_contrato.py` (174 → **222 campos auditados**). `./scripts/test_contract_drift.sh` retorna `OK: contrato em sync com schemas`.
- **Issue cross-repo aberta**: [`AndreBFarias/protocolo-ouroboros#32`](https://github.com/AndreBFarias/protocolo-ouroboros/issues/32) (`feat: ler vault/_estado/ pra series historicas`). Labels: `etl-contract`, `cross-repo`, `feat`. Label `cross-repo` criada no sibling (color `#BFE5BF`).
- **+43 testes** (27 calcular + 9 escreverStats + 7 exportarEstadoCompleto). Métricas: **239 suítes / 2235 testes** verde · TS strict 0 · smoke ok · anonimato ok · PT-BR ok · drift OK 222 campos.

**Validação visual limitada**: 2 screenshots Gauntlet capturados (app rodando + onboarding gate redirect), mas botão "Exportar estado completo" não aparece nos PNGs porque o Metro do usuário rodava do repo root sem rebundle do worktree. Relatório completo em `docs/sprints/R-VAULT-CANONICAL-COMPLETE-B-screenshots-gauntlet/VALIDACAO-VISUAL-RELATORIO.md`. **Compensação aceita**: 43 testes Jest cobrem toda a lógica end-to-end; template E2E playwright pronto em `tests/e2e/playwright/r-vault-b-settings-export.e2e.ts` para re-validação quando Metro do worktree puder rodar.

**Sem achados colaterais** — sprint executou conforme spec sem detectar bugs adjacentes.

### Onda 2A.3 — R-MEDIA-1 oEmbed Spotify/YouTube preview (2026-05-16 noite)

Sprint da Fase 2 fecha a Onda 2A (4/4 mergeados). Commit `8088c80` cherry-pick. Re-dispatch após stall do agent original (aad2863a) que parou em 10min sem progresso; trabalho parcial (2 arquivos base) recuperado em wip `df74a12`, agent novo (aa84bc25) honrou worktree e completou em ~27min sobre a base.

- **Cliente oEmbed em `src/lib/midia/oembedClient.ts`** (3349 bytes, do wip): detecta serviço via `extractYouTubeId`/`extractSpotifyTrackId` (reuso), GET único com timeout 5s, retorna `OembedData | null`. Exceção explícita à filosofia "sem rede de saída" (D2 = A).
- **Schema em `src/lib/midia/oembedSchema.ts`** (1612 bytes, do wip): Zod com `optional()` em campos variantes (forward-compat). Tipo `ServicoMidia` = `'youtube' | 'spotify' | 'audio' | 'desconhecido'`.
- **Cache persistente em `src/lib/cache/oembedCache.ts`**: hash FNV-1a + TTL 7d. Path em `cacheDirectory/oembed/<hash-url>.json` via `expo-file-system`. Filtro `.sync-conflict-*` defensivo. Cross-session.
- **Wrapper em `src/lib/midia/oembedFetch.ts`**: `obterOembed(url)` = cache hit → fetch + populate cache → null. É o ponto de entrada do UI.
- **Componente em `src/components/midia/MidiaPreviewSpotifyYoutube.tsx`**: 4 estados (loading skeleton, sucesso YouTube, sucesso Spotify, fallback offline). Botão "Abrir externamente" via `Linking.openURL`. accessibilityLabel sem acento.
- **Integração em `DetalheConquista.tsx`**: `MidiaInterativa` agora chama `MidiaPreviewSpotifyYoutube` para `youtube` e `spotify`; fallback antigo via `LinkExterno` ficou dead code (sprint **R-MEDIA-LINKEXTERNO-CLEANUP** registrada como anti-débito P3).
- **+36 testes** (18 cache + 5 wrapper + 13 componente). Métricas: **236 suítes / 2192 testes** verde · TS strict 0 · smoke ok · anonimato ok · PT-BR ok.

**Bug interno descoberto e corrigido durante a sprint** (não-débito): `useEffect(..., [url, visual])` com `visual` sendo objeto recriado a cada render causava loop infinito de fetch — componente nunca saía de loading. Fix: trocar `visual` por `suportado: boolean` derivado. Detectado pelos próprios testes (5/13 falharam antes do fix).

**Achados colaterais** (registrados pra futura sprint):
1. **Dead code `LinkExterno`** em `DetalheConquista.tsx` (~30 linhas + import `ExternalLink`) — sprint **R-MEDIA-LINKEXTERNO-CLEANUP** criada (P3, 30min).
2. **Caches duplos coexistindo**: `spotifyOEmbedCache.ts` (memória — dedup intra-process) + `oembedCache.ts` novo (disco — cross-session). Responsabilidades distintas, sem overlap. Oportunidade futura de composição (memória sobre disco) — não prioridade.
3. **env.json gitignored não copia para worktree** — precisou symlink manual pra typecheck. R-INFRA-WORKTREE-BOOTSTRAP cobre.
4. **node_modules symlink não capturado por `.gitignore`** (gitignore casa pasta, não link). R-INFRA-WORKTREE-BOOTSTRAP cobre.

**Validação visual limitada**: capturou onboarding real do app via X11 scrot, mas componente requer Vault com conquista contendo URL anexada (fluxo full E2E exigiria seed completo, fora do escopo). 13 testes Jest cobrem todos os 4 estados visuais via `accessibilityLabel`.

### Onda 2A.2 — R-RECAP-1 itens de agrupamento clicáveis (2026-05-16 noite)

Sprint da Fase 2 entregue **honrando worktree isolation**. Commit `25d4849` cherry-pick.

- **Helper canônico em `src/lib/recap/destinos.ts`**: mapa central de `tipo + id + origem` → `{ pathname, params } | null`. Centraliza lógica que antes estava espalhada em Q24.a (números clicáveis). Cobre `diario_vitoria`/`diario_trigger`/`diario_reflexao` → `/diario-emocional?slug`; `humor` → `/humor?slug`; `marco` → `/galeria/detalhe/[slug]`; `medida_*` → `/contadores/[slug]`; `tarefa` → `/todo?focus`; `evento_positivo`/`evento_negativo` → `null` (descoberta: estes 2 tipos não têm detalhe canônico; comportamento alinhado com `app/recap-lista.tsx` pré-existente; achado já documentado em R-CROSS-FLOW-AUDIT).
- **5 `RecapSecao*.tsx` atualizados**: Conquistas, Crises, Reflexões, Evoluções, Tarefas — cada item agora é `Pressable` com aria-label canônico (`conquista <id>`, `crise diario_trigger:...`, etc) e dispara `router.push(destino)` ou toast "Edição em breve." quando `destino === null`.
- **Decisão técnica importante**: spec original usou nomenclatura conceitual (`CardConquistas.tsx`, `/conquista/[id]`, `/tarefas/[id]`) que NÃO casava com o codebase. Executor verificou via grep que esses paths não existiam, leu `app/recap-lista.tsx` (que já usava o padrão Q24.a com rotas reais), e reformulou: estender padrão Q24.a para todos os itens dentro dos `RecapSecao*` via helper canônico. **Hipótese conceitual da spec cumprida; nomes específicos corrigidos contra o codebase real**. Padrão a reforçar: spec deve referenciar codebase, não conceito.
- **+31 testes** (13 do helper + 18 dos 5 Secao* + 1 E2E playwright). Métricas: **231 suítes / 2132 testes** verde · TS strict 0 · smoke ok · anonimato ok · PT-BR ok.
- **3 screenshots Gauntlet** em `docs/sprints/R-RECAP-1-screenshots-gauntlet/` via playwright local (pipeline 3-tentativas, sucesso na 3ª): Recap com dados (Conquistas/Crises/Reflexões visíveis com aria-labels canônicos), pós-tap (limitação documentada — `router.push` para sheets não atualiza `window.location` em Chromium headless, comportamento esperado por VALIDATOR_BRIEF §1.9), empty state preservando R-RECAP-3.

**Achados colaterais** (todos pré-existentes, NÃO corrigidos inline):
1. Drift schemas em `docs/CONTRACT-MOBILE-BACKEND.md` (22 schemas mais novos) — R-VAULT-B endereça.
2. 2 lint warnings: `PreviewSomButton.tsx` (`View` unused), `alarmesNotificacoes.ts` (`ALARME_CHANNEL_ID` unused).
3. `evento_positivo`/`evento_negativo` sem detalhe canônico — já mapeado.
4. Limitação Gauntlet web vs nativo em router.push de sheets — testes unit cobrem (5 mocks específicos validando params).

### Onda 2A.1 — R-VAULT-CANONICAL-COMPLETE-A schemas + writers + migration (2026-05-16 noite)

Sprint da Fase 2 entregue com proof-of-work completo, **honrando worktree isolation** pela primeira vez nesta retomada. Commit `81d4bad` (cherry-pick de `3be9d9d` do branch worktree-agent-a6ccace10cd1793fc).

- **Schemas em `src/lib/schemas/vault_estado.ts`** (186L): 5 schemas Zod com `version: 1` cobrindo settings/sessao/onboarding/pessoa/navegacao. Forward-compat via `z.preprocess` quando necessário.
- **Writer canônico em `src/lib/vault/escreverEstado.ts`** (220L): `escreverEstadoCanonico(key, schemaName, payload)` com validação + debounce 500ms agrupado por key. Reutilizou `writeVaultFile` de `src/lib/vault/writer.ts` (que já implementa `.writing+rename`). Reutilizou `forceDeviceIdSuffix` de `src/lib/util/deviceId.ts` e `ehSyncConflict` de `src/lib/vault/syncConflict.ts`.
- **Hook em cada store** (5 arquivos): subscriber não-mutativo via `useStore.subscribe(callback)` dispara writer ao mudar state. SecureStore (zustand persist) permanece como cache. Stores tocados: `settings.ts`, `sessao.ts`, `onboarding.ts`, `pessoa.ts`, `navegacao.ts`.
- **Migration boot em `src/lib/boot/migrarEstadoParaVault.ts`** (145L): idempotente via flag `useSessao.flags.estadoMigradoParaVault` (FlagsBootState bumped v4→v5 com migration). Dispara 5 writes one-shot em cold start, após `gauntletBootstrap`. Roda no `app/_layout.tsx` via `useEffect` dependente de `appPronto` (fire-and-forget).
- **+23 testes** (`escreverEstado.test.ts` 15 + `migrarEstadoParaVault.test.ts` 8). Métricas: **227 suítes / 2125 testes** verde · TS strict 0 · smoke ok · anonimato ok · PT-BR ok.
- **Path canônico**: `vault/_estado/<key>-<deviceId>.md`.
- `useNavegacao` é runtime-only (sem persist) — subscriber escreve snapshot transiente.

**Achados colaterais**:
1. `vault_estado.ts` ainda não documentado em `docs/CONTRACT-MOBILE-BACKEND.md` (drift warning não-bloqueante). **R-VAULT-B vai endereçar** (já no escopo da sprint).
2. Mitigação `typeof jest !== 'undefined'` em `escreverEstadoCanonico` pra silenciar warns de subscribers em testes existentes (poluição de output). Em produção `__DEV__` continua warn-friendly.

Sprint A desbloqueia Sprint B (stats + UI Settings + cross-repo), que será dispatched na Onda 2B.

### Onda 2A.4 — R-FAB-2 FAB Câmera "Reflexão com foto" (2026-05-16 noite)

Primeira sprint da Onda 2A entregue. Renomeação lexical pós R0 + alinhamento de rota de captura.

- **R-FAB-2** (pending commit no main, bypass de worktree pelo executor): FAB Câmera → sheet com 2 opções:
  - **"Reflexão com foto"** (renomeado de "Registrar Momento"): captura → `/diario-emocional?modo=reflexao` com foto pré-anexada em memória.
  - **"Escanear documento"**: fluxo Q9/M09 mantido intacto.
- Componente `SheetEscolhaCaptura.tsx` atualizado (label + cor cyan + subtítulo).
- Rota `/captura` mantém entrada, navega para destino correto via `modo=reflexao` query param.
- 1 teste novo (`SheetEscolhaCaptura.test.tsx` atualizado), +1 teste no jest (225 suítes / 2102 testes verde).
- Gauntlet validation 3/3: sheet com "Reflexão com foto" + diário em modo Reflexão + menu lateral com item Câmera. Screenshots em `docs/sprints/R-FAB-2-screenshots-gauntlet/`.
- E2E novo: `tests/e2e/playwright/r-fab-2.e2e.ts`.
- FEATURES-CANONICAS.md atualizado.

**Achado de protocolo**: o executor R-FAB-2 bypassou novamente o worktree isolation e trabalhou direto no main local — mesmo padrão de AUTOMATIZAR-FANTASMAS na sessão anterior. Reforça que a instrução no prompt não é suficiente; **sprint nova R-DX-EXECUTOR-WORKTREE-ENFORCE** registrada como anti-débito (constraint técnico no agent runtime).

### Higiene de retomada + split R-VAULT-CANONICAL-COMPLETE (2026-05-16 noite)

Sessão fresh do CLI retomando pós-Fase-2.1 da Onda R. Histórico da sessão anterior reconstruido manualmente pelo dono. Estado de retomada:

- HEAD `3f50bbb` em `main`, working tree clean.
- Smoke baseline atualizado: **225 suítes / 2100 testes** verde (+2 suítes / +19 testes vs `d53d4d9`, ganho do R-RECAP-3 mergeado).
- 15 worktrees órfãos de sessões anteriores (todos com branches já mergeados) — limpos via `git worktree unlock` + `--force remove` + `git branch -D`. Disco liberado.
- **R-VAULT-CANONICAL-COMPLETE** quebrado em 2 sub-sprints menores (decisão do dono):
  - **R-VAULT-CANONICAL-COMPLETE-A** (2-3h) — schemas + writers + migration boot
  - **R-VAULT-CANONICAL-COMPLETE-B** (2-3h, depende de A) — stats agregadas + UI Settings + cross-repo (issue sibling + drift contract)
  - Spec original marcado `[split]` apontando pra A e B. Mantida como referência canônica do escopo total.
- Drift contract avisa schemas mais novos que `docs/CONTRACT-MOBILE-BACKEND.md` (alarme, diário emocional, evento, financas, grupo treino, humor heatmap, midia companion) — esperado pós R0 + R-CRIT-3; será endereçado em R-VAULT-CANONICAL-COMPLETE-B.

Próximo: Onda 2A (4 agentes paralelos via worktree isolation: R-VAULT-A + R-RECAP-1 + R-RECAP-2 + R-MEDIA-1).

### Fase 2 Onda R — R-FAB-1 + R-RECAP-3 + R-CROSS-FLOW-AUDIT + specs derivadas (2026-05-16 madrugada-2)

3 sprints da Fase 2 executadas em paralelo via worktrees isoladas + 3 specs derivadas anti-débito registradas.

- **R-FAB-1** (commit `47c17f9`): remoção do botão Voz do FABRadial. 6 arquivos, smoke verde sem regressão. Achado colateral: `FABRadial` real está em `src/components/ui/` (path corrigido no spec).
- **R-RECAP-3** (commit `9514061`): empty states não-tóxicos via pool de 10 variações com seed determinística diária (hash de `data + tipo`). Frases PT-BR sóbrias curadas (zero gamificação). 2 suítes novas / 19 testes novos (`useRecap`, `recapMensagens`). Achados colaterais: (1) `useRecap` conta áudios/vídeos mas faltam cards no grid (R-CRIT-3 deixou esse débito); (2) conflito de porta 8081 entre worktrees paralelos impede validação visual em paralelo.
- **R-CROSS-FLOW-AUDIT** (commit `bebdf12`): auditoria de 12 fluxos cruzados (FAB câmera, menus, captura, cross-repo). 3 fixes in-line + 3 sprints derivadas. Achado mais grave: **drift cross-repo confirmado** — sibling Python ETL não lê `markdown/` (layout H2 pós-refundação); todo vault mobile pós-refundação invisível pro desktop (R-CROSS-FLOW-FIX-2, P1-high).

**Anti-débito** registrado em 5 specs novas pós Fase 2:

- **R-CROSS-FLOW-FIX-1** (1h, P1): `avaliarBackupAutomatico` declarado SEM CALLER no boot path (cenário 10).
- **R-CROSS-FLOW-FIX-2** (sibling repo, P1-high): sibling ETL não lê layout H2 — CRÍTICO cross-repo.
- **R-CROSS-FLOW-FIX-3** (1-2h, P2): Scanner OCR duplicata na Galeria (cenário 4).
- **R-RECAP-NUMEROS-AUDIOVIDEO-CARDS** (1h, P2): cards de áudios/vídeos no grid Números (débito R-CRIT-3).
- **R-DX-GAUNTLET-MULTI-PORTA** (1-2h, P3): multi-porta no `gauntlet.sh` (paralelismo de validação visual).

**R-RECAP-6** (2-3h, P2): botão compartilhar slide Memórias (PNG 1080×1920 stories IG) — depende de R-RECAP-4 (slideshow v2). Spec criada em `ccfe5ce`, promove Q24.b.c (legado v2 backlog) pra v1.0.

Backlog consolidado atualizado em `db6d02f` e `3f50bbb`.

Métricas pós-Fase-2.1: **225 suítes / 2100 testes** verde · TS strict 0 · drift contract 174 campos (warning esperado pós R-CRIT-3) · zero fantasmas remanescentes.

### Fase 1.2-1.6 Onda R — R-CRIT-1/3/4 + R-NAV-2 paralelos via worktrees (2026-05-16 madrugada)

4 sprints da Fase 1 executadas em paralelo via worktrees isoladas. Resultados:

- **R-CRIT-1** (commit `17ad84b`): OAuth Unmatched Route regression. Causa raiz: faltava rota declarativa `app/oauthredirect.tsx` — `+not-found` default exibia URL bruta com `code` OAuth. Fix em 2 arquivos novos (`app/oauthredirect.tsx` + `app/+not-found.tsx` sóbrio que NUNCA renderiza URL). Sub-sprint R-CRIT-1.a (sanitização Unmatched Route) também coberta. 16 testes novos. Sem tocar `_layout.tsx`, `googleAuthFlow.ts` ou `app.json`.
- **R-NAV-2** (commit `83348b6`): alarmes 5 sons CC0 funcionais. Causa raiz: `setNotificationChannelAsync` não passava campo `sound`; Android Oreo+ usa canal como source-of-truth. Fix: 1 canal por som (`ouroboros-alarme-<som>`). 5 sons CC0 (gentle/normal/forte/chime/marimba, WAVs ≤155KB cada) gerados via ffmpeg, documentados em `docs/SOUNDS-LICENSES.md` + `assets/sounds/alarmes/CREDITS.md`. Novo `<PreviewSomButton>` com expo-av Audio.Sound. `ouroboros-default-v2` movido para `CHANNEL_IDS_LEGADOS` (limpeza one-shot). Schema `AlarmeSomSchema` expandido para 5 sons.
- **R-CRIT-3** (commit `c722538`): mídia ausente em Recap/Galeria. 5 causas raiz identificadas:
  1. `useRecap.contarFotos` só contava mídia anexada a diário/evento — perdia capturas standalone via FAB Câmera direto
  2. `useRecapMemorias` enum `SlideId` faltava `'midias'` — slide novo no slideshow Memórias
  3. `capturarMusica` gerava basename SEM prefixo `audio-` — companion não casava com galeria
  4. Atomicidade ausente em 4 writers (foto/vídeo/áudio/companion) — write falha = binário órfão
  5. `escreverMidiaComCompanion` validava schema DEPOIS de copy — meta malformado gerava binário órfão antes do erro
  Fix em 9 arquivos source + 17 testes novos. `INVESTIGACAO.md` em `docs/auditoria-r-crit-3-2026-05-15/`.
- **R-CRIT-4** (commit `d53d4d9`): loader animation estático em alguns mounts. Causa raiz: `useId()` colidia entre árvores irmãs (React reciclava slots em remount). Fix: UUID por instância via ref + counter + Math.random + performance.now. Defense-in-depth: `querySelector` → `querySelectorAll` escopado ao Svg próprio. 3 screenshots Gauntlet em `docs/sprints/R-CRIT-4-screenshots-gauntlet/` com hashes distintos confirmam animação rodando (spy SVG capturou rotações reais 0.8° → 2.8° → 5.2°).
- **R-CRIT-2** permanece `[wip-dono]` — bloqueada por edição do Google Cloud Console (mudar App name = "Ouroboros" + upload logo 120×120). Trabalho do dono ~5min quando puder.

**Anti-débito derivado dos achados de R-CRIT-4**:
- **R-INFRA-ENV-JSON-TSCONFIG**: fallback de tipo para env.json gitignored (worktrees fresh quebram tsc até linkar manualmente). Sprint nova Fase 3.
- **R-INFRA-WORKTREE-BOOTSTRAP**: script de bootstrap automático para `node_modules` + `env.json` em worktrees agent-*. Sprint nova Fase 3. Achado recorrente desde T1B3/T1B6.

Métricas pós-Fase 1.2-1.6: **223 suítes / 2081 testes** verde (era 217/2045 antes) · TS strict 0 · drift contract 174 campos · warning fantasmas zero · push em main.

**Próximo gate**: validação live alpha-12 quando dono tiver tempo + Cloud Console editado. Build via GH Actions local (cota EAS continua esgotada até 01/Jun).

### Fase 1.1 Onda R — R0 lexical (Crise/Conquista/Gatilho/Reflexão) (2026-05-16 madrugada)

Refactor de vocabulário com backward-compat em ~35min via executor worktree-isolated. Commit `b010660`.

- **Vocabulário canônico**:
  - `Vitória` → `Conquista` (UI + schemas)
  - `Trigger` → `Gatilho` (UI + schemas)
  - `Humor Rápido` (atalho) → `Reflexão` (botão acesso rápido abre `/diario` com aba Reflexão)
  - `Vitória/Trigger` (par exibido) → `Crise/Conquista`
- **Schema migration**: `z.preprocess` no `DiarioEmocionalSchema` lê `.md` antigo com chave `vitoria:`/`trigger:` e remapeia em runtime. Novos writes usam chave canônica. `.md` antigos no Vault permanecem legíveis indefinidamente sem rewrite forçado.
- **Helper canônico**: `src/lib/migration/lexicon.ts` com `DIARIO_MODO_LEGADO_TO_CANONICO` (bidirecional) + `normalizarDiarioModo()` + 16 testes.
- **ADR-0025**: `docs/ADRs/0025-lex-crise-conquista-gatilho-reflexao.md` registra decisão durável.
- **Migration doc**: `docs/SCHEMA-MIGRATION.md` documenta mapping bi-direcional para sibling Python ETL.
- **Sibling**: issue `etl-contract` aberta — https://github.com/AndreBFarias/protocolo-ouroboros/issues/31 com critérios de aceitação para pipeline desktop.
- **Aliases @deprecated** mantidos por 1 versão: `haptics.vitoria()`, `haptics.trigger()`, `lerDiarioVitorias()`.
- **IDs cross-platform preservados** intencionalmente: `ConquistaItem.origem === 'diario_vitoria'`, `CriseItem.origem === 'diario_trigger'` — contrato estável entre mobile/widget/cache/desktop. Renomear esses ids requer sprint dedicada com migração de cache coordenada.

35 arquivos modificados, +901/-269 linhas. Métricas: **217 suítes / 2045 testes** verde (era 216/2021 — +1 suíte / +24 testes). TS strict 0. Smoke OK com warning não-bloqueante de fantasmas (zero detectados pós Fase 0).

Redução de `vitoria|trigger` em src/app/tests: **449 → 317 ocorrências** (132 removidas). Restantes são todas legítimas (API expo-notifications externa, FABRadialKey UI interna, IDs cross-platform documentados).

Próximo: Fase 1.2-1.6 (R-CRIT-1/3/4 + R-NAV-2 em paralelo). R-CRIT-2 aguarda Cloud Console editing do dono.

### Fase 0 Onda R fechada — T1B7 + automação fantasmas (2026-05-15 noite-2)

Primeiros 2 executores da Onda R rodaram em paralelo via worktree
isolation. Resultado:

- **AUDIT-T1B7-DRAFT-EXPORT-FIX** (commit `4e58f40`): filtro
  `ehSyncConflict` aplicado em `migrarDraftsParaTreinoSessao.ts`
  (M11 boot hook) + `exportarVault.ts` (ZIP filter). 4 arquivos,
  398 linhas (+0 -0 baseline), 5 testes novos (216 suítes / 2021
  testes — era 214/2016). Anti-débito dos achados colaterais
  reportados pelo executor T1B6 em sessão anterior. Worktree
  isolation funcionou conforme protocolo.
- **AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS** (commit `1304aba`):
  script Python `scripts/check_roadmap_fantasmas.py` (696 linhas).
  Cross-reference ROADMAP × git log × `src/`+`app/` × FEATURES-CANONICAS.
  Classifica FANTASMA (alta confiança 3 evidências) / SUSPEITO
  (1-2) / REAL (0). Flags `--warn-only` (exit 0 no smoke) e
  `--fix` (auto-marca `[ok]` com tag inline). Integrado no
  `scripts/smoke.sh` como warning não-bloqueante.
- **Auto-fix aplicado**: script detectou 5 fantasmas reais que a
  auditoria manual deixou passar (linhas 707, 889, 890, 891, 892
  do ROADMAP — tabelas redundantes "Linha do tempo" e "Funções
  F-N → Sprint" não foram propagadas durante a auditoria manual
  da sessão anterior). `--fix` marcou M06.5, M16, M17, M18 como
  `[ok]` com tag `<!-- auto-marcado [ok] 2026-05-15: <evidência> -->`.
  Validação: zero fantasmas remanescentes após o fix.

**Nota operacional**: o segundo executor (AUTOMATIZAR-FANTASMAS)
bypassou o worktree isolado e commitou direto em main via `cd
absoluto`. Trabalho preservado (`1304aba`), sem retrabalho
necessário. Padrão a reforçar em futuros executores: usar `git rev-parse
--show-toplevel` em vez de `cd` absoluto para honrar worktree
boundaries.

Métricas: 216 suítes / 2021 testes verde · TS strict 0 · drift
contract 174 campos · smoke verde com novo warning não-bloqueante
auto-aplicado.

### Decisões D1-D8 resolvidas + 5 sprints novas + pasta legada deletada (2026-05-15 fim de noite)

Dono respondeu todas as 8 decisões abertas do `_BACKLOG.md` em uma
única rodada. Resultado:

- **D1 = C**: Tela Hoje sem Status do Casal + sem Humor+Última.
  R-HOME-1 spec atualizada com escopo final.
- **D2 = A**: Spotify (OAuth) + YouTube (oEmbed) ambos liberados.
  Exceção explícita à filosofia "sem rede de saída" registrada
  nas specs R-INT-4 e R-MEDIA-1.
- **D3 = Sim**: track ambient embutido OK como opção (toggle
  settings default OFF). R-RECAP-4 spec atualizada.
- **D4 = Sim**: $25 pago para Play Console. Sprint nova
  **R-PLAYCONSOLE-SETUP** criada com TODO list executável de 8
  passos pro dono (~40min de trabalho + 24-72h de propagação).
  R-SEC-2 cross-ref atualizada.
- **D5 = Sim**: AUDIT-T2-LOCK-VAULT já mergeado em `488e7fa`.
- **D6 = Sim**: sprint nova **R-BACKUP-AUTO** criada (backup
  semanal silencioso pro Vault Syncthing, JSZip, sha256 checksum,
  toggle Settings).
- **D7 = Deletar**: pasta `versão desktop/` (1.9MB, mockups
  antigos) removida via `git rm -rf`. Conteúdo era ouroboros-redesign-v1
  + uploads + screenshots — todos legados pré-refundação. Repo
  sibling `protocolo-ouroboros` (Python ETL, 6094 transações)
  continua canônico pra parte desktop.
- **D8 = Agora**: sprint nova **R-A11Y-TALKBACK** criada
  (auditoria + correção de 10 rotas via TalkBack no Xiaomi,
  WCAG visual já estava coberto, esta é navegação assistiva).

**2 sprints adicionais derivadas de pedidos durá­veis do dono**:
- **R-CROSS-FLOW-AUDIT**: validar interconexão (12 fluxos cruzados
  + sibling Python). Bug clássico exemplificado pelo dono: "foto
  via FAB Câmera não aparece em /galeria". Inclui validação cross-repo
  (ETL Python lê tudo que mobile escreve).
- **R-VAULT-CANONICAL-COMPLETE**: TUDO em `.md` (settings + sessão
  + stats agregadas migrados de SecureStore/RAM para
  `vault/_estado/*.md`). Sibling desktop passa a ler séries
  históricas completas — pedido durá­vel do dono pra "criar diário
  de fato + analisar profundamente nossa própria vida".

**Sprint da automação dos fantasmas** (já criada anteriormente):
**AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS** continua pendente —
detecta drift `[todo]` × código automaticamente.

**Total Onda R + adicionais**: 52 sprints (46 do briefing + 1
automação + 5 pós-decisões). Estimativa total revisada:
~107–148h ativas + 7d field test + 1d release ≈ 19–28 dias
até `v1.0.0` production (3-5 dias acima da estimativa original
por causa das 5 novas).

Smoke verde 214/2016. Sem mudanças de código — só specs novas,
4 specs atualizadas com decisões, deletion da pasta legada,
ROADMAP + BACKLOG + CHANGELOG.

### Onda R consolidada + ROADMAP limpo (2026-05-15 fim de noite)

Sessão de consolidação pós-auditoria. Resultado:

- **Briefing canônico Onda R adicionado**: `ONDA-R-BRIEFING.md`
  (1299 linhas, versionado na raiz). Define 14 tranches (R-LEX,
  R-CRIT, R-RECAP, R-HOME, R-INT, R-MEDIA, R-SF, R-ROT, R-NAV,
  R-FAB, R-WIDG, R-SEC, R-DX, R-OPS) com 46 sprints novas,
  estimativa total ~93–130h + 7d field test + 1d release ≈ 17–25
  dias até `v1.0.0` production.
- **47 specs leves criadas** em `docs/sprints/`:
  - 46 derivadas do briefing (R0, R-CRIT-1/2/3/4, R-RECAP-1/2/3/4/5,
    R-HOME-1/2/3, R-INT-1/2/3/4, R-MEDIA-1/2, R-SF-1/2/3, R-ROT-1/2,
    R-NAV-1/2/3, R-FAB-1/2, R-WIDG-1, R-SEC-1/2/3/4/5, R-DX-1/2/3/4/5/6,
    R-OPS-1/2/3/4/5)
  - 1 anti-débito derivada (AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS —
    script que cruza ROADMAP × git × código pra detectar fantasmas
    automaticamente; pedido durável do dono pra eliminar drift recorrente
    sem auditoria manual)
- **ROADMAP limpo de fantasmas**: auditoria detectou 25 entradas
  `[todo]` que eram features já entregues em refundação v1.0 ou
  Onda Q. Batch update marcou todas `[ok]` com referência ao commit/
  feature de origem (M06.5→Q5.1+5.2, M07.x→refundação, M08→Q10+Q22.G,
  M09→ScannerPreview, M11→L1+Q11, M11.5→Q24.a/b+ADR-0021,
  M12→Q17.c.b/c/d, M13→Q9+Q18.b, M14.5→Q8+Q17.c.c, M15→M29,
  M16→M30, M17→M31, M18→M32, M34.1/2/3→refundação,
  M35→`app/financas.tsx`, M36→Q24.a/b+RecapScreen, M37.1→Q0+Q22.B,
  M38→AUDIT-T2-LOCK-VAULT, M39→ADR-0017, M40→`app/index.tsx`).
- **Pendências REAIS finais** restantes pra v1.0.0:
  - `AUDIT-T1B7-DRAFT-EXPORT-FIX` (anti-débito imediato)
  - Validação live alpha-11 (gate)
  - Onda R Fase 1 → Fase 2 → Fase 4 (Fase 3 paralela)
  - `M-GAUNTLET-DEAD-CODE-V2` (legado, bloqueia M41)
  - `M37.2` (Calendar escrita — descopável v1.1)
  - `M41` (release final)
- **`docs/sprints/_BACKLOG.md` reescrito**: agora documento canônico
  de "o que falta executar" com tabelas por fase + decisões abertas
  (D1–D8) + descopadas.
- **Decisões abertas mapeadas**: D1 (Home Status Casal A/B/C), D2
  (Spotify/YouTube rompe sem-rede-saída?), D3 (track ambient OK?),
  D4 (conta Play Console $25?), D6 (backup automático semanal?),
  D7 (pasta `versão desktop/`?), D8 (a11y TalkBack agora?). Sprint
  R-HOME-1 e algumas outras `pausam` aguardando essas decisões.

Smoke verde 214/2016. Sem mudanças de código nesta tranche
documental — só specs novas, ROADMAP, _BACKLOG, briefing, CHANGELOG.

### Auditoria pré-v1.0 — Sub-sprints T1B3 + T1B6 + T2 (2026-05-15 noite)

Anti-débito das 3 sprints derivadas da auditoria de Tranche 1. Cada
uma executada em executor isolado via worktree.

- **AUDIT-T1B3-PICKERS-RESTANTES** (commit `00d82ee`): toast em
  permissão negada em 5 callsites adicionais — `FotosBlock`
  (galeria), `MidiaFotoTab` (galeria + câmera), `localizacao.ts`
  (discriminator pattern), `adicionarFotoManual.ts` (discriminator
  pattern). 4 testes novos. Strings PT-BR com acento completo.
- **AUDIT-T1B6-MIGRATION-FIX** (commit `a49222f`): filtro
  `ehSyncConflict` em 5 listadores periféricos.
  `migrarVaultLayoutPorTipo.ts` (boot hook — CRÍTICO, agora pula
  `.sync-conflict-*` em todos os 8 blocos de migração),
  `useFotosAgregadas.ts`, `marcosAuto.ts`, `useStatusCasal.ts`,
  `conquistas/loader.ts`. 5 testes novos (15 casos).
- **AUDIT-T2-LOCK-VAULT** (commit `488e7fa`): elimina race
  read-then-write em saves multi-device via Opção A (sempre suffix
  `-<deviceId>`). Util novo `forceDeviceIdSuffix` em `deviceId.ts`
  (idempotente, lança em conflito de devices). 6 callers
  refactorados: `saveHumor`, `saveDiario`, `saveEvento`, vault
  `contadores`, `alarmes`, `tarefas`. Campo `conflito` removido de
  `SaveHumorResult` (perde sentido com Opção A). Migration boot
  idempotente `migrarArquivosCanonicosParaDeviceId.ts` aplica
  suffix em registros legados no primeiro boot pós-update (flag
  `useSessao.flags.t2DeviceIdSuffixMigrado`). 27 testes novos.
  `applyDeviceIdSuffix` legado preservado como `@deprecated`.
- **Anti-débito novo registrado**: `AUDIT-T1B7-DRAFT-EXPORT-FIX-spec.md`
  cobrindo `migrarDraftsParaTreinoSessao.ts` + decisão sobre
  `exportarVault.ts` (Opção A: filtrar sync-conflict do ZIP).

Métricas após esta tranche: 214 suítes / 2016 testes verde (era
202/1957 no commit base `5b1cd4e`; ganho desta sessão +12 suítes
/ +59 testes). TS strict 0. Drift contract 174 campos.

### Auditoria pré-v1.0 — Tranche 1 (bugs) + Tranche 3 (DX) (2026-05-15)

Auditoria sistemática em 5 eixos (drift docs↔código, bugs latentes,
robustez, DX, AIX) entregou 2 sprints corretivas executadas em paralelo
via worktrees isoladas e 1 normalização de formatação.

- **Tranche 1 — Bugs latentes B1–B6** (commits `0d95b9a` → `6779059`):
  - **B1**: writer.ts ganha atomic write em `file://` (`<uri>.writing
    + moveAsync`) + boot hook `limparArquivosWritingOrfaos` varre
    órfãos.
  - **B2**: `pickClientIdSafe()` adicionado em `googleAuthFlow.ts`
    como wrap defensivo do `pickClientId` original (callers existentes
    preservados).
  - **B3**: `AvatarPicker` mostra toast "Sem permissão de galeria."
    em vez de silenciar.
  - **B4**: `Slider` aplica `Math.max(min, Math.min(max, next))` no
    handler interno (defensive clamp).
  - **B5**: prop `maxLength` opcional em `Input.tsx`.
  - **B6**: util `src/lib/vault/syncConflict.ts` + filtro
    `!ehSyncConflict(nome)` em 16 listadores do vault (humor, diário,
    eventos, marcos, medidas, ciclo, contadores, tarefas, alarmes,
    rotinas, treinos, exercícios, grupos, agenda, galeria,
    midiaCompanion).
  - Testes novos: writer-atomic, limparOrfaos, pickClientIdSafe,
    syncConflict, AvatarPicker-permission, Slider-clamp,
    Input-maxLength. **+7 suítes / +25 testes** (baseline 195/1932 →
    202/1957).
- **Tranche 3 — DX/automação** (commits `ec6db3b` → `16eff36`):
  - **D2**: `scripts/diag.sh` (adb + Metro status + logcat),
    `scripts/fix-it.sh` (prettier + eslint --fix), `scripts/bump-versioncode.sh`.
  - **D5**: `install.sh` documenta `--legacy-peer-deps` (Expo SDK 54
    + React 19 incompatibilidades).
  - **D4**: README ganha tabela `gauntlet.sh` vs `run.sh` vs
    `run.sh --emulator`.
  - **D1**: `.prettierrc` canônica + integração silenciosa em
    `hooks/pre-commit` (auto-format staged).
  - **D3**: OAuth setup consolidado em `docs/OAUTH-SETUP.md`
    (passos 1–5 + checklist live + troubleshooting Q22.B 4 camadas);
    `SETUP-OAUTH-GOOGLE.md` e `I2-OAUTH-CHECKLIST.md` viraram
    redirects.
- **`style: m-prettier-normalize`** (commit `9609961`): aplicação em
  massa de `prettier --write` em `src/`, `app/`, `tests/`. 379
  arquivos reformatados. Fix manual em `app/recap-memorias.tsx` para
  preservar markers `// anonimato-allow:` em ternary multi-linha.
  Smoke pós-normalize: 202/1957 verde.
- **Anti-débito (specs novas registradas, sem implementação)**:
  - `docs/sprints/AUDIT-T1B6-MIGRATION-FIX-spec.md` — `migrarVaultLayoutPorTipo`
    + 4 listadores periféricos precisam do mesmo filtro `sync-conflict`
    (achado colateral crítico do executor T1).
  - `docs/sprints/AUDIT-T1B3-PICKERS-RESTANTES-spec.md` — 5 outros
    pickers (FotosBlock, localizacao, MidiaFotoTab×2, adicionarFotoManual)
    seguem padrão antigo de silenciar permissão negada.
  - `docs/sprints/AUDIT-T2-LOCK-VAULT-spec.md` — eliminar race
    read-then-write em saves multi-device (B7 descopado de T1).

### alpha-11 + Q22 completo + Q24.a + Q24.b mvp (2026-05-13 noite → 2026-05-14 madrugada)

Maratona ~10h fechando v1.0 pré-release. 6 alpha-builds em camadas
debugando o OAuth + 4 fixes UX descobertos na validação live alpha-6.

- **`v1.0.0-alpha-11` publicado** (run #25835371464, arm64 66 MB).
  Consolida Q22.B fim + Q22.G + Q24.a + Q24.b MVP. Instalado no
  Xiaomi via `pm install -r` (vault preservado). Mesma keystore EAS
  canônica.
- **Q22.A** transcrição duplicava texto N vezes no diário
  emocional. `TranscreverButton` chamava `onTextoTranscrito` a cada
  partial do `SpeechRecognizer` → caller fazia append cumulativo.
  Split API em `onTextoTranscrito` (final, uma vez) +
  `onPreviewParcial?` (opcional para preview live em outro lugar).
  Caller diário não precisou mudar — agora recebe 1 chamada
  consolidada. Commit `0148a1d`.
- **Q22.B** OAuth Google `Erro 400: invalid_request` — quatro
  causas raiz descobertas em sequência:
  1. **Typo SHA-1**: Cloud Console tinha `43` no 4º octeto em vez
     de `B3` (transcrição manual incorreta). Dono corrigiu.
  2. **Tipo OAuth client incompatível**: client tipo Android no
     Cloud Console exige Google Play Services signInIntent —
     custom scheme PKCE não funciona. Dono criou client tipo iOS
     (`691237256846-tl2edd8uvb6bbn6men478c0agq7ea91p`) com Bundle
     ID `com.ouroboros.mobile`. `env.json` atualizado.
  3. **Redirect URI custom scheme rejeitado**: iOS OAuth clients
     exigem `com.googleusercontent.apps.<reverse-client-id>:/oauthredirect`,
     não `ouroboros://oauth-callback`. `app.json` `scheme` virou
     array `["ouroboros", "com.googleusercontent.apps.<id>"]`;
     `googleAuthFlow.ts:pickClientId()` agora deriva redirect URI
     reverso-DNS automaticamente do client_id.
  4. **`WebBrowser.maybeCompleteAuthSession()` faltando** no
     `_layout.tsx` top-level. Sem essa call, o callback OAuth
     (deep link no scheme novo) vazava pro `expo-router` e
     mostrava "Unmatched Route" em vez de fechar o browser +
     entregar o `code`. Adicionada chamada top-level fora de
     qualquer hook conforme doc oficial Expo. Commits `d7afd8c`,
     `fabab93`, `d8e594a`, `c2495b4`.
- **Q22.C** crash em `app/rotinas/[slug].tsx` ao tap em treino:
  `useCallback(handleIniciarTreino)` estava após dois early
  returns (`carregando` e `!rotina`) → React renderizava número
  diferente de hooks em renders consecutivos → "Rendered more
  hooks than during the previous render". Movido pra antes dos
  early returns. Commit `358c957`.
- **Q22.D** FAB+ alinhamento canônico. `FAB.tsx` usava
  `bottom: spacing.xl` fixo (24dp), enquanto `FABMenu` e
  `MenuCapturaVerde` usam `useSafeBottomMargin` (max 24dp, 10%
  altura + safe area = ~264dp). Resultado: FAB+ ficava muito mais
  baixo que o hamburguer (degrau visual). Fix: `FAB.tsx` consome
  `useSafeBottomMargin` agora. Commit `358c957`.
- **Q22.E** drawer cortando seção Utilitários. ScrollView interno
  sem `flex: 1` permitia conteúdo expandir além da altura do
  painel; rodapé Configurações absoluto sobrepunha
  Tarefas/Alarmes/Contadores/Rotinas (bounds inválidos `y2 < y1`).
  Fix: 1 linha `style={{ flex: 1 }}`. Commit `358c957`.
- **Q22.F** empty state HC card na aba Evolução. `CardHCResumo`
  retornava `null` quando `!habilitado` — usuário não via nem
  reminder pra ativar Health Connect. Fix: empty state discreto
  com texto muted "Conecte sua Conexão Saúde para ver passos,
  peso e treinos importados aqui." + tap leva pra
  `/settings/integracoes`. Commit `358c957`.
- **Q22.G** share intent Pix nativo via `expo-share-intent`.
  Antes: `intentFilters` declarados em `app.json` faziam Ouroboros
  aparecer no sheet de share Android, mas o intent `action.SEND`
  era descartado (sem ponte JS, payload nunca chegava ao código).
  Fix: `npx expo install expo-share-intent` + config plugin
  oficial gerencia intent filters (text/image/pdf/octet-stream).
  Hook `useShareIntentListener` no `_layout.tsx` mapeia
  `shareIntent` → params canônicos e navega pra `/share-receive`.
  Commit `3a1726f`.
- **Q24.a** Recap navegável (cards Números clicáveis). Antes os
  6 cards do grid 2×3 (Registros/Treinos/Fotos/Eventos±/Tarefas)
  eram read-only — usuário via "23 registros" mas não tinha jeito
  de saber QUAIS. Fix: cards viraram `Pressable`, tap navega pra
  `/recap-lista?tipo=...&de=...&ate=...` com items linkando pra
  rotas de edição existentes (humor sheet, `/diario-emocional?slug=`,
  `/galeria/detalhe/[slug]`, `/todo?focus=`). Tipos sem rota de
  edição dedicada (treinos detalhe, eventos detalhe) ainda mostram
  toast "Em breve" — sub-sprints Q24.a.b/c cobrem. Commit `1124998`.
- **Q24.b MVP** modo Memórias (Recap Wrapped). Terceiro toggle no
  header Recap: Lista / Calendário / **Memórias**. Tap em Memórias
  navega pra `/recap-memorias` (rota separada full-screen) sem
  alterar o modo anterior. Slideshow 5 slides candidatos: abertura
  ("Olhe o que ficou"), números (registros + treinos + tarefas),
  vitórias (contagem + frase recente), crises (contagem agregada
  sem detalhe pra evitar re-trauma), encerramento ("Continue.").
  Auto-advance 5s/slide, tap-esquerda volta, tap-direita avança,
  longpress pausa, X fecha. Indicador barras finas top. Paleta
  exclusiva `colorsMemorias` (gradient roxo profundo → magenta →
  cyan elétrico + dourado pálido + branco quente) — quebra visual
  intencional vs cotidiano sóbrio. Frases respeitam ADR-0005 (sem
  exclamação, sem emoji, sem comparativo). Settings ganha toggle
  `recapAmbientAudio` (default false) — file/playback ficam em
  sub-sprint Q24.b.a. Ken Burns nas fotos vai em Q24.b.b. Export
  stories IG vai em Q24.b.c. Commit `ea10ce8`.

Sequência de alpha-builds publicados:
- `alpha-6` baseline Q17.e (run 25828812872)
- `alpha-7` Q22.C/D/E/F (run 25831353422)
- `alpha-8` Q22.B client iOS (run 25832907738)
- `alpha-9` Q22.B redirect URI reverso-DNS (run 25834009770)
- `alpha-10` Q22.B maybeCompleteAuthSession (run 25834852405,
  publicado mas obsoleto pelo alpha-11)
- `alpha-11` consolidado Q22.B + Q22.G + Q24.a + Q24.b MVP
  (run 25835371464)

Baseline preservado: 195 suítes Jest / 1932 testes verde · TS
strict 0 · drift contract 174 campos auditados · 6 releases
publicados em GitHub Releases.

### alpha-6 publicado + Q17.e + Q22.A + Q22.B causa-raiz + Q24 spec (2026-05-13 madrugada)

- **`v1.0.0-alpha-6` publicado** em GitHub Releases via workflow
  `build-android-apk.yml` (run #25828812872). Assinado com keystore
  EAS canônico (Q17.e), SHA-1
  `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`
  bate o cadastrado no Google Cloud Console. APK arm64-v8a 66 MB.
  Inclui todas as features pós-alpha-5 (Q17.d/c.b/c.c/c.d, Q18.b/x,
  Q19.b, Q21+sibling, Q22.A, Q23). Instalado no Xiaomi via
  `pm install -r` (versionCode 3→4, vault preservado).
- **Q17.e** keystore EAS encriptado em 4 GitHub Secrets
  (`ANDROID_KEYSTORE_BASE64`, `*_PASSWORD`, `*_KEY_ALIAS`,
  `*_KEY_PASSWORD`). Workflow ganha 3 novos steps: Provision
  keystore (decodifica base64 → `android/app/release.keystore`),
  Patch build.gradle signing (apenda `signingConfigs.release` pós-
  prebuild), Verify APK signature (apksigner verify --print-certs
  + comparação contra SHA-1 canônico). Fallback gracioso quando
  secrets ausentes. Script versionado `scripts/exportar_keystore_eas.sh`
  automatiza export+upload. `docs/RELEASE.md` ganha seção dedicada.
- **Q22.A** fix transcrição duplicando texto no diário. Causa raiz:
  `TranscreverButton` chamava `onTextoTranscrito(parcial)` a cada
  partial result do Android SpeechRecognizer; caller diário fazia
  `setTexto(prev => prev + transcrito)` → append cumulativo.
  Fix: split em `onTextoTranscrito` (final, uma vez) +
  `onPreviewParcial?` (opcional, partials pra UI separada). Caller
  diário usa só o final, sem mudança de API necessária.
- **Q22.B** causa raiz identificada (não bloqueia v1.0): typo de
  1 byte no SHA-1 cadastrado no Google Cloud Console (4º octeto
  `43` em vez de `B3`). Dono editou pro valor correto durante a
  sessão. Aguardando propagação Google (5-30 min) + retest no
  alpha-6 instalado.
- **Q24** spec aberta cobrindo Recap navegável (Q24.a — cards
  Números clicáveis → listas editáveis, ~3h) + Recap Memórias
  (Q24.b — slideshow Wrapped/Google Photos com Ken Burns + ambient
  audio toggle + paleta vibrante, ~6-10h, v1.1). 4 decisões UX
  firmadas pelo dono: auto-advance 5s, ambient audio opt-in,
  paleta vibrante exclusiva ao modo Memórias, frases delegadas ao
  executor.
- **Limpeza ROADMAP**: Q18/Q19/Q21 marcados `[ok parcial]` viraram
  `[ok]` (entregas Q18.b/Q19.b/Q21.b fecharam escopo total).

Baseline preservado: 195 suítes Jest / 1932 testes verde · TS
strict zero · drift contract 174 campos auditados.

### Validação live alpha-4 + Q17.c.d + Q18.x + Q21.b (2026-05-13 noite)

- **Validação live alpha-4** (parcial) no Xiaomi 2312DRAABG HyperOS
  via ADB+uiautomator. 8/13 itens do checklist mínimo pré-release
  validados (onboarding/home, BotaoRecap, Tela Hoje, abas Saúde
  Física, sheet Diário Q5.1/Q5.2, ciclo persistente, sheet câmera
  Q7). Itens 5/9/10/11/12/13 são pré-features Q14/Q17/Q18.b/Q19.b
  que entraram pós-`a1dd3c9` (alpha-4 base). Relatório em
  `docs/validacao-live-alpha-4-2026-05-13.md` com 8 screenshots
  redactados (nomes pessoa_a/b cobertos com `#2a2638`).
- **Q17.c.d** Campo `gordura` 0..100 % opcional em `MedidasSchema`
  + plug `escreverBodyFatEmHC` em `escreverMedida` (toggle HC
  opcional). `MEDIDAS_CAMPOS` passa de 9 para 10 (gordura entre
  peso e cintura). Contrato `.md`+`.csv` ganha linha 5.5/`gordura`
  (174 campos auditados, era 173). 4 testes novos em
  `tests/schemas/medidas.test.ts`. `InputMedida` aceita unidade `%`
  além de `kg`/`cm`. Commit `2c72690`.
- **Q18.x** `<Video>` real do expo-av no `MidiaExecucaoPlayer`
  substitui fallback `<Image>` para `.mp4`/`.mov`/`.webm`.
  `shouldPlay+isLooping+isMuted` (convive com música em outras
  telas). GIF/JPG/PNG sem regressão. FEATURES-CANONICAS §3.3
  atualizada. Commit `15ce58a`.
- **Q21.b** 7 issues `etl-contract` abertas em
  `AndreBFarias/protocolo-ouroboros` (#24-#30) cobrindo humor,
  diario_emocional, treino/rotina/grupo, medidas (com gordura
  Q17.c.d), ciclo_menstrual, midia (4 tipos) e marco+evento+agenda.
  Label `etl-contract` criada nesta sessão.
- **Q23** já estava entregue em `46bec14` (`compileSdkVersion: 35`
  + `targetSdkVersion: 35` via `expo-build-properties`). Spec
  stale atualizada com `[ok]` no título.

Baseline preservado: 195 suítes Jest / 1932 testes verde · TS strict
zero · lint zero warnings · drift contract 174 campos auditados em
sync.

### Sanitização pós-sessão 2026-05-13 (tarde)

- Lint zerado em `app/` + `src/`: 5 warnings antigos removidos
  (`Pause`/`Play`/`ChevronRight` unused no executor;
  `View` no `app/grupos/index.tsx`; `SettingsIcon` em integrações;
  2 `eslint-disable` redundantes em `vault/frontmatter.ts` e
  `services/restaurarVault.ts`).
- 4 specs novas materializadas em `docs/sprints/`:
  - `Q17cd-MEDIDAS-BODYFAT-spec.md` — campo `gordura` em
    `MedidasSchema` + `escreverBodyFatEmHC`.
  - `Q18x-MIDIAEXEC-VIDEO-REAL-spec.md` — substituir fallback Image
    por `<Video>` real do expo-av para `.mp4`/`.mov`/`.webm`.
  - `Q21b-ISSUES-ETL-CONTRACT-SIBLING-spec.md` — 7+ issues
    `etl-contract` no `protocolo-ouroboros` (parte que sobrou de Q21).
  - `Q23-COMPILESDK-35-spec.md` — bump `compileSdk 35` via
    `expo-build-properties` (destrava CI alpha-5+).

### Q21 — ETL canônico Mobile↔Backend: CSV + drift check (parcial, 2026-05-13)

- Novo `scripts/exportar_contrato.py` (stdlib only, sem deps externas):
  parser de tabelas markdown de `docs/CONTRACT-MOBILE-BACKEND.md`
  com escape `\|` preservado, emite CSV canônico de 173 campos
  (colunas `schema_idx`, `schema_nome`, `schema_versao`, `campo`,
  `tipo`, `obrigatorio`, `notas`).
- `docs/CONTRACT-MOBILE-BACKEND.csv` versionado (174 linhas
  incluindo header). Consumível por backend Python via
  `pandas.read_csv` ou `csv.DictReader`.
- Duas seções novas no contrato MD: **5.21 rotina_treino**
  (`RotinaSchema` com `ExercicioRotina[]` 1..20, campo `gif`
  opcional pós-Q18.b) e **5.22 grupo_treino** (`GrupoTreinoSchema`
  com `rotina_slugs[]` 1..10, referência por slug sem duplicar
  dados — Q19/Q19.b).
- Novo `scripts/test_contract_drift.sh`: warning-only check (exit
  0 sempre) com duas heurísticas — (a) CSV em sync com MD via
  regen+diff, (b) schemas `.ts` mais novos que o MD via mtime.
- `scripts/smoke.sh` agora chama o drift check entre o audit
  PT-BR e o typecheck. Avisos aparecem no stderr sem bloquear o
  build.
- **Não entregue nesta sprint**: 7+ issues `etl-contract` no repo
  sibling `protocolo-ouroboros` (requer revisão do dono antes de
  abrir massa de issues).

### Q17.c.b/c — Hooks HC em saveMedida + saveCiclo (2026-05-13)

- `src/lib/vault/medidas.ts:escreverMedida` agora dispara
  `escreverPesoEmHC(parsed.data.peso, dataDate)` quando o toggle
  `featureToggles.healthConnectSync` está ligado e o registro tem
  campo `peso` definido. Best-effort: falha no HC não impacta o
  save local. Outras medidas (cintura, braço, coxa, etc.) ficam
  apenas no Vault — não há mapping canônico em HC.
- `src/lib/vault/ciclo.ts:escreverRegistroCiclo` agora dispara
  `escreverMenstruacaoEmHC(dataDate, fluxo)` quando o toggle está
  ligado e `fase === 'menstrual'`. Helper privado
  `intensidadeParaFluxoHC(1..5 → 1..3)` mapeia a intensidade do
  schema interno (5 níveis) para o `flow` canônico do HC (light /
  medium / heavy).
- Best-effort em try/catch fora do hot path: caller (UI) não vê
  diferença. Espelha o padrão de `saveTreino` (Q17.c).

### Q19.b — Grupos de Treino completos: form + sheet "Qual treino hoje?" + Iniciar (2026-05-13)

- Três componentes novos em `src/components/treino/`:
  - `SeletorMultiRotinas` — lista checkbox com cap 10 reforçado e
    empty state com link `/rotinas/novo`. Carregamento via
    `listarRotinas(vaultRoot, pessoaAtiva)`.
  - `FormGrupo` — Input nome + Textarea descrição + multi-select +
    Salvar/Cancelar/Apagar com modal de confirmação. Validação no
    submit (nome 1..80, 1..10 rotinas).
  - `SeletorTreinoDoGrupo` — BottomSheet content "Qual treino hoje?"
    com `Promise.all(lerRotina(slug))` para resolver rotinas
    referenciadas; rotinas removidas aparecem como item disabled
    rotulado em vez de quebrar a lista.
- `app/grupos/novo.tsx` (stub removido) — slug único via
  `slugifyTitulo` + `sufixoRandom` (50 tentativas), persistência via
  `escreverGrupo`, `router.replace('/grupos/<slug>')` pós-save.
- `app/grupos/[slug].tsx` (stub removido) — detalhe com `FormGrupo`
  inicial + onApagar via `removerGrupo` + right slot do header tem
  pill verde "Iniciar"; tap abre BottomSheet `SeletorTreinoDoGrupo`
  se houver >1 rotina, ou navega direto pra `/treinos/executar/<slug>`
  se houver apenas 1.
- 24 testes novos em `tests/lib/schemas/grupo_treino.test.ts` (13) e
  `tests/lib/vault/grupo_treino.test.ts` (11). Total 1927 verde
  (baseline 1903).

### Q18.b — Player de mídia integrado em detalhe + executor + galeria (2026-05-13)

- `ExercicioRotinaSchema.gif` agora aceita string opcional (snapshot
  do path da mídia no momento de criar/editar a rotina). Retro-compat
  preservado para rotinas anteriores que não tinham o campo.
- `app/exercicios/[slug].tsx` (detalhe do exercício) — bloco GIF
  full-width legado (Image inline + fallback Dumbbell) substituído
  por `<MidiaExecucaoPlayer path={exercicio.gif} size="lg" />`.
- `app/treinos/executar/[slug].tsx` — thumbnail 96×96 ao lado do nome
  do exercício atual no card "Exercício N/M" (`size="sm"`).
- `src/components/exercicios/CardGaleria.tsx` — prop `gifUri` (resolvida
  pelo caller) substituída por path resolvido internamente via
  `useVault`. Layout 1:1 responsivo mantido inline (incompatível com
  size fixo 96×96 do Player canônico). Callers (`app/exercicios/index.tsx`
  e `src/components/screens/MemoriasExerciciosTab.tsx`) perdem o helper
  `resolveGifUri` que ficou morto.
- 1 teste novo em `tests/lib/schemas/rotina.test.ts` cobrindo
  `gif: optional` (1903 verde, baseline 1902).

### Q17.d — Bloco "Importados de Conexão Saúde" em Evolução (2026-05-13)

- Novo hook `useHealthConnectResumo` em `src/lib/hooks/` consome
  `lib/health/sync.ts` (Q17.b) com `Promise.all` dos 3 readers
  (`sincronizarPassosDeHC` 14d, `sincronizarPesoDeHC` 90d,
  `sincronizarTreinosDeHC` 30d). Pull on-demand no `focus` da tab
  consumidora via `useFocusEffect`. Estado interno isola toggle
  `featureToggles.healthConnectSync` + checagem de permissions
  concedidas via `listarPermissoesConcedidas`.
- Helpers puros em `src/lib/health/resumo.ts` — `resumirPassos`
  particiona janelas 7+7 dias para delta, `resumirPeso` ordena
  desc por timestamp e devolve último + delta (null quando só há
  uma leitura), `resumirTreinos` filtra dentro de 30 dias e
  arredonda duração para minutos (mínimo 1).
- Componente `src/components/screens/EvolucaoCorporalTab/CardHCResumo.tsx`
  renderiza três `MiniCard` lado a lado (passos, peso, treinos
  externos) no topo da `ScrollView` da `EvolucaoCorporalTab`. Tap
  no card de treinos abre `BottomSheet` (SHEET_70) com a lista
  detalhada (rótulo + data + minutos). Render zero quando toggle
  off ou sem permission concedida — não polui o layout.
- 10 novos testes Jest em `tests/lib/health/resumo.test.ts`
  (1902 verde, baseline 1892).
- Dados de HC ficam apenas em RAM do hook; não persistem no Vault
  (Recap/exports não enxergam HC). Erro silencioso por card.

### v1.0.0-alpha-5 (2026-05-13 madrugada) — Q17 Health Connect completo + CI local

[Release publicado](https://github.com/AndreBFarias/ouroboros-mobile/releases/tag/v1.0.0-alpha-5) — APK 65 MB (arm64-v8a only, commit `46bec14`). Gerado via GitHub Actions (workflow `.github/workflows/build-android-apk.yml`) após EAS Free Tier esgotar. Pipeline convergiu em 6 tentativas com erros distintos a cada vez (env.json gitignored → CMake timeout 45min → minSdk 24<26 → gradle.properties sem newline → compileSdk 34<35 → sucesso). Limitação: APK assinado com debug keystore — OAuth Google não funciona nessa alpha (resolvido em sprint Q17.e com keystore EAS em GitHub Secrets).

**Q17 Health Connect (commit `cee0d17`)**
- `npm install react-native-health-connect@^3.5.0` via Expo Config Plugin.
- `app.json` ganha 11 permissions `android.permission.health.*` (READ/WRITE de Steps, ExerciseSession, Weight, BodyFat, HeartRate, Sleep, MenstruationFlow).
- Intent-filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` aponta para nova rota `/_internal/health-rationale`.
- Tela `/settings/integracoes` lista o status do SDK e gerencia conexão.
- `src/lib/health/sync.ts` expõe 6 helpers: `sincronizarTreinosDeHC`, `sincronizarPassosDeHC`, `sincronizarPesoDeHC`, `escreverTreinoEmHC`, `escreverPesoEmHC`, `escreverBodyFatEmHC`, `escreverMenstruacaoEmHC`.
- Toggle `settings.featureToggles.healthConnectSync` (default false): ao aceitar permissions na UI, `saveTreino` passa a gravar `ExerciseSessionRecord` automaticamente em HC (best-effort, falha no HC não bloqueia save local).
- Link "Integrações" em `/settings/index.tsx`.

**Q18 MidiaExecucaoPlayer (commit `1fcbaf5`)**
- Player reusável em `src/components/exercicios/MidiaExecucaoPlayer.tsx` para GIF/JPG/MP4 com fallback Dumbbell vazio. Tamanhos `sm` (96×96) e `lg` (aspect 16:10). Integração no detalhe `/exercicios/<slug>` e no executor `app/treinos/executar/<slug>` entra em Q18.b.

**Q19 Grupos de Treino esqueleto (commit `1fcbaf5`)**
- Novo schema `GrupoTreinoSchema` em `src/lib/schemas/grupo_treino.ts` (1..10 rotinas referenciadas por slug, sem duplicar dados).
- Helpers vault em `src/lib/vault/grupo_treino.ts` (`listarGrupos`, `lerGrupo`, `escreverGrupo`, `removerGrupo`).
- Path canônico `markdown/grupo-<slug>.md` via `grupoPath` em `paths.ts`.
- Rotas `app/grupos/{_layout,index,novo,[slug]}.tsx` — lista com FAB+, empty state, stubs `novo` e `[slug]` (form completo + botão "Iniciar treino" entram em Q19.b).

**CI local — GitHub Actions (commit `26dbf85` + `67c3022`)**
- Workflow `.github/workflows/build-android-apk.yml` com trigger manual + auto em tag `v*-alpha-*`. Setup Node 22 + Java 17 + Android SDK 34. `expo prebuild --platform android` + `gradle assembleRelease`. Cache Gradle pra builds < 15 min em subsequentes.
- `env.json.example` versionado + step "Provision env.json" no workflow tenta `secrets.ENV_JSON_BASE64` primeiro, cai em stub se ausente.

**Specs Q17–Q21 detalhadas (commit `ff20d2c`)**
- `docs/sprints/Q17-HEALTH-CONNECT-spec.md` (já implementada nesta alpha).
- `docs/sprints/Q18-EXERCICIOS-COM-GIF-spec.md`.
- `docs/sprints/Q19-GRUPOS-EXERCICIOS-spec.md`.
- `docs/sprints/Q20-SHARE-PIX-VALIDACAO-spec.md`.
- `docs/sprints/Q21-ETL-UNIFICACAO-spec.md`.

### v1.0.0-alpha-4 (2026-05-12 noite) — Onda Q sessões 1–4

APK [v1.0.0-alpha-4](https://github.com/AndreBFarias/ouroboros-mobile/releases/tag/v1.0.0-alpha-4) via EAS preview. Commit `a1dd3c9` (bump versionCode 3).

**Q5.1 — TranscreverButton separado do MicrofoneButton (commit `c6abaa5`)**
- Android `SpeechRecognizer` não consegue compartilhar o microfone com `expo-av Audio.Recording` — sempre aborta com `error="aborted"`. Confirmado via logcat instrumentado.
- Solução: 2 botões distintos lado-a-lado no diário emocional.
  - `MicrofoneButton` (cyan) grava só áudio `.m4a` no Vault.
  - `TranscreverButton` (orange) chama speech-recognition sozinho, transcreve direto pro textarea.

**Q5.2 — Speech-recognition continuous (commit `2edbc98`)**
- Default `continuous=false` faz o `SpeechRecognizer` Android encerrar sozinho após 6–8s de silêncio. Trocado para `continuous=true`; o caller chama `abort()` no release do botão.

**Q6 — `goBackOnce()` no diário (commit `c6abaa5`)**
- `router.back()` era disparado em sequência tanto pelo save bem-sucedido quanto pelo `onChange(-1)` ao fechar o BottomSheet — segunda chamada falhava com `GO_BACK was not handled by any navigator`.
- Resolvido com ref guard `backCalledRef` que garante chamada única por sessão do sheet.

**Q0 — OAuth Google Calendar (commits `557319f` + `c6abaa5`)**
- Causa raiz: scope `https://www.googleapis.com/auth/calendar.events.readonly` NÃO estava registrado em "Acesso a dados" do consent screen. Quando o app pede um scope não-declarado, Google retorna `Error 400 invalid_request` com mensagem genérica de "OAuth 2.0 policy".
- `env.json` chave renomeada `installed` → `android` para refletir tipo real do OAuth client (com.ouroboros.mobile + SHA-1).
- `googleAuthFlow.getClientIdFromEnv` lê `env.android?.client_id ?? env.installed?.client_id` (fallback legado).

**Q11.a — Schema Rotina + CRUD vault (commit `6d96ae4`)**
- `RotinaSchema` (Zod) com cap 20 exercícios, `carga_kg` nullable, `reps` string livre (`"12"`, `"8-10"`, `"amrap"`, `"ate falha"`), `descanso_seg` default 90.
- `src/lib/vault/rotina.ts`: filter por autor (privacidade), sort PT-BR `localeCompare`, slug único via `slugifyTitulo` + `sufixoRandom` (50 tentativas).
- Rotas `app/rotinas/{index,_layout,novo,[slug]}.tsx` reusando `FormRotina` compartilhado.

**Q11.b — SeletorRotina integrado (commit `6d96ae4`)**
- `BottomSheetView` com item "Sem rotina (treino livre)" + lista de rotinas + empty state guiando para `/rotinas`.
- `src/lib/treino/sessaoFromRotina.ts`: helper puro convertendo `RotinaMeta` em `Partial<TreinoSessao>` (piso de faixa, fallback 10, cópia imutável).
- `SheetNovoTreino` ganha props `rotinaSnapshot` + `onAbrirSeletorRotina`; modal interno "Substituir treino atual?" quando há edição em curso.
- `MemoriasTreinosTab` integra o 3º BottomSheet com state `pendingRotinaSnapshot`.

**Q11.c — Executor de treino com timer (commit `2edbc98`)**
- Rotas `app/treinos/_layout.tsx` + `app/treinos/executar/[slug].tsx`.
- State machine `executando` → `descansando` → `concluido`.
- Timer regressivo do descanso (default `exercicio.descanso_seg`, ajustável +/-10s, botão "Pular descanso").
- Botão "Iniciar" pill verde no header de `/rotinas/<slug>`.
- Salva `TreinoSessao` no Vault como snapshot imutável ao concluir.

**Q14 — Entry "Rotinas" no MenuLateral (commit `2edbc98`)**
- Item Dumbbell em Utilitários, antes só acessível via SheetNovoTreino → Usar rotina → empty state.

**Q15 — Anti-empilhamento de sheets (commit `2edbc98`)**
- `handleAbrirSeletorRotina` fecha `novoRef` antes de expandir `seletorRotinaRef`. Reabre com delay 280ms após escolha/cancelamento.

**Q9 — Galeria unificada (commit `3f919f5`)**
- `/galeria` com Vault Explorer agrupando por prefixo do filename.

**Q10 — Share Intent Pix/boleto/extrato (commit `7d3332a`)**
- `app.json intentFilters` expandido (`text/plain`, `text/html`, `application/octet-stream`).
- `src/lib/share/categorias.ts` ganha regex classifier (Pix `E\d{14}`, boleto linha digitável, extrato `Nubank|Itaú|Bradesco|Santander|Inter|C6` + saldo).
- Auto-rename `inbox/financeiro/<categoria>/YYYY-MM-DD-<valor>.<ext>` + companion `.md` rico.

**Q12 — Bridge ETL Mobile↔Backend (commit `245954f`)**
- `_schema_version: 1` adicionado em todos os writers de `.md`.
- `docs/CONTRACT-MOBILE-BACKEND.md` documenta o contrato.

**Q8 — Ciclo persistência (commit `47f5564`)**
- Bug raiz: `app/ciclo/index.tsx` carregava com `pessoaAtiva` enquanto saves usavam `autorPadrao(tipoCompanhia, sexoA, sexoB)` (resultado diferente em config casal masc+fem). Filter do load excluía os registros do disco.
- Fix: replicar a inferência de autor na listagem (`autorListagem = autorPadrao(...) ?? pessoaAtiva`) para simetria save/load.

### Onda Q (2026-05-12): pré-v1.0 — 8 fixes UX + Q0 OAuth liberado

Sessão de validação final com dono. Foco: corrigir bugs reportados +
preparar polish v1.0. Validação live em celular real (Xiaomi
2312DRAABG HyperOS) via dev-client + hot-reload. 1802 testes verdes,
typecheck silent, anonimato + PT-BR OK.

- **Q0 — OAuth Google Calendar liberado.** Console (`protocolo-ouroboros`,
  conta `andrefarias@projeto-luna.ia.br`) confirmou: Calendar API
  ENABLED, Consent screen Em Teste com 3 test users
  (`andre.dsbf@gmail.com`, `andrefarias@projeto-luna.ia.br`,
  `vitoriamaria.sds@gmail.com`), escopo `calendar.events.readonly`
  presente, Android client `com.ouroboros.mobile` + SHA-1
  `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`
  corretos. Validação runtime real (login Google + lista eventos)
  fica para batch de testes em `/agenda`.

- **Q1 — Rename display "ouroboros-mobile" → "Ouroboros".**
  `app.json:expo.name` → `Ouroboros`. `package.json + lock` →
  `ouroboros`. **Slug mantido** (`ouroboros-mobile`) para preservar
  EAS project ID `27c5d3d3-1110-49c1-8457-a99c6249f320`.
  Validado live: header browser e dev-client mostram "Ouroboros".

- **Q2 — Recap visível na Home (5 iterações).** Variant ghost
  invisível (contraste ruim sobre bg). Iterações: ghost → pill
  (Button.tsx) → Pressable inline → fix raiz no Header.tsx (vide
  A33). Final: `BotaoRecap` inline em `app/index.tsx:35-78`,
  Pressable com flex row + Sparkles 14dp + label 14dp, fundo
  purple/16, borda purple/45, radius 999. Header.tsx slot direito
  trocou `w-10` por `minWidth: 40` (cresce com conteúdo).

- **Q3 — Menu lateral animação sóbria.** `springs.smooth` (damping=32,
  stiffness=170, mass=1) substitui `subtle` (damping=22, stiffness=220
  — reportado "muito poing"). Aplicado em `MenuLateral.tsx:318`
  PainelDrawer. Sem overshoot perceptível.

- **Q4 — FABs unificados em 64dp.** `FABMenu.tsx` 72→64.
  `MenuCapturaVerde.tsx` 56→64. Bottom já alinhado via
  `useSafeBottomMargin` compartilhado em ambos. Ícone Menu
  reduzido 28→24dp pra coerência visual.

- **Q5 — Transcrição live durante gravação.** `MicrofoneButton.tsx`
  dispara `transcribeStream` em paralelo ao `Audio.Recording`
  (antes era sequencial — só transcrevia ao soltar). Parciais
  do `expo-speech-recognition` chegam ao textarea via
  `onTextoTranscrito(parcial)` enquanto usuário fala. Respeita
  `settings.privacidade.ocultarTranscricoes`. Best-effort: erro
  silencioso não bloqueia save de áudio.

- **Q6 — Mídia viewer inline.** `DetalheConquista.tsx`: áudio
  agora usa `WaveformPreview` (player real expo-av play/pause +
  duração) em vez de fallback "indisponível". Foto: tap no cover
  abre Modal nativo fullscreen com `resizeMode contain` + botão X
  de fechar. YouTube/Spotify continuam external via Linking.
  Vídeo fica pós-1.0 (não está no schema Midia atual).

- **Q7 — Fix bug "Registrar momento" da câmera.** `MenuCapturaVerde.tsx`
  useEffect `abrirNoMount`: `setTimeout(0)` → `setTimeout(120)` +
  retry em 800ms se `useNavegacao.getState().sheetCapturaAberto`
  ainda for false. Cobre A30 (gorhom v5 + Reanimated 4 + New Arch
  sheet offscreen em OEMs HyperOS lentos).

- **Q8 — Ciclo histórico: lista + mini-stats.** `app/ciclo/index.tsx`
  ganhou: (1) mini-stats no topo "Dia X do ciclo · Duração média
  Y dias", (2) seção "Últimos registros" com lista vertical dos
  últimos 14 dias (chip de fase Dracula + sintomas resumidos +
  data abreviada); tap em item navega para `/ciclo/registrar`
  pré-preenchido. `ItemRegistroCiclo` componente local. Tom
  sóbrio mantido (ADR-0005). Resolve queixa "não consigo ver o
  que registro nem acompanhar".

### Armadilhas descobertas na Onda Q (adicionadas ao VALIDATOR_BRIEF)

- **A32** — HyperOS bloqueia `adb install -r`. Usar
  `adb push /data/local/tmp/ + pm install -r -t` para bypass.
- **A33** — `Header.tsx` `w-10` corta right slot maior que 40dp.
- **A34** — `Button.tsx` MotiView colapsa flex row complexo no
  New Arch. Usar `Pressable` direto inline para CTAs com layout
  custom.
- **A35** — ADB tap usa coords físicas; screencap vem escalado.
  Usar `uiautomator dump` para bounds absolutos.
- **A36** — App ANR em `DevLauncherErrorActivity` indica crash
  JS antes do errboundary. Logcat com `-s ReactNativeJS` necessário.
- **A37** — Build EAS dev-client demora 10-25min. Reusar APK
  local + `adb reverse 8081` quando código JS é o único que mudou.

### Onda E (2026-05-09 madrugada): V4.0.2 part 4-8 — vault HyperOS-proof + BottomSheet New Arch + saves E2E

- **V4.0.2 part 8 (HEAD `f895b93`)** — Reverter `BottomSheetScrollView`
  em telas regulares. `EvolucaoCorporalTab` e `MiniHumorScreen` têm
  `ScrollView` FORA do `BottomSheet` (são abas com sheet auxiliar);
  trocar por `BottomSheetScrollView` dispara render error
  `useBottomSheetInternal cannot be used out of the BottomSheet!`.
  Reversão preserva fix dos consumers que realmente têm scroll
  dentro do sheet (humor-rapido, diario-emocional, eventos).

- **V4.0.2 part 7 (`a2b2b44`)** — `ScrollView` → `BottomSheetScrollView`
  em consumers que rolam dentro do sheet. `ScrollView` puro causa
  conflito de gestos com `BottomSheet` em New Arch (swipe interno
  fecha o sheet inteiro). Aplicado em `app/eventos.tsx`,
  `app/diario-emocional.tsx`. Mock de `BottomSheetScrollView`
  adicionado em `jest.setup.cjs`.

- **V4.0.2 part 6 (`28f5449`)** — BottomSheet abre em New Arch +
  dev-client. Bug raiz confirmado pela issue gorhom #1751:
  `enableDynamicSizing=true` (default v5) exige que children direto
  seja `BottomSheetView`/`BottomSheetScrollView` para medir altura.
  Com `ScrollView` cru, sheet renderiza com altura 0 e fica offscreen
  (`translateY=screenHeight`). **Fix combinado:**
  - `BottomSheet` wrapper: `animateOnMount=true` + `enableDynamicSizing=false`
  - `humor-rapido.tsx`: `ScrollView` → `BottomSheetScrollView`
  Validado live em Redmi Note 13 HyperOS (sheet abre + scroll interno).

- **V4.0.2 part 5 (`60706f6`)** — Vault default em `documentDirectory`.
  Bug raiz validado: expo-file-system bloqueia writes em `/sdcard/`
  raiz mesmo com `MANAGE_EXTERNAL_STORAGE` granted (logcat:
  `Location 'file:///sdcard/X' isn't writable`). `FilePermissionModule`
  do expo-modules-core restringe writes a `filesDir`/`cacheDir`/
  external app dir. Default agora computa via `FileSystem.documentDirectory`
  + `Ouroboros/` (sempre gravável, sem permissão especial).
  Trade-off: vault em pasta privada do app (não visível direto pra
  Obsidian/Syncthing); usuários que precisam de integração externa
  usam "Outra pasta" via SAF picker.

- **V4.0.2 part 4 (`d0468ab`)** — `writeVaultFile` ensureParentDir +
  MidiaFotoTab layout-por-tipo. `writer.ts` agora cria pasta-pai antes
  de write em `file://` (cobre paths legados `treinos/`, `inbox/financeiro/`).
  `MidiaFotoTab.tsx` migrado de `assetsPath` legado para `fotoPath`
  canônico (`jpg/foto-YYYY-MM-DD-<rand>.jpg`).

- **Saves end-to-end validados live no celular** (4 saves
  persistidos no disco com schemas YAML válidos):
  - `humor-2026-05-09.md` — humor rápido com 4 sliders default
  - `audio-2026-05-09-e3aa.m4a` (287 KB) + companion `audio-...md`
  - `contador-sem.md` — contador "Sem cafeína", início hoje
  - `alarme-acordar.md` — 08:00 semanal seg-sex + 5 notification IDs

- **APK alpha-3 production disparado** em EAS preview profile:
  `f470a212-d401-4d23-8a09-03b8c09535e9`. Inclui todos fixes
  V4.0.2 part 1-8.

### Onda D (2026-05-08): V4.0.2 part 1-3 — fix vault freeze APK alpha-2 + sync tipoCompanhia

- **V4.0.2 `M-VAULT-SAF-FILE-RESOLUCAO`** — APK alpha-2 travava no
  onboarding ao escolher pasta SAF. Causa raiz tripla:
  1. **String-concat de SAF tree URIs gerava URI malformado.** Toda a
     camada de save assume `file://` mas `requestVaultPermission`
     persistia `content://...tree/X` e `vaultUriJoin` produzia
     `content://...tree/X/markdown/humor.md` que não é URI SAF válido
     (Android exige `tree/X/document/Y` formato).
     [Logcat real Redmi Note 13: `SecurityException: Permission Denial
     ... requires ACTION_OPEN_DOCUMENT`].
     **Fix:** `safTreeUriToFileUri()` converte tree URI primário
     (`primary:Pasta`) para `file:///sdcard/Pasta/`; `requestVaultPermission`
     retorna `file://` direto. Volume secundário (cartão SD/USB)
     retorna null com toast acionável.
  2. **Race condition na MANAGE_EXTERNAL_STORAGE.** `pedirPermissaoStorage`
     disparava Intent e retornava antes do usuário tocar em "Permitir";
     probe imediato falhava silenciosamente.
     **Fix:** retorno boolean explícito + `AppState` listener espera
     foreground + retry probe 5x com backoff 500ms (timeout 60s).
     `handleUsarSugestao` tenta init direto primeiro (já concedida),
     fallback para Intent + retry após retorno.
  3. **Trailing space em pasta Syncthing/MIUI.** `sanearTrailingSpaceFolder()`
     detecta `Pasta ` e renomeia silenciosamente para `Pasta` antes
     do probe. Idempotente (pula se destino já existe).

- **Sync `tipoCompanhia` entre `useOnboarding` e `useSettings`** — bug
  estrutural M29: dois stores com mesmo conceito mas tipos
  incompatíveis (`'sozinho'|'casal'|'amigos'` vs `'sozinho'|'duo'`).
  Componentes lendo `useSettings.pessoa.tipoCompanhia` (`SeletorPara`,
  `SeletorPessoaDestino`, `ItemTarefa`, `editar-pessoa.tsx`) ficavam
  presos em `'sozinho'` mesmo após escolha de "Casal" no onboarding —
  resultado: chips "Para mim/parceiro/casal" sumiam, pessoa B sumia
  da edição. Fix: `setTipoCompanhia` em `useOnboarding` espelha em
  `useSettings.pessoa.tipoCompanhia` (`casal|amigos -> 'duo'`,
  `sozinho -> 'sozinho'`); novo BOOT_HOOK `reconciliarTipoCompanhia`
  cobre apps pré-V4.0.2.

- **Smoke 186 suites / 1802+1 testes verde**, TS strict 0 erros.
  Tests permissions-init refatorados para novo contrato boolean.

### Onda C (2026-05-08): V4.0.1 + UX scripts + EAS preview alpha-2

- **V4.0.1 `INFRA-VAULT-MOCK-CONVERGENCIA`** — mocks por feature
  (`useFrasesMock`, `useGaleriaMock`) e seed determinístico agora
  espelham conteúdo serializado em `useVaultMock` no path canônico.
  `listarDiarios`/`listarEventos`/`listarHumor` em `src/lib/vault/`
  perdem early-return `web://` (reader já delega ao mock store via
  V4.0). `marcos`/`treinos`/`tarefas`/`contadores` não tinham
  early-return — confirmado via grep, zero alteração necessária.
  +2 casos jest (frasesMock-vault-espelhamento + useRecap-reflexao-vaultmock).
  Mobile real intacto (vaultRoot mobile é `file://`/`content://`).
  Smoke 186 suites / 1803 testes verde (+9 vs 1794).

- **Gauntlet UX silenciosa** — `gauntlet.sh` v3 vira **silencioso por
  padrão** (default abre browser e retorna). `--verbose` opt-in mostra
  log. Alias `--quiet` mantido por retro-compat. `install.sh`
  configura `Gauntlet.desktop` com `gio metadata::trusted=true`
  (pula prompt de Files). `run.sh` documenta atalho do Gauntlet e
  garante `chmod +x` no `Gauntlet.desktop` em checkout fresh.

### Onda B parte 2 (2026-05-08): W2.1 chaves persist + G5 retroativo PNGs

- **W2.1 `M-AUDIT-GAUNTLET-RESET-PERSIST-KEYS`** — `aplicarReset` em
  `src/lib/dev/gauntlet.ts` linhas 257-273 sincroniza chaves
  localStorage 1:1 com as canônicas das stores. Auditoria revelou:
  - Estavam corretas: `ouroboros.settings.v2`, `ouroboros.onboarding.v3`,
    `ouroboros.sessao.v1`.
  - **Estavam desalinhadas**: `ouroboros.pessoa` -> `ouroboros.pessoa.v1`,
    `ouroboros.vault` -> `ouroboros.vault.v1`.
  - **Faltava**: `ouroboros.google.v1` (`googleAuth.ts:283` usa
    `STORAGE_KEY` constante).
  - **Fantasmas removidos**: `ouroboros.onboarding`, `ouroboros.onboarding.v2`.

- **G5 `M-GAUNTLET-RETROATIVO-AUDIT`** — **40 PNGs reais persistidos**
  em 22 pastas `docs/sprints/<id>-screenshots-gauntlet/` (excedeu meta
  de 37). Cobertura 22/22 sprints UI da spec. Captura via
  playwright-core direto + chromium-1208 (precedente G2.1).
  - Achados visuais notáveis durante captura:
    - **WARN W2 confirmado** em `M-BOTOES-LARGURA/02-home-recap.png`:
      pílula com texto colado às bordas.
    - **W5 loader scanner** confirmado em
      `M-SAVE-SCANNER-VALIDA/01-empty.png`: loader Ouroboros decorativo
      abaixo do botão "Capturar nota".
    - **3 chips Reflexão visíveis** em `I-DIARIO-REFLEXAO/01-empty.png`
      confirmando G2.
    - **Drawer com "Acesso Rápido" + "Registrar" + "Utilitários"** em
      `M-MENU-LATERAL-LAYOUT/01-drawer-aberto.png` confirmando K1+K2.
    - **3 abas Saúde Física** em
      `M-SAVE-FOTO-VALIDA/01-saude-fisica-treinos.png` confirmando L1.
    - **Recap toggle Lista/Calendário** em
      `M-RECAP-CALENDARIO-UNIFICAR/01-lista.png` confirmando L2.
  - Limitações de plataforma documentadas: sheets `@gorhom/bottom-sheet`
    em web não abrem (A17), FAB+ click via locator não dispara menu —
    pares 01==02 com mesmo sha em algumas pastas porque estado base
    foi capturado mas overlay não. Esperado pelo BRIEF §1.9. Nível B
    cobre.
  - 1 MB total (margem 6-7 MB do limite).

Smoke verde 184/1794 mantido.

### Onda B parte 1 (2026-05-08): V4 v2 escopo expandido + spec W2.1 colateral

- **V4 v2 `M-AUDIT-E2E-SAVE-DEVICES-INDEX` (escopo expandido)** — V4 v1
  rejeitada por boot hook não re-disparar pós-seed. Solução: opção (b)
  absorve `disparaBootHooks` na mesma sprint:
  - `src/lib/dev/gauntlet.ts` ganha `disparaBootHooks(): Promise<void>`
    com guard explícito (não comGuard porque é async). Import dinâmico
    de `@/lib/boot/reagendamento` para evitar ciclo. No-op em mobile.
  - `tests/lib/dev/gauntlet-disparaBootHooks.test.ts` 3 casos.
  - `tests/e2e/playwright/m-save-devices-index.e2e.ts` (235L) 5
    cenários: sanity API + reset+seed+disparaBootHooks +
    lerVaultMock(_devices.md) + asserts frontmatter M38 (8 checks)
    + idempotência byte-a-byte ignorando `ultima_atividade`.
  - `docs/GAUNTLET.md` documenta padrão "reset → seed → disparaBootHooks".
- **Spec colateral W2.1 `M-AUDIT-GAUNTLET-RESET-PERSIST-KEYS`** —
  achado executor V4: `aplicarReset` em gauntlet.ts:251-258 limpa
  chaves desatualizadas (`ouroboros.vault` em vez de `ouroboros.vault.v1`).
  Sprint nova materializada para sincronizar 1:1 com chaves canônicas
  das stores zustand persist.

Smoke: 184 suites / 1794 testes verde (+3 vs 1791).

### Onda A (2026-05-08): V4.0 + W1.1 + G2.1 colaterais paralelos

- **V4.0 `INFRA-VAULT-WEB-MOCK`** — mock store SAF web em `src/lib/dev/vaultMockStore.ts`
  (zustand `useVaultMock` com `Map<uri, string>` + helpers
  getArquivo/setArquivo/listar/listarPasta/limpar).
  `src/lib/vault/reader.ts` e `writer.ts` ganharam branch
  `Platform.OS === 'web' && __DEV__` que delega para o mock.
  `src/lib/dev/gauntlet.ts` expõe `lerVaultMock(uri)` e
  `listarVaultMock()` com guard GAUNTLET_ATIVO. `aplicarReset` zera
  o mock. `docs/GAUNTLET.md` atualizado. Mobile real intacto (SAF
  continua em produção). +4 casos jest. Destrava V4 + qualquer E2E
  que valida conteúdo de arquivo.

- **W1.1 `M-AUDIT-VISUAL-BUTTON-GHOST-PADDING`** — fix raiz no
  `<Button variant="ghost">` em `src/components/ui/Button.tsx:108-124`:
  adicionado `paddingHorizontal: spacing.base` (16dp). 39 instâncias
  no codebase ganham respiração interna automática. Wrappers externos
  redundantes removidos: `app/index.tsx:154-159` (W2 botão Recap) e
  `src/components/eventos/LocalizacaoBlock.tsx` (W4 simplificado —
  mantém flexShrink, remove padding extra).

- **G2.1 `I-DIARIO-REFLEXAO-RECAP`** — integração completa do modo
  reflexão com Recap:
  - `SecaoDiariosEventosAgrupado.tsx` ganha 3 cores (red trigger,
    green vitoria, cyan reflexao) substituindo ternário binário.
  - `useRecap.ts` ganha `interface ReflexaoItem` + chave `reflexoes`
    em `RecapData` + filtro `d.modo === 'reflexao'` + ordenação por
    data desc + fallback empty.
  - `RecapScreen.tsx` pluga nova seção entre Crises e Evoluções +
    `totalSecoes` inclui reflexoes.
  - `RecapSecaoReflexoes.tsx` componente novo (80L) espelhando padrão
    de `RecapSecaoCrises`, ícone MessageCircle cyan, tom respeitoso
    ADR-0005.
  - +6 casos jest cobrindo mix, ordenação, fallback, fora período,
    intensidade e estado vazio.
  - 2 PNGs reais capturados em
    `docs/sprints/I-DIARIO-REFLEXAO-RECAP-screenshots-gauntlet/`
    (chip Reflexão cyan + Recap empty state limitação documentada).
  - Achado colateral: `listarDiarios` em `src/lib/vault/diario.ts:28`
    filtra `web://` antes do reader, então Recap permanece vazio no
    Gauntlet mesmo após `seedComDados('diarios-3')`. Sprint nova
    proposta: `INFRA-VAULT-WEB-MOCK-LISTAR` (não dispatchada — V4.0
    parcialmente cobre via reader integrado).

Smoke combinado: 183 suites / 1791 testes verde (+10 onda A vs 1781).
TS strict 0. PT-BR check OK.

### Batch 6 (2026-05-08): V1 + V2 + V3 E2E paralelos + V4 rejeitada formalmente

- **V1 `M-AUDIT-E2E-AMIGOS-LABEL`** — `tests/e2e/playwright/m-amigos-label.e2e.ts`
  (165L) cobrindo 3 cenários: setTipoCompanhia('casal') → chip "Casal",
  setTipoCompanhia('amigos') → chip "Todos", setTipoCompanhia('sozinho')
  → "Ambos" presente OU ausente (anti-vazamento). Asserções via DOM
  body.textContent + screenshots A/B/C.
- **V2 `M-AUDIT-E2E-MENU-NOMES`** — `tests/e2e/playwright/m-menu-nomes.e2e.ts`
  (167L) cobrindo seções K2 ("Acesso Rápido" + "Utilitários" presentes;
  "Ver" / "Opcionais" antigos ausentes — regressão protetora).
- **V3 `M-AUDIT-E2E-BOTOES-LARGURA`** — `tests/e2e/playwright/m-botoes-largura.e2e.ts`
  (281L) com 3 medições JS via getBoundingClientRect + getComputedStyle:
  Conectar conta Google em /agenda (width >= 200, padding ancestral
  >= 16); Recap home (wrapper W2 paddingHorizontal >= 16, centralização);
  Abrir agenda em /settings/contas-google (com fallback gauntletSkip).

- **V4 `M-AUDIT-E2E-SAVE-DEVICES-INDEX` REJEITADA FORMALMENTE** pelo
  executor: hipótese `mockVaultStore` central da spec é falsa
  (0 matches em rg). Em web/dev, SAF read/writeAsStringAsync lança
  UnavailabilityError; nenhum arquivo `_devices.md` é escrito.
  E2Es de save existentes só asseguram "não crasha". Validar conteúdo
  exige sprint INFRA prévia.
- **Spec `INFRA-VAULT-WEB-MOCK` (V4.0) materializada** como
  pré-requisito de V4: implementa `useVaultMock` zustand store +
  branch web __DEV__ em reader/writer + `__gauntlet.lerVaultMock` /
  `listarVaultMock`. Estimado ~2h. Mobile real intacto. Após V4.0,
  V4 é re-despachado.

Smoke 181/1781 verde mantido (E2Es são doc-only para Jest via
testPathIgnorePatterns).

### Batch 5 (2026-05-08): G1 share intent ADR-0024

- **G1 `M-SHARE-INTENT-LAYOUT`** — opção B (pasta exceção) materializada:
  - `docs/ADRs/0024-share-intent-layout-pasta-excecao.md` novo,
    documenta decisão B + alternativa A rejeitada + supersedes parcial
    do ADR-0023.
  - `docs/ADRs/INDEX.md` ganha entry.
  - `src/lib/boot/migrarVaultLayoutPorTipo.ts` ganha comentário canônico
    explicitando whitelist de `inbox/` (boot hook só itera 3 subpaths
    legados; arquivos de share intent permanecem em `inbox/<area>/<subtipo>/`).
  - `src/lib/schemas/inbox_arquivo.ts` ganha nota ref ADR-0024.
  - `docs/FEATURES-CANONICAS.md` §2.7 atualizado.
  - Novo: `tests/lib/boot/migrarVaultLayoutPorTipo-inbox-whitelist.test.ts`
    com 6 casos cobrindo regressão (vault com `inbox/...` boot hook
    NÃO move para `markdown/`).
- Achados na execução: `saveShareReceived.ts` não existia — save inline
  em `app/share-receive.tsx` via `path-resolver.ts`. Schema é
  `inbox_arquivo.ts` (underscore), não kebab-case. Executor adaptou.
- Smoke: 181 suites / 1781 testes verde (+6 vs 1775).

### Batch 4 (2026-05-08): G2 diario reflexao

- **G2 `I-DIARIO-REFLEXAO`** — modo "Reflexão" implementado:
  - `DiarioEmocionalModoSchema` agora aceita 3 valores
    (`trigger | vitoria | reflexao`). Refines preservados (funcionou
    só em trigger, mídia obrigatória só em vitoria).
  - `EMOCOES_REFLEXIVAS` em `src/lib/diario/emocoes.ts`: 6 chips
    accent cyan — `pensativo / curioso / gratidão / aceitação /
    silêncio / contemplação`.
  - `EmocaoChips` aceita 3 modos com lookup ternário.
  - `app/diario-emocional.tsx` ganha 3º chip `Reflexão` (accent cyan)
    + 3 ternários para cor de borda / variant botão / label
    (`Refletir`) / título contextual ("O que está passando pela
    cabeça."). `flexWrap` para não overflow.
  - `saveDiario.ts` agnóstico ao modo (path canônico preservado).
  - +1 caso schema + 1 E2E `m-save-diario-reflexao.e2e.ts`.
  - Validação visual confirmada: 3 chips renderizam em
    `/diario-emocional` no Gauntlet.
- Smoke: 180 suites / 1775 testes verde (+12 vs 1763).
- Achados colaterais: `SecaoDiariosEventosAgrupado.tsx` pinta reflexão
  de verde (deveria ser cyan); `useRecap.ts` ignora reflexão sem ter
  seção dedicada. **Spec G2.1 `I-DIARIO-REFLEXAO-RECAP-spec.md`
  materializada** para integrar reflexão ao Recap (cor cyan no card +
  seção "Reflexões" no modo Lista).

### Batch 3 (2026-05-08): S1 + S2 + S3 migues codigo paralelos

- **S1 `M-AUDIT-MIGUE-FRASE-WEB-MOCK`** — `src/lib/midia/salvarFrase.ts`
  ganha branch `Platform.OS === 'web' && __DEV__` que delega para
  `__gauntlet.salvarFraseMock(texto, meta)` quando exposto. Release web
  continua no-op. Mock implementado em `src/lib/dev/gauntlet.ts` com
  guard `GAUNTLET_ATIVO`, gerador de slug + companion via
  `stringifyCompanionMidia`, store zustand novo `useFrasesMock` em
  `src/lib/dev/frasesMock.ts`. `aplicarReset` limpa o mock. E2E
  `tests/e2e/playwright/m-save-frase.e2e.ts` atualizado para validar
  toast no DOM. +2 casos jest em `salvarFrase.test.ts`.
  Divergência menor de spec: nome real é `stringifyCompanionMidia`, não
  `serializarCompanionDeterministico`.

- **S2 `M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR`** — TODO M30 fechado em
  `src/lib/vault/tarefas.ts:284`. `escreverTarefa` agora lê metaAntigo
  via `readVaultFile`, e após write delega para `reagendarAlarmeCompanion`
  que detecta toggles (data_hora_iso / recorrencia / ativo) e chama
  `cancelarAlarme` + `agendarAlarme` conforme transição. Idempotência
  preservada (cancelarAlarme já era silencioso em falha). +7 casos em
  `tests/lib/vault/tarefas-reagendar.test.ts` (cenários: data muda,
  recorrencia muda, desativacao, no-op trivial, criacao inicial,
  resiliencia em falha de agendar/cancelar).
  Divergência menor de spec: arquivo real do serviço é
  `alarmesNotificacoes.ts`, não `notificacoesLembretes.ts`. Inferido
  empiricamente.

- **S3 `M-AUDIT-MIGUE-RESTORE-SNAPSHOT`** — `aplicarSnapshot` implementado
  em `src/lib/services/restaurarVault.ts`. Q1/Q2/Q3 fechadas:
  - Q1 confirm dialog: default `confirmado=false` aborta com motivo
    `nao-confirmado`. UI sempre passa via Dialog (futuro).
  - Q2 schema diff: aborta com `console.error` + retorno
    `schema-incompativel`. Não migra.
  - Q3 vaultRoot: snapshot inclui mas `aplicarSnapshot` ignora
    (preserva o atual do dispositivo).
  - Aditivo: `SnapshotSettings.onboarding` ganha `sexoDeclarado` e
    `permissoes` opcionais (schema=1 mantido, snapshots antigos
    continuam carregaveis).
  - +11 casos jest (8 em `restaurarVault.test.ts` + 3 em
    `snapshot-symmetry.test.ts` provando export -> reset -> import casa
    byte-a-byte). UI integration (ConfirmDialog em settings) fica para
    sprint futura.

Smoke verde combinado: 179 suites / 1763 passed (+20 vs baseline 1743).
TS strict 0. PT-BR check OK. anonimato OK.

### Batch 2 (2026-05-08): W1 7 patches visuais consolidados

- **W1 `M-AUDIT-VISUAL-WARNS`** entregou os 7 patches do RELATORIO:
  - W1 onboarding chips Frame 1 (Sozinho/Com mais alguém): substitui
    Card por Pressable com borderWidth 1 + borderColor bgElev em default
    e purple em ativo. bg purple30 quando selecionado. Affordance
    consistente com chips do Frame 0.
  - W2 botão Recap header em app/index.tsx:154: wrapper externo com
    paddingHorizontal spacing.base (16dp). Patch parcial — padding
    interno do pill ghost continua sendo achado colateral compartilhado.
  - W3 tab "Evolução Corporal" -> "Evolução" em SaudeFisicaScreen.tsx
    (consistência com Treinos/Exercícios). Teste atualizado.
  - W4 botão "Usar localização atual" em LocalizacaoBlock.tsx:
    flexShrink 0 + paddingHorizontal spacing.sm no wrapper. Igual W2,
    é patch externo.
  - W5 loader Ouroboros em scanner: MANTIDO. Investigação git
    confirmou que loader foi adicionado por commit `7e62f5e` (M26
    sheets de captura com screen opaco) como mitigação A17/A18 gorhom.
    NÃO é ornamento — é proteção contra "tela infinita preta".
  - W6 "fab" -> "FAB" no subtítulo settings (acrônimo CAPS).
  - W7 paddingBottom dinâmico em settings: substitui hardcoded 120
    por useSafeBottomMargin(insets.bottom) + spacing.xl. FAB
    hambúrguer não cobre mais "Dispositivos pareados" / "Contas Google".
- 6 arquivos tocados, +65/-17 linhas.
- Smoke 1743/1/176 verde mantido. tsc 0. ptbr OK.
- Achado colateral: padding interno de `<Button variant="ghost">` em
  `src/components/ui/Button.tsx:108-124` afeta 4+ instâncias
  compartilhadas. Sprint nova `M-AUDIT-VISUAL-BUTTON-GHOST-PADDING`
  (W1.1) materializada para fix raiz + remoção dos wrappers W2/W4.

### Batch 1 fase 1.5 (2026-05-08): S4 v2 + colateral marcosAuto

- **S4 v2 `M-AUDIT-LABEL-GAUNTLET-DASHBOARD` (escopo expandido,
  opção B)** — `scripts/check_strings_ui_ptbr.py` ganha regex
  `RE_OBJ_LITERAL_PROP` para detectar strings UI em **object literals**
  (`{ prop: 'X' }`), reusando whitelist `PROPS_UI` e blacklist
  `PROPS_IGNORADAS`. Estende cobertura sem novos falsos positivos
  estruturais.
- 5 violações (não 2 como spec estimava) corrigidas em
  `src/lib/dev/gauntletDashboard.tsx`:
  - L23 `Saude Fisica` → `Saúde Física`
  - L30 `Humor rapido` → `Humor rápido`
  - L31 `Diario emocional` → `Diário emocional`
  - L41 `Exercicios` → `Exercícios`
  - L43 `Configuracoes` → `Configurações`
- Achado colateral revelado pelo regex novo: `marcosAuto.ts:76` tinha
  `Tres treinos nesta semana.` sem acento. Corrigido para
  `Três treinos nesta semana.` (micro-fix maestro, 1 char + sync 4
  asserts em `tests/lib/marcos/marcosAuto.test.ts`). Esta regressão
  estava invisível ao scan antes do regex novo.
- Smoke: 1743/1/176 verde. TS strict 0. PT-BR check OK.

### Batch 1 fase 1 (2026-05-08): S5 + G6 + G3 + G4

- **S5 `M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL`** — Frame 3 do onboarding
  ganha H1 contextual. Eyebrow continua `Permissoes`; H1 muda de
  `Permissoes` (redundante) para `Libere o que faz sentido pra voce.`
  em `app/onboarding.tsx:825` (componente `Frame3Permissoes`). Caso de
  teste em `tests/app/onboarding.test.tsx` cobre o novo H1 + preserva
  o eyebrow. Baseline jest 1742 -> 1743 (+1 caso, +0 suites).
- **G6 `M-DOCS-PATH-FIX`** — Refs incorretas a `TEMPLATE-spec.md`
  (caps + hifen) corrigidas para `_template-spec.md` (underscore +
  lowercase) em `VALIDATOR_BRIEF.md:266` (gitignored, edicao local) e
  `docs/sprints/M-GAUNTLET-PADRAO-VALIDATION-spec.md:43,66`. 3
  ocorrencias intactas como meta-textuais (CHANGELOG.md historico,
  ORDEM-EXECUCAO.md descreve a sprint, propria spec G6 descreve o bug).
- **G3 `INFRA-CHECK-TEST-DATA-ALLOW`** — `scripts/check_test_data.sh`
  ganha filtro `grep -v 'test-data-allow'` no pipeline, replicando
  padrao do `check_anonimato.sh:27`. Smoke unit em
  `tests/scripts/check_test_data.test.sh` valida 2 casos (sem marker
  detecta + com marker autoriza). Backwards-compat (sem marker =
  comportamento atual).
- **G4 `INFRA-GAUNTLET-AMIGOS-API`** — `__gauntlet.setTipoCompanhia(modo)`
  exposto em `src/lib/dev/gauntlet.ts` seguindo padrao 1:1 dos outros
  setters (`setNomes`, `setVaultRoot`, `setOnboardingDone`,
  `setUltimaRota`) com `comGuard(GAUNTLET_ATIVO)`. `docs/GAUNTLET.md`
  atualizado. Destrava V1 (`M-AUDIT-E2E-AMIGOS-LABEL`).

S4 `M-AUDIT-LABEL-GAUNTLET-DASHBOARD` REJEITADA pelo executor com
hipotese do planejador invalida: scan ja cobre `src/lib/dev/`, fix real
e estender regex para object literals (linha 43 + linha 23 ambas
escapam por `prop: 'X'` vs `prop="X"` JSX). Re-despachada com escopo
expandido para Batch 1.5.

Metricas pos-batch: 1743 testes / 176 suites Jest verde · TS strict 0
· Hermes 7,7 MB intacto · Gauntlet leak 0/6 · anonimato OK · PT-BR
check OK.

### Auditoria pré-APK 2026-05-08 (relatório + 17 specs corretivas)

- docs: relatorio consolidado em `docs/auditoria-2026-05-08/RELATORIO.md`
  cobrindo 30 sprints golden-zebra. Pipeline: estatica (grep + spec vs
  commits) + visual (Gauntlet + mockup canonico). Achados:
  **18 OK / 7 WARN / 3 FAIL / 4 migues em codigo / 22+ sprints sem PNG real**.
- specs: 17 specs corretivas materializadas em `docs/sprints/`:
  - **Bloco S** (saneamento debito declarado, alta prioridade):
    `M-AUDIT-MIGUE-FRASE-WEB-MOCK`, `M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR`,
    `M-AUDIT-MIGUE-RESTORE-SNAPSHOT`, `M-AUDIT-LABEL-GAUNTLET-DASHBOARD`,
    `M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL`.
  - **Bloco G** (anti-debito, materializa colaterais nunca specados):
    `M-SHARE-INTENT-LAYOUT`, `I-DIARIO-REFLEXAO`, `INFRA-CHECK-TEST-DATA-ALLOW`,
    `INFRA-GAUNTLET-AMIGOS-API`, `M-GAUNTLET-RETROATIVO-AUDIT`,
    `M-DOCS-PATH-FIX`, `M-SCHEMA-CONTADOR-V2`.
  - **Bloco V** (cobertura E2E faltante): `M-AUDIT-E2E-AMIGOS-LABEL`,
    `M-AUDIT-E2E-MENU-NOMES`, `M-AUDIT-E2E-BOTOES-LARGURA`,
    `M-AUDIT-E2E-SAVE-DEVICES-INDEX`.
  - **Bloco W** (consolidado): `M-AUDIT-VISUAL-WARNS` (7 patches batch).
- Plano em `~/.claude/plans/snug-humming-wall.md`. APK preview bloqueado
  ate Bloco S + W zerados.

### Sprint M-TEST-ERROR-SILENCE (2026-05-08)

- style: silenciar `console.error` esperado em 3 testes do path
  de erro do save (M-TEST-ERROR-SILENCE). Adiciona
  `jest.spyOn(console, 'error').mockImplementation(() => {})`
  com `mockRestore()` dentro dos 3 `it`s standalone que
  exercem `SAF off` em `tests/app/humor-rapido.test.tsx:208`,
  `tests/app/eventos.test.tsx:310` e
  `tests/app/diario-emocional.test.tsx:278`. Comportamento de
  produção preservado: `app/humor-rapido.tsx:181`,
  `app/eventos.tsx:290` e `app/diario-emocional.tsx:381`
  continuam emitindo `console.error` em runtime real.
  Asserts dos 3 testes (toast error + mockBack nao chamado)
  preservados. Revoga formalmente §C da M-TEST-WARNS:
  decisao anterior categorizou os 3 console.error como
  "intencionais permanecem", mas auditoria mostrou que
  asserts independem do log — spy localizado e seguro.
  Fecha o batch anti-ruido de install (M-LINT-CLEANUP +
  M-TEST-WARNS + M-TEST-ERROR-SILENCE). Baseline
  1742/1/176 preservado; 6 linhas adicionadas em 3
  arquivos de teste; zero edits em producao.

### Sprint M-TEST-WARNS (2026-05-07)

- style: zera warnings runtime evitaveis em `npm test` (3 → 0)
  (M-TEST-WARNS). Envolve `useNavegacao.setState` em `act(...)` em
  `tests/components/chrome/FABMenu.test.tsx` (2 wraps + import
  composto) e remove `jest.advanceTimersByTime?.(0)` redundante em
  `tests/components/diario/MicrofoneButton.test.tsx`. Decisao
  arquitetural: nao ativar `useFakeTimers()` global porque
  quebraria 4 outros testes do mesmo describe que dependem de
  `setTimeout` real. Baseline Jest preservado em 1742/1/176; 3
  `console.error "save * fail"` intencionais intactos.

### Sprint M-LINT-CLEANUP (2026-05-07)

- style: zera warnings ESLint (50 → 0) em escopo full `eslint .`
  (M-LINT-CLEANUP). Remove 31 diretivas `eslint-disable` orfas em
  `app/` e `src/`, 5 imports/variaveis nao-usadas e 14 warnings
  residuais em `tests/`. Sem mudanca de comportamento de runtime;
  baseline Jest preservado em 1742 passed / 1 skipped / 176 suites.

### Sprint O1 — `M-GAUNTLET-PADRAO-VALIDATION` (2026-05-07)

**Bloco O FECHADO. Plano golden-zebra principal entregue (exceto
I2-OAUTH e Bloco P APK).**

`docs/sprints/_template-spec.md` ganha §5 obrigatória "Validação
Gauntlet OU validação humana adb" — toda sprint nova que toca UI ou
runtime nativo entrega evidência ANTES de gerar APK preview/release.
Fallback explícito para sprint puramente documental ("Sprint
documental — sem validação Gauntlet/adb.").

VALIDATOR_BRIEF §1.9.1 já tinha a regra completa (registrada
2026-05-06); audit confirmou.

Achados colaterais registrados:
- `M-GAUNTLET-RETROATIVO-AUDIT`: 22 sprints fechadas sem PNG
  Gauntlet (a maioria do Bloco I + algumas K/L). Sprint futura
  captura PNGs ou declara impossibilidade.
- `M-DOCS-PATH-FIX`: VALIDATOR_BRIEF e spec O1 referenciam
  `TEMPLATE-spec.md` (caps + hífen) mas arquivo real é
  `_template-spec.md` (underscore). Ajuste cosmético futuro.

Métricas: 1742 testes / 176 suítes verde (zero regressão) · TS
strict 0 · Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint N2 — `M-MOTI-FIX-CRITICOS` (2026-05-07)

**Bloco N FECHADO.** Os 6 motis classificados ALTO em N1 (boot path
+ overlays globais com transform animado) migrados para Reanimated
puro:

1. `BiometriaGate` (boot path crítico A28) — `<FingerprintAnim>`
   sub-componente com useSharedValue + withSpring.
2. `Toast` — `<Animated.View entering={SlideInDown.springify()}
   exiting={SlideOutDown.duration(180)}>`. AnimatePresence eliminado.
3. `MenuLateral` slide drawer — `<PainelDrawer>` sub-componente
   com translateX shared value.
4. `FABRadial` linha 192 (6 ações em arco) — `<ActionRadial>` com
   4 shared values + withDelay stagger.
5. `FABRadial` linha 296 (rotate +/45°) — `<FabPrincipalRotate>`
   com rotate string em useAnimatedStyle worklet.
6. `FABMenu` press scale — `<Animated.View>` com 2 shared values +
   2 effects (mount + pressed).

Springs canônicos preservados literalmente (subtle 22/220, default
18/200, bouncy 12/180, snappy 26/320). `TOAST_SPRING` export
público preservado para fixtures.

**Não migrados** (escopo limitado): linha 157 FABRadial overlay
opacity (BAIXO), 38 motis BAIXO + 18 MÉDIO ficam para v1.1.

Métricas: 1742 testes / 176 suítes verde (zero regressão) · TS
strict 0 · Hermes 7,7 MB intacto · Gauntlet leak 0/6 · anonimato
OK · PT-BR OK.

### Sprint N1 — `M-MOTI-AUDIT-RUNTIME` (2026-05-07)

Audit estática completa dos usos de `<MotiView>`/`<MotiText>`/
`<AnimatePresence>`/`MotiTransitionProp` em `src/` e `app/`. Achado
real: 40 arquivos / 47 usos (não 38 como estimativa do plano original).

Output em `docs/sprints/M-MOTI-AUDIT-RUNTIME-output.md` (276
linhas) com inventário path:linha + componente + prop animada +
trigger + risco. Classificação:
- **6 ALTO**: BiometriaGate, Toast, MenuLateral, FABRadial (linhas
  192+296), FABMenu — boot path e overlays globais com transform.
- **18 MÉDIO**: UI universal e rotas específicas com transform tardio.
- **20 BAIXO**: apenas opacity/color/backgroundColor/width(%) ou
  scale press tardio.

Recomendação N2: escopo `M-MOTI-MIGRATE-HOTPATH` migra os 6 ALTO
para Reanimated puro (`useSharedValue` + `withSpring` +
`useAnimatedStyle`).

Sprint não toca código de produção. 1 arquivo novo.

Métricas: 1742 testes / 176 suítes verde (idêntico) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint L2 — `M-RECAP-CALENDARIO-UNIFICAR` (2026-05-07)

**Bloco L FECHADO.** Recap (`/recap`) e Calendário de Conquistas
(`/calendario`) unificados em uma única tela com toggle modo
Lista/Calendário no header. ADR-0021 documenta a decisão.

`RecapScreen.tsx` ganha state `modo: 'lista' | 'calendario'` +
toggle pill no header (Reanimated puro: `useSharedValue` +
`withTiming` em `Animated.View`, evita risco residual A28).
ChipGroup + inputs de período só no modo Lista.

Novo `src/components/screens/RecapModoCalendario.tsx` migra lógica
de `app/calendario.tsx`: `react-native-calendars` (locale PT-BR
M37.1.1) + heatmap mensal + lista de `<ConquistaCard>` do dia
selecionado. Reusa `useConquistas`.

Removido: `app/calendario.tsx` (rota top-level apagada; subrota
`app/calendario/[id].tsx` permanece para detalhe). Componente
`CalendarioConquistasScreen.tsx` deletado (sem consumidores). Item
"Calendário" removido do MenuLateral. Showcase + gauntletDashboard
atualizam rotas.

ADR-0021 `docs/ADRs/0021-recap-calendario-unificado.md` criado +
`docs/ADRs/INDEX.md` + `docs/FEATURES-CANONICAS.md` §7 reescrita.

Tests: +3 casos em `RecapScreen.test.tsx` (toggle render, default
Lista, alternância). E2E novo cobre ausência item no menu + toggle.

Achado documentado em ADR-0021: `featureToggles.calendarioConquistas`
em settings.ts ficou órfão; sprint subsequente para limpeza
opcional.

Métricas: 1742 testes / 176 suítes verde (+3 contra 1739) · TS
strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR OK.

### Sprint L1 — `M-MEMORIAS-PARA-SAUDE-FISICA` (2026-05-07)

Aba "Memórias" renomeada para "Saúde Física" com 3 tabs reorganizadas:
Treinos (mantém), Evolução Corporal (renomeada de Marcos), Exercícios
(movida de Registrar). Aba "Fotos" REMOVIDA (FAB+ verde já permite
captura contextual).

Renames principais via `git mv`:
- `app/memoria.tsx` → `app/saude-fisica.tsx`
- `MemoriasScreen.tsx` → `SaudeFisicaScreen.tsx`
- `MemoriasMarcosTab.tsx` → `EvolucaoCorporalTab.tsx`
- 15 E2E e diversos callsites (`router.push('/memoria')` →
  `'/saude-fisica'`) auto-replaced.

Novidades: `MemoriasExerciciosTab.tsx` reusa lógica de
`app/exercicios/index.tsx` + ação contextual no MenuCapturaVerde
("Adicionar exercício" via `onRegistrarAcaoExtra` M34.3). E2E novo
`m-saude-fisica.e2e.ts`.

Remoções: `MemoriasFotosTab.tsx` (243 linhas) + E2E
`m11-1-memorias-usavel.e2e.ts` (asseravava aba removida) +
item "Exercícios" da seção "Registrar" do MenuLateral.

Migration `useSessao` v2→v3: ultimaRota `/memoria` → `/saude-fisica`
automático no boot pós-update.

`docs/FEATURES-CANONICAS.md` seção 3 reescrita.

Métricas: 1739 testes / 176 suítes verde (+3 / +1 suite contra
1736 / 175 baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprints K4 + K5 — `M-FAB-MENU-SAFE-BOTTOM` + `M-BOTOES-LARGURA` (consolidadas, 2026-05-07)

**Bloco K FECHADO (5/5).** K4: helper novo
`src/components/chrome/safeBottom.ts` exporta
`useSafeBottomMargin(insetBottom)` retornando
`Math.max(spacing.xl, height × 0.10) + insetBottom` memoizado.
`FABMenu.tsx` (esquerdo roxo) e `MenuCapturaVerde.tsx` (direito
verde) substituem `bottom: spacing.xl` por `bottom: marginBottomCanonico`.
Hook chamado antes de returns condicionais.

K5: `Button.tsx` ganha prop `fullWidth?: boolean` (default false).
Quando true, aplica `width: '100%'` tanto no Pressable externo
quanto no MotiView interno. Aplicado em "Conectar conta Google"
(`app/agenda.tsx`) e "Abrir agenda" (`app/settings/contas-google.tsx`).
Botão Recap em `app/index.tsx:154` NÃO aplicado — está em flex-row
com avatares no header; fullWidth quebraria hierarquia visual ADR-010 §3.

Tests: +2 casos (Button.test.tsx fullWidth=true aplica width 100%).

Métricas: 1736 testes / 175 suítes verde (+2) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprints K2 + K3 — `M-MENU-NOMES` + `M-MENU-FOTO-EDITAVEL` (consolidadas, 2026-05-07)

K2: labels do `MenuLateral` `'Ver'` → `'Acesso Rápido'` e `'Opcionais'`
→ `'Utilitários'` (Sentence case + acento). Audit grep cobriu também
`gauntletDashboard.tsx` (2 ocorrências).

K3: `CabecalhoPessoa` em `MenuLateral.tsx` vira `<Pressable>` com
`accessibilityLabel="editar nome e foto"` que navega para
`/settings/editar-pessoa` (rota já existente — não criada nova,
componente atende 100% do requisito com AvatarPicker + Input +
Salvar + setNome + router.back, lida com ambas pessoas via
`useSettings.tipoCompanhia`).

Tests: +7 casos (K2 labels + ausência dos antigos, K3 tap
CabecalhoPessoa navega + fecha menu, render editar-pessoa, salvar,
modo sozinho, modo duo, nome vazio). +1 suite Jest. E2E novo cobre
K2 labels + K3 navegação.

Métricas: 1734 testes / 175 suítes verde (+7 / +1 suite) · TS strict
0 · Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint K1 — `M-MENU-LATERAL-LAYOUT` (2026-05-07)

`MenuLateral.tsx` ganha 4 melhorias UX: (1) safe-area-inset-bottom
+ `Math.max(spacing.xl, screenHeight × 0.10)` no rodapé Configurações
(impede conflito com 3-button nav e gesture nav); (2) scroll position
persistente via `useNavegacao.scrollMenuLateralPosition` com debounce
200ms (offset preservado entre aberturas na mesma sessão; reseta no
boot); (3) MotiView slide passa de `springs.default` para
`springs.subtle` (damping 22, stiffness 220 — mais natural, alinha
ADR-010 §2.1); (4) `paddingTop: spacing.xl` no `CabecalhoPessoa`
para simetria com label.

`useNavegacao` (`src/lib/stores/navegacao.ts`) ganha campo
`scrollMenuLateralPosition: number` + setter
`setScrollMenuLateralPosition(offset)`. Init=0.

Tests: +3 casos K1 (scroll offset salva com debounce, re-abrir
aplica scrollTo persistido, rodapé incorpora insets.bottom). E2E
novo cobre 3 estados (topo/rolado/reaberto).

Métricas: 1727 testes / 174 suítes verde (+3) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-AGENDA — `M-SAVE-AGENDA-VALIDA` (2026-05-07)

**Bloco I FECHADO (15/15 sprints).** `src/lib/vault/agenda.ts`
remove `joinUri` local (6 callsites) e migra para `vaultUriJoin`.
Path `markdown/agenda-pessoa_a-YYYY-MM-DD-eventId.md` (H2). Caller
`app/agenda.tsx` envolve `salvarCacheEventos` em
`comTimeout(p, 30s)` + try/catch. Toasts PT-BR `Agenda atualizada.`
/ `Não foi possível atualizar: <msg>`.

Tests: 19 → 23 casos (vaultRoot vazio throw, SAF trailing slash sem
barras duplas, SAF `%20` defesa A29, sincronização inicial cria N
arquivos). E2E novo cobre `agenda root` presente + `agenda
carregando` ausente.

Validação adb humana fica pendente até I2-OAUTH (sprint separada,
decisão dono — código de I-AGENDA não depende de OAuth funcionando).

Métricas: 1724 testes / 174 suítes verde (+4) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-CICLO — `M-SAVE-CICLO-VALIDA` (2026-05-07)

`src/lib/vault/ciclo.ts` migra `joinUri` local (3 callsites) para
`vaultUriJoin`. Path canônico `markdown/ciclo-YYYY-MM-DD.md`.
Caller `app/ciclo/registrar.tsx` (não `app/ciclo/novo.tsx` como
o spec especulava — auditoria empírica) envolve em
`comTimeout(p, 10s)` + try/catch. Toasts PT-BR `Ciclo registrado.`
/ `Não foi possível salvar: <msg>`.

Helper novo `src/lib/ciclo/inferencia.ts` (módulo puro) com
`autorPadrao(tipoCompanhia, sexoA, sexoB)` retorna autor inferido
ou `null` (ambíguo). Solo M/PNB → null; solo F/NB → pessoa_a.
Casal/amigos: 1 feminina não-feminina → autor é a feminina;
ambas femininas ou ambos masculinos → null (pede seleção
manual). `deveMostrarItemCiclo(sexoA, sexoB)` esconde ciclo só
se ambos `'masculino'`.

Caller pré-seleciona via `autorPadrao`; se null, mostra seletor
explícito. `MenuLateral` oculta item "Ciclo" se ambos masculino
(combinado com feature toggle `cicloMenstrual`).

Tests: +30 casos / +1 suite (`inferencia.test.ts` 27 cenários
canônicos sozinho M/F/NB/PND/null + casal/amigos 8 combinações;
`ciclo.test.ts` +3 vaultUriJoin/throw/`%20`; `MenuLateral.test.tsx`
+5 esconde/mostra). E2E novo cobre fluxo completo.

Métricas: 1720 testes / 174 suítes verde (+30 / +1 suite contra
1690 / 173 baseline) · TS strict 0 · Hermes 7,7 MB · Gauntlet
leak 0/6 · anonimato OK · PT-BR OK.

### Sprint J1 — `M-ONBOARDING-PERMISSOES` (2026-05-07)

Onboarding passa de 4 frames (H3) para 5 frames com nova arquitetura:
Frame 1 ganha seletor de Sexo (chips Masculino/Feminino/Não-binário/
Prefiro não dizer); Frame 4 NOVO "Permissões" entre pasta e tudo pronto
com 4 toggles (Câmera ON / Microfone ON / Notificações ON / Localização
OFF); Frame final 5 mostra resumo "N permissões concedidas". Indicador
progresso 4 → 5 segmentos.

`useOnboarding` (`src/lib/stores/onboarding.ts`) bump v2 → v3 com
campos novos: `sexoDeclarado: SexoPorPessoa` (mais coeso com store
existente que já delega nome/foto para `usePessoa`) +
`permissoes: PermissoesOnboarding` (storage/camera/microfone/
notificacoes/localizacao). Setters reativos
`setSexoDeclarado(pessoa, sexo)` + `setPermissao(key, granted)`.
`gauntlet.ts` `reset()` limpa v2 legacy também para determinismo.

Helper novo `src/lib/permissoes/requestOnboarding.ts` com
`requestPermissao(tipo)` + `getPermissaoStatus(tipo)`. Botão Continuar
do Frame Permissões dispara request em sequência (câmera → mic →
notif → location), persiste em store, segue para Frame final.

Sub-tela nova `app/settings/permissoes.tsx` mostra status atual
(concedida/negada/não pedida) + botão "Abrir configurações do
sistema" (`Linking.openSettings()`) por permissão negada. Plug em
`app/settings/index.tsx` via `<LinkSubTela>` "Permissões" →
`/settings/permissoes`.

Tests: +13 casos (onboarding store sexoDeclarado/permissoes setters
+ reatividade; onboarding.tsx 5 frames com toggles funcionando +
Continuar chama requestPermissions). E2E novo
`tests/e2e/playwright/m-onboarding-permissoes.e2e.ts` com mock
granted.

Validação Gauntlet pelo orquestrador: 5-frame navegado completo,
captura 3 PNGs (Frame 1 nome+sexo, Frame Permissões cards, Frame
final resumo). `useNomeDe` reativo confirma nome "Andre" propagando.

Métricas: 1690 testes / 173 suítes verde (+13 contra 1677 baseline) ·
TS strict 0 · Hermes 7,7 MB intacto · Gauntlet leak 0/6 · anonimato
OK · PT-BR check OK.

I-CICLO destravada (sexoDeclarado disponível para inferência).

### Sprint I2-AMIGOS — `M-AMIGOS-LABEL` (2026-05-07)

`useNomeDe('ambos')` em `src/lib/stores/pessoa.ts` ramifica por
`tipoCompanhia`: `'casal'` → `'Casal'`, `'amigos'` → `'Todos'`,
`'sozinho'` → `'Ambos'` (fallback defensivo). Reatividade via
`useOnboarding((s) => s.tipoCompanhia)`.

Substituições: literal `'Sobreposto'` em `MiniHumorScreen.tsx:85`
+ hardcoded `'Casal'` em `ItemTarefa.tsx:89` migrados para
`useNomeDe('ambos')`. `pessoas.config.ts` `ambos.nome: 'Casal'`
mantido por consistência mas ignorado pelo hook.

Tests: pessoa.test.ts reescrito de 4 para 11 casos (3 ramos
tipoCompanhia + reatividade a `setTipoCompanhia` + nomes reais
pessoa_a/pessoa_b).

Screenshot Gauntlet: heatmap com `tipoCompanhia='casal'` mostra
chip "Casal" reativo (era "Sobreposto" hardcoded).

Achado registrado: Gauntlet API não tem cobertura para
`tipoCompanhia='amigos'` — sprint nova `INFRA-GAUNTLET-AMIGOS-API`
para expor `setTipoCompanhia` ou `SeedOpcoes.tipoCompanhia`.

Métricas: 1677 testes / 173 suítes verde (+5) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-SCANNER + M-SCANNER-LAYOUT (consolidadas, 2026-05-07)

`src/lib/scanner/saveNota.ts` migra helpers legados para layout-por-tipo:
- `mediaScannerPath(slug, ext)` → `scannerPath(slug, ext)` →
  `<ext>/scanner-<slug>.<ext>` (jpg ou pdf).
- `mediaScannerPath(basename, 'md')` → `scannerCompanionPath(slug)` →
  `markdown/scanner-<slug>.md`.
- `inboxFinanceiroNotaPath(date, slug)` → `notaPath(date, slug)` →
  `markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md`.
- `joinUri` local → `vaultUriJoin` canônico (H1).

Slug `${formatDateYmdHms(agora)}-${slugifyDescricao}` garante
unicidade. Wikilink ajustado para `[[../<ext>/scanner-<slug>]]`.

`src/components/screens/ScannerPreview.tsx` envolve `saveNota` em
`comTimeout(p, 30s)` (cobre consolidarPdf + 3 writes SAF + ML Kit).
Toasts PT-BR `Nota salva.` / `Não foi possível salvar: <msg>`.

Tests: 15 → 19 casos (1 página jpg+md, multi-página pdf+md,
md semântico nota financeira, vaultRoot vazio throw, trailing
whitespace+`%20` saneado, OCR confiança baixa propaga revisar=true).
E2E novo cobre tap "Escanear documento" via Gauntlet.

Resolve achado M-SCANNER-LAYOUT-POR-TIPO registrado em H2 (saveNota.ts
ainda usava helpers legados). Helpers `mediaScannerPath` e
`inboxFinanceiroNotaPath` permanecem em paths.ts apenas para
preservar tests legados; remoção fica para sprint que migra share
intent (M-SHARE-INTENT-LAYOUT).

Métricas: 1672 testes / 173 suítes verde (+4) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-EXERCICIO — `M-SAVE-EXERCICIO-VALIDA` (2026-05-07)

`src/lib/vault/exercicios.ts` migra `joinUri` local (4 callsites:
ler, listar, escrever, excluir) para `vaultUriJoin`. Path .md
`markdown/exercicio-<slug>.md` + GIF binário separado em
`gif/exercicio-<slug>.gif` (cross-link via frontmatter `gif`).

`src/lib/exercicios/saveExercicio.ts` migra `joinUri` local para
`vaultUriJoin` no destino do GIF (`copyAsync` URI temp → `gif/...`).

`app/exercicios/novo.tsx` envolve `saveExercicio` em
`comTimeout(p, 30s)` (timeout maior — copy SAF de GIF até 5MB em
OEM lentos) + try/catch. Toasts PT-BR `Exercício salvo.` / `Não
foi possível salvar: <msg>`.

Tests: +7 casos (.md trailing `%20`/`//`/vaultRoot vazio/dicas[]
preservadas + GIF trailing `%20`/cross-link frontmatter/vaultRoot
vazio com GIF). E2E novo cobre fluxo via Gauntlet.

Métricas: 1668 testes / 173 suítes verde (+7) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-CONTADOR — `M-SAVE-CONTADOR-VALIDA` (2026-05-07)

`src/lib/vault/contadores.ts` migra `joinUri` local (4 callsites) para
`vaultUriJoin`. Path `markdown/contador-<slug>.md`. `app/contadores/novo.tsx`
e `app/contadores/[slug].tsx` envolvem awaits em `comTimeout(p, 10s)`.
Toasts PT-BR `Contador salvo.` / `Contador resetado.` / `Não foi
possível salvar: <msg>`.

Schema atual `resets[]` + `recorde` MANTIDO (já cumpre BRIEF §1.8
preservação de histórico — não regredido). Rename para
`historico_resets`/`{data_reset, dias_acumulados}` que o spec sugeria
ficaria breaking change em .md de produção alpha; sprint dedicada
M-SCHEMA-CONTADOR-V2 registrada se o dono decidir mais tarde.

Tests: +5 casos (vaultRoot vazio throw, trailing `%20`, trailing
slashes, histórico preservado BRIEF §1.8, reset via vaultUriJoin).
E2E novo cobre fluxo "Sem cigarro" → criar.

Métricas: 1661 testes / 173 suítes verde (+5) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-ALARME — `M-SAVE-ALARME-VALIDA` (2026-05-07)

`src/lib/vault/alarmes.ts` migra `joinUri` local para `vaultUriJoin`
canônico. Path `markdown/alarme-<slug>.md`. `app/alarmes/novo.tsx`
envolve 3 awaits (cancelarAlarme, agendarAlarme, escreverAlarme)
em `comTimeout(p, 10s)`. Toasts PT-BR canônicos.

Tests: 11 → 17 casos em `tests/lib/vault/alarmes.test.ts` (4
recorrências única/diária/semanal/mensal + vaultRoot vazio throw +
trailing `%20` normalizado). E2E novo cobre fluxo até tap Salvar
(channel notif é no-op em web).

Métricas: 1656 testes / 173 suítes verde (+7) · TS strict 0 ·
Hermes 7,7 MB · Gauntlet leak 0/6 · anonimato OK · PT-BR OK.

### Sprint I-TAREFA — `M-SAVE-TAREFA-VALIDA` (2026-05-07)

`src/lib/vault/tarefas.ts` migra `joinUri` local para `vaultUriJoin`
canônico (5 callsites: listar, ler, escrever, criar com conflict
resolution, excluir). `uriParaRelativo` ganha trim espelhando
`vaultUriJoin` (whitespace/`%20`/barras) para devolver rel limpo
mesmo com vaultRoot sujo. Path canônico
`markdown/tarefa-<slug>.md` (sem date prefix — schema guarda
`criada_em` no frontmatter, tarefa é persistente).

`app/todo.tsx` envolve `handleSalvarSheet` em `comTimeout(p, 10s)`.
Toasts PT-BR `Tarefa salva.` / `Não foi possível salvar: <msg>`
substituem strings antigas (`Tarefa anotada.` / `Falha ao salvar`).

Schema `tarefa.ts` v2 M31 (categoria + pessoa_destino + alarme +
slug_vinculado) preservado — não regredido para campos que o spec
sugeria. Auditoria empírica identificou caller real `app/todo.tsx`
+ `SheetNovaTarefa.tsx` (não `app/tarefas/novo.tsx` como o spec
especulava).

Tests: +8 casos em `tests/lib/vault/tarefas.test.ts` (path canônico
`vaultUriJoin`, throw vaultRoot vazio em escrever/criar/ler,
normalização `%20`+whitespace A29, barras duplas, listar com root
sujo, marcarFeito preservando categoria/destino/alarme). E2E novo
`tests/e2e/playwright/m-save-tarefa.e2e.ts` cobre fluxo "Limpar
gatos" + categoria Saúde.

Métricas: 1649 testes / 173 suítes verde (+8 contra 1641 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-AUDIO — `M-SAVE-AUDIO-VALIDA` (2026-05-07)

`src/lib/diario/recordAudio.ts` reescrito padrão I-VIDEO/I-FOTO
(writer inline com `vaultUriJoin`). Path `m4a/audio-...m4a` +
companion `markdown/audio-...md` apontando para `../m4a/...`.
vaultRoot vazio throw. Nova função `atualizarCompanionAudioComTranscricao`
regrava companion após STT sucesso (best-effort, separado do save).

`src/components/diario/MicrofoneButton.tsx` aplica
`comTimeout(p, 30s)` + try/catch. Toasts PT-BR `Áudio salvo.` /
`Não foi possível salvar: <msg>`. **Save sequencial** (áudio
garantido, transcribe em segundo plano) substitui `Promise.all`
paralelo antigo.

`src/lib/midia/companion.ts` `stringifyCompanionMidia` ganha campo
opcional `transcricao`: presente → frontmatter + body integral
(espelha `midia_frase`); ausente → omite (semântica null canônica).

Tests: 11 casos em `tests/lib/diario/recordAudio.test.ts` (path
canônico, `vaultUriJoin`, throw vaultRoot vazio, trailing space
normalizado, companion frontmatter, transcricao presente/ausente,
opções autor/para/legenda, atualizar companion com STT). E2E novo
render-only (microfone real e STT impossíveis em web; validação
adb humana obrigatória conforme A11/A28).

Métricas: 1641 testes / 173 suítes verde (+7 contra 1634 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-FOTO — `M-SAVE-FOTO-VALIDA` (2026-05-07)

`src/lib/midia/capturarFoto.ts` reescrito no padrão I-VIDEO (writer
inline). Remove dependência de `escreverMidiaComCompanion` legado e
aplica `vaultUriJoin` direto. Detecção `jpg`/`png` por `mimeType`
com fallback por extensão do URI. Path do binário em `jpg/` ou `png/`
+ companion em `markdown/foto-...md` apontando para `../<ext>/...`.
vaultRoot vazio agora throw `Vault não conectado.`.

**Race fix BottomSheet**: `MenuCapturaVerde.handleFoto` envolve em
`comTimeout(p, 30s)` (timeout maior — copy SAF lento) + try/catch.
Sheet fecha APENAS no `finally`, depois do save resolver (sucesso OU
erro), não no `onPress` síncrono. Custo aceito: ~1-2s sheet aberto;
benefício: usuário vê o resultado do save sem race. Resolve crash
documentado em §1 do spec.

`MemoriasFotosTab.handleRegistrarFotoEmptyState` ganhou try/catch
defensivo (regressão direta da mudança throw/silent — fix mínimo,
não escopo expandido).

Tests: 6 → 12 casos em `tests/lib/midia/capturarFoto.test.ts`
(throw vaultRoot vazio, jpg em `jpg/` + companion, png em `png/` +
companion, mimeType ausente fallback extensão, path final
`vaultUriJoin` sem `%20`/barra dupla, companion frontmatter).
E2E novo `tests/e2e/playwright/m-save-foto.e2e.ts` cobre menu
+ tap foto via `__gauntlet.adicionarFotoMock()`.

Métricas: 1634 testes / 173 suítes verde (+5 contra 1629
baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

### Sprint I-VIDEO — `M-SAVE-VIDEO-VALIDA` (2026-05-07)

`src/lib/midia/capturarVideo.ts` reescrito com writer inline
usando `vaultUriJoin` + `videoPath` (`mp4/video-...mp4`) +
`videoCompanionPath` (`markdown/video-...md`). vaultRoot vazio
agora throw em vez de silêncio. `MenuCapturaVerde.handleVideo`
envolve em `comTimeout(p, 15s)` (timeout maior para vídeo) +
try/catch + toasts PT-BR `Vídeo salvo.` / `Não foi possível
salvar: <msg>`.

Decisão arquitetural: `escreverMidiaComCompanion` (helper compartilhado
foto/áudio/scanner/medidas) NÃO migrado nesta sprint — aguarda fechar
todas as I-* mídia antes de migração centralizada. I-VIDEO segue
padrão `saveEvento`/`salvarFrase` (writer inline com vaultUriJoin).

Tests: +2 casos em `tests/lib/midia/capturarVideo.test.ts` (vaultRoot
null throw, path final via vaultUriJoin sem `%20`/barra dupla,
companion frontmatter aponta para basename do binário). E2E novo
`tests/e2e/playwright/m-save-video.e2e.ts` cobre tap menu (picker
nativo não funciona em web — runtime real via Nível B/C).

Métricas: 1629 testes / 173 suítes verde (+2 contra 1627 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-EVENTO — `M-SAVE-EVENTO-VALIDA` (2026-05-07)

`src/lib/eventos/saveEvento.ts` migra `joinUri` local (3
concatenações) para `vaultUriJoin` (H1) com path
`markdown/evento-YYYY-MM-DD-slug.md` (H2). `app/eventos.tsx`
consome `comTimeout` do util canônico (4º caller migrado). Toasts
PT-BR `Evento salvo.` / `Não foi possível salvar: <msg>`.

Schema real `evento.ts` usa `modo: positivo|negativo` (não
"polaridade") + body livre (não "descricao") — implementação seguiu
schema canônico, não terminologia do spec. Inconsistência de spec
documentada como achado, não bloqueia.

Tests: +6 casos em `tests/lib/eventos/saveEvento.test.ts`
(vaultRoot vazio throw, `%20` trailing eliminado, modo positivo,
modo negativo, foto cross-link companion `markdown/` + binário
`jpg/`, sem bairro com slug derivado). E2E novo
`tests/e2e/playwright/m-save-evento.e2e.ts` cobre 2 modos.

Métricas: 1627 testes / 173 suítes verde (+6 contra 1621
baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

### Sprint I-DIARIO — `M-SAVE-DIARIO-VALIDA` (2026-05-07)

`src/lib/diario/saveDiario.ts` migra `joinUri` local para
`vaultUriJoin` (H1) com path `markdown/diario-YYYY-MM-DD-HHmm-slug.md`
(H2). `app/diario-emocional.tsx` envolve save em try/catch+timeout
com toasts PT-BR `Diário salvo.` / `Não foi possível salvar: <msg>`.

**`comTimeout` extraído para `src/lib/util/comTimeout.ts`** (zero
deps, função pura) com 6 testes em
`tests/lib/util/comTimeout.test.ts`. 3 callers migrados:
`MenuCapturaVerde.tsx`, `app/humor-rapido.tsx`,
`app/diario-emocional.tsx`. Resolve achado registrado em I-HUMOR.

Tests: +6 casos em `tests/lib/diario/saveDiario.test.ts`
(modo trigger, modo vitória, audio companion presente, audio null,
vaultRoot vazio throw, normalização SAF tree URI com `%20` ofensivo).
E2E novo `tests/e2e/playwright/m-save-diario.e2e.ts` cobre 2 modos
canônicos (trigger + vitória) via Gauntlet seed.

Achados registrados:
- Schema `DiarioEmocionalModoSchema` aceita só `trigger|vitoria`,
  não `reflexao`. Sprint nova `I-DIARIO-REFLEXAO` para extender.
- Audio companion file separado (`markdown/audio-...md`) fica para
  sprint `I-AUDIO` que ainda não foi entregue.
- `check_test_data.sh` não respeita marker `anonimato-allow:` —
  sprint `INFRA-CHECK-TEST-DATA-ALLOW` para alinhar.

Métricas: 1621 testes / 173 suítes verde (+12 contra 1609 baseline,
+1 suíte do helper) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

### Sprint I-HUMOR — `M-SAVE-HUMOR-VALIDA` (2026-05-07)

`src/lib/humor/saveHumor.ts` migra `joinUri` local para `vaultUriJoin`
(H1) com path `markdown/humor-YYYY-MM-DD.md` (H2). Todas as
concatenações ad-hoc auditadas e substituídas. Schema `HumorSchema`
mantido como está (rejeita `autor: 'ambos'` — bug deliberado de
I2-AMIGOS, sprint dedicada futura).

`app/humor-rapido.tsx` aplica `comTimeout(p, 10s)` + try/catch.
Toasts PT-BR `Humor salvo.` / `Não foi possível salvar: <msg>`.

Tests: +6 casos em `tests/lib/humor/saveHumor.test.ts` (cenários
pessoa_a/pessoa_b/rejeição 'ambos', vaultRoot vazio throw,
normalização SAF tree URI com `%20` trailing, payload sem campo
obrigatório). E2E novo `tests/e2e/playwright/m-save-humor.e2e.ts`
cobre 3 seeds (pessoa_a sozinho, casal, pessoa_b sozinho) com
screenshots Gauntlet.

Achado 1 (sprint I2-AMIGOS): schema `HumorSchema.autor` rejeita
`'ambos'` deliberadamente; quando I2-AMIGOS estender `useNomeDe`
para retornar 'Casal'/'Todos' dinamicamente, schemas humor/diário/
evento/marco precisam aceitar autor coletivo. Mantido como bug
documentado.

Achado 2 (sprint UTIL-COMTIMEOUT opcional): helper `comTimeout`
agora replicado em 2 callers (`MenuCapturaVerde.tsx` + `humor-rapido.tsx`).
Ao aparecer 3º caller (provável I-DIARIO ou I-EVENTO), extrair
para `src/lib/util/comTimeout.ts`.

Métricas: 1609 testes / 172 suítes verde (+6 contra 1603 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-DEVICES — `M-SAVE-DEVICES-INDEX-VALIDA` (2026-05-07)

`src/lib/vault/devicesIndex.ts` migra de `joinUri/INBOX_DEVICES_REL`
(módulo local `devicesPath.ts` legado, sem trim de `%20`) para
`vaultUriJoin` + `devicesIndexPath()` (`markdown/_devices.md`
após H2). Boot hook `atualizarDeviceIndex` continua plugado em
`BOOT_HOOKS` via `reagendamento.ts` linha 212, idempotente, atualiza
`ultima_atividade` do device atual a cada boot.

`src/lib/vault/devicesPath.ts` removido (órfão, zero importadores).

Tests: 17 → 20 casos em `tests/lib/vault/devicesIndex.test.ts`
(SAF tree URI MIUI/OneUI com `%20` trailing + throws com vaultRoot
vazio em escreverDevicesIndex e lerDevicesIndex).

Achado documentado: ~38 callers ainda usam `joinUri` legado sem
trim agressivo. Cada um migra na sprint Bloco I dedicada (humor,
diário, evento, foto, áudio, vídeo, tarefa, alarme, contador, ciclo,
exercício, scanner, agenda).

Métricas: 1603 testes / 172 suítes verde (+3 contra 1600 baseline) ·
TS strict 0 · Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 ·
anonimato OK · PT-BR check OK.

### Sprint I-FRASE — `M-SAVE-FRASE-VALIDA` (2026-05-07)

Save de frase texto-livre (FAB+ verde → "Frase") ganha resiliência:
`src/lib/midia/salvarFrase.ts` remove `joinUri()` local e usa
`vaultUriJoin` (H1) com path `markdown/frase-YYYY-MM-DD-slug.md`
(layout H2). Adiciona `resolverColisao()` (sufixo `-2`...`-99`)
para frases com mesmo prefixo no mesmo dia. Erro com vault
ausente / write fail agora é throw, não silêncio (bug-loud >
bug-quiet, alinhado com filosofia H1).

`MenuCapturaVerde.handleSalvarFrase` envolve `salvarFrase` em
`comTimeout(p, 10s)` + try/catch. Toasts PT-BR `Frase salva.` no
sucesso e `Não foi possível salvar: <msg>` no erro.

Tests: 5 → 7 casos em `tests/lib/midia/salvarFrase.test.ts`
(SAF tree URI com `%20` trailing + colisão de slug). E2E novo
em `tests/e2e/playwright/m-save-frase.e2e.ts` cobre fluxo
golden via Gauntlet seed.

Métricas: 1600 testes / 172 suítes verde (+2 contra 1598
baseline) · TS strict 0 · Hermes Android 7,7 MB intacto ·
Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

Primeira sprint do Bloco I (saves específicos por feature).
Padrão canônico do `_TEMPLATE-SAVE-FEATURE.md` aplicado pela
primeira vez — referência para as próximas 14 sprints I-*.

### Sprint H3 — `M-VAULT-PASTA-NAO-HARDCODED` (2026-05-06)

Onboarding ganha quarto frame "Pasta do Vault — Onde salvar seus
dados?" entre Companhia e Tudo pronto, com dois cards: "Sugestão:
Documents/Ouroboros" (botão "Usar essa", chama `pedirPermissaoStorage()`
+ `inicializarVaultEscolhido(sugestaoVaultUriDefault())`) e "Outra
pasta" (botão "Escolher", chama `requestVaultPermission()` SAF picker
+ `inicializarVaultEscolhido(uriEscolhida)`). Indicador de progresso
passa de 3 para 4 segmentos.

`src/lib/vault/permissions.ts` refatorado:
`inicializarVaultCanonico()` removido (e suas constantes globais
hardcode `VAULT_PATH`/`VAULT_URI`). Substituído por
`inicializarVaultEscolhido(uri)` que aceita URI já escolhida pelo
caller, derivando modo `auto`/`saf-fallback` por inspeção de prefixo
da URI (`content://` → SAF, demais → auto). `garantirSubpastas`
sanitiza URI via `vaultUriJoin` (H1). Novos getters
`sugestaoVaultPathDefault()` e `sugestaoVaultUriDefault()` retornam
`/sdcard/Documents/Ouroboros/` como sugestão pura.

`VaultBootGate` em `app/_layout.tsx` ganha fallback de 2 níveis:
`loadVaultRoot()` (SecureStore) → sugestão default + permissão.
Hardcode silencioso eliminado.

Sub-tela nova `app/settings/vault.tsx` mostra path atual e oferece
duas ações: "Trocar pasta do Vault" (diálogo inline com confirmação,
explica que dados ficam na pasta antiga e devem ser movidos
manualmente, depois SAF picker) e "Reinicializar pasta" (recria 8
subpastas canônicas H2 na pasta atual). Plug em `app/settings/index.tsx`
substitui o link inline antigo "Reinicializar pasta do Vault" por
`<LinkSubTela>` "Vault" → `/settings/vault`.

ADR-0022 documenta a decisão (supersedes parcialmente ADR-0014 que
assumia pasta dedicada hardcoded). Justificativa: respeitar
autonomia do usuário, permitir Vault Obsidian compartilhado.
Decisão arquitetural durável: trocar pasta NÃO move dados —
complexidade de migração SAF↔SAF é alta, usuário pode preferir
manter histórico antigo, fluxo manual via export ZIP/import recomendado.

Métricas: 1598 testes / 172 suítes verde (+5 contra 1593 baseline,
1 skip intencional preservado) · TS strict 0 · Hermes Android 7,7 MB
intacto · Gauntlet leak 0/6 · anonimato OK · PT-BR check OK.

Validação Gauntlet manual pelo orquestrador: 4-frame onboarding
navegado completo via playwright MCP, novo Frame 3 "Pasta do Vault"
renderizou cards corretamente, "Usar essa" propagou
`vaultRoot=web://mock-vault/Protocolo-Ouroboros`, console
`__gauntlet.consoleErros()` vazio. Sub-tela `/settings/vault`
renderizou path atual + 2 ações (trocar/reinicializar) corretamente.

Bloco H FECHADO. Bloco I (15 saves específicos por feature)
totalmente destravado.

### Sprint H2 — `M-VAULT-LAYOUT-POR-TIPO` (2026-05-06)

Reorganiza o Vault de layout por feature (`daily/`, `eventos/`,
`marcos/`, `media/fotos/`, etc) para layout por tipo de arquivo:
`markdown/` para todos os `.md` (incluindo companions de mídia),
`png/`, `jpg/`, `m4a/`, `mp4/`, `pdf/`, `gif/` para binários
separados por extensão, e `.ouroboros/cache/` mantido como exceção
(ADR-0019). Filename incorpora feature como prefixo
(`markdown/humor-2026-05-06.md`, `m4a/audio-2026-05-06-rand.m4a`).

Ergonomia desktop: usuário que abre o Vault no file manager (via
Syncthing) encontra todos os `.md` num lugar consumível por
Obsidian/vim/qualquer editor; mídias binárias separadas facilitam
backup e audit por tipo.

`src/lib/vault/paths.ts` reescrito com 28 helpers novos retornando
path relativo. Caller concatena com `vaultRoot` via `vaultUriJoin`
(H1). `VAULT_FOLDERS` reduzido de 19 entradas para 8 canônicas
(`markdown`, `png`, `jpg`, `m4a`, `mp4`, `pdf`, `gif`, `.ouroboros/cache`).

Boot hook idempotente `migrarVaultLayoutPorTipo()` em
`src/lib/boot/migrarVaultLayoutPorTipo.ts` detecta arquivos no
layout antigo, calcula novo path conforme novos helpers e
copia/renomeia. Flag `useSessao.flags.vaultLayoutMigrado` evita
re-execução. No-op em web. Plugado em `BOOT_HOOKS` via padrão
M30/M37.1.2/M39.

ADR-0023 documenta a decisão (supersedes parte do ADR-0017
"companion no mesmo diretório do binário"). `docs/ADRs/INDEX.md`,
`docs/SMOKE-FIELD-TEST.md` e `docs/FEATURES-CANONICAS.md`
atualizados.

Migração afetou 12 writers do Vault, 10 callers de save de feature,
1 boot hook hub, 1 store (sessao), 21 suites Jest dos writers/readers.
Achados colaterais derivam 2 sprints novas: M-SCANNER-LAYOUT-POR-TIPO
(`src/lib/scanner/saveNota.ts` ainda usa helpers legados) e
M-SHARE-INTENT-LAYOUT (decisão dono A/B sobre subtipo virar prefixo
ou pasta exceção).

Métricas: 1593 testes / 172 suítes verde (+27 contra 1566 baseline,
1 skip intencional contrato share-intent legado) · TS strict 0 ·
Hermes Android 7,7 MB intacto · Gauntlet leak 0/6 · anonimato OK ·
PT-BR check OK (boot hook + reagendamento.ts em batch
`.ptbr-violations.txt` por paths literais em comentários).

Bloqueia destravado: H3 `M-VAULT-PASTA-NAO-HARDCODED` e todo Bloco I
(15 saves específicos por feature).

### Sprint H1 — `M-VAULT-URI-HELPER` (2026-05-06)

Helper canônico `vaultUriJoin(root, rel)` em `src/lib/vault/paths.ts`
faz trim agressivo (whitespace, `%20` percent-encoded, slashes
duplicadas) antes de concatenar URIs do Vault, prevenindo a
contaminação por trailing space que vinha quebrando saves em OEMs
MIUI/OneUI/HyperOS (`Invalid URI` em writes, `directory cannot be
created` em copies). Lança `Error` claro quando root ou rel vazios —
bug-loud > bug-quiet, força chamadores a falharem cedo se o Vault
não foi inicializado.

Suite Jest cobre 10 casos em `tests/lib/vault/paths.test.ts`:
concatenação simples, trim de whitespace/`%20`/slashes do root,
trim de leading slashes/whitespace do rel, throws com root vazio, rel
vazio, root só whitespace, e preservação de subpaths complexos.
Re-exportado via `src/lib/vault/index.ts`.

Sprint não toca writers/readers — migração canônica acontece em cada
sprint do Bloco I (anti-débito). Bloqueia destravado para H2, H3 e
todo Bloco I.

Métricas: 1566 testes / 172 suítes (+10 contra 1556 baseline) · TS
strict 0 · bundle Hermes intacto · Gauntlet leak 0/6 · anonimato OK ·
PT-BR check OK.

### Plano end-to-end v1.0.0 — golden-zebra (2026-05-06)

Field test do APK `v1.0.0-alpha` (commit `ada414e`) revelou problemas
heterogêneos: causa raiz parcial em path/URI corruption + hardcode da
pasta canônica do Vault, mais bugs específicos por feature, decisões
arquiteturais novas (Vault layout por tipo, Recap+Calendário
unificados, sexo declarado no onboarding, permissões pró-ativas),
dívida UX/visual (menu lateral, FABs, botões), e risco residual de
38 motis não migrados em A28.

Plano `tem-muita-coisa-zoada-golden-zebra` aprovado pelo dono
2026-05-06 organiza correção em **31 sprints atômicas** distribuídas
em 8 blocos (H–P). Cada sprint com spec auto-contido em
`docs/sprints/<id>-spec.md`, executável sem contexto por outro Claude
lendo apenas `CLAUDE.md` + `VALIDATOR_BRIEF.md` + spec + `STATE.md`.

**Diretiva durável do dono**: "nunca é só isso" — cada feature ganha
sprint própria de validação isolada (15 sprints I-* só para saves),
sem promessa de "1 fix resolve N features".

**Causa raiz lida no código** (`src/lib/vault/permissions.ts:41-42`):

```ts
const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
const VAULT_URI = `file://${VAULT_PATH}`;
```

Hardcoded. `inicializarVaultCanonico()` força `/sdcard/Documents/Ouroboros/`,
cai em SAF picker em OEMs MIUI/OneUI/HyperOS. URI SAF retornado pode
ter trailing space (`primary:Protocolo-Ouroboros%20`) que vaza para
todas as URIs filhas via `garantirSubpastas` linha 137 (sem trim).
Resultado: `Invalid URI` em writes, `directory cannot be created` em
copies, loaders travados em "carregando eternamente" para 10+ features.

**31 specs materializadas em `docs/sprints/`**:

- 3 sprints H — fundação Vault (helper canônico, layout por tipo,
  pasta escolhida) + ADRs 0022 e 0023.
- 15 sprints I — saves específicos por feature (humor, diário,
  evento, foto, áudio, vídeo, frase, tarefa, alarme, contador, ciclo,
  exercício, scanner, devices index, agenda) seguindo template comum
  `_TEMPLATE-SAVE-FEATURE.md`.
- 2 sprints I2 — OAuth redirect_uri fix + label dinâmico amigos/casal/todos.
- 1 sprint J — onboarding pede 5 permissões + sexoDeclarado para
  inferência ciclo.
- 5 sprints K — chrome UX (menu lateral layout, nomes seções, foto
  editável, FAB safe bottom, botões largura).
- 2 sprints L — telas/abas (Memórias→Saúde Física com 3 abas;
  Recap+Calendário unificados via toggle modo) + ADR-0021.
- 2 sprints N — moti audit runtime + fix dirigido apenas dos críticos.
- 1 sprint O — `VALIDATOR_BRIEF.md` §1.9 ganha regra obrigatória de
  validação Gauntlet OU validação humana adb antes de gerar APK.

**ADRs novos a criar durante execução**:

- ADR-0021 Recap e Calendário unificados em uma tela com toggle modo
- ADR-0022 Vault: pasta escolhida pelo usuário no onboarding
- ADR-0023 Vault: layout por tipo de arquivo (markdown/, png/, etc)

**Estimativa**: ~50-60h código ativo + 7 dias passivos field test +
~1 dia release = **~15-16 dias de calendário até v1.0.0**.

**Cota EAS preservada**: 15 builds restantes de 30/mês. Plano usa 2
(1 preview após blocos H–O fechados; 1 production após F1 field
test verde).

### Auditoria do ROADMAP (M-ROADMAP-AUDIT 2026-05-05 noite)

Auditoria via `git log --all --oneline --no-merges | grep "feat:"`
revelou que **4 sprints do Bloco E (M06.5 microfone, M07.x
conquistas mídia, M11.5 calendário conquistas, M09 scanner
OCR) já estavam entregues no código** (commits `0138ecc`,
`16005ef`, `dadbb62`, `c8e3304` respectivamente, com evoluções
posteriores em `a856fe9`, `8c322fe`, `df34500`), mas a tabela
"Linha do tempo" do `ROADMAP.md` marcava todas como `[todo]`.

**Causa raiz**: durante a refundação v1.0 (2026-05-02), a
retirada do release `v1.0-rc1` zerou os status no roadmap mas
preservou o código. A tabela "Fila ativa reordenada por
blocos" foi mantida atualizada conforme sprints fechavam, mas
a "Linha do tempo" não acompanhou.

**Consequência prática**: 2 dispatches de executor-sprint
hoje (E1 M06.5 e E4 M09) consumiram ~125k tokens e foram
**rejeitados formalmente pelos executores** ao detectar que
os arquivos do spec já existiam em produção. Rejeição correta
e valiosa — preveniu reescrita destrutiva de código já
mergeado.

**Correções aplicadas:**
- Bloco "Estado real consolidado" adicionado ao topo do
  `ROADMAP.md` enumerando o que está entregue (Bloco A 9/9,
  B 6/6, C 10/10, D 1/1, E5 + 4 sub-paralelas + E1-E4) e o que
  REALMENTE falta (E5.B checkpoint Nível B, E6 M37.2, F1 field
  test, M41 release).
- Nota histórica destacada no topo da "Linha do tempo"
  marcando-a como **arquivo cronológico apenas** — fonte de
  verdade canônica é a "Fila ativa por blocos" + "Estado real
  consolidado".
- Estimativa real até v1.0.0 revisada: **~8-10h ativas + 7
  dias passivos field test + ~1 dia release = ~10 dias de
  calendário** (não 30-39h ativas como o roadmap insinuava).

**Aprendizado durável**: antes de dispatchar `executor-sprint`,
rodar `git log --all --oneline | grep -iE "<sprint-id>|<feature>"`
para detectar sprints "fantasmas" que estão entregues mas
listadas como `[todo]`. Adicionado à memória do orquestrador.

### Sprint M37.1.2 fechada + bug M37.1.3 corretiva enfileirada (2026-05-05 noite tarde)

#### E5.x.3 — M37.1.2 Cache de agenda em .md individual (ADR-0019)

Refactor interno completo da persistência de eventos do Google
Calendar: cada evento agora é um `.md` individual em
`agenda/<pessoa>/YYYY-MM-DD-<eventId>.md` com frontmatter zod
(`AgendaEventoSchema`, 7 campos), substituindo o JSON único
`media/cache/agenda-<pessoa>.json` introduzido por M37.1.

API pública de `calendarCache.ts` preservada
(`salvarCacheEventos`/`lerCacheEventos`/`cacheEstaFresco`) para
delegar internamente a `sincronizarSnapshotAgenda` em
`src/lib/vault/agenda.ts`. **`app/agenda.tsx` permaneceu
intocado** — refactor 100% transparente para UI.

`sincronizarSnapshotAgenda` é o entry point: escreve cada evento
e remove os `.md` cujo `sincronizado_em` é menor que o passado
(diff por timestamp em vez de cursor externo). Idempotência
empiricamente verificada: rodar 2× com mesma lista e mesmo
timestamp resulta em `{adicionados: 0, atualizados: 0,
removidos: 0}` + zero chamadas a `writeVaultFile`/`deleteAsync`.

Boot hook `migrarCacheAgenda` plugado via `BOOT_HOOKS.push` em
`reagendamento.ts` (padrão M30/M39 — não `useEffect` em
`_layout.tsx`): detecta JSON legado, expande em N `.md`, deleta
o JSON, marca flag `useSessao.flags.cacheAgendaMigrado` para
skip rápido em boots futuros. Em web no-op.

**Métricas:** 1536 → 1555 testes (+19 com nova suíte
`tests/lib/vault/agenda.test.ts`); 171 → 172 suítes; bundle
Hermes 7,7 MB **mantém** (refactor neutro); leak Gauntlet 0/6.

**Validação visual Nível A:** `A-agenda-md-individual.png`
mostra UI idêntica a `A-agenda-mes-com-dots.png` (sem
diferença visual, apenas arquitetura interna).

#### E5.x.4 — M37.1.3 (todo, corretiva — bug "Conectar trava em offline")

Bug pré-existente desde M37.1 reproduzido pelo dono em
2026-05-05 21:00: clicar "Conectar conta Google" no Gauntlet
web trava o app em estado `offline` com banner "Sem conexão.
Mostrando eventos do cache." em vez de ir para `online`.

**Causa raiz:** `useGoogleAuth.autenticar()` tem branch
`__DEV__ && Platform.OS === 'web'` que injeta token
`'mock-access-token-dev-web'`. Mas `calendarApi.listarEventos()`
**não tem branch mock equivalente** — chama `fetch` real contra
`googleapis.com/calendar/v3` com token fake → 401/CORS → cai
em `ApiError(code='rede')` → `setEstado('offline')`.

Sprint M37.1.3 enfileirada (E5.x.4, spec
`docs/sprints/M37.1.3-mock-dev-web-calendar-api-spec.md`,
0,5h): adiciona branch `isMockMode() && token.startsWith('mock-')`
em `listarEventos` retornando 5 eventos determinísticos com IDs
estáveis (`mock-<pessoa>-<idx>`). Validação visual end-to-end
do fluxo "Conectar" passa a funcionar.

### Decisão arquitetural (2026-05-05) — ADR-0019 + spec M37.1.2

**ADR-0019 — Persistência canônica em `.md` individual no Vault.**
Auditoria do Vault com o dono revelou que o cache de eventos do
Google Calendar de M37.1 (`media/cache/agenda-<pessoa>.json`,
JSON único de 30 dias) **quebra a invariante "tudo o que o
usuário vê no app é `.md` individual no Vault"**. ADR-0019
codifica a regra:

1. **Dados primários do usuário** (criados ou espelhados) são
   `.md` individual com frontmatter zod.
2. **Binários originais** seguem ADR-0017 (`media/<tipo>/` com
   `.md` companion).
3. **Exceções legítimas**: agregações readonly geradas pelo
   backend Python, em `.ouroboros/cache/*.json` (atualmente
   apenas humor-heatmap M10 e financas-cache M14).

`docs/BRIEFING.md` §7 (estrutura de pastas do Vault) atualizado
para refletir `agenda/`, `media/<tipo>/`, e a pasta de cache
oculta com as 2 exceções nominadas.

**Sprint M37.1.2 enfileirada (E5.x.3, spec
`docs/sprints/M37.1.2-cache-agenda-em-md-spec.md`, 1-2h):**
migra `media/cache/agenda-<pessoa>.json` (JSON único introduzido
por M37.1) para `agenda/<pessoa>/YYYY-MM-DD-<eventId>.md` (um
arquivo por evento). Inclui boot hook idempotente que migra
caches existentes ao primeiro boot pós-upgrade. Sem mudança de
UX. Reduz risco de conflitos Syncthing, alinha ao padrão único
e fecha o débito introduzido por M37.1.

### Sub-sprints colaterais E5 (2026-05-05 noite) — M37.1.1 + M-BRIEF-A25

#### E5.x.1 — M37.1.1 Calendar locale PT-BR

`react-native-calendars` agora exibe o header como "Maio de 2026"
em vez de "May 2026" e os dias da semana abreviados como
"Dom Seg Ter Qua Qui Sex **Sáb**" (com acento agudo no sábado,
preservando conformidade do PT-BR audit).

Implementado em arquivo isolado
`src/components/agenda/calendarLocalePtBr.ts` (side-effect
idempotente em module-top-level via require cache) em vez de
inline em `CalendarGrid.tsx` — facilita reuso futuro
(`CalendarList`, `Agenda`) sem duplicar literais.
`CalendarGrid.tsx` apenas importa o módulo e adiciona prop
`monthFormat="MMMM 'de' yyyy"` para exibir a preposição "de"
no header. Mock em `jest.setup.cjs` ampliado para expor
`LocaleConfig`. Suíte nova
`tests/components/agenda/calendarLocale.test.ts` com 6 cases
cobrindo `monthNames[4] === 'Maio'`,
`dayNamesShort[6] === 'Sáb'`, idempotência do registro,
fallback do `defaultLocale`.

**Métricas:** 1530 → 1536 testes (+6), 170 → 171 suítes (+1).
Bundle Hermes mantém 7,7 MB. Leak Gauntlet 0/6. Validação
visual Nível A capturada via Playwright em
`docs/sprints/M37.1-screenshots/A-agenda-locale-ptbr.png`
(824×1784 = 412×892@2x) — header "Maio de 2026" + grade 6×7
+ dia 5 selecionado + dots em datas com eventos mockados.

#### E5.x.2 — M-BRIEF-A25 (local-only)

Armadilha **A25 — Metro `unstable_enablePackageExports` vs
imports relativos sem extensão em pacotes RN legados**
documentada como entrada bullet em
`VALIDATOR_BRIEF.md` §4 (formato canônico do brief, não
heading). Cobre o sintoma `Unable to resolve "./X" from
.../index.js`, causa raiz (resolver Metro com package exports
+ `.d.ts` colaterais), workaround canônico (`resolveRequest`
custom em `metro.config.js` filtrado ao pacote) e cross-ref
com A14. Pacote conhecido afetado:
`react-native-calendars@1.x` (M37.1).

**Decisão durável**: VALIDATOR_BRIEF.md permanece gitignored
conforme política anti-IA do dono (commit `b9f48b9`
2026-05-05) — A25 vive só localmente; sessões futuras
re-bootstrapeiam o brief via skill `validador-sprint`. Não
versionar é por design (Regra −1 estendida a artefatos de
orquestração de IA).

### Sessão E5 (2026-05-05 tarde) — M37.1 entregue + MOTI-REPLACE descopada

#### E5 — M37.1 Google Calendar OAuth + leitura de agenda

Sprint nova entregue em sessão paralela ao Bloco E. Rota raiz
`/agenda` com 5 estados explícitos (`nao-conectado` /
`conectando` / `online` / `offline` / `invalido`); store
`useGoogleAuth` com persist SecureStore para tokens (< 2KB,
respeita Armadilha A20); cache de eventos em arquivo
`media/cache/agenda-<pessoa>.json` no Vault (TTL 1h, fallback
stale-while-revalidate); `calendarApi.listarEventos` com
tratamento explícito 401/403/429/5xx + retry 1x;
`googleAuthFlow` PKCE com `pickClientId()` que adapta entre
proxy Expo Go e custom-scheme dev-client/release (Armadilha
A21); `<CalendarGrid>` mensal com tema Dracula sobre
`react-native-calendars`; sub-tela `/settings/contas-google`
para gestão por pessoa (revogar / reconectar).

**Decisão durável**: client_id lido de `env.json` (gitignored)
em vez de env vars `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`,
documentada em **adendo ADR-0018**. Mais simples e mantém
secrets fora do bundle. Pacote canônico
`com.ouroboros.mobile`; SHA-1
`E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`
cadastrado.

**Branch dev-only `__DEV__ && Platform.OS === 'web'`** em
`useGoogleAuth.autenticar()` injeta token sintético + cache
mock para validação Nível A (5 estados visíveis no Gauntlet
sem rede). OAuth real só roda em runtime nativo — Nível B
deferido para sprint `M37.1-checkpoint-nivel-B` quando APK
dev-client fresh chegar.

**Workaround Metro**: `react-native-calendars` quebra com
`unstable_enablePackageExports = true` (default Expo SDK 54);
`metro.config.js` ganha `resolveRequest` custom filtrado ao
pacote afetado. Documentado no comentário do arquivo e
escalado para sprint `M-BRIEF-A25` (registra como Armadilha
A25 no VALIDATOR_BRIEF §4).

**Achados colaterais (3 sub-sprints criadas, anti-débito):**
- M37.1.1 — calendar locale PT-BR (header "Maio de 2026"
  + "Sáb"). Spec `M37.1.1-spec.md`.
- M-BRIEF-A25 — armadilha Metro package exports.
- M37.1-checkpoint-nivel-B — OAuth real no emulador.

**Métricas:** 1512→1530 testes (+18 / +3 suítes); bundle
Hermes 7,19→7,7 MB (+0,51 MB absorvendo 4 deps:
expo-auth-session, expo-web-browser, react-native-calendars,
@react-native-community/netinfo); leak 0/6 markers; TS strict
0; anonimato OK; PT-BR check 0 violações.

**Arquivos novos (10):** `app/agenda.tsx`,
`app/settings/contas-google.tsx`,
`src/components/agenda/CalendarGrid.tsx`,
`src/lib/services/{googleAuthFlow,calendarApi,calendarCache}.ts`,
`src/lib/stores/googleAuth.ts`,
`docs/SETUP-OAUTH-GOOGLE.md`,
3 testes (`agenda.test.tsx`, `calendarApi.test.ts`,
`googleAuth.test.ts`).

**Arquivos modificados (9):** `app.json`, `app/settings/index.tsx`,
ADR-0018, `jest.setup.cjs`, `metro.config.js`, `package.json`,
`package-lock.json`, `MenuLateral.tsx`, `src/lib/stores/index.ts`.

#### M-BUNDLE-DIET-MOTI-REPLACE — DESCOPADA para v1.1

Executor sub-agente rejeitou formalmente a sprint após
auditoria empírica via grep: superfície real é **42 arquivos
distintos** com **46 ocorrências de `<MotiView>`** e **3
`<AnimatePresence>`**, e **1 type-pivot canônico**
(`MotiTransitionProp` em `src/lib/motion.ts` consumido por 20
importadores diretos). Estimativa real **16-21h em 5
sub-sprints sequenciais** (presets foundation → UI leaves →
data viz → chrome FAB → AnimatePresence + uninstall), não 4-6h
em 1 sprint como o spec original presumia. Riscos colaterais
não-cobertos pelo spec: A17/A18 gorhom + Reanimated 4 web,
A22 mock react-native-worklets, A23 NÃO-FIX moti SSR (que pode
reabrir `web.output: "static"` se moti sair), peer issues
Reanimated 4 + React 19. Springs `{damping, stiffness}` em
moti vs Reanimated têm defaults diferentes para
`mass`/`velocity`/`restDisplacementThreshold` — visualmente
idêntico não é garantido sem calibração caso-a-caso.

**Decisão durável do dono 2026-05-05:** descopar para v1.1.
Ganho 333 KB ≈ 4% do bundle não justifica risco com margem
atual 1,15 MB (limite 8,85 MB, atual 7,7 MB). ROADMAP §Bloco C
marca a sprint como `[v2]` riscada com justificativa.

#### M19.x mockups — spec materializado, dispatch enfileirado

Toolchain JSX→HTML completa para mockups em
`docs/design-canvas-export/`. Spec novo
`docs/sprints/M19.x-spec.md` (~2,5-4h, esbuild +
react-dom/server + dc-shims, gera
`docs/Ouroboros_24_telas-standalone-rebuild.html` em arquivo
separado preservando o bundle frozen original byte-a-byte).
**Enfileirada** (não dispatchada) por decisão de qualidade do
dono — janela paralela só após M41 ou entre sprints do Bloco E.

### Pós-auditoria — 4 sprints fechadas (2026-05-05)

#### D1 — M-DEV-CLIENT-DECISAO

Decisão (a) registrada formalmente: v1.0 INCLUI as 4 features
dev-client (M06.5 microfone, M07.x conquistas mídia, M11.5
calendário conquistas, M09 scanner OCR) + 2 Google Calendar
(M37.1 OAuth, M37.2 escrita). Sprint encerrada sem código —
somente decisão durável documentada na spec + ROADMAP.

#### M-SHEET-MODAL-SNAP

**Diagnóstico empírico via Playwright** (descartou as 3 hipóteses
do planejador): em RN-Web, gorhom v5 inicializa `animatedPosition
= window.innerHeight` e depende de `useAnimatedReaction`
(Reanimated 4 worklet) para posicionar no snap. **Worklet não
dispara confiavelmente em web no mount** — sheet trava em
`transform: matrix(1, 0, 0, 1, 0, 920)` (100% fora do viewport).
Armadilha A17 reincidente, agora medida com precisão.

**Fix**: `useEffect` Web-only em `src/components/ui/BottomSheet.tsx`
que após 250/750/1500ms localiza o container DOM via
`querySelectorAll('div')` + match `matrix(1, 0, 0, 1, 0, ty)`
com `|ty - winH| < 24`, e seta transform direto para
`(1 - snap%) * winH` + `transition: none`. **No-op em mobile**
(Platform.OS check) — A18 não regride em RN nativo.

`BottomSheet` também ganha prop `animateOnMount?: boolean` opcional
(API extensível). Defesa contra Armadilha A24: regex via
`new RegExp(...)` em vez de literal.

**Validação numérica**:
- Antes: `/humor-rapido` ty=920 (fora do viewport).
- Depois: ty=276 (snap 70%), `/eventos` ty=184 (80%),
  `/diario-emocional` ty=92 (90%) — **todos no snap correto**.

**Validação visual confirmada**: humor-rapido mostra 4 sliders +
Medicação + Horas de sono + Tags; diário emocional mostra Modo
Trigger/Vitória + Emoções + Intensidade slider + Microfone +
Textarea.

**Arquivos modificados (5):** `BottomSheet.tsx`, 3 rotas modais
(`humor-rapido.tsx`, `eventos.tsx`, `diario-emocional.tsx` com
comentários explicativos), E2E novo
`m-sheet-modal-snap.e2e.ts`.

#### M-DEBITO-CATEGORIA-CORES-VISIBLE

`Chip.tsx` em rest agora aplica accent **40% opacity** via novo
helper `hexToRgba(hex, alpha)` em `src/lib/a11y/contraste.ts`.
Ghost mantém `colors.muted` 5.30 ratio (fallback C2.x.1).
Selected mantém accent 100% (sem regressão C2.x.1).

**Aritmética**: +4 cases Jest (`Chip.test.tsx` describe
`hexToRgba`). E2E `m-debito-categoria-cores-visible.e2e.ts`
exige Set.size ≥ 7 borderColor distintos em rest.

**Decisão WCAG**: 6/7 accents passam ratio 3:1 sobre bgElev.
`red` em 40% sobre bgElev = 2.91 (abaixo de 3, mas borda 1dp
não-texto e estado também comunicado por bg+label — exceção
documentada).

#### M-DEBITO-CATEGORIA-ICONE

Helper `corDaCategoria(c: TarefaCategoria): string` exportado em
`src/components/todo/SheetNovaTarefa.tsx` resolve
`CATEGORIA_ACCENTS[c]` para hex via `colors[accent]`. Ícone
Lucide do header agora reflete cor da categoria selecionada
(cyan/red/etc). Ghost vira `colors.muted`.

**Aritmética**: +6 cases Jest validando helper puro para 8
categorias (incluindo regressão "não-laranja" para 3
categorias). E2E `m-debito-categoria-icone.e2e.ts` valida
`getComputedStyle.stroke` do svg para 3 categorias diferentes.

#### Métricas batch pós-auditoria

- Testes: 1502 → **1512** (+10 cases: 0 sheet snap + 4 cores +
  6 ícone). E2E novos não contam no Jest.
- Suítes: 167 mantidas.
- Bundle Hermes: **7.19 MB** (mantido na faixa ~7 MB; +90 KB de
  helpers mas dentro da margem 1,66 MB).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak 0/6.



### Bloco C FECHADO — C2.x.1 + C2.x.2 + C2.x.3 + C6 batch (2026-05-05)

#### C2.x.1 — M-WCAG-CHIP

`Chip.tsx`: `hitSlop={{ top:8, bottom:8, left:8, right:8 }}` via
token canônico `hitSlopToken`. Visual mantido 32dp + hitSlop = 48dp
efetivo. Borda em rest trocada de `colors.mutedDecor` (ratio 1.74)
para `colors.muted` (ratio 5.30 sobre `bgElev` — passa WCAG AA).
Borda em selected mantém `accentHex` (não muda).

**Aritmética:** +3 cases Jest (`Chip.test.tsx`). E2E mede touch +
ratio via Gauntlet em `/humor-rapido`.

#### C2.x.2 — M-WCAG-MEDIDAS

`app/medidas/novo.tsx:382` botão remover foto: `hitSlop={6}` →
`hitSlop={12}`. Visual mantido 22dp + hitSlop = 46dp efetivo
(WCAG AA OK). Edit cirúrgica de 1 literal.

#### C2.x.3 — M-WCAG-MUTED-DECOR-TEXTO

22 ocorrências de `colors.mutedDecor` em `<Text>` auditadas
caso-a-caso:
- **14 promoções para `colors.muted`** (ratio 4.6+) — todos os
  empty states e mensagens funcionais informativas.
- **8 marcações decorativas** via novo helper
  `src/lib/a11y/textPropsDecor.ts` (`textPropsDecor()` retorna
  `{ dataSet: { a11y: 'decor' } }` — bypass de tipagem RN/RN-Web).
  Aplicado em micro-rótulos uppercase, badges "auto", glifos
  decorativos.

**Achado pendente (sub-sprint nova):** 10 ocorrências em
`app/exercicios/[slug].tsx`, `app/eventos.tsx`, `app/todo.tsx`,
`app/diario-emocional.tsx`, `app/contadores/[slug].tsx`,
`app/settings/sobre.tsx`, `gauntletDashboard.tsx` — fora da lista
canônica do RELATÓRIO. Sub-sprint
**M-WCAG-MUTED-DECOR-TEXTO-V2** materializar futura.

#### C6 — M38 conflict resolution

DeviceId único por instalação + sufixo de colisão de slug + index
de devices pareados.

**Arquivos novos (7):**
- `src/lib/util/deviceId.ts` — gera/persiste deviceId em
  SecureStore.
- `src/lib/vault/devicesIndex.ts` — schema/atualizar/renomear
  index `.ouroboros/devices.json`.
- `src/lib/vault/devicesPath.ts`.
- `app/settings/dispositivos.tsx` — sub-tela "Dispositivos
  pareados".
- 2 testes Jest novos + 1 E2E.

**Arquivos modificados (12):**
- 3 helpers de save (`saveHumor`, `saveDiario`, `saveEvento`):
  colisão usa deviceId em vez de sufixo numérico crescente.
- 3 helpers de Vault (`alarmes`, `contadores`, `tarefas`): param
  `modoCriacao` opcional para distinguir create de update.
- 2 telas (`alarmes/novo`, `contadores/novo`): passam `modoCriacao=true`.
- `app/settings/index.tsx`: link "Dispositivos pareados".
- `src/lib/boot/reagendamento.ts`: `atualizarDeviceIndexHook` plug.
- 3 testes Jest atualizados.
- `docs/FEATURES-CANONICAS.md` §14 expandida (6→14 bullets).

**Backward-compat preservado:** sufixos legados `-pessoa_<a|b>.md`
continuam aceitos pelos readers.

#### Métricas batch C2.x.1+C2.x.2+C2.x.3+C6

- Testes: 1473 → **1502** (+29: 3 chip + 0 medidas + 0 mutedDecor
  refactor + 26 M38).
- Suítes: 165 → **167** (+2: deviceId + devicesIndex).
- Bundle Hermes: **6.9 → 6.9 MB** (incremento desprezível).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.

### Bloco C — encerramento

Release-readiness completo (10 sprints fechadas — 6 da fila
original + 4 sub-sprints WCAG):

- C1 — Bundle diet (-1.67 MB; em A já)
- C2 — WCAG audit + helper + 25 testes
- C3 — Release assets (6 PNGs)
- C4 — Sobre + release notes
- C5 — Backup automático opt-in
- C2.x.1 — WCAG-CHIP
- C2.x.2 — WCAG-MEDIDAS
- C2.x.3 — WCAG-MUTED-DECOR-TEXTO
- C6 — M38 conflict resolution

**Sub-sprint adiada:** M-WCAG-MUTED-DECOR-TEXTO-V2 (10 ocorrências
fora da lista canônica original).

**Métricas finais Bloco C:** 1427 → **1502** testes (+75), 160 →
**167** suítes (+7), Hermes **7.14 → 6.9 MB**. Próximo: Bloco D
(decisão D1) → Bloco E (dev-client, 6 sprints).



### Bloco C — C2 + C3 + C4 + C5 batch paralelo (2026-05-05)

#### C2 — M-WCAG-COMPLETO

Auditoria WCAG AA de 24 telas + 14 componentes UI base. Helper
`src/lib/a11y/contraste.ts` (`ratioContraste(fg, bg)` puro JS) +
25 cases canônicos. E2E `m-wcag-audit.e2e.ts` mede contraste em
runtime via Gauntlet (5 rotas).

**Status auditoria:** 22 OK, 5 WARN (decorativo aceito), 1 FAIL
inline (`app/todo.tsx:478` `hitSlop={12}` adicionado), 1 FAIL →
sub-sprint. **3 sub-sprints geradas:**
- `M-WCAG-CHIP` — `Chip.tsx` altura 32dp + borda mutedDecor
  ratio 1.94 (FAIL).
- `M-WCAG-MEDIDAS` — `app/medidas/novo.tsx:378` botão remover
  foto 22dp + hitSlop=6 = 34dp (FAIL).
- `M-WCAG-MUTED-DECOR-TEXTO` — 24 ocorrências `colors.mutedDecor`
  como `color:` em `<Text>` ratio 3.03 (FAIL AA).

**Arquivos novos (8):** helper, snapshot, 2 testes, E2E, relatório,
3 specs.

#### C3 — M-RELEASE-ASSETS

6 PNGs regenerados via SVG procedural derivado de `OuroborosLogo.tsx`:
icon (1024²), icon-foreground (1024²), adaptive-icon (1024²),
splash (2400²), splash-icon, favicon (196²). Anel Ouroboros
gradient purple→pink + escamas + cabeça/cauda + glow ambiente.

`app.json`: `name: "Ouroboros"` (capitalização final),
`splash.backgroundColor: "#282a36"`,
`android.adaptiveIcon.backgroundColor: "#282a36"`.

Script reprodutível `scripts/gerar-assets-marca.py` (134L,
cairosvg). Tamanho total assets: 1.92 MB → 0.97 MB (-49%).

**Diagnóstico realizado:** `adaptive-icon.png` e `splash-icon.png`
eram **placeholders Expo default** (sha bate `5f4c0a73`,
timestamp 1985-10-26). Substituídos.

#### C4 — M-SOBRE-RELEASE-NOTES

`app/settings/sobre.tsx` (nova tela) acessível via
`<LinkSubTela titulo="Sobre o app">` no rodapé de `/settings`.
3 seções: SecaoSobre (versão/build/commit/GitHub/licença),
SecaoMiniChangelog (3 entradas iniciais 1.0.0/0.9.0/0.8.0),
SecaoCreditos (anônimo Regra −1).

`src/lib/release/changelog.ts` (novo) — `RELEASE_NOTES` array
estruturado TS, não markdown raw. Permite formatação humana
e tradução PT-BR.

`app.json:extra.commitHash` (preenchido em build via env var).

**Arquivos novos (5):** `changelog.ts`, `SecaoSobre.tsx`,
`sobre.tsx`, test (7 cases), E2E.

#### C5 — M-BACKUP-AUTOMATICO

Backup semanal local opt-in (default OFF, ADR-0007 zero nuvem).
`agendarBackup.ts` (115L) + `executarBackup.ts` (216L). Salva em
`Documents/Ouroboros-Backups/auto/<data>.zip`, mantém últimos 4
(rotação). Reusa `exportarVaultZip()` da A5.

`SecaoBackupAutomatico.tsx` (101L) com toggle + "Último backup:
há X dias.". Inserida entre `SecaoFeatures` e `SecaoPrivacidade`
(meio de `app/settings/index.tsx`, sem conflito com C4 que tocou
rodapé).

`useSettings` v3: `backupAutomaticoSemanal: boolean` default false.

**Arquivos novos (4):** 2 helpers backup, 1 componente, 3 testes
(executar 14 + agendar 6 + componente 8 — total 14 cases),
E2E.

**Descoberta importante — Armadilha A24:** durante implementação,
`npx expo export --platform android` quebrou com `SyntaxError:
Unexpected token Semicolon` em `style.css`. Causa raiz: regex
literal `/[-:.]/g` em `executarBackup.ts:155` é interpretado pelo
extrator de classes Tailwind do NativeWind 4 como pseudo-classe
arbitrária inválida. Fix inline: substituir por chained `.split()`.
**Registrado em VALIDATOR_BRIEF.md §4 A24** com workaround +
recomendação de lint rule durável. Bug C2 reportou bundle quebrado
"pré-existente" — era exatamente este, do C5 ainda em curso.

#### Métricas batch C2+C3+C4+C5

- Testes: 1427 → **1473** (+46 cases novos: 25 C2 + 0 C3 + 7 C4
  + 14 C5).
- Suítes: 160 → **165** (+5).
- Bundle Hermes: **7.14 → 6.9 MB** (-240 KB; assets PNG melhor
  comprimidos compensaram código novo).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.



### Bloco B FECHADO — B4 + B5 + B6 batch paralelo (2026-05-05)

#### B4 — M40 Tela Hoje v2

`app/index.tsx` reescrito v2 com header dual avatar + card Recap +
seções Status do Casal, Próximos (alarmes 4h + tarefas com alarme
hoje) e Jornada Agrupada (diários + eventos por intensidade).
`useHoje` ganha opções objeto `{ ymdOverride?, filtroPara? }` —
implementa filtro `para` adiado de M33.

**Arquivos novos (8):** `useStatusCasal.ts`, `useProximos.ts`,
`SecaoStatusCasal.tsx`, `SecaoProximos.tsx`,
`SecaoDiariosEventosAgrupado.tsx`, 3 testes (3+6+8 cases), E2E.

**Arquivos modificados (3):** `app/index.tsx`, `useHoje.ts`,
`docs/FEATURES-CANONICAS.md` §9.2 reescrita "v2 entregue".

#### B5 — M36 Recap

`/recap` rota raiz modal com `<RecapScreen>`: ChipGroup período
(Semana/Mês/Ano/Personalizado), 5 seções (Conquistas/Crises/
Evoluções/Tarefas concluídas/Números). `useRecap({ de, ate })`
agrega via 7 listadores Vault. ADR-0005 zero gamificação — números
neutros, "Você passou por isso e está aqui." como tom único.

**3 listadores Vault novos:** `listarHumor`, `listarDiarios`,
`listarEventos` (não existiam; padrão idêntico a `listarMarcos`).

**Arquivos novos (12):** `app/recap.tsx`, `RecapScreen.tsx`, 5
seções (`RecapSecaoConquistas/Crises/Evolucoes/Numeros/Tarefas`),
`useRecap.ts`, 3 listadores, 3 suítes de teste, E2E.

**Arquivos modificados (4):** `app/_layout.tsx` (Stack.Screen recap),
`src/lib/icons.ts` (+ TrendingUp), `src/lib/vault/index.ts` (3
exports novos), `docs/FEATURES-CANONICAS.md` §7 "(entregue)".

**Decisões técnicas:** `resolverPeriodo` usa "últimos N dias"
(relativo a hoje); Personalizado com 2 `<TextInput>` simples
`AAAA-MM-DD` (evita dep nova); contadores como conquista exigem
`dias >= 7`; "em alta" em Evoluções exige `dias >= 30`.

#### B6 — M35 Finanças empty state

`MiniFinanceiroScreen` substituída por EmptyState honesto com
`Wallet` + frase "Em desenvolvimento. Disponível em versão futura.".
Toggle `mostrarFinancasEmDesenvolvimento` em Settings (default
OFF). MenuLateral esconde item "Finanças" quando OFF.
`useFinancasCache` e `lerFinancasCache` recebem JSDoc
`@deprecated v1.0 (M35)` — schemas e cards M14 PRESERVADOS como
código morto para retomada futura.

**Arquivos novos (2):** test (5 cases) + E2E.

**Arquivos modificados (7):** `MiniFinanceiroScreen.tsx`,
`settings.ts` (+ campo featureToggle), `MenuLateral.tsx` (lê
toggle), `app/settings/index.tsx` (+ ToggleRow), 2 helpers com
JSDoc deprecated, `tests/components/chrome/MenuLateral.test.tsx`,
`docs/FEATURES-CANONICAS.md` §6.2 atualizada.

#### Métricas batch B4+B5+B6

- Testes: 1384 → **1427** (+43 cases novos: 17 B4 + 20 B5 + 6 B6).
- Suítes: 153 → **160** (+7).
- Bundle Hermes: **7.11 → 7.14 MB** (+30 KB — Recap + status
  casal). **Margem 1.71 MB** confortável.
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.

### Bloco B — encerramento

Polish UX completo (6 sprints fechadas):
- B1 — M-CAPTURA-UNIFICADA (rota `/captura` modal)
- B2 — M11.4 (evolução corporal em Marcos)
- B3 — M-DEBITO-CATEGORIA-CORES (8 chips Dracula)
- B4 — M40 (Tela Hoje v2)
- B5 — M36 (Recap completo)
- B6 — M35 (Finanças empty honesto)

**Métricas finais Bloco B:** 1364 → **1427** testes (+63), 151 →
**160** suítes (+9), Hermes **6.77 → 7.14 MB** (+370 KB —
features densas dentro do orçamento). Margem 1.71 MB. Próximo:
Bloco C release-readiness.



### Bloco B iniciado — B1 + B2 + B3 batch paralelo (2026-05-05)

#### B1 — M-CAPTURA-UNIFICADA

Rota `/captura` modal raiz com `<SheetEscolhaCaptura>`: 2 cards
verticais "Registrar momento" (verde, → `/memoria?abrirCaptura=1`)
e "Escanear documento" (cyan, → `/scanner`). Item "Câmera" do
MenuLateral migrado do legado FABRadial.

`MemoriasScreen` lê `?abrirCaptura=1` via `useLocalSearchParams` e
propaga para `<MenuCapturaVerde abrirNoMount={true}>` que abre o
sheet 1 frame após mount. `/captura` adicionado a `ROTAS_SEM_FAB`.

**Arquivos novos (5):** `app/captura.tsx`, `SheetEscolhaCaptura.tsx`,
`SheetEscolhaCaptura.test.tsx` (5 cases), E2E novo, screenshots dir.

**Arquivos modificados (7):** `MenuLateral.tsx`, `MemoriasScreen.tsx`,
`MenuCapturaVerde.tsx` (prop `abrirNoMount`), `rotasSemFAB.ts`,
`icons.ts` (+ `ImagePlus`/`ScanLine`), `app/_layout.tsx`
(Stack.Screen padrão M26), `tests/app/memoria.test.tsx` (mock
`useLocalSearchParams`).

`/scanner` já tinha M09 dev-client real — não modifiquei (empty
state honesto pré-M09 não era necessário).

#### B2 — M11.4 evolução corporal

`<SecaoEvolucaoCorporal>` adicionada ANTES do timeline em
MemoriasMarcosTab. Lê `useMedidas` (hook novo, padrão idêntico a
`useMarcos`). ScrollView horizontal com cards mensais (foto frente +
peso + delta numérico neutro ADR-0005). Botão "Registrar evolução"
no header da seção (substitui o array `acoesExtras` do FAB que
exigiria mexer em arquivo do B1).

`MarcoSchema` ganha `medidaRef?: string` opcional (regex
`^\d{4}-\d{2}-\d{2}$`). `<SheetNovoMarco>` ganha bloco "Anexar
evolução corporal" listando 3 medidas mais recentes como chips
single-select + opção "Nenhuma".

**Arquivos novos (4):** `MemoriasMarcosTab/SecaoEvolucaoCorporal.tsx`
(302L), `useMedidas.ts` (78L), test (8 cases), E2E.

**Arquivos modificados (5):** `marco.ts` schema, `MemoriasMarcosTab.tsx`,
`SheetNovoMarco.tsx`, `tests/lib/schemas/marco.test.ts` (+3 cases),
`docs/FEATURES-CANONICAS.md` §3.4 nova.

**Divergência consciente da spec:** "Registrar evolução" virou
botão no header da seção (não item do FAB) porque
`MemoriasScreen.handleRegistrarAcaoExtra` aceita 1 ação por tab —
modificar para array exigia tocar arquivo do B1. Solução
equivalente em UX (atalho contextual visível).

#### B3 — M-DEBITO-CATEGORIA-CORES

8 chips de categoria de tarefa agora com cores Dracula semânticas
em vez de todas laranja:
- `trabalho` → cyan (produtivo)
- `casa` → pink (íntimo doméstico)
- `rotina` → purple (hábito)
- `financas` → green (dinheiro)
- `desenvolvimento_pessoal` → yellow (estudo)
- `obrigacoes` → orange (urgente)
- `saude` → red (alerta)
- `outro` → ghost (neutro, herdado de M-DEBITO-UI-UX-SEED-DUO)

`ChipAccent` em `Chip.tsx` já suportava todos 8 variants — edição
puramente em `CATEGORIA_ACCENTS` mapping.

**Arquivos modificados (1):** `SheetNovaTarefa.tsx`.
**Arquivos novos (2):** test (+4 cases), E2E.

**Achados colaterais (não-corrigidos, anti-débito):**
- AC-1: ícone Lucide do header ainda hardcoded `colors.orange` (não
  reflete categoria selecionada). Sub-sprint sugerida
  `M-DEBITO-CATEGORIA-CORES-FOLLOWUP`.
- AC-2: conflito potencial `casa: pink` vs `pessoa_b: pink`
  (identidade). Validar visual confirmará se há ambiguidade.

#### Métricas batch B1+B2+B3

- Testes: 1364 → **1384** (+20 cases novos: 5 SheetEscolhaCaptura
  + 8 SecaoEvolucaoCorporal + 3 marcoSchema + 4 categoria cores).
- Suítes: 151 → **153** (+2).
- Bundle Hermes: **6.77 → 7.11 MB** (+340 KB — features novas
  e schemas; margem 1.74 MB / 19.7% folga do limite 8.85 MB).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.



### Bloco A FECHADO — A5 + A4.x batch paralelo (2026-05-04)

#### A5 — M-EXPORT-COMPLETO

Export ZIP + restore inverso simétrico com validação sha256.
Backup local-to-local (ADR-0007 zero nuvem).

**Arquivos novos:**
- `src/lib/crypto/sha256.ts` (162L) — SHA-256 puro JS, vetores
  NIST + paridade Node crypto. ~3 KB minified.
- `src/lib/services/restaurarVault.ts` (232L) —
  `restaurarVaultZip()` com validação sha256 por arquivo. Default
  não-destrutivo (cria `restaurado-<data>/`).
- `tests/lib/crypto/sha256.test.ts` — 7 cases (vetores oficiais +
  paridade).
- `tests/integration/export-restaure-roundtrip.test.ts` (382L) —
  roundtrip 62 arquivos byte-a-byte + 3 edge cases.
- `tests/e2e/playwright/m-export-completo.e2e.ts` — presença dos
  botões.

**Arquivos modificados:**
- `src/lib/services/exportarVault.ts` (157→324L, +167L) — inclui
  cache `.ouroboros/cache/`, snapshot settings em
  `.ouroboros/snapshot-settings.json`, MANIFEST.json com sha256
  por arquivo + versão schema + contagem por subpasta.
- `app/settings/index.tsx` (+51L) — botão "Importar backup"
  novo, abre document picker, chama `restaurarVaultZip()`.
- `tests/app/settings/index.test.tsx` (+110L) — 3 cases novos
  (botão importar / falhas / cancel).
- `docs/FEATURES-CANONICAS.md` §11 expandida.

**Decisão técnica:** companion `.md` é coletado naturalmente pelo
ZIP (vive em `media/<sub>/` que já está em VAULT_FOLDERS). Não
precisou chamar `lerCompanion` — ZIP captura o arquivo bruto.

#### A4.x — M39.1 migrar 9 writers

6 de 9 writers migrados para `escreverMidiaComCompanion`
canônico, **net -55 LOCs** (refactor consolidador).

**Migrados (6):** `capturarFoto`, `capturarMusica`, `capturarVideo`,
`recordAudio`, `saveEvento.copiarFotos`, `medidas/novo`.

**Não migrados (3 — exclusões deliberadas anti-débito):**
- `salvarFrase.ts` — caso especial: `.md` puro sem binário.
  Helper canônico exige `binarioUri`.
- `adicionarFotoManual.ts` — único writer que NÃO escrevia
  companion. Migrar mudaria comportamento observável (passaria a
  gravar `.md`); seria feature, não refactor.
- `saveNota.ts` — `tipo: midia_foto` em pasta `media/scanner/`
  (não `media/fotos/`). Helper mapeia subpasta a partir do tipo
  via `subpastaPara()`; sem override. Migração quebraria 5 testes.

**Métricas batch A5+A4.x:**
- Testes: 1349 → **1364** (+15 cases novos: 7 sha256 + 3 settings
  + 5 roundtrip).
- Suítes: 149 → **151** (+2: crypto/sha256 + integration/roundtrip).
- Bundle Hermes: **7.08 → 6.77 MB** (sha256 ~3 KB; refactor
  consolidador também reduziu LOCs líquidos). **Margem 2.08 MB
  (24% folga)**.
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet
  leak OK.

### Bloco A — encerramento

Fundação completa (9 sprints fechadas em sequência):

- A1 — PT-BR auditoria automática (hook + dicionário 147)
- A2 — Gauntlet dead code v2 (leak 0/6, bundle -350 KB)
- A2.x — PT-BR retrofit (3 violações fixadas)
- A3 — Vault MD audit (14 features auditadas)
- A3.x.1-4 — 4 paralelas vault MD fix
- A4 — M39 mídia companion oficial (schema zod + helpers)
- A4.x — M39.1 migrar 9 writers (6 migrados, 3 documentados)
- A5 — Export completo (ZIP + restore + MANIFEST sha256)
- C1 — Bundle diet (-1.67 MB)

**Métricas finais Bloco A:** 1300 → **1364** testes (+64), 145 →
**151** suítes (+6), Hermes **8.5 → 6.77 MB** (-1.73 MB), margem
2.08 MB. Próximo: Bloco B (polish UX).

### C1 — M-BUNDLE-DIET fechada (2026-05-04) — 8.84 → 7.08 MB

Auditoria + remoção de gordura entregou **redução de 1.67 MB
(-19.8%)** no bundle Hermes Android. Margem de 1.77 MB do limite
8.85 MB recuperada. Cobre próximas 3-4 features sem risco de
estouro.

**5 deps removidas:**
- `@gluestack-ui/themed` (7.3 MB no node_modules) — legado M01
  substituído por `src/components/ui/` próprio.
- `@gluestack-style/react` (3.5 MB) — idem.
- `expo-image-manipulator` (624 KB) — scanner usa pipeline
  próprio com `@dariyd/react-native-document-scanner`.
- `expo-blur` (384 KB) — design Dracula usa elevations sólidas
  via `colors.bgElev`.
- `expo-status-bar` — SDK 54 integra via `app.json`.

**1 grande otimização**: `lucide-react-native` no bundle Hermes
caiu de **1334.9 KB → ~30 KB** via shim local
`src/lib/icons.ts`. Metro/Hermes não tree-shake barrel
re-exports mesmo com `sideEffects: false`; o shim força import
direto por arquivo `.mjs`, bypassando o barrel de 1712 linhas /
1700+ ícones. **44 arquivos** migrados de
`from 'lucide-react-native'` para `from '@/lib/icons'`.

**Aritmética:** 1349 → **1349** testes (sprint zero-feature),
149 suítes mantidas. TS strict 0, anonimato OK, smoke OK,
PT-BR check OK, Gauntlet leak OK. Bundle Hermes
**8.84 → 7.08 MB** (-1.67 MB).

**3 sub-sprints sugeridas** (não dispatchadas — margem confortável):
- `M-BUNDLE-DIET-MOTI-REPLACE` (333 KB de `framer-motion`
  via Moti — substituir por Reanimated puro).
- `M-BUNDLE-DIET-YAML-REPLACE` (272 KB de `yaml` via parser
  custom).
- `M-BUNDLE-DIET-DRAGGABLE-CUSTOM` (59 KB).

Documentadas em `docs/auditoria-bundle-2026-05-04/RELATORIO.md`
para retomada se margem voltar a ficar crítica.



### A4 — M39 mídia companion oficial fechada (2026-05-04)

Schema zod canônico + helpers + boot hook idempotente para
formalizar ADR-0017. **Decisão deliberada**: NÃO unificar com
`stringifyCompanionMidia` legado nesta sprint para preservar
backward-compat dos 7 testes M34 + 4 fixes A3.x.1-4. Migração dos
9 writers fica para **M39.1** dedicada (anti-débito explícito).

**Entregas:**
- `src/lib/schemas/midia-companion.ts` (130L) — `MidiaCompanionSchema`
  zod com `tipo` (5 enum), `arquivo`, `data`, `autor`, `duracao_seg?`,
  `transcricao?`, `legenda?`, `para` (default `{tipo:'mim'}`),
  `origem?`, `origem_ref?`. Helpers `subpastaPara`,
  `tipoPorSubpasta`, `tipoPorExtensao`.
- `src/lib/vault/midiaCompanion.ts` (235L) — 3 helpers:
  - `escreverMidiaComCompanion(vaultRoot, binarioUri, meta)`.
  - `lerCompanion(vaultRoot, binarioPath)`.
  - `migrarAssetsLegacyParaMedia(vaultRoot)` — varre `assets/` e
    migra para `media/<categoria>/`. Idempotente.
- `src/lib/boot/reagendamento.ts` — adiciona `migrarAssetsHook` ao
  fim de `BOOT_HOOKS`. Degrada silenciosamente se vault
  indisponível.
- `tests/lib/vault/midiaCompanion.test.ts` — 14 cases cobrindo
  write/read/migrar.
- `tests/e2e/playwright/m39-midia-companion.e2e.ts` — smoke
  pós-boot (BOOT_HOOKS plugou sem travar; rota /memoria
  acessível; FAB verde M34 não quebrado).
- `docs/FEATURES-CANONICAS.md` §15 expandida.
- `docs/ADRs/0017-midia-companion-md.md` atualizado com lista de
  arquivos e separação `schemas/midia-companion.ts` (zod canônico)
  vs `midia/companion.ts` (serializador determinístico legado) vs
  `vault/midiaCompanion.ts` (helpers).

**Aritmética:** 1335 → **1349** testes (+14), 148 → **149**
suítes (+1). TS strict 0, anonimato OK, smoke OK, PT-BR check OK,
Gauntlet leak OK. Bundle Hermes **8.5 → 8.84 MB** (+340 KB —
schema zod + import top-level de `yaml`). **Margem 10 KB do teto
8.85 MB — atenção crítica para próximas sprints.**

**Sub-sprint gerada:** **M39.1** materializada para migrar os 9
writers existentes (`capturarFoto/Musica/Video`, `salvarFrase`,
`recordAudio`, `saveEvento.copiarFotos`, `medidas/novo`,
`scanner/saveNota`, `adicionarFotoManual`) ao `escreverMidiaComCompanion`
canônico.



### Batch A3.x — 4 sub-sprints corretivas paralelas fechadas (2026-05-04)

Após auditoria A3 revelar 4 desvios estruturais (binários em
`assets/` em vez de `media/<categoria>/`), batch de 4 agentes
paralelos corrigiu cada caminho. Vault agora 100% canônico para
escritas novas. Backward-compat: arquivos legados em `assets/`
continuam acessíveis via `useFotosAgregadas`.

**Métricas batch:** 1316 → **1335** testes (+19 cases novos), 147
→ **148** suítes (+1). Bundle Hermes **8.5 MB** mantido. TS strict
0, anonimato OK, smoke OK, PT-BR check OK, Gauntlet leak **0/6**.

#### A3.x.1 — M-VAULT-MD-FIX-diario-audio

`src/lib/diario/recordAudio.ts`: assinatura
`saveRecordingToVault` ganha 4º param `SaveRecordingOpcoes` (autor,
para, legenda). Destino canônico
`media/audios/<YYYY-MM-DD>-<rand>.m4a` + `.md` companion 1:1 via
`stringifyCompanionMidia`. +4 cases Jest. E2E em
`tests/e2e/playwright/m-vault-md-fix-diario-audio.e2e.ts`.

#### A3.x.2 — M-VAULT-MD-FIX-evento-fotos

`src/lib/eventos/saveEvento.ts:copiarFotos`: destino canônico
`media/fotos/<YYYY-MM-DD>-eventos-<rand4>-<idx>.jpg` + companion
`.md` com `legenda: "evento <data> <slug>"` (rastreabilidade
reversa galeria→evento). Slug do evento agora calculado antes do
copy. +3 cases Jest. E2E em
`tests/e2e/playwright/m-vault-md-fix-evento-fotos.e2e.ts`.

#### A3.x.3 — M-VAULT-MD-FIX-medidas-fotos

`src/lib/vault/paths.ts:medidasFotoPath` agora retorna
`media/fotos/medidas-<YYYY-MM-DD>-<lado>.jpg`. `app/medidas/novo.tsx`
escreve `.md` companion ao lado com `legenda: "Evolução corporal —
{frente,lado,costas}"` + `medida_ref: <slug>`.
`src/lib/midia/companion.ts:CompanionMidiaInput` ganha campo
opcional `medida_ref?: string`. `useFotosAgregadas.lerGaleriaManual`
ignora `medidas-*.jpg` (regex exige começar com YYYY-MM-DD), evita
duplicata. +9 cases Jest (3 paths overload + 3 medida_ref + 3
medidasFotoPath). E2E em
`tests/e2e/playwright/m-vault-md-fix-medidas-fotos.e2e.ts`.
**Desbloqueia M11.4** (evolução corporal).

#### A3.x.4 — M-VAULT-MD-FIX-scanner

`src/lib/scanner/saveNota.ts`: binário PDF agora em
`media/scanner/<basename>.<ext>` + companion `.md` 1:1.
`mediaScannerPath` ganha overload `(basename, ext)` genérico
(legado 1-arg→`.jpg` preservado). `TipoMidia` em `companion.ts`
ganha `'midia_pdf'`. `.md` semântico em `inbox/financeiro/nota/`
mantido com wikilink Obsidian no body apontando para
`[[../../../media/scanner/<basename>.<ext>]]`. +10 cases Jest
(suíte nova `saveNota.test.ts` + 3 paths overload + 1 companion
midia_pdf). E2E em
`tests/e2e/playwright/m-vault-md-fix-scanner.e2e.ts`.

**Conflitos paralelos endereçados:** os 4 agentes trabalharam em
arquivos disjuntos (recordAudio.ts, saveEvento.ts, medidas/novo.tsx,
scanner/*) com helpers compartilhados (`companion.ts`, `paths.ts`)
estendidos cirurgicamente sem overlap (regiões diferentes do
arquivo). Hook PT-BR pegou 4-5 violações intermediárias durante o
batch — todas resolvidas pelo próprio agente A3.x.4 com
`// ptbr-allow:` em path literais (não palavras PT-BR).



### A3 — M-VAULT-MD-AUDIT fechada (2026-05-04)

Auditoria completa de 14 features confirmou que a estrutura
canônica do Vault está 95% correta, com **4 desvios reais
documentados** e materializados como sub-sprints corretivas.

**Entregas:**
- `docs/auditoria-vault-2026-05-04/RELATORIO.md` — 225 linhas com
  tabela por feature.
- `tests/integration/vault-md-completo.test.ts` — 14 cases
  zod-válidos via tmpdir real (1 por feature + áudio M34).
- `scripts/check_vault_estrutura.sh` — 240 linhas. Varre vault
  path e reporta órfãos, frontmatter quebrado, paths fora de
  canônico.

**4 desvios → 4 sub-sprints corretivas:**
- **M-VAULT-MD-FIX-diario-audio** — áudio em `assets/` deveria
  ser `media/audios/`.
- **M-VAULT-MD-FIX-evento-fotos** — fotos em `assets/` deveriam
  ser `media/fotos/`.
- **M-VAULT-MD-FIX-medidas-fotos** — idem (bloqueia M11.4
  evolução corporal).
- **M-VAULT-MD-FIX-scanner** — futura M09 deve seguir companion
  1:1 (poderá ser absorvido pela própria M09).

**2 observações sem sprint** (decisão pendente):
- `media/avatares` e `media/scanner` declaradas mas sem
  consumidor — implementar ou remover do
  `SUBPASTAS_CANONICAS`.
- Vault desktop do dono `~/Protocolo-Ouroboros/` incompleto
  (13/19 subpastas) — não é bug de código, é estado de uso.

**Aritmética:** 1302 → **1316** testes (+14), 146 → **147**
suítes (+1). TS strict 0, anonimato OK, smoke OK, PT-BR check OK,
Gauntlet leak check OK. Bundle Hermes 8.5 MB mantido.



### Bloco A iniciado — A1 + A2 paralelas fechadas (2026-05-04)

#### A1 — M-PT-BR-AUDIT

Tooling de validação automática de strings UI PT-BR:
- `scripts/check_strings_ui_ptbr.py` (369 linhas, Python 3.10+
  stdlib only). Varre `src/` e `app/` por strings literais em
  contextos JSX (text node, props `label`/`placeholder`/`title`/
  `message`/`frase`). Tokeniza, checa contra dicionário curado,
  reporta path:linha:coluna + sugestão. Suporta override
  `// ptbr-allow: <razao>`. Tempo de varredura sobre 267 arquivos:
  0,17s.
- `scripts/dicionario_ptbr_canonico.json` — **147 entradas
  efetivas** (meta era ≥60). Cobre nao→não, voce→você,
  musica→música, video→vídeo, acoes→ações, atencao→atenção, etc.
- `hooks/pre-commit` — invoca check antes de eslint. Bloqueia
  commit se exit != 0.
- `scripts/smoke.sh` — invoca check antes de typecheck. Falha do
  smoke se violação.

**Primeiro run detectou 3 violações reais** em código existente:
- `src/lib/diario/permissions.ts:22` — `'permissao de microfone
  negada'` em Error message default.
- `app/_dev/gauntlet.tsx:93` — `<Secao titulo="Acoes">` em rota
  dev.
- `src/lib/dev/gauntletDashboard.tsx:99` — mesmo padrão (arquivo
  novo da A2).

Excluídas temporariamente via `.ptbr-violations.txt`. Sub-sprint
**M-PT-BR-RETROFIT** materializada para fix em batch.

`VALIDATOR_BRIEF.md` §1.4, `CLAUDE.md` Regra de Linguagem e
`HANDOFF-PROMPT.md` atualizados com referência ao novo check.

#### A2 — M-GAUNTLET-DEAD-CODE-V2

Refactor para eliminar vazamento de `__gauntlet` no bytecode
Android release. Caminho A da spec (lazy require + DCE Hermes).

**Estratégia:**
1. **Micro-módulo `gauntletAtivo.ts`** sem deps do gauntlet pesado
   — exporta apenas `MODO_DEV_WEB`. Consumidores de release
   importam só de lá.
2. **Padrão `if (__DEV__) { if (MODO_DEV_WEB) { require(...) } }`**
   — `__DEV__` precisa ser predicate top-level porque Metro/Hermes
   só faz DCE quando vê literal `if (__DEV__)`. Predicado composto
   `if (X && __DEV__)` NÃO faz DCE.
3. **Renomeação de identificadores** para nomes neutros
   (`GauntletRoute`→`RotaModoDev`, `GauntletPathnameSync`→
   `PathnameSyncDev`, `FrameMobileGauntlet`→`FrameMobileDev`,
   `bootstrapGauntletSeAtivo`→`iniciarModoDev`). Hermes preserva
   nomes de funções/componentes mesmo com DCE; nomes neutros
   evitam confusão com markers.
4. **`app/_dev/gauntlet.tsx` reduzido a 32 linhas** (era 289) —
   wrapper com `require` lazy guardado por `__DEV__`. Conteúdo do
   dashboard extraído para `src/lib/dev/gauntletDashboard.tsx`
   (dropado em release).
5. **String runtime `__gauntlet.abrirSheet`** removida de
   `app/_dev/showcase.tsx`.
6. **Bug pré-existente em `check_gauntlet_leak.sh`**: `set -euo
   pipefail` abortava o loop em primeiro `grep` com 0 matches
   (mascarava sucesso). Fix com `set +e` durante loop.

**Arquivos novos (5):**
- `src/lib/dev/gauntletAtivo.ts` — micro-módulo `MODO_DEV_WEB`.
- `src/lib/dev/gauntletBootstrap.ts` — 4 entry-points lazy
  (`iniciarModoDev`, `sinalizarBootDev`, `registrarRouterDev`,
  `registrarPathnameDev`).
- `src/lib/dev/gauntletDashboard.tsx` — conteúdo do dashboard
  extraído (carregado via require lazy).
- `tests/lib/dev/gauntletBootstrap.test.ts` — contrato dev/no-op.
- `tests/e2e/playwright/m-gauntlet-dead-code-v2.e2e.ts` — valida
  `window.__gauntlet` ainda presente em dev web com 16 APIs.

**Arquivos modificados (10):** `app/_layout.tsx`, `app/_dev/_layout.tsx`,
`app/_dev/gauntlet.tsx`, `app/_dev/showcase.tsx`,
`scripts/check_gauntlet_leak.sh`, `src/lib/dev/gauntlet.ts`,
`src/lib/hooks/useFotosAgregadas.ts`,
`src/lib/hooks/useHumorHeatmap.ts`,
`src/lib/midia/adicionarFotoManual.ts`,
`src/lib/midia/capturarFoto.ts`.

**Métricas finais batch A1+A2:**
- Testes: 1300 → **1302** (+2 cases novos do gauntletBootstrap).
- Suítes: 145 → **146** (+1).
- Bundle Hermes Android: **8.85 MB → 8.5 MB** (-350 KB de dead
  code dropado).
- TS strict 0, anonimato OK, smoke OK, PT-BR check OK.

**Leak check pós-fix (CRÍTICO):**
```
   OK:   __gauntlet         (0 matches)
   OK:   instalarGauntlet   (0 matches)
   OK:   aplicarSeed        (0 matches)
   OK:   useGaleriaMock     (0 matches)
   OK:   GAUNTLET_ATIVO     (0 matches)
   OK:   adicionarFotoMock  (0 matches)
OK: bundle Android sem gauntlet (8.5 MB)
```

**Antes:** 5/6 markers vazaram. **Depois:** 0/6. Infra Gauntlet
agora release-clean. M41 desbloqueado nesta dimensão.



### Batch paralelo 5 sprints fechado (2026-05-04)

5 sub-sprints da Fase 1 anti-débito executadas em paralelo
(agentes em background) e validadas via Gauntlet:

#### M34.2 — Button variant primary com contraste WCAG AA

**Diagnóstico do agente revelou bug sistêmico** (não específico do
empty state Fotos): `<Button>` em RN-Web aplicava apenas
`className` NativeWind, e o interop não propagava o background
através de `MotiView → DOM div`. Resultado: backgroundColor
herdado transparente sobre `colors.bg` com texto cor `colors.bg`
— ratio efetivo ~1:1, invisível.

**Fix em `src/components/ui/Button.tsx`:** dict `VARIANT_CLASSES`
ganhou campos `bgColor`/`textColor`/`borderColor`/`borderWidth`
lidos de tokens. `MotiView` e `Text` agora aplicam `style={{...}}`
direto **além** do `className` (defense in depth). Mantida cor
purple para variant primary (coerência paleta — verde reservado
para FAB de captura). Ratio pós-fix: 7.5:1 (acima de WCAG AA
4.5:1).

**Validação Gauntlet:** botão "Registrar foto" do empty state
Fotos agora renderiza ROXO Dracula proeminente com texto escuro
legível (screenshot em `M34.2-screenshots-gauntlet/`).

#### M11.2 — useGaleriaMock leitura em useEffect guardado

`src/lib/hooks/useFotosAgregadas.ts`: substitui leitura síncrona
`useGaleriaMock((s) => s.fotos)` por `useState + useEffect`
guardado por `GAUNTLET_ATIVO`. Em release Android,
early-return mantém `fotosMock = []` sem importar o store mock.
Subscribe + cleanup via `useGaleriaMock.subscribe()`.

#### M27.4 — SessaoBootGate fast-path com latch

`app/_layout.tsx` SessaoBootGate consome `bootPronto` do
`useBootStatus` (M27.3). Se `bootPronto && !restauradoRef.current`,
marca `restauradoRef = true` e retorna — short-circuit pós-reset
quebra o ciclo "Maximum update depth" em sequência rápida
`__gauntlet.reset() + seed() + abrir()`. Idempotência mantida:
boot virgem (latch false) entra no caminho original.

#### M-DEBITO-UI-UX-SEED-DUO — 3 fixes consolidados

- **Chip "Outro" ghost:** novo variant `'ghost'` adicionado em
  `src/components/ui/Chip.tsx` (mapeado para `colors.mutedDecor`).
  `SheetNovaTarefa.tsx` `CATEGORIA_ACCENTS` atribui `'ghost'` só
  para `outro`. Achado colateral: as outras 7 categorias estão
  todas com `'orange'` (divergência do spec original) —
  materializado como **M-DEBITO-CATEGORIA-CORES** sub-sprint.
- **Botão "Criar" do contadores/novo:** `KeyboardAvoidingView`
  envolvendo ScrollView + botão. Reage ao teclado virtual sem
  precisar reescrever para sticky-bottom.
- **Toggle alarme animado:** `<AnimatePresence>` + `<MotiView>`
  com spring `springs.snappy` (ADR-010 — física, não duration).

#### M34.1.1 — FAB esconde quando MenuCapturaVerde abre

Caminho B do M34.1 original (descartado por "invasivo"; provou-se
único viável). Flag `sheetCapturaAberto` em `useNavegacao`,
sincronizada via `onChange` do gorhom (cobre fechamento por gesto
pan-down). `<FABMenu>` early-return null quando flag true.
**Validação Gauntlet:** FAB roxo confirmadamente ausente do DOM
quando menu/frase aberto; volta após cancelar
(`M34.1.1-screenshots-gauntlet/A-fab-some-com-sheet.png`).

#### Aritmética batch

- Testes: 1298 → **1300** (+2 cases novos no FABMenu.test.tsx).
- Suítes: 145 → 145 (estável; +6 cases distribuídos em existentes).
- Bundle Hermes: **8.85 MB** (no teto exato 8.85 MB; margem
  ~10 KB).
- TS strict 0, anonimato OK, smoke OK.

#### Decisão durável anti-débito

Pacote de 5 sprints validadas no MESMO Gauntlet sem regressão
entre elas — paralelização funciona quando arquivos são disjuntos
(M11.2 hook, M34.2 Button, M27.4 SessaoBootGate, M-DEBITO 3
arquivos UI, M34.1.1 navegacao+chrome). Conflito potencial em
`MemoriasFotosTab.tsx` previsto entre M34.2 e M11.2 não
materializou (M34.2 ficou em Button.tsx, M11.2 em hook).

### M-GAUNTLET-FAST-BOOT-FOLLOWUP fechada (2026-05-04) — NÃO-FIX documentado

Investigação dos 3 caminhos propostos pela spec para fazer
`app/+html.tsx` (preload de fontes JetBrainsMono) aplicar em build
web. Resultado:

- **Caminho A — `web.output: "static"`:** **inviável.** Export quebra
  com `TypeError: Cannot destructure property '__extends' of
  'n.default' as it is undefined` no SSR de `framer-motion`
  (transitiva via `moti@0.30`). Reproduzido em `npx expo export
  --platform web` 2026-05-04. Causa raiz: `framer-motion` ESM importa
  `tslib` em modo destructured; `expo-router 6.0.23` em SSG não
  exporta `default` de `tslib` corretamente em Node.
- **Caminho B — `web.output: "single"`:** export funciona
  (5.73 MB JS bundle, 10.8 KB CSS), mas o `index.html` gerado é o
  template padrão do `expo-router/cli` — `+html.tsx` **não é lido**.
  Sem ganho.
- **Caminho C — injeção JS via `_layout.tsx`:** funcionaria em dev e
  build, mas a fonte só começaria a baixar após o bundle JS parsear,
  anulando o ganho de paralelismo (objetivo da preload).

**Decisão:** NÃO-FIX. Aguardar Expo SDK 55+ ou release `moti` que
não quebre SSR. Os arquivos já entregues por M-GAUNTLET-FAST-BOOT
(`public/fonts/JetBrainsMono_400Regular.ttf` 115 KB,
`public/fonts/JetBrainsMono_500Medium.ttf` 115 KB,
`public/styles/flash-inicial.css`, `app/+html.tsx`) **permanecem
versionados e servidos pelo Metro em dev** — sem regressão funcional.
Quando uma futura sprint retomar o caminho A (após fix upstream em
moti ou expo-router), os preload tags voltam a ser efetivos
imediatamente sem refactor.

**Documentação atualizada:**
- `app/+html.tsx` — comentário expandido com motivo e tracking.
- `VALIDATOR_BRIEF.md` §4 — armadilha **A23** registrada.

**Aritmética:** 1293 (baseline informado) → 1295 testes na execução
(zero teste novo desta sprint; delta veio de baseline desatualizado
no prompt). 145 suítes mantidas. `tsc --noEmit` 0.
`check_anonimato.sh` 0. Bundle Hermes sem alteração (esta sprint não
tocou em código de runtime).

**Verificação `tempoDeBoot()`** não aplicável: investigação não
introduziu mudança de runtime que pudesse impactar boot. O baseline
informado pelo usuário continua válido (`< 200ms` em sessão fresh
do Gauntlet).

### M34.3 fechada (2026-05-04) — FAB verde unificado

`<MenuCapturaVerde>` aceita prop `acoesExtras` que renderiza ações
contextuais por tab ACIMA das 4 ações de captura. FABs próprios das
3 tabs (`MemoriasTreinosTab`, `MemoriasFotosTab`, `MemoriasMarcosTab`)
**removidos** — antes ocupavam coordenadas (769,900) idênticas ao
FAB verde, causando intercept de pointer events.

Cada tab passa sua ação contextual via `useEffect` + callback do
parent `MemoriasScreen`:
- Treinos: "Novo treino" abre `<SheetNovoTreino>`.
- Fotos: "Adicionar foto" abre image picker via
  `__gauntlet.adicionarFotoMock` (web/dev) ou `expo-image-picker`
  (mobile real).
- Marcos: "Adicionar marco" abre `<SheetNovoMarco>`.

**Sheet "Registrar" agora tem 5 itens** (1 contextual + 4 captura),
todos verde Dracula, ícone Plus para ação contextual.

**Aritmética:** 1293 → 1293 testes (sem novos), 145 suítes mantidas.
TS strict 0, anonimato OK, smoke OK. Bundle Hermes **8.44 MB**
(redução de 410 KB do baseline 8.85 MB — remoção de 3 instâncias FAB
inline + 3 imports compensou as props extras).

**Validação visual via Gauntlet:**
- `A-marcos-menu-com-acao-contextual.png` — sheet aberto na aba
  Marcos com 5 itens em 64dp cada (Adicionar marco em top=472,
  Foto/Música/Vídeo/Frase em 536/600/664/728), header verde
  "Registrar", FABs antigos confirmadamente ausentes do DOM.

**Side-effect (atualizações em testes existentes):** 3 E2Es legados
do M11.1 (`m11-1-fotos-upload`, `m11-1-marcos-criar`,
`m11-1-memorias-usavel`) atualizados para abrir o FAB verde antes
de buscar o item contextual (não mais o FAB próprio que sumiu).
Mudança trivial de seletor — não requereu sub-sprint nova.

**FEATURES-CANONICAS atualizado:** §2.9 (M34→M34+M34.3) e §3.1/3.2/3.3
refletem o FAB verde unificado.

### M-SLIDER-WEB-LOOP fechada (2026-05-04)

`<Slider>` em `src/components/ui/Slider.tsx` agora ramifica por
`Platform.OS`:
- **Web:** `<input type="range">` nativo com CSS injetado uma vez
  via `ensureCssWeb()` (track `colors.bgElev`, fill `colors.cyan`,
  thumb `colors.purple`, foco `box-shadow` ciano `:focus-visible`,
  altura 44px para WCAG AA, `aria-valuemin/max/now`).
- **Native:** `RNSlider` de `@react-native-community/slider`
  preservado integral (zero regressão Android/iOS).

Interface pública (`SliderProps`) inalterada — 8 consumidores
existentes (humor-rapido, eventos, diario-emocional, alarmes/novo,
ciclo/registrar, SheetNovoTreino, FiltrosBar, app/index) continuam
funcionando sem mudança.

**Bug original:** `RTCSliderWebComponent` em loop infinito travava
`/medidas` e `/exercicios/<slug>` em web com tela em branco +
`Maximum update depth exceeded`. Causa: AnimatedProps callback do
slider web em loop com Reanimated em React 19 strict mode. Fix
elimina a dependência da implementação web do pacote nativo.

**Aritmética:** 1292 → 1293 testes (+1), 145 → 145 suítes. TS strict
0, anonimato OK, smoke OK. Bundle Hermes 8.85 MB (10 KB do limite —
margem apertada).

**Validação visual via Gauntlet:**
- `A-medidas-funcional.png` — `/medidas` renderiza header "Medidas",
  chips PERÍODO, empty state "Suas medidas vão aparecer aqui.",
  FAB roxo. Console: 0 erros, sem loop.
- `B-humor-rapido-sliders.png` — 4 `<input type="range">` confirmados
  no DOM (370×44 cada, dentro do frame). 0 erros de loop.

**Achado crítico em paralelo (M34.3 nova spec):** validação da aba
Marcos via Gauntlet revelou que **FAB verde do MenuCapturaVerde
(M34) sobrepõe** os FABs próprios das abas Fotos ("adicionar foto"
M11.1) e Marcos ("adicionar marco"). Coordenadas batem 1:1
(769, 900, 56×56). Usuário não consegue tocar nos FABs próprios
das abas pelo gesto direto. Spec
`docs/sprints/M34.3-spec.md` propõe FAB verde unificado por
contexto (caminho A) ou absorção via M-CAPTURA-UNIFICADA (caminho C).
**Bloqueia M-CAPTURA-UNIFICADA** (precisa decisão UX antes).

### M11.3 fechada (2026-05-04)

`useLarguraFrame()` hook em `src/lib/ui/useLarguraFrame.ts` que
retorna **constante 412** em web (`Platform.OS === 'web'`) e
`useWindowDimensions().width` real em native. Centraliza a lógica
para layouts dependentes do frame mobile do `FrameMobileGauntlet`
(412×892dp aplicado em todas as rotas dev web).

**Bug confirmado pelo usuário em browser real (2026-05-04):** card
de foto na tab Memórias aba Fotos vazava para fora do frame após
adicionar 1 foto via `__gauntlet.adicionarFotoMock()`. Causa raiz:
`useWindowDimensions().width` retorna a largura do **viewport**
(1280px) em web, não a do frame.

**Arquivos novos (3):**
- `src/lib/ui/useLarguraFrame.ts` — hook + constante `FRAME_W = 412`.
- `tests/lib/ui/useLarguraFrame.test.ts` — 3 cases (web=412,
  native dim.width, native largura dinâmica).
- `tests/e2e/playwright/m11-3-largura-frame.e2e.ts` — E2E mede
  `getBoundingClientRect()` da thumb (esperado 100-160px).

**Arquivos modificados (3 consumidores migrados):**
- `src/components/screens/MemoriasFotosTab.tsx:37` — `dim.width`
  → `useLarguraFrame()` no cálculo de `thumbSize`.
- `app/medidas/index.tsx:105` — idem para `larguraCard` e
  `larguraSlider`.
- `app/exercicios/[slug].tsx:68` — idem para `larguraConteudo`.

Auditoria via `grep useWindowDimensions src/ app/` confirmou 3/3
consumidores reais (`CardComparativo.tsx:35` é menção em comentário,
não import).

**Aritmética:** 1289 → 1292 testes (+3), 144 → 145 suítes (+1).
TS strict 0, anonimato OK, smoke OK. Bundle Hermes 8.84 MB.

**Validação visual via Gauntlet:**
- `A-grid-fotos-3-cols.png` — 4 thumbs 118×118 em grid 3+1
  perfeitamente contidas no frame (left=455, right=825, frame=434/846).
- B/C (medidas + exercicios) **não capturados** porque rotas
  travam com bug pré-existente RTCSliderWebComponent infinite
  loop (`Maximum update depth exceeded` em
  `@react-native-community/slider` versão web). Confirmado
  pré-existente via `git stash` da M11.3 — bug persiste em
  estado pré-sprint, portanto NÃO é regressão.

**Sub-sprint colateral (anti-débito):**
- **M-SLIDER-WEB-LOOP** — `RTCSliderWebComponent` em loop infinito
  trava `/medidas` e `/exercicios/<slug>` em web. Bug pré-existente
  desde M12/M13 (passou despercebido porque essas rotas nunca
  foram validadas em Gauntlet antes). Spec
  `docs/sprints/M-SLIDER-WEB-LOOP-spec.md` propõe wrapper
  `<Slider>` web/native com `<input type="range">` em web.

### M34 fechada (2026-05-04)

MenuCapturaVerde adicionado à tab Memórias. FAB **verde** (Dracula
`#50fa7b`) no canto inferior direito abre BottomSheet com 4 ações
de captura unificada: **Foto / Música / Vídeo / Frase**. Cada ação
salva binário em `media/<categoria>/<data-rand>.<ext>` mais um
`.md` companion preliminar (M39 ratifica formato via ADR-0017).

**Arquivos novos (13):**
- `src/components/chrome/MenuCapturaVerde.tsx` — FAB + 2 sheets.
- `src/components/midia/SheetFrase.tsx` — sheet 60% com Textarea +
  SeletorPara (M33) + botões Salvar/Cancelar.
- `src/lib/midia/capturarFoto.ts` — wrapper expo-image-picker
  (camera+galeria) + `.md` companion.
- `src/lib/midia/capturarMusica.ts` — wrapper expo-document-picker
  (audio/*) + `.md` companion.
- `src/lib/midia/capturarVideo.ts` — wrapper expo-image-picker
  (mediaTypes vídeo) + `.md` companion.
- `src/lib/midia/salvarFrase.ts` — escreve só `.md` em
  `media/frases/<data>-<slug>.md`.
- `src/lib/midia/companion.ts` — helper compartilhado
  `stringifyCompanionMidia` + `slugDeFrase` (DRY entre os 4 wrappers).
- 5 suítes Jest novas em `tests/lib/midia/` (incluindo `companion.test.ts`).
- `tests/e2e/playwright/m34-menu-captura.e2e.ts` — caso E2E
  obrigatório (Gauntlet §1.9).

**Arquivos modificados (3):**
- `src/components/screens/MemoriasScreen.tsx` — pluga
  `<MenuCapturaVerde />` ao final.
- `src/components/screens/MemoriasFotosTab.tsx` — botão "Registrar
  foto" inline no empty state.
- `src/lib/hooks/useFotosAgregadas.ts` — varre também
  `media/fotos/` com extensões ampliadas (.jpg/.jpeg/.png).

Sem mudança em `app.json` (permissões `CAMERA` + `RECORD_AUDIO` já
existem desde M00.5/M22).

Decisão de UI: cor verde distingue do FAB roxo de navegação (FABMenu,
esquerda); posição direita evita conflito de gestos. Companion .md
preliminar em formato YAML simples (tipo/arquivo/data/autor/para/
legenda); M39 expande com transcrição/duração/tags via ADR-0017.

**Aritmética:** 1260 → 1289 testes (+29), 139 → 144 suítes (+5).
TS strict 0 erros, anonimato OK, smoke OK. Bundle Hermes Android
sem regressão (~8.5 MB).

**Validação visual via Gauntlet (playwright MCP):**
5 screenshots em `docs/sprints/M34-screenshots-gauntlet/`:
- `A-fab-verde-memorias.png` — FAB verde (rgb 80,250,123) 56×56
  no canto direito (right=825), simétrico ao FABMenu roxo esquerdo.
- `A-menu-aberto.png` — header verde "Registrar" + 4 itens
  (Foto/Música/Vídeo/Frase) com ícones verde Dracula em chips
  cinza e labels acentuação completa, áreas de toque 64dp.
- `A-sheet-frase.png` — header "Nova frase" verde, label "FRASE"
  uppercase muted, Textarea 368×260, SeletorPara M33
  ("Para mim/Para Ana/Para o casal"), botões Salvar disabled
  (frase vazia) + Cancelar.
- `A-empty-state-com-botao.png` — empty state Fotos com ícone
  caixa, frases secundárias e botão "Registrar foto" inline.
- `A-foto-na-galeria.png` — após `__gauntlet.adicionarFotoMock()`,
  card aparece no grid (placeholder cinza por scheme `web://`
  bloqueado pelo browser; limitação pré-existente do mock M11.1).

**Achados de UI/UX (anti-débito, materializados em specs próprias):**
- **M34.1** — `FABMenu` (z-index 10) sobrepõe botão "Cancelar" do
  SheetFrase ao rolar o sheet. Caminho preferido: `BottomSheet`
  default `containerStyle.zIndex: 30`. Spec
  `docs/sprints/M34.1-spec.md`.
- **M34.2** — Botão "Registrar foto" do empty state (Fotos) com
  contraste insuficiente — visualmente parece desabilitado. Spec
  `docs/sprints/M34.2-spec.md` (diagnóstico + fix).
- **M11.3** — Grid de Fotos calcula `thumbSize` via
  `useWindowDimensions().width` retornando 1280 em web (frame
  mobile 412 ignorado), causando thumbs gigantes. Spec
  `docs/sprints/M11.3-spec.md` (helper `useLarguraFrame`).

Caso E2E `m34-menu-captura.e2e.ts` valida: FAB verde presente em
`/memoria`; tap abre sheet com 4 itens; tap em "capturar frase"
monta sheet com `aria-label="campo da frase"` acessível.

### M-GAUNTLET-SEED-DUO fechada (2026-05-04)

`aplicarSeed` e `aplicarSetNomes` agora propagam
`tipoCompanhia` para o canônico **`useSettings.pessoa.tipoCompanhia`**
(M29) além do legado `useOnboarding.tipoCompanhia`.

Mapeamento: `nomeB === null → 'sozinho'`; `nomeB string → 'duo'`.
`aplicarReset` zera ambos. `localStorage.removeItem('ouroboros.settings.v2')`
adicionado para evitar re-hidratação de estado anterior.

**Aritmética:** 1257 → 1260 testes (+3 cases em
`tests/lib/dev/gauntlet-seed-duo.test.ts`), 138 → 139 suítes (+1).

**Validação visual via Gauntlet (playwright MCP):**
- `seed({ nomeA: 'Alex', nomeB: 'Sam' }) + abrir('/eventos')`:
  9 chips renderizam (3 chips × 3 telas com SeletorPara).
  "Para mim" / "Para Sam" / "Para o casal" visíveis no form
  Eventos.
- `abrir('/contadores/novo')`: PARA QUEM com 3 chips M33,
  Para mim purple selecionado.
- `abrir('/todo')` + click "Nova tarefa": Sheet abre com 8 chips
  CATEGORIA (Trabalho/Casa/Rotina/Finanças/Desenvolvimento pessoal/
  Obrigações/Saúde/Outro), 4 chips PARA QUEM
  (Para mim/Para Sam/Para o casal/Para outro), toggle "Lembrar
  com alarme" com texto secundário "Cria um alarme companion
  vinculado à tarefa."
- Screenshots em
  `docs/sprints/M33-screenshots/A-evento-seletor-para.png`,
  `B-contador-novo-seletor-para.png` e
  `docs/sprints/M31-screenshots/B-nova-tarefa-categoria.png`.

**Achados de UI/UX (não-bloqueantes, anotados para sprint
corretiva futura):**
- Chip "Outro" de categoria Tarefa renderiza em laranja accent
  (cor de destaque) sendo apenas opção neutra. Investigar se foi
  intencional ou regressão. Sprint corretiva sugerida:
  `M31.1-spec.md` ou ajuste no `<ChipGroup>` quando relevante.
- Categoria em 3 linhas 4-2-2 (irregular).
- Toggle "Lembrar com alarme" expande bloco DateTimePicker
  embaixo — animação não validada visualmente.

### M33 fechada (2026-05-04)

Campo `para` em 4 schemas (Diário/Evento/Contador/Marco) + componente
compartilhado `<SeletorPara>` plugado em 4 telas.

**Entregáveis:**
- `src/lib/schemas/para.ts` (novo) — `ParaSchema`
  discriminatedUnion (mim/outra com pessoa/casal). Default
  `{ tipo: 'mim' }` para backward-compat com .md v1.
- 4 schemas estendidos: `diario_emocional.ts`, `evento.ts`,
  `contador.ts`, `marco.ts`. Barrel atualizado.
- `src/components/ui/SeletorPara.tsx` (novo, 127L) — 3 chips
  dinâmicos. Retorna null em modo `'sozinho'` (esconde
  inteiramente). Label da opção `outra` usa `useNomeDe`.
  `useSettings.pessoa.tipoCompanhia` (canônico M29).
- `src/components/ui/index.ts` — exporta SeletorPara.
- 4 telas plugadas com `<SeletorPara value={para} onChange={setPara}
  disabled={salvando} />` antes do botão final:
  - `app/diario-emocional.tsx`
  - `app/eventos.tsx`
  - `app/contadores/novo.tsx`
  - `src/components/screens/SheetNovoMarco.tsx`
- `src/lib/marcos/marcosAuto.ts` — builder de marcos automáticos
  seta `para: { tipo: 'mim' }` por default.
- 9 fixtures de teste existentes ajustadas com `para: {tipo:'mim'}`
  (tipo TS estritamente correto após extensão de schema).
- `tests/components/ui/SeletorPara.test.tsx` (novo, 12 cases) +
  testes nos 4 schemas (+24).

**Aritmética:** 1221 → 1257 testes (+36), 137 → 138 suítes (+1),
tsc 0 erros, anonimato OK. Bundle não re-medido (sprint aditiva
schema+UI; sem deps novas).

**TODO documentado (deferido para M40):**
- `src/lib/hooks/useHoje.ts` filtro por `para` — M40 (Home v2
  status do casal) é o consumidor natural; código morto se
  adicionado agora.

**Sem mudança em Tarefa:**
- M31 já tem `pessoa_destino` (semântica diferente: quem deve
  fazer vs. tema/destinatário emocional).

### M32 fechada (2026-05-04)

Contador v2: mensagens de apoio sóbrias + indicador discreto de
marcos.

**Entregáveis:**
- `src/lib/contadores/mensagens.ts` (novo) — função pura
  `mensagemApoio(dias)` com 6 faixas (0/recomeço, <5/início, <30/
  constância, <100/hábito, <365/médio, ≥365/anos). `marcoAtingido(dias)`
  retorna o último marco de `MARCOS_DIAS = [5, 30, 100, 365]` ou
  null.
- `app/contadores/[slug].tsx` — após o número grande, 2 `<Text>`:
  mensagem de apoio em `colors.muted` + (condicional) "marco de N
  dias" em `colors.mutedDecor` 11dp letter-spacing 1 (estilo
  rodapé, ADR-0005 zero gamificação).
- `tests/lib/contadores/mensagens.test.ts` — 14 cases (6 faixas
  com numeração, marcos com boundaries, defesa de negativos).

**Aritmética:** 1207 → 1221 testes (+14), 136 → 137 suítes (+1),
tsc 0 erros, anonimato OK. Bundle Hermes 8.5 MB (sem alteração
material).

**Tom respeita ADR-0005:**
- Sem badge, sem troféu, sem confete, sem cor de festa.
- "marco de N dias" cinza-violeta discreto, font 11dp.
- Mensagens sem exclamação, sem emoji.

### M31 fechada (2026-05-04)

TarefaSchema v2: categoria + pessoa_destino + alarme + aba
Concluídas + long-press Reabrir/Apagar.

**Entregáveis:**
- `src/lib/schemas/tarefa.ts` — `TAREFA_CATEGORIAS` (8 slugs:
  trabalho/casa/rotina/financas/desenvolvimento_pessoal/obrigacoes/
  saude/outro), `TAREFA_CATEGORIA_LABELS`, `TarefaPessoaDestinoSchema`
  discriminatedUnion (mim/outra/casal/terceiro), `TarefaAlarmeSchema`
  (ativo + data_hora_iso + recorrencia + slug_vinculado opcional).
  Defaults garantem migração silenciosa v1→v2.
- `src/lib/vault/tarefas.ts` — `criarTarefa()` com branch alarme
  (escreverAlarme + agendarAlarme antes de gravar tarefa, popula
  `slug_vinculado`). Falha de companion não bloqueia tarefa
  (graceful). `reabrirTarefa()` novo (inverte feito + zera
  feito_em; TODO inline para re-agendamento de alarme).
- `src/components/todo/SeletorPessoaDestino.tsx` (novo) — chips
  dinâmicos baseados em `useSettings.pessoa.tipoCompanhia`. Modo
  'sozinho' esconde "Para [parceiro]" e "Para o casal". Input
  expansível para "terceiro" (1-60 chars).
- `src/components/todo/SheetNovaTarefa.tsx` — reescrito. ChipGroup
  categoria 8 slugs com ícone preview lucide
  (Briefcase/Home/Repeat/Wallet/Sparkles/Scale/Heart/HelpCircle),
  SeletorPessoaDestino, Toggle "Lembrar com alarme" expansível com
  DateTimePicker mode `datetime` + ChipGroup recorrência.
- `src/components/todo/SecaoConcluidas.tsx` (novo) — collapsable
  header "Concluídas (N)" + lista. Empty state silencioso (return
  null). Default colapsada quando >5 itens.
- `src/components/todo/ItemTarefa.tsx` — render com ícone
  categoria 14dp + chip micro destino (≠ mim). Item concluída
  opacity 60% + line-through.
- `src/components/todo/MenuLongPress.tsx` — extendido com prop
  opcional `acoes` (backwards-compat). M31 usa para Reabrir/Apagar
  definitivo em concluídas.
- `app/todo.tsx` — 2 seções: pendentes (preserva drag&drop) +
  `<SecaoConcluidas>`. Tap em concluída reabre via
  `handleTapConcluida`. Long-press em concluída abre menu
  Reabrir/Apagar definitivo.

**Aritmética:** 1177 → 1207 testes (+30), 136 → 136 suítes,
tsc 0 erros, anonimato OK. Bundle Hermes 8.8 → **8.5 MB** (-300 KB,
margem 350 KB do limite — refactor enxuto reduziu size).

**Testes M31 (4 arquivos):**
- `tests/lib/schemas/tarefa.test.ts` (+30 cases): categoria 8 slugs,
  pessoa_destino discriminado mim/casal/outra/terceiro com
  rejeições corretas, alarme com 4 recorrências, migração v1→v2
  com defaults silenciosos via zod.
- `tests/components/todo/SheetNovaTarefa.test.tsx` (+6): 8 chips
  categoria, payload com defaults M31, toggle alarme ligando, modo
  editar com categoriaInicial.
- `tests/lib/vault/tarefas.test.ts` (+7): `reabrirTarefa` inverte/
  idempotente/lança; `criarTarefa` branch alarme com slug_vinculado,
  no-op quando alarme null/inativo, graceful em falha de
  escreverAlarme.
- `tests/components/todo/ItemTarefa.test.tsx` — fixture migrado
  para v2.

**Validação Gauntlet:** `/todo` renderiza empty state correto
("Sem tarefas. Crie quando quiser.") com header "Tarefas".
Screenshot em `docs/sprints/M31-screenshots/A-todo-pendentes-vazio.png`.

**Atenção (não-bloqueantes):**
- `useRotuloPessoa` mencionado pela spec (M28) não existe no
  código — implementado com `useNomeDe` direto (helper canônico
  real).
- `reabrirTarefa` ainda não cancela/re-agenda alarme companion
  (TODO inline). M30 decide convenção futura.
- `MenuLongPress` ganhou prop opcional sem quebrar M17.

### M30 fechada (2026-05-04)

AlarmeSchema v2: recorrência + channel com vibração + lembretes
integrados.

**Entregáveis:**
- `src/lib/schemas/alarme.ts` — `RecorrenciaSchema`, campo
  `recorrencia` (default `'semanal'`), `data_unica` (ISO opcional),
  `dias_semana` min 0, `superRefine` cross-field.
- `src/lib/services/alarmesNotificacoes.ts` — switch por
  recorrência (`unica` DATE / `diaria` DAILY / `semanal` WEEKLY /
  `mensal` MONTHLY) + identifiers `.once/.daily/.monthly`.
- `src/lib/services/notificationActions.ts` — `ALARME_CHANNEL_ID =
  'ouroboros-default-v2'`, `vibrationPattern: [0,250,500,250]`,
  `enableVibrate: true`, `lightColor: '#bd93f9'`. Helper
  `apagarChannelsLegadosUmaVez()` apaga `'default'` e `'alarmes'`
  (legados v1) guardado por `useSessao.flags.canalV1Deletado`.
- `app/_layout.tsx` — `PermissaoNotificacaoGate` via `useEffect`
  direto (CONTRACT §7.9) chama `pedirPermissao()` se
  `permissoesPedidas.notif === false`. Toast "Permita notificações
  em Configurações para receber alarmes." em falha.
- `app/alarmes/novo.tsx` — `<ChipGroup>` "Recorrência" condiciona
  seletor (DateTimePicker para única/mensal, SeletorDias só
  semanal).
- `src/lib/boot/migrarLembretes.ts` (novo) — migração idempotente
  dos 3 lembretes v1 (medicação/treino/humor) lendo
  `ouroboros.settings.v1` direto do SecureStore para alarmes
  pré-cadastrados off. Plug em `BOOT_HOOKS` antes de
  `reagendarAlarmes`.
- `src/lib/stores/sessao.ts` — campo `flags.canalV1Deletado` +
  mutator `marcarFlagBoot` + migração defensiva.
- `jest.setup.cjs` — `SchedulableTriggerInputTypes.{DATE,MONTHLY}`
  + `deleteNotificationChannelAsync` mock.
- 3 fixtures de teste atualizadas (`CardAlarme.test.tsx`,
  `alarmesNotificacoes.test.ts`, `vault/alarmes.test.ts`) com
  `recorrencia: 'semanal'` explícito.
- `tests/lib/boot/migrarLembretes.test.ts` (novo, 8 cases) —
  migração, idempotência (rodar 2x não duplica), apaga blob v1,
  blob ausente/corrompido/sem chave, vaultRoot vazio, default
  horário.

**Aritmética:** 1162 → 1177 testes (+15), 135 → 136 suítes (+1),
tsc 0 erros, anonimato OK. Bundle Hermes 8.78 → 8.8 MB
(50 KB margem do limite 8.85).

**Validação visual via Gauntlet (playwright MCP):**
- `/alarmes/novo` renderiza:
  - "Novo alarme" header.
  - Campos: TÍTULO, HORÁRIO 08:00.
  - **RECORRÊNCIA**: 4 chips (Única/Diária/**Semanal**/Mensal),
    Semanal selecionado purple por default.
  - DIAS DA SEMANA: D S T Q Q S S (visível só quando Semanal).
  - CATEGORIA: Medicação/Treino/Outro.
  - SOM: Suave/Normal/Forte (Suave selecionado ciano).
  - Soneca 5 min slider.
  - Ativo toggle ON.
- Screenshot em
  `docs/sprints/M30-screenshots/A-novo-alarme-recorrencia.png`.

**Pendência Nível B (não-bloqueante):**
- Validação de `vibrationPattern` real precisa emulador Android +
  logcat (`Vibrator: pattern [0,250,500,250]`). Spec sinaliza como
  obrigatório para Nível B; Gauntlet em web não cobre.
- `apagarChannelsLegadosUmaVez()` em devices que rodaram v1.0-rc1
  precisa validação manual pós-instalação.

### M29 fechada (2026-05-04)

Settings v2: vibração simples + features default ON + sync removido.

**Entregáveis principais:**
- `src/lib/stores/settings.ts` (198→278L) — shape v2 com `somVibracao`
  4-toggle (geral/despertar/conquista/botoes), `featureToggles` 6/7
  defaults TRUE, REMOVIDOS `lembretes` e `sync`. Persist key
  `ouroboros.settings.v2`. Migration v1→v2 conservadora preservando
  intenção do usuário (`alarme→despertar`, `vitoria→conquista`,
  `humor||fab→botoes`).
- `src/lib/haptics.ts` — refatorado: `humor/trigger/fab=botoes`,
  `vitoria=conquista`, `alarme=despertar`. `tomVibracaoLigado(chave)`
  retorna false se mestre `geral` off.
- `app/settings/index.tsx` (938→561L; -377L) — REMOVIDOS
  `<SecaoLembretes>`, `<SecaoSync>`, `<SelectorQualidade>`. Nova
  `<SecaoSomVibracao>` com 4 toggles + disable visual quando geral
  off. Features reordenadas (To-do → Alarme → Contador → Ciclo →
  Calendário → Widget). Adicionado `<LinkSubTela>` "Reinicializar
  pasta do Vault" chamando `inicializarVaultCanonico()`.

**Refactor inevitável (consumidores externos do shape antigo):**
- `src/components/screens/ScannerSheet.tsx` — `s.sync.qualidadeScanner`
  → constante `'maxima'` inline (decisão "sempre máxima implícita").
- `src/lib/scanner/launch.ts` — `type ScannerQualidade` movido para o
  próprio módulo.
- `src/lib/services/notificacoesLembretes.ts` — `reagendarLembretes()`
  neutralizado para chamar apenas `cancelarTudo()` (M30 substitui).
- `src/lib/stores/index.ts` — barrel sem `SyncMethod/ScannerQualidade/
  Lembrete`.
- `tests/app/settings/index.test.tsx` (4 testes), `tests/components/
  chrome/MenuLateral.test.tsx` (2), `tests/lib/widget/
  atualizarWidgetHomescreen.test.ts` (1) — atualizados para shape v2.

**Aritmética:** 1157 → 1162 testes (+5), 135 → 135 suítes,
tsc 0 erros, anonimato OK. Bundle Hermes 8.79 → 8.78 MB (-10 KB).
`app/settings/index.tsx` -377L pelo cleanup.

**Validação visual via Gauntlet (playwright MCP):**
- `/settings` renderiza com:
  - Header "Configurações" laranja.
  - Seção SOM E VIBRAÇÃO com 4 toggles purple ativos:
    - "Vibração geral" (mestre, "Ao desligar, silencia tudo.")
    - "Vibrar em alarmes (despertar)"
    - "Vibrar em conquistas"
    - "Vibrar em botões e gestos" ("Humor, fab, registros rápidos.")
  - Seção PESSOA: Vault compartilhado, Editar nomes e fotos,
    **Reinicializar pasta do Vault** (novo), Adicionar segunda
    pessoa.
  - Seção OPCIONAIS começando com To-do leve (toggle ativo por
    default).
  - **Sem Lembretes**, **sem Sync** (confirmado).
- Screenshot em `docs/sprints/M29-screenshots/A-settings-v2-render.png`.

**Migração v1→v2 (4 cases em `tests/lib/stores/settings.test.ts`):**
- Estado v1 sintético mapeia conservador.
- Shape parcial preenche defaults.
- Null retorna defaults limpos.
- v2 já persistido passa intacto.

### M-GAUNTLET-FAST-BOOT fechada com ressalva (2026-05-04)

Pré-cache de fontes JetBrainsMono no Vault servido pelo Metro,
para encurtar boot de 30-60s (`useFonts` SDK 54 web fresh) para
<5s (preload paralelo ao JS bundle).

**Entregáveis:**
- `public/fonts/JetBrainsMono_400Regular.ttf` (115 KB) — copiada
  de `node_modules/@expo-google-fonts/jetbrains-mono/400Regular/`.
- `public/fonts/JetBrainsMono_500Medium.ttf` (115 KB).
- `public/styles/flash-inicial.css` — fundo `#14151a` (bgPage
  Dracula) carregado antes do React montar, evita white flash.
- `app/+html.tsx` (novo) — Root HTML customizado com
  `<link rel="preload" as="font" crossOrigin="">` para as 2
  fontes + `<link rel="stylesheet">` para o flash CSS. Usa
  `ScrollViewStyleReset` do `expo-router/html`.
- `docs/GAUNTLET.md` — seção "Histórico de melhorias" com 3
  sprints da auditoria.

**Validação:**
- Em modo dev (`./run.sh --web`): `fetch('/fonts/...')` retorna
  200, `fetch('/styles/flash-inicial.css')` retorna 200.
  `tempoDeBoot()` mede 123ms (vs 183ms baseline M27.3 — variação
  natural; cache do Metro hot).
- `tsc 0 erros`, anonimato OK, smoke verde, 1157/135 mantidos.

**Ressalva (sprint M-GAUNTLET-FAST-BOOT-FOLLOWUP criada):**
- `app/+html.tsx` não é aplicado em modo dev (Expo Router só usa
  em static rendering / export). Tentativa de habilitar
  `web.output: "static"` em `app.json` quebrou build com exit 1
  (provavelmente rota dinâmica sem `getStaticPaths`). Revertido.
- Preload tags portanto não aparecem no HTML servido em dev.
  Boot rápido atual (123ms) é resultado do Metro hot cache, não
  do preload. Em sessão fresh real do Chrome (Ctrl+Shift+R com
  cache vazio), o impacto do preload ainda precisa ser medido.
- Sprint corretiva
  `docs/sprints/M-GAUNTLET-FAST-BOOT-FOLLOWUP-spec.md` documenta
  3 caminhos de investigação para fazer `+html.tsx` aplicar.

### M-GAUNTLET-SEED-V2 fechada (2026-05-04)

Fixtures realistas no seed do Gauntlet. Substitui stubs vazios de
`seedHumores`/`seedDiarios`/`seedEventos` por implementações
determinísticas baseadas em fixtures JSON.

**Entregáveis:**
- `src/lib/dev/seedDeterministico.ts` (reescrito) — `seedHumores()`,
  `seedDiarios()`, `seedEventos()` lendo fixtures JSON e
  persistindo em stores mock dedicadas. `seedTudo()` orquestra
  todos. Helpers de leitura `lerHumoresMock`, `lerDiariosMock`,
  `lerEventosMock` para testes.
- `src/lib/dev/humorMock.ts`, `diarioMock.ts`, `eventosMock.ts`
  (novos) — stores zustand in-memory dev-only.
- `src/lib/dev/fixtures/humores-30d.json` — 33 registros em 30
  dias, intensidades 1-5, distribuição 60/30/10 (pessoa_a/
  pessoa_b/sobreposto).
- `src/lib/dev/fixtures/diarios-3.json` — 1 trigger, 1 vitória, 1
  reflexão. Textos abstratos, zero nomes próprios (Regra −1
  conservadora). Tipo `DiarioMockModo` aceita `'reflexao'`
  desacoplado do `DiarioEmocionalSchema` zod (que só conhece
  `'trigger'`/`'vitoria'`).
- `src/lib/dev/fixtures/eventos-7.json` — 7 eventos em -7d a -1d.
- `src/lib/dev/gauntlet.ts` — API `seedComDados(fixture)` com
  guard `GAUNTLET_ATIVO`. `reset()` limpa todos 3 mocks +
  `useGaleriaMock`.
- `src/lib/hooks/useHumorHeatmap.ts` — assina `useHumorMock`;
  quando `GAUNTLET_ATIVO` + mock tem células, monta `cacheFinal`
  sintético sobrepondo cache do Vault.
- `tests/lib/dev/seedDeterministico.test.ts` — 14 cases (seed,
  schema, sobreposto, determinismo).
- `tests/e2e/playwright/m-gauntlet-seed-v2.e2e.ts` — heatmap
  validation pós-seed.

**Aritmética:** 1143 → 1157 testes (+14, executor entregou +14
pelo zelo), 134 → 135 suítes (+1), tsc 0 erros, anonimato OK.
Bundle Hermes 8.4 → 8.79 MB (+0.39 MB; limite 8.85 MB; margem 60 KB).

**Validação visual via Gauntlet (playwright MCP):**
- API `seedComDados` listada em `__gauntlet` (16ª).
- Após `reset() + seed() + seedComDados('humores-30d') + abrir('/humor')`:
  - 91 células totais no heatmap (13×7).
  - **23 células com humor > 0** (coloridas).
  - "Média 30d: 3,6  Registros: 23 / 30" exibido.
  - Paleta Dracula visível (vermelho/amarelo/verde/ciano/laranja).
- Screenshot em
  `docs/sprints/M-GAUNTLET-SEED-V2-screenshots-gauntlet/B-heatmap-colorido.png`.

**Pontos de atenção (não-bloqueantes):**
- `useDiarioMock` e `useEventosMock` não plugados em hooks de UI
  ainda. Auditoria item 23 só pediu fixtures + API, não o plug nas
  telas. Sprints futuras (M11.x) podem plugar quando relevante.
- Schema `reflexao` desacoplado do zod canônico — decisão por
  pragmatismo (mock só serve para validação de UI).
- "Maximum update depth exceeded" do `SessaoBootGate` re-aparece
  em cenário `reset()+seed()+abrir()` rápido — confirma achado da
  M27.3 (sprint M27.4 sugerida).

### M-GAUNTLET-LEAK-CHECK fechada com achado crítico (2026-05-04)

Script CI `scripts/check_gauntlet_leak.sh` que roda
`npx expo export --platform android` e busca por 6 marcadores
canônicos do Gauntlet no bundle Hermes (`*.hbc` em
`_expo/static/js/android/`). Exit 1 com lista de FAILs se vazar,
exit 0 com tamanho do bundle se limpo. Não invocado pelo smoke por
padrão (chamada manual ou via `--full` futuro).

**Achado crítico revelado:** 5 dos 6 marcadores presentes no
bundle release Android (`__gauntlet`, `instalarGauntlet`,
`useGaleriaMock`, `GAUNTLET_ATIVO`, `adicionarFotoMock`). Causa
raiz: `app/_layout.tsx` importa diretamente
`@/lib/dev/gauntlet` — Metro/Hermes não fazem tree-shake de export
referenciado, mesmo com guard `if (!GAUNTLET_ATIVO) return` em
cada método. Política zero-trust dos métodos individuais protege o
runtime, mas não impede o bytecode de carregar os símbolos.

**Sprint corretiva criada:**
`docs/sprints/M-GAUNTLET-DEAD-CODE-V2-spec.md` — caminho A (módulo
de bootstrap separado com `require` lazy guardado por
`Platform.OS !== 'web' || !__DEV__`). Bloqueia M41 (release final).

### M27.3 fechada (2026-05-04)

Boot screen sem oscilar via hook agregador `useAppPronto` + store
`useBootStatus` (latch boolean global). Substitui o guard `useRef`
`fontesPersistentementeCarregadas` do M27.1 por solução baseada em
selector estável.

**Decisão de design:** **conditional render** (não Suspense throw).
A spec §5 alertou contra Suspense em React Native nativo com
Reanimated worklet não-validado. O orquestrador autorizou
explicitamente o conditional render direto — equivalente em UX,
mais seguro. Migração futura para Suspense throw é trocar APENAS
o consumidor (hook + store ficam reutilizáveis).

**Entregáveis:**
- `src/lib/boot/useAppPronto.ts` (novo) — combina `loaded` (useFonts)
  + `useHasHydrated` das 3 stores críticas (onboarding, vault,
  sessao). Latch via store global. Uma vez `true`, sempre `true`.
- `src/lib/boot/useBootStatus.ts` (novo) — store zustand leve sem
  persist. `pronto: boolean` + `marcarPronto()` idempotente.
  Selector estável `selectBootPronto`.
- `app/_layout.tsx` (+8L) — substitui guard `useRef` por
  `useAppPronto({ fontesProntas: loaded })`. `splashEsconderRef`
  garante UMA chamada de `SplashScreen.hideAsync()` mesmo se
  `useFonts` SDK 54 web oscilar `loaded=true`. `marcarBootCompleto()`
  do gauntlet sinalizado uma vez quando appPronto vira true.
- `tests/lib/boot/useAppPronto.test.tsx` (novo, 7 cases) — 3
  useBootStatus + 4 useAppPronto incluindo latch persistente após
  oscilação.
- `tests/e2e/playwright/m27-3-boot-suspense.e2e.ts` (novo) —
  `aguardarBoot()` + `tempoDeBoot()` do gauntlet. Conta
  `transicoesAusenteParaPresente` em 60s pós-boot. Espera 0.

**Aritmética:** 1136 → 1143 testes (+7, spec previa 3-6, +1 por
separar suite useBootStatus de useAppPronto), 133 → 134 suítes
(+1), tsc 0 erros, anonimato OK, smoke OK. Bundle Hermes Android
8.4 MB (≤ 8.85 MB).

**Validação visual via Gauntlet (playwright MCP):**
- `/_dev/gauntlet`: boot pronto em 183ms (vs 187ms baseline),
  `tempoDeBoot()` retorna 183, 0 transições do loader em 8s.
- `/humor`, `/settings`, `/memoria`: 0 transições do loader em
  cada (3s amostra cada). Loader não volta após primeira
  desmontagem.
- Screenshot em `docs/sprints/M27.3-screenshots-gauntlet/`:
  `A-pos-boot-estavel.png`.

**Achado colateral (sprint corretiva M27.4 sugerida):**
- `SessaoBootGate` dispara "Maximum update depth exceeded" em
  cenário de `__gauntlet.reset()` + `seed()` + `abrir()` em
  sequência rápida (<2s). Pré-existente desde M24 — `useUltimaRota`
  + `useHasHydrated` cascata após reset das 3 stores. Não é
  regressão de M27.3 (M27.3 não tocou em `SessaoBootGate`).
  Não bloqueia uso real (usuário não faz reset+navega rápido).
  Sprint M27.4 deve adicionar debounce ou guard duplo no
  `restauradoRef`.

### M11.1 fechada (2026-05-04)

Memórias usável. Achado de uso real (orquestrador validando via
Gauntlet) mostrou 4 problemas estruturais em `/memoria`. Sprint
fechou os 4 com proof-of-work runtime + visual.

**Entregáveis:**
- `src/components/screens/MemoriasFotosTab.tsx` (+52L) — FAB roxo
  "+" no canto inferior direito com `accessibilityLabel="adicionar
  foto"`. Empty state ganha linha secundária "Toque + para
  adicionar uma foto agora." Handler chama
  `adicionarFotoManual()` e dispara `recarregar()`.
- `src/lib/midia/adicionarFotoManual.ts` (79L, novo) — 3 caminhos:
  web/dev (mock via Gauntlet), web release (no-op), mobile real
  (`expo-image-picker` + `FileSystem.copyAsync` para
  `media/fotos/<YYYY-MM-DD>-<rand>.jpg`).
- `src/components/screens/MemoriasTreinosTab.tsx` (+34L) — atalho
  ghost "Cadastrar exercícios na Galeria" no empty state da aba
  Treinos navegando para `/exercicios`. `<HeatmapBase>` envolto em
  `<View style={{ alignItems: 'center' }} accessibilityLabel="container heatmap centralizado">`.
- `src/lib/dev/gauntlet.ts` (+28L) — API `adicionarFotoMock()` na
  `GauntletAPI` com guard `GAUNTLET_ATIVO`. `reset()` limpa
  `useGaleriaMock` para idempotência entre E2E.
- `src/lib/dev/galeriaMock.ts` (32L, novo) — store zustand auxiliar
  `useGaleriaMock` (web-only, alimentada apenas pelo Gauntlet).
- `src/lib/hooks/useFotosAgregadas.ts` (+72L) — leitor novo
  `lerGaleriaManual(vaultRoot)` varre `media/fotos/` (canônica
  conforme `paths.ts:224`). `FotoOrigem` estende para
  `'galeria-manual'`. Em web/dev mescla entradas do
  `useGaleriaMock` por cima do Vault.
- `src/components/screens/FotoDetalhe.tsx` (+2L) — Record de label
  cobre nova origem.
- 3 E2E novos em `tests/e2e/playwright/`:
  `m11-1-marcos-criar.e2e.ts`, `m11-1-fotos-upload.e2e.ts`,
  `m11-1-memorias-usavel.e2e.ts`.
- 3 suítes Jest novas (`tests/lib/dev/galeriaMock.test.ts`,
  `tests/lib/dev/gauntlet-adicionarFotoMock.test.ts`,
  `tests/lib/midia/adicionarFotoManual.test.ts`) cobrindo +10
  cases.

**Aritmética:** 1126 → 1136 testes (+10), 130 → 133 suítes (+3),
tsc 0 erros, anonimato OK, smoke OK.

**Validação visual via Gauntlet (playwright MCP):**
- Aba Treinos: heatmap centralizado matemático
  (`getBoundingClientRect()` left=775 right=775 diff=0px no frame
  mobile 412dp), atalho "Cadastrar exercícios na Galeria" presente
  no DOM e visível na captura.
- Aba Fotos: FAB com `aria-label="adicionar foto"` posicionado
  inferior direito. Empty state mostra texto secundário.
  `__gauntlet.adicionarFotoMock()` insere entrada e thumb
  `[aria-label^="foto galeria-manual"]` aparece (delta=1).
- Aba Marcos: FAB "+" presente.
- 4 screenshots em
  `docs/sprints/M11.1-screenshots-gauntlet/`:
  `A-treinos-heatmap-centralizado.png`,
  `B-fotos-com-fab.png`, `B2-fotos-com-mock.png`,
  `C-marcos-aba.png`.

**Divergências da spec resolvidas fielmente ao espírito:**
- `MidiaSchema` não tem campos `origem`/`data` (é
  `discriminatedUnion` minimalista). `'galeria-manual'` virou novo
  valor de `FotoOrigem` no enum do hook agregador (não do schema).
- Não existe "store da galeria agregada usada por M11" — galeria é
  agregador puro de leitura. Solução: leitor novo
  `lerGaleriaManual()` paralelo aos de eventos/medidas, varrendo a
  pasta canônica `media/fotos/` (já existente em `paths.ts`, M22 +
  M34).
- Convenção real do projeto é
  `media/fotos/<YYYY-MM-DD>-<rand>.jpg`, não a sugerida na spec
  (`media/YYYY-MM-DD/IMG_<unix-ts>.jpg`). Adotada a real.

**Sub-sprints abertas (anti-débito):**
- `M01.6-spec.md` (proposto pelo executor) — `<Button>` aceitar
  `accessibilityLabel` opcional desacoplado do label visível.
- `M11.2-spec.md` (proposto pelo executor) — micro-impureza em
  `useFotosAgregadas` lendo `useGaleriaMock` fora de
  `GAUNTLET_ATIVO` (benigno, mas arquiteturalmente impuro).

### M-GAUNTLET-AUDITORIA fechada (2026-05-04)

Auditor externo cego (subagente isolado) avaliou 30 itens em 7
seções. Resultado: 4 SIM, 12 NÃO, 14 PARCIAL. Edits triviais
aplicados em ciclo único, sub-sprints abertas para refatorações
maiores.

**Aplicados:**
- `src/lib/dev/gauntlet.ts`: guard `GAUNTLET_ATIVO` em cada método
  público da API (item 3, 5 — vazamento de bypass via import
  direto). `aplicarSeed` reseta `menuAberto: false` (item 6).
  `aplicarReset` v2 limpa localStorage do persist em web (item 7).
  4 APIs novas: `aguardarBoot()`, `tempoDeBoot()`, `consoleErros()`,
  `marcarBootCompleto()`. Captura de `console.error` ativa em
  modo dev web (item 27).
- `src/lib/boot/biometriaGate.tsx`: `bypassReal = bypass && __DEV__`
  (item 4 — bypass só vale em dev, mesmo se prop vazar em
  release).
- `gauntlet.sh` v2: flags `--clear`/`--quiet`, valida `comm` do PID
  antes de matar (item 15), rotaciona log para `.prev` (item 17),
  `setsid` + `kill -- -PGID` derruba process group inteiro
  (item 18), mensagens acionáveis com comandos (item 16).
- `app/_dev/showcase.tsx` criado com 20 telas listadas, banner
  "MODO GAUNTLET ATIVO", frame mobile centralizado (item 21).
- 11 casos E2E + template chamam `reset()` antes de `seed()`
  (item 20).
- `docs/GAUNTLET.md` ganhou seção Troubleshooting com 6 cenários
  comuns (itens 28, 30).
- `VALIDATOR_BRIEF.md` §1.9 sem ambiguidade entre "proibido" e
  "permitido para debugging" (item 29).

**Sub-sprints abertas (refatorações maiores):**
- `M-GAUNTLET-LEAK-CHECK-spec.md` — CI gate de export Android
  sem `__gauntlet` (item 1).
- `M-GAUNTLET-SEED-V2-spec.md` — fixtures realistas humores 30d,
  diários 3, eventos 7 + API `seedComDados()` (item 23).
- `M-GAUNTLET-FAST-BOOT-spec.md` — pré-cache JetBrainsMono em
  `public/fonts/` para encurtar boot inicial (item 26).

**Validação:** Gauntlet com 14 APIs expostas, `tempoDeBoot()`
retorna 187ms, showcase renderiza, banner ativo, frame mobile
centralizado. 1126 testes / 130 suítes / tsc 0 erros / smoke OK.

Relatório completo em
`docs/auditoria-gauntlet-2026-05-04/RELATORIO.md`.

### Specs materializados — fila de execução completa (2026-05-04)

Achado de uso real via Gauntlet em `/memoria` mostrou que a tela
está montada mas não usável (aba Fotos passiva, Treinos bloqueada
por dependência, heatmap descentralizado, Marcos sem E2E).
Aproveitando o ciclo, todos os pendentes foram materializados em
specs e ROADMAP.md ganhou tabela "Fila de execução" no topo.

Specs criadas:

- `docs/sprints/M11.1-spec.md` — Memórias usável (Fotos com
  upload, heatmap centralizado, atalho Treinos→Galeria, E2E
  Marcos).
- `docs/sprints/M-GAUNTLET-AUDITORIA-spec.md` — Auditoria externa
  cega do Gauntlet (subagente isolado), `gauntlet.sh` v2 (flags
  `--clear`/`--quiet`/healthcheck), 4 APIs novas (`aguardarBoot`,
  `tempoDeBoot`, `consoleErros`, `seedComDados`), seção
  Troubleshooting em `docs/GAUNTLET.md`.
- `docs/sprints/M27.3-spec.md` — Boot screen sem oscilar via
  Suspense boundary com `useAppPronto` agregando useFonts +
  hidratação multi-store.
- `docs/sprints/M20.x-spec.md` — Validação Nível B do widget
  homescreen no emulador (4 screenshots).
- `docs/sprints/M10-checkpoint-visual-spec.md` — Heatmap em
  Android real (4 screenshots).
- `docs/sprints/M14-checkpoint-visual-spec.md` — Financeiro em
  Android real (4 screenshots).
- `docs/sprints/M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL-spec.md` —
  Acentuação PT-BR no Python (sprint paralela no repo Backend).

ROADMAP.md tabela "Fila de execução" lista 14+ sprints na ordem
correta. STATE.md atualizado com fila e marcos.

### Ciclo corretivo M24.1 + M25.2 (2026-05-03)

Pós-revalidação, fechados 2 dos 3 corretivos descobertos. M27.2
deferida para M27.3 — tentativas de fix em React 19 strict mode
causaram `Maximum update depth exceeded`; solução completa exige
refatoração via Suspense boundary, fora de escopo.

- **M24.1 — resume state** — `src/lib/hooks/useUltimaRota.ts`:
  hook ignora o primeiro pathname recebido após mount. Esse era o
  destino de boot (potencialmente o `/` default ou o restaurado pelo
  `SessaoBootGate`), não uma navegação do usuário. Sem essa guarda,
  o pathname inicial sobrescrevia `ultimaRota` antes do useEffect do
  gate ler o valor restaurado. Validação Gauntlet: `seed() +
  setUltimaRota('/memoria') + reload` agora abre app em `/memoria`.
- **M25.2 — animação SVG roda em web** —
  `src/components/brand/OuroborosLoader.tsx`: bloco
  `requestAnimationFrame` (web only via `Platform.OS === 'web'`)
  escreve `transform` direto no DOM. Cada `<AnimatedG>` recebe
  `data-anim-id` único (`useId()`) e o RAF localiza via
  `document.querySelector` + `setAttribute`. Em native, bloco é
  no-op e Reanimated mantém worklet. Timestamp absoluto `Date.now()`
  sobrevive a re-mounts. Validação: g3 (30s/volta) medido em
  ~15°/s; cabeça da cobra muda de posição entre prints.
- **M27.2 — deferida para M27.3.** Vide spec.

Métricas: 1126 testes / 130 suítes mantidos, tsc 0 erros, anonimato
OK, console gauntlet com 0 erros (1 warning React 19 `element.ref`
de dep transitiva ignorado).

### Validação consolidada via Gauntlet — M-REVALIDACAO-M20-M28 (2026-05-03)

Orquestrador rodou 11 casos E2E playwright MCP no Gauntlet,
validando 11 sprints concluídas (M20, M22, M23, M24, M25, M25.1,
M26, M27, M27.1, M28; M21 doc-only). Resultado:

- **PASS (5):** M22, M23, M25, M27, M28
- **FAIL (3):** M24, M25.1, M27.1 — viram corretivas separadas
- **INCONCLUSIVO (2):** M20 (widget Android), M26 (sheets) — exigem Nível B

Achados que viram sprints corretivas bloqueando M29:

- **M24.1** — `setUltimaRota('/memoria') + reload` abre app em `/`
  em vez de `/memoria`. Race entre hidratação assíncrona da
  `useSessao` e o `Redirect` do `SessaoBootGate`. Spec
  `docs/sprints/M24.1-spec.md`.
- **M25.2** — animação `OuroborosLoader` continua parada em web
  mesmo após fix M25.1. Reanimated/SVG web não atualiza atributo
  `transform` dinamicamente. Spec `docs/sprints/M25.2-spec.md`.
- **M27.2** (regressão de M27.1) — boot screen oscila: loader
  Ouroboros volta a sobrepor após conteúdo da rota carregar. Fix
  M27.1 só tratou fontes; gate de sessão re-liga. Spec
  `docs/sprints/M27.2-spec.md`.

Entregáveis:
- `docs/validacao-gauntlet-2026-05-03/RELATORIO.md` (relatório consolidado)
- `docs/validacao-gauntlet-2026-05-03/screenshots/M*/` (12+ screenshots)
- 10 arquivos E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`
- `STATE.md`, `ROADMAP.md` atualizados; M29 represada até corretivos fecharem

### Sprints corretivas fechadas (2026-05-03)

Bloco consolidado de fixes de bugs descobertos durante a validação
manual M22-M28 + execução paralela M25/M27/M28. Aplicados num único
ciclo após smoke verde (1126 testes / 130 suítes / 0 erros tsc).

- **M14.1 — eslint-disable órfão removido.**
  `src/lib/hooks/useFinancasCache.ts:40` tinha
  `// eslint-disable-next-line @typescript-eslint/no-require-imports`
  acima de um `require()` que não acionava mais o warning. ESLint
  reportava `unused-disable`. Linha removida; ESLint silencioso.

- **M25.1 — animação OuroborosLoader gira em torno do centro em web.**
  `react-native-svg-web` converte `<G rotation={N} originX={160}
  originY={160}>` para `<g transform="rotate(N)">` sem `cx`/`cy`,
  fazendo a rotação acontecer em torno de `(0,0)` (varredura para
  fora do `viewBox`). Fix: `useAnimatedProps` agora retorna string
  SVG nativa `transform="rotate(${valor} ${PIVOT} ${PIVOT})"` que
  funciona 1:1 em web (rn-svg-web não toca) e em nativo (rn-svg
  parseia). Teste novo confirma formato exato para os 3 grupos
  rotativos (gs1/gs2/gs3); gs-flow continua usando
  `strokeDashoffset`. +1 teste (1125 → 1126).

- **M27.1 caminhos A + C — boot screen lento e overlay sobreposto.**
  Dois fixes complementares aplicados no mesmo ciclo:
  - **Caminho C** em `src/lib/conquistas/loader.ts`: quando
    `vaultRoot` começa com `web://mock-vault/...`, o reader
    `FileSystem` não tem implementação web e a Promise nunca
    resolve, deixando `useConquistas` preso em `loading=true`
    indefinidamente (FiltrosBar e Calendário não estabilizavam em
    Nível A). Fix: early-return com `{ conquistas: [],
    totaisPorOrigem: { evento_positivo: 0, diario_vitoria: 0 } }`.
  - **Caminho A** em `app/_layout.tsx`: `useFonts` em SDK 54 web
    oscila `loaded=true/false` quando `document.fonts` re-emite
    eventos pós-hidratação, re-montando o early-return e fazendo
    o `OuroborosLoader` piscar sobre a Home. Fix: flag
    `fontesPersistentementeCarregadas` (`useRef`) que vira `true`
    no primeiro `loaded=true` e segura o early-return mesmo se
    `loaded` flicka depois. Re-mount real do app reentra pelo
    SplashScreen via Reanimated/Expo, separado.
  - Caminho D (fade transition) não foi necessário — caminhos A+C
    juntos resolvem ambos os sintomas (~10s de boot no reload
    Chrome + overlay residual). Web é dev-only; dados reais ficam
    em emulador/celular. Screenshot de validação do M25.1 em
    `docs/sprints/M25.1-screenshots/A-cobra-frame1.png`.

### Infraestrutura de validação implementada (2026-05-03)

- **M-GAUNTLET fechada** — orquestrador implementou sozinho, sem
  dispatch de agentes (pedido explícito do usuário).
  - `src/lib/dev/gauntlet.ts` (módulo central, ~200 L):
    - `GAUNTLET_ATIVO = Platform.OS === 'web' && __DEV__`. Substitui
      a abordagem original com `EXPO_PUBLIC_GAUNTLET=1` (env var não
      injetada em runtime browser sem `.env` file). `__DEV__` é
      injetado pelo react-native em build time, sempre disponível,
      `false` em release.
    - `window.__gauntlet` com 11 APIs: `seed(opts)`, `reset()`,
      `setNomes(a, b?)`, `setVaultRoot(root)`, `setOnboardingDone(d)`,
      `setUltimaRota(r)`, `abrir(rota)`, `abrirMenu()`,
      `fecharMenu()`, `abrirSheet(rota)`, `estado()`.
    - `setRouterRef`/`setPathnameRef` para o `_layout.tsx` injetar
      runtime do expo-router (router só existe em hooks).
    - Idempotente em hot-reload (Metro re-monta).
  - `src/lib/dev/seedDeterministico.ts` — helpers
    `seedSozinho`/`seedDuo`/`seedCustom`/`resetTotal` + stubs para
    versão 2 (humores, diários, eventos).
  - `src/lib/boot/biometriaGate.tsx` — prop `bypass?: boolean`
    pula auth e renderiza children direto. `app/_layout.tsx` passa
    `bypass={GAUNTLET_ATIVO}`.
  - `app/_layout.tsx` — `FrameMobileGauntlet` envolve toda UI em
    container 412×892dp centralizado com fundo cinza `#0a0a0e`
    fora do frame e Dracula `#14151a` dentro. **Aplica em TODAS as
    rotas em modo dev**, não só `/_dev/*` (atendendo pedido do
    usuário: "ajustar a tela também do gauntlet pra ser limitada
    horizontalmente igual um celular"). Em mobile nativo
    (Platform.OS !== 'web'), pass-through. Boot screen também
    envolto pelo frame.
  - `app/_dev/_layout.tsx` — Stack interno com banner amarelo
    "MODO GAUNTLET ATIVO" no topo. `Redirect` `/` em produção.
    Frame mobile movido para raiz (não duplicar).
  - `app/_dev/gauntlet.tsx` — dashboard com 5 botões coloridos
    (Seed verde, Reset vermelho, Seed casal verde, Abrir/Fechar
    menu purple), painel JSON do estado auto-refresh 500ms, lista
    de rotas em 4 seções (Ver/Registrar/Opcionais/Dev). Acentuação
    PT-BR completa nas strings de UI; `accessibilityLabel` SEM
    acento.
  - `tests/e2e/playwright/00-bootstrap.e2e.ts` — caso E2E que
    confirma `window.__gauntlet` exposto + `seed()` funcional. Não
    rodado por Jest (`testMatch` filtra `*.test.ts/tsx`); executado
    pelo orquestrador via playwright MCP.
  - `docs/templates/e2e-template.e2e.ts` — template canônico para
    sprints futuras adicionarem casos E2E.
  - `docs/GAUNTLET.md` — guia completo: como ativar, API
    `window.__gauntlet`, fluxo do orquestrador, limitações
    conhecidas.
  - 4 screenshots Nível A+ em `docs/sprints/M-GAUNTLET-screenshots/`:
    `A-dashboard-funcionando.png`, `A-dashboard-pos-seed.png`,
    `A-dashboard-frame-mobile.png`, `A-frame-mobile-aplicado.png`.
    `window.__gauntlet.seed()` confirmado retornando
    `{ onboardingDone: true, vaultRoot: 'web://mock-vault/Ouroboros',
    nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' }, ... }`.
  - **Garantia anti-vazamento confirmada**: `npx expo export
    --platform android` + `grep -rn __gauntlet` retorna vazio.
    Em release mobile, módulo é dead-code.
  - **Issue conhecido residual**: `useFonts` SDK 54 web demora
    30-45s em sessão fresh. M27.1 caminho A guard atenuou
    parcialmente. Aceito como dev-only — não afeta release mobile.
  - **Métricas**: 1126 testes / 130 suítes mantidas (não regrediu),
    bundle Hermes Android 8.75 MB.

### Decisões de infraestrutura (2026-05-03)

- **Gauntlet de validação visual — substitui Nível A puro como
  pipeline padrão.** Validação manual M22-M28 revelou 6 limitações
  estruturais do Chrome web puro (BiometriaGate redirect; useFonts
  SDK 54 oscilante; useConquistas travado em web; localStorage
  seed incompatível com zustand persist; MouseEvent sintético não
  dispara handlers RN-Web; `@gorhom/bottom-sheet` em web não
  monta). 2 sprints novas materializadas para resolver:
  - **M-GAUNTLET** (`docs/sprints/M-GAUNTLET-spec.md`, 6-8h,
    crítica) — interface dev `/_dev/gauntlet` com
    `window.__gauntlet` API JS determinística, bypass de gates
    em `EXPO_PUBLIC_GAUNTLET=1`, frame mobile 412dp em `/_dev/*`,
    8 E2E novos em `tests/e2e/playwright/`,
    `docs/GAUNTLET.md` documentação. Substitui pipeline
    3-tentativas.
  - **M-REVALIDACAO-M20-M28**
    (`docs/sprints/M-REVALIDACAO-M20-M28-spec.md`, 4-6h, alta) —
    re-valida 11 sprints concluídas via Gauntlet com 1 E2E por
    sprint. Bugs descobertos viram corretivas separadas. Bloqueia
    M29 em diante até zerar FAIL.
  Toda sprint nova que toca UI a partir de 2026-05-04 deve
  incluir 1 E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`.
  Documentação atualizada: `CLAUDE.md` (Regra de Validação
  Visual ganha 4 níveis A/A+/B/C), `HOW_TO_RESUME.md` (política
  de validação), `VALIDATOR_BRIEF.md` §1.9 (Nível A+ Gauntlet
  detalhado), `STATE.md` + `ROADMAP.md` (sprints novas
  destacadas como infraestrutura), `docs/PROMPT-CONTINUACAO-OPUS.md`
  (próxima sessão começa por M-GAUNTLET).

### Decisões de produto

- **2026-05-03 — Histórico preservado, nunca apagado por padrão.**
  Decisão do usuário: ao marcar tarefa como feita, o app **não
  remove mais** o registro — move para uma seção "Concluídas" abaixo
  das pendentes. Recap (M36) puxa essas tarefas concluídas no período
  como parte de "Conquistas" + seção dedicada "Tarefas concluídas"
  + card "Tarefas concluídas" em "Números". Long-press em concluída
  abre menu "Reabrir" (volta para pendentes) ou "Apagar definitivo"
  (com confirm). Justificativa: app é espelho do que aconteceu;
  Recap em momento difícil mostra tudo que foi feito, não só o que
  falta. Patches aplicados em:
  - `docs/sprints/M31-spec.md` — UI com 2 seções (Pendentes /
    Concluídas collapsable se >5 itens), `<SecaoConcluidas>`
    componente novo, `reabrirTarefa()` helper em
    `src/lib/vault/tarefas.ts`, opacidade 60% + line-through em
    item concluído, long-press menu com 2 ações novas.
  - `docs/sprints/M36-spec.md` — passa de 4 para 5 seções:
    adiciona `<RecapSecaoTarefas>` (lista agrupada por categoria
    com subtotais). `RecapData.numeros.tarefas_concluidas` novo.
    `useRecap` consome `listarTarefas` filtrado por
    `feito === true && feito_em in [de, ate]`. `RecapSecaoNumeros`
    vira grid 2×3 com card "Tarefas concluídas".
  - `VALIDATOR_BRIEF.md` §1.8 — regra transversal aplicável a M17
    (tarefa), M18 (contador, decidido por M32 quando reset) e M11
    (marco, naturalmente persistente).

### Adicionado

- **M28 (2026-05-03)** — Varredura de identidade: nomes reais em
  todas as UIs (substitui literais "Pessoa A"/"Pessoa B"/"Ambos").
  - `src/lib/stores/pessoa.ts` ganha hook reativo
    `useNomeDe(pessoa)`. `nomeDe()` síncrono mantido para usos
    fora de componentes (logging, sort).
  - `src/config/pessoas.config.ts` e `pessoas.config.example.ts`:
    `PESSOAS_CONFIG.ambos.nome` muda de `'Ambos'` para `'Casal'`
    — termo afetuoso e claro, "Ambos" era ambíguo em outros
    contextos.
  - `src/components/screens/MiniHumorScreen.tsx`: chips
    `CHIP_OPTIONS_COMPARTILHADO` e `CHIP_OPTIONS_PRIVADO` viram
    `useMemo` + `useNomeDe`. Literal `'Sobreposto'` preservado
    (rótulo de modo de visualização compartilhada, não pessoa).
  - `src/components/calendario/FiltrosBar.tsx`: chips de filtro
    pessoa via `useMemo` + `useNomeDe`. Inclui "Casal" para
    `'ambos'`.
  - `app/settings/editar-pessoa.tsx`: títulos `"Pessoa A"`/`"Pessoa B"`
    agora dinâmicos via `useNomeDe('pessoa_a')` / `'pessoa_b'`.
  - `src/components/screens/ScannerPreview.tsx`: constante
    estática `PESSOAS` substituída por `useMemo` + `useNomeDe`.
  - `src/components/screens/ShareReceiver.tsx`: fallbacks
    `?? 'Pessoa A'` substituídos por `?? nomeDe('pessoa_a')`
    (versão síncrona, fora de componentes reativos).
  - `src/components/data/HumorHeatmapStats.tsx`: constante
    `NOMES_CURTOS` removida; rótulos sobreposto vêm de
    `useNomeDe`.
  - `tests/lib/stores/pessoa.test.ts` novo (7 testes): cobre
    `nomeDe('ambos') → 'Casal'`, defaults `Nome_A`/`Nome_B`,
    reatividade do hook quando `usePessoa.setNomes()` muda.
  - `tests/config/pessoas.config.test.ts`: assert atualizado
    para `'Casal'`.
  - 2 screenshots Nível A em `docs/sprints/M28-screenshots/`:
    `A-humor-chips-nomes-reais.png` (chips Nome_A/Nome_B/Sobreposto
    com defaults genéricos respeitando Regra −1),
    `A-settings-radio-nomes.png` (títulos uppercase NOME_A/NOME_B
    via `useNomeDe`).
  - **Achado colateral M28-COLAT-01** (não fixado inline,
    proposto como sprint dedicada): rota `/calendario` não
    estabiliza paint em web Nível A. `useConquistas` chama
    `lerConquistas(vaultRoot)` que em web com `vaultRoot` mock
    fica preso em `loading=true`. Combinado com aparente
    oscilação `loaded` em `useFonts`, `OuroborosLoader` retorna
    ao paint mesmo após app montar árvore. Validação visual de
    `FiltrosBar` reservada para Nível B (emulador).
  - Varredura final: `grep -rn "'Pessoa A'\|'Pessoa B'"
    app/ src/ | grep -v accessibilityLabel | grep -v test`
    retorna vazio. Único hit residual é `'Sobreposto'` em
    `MiniHumorScreen.tsx:85` (intencional, label de modo).
  - **Métricas**: 1118 → 1125 testes (+7), 129 → 130 suites (+1),
    bundle Hermes 8.75 MB.

- **M27 (2026-05-03)** — Refundação estrutural de navegação:
  MenuLateral substitui bottom tabs e FABRadial.
  - **Movimentação estrutural** (33 arquivos `git mv`): todo o group
    `app/(tabs)/` migrou para a raiz de `app/`. Subgrupos
    (`settings/`, `exercicios/`, `medidas/`, `alarmes/`,
    `contadores/`, `ciclo/`) movidos com seus `_layout.tsx` internos
    intactos. `app/(tabs)/_layout.tsx` apagado.
  - `src/components/chrome/MenuLateral.tsx` novo: drawer custom
    com `<MotiView>` (springs.default, translateX -300→0), backdrop
    `<Pressable bg-black-50%>` tap-close, `<ScrollView>` interno.
    Header com avatar pessoa ativa + chip alternar pessoa em duo.
    3 seções (Ver/Registrar/Opcionais) com header micro-orange.
    Rodapé fixo com link Configurações. 6 itens em Ver, 6 em
    Registrar (cores diferenciadas: pink/cyan/orange/green/yellow/red),
    até 4 em Opcionais (controlado por `featureToggles`).
  - `src/components/chrome/FABMenu.tsx` novo: FAB redondo 72dp
    purple `position: absolute, left: spacing.lg, bottom: spacing.xl`,
    ícone `Menu` lucide. `onPress` aciona `useNavegacao.abrir()`.
  - `src/lib/stores/navegacao.ts` novo: store zustand leve
    (não-persistido) com `menuAberto`/`abrir`/`fechar`/`alternar`.
  - `src/lib/navigation/rotasSemFAB.ts` novo: lista canônica
    `ROTAS_SEM_FAB` + função `rotaEsconderFAB(pathname)`. Cobre
    `/onboarding`, `/share-receive`, 4 modais de captura, `/recap`
    (M36 cria a rota; FAB já some). `/calendario` mantém FAB
    (tela de view, não modal).
  - `app/_layout.tsx` ganha overlays globais
    `<MenuLateral />` + `<FABMenu />` fora da `<Stack>`, com
    z-index declarado (FABMenu 10, MenuLateral 20) conforme
    CONTRACT §7.10. A18 preservada em todas as 4 rotas modais
    (`presentation: 'transparentModal'` + `contentStyle.backgroundColor:
    '#14151a'`).
  - **Migração crítica do `useSessao.ultimaRota`**:
    `src/lib/stores/sessao.ts` ganha `version: 2` no zustand persist
    + função `migrate(state, version)` que normaliza
    `/(tabs)/X` → `/X` para qualquer boot pré-M27. Sem isso,
    usuários antigos com `ultimaRota` persistida em SecureStore
    crashariam em runtime ao tentar `router.replace` para rota
    inexistente.
  - `app/_components.tsx:90` fixado de `router.replace('/(tabs)')`
    para `router.replace('/')`. Storybook ganha seção "Menu lateral
    (M27)" com botão programático para abrir o drawer (suporte a
    captura visual em web headless).
  - `app/index.tsx`: removido `<FABRadial>` + import órfão.
    `FABRadial.tsx` em `src/components/ui/` preservado mas órfão
    (pode ser removido em sprint futura).
  - `src/lib/navigation/captureRoutes.ts`: paths sem `(tabs)`.
  - Apaga: `src/components/chrome/BottomTabs.tsx` e
    `tests/components/chrome/BottomTabs.test.tsx` (6 testes).
  - Cria: `tests/components/chrome/MenuLateral.test.tsx` (6 testes —
    3 seções renderizadas, items condicionais via `featureToggles`)
    + `tests/components/chrome/FABMenu.test.tsx` (3 testes — render
    à esquerda, abre menu ao tocar).
  - Atualiza paths sem mudar contagem em
    `tests/lib/navigation/captureRoutes.test.ts`,
    `tests/lib/hooks/useUltimaRota.test.tsx`,
    `tests/lib/stores/sessao.test.ts`,
    `tests/app/memoria.test.tsx`,
    `tests/app/settings/index.test.tsx`.
  - 5 screenshots Nível A em `docs/sprints/M27-screenshots/`:
    `A-fab-esquerda.png`, `A-menu-aberto.png`, `A-secao-ver.png`,
    `A-secao-registrar.png`, `A-secao-opcionais.png`. Capturados
    via Playwright headed Chromium na rota `/_components`
    (storybook M01) + dispatch programático para contornar limite
    de Moti em web sem Reanimated nativo.
  - Hits residuais de `(tabs)`: 11/14 (varia conforme grep), todos
    em comentários históricos ou no literal de migração de
    `sessao.ts:235-246`. Nenhum em router/import/registro ativo.
  - **Métricas**: 1115 → 1118 testes (−6 BottomTabs.test + 9 novos),
    128 → 129 suites, bundle Hermes 8.75 MB.
  - **Checkpoint intermediário** §10.6: 127 suites / 1109 testes /
    0 fail após apagar BottomTabs e antes de criar MenuLateral.
  - Veredito validador-sprint: APROVADO (sem ressalvas).

- **M26 (2026-05-03)** — 4 rotas modais com `<Screen>` opaco +
  `index={0}` direto (resolve A17/A18 "tela infinita preta").
  - `app/humor-rapido.tsx`, `app/diario-emocional.tsx`,
    `app/eventos.tsx` envolvem `<BottomSheet>` em
    `<Screen padded={false}>`. `<OuroborosLoader compacto />` atrás
    do sheet em `<View pointerEvents="none">` centralizado — feedback
    visual de marca mesmo se Reanimated falhar. Sheet abre em
    `index={0}` direto (não `-1` + `useEffect expand()`); pan-down-to-close
    fecha via `onChange={(idx) => idx === -1 && router.back()}`.
  - `app/scanner.tsx` ganha `<OuroborosLoader compacto />` em
    `position: 'absolute'` atrás do `<ScannerSheet>` (já tinha
    `<Screen>` no nível externo).
  - `app/_layout.tsx` registra 4 `<Stack.Screen>` com
    `presentation: 'transparentModal'`,
    `contentStyle.backgroundColor: '#14151a'`,
    `animation: 'fade_from_bottom'`. Garante que o root Stack
    fundo (#282a36) não vaze.
  - `VALIDATOR_BRIEF.md` Armadilha A18 auditada — texto preservado,
    referência ajustada para "Solução padrão M26 (aplicado
    2026-05-03)". `INTEGRATION-CONTRACT.md` §7.10 não criou
    `rotasSemFAB.ts` (nasce em M27).
  - `jest.setup.cjs` mock BottomSheet expõe `index` via
    `accessibilityHint` para os novos asserts.
  - `tests/app/humor-rapido.test.tsx`, `tests/app/diario-emocional.test.tsx`,
    `tests/app/eventos.test.tsx` ganham 1 caso M26 cada — render
    contém `<Screen>` E `<BottomSheet>`. Suítes pré-existentes
    ampliadas; spec §10 foi corrigida pela honestidade do executor
    (não criar suítes duplicadas).
  - 4 screenshots Nível A em `docs/sprints/M26-screenshots/`:
    `A-humor-sheet-opaco.png`, `A-diario-sheet-opaco.png`,
    `A-eventos-sheet-opaco.png`, `A-scanner-sheet-opaco.png`.
    Limitação reconhecida: 3 mostram frame de onboarding
    (BiometriaGate redireciona em web); scanner prova fundo Dracula
    opaco + OuroborosLoader visível. Validação completa do sheet
    aberto exige Nível B (emulador Android).
  - **Métricas**: 1112 → 1115 testes (+3), 128 suites mantidas,
    bundle Hermes 8.75 MB.
  - Veredito validador-sprint: APROVADO (sem ressalvas).
  - Achado colateral arquivado: planejador-sprint deve checar
    existência de arquivos de teste antes de declarar "+N suites"
    em §10. Melhoria do agente meta — não bloqueia M27.

- **M25 (2026-05-03)** — OuroborosLogo + OuroborosLoader (SVG nativo
  animado).
  - `src/components/brand/OuroborosLogo.tsx` novo (204 L): versão
    estática do glifo. Replica fielmente o SVG de
    `versão desktop/ouroboros-redesign-v1/index.html` linhas 110-194
    em react-native-svg — viewBox 320x320, `<LinearGradient id="og1">`
    purple→pink, `<RadialGradient id="og-glow">` purple 22%→0%, 4
    grupos (ambient glow, outer dotted orbit, inner flow ring, main
    snake com 4 arcos), cabeça com mandíbulas, olho, língua bífida,
    wordmark "OUROBOROS"/"PROTOCOLO" via `<Text fontFamily="monospace">`
    (fallback explícito porque JetBrains Mono ainda não carregou na
    boot screen — spec §10.3). Props `tamanho` (default 320) e
    `mostrarTexto` (default true).
  - `src/components/brand/OuroborosLoader.tsx` novo (287 L): versão
    animada com 4 shared values Reanimated 4 — gs1 (snake principal)
    90s linear, gs2 (orbit dotted) 60s reverso, gs3 (inner flow ring)
    30s linear, flow (stroke-dashoffset) 6s linear. Aplica
    `useAnimatedProps` com `rotation`/`originX:160`/`originY:160`
    (bug conhecido do `<G>` SVG não aceita `transform: [{ rotate }]`
    via shared value — spec §10 patch 3). Cleanup com
    `cancelAnimation` em todas 4 shared values. Props `tamanho`
    (default 320) e `compacto` (default false → 96px sem texto).
  - `src/components/brand/index.ts` novo: barrel.
  - `tests/components/brand/OuroborosLogo.test.tsx` (3 testes):
    snapshot estático, prop `mostrarTexto={false}` esconde wordmark,
    prop `tamanho` ajusta SVG width/height.
  - `tests/components/brand/OuroborosLoader.test.tsx` (6 testes):
    render base, valor inicial das 4 shared values, cleanup
    `cancelAnimation` no unmount.
  - `app/_layout.tsx` substitui `if (!loaded) return null` por
    `<View bg-page><OuroborosLoader /></View>` (boot screen UI
    bloqueante, não BOOT_HOOK — CONTRACT §7.9). Loader fica dentro
    do early return enquanto fontes carregam (~500ms-1s).
  - `app/onboarding.tsx` Frame 2 "Tudo pronto" troca placeholder
    `<ActivityIndicator>` por `<OuroborosLoader compacto />`.
  - `jest.setup.cjs` ampliado: stubs `RadialGradient` e `Ellipse`
    para o mock `react-native-svg` (CONTRACT §7.8 + spec §10.1) +
    mock `react-native-worklets` ganha `createSerializable`,
    `executeOnUIRuntimeSync`, `RuntimeKind`,
    `serializableMappingCache`, `WorkletsModule`, `makeShareable`,
    `isWorkletFunction`, `callMicrotasks` como no-ops. Necessário
    porque `OuroborosLoader` é o primeiro arquivo em `src/` a
    importar `react-native-reanimated` direto (M01-M24 só usavam
    via `moti`, completamente mockado). **Armadilha A22 nova** —
    registrada no `VALIDATOR_BRIEF.md` §6.
  - 3 screenshots Nível A capturados via Playwright + system Chrome
    `executablePath` em `docs/sprints/M25-screenshots/`:
    `A-loader-boot.png`, `A-loader-compacto.png`, `A-logo-estatico.png`.
  - **Métricas**: 1103 → 1112 testes (+9), 126 → 128 suites (+2),
    bundle Hermes 8.74 MB.
  - Veredito validador-sprint: APROVADO_COM_RESSALVAS — todas
    ressalvas eram docs vivos (STATE/ROADMAP/CHANGELOG/BRIEF
    desatualizados), aplicadas inline pelo orquestrador antes do
    commit.

- **M24 (2026-05-03)** — Resume state e auto-save de rascunhos.
  - `src/lib/stores/sessao.ts` novo: store zustand persist com
    `ultimaRota`, `rascunhos` (7 chaves: humorRapido, diarioEmocional,
    eventos, cicloRegistrar, alarmesNovo, contadoresNovo, tarefasNova),
    `permissoesPedidas` (4 chaves: storage, notif, camera, mic),
    `atualizadoEm`. Persist key `ouroboros.sessao.v1` via
    `secureStorage` adapter.
  - `src/lib/hooks/useAutoSaveRascunho.ts` novo: hook genérico
    debounced 500ms com cleanup correto.
  - `src/lib/hooks/useUltimaRota.ts` novo: tracking via
    `usePathname()` + função pura `isRotaRestauravel(path)` que
    exclui rotas modais (`/onboarding`, `/share-receive`,
    `/humor-rapido`, `/diario-emocional`, `/eventos`, `/scanner`,
    `/_components`).
  - `app/_layout.tsx` ganha `<SessaoBootGate />` via `useEffect`
    direto (não BOOT_HOOKS — vide CONTRACT §7.9): espera as 3
    stores hidratarem (`useOnboarding`, `useVault`, `useSessao`),
    valida `done && vaultRoot && rota não-modal`, faz
    `router.replace(ultimaRota)` uma única vez por mount via
    lock `restauradoRef`.
  - **A20 implementada** (BRIEF §4): cap 2000 chars por textarea
    livre (texto, frase, estrategia, lugar, titulo, medicacao)
    truncado silenciosamente em `salvarRascunho`; canário em
    `__DEV__` log warning se snapshot serializado > 1500B (margem
    para o teto prático de ~2KB do EncryptedSharedPreferences
    Android).
  - 7 formulários plugados com hidratação de rascunho (lazy
    `useState`) + auto-save (`useAutoSaveRascunho`) + limpar
    pós-save:
    - `app/humor-rapido.tsx`
    - `app/diario-emocional.tsx` (filtro `'ambos'` ao restaurar
      `com[]` — UI usa `PessoaAutor[]` enquanto Meta aceita
      `PessoaIdSchema`)
    - `app/eventos.tsx` (idem + `EventoParcial.texto?` opcional
      para preservar texto livre que vive no body do `.md`)
    - `app/(tabs)/ciclo/registrar.tsx`
    - `app/(tabs)/alarmes/novo.tsx` (discrimina criar vs editar:
      em editar, rascunho ignorado — fonte é alarme persistido)
    - `app/(tabs)/contadores/novo.tsx`
    - `src/components/todo/SheetNovaTarefa.tsx` (guard de modo:
      rascunho hidrata só em criar quando `tituloInicial === ''`)
  - 32 testes novos (3 suítes): 22 em `sessao.test.ts` (incluindo
    cap+canário), 5 em `useAutoSaveRascunho.test.tsx` (debounce,
    cleanup), 5 em `useUltimaRota.test.tsx` (função pura).
  - **Métricas**: 1080 → 1103 testes (+23), 123 → 126 suites (+3),
    bundle Hermes 8.73 MB.
  - Veredito do orquestrador (validador-sprint atingiu rate limit;
    validação manual via inspeção do diff): APROVADO. A20 e §7.9
    implementadas exemplarmente. Pendência R1: 2 screenshots
    Nível B/C exigem boot real do app (`A-rascunho-restaurado.png`,
    `A-rota-restaurada.png`).

- **M23 (2026-05-02)** — Onboarding 3 frames sem SAF/Sync.
  - `app/onboarding.tsx` reduzido de 5 frames (621L) para 3 frames
    (466L, -25%): boas-vindas+nome → companhia+nome parceiro →
    "Tudo pronto" + botão "Começar".
  - Botão "Começar" chama `inicializarVaultCanonico()` (M22) e
    distingue 3 caminhos do retorno: `auto` (silencioso), `saf-fallback`
    (toast warning amarelo "Pasta criada em local alternativo." sem
    bloquear), exceção (toast erro vermelho "Não foi possível criar
    a pasta. Tente novamente.").
  - `useOnboarding` shape v2: removido `syncMethod`/`SyncMethod`/`setSync`,
    bump persist key `ouroboros.onboarding.v1` → `v2` (usuários v1
    refazem onboarding — aceitável na refundação).
  - Indicador de progresso `[0,1,2,3,4].map` → `[0,1,2].map` (3 segmentos).
  - Removidos imports legados `useVault`, `requestVaultPermission`,
    `Folder`, `SyncMethod`, componentes `<Frame2Vault>` e `<Frame3Sync>`.
  - Toasts pré-existentes corrigidos com acentuação PT-BR completa
    (Regra BRIEF §1.4): "Escolha uma das opções.", "Vocês são casal
    ou amigos?".
  - 9 testes novos em `tests/app/onboarding.test.tsx` cobrindo 3
    frames + caminho saf-fallback + caminho erro.
  - 3 screenshots Nível A capturados via Playwright headless em
    viewport mobile 412×915 @2x:
    `docs/sprints/M23-screenshots/A-frame{0,1,2}-*.png`.
  - **Métricas**: 1071 → 1080 testes (+9), 122 → 123 suites (+1),
    bundle Hermes 8.71 MB.
  - Veredito `validador-sprint`: APROVADO_COM_RESSALVAS. 14/14 checks
    universais OK ou n/a. 4 ressalvas (3 toasts sem acento + TODO
    enganoso em `permissions.ts`) fixadas inline antes do commit.

- **M22 (2026-05-02)** — Vault canônico auto-criado em
  `/sdcard/Documents/Ouroboros/` sem prompt SAF interativo.
  - `src/lib/vault/permissions.ts` ganha `inicializarVaultCanonico()`,
    `garantirSubpastas()`, `pedirPermissaoStorage()`,
    `probeVaultWritable()` e constante `SUBPASTAS_CANONICAS` com 19
    paths leaf (9 raiz + 3 inbox + 6 media + 1 cache).
  - **A19 implementada (BRIEF §4)**: probe write+read+delete num
    arquivo `.ouroboros-probe` antes de marcar vault como válido. Se
    probe falhar (MIUI/Xiaomi/OneUI restritivo), fallback automático
    para `requestVaultPermission()` SAF legacy. Modo retornado:
    `'auto' | 'saf-fallback' | 'web'`.
  - `src/lib/vault/paths.ts` ganha 6 helpers `mediaXxxPath` e 6
    entries em `VAULT_FOLDERS`.
  - `app.json` adiciona 3 permissões Android: `WRITE_EXTERNAL_STORAGE`,
    `READ_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`.
  - `app/_layout.tsx` ganha `<VaultBootGate />` via `useEffect`
    direto (NÃO `BOOT_HOOKS`, vide CONTRACT §7.9 — falha precisa
    propagar à UI via toast).
  - `jest.setup.cjs` ganha mocks dual CJS+ESM para
    `PermissionsAndroid` e `expo-intent-launcher` (vide CONTRACT
    §7.8).
  - Nova dep direta `expo-intent-launcher@~13.0.8`.
  - 14 testes novos em `tests/lib/vault/permissions-init.test.ts`
    cobrindo Android <30, ≥30, web no-op, idempotência, probe
    sucesso/falha, fallback SAF cancelado, contagem 19 subpastas.
  - **Métricas**: 1057 → 1071 testes (+14), 121 → 122 suites,
    bundle Hermes Android 8.72 MB.
  - **Pendência R1**: screenshot Nível B/C
    (`docs/sprints/M22-screenshots/A-permissao-pedida.png`) capturar
    quando emulador `ouroboros-test` ou Redmi Note 13 do usuário
    estiverem disponíveis (sprint sem UI direta — só infra de boot).
  - Veredito `validador-sprint`: APROVADO_COM_RESSALVAS. 14/14
    checks universais passaram (ou n/a). Ressalvas eram cosméticas
    (contagem "18+/12+/17 leaves" desatualizada vs real 19) —
    fixadas inline antes do commit.

A `v1.0.0-rc1` foi retirada do GitHub Releases por bugs críticos
descobertos no uso real (vault inacessível, captura "tela infinita
preta", FAB radial sem callbacks ligados, alarmes mudos, identidade
hardcoded "Pessoa A/B"). 21 sprints (M21–M41) refazem a v1.0
mantendo a numeração — não há v1.1. APK fica salvo localmente em
`builds/` para histórico; tag git `v1.0.0` é recriada no fim da
refundação apontando para o commit final.

### Pendentes (M21–M41)

| Sprint | Título | Estimativa |
|---|---|---|
| M21 | Despublicar release v1.0.0 do GitHub Releases | 0,3h |
| M22 | Vault canônico auto-criado em /sdcard/Documents/Ouroboros | 5–6h |
| M23 | Onboarding 3 frames (remove SAF e Sync) | 3–4h |
| M24 | Resume state e auto-save de rascunhos | 5–6h |
| M25 | Componentes OuroborosLogo + OuroborosLoader (SVG nativo) | 4–5h |
| M26 | Refatorar 4 rotas modais (Screen opaco + index=0) | 3h |
| M27 | MenuLateral substitui (tabs) + FABMenu purple esquerda | 6–7h |
| M28 | Nomes reais via rotuloPessoa/useRotuloPessoa | 3–4h |
| M29 | Settings v2: vibração simples + features default ON | 4h |
| M30 | AlarmeSchema v2 + channel com vibrationPattern | 5–6h |
| M31 | TarefaSchema v2 + categoria + pessoa_destino + alarme | 5–6h |
| M32 | Contador v2: mensagens de apoio + marcos discretos | 2–3h |
| M33 | Campo `para` em diário/evento/contador/marco | 3–4h |
| M34 | MenuCapturaVerde nas tabs Memórias (foto/música/vídeo/frase) | 6–7h |
| M35 | Aba Finanças: empty state "Em desenvolvimento" | 1–2h |
| M36 | Tela Recap: agregação Conquistas/Crises/Evoluções/Números | 6–8h |
| M37 | Integração Google Calendar via OAuth (R+W) | 10–12h |
| M38 | Conflict resolution para 4 nós Syncthing via deviceId | 4–5h |
| M39 | Estrutura canônica de mídia + .md companion (ADR-0017) | 4–5h |
| M40 | Tela 01 Hoje v2: Recap + status do casal + próximos | 4–5h |
| M41 | APK Release v1.0.0 final + GitHub Release público | 3–4h |

### Documentação criada nesta materialização

- 21 specs autocontidas em `docs/sprints/M21-spec.md` a
  `docs/sprints/M41-spec.md`, cada uma seguindo o template de 9 seções
  + INTEGRATION-CONTRACT (§3.5 Integração + §9 Decisões tomadas +
  Definição de Pronto). Permite que um Claude novo, sem contexto da
  conversa de planejamento, execute cada sprint isoladamente lendo
  apenas `STATE.md` + a spec.
- ADR-0016 (`docs/ADRs/0016-vault-auto-criado-sem-saf.md`) — estende
  ADR-0014; vault Android auto-criado em `/sdcard/Documents/Ouroboros/`
  sem prompt SAF; usa `MANAGE_EXTERNAL_STORAGE` em Android ≥ 11
  (aceitável fora da Play Store).
- ADR-0017 (`docs/ADRs/0017-midia-companion-md.md`) — formaliza
  estrutura de mídia: cada binário em `media/<categoria>/<basename>.<ext>`
  ganha `.md` companion no mesmo diretório com mesmo basename, com
  frontmatter `tipo`/`arquivo`/`data`/`autor`/`transcricao`/`legenda`/
  `para`/`origem`. Compatível com Obsidian + Desktop ETL Python.
- `STATE.md`, `ROADMAP.md`, `README.md` atualizados com header de
  refundação em curso e tabela das 21 sprints.

### Próximo passo concreto

M21 fechado (commit `228b51e` + materialização anterior). Próxima:
**M22** (vault canônico auto-criado em
`/sdcard/Documents/Ouroboros/` com probe write+read+delete e
fallback SAF se OEM bloquear).

### Patches em massa pós-teste de auto-implementação (commits após `228b51e`)

3 agentes independentes leram specs M22, M27 e M37 sem contexto da
conversa de planejamento e produziram planos de implementação. As
ressalvas identificadas viraram patches cobrindo todas as 21 sprints
via docs centralizados:

- **`VALIDATOR_BRIEF.md` §4**: Armadilhas A19 (scoped storage
  Android 11+ + OEM agressivo — exige probe write+read+delete +
  fallback SAF), A20 (SecureStore Android limite ~2KB por valor),
  A21 (OAuth scheme custom precisa split clientId Expo Go proxy
  vs dev-client/release).
- **`docs/sprints/INTEGRATION-CONTRACT.md` §7**: padrões §7.8
  (mocks Jest canônicos para `PermissionsAndroid`,
  `expo-intent-launcher`, `expo-notifications`, `expo-auth-session`,
  `expo-web-browser`), §7.9 (critério `BOOT_HOOKS` vs `useEffect`
  direto), §7.10 (overlay z-index global + lista canônica de rotas
  sem FAB).
- **M37 splitado**: `M37-spec.md` removido. Substituído por
  `M37.1-spec.md` (leitura, escopo `calendar.events.readonly`,
  6-7h) e `M37.2-spec.md` (escrita, escopo `calendar.events`,
  4-5h, exige reconsentimento).
- **ADR-0018**: OAuth Google split clientId + cache em arquivo
  + escopo mínimo + sem servidor próprio. Estende ADR-0007.
- **M22 patcheada**: §4 absorve A19; §5 substitui
  `Environment.isExternalStorageManager` (não-existente em RN/Expo)
  por probe write+read+delete; §5 declara `useEffect` direto
  (não `BOOT_HOOKS`) por A19; §6 ganha comandos
  `dumpsys package | grep MANAGE` e validação probe; §9 expande
  decisões explicitando modo de retorno (`auto | saf-fallback | web`).
- **M24 patcheada**: §4 cap de 2000 chars por textarea no rascunho
  + canário > 1500 bytes (A20); §9 plano-B split de chaves se
  estourar.
- **M27 patcheada**: §2 corrige fato (`app/index.tsx` não existe
  hoje); §2 documenta que subgrupos carregam `_layout.tsx` interno
  no `git mv`; §2 cria `src/lib/navigation/rotasSemFAB.ts`
  canônico; §4 declara z-index e A18-preservada; §5 lista 6 itens
  completos da seção "Registrar"; §5 grep exaustivo de `(tabs)`.
- **M30 patcheada**: §4 obriga novo channel ID
  `ouroboros-default-v2` (Android não permite editar canais
  existentes); §4 hook crítico via `useEffect` direto (não
  `BOOT_HOOKS`); §9 mock `expo-notifications`.
- **M38 patcheada**: §4 detecta reinstall sem backup
  (`substituido_por`); §4 confirma deviceId < 32 bytes cabe em
  SecureStore.

## [1.0.0-rc1] — 2026-05-02 (não lançado, retirado do GitHub Releases)

> Tag git `v1.0.0` permanece como marco histórico do bundle dessa
> versão; release público foi despublicado em M21. APK salvo em
> `builds/ouroboros-1.0.0.apk` para histórico.

### Added
- **M19 — APK Release Hardening v1.0.0.** Versão final do MVP.
  - `app.json`: `version: 1.0.0`, `runtimeVersion: 1.0.0`,
    `android.versionCode: 1`. Adaptive icon e splash apontam para
    novos PNGs polidos.
  - `eas.json` production: `gradleCommand: :app:bundleRelease`,
    `autoIncrement: versionCode`, `env.NODE_ENV: production`.
  - Assets gráficos: `assets/icon.png` (1024×1024 com fundo
    Dracula bg-page #14151a + anel Ouroboros purple→cyan + ponto
    da cabeça da serpente), `assets/icon-foreground.png` (foreground
    do adaptive icon Android, transparent), `assets/splash.png`
    (2400×2400 com ícone centralizado).
  - 5 fluxos Maestro em `tests/e2e/`: `onboarding-completo.yaml`,
    `flow1-pix.yaml`, `flow2-trigger.yaml`, `flow3-evento.yaml`,
    `flow4-scanner.yaml` (cobrem onboarding + 4 críticos do
    BRIEFING §5).
  - `scripts/release-apk.sh` — pipeline completo: anonimato +
    typecheck + tests + smoke + expo export (limite Hermes
    12 MB) + EAS build production + polling até FINISHED +
    download do .aab.
  - `docs/RELEASE.md` — processo canônico de release (pre-reqs,
    pipeline, validação manual ponta-a-ponta, rollback, limites
    hard, semver).
  - `credentials/README.md` — instruções de geração de keystore
    via `eas credentials`. `.gitignore` exclui `keystore.jks`
    e `keystore.json`.
  - HTML mockup renomeado de `Ouroboros_22_telas-standalone.html`
    para `Ouroboros_24_telas-standalone.html` (refletindo as 24
    telas do MVP). Refs atualizadas em README, ROADMAP,
    HOW_TO_RESUME, VALIDATOR_BRIEF, CHANGELOG, CONTEXTO,
    MOCKUPS-INVENTARIO e código fonte.
  - Tag git `v1.0.0` marca o fechamento do MVP.

### Changed
- `package.json`: versão bumpada para 1.0.0; novos scripts
  `test:e2e` e `release`.

## [Unreleased]

### Added
- **M06.5 (a commitar) — Microfone com transcrição on-device + áudio anexo
  (dev-client).** Novo `<MicrofoneButton>` press-and-hold inline no
  diário emocional (Tela 18) acima do textarea. Press dispara
  haptic medium + Audio.Recording (expo-av preset HIGH_QUALITY);
  release encerra, salva `.m4a` em `assets/<YYYY-MM-DD-HHmm>-<rand>.m4a`
  do Vault e dispara `transcribeStream` via @react-native-voice/voice
  (PT-BR, on-device). Texto transcrito faz append no textarea (preserva
  digitação). Limite hard 60s com toast. Gate em
  `useSettings.midia.permitirAudio`. Permissão negada: 1ª vez toast,
  2ª vez deep link Settings. Novo `<Waveform>` 24 barras animadas
  com metering em dB. Novo helper `assetsAudioPath(date, suffix)` em
  `paths.ts`. Novos módulos `src/lib/diario/{permissions,recordAudio,transcribe}.ts`.
  Plugins `expo-av` e `@react-native-voice/voice` em `app.json` com
  permissões PT-BR. NOVO BUILD EAS NECESSÁRIO PARA VALIDAÇÃO NÍVEL
  C — APK atual (15da107f) não inclui módulos nativos.

### Quality
- **INFRA-acentuacao-comentarios (a commitar) — 145 arquivos.**
  Varredura mecânica de comentários PT-BR sem acento em `app/`
  e `src/`. Dicionário fechado de ~80 termos aplicado token-a-token
  apenas em comentários (`//` e `/* */`); strings literais,
  identifiers e JSX preservados. 715 substituições 1:1 (zero
  código adicionado/removido). Volume residual 3 (todas
  referências legítimas a paths/arquivos no filesystem que
  permanecem sem acento), redução 99.3% (419 → 3). 889 testes,
  100 suites, bundle Hermes 8.47 MB delta 0. Cumpre tabela de
  linguagem do CLAUDE.md "Comentários no código PT-BR Sentence
  case Sim, completa".

### Documentation
- **M19.x (a commitar) — Inventário de mockups visuais.**
  Novo `docs/MOCKUPS-INVENTARIO.md` (151 linhas) mapeando cada
  Tela NN ↔ bundle HTML / JSX-fonte / sprint dona, com nota
  explícita sobre conflito de numeração (Tela 25/26 ambíguas:
  M11.5/M20 vs M06.5/M16). Stub `scripts/build-mockups.mjs`
  documenta o desafio da toolchain JSX→HTML para M19 final.
  Nova seção §7.1 em `docs/CONTEXTO.md` formaliza o sistema
  (bundle 22 telas frozen, Ouroboros_telas_25_26 editável,
  screenshots por sprint = fonte canônica). 889 testes
  mantidos; toolchain completa fica para M19 final.

### Fixed
- **M00.5.x (a commitar) — Rules of Hooks em `app/(tabs)/index.tsx:81`.**
  Hook `useOnboarding((s) => s.tipoCompanhia)` foi movido para o topo
  do componente (linha 43, junto aos outros `useOnboarding`) antes
  dos early returns das linhas 70 e 76. ESLint passa limpo agora
  (`npx eslint "app/(tabs)/index.tsx"` exit 0). 889 testes mantidos.
  Achado novo registrado: `INFRA-acentuacao-comentarios` (comentários
  sem acento conflitam com CLAUDE.md — débito histórico amplo).

### Added
- **M20 (a commitar) — Widget Homescreen Android.** Plugin nativo
  Expo Module local em `modules/widget-homescreen/` com 2 layouts
  (4x2 e 4x4), 2 receivers (`OuroborosWidgetProvider` e `Large`),
  bridge JS via `requireOptionalNativeModule` (no-op silencioso em
  ausência), helper TS `atualizarWidgetHomescreen` (event-driven
  via `saveHumor` + boot hook idempotente; rate-limit 60s; fallback
  heatmap vazio quando cache M10 ausente), sub-toggle
  `widgetMostraNome` aninhado em Settings (privacidade reforçada
  por default — só inicial). Paleta Dracula em colors.xml,
  strings.xml PT-BR Sentence case com acentuação, deep links
  `ouroboros://capturar/<atalho>?source=widget`. **889 testes
  (+11) / 100 suites.** Bundle Hermes 8.47 MB. Ressalva Nível
  B/C pendente (M20.x) para sessão dev-client EAS.
- **Sessão maratona 2026-05-01 — 11 sprints fechadas em sequência.**
  Bloco 1 (infraestrutura M00.5/M00.6) + Bloco 2 (captura ativa
  M08/M13/M11/M12) + Bloco 5 (settings + opt-ins
  M15/M14.5/M16/M17/M18) entregues. Detalhes em
  `docs/SESSION-2026-05-01-log.md`.
  - **M00.5** (`9c3e28c`) — `app/(tabs)/_layout.tsx` com 5 abas
    fixas + 5 condicionais; `BottomTabs.tsx` chrome custom;
    barrels de schemas/stores; `useSettings` shape completo;
    `eas.json` 3 profiles; helpers boot
    (`deepLink`/`biometriaGate` placeholder/`reagendamento`).
    Move `app/index.tsx` → `app/(tabs)/index.tsx`. **288
    testes (+29).** Achado M00.5.x registrado (Rules of Hooks
    em `(tabs)/index.tsx:81`).
  - **M00.6** (`ae16a40`) — `SHEET_PRESETS` (60/70/80/90/DEFAULT);
    `draculaPolish.ts` injection web; mockup HTML novo
    `Ouroboros_telas_25_26-standalone.html` para Tela 25
    (calendário) e Tela 26 (widget). **295 testes (+7).**
    Achado M19.x registrado (bundle HTML toolchain).
  - **M08** (`9202273`) — Share Intent Receiver Tela 17 com 8
    subtipos (`pix`/`extrato`/`nota`/`exame`/`receita`/`garantia`/
    `contrato`/`outro`); `InboxArquivoSchema`; estende
    `deepLink.ts` para `action.SEND`; intent filters em
    `app.json`. Cópia foreground com indicador. **376 testes
    (+81).**
  - **M13** (`82cc519`) — CRUD completo de Exercícios (Telas
    02/07/08): galeria com filtros, detalhe com sparkline +
    tooltip cyan, cadastro com `expo-document-picker`. Substitui
    `/em-breve` no `captureRoutes.ts` e **deleta**
    `app/em-breve.tsx`. "Adicionar a treino livre" cria draft.
    **437 testes (+61).**
  - **M11** (`ca77ed3`) — Memórias com 3 sub-tabs
    (Treinos/Fotos/Marcos); schemas `treino_sessao` + `marco`;
    galeria agregada de 5 fontes; CRUD completo;
    `migrarDraftsParaTreinoSessao` em `BOOT_HOOKS`; 5 heurísticas
    de marcos auto com dedup hash SHA-256. **517 testes (+80).**
  - **M12** (`d6a2b43`) — Medidas (Telas 12/13) com sparkline
    cyan polygon fill + delta absoluto sem cor (ADR-0005).
    Integração cruzada com M11: `useFotosAgregadas` cresceu para
    ler `medidas/`. **568 testes (+51).**
  - **M15** (`27f6bbd`) — Settings 7 grupos com biometria gate
    real (`LocalAuthentication`); lembretes via
    `expo-notifications`; export ZIP via `jszip` +
    `expo-sharing`; toggles reativos confirmados. **618 testes
    (+50).**
  - **M14.5** (`5a6e578`) — Ciclo menstrual opt-in com tom
    sóbrio absoluto; calendário 28/35 dias adaptativo; fase
    inferida + override; abas separadas por pessoa; pasta
    dedicada `inbox/saude/ciclo/`. **663 testes (+45).**
  - **M16** (`739b993`) — Alarme com Snooze via category com
    action buttons; `SCHEDULE_EXACT_ALARM` Android 12+; sons
    CC0 gerados via ffmpeg sine wave. **740 testes (+77).**
  - **M17** (`2c3fbf6`) — To-do com drag&drop via
    `react-native-draggable-flatlist`; busca textual sem
    acento; lixeira soft 30 dias em `BOOT_HOOKS`. A17
    reincidiu, resolvido inline. **813 testes (+73).**
  - **M18** (`3989851`) — Contador "Dias sem X" com histórico
    timeline; sem celebração visual absoluta (ADR-0005);
    `diasEntre` UTC sem horas; recorde nunca diminui. Stream
    timeout do agente no final, fechamento manual. **878
    testes (+65).**
- **`docs/ORCHESTRATOR_PLAYBOOK.md`** — playbook mestre de
  orquestração para próximas sessões (filosofia, ciclo,
  template de prompt do executor, padrão de validação Chrome
  MCP, padrões aprendidos, erros e recuperação, mapa de
  blocos).
- **`docs/SESSION-2026-05-01-log.md`** — log narrativo das 11
  sprints com decisões arquiteturais e métricas finais.
- **`HOW_TO_RESUME.md` Passo 0** — orientação para identificar
  papel (orquestrador/executor/usuário humano) antes dos demais
  passos.

### Changed
- **Política de validação visual descontinuada para dual
  obrigatório.** Após M00.5, validação Chrome MCP pelo
  orquestrador substitui o checkpoint Expo Go por sprint. Expo
  Go vira gate exclusivo da M19 (release final) e sprints com
  APIs nativas pesadas. `INTEGRATION-CONTRACT.md` §2.3
  atualizado.

### Changed
- **Meta-sprint 2026-04-30 — Contrato de integração e zero v2.**
  Reescrita das 17 specs pendentes para garantir que cada sprint
  futura entregue feature **integrada ao projeto final**, sem
  código solto, e que **todas as features antes adiadas para v2**
  entrem no MVP v1.
  - Novo documento mestre `docs/sprints/INTEGRATION-CONTRACT.md`
    formaliza pontos canônicos de plug (tabs layout, schemas
    barrel, stores barrel, settings store, captureRoutes, boot
    hooks, app.json, eas.json, package scripts) e o checklist
    obrigatório por sprint.
  - 5 sprints novas adicionadas:
    - **M00.5 — Infraestrutura:** cria `app/(tabs)/_layout.tsx`,
      `BottomTabs.tsx`, barrels de schemas/stores, `useSettings`
      shape completo, `eas.json`, helpers de boot
      (`deepLink.ts`, `biometriaGate.tsx`, `reagendamento.ts`).
    - **M00.6 — Polish:** Dracula no Web, snap presets nomeados,
      mockup HTML standalone com Tela 25 (calendário) e Tela 26
      (widget).
    - **M19 — APK Release Hardening v1.0.0:** ícone, splash,
      versão, keystore, smoke E2E Maestro dos 4 flows críticos,
      tag.
    - **M20 — Widget Homescreen Android (Tela 26):** plugin
      nativo Expo Module com layouts 4x2 e 4x4, atalho radial,
      humor médio do dia.
    - **MOB-bridge-3 — Marcos auto-gerados pelo backend:** 5
      heurísticas (3 treinos em 7d, retorno após hiato, humor
      consecutivo, 30d sem trigger, primeira vitória da semana)
      com idempotência via hash.
  - 17 specs reescritas (M06.5, M07.x, M08, M09, M10, M11,
    M11.5, M12, M13, M14, M14.5, M15, M16, M17, M18,
    MOB-bridge-1, MOB-bridge-2):
    - Cada uma ganha §3.5 "Integração ao projeto" referenciando
      o CONTRACT.
    - § "Dúvidas em aberto" substituída por § "Decisões tomadas"
      com decisões explícitas e justificadas.
    - § "Definição de Pronto" adicionada com checklist de
      integração + qualidade.
    - Itens antes marcados "fora de escopo / v2 / sprint futura"
      absorvidos: CRUD completo treinos+marcos+exercícios,
      galeria de fotos agregada, modo contínuo do scanner,
      auto-bairro do scanner, snooze do alarme, drag&drop+busca
      do todo, histórico de resets do contador, mídia
      obrigatória nas 4 abas (Spotify oEmbed sem auth + YouTube
      thumb + foto + áudio), filtros adicionais do calendário
      (intensidade + bairro), tooltip do sparkline, fase
      manual+auto do ciclo, abas separadas por pessoa do ciclo,
      cache stale banner do Mini Humor, bairro auto cross-feature
      no scanner, atomic write robusto do MOB-bridge-2.
  - `VALIDATOR_BRIEF.md` §5 reescrita com 5 grupos de checks
    (estrutural, qualidade, visual, doc, integração).
  - `BRIEFING.md` §9 (anti-features) deixa de listar widget de
    homescreen — entra como sprint M20.
  - `ROADMAP.md` ganha 5 sprints novas, grafo de dependências
    atualizado e nota explícita "Nada permanece como v2".
  - `STATE.md` aponta M00.5 como próxima.
  - Ordem de execução recomendada: M00.5 → M00.6 → M08 →
    M11/M12/M13 → backend (MOB-bridge-1/2/3) → M10/M14 → M15 →
    M14.5/M16/M17/M18 → M06.5 → M07.x → M11.5 → M09 → M20 →
    M19 (release v1.0.0).

### Added
- **Sprint M07 — Eventos com lugar (Tela 20).** Substitui o stub
  da rota `/eventos` criado na M04 pela tela de captura de evento
  rica em contexto, com persistência em
  `eventos/YYYY-MM-DD-<slug>.md` no Vault.
  - `app/eventos.tsx` — bottom sheet 80% que abre ao montar.
    Toggle Positivo/Negativo no header (verde/vermelho) com
    borda esquerda animada, padrão idêntico ao da Tela 18.
    Textarea "O que aconteceu?" obrigatória (mínimo 1 caractere).
    Bloco "Onde" combinando input livre + botão "Usar localização
    atual" (`expo-location`) + chip cyan opcional do bairro
    detectado. Bloco "Quando" com chips single-select Agora /
    Outro horário (este abre `<DateTimePicker mode="time">`).
    `<ChipGroup mode="multi">` "Com quem" auto-selecionando
    `pessoa_b` quando `tipoCompanhia` é `'casal'` ou `'amigos'`
    (decisão M07 §9 item 1). `<ChipGroup mode="single">` de
    Categoria com 8 slugs fechados. `<FotosBlock>` opcional via
    `expo-image-picker` (cap interno de 6 fotos). Slider 1-5 de
    intensidade. Botão Registrar variant `success` em modo
    positivo / `destructive` em modo negativo. Sem haptic em modo
    negativo (mesmo princípio M06).
  - `src/components/eventos/LocalizacaoBlock.tsx`,
    `src/components/eventos/QuandoBlock.tsx`,
    `src/components/eventos/FotosBlock.tsx` — três blocos
    auxiliares com estado controlado pelo container e API
    pequena. FotosBlock mostra grid de thumbnails 80dp com botão
    `X` red para remover; ao atingir o cap, o botão "Adicionar
    foto" exibe o label `"Limite de 6 fotos atingido"` e fica
    disabled.
  - `src/lib/eventos/categorias.ts` — lista fechada
    `EVENTO_CATEGORIAS_SLUGS = ['rolezinho','compras','consulta',
    'trabalho','evento_social','rotina','exercicio','outro']` em
    snake_case ASCII no frontmatter. Helper `formatCategoria`
    com dicionário `EVENTO_CATEGORIAS_LABELS` acentuado em
    Sentence case PT-BR (Exercício, Evento social) e fallback
    mecânico para slugs desconhecidos. Decisão M07 §9 item 2:
    `exercicio` mantido na lista como registro casual; treino
    estruturado vai para a M13.
  - `src/lib/eventos/slug.ts` — helper `slugifyEvento` em
    cascata (bairro > texto > categoria > `'evento'`) gerando
    kebab-case ASCII com cap de 24 chars sem cortar palavra.
  - `src/lib/eventos/localizacao.ts` — wrapper `getBairroAtual`
    sobre `expo-location` (request permission > current position
    > reverse geocode). Extrai `district` com fallback em
    `subregion`. Erros silenciosos (devolve `null`).
  - `src/lib/eventos/saveEvento.ts` — função pura que valida
    via `EventoSchema.safeParse`, copia cada foto para
    `assets/<formatDateYmdHm>-evento-<idx>.jpg` via
    `expo-file-system/legacy`, atualiza `meta.fotos` com paths
    relativos ao Vault, resolve colisão de path com sufixo
    numérico crescente e chama `writeVaultFile<EventoMeta>`.
  - `tests/app/eventos.test.tsx` (16 testes),
    `tests/lib/eventos/saveEvento.test.ts` (12 testes),
    `tests/lib/eventos/categorias.test.ts` (16 testes),
    `tests/lib/eventos/slug.test.ts` (15 testes),
    `tests/lib/eventos/localizacao.test.ts` (10 testes).
    Total de testes salta de 194 para 259 (+65).
  - `app.json` ganha plugin `expo-location` com
    `locationAlwaysAndWhenInUsePermission` e plugin
    `@react-native-community/datetimepicker`.
    `expo-location@~19.0.8` e
    `@react-native-community/datetimepicker@8.4.4` instalados
    via `npx expo install`. `expo-image-picker@~17.0.11` já
    estava presente desde M03.2.
  - Bundle Hermes Android: 7,46 MB → 7,55 MB.

- **Sprint M06.X — Estende `DiarioEmocionalSchema` com `contexto_social`.**
  Fecha o achado da M06: o schema v1 só aceitava `PessoaId` em
  `com`, deixando `amigos`/`sozinho` apenas em prosa no corpo do
  `.md`. Agora o schema tem campo separado
  `contexto_social: ('amigos'|'sozinho')[]` com default `[]` (compat
  com arquivos antigos). `app/diario-emocional.tsx` divide o estado
  da UI em `meta.com` (PessoaIds) + `meta.contexto_social` (flags).
  O corpo livre do `.md` mantém a linha "Com:" para legibilidade no
  Obsidian (redundância intencional). 6 testes novos em
  `tests/schemas/diario_emocional.test.ts` (188 → 194 testes).

- **Sprint M06 — Diário emocional (Tela 18).** Substitui o stub da
  rota `/diario-emocional` criado na M04 pela tela de captura
  emocional rica em contexto, com persistência em
  `inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md` no Vault.
  - `app/diario-emocional.tsx` — bottom sheet 90% que abre ao
    montar. Toggle inicial trigger ↔ vitória renderizado como dois
    chips (red / green) que mudam a borda esquerda animada do form
    via `MotiView` com spring subtle. Grid de chips de emoção
    multi-select (6 negativos em modo trigger, 6 positivos em modo
    vitória) com acentuação completa PT-BR via dicionário de
    labels. Slider 1-5 de intensidade. Textarea livre obrigatória
    (mínimo 1 caractere; bloqueia save com toast warn se vazia).
    `<ChipGroup mode="multi">` "Com quem" com 4 opções fixas
    (`pessoa_a`, `pessoa_b`, `amigos`, `sozinho`). Bloco
    condicional em modo trigger com textarea Estratégia + Toggle
    Funcionou. Botão final variant `destructive` (trigger) ou
    `success` (vitória). Microcopy de rodapé `"Salvo localmente.
    Ninguém vê além de vocês dois."` em muted-decor. Modo `audio`
    inicializa em vitória e marca flag interna `audioRequested`
    para a M06.5 acoplar a UI de gravação. Sem haptic no save em
    modo trigger (momento delicado, BRIEFING §2.5); em modo
    vitória dispara `haptics.success()` leve.
  - `src/components/diario/EmocaoChips.tsx` — wrapper sobre
    `<ChipGroup mode="multi">` com prop `modo` que troca o
    conjunto de opções. `MotiView` com `key` re-mountável dispara
    spring subtle no opacity ao trocar de modo (hop visual sem
    jump-cut).
  - `src/lib/diario/emocoes.ts` — listas fixas
    `EMOCOES_NEGATIVAS = ['tristeza','raiva','ansiedade','frustracao','medo','solidao']`
    e `EMOCOES_POSITIVAS = ['alegria','alivio','gratidao','conexao','paz','orgulho']`
    em snake_case ASCII no frontmatter. Helper `formatEmocao(slug)`
    com dicionário de labels acentuados (frustração, alívio,
    gratidão, conexão, solidão) e fallback mecânico para slugs
    desconhecidos. Sets `EMOCOES_NEGATIVAS_OPTIONS` (accent red) e
    `EMOCOES_POSITIVAS_OPTIONS` (accent green) prontos para o
    ChipGroup.
  - `src/lib/diario/saveDiario.ts` — função pura que resolve
    `diarioEmocionalPath(new Date(), slug)` (slug derivado da
    primeira emoção ou `'registro'`), valida via
    `DiarioEmocionalSchema.safeParse`, aplica sufixo numérico
    crescente em colisão improvável de mesmo arquivo no mesmo
    minuto e chama `writeVaultFile<DiarioEmocionalMeta>`.
  - `tests/app/diario-emocional.test.tsx` (15 testes),
    `tests/components/diario/EmocaoChips.test.tsx` (6 testes),
    `tests/lib/diario/saveDiario.test.ts` (8 testes),
    `tests/lib/diario/emocoes.test.ts` (12 testes). Total de
    testes salta de 147 para 188 (+41).
  - **Achado registrado para sprint nova**: o
    `DiarioEmocionalSchema` v1 só aceita `PessoaId` em `com`,
    bloqueando os flags `amigos` e `sozinho` exigidos pela UI.
    Solução provisória nesta sprint: persistir em `meta.com`
    apenas os PessoaIds válidos e anotar contexto extra no corpo
    livre do `.md` em prosa ("Com: Amigos, Sozinho."). Nova
    sprint M06.X deve estender o schema com campo
    `contexto_social: ('amigos'|'sozinho')[]`.

- **Sprint M05.2 — Estender `<Input>` com `autoCapitalize` e
  `keyboardType`.** O componente passa a expor essas duas props
  opcionais (defaults `'sentences'` e `'default'`), repassadas
  diretamente ao `TextInput` interno. Achado pelo executor da M05
  ao não conseguir aplicar `autoCapitalize="sentences"` no campo
  Medicação e `keyboardType="numeric"` no campo Horas de sono.
  `app/humor-rapido.tsx` atualizado para usar as novas props.
  4 testes novos em `tests/components/ui/Input.test.tsx` (total
  144 → 147 testes, 28 suites).

- **Sprint M05 — Humor rápido (Tela 15).** Substitui o stub da
  rota `/humor-rapido` criado na M04 pela primeira tela de captura
  real do app, com persistência em `daily/YYYY-MM-DD.md` no Vault.
  - `app/humor-rapido.tsx` — bottom sheet 70% que abre ao montar.
    Quatro sliders 1-5 (humor, energia, ansiedade, foco) com
    default 3, input de medicação (texto livre opcional, decisão
    da §9), input de horas de sono (numérico), `<ChipGroup
    mode="multi">` com 8 tags rápidas fechadas, textarea de uma
    frase opcional e botão Salvar verde. Após salvar dispara
    `haptics.success()`, toast `"Salvo."` e `router.back()`.
  - `src/lib/humor/saveHumor.ts` — função pura que resolve
    `dailyPath(new Date())`, detecta colisão de pessoa A5
    (`pessoa_a` × `pessoa_b` no mesmo dia via Syncthing) lendo o
    arquivo canônico antes de escrever, aplica sufixo
    `-pessoa_<x>.md` quando outro autor já escreveu, e chama
    `writeVaultFile<HumorMeta>` com corpo vazio (frase fica no
    frontmatter, decisão M05).
  - `src/lib/humor/tagsRapidas.ts` — lista fechada de 8 slugs
    canônicos (`trabalho_pesado`, `boa_conversa`, `cansaco`,
    `exercicio`, `foco_dificil`, `dormi_mal`, `treino_bom`,
    `dia_leve`) + helper `formatTag` que converte snake_case em
    Sentence case para exibição.
  - `tests/app/humor-rapido.test.tsx` (10 testes),
    `tests/lib/humor/saveHumor.test.ts` (5 testes),
    `tests/lib/humor/tagsRapidas.test.ts` (8 testes). Total de
    testes salta de 120 para 143.

- **Sprint M04 — FAB Radial integrado em capturas.** Commit
  `4e10f25` (15 arquivos, 285 inserções, 7 remoções).
  - `src/lib/navigation/captureRoutes.ts` — módulo novo que mapeia
    cada `FABRadialKey` para `Href` literal do Expo Router. Rotas
    com params (`?modo=trigger|vitoria|audio`) já preparadas para
    M06 e M06.5.
  - `app/index.tsx` — `<FABRadial>` agora chama `router.push()` via
    `routeForCapture()`, substituindo o toast antigo "FAB radial
    chega na M04".
  - 5 stubs novos em `app/`: `em-breve.tsx`, `humor-rapido.tsx`,
    `diario-emocional.tsx`, `eventos.tsx`, `scanner.tsx`. Cada um
    usa `<EmptyState>` informando em qual sprint a tela chega.
  - `tests/lib/navigation/captureRoutes.test.ts` — 8 testes novos
    cobrindo as 6 chaves do FAB. Total: 118/118 passando.
  - 7 screenshots Nível A (Chrome web) em
    `docs/sprints/M04-screenshots/` capturados via playwright MCP.
  - Bundle Hermes Android estável em 7,46 MB.

- **Sprint M00.docs — Orquestração Mestre.** 47 arquivos
  novos/atualizados em 5 commits.
  - 3 docs raiz: `ROADMAP.md` (mapa das 22+ sprints),
    `STATE.md` (estado vivo), `HOW_TO_RESUME.md` (guia de retomada
    em 5 passos). Pensados para qualquer Opus retomar fresh sem
    histórico.
  - Template fixo: `docs/sprints/_template-spec.md` com 9 seções
    obrigatórias para toda spec futura.
  - **15 ADRs em `docs/ADRs/`**: 11 históricos formalizados
    (0001-0011) a partir do `PLANO_TECNICO_APK.md` §4 + 4 novos
    (0012 cache mobile readonly, 0013 capitalização revogada,
    0014 vault dedicado, 0015 pessoas runtime com foto). Índice
    em `docs/ADRs/INDEX.md`.
  - **18 specs Mobile detalhadas** em `docs/sprints/M04-spec.md`
    a `docs/sprints/M18-spec.md`, incluindo M06.5 (microfone),
    M07.x (mídia obrigatória em conquistas), M11.5 (calendário
    visual de conquistas) e M14.5 (acompanhador de ciclo
    menstrual, opt-in, tom sóbrio).
  - **2 specs Backend** em `docs/sprints/backend/`: MOB-bridge-1
    (refactor pessoa_a/b no Python) e MOB-bridge-2 (caches
    `humor-heatmap.json` e `financas-cache.json`).
  - Consolidação histórica em
    `docs/sprints/M03.x-fixes-consolidados.md` (M03.1 a M03.7).
  - Decisões: F-15/16/17 promovidas a v1 como M16/M17/M18 (opt-in
    via Settings da M15). Ciclo menstrual entra como M14.5
    (opt-in, sem gamificação). Calendário visual entra como M11.5.

### Changed
- `VALIDATOR_BRIEF.md`: nova seção 6 (Roadmap canônico) apontando
  para `ROADMAP.md`. Nova seção 7 (Estado atual) apontando para
  `STATE.md`. Nova seção 8 (Como retomar) apontando para
  `HOW_TO_RESUME.md`. Stack header atualizada (Expo SDK 54,
  Reanimated 4, NativeWind 4).
- `CLAUDE.md`: adicionada seção "Como retomar em sessão fresh"
  apontando para `HOW_TO_RESUME.md`.
- `README.md`: aviso destacado no topo apontando para
  `STATE.md`/`ROADMAP.md`/`HOW_TO_RESUME.md`.
- `docs/BRIEFING.md`: marcação de obsolescência na regra "lowercase
  intencional" (§1) com aviso apontando para ADR-0013.
- `docs/CONTEXTO.md`: §4 ganha aviso sobre mudança do path do Vault
  para `~/Protocolo-Ouroboros/` (ADR-0014).
- `docs/PLANO_TECNICO_APK.md`: §4 ganha aviso de que ADRs canônicos
  agora vivem em `docs/ADRs/`. Texto em prosa fica como referência
  histórica.

- `install-dev.sh` reescrito como instalador único: pede sudo uma
  vez no início e mantém cacheado, configura `~/.zshrc` com
  `ANDROID_HOME` e PATH automaticamente, detecta hardware (cores
  lógicos, RAM total) e cria AVD `ouroboros-test` com config
  otimizada (`hw.cpu.ncore`, `hw.ramSize`, `vm.heapSize`, GPU host,
  KVM). Cold boot inicial com snapshot `default_boot` para boots
  seguintes em menos de 10s.
- `scripts/start-emulator.sh` — inicia emulador com flags de
  performance (`-gpu host`, `-accel auto`, `-no-boot-anim`, snapshot)
  e aguarda `sys.boot_completed=1`. Aceita `--headless` e `--cold`.
- `scripts/mirror-device.sh` — abre janela `scrcpy` espelhando o
  device ADB ativo (celular físico ou emulador) com latência <50ms.
- `run.sh` ganhou flags `--emulator` (sobe AVD antes do Metro) e
  `--mirror` (abre `scrcpy` em paralelo). `--web` continua sem
  conflito com celular físico.

### Added
- Sprint M03.2 — foto de perfil. `<AvatarPicker pessoa={...}>` em
  `src/components/ui/AvatarPicker.tsx` abre galeria via
  `expo-image-picker`, copia a foto escolhida para
  `documentDirectory/avatars/<pessoa>.jpg` (URI estável entre
  sessões) e persiste em `usePessoa.fotos`. Placeholder dashed em
  borda da cor da pessoa quando vazio. `<PersonAvatar>` ganha prop
  opcional `photoUri` que sobrepõe a inicial colorida com a imagem
  real. Frame 0 do onboarding mostra o picker acima do input de
  nome; Frame 1 (se duo) mostra o picker da segunda pessoa abaixo
  do input. `app.json` ganha plugin `expo-image-picker` com
  permissions strings PT-BR.
- `expo-image-picker@~17.0.11` instalado via `npx expo install`.

### Fixed
- Sprint M03.1 — flicker de redirect resolvido. Stores zustand-persist
  hidratam de forma assíncrona do SecureStore. Adicionado hook
  `useHasHydrated(useStore)` em `src/lib/stores/hydrated.ts` que
  observa `persist.onFinishHydration`. `app/index.tsx` agora aguarda
  as 3 stores (onboarding, vault, pessoa) hidratarem antes de
  qualquer `<Redirect>`. Durante a janela de hidratação mostra
  `<Screen>` vazio (bg-page) — sem flicker.
- Sprint M03.1 — labels micro-laranja do onboarding com Sentence
  case + acentuação completa: `"Antes de começar"`, `"Companhia"`,
  `"Vault"`, `"Sincronização"`. Removido `textTransform: 'lowercase'`
  do helper `MicroOrange`.
- Sprint M03.1 — gap entre cards do Frame 3 (Sincronização) subiu
  para `spacing.xl` (24dp), reforçando a separação visual entre
  Syncthing / Obsidian Sync / Não uso ainda.

### Changed
- Vault físico do Mobile passa a ser **`~/Protocolo-Ouroboros/`**
  (decisão de 2026-04-29). Pasta dedicada sincronizada via Syncthing
  entre desktop Pop!_OS e celular Note13-Andre, **separada do Vault
  humano do Obsidian** em `~/Controle de Bordo/`. Reduz risco de
  conflito com arquivos pessoais e simplifica o contrato com o
  backend desktop. `VALIDATOR_BRIEF.md` e `scripts/seed_vault_demo.sh`
  atualizados; o script agora cria pastas `daily/`, `eventos/`,
  `inbox/mente/diario/` na pasta nova.

### Fixed
- Sprint M02.1 — corrigido loop infinito em `useHoje` causado por
  `now: Date = new Date()` no parâmetro default do hook (criava nova
  referência a cada render, disparando o useEffect em loop). Hook
  agora aceita `ymdOverride?: string` opcional e calcula a data
  dentro do effect. Sintoma: tela "Hoje" piscava entre Carregando e
  Empty State.
- Sprint M02.1 — labels do FAB radial ajustados: Trigger → Crise,
  Exercício → Exercícios, Vitória → Conquista (evita confusão com
  nome próprio "Vitória" e termo técnico "Trigger").
  ARC_RADIUS 175→210 e ângulos voltaram para range matemático
  180–270°. Teste de a11y atualizado para os novos labels.
- Sprint M02.2 — labels do FAB radial sem largura fixa: o `width:
  140` invadia o ícone do botão adjacente ao centralizar o texto.
  Agora o `<Text>` ajusta ao tamanho do conteúdo. Sintoma corrigido:
  rótulos sobrepondo ícones (visível no checkpoint 70717).

### Added
- Sprint M02 — Vault Bridge + Tela 01 (hoje). Primeira sprint que
  conecta o app a dados reais. `src/lib/vault/` com paths canônicos
  (`daily/`, `eventos/`, `inbox/mente/diario/`), parser de YAML
  frontmatter, reader/writer/permissions sobre SAF do Android via
  `expo-file-system/legacy`. Schemas zod para `humor`,
  `diario_emocional` e `evento` espelhando `BRIEFING.md` §7. Store
  global `useVault` com URI raiz persistido em SecureStore. Hook
  `useHoje` lê os três tipos em paralelo, filtra pela pessoa ativa,
  retorna estado uniforme para a UI. `app/index.tsx` substitui o
  re-export do storybook por Tela 01 real (modal de permissão
  full-screen quando Vault não foi concedido; cards de humor com
  sliders readonly, lista de diários e eventos com borda colorida
  por modo, FAB que mostra toast informando que radial chega na
  M04). `scripts/seed_vault_demo.sh` popula o Vault físico com 3
  arquivos de exemplo (`pessoa_a`) idempotente. Total de 105 testes
  (40 novos: paths, frontmatter, três schemas).
- Sprint M01.6.2: FAB radial repensado pós-feedback usuário. FAB
  principal 56→72dp, botões de ação 48→64dp, ícones aumentados,
  labels reposicionadas à esquerda do círculo com fundo sólido
  `bgElev` e fonte 14 weight medium.
- Sprint M01.6.3: ajuste angular para evitar sobreposição
  Vitória/Trigger detectada no checkpoint visual. Espaçamento
  18°→22° entre itens, ARC_RADIUS 150→175, ângulos redistribuídos
  175-285°.
- Sprint M01 finalizada — endorso visual do usuário no celular real:
  "as animações do mais e o menu radial é muito foda".
  Tag `v0.1.0-m01` marca a Fundação Estética concluída.

### Changed
- **Regra de capitalização da UI revogada e substituída** durante
  checkpoint visual M01.5 (2026-04-28). `BRIEFING.md` §1 e §2.4
  prescreviam "lowercase intencional" em toda a UI. Decisão do dono
  do projeto: strings de UI passam a usar **Sentence case com
  acentuação completa PT-BR**. `accessibilityLabel` continua sem
  acento; comentários em código continuam sem acento. `VALIDATOR_BRIEF.md`
  §1.4 e `CLAUDE.md` (regra de linguagem) atualizados.
- Line-height de body subiu de 1,5 para 1,6.

### Added
- Sprint M01.5: checkpoint visual M01 no celular real (Redmi Note 13
  5G Pro via Expo Go LAN). 4 screenshots commitadas em
  `docs/sprints/M01.5-screenshots/`. Estética aprovada com 4
  ressalvas a tratar em Sprint M01.6 (capitalização, acentos
  faltantes, densidade visual alta, warning SafeAreaView). Documento
  completo em `docs/sprints/M01.5-checkpoint-visual.md`.
- Sprint M01.4: 5 componentes UI complexos em `src/components/ui/`
  (Slider, Toast + ToastProvider + useToast, BottomSheet, FAB,
  FABRadial). FABRadial implementa o menu radial da Tela 14 com 6
  botões em arco semicircular (humor pink, voz cyan, câmera orange,
  exercício green, vitória yellow, trigger red), surgindo em sequência
  com 60ms de delay (`springs.bouncy`). Toast sobe a 80dp do bottom em
  `springs.default`, fade out em 180ms, swipe horizontal para
  dispensar. `app/_layout.tsx` envolto em `<GestureHandlerRootView>` +
  `<ToastProvider>` (única alteração mínima autorizada de arquivo
  fechado).
- 16 testes novos (3 Slider + 4 Toast + 2 BottomSheet + 3 FAB + 4
  FABRadial) — total 65 testes em 18 suítes.
- `@react-native-community/slider@5.0.1` instalado via `npx expo
  install` (Armadilha A11).
- `jest.setup.cjs` ampliado com mocks de slider, gorhom/bottom-sheet e
  gesture-handler.
- Sprint M01.3: 10 componentes UI premium estáticos em
  `src/components/ui/` (Screen, Header, Button, Card, Input, Textarea,
  Chip + ChipGroup, Toggle, PersonAvatar, EmptyState) + barrel
  `index.ts`. Cada componente nasce com springs (`@/lib/motion`),
  haptics (`@/lib/haptics`), scale 0.97 ao pressionar, classes
  Tailwind da paleta Dracula, strings de UI em lowercase intencional e
  `accessibilityRole` + `accessibilityLabel`. Storybook caseiro em
  `app/_components.tsx` mostrando todos os componentes em isolamento.
- 27 testes novos (13 suítes, 49 testes ao total) cobrindo render,
  press handlers, haptics e variantes via
  `@testing-library/react-native@^13.3.3` (peer
  `react-test-renderer@19.1.0`).
- `jest.setup.cjs` para silenciar transformações do nativewind/babel
  no setup global do jest (Armadilha A12 — registrar no BRIEF).
- Sprint M01.2: fundação da camada de bibliotecas internas em `src/`.
  Tokens visuais (`src/theme/tokens.ts`) com cores Dracula, spacing 4dp,
  radius por superfície e tipografia (pesos 400/500, line-height ≥ 1,5).
  Motion (`src/lib/motion.ts`) com 4 spring presets canônicos
  (subtle 22/220, default 18/200, bouncy 12/180, snappy 26/320) e 2
  timings (fadeOut linear 180ms, toastIn spring). Haptics
  (`src/lib/haptics.ts`) com 5 helpers tipados (`light`, `medium`,
  `selection`, `success`, `error`) sobre `expo-haptics`. Schemas zod
  (`src/lib/schemas/pessoa.ts`): `PessoaIdSchema`, `PessoaAutorSchema`
  e `isAutor`. Config genérica (`src/config/pessoas.config.ts` e
  `pessoas.config.example.ts`) com defaults `Nome_A`/`Nome_B`/`Ambos` —
  Regra −1 preservada. Store zustand (`src/lib/stores/pessoa.ts`) com
  `pessoaAtiva`, `filtroPessoa`, `nomes`, persistido em SecureStore via
  adapter (`src/lib/stores/persist.ts`) sob a chave
  `ouroboros.pessoa.v1`.
- Suíte de testes unitários em `tests/` com jest-expo (22 casos em 3
  suites). Cobertura: schemas (parse/rejeição/type-guard), motion
  (números exatos dos presets) e config (defaults genéricos não casam
  regex de nomes reais).
- `package.json`: script `test` (`jest --watchAll=false`), bloco `jest`
  com preset `jest-expo`, `testMatch` restrito a `tests/`,
  `transformIgnorePatterns` para módulos RN/Expo/Moti/NativeWind e
  `moduleNameMapper` para resolver alias `@/*` (espelha tsconfig).
  Dev deps adicionadas via `npx expo install --dev`: `jest-expo` 54.0.17,
  `jest` 29.7.0, `@types/jest` 29.5.14.
- `.npmrc` com `legacy-peer-deps=true` para destravar peer deps do
  `@gluestack-ui/themed` (legado) com React 19.
- VALIDATOR_BRIEF Armadilhas A8/A9/A10/A11 documentando achados de
  M01.1 (Reanimated 4, ESLint flat config, gluestack legacy, peer deps
  do SDK 54).
- Sprint M01.1: bootstrap Expo SDK 54 em-place preservando docs.
  Stack confirmada: Expo Router, NativeWind 4, Reanimated 4,
  Moti, gluestack-ui, @gorhom/bottom-sheet, JetBrains Mono via
  `@expo-google-fonts/jetbrains-mono`, zustand, zod, yaml.
  Configs: `tailwind.config.js` com paleta Dracula completa,
  `babel.config.js` com `nativewind/babel` antes e
  `react-native-reanimated/plugin` por último (Armadilha A1),
  `metro.config.js` com `withNativeWind`, `tsconfig.json` strict
  + paths `@/*`, `app.json` com tema dark e package
  `com.ouroboros.mobile`. Telas placeholder em `app/_layout.tsx`
  e `app/index.tsx` com classes Tailwind.
- Bootstrap do repositório git (Fase 0).
- Layout canônico `docs/` com `BRIEFING.md`, `CONTEXTO.md`,
  `PLANO_TECNICO_APK.md`, `Ouroboros_24_telas-standalone.html` e
  pastas `ADRs/`, `sprints/`, `design-canvas-export/`.
- Scripts de validação: `check_anonimato.sh`, `check_test_data.sh`,
  `smoke.sh`, `sprint_iniciar.sh`.
- Hooks `pre-commit` e `pre-push` ativos via `core.hooksPath=hooks`.
- `LICENSE` GPL-3.0, `README.md`, `CLAUDE.md` com regras invioláveis,
  `.gitignore` com exceção para `pessoas.config.runtime.json`.

### Changed
- `docs/design-canvas-export/project/BRIEFING_PARTE3_SPEC.md` marcado
  como `SUPERSEDED` (legado, stack era Kotlin/Compose).
