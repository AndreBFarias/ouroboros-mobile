# Onda R — Refinamentos pós alpha-11 + Segurança v1.0.0

> **Briefing canônico** consolidando feedback de validação live no Xiaomi 2312DRAABG (HyperOS) após alpha-11. Continuação direta da Onda Q. Cada item abaixo é uma sprint executável, pronta para virar issue no GitHub e ser materializada em `docs/sprints/<id>-spec.md`.

**Pré-condição global:** ler `STATE.md`, `ROADMAP.md`, `docs/ORCHESTRATOR_PLAYBOOK.md`, `VALIDATOR_BRIEF.md`, `CLAUDE.md` antes de pegar qualquer R.

**Modo de execução:** ciclo padrão (planejador → executor → validador Gauntlet → commit/push). Spec ambígua **para o ciclo** e pede clarificação ao dono.

**Filosofia preservada:**

- Sem gamificação artificial (Recap é leitura contextual, não recompensa).
- Estética é função.
- Sem rede de saída além das integrações explícitas autorizadas.
- Tudo `.md` no Vault, portável e auditável.
- Regra −1 (anonimato): zero menção a IA, zero autoria pessoal em código/commit/doc.

**Vocabulário fixado nesta onda (CRÍTICO — propagação transversal):**

| Antes | Depois | Onde |
|-------|--------|------|
| `Vitória` | `Conquista` | Toda UI, todos schemas, frontmatter `.md`, testes E2E, fixtures Gauntlet, dicionário PT-BR audit |
| `Trigger` | `Gatilho` | Idem acima |
| `Vitória/Trigger` (par) | `Crise/Conquista` (par exibido) | Botões, headers, agrupamentos visuais |
| `Humor Rápido` (atalho) | `Reflexão` | Botão de acesso rápido (humor permanece no Registrar) |

Sprint dedicada (**R0**) cobre a renomeação atômica com migração de vault existente. Demais sprints podem assumir o vocabulário novo.

**Versão alvo:** `v1.0.0-alpha-12` consolidado após bloco R-CRIT zerado; `v1.0.0-rc2` após bloco R-UX zerado; `v1.0.0` após bloco R-SEC + F1 (field test).

---

## Sumário das tranches

| Tranche | Tema | # sprints | Estim. ativa | Bloqueia release |
|---------|------|-----------|--------------|------------------|
| R-CRIT  | Bugs críticos (OAuth + mídia ausente + animações) | 4 | ~10-14h | Sim |
| R-LEX   | Renomeação Crise/Conquista/Gatilho/Reflexão | 1 | ~3-4h | Sim (cosmético mas raiz) |
| R-RECAP | Recap navegável completo + mídia + slideshow | 5 | ~10-13h | Sim |
| R-HOME  | Repensar Tela Hoje (prioridade do user) | 3 | ~6-8h | Sim |
| R-INT   | Hub de Integrações (Health Connect + Calendar + Spotify + YouTube) | 4 | ~8-12h | Não (Calendar já é R-CRIT) |
| R-SF    | Saúde Física — Grupos + Iniciar Treino + Marcação rápida | 3 | ~6-8h | Não |
| R-ROT   | Rotinas — Inteligência temporal + escopo expandido | 2 | ~4-5h | Não |
| R-MEDIA | Mídia anexa — Spotify/YouTube/Áudio com preview | 2 | ~5-7h | Sim |
| R-CONT  | Contadores — Eventos com mídia | 1 | ~3-4h | Não |
| R-NAV   | Padronização Ciclo/Alarmes/FABs + sons funcionais | 3 | ~4-6h | Sim |
| R-FAB   | Atalhos rápidos (Voz/Câmera) repensados | 2 | ~2-3h | Sim |
| R-WIDG  | Widget homescreen — To-do list rápida | 1 | ~4-6h | Não |
| R-SEC   | Hardening + verificação Google + Play Protect | 5 | ~12-18h | Sim para v1.0.0 production |
| R-DX    | QoL dev/IA (achados colaterais) | 6 | ~8-12h | Não |
| R-OPS   | Automação DevOps (achados colaterais) | 5 | ~8-12h | Não |

**Estimativa total:** ~93-130h ativas + 7 dias passivos field test (F1) + 1 dia release (G1) ≈ 17-25 dias até v1.0.0 production.

---

## Tranche R-LEX — Renomeação lexical canônica

### R0 — `M-LEX-CRISE-CONQUISTA-GATILHO-REFLEXAO`

**Tipo:** `refactor` + `data-migration`
**Prioridade:** P1-high (bloqueia testes E2E das demais sprints da onda)
**Estimativa:** 3-4h
**ADR sugerida:** ADR-0025 (registrar decisão lexical durável)

#### Contexto

O vocabulário atual mistura conceitos psicológicos (`trigger`, `vitória`) com palavras carregadas de gamificação (`vitória` soa como achievement). O dono fixou um vocabulário sóbrio: **Crise** e **Conquista** formam o par antagônico exibido junto; **Gatilho** substitui `trigger` em todos os contextos analíticos; **Reflexão** substitui o atalho `Humor Rápido` (que será movido para um lugar menos privilegiado).

#### Escopo da renomeação

1. **Schemas Zod** (`src/lib/schemas/`): renomear campos `vitoria*`→`conquista*` e `trigger*`→`gatilho*`. Manter compat de leitura via `transform` de Zod para `.md` antigos (frontmatter com chave antiga lê e remapeia ao migrar). Não escrever mais campo antigo.
2. **Frontmatter `.md`**: documentar mapeamento em `docs/SCHEMA-MIGRATION.md`. Os arquivos antigos no Vault permanecem legíveis indefinidamente (não há rewrite forçado — o pipeline desktop `protocolo-ouroboros` precisa absorver o mesmo mapeamento; abrir issue `etl-contract` no sibling).
3. **UI**: todos os textos, labels, accessibility labels, placeholders, headers de seção.
4. **Listadores Vault**: `listarDiarios*`, `listarConquistas*`, `listarGatilhos*` etc. Renomear funções mantendo aliases @deprecated por 1 versão.
5. **Atalho "Humor Rápido"** no menu de acesso rápido: passa a se chamar **"Reflexão"** e abre o sheet de Diário (com a aba Reflexão pré-selecionada). O botão **"Registrar Humor"** permanece intacto em outros pontos (Tela Hoje, FAB verde, Settings).
6. **Fixtures Gauntlet**: `humores-30d`, `diarios-3` (variante `vitoria` → `conquista`).
7. **Testes**: 200+ ocorrências esperadas. Smoke + Gauntlet verde antes de fechar.
8. **Dicionário PT-BR audit** (`scripts/check_pt_br.sh`): adicionar entradas e remover entradas obsoletas.

#### Critérios de aceitação

- [ ] `grep -rniE "vitoria|trigger" src/ app/ tests/ --include="*.ts" --include="*.tsx"` retorna apenas referências legítimas (migração, comentário explicativo, ADR).
- [ ] Vault com 1 `.md` antigo (chave `vitoria:`) abre na UI mostrando "Conquista" no header.
- [ ] Atalho de acesso rápido "Reflexão" abre `/diario` sem passar pelo intermediário antigo de Humor Rápido.
- [ ] Suite testes 100% verde (esperado +5 a +10 cases novos cobrindo migração e atalho).
- [ ] CHANGELOG entry com nota de migração para usuários ativos (apenas dono + Vitória atualmente, mas registro durável).

#### Hipóteses técnicas (sem prescrever)

- Considerar criar `src/lib/migration/lexicon.ts` com mapa bi-direcional.
- Avaliar se `useGaleriaMock` precisa de seed v3.
- Sibling Python: abrir issue `etl-contract` com a mesma migração no `protocolo-ouroboros` para garantir leitura cruzada.

#### Dependências

Bloqueia: todas demais sprints da onda (executar primeiro).
Bloqueado por: nada.

---

## Tranche R-CRIT — Bugs críticos bloqueando v1.0

### R-CRIT-1 — `M-OAUTH-UNMATCHED-ROUTE-REGRESSION`

**Tipo:** `fix` (regression de Q22.B)
**Prioridade:** P0-critical
**Estimativa:** 2-4h
**Bloqueia:** integração Google Calendar; bloco F1 (field test não pode rodar sem agenda funcional).

#### Contexto

Após o consent screen do Google, o app cai em **Unmatched Route**. URL completa capturada na screenshot da validação live (`alpha-11`):

