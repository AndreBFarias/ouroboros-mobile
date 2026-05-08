# Sprint G3 — INFRA-CHECK-TEST-DATA-ALLOW

```
DEPENDE:    HEAD em 9c385b3
BLOQUEIA:   nada (qualidade de toolchain)
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Alinhar `scripts/check_test_data.sh` com o padrão `// anonimato-allow:`
do `check_anonimato.sh`. Hoje o `check_test_data` rejeita strings
"andre@" / "vitoria" mesmo em testes legítimos. Adicionar marker
`// test-data-allow: <razao>` que autoriza por linha.

## 2. Entregáveis

### Arquivos modificados

- `scripts/check_test_data.sh` — implementar grep com `--invert-match`
  por linhas que contêm `test-data-allow:`.

### Arquivos novos

- `tests/scripts/check_test_data.test.sh` (smoke unit do próprio script).

## 3. APIs reutilizáveis

- `scripts/check_anonimato.sh` (padrão de marker `anonimato-allow:`).

## 4. Restrições

Padrão. Mudança backwards-compat (sem marker → comportamento atual).

## 5. Validação

`./scripts/check_test_data.sh` exit 0 antes e depois (smoke).

## 6. Procedimento

1. Ler `check_anonimato.sh` para padrão de allow line-level.
2. Replicar em `check_test_data.sh`.
3. Smoke.

## 7. Verificação

Smoke + smoke unit.

## 8. Commit

```
chore: infra-check-test-data-allow marker line-level
```

## 9. Checkpoint visual

Sprint documental — sem validação Gauntlet/adb.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Dúvidas em aberto

Nenhuma.
