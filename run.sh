#!/usr/bin/env bash
# run.sh — inicia o servidor de desenvolvimento Expo (Metro).
#
# O app usa modulos nativos proprios (health-connect, widget); Expo Go
# NAO abre o app. O caminho padrao e' o DEV-CLIENT instalado no celular
# (builds/dev-client-*.apk) conectado a este Metro.
#
# Uso:
#   ./run.sh             # Metro dev-client (padrao; celular via USB/WiFi)
#   ./run.sh --device    # idem + adb reverse + abre o app no celular
#   ./run.sh --web       # versao web no Chrome (sem conflito com celular)
#   ./run.sh --clear     # limpa cache do Metro antes de iniciar
#   ./run.sh --emulator  # inicia emulador Android e abre o app nele
#   ./run.sh --mirror    # espelha celular conectado em janela do PC
#   ./run.sh --force     # ignora Metro ja rodando na porta 8081
#
# Celular sem cabo (uma vez por rede): ./scripts/adb-wifi-pair.sh CODIGO
# (Ajustes > Opcoes do desenvolvedor > Depuracao sem fio > Parear com codigo)
#
# Para validacao visual silenciosa em browser desktop:
#   ./gauntlet.sh        # sobe Metro web + abre Chrome em /_dev/gauntlet
#
# Combine flags: ./run.sh --device --clear
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Bundling do Metro estoura o heap default do node (~2GB) neste projeto.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

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

FORCE=0
if flag --force; then FORCE=1; strip_flag --force; fi

# --- Guard: um segundo Metro na mesma porta briga pelo bundle e pode
# derrubar os dois por falta de memoria. Se ja tem um vivo, avisa e sai. ---
if [[ "$FORCE" -eq 0 ]] && curl -s -o /dev/null --max-time 2 "http://localhost:8081/status" 2>/dev/null; then
  echo "ERRO: ja existe um Metro respondendo em http://localhost:8081."
  echo "  - Para usar o que ja esta rodando: abra o app no celular (dev-client)."
  echo "  - Para derrubar e subir um novo:   pkill -f 'expo start' && ./run.sh"
  echo "  - Para ignorar este aviso:         ./run.sh --force"
  exit 1
fi

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
  echo "=================================================="
  exec npx expo start --web "${EXTRA_ARGS[@]}"
fi

if flag --clear; then
  echo ">> limpando cache local"
  rm -rf .expo node_modules/.cache 2>/dev/null || true
  strip_flag --clear
  EXTRA_ARGS+=("--clear")
fi

# --- Modo --device: prepara o celular (adb reverse + abre o app) ---
ABRIR_NO_DEVICE=0
if flag --device; then
  strip_flag --device
  DEV=$(adb devices 2>/dev/null | awk 'NR>1 && /device$/{print $1; exit}')
  if [[ -z "$DEV" ]]; then
    echo "ERRO: nenhum device ADB conectado."
    echo "  - USB: conecte o cabo e aceite a depuracao."
    echo "  - WiFi: Ajustes > Opcoes do desenvolvedor > Depuracao sem fio >"
    echo "    'Parear dispositivo com codigo' e rode:"
    echo "      ./scripts/adb-wifi-pair.sh CODIGO"
    exit 1
  fi
  echo ">> device: $DEV"
  adb reverse tcp:8081 tcp:8081
  echo ">> adb reverse tcp:8081 ok (o celular enxerga o Metro em localhost)"
  ABRIR_NO_DEVICE=1
fi

echo ""
echo "=================================================="
echo "OUROBOROS MOBILE - DEV SERVER (dev-client)"
echo "=================================================="
echo "Metro: http://localhost:8081"
echo "No celular, abra o app Ouroboros (dev-client instalado)."
echo "Se o app nao conectar sozinho: escaneie o QR abaixo."
echo "=================================================="
echo ""

if [[ "$ABRIR_NO_DEVICE" -eq 1 ]]; then
  # O deep link so funciona depois do Metro responder; dispara em paralelo.
  (
    for _ in $(seq 1 30); do
      sleep 2
      if curl -s -o /dev/null --max-time 2 "http://localhost:8081/status"; then
        adb shell am start -a android.intent.action.VIEW \
          -d "ouroboros://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" \
          >/dev/null 2>&1 || true
        break
      fi
    done
  ) &
fi

echo ">> iniciando Metro Bundler (dev-client)..."
exec npx expo start --dev-client "${EXTRA_ARGS[@]}"