```
ouroboros://oauthredirect?state=W32G7or6U0&iss=https://accounts.google.com
&code=4/0AeoWuM82Hs_JEZwt0elL2hD2o0Ye_k4k_kvR10E3fY-cuysaOkMdL_MpRll3pC4f58hxYQ
&scope=email%20https://www.googleapis.com/auth/calendar.events.readonly
%20https://www.googleapis.com/auth/userinfo.email%20openid
&authuser=0&prompt=consent
```

O navegador in-app retorna ao app via deep link `ouroboros://oauthredirect`, mas o Expo Router não tem handler registrado para essa rota. Sprint Q22.B documenta 4 causas raiz já resolvidas (SHA-1 typo + iOS client + redirect reverso-DNS + `maybeCompleteAuthSession`), mas o sintoma reapareceu após `alpha-11`.

#### Sintoma observado

1. Onboarding pede permissões.
2. Clicar em "Conectar Google Calendar".
3. Navegador in-app abre, login Google OK, consent OK (screenshot mostra "Continuar").
4. Redirect dispara `ouroboros://oauthredirect?...`.
5. App abre, mas a tela exibida é **"Unmatched Route — Page could not be found"** com URL completa renderizada.
6. O token nunca é processado, o calendário fica vazio.

#### Comportamento esperado

- Após o redirect, o `code` é trocado por `access_token` + `refresh_token` silenciosamente.
- A tela ativa volta a ser `/settings/integracoes` (ou de onde o fluxo partiu — usar `useUltimaRota` ou um estado `oauthOrigin`).
- Estado `googleCalendarConectado: true` persiste em `useSettings`.
- Eventos sincronizam (Q17.d / Q06095d hooks).

#### Hipóteses técnicas (a investigar — não prescrever)

- `maybeCompleteAuthSession` pode não estar sendo chamado no `_layout.tsx` raiz em algum cenário de cold boot vs warm boot.
- O esquema `ouroboros://oauthredirect` pode estar registrado no `app.json` mas não como rota declarativa do Expo Router. Verificar se há `app/oauthredirect.tsx` ou se o handler está apenas no listener `Linking.addEventListener`.
- A regressão pode ter sido introduzida em `c2495b4` (alpha-10, sobrescrito por alpha-11). Diff entre `d8e594a` (alpha-9, sabidamente funcional segundo Q22.B) e HEAD pode evidenciar a quebra.
- Conferir se o `eas.json` profile `production-local` mantém o mesmo `redirectUri` que o Cloud Console (formato reverso-DNS vs schema simples).
- Avaliar `expo-auth-session` upgrade vs downgrade — pinned na versão estável validada em alpha-9.

#### Critérios de aceitação

- [ ] OAuth concluído sem aparição da tela "Unmatched Route" em 5 runs consecutivos (cold + warm + força-fechar-e-reabrir + revoga-e-reconecta + reboot do device).
- [ ] Spec `M37.1-checkpoint-nivel-B` verde com 3 screenshots Gauntlet em emulador.
- [ ] Adicionar caso E2E `oauth-redirect.e2e.ts` que mocka o deep link com payload real e verifica navegação resultante (Nível A).
- [ ] ADR atualizada se causa raiz divergir de Q22.B.

#### Notas

A tela atual de "Unmatched Route" **expõe o `code` OAuth completo na UI**. Mesmo que efêmero, isso vai para crash reporters externos se algum dia houver. Sub-sprint colateral **R-CRIT-1.a**: redirecionar Unmatched Route para um 404 sóbrio que **não imprima** a URL bruta — apenas log local sanitizado.

---

### R-CRIT-2 — `M-OAUTH-CONSENT-APP-NAME-MISSING`

**Tipo:** `fix` (Google Cloud Console + manifest)
**Prioridade:** P1-high
**Estimativa:** 1-2h
**Spec sibling:** R-SEC-1 (verificação completa Google)

#### Contexto

Nas screenshots do consent screen, o app aparece como **"Protocolo-Mob-Ouroboros"** em vez do nome canônico **"Ouroboros"** definido em Q1. Isso quebra confiança do usuário ("é um app diferente?") e gera o aviso clássico **"O Google não verificou este app"** com mais peso visual do que necessário.

#### Comportamento esperado

- Consent screen mostra "Ouroboros" como nome do app.
- Logo do app (`assets/icon.png` canônico de M-RELEASE-ASSETS / C3) aparece no card de consent.
- Tela de permissões do Android nas configurações do device mostra "Ouroboros" (não o package name técnico).

#### Hipóteses técnicas

- O nome no OAuth Consent Screen do Cloud Console é editável: Google Cloud Console → APIs & Services → OAuth consent screen → App name.
- Logo do app no consent: precisa upload de PNG 120x120 mínimo no Cloud Console.
- `android:label` no `AndroidManifest.xml` controla o nome exibido nas permissões nativas. Verificar se está como string canônica.
- `app.json` → `expo.name` vs `expo.android.adaptiveIcon.backgroundColor` vs `expo.scheme`.

#### Critérios de aceitação

- [ ] Consent screen do Google exibe "Ouroboros" e logo.
- [ ] Tela `Configurações do Android → Apps → Ouroboros → Permissões` mostra "Ouroboros" no header.
- [ ] Onboarding "Permissões do App" exibe nome canônico (atualmente exibe nome técnico).
- [ ] Documentar no `docs/RELEASE.md` o checklist de Cloud Console.

---

### R-CRIT-3 — `M-MIDIA-AUSENTE-EM-RECAP-E-GALERIA`

**Tipo:** `bug` (persistência / listadores)
**Prioridade:** P0-critical
**Estimativa:** 3-5h
**Bloqueia:** Tranche R-RECAP, F1 (field test exige Recap completo)

#### Contexto

Mídias adicionadas (fotos via Câmera/Galeria, áudios via Microfone, vídeos) **não aparecem** no Recap, na galeria unificada `/galeria`, nem nos detalhes dos itens em que foram anexadas. O dono autorizou uso do device conectado via ADB para diagnóstico.

Sprints relevantes na base: Q9 (Galeria unificada), A3.x.1 (audios em `media/audios/`), A3.x.2 (eventos), A3.x.3 (medidas), A3.x.4 (scanner), Q18.b (player integrado), I-FOTO/I-AUDIO/I-VIDEO (saves validados).

#### Sintoma observado

- Foto tirada via FAB Câmera → "Registrar Momento" parece salvar (toast verde aparece em alguns casos), mas a foto não aparece em `/galeria`, nem no `.md` do diário correspondente, nem no Recap > Memórias slideshow.
- Áudio gravado idem.
- Vídeo idem.

#### Comportamento esperado

- Foto/áudio/vídeo persistidos via writer canônico (`media/<tipo>/<data>-<rand>.<ext>` per ADR-0017).
- Companion `.md` referencia o arquivo com chave `midia_foto`/`midia_audio`/`midia_video`/`midia_pdf` conforme schema.
- Listadores do Vault (`listarFotos`, `listarAudios`, `listarVideos`, agregador da Galeria) leem os companions e populam UI.
- Recap > Memórias slideshow inclui as mídias do período (Q24.b já em mvp).

#### Hipóteses técnicas

- Investigar se há regressão de filtro `sync-conflict` em listadores periféricos (AUDIT-T1B6 listou 16, fix em apenas 4 — sub-sprint `AUDIT-T1B6-MIGRATION-FIX` ainda `[todo]`).
- Conferir se o write da mídia binária está completo antes do write do `.md` (race condition — AUDIT-T2-LOCK-VAULT ainda aberto).
- ADB pull do Vault em `/sdcard/Documents/Ouroboros/media/` e diff manual com expectativa.
- Verificar permissão de leitura SAF vs `file://` em HyperOS (V4.0.2-1/2 resolveu para writes; reads podem ter caminho diferente).
- Listadores agregadores podem estar fixados em path antigo (`fotos/`) ao invés de `media/fotos/` pós H2 (layout por tipo).
- Sub-sprint `AUDIT-T1B3-PICKERS-RESTANTES` (5 pickers silenciosos sem toast) pode estar mascarando falhas.

#### Critérios de aceitação

- [ ] Foto, áudio, vídeo capturados em runtime real aparecem em `/galeria` em menos de 2 segundos.
- [ ] Recap > Memórias exibe mídias do período em slideshow funcional.
- [ ] Detalhe do diário/conquista/evento ao qual a mídia foi anexada mostra o player ou thumbnail.
- [ ] E2E novo com fixture: capturar foto mockada → assert presente em galeria mock → assert presente em recap mock.
- [ ] Validação Nível C com ADB pull do Vault: `media/` contém os arquivos com companions `.md` válidos.

---

