#!/usr/bin/env bash
# adb-stayon.sh — configura device pra validacao live.
#
# - svc power stayon usb: tela fica ligada enquanto USB conectado
# - adb reverse tcp:8081: Metro bundler atinge localhost do celular
# - adb reverse tcp:8082: Hermes inspector / dev tools WS
#
# Idempotente: roda quantas vezes quiser.
#
# Uso:
#   ./scripts/adb-stayon.sh
#   ./scripts/adb-stayon.sh -s <device>
#   ./scripts/adb-stayon.sh --off          # remove reverse e stayon
set -euo pipefail

DEVICE_ARGS=()
OFF=0
PORTS=(8081 8082)

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s)
      DEVICE_ARGS=(-s "${2:?ID de device requerido}")
      shift 2
      ;;
    --off)
      OFF=1
      shift
      ;;
    -h|--help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "ERRO: arg desconhecido '$1'" >&2
      exit 2
      ;;
  esac
done

if ! command -v adb >/dev/null 2>&1; then
  echo "ERRO: adb nao esta no PATH" >&2
  exit 2
fi

if [[ ${#DEVICE_ARGS[@]} -eq 0 ]]; then
  COUNT=$(adb devices | awk 'NR>1 && $2=="device"' | wc -l)
  if [[ "$COUNT" -eq 0 ]]; then
    echo "ERRO: nenhum device conectado" >&2
    exit 3
  fi
  if [[ "$COUNT" -gt 1 ]]; then
    echo "AVISO: $COUNT devices. Usando o primeiro. Para escolher: -s <id>" >&2
  fi
fi

if [[ "$OFF" -eq 1 ]]; then
  echo "[off] removendo stayon e reverse"
  adb "${DEVICE_ARGS[@]}" shell svc power stayon false || true
  for p in "${PORTS[@]}"; do
    adb "${DEVICE_ARGS[@]}" reverse --remove "tcp:$p" 2>/dev/null || true
  done
  echo "OK: stayon=off, reverse limpo"
  exit 0
fi

echo "[1/3] stayon usb"
adb "${DEVICE_ARGS[@]}" shell svc power stayon usb

echo "[2/3] adb reverse tcp:8081 + tcp:8082"
for p in "${PORTS[@]}"; do
  adb "${DEVICE_ARGS[@]}" reverse "tcp:$p" "tcp:$p"
done

echo "[3/3] listando reverses ativos"
adb "${DEVICE_ARGS[@]}" reverse --list

echo "OK: device pronto pra validacao live"
