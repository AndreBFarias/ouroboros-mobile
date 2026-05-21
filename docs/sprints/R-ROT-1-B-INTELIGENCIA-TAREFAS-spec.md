# R-ROT-1-B — Inteligência sobre tarefas (sugerir alarme)

**Tipo:** feature
**Prioridade:** P2-medium (replan R-ROT-1)
**Estimativa:** 2-3h
**Fase:** 3 (replan R-ROT-1, decisão B do dono 2026-05-21)
**ADR sugerida:** nenhuma

## Contexto

Replan R-ROT-1 opção B: aprender que usuário marca tarefa "Tomar
remédio" sempre ~20:00 → sugerir criar alarme automático para 20:00.

**Pré-requisito ATENDIDO**: `TarefaSchema.data_marcada` (timestamp ISO)
já existe.

## Hipótese técnica

1. Hook `useInteligenciaTemporalTarefas(tarefaSlug)` lê `historico_marcacoes`
   da tarefa (campo já existente ou derivado de log).
2. Se ≥ 3 marcações em janela ±30min de horário comum nos últimos 14 dias:
   - Calcula horário médio (`data_marcada.hour:minute`)
   - Sugere alarme via banner em `app/todo.tsx` ao abrir detalhe da tarefa
3. Aceitar cria alarme companion vinculado.
4. Rejeitar marca `tarefa.silenciar_sugestao_ate = ISO_30_dias_a_frente`.

## Escopo

### A. Investigação obrigatória

```bash
grep -n "data_marcada\|historico" src/lib/schemas/tarefa.ts
# Verificar shape exato
grep -n "marcarFeito\|criarAlarme" src/lib/tarefas/
```

### B. Implementação

1. Schema: opcional `silenciar_sugestao_ate?: string` em `TarefaSchema`.
2. Helper `src/lib/tarefas/inteligenciaTemporal.ts`:
   - `calcularPadraoHorarioTarefa(historico): { sugerir, hora?, motivo? }`
   - Lógica: agrupa marcações por horário; cluster ≥ 3 em ±30min nos últimos 14d
3. Banner em `app/todo.tsx` ou tela de detalhe da tarefa (`[slug].tsx` ?)
4. Aceitar: chama writer canônico `criarAlarme` com slug derivado da tarefa
5. Testes:
   - `tests/lib/tarefas/inteligenciaTemporal.test.ts` (helper puro)
   - `tests/components/tarefas/SugestaoAlarmeTarefa.test.tsx`

### C. Validação

- Smoke + 3 runs sanity
- Validação live no celular: criar tarefa "tomar água", marcar 3x ~20h, abrir → banner

## OFF-LIMITS

**Pode tocar:**
- `src/lib/schemas/tarefa.ts` (campo opcional)
- `src/lib/tarefas/inteligenciaTemporal.ts` (novo)
- `src/components/tarefas/SugestaoAlarmeTarefa.tsx` (novo)
- `app/todo.tsx` ou `app/todo/[slug].tsx` (consumir banner)
- Testes novos

**Não pode tocar:**
- Schemas/stores não-tarefa
- Lógica de `criarAlarme` (reusar, não duplicar)
- `useToastUndo`, `CheckboxTarefaInline` (R-HOME-3)
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

1. Diff (~150L esperado)
2. +10-15 testes
3. Smoke verde + 3 runs sanity
4. Hash commit no worktree
5. Achados colaterais

## Origem

Replan R-ROT-1 opção B. Dono escolheu A+B+C+D em 2026-05-21.