### R-CRIT-4 — `M-LOADER-LOGO-GIF-QUEBRADO`

**Tipo:** `fix` (animação)
**Prioridade:** P2-medium
**Estimativa:** 1-2h

#### Contexto

A animação da logo (`OuroborosLoader` — M25) deveria rodar em todas as telas de carregamento. Atualmente, em alguns pontos, o loader aparece **estático** (sem rotação dos anéis). M25 fixou Reanimated 4 + `useAnimatedProps` + `requestAnimationFrame` no web (M25.2 follow-up). A regressão pode estar em consumers que esquecem o prop `compacto` ou que envelopam o loader em wrapper sem chave única.

#### Sintoma observado

- Boot screen anima OK (validado em Q22.D em emulador).
- Loader em `/agenda` (após OAuth) e em `/recap` (após pull-to-refresh) aparece sem animação em alguns runs.

#### Comportamento esperado

- Loader anima em 100% das telas onde é exibido, em web, mobile dev-client, e APK release.

#### Hipóteses técnicas

- Verificar se `cancelAnimation` está sendo chamado em unmount sem re-mount limpo (cleanup que mata o RAF antes do próximo frame).
- Conferir se há gates de `__DEV__` que desabilitam Reanimated em production.
- `data-anim-id` no web (M25.2) pode estar duplicando em múltiplos loaders no mesmo render — gerar UUID por instância.

#### Critérios de aceitação

- [ ] Gauntlet captura 5 screenshots de loaders em momentos t+100ms, t+500ms, t+1000ms — anéis em ângulos visivelmente distintos em todos.
- [ ] Caso E2E: spawn 3 loaders simultâneos, verificar que todos animam.

---

## Tranche R-RECAP — Recap navegável completo

### R-RECAP-1 — `M-RECAP-LISTA-ITENS-CLICAVEIS`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 3-4h
**Dependência:** Q24.a já fechou parte (cards Números clicáveis → listas → edição). Esta sprint estende para **todos os agrupamentos** do Recap.

#### Contexto

Ao abrir Recap → Lista → Semana, aparecem os agrupamentos **Conquistas, Crises, Evoluções, Tarefas concluídas**. Atualmente os itens dentro de cada agrupamento são **decorativos** — clicar não faz nada. O usuário esperava poder abrir o item original (diário, evento, conquista, tarefa) para editar e ver mídias anexadas.

#### Comportamento esperado

Cada item na lista do Recap navega para a tela de detalhe original (`/diario/[id]`, `/conquista/[id]`, `/evento/[id]`, `/tarefa/[id]` etc.) com `presentation: 'card'` no Stack (não modal — permite editar e voltar). Edição é permitida; mídia anexa aparece no detalhe (depende de R-CRIT-3 estar verde).

#### Critérios de aceitação

- [ ] Cada item de cada agrupamento (Conquistas, Crises, Evoluções, Tarefas) é tappável com hitSlop ≥ 8.
- [ ] Tap navega para detalhe correto; back retorna ao Recap mantendo scroll position.
- [ ] Detalhe permite editar título/descrição/data/categoria; salvar atualiza o `.md` e o Recap reflete na próxima leitura.
- [ ] Mídia anexa visível no detalhe (foto → fullscreen, áudio → player, vídeo → player Q18.x).
- [ ] Caso E2E cobrindo Conquistas + Crises + Tarefas (Evoluções pode usar fixture).

#### Hipóteses técnicas

- Reusar `<CardItemRecap onPress={...}>` se já existir, ou criar wrapper Pressable em volta dos cards.
- Conferir se IDs canônicos do `.md` (frontmatter `id:`) estão sendo propagados pelos listadores Q24.a; senão, propagar.

---

### R-RECAP-2 — `M-RECAP-NUMEROS-BIG-CLICAVEIS-LISTAS`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 2-3h

#### Contexto

Em Recap → Números, há big numbers (ex.: "12 humores registrados", "3 conquistas", "5 tarefas concluídas"). Atualmente são meramente informativos. Q24.a fechou parte disso (cards clicáveis → listas), mas o feedback indica que **na prática nem todos os big numbers chegam a abrir lista, e quando abrem a lista não é interativa** (mesma raiz de R-RECAP-1).

#### Comportamento esperado

- Cada big number é tappável.
- Tap abre lista filtrada pelo respectivo tipo + período do Recap (semana/mês/ano).
- Itens da lista têm o mesmo comportamento de R-RECAP-1 (tap → detalhe → editar → mídia).

#### Critérios de aceitação

- [ ] 100% dos big numbers exibidos no Recap (auditar todos os tipos) são clicáveis.
- [ ] Lista resultante mantém o período do Recap (`?periodo=semana&data=2026-05-15`).
- [ ] Sem big numbers "0" exibidos como tappable que abrem lista vazia (cobertura por R-RECAP-3).

---

### R-RECAP-3 — `M-RECAP-EMPTY-STATES-NAO-TOXICOS`

**Tipo:** `feature` + `copywriting`
**Prioridade:** P1-high
**Estimativa:** 2-3h

#### Contexto

O Recap atual mostra "0 conquistas" ou similares quando o período não tem dados. Isso lê como **acusação** ("você não fez nada"). O dono pediu: **mais variações, mais positivo sem ser tóxico, boas saídas para períodos sem dados — ignorar / esconder a seção / mensagem neutra**.

Filosofia do projeto explicitamente proíbe "reforço positivo artificial" (gamificação). Portanto: **nem reforço positivo, nem acusação**. Tom desejado: **constatação serena**, com sugestão útil se aplicável.

#### Comportamento esperado

- Seção sem dados é **ocultada por padrão**, não exibida com "0".
- Quando o Recap inteiro está vazio, exibir um empty state único com mensagem rotativa de um pool de 8-12 variações (seed determinística baseada em `period+ano+semana` para idempotência).
- Variações incluem: convites suaves ("um dia mais quieto"), constatações neutras ("nada registrado neste período"), micro-prompts ("se algo aconteceu, dá pra registrar agora pelo +").
- Nunca afirmar que o usuário "falhou", "esqueceu", "não conseguiu" ou similares.
- Nunca celebrar artificialmente períodos vazios ("que ótimo, dia tranquilo!").

#### Critérios de aceitação

- [ ] Recap com semana 100% vazia exibe empty state único.
- [ ] Recap com 1 tipo vazio (ex.: conquistas=0) mas outros preenchidos esconde apenas a seção de conquistas.
- [ ] Pool de 10+ variações cadastradas em `src/lib/copy/recap-empty-states.ts`.
- [ ] Seed determinística: mesma semana → mesma frase em runs diferentes.
- [ ] Auditoria de tom feita pelo dono (revisão manual das frases antes de fechar a sprint).

---

### R-RECAP-4 — `M-RECAP-MEMORIAS-SLIDESHOW-V2`

**Tipo:** `feature`
**Prioridade:** P2-medium
**Estimativa:** 3-4h
**Dependência:** Q24.b já fechou mvp (toggle 3-modos + 5 slides). Backlog Q24.b.a/b/c lista melhorias. Esta sprint promove Q24.b.a (áudio ambient) e Q24.b.b (Ken Burns) ao escopo da v1.0.

#### Contexto

O slideshow estilo "Google Fotos memórias" já tem MVP. O dono confirmou que **a ideia é exatamente aquela**, e pediu:

- Áudio tocando automaticamente em segundo plano (ambient track ou áudio anexado a uma das mídias do slideshow).
- Movimento sutil Ken Burns nas fotos (zoom + pan lento).
- Mais variações no copy de transição entre slides (não-tóxico, ver R-RECAP-3).

#### Comportamento esperado

- Slideshow auto-avança a cada 4s (configurável em settings, default 4).
- Se há áudio anexado a alguma mídia do período (diário com `midia_audio:`), ele toca em loop durante o slideshow inteiro com fade-in 500ms / fade-out 500ms.
- Se não há áudio anexado, **opção** de track ambient embutido (CC0, 30-60s loop) ativada via toggle em settings (default OFF — "sem rede de saída" + "sem auto-magia").
- Ken Burns: cada slide tem transformação aleatória entre 4 presets (zoom-in-top-left, zoom-out-center, pan-left-to-right, pan-bottom-to-top), 5s de duração, easing suave.
- Botão "pausar" disponível em todos os momentos.
- Botão "exportar como PNG/MP4 stories" — backlog Q24.b.c — fica como `[v2]`, não nesta sprint.

#### Critérios de aceitação

