# Roadmap — Ouroboros Mobile

Mapa canônico de todas as sprints do projeto. Atualizado a cada
fechamento de sprint.

> **Mapa funcional do app:**
> [`docs/FEATURES-CANONICAS.md`](docs/FEATURES-CANONICAS.md)
> consolida o que cada sprint entrega na perspectiva do usuário
> final. Toda sprint que introduz/modifica/remove feature deve
> atualizar esse arquivo no mesmo commit.

## Onda R — Refinamentos pós alpha-11 + Segurança v1.0.0 (2026-05-15+)

Continuação da Onda Q. Briefing canônico:
[`ONDA-R-BRIEFING.md`](ONDA-R-BRIEFING.md) (1299 linhas).
Backlog consolidado: [`docs/sprints/_BACKLOG.md`](docs/sprints/_BACKLOG.md).

**47 sprints novas** (46 do briefing + 1 anti-débito automação)
organizadas em 4 fases. Estimativa total ~93–130h ativas + 7d field
test (F1) + 1d release (G1) ≈ 17–25 dias até v1.0.0.

Versões alvo: `v1.0.0-alpha-12` após Fase 1; `v1.0.0-rc2` após
Fase 2; `v1.0.0` após Fase 4 + F1 verde.

### Fase 1 — Crítico (bloqueia F1) — ~10–14h

| ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|
| R0 | Renomeação Crise/Conquista/Gatilho/Reflexão | refactor+migration | P1 | `b010660` | `[ok]` |
| R-CRIT-1 | OAuth Unmatched Route regression + sanitização +not-found | fix | P0 | `17ad84b` | `[ok]` |
| R-CRIT-3 | Mídia ausente em Recap/Galeria + writers atômicos + slide 'midias' | bug | P0 | `c722538` | `[ok]` |
| R-CRIT-4 | Loader animation UUID por instância (querySelectorAll defense-in-depth) | fix | P2 | `d53d4d9` | `[ok]` |
| R-NAV-2 | Alarmes 5 sons CC0 + canal por som | bug | P1 | `83348b6` | `[ok]` |
| R-CRIT-2 | OAuth consent app name (precisa Cloud Console editing dono) | fix | P1 | — | `[wip-dono]` |

### Fase 2 — UX + Recap + Home (bloqueia rc2) — ~25–35h

| ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|
| R-RECAP-1 | Lista itens clicáveis | feature | P1 | `25d4849` | `[ok]` (Onda 2A.2) |
| R-RECAP-2 | Números big clicáveis | feature | P1 | `a4f0d8a` | `[ok]` (Onda 2B.2) |
| R-RECAP-3 | Empty states não-tóxicos | feature+copy | P1 | `9514061` | `[ok]` |
| R-FAB-1 | FAB remover Voz | refactor | P2 | `47c17f9` | `[ok]` |
| R-CROSS-FLOW-AUDIT | Interconexão 12 fluxos cruzados + sibling | audit+fix | P1 | `bebdf12` | `[ok]` |
| R-VAULT-CANONICAL-COMPLETE | Tudo em `.md` (settings + sessão + stats) | refactor+feature | P1 | `[split]` | A+B |
| **R-VAULT-CANONICAL-COMPLETE-A** | Schemas + writers + migration boot (split A) | refactor+feature | P1 | `81d4bad` | `[ok]` (Onda 2A.1) |
| **R-VAULT-CANONICAL-COMPLETE-B** | Stats agregadas + UI Settings + cross-repo (depende de A) | refactor+feature | P1 | `62ebcdf` | `[ok]` (Onda 2B.1) |
| R-RECAP-1 | Lista itens clicáveis | feature | P1 | `25d4849` | `[ok]` (Onda 2A.2) |
| R-RECAP-2 | Números big clicáveis | feature | P1 | `a4f0d8a` | `[ok]` (Onda 2B.2) |
| R-RECAP-4 | Memórias slideshow v2 | feature | P2 | 3–4h | `R-RECAP-4-MEMORIAS-SLIDESHOW-V2-spec.md` |
| R-MEDIA-1 | Spotify/YouTube/áudio preview | feature | P1 | `8088c80` | `[ok]` (Onda 2A.3) |
| R-HOME-1 | Hoje prioridade e recorrência (D1=C remover Status+Humor) | refactor+redesign | P1 | 4–5h | `R-HOME-1-PRIORIDADE-RECORRENCIA-spec.md` |
| R-HOME-2 | Hoje próximos eventos merge | feature | P2 | 2–3h | `R-HOME-2-PROXIMOS-EVENTOS-MERGE-spec.md` |
| R-HOME-3 | Hoje to-do inline check | feature | P1 | 1–2h | `R-HOME-3-TODO-INLINE-CHECK-spec.md` |
| R-INT-1 | Hub Integrações Utilitários (depende VAULT-B) | feature | P1 | 2–3h | `R-INT-1-HUB-UTILITARIOS-spec.md` |
| R-INT-2 | Nome do app em permissões | fix | P1 | 1–2h | `R-INT-2-NOME-APP-PERMISSOES-spec.md` |
| R-INT-3 | Health Connect não funciona | bug | P1 | 2–4h | `R-INT-3-HEALTH-CONNECT-NAO-FUNCIONA-spec.md` |
| R-FAB-2 | FAB Câmera repensar (Reflexão com foto) | refactor | P2 | `pending` | `[ok]` (Onda 2A.4) |

### Fase 3 — Features secundárias (paralelo a Fase 4) — ~40–55h

| ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|
| R-SF-1 | Grupos de Treino em Saúde Física | feature | P1 | 2–3h | `R-SF-1-GRUPOS-DE-TREINO-spec.md` |
| R-SF-2 | Exercício GIF cadastro (validation) | validation | P2 | 1–2h | `R-SF-2-EXERCICIO-GIF-CADASTRO-spec.md` |
| R-SF-3 | Marcação rápida (Venvanse, hábitos) | feature | P2 | 2–3h | `R-SF-3-MARCACAO-RAPIDA-MED-spec.md` |
| R-ROT-1 | Rotinas inteligência temporal | feature | P1 | 2–3h | `R-ROT-1-INTELIGENCIA-TEMPORAL-spec.md` |
| R-ROT-2 | Rotinas escopo expandido (categorias) | docs+feature | P3 | 1–2h | `R-ROT-2-ESCOPO-EXPANDIDO-spec.md` |
| R-RECAP-5 | Recap Contadores (eventos no contador) | feature | P2 | 2–3h | `R-RECAP-5-CONTADORES-EVENTOS-spec.md` |
| R-MEDIA-2 | Recap autoplay áudio | feature | P2 | 2–3h | `R-MEDIA-2-RECAP-AUTOPLAY-AUDIO-spec.md` |
| R-RECAP-6 | Botão compartilhar slide Memórias (PNG 1080x1920) | feature | P2 | 2–3h | `R-RECAP-6-SHARE-SLIDE-MEMORIAS-spec.md` |
| R-INFRA-ENV-JSON-TSCONFIG | Fallback tipo env.json (achado R-CRIT-4) | infra | P3 | 30min | `R-INFRA-ENV-JSON-TSCONFIG-spec.md` |
| R-INFRA-WORKTREE-BOOTSTRAP | Script bootstrap automático worktrees (achado recorrente) | infra | P3 | 30–45min | `R-INFRA-WORKTREE-BOOTSTRAP-spec.md` |
| R-NAV-1 | Ciclo botão registrar → FAB | refactor | P2 | 1–2h | `R-NAV-1-CICLO-BOTAO-REGISTRAR-MIGRACAO-FAB-spec.md` |
| R-NAV-3 | FAB consistência edit/delete (header) | refactor | P2 | 1–2h | `R-NAV-3-FAB-CONSISTENCIA-EDIT-DELETE-spec.md` |
| R-WIDG-1 | Widget homescreen to-do rápida | feature | P2 | 4–6h | `R-WIDG-1-TODO-LIST-RAPIDA-spec.md` |
| R-INT-4 | Spotify/YouTube conectar | feature | P3 | 4–6h | `R-INT-4-SPOTIFY-YOUTUBE-CONECTAR-spec.md` |
| R-DX-EXECUTOR-WORKTREE-ENFORCE | Constraint técnico (hook) pra honrar worktree isolation (3º incidente recorrente) | infra+DX | P2 | 1-2h | `R-DX-EXECUTOR-WORKTREE-ENFORCE-spec.md` |
| R-MEDIA-LINKEXTERNO-CLEANUP | Remover dead code LinkExterno em DetalheConquista (achado R-MEDIA-1) | cleanup | P3 | 30min | `R-MEDIA-LINKEXTERNO-CLEANUP-spec.md` |
| R-DX-1 | Sprint template v2 | infra | — | 1h | `R-DX-1-SPRINT-TEMPLATE-V2-spec.md` |
| R-DX-2 | Gauntlet record video | infra | — | 2–3h | `R-DX-2-GAUNTLET-RECORD-VIDEO-spec.md` |
| R-DX-3 | Auto-generate spec from issue | infra+automation | — | 2–3h | `R-DX-3-AUTO-GENERATE-SPEC-FROM-ISSUE-spec.md` |
| R-DX-4 | ADB workflow helpers | infra | — | 1–2h | `R-DX-4-ADB-WORKFLOW-HELPERS-spec.md` |
| R-DX-5 | EAS local build docs | docs | — | 1h | `R-DX-5-EAS-LOCAL-BUILD-DOCS-spec.md` |
| R-DX-6 | Anonimato pre-push | infra | — | 0.5–1h | `R-DX-6-ANONIMATO-PRE-PUSH-spec.md` |
| R-OPS-1 | GitHub Actions release flow | infra | — | 3–4h | `R-OPS-1-GITHUB-ACTIONS-RELEASE-FLOW-spec.md` |
| R-OPS-2 | Dependabot config | infra | — | 0.5h | `R-OPS-2-DEPENDABOT-CONFIG-spec.md` |
| R-OPS-3 | Cache CI | infra | — | 1–2h | `R-OPS-3-CACHE-CI-spec.md` |
| R-OPS-4 | Branch protection | infra | — | 0.5h | `R-OPS-4-BRANCH-PROTECTION-spec.md` |
| R-OPS-5 | Release notes auto | infra | — | 1–2h | `R-OPS-5-RELEASE-NOTES-AUTO-spec.md` |
| R-BACKUP-AUTO | Backup semanal silencioso pro Vault | feature | P2 | 3–4h | `R-BACKUP-AUTO-spec.md` |
| R-A11Y-TALKBACK | Auditoria + correção navegação screen reader | audit+feature | P2 | 3–5h | `R-A11Y-TALKBACK-spec.md` |

