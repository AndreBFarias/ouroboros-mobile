# Backlog consolidado — Ouroboros Mobile

> Documento canônico de **sprints pendentes** após auditoria
> 2026-05-15 + briefing Onda R. Fonte autoritativa do que falta
> executar até `v1.0.0`. Para sprints concluídas, consulte
> `ROADMAP.md`.
>
> **Atualizado**: 2026-05-15 noite (após auditoria + Onda R
> consolidada).

## Resumo executivo

| Fase | Tema | # sprints | Estim. ativa | Bloqueia release |
|---|---|---|---|---|
| Anti-débito imediato | T1B7 + automação roadmap | 2 | ~1h | Não |
| Fase 1 (Onda R) | Crítico (OAuth, mídia, alarmes mudos, lexical) | 6 | ~10–14h | Sim (F1) |
| Fase 2 (Onda R) | UX + Recap + Home + Integrações | 13 | ~25–35h | Sim (rc2) |
| Fase 3 (Onda R) | Features secundárias + DX + OPS | 21 | ~40–55h | Não |
| Fase 4 (Onda R) | Segurança + verificação Google | 5 | ~12–18h | Sim (v1.0.0 prod) |
| Pós release | F1 field test + G1 release oficial | 2 | ~8h | — |

**Total estimado**: ~93–130h ativas + 7 dias field test ≈ 17–25 dias
até `v1.0.0` production.

**Próxima ação imediata**:
- AUDIT-T1B7-DRAFT-EXPORT-FIX (~30min — anti-débito direto do T1B6)
- Validação live alpha-11 pelo dono (4 testes — gate atual de v1.0)

Depois disso a Onda R abre.

---

## Anti-débito imediato (Tier 0 — antes da Onda R)

### 0.1 AUDIT-T1B7-DRAFT-EXPORT-FIX `[ok]` (commit `4e58f40`)
- **Entregue**: 2026-05-15 noite-2.
- Filtro `ehSyncConflict` aplicado em `migrarDraftsParaTreinoSessao.ts` + `exportarVault.ts`.
- 5 testes novos (216 suítes / 2021 testes).

### 0.2 AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS `[ok]` (commit `1304aba`)
- **Entregue**: 2026-05-15 noite-2.
- Script `scripts/check_roadmap_fantasmas.py` operante.
- Integrado no smoke como warning não-bloqueante.
- **Descobriu 5 fantasmas reais** que minha auditoria manual deixou passar (linhas 707, 889-892 do ROADMAP — tabelas redundantes não foram propagadas). Auto-fix aplicado.

### 0.3 Validação live alpha-11 (não é sprint de código)
- **Spec**: [`/PROMPT-CONTINUACAO-2026-05-14.md`](../../PROMPT-CONTINUACAO-2026-05-14.md)
- **Escopo**: 4 testes manuais pelo dono — OAuth Google, share Pix,
  Recap navegável, Recap Memórias slideshow.
- **Estimativa**: ~30min com dono + maestro acompanhando.
- **Importante**: bloqueia decisão sobre prosseguir com Onda R Fase 1
  via alpha-12 (se houver falha, vira sprint Q22.H+ corretiva).

---

## Onda R — Fase 1 (Crítico) — ~10–14h

Bloqueia `v1.0.0-alpha-12` e F1.

| Ordem | ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|---|
| 1 | R0 | Renomeação Crise/Conquista/Gatilho/Reflexão | refactor+migration | P1 | 3–4h | `R0-LEX-CRISE-CONQUISTA-GATILHO-REFLEXAO-spec.md` |
| 2 | R-CRIT-1 | OAuth Unmatched Route regression | fix | P0 | 2–4h | `R-CRIT-1-OAUTH-UNMATCHED-ROUTE-REGRESSION-spec.md` |
| 2‖ | R-CRIT-3 | Mídia ausente em Recap e Galeria | bug | P0 | 3–5h | `R-CRIT-3-MIDIA-AUSENTE-EM-RECAP-E-GALERIA-spec.md` |
| 3 | R-CRIT-2 | OAuth consent app name | fix | P1 | 1–2h | `R-CRIT-2-OAUTH-CONSENT-APP-NAME-MISSING-spec.md` |
| 3‖ | R-CRIT-4 | Loader logo gif quebrado | fix | P2 | 1–2h | `R-CRIT-4-LOADER-LOGO-GIF-QUEBRADO-spec.md` |
| 3‖ | R-NAV-2 | Alarmes sons funcionais | bug | P1 | 2–3h | `R-NAV-2-ALARMES-SONS-FUNCIONAIS-spec.md` |

