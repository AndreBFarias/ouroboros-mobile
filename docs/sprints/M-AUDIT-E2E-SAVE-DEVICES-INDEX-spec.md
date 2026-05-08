# Sprint V4 — M-AUDIT-E2E-SAVE-DEVICES-INDEX

```
DEPENDE:    HEAD em 9c385b3 (I-DEVICES entregue b1cabec)
BLOQUEIA:   APK preview
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Caso E2E `tests/e2e/playwright/m-save-devices-index.e2e.ts` validando
o boot hook idempotente que cria `markdown/_devices.md` no Vault
(M38 + I-DEVICES).

## 2. Entregáveis

### Arquivos novos

- `tests/e2e/playwright/m-save-devices-index.e2e.ts`. Asserta:
  1. `__gauntlet.reset() + seed()` → boot hook roda → arquivo
     `markdown/_devices.md` no mock vault contém `deviceId`,
     `nome_amigavel`, `pessoa`, `primeira_atividade`.
  2. Re-rodar boot hook (`__gauntlet.reset() + seed()` novamente) →
     `_devices.md` não duplica entrada (idempotente).

## 3. APIs reutilizáveis

- `__gauntlet.estado()` (snapshot do mock vault).

## 4. Restrições

Padrão. Pode requerir expor `__gauntlet.lerVaultMock(path)` para asserir
conteúdo do `_devices.md` — confirmar antes.

## 5. Validação

Manual via playwright MCP.

## 6. Procedimento

1. Verificar se há API no Gauntlet para ler arquivo do mock vault. Se
   não, adicionar `lerVaultMock(path)` (sub-sprint trivial).
2. Implementar asserts.

## 7. Verificação

Smoke.

## 8. Commit

```
test: m-audit-e2e-save-devices-index boot hook idempotente
```

## 9. Checkpoint visual

E2E é o validador.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Dúvidas em aberto

`lerVaultMock` API existe no `__gauntlet`? Confirmar antes da execução.
