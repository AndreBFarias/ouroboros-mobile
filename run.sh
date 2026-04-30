#!/usr/bin/env bash
# run.sh — inicia o servidor de desenvolvimento Expo.
#
# O que faz:
#   1. Detecta IP da rede WiFi local (interface principal)
#   2. Define REACT_NATIVE_PACKAGER_HOSTNAME para o IP detectado
#   3. Inicia npx expo start --lan
#   4. Imprime QR code ASCII para o Expo Go escanear
#
# Uso:
#   ./run.sh           # inicio normal
#   ./run.sh --clear   # limpa cache do Metro antes de iniciar
#   ./run.sh --tunnel  # usa tunnel ngrok (precisa @expo/ngrok)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Detecta IP da WiFi (primeira interface global up que nao seja docker0)
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
  echo "      Conecte-se a uma rede WiFi e tente de novo."
  exit 1
fi

# Argumentos extras que o usuario passou (--clear, --tunnel, etc)
EXTRA_ARGS=("$@")

# Modo web: roda no Chrome do desktop sem conflito com celular fisico.
# Util para o Claude Code validar fluxos JS via claude-in-chrome MCP
# enquanto o usuario continua usando o celular para outras coisas.
if [[ " ${EXTRA_ARGS[*]} " =~ " --web " ]]; then
  echo ""
  echo "=================================================="
  echo "MODO WEB - sem conflito com celular fisico"
  echo "=================================================="
  echo "Acesse:    http://localhost:8081"
  echo "Web URL:   http://localhost:19006 (apos abrir o web)"
  echo "=================================================="
  npx expo start --web "${EXTRA_ARGS[@]}"
  exit 0
fi

# Limpa cache do .expo se --clear foi passado
if [[ " ${EXTRA_ARGS[*]} " =~ " --clear " ]]; then
  echo ">> limpando cache local (.expo, node_modules/.cache)"
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
echo "Escaneie o QR code abaixo com o Expo Go no celular."
echo "Garanta que o celular esta na mesma rede WiFi."
echo "=================================================="
echo ""

# Tenta gerar QR via python qrcode se disponivel
if command -v python3 >/dev/null 2>&1; then
  python3 -c "
try:
    import qrcode
    qr = qrcode.QRCode(border=2)
    qr.add_data('exp://$IP:8081')
    qr.make()
    qr.print_ascii(invert=True)
except ImportError:
    print('(instale qrcode com pip install qrcode para ver o QR ASCII)')
" 2>/dev/null || true
fi

echo ""
echo ">> iniciando Metro Bundler..."
REACT_NATIVE_PACKAGER_HOSTNAME="$IP" npx expo start --lan "${EXTRA_ARGS[@]}"