- [ ] Slideshow com 5+ slides roda sem stutter em device real (60fps validado via Reanimated profiler).
- [ ] Áudio anexado toca + fade corretos.
- [ ] Track ambient (se ativado) toca sem sair do device (sem requests externos).
- [ ] Ken Burns visível mas não enjoativo (review manual do dono).

#### Notas

Áudio ambient embutido: investigar bibliotecas CC0 (Freesound, Pixabay). Bundle ainda tem margem de 1.15 MB (per AUDIT — `M-BUNDLE-DIET`). Limitar a 1 track de ≤500 KB.

---

### R-RECAP-5 — `M-RECAP-CONTADORES-EVENTOS`

**Tipo:** `feature`
**Prioridade:** P2-medium
**Estimativa:** 2-3h
**Spec sibling:** R-CONT-1 (escrita de evento em contador).

#### Contexto

Atualmente o Contador exibe apenas o número de dias desde o início. O dono quer poder **registrar eventos pontuais ao longo da contagem**: como se sentiu naquele dia, variação de humor, o que fez, mídia anexa (foto/áudio/vídeo) — e ter um **recap específico do contador** mostrando essa narrativa.

#### Comportamento esperado

- No detalhe do contador, botão "+ Evento" abre sheet equivalente ao de diário/conquista, mas escopado ao contador (frontmatter `contador_ref: <id>`).
- Evento aceita: humor (slider), descrição, foto/áudio/vídeo, tags.
- Vista "Recap do Contador" mostra timeline de eventos do contador específico, com slideshow de mídias e variações de humor.

#### Critérios de aceitação

- [ ] Botão "+ Evento" visível e funcional no detalhe do contador.
- [ ] Evento persiste em `eventos/contador-<id>-<data>.md` ou similar (definir convenção; se for adicionado, atualizar VALIDATOR_BRIEF).
- [ ] Recap do contador acessível via tap no header.
- [ ] E2E cobre criação + leitura no recap.

---

## Tranche R-HOME — Tela Hoje repensada

### R-HOME-1 — `M-HOJE-PRIORIDADE-RECORRENCIA`

**Tipo:** `refactor` + `redesign`
**Prioridade:** P1-high
**Estimativa:** 4-5h
**Dependência:** R0 (lexical) + R-CRIT-3 (mídia)

#### Contexto

A Tela Hoje atual (M40 v2) mostra **muita coisa** mas pouca **prioridade**. O dono pediu para repensar mostrando **o que é prioritário e recorrente pro user**:

- **Próximos eventos** (agenda + despertador combinados em uma linha do tempo).
- **To-do list selecionável e marcar como concluída direto na home** (sem precisar entrar na tela de tarefas).
- **Remover "Jornada"** (redundante com o botão Recap).
- **Status do Casal** — o dono está em dúvida se mantém. Apresentar 3 opções para decisão (ver "Decisão pendente" abaixo).
- **Humor + Última (registro)** — mesma dúvida.

#### Comportamento esperado

Layout proposto (ordem vertical, primeiro fold prioritário):

1. **Cabeçalho** com data, saudação contextual, atalho rápido para Reflexão.
2. **Próximos** (até 3 itens): próximo evento de agenda OU próximo alarme, com countdown.
3. **To-do hoje** (até 5 itens): tarefas com `due: today` ou recorrentes do dia, checkboxes inline. Tap no checkbox marca como concluída instantaneamente (otimista + write Vault).
4. **Status do Casal** (condicional — ver Decisão pendente).
5. **Botão "Recap de hoje"** explícito, levando a `/recap?periodo=dia&data=hoje`.
6. **FAB roxo** (acesso geral) e **FAB verde** (captura) permanecem.

Remover: card "Jornada", card "Humor & Última" se decisão for descontinuar.

#### Decisão pendente (3 opções para o dono escolher antes da execução)

| Opção | Status do Casal | Humor+Última | Justificativa |
|-------|-----------------|--------------|---------------|
| A | Manter, compacto | Manter, compacto | Útil se as duas pessoas usam ativamente |
| B | Manter | Remover | Status do casal traz contexto da relação; Humor+Última é redundante com Recap |
| C | Remover ambos | — | Tela Hoje fica enxuta, foco em ação (próximos + tarefas) |

**Esta sprint para o ciclo** após a estruturação do plano e pede ao dono qual opção implementar.

#### Critérios de aceitação

- [ ] Tela Hoje carrega com primeiro fold mostrando: data + próximos + to-do (sem scroll necessário em device 412dp).
- [ ] Tap em checkbox de tarefa marca concluída e persiste em ≤300ms (otimista).
- [ ] Sem card "Jornada".
- [ ] Decisão sobre Status do Casal aplicada e documentada em ADR-0026.
- [ ] E2E novo: abrir tela, marcar tarefa, recarregar — tarefa permanece concluída.

---

### R-HOME-2 — `M-HOJE-PROXIMOS-EVENTOS-MERGE`

**Tipo:** `feature`
**Prioridade:** P2-medium
**Estimativa:** 2-3h
**Dependência:** R-CRIT-1 (OAuth funcional).

#### Contexto

A seção "Próximos" da Tela Hoje deve mesclar **eventos da agenda Google** e **alarmes locais** em uma timeline única, ordenada cronologicamente. Hoje os dois sistemas vivem separados.

#### Comportamento esperado

- Merge cronológico de `agenda` (cache MD per Q06095d / M37.1.2) + `alarmes` (schema alarme).
- Cada item indica origem com micro-ícone ( calendar,  alarme).
- Tap em evento agenda abre detalhe somente-leitura (escrita virá em E6 M37.2).
- Tap em alarme abre `/alarmes/[id]/editar`.

#### Critérios de aceitação

- [ ] Lista combinada respeita ordem temporal.
- [ ] Devices sem OAuth conectado mostram apenas alarmes (graceful fallback).
- [ ] E2E com fixture 2 eventos + 1 alarme → ordem correta.

---

### R-HOME-3 — `M-HOJE-TODO-INLINE-CHECK`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 1-2h
**Dependência:** R-HOME-1

#### Contexto

Marcação rápida de to-do direto na Home, sem navegar para `/tarefas`.

#### Comportamento esperado

- Checkbox 32dp (hitSlop 16) à esquerda de cada tarefa.
- Tap marca concluída com animação Moti de check (200ms) + strike-through.
- Persistência otimista — escrita Vault em background.
- Erro de escrita: rollback visual + toast.
- "Desfazer" via toast por 5s.

#### Critérios de aceitação

- [ ] Tap → checked instantâneo (≤16ms perceived).
- [ ] Vault `.md` atualiza dentro de 300ms.
- [ ] Erro: visual reverte, dado preservado.
- [ ] E2E completo (mark + reload + assert + undo).

---

## Tranche R-INT — Hub de Integrações

### R-INT-1 — `M-INTEGRACOES-HUB-UTILITARIOS`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 2-3h

#### Contexto

Hoje, Conexão Saúde / Google Calendar / etc. estão espalhados pelo Settings sem hierarquia clara. O dono pediu um **botão "Integrações" dentro de Utilitários** (no MenuLateral) que abre um hub centralizado.

#### Comportamento esperado

- Entry "Integrações" em `MenuLateral > Utilitários` (ícone `Plug` ou `Zap` da `lucide-react-native`).
- Rota `/integracoes` (ou move o atual `/settings/integracoes` para ser o canônico).
- Lista de integrações disponíveis com:
  - Nome canônico (não package name)
  - Estado atual (Conectado / Desconectado / Erro)
  - Toggle direto
  - Botão "Conectar" / "Desconectar"
  - Última sincronização (se aplicável)
- Integrações nesta v1.0: **Health Connect** (Q17), **Google Calendar** (Q22.B + R-CRIT-1).
- Próximas (descopadas para R-INT-2/3/4): **Spotify**, **YouTube**, **Google Drive** (backup do Vault).

#### Critérios de aceitação

- [ ] Entry visível no MenuLateral em "Utilitários".
- [ ] Hub lista pelo menos Health Connect + Google Calendar.
- [ ] Toggles funcionam e persistem.
- [ ] Permissões corretas exibidas (nome canônico do app — depende de R-CRIT-2).

---

### R-INT-2 — `M-INTEGRACOES-NOME-APP-PERMISSOES`

**Tipo:** `fix`
**Prioridade:** P1-high
**Estimativa:** 1-2h
**Spec sibling:** R-CRIT-2

#### Contexto

Conexão Saúde **não aparece com nome do app** na lista de permissões nativa do Android (Tela de Health Connect → Apps com acesso). Idem onboarding "Permissões do App". Causa raiz provavelmente em `AndroidManifest.xml` (label da activity) + manifesto de Health Connect (`<provider>` ou rationale activity).

