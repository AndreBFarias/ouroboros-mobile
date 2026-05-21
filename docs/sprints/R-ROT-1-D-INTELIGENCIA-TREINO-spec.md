# R-ROT-1-D — Inteligência temporal sobre treinos

**Tipo:** feature (consome schema novo)
**Prioridade:** P2-medium (replan R-ROT-1)
**Estimativa:** 2-3h
**Fase:** 3 (parte 2 de R-ROT-1 opção D)
**ADR sugerida:** nenhuma
**Bloqueado por:** `R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG` (parte 1)

## Contexto

Replan R-ROT-1 opção D parte 2: usar o campo `rotina_slug` adicionado
em parte 1 para detectar padrão temporal de treino e sugerir alarme.

"Você sempre treina rotina X às 18:00 → quer um alarme?"

## Hipótese técnica

1. Hook `useInteligenciaTreinoTemporal(rotinaSlug)` lê últimas 30
   TreinoSessoes daquela rotina via filtro `rotina_slug`.
2. Agrupa por hora-do-dia.
3. Se ≥ 4 sessões em ±60min nos últimos 30 dias: sugere alarme.
4. Banner em `/rotinas/<slug>` detalhe da rotina.
5. Aceitar cria alarme via writer canônico `criarAlarme`.
6. Rejeitar silencia 30d (campo opcional `silenciar_sugestao_ate` em
   `RotinaSchema`).

## Escopo

### A. Investigação obrigatória

```bash
# Confirmar parte 1 (R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG) entregue
grep -c "rotina_slug" src/lib/schemas/treino_sessao.ts
# Esperado: >= 1. Se 0, abortar — parte 1 nao foi entregue.
ls src/lib/treino/ src/lib/treinos/
grep -n "listarTreinoSessoes" src/lib/vault/
```

### B. Implementação

1. Hook puro `src/lib/treino/inteligenciaTemporal.ts`:
   - `detectarPadraoHorarioRotina(historico): { sugerir, hora?, motivo? }`
2. Schema `rotina.ts`: campo opcional `silenciar_sugestao_ate?: string`.
3. Componente `<SugestaoAlarmeRotina>` com 2 botões + dismissível.
4. Integrar em `app/rotinas/[slug].tsx` discreto.
5. Aceitar usa writer canônico `criarAlarme`.
6. Testes:
   - `inteligenciaTemporal.test.ts` (puro)
   - `SugestaoAlarmeRotina.test.tsx` (UI + interação)

### C. Validação

- Smoke + 3 runs sanity
- Validação live no celular: executar rotina 4x ~18h → abrir rotina → banner

## OFF-LIMITS

**Pode tocar:**
- `src/lib/treino/inteligenciaTemporal.ts` (novo)
- `src/lib/schemas/rotina.ts` (campo opcional)
- `src/components/treino/SugestaoAlarmeRotina.tsx` (novo)
- `app/rotinas/[slug].tsx`
- Testes novos

**Não pode tocar:**
- `TreinoSessaoSchema` (parte 1 já entregou)
- Schemas/stores não relacionados
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npm test --silent 2>&1 | grep "Test Suites:" | tail -1; done
```

## Proof-of-work esperado

1. Diff (~150L)
2. +10-15 testes
3. Smoke verde + 3 runs sanity
4. Hash commit no worktree
5. Achados colaterais

## Origem

Parte 2 de R-ROT-1 opção D. Dono escolheu A+B+C+D em 2026-05-21.
Bloqueado até parte 1 (R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG) entregar.
