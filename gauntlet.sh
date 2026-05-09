#!/usr/bin/env bash
# gauntlet.sh v3 -- atalho silencioso para subir o Gauntlet (validacao visual web).
#
# Uso:
#   ./gauntlet.sh             # padrao SILENCIOSO: sobe e abre navegador
#   ./gauntlet.sh --clear     # limpa cache do Metro antes de subir
#   ./gauntlet.sh --verbose   # mostra log em foreground (debug)
#
# O que faz:
#   1. Verifica porta 8081 -- so mata se for processo node/expo/metro;
#      em caso de processo desconhecido, falha com mensagem acionavel.
#   2. Rotaciona /tmp/gauntlet-expo.log -> .prev para manter historico.
#   3. Sobe `./run.sh --web` em background com setsid (process group
#      proprio).
#   4. Aguarda http://localhost:8081 responder.
#   5. Abre o navegador padrao em http://localhost:8081/_dev/gauntlet.
#   6. Por padrao retorna imediato (background). --verbose mostra log.
#
# Pre-requisito: GAUNTLET_ATIVO depende de Platform.OS === 'web' && __DEV__.
# Em sessao fresca, useFonts SDK 54 web demora 30-60s para resolver
# na primeira navegacao. Aguarde antes de interagir.
#
# Comentarios sem acento.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LOG_FILE="/tmp/gauntlet-expo.log"
URL_GAUNTLET="http://localhost:8081/_dev/gauntlet"
URL_METRO="http://localhost:8081"

CLEAR=0
VERBOSE=0
for arg in "$@"; do
  case "$arg" in
    --clear) CLEAR=1 ;;
    --verbose) VERBOSE=1 ;;
    --quiet) ;; # alias retro-compat — agora e default
    *) echo "AVISO: flag desconhecida: $arg (ignorada)" ;;
  esac
done

# 1. Limpa Metro orfao
PIDS=$(lsof -ti:8081 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  for PID in $PIDS; do
    CMD=$(ps -p "$PID" -o comm= 2>/dev/null | tr -d ' ' || echo "?")
    case "$CMD" in
      node|expo|metro|esbuild|npm|npx)
        kill -9 "$PID" 2>/dev/null || true
        ;;
      *)
        echo "ERRO: porta 8081 ocupada por '$CMD' (PID $PID)." >&2
        echo "   kill -9 $PID  ou  lsof -ti:8081 | xargs -r kill -9" >&2
        exit 1
        ;;
    esac
  done
  sleep 1
fi

# 2. Rotaciona log
[[ -f "$LOG_FILE" ]] && mv "$LOG_FILE" "${LOG_FILE}.prev" 2>/dev/null || true

# 3. Limpa cache se pedido
if [[ $CLEAR -eq 1 ]]; then
  rm -rf .expo node_modules/.cache 2>/dev/null || true
fi

# 4. Sobe Metro + Web em background, process group proprio
setsid nohup ./run.sh --web > "$LOG_FILE" 2>&1 &
METRO_PID=$!
disown 2>/dev/null || true

# 5. Aguarda servidor responder (silencioso por padrao)
for i in {1..60}; do
  curl -sf "$URL_METRO" > /dev/null 2>&1 && break
  sleep 1
  if [[ $i -eq 60 ]]; then
    echo "ERRO: Metro nao subiu em 60s." >&2
    echo "   tail -100 $LOG_FILE | grep -i error" >&2
    exit 1
  fi
done

# 6. Abre navegador (silencioso)
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL_GAUNTLET" > /dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL_GAUNTLET" > /dev/null 2>&1 &
fi

if [[ $VERBOSE -eq 0 ]]; then
  # Default: silencioso. Sai imediato; Metro continua rodando em background.
  exit 0
fi

# Modo verbose: mostra log e propaga Ctrl-C ao process group.
echo "=================================================="
echo "Gauntlet (modo --verbose)"
echo "URL:    $URL_GAUNTLET"
echo "Log:    $LOG_FILE"
echo "Stop:   Ctrl-C aqui ou kill -- -$METRO_PID"
echo "=================================================="

trap 'kill -- -$METRO_PID 2>/dev/null || true; kill $METRO_PID 2>/dev/null || true; exit 0' INT TERM

exec tail -f "$LOG_FILE"
