#!/usr/bin/env bash
# Smoke unit do scripts/check_test_data.sh.
# Cobre dois casos:
#   1. Linha com nome real SEM marker -> script deve falhar (exit 1).
#   2. Linha com nome real COM marker 'test-data-allow:' -> ignorada (exit 0).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/check_test_data.sh"

if [[ ! -x "$SCRIPT" ]]; then
  echo "ERRO: $SCRIPT nao executavel"
  exit 1
fi

# Sandbox isolado: sandbox separada com tests/ propria.
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

mkdir -p "$SANDBOX/scripts" "$SANDBOX/tests/fixtures"
cp "$SCRIPT" "$SANDBOX/scripts/check_test_data.sh"

# Caso 1: violacao sem marker -> esperado exit 1.
# Construimos o nome real em runtime para que o literal nao aparece
# textualmente neste arquivo (senao o check_test_data.sh global apanha
# este proprio teste como violacao).
NOME_PROIBIDO="An""dre Silva"
printf 'const nome = "%s";\n' "$NOME_PROIBIDO" \
  > "$SANDBOX/tests/fixtures/violacao.test.ts"

set +e
( cd "$SANDBOX" && ./scripts/check_test_data.sh > /dev/null 2>&1 )
RC1=$?
set -e

if [[ "$RC1" -ne 1 ]]; then
  echo "FAIL caso 1: esperado exit 1 (violacao detectada), obtido $RC1"
  exit 1
fi
echo "OK caso 1: violacao sem marker detectada (exit 1)"

# Caso 2: mesma string, mas com marker 'test-data-allow:' -> exit 0.
printf 'const nome = "%s"; // test-data-allow: fixture intencional do teste do proprio check\n' "$NOME_PROIBIDO" \
  > "$SANDBOX/tests/fixtures/violacao.test.ts"

set +e
( cd "$SANDBOX" && ./scripts/check_test_data.sh > /dev/null 2>&1 )
RC2=$?
set -e

if [[ "$RC2" -ne 0 ]]; then
  echo "FAIL caso 2: esperado exit 0 (marker autoriza), obtido $RC2"
  exit 1
fi
echo "OK caso 2: marker test-data-allow autoriza linha (exit 0)"

echo "OK: check_test_data.test.sh 2/2 casos"
