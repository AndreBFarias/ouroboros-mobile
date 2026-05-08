# Sprint V2 — M-AUDIT-E2E-MENU-NOMES

```
DEPENDE:    HEAD em 9c385b3 (K2 entregue 8afd857)
BLOQUEIA:   APK preview (cobertura E2E K2)
ESTIMATIVA: ~0.3h
STATUS:     [todo]
```

## 1. Objetivo

Caso E2E `tests/e2e/playwright/m-menu-nomes.e2e.ts` validando que o
MenuLateral exibe seções "Acesso Rápido" e "Utilitários" (renomeadas em
K2). Sprint K2 está fechada sem E2E.

## 2. Entregáveis

### Arquivos novos

- `tests/e2e/playwright/m-menu-nomes.e2e.ts`. Asserta:
  1. `__gauntlet.seed() + abrirMenu()` → DOM contém texto "Acesso Rápido".
  2. DOM contém "Utilitários".
  3. DOM **NÃO** contém "Ver" nem "Opcionais" (nomes antigos).

## 3. APIs reutilizáveis

- `__gauntlet.seed`, `__gauntlet.abrirMenu`.
- `mcp__claude-in-chrome__read_page`.

## 4. Restrições

Padrão.

## 5. Validação

Manual via playwright MCP.

## 6. Procedimento

1. Copiar template e adaptar.

## 7. Verificação

Smoke.

## 8. Commit

```
test: m-audit-e2e-menu-nomes acesso rapido utilitarios
```

## 9. Checkpoint visual

E2E é o validador.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Dúvidas em aberto

Nenhuma.
