#!/usr/bin/env bash
# adb-install-bypass.sh — instala APK bypassando HyperOS/MIUI USB restriction (A32).
#
# HyperOS bloqueia `adb install -r` com INSTALL_FAILED_USER_RESTRICTED mesmo
# com "Install via USB" ATIVADA. Fix: push para /data/local/tmp + pm install
# como shell user (privileged), pulando o verificador HyperOS.
#
# Uso:
#   ./scripts/adb-install-bypass.sh <apk>
#   ./scripts/adb-install-bypass.sh -s <device> <apk>
#
# Multi-device:
#   ./scripts/adb-install-bypass.sh -s 192.168.0.123:5555 builds/app.apk
set -euo pipefail

DEVICE_ARGS=()
APK=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s)
      if [[ -z "${2:-}" ]]; then
        echo "ERRO: -s requer ID de device" >&2
        exit 2
      fi
      DEVICE_ARGS=(-s "$2")
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      if [[ -z "$APK" ]]; then
        APK="$1"
        shift
      else
        echo "ERRO: argumento extra '$1'" >&2
        exit 2
      fi
      ;;
  esac
done

if [[ -z "$APK" ]]; then
  echo "ERRO: passe o caminho do APK como argumento" >&2
  echo "Uso: $0 [-s <device>] <apk>" >&2
  exit 2
fi

if [[ ! -f "$APK" ]]; then
  echo "ERRO: APK nao encontrado: $APK" >&2
  exit 2
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "ERRO: adb nao esta no PATH" >&2
  exit 2
fi

# Se nao passou -s, valida que existe pelo menos 1 device.
if [[ ${#DEVICE_ARGS[@]} -eq 0 ]]; then
  DEVICES=$(adb devices | awk 'NR>1 && $2=="device"{print $1}')
  COUNT=$(echo -n "$DEVICES" | grep -c . || true)
  if [[ "$COUNT" -eq 0 ]]; then
    echo "ERRO: nenhum device conectado. Rode 'adb devices'." >&2
    exit 3
  fi
  if [[ "$COUNT" -gt 1 ]]; then
    echo "AVISO: $COUNT devices conectados. Usando o primeiro." >&2
    echo "Para escolher: $0 -s <id> $APK" >&2
    echo "Devices:" >&2
    echo "$DEVICES" | sed 's/^/  /' >&2
  fi
fi

REMOTE="/data/local/tmp/ouroboros-install.apk"

echo "[1/3] push $APK -> $REMOTE"
adb "${DEVICE_ARGS[@]}" push "$APK" "$REMOTE"

echo "[2/3] pm install -r -t $REMOTE"
adb "${DEVICE_ARGS[@]}" shell pm install -r -t "$REMOTE"

echo "[3/3] limpando staging"
adb "${DEVICE_ARGS[@]}" shell rm -f "$REMOTE"

echo "OK: APK instalado via bypass HyperOS"
