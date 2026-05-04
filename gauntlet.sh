#!/usr/bin/env bash
# gauntlet.sh -- atalho para subir o Gauntlet (validacao visual web).
#
# O que faz:
#   1. Mata Metro orfao na porta 8081 (se houver).
#   2. Sobe `./run.sh --web` em background (Metro + Chrome bundle web).
#   3. Aguarda http://localhost:8081 responder.
#   4. Abre o navegador padrao em http://localhost:8081/_dev/gauntlet.
#   5. Mostra a janela do log em foreground (Ctrl-C derruba o servidor).
#
# Pre-requisito: GAUNTLET_ATIVO depende de Platform.OS === 'web' && __DEV__
# (vide src/lib/dev/gauntlet.ts). Modo dev ja vem ligado em expo start;
# nao precisa flag extra.
#
# Em sessao fresca, useFonts SDK 54 web demora 30-60s para resolver na
# primeira navegacao. Aceitavel em dev. Aguarde antes de interagir.
#
# Comentarios sem acento.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LOG_FILE="/tmp/gauntlet-expo.log"
URL_GAUNTLET="http://localhost:8081/_dev/gauntlet"
URL_METRO="http://localhost:8081"

echo "=================================================="
echo "GAUNTLET - validacao visual em Chrome"
echo "=================================================="

# 1. Limpa Metro orfao
PIDS=$(lsof -ti:8081 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  echo ">> matando processo na porta 8081 (PID $PIDS)"
  kill -9 $PIDS 2>/dev/null || true
  sleep 1
fi

# 2. Sobe Metro + Web em background
echo ">> subindo Metro web em background (log: $LOG_FILE)"
nohup ./run.sh --web > "$LOG_FILE" 2>&1 &
METRO_PID=$!
echo ">> PID Metro: $METRO_PID"

trap 'echo ""; echo ">> derrubando Metro (PID $METRO_PID)"; kill $METRO_PID 2>/dev/null || true; exit 0' INT TERM

# 3. Aguarda servidor responder
echo ">> aguardando $URL_METRO responder"
for i in {1..60}; do
  if curl -sf "$URL_METRO" > /dev/null 2>&1; then
    echo ">> servidor pronto apos ${i}s"
    break
  fi
  sleep 1
  if [[ $i -eq 60 ]]; then
    echo "ERRO: Metro nao subiu em 60s. Veja $LOG_FILE"
    exit 1
  fi
done

# 4. Abre navegador
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
echo "Stop:   Ctrl-C aqui ou kill $METRO_PID"
echo "=================================================="
echo ""

# 5. Mostra log em foreground
exec tail -f "$LOG_FILE"
