#!/usr/bin/env bash
# Testes nao podem ter nomes reais nem paths pessoais hardcoded.
# Use 'pessoa_a', 'pessoa_b', tempfile.mkdtemp() ou /tmp/test_dir.
set -euo pipefail

NOMES='Andr[eé]|Vit[oó]ria|Maria|Jo[aã]o'
PATHS='/home/[a-z]+/'

if [[ ! -d tests ]]; then
  echo "OK: pasta tests/ nao existe ainda (pre-M01)"
  exit 0
fi

VIOLACOES=$(grep -rE "$NOMES|$PATHS" tests/ 2>/dev/null || true)

if [[ -n "$VIOLACOES" ]]; then
  echo "ERRO: testes com dados pessoais:"
  echo "$VIOLACOES"
  exit 1
fi

echo "OK: testes com dados sinteticos"
