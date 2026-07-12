#!/usr/bin/env bash
# adb-wireless.sh — habilita ADB sem cabo apos pareamento USB inicial.
# Uso: ./scripts/adb-wireless.sh                 # com celular ja conectado USB
#      ./scripts/adb-wireless.sh 192.168.x.y     # se ja sabe o IP
set -euo pipefail
IP="${1:-}"
if [[ -z "$IP" ]]; then
  IP=$(adb shell ip -4 addr show wlan0 2>/dev/null | awk '/inet/{print $2}' | cut -d/ -f1 | head -1)
  if [[ -z "$IP" ]]; then
    echo "ERRO: nao encontrei IP. Conecte cabo USB ou passe IP como arg."
    exit 1
  fi
fi
echo "ativando ADB wireless..."
adb tcpip 5555
sleep 1
echo "conectando $IP:5555 (desconecte o cabo agora)"
adb connect "$IP:5555"
echo ""
echo "OK: ADB wireless ativo. Para testar:"
echo "  adb devices"
