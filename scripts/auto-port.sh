#!/usr/bin/env bash
# auto-port.sh -- retorna a primeira porta TCP livre na faixa [8081-8099].
#
# Uso:
#   PORT=$(./scripts/auto-port.sh)        # default 8081-8099
#   PORT=$(./scripts/auto-port.sh 9000 9009)  # faixa custom
#
# Saida: numero da porta (stdout). Exit 0 se encontrou, 1 se faixa toda ocupada.
#
# Implementacao: usa `ss -ltn` para listar portas em escuta TCP, e `comm` para
# devolver a primeira porta da faixa que nao esta em uso. Funciona com qualquer
# combinacao IPv4/IPv6 (ss agrupa ambas).
#
# Pre-requisitos: ss (iproute2), comm, seq, sort, tr -- todos coreutils padrao.
# Comentarios sem acento.
set -euo pipefail

START="${1:-8081}"
END="${2:-8099}"

if [[ "$START" -gt "$END" ]]; then
  echo "ERRO: faixa invalida ($START > $END)" >&2
  exit 1
fi

# Lista portas em escuta TCP (LISTEN). ss formato:
#   LISTEN 0 4096 *:8081 *:*
# Pega coluna 4 (local address:port), extrai porta apos o ultimo ':'.
PORTAS_OCUPADAS=$(ss -tln 2>/dev/null | awk 'NR>1 {print $4}' \
  | grep -oE '[0-9]+$' | sort -un || true)

# Primeira porta da faixa que NAO esta em PORTAS_OCUPADAS.
FREE=$(comm -23 \
  <(seq "$START" "$END" | sort) \
  <(echo "$PORTAS_OCUPADAS" | sort) \
  | head -1)

if [[ -z "$FREE" ]]; then
  echo "ERRO: faixa [$START-$END] toda ocupada" >&2
  exit 1
fi

echo "$FREE"
