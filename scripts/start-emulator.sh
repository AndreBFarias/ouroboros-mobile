#!/usr/bin/env bash
# start-emulator.sh — inicia o emulador ouroboros-test com flags
# de performance e mantem em background. Cria snapshot na primeira
# vez, reusa nas seguintes (boot <10s).
#
# Uso:
#   ./scripts/start-emulator.sh           # janela visivel (default)
#   ./scripts/start-emulator.sh --headless  # sem janela
#   ./scripts/start-emulator.sh --cold      # ignora snapshot
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/sdk}"
EMU="$ANDROID_HOME/emulator/emulator"
ADB="$ANDROID_HOME/platform-tools/adb"

HEADLESS=""
COLD=""
for arg in "$@"; do
  case "$arg" in
    --headless|-no-window) HEADLESS="-no-window" ;;
    --cold|-no-snapshot-load) COLD="-no-snapshot-load" ;;
  esac
done

# Mata emulador antigo se houver, evitando conflito de porta.
if "$ADB" devices | grep -q "emulator-"; then
  echo "Emulador ja rodando, parando antes de iniciar novo..."
  "$ADB" -s emulator-5554 emu kill 2>/dev/null || true
  sleep 2
fi

echo ">> iniciando ouroboros-test (cores host, GPU swiftshader_indirect, KVM)"
# Renderer 'swiftshader_indirect' sobrevive a snapshots melhor que
# 'host' em headless. Para janela visivel com GPU acelerada, troque
# para -gpu host (mas snapshot pode invalidar entre boots).
GPU_MODE="swiftshader_indirect"
[[ -z "$HEADLESS" ]] && GPU_MODE="host"

nohup "$EMU" -avd ouroboros-test \
  -gpu "$GPU_MODE" \
  -accel auto \
  -no-boot-anim \
  -no-audio \
  $COLD \
  $HEADLESS \
  > /tmp/emulator-ouroboros.log 2>&1 &

EMU_PID=$!
disown $EMU_PID
echo "PID: $EMU_PID. Log: /tmp/emulator-ouroboros.log"
echo "Aguardando boot completo (sys.boot_completed=1, ate 180s)..."

# Espera porta 5554 abrir (emulator iniciar de fato)
for i in $(seq 1 30); do
  if "$ADB" devices | grep -q "emulator-5554"; then
    break
  fi
  sleep 1
done

for i in $(seq 1 180); do
  BOOT=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [[ "$BOOT" == "1" ]]; then
    echo "OK: emulador pronto em ${i}s. Veja em 'adb devices'."
    exit 0
  fi
  sleep 1
done
echo "AVISO: timeout aguardando boot. Veja /tmp/emulator-ouroboros.log"
exit 1
