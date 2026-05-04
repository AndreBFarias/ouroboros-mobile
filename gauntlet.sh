#!/usr/bin/env bash
# gauntlet.sh v2 -- atalho para subir o Gauntlet (validacao visual web).
#
# Uso:
#   ./gauntlet.sh             # padrao: sobe Metro web e mostra log
#   ./gauntlet.sh --clear     # limpa cache do Metro antes de subir
#   ./gauntlet.sh --quiet     # background sem foreground tail
#
# O que faz:
#   1. Verifica porta 8081 -- so mata se for processo node/expo/metro;
#      em caso de processo desconhecido, falha com mensagem acionavel.
#   2. Rotaciona /tmp/gauntlet-expo.log -> .prev para manter historico.
#   3. Sobe `./run.sh --web` em background com setsid (process group
#      proprio) para que Ctrl-C derrube todos os filhos.
#   4. Aguarda http://localhost:8081 responder.
#   5. Abre o navegador padrao em http://localhost:8081/_dev/gauntlet.
#   6. Mostra log em foreground (ou background se --quiet).
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
QUIET=0
for arg in "$@"; do
  case "$arg" in
    --clear) CLEAR=1 ;;
    --quiet) QUIET=1 ;;
    *) echo "AVISO: flag desconhecida: $arg (ignorada)";;
  esac
done

echo "=================================================="
echo "GAUNTLET v2 - validacao visual em Chrome"
echo "=================================================="

# 1. Limpa Metro orfao (so processos node/expo/metro)
PIDS=$(lsof -ti:8081 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  for PID in $PIDS; do
    CMD=$(ps -p "$PID" -o comm= 2>/dev/null | tr -d ' ' || echo "?")
    case "$CMD" in
      node|expo|metro|esbuild|npm|npx)
        echo ">> matando processo conhecido na porta 8081 ($CMD PID $PID)"
        kill -9 "$PID" 2>/dev/null || true
        ;;
      *)
        echo "ERRO: porta 8081 ocupada por '$CMD' (PID $PID)."
        echo "   Para matar manualmente: kill -9 $PID"
        echo "   Ou rode: lsof -ti:8081 | xargs -r kill -9"
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
  echo ">> limpando cache local"
  rm -rf .expo node_modules/.cache 2>/dev/null || true
fi

# 4. Sobe Metro + Web em background, em process group proprio
echo ">> subindo Metro web em background (log: $LOG_FILE)"
setsid nohup ./run.sh --web > "$LOG_FILE" 2>&1 &
METRO_PID=$!
echo ">> PID Metro: $METRO_PID (process group: -$METRO_PID)"

# Trap derruba grupo inteiro (Metro + Bundler + Watcher).
# kill -- -PGID envia signal para todos os filhos do grupo.
trap 'echo ""; echo ">> derrubando grupo do Metro (-$METRO_PID)"; kill -- -$METRO_PID 2>/dev/null || true; kill $METRO_PID 2>/dev/null || true; exit 0' INT TERM

# 5. Aguarda servidor responder
echo ">> aguardando $URL_METRO responder"
for i in {1..60}; do
  if curl -sf "$URL_METRO" > /dev/null 2>&1; then
    echo ">> servidor pronto apos ${i}s"
    break
  fi
  sleep 1
  if [[ $i -eq 60 ]]; then
    echo "ERRO: Metro nao subiu em 60s."
    echo "   Diagnostico: tail -100 $LOG_FILE | grep -i error"
    echo "   Cache problema: ./gauntlet.sh --clear"
    exit 1
  fi
done

# 6. Abre navegador
echo ">> abrindo $URL_GAUNTLET"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL_GAUNTLET" > /dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL_GAUNTLET"
else
  echo "(navegador nao detectado, abra manualmente: $URL_GAUNTLET)"
fi

echo ""
echo "=================================================="
echo "Gauntlet rodando."
echo "URL:    $URL_GAUNTLET"
echo "Log:    tail -f $LOG_FILE"
echo "Stop:   Ctrl-C aqui ou kill -- -$METRO_PID"
echo "=================================================="
echo ""

if [[ $QUIET -eq 1 ]]; then
  echo "Modo --quiet: deixando rodar em background. PID=$METRO_PID"
  exit 0
fi

# 7. Mostra log em foreground
exec tail -f "$LOG_FILE"
