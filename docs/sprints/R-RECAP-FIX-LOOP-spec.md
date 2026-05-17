# R-RECAP-FIX-LOOP — Maximum update depth em /recap-memorias

**Tipo**: bug fix
**Prioridade**: P2-medium
**Estimativa**: 30-60min
**Fase**: 3
**Origem**: achado R-MEDIA-2 (Onda 3A)

## Problema

Ao navegar para `/recap-memorias`, console emite múltiplas vezes:

```
Maximum update depth exceeded. This can happen when a component
calls setState inside useEffect...
```

R-MEDIA-2 verificou via git stash que bug é **pré-existente** (já estava em R-RECAP-4 ou anterior). Não regressão.

## Causa raiz provável

`range = { de: parseDate(...), ate: parseDate(...) }` recriado a cada render no top do `app/recap-memorias.tsx` → `useRecap.useEffect` re-roda em deps → `setData/setLoading` → re-render → loop.

## Solução

Envolver `range` em `useMemo` por `getTime()` ou string ISO:

```typescript
const rangeISO = useMemo(() => ({
  de: parseDate(deString).toISOString(),
  ate: parseDate(ateString).toISOString(),
}), [deString, ateString]);

// useRecap consome strings estáveis
const recap = useRecap({ de: rangeISO.de, ate: rangeISO.ate });
```

E em `useRecap.ts` revisar deps do `useEffect` para receber strings (não Date object).

## OFF-LIMITS

**Pode tocar**:
- `app/recap-memorias.tsx` (envolver `range` em useMemo)
- `src/lib/hooks/useRecap.ts` (estabilizar deps; opcional)

**Não pode tocar**:
- Lógica de fetch de Recap
- Schema de Recap
- Outras rotas

## Verificação

```bash
./scripts/smoke.sh
# Manual via Gauntlet: navegar para /recap-memorias, abrir console DevTools
# Esperado: zero erros "Maximum update depth"
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit.
5. Path do worktree + branch.
6. Screenshot Gauntlet `/recap-memorias` SEM erros console (devtools aberto).
7. Achados colaterais.

## Decisão

- P2 porque bug existia desde R-RECAP-4 (não bloqueou release mas polui DevTools e pode causar performance drop em rotas longas).
- Sprint cirúrgica (~30-60min).
