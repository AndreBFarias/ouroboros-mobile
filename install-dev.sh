#!/usr/bin/env bash
# install-dev.sh — instala e configura ferramentas de visao em tempo
# real para o Claude Code durante desenvolvimento. Executa tudo numa
# unica passagem (uma senha de sudo no inicio, sem prompts adicionais).
#
# O que faz por padrao:
#   1. Cacheia senha sudo e mantem viva em background ate o fim
#   2. Garante ADB e scrcpy via apt
#   3. Baixa Android cmdline-tools, system image e emulator
#   4. Adiciona variaveis de ambiente ao ~/.zshrc se faltarem
#   5. Cria AVD ouroboros-test com config otimizada por hardware
#   6. Faz cold boot inicial e salva snapshot para boots seguintes <10s
#   7. Cria scripts auxiliares (adb-wireless.sh, start-emulator.sh,
#      mirror-device.sh)
#
# Uso:
#   ./install-dev.sh              # tudo em uma passada (default)
#   ./install-dev.sh --skip-emulator  # so ADB + scrcpy
#   ./install-dev.sh --interactive    # pergunta a cada etapa
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MODE="all"
for arg in "$@"; do
  case "$arg" in
    --interactive) MODE="interactive" ;;
    --skip-emulator|--adb) MODE="adb" ;;
    --all) MODE="all" ;;
    *) ;;
  esac
done

# --- Cache de senha sudo ---
echo "=================================================="
echo "OUROBOROS MOBILE - INSTALL DEV"
echo "=================================================="
echo ""
echo "Vai instalar ADB, scrcpy, Android cmdline-tools e emulador"
echo "otimizado. Tudo numa passada so. Pede sudo uma vez no inicio."
echo ""
sudo -v
# Mantem o sudo cacheado por toda a duracao do script.
( while true; do sudo -n true; sleep 50; kill -0 "$$" || exit; done ) 2>/dev/null &
SUDO_KEEPER=$!
trap 'kill $SUDO_KEEPER 2>/dev/null || true' EXIT

confirma() {
  if [[ "$MODE" == "all" ]]; then return 0; fi
  if [[ "$MODE" == "adb" && "$1" == "adb" ]]; then return 0; fi
  if [[ "$MODE" != "interactive" ]]; then return 1; fi
  read -r -p "$2 [s/N] " resposta
  case "$resposta" in
    s|S|sim|SIM|y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

# --- Helper: detectar hardware ---
NUM_CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 4)
TOTAL_RAM_KB=$(awk '/^MemTotal:/{print $2}' /proc/meminfo 2>/dev/null || echo 8000000)
TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
# Aloca ate 4 cores e 4GB de RAM ao emulador (ou metade do que tiver).
EMU_CORES=$(( NUM_CORES > 8 ? 4 : NUM_CORES > 4 ? 3 : 2 ))
EMU_RAM=$(( TOTAL_RAM_MB > 12000 ? 4096 : TOTAL_RAM_MB > 6000 ? 2048 : 1536 ))
EMU_HEAP=$(( EMU_RAM / 4 ))
echo "Hardware detectado: ${NUM_CORES} cores logicos, ${TOTAL_RAM_MB} MB RAM."
echo "AVD usara: ${EMU_CORES} cores, ${EMU_RAM} MB RAM, ${EMU_HEAP} MB heap."
echo ""

# -------- 1. ADB + scrcpy via apt --------
APT_NEEDED=()
command -v adb >/dev/null 2>&1 || APT_NEEDED+=("android-tools-adb")
command -v scrcpy >/dev/null 2>&1 || APT_NEEDED+=("scrcpy")
# unzip e curl sao usados depois para o cmdline-tools
command -v unzip >/dev/null 2>&1 || APT_NEEDED+=("unzip")
command -v curl >/dev/null 2>&1 || APT_NEEDED+=("curl")

