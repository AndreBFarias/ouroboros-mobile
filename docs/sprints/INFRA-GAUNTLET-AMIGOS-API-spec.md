# Sprint G4 — INFRA-GAUNTLET-AMIGOS-API

```
DEPENDE:    HEAD em 9c385b3
BLOQUEIA:   M-AUDIT-E2E-AMIGOS-LABEL (Bloco V)
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Expor `setTipoCompanhia(modo: 'sozinho' | 'casal' | 'amigos')` em
`window.__gauntlet` para que o E2E de I2-AMIGOS exerça a ramificação
de `useNomeDe('ambos')` (que retorna "Casal" / "Todos" / "Ambos"
conforme `tipoCompanhia`).

## 2. Entregáveis

### Arquivos modificados

- `src/lib/dev/gauntlet.ts` — adicionar `setTipoCompanhia(modo)` que
  faz `useOnboarding.setState({ tipoCompanhia: modo })`. Documentar na
  array de APIs públicas.
- `docs/GAUNTLET.md` — atualizar lista de APIs (12 → 13).

## 3. APIs reutilizáveis

- `src/lib/stores/onboarding.ts` (`setState`).
- `src/lib/dev/gauntlet.ts` (padrão de exposição).

## 4. Restrições

Padrão. Apenas `__DEV__` web — em release Android, dead-code (per
flag `GAUNTLET_ATIVO`).

## 5. Validação

```js
// console do Gauntlet
__gauntlet.setTipoCompanhia('amigos');
__gauntlet.estado().tipoCompanhia === 'amigos'; // true
```

## 6. Procedimento

1. Adicionar função em `gauntlet.ts`.
2. Atualizar tipo `__gauntletApi`.
3. Atualizar `docs/GAUNTLET.md`.

## 7. Verificação

Smoke + tsc.

## 8. Commit

```
feat: infra-gauntlet-amigos-api setTipoCompanhia exposto
```

## 9. Checkpoint visual

Sprint dev-only — testar via console JS.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.
- [ ] `docs/GAUNTLET.md` atualizado.

## 10. Dúvidas em aberto

Nenhuma.
