#!/usr/bin/env bash
# adb-vault-pull.sh — pull do vault local (private storage) pra debug.
#
# Pasta-alvo no celular: files/Ouroboros/ (canonical:
# /data/user/0/com.ouroboros.mobile/files/Ouroboros/).
# Acesso via 'run-as com.ouroboros.mobile' (sandbox debuggable do APK).
#
# Saida padrao: /tmp/ouroboros-vault-<ts>/
#
# Uso:
#   ./scripts/adb-vault-pull.sh
#   ./scripts/adb-vault-pull.sh -s <device>
#   ./scripts/adb-vault-pull.sh -o /tmp/meu-dump
#   ./scripts/adb-vault-pull.sh --sub markdown/ciclo
set -euo pipefail

DEVICE_ARGS=()
OUT=""
SUB=""
PACKAGE="com.ouroboros.mobile"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s)
      DEVICE_ARGS=(-s "${2:?ID de device requerido}")
      shift 2
      ;;
    -o|--out)
      OUT="${2:?path de saida requerido}"
      shift 2
      ;;
    --sub)
      SUB="${2:?subdir requerido}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
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

if [[ -z "$OUT" ]]; then
  TS=$(date +%Y%m%d-%H%M%S)
  OUT="/tmp/ouroboros-vault-${TS}"
fi

mkdir -p "$OUT"

# Caminho remoto sob a sandbox do app (relativo a /data/data/<pkg>).
REMOTE_BASE="files/Ouroboros"
REMOTE_PATH="$REMOTE_BASE"
if [[ -n "$SUB" ]]; then
  REMOTE_PATH="$REMOTE_BASE/$SUB"
fi

echo "[1/3] verificando acesso run-as $PACKAGE"
if ! adb "${DEVICE_ARGS[@]}" shell run-as "$PACKAGE" ls "$REMOTE_PATH" >/dev/null 2>&1; then
  echo "ERRO: nao consegui run-as $PACKAGE em $REMOTE_PATH" >&2
  echo "  - app esta instalado em build debuggable?" >&2
  echo "  - pasta existe? Tente: adb shell run-as $PACKAGE ls files/" >&2
  exit 4
fi

# Empacota tar pra preservar atributos e nomes com acento.
STAGING="/data/local/tmp/ouroboros-vault.tar"

echo "[2/3] empacotando tar em $STAGING"
adb "${DEVICE_ARGS[@]}" shell "run-as $PACKAGE tar -cf - $REMOTE_PATH" \
  > "$OUT/ouroboros-vault.tar"

echo "[3/3] extraindo em $OUT/"
( cd "$OUT" && tar -xf ouroboros-vault.tar )
rm -f "$OUT/ouroboros-vault.tar"

# Conta arquivos.
N=$(find "$OUT" -type f | wc -l)
echo "OK: $N arquivos extraidos em $OUT"