#### Comportamento esperado

- Health Connect → Apps → "Ouroboros" (com ícone).
- Onboarding → tela de permissões → cada permissão lista "Ouroboros" como solicitante.

#### Critérios de aceitação

- [ ] Screenshot Health Connect Apps mostra "Ouroboros" + ícone.
- [ ] Screenshot onboarding permissões mostra nome canônico.
- [ ] Lint Android (`./gradlew lint`) sem warnings de label ausente.

---

### R-INT-3 — `M-INTEGRACOES-HEALTH-CONNECT-NAO-FUNCIONA`

**Tipo:** `bug`
**Prioridade:** P1-high
**Estimativa:** 2-4h
**Dependência:** R-INT-2 (nome do app — pode ser causa raiz)

#### Contexto

Dono reportou que **Conexão Saúde não só está sem nome, como não funciona** (toggle ativa mas dados não sincronizam). Q17 fechou várias sub-sprints (a/b/c/c.b/c.c/c.d/d/e) garantindo writes em ExerciseSession, Weight, BodyFat, MenstruationFlow, Steps, mas a validação live em alpha-11 mostra regressão.

#### Sintoma observado

- Toggle "Health Connect Sync" em Settings ativa.
- Treino salvo no app **não aparece** em Samsung Health / Google Fit.
- Peso registrado em Medidas **não aparece** em HC.

#### Hipóteses técnicas

- Permissão Health Connect concedida mas escopo errado (read vs write).
- Hook `escreverHealthConnect` pode estar capturando erro e silenciando (AUDIT-T1B3 padrão recorrente).
- Pacote Android Health Connect pode ter mudado API entre versões (validar `react-native-health-connect` versão pinned).
- Em HyperOS específico, HC pode requerer permission grant via UI manual fora do app.

#### Critérios de aceitação

- [ ] Treino registrado no app aparece em Google Fit / Samsung Health em ≤30s.
- [ ] Peso registrado em Medidas aparece em HC.
- [ ] CardHCResumo (Q17.d) na Evolução mostra dados reais sincronizados.
- [ ] Toast de erro **explícito** se permissão falhar (não silenciar).

---

### R-INT-4 — `M-INTEGRACOES-SPOTIFY-YOUTUBE-CONECTAR`

**Tipo:** `feature`
**Prioridade:** P3-low (descopável para v1.1)
**Estimativa:** 4-6h

#### Contexto

Spotify e YouTube como integrações de **leitura** (não escrita) — usadas pelas mídias anexadas em Reflexões/Conquistas/Crises (ver R-MEDIA-1).

Spotify: OAuth + leitura de track atual / playlist.
YouTube: oEmbed para metadados (não requer OAuth para mídia anexada).

#### Comportamento esperado

- Spotify: Conectar via OAuth → permite anexar "música que estou ouvindo" como mídia.
- YouTube: anexar URL → fetch metadados via oEmbed (não requer auth).

#### Critérios de aceitação

- [ ] Spotify connect flow completo, refresh token persistido.
- [ ] YouTube paste URL → preview gerado.
- [ ] Sem chamadas externas se a integração estiver desligada.

#### Risco

Filosofia "sem rede de saída". oEmbed YouTube é um single GET, anonimizável. Spotify exige OAuth permanente. **Discussão com dono necessária antes de execução** — confirmar se a exceção à filosofia se justifica para essas duas integrações.

---

## Tranche R-MEDIA — Mídia anexa com preview

### R-MEDIA-1 — `M-MIDIA-SPOTIFY-YOUTUBE-AUDIO-PREVIEW`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 3-4h
**Dependência:** R-INT-4 (parcial — YouTube oEmbed funciona sem OAuth)

#### Contexto

Ao adicionar mídia a uma Reflexão/Conquista/Crise, colocando Spotify URL ou YouTube URL ou áudio local, o app deve **renderizar preview**:

- Spotify: thumbnail do álbum + título + artista + botão "Abrir no Spotify".
- YouTube: thumbnail do vídeo + título + canal + botão "Abrir no YouTube".
- Áudio: player inline com play/pause/seek (já existe em Q18, mas deve ser **autoplay** no Recap).

Fallback se preview não carregar (sem rede): logo do serviço + botão "Abrir externamente".

#### Comportamento esperado

- Colar Spotify URL no campo de mídia → preview renderiza em ≤2s.
- Idem YouTube.
- Áudio anexado a um item visível no Recap toca automaticamente quando o item entra na viewport durante o slideshow.

#### Critérios de aceitação

- [ ] 3 URLs distintos (Spotify/YouTube/áudio) anexados, todos com preview.
- [ ] Modo avião: cada preview cai para fallback logo + botão.
- [ ] Recap > slideshow auto-play do áudio funciona.

#### Hipóteses técnicas

- Spotify oEmbed endpoint: `https://open.spotify.com/oembed?url=<spotify_url>`.
- YouTube oEmbed: `https://www.youtube.com/oembed?url=<youtube_url>&format=json`.
- Cache de preview em `cache/oembed/<hash-url>.json` (TTL 7 dias) para reduzir requests e suportar offline parcial.

---

### R-MEDIA-2 — `M-MIDIA-RECAP-AUTOPLAY-AUDIO`

**Tipo:** `feature`
**Prioridade:** P2-medium
**Estimativa:** 2-3h
**Dependência:** R-MEDIA-1 + R-RECAP-4

#### Contexto

Áudios anexados a Reflexões/Conquistas precisam tocar automaticamente no Recap (modo Memórias slideshow), conforme R-RECAP-4 já cobriu parcialmente. Esta sprint **separa o áudio do item** do áudio ambient: se há áudio anexado, ele toca; senão, ambient (se ativado).

#### Critérios de aceitação

- [ ] Slideshow detecta áudio anexado e prioriza sobre ambient.
- [ ] Fade-in/out entre faixas se houver troca durante slideshow.
- [ ] Mute global no toggle do slideshow.

---

## Tranche R-SF — Saúde Física

### R-SF-1 — `M-SAUDE-FISICA-GRUPOS-DE-TREINO`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 2-3h
**Dependência:** Q19 (Grupos de Treino) já fechou o schema + form completo. Esta sprint **expõe** os Grupos dentro de Saúde Física (atualmente parece estar acessível apenas via Rotinas).

#### Contexto

Saúde Física hoje lista exercícios individuais. Grupos (treino A, B, C) existem no schema (Q19) mas **não estão acessíveis a partir da tela de Saúde Física**, apenas via Rotinas. O dono quer poder **agrupar exercícios em treinos** diretamente em Saúde Física, e quer **botão "Iniciar Treino"** (atualmente exclusivo de Rotinas).

#### Comportamento esperado

- Em `/saude-fisica`, adicionar aba "Grupos" (ao lado de "Exercícios").
- Aba "Grupos" lista os Grupos de Treino (Q19) e permite criar/editar/excluir.
- FAB+ em Saúde Física tem opção "Iniciar Treino" (sheet com seletor de Grupo → executor Q11.c).
- O botão "Iniciar Treino" não desaparece de Rotinas (continua funcionando lá).

#### Critérios de aceitação

- [ ] Aba "Grupos" visível em `/saude-fisica`.
- [ ] CRUD completo de Grupo funciona dentro de Saúde Física.
- [ ] Botão "Iniciar Treino" visível e funcional no FAB+ de Saúde Física.
- [ ] Idempotência: Rotinas e Saúde Física compartilham o mesmo store de Grupos.

---

### R-SF-2 — `M-SAUDE-FISICA-EXERCICIO-GIF-CADASTRO`

**Tipo:** `validation` (Q18 já fechou; esta sprint **valida em runtime real** + cobre lacunas)
**Prioridade:** P2-medium
**Estimativa:** 1-2h

#### Contexto

Q18 + Q18.b + Q18.x fecharam: schema com GIF/MP4/JPG opcional, player reusável, integração em detalhe + executor + galeria. Dono confirmou que **funciona** ("perfeito"). Esta sprint apenas garante que não há gap conhecido entre fluxo de cadastro de exercício e o player.

#### Critérios de aceitação

- [ ] Cadastrar exercício com GIF, MP4 e JPG (3 testes) — todos renderizam no detalhe.
- [ ] Executor de treino mostra GIF rolando durante a série.
- [ ] Sub-sprint anti-débito: erro de GIF corrompido cai para placeholder estético em vez de tela vermelha.

---

### R-SF-3 — `M-SAUDE-FISICA-MARCACAO-RAPIDA-MED`

