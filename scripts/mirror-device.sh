#!/usr/bin/env bash
# mirror-device.sh — abre janela espelhando o celular fisico ou
# emulador via scrcpy. Latencia <50ms.
#
# Uso: ./scripts/mirror-device.sh                  # primeiro device
#      ./scripts/mirror-device.sh emulator-5554    # device especifico
set -euo pipefail
DEVICE="${1:-}"
if [[ -z "$DEVICE" ]]; then
  DEVICE=$(adb devices | awk 'NR>1 && /device$/{print $1; exit}')
fi
if [[ -z "$DEVICE" ]]; then
  echo "ERRO: nenhum device ADB. Conecte celular ou inicie emulador."
  exit 1
fi
echo "Espelhando $DEVICE..."
exec scrcpy -s "$DEVICE" --window-title="Ouroboros Mobile - $DEVICE"
