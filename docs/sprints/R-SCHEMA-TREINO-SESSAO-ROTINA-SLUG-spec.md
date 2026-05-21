# R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG — Adicionar campo `rotina_slug` em TreinoSessaoSchema

**Tipo:** schema migration
**Prioridade:** P2-medium (pré-requisito R-ROT-1-D-INTELIGENCIA-TREINO)
**Estimativa:** 2-3h
**Fase:** 3 (parte 1 de R-ROT-1 opção D do dono 2026-05-21)
**ADR sugerida:** nenhuma (extensão schema)

## Contexto

Replan R-ROT-1 opção D: aprender que usuário sempre treina rotina X às
18:00 → sugerir alarme. Requer **vínculo canônico rotinaexecução** que
não existe hoje: `TreinoSessaoSchema.rotina` é string livre opcional, não
slug consultável.

Esta sprint é **parte 1 de D (sprint dupla)**: adicionar campo
`rotina_slug?: string` em `TreinoSessaoSchema` com backward-compat. Parte
2 (`R-ROT-1-D-INTELIGENCIA-TREINO`) consome o novo campo.

## Hipótese técnica

1. Adicionar `rotina_slug?: string` opcional em `TreinoSessaoSchema`.
2. Writer canônico `escreverTreinoSessao` aceita slug opcional.
3. `app/treinos/executar/[slug].tsx` (executor Q11.c) passa o slug ao
   gravar a sessão.
4. Reader `listarTreinoSessoes` aceita filtro `rotina_slug?`.
5. **Backward-compat:** sessões antigas sem campo continuam legíveis;
   filtro por slug ignora-as.
6. Sem migration de dados — campo opcional não-quebra.

## Escopo

### A. Investigação obrigatória

```bash
cat src/lib/schemas/treino_sessao.ts
grep -n "rotina" src/lib/schemas/treino_sessao.ts
grep -rn "escreverTreinoSessao\|saveTreino" src/lib/ app/
# Verificar se algum writer existente já tem hook pra slug
grep -n "rotina_slug\|rotinaSlug" src/ app/
# Esperado: 0 antes do fix
```

### B. Implementação

1. `src/lib/schemas/treino_sessao.ts`: campo opcional `rotina_slug?: z.string()`.
2. Writer `escreverTreinoSessao` aceita prop nova.
3. `app/treinos/executar/[slug].tsx`: ao concluir treino, passa slug da rotina.
4. Reader `listarTreinoSessoes` aceita filter opcional.
5. Testes:
   - Schema parse aceita sem o campo (backward-compat)
   - Schema parse aceita com o campo
   - Writer escreve frontmatter com `rotina_slug`
   - Reader filtra por slug

### C. Validação

- Smoke + 3 runs sanity
- Validação live no celular: executar treino, conferir que `.md` tem `rotina_slug:` no frontmatter

## OFF-LIMITS

**Pode tocar:**
- `src/lib/schemas/treino_sessao.ts`
- `src/lib/vault/treinos.ts` (ou local do writer)
- `app/treinos/executar/[slug].tsx` (passar slug)
- Testes novos

**Não pode tocar:**
- Outros schemas
- Q11.c lógica do executor (preservar comportamento)
- Marcos, evolução corporal, exercícios (consumers downstream)
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npm test --silent 2>&1 | grep "Test Suites:" | tail -1; done

# Confirmar campo
grep -c "rotina_slug" src/lib/schemas/treino_sessao.ts
# Esperado: >= 1
```

## Proof-of-work esperado

1. Diff (~50-80L)
2. +5-8 testes
3. Smoke verde + 3 runs sanity
4. Hash commit no worktree
5. Achados colaterais
6. Drift contract atualizado (sibling Python — issue etl-contract abrir)

## Origem

Parte 1 de R-ROT-1 opção D. Dono escolheu A+B+C+D em 2026-05-21. Parte
2 é `R-ROT-1-D-INTELIGENCIA-TREINO-spec.md` (consome este campo).