**Tipo:** `feature`
**Prioridade:** P2-medium
**Estimativa:** 2-3h
**Dependência:** R-ROT-1 (compartilha inteligência temporal)

#### Contexto

Dono usa Venvanse diariamente. Hoje, marcar "tomei" exige navegar até a tela do hábito/rotina. Ele quer: **um único tap marca + grava o horário automaticamente**.

#### Comportamento esperado

- Cada item de Rotina recorrente tem botão de "marcar" (32dp, hitSlop 16).
- Tap registra: `{ rotina_id, marcado_em: <ISO-timestamp-now> }` em `rotinas/<id>/historico-<data>.md`.
- Histórico visível como timeline no detalhe da rotina (próximas 7 ocorrências + estatísticas: % aderência semanal).
- Se houver lembrete configurado e o usuário marca antes do lembrete, lembrete é silenciado.

#### Critérios de aceitação

- [ ] Marcar "Venvanse" às 08:32 → frontmatter registra `marcado_em: 2026-05-15T08:32:00-03:00`.
- [ ] Histórico de 7 dias visível.
- [ ] Lembrete cancelado se marcado antes.
- [ ] E2E com fixture cobrindo 3 marcações.

---

## Tranche R-ROT — Rotinas com inteligência temporal

### R-ROT-1 — `M-ROTINAS-INTELIGENCIA-TEMPORAL`

**Tipo:** `feature`
**Prioridade:** P1-high
**Estimativa:** 2-3h
**Dependência:** Q11 (Rotinas) já fechou schema + CRUD + executor.

#### Contexto

O dono descreveu Rotinas como mais amplo que treinos: **qualquer coisa que se repete** (medicação, hábitos diários, lembretes). Ele quer que o **app aprenda** o horário em que cada rotina é marcada — não precisa configurar horário fixo, basta marcar e o app guarda.

#### Comportamento esperado

- Rotina criada sem horário fixo.
- Após N marcações (default 3), o app calcula **média + desvio padrão** do horário e sugere automaticamente um **lembrete personalizado** ("você costuma marcar às 08:30, quer um lembrete às 08:30?").
- Lembrete sugerido NÃO é criado automaticamente — apenas sugerido via toast/banner.
- Histórico de horários visível na tela de detalhe.

#### Critérios de aceitação

- [ ] Após 3 marcações dentro de janela de 1h, sugerir lembrete.
- [ ] Aceitar sugestão cria alarme correspondente.
- [ ] Rejeitar sugestão silencia futuras sugestões por 30 dias.
- [ ] E2E com 3 marcações simuladas → sugestão aparece.

---

### R-ROT-2 — `M-ROTINAS-ESCOPO-EXPANDIDO`

**Tipo:** `docs` + `feature` (mínimo código)
**Prioridade:** P3-low
**Estimativa:** 1-2h

#### Contexto

Rotinas hoje têm naming/UX levemente enviesado para exercícios físicos. O dono quer reforço de que Rotinas serve para **qualquer coisa recorrente**: medicação, hábitos, leitura diária, etc.

#### Comportamento esperado

- Categorias visíveis no form de criação: Medicação  / Saúde física  / Hábito  / Outro .
- Templates de exemplo prontos: "Tomar remédio", "Tomar água", "Caminhar 30min".
- Texto do empty state inclui exemplo não-exercício.

#### Critérios de aceitação

- [ ] Tela de criação tem seletor de categoria.
- [ ] Templates funcionam.
- [ ] Documentação atualizada.

---

## Tranche R-CONT — Contadores

Coberto por R-RECAP-5 acima (sprint única).

---

## Tranche R-NAV — Padronização Ciclo/Alarmes/FABs

### R-NAV-1 — `M-CICLO-BOTAO-REGISTRAR-MIGRACAO-FAB`

**Tipo:** `refactor` (UX)
**Prioridade:** P2-medium
**Estimativa:** 1-2h

#### Contexto

Na tela de Ciclo, existe um botão "Registrar hoje" inline na lista. O dono quer eliminá-lo e usar o **FAB+ canônico** na mesma altura do menu, padronizando com o resto do app.

#### Comportamento esperado

- Remover botão "Registrar hoje" inline.
- Garantir FAB+ presente em Ciclo, alinhado canonicamente (Q22.D `useSafeBottomMargin`).
- FAB+ abre sheet com opção "Registrar hoje" + outras opções relevantes (sintomas, anotação livre).

#### Critérios de aceitação

- [ ] Botão antigo removido.
- [ ] FAB+ funcional com sheet apropriado.
- [ ] E2E cobre fluxo completo.

---

### R-NAV-2 — `M-ALARMES-SONS-FUNCIONAIS`

**Tipo:** `bug`
**Prioridade:** P1-high
**Estimativa:** 2-3h

#### Contexto

Alarmes hoje **não tocam som funcional** (sintoma reportado: "alarmes mudos" — também listado no README como bug crítico que motivou a refundação v1.0).

#### Comportamento esperado

- Alarme dispara → som CC0 toca em volume do device (default alarme).
- Múltiplos sons disponíveis (pool ≥5).
- Tocar som de preview na tela de criação/edição.
- Snooze (Q-fechado em M16) continua funcionando.

#### Hipóteses técnicas

- `expo-notifications` requer `sound` no canal Android nativo + arquivo em `android/app/src/main/res/raw/<sound>.mp3`.
- HyperOS pode restringir alarmes em background sem permissão "exact alarm" — verificar permissão em M16 manifest.
- Snooze actions podem estar quebrando o canal.

#### Critérios de aceitação

- [ ] Alarme criado para t+30s dispara com som no Xiaomi.
- [ ] 5 sons selecionáveis na criação.
- [ ] Preview de som funciona na edição.

---

### R-NAV-3 — `M-FAB-CONSISTENCIA-EDIT-DELETE`

**Tipo:** `refactor` (UX)
**Prioridade:** P2-medium
**Estimativa:** 1-2h

#### Contexto

Em "Editar Alarme", há botões de salvar/excluir misturados com o menu de navegação. O dono quer **botões + (salvar) e − (excluir) na mesma altura do botão menu**, padronizado.

#### Comportamento esperado

- Topo da tela de edição: header com botão menu (esquerda) + título (centro) + ações + (salvar) e − (excluir) (direita).
- Mesmo padrão aplicado a edição de Tarefa, Contador, Rotina, Evento, Conquista, Crise, Reflexão, Exercício, Grupo.
- Confirmação de exclusão via Alert nativo ("Excluir? Esta ação não pode ser desfeita.").

#### Critérios de aceitação

- [ ] 10+ telas de edição com header consistente.
- [ ] E2E cobre salvar e excluir em pelo menos 3 telas distintas.

---

## Tranche R-FAB — Atalhos rápidos repensados

### R-FAB-1 — `M-FAB-REMOVER-VOZ`

**Tipo:** `refactor`
**Prioridade:** P2-medium
**Estimativa:** 0.5h

#### Contexto

O atual botão "Voz" no FAB radial abre Diário Emocional direto. Dono disse: "não faz sentido termos ele." Remover.

#### Comportamento esperado

- Botão "Voz" removido do FAB radial.
- Diário Emocional permanece acessível via outros pontos (MenuLateral, atalho "Reflexão" pós R0).

#### Critérios de aceitação

- [ ] FAB radial sem opção Voz.
- [ ] Teste E2E atualizado.
- [ ] Sem regressão em rotas de Diário.

---

### R-FAB-2 — `M-FAB-CAMERA-REPENSAR`

**Tipo:** `refactor`
**Prioridade:** P2-medium
**Estimativa:** 1.5-2h

#### Contexto

O botão Câmera atualmente abre sheet com 2 opções: "Registrar Momento" e "Escanear Documento". O dono quer que **"Registrar Momento"** seja **"Reflexão com foto"**: tira a foto primeiro, depois abre o Diário/Reflexão já com a foto anexada.

"Escanear Documento" permanece intacto.

#### Comportamento esperado

- FAB Câmera → sheet com 2 opções:
  - **"Reflexão com foto"** (renomeado de Registrar Momento)
  - **"Escanear documento"**
- "Reflexão com foto": abre câmera → captura → navega para `/diario` ou `/reflexao` com foto pré-anexada (em-memória até save).
- "Escanear documento": fluxo Q9 / M09 mantido.

#### Critérios de aceitação

- [ ] Captura foto → navega com foto pré-anexada.
- [ ] Salvar Reflexão persiste foto + companion `.md`.
- [ ] Cancelar descarta foto.
- [ ] E2E cobre fluxo completo.

---

