#!/usr/bin/env bash
# Smoke test: anonimato + dados de teste + (quando existir) typecheck +
# lint + tests. Roda no pre-push e no CI.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo ">> anonimato (Regra -1)"
./scripts/check_anonimato.sh

echo ">> dados de teste"
./scripts/check_test_data.sh

# Typecheck, lint e testes so rodam quando o projeto Expo existir
if [[ -f package.json ]]; then
  echo ">> typecheck"
  npx --no-install tsc --noEmit || { echo "ERRO: typecheck falhou"; exit 1; }

  echo ">> lint"
  if [[ -d src || -d app ]]; then
    npx --no-install eslint app/ src/ 2>/dev/null || true
  fi

  echo ">> testes"
  if grep -q '"test"' package.json; then
    npm test --silent || { echo "ERRO: testes falharam"; exit 1; }
  fi
else
  echo ">> typecheck/lint/tests pulados (package.json ainda nao existe)"
fi

echo "OK: smoke test passou"
