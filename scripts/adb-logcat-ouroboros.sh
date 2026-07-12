#!/usr/bin/env bash
# adb-logcat-ouroboros.sh — logcat filtrado do app + ReactNativeJS.
#
# Filtra so o que importa: pid do com.ouroboros.mobile, tags
# ReactNativeJS, AndroidRuntime, e crashes. Roda em foreground;
# Ctrl-C derruba limpo.
#
# Uso:
#   ./scripts/adb-logcat-ouroboros.sh
#   ./scripts/adb-logcat-ouroboros.sh -s <device>
#   ./scripts/adb-logcat-ouroboros.sh --no-clear   # nao limpa buffer
set -euo pipefail

DEVICE_ARGS=()
CLEAR=1
PACKAGE="com.ouroboros.mobile"

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
    --no-clear)
      CLEAR=0
      shift
      ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
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

# Tenta pegar pid do app rodando. Se nao rodar, segue sem filtro de pid
# (mostra tudo dos tags relevantes).
PID=$(adb "${DEVICE_ARGS[@]}" shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)

if [[ "$CLEAR" -eq 1 ]]; then
  echo "limpando buffer logcat"
  adb "${DEVICE_ARGS[@]}" logcat -c
fi

if [[ -n "$PID" ]]; then
  echo "filtrando pid $PID ($PACKAGE) + ReactNativeJS + AndroidRuntime"
  exec adb "${DEVICE_ARGS[@]}" logcat \
    --pid="$PID" \
    ReactNativeJS:V \
    ReactNative:V \
    AndroidRuntime:E \
    *:S
else
  echo "AVISO: $PACKAGE nao esta rodando agora. Aguardando crashes/RN globais."
  echo "Inicie o app no celular; rode --no-clear depois pra pegar pid vivo."
  exec adb "${DEVICE_ARGS[@]}" logcat \
    ReactNativeJS:V \
    ReactNative:V \
    AndroidRuntime:E \
    *:S
fi
