# Sprint W2.1 — M-AUDIT-GAUNTLET-RESET-PERSIST-KEYS

```
DEPENDE:    HEAD em ae22e1c
BLOQUEIA:   nada (cosmético, mas evita vazamento entre E2Es)
ESTIMATIVA: ~0.3h
STATUS:     [todo]
```

## 1. Objetivo

Achado colateral revelado durante V4 (re-dispatch): `aplicarReset` em
`src/lib/dev/gauntlet.ts:251-258` limpa chaves localStorage com nomes
**desatualizados** (`ouroboros.vault`, `ouroboros.pessoa`, etc.) que
**não batem** com as chaves canônicas das stores (`ouroboros.vault.v1`,
`ouroboros.pessoa.v1`, etc.). Resultado: estado de zustand persist vaza
entre casos E2E que dependem de reset limpo.

## 2. Entregáveis

### Modificar
- `src/lib/dev/gauntlet.ts` (linhas ~251-258 do `aplicarReset`):
  alinhar lista de chaves com as canônicas reais. Auditar todas as
  stores em `src/lib/stores/*` que usam `persist({ name: '...' })`.

### Validação
- Acceptance: `rg "name:\s*'ouroboros\." src/lib/stores/` deve listar
  conjunto idêntico (paths + chaves) ao varrido em `aplicarReset`.

## 3. APIs reutilizáveis

- zustand `persist` middleware.

## 4. Restrições

Padrão. Sem mudança de comportamento de stores (apenas nome de chaves
sincronizado).

## 5. Validação

```bash
# 1. Listar chaves canônicas:
rg "name:\s*'ouroboros\." src/lib/stores/ -t ts

# 2. Listar chaves limpas no aplicarReset:
grep -A 10 "aplicarReset" src/lib/dev/gauntlet.ts | grep "ouroboros\."

# 3. Comparar — devem casar 1:1.
```

E2E manual: `__gauntlet.reset()` no console + `localStorage.length`
deve voltar a 0 (ou só conter chaves não-Ouroboros).

## 6. Procedimento

1. Auditar todas as `name:` em `persist({ name: '...' })` em
   `src/lib/stores/*.ts`.
2. Compilar lista canônica.
3. Atualizar `aplicarReset` em `gauntlet.ts`.
4. Validar.

## 7. Verificação

```bash
npx tsc --noEmit
npm test -- gauntlet
./scripts/smoke.sh
```

## 8. Commit

```
fix: m-audit-gauntlet-reset-persist-keys aplicarreset chaves canonicas
```

## 9. Checkpoint visual

Sprint dev-only — sem UI.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Decisão resolvida

Sincronização 1:1 com chaves declaradas em stores. Sem fallback
"limpar prefixo `ouroboros.*`" — explícito é mais seguro.