if (( ${#APT_NEEDED[@]} > 0 )); then
  echo ">> instalando via apt: ${APT_NEEDED[*]}"
  sudo apt update -qq
  sudo apt install -y "${APT_NEEDED[@]}"
else
  echo ">> apt: ADB, scrcpy, unzip, curl ja presentes"
fi
echo ""

# -------- 2. cmdline-tools, system image, emulador --------
SDK_DIR="$HOME/Android/Sdk"
EMU_BIN="$SDK_DIR/emulator/emulator"

if confirma "emulator" "Instalar Android cmdline-tools + system image + emulator?"; then
  if [[ ! -x "$EMU_BIN" ]]; then
    echo ">> baixando Android cmdline-tools"
    mkdir -p "$SDK_DIR/cmdline-tools"
    cd /tmp
    if [[ ! -f cmdline-tools.zip ]]; then
      curl -L --progress-bar -o cmdline-tools.zip \
        "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    fi
    unzip -q -o cmdline-tools.zip -d "$SDK_DIR/cmdline-tools/"
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest" 2>/dev/null || true
    rm -f cmdline-tools.zip
    cd "$ROOT"
  fi

  export ANDROID_HOME="$SDK_DIR"
  export PATH="$PATH:$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$SDK_DIR/emulator"

  echo ">> aceitando licencas SDK"
  yes | sdkmanager --licenses >/dev/null 2>&1 || true

  echo ">> instalando platform-tools, system-image (android-34 google_apis x86_64), emulator"
  sdkmanager "platform-tools" "platforms;android-34" \
             "system-images;android-34;google_apis;x86_64" "emulator" 2>&1 | \
             grep -vE "^\[=*\s|^Loading" || true
fi

# -------- 3. AVD com config otimizada --------
if confirma "emulator" "Criar AVD ouroboros-test otimizado?"; then
  AVD_DIR="$HOME/.android/avd/ouroboros-test.avd"

  if [[ -d "$AVD_DIR" ]]; then
    echo ">> AVD ouroboros-test ja existe, removendo para recriar otimizado"
    "$SDK_DIR/cmdline-tools/latest/bin/avdmanager" delete avd -n ouroboros-test 2>/dev/null || true
    rm -rf "$AVD_DIR" "$HOME/.android/avd/ouroboros-test.ini"
  fi

  echo ">> criando AVD ouroboros-test (Pixel 6, Android 34, x86_64, otimizado)"
  echo "no" | "$SDK_DIR/cmdline-tools/latest/bin/avdmanager" create avd \
    -n ouroboros-test \
    -k "system-images;android-34;google_apis;x86_64" \
    -d "pixel_6" >/dev/null

  # Tunings de performance no config.ini do AVD
  CONFIG="$AVD_DIR/config.ini"
  if [[ -f "$CONFIG" ]]; then
    sed -i \
      -e "s|^hw.cpu.ncore=.*|hw.cpu.ncore=${EMU_CORES}|" \
      -e "s|^hw.ramSize=.*|hw.ramSize=${EMU_RAM}|" \
      -e "s|^vm.heapSize=.*|vm.heapSize=${EMU_HEAP}|" \
      -e "s|^hw.gpu.enabled=.*|hw.gpu.enabled=yes|" \
      -e "s|^hw.gpu.mode=.*|hw.gpu.mode=host|" \
      -e "s|^hw.keyboard=.*|hw.keyboard=yes|" \
      "$CONFIG"
    grep -q "^hw.gpu.mode=" "$CONFIG" || echo "hw.gpu.mode=host" >> "$CONFIG"
    grep -q "^hw.cpu.ncore=" "$CONFIG" || echo "hw.cpu.ncore=${EMU_CORES}" >> "$CONFIG"
    grep -q "^hw.ramSize=" "$CONFIG" || echo "hw.ramSize=${EMU_RAM}" >> "$CONFIG"
    grep -q "^vm.heapSize=" "$CONFIG" || echo "vm.heapSize=${EMU_HEAP}" >> "$CONFIG"
    grep -q "^hw.keyboard=" "$CONFIG" || echo "hw.keyboard=yes" >> "$CONFIG"
    echo "OK: AVD configurado com KVM, GPU host, ${EMU_CORES}c/${EMU_RAM}MB"
  fi
fi

# -------- 4. Variaveis de ambiente no ~/.zshrc --------
ZSHRC="$HOME/.zshrc"
if [[ -f "$ZSHRC" ]] && ! grep -q "ANDROID_HOME" "$ZSHRC"; then
  echo ">> adicionando ANDROID_HOME e PATH ao ~/.zshrc"
  cat >> "$ZSHRC" <<'EOZSH'

# Ouroboros Mobile - Android SDK (instalado por install-dev.sh)
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
EOZSH
  echo "OK: ~/.zshrc atualizado. Faca 'source ~/.zshrc' ou abra novo terminal."
else
  echo ">> ~/.zshrc ja tem ANDROID_HOME, nao altero"
fi
echo ""

# -------- 5. Helpers em scripts/ --------
mkdir -p scripts

# 5.1 adb-wireless.sh
cat > scripts/adb-wireless.sh <<'EOF'
#!/usr/bin/env bash
# adb-wireless.sh — habilita ADB sem cabo apos pareamento USB inicial.
# Uso: ./scripts/adb-wireless.sh                 # com celular USB conectado
#      ./scripts/adb-wireless.sh 192.168.x.y     # se ja sabe o IP
set -euo pipefail
IP="${1:-}"
if [[ -z "$IP" ]]; then
  IP=$(adb shell ip -4 addr show wlan0 2>/dev/null | awk '/inet/{print $2}' | cut -d/ -f1 | head -1)
  if [[ -z "$IP" ]]; then
    echo "ERRO: sem IP. Conecte cabo USB ou passe IP do celular."
    exit 1
  fi
fi
adb tcpip 5555
sleep 1
adb connect "$IP:5555"
echo "OK: ADB wireless em $IP:5555. Pode desconectar o cabo."
EOF

# 5.2 start-emulator.sh
cat > scripts/start-emulator.sh <<'EOF'
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
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
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

echo ">> iniciando ouroboros-test (cores host, GPU host, KVM)"
"$EMU" -avd ouroboros-test \
  -gpu host \
  -accel auto \
  -no-boot-anim \
  -no-audio \
  $COLD \
  $HEADLESS \
  > /tmp/emulator-ouroboros.log 2>&1 &

EMU_PID=$!
echo "PID: $EMU_PID. Log: /tmp/emulator-ouroboros.log"
echo "Aguardando boot completo (boot.completed=1)..."
"$ADB" wait-for-device
for i in $(seq 1 60); do
  BOOT=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [[ "$BOOT" == "1" ]]; then
    echo "OK: emulador pronto em ${i}s. Veja em 'adb devices'."
    exit 0
  fi
  sleep 1
done
echo "AVISO: timeout aguardando boot. Veja /tmp/emulator-ouroboros.log"
EOF

# 5.3 mirror-device.sh
cat > scripts/mirror-device.sh <<'EOF'
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
EOF

chmod +x scripts/adb-wireless.sh scripts/start-emulator.sh scripts/mirror-device.sh
echo "OK: helpers criados em scripts/"
echo ""

# -------- 6. Cold boot inicial + snapshot --------
if confirma "emulator" "Fazer cold boot do emulador e salvar snapshot? (~2 min)"; then
  echo ">> primeiro boot (vai criar snapshot, demora 1-2 min)"
  if pgrep -f "qemu-system" >/dev/null 2>&1; then
    echo "AVISO: ja existe qemu rodando. Pulando cold boot inicial."
  else
    "$EMU_BIN" -avd ouroboros-test \
      -gpu host -accel auto -no-boot-anim -no-audio -no-window \
      -no-snapshot-load \
      > /tmp/emulator-firstboot.log 2>&1 &
    FIRST_PID=$!
    "$SDK_DIR/platform-tools/adb" wait-for-device
    for i in $(seq 1 90); do
      BOOT=$("$SDK_DIR/platform-tools/adb" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      [[ "$BOOT" == "1" ]] && break
      sleep 1
    done
    if [[ "$BOOT" == "1" ]]; then
      echo "OK: cold boot finalizado em ~${i}s. Salvando snapshot..."
      "$SDK_DIR/platform-tools/adb" -s emulator-5554 emu avd snapshot save default_boot 2>/dev/null || true
      sleep 1
      "$SDK_DIR/platform-tools/adb" -s emulator-5554 emu kill 2>/dev/null || true
      echo "OK: snapshot 'default_boot' salvo. Boots futuros vao usar."
    else
      echo "AVISO: cold boot demorou mais que 90s. Veja /tmp/emulator-firstboot.log"
      kill $FIRST_PID 2>/dev/null || true
    fi
  fi
fi
echo ""

# -------- 7. Diagnostico final --------
echo "=================================================="
echo "DIAGNOSTICO"
echo "=================================================="
echo ""
echo "ADB:        $(command -v adb >/dev/null && adb --version | head -1 || echo 'AUSENTE')"
echo "scrcpy:     $(command -v scrcpy >/dev/null && scrcpy --version 2>/dev/null | head -1 || echo 'AUSENTE')"
echo "Emulator:   $([[ -x "$EMU_BIN" ]] && "$EMU_BIN" -version 2>&1 | head -1 || echo 'AUSENTE')"
echo "AVD:        $(ls "$HOME/.android/avd/ouroboros-test.avd" 2>/dev/null && echo 'CRIADO' || echo 'AUSENTE')"
echo "KVM:        $([[ -e /dev/kvm ]] && echo 'OK' || echo 'AUSENTE')"
echo "Devices:    "
adb devices 2>/dev/null | tail -n +2 | sed 's/^/  /'
echo ""
echo "Comandos uteis (apos 'source ~/.zshrc' ou novo terminal):"
echo "  ./scripts/start-emulator.sh         # inicia emulador (janela)"
echo "  ./scripts/start-emulator.sh --headless"
echo "  ./scripts/mirror-device.sh          # espelha celular fisico"
echo "  ./scripts/adb-wireless.sh           # ADB sem cabo"
echo "  ./run.sh                            # Metro + QR (LAN)"
echo "  ./run.sh --web                      # versao web no Chrome"
echo "  ./run.sh --emulator                 # Metro + emulador conectado"
echo ""