Símbolo `‖` significa pode rodar em paralelo via worktree.

---

## Onda R — Fase 2 (UX + Recap + Home) — ~25–35h

Bloqueia `v1.0.0-rc2`.

| Ordem | ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|---|
| 1 | R-RECAP-3 `[ok]` (`9514061`) | Empty states não-tóxicos | feature+copy | P1 | 2–3h | `R-RECAP-3-EMPTY-STATES-NAO-TOXICOS-spec.md` |
| 1‖ | R-RECAP-1 `[ok]` (Onda 2A.2, `25d4849`) | Lista itens clicáveis | feature | P1 | 3–4h | `R-RECAP-1-LISTA-ITENS-CLICAVEIS-spec.md` |
| 1‖ | R-RECAP-2 | Números big clicáveis | feature | P1 | 2–3h | `R-RECAP-2-NUMEROS-BIG-CLICAVEIS-LISTAS-spec.md` |
| 1‖ | R-RECAP-4 | Memórias slideshow v2 | feature | P2 | 3–4h | `R-RECAP-4-MEMORIAS-SLIDESHOW-V2-spec.md` |
| 1‖ | R-MEDIA-1 | Spotify/YouTube/áudio preview | feature | P1 | 3–4h | `R-MEDIA-1-SPOTIFY-YOUTUBE-AUDIO-PREVIEW-spec.md` |
| 1‖ | R-HOME-1 | Hoje prioridade + recorrência | refactor+redesign | P1 | 4–5h | `R-HOME-1-PRIORIDADE-RECORRENCIA-spec.md` (precisa D1) |
| 2 | R-HOME-2 | Hoje próximos eventos merge | feature | P2 | 2–3h | `R-HOME-2-PROXIMOS-EVENTOS-MERGE-spec.md` |
| 2‖ | R-HOME-3 | Hoje to-do inline check | feature | P1 | 1–2h | `R-HOME-3-TODO-INLINE-CHECK-spec.md` |
| 3 | R-INT-1 | Hub Integrações Utilitários | feature | P1 | 2–3h | `R-INT-1-HUB-UTILITARIOS-spec.md` |
| 3‖ | R-INT-2 | Nome do app em permissões | fix | P1 | 1–2h | `R-INT-2-NOME-APP-PERMISSOES-spec.md` |
| 3‖ | R-INT-3 | Health Connect não funciona | bug | P1 | 2–4h | `R-INT-3-HEALTH-CONNECT-NAO-FUNCIONA-spec.md` |
| 4 | R-FAB-1 `[ok]` (`47c17f9`) | FAB remover Voz | refactor | P2 | 0.5h | `R-FAB-1-REMOVER-VOZ-spec.md` |
| 4‖ | R-FAB-2 `[ok]` (Onda 2A.4) | FAB Câmera repensar | refactor | P2 | 1.5–2h | `R-FAB-2-CAMERA-REPENSAR-spec.md` |
| 4‖ | R-CROSS-FLOW-AUDIT `[ok]` (`bebdf12`) | Interconexão (12 fluxos cruzados + sibling) | audit+fix | P1 | 4–6h | `R-CROSS-FLOW-AUDIT-spec.md` |
| 4‖ | **R-VAULT-CANONICAL-COMPLETE-A** `[ok]` (Onda 2A.1, `81d4bad`) | Schemas + writers + migration boot (split A de 2) | refactor+feature | P1 | 2-3h | `R-VAULT-CANONICAL-COMPLETE-A-spec.md` |
| 4‖ | **R-VAULT-CANONICAL-COMPLETE-B** | Stats agregadas + UI Settings + cross-repo (depende de A) | refactor+feature | P1 | 2-3h | `R-VAULT-CANONICAL-COMPLETE-B-spec.md` |

---

## Onda R — Fase 3 (Features secundárias) — ~40–55h

Paralelo a Fase 4. Não bloqueia release.

| ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|
| R-SF-1 | Grupos de Treino em Saúde Física | feature | P1 | 2–3h | `R-SF-1-GRUPOS-DE-TREINO-spec.md` |
| R-SF-2 | Exercício GIF cadastro (validation) | validation | P2 | 1–2h | `R-SF-2-EXERCICIO-GIF-CADASTRO-spec.md` |
| R-SF-3 | Marcação rápida (Venvanse) | feature | P2 | 2–3h | `R-SF-3-MARCACAO-RAPIDA-MED-spec.md` |
| R-ROT-1 | Rotinas inteligência temporal | feature | P1 | 2–3h | `R-ROT-1-INTELIGENCIA-TEMPORAL-spec.md` |
| R-ROT-2 | Rotinas escopo expandido | docs+feature | P3 | 1–2h | `R-ROT-2-ESCOPO-EXPANDIDO-spec.md` |
| R-RECAP-5 | Recap Contadores eventos | feature | P2 | 2–3h | `R-RECAP-5-CONTADORES-EVENTOS-spec.md` |
| R-MEDIA-2 | Recap autoplay áudio | feature | P2 | 2–3h | `R-MEDIA-2-RECAP-AUTOPLAY-AUDIO-spec.md` |
| R-RECAP-6 | Botão compartilhar slide Memórias (PNG 1080x1920) — depende de R-RECAP-4 | feature | P2 | 2–3h | `R-RECAP-6-SHARE-SLIDE-MEMORIAS-spec.md` |
| R-INFRA-ENV-JSON-TSCONFIG | Fallback de tipo para env.json em worktrees fresh (achado R-CRIT-4) | infra | P3 | 30min | `R-INFRA-ENV-JSON-TSCONFIG-spec.md` |
| R-INFRA-WORKTREE-BOOTSTRAP | Script bootstrap automático de node_modules+env.json (achado recorrente) | infra | P3 | 30–45min | `R-INFRA-WORKTREE-BOOTSTRAP-spec.md` |
| R-RECAP-NUMEROS-AUDIOVIDEO-CARDS | Cards de áudios/vídeos no grid Números (débito R-CRIT-3) | feature | P2 | 1h | `R-RECAP-NUMEROS-AUDIOVIDEO-CARDS-spec.md` |
| R-DX-GAUNTLET-MULTI-PORTA | Multi-porta no gauntlet.sh (paralelismo de validação visual) | infra | P3 | 1–2h | `R-DX-GAUNTLET-MULTI-PORTA-spec.md` |
| R-DX-EXECUTOR-WORKTREE-ENFORCE | Constraint técnico (hook) pra honrar worktree isolation (3º incidente: AUTOMATIZAR-FANTASMAS, R-FAB-2 v1, R-FAB-2 v2) | infra+DX | P2 | 1-2h | `R-DX-EXECUTOR-WORKTREE-ENFORCE-spec.md` |
| **R-CROSS-FLOW-FIX-2** | **CRÍTICO cross-repo**: sibling ETL não lê `markdown/` (layout H2). Todo vault pós-refundação invisível pro desktop. | bug+cross-repo | **P1-high** | sibling | `R-CROSS-FLOW-FIX-2-SIBLING-ETL-LAYOUT-H2-spec.md` |
| R-CROSS-FLOW-FIX-1 | `avaliarBackupAutomatico` declarado SEM CALLER no boot path (achado cenário 10) | fix | P1 | 1h | `R-CROSS-FLOW-FIX-1-BACKUP-AUTOMATICO-ORFAO-spec.md` |
| R-CROSS-FLOW-FIX-3 | Scanner OCR duplicata na Galeria (achado cenário 4) | fix | P2 | 1-2h | `R-CROSS-FLOW-FIX-3-SCANNER-DUPLICATA-GALERIA-spec.md` |
| R-NAV-1 | Ciclo botão registrar → FAB | refactor | P2 | 1–2h | `R-NAV-1-CICLO-BOTAO-REGISTRAR-MIGRACAO-FAB-spec.md` |
| R-NAV-3 | FAB consistência edit/delete | refactor | P2 | 1–2h | `R-NAV-3-FAB-CONSISTENCIA-EDIT-DELETE-spec.md` |
| R-WIDG-1 | Widget homescreen to-do | feature | P2 | 4–6h | `R-WIDG-1-TODO-LIST-RAPIDA-spec.md` |
| R-INT-4 | Spotify/YouTube conectar | feature | P3 | 4–6h | `R-INT-4-SPOTIFY-YOUTUBE-CONECTAR-spec.md` (precisa D2) |
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

---

## Onda R — Fase 4 (Segurança + release) — ~12–18h

Bloqueia `v1.0.0` production.

