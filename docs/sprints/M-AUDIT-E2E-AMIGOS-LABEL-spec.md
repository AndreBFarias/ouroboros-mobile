# Sprint V1 — M-AUDIT-E2E-AMIGOS-LABEL

```
DEPENDE:    G4 INFRA-GAUNTLET-AMIGOS-API (setTipoCompanhia exposto)
BLOQUEIA:   APK preview (cobertura E2E I2-AMIGOS)
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Caso E2E `tests/e2e/playwright/m-amigos-label.e2e.ts` exercitando
`setTipoCompanhia('casal')` e `setTipoCompanhia('amigos')` e asserindo
que `useNomeDe('ambos')` retorna "Casal" e "Todos" respectivamente.
Sprint I2-AMIGOS está fechada com 1 PNG mas zero E2E.

## 2. Entregáveis

### Arquivos novos

- `tests/e2e/playwright/m-amigos-label.e2e.ts` — caso de teste seguindo
  template `docs/templates/e2e-template.e2e.ts`. Asserta:
  1. `__gauntlet.setTipoCompanhia('casal') + abrir(/humor-rapido)` →
     chip "Casal" presente
  2. `__gauntlet.setTipoCompanhia('amigos') + abrir(/humor-rapido)` →
     chip "Todos" presente
  3. `__gauntlet.setTipoCompanhia('sozinho')` → label "Ambos" (legacy
     fallback) ou ausente

## 3. APIs reutilizáveis

- `__gauntlet.setTipoCompanhia` (G4).
- `__gauntlet.abrir(rota)`.
- `claude-in-chrome` MCP (read_page, computer click).

## 4. Restrições

Padrão. E2E roda via Claude/playwright MCP, não Jest (testPathIgnorePatterns).

## 5. Validação

Rodar manualmente:
1. `./gauntlet.sh`.
2. Executar o E2E via playwright MCP em sequência.
3. Asserts passam.

## 6. Procedimento

1. Copiar template.
2. Implementar 3 asserts.
3. Validar manual.

## 7. Verificação

Smoke (E2E não roda em jest).

## 8. Commit

```
test: m-audit-e2e-amigos-label cobre tipocompanhia ramificacao
```

## 9. Checkpoint visual

Não aplicável (E2E é o validador).

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Dúvidas em aberto

Nenhuma.