## Tranche R-WIDG — Widget homescreen

### R-WIDG-1 — `M-WIDGET-TODO-LIST-RAPIDA`

**Tipo:** `feature`
**Prioridade:** P2-medium
**Estimativa:** 4-6h
**Dependência:** M20 (widget homescreen base) já fechou + M20.x checkpoint visual ainda `[todo]`.

#### Contexto

M20 entregou widget homescreen com 2 layouts (4x2 e 4x4) e bridge JS. O dono quer agora um **widget que permita adicionar item à To-do list direto na home screen** (sem abrir o app).

#### Comportamento esperado

- Layout novo 4x2 "Quick To-do": campo de texto + botão "+".
- Tap em "+" abre intent que registra a tarefa no Vault sem abrir o app (configuration activity ou direct intent).
- Tarefa criada aparece em `/tarefas` na próxima abertura.
- Widget atualiza a cada save mostrando count atual de tarefas pendentes.

#### Critérios de aceitação

- [ ] Widget adicionável à home screen.
- [ ] Adicionar tarefa via widget persiste no Vault.
- [ ] Tarefa visível na próxima abertura do app.
- [ ] M20.x checkpoint visual paralelo executado.

#### Hipóteses técnicas

- Configuration activity para o widget: investigar se `RemoteViews` + Glance é melhor que `AppWidgetProvider` clássico.
- Como escrever no Vault sem boot do app: serviço Android nativo (Kotlin module M20 já tem alguma estrutura).

---

## Tranche R-SEC — Hardening + verificação Google + Play Protect

> Esta tranche elimina os avisos "O Google não verificou este app" + "Play Protect detectou app não verificado" e prepara para distribuição (manual ou Play Store interna).

### R-SEC-1 — `M-SEC-GOOGLE-OAUTH-VERIFICATION`

**Tipo:** `docs` + `cloud-config`
**Prioridade:** P1-high
**Estimativa:** 2-3h ativas + tempo de espera Google (até 6 semanas para sensitive scopes)

#### Contexto

A tela "O Google não verificou este app" aparece porque o OAuth Consent Screen está em **Testing mode** e o usuário não está na lista de testers, OU o app não passou pelo Google verification process.

Para uso pessoal entre 2 pessoas (dono + Vitória), **manter em Testing mode + adicionar testers explicitamente** é a abordagem correta e elimina 100% do aviso para esses usuários.

#### Comportamento esperado

- Cloud Console > OAuth Consent Screen > Add Test Users → adicionar 2 emails.
- Esses 2 usuários não veem mais "app não verificado" no consent.
- Demais usuários (caso futuros) veem o aviso até o app ir para Production.

#### Critérios de aceitação

- [ ] 2 emails de teste adicionados.
- [ ] Validação live: ambos completam OAuth sem ver o aviso.
- [ ] Doc `docs/RELEASE.md` atualizado com checklist + screenshot do Console.

#### Pendência para v1.1+ (descopável)

- Submissão para Google Verification (caso queira distribuir publicamente). Custo: $0 para básico, mas **$15-75k para Security Assessment** se usar scopes sensíveis como `calendar.events.readonly`. **Não fazer agora**.

---

### R-SEC-2 — `M-SEC-PLAY-PROTECT-SIGNATURE`

**Tipo:** `infra`
**Prioridade:** P1-high
**Estimativa:** 2-3h

#### Contexto

Android Play Protect avisa "app não verificado" para APKs **side-loaded** com keystore não-registrada. Q17.e fechou keystore EAS encriptado em GitHub Secrets. Esta sprint **valida que o flow está completo** e adiciona o passo final: **registrar a keystore no Google Play App Signing** (mesmo sem publicar — apenas registrar permite Play Protect reconhecer).

#### Comportamento esperado

- APK assinado pela keystore canônica (Q17.e).
- Keystore registrada no Play Console como app interno (não precisa publicar para Play Store pública).
- Play Protect deixa de exibir aviso após registro propagar (até 48h).

#### Critérios de aceitação

- [ ] Keystore canônica documentada em `docs/RELEASE.md`.
- [ ] App registrado no Play Console (testing track interno, sem release público).
- [ ] APK instalado sem aviso de Play Protect em ≥3 devices.

#### Risco

Registrar no Play Console envolve criar conta Google Play Developer ($25 one-time). Decisão do dono se isso é aceitável. **Alternativa sem custo:** orientar usuários a aceitar manualmente em "Permitir instalação de fontes desconhecidas" e ignorar aviso (status quo).

---

### R-SEC-3 — `M-SEC-PRIVACY-POLICY-TERMS`

**Tipo:** `docs`
**Prioridade:** P1-high
**Estimativa:** 2-3h

#### Contexto

Privacy Policy + Terms of Service são pré-requisito para Cloud Console e Play Console (mesmo em modo teste). O app **não envia dados** (filosofia "sem rede de saída" exceto OAuth Google), o que torna a privacy policy curta e honesta.

#### Comportamento esperado

- 2 páginas HTML estáticas servidas via GitHub Pages no próprio repo:
  - `https://andrebfarias.github.io/ouroboros-mobile/privacy.html`
  - `https://andrebfarias.github.io/ouroboros-mobile/terms.html`
- Conteúdo refletindo a filosofia real (zero analytics, zero crash reporters externos, Vault local + sincronizado via Syncthing/SAF).
- Linkados no Cloud Console e no `app.json`.

#### Critérios de aceitação

- [ ] Páginas no ar.
- [ ] URLs adicionadas ao Cloud Console.
- [ ] Linkadas em Settings > Sobre.

---

### R-SEC-4 — `M-SEC-PROGUARD-MINIFY`

**Tipo:** `infra`
**Prioridade:** P2-medium
**Estimativa:** 2-4h

#### Contexto

APK de produção atual provavelmente não tem ProGuard/R8 minify ativado (Expo default é minimal). Habilitar reduz bundle, ofusca código (proteção parcial contra reverse engineering — limitado em RN porque o JS bundle é separado) e melhora score em scanners.

#### Comportamento esperado

- `android/app/build.gradle` com `minifyEnabled true` + `shrinkResources true` em release.
- Regras ProGuard customizadas para Expo + RN + Reanimated + Health Connect.
- APK final ≥ 15% menor.

#### Critérios de aceitação

- [ ] Build de release passa.
- [ ] Smoke + Gauntlet verdes pós-minify.
- [ ] Tamanho APK reduzido.
- [ ] Sem regressão em features sensíveis (Reanimated, Health Connect, BottomSheet).

---

### R-SEC-5 — `M-SEC-SECRET-LEAK-AUDIT`

**Tipo:** `infra` + `audit`
**Prioridade:** P1-high
**Estimativa:** 1-2h

#### Contexto

Garantir que nenhum secret (OAuth client secret, keystore password, API keys) está hardcoded em código, doc, ou history do git.

#### Comportamento esperado

- Rodar `gitleaks` ou similar em todo o histórico.
- Qualquer leak detectado: rotacionar a credencial **antes** de fechar a sprint.
- Adicionar hook pre-commit que bloqueia commits com padrões suspeitos.

#### Critérios de aceitação

- [ ] `gitleaks detect --source . --no-banner` retorna zero findings.
- [ ] Pre-commit hook ativo.
- [ ] Documentado em `docs/SECURITY.md`.

---

## Tranche R-DX — Quality of Life para dev/IA (achados colaterais)

Estas sprints **não foram pedidas explicitamente** pelo dono, mas observei no repo e considero ganho real para velocidade de execução das demais.

### R-DX-1 — `M-DX-SPRINT-TEMPLATE-V2`

**Tipo:** `infra`
**Estimativa:** 1h

Criar template `docs/sprints/_TEMPLATE-FEATURE-V2.md` com seções: Contexto / Comportamento esperado / AC / Hipóteses técnicas / Dependências / Decisões abertas / Notas anti-débito. Hoje há `_TEMPLATE-SAVE-FEATURE.md` apenas para saves.

### R-DX-2 — `M-DX-GAUNTLET-RECORD-VIDEO`

**Tipo:** `infra`
**Estimativa:** 2-3h

Adicionar comando `npm run gauntlet:record` que grava MP4 do fluxo Playwright (já tem screenshots; vídeo facilita revisão pós-sprint).

### R-DX-3 — `M-DX-AUTO-GENERATE-SPEC-FROM-ISSUE`

**Tipo:** `infra` + `automation`
**Estimativa:** 2-3h

Script `scripts/spec-from-issue.sh <num>` que pega título + body de uma issue GitHub e gera skeleton de spec em `docs/sprints/`.

