#!/usr/bin/env bash
# Diagnostico runtime: ADB devices + Metro status + ultimas linhas logcat.
# Roda sob set -uo (sem -e) para que cada bloco reporte mesmo se outro falhar.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== ADB devices ==="
adb devices 2>/dev/null || echo "adb nao encontrado"
echo ""

echo "=== Metro localhost:8081 ==="
if curl -sfm 2 http://localhost:8081 > /dev/null 2>&1; then
  echo "UP"
else
  echo "DOWN (rode ./run.sh ou ./gauntlet.sh)"
fi
echo ""

echo "=== App rodando? ==="
PID=$(adb shell pidof com.ouroboros.mobile 2>/dev/null || true)
if [[ -n "$PID" ]]; then
  echo "PID $PID"
  echo ""
  echo "=== Logcat (50 linhas) ==="
  adb logcat -d --pid="$PID" 2>/dev/null | tail -50
else
  echo "app nao esta rodando no device"
fi
