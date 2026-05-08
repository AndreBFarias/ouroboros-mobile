# Sprint V3 — M-AUDIT-E2E-BOTOES-LARGURA

```
DEPENDE:    HEAD em 9c385b3 + W consolidado (Recap padding fix)
BLOQUEIA:   APK preview
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Caso E2E `tests/e2e/playwright/m-botoes-largura.e2e.ts` validando largura
e padding dos 3 botões corrigidos por K5 + Recap home (W2 do RELATORIO).

## 2. Entregáveis

### Arquivos novos

- `tests/e2e/playwright/m-botoes-largura.e2e.ts`. Asserta via medição JS:
  1. Botão "Conectar conta Google" em `/agenda` tem `width >= 200px` e
     `paddingHorizontal >= 16px`.
  2. Botão "Recap" em `/` tem `paddingHorizontal >= 8px` (após patch W2)
     e `width >= 64px`.
  3. Botão "Abrir agenda" em `/settings/contas-google` (quando aplicável)
     tem largura adequada.

## 3. APIs reutilizáveis

- `mcp__claude-in-chrome__javascript_tool` (medições `getBoundingClientRect`).

## 4. Restrições

Padrão.

## 5. Validação

Manual.

## 6. Procedimento

1. Implementar 3 asserts via JS evaluator.

## 7. Verificação

Smoke.

## 8. Commit

```
test: m-audit-e2e-botoes-largura medicoes width padding
```

## 9. Checkpoint visual

E2E é o validador.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Dúvidas em aberto

Nenhuma.
