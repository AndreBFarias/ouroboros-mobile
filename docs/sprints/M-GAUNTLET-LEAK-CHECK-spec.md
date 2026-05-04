# Sprint M-GAUNTLET-LEAK-CHECK — CI gate de anti-vazamento

```
DEPENDE:    M-GAUNTLET fechada
            + M-GAUNTLET-AUDITORIA fechada
BLOQUEIA:   nenhuma
ESTIMATIVA: 1-2h
PRIORIDADE: media
STATUS:     [todo]
```

## 1. Contexto

Auditoria 2026-05-04 item 1: a constante `GAUNTLET_ATIVO` está
fechada por `Platform.OS === 'web' && __DEV__`. Em release Android
isso vira dead-code, MAS Metro/Hermes só fazem tree-shake se
detectarem o early-return. Verificação manual nunca foi rodada de
forma automatizada.

## 2. Objetivo

Adicionar gate ao smoke (ou CI) que rode `expo export --platform
android` e confirme via `grep` que o bundle não contém
`__gauntlet` nem `instalarGauntlet`.

## 3. Entregáveis

- `scripts/check_gauntlet_leak.sh`:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  TMP=$(mktemp -d)
  trap "rm -rf $TMP" EXIT
  npx expo export --platform android --output-dir "$TMP" > /dev/null 2>&1
  if grep -rn "__gauntlet\|instalarGauntlet" "$TMP/_expo/static/js/" 2>/dev/null; then
    echo "ERRO: gauntlet vazou no bundle Android"
    exit 1
  fi
  echo "OK: bundle Android sem gauntlet"
  ```
- Adicionar chamada em `./scripts/smoke.sh` (opcional, controlado
  por flag `--full`).
- Documentar em `VALIDATOR_BRIEF.md` §1.9.

## 4. Verificação

```bash
./scripts/check_gauntlet_leak.sh
# Esperado: OK: bundle Android sem gauntlet
```

Sprint pronta.
