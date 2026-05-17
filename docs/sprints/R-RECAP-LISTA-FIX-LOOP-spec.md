# R-RECAP-LISTA-FIX-LOOP — Mesmo padrão de bug em recap-lista.tsx

**Tipo**: bug fix
**Prioridade**: P2-medium
**Estimativa**: 15-30min
**Fase**: 3
**Origem**: achado R-RECAP-FIX-LOOP (commit `cb2c02d`)

## Problema

Mesmo padrão de bug "Maximum update depth" em `app/recap-lista.tsx:100-105`:

```typescript
const hoje = new Date();
const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
const range: PeriodoRange = {
  de: parseDate(params.de, seteDiasAtras),
  ate: parseDate(params.ate, hoje),
};
```

`hoje = new Date()` recriado a cada render → Date.now() avança em ms → `range.de.getTime()` instável → loop.

Risco: se a rota `/recap-lista` for navegada sem `params.de/ate`, mesmo loop do R-RECAP-FIX-LOOP.

## Solução

Mesmo pattern do R-RECAP-FIX-LOOP (`cb2c02d`):

```typescript
const range = useMemo<PeriodoRange>(() => {
  const hoje = new Date();
  const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    de: parseDate(params.de, seteDiasAtras),
    ate: parseDate(params.ate, hoje),
  };
}, [params.de, params.ate]);
```

## OFF-LIMITS

**Pode tocar**: `app/recap-lista.tsx` (envolver `range` em useMemo).

**Não pode tocar**: useRecap, schemas, outras rotas.

## Verificação

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos.
2. `npx jest --silent | tail -5`.
3. `./scripts/smoke.sh`.
4. Hash do commit.
5. Teste regression espelhando R-RECAP-FIX-LOOP `tests/app/recap-lista-loop-regression.test.tsx`.
6. Achados.

## Decisão

Sprint pequena, derivada direta de R-RECAP-FIX-LOOP. Pode rodar paralelo a qualquer outra Onda.
