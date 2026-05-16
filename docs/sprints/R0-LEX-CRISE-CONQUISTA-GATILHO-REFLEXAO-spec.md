# R0 — M-LEX-CRISE-CONQUISTA-GATILHO-REFLEXAO

**Tipo**: refactor + data-migration
**Prioridade**: P1-high
**Estimativa**: 3-4h
**Tranche**: R-LEX
**Fase**: 1 (Crítico — bloqueia testes E2E das demais sprints da onda)
**ADR sugerida**: ADR-0025 (registrar decisão lexical durável)

## Fonte canônica

Briefing completo em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-LEX → R0.

**Vocabulário fixado**:

| Antes | Depois |
|---|---|
| `Vitória` | `Conquista` |
| `Trigger` | `Gatilho` |
| `Vitória/Trigger` (par) | `Crise/Conquista` (par) |
| `Humor Rápido` (atalho) | `Reflexão` |

Compat de leitura: `.md` antigos com chave `vitoria:` lê via Zod
`transform` e remapeia. Novos writes usam chave canônica nova.

## Dependências

- **Bloqueia**: todas demais sprints da Onda R (R-CRIT, R-RECAP,
  R-HOME, R-INT, R-MEDIA, R-SF, R-ROT, R-NAV, R-FAB, R-WIDG, R-SEC,
  R-DX, R-OPS)
- **Bloqueado por**: nada

## OFF-LIMITS

Padrão T1 — não tocar CLAUDE.md, STATE.md, ROADMAP.md, CHANGELOG.md,
VALIDATOR_BRIEF.md, HOW_TO_RESUME.md, docs/CONTEXTO.md, docs/BRIEFING.md,
docs/FEATURES-CANONICAS.md, docs/ADRs/* exceto criar ADR-0025,
docs/sprints/*-spec.md exceto esta, .gitignore, .github/workflows/*,
app.json, eas.json, package.json, scripts/* exceto
`scripts/dicionario_ptbr_canonico.json` (dicionário muda), hooks/*.

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
./scripts/test_contract_drift.sh
npx tsc --noEmit
npx jest --silent
./scripts/smoke.sh
grep -rniE "vitoria|trigger" src/ app/ tests/ --include="*.ts" --include="*.tsx"  # so refs legitimas
```

## Proof-of-work

1. Lista de arquivos modificados/criados (path absoluto).
2. Saída literal `npx jest --silent | tail -5` — esperado +5 a +10 testes novos cobrindo migração + atalho.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Lista de arquivos `.md` antigos no Vault que foram lidos com sucesso pela compat de leitura (cenário fixture).
7. Achados colaterais (reportar — não implementar).
