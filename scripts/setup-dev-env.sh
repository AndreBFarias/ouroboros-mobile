#!/usr/bin/env bash
# setup-dev-env.sh — instala ferramentas do desktop para dar visao
# em tempo real ao Claude Code durante desenvolvimento.
#
# O que faz (interativo, pede confirmacao por etapa):
#   1. ADB (android-tools-adb) - controle do device por linha de comando
#   2. scrcpy - espelha tela do celular no monitor (latencia <50ms)
#   3. Android command-line tools - emulador headless sem Android Studio
#   4. (opcional) AVD com system image pre-baixada
#   5. Configura ADB wireless apos pareamento USB inicial
#
# Tudo em pacotes apt do Pop!_OS / Ubuntu 22.04. Nada de snap (mais lento).
#
# Uso:
#   ./scripts/setup-dev-env.sh           # interativo
#   ./scripts/setup-dev-env.sh --all     # instala tudo sem perguntar
#   ./scripts/setup-dev-env.sh --adb     # so ADB + scrcpy (minimo)
#   ./scripts/setup-dev-env.sh --emulator  # adiciona emulador Android
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="interactive"
for arg in "$@"; do
  case "$arg" in
    --all) MODE="all" ;;
    --adb) MODE="adb" ;;
    --emulator) MODE="emulator" ;;
    *) ;;
  esac
done

echo "=================================================="
echo "OUROBOROS MOBILE - SETUP DEV ENV"
echo "=================================================="
echo ""
echo "Este script instala ferramentas que dao ao Claude Code"
echo "visao em tempo real do app rodando: ADB, scrcpy e (opcional)"
echo "emulador Android headless."
echo ""

confirma() {
  if [[ "$MODE" == "all" || "$MODE" == "$1" ]]; then return 0; fi
  if [[ "$MODE" != "interactive" ]]; then return 1; fi
  read -r -p "$2 [s/N] " resposta
  case "$resposta" in
    s|S|sim|SIM|y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

# -------- 1. ADB --------
echo ">> verificando ADB"
if command -v adb >/dev/null 2>&1; then
  echo "OK: $(adb --version | head -1)"
else
  if confirma "adb" "Instalar ADB (android-tools-adb)?"; then
    echo "instalando android-tools-adb..."
    sudo apt update
    sudo apt install -y android-tools-adb
    echo "OK: ADB instalado"
  else
    echo "PULADO: ADB nao instalado"
  fi
fi
echo ""

# -------- 2. scrcpy --------
echo ">> verificando scrcpy"
if command -v scrcpy >/dev/null 2>&1; then
  echo "OK: $(scrcpy --version | head -1)"
else
  if confirma "adb" "Instalar scrcpy (espelhamento do celular)?"; then
    echo "instalando scrcpy..."
    sudo apt install -y scrcpy
    echo "OK: scrcpy instalado. Use 'scrcpy' para abrir uma janela"
    echo "    espelhando o celular conectado via USB."
  else
    echo "PULADO: scrcpy nao instalado"
  fi
fi
echo ""

# -------- 3. Pareamento ADB --------
echo ">> verificando dispositivos ADB"
if command -v adb >/dev/null 2>&1; then
  DEVICES=$(adb devices | grep -v "List of devices" | grep -v "^$" | wc -l)
  if [[ "$DEVICES" -eq 0 ]]; then
    echo "Nenhum dispositivo ADB conectado."
    echo ""
    echo "Para parear o celular:"
    echo "  1. No celular: Settings -> About -> tocar 'Numero da versao' 7x"
    echo "  2. Volte para Settings -> Opcoes de desenvolvedor"
    echo "  3. Ative 'Depuracao USB'"
    echo "  4. Conecte o cabo USB ao PC"
    echo "  5. Autorize o RSA fingerprint que aparece no celular"
    echo "  6. Rode: adb devices  (deve listar o Redmi)"
    echo ""
    echo "Para ADB wireless (depois do pareamento USB inicial):"
    echo "  adb tcpip 5555"
    echo "  adb connect 192.168.x.y:5555  (pegar IP do celular nas configs WiFi)"
    echo ""
  else
    echo "OK: $DEVICES dispositivo(s) conectado(s):"
    adb devices
  fi
fi
echo ""

# -------- 4. Emulador Android (opcional) --------
echo ">> Emulador Android (cmdline-tools)"
if [[ -d "$HOME/Android/Sdk/cmdline-tools" ]]; then
  echo "OK: cmdline-tools ja instaladas em ~/Android/Sdk"
else
  if confirma "emulator" "Instalar emulador Android headless? (~3GB)"; then
    SDK_DIR="$HOME/Android/Sdk"
    mkdir -p "$SDK_DIR/cmdline-tools"
    cd /tmp
    if [[ ! -f cmdline-tools.zip ]]; then
      echo "baixando cmdline-tools..."
      curl -L -o cmdline-tools.zip \
        "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    fi
    unzip -q -o cmdline-tools.zip -d "$SDK_DIR/cmdline-tools/"
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest" 2>/dev/null || true
    rm -f cmdline-tools.zip

    export ANDROID_HOME="$SDK_DIR"
    export PATH="$PATH:$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$SDK_DIR/emulator"

    echo "aceitando licencas..."
    yes | sdkmanager --licenses >/dev/null 2>&1 || true

    echo "instalando platform-tools, system-images, emulator..."
    sdkmanager "platform-tools" "platforms;android-34" \
               "system-images;android-34;google_apis;x86_64" "emulator"

    echo "criando AVD ouroboros-test..."
    echo "no" | avdmanager create avd -n ouroboros-test \
      -k "system-images;android-34;google_apis;x86_64" \
      -d "pixel_6" 2>/dev/null || echo "AVD ja existe"

    echo ""
    echo "OK: emulador instalado. Adicione ao seu ~/.zshrc:"
    echo ""
    echo '  export ANDROID_HOME="$HOME/Android/Sdk"'
    echo '  export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"'
    echo '  export PATH="$PATH:$ANDROID_HOME/platform-tools"'
    echo '  export PATH="$PATH:$ANDROID_HOME/emulator"'
    echo ""
    echo "Para iniciar: emulator -avd ouroboros-test"
    echo "Para headless: emulator -avd ouroboros-test -no-window"
    cd "$ROOT"
  else
    echo "PULADO: emulador nao instalado"
  fi
fi
echo ""

# -------- 5. ADB wireless (helper) --------
echo ">> helper de ADB wireless"
WIRELESS_HELPER="$ROOT/scripts/adb-wireless.sh"
if [[ ! -f "$WIRELESS_HELPER" ]]; then
  cat > "$WIRELESS_HELPER" <<'EOF'
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
EOF
  chmod +x "$WIRELESS_HELPER"
  echo "OK: criado scripts/adb-wireless.sh"
else
  echo "OK: scripts/adb-wireless.sh ja existe"
fi
echo ""

echo "=================================================="
echo "SETUP CONCLUIDO"
echo "=================================================="
echo ""
echo "Comandos uteis:"
echo "  adb devices                              # lista celulares pareados"
echo "  scrcpy                                   # espelha celular no monitor"
echo "  ./scripts/adb-wireless.sh                # ativa ADB sem cabo"
echo "  emulator -avd ouroboros-test -no-window  # inicia emulador headless"
echo "  ./run.sh                                 # inicia Metro Bundler"
echo "  ./run.sh --web                           # versao web no Chrome"
echo ""