### Fase 4 — Segurança + release (bloqueia v1.0.0 production) — ~12–18h

| ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|
| R-SEC-1 | Google OAuth verification (testers) | docs+cloud-config | P1 | 2–3h | `R-SEC-1-GOOGLE-OAUTH-VERIFICATION-spec.md` |
| R-SEC-2 | Play Protect signature | infra | P1 | 2–3h | `R-SEC-2-PLAY-PROTECT-SIGNATURE-spec.md` |
| R-SEC-3 | Privacy policy + terms | docs | P1 | 2–3h | `R-SEC-3-PRIVACY-POLICY-TERMS-spec.md` |
| R-SEC-4 | ProGuard minify | infra | P2 | 2–4h | `R-SEC-4-PROGUARD-MINIFY-spec.md` |
| R-SEC-5 | Secret leak audit | infra+audit | P1 | 1–2h | `R-SEC-5-SECRET-LEAK-AUDIT-spec.md` |
| R-PLAYCONSOLE-SETUP | TODO Play Console (dono executa, sibling R-SEC-2) | docs+cloud | P1 | 40min dono + propagação | `R-PLAYCONSOLE-SETUP-spec.md` |

### Sprint anti-débito derivada (independente das 4 fases)

| ID | Sprint | Tipo | Estim. | Spec |
|---|---|---|---|---|
| AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS | Script cruza ROADMAP × git × código pra detectar fantasmas | infra+automation | 2–3h | `AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS-spec.md` |

### Decisões tomadas (2026-05-15 noite)

Todas resolvidas. Detalhes em [`docs/sprints/_BACKLOG.md`](docs/sprints/_BACKLOG.md).

| D# | Resposta | Sprint afetada |
|---|---|---|
| D1 | **C** (remover Status Casal + Humor+Última) | R-HOME-1 |
| D2 | **A** (Spotify + YouTube ambos OK) | R-INT-4, R-MEDIA-1 |
| D3 | **Sim** (track ambient, toggle default OFF) | R-RECAP-4 |
| D4 | **Sim** ($25 Play Console — sprint R-PLAYCONSOLE-SETUP criada) | R-SEC-2 |
| D5 | **Sim** (T2 já mergeado `488e7fa`) | — |
| D6 | **Sim** (sprint R-BACKUP-AUTO criada) | nova |
| D7 | **Deletado** (`versão desktop/` removida 2026-05-15) | — |
| D8 | **Agora** (sprint R-A11Y-TALKBACK criada Fase 3) | nova |

### Ordem de execução resumida

```
Fase 1 (sequencial parcial):
  R0 → R-CRIT-1 ‖ R-CRIT-3 → R-CRIT-2 ‖ R-CRIT-4 ‖ R-NAV-2

Fase 2 (muito paralelizável):
  R-RECAP-1/2/3/4 ‖ R-MEDIA-1 ‖ R-HOME-1 (após D1) → R-HOME-2/3 → R-INT-1/2/3 → R-FAB-1/2

Fase 3 (paralelo a Fase 4):
  R-SF-* ‖ R-ROT-* ‖ R-RECAP-5 ‖ R-MEDIA-2 ‖ R-NAV-1/3 ‖ R-WIDG-1 ‖ R-INT-4 (após D2) ‖ R-DX-* ‖ R-OPS-*

Fase 4 (sequencial):
  R-SEC-1 → R-SEC-3 → R-SEC-2 (após D4) → R-SEC-4 → R-SEC-5 → F1 → G1 (release)
```

---

## Auditoria pré-v1.0 — 2026-05-15

Auditoria sistemática em 5 eixos. Tranches 1 + 3 entregues em paralelo
via worktrees isoladas. Tranche 2 (lock vault) e 2 sub-sprints
periféricas registradas como anti-débito.

| # | Sprint | Commits | Status |
|---|---|---|---|
| AUDIT-T1 | Bugs latentes B1–B6 (atomic write, OAuth wrap, toast permission, slider clamp, input maxLength, sync-conflict filter em 16 listadores) | `0d95b9a` → `6779059` (6 commits) | `[ok]` |
| AUDIT-T3 | DX: prettier + scripts diag/fix-it/bump-versioncode + OAuth doc consolidado + README clarificado + install legacy-peer-deps | `ec6db3b` → `16eff36` (5 commits) | `[ok]` |
| AUDIT-NORMALIZE | `prettier --write` em src+app+tests (379 arquivos) | `9609961` | `[ok]` |
| AUDIT-T1B3-PICKERS-RESTANTES | Toast em 5 pickers silenciosos (FotosBlock, MidiaFotoTab×2, localizacao discriminator, adicionarFotoManual discriminator) | `00d82ee` | `[ok]` |
| AUDIT-T1B6-MIGRATION-FIX | Filtro `sync-conflict` em `migrarVaultLayoutPorTipo` (8 blocos) + 4 listadores periféricos | `a49222f` | `[ok]` |
| AUDIT-T2-LOCK-VAULT | Opção A: sempre suffix `-<deviceId>` + util `forceDeviceIdSuffix` + migration boot idempotente. Elimina race read-then-write em 6 saves | `488e7fa` | `[ok]` |
| AUDIT-T1B7-DRAFT-EXPORT-FIX | Anti-débito dos achados de T1B6: `migrarDraftsParaTreinoSessao` + `exportarVault` ZIP filter | `4e58f40` | `[ok]` |
| AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS | Script Python detecta drift `[todo]` × código + integração smoke warning | `1304aba` | `[ok]` |

Métricas pós-auditoria + Fase 0 Onda R: **216 suítes / 2021 testes verde** (subiu de 214/2016
após T1B7 + script de fantasmas em 2026-05-15 noite-2) · TS strict 0 · drift contract
174 campos · push em main · `.prettierrc` ativo · hooks/pre-commit com
auto-format silencioso.

---

## Onda Q — pré v1.0.0 (2026-05-11 a 2026-05-13)

Maratona de fixes de UX + features pré-release final. Resposta a bugs
reportados em validação live no Xiaomi 2312DRAABG HyperOS + pedidos
do dono. Validações via dev-client + Metro live reload + adb tap por
bounds canônicos.

Detalhes completos em [`docs/ONDA-Q-2026-05-12.md`](docs/ONDA-Q-2026-05-12.md) (6 sessões registradas).