### R-DX-4 — `M-DX-ADB-WORKFLOW-HELPERS`

**Tipo:** `infra`
**Estimativa:** 1-2h

Adicionar helpers em `scripts/`:
- `adb-pull-vault.sh` (pull do `/sdcard/Documents/Ouroboros/`)
- `adb-logcat-app.sh` (filtra logs do app)
- `adb-clear-data.sh` (reset estado para validação fresh)

### R-DX-5 — `M-DX-EAS-LOCAL-BUILD-DOCS`

**Tipo:** `docs`
**Estimativa:** 1h

Doc `docs/EAS-LOCAL-BUILD.md` consolidando o fluxo de build local (alpha-5 em diante via GH Actions local). Atualmente disperso em commits.

### R-DX-6 — `M-DX-ANONIMATO-PRE-PUSH`

**Tipo:** `infra`
**Estimativa:** 0.5-1h

Reforçar `scripts/check_anonimato.sh` rodando como hook `pre-push` (atualmente é pre-commit; pre-push captura amend retroativo).

---

## Tranche R-OPS — Automação DevOps (achados colaterais)

### R-OPS-1 — `M-OPS-GITHUB-ACTIONS-RELEASE-FLOW`

**Tipo:** `infra`
**Estimativa:** 3-4h

Workflow GitHub Actions completo: tag `v*` → build APK via EAS local → upload artifact → criar GitHub Release com APK + CHANGELOG entry. Atualmente parece ser manual.

### R-OPS-2 — `M-OPS-DEPENDABOT-CONFIG`

**Tipo:** `infra`
**Estimativa:** 0.5h

`.github/dependabot.yml` com policy: npm weekly, GitHub Actions weekly, security updates immediate. **Excluir** upgrades majors de Expo/RN/Reanimated (alto risco em alpha).

### R-OPS-3 — `M-OPS-CACHE-CI`

**Tipo:** `infra`
**Estimativa:** 1-2h

Cachear `node_modules` e Gradle no workflow → reduzir tempo de CI em 30-50%.

### R-OPS-4 — `M-OPS-BRANCH-PROTECTION`

**Tipo:** `infra`
**Estimativa:** 0.5h

Settings GitHub: `main` requer PR + smoke verde + Gauntlet verde + 1 review (mesmo solo, força auto-review explícito).

### R-OPS-5 — `M-OPS-RELEASE-NOTES-AUTO`

**Tipo:** `infra`
**Estimativa:** 1-2h

Script que extrai entries do CHANGELOG entre 2 tags e gera release notes automáticas no GitHub Release.

---

## Achados adicionais observados (não solicitados pelo dono, propor antes de executar)

Estes pontos surgiram da leitura do `ROADMAP.md` e `README.md`; o dono **não pediu**, mas valem flag:

1. **AUDIT-T1B6-MIGRATION-FIX `[todo]` alta prioridade**: filtro `sync-conflict` em 4 listadores periféricos. Marcado como pré-v1.0 mas ainda aberto. **Promover para R-CRIT-5 antes de F1.**

2. **AUDIT-T1B3-PICKERS-RESTANTES `[todo]`**: 5 pickers silenciosos sem toast. Risco recorrente de "save aparenta funcionar mas falha". **Promover para R-CRIT-6 se R-CRIT-3 não absorver.**

3. **AUDIT-T2-LOCK-VAULT `[todo]`**: race read-then-write em saves multi-device. Marcado como "pós validação live alpha-11". **Decidir agora**: se a validação live alpha-11 expôs o sintoma (dois devices simultâneos do casal podem ter colisão), promover. Senão, manter como `[v1.1]`.

4. **Filosofia "sem gamificação" vs Recap**: confirmar com dono que o Recap atual está OK e que R-RECAP-3 (empty states neutros) preserva a filosofia. Risco de drift se variações ficarem celebratórias demais.

5. **Onboarding atual exibe nome técnico do app**: ver R-CRIT-2 / R-INT-2. Vale uma **audit transversal de strings** em onboarding para garantir que tudo usa "Ouroboros" e não package.

6. **Backup automático opt-in default OFF (M-BACKUP-AUTOMATICO / C5)**: filosofia preserva. Mas confirmar com dono se o couple uso quer **auto-export semanal silencioso** para o Vault Syncthing (não precisa de rede externa).

7. **Acessibilidade screen reader (TalkBack)**: WCAG completo fechou contrastes (C2 + C2.x.*), mas a11y de navegação por screen reader não tem cobertura explícita. **Propor R-A11Y-1** se for prioridade — ainda mais relevante se app for compartilhado com pessoas com deficiência visual em algum momento.

8. **Versão desktop pasta `versão desktop/` no repo**: aparece no listing. Verificar se é histórico legítimo ou se deveria estar em outro repo (sibling `protocolo-ouroboros`?). Possível clean-up.

9. **`HANDOFF-PROMPT.md` + `HOW_TO_RESUME.md` + `STATE.md`**: continuidade entre sessões já está bem documentada (parabéns). Sugiro um **`HANDOFF-CHECKLIST.md`** com checklist binário antes de iniciar uma sessão fresh (5 itens, marcação rápida).

10. **Cota EAS 15 builds restantes**: confirmado no roadmap (plano usa 2: preview + production). Cuidado com retries não planejados em R-CRIT-1 (OAuth) — usar Nível A (web) ao máximo antes de gastar EAS preview build.

---

## Ordem de execução sugerida

Distribuição em 4 fases. Sprints dentro da mesma fase podem rodar em paralelo via worktrees (padrão já estabelecido em AUDIT-T1 + T3 com `0d95b9a → 6779059`).

**Fase 1 — Crítico (bloqueia F1):** `R0` → `R-CRIT-1` → `R-CRIT-3` → `R-CRIT-2` → `R-CRIT-4` → `R-NAV-2` (alarmes mudos é sintoma original que motivou refundação).

**Fase 2 — UX + Recap + Home (bloqueia rc2):** `R-RECAP-1` ‖ `R-RECAP-2` ‖ `R-RECAP-3` ‖ `R-RECAP-4` ‖ `R-MEDIA-1` ‖ `R-HOME-1` (pede decisão A/B/C) → `R-HOME-2` ‖ `R-HOME-3` → `R-INT-1` ‖ `R-INT-2` ‖ `R-INT-3` → `R-FAB-1` ‖ `R-FAB-2`.

**Fase 3 — Features secundárias (paralelo a F1):** `R-SF-*` ‖ `R-ROT-*` ‖ `R-RECAP-5` ‖ `R-MEDIA-2` ‖ `R-NAV-1` ‖ `R-NAV-3` ‖ `R-WIDG-1` ‖ DX-* ‖ OPS-* ‖ achados (1-10).

**Fase 4 — Segurança + release:** `R-SEC-*` → field test F1 (7 dias) → release G1.

---

## Apêndice — Decisões abertas que precisam do dono antes da execução

Lista consolidada. Sprints **paradas** até resposta:

| ID | Decisão | Bloqueia |
|----|---------|----------|
| D1 | Status do Casal + Humor+Última na Home: opção A, B ou C? | R-HOME-1 |
| D2 | Spotify/YouTube como integrações (rompe parcialmente "sem rede de saída")? | R-INT-4, R-MEDIA-1 |
| D3 | Track ambient embutido no slideshow Memórias OK? | R-RECAP-4 |
| D4 | Registrar app no Play Console ($25 one-time)? | R-SEC-2 |
| D5 | AUDIT-T2-LOCK-VAULT promover para R-CRIT ou manter v1.1? | priorização |
| D6 | Backup automático semanal silencioso para Vault? | achado #6 |
| D7 | Pasta `versão desktop/` mantém no repo ou move? | achado #8 |
| D8 | Auditoria a11y TalkBack agora ou v1.1? | achado #7 |

---

## Pós-script para o agente executor

- **Ler o CLAUDE.md raiz primeiro.** Regra −1 é inviolável.
- **Spec ambígua = parar e perguntar.** Não inventar.
- **Cada sprint vira issue + branch + PR + merge squash + tag** conforme `docs/ORCHESTRATOR_PLAYBOOK.md`.
- **Validação cresce com risco**: Nível A (web) sempre; Nível B (emulador) para APIs nativas; Nível C (device real) **apenas com permissão explícita do dono** — economizar EAS builds e tempo do dono.
- **CHANGELOG + ROADMAP** atualizar a cada fechamento.
- **Quando em dúvida sobre filosofia** (gamificação, rede de saída, anonimato), reler `docs/CONTEXTO.md` e `CLAUDE.md`.

Fim do briefing.
