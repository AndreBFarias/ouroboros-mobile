# R-INFRA-ENV-JSON-TSCONFIG — Fallback de tipo para env.json gitignored

**Tipo**: infra
**Prioridade**: P3-low
**Estimativa**: 30min
**Tranche**: R-INFRA (nova, derivada do achado #1 de R-CRIT-4)
**Fase**: 3

## Origem

Achado colateral de R-CRIT-4 (commit `d53d4d9`):
`src/lib/services/googleAuthFlow.ts:20` importa `env.json` sem fallback
de tipo. Como `env.json` é gitignored (A39), worktrees novos quebram
no `npx tsc --noEmit` até linkar manualmente do main.

## Objetivo

Eliminar a fricção do `tsc` quebrar em worktrees novos (CI, executores
isolados). `env.json` continua gitignored — apenas o TIPO fica
disponível via shim.

## Entregáveis

### Opção A — Module declaration

Criar `src/types/env.d.ts`:

```ts
declare module '*/env.json' {
  const android: { client_id: string };
  const installed?: { client_id: string };
  export default { android, installed };
}
```

`tsconfig.json` já inclui `src/**/*.d.ts` por padrão; o import em
`googleAuthFlow.ts` passa a typechar sem precisar do arquivo real.

### Opção B — Wrapper

`src/lib/services/env.ts`:

```ts
import * as envExample from '../../env.json.example';
let env: typeof envExample;
try {
  env = require('../../env.json');
} catch {
  env = envExample;
}
export default env;
```

Trade-off: Opção A é zero-runtime; Opção B usa `env.json.example` como
fallback efetivo em dev/CI. **Recomendação: A** (fallback de runtime
não muda comportamento real, só silencia tsc).

## Dependências

- **Bloqueia**: melhorias futuras de DX em worktrees
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `src/types/env.d.ts` (ou
`src/lib/services/env.ts` se Opção B), `tsconfig.json` (só se Opção A
precisar de path mapping — geralmente não).

## Verificação canônica

```bash
git worktree list
# Em worktree limpo (sem env.json copiado):
npx tsc --noEmit  # esperado: 0 erros
./scripts/smoke.sh
```

## Proof-of-work

1. Arquivo criado.
2. Saída `npx tsc --noEmit` em worktree fresh sem env.json.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit.
5. Path do worktree + branch.