| # | Sprint | Commit | Status |
|---|---|---|---|
| Q0 | OAuth Google Calendar (scope `calendar.events.readonly` registrado, env.json `android` client) | `557319f` + `c6abaa5` + `cee0d17` | `[ok]` |
| Q1 | Rename app → "Ouroboros" | `557319f` | `[ok]` |
| Q2 | Recap visível na Home (5 iterações, BotaoRecap inline) | `557319f` | `[ok]` |
| Q3 | MenuLateral `springs.smooth` (animação sóbria) | `557319f` | `[ok]` |
| Q4 | FABs unificados em 64dp | `557319f` | `[ok]` |
| Q5.1 | TranscreverButton separado do MicrofoneButton (resolve aborto de mic compartilhado) | `c6abaa5` | `[ok]` |
| Q5.2 | Speech-recognition `continuous=true` para fala longa | `2edbc98` | `[ok]` |
| Q6 | Ref guard `goBackOnce()` no diário (evita `GO_BACK was not handled`) | `c6abaa5` | `[ok]` |
| Q7 | Sheet câmera "Registrar momento" com retry 800ms (cobre A30) | `557319f` | `[ok]` |
| Q8 | Ciclo persistência — simetria save/load via `autorPadrao` | `47f5564` | `[ok]` |
| Q9 | Galeria unificada `/galeria` (Vault Explorer) | `3f919f5` | `[ok]` |
| Q10 | Share Intent expandido — Pix/boleto/extrato regex classifier | `7d3332a` | `[ok]` |
| Q11.a | Schema Rotina + CRUD vault + rotas `/rotinas` | `6d96ae4` | `[ok]` |
| Q11.b | SeletorRotina integrado no SheetNovoTreino + modal "Substituir treino atual?" | `6d96ae4` | `[ok]` |
| Q11.c | Executor de treino com timer descanso ajustável | `2edbc98` | `[ok]` |
| Q12 | Bridge ETL Mobile↔Backend (`_schema_version: 1` em todos writers) | `245954f` | `[ok]` |
| Q14 | Entry "Rotinas" no MenuLateral (Utilitários, Dumbbell ícone) | `2edbc98` | `[ok]` |
| Q15 | SeletorRotina fecha SheetNovoTreino antes de abrir (anti-empilhamento) | `2edbc98` | `[ok]` |
| Q17.a | Setup Health Connect — pacote + AndroidManifest + tela `/settings/integracoes` + rationale activity | `1fcbaf5` | `[ok]` |
| Q17.b | `lib/health/sync.ts` — read/write ExerciseSession + Weight + BodyFat + MenstruationFlow + Steps | `cee0d17` | `[ok]` |
| Q17.c | Toggle `healthConnectSync` em settings + hook em saveTreino + entry em `/settings/index` | `cee0d17` | `[ok]` |
| Q17.c.b | Hook HC em `escreverMedida` (peso → WeightRecord) | `15733aa` | `[ok]` |
| Q17.c.c | Hook HC em `escreverRegistroCiclo` (fase=menstrual → MenstruationFlowRecord) | `15733aa` | `[ok]` |
| Q17.d | Bloco "Importados de Conexão Saúde" em Evolução (passos 7d + peso + treinos 30d) | `ff89ad8` | `[ok]` |
| Q18 | `MidiaExecucaoPlayer` (player GIF/MP4/JPG reusável + integração Q18.b + video real Q18.x) | `1fcbaf5`+`272c912`+`15ce58a` | `[ok]` |
| Q18.b | Player integrado em detalhe + executor + galeria; `ExercicioRotinaSchema.gif` opcional | `272c912` | `[ok]` |
| Q19 | Grupos de Treino — schema + vault CRUD + rotas `/grupos/` + form Q19.b completo | `1fcbaf5`+`93a8e23` | `[ok]` |
| Q19.b | Form completo + multi-select de rotinas + sheet "Qual treino hoje?" + Iniciar pill | `93a8e23` | `[ok]` |
| Q20 | Share Pix/boleto/extrato — spec runtime validation | `ff20d2c` (spec) | `[spec]` |
| Q21 | ETL unificação Mobile↔Backend Python — CSV canônico + drift check no smoke + 7 issues sibling | `840513f`+`1c9ed04` | `[ok]` |
| Q17.c.d | Campo `gordura` em MedidasSchema + hook `escreverBodyFatEmHC` | (HEAD) | `[ok]` |
| Q17.e | Keystore EAS encriptado em 4 GitHub Secrets + workflow signing | (HEAD) | `[ok]` |
| Q22.A | Fix transcrição duplicando texto no diário (split partial/final no TranscreverButton) | (HEAD) | `[ok]` |
| Q22.B | OAuth Google 400 invalid_request — 4 causas raiz: SHA-1 typo + iOS client + redirect reverso-DNS + maybeCompleteAuthSession | `0148a1d`+`fabab93`+`d8e594a`+`c2495b4` | `[ok]` |
| Q22.C | Fix crash hook order em `RotinaDetalhe` (useCallback após early return) | `358c957` | `[ok]` |
| Q22.D | Fix FAB+ posicionamento canônico via useSafeBottomMargin (alinha com FABMenu/Verde) | `358c957` | `[ok]` |
| Q22.E | Fix drawer ScrollView sem flex:1 (Utilitários cortados pelo footer Configurações) | `358c957` | `[ok]` |
| Q22.F | Empty state Q17.d CardHCResumo (HC off mostra CTA pra integrações em vez de invisível) | `358c957` | `[ok]` |
| Q22.G | Share intent Pix via expo-share-intent + useShareIntentListener no _layout | `3a1726f` | `[ok]` |
| Q24.a | Recap navegável: cards Números clicáveis → listas → edição | `1124998` | `[ok]` |
| Q24.b | Recap Memórias / Wrapped MVP: toggle 3-modos + slideshow 5 slides + paleta colorsMemorias | `ea10ce8` | `[ok mvp]` |
| Q24.b.a | Ambient audio file `.mp3` + playback expo-av no slideshow Memórias | _backlog_ | `[backlog]` |
| Q24.b.b | Ken Burns nas fotos do diário/marco em slides Memórias | _backlog_ | `[backlog]` |
| Q24.b.c | Export memória como PNG stories IG via react-native-view-shot | _backlog_ | `[backlog]` |
| Q18.x | `<Video>` real do expo-av no `MidiaExecucaoPlayer` | (HEAD) | `[ok]` |
| Q21.b | 7+ issues `etl-contract` no sibling Python `protocolo-ouroboros` | issues #24-30 sibling | `[ok]` |
| Q23 | Bump `compileSdk 35` via expo-build-properties (destrava CI alpha-5+) | `46bec14` | `[ok]` |

**Releases gerados:**

| Versão | Tipo | Commit | Status |
|---|---|---|---|
| `v1.0.0-alpha-4` | EAS preview | `a1dd3c9` | publicado (OAuth funciona, pré-Q14/Q17.d/Q18.b/Q19.b) |
| `v1.0.0-alpha-5` | GitHub Actions local (debug keystore) | `46bec14` | publicado, OAuth quebrado (pre-Q17.e) |
| `v1.0.0-alpha-6` | GitHub Actions local (keystore EAS Q17.e) | `3aef8e7` | publicado, signature canônica |
| `v1.0.0-alpha-7` | GitHub Actions local (Q22.C/D/E/F) | `358c957` | publicado, fixes pos-validacao alpha-6 |
| `v1.0.0-alpha-8` | GitHub Actions local (Q22.B iOS client) | `fabab93` | publicado, oauth client tipo iOS |
| `v1.0.0-alpha-9` | GitHub Actions local (Q22.B redirect reverso-DNS) | `d8e594a` | publicado |
| `v1.0.0-alpha-10` | GitHub Actions local (Q22.B maybeCompleteAuthSession) | `c2495b4` | obsoleto, sobrescrito por alpha-11 |
| `v1.0.0-alpha-11` | GitHub Actions local (consolidado Q22.B+G + Q24.a+b mvp) | `ea10ce8` | **atual, instalado no Xiaomi, aguarda validação live** |

**Pendências documentadas:**
- **Q17.e** — Keystore EAS encriptado em GitHub Secrets para OAuth
  funcionar em APKs gerados pelo workflow local (SHA-1 canônico
  do Cloud Console).

**Specs detalhadas das sprints pendentes:**
- [`docs/sprints/Q17-HEALTH-CONNECT-spec.md`](docs/sprints/Q17-HEALTH-CONNECT-spec.md)
- [`docs/sprints/Q18-EXERCICIOS-COM-GIF-spec.md`](docs/sprints/Q18-EXERCICIOS-COM-GIF-spec.md)
- [`docs/sprints/Q19-GRUPOS-EXERCICIOS-spec.md`](docs/sprints/Q19-GRUPOS-EXERCICIOS-spec.md)
- [`docs/sprints/Q20-SHARE-PIX-VALIDACAO-spec.md`](docs/sprints/Q20-SHARE-PIX-VALIDACAO-spec.md)
- [`docs/sprints/Q21-ETL-UNIFICACAO-spec.md`](docs/sprints/Q21-ETL-UNIFICACAO-spec.md)
- [`docs/sprints/Q21b-ISSUES-ETL-CONTRACT-SIBLING-spec.md`](docs/sprints/Q21b-ISSUES-ETL-CONTRACT-SIBLING-spec.md)
- [`docs/sprints/Q17cd-MEDIDAS-BODYFAT-spec.md`](docs/sprints/Q17cd-MEDIDAS-BODYFAT-spec.md)
- [`docs/sprints/Q18x-MIDIAEXEC-VIDEO-REAL-spec.md`](docs/sprints/Q18x-MIDIAEXEC-VIDEO-REAL-spec.md)
- [`docs/sprints/Q23-COMPILESDK-35-spec.md`](docs/sprints/Q23-COMPILESDK-35-spec.md)

