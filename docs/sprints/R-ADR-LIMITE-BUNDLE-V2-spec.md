# R-ADR-LIMITE-BUNDLE-V2 — ADR nova com limite de bundle revisado

**Tipo:** docs + ADR
**Prioridade:** P1-high
**Estimativa:** ~30min
**Fase:** 3 (achado da auditoria R-BUNDLE-SIZE-AUDIT)
**ADR sugerida:** ADR-0027 (próximo número disponível após ADR-0026)

## Contexto

Auditoria `R-BUNDLE-SIZE-AUDIT` (`docs/auditoria-bundle-2026-05-21/`)
confirmou que o bundle Hermes cresceu de **8,5 MB (2026-05-04)** para
**10,23 MB (2026-05-21)** em 17 dias. O limite documentado era
**~8,85 MB** (referenciado em STATE/BRIEFING histórico e múltiplos
CHANGELOG entries). Ultrapassado em ~1,4 MB.

O crescimento é **legítimo** — não é regressão acidental, é consequência
de features entregues no período:

- R-INT-3 Health Connect (`react-native-health-connect` ~500 KB)
- R-INT-4 Spotify/YouTube OAuth clients
- R-VAULT-CANONICAL-COMPLETE A+B (schemas + stats + ZIP exportar)
- Q22.* (transcrição + share intent)
- R-RECAP-4/5/6 (slideshow + Ken Burns + share PNG)
- R-MEDIA-2 (autoplay áudio)
- R-BACKUP-AUTO (jszip)
- Onda 3J/3K refactors

Após `R-BUNDLE-LUCIDE-RESHIM` (-650 KB cirúrgico esperado), bundle
projetado em ~9,58 MB — ainda acima do limite antigo.

**Decisão necessária:** revisar o limite oficialmente via ADR, com
justificativa explícita, ou tomar decisão de cortar features. Per
auditoria do agente, recomendação é **limite revisado para 10,5 MB**
(~3% folga sobre estado atual pós-reshim, dá espaço para Onda 4 +
M41 sem urgência).

## Hipotese técnica

ADR nova documenta:
1. Tamanho atual exato pós-reshim.
2. Justificativa do crescimento (features Onda Q/R).
3. Novo limite proposto (10,5 MB) com folga calculada.
4. Compromisso de monitoria: rodar audit antes de cada release.
5. Sub-sprint `R-BUNDLE-DIET-CALENDARS-REPLACE` descopada para v1.1
   como caminho futuro de redução adicional.

## Escopo

### A. Criar ADR

`docs/ADRs/0027-limite-bundle-hermes-revisado.md` com seções padrão:

- Status: Aceito
- Data: 2026-05-21
- Sprint: R-ADR-LIMITE-BUNDLE-V2
- Depende: ADR-0006 (Stack Expo + RN), ADR-0010 (Estética como fundação)
- Contexto: crescimento documentado, features que justificam
- Decisão: limite revisado para 10,5 MB (substitui menção informal a 8,85 MB)
- Justificativa: features Q22 + Onda R + 3J/3K listadas com KB cada
- Consequências:
  - Positivas: release v1.0 destravado sem cortar features
  - Negativas: APK final maior (download mais lento, parse Hermes ligeiramente mais tempo)
  - Mitigações: monitoria contínua via `R-BUNDLE-SIZE-AUDIT` antes de cada release; sub-sprint diet quando atingir 95% do limite
- Referências: relatório `docs/auditoria-bundle-2026-05-21/RELATORIO.md`, R-BUNDLE-LUCIDE-RESHIM, R-BUNDLE-DIET-CALENDARS-REPLACE

### B. Atualizar ADR INDEX

`docs/ADRs/INDEX.md` ganha linha:

```
| 0027 | Limite de bundle Hermes revisado (10,5 MB) | Aceito | R-ADR-LIMITE-BUNDLE-V2 |
```

### C. Atualizar referências em outros docs (se necessário)

- `STATE.md` (gitignored — atualizar localmente o callout que cita "8,85 MB margem")
- `VALIDATOR_BRIEF.md` (gitignored) — citar ADR-0027 como referência
- `CHANGELOG.md` entry — referenciar ADR

## OFF-LIMITS

**Pode tocar:**
- `docs/ADRs/0027-limite-bundle-hermes-revisado.md` (novo)
- `docs/ADRs/INDEX.md` (adicionar linha)
- `CHANGELOG.md` (entry da sprint)

**Não pode tocar:**
- `package.json` (não remover deps — fora do escopo desta sprint)
- Código fonte em `src/`, `app/`, `tests/`
- ADRs antigas (preservar histórico imutável)
- `CLAUDE.md`, `ROADMAP.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md` (orquestrador atualiza)

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
./scripts/smoke.sh

# Validar ADR criada
ls -la docs/ADRs/0027-limite-bundle-hermes-revisado.md
grep -c "0027" docs/ADRs/INDEX.md
# Esperado: 1
```

## Proof-of-work esperado

1. ADR-0027 criada com seções padrão preenchidas.
2. INDEX atualizado.
3. Smoke verde (sanity rápido).
4. Hash commit no worktree.
5. Lista de referências atualizadas (CHANGELOG, etc).
6. Achados colaterais.

## Decisão

**P1-high** porque é gating de M41 release. Sem ADR oficial documentando
o limite revisado, validador-sprint vai recusar M41 com argumento
"bundle excede 8,85 MB documentado". ADR sela a decisão arquitetural
com justificativa rastreável.

## Origem

Achado #2 do agente `a11c0952c5c0470b7` ao executar `R-BUNDLE-SIZE-AUDIT`.
Citado textualmente: "`R-ADR-LIMITE-BUNDLE-V2` (P1-high, ~30min):
registrar nova ADR documentando limite revisado **10,5 MB** (vs 8,55 MB
anterior) com justificativa das features Onda Q/R/3J/3K que justificam
o crescimento."

Decisão durável recomendada pelo agente: limite **10,5 MB** (~3% folga
sobre estado atual pós-reshim cirúrgico).
