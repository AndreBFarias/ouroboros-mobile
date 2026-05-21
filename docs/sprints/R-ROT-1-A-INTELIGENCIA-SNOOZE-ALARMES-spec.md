# R-ROT-1-A — Inteligência sobre snooze de alarmes

**Tipo:** feature
**Prioridade:** P2-medium (replan R-ROT-1)
**Estimativa:** 2-3h
**Fase:** 3 (replan R-ROT-1, decisão A do dono 2026-05-21)
**ADR sugerida:** nenhuma

## Contexto

Spec original R-ROT-1 (Habitica) foi rejeitado. Replan ofereceu 4
opções; dono aprovou **A** entre outras: inteligência temporal sobre
**snooze de alarmes**. Aprender que usuário sempre "snooza" alarme das
07:00 por 15min → sugerir mover alarme para 07:15 após N snoozes (N=3
default).

## Hipótese técnica

1. Adicionar log de snooze quando usuário aciona "Soneca" no
   `AlarmeChannelV2` (Q22.E / M30).
2. Persistir em `markdown/alarme-<slug>-historico.md` ou inline em
   `AlarmeSchema.historico_snoozes[]` (campo opcional novo).
3. Hook `useInteligenciaSnooze(alarmeSlug)` calcula:
   - Conta snoozes do `slug` nos últimos N dias
   - Calcula tempo médio de snooze
   - Se >= 3 snoozes na mesma direção (sempre +15min), retorna sugestão
4. UI em `app/alarmes/[slug].tsx`: banner "Você costuma soneca por 15
   min. Quer mover o alarme para 07:15?" com Aceitar / Rejeitar.
5. Aceitar muda `alarme.hora`. Rejeitar silencia futuras sugestões por
   30 dias (campo `silenciado_ate`).

## Escopo

### A. Investigação obrigatória

```bash
grep -n "snooze\|soneca" src/lib/alarmes/ src/lib/schemas/alarme.ts app/alarmes/
# Confirmar se ja existe log de snooze ou se vou ter que adicionar
grep -n "historico" src/lib/schemas/alarme.ts
```

### B. Implementação

1. Schema: adicionar campo opcional `historico_snoozes` em
   `AlarmeSchema` (array de `{ts, deltaMin}`). Backward-compat default `[]`.
2. Action `registrarSnooze(slug, deltaMin)` em
   `src/lib/alarmes/escreverAlarme.ts` (ou local equivalente).
3. Hook puro `src/lib/alarmes/inteligenciaSnooze.ts` com:
   - `calcularSugestaoSnooze(historico): { sugerir: boolean, novaHora?: string, motivo?: string }`
   - Lógica: ≥3 snoozes nos últimos 30 dias, mesma direção (≥80% similar)
4. UI banner em `app/alarmes/[slug].tsx` ou seção dedicada
5. Testes:
   - `tests/lib/alarmes/inteligenciaSnooze.test.ts` — helper puro
   - `tests/components/alarmes/SugestaoSnoozeBanner.test.tsx` — UI

### C. Validação

- Smoke + 3 runs sanity
- Validação live no celular (memória `feedback_celular_ao_vivo_em_vez_de_navegador`):
  criar alarme, soneca 3x +15min, abrir tela do alarme → banner aparece

## OFF-LIMITS

**Pode tocar:**
- `src/lib/schemas/alarme.ts` (adicionar campo opcional)
- `src/lib/alarmes/inteligenciaSnooze.ts` (novo)
- `src/lib/alarmes/escreverAlarme.ts` (ação `registrarSnooze`)
- `src/components/alarmes/SugestaoSnoozeBanner.tsx` (novo, opcional se inline)
- `app/alarmes/[slug].tsx` (consumir banner)
- Testes novos

**Não pode tocar:**
- `notificacoes` (canal v2 — preservar comportamento)
- Lógica de `agendarAlarme()` (Q22.E já entregue)
- Schemas/stores não-alarme
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

Replan R-ROT-1 opção A. Dono escolheu A+B+C+D em 2026-05-21.
