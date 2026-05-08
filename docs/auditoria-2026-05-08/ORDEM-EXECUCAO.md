# Ordem de execução das 17 sprints corretivas

Plano de execução pós-auditoria (`RELATORIO.md`). Ordem otimizada por:
1. **Bloqueio do APK preview** (Bloco S + W primeiro).
2. **Dependências entre sprints** (G4 antes de V1; S1 antes de incluir frase em G5).
3. **Custo / valor** (saneamento de débito antes de novas features).

Estimativa total: **~21-23h ativas**. G7 marcada `[v2]` — não entra.

---

## Fase 1 — Bloqueio APK preview (~10h)

Sprints que precisam fechar antes do build EAS preview. Ordem priorizada por dependência e custo:

| # | Sprint | Estim | Dep | Por que primeiro |
|---|---|---|---|---|
| 1 | **S4** `M-AUDIT-LABEL-GAUNTLET-DASHBOARD` | 0,5h | nenhuma | Trivial (1 char + 1 path no scan); aquece sessão. |
| 2 | **S5** `M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL` | 0,5h | nenhuma | Decisão fechada ("Libere o que faz sentido pra você."); patch curto. |
| 3 | **G6** `M-DOCS-PATH-FIX` | 0,3h | nenhuma | `sed` global de `TEMPLATE-spec` → `_template-spec`; trivial. |
| 4 | **G3** `INFRA-CHECK-TEST-DATA-ALLOW` | 0,5h | nenhuma | Marker line-level; padrão já existe em check_anonimato.sh. |
| 5 | **G4** `INFRA-GAUNTLET-AMIGOS-API` | 0,5h | nenhuma | `setTipoCompanhia` no __gauntlet; destrava V1. |
| 6 | **W1** `M-AUDIT-VISUAL-WARNS` (7 patches) | 3-4h | nenhuma | Bloqueia APK preview; consolidado num commit. |
| 7 | **S1** `M-AUDIT-MIGUE-FRASE-WEB-MOCK` | 1h | nenhuma | Destrava captura "frase" no Gauntlet + E2E `m-save-frase`. |
| 8 | **S2** `M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR` | 2h | nenhuma | Fecha TODO M30 em produção. |
| 9 | **S3** `M-AUDIT-MIGUE-RESTORE-SNAPSHOT` | 3h | nenhuma | Fecha "futuro" em restore — restore simétrico ao export. |

**Marco da Fase 1**: APK preview destrancado. Sprint `G5` (retroativo) e bloco V podem rodar em paralelo após.

## Fase 2 — Anti-débito (paralelo, ~7h)

Materializa colaterais nunca specados. Sem bloqueio mútuo.

| # | Sprint | Estim | Dep | Notas |
|---|---|---|---|---|
| 10 | **G2** `I-DIARIO-REFLEXAO` | 1,5h | nenhuma | Modo Reflexão + 6 chips emoções fechados. |
| 11 | **G1** `M-SHARE-INTENT-LAYOUT` | 2h | nenhuma | ADR-0024 (B pasta exceção); boot hook whitelist. |
| 12 | **G5** `M-GAUNTLET-RETROATIVO-AUDIT` | 3h | S1, W1 | Captura PNGs retroativos das 22+ sprints sem evidência. Roda **depois** de S1 (frase tem mock) e W1 (visuais corrigidos). |

## Fase 3 — Cobertura E2E (paralelo, ~2h)

Adiciona casos E2E faltantes. Roda depois de G4 (que expõe `setTipoCompanhia`).

| # | Sprint | Estim | Dep |
|---|---|---|---|
| 13 | **V1** `M-AUDIT-E2E-AMIGOS-LABEL` | 0,5h | G4 |
| 14 | **V2** `M-AUDIT-E2E-MENU-NOMES` | 0,3h | nenhuma |
| 15 | **V3** `M-AUDIT-E2E-BOTOES-LARGURA` | 0,5h | W1 (W2 padding Recap) |
| 16 | **V4** `M-AUDIT-E2E-SAVE-DEVICES-INDEX` | 0,5h | nenhuma (inclui criar `lerVaultMock` no Gauntlet) |

## Descartadas / adiadas

| Sprint | Status | Motivo |
|---|---|---|
| **G7** `M-SCHEMA-CONTADOR-V2` | `[v2]` | Cosmético; risco de regressão > benefício pré-v1.0.0. Reavaliar pós-release. |

---

## Sequência canônica (linear se quiser ordem única)

```
S4 → S5 → G6 → G3 → G4 → W1 → S1 → S2 → S3
   (Fase 1: APK preview destrancado)
G2 → G1 → V2 → V1 → V3 → V4 → G5
   (Fase 2+3: anti-débito + E2E + retroativo)
```

Total ativo: ~22h sem G7.

## Após Fase 1 — Destrava APK preview

Quando S1+S2+S3+S4+S5+W1 fecharem:
1. Confirmar com dono: "ok disparar `eas build --profile=preview`?"
2. Build EAS consome 1/15 da cota EAS mensal.
3. Field test 7 dias (sprint F1).
4. Após F1 verde + PAUSA explícita do dono: M41 release v1.0.0.

## Após Fase 2+3 — Higiene total

Quando G1, G2, G5, V1, V2, V3, V4 fecharem:
- STATE.md "Achados colaterais" zerado.
- Cobertura E2E completa nas sprints UI fechadas.
- 100% das sprints golden-zebra com PNG real.
- Próxima sessão pode entrar limpa em Bloco P (field test → release).

## Política durante a execução

- **Sem agentes** — eu navego, eu capturo, eu compilo (per `feedback_orquestracao.md`).
- **Gauntlet always-on** — `./gauntlet.sh` em background a sessão inteira.
- **Auto-commit + auto-push** ao final de cada sprint validada (per `feedback_push_automatico.md`).
- **Auditar git antes de cada Edit** — confirmar comportamento atual via `git log --grep` + `grep` (per `feedback_audit_pre_dispatch.md`).
- **Sem checkpoint manual entre sprints** (decisão dono 2026-05-08 plano `snug-humming-wall`).
- **Pause obrigatória** apenas em: ADR novo (G1 ADR-0024), build EAS, decisão de produto inesperada, bug runtime persistente após 2 fixes.