---

## V4.0.2 — Onda E (2026-05-09 madrugada): vault HyperOS-proof + BottomSheet New Arch + saves E2E

Resposta direta ao bug do APK alpha-2 (vault freeze no celular real).
Validação via dev-client + Metro live reload em Redmi Note 13 HyperOS.
Bug raiz tripla resolvida em 9 commits (V4.0.2 part 1-8 +
animateOnMount). 4 saves end-to-end persistidos no disco. APK
alpha-3 production disparado.

| # | Commit | O que faz | Status |
|---|---|---|---|
| V4.0.2-1 | `a5d99ce` | SAF→file:// resolução + sync `tipoCompanhia` entre stores | `[ok]` |
| V4.0.2-2 | `80f4b4d` | `listVaultFolder` dispatch por scheme + share intent parent dir | `[ok]` |
| V4.0.2-3 | `b9a9685` | Permissões screen completa (storage + alarme exato) + `useHoje` layout-por-tipo | `[ok]` |
| V4.0.2-4 | `d0468ab` | `writeVaultFile` `ensureParentDir` + `MidiaFotoTab` layout-por-tipo | `[ok]` |
| V4.0.2-5 | `60706f6` | Vault default em `documentDirectory` (Armadilha **A31** descoberta) | `[ok]` |
| V4.0.2-6 | `28f5449` | BottomSheet abre em New Arch (Armadilha **A30** descoberta — gorhom #1751) | `[ok]` |
| V4.0.2-7 | `a2b2b44` | `ScrollView`→`BottomSheetScrollView` em consumers do sheet | `[ok]` |
| V4.0.2-8 | `f895b93` | Reverter BSScrollView em telas regulares (`useBottomSheetInternal` error) | `[ok]` |

**Saves end-to-end validados live:**
- `humor-2026-05-09.md` — frontmatter completo, 4 sliders default
- `audio-2026-05-09-e3aa.m4a` (287 KB) + companion `audio-...md`
- `contador-sem.md` — contador "Sem cafeína", início hoje
- `alarme-acordar.md` — 08:00 semanal seg-sex + 5 notification IDs

**APK alpha-3:** `f470a212-d401-4d23-8a09-03b8c09535e9` (preview
profile, production-mode Hermes + New Arch). Substitui alpha-2 que
travava no vault.

## Bloco S+G+V+W — Auditoria pré-APK (2026-05-08, novos)

Após auditoria visual completa (RELATORIO em `docs/auditoria-2026-05-08/`),
17 specs corretivas materializam débitos formais e visuais. Bloco S+W
bloqueia APK preview.

### Bloco S — Saneamento de débito declarado (alta prioridade)

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| S1 | `M-AUDIT-MIGUE-FRASE-WEB-MOCK` | `M-AUDIT-MIGUE-FRASE-WEB-MOCK-spec.md` | ~1h | `[ok]` |
| S2 | `M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR` | `M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR-spec.md` | ~2h | `[ok]` |
| S3 | `M-AUDIT-MIGUE-RESTORE-SNAPSHOT` | `M-AUDIT-MIGUE-RESTORE-SNAPSHOT-spec.md` | ~3h | `[ok]` |
| S4 | `M-AUDIT-LABEL-GAUNTLET-DASHBOARD` | `M-AUDIT-LABEL-GAUNTLET-DASHBOARD-spec.md` | ~1h | `[ok]` (regex object literal + 5 strings dev + colateral marcosAuto) |
| S5 | `M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL` | `M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL-spec.md` | ~0.5h | `[ok]` |

### Bloco G — Materializar achados colaterais (anti-débito)

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| G1 | `M-SHARE-INTENT-LAYOUT` | `M-SHARE-INTENT-LAYOUT-spec.md` | ~2h | `[ok]` (ADR-0024) |
| G2 | `I-DIARIO-REFLEXAO` | `I-DIARIO-REFLEXAO-spec.md` | ~1.5h | `[ok]` |
| G2.1 | `I-DIARIO-REFLEXAO-RECAP` (colateral G2) | `I-DIARIO-REFLEXAO-RECAP-spec.md` | ~1.5h | `[ok]` |
| G3 | `INFRA-CHECK-TEST-DATA-ALLOW` | `INFRA-CHECK-TEST-DATA-ALLOW-spec.md` | ~0.5h | `[ok]` |
| G4 | `INFRA-GAUNTLET-AMIGOS-API` | `INFRA-GAUNTLET-AMIGOS-API-spec.md` | ~0.5h | `[ok]` |
| G5 | `M-GAUNTLET-RETROATIVO-AUDIT` | `M-GAUNTLET-RETROATIVO-AUDIT-spec.md` | ~3h | `[ok]` (40 PNGs em 22 sprints) |
| G6 | `M-DOCS-PATH-FIX` | `M-DOCS-PATH-FIX-spec.md` | ~0.3h | `[ok]` |
| G7 | `M-SCHEMA-CONTADOR-V2` | `M-SCHEMA-CONTADOR-V2-spec.md` | ~1h | `[v2]` (descopada pré-v1.0.0) |

### Bloco V — Cobertura E2E faltante

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| V1 | `M-AUDIT-E2E-AMIGOS-LABEL` | `M-AUDIT-E2E-AMIGOS-LABEL-spec.md` | ~0.5h | `[ok]` |
| V2 | `M-AUDIT-E2E-MENU-NOMES` | `M-AUDIT-E2E-MENU-NOMES-spec.md` | ~0.3h | `[ok]` |
| V3 | `M-AUDIT-E2E-BOTOES-LARGURA` | `M-AUDIT-E2E-BOTOES-LARGURA-spec.md` | ~0.5h | `[ok]` |
| V4.0 | `INFRA-VAULT-WEB-MOCK` (pré-requisito V4) | `INFRA-VAULT-WEB-MOCK-spec.md` | ~2h | `[ok]` |
| V4 | `M-AUDIT-E2E-SAVE-DEVICES-INDEX` | `M-AUDIT-E2E-SAVE-DEVICES-INDEX-spec.md` | ~1h | `[ok]` (escopo expandido absorveu disparaBootHooks) |
| W2.1 | `M-AUDIT-GAUNTLET-RESET-PERSIST-KEYS` (achado V4 v2) | `M-AUDIT-GAUNTLET-RESET-PERSIST-KEYS-spec.md` | ~0.3h | `[ok]` |
| V4.0.1 | `INFRA-VAULT-MOCK-CONVERGENCIA` (achado pós-validação) | `INFRA-VAULT-MOCK-CONVERGENCIA-spec.md` | ~2-3h | `[ok]` |

### Bloco W — Patches visuais consolidados

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| W1 | `M-AUDIT-VISUAL-WARNS` (7 patches em batch) | `M-AUDIT-VISUAL-WARNS-spec.md` | ~3-4h | `[ok]` |
| W1.1 | `M-AUDIT-VISUAL-BUTTON-GHOST-PADDING` (achado colateral W1) | `M-AUDIT-VISUAL-BUTTON-GHOST-PADDING-spec.md` | ~0.5h | `[ok]` |

**Total bloco S+G+V+W:** ~21-23h ativas.

**Pré-condição APK preview**: Bloco S + W zerados.

---

## Estado real consolidado (planejamento end-to-end v1.0.0 — 2026-05-06)

Plano `tem-muita-coisa-zoada-golden-zebra` (aprovado 2026-05-06):
após field test do APK `v1.0.0-alpha` (commit `ada414e`), reorganização
das sprints abertas em **31 sprints atômicas** distribuídas nos blocos
H–P. Cada sprint tem spec auto-contido em `docs/sprints/<id>-spec.md`,
executável sem contexto por outro Claude. Substitui sprints abertas
anteriores (`E5.B`, `E6 M37.2`, `M-WCAG-MUTED-DECOR-TEXTO-V2`).

### Bloco H — Fundação Vault (sequencial)

| # | Sprint | Spec | Estim. | ADR | Status |
|---|---|---|---|---|---|
| H1 | `M-VAULT-URI-HELPER` | `M-VAULT-URI-HELPER-spec.md` | ~1h | — | `[ok]` |
| H2 | `M-VAULT-LAYOUT-POR-TIPO` | `M-VAULT-LAYOUT-POR-TIPO-spec.md` | ~4h | 0023 | `[ok]` |
| H3 | `M-VAULT-PASTA-NAO-HARDCODED` | `M-VAULT-PASTA-NAO-HARDCODED-spec.md` | ~3h | 0022 | `[ok]` |

### Bloco I — Saves específicos por feature (paralelo após H)

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| I-HUMOR | `M-SAVE-HUMOR-VALIDA` | `M-SAVE-HUMOR-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-DIARIO | `M-SAVE-DIARIO-VALIDA` | `M-SAVE-DIARIO-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-EVENTO | `M-SAVE-EVENTO-VALIDA` | `M-SAVE-EVENTO-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-FOTO | `M-SAVE-FOTO-VALIDA` | `M-SAVE-FOTO-VALIDA-spec.md` | ~2h | `[ok]` |
| I-AUDIO | `M-SAVE-AUDIO-VALIDA` | `M-SAVE-AUDIO-VALIDA-spec.md` | ~2h | `[ok]` |
| I-VIDEO | `M-SAVE-VIDEO-VALIDA` | `M-SAVE-VIDEO-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-FRASE | `M-SAVE-FRASE-VALIDA` | `M-SAVE-FRASE-VALIDA-spec.md` | ~1h | `[ok]` |
| I-TAREFA | `M-SAVE-TAREFA-VALIDA` | `M-SAVE-TAREFA-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-ALARME | `M-SAVE-ALARME-VALIDA` | `M-SAVE-ALARME-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-CONTADOR | `M-SAVE-CONTADOR-VALIDA` | `M-SAVE-CONTADOR-VALIDA-spec.md` | ~1.5h | `[ok]` |
| I-CICLO | `M-SAVE-CICLO-VALIDA` | `M-SAVE-CICLO-VALIDA-spec.md` | ~2h | `[ok]` |
| I-EXERCICIO | `M-SAVE-EXERCICIO-VALIDA` | `M-SAVE-EXERCICIO-VALIDA-spec.md` | ~2h | `[ok]` |
| I-SCANNER | `M-SAVE-SCANNER-VALIDA` | `M-SAVE-SCANNER-VALIDA-spec.md` | ~2h | `[ok]` |
| I-DEVICES | `M-SAVE-DEVICES-INDEX-VALIDA` | `M-SAVE-DEVICES-INDEX-VALIDA-spec.md` | ~1h | `[ok]` |
| I-AGENDA | `M-SAVE-AGENDA-VALIDA` | `M-SAVE-AGENDA-VALIDA-spec.md` | ~1h | `[ok]` |

Padrão comum: usar `vaultUriJoin` (H1) + try/catch+timeout no caller +
E2E Gauntlet + validação humana adb. Template: `_TEMPLATE-SAVE-FEATURE.md`.

### Bloco I2 — Bugs específicos não-save

| # | Sprint | Spec | Estim. |
|---|---|---|---|
| I2-OAUTH | `M-OAUTH-REDIRECT-URI-FIX` | `M-OAUTH-REDIRECT-URI-FIX-spec.md` | ~2h |
| I2-AMIGOS | `M-AMIGOS-LABEL` | `M-AMIGOS-LABEL-spec.md` | ~1h | `[ok]` |

### Bloco J — Permissões onboarding

| # | Sprint | Spec | Estim. |
|---|---|---|---|
| J1 | `M-ONBOARDING-PERMISSOES` | `M-ONBOARDING-PERMISSOES-spec.md` | ~3h | `[ok]` |

### Bloco K — UX Chrome (paralelo)

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| K1 | `M-MENU-LATERAL-LAYOUT` | `M-MENU-LATERAL-LAYOUT-spec.md` | ~2h | `[ok]` |
| K2 | `M-MENU-NOMES` | `M-MENU-NOMES-spec.md` | ~0.5h | `[ok]` |
| K3 | `M-MENU-FOTO-EDITAVEL` | `M-MENU-FOTO-EDITAVEL-spec.md` | ~1h | `[ok]` |
| K4 | `M-FAB-MENU-SAFE-BOTTOM` | `M-FAB-MENU-SAFE-BOTTOM-spec.md` | ~1h | `[ok]` |
| K5 | `M-BOTOES-LARGURA` | `M-BOTOES-LARGURA-spec.md` | ~1h | `[ok]` |

### Bloco L — Telas/Abas

| # | Sprint | Spec | Estim. | ADR | Status |
|---|---|---|---|---|---|
| L1 | `M-MEMORIAS-PARA-SAUDE-FISICA` | `M-MEMORIAS-PARA-SAUDE-FISICA-spec.md` | ~3h | — | `[ok]` |
| L2 | `M-RECAP-CALENDARIO-UNIFICAR` | `M-RECAP-CALENDARIO-UNIFICAR-spec.md` | ~3h | 0021 | `[ok]` |

### Bloco N — Risco residual moti

| # | Sprint | Spec | Estim. | Status |
|---|---|---|---|---|
| N1 | `M-MOTI-AUDIT-RUNTIME` | `M-MOTI-AUDIT-RUNTIME-spec.md` | ~1h | `[ok]` |
| N2 | `M-MOTI-FIX-CRITICOS` | `M-MOTI-FIX-CRITICOS-spec.md` | ~3-5h | `[ok]` |

### Bloco O — Validação obrigatória (transversal)

| # | Sprint | Spec | Estim. |
|---|---|---|---|
| O1 | `M-GAUNTLET-PADRAO-VALIDATION` | `M-GAUNTLET-PADRAO-VALIDATION-spec.md` | ~1h | `[ok]` |

### Bloco P — Field test e release final

| # | Sprint | Pré-condição |
|---|---|---|
| F1 | `M-FIELD-TEST` (7 dias passivos) | Blocos H+I+I2+J+K+L+N+O fechados, APK preview |
| G1 | `M41` Release v1.0.0 production | F1 verde + PAUSA explícita do dono |

**Estimativa total:** ~50-60h código ativo + 7 dias passivos field test + 1 dia release = **~15-16 dias até v1.0.0**.

**Cota EAS preservada:** 15 builds restantes (de 30/mês). Plano usa 2:
1 preview (após blocos H–O fechados) + 1 production (após F1 verde).

---

## Estado herdado (M-ROADMAP-AUDIT 2026-05-05 noite)

Auditoria via `git log --all --oneline --no-merges | grep "feat:"`
revelou **divergência durável** entre a tabela "Linha do tempo"
(seção histórica abaixo) e o código real. A "Linha do tempo"
ficou herdada da pre-refundação v1.0-rc1 (2026-05-02) marcando
sprints já implementadas como `[todo]` por causa da retirada do
release que zerou status no roadmap mas preservou código.

**Fonte de verdade canônica dos status:** a "Fila ativa
reordenada por blocos" abaixo. A "Linha do tempo" passa a ser
**arquivo cronológico apenas** — não confiar nela para
priorização.

### O que ESTÁ entregue (1556/172 testes verde, bundle 7,7 MB)

- **Fundação** (Bloco A 9/9): PT-BR audit, Gauntlet dead-code,
  Vault MD audit + 4 paralelas, M39 mídia companion, M39.1
  writers migrados, M-EXPORT-COMPLETO, M-BUNDLE-DIET.
- **Polish UX** (Bloco B 6/6): captura unificada, M11.4
  evolução corporal, categoria cores, M40 Tela Hoje v2, M36
  Recap, M35 Finanças empty.
- **Release-readiness** (Bloco C 10/10): WCAG completo + 3
  paralelas, release assets, sobre release notes, backup
  automático, M38 deviceId.
- **Bloco D** (1/1): dev-client decisão registrada.
- **Bloco E parcial** (E5 + E5.x.1 + E5.x.2 + E5.x.3 + E5.x.4
  fechadas hoje 2026-05-05; **E1, E2, E3, E4 fechadas nas
  sessões anteriores** apesar do "Linha do tempo" abaixo
  marcar como `[todo]` — git log confirma):
  - **E1 M06.5** Microfone (commit `0138ecc`, evoluído por
    `a856fe9` troca para `expo-speech-recognition`, `8c322fe`
    path canônico `media/audios/<data>-<rand>.m4a` + companion
    `.md` per ADR-0017, `df34500` M39.1 batch).
  - **E2 M07.x** Conquistas com mídia obrigatória (commit
    `16005ef`).
  - **E3 M11.5** Calendário visual de conquistas (commit
    `dadbb62`).
  - **E4 M09** Scanner OCR (commit `c8e3304`, evoluído com
    `@dariyd/react-native-document-scanner` em vez do
    `@react-native-ml-kit/document-scanner` original do spec,
    qualidade fixa `'maxima'` por M29).
  - **E5 M37.1** Google Calendar OAuth + leitura agenda
    (commit `91710ab`).
  - **E5.x.1 M37.1.1** Calendar locale PT-BR (commit
    `90643bb`).
  - **E5.x.2 M-BRIEF-A25** Metro package exports (local-only).
  - **E5.x.3 M37.1.2** Cache agenda em .md individual + ADR-0019
    (commit `06095d0`).
  - **E5.x.4 M37.1.3** Mock dev calendar API + bônus fix teste
    isolation (commit `d4ea9ab`).

### O que REALMENTE FALTA para v1.0.0

| # | Sprint | Spec | Estim. | Tipo |
|---|---|---|---|---|
| 1 | **M-ROADMAP-CLOSEOUTS** (este) | inline | 0,5h | docs apenas — corrigir Linha do tempo + closeouts batch dos 4 fantasmas |
| 2 | **E5.B M37.1-checkpoint-nivel-B** | `M37.1-checkpoint-nivel-B-spec.md` | 1h | dev-client real (você + emulador + login Google) |
| 3 | **E6 M37.2** Google Calendar escrita | `M37.2-spec.md` | 4-5h | única dev-client real restante |
| 4 | **F1 M-FIELD-TEST** 7 dias uso real | `M-FIELD-TEST-spec.md` | 7 dias passivos | humano-only |
| 5 | **G1 M41** APK Release v1.0.0 final | `M41-spec.md` | 3-4h | PAUSA explícita |

Não-bloqueantes (descopáveis para v1.1): M-WCAG-MUTED-DECOR-TEXTO-V2,
M19.x mockups, M-BUNDLE-DIET-MOTI-REPLACE (já descopada).

**Estimativa real até v1.0.0**: ~8-10h ativas + 7 dias passivos
field test + ~1 dia release = **~10 dias de calendário**.

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
| ~~19.x~~ | ~~M-GAUNTLET-FAST-BOOT-FOLLOWUP~~ | ~~`+html.tsx` aplicar em build estático~~ — **fechada NÃO-FIX 2026-05-04** (aguardar SDK 55+) | `M-GAUNTLET-FAST-BOOT-FOLLOWUP-spec.md` | — |

### Fila ativa reordenada por blocos (auditoria 2026-05-04, decisões do dono)

> Auditoria completa em `docs/AUDITORIA-2026-05-04.md`. Decisões do
> dono: (a) v1.0 inclui dev-client, (b) field test 7 dias bloqueante,
> (c) ordem aceita, (d) M-DEV-CLIENT-DECISAO criada.

**BLOCO A — Fundação (top da fila, prioridade absoluta)**

> **Inclui infraestrutura Gauntlet** (M-GAUNTLET-DEAD-CODE-V2 promovida
> de C6 em 2026-05-04 por decisão do dono — Gauntlet é fundação de
> validação visual; vazamento de bytecode em release é falha de
> qualidade core, não débito tardio).

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| ~~A1~~ | ~~M-PT-BR-AUDIT~~ | **fechada 2026-05-04** (script + dicionário 147 + hook + smoke; M-PT-BR-RETROFIT criada para 3 violações detectadas) | `M-PT-BR-AUDIT-spec.md` | — |
| ~~A2~~ | ~~M-GAUNTLET-DEAD-CODE-V2~~ | **fechada 2026-05-04** (1302/146, lazy require + DCE Hermes, leak check 0/6 markers, bundle 8.85→8.5 MB) | `M-GAUNTLET-DEAD-CODE-V2-spec.md` | — |
| ~~A2.x~~ | ~~M-PT-BR-RETROFIT~~ | **fechada 2026-05-04** (3 violações corrigidas inline pelo maestro) | `M-PT-BR-RETROFIT-spec.md` | — |
| ~~A3~~ | ~~M-VAULT-MD-AUDIT~~ | **fechada 2026-05-04** (1316/147, +14 cases, 6 achados → 4 sub-sprints geradas) | `M-VAULT-MD-AUDIT-spec.md` | — |
| ~~A3.x.1~~ | ~~M-VAULT-MD-FIX-diario-audio~~ | **fechada 2026-05-04** (recordAudio.ts → media/audios/, +4 cases) | `M-VAULT-MD-FIX-diario-audio-spec.md` | — |
| ~~A3.x.2~~ | ~~M-VAULT-MD-FIX-evento-fotos~~ | **fechada 2026-05-04** (saveEvento.ts → media/fotos/eventos-*, +3 cases) | `M-VAULT-MD-FIX-evento-fotos-spec.md` | — |
| ~~A3.x.3~~ | ~~M-VAULT-MD-FIX-medidas-fotos~~ | **fechada 2026-05-04** (medidasFotoPath + medida_ref, +9 cases, **desbloqueia M11.4**) | `M-VAULT-MD-FIX-medidas-fotos-spec.md` | — |
| ~~A3.x.4~~ | ~~M-VAULT-MD-FIX-scanner~~ | **fechada 2026-05-04** (saveNota.ts → media/scanner/, midia_pdf adicionado, +10 cases) | `M-VAULT-MD-FIX-scanner-spec.md` | — |
| ~~A4~~ | ~~M39~~ | **fechada 2026-05-04** (1349/149, schema zod + helpers + boot hook, M39.1 criada para migrar 9 writers) | `M39-spec.md` | — |
| ~~A4.x~~ | ~~M39.1~~ | **fechada 2026-05-04** (6/9 migrados, 3 exclusões anti-débito documentadas, net -55 LOCs) | `M39.1-spec.md` | — |
| ~~A5~~ | ~~M-EXPORT-COMPLETO~~ | **fechada 2026-05-04** (1364/151, ZIP+restore+MANIFEST sha256+snapshot settings, roundtrip 62 arquivos byte-a-byte) | `M-EXPORT-COMPLETO-spec.md` | — |

**BLOCO B — Polish UX (corrige débitos visíveis)**

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| ~~B1~~ | ~~M-CAPTURA-UNIFICADA~~ | **fechada 2026-05-05** (rota `/captura` modal + 2 cards + MenuLateral migrado + abrirNoMount) | `M-CAPTURA-UNIFICADA-spec.md` | — |
| ~~B2~~ | ~~M11.4~~ | **fechada 2026-05-05** (SecaoEvolucaoCorporal + medidaRef + useMedidas hook, +11 cases) | `M11.4-spec.md` | — |
| ~~B3~~ | ~~M-DEBITO-CATEGORIA-CORES~~ | **fechada 2026-05-05** (8 chips semânticos Dracula, +4 cases, AC-1 e AC-2 registrados) | `M-DEBITO-CATEGORIA-CORES-spec.md` | — |
| ~~B4~~ | ~~M40~~ | **fechada 2026-05-05** (Tela Hoje v2 + status casal + próximos + jornada agrupada + filtro para; 8 arquivos novos) | `M40-spec.md` | — |
| ~~B5~~ | ~~M36~~ | **fechada 2026-05-05** (RecapScreen + 5 seções + useRecap + 3 listadores Vault novos; 12 arquivos novos) | `M36-spec.md` | — |
| ~~B6~~ | ~~M35~~ | **fechada 2026-05-05** (Finanças empty state + toggle Settings + MenuLateral condicional) | `M35-spec.md` | — |

**BLOCO C — Release-readiness (NOVAS, propostas pela auditoria)**

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| ~~C1~~ | ~~M-BUNDLE-DIET~~ | **fechada 2026-05-04** (bundle 8.84→7.08 MB, -1.67 MB / -19.8%, 5x acima da meta; 5 deps removidas + lucide shim) | `M-BUNDLE-DIET-spec.md` | — |
| ~~C2~~ | ~~M-WCAG-COMPLETO~~ | **fechada 2026-05-05** (auditoria 24 telas, helper contraste, 25 testes, 1 fix inline + 3 sub-sprints WCAG-CHIP/MEDIDAS/MUTED-DECOR-TEXTO) | `M-WCAG-COMPLETO-spec.md` | — |
| ~~C3~~ | ~~M-RELEASE-ASSETS~~ | **fechada 2026-05-05** (6 PNGs gerados via SVG procedural, app.json name+bg, script reprodutível) | `M-RELEASE-ASSETS-spec.md` | — |
| ~~C4~~ | ~~M-SOBRE-RELEASE-NOTES~~ | **fechada 2026-05-05** (Settings→Sobre + changelog estruturado + 7 cases) | `M-SOBRE-RELEASE-NOTES-spec.md` | — |
| ~~C5~~ | ~~M-BACKUP-AUTOMATICO~~ | **fechada 2026-05-05** (semanal opt-in default OFF, +14 cases; descoberta A24 regex Tailwind no VALIDATOR_BRIEF) | `M-BACKUP-AUTOMATICO-spec.md` | — |
| ~~C2.x.1~~ | ~~M-WCAG-CHIP~~ | **fechada 2026-05-05** (hitSlop 48dp + borda muted ratio 5.30) | `M-WCAG-CHIP-spec.md` | — |
| ~~C2.x.2~~ | ~~M-WCAG-MEDIDAS~~ | **fechada 2026-05-05** (hitSlop=12 → 46dp efetivo) | `M-WCAG-MEDIDAS-spec.md` | — |
| ~~C2.x.3~~ | ~~M-WCAG-MUTED-DECOR-TEXTO~~ | **fechada 2026-05-05** (14 muted + 8 decor via textPropsDecor helper) | `M-WCAG-MUTED-DECOR-TEXTO-spec.md` | — |
| ~~C6~~ | ~~M38~~ | **fechada 2026-05-05** (1502/167, deviceId + colisão suffix + devicesIndex + Settings/dispositivos) | `M38-spec.md` | — |
| C2.x.4 | **M-WCAG-MUTED-DECOR-TEXTO-V2** | 10 ocorrências mutedDecor fora lista canônica (achado pós-C2.x.3) | `M-WCAG-MUTED-DECOR-TEXTO-V2-spec.md` | 1-2h |
| ~~AUDIT~~ | ~~M-SHEET-MODAL-SNAP~~ | **fechada 2026-05-05** (DOM patch web-only após mount via useEffect; ty=920→276/184/92 medido) | `M-SHEET-MODAL-SNAP-spec.md` | — |
| ~~AUDIT~~ | ~~M-DEBITO-CATEGORIA-CORES-VISIBLE~~ | **fechada 2026-05-05** (hexToRgba 40% opacity em rest, +4 cases) | `M-DEBITO-CATEGORIA-CORES-VISIBLE-spec.md` | — |
| ~~AUDIT~~ | ~~M-DEBITO-CATEGORIA-ICONE~~ | **fechada 2026-05-05** (helper corDaCategoria refletindo accent, +6 cases) | `M-DEBITO-CATEGORIA-ICONE-spec.md` | — |
| ~~PARALELO-E~~ | ~~M-BUNDLE-DIET-MOTI-REPLACE~~ | **DESCOPADA para v1.1 em 2026-05-05** — executor revelou superfície real 42 arquivos / 16-21h vs 4-6h estimadas (motion.ts pivot, AnimatePresence, FAB radial, drawer, waveform, etc). Ganho 333 KB ≈ 4% do bundle não justifica risco com margem atual 1,15 MB. Decisão durável dono | `M-BUNDLE-DIET-MOTI-REPLACE-spec.md` | [v2] |
| **PARALELO-E** | **M19.x** | Mockups toolchain JSX→HTML completa (decisão dono 2026-05-05: paralelo ao Bloco E) | `M19.x-spec.md` | 1,5-3h |

**BLOCO D — Decisão registrada (executar como pre-condição de E)**

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| ~~D1~~ | ~~M-DEV-CLIENT-DECISAO~~ | **fechada 2026-05-05** (decisão (a) registrada formalmente — v1.0 INCLUI 4 dev-client + 2 calendar) | `M-DEV-CLIENT-DECISAO-spec.md` | — |

**BLOCO E — Features dev-client (após Bloco A+B+C+D)**

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| E1 | **M06.5** | Microfone — Diário Emocional | `M06.5-spec.md` | 5-7h |
| E2 | **M07.x** | Conquistas com mídia obrigatória | `M07.x-conquistas-com-midia.md` | 5-7h |
| E3 | **M11.5** | Calendário visual de conquistas | `M11.5-spec.md` | 5-7h |
| E4 | **M09** | Scanner OCR notas fiscais (paralelo a E3) | `M09-spec.md` | 7-9h |
| ~~E5~~ | ~~M37.1~~ | **fechada 2026-05-05** Google Calendar OAuth + leitura agenda (1530/170, bundle 7,7 MB, 5 PNGs Nível A; commit `91710ab`) | `M37.1-spec.md` | — |
| ~~E5.x.1~~ | ~~M37.1.1~~ | **fechada 2026-05-05** Calendar locale PT-BR ("Maio de 2026" + "Sáb"; 1536/171; +6 testes; PNG `A-agenda-locale-ptbr.png`) | `M37.1.1-spec.md` | — |
| ~~E5.x.2~~ | ~~M-BRIEF-A25~~ | **fechada 2026-05-05 local-only** A25 registrada em VALIDATOR_BRIEF §4 (arquivo gitignored conforme política anti-IA — não versionado por design) | `M-BRIEF-A25-METRO-PACKAGE-EXPORTS-spec.md` | — |
| ~~E5.x.3~~ | ~~M37.1.2~~ | **fechada 2026-05-05** Cache agenda em .md individual (1555/172 +19/+1, ADR-0019, boot hook idempotente, app/agenda.tsx intocado, idempotência verificada empiricamente) | `M37.1.2-cache-agenda-em-md-spec.md` | — |
| E5.x.4 | **M37.1.3** | Mock dev-web de `calendarApi.listarEventos` (corrige bug "Conectar trava em offline" no Gauntlet — token mockado mas fetch real falha) | `M37.1.3-mock-dev-web-calendar-api-spec.md` | 0,5h |
| E5.B | **M37.1-checkpoint-nivel-B** | OAuth real no emulador (3 screenshots; depende APK dev-client fresh — build `bcf57359` em curso) | `M37.1-checkpoint-nivel-B-spec.md` | 0,5-1h |
| E6 | **M37.2** | Google Calendar escrita | `M37.2-spec.md` | 4-5h |

**BLOCO F — Field test (humano-only, bloqueante para M41)**

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| F1 | **M-FIELD-TEST** | 7 dias uso real + bugs catalogados | `M-FIELD-TEST-spec.md` | 7 dias |

**BLOCO G — Release final**

| # | Sprint | Título | Spec | Estim. |
|---|---|---|---|---|
| G1 | **M41** | APK Release v1.0.0 final (PAUSA usuário) | `M41-spec.md` | 3-4h |

**Estimativa total para v1.0:** ~64-92h ativas + 7 dias field test
(inclui M37.1.1 + M-BRIEF-A25 + M37.1-checkpoint-nivel-B
adicionadas em 2026-05-05 como anti-débito de M37.1).

### Inventário Gauntlet (estado atual)

| Sprint | Status | Função |
|---|---|---|
| ~~M-GAUNTLET~~ | `[ok]` | Cria infra `/_dev/gauntlet` + `__gauntlet` + frame mobile |
| ~~M-GAUNTLET-AUDITORIA~~ | `[ok]` | Auditoria externa cega 30 itens |
| ~~M-GAUNTLET-LEAK-CHECK~~ | `[ok]` | Script CI revelou vazamento |
| ~~M-GAUNTLET-SEED-V2~~ | `[ok]` | Fixtures realistas |
| ~~M-GAUNTLET-FAST-BOOT~~ | `[ok com ressalva]` | Pré-cache fontes |
| ~~M-GAUNTLET-FAST-BOOT-FOLLOWUP~~ | `[ok NÃO-FIX]` | Aguarda SDK 55+ |
| ~~M-GAUNTLET-SEED-DUO~~ | `[ok]` | Seed duo propaga tipoCompanhia |
| **M-GAUNTLET-DEAD-CODE-V2** | `[todo A2]` | Lazy require — **PROMOVIDO** para fundação |

Após M-GAUNTLET-DEAD-CODE-V2 fechar, infra Gauntlet está **completa**.
Field test (F1) usa Gauntlet final como referência cruzada.

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

> **NOTA HISTÓRICA (M-ROADMAP-AUDIT 2026-05-05):** esta tabela é
> arquivo cronológico apenas. **Fonte de verdade canônica dos
> status atuais é a "Fila ativa reordenada por blocos" (acima)
> + bloco "Estado real consolidado" no topo deste arquivo.**
>
> Vários `[todo]` abaixo estão **falsos** — sprint foi entregue
> mas a linha não foi atualizada durante a refundação v1.0
> (2026-05-02 retirou v1.0-rc1, zerando status mas preservando
> código). Para qualquer status atual, **consultar o topo deste
> arquivo, não esta tabela**.

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
| `[ok]` | M06.5 | F-14 Microfone (bloqueado por dev-client EAS) | 18 | diario_emocional + audio | 5-7h | — | <!-- auto-marcado [ok] 2026-05-15: intra-roadmap ok em linha 726; 17 arquivo(s) de codigo; 2 mencao(oes) FEATURES -->
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
| `[ok]` | M06.5 | F-14 Microfone — entregue via Q5.1+Q5.2 (Onda Q); `src/components/diario/MicrofoneButton.tsx` + speech-recognition contínuo. FEATURES-CANONICAS §2.5 | 18 | diario_emocional + audio | 5-7h | — |
| `[ok]` | M07.x | Conquistas com mídia obrigatória — entregue na refundação (4 tipos: foto/áudio/vídeo/oEmbed). FEATURES-CANONICAS §2.4 | 18, 20 | diario_emocional, evento, midia | 5-7h | — |
| `[ok]` | M08 | Share Intent Receiver — entregue via Q10 (regex Pix/boleto) + Q22.G (`expo-share-intent` + listener `_layout`). FEATURES-CANONICAS §2.7 | 17 | inbox_arquivo + financeiro | 4-5h | — |
| `[ok]` | M09 | Scanner OCR — entregue. `ScannerPreview` + ML Kit on-device + multipágina. FEATURES-CANONICAS §2.6 | 16 | financeiro_nota | 7-9h | — |
| `[ok]` | M10 | Mini Humor Tela 21 — heatmap 13x7 (91 dias), modo sobreposto pessoa_a+pessoa_b 50% opacity, stats 30d, modal detalhe dia, empty state. Cache readonly via SAF (ADR-0012). +23 testes (889→912 / 100→103 suites). Validacao Nivel A capturou empty state (SAF Android-only); render colorido fica para M10-checkpoint-visual em Nivel B/C | 21 | humor_heatmap_cache | 4-5h | `b98458e` |
| `[v1.1]` | M10-checkpoint-visual | Validação Nível B opcional (4 screenshots emulador) — runtime live no Xiaomi cobre Nível C, suficiente pra v1.0 | 21 | — | 0,5-1h | `M10-checkpoint-visual-spec.md` |
| `[ok]` | M11 | Memórias e Marcos — entregue via L1 (Saúde Física) + Q11.a/b/c. FEATURES-CANONICAS §3 | 09, 10, 11 | treino_sessao, marco | 8-10h | — |
| `[ok]` | M11.5 | Calendário visual conquistas — entregue. ADR-0021 unificou Recap+Calendário; Q24.a/b consolidaram. FEATURES-CANONICAS §5 | 25 | evento, diario_emocional + media | 5-7h | — |
| `[ok]` | M12 | Medidas form/comparativo — entregue. Q17.c.b/c/d cobriu peso/ciclo/gordura + escreverMedida em HC. FEATURES-CANONICAS §3.2 | 12, 13 | medidas | 5-6h | — |
| `[ok]` | M13 | Galeria + Cadastro Exercícios — entregue. Q9 (Galeria unificada) + Q18.b (player). FEATURES-CANONICAS §4 | 07, 08, 02 | exercicio | 8-10h | — |
| `[ok]` | M14 | Mini Financeiro Tela 22 readonly — header laranja, banner modo leitura, CardHero (gasto semana cyan + delta), top 5 categorias com barras, lista virtualizada de 20 últimas transações (despesa cyan, crédito green), empty state, hook `useFinancasCache`, fixture web. +25 testes (912→937 / 103→108 suites). Reader em `src/lib/cache/` (uniformidade canônica com M10). Validação Nível A capturou render real via fixture | 22 | financas_cache | 4-5h | `29f0472` |
| `[v1.1]` | M14-checkpoint-visual | Validação Nível B opcional (4 screenshots emulador) — runtime live cobre Nível C | 22 | — | 0,5-1h | `M14-checkpoint-visual-spec.md` |
| `[todo]` `[para]` | M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL | Backend Python: corrigir `delta_textual` para emitir acentuação PT-BR completa | 22 | financas_cache | 0,5h | `M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL-spec.md` |
| `[ok]` | M14.1 | Micro-fix: warning eslint `unused-disable` em `src/lib/hooks/useFinancasCache.ts:40` (disable do `no-require-imports` sem problema reportado). Remoção trivial. Fechado 2026-05-03 no ciclo corretivo M14.1+M25.1+M27.1 | — | — | 0,1h | — |
| `[ok]` | M14.5 | Ciclo Menstrual — entregue na refundação + Q8 (autorPadrao) + Q17.c.c (HC). FEATURES-CANONICAS §3.6 | nova | ciclo_menstrual | 5-6h | — |
| `[ok]` | M15 | Settings 7 grupos — entregue via M29 (Settings v2 refactor). FEATURES-CANONICAS §7 | 23 | (vários) | 7-8h | — |
| `[ok]` | M16 | F-15 Alarme pessoal — entregue via M30 (AlarmeSchema v2 + recorrência) | nova | alarme | 5-6h | — |
| `[ok]` | M17 | F-16 To-do leve — entregue via M31 (TarefaSchema v2 + drag&drop) | nova | tarefa | 4-5h | — |
| `[ok]` | M18 | F-17 Contador "dias sem X" — entregue via M32 (mensagemApoio 6 faixas, ADR-0005 zero gamificação) | nova | contador | 4h | — |
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
| `[ok]` | M34.1 | FABMenu z-index — endereçado via M-CAPTURA-UNIFICADA (`/captura` modal raiz centraliza decisão) | — | — | 1-2h | `M34.1-spec.md` |
| `[ok]` | M34.2 | Contraste empty state Fotos — aba Fotos removida em L1; MenuCapturaVerde cobre via FAB+ | — | — | 0,5h | `M34.2-spec.md` |
| `[ok]` | M11.3 | `useLarguraFrame()` hook centralizador: web → constante 412, native → `useWindowDimensions().width` real. 3 consumidores migrados (`MemoriasFotosTab`, `medidas`, `exercicios/[slug]`). Validação Gauntlet: 4 thumbs 118×118 em grid 3+1 contidas no frame (left=455, right=825). Bug pré-existente RTCSliderWebComponent revelado em /medidas + /exercicios — sub-sprint M-SLIDER-WEB-LOOP criada. 1289→1292 testes (+3), 144→145 suítes (+1). Bundle Hermes 8.84 MB | — | — | 1h | `M11.3-spec.md` |
| `[ok]` | M-SLIDER-WEB-LOOP | Wrapper `<Slider>` ramifica por `Platform.OS`: web → `<input type="range">` com CSS Dracula injetado idempotente, native → `RNSlider` preservado. Interface pública intacta — 8 consumidores migrados sem mudança. Bug original RTCSliderWebComponent loop infinito em /medidas + /exercicios resolvido. 1292→1293 testes (+1). Bundle Hermes 8.85 MB | — | — | 1-2h | `M-SLIDER-WEB-LOOP-spec.md` |
| `[ok]` | M34.3 | FAB verde unificado — entregue na refundação. FEATURES-CANONICAS §2.8/§2.9 | — | — | 1-2h | `M34.3-spec.md` |
| `[ok]` | M35 | Finanças empty state — entregue. `app/financas.tsx` → `MiniFinanceiroScreen` honesto sem cache | 22 | — | 1-2h | `M35-spec.md` |
| `[ok]` | M36 | Recap agregação — entregue via Q24.a (navegável) + Q24.b (Memórias slideshow). `app/recap.tsx` + `RecapScreen.tsx` + `useRecap.ts` | nova | — | 6-8h | `M36-spec.md` |
| `[ok]` | M37.1 | Google Calendar OAuth + leitura — entregue via Q0 (scope `calendar.events.readonly`) + Q22.B (client iOS reverso-DNS). Rota `/agenda` ativa | nova | googleAuth | 6-7h | `M37.1-spec.md` (split do M37 original) |
| `[todo]` | M37.2 | Google Calendar escrita (criar e deletar evento) | nova | googleAuth | 4-5h | `M37.2-spec.md` (split do M37 original) |
| `[ok]` | M38 | Conflict resolution multi-device — entregue. Base (`getDeviceId` + `applyDeviceIdSuffix`) já existia; AUDIT-T2-LOCK-VAULT (`488e7fa`) completou com Opção A (sempre suffix) + migration boot | — | — | 4-5h | `M38-spec.md` |
| `[ok]` | M39 | Estrutura mídia + companion — entregue. ADR-0017 ratificado; `src/lib/midia/companion.ts` + `MidiaCompanionSchema` em uso | — | midia-companion | 4-5h | `M39-spec.md` |
| `[ok]` | M40 | Tela 01 Hoje v2 — entregue. `app/index.tsx` com header avatar + botão Recap + SecaoStatusCasal + SecaoProximos + SecaoHumor + SecaoDiariosEventosAgrupado | 01 | — | 4-5h | `M40-spec.md` |
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
| F-14 Microfone | M06.5 | `[ok]` (promovido a v1) | <!-- auto-marcado [ok] 2026-05-15: intra-roadmap ok em linha 726; 17 arquivo(s) de codigo; 2 mencao(oes) FEATURES -->
| F-15 Alarme pessoal | M16 | `[ok]` (promovido a v1) | <!-- auto-marcado [ok] 2026-05-15: intra-roadmap ok em linha 717; 19 arquivo(s) de codigo; 3 mencao(oes) FEATURES -->
| F-16 To-do leve | M17 | `[ok]` (promovido a v1) | <!-- auto-marcado [ok] 2026-05-15: intra-roadmap ok em linha 718; 19 arquivo(s) de codigo; 3 mencao(oes) FEATURES -->
| F-17 Contador "dias sem X" | M18 | `[ok]` (promovido a v1) | <!-- auto-marcado [ok] 2026-05-15: intra-roadmap ok em linha 719; 14 arquivo(s) de codigo; 2 mencao(oes) FEATURES -->

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