| Ordem | ID | Sprint | Tipo | P | Estim. | Spec |
|---|---|---|---|---|---|---|
| 1 | R-SEC-5 | Secret leak audit (gitleaks) | infra+audit | P1 | 1–2h | `R-SEC-5-SECRET-LEAK-AUDIT-spec.md` |
| 2 | R-SEC-3 | Privacy policy + terms | docs | P1 | 2–3h | `R-SEC-3-PRIVACY-POLICY-TERMS-spec.md` |
| 3 | R-SEC-1 | Google OAuth verification (testers) | docs+cloud | P1 | 2–3h | `R-SEC-1-GOOGLE-OAUTH-VERIFICATION-spec.md` |
| 4 | R-SEC-2 | Play Protect signature | infra | P1 | 2–3h | `R-SEC-2-PLAY-PROTECT-SIGNATURE-spec.md` (precisa D4) |
| 5 | R-SEC-4 | ProGuard minify | infra | P2 | 2–4h | `R-SEC-4-PROGUARD-MINIFY-spec.md` |
| 4‖ | R-PLAYCONSOLE-SETUP | TODO Play Console (dono executa) | docs+cloud | P1 | 40min dono + 24-72h propagação | `R-PLAYCONSOLE-SETUP-spec.md` |

---

## Pós-Onda R — F1 + G1

| ID | Sprint | Descrição | Estim. |
|---|---|---|---|
| F1 | Field test | 7 dias de uso real (dono + Vitória) com checklist diário. Bug crítico vira sprint imediata; bug menor vira issue v1.1 | 7d passivos |
| G1 | Release v1.0.0 | Tag final, `gh release create v1.0.0`, README com screenshots, CHANGELOG estável, retirar `[Unreleased]` | 3–4h |

---

## Decisões tomadas (2026-05-15 noite)

Todas as D# foram resolvidas pelo dono. Sprints liberadas pra
execução. Detalhes em cada spec individual.

| D# | Decisão | Resposta | Sprint afetada |
|---|---|---|---|
| D1 | Home Status Casal + Humor+Última | **C** (remover ambos) | R-HOME-1 |
| D2 | Spotify/YouTube integrações | **A** (ambos OK) | R-INT-4, R-MEDIA-1 |
| D3 | Track ambient slideshow Memórias | **Sim** (toggle default OFF) | R-RECAP-4 |
| D4 | Conta Play Console $25 | **Sim** (pagar + setup) | R-SEC-2 → R-PLAYCONSOLE-SETUP (nova) |
| D5 | AUDIT-T2-LOCK-VAULT OK | **Sim** (mergeado `488e7fa`) | — |
| D6 | Backup automático semanal | **Sim** (cria sprint) | R-BACKUP-AUTO (nova) |
| D7 | Pasta `versão desktop/` | **Deletar** | feito em 2026-05-15 |
| D8 | Auditoria a11y TalkBack | **Agora** (não v1.1) | R-A11Y-TALKBACK (nova) |

### Sprints novas derivadas de decisões + pedidos durá­veis

- **R-PLAYCONSOLE-SETUP** (D4): checklist executável do dono pra
  registrar app no Play Console. Sibling de R-SEC-2. Fase 4.
- **R-BACKUP-AUTO** (D6): backup semanal silencioso pro Vault
  Syncthing. Fase 3.
- **R-A11Y-TALKBACK** (D8): auditoria + correção de navegação
  por screen reader. Fase 3.
- **R-CROSS-FLOW-AUDIT** (pedido durá­vel — "validar interconexão
  entre features"): auditoria de 12 fluxos cruzados (FAB câmera,
  menus, captura, cross-repo). Fase 2.
- **R-VAULT-CANONICAL-COMPLETE** (pedido durá­vel — "tudo do app em
  .md, integrar com desktop"): migrar settings/sessão/stats de
  SecureStore + RAM para `vault/_estado/*.md`. Sibling lê em
  séries históricas. Fase 2.

---

## Descopadas / v2

| ID | Razão |
|---|---|
| G7 — M-SCHEMA-CONTADOR-V2 | Explicitamente descopada pré-v1.0 (`[v2]`) |
| PARALELO-E — M-BUNDLE-DIET-MOTI-REPLACE | 16-21h vs 4-6h estimadas; ganho 4% bundle não justifica risco |
| Q24.b.c — Export PNG stories IG | Mantido `[v2]` (Q24.b.a/b promovidos para R-RECAP-4) |

---

## Cross-reference rápido

- **Briefing canônico Onda R**: [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) (1299 linhas)
- **ROADMAP geral**: [`/ROADMAP.md`](../../ROADMAP.md) seção "Onda R"
- **Auditoria 2026-05-15**: [`/CHANGELOG.md`](../../CHANGELOG.md) seção "[Unreleased]"
- **Sprints específicas**: cada arquivo `docs/sprints/<id>-spec.md`
