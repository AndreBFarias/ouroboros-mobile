# R-ROT-1-B-INTEGRACAO-TODO — Renderizar banner SugestaoAlarmeTarefa em /todo

**Tipo:** bug+integration
**Prioridade:** P2-medium
**Estimativa:** 1-2h
**Fase:** 3 (achado colateral de R-ROT-1-D — agente reportou em 2026-05-21)

## Contexto

R-ROT-1-B (commit `0b3f5ea`) entregou helper `inteligenciaTemporal.ts` + componente `SugestaoAlarmeTarefa.tsx` + writer `silenciarSugestaoTarefa` + 88 testes verde. Mas a integração JSX no `app/todo.tsx` ficou faltando: os imports estão lá (linhas 55 e 68) mas o componente nunca é renderizado.

Resultado: feature técnicamente mergeada mas funcionalmente invisível para o usuário. O banner de sugestão de alarme por padrão de horário em tarefas-família **nunca aparece**.

Achado reportado em proof-of-work de R-ROT-1-D (agente `a6bfe2dcd159942a2`), achado #1.

## Hipótese técnica

1. `useMemo` calcula sugestão agrupando `tarefas` (array completo) por `normalizarTituloFamilia(titulo)`.
2. Para cada família, chama `calcularSugestaoAlarme(historico, agora)` do helper.
3. Filtra silenciadas via `estaSilenciado(silenciar_sugestao_ate, agora)`.
4. Renderiza o primeiro `<SugestaoAlarmeTarefa>` que retornar `sugerir: true` no `listHeader`.
5. Handler aceitar: cria alarme via writer canônico `escreverAlarme` com slug derivado do título.
6. Handler rejeitar: chama `silenciarSugestaoTarefa(vaultRoot, rel, calcularSilenciarAte(agora))` em todas as tarefas da família.

## Escopo

### A. Investigação obrigatória

```bash
grep -n "calcularSugestaoAlarme\|SugestaoAlarmeTarefa\|silenciarSugestaoTarefa" app/todo.tsx
# Esperado: 3 imports declarados, 0 usos no JSX antes do fix.

grep -n "escreverAlarme\|criarAlarme" src/lib/vault/alarmes.ts | head -5
# Confirmar nome canônico do writer (provavelmente escreverAlarme).
```

### B. Implementação

1. `app/todo.tsx`: adicionar `useMemo` que calcula sugestão (1 banner por vez, primeira família viável).
2. Renderizar `<SugestaoAlarmeTarefa>` no `listHeader` acima de `<BarraBusca>`.
3. Handler aceitar: criar `Alarme` com horário sugerido, slug `<familia>-alarme`, recorrencia `diaria`.
4. Handler rejeitar: silenciar a família por 30d.
5. Teste E2E: criar 3 tarefas com mesmo título (slug `tomar-remedio`) marcadas em horários próximos → banner aparece.

### C. Validação

- Smoke + 3 runs sanity (baseline atual 287/2744).
- Validação visual via Gauntlet ou playwright: tela /todo com mock seed → banner renderizado.

## OFF-LIMITS

**Pode tocar:**
- `app/todo.tsx` (integração JSX + memo + handlers).
- Teste novo em `tests/app/todo.test.tsx` (cenário banner aparece + handlers).

**Não pode tocar:**
- `src/lib/tarefas/inteligenciaTemporal.ts` (já entregue + testado em R-ROT-1-B).
- `src/components/tarefas/SugestaoAlarmeTarefa.tsx` (idem).
- `src/lib/vault/tarefas.ts` writers (idem).
- CLAUDE.md, ROADMAP.md, CHANGELOG.md, STATE.md, VALIDATOR_BRIEF.md, Checkpoint.md.

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
```

## Proof-of-work

1. Lista de arquivos modificados.
2. `npx jest --silent | tail -5`.
3. `./scripts/smoke.sh`.
4. Hash do commit.
5. Screenshot do banner aparecendo na /todo (via Gauntlet ou playwright).
6. Achados colaterais.
