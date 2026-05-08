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

1. **Pré-requisito** (confirmado 2026-05-08): `lerVaultMock(path)`
   **NÃO existe** no `__gauntlet`. Adicionar antes:
   ```ts
   // src/lib/dev/gauntlet.ts (novo método)
   lerVaultMock(path: string): string | null {
     return mockVaultStore.getState().arquivos[path] ?? null;
   }
   ```
   E declarar no tipo `__gauntletApi`. Esta extensão fica nesta sprint
   mesma (não é sprint nova).
2. Implementar asserts no E2E:
   - `__gauntlet.reset() && __gauntlet.seed()` → ler `markdown/_devices.md`.
   - Asserir conteúdo contém `deviceId:` + `nome_amigavel:` + `pessoa: pessoa_a` + `primeira_atividade:` ISO datetime.
   - Re-rodar `__gauntlet.reset() && __gauntlet.seed()` → conteúdo
     **idêntico** ao primeiro (idempotência).

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

## 10. Decisão resolvida

`lerVaultMock` **não existe** no Gauntlet (confirmado via grep
2026-05-08). Esta sprint adiciona como sub-step §6.1 (sem sprint nova).
Implementação: helper sobre o estado do mock vault interno.
