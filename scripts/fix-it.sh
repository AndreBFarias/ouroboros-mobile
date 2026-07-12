#!/usr/bin/env bash
# Aplica prettier + eslint --fix em src/ e app/ + reporta tsc residual.
# Roda sob set -uo (sem -e) para que cada etapa reporte mesmo se outra
# falhar; eslint --fix pode sair com codigo != 0 quando ha warnings.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

echo ">> prettier --write"
npx prettier --write \
  "src/**/*.{ts,tsx}" \
  "app/**/*.{ts,tsx}" \
  "tests/**/*.{ts,tsx}" 2>&1 | tail -3
echo ""

echo ">> eslint --fix"
npx eslint --fix "app/" "src/" 2>&1 | tail -5 || true
echo ""

echo ">> tsc --noEmit (erros residuais ficam para fix manual)"
npx tsc --noEmit 2>&1 | tail -10 || true
echo ""

echo "OK: fix-it batch concluido"
