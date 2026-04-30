#!/usr/bin/env bash
# run.sh — inicia o servidor de desenvolvimento Expo.
#
# Uso:
#   ./run.sh             # Metro + QR (LAN, default)
#   ./run.sh --clear     # limpa cache do Metro antes de iniciar
#   ./run.sh --tunnel    # usa tunnel ngrok (precisa @expo/ngrok)
#   ./run.sh --web       # versao web no Chrome (sem conflito com celular)
#   ./run.sh --emulator  # inicia emulador Android e abre o app nele
#   ./run.sh --mirror    # espelha celular conectado em janela do PC
#
# Combine flags: ./run.sh --emulator --clear
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

EXTRA_ARGS=("$@")

flag() {
  for a in "${EXTRA_ARGS[@]}"; do
    [[ "$a" == "$1" ]] && return 0
  done
  return 1
}

# Remove flags consumidas localmente para nao passar ao expo start
strip_flag() {
  local target="$1"
  local out=()
  for a in "${EXTRA_ARGS[@]}"; do
    [[ "$a" != "$target" ]] && out+=("$a")
  done
  EXTRA_ARGS=("${out[@]}")
}

# --- Modo --mirror: abre janela espelhando celular (paralelo ao Metro) ---
if flag --mirror; then
  if command -v scrcpy >/dev/null 2>&1; then
    DEV=$(adb devices 2>/dev/null | awk 'NR>1 && /device$/{print $1; exit}')
    if [[ -n "$DEV" ]]; then
      echo ">> abrindo scrcpy para espelhar $DEV em segundo plano"
      scrcpy -s "$DEV" --window-title="Ouroboros Mobile - $DEV" \
        > /tmp/scrcpy-ouroboros.log 2>&1 &
    else
      echo "AVISO: --mirror pedido mas nenhum device ADB conectado."
    fi
  else
    echo "AVISO: scrcpy nao instalado. Rode ./install-dev.sh primeiro."
  fi
  strip_flag --mirror
fi

# --- Modo --emulator: garante emulador rodando antes do Metro ---
if flag --emulator; then
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
  ADB_BIN="$ANDROID_HOME/platform-tools/adb"
  [[ -x "$ADB_BIN" ]] || ADB_BIN="adb"

  if "$ADB_BIN" devices | grep -q "emulator-"; then
    echo ">> emulador ja esta rodando"
  else
    echo ">> iniciando emulador ouroboros-test"
    ./scripts/start-emulator.sh
  fi
  strip_flag --emulator
fi

# --- Modo --web: roda no Chrome do desktop ---
if flag --web; then
  strip_flag --web
  echo ""
  echo "=================================================="
  echo "MODO WEB - sem conflito com celular fisico"
  echo "=================================================="
  echo "Acesse no Chrome: http://localhost:8081"
  echo "Versao web:       http://localhost:19006"
  echo "=================================================="
  exec npx expo start --web "${EXTRA_ARGS[@]}"
fi

# --- Modo padrao: Metro + LAN + QR ---
IP=""
for iface in $(ip -4 addr show scope global | awk '/inet/{print $NF}' | grep -v docker); do
  IP=$(ip -4 addr show "$iface" 2>/dev/null | awk '/inet/{print $2}' | head -1 | cut -d/ -f1)
  if [[ -n "$IP" ]]; then
    echo "INTERFACE $iface  IP $IP"
    break
  fi
done

if [[ -z "$IP" ]]; then
  echo "ERRO: nao consegui detectar IP da WiFi."
  exit 1
fi

if flag --clear; then
  echo ">> limpando cache local"
  rm -rf .expo node_modules/.cache 2>/dev/null || true
fi

echo ""
echo "=================================================="
echo "OUROBOROS MOBILE - DEV SERVER"
echo "=================================================="
echo "IP da rede:  $IP"
echo "Metro:       http://localhost:8081"
echo "Expo Go URL: exp://$IP:8081"
echo ""
echo "Escaneie o QR no Expo Go (mesma rede WiFi)."
echo "=================================================="
echo ""

if command -v python3 >/dev/null 2>&1; then
  python3 -c "
try:
    import qrcode
    qr = qrcode.QRCode(border=2)
    qr.add_data('exp://$IP:8081')
    qr.make()
    qr.print_ascii(invert=True)
except ImportError:
    print('(pip install qrcode pra ver o QR ASCII)')
" 2>/dev/null || true
fi

echo ""
echo ">> iniciando Metro Bundler..."
REACT_NATIVE_PACKAGER_HOSTNAME="$IP" exec npx expo start --lan "${EXTRA_ARGS[@]}"
