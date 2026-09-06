#!/usr/bin/env bash
# e2e-web.sh (R-CI-E2E-WEB-a) -- orquestrador local do runner e2e de
# browser. Sobe o Metro web com o Gauntlet ativo, aguarda a porta 8081
# responder, roda a suite tests/e2e/harness e derruba o Metro no fim
# (trap garante teardown mesmo em falha/Ctrl-C).
#
# Uso:
#   scripts/e2e-web.sh                    # roda a suite inteira
#   scripts/e2e-web.sh --grep sentinel    # repassa flags ao playwright
#
# Exit code: propagado do playwright (0 = verde; nao-zero = FAIL fora das
# excecoes derrubou o run).
#
# Descobertas endereçadas (spec):
#   - NODE_OPTIONS=--max-old-space-size=4096: o bundling do Metro estoura
#     o heap default do node. run.sh ja exporta isso; reforçamos aqui como
#     cinto de seguranca caso o ambiente sobrescreva.
#   - EXPO_PUBLIC_GAUNTLET=1: pede o Gauntlet ativo (alem de dev web).
#   - health-check com poll (ate 90s): o primeiro bundle web fresh e' lento.
#   - limpeza previa de test-results/ e playwright-report/
#     (AUDIT-DX-E2E-WEB-WATCHER): o Playwright apaga o outputDir ao iniciar
#     o run. Com o diretório ja no disco de uma execução anterior, o
#     watcher do Metro registrava um fs.watch sobre ele no crawl inicial e
#     morria com ENOENT quando o Playwright o apagava -- so na SEGUNDA
#     execução seguida, e o sintoma aparecia como ERR_CONNECTION_REFUSED
#     dentro do caso e2e, não no bundler. O metro.config.js ja subtrai
#     esses caminhos da observacao via resolver.blockList; esta limpeza e'
#     o cinto de seguranca, independente da versao do Metro.
#
# Comentarios sem acento (convencao shell/CI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT=8081
URL="http://localhost:${PORT}"
LOG_FILE="/tmp/e2e-web-metro-${PORT}.log"
HEALTH_TIMEOUT=90
CONFIG="tests/e2e/harness/playwright.config.ts"

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
export EXPO_PUBLIC_GAUNTLET=1

METRO_PID=""

# Teardown: mata o process group do Metro (setsid cria um grupo proprio).
teardown() {
  if [[ -n "$METRO_PID" ]]; then
    echo ">> teardown: derrubando Metro (PID $METRO_PID)"
    kill -- "-$METRO_PID" 2>/dev/null || true
    kill "$METRO_PID" 2>/dev/null || true
  fi
  # Garante que a porta fica livre (sem processo orfao node/expo/metro).
  local pids
  pids=$(lsof -ti:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    for pid in $pids; do
      local cmd
      cmd=$(ps -p "$pid" -o comm= 2>/dev/null | tr -d ' ' || echo '?')
      case "$cmd" in
        node|expo|metro|esbuild|npm|npx) kill -9 "$pid" 2>/dev/null || true ;;
      esac
    done
  fi
}
trap teardown EXIT INT TERM

# 1. Limpa orfao node/expo/metro na porta antes de subir (run.sh recusa
#    subir se algo ja responde em 8081).
#
#    -sTCP:LISTEN e obrigatorio: sem ele o lsof devolve tambem os
#    CLIENTES com socket na porta. Medido em 2026-09-05 -- o Chrome
#    deixa conexoes em CLOSE_WAIT depois de uma sessão de automacao, o
#    script as lia como "porta ocupada por 'chrome'" e abortava com
#    ERRO, sem que nada estivesse escutando em 8081.
PIDS=$(lsof -ti:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  for PID in $PIDS; do
    CMD=$(ps -p "$PID" -o comm= 2>/dev/null | tr -d ' ' || echo '?')
    case "$CMD" in
      node|expo|metro|esbuild|npm|npx)
        echo ">> matando processo orfao na porta $PORT (PID $PID, $CMD)"
        kill -9 "$PID" 2>/dev/null || true
        ;;
      *)
        echo "ERRO: porta $PORT ocupada por '$CMD' (PID $PID); libere antes." >&2
        exit 1
        ;;
    esac
  done
  sleep 1
fi

# 2. Apaga os artefatos do run anterior ANTES de subir o Metro (ver
#    a seção de descobertas no cabecalho). Os dois diretórios sao
#    recriados pelo próprio Playwright durante o run, e ambos estao no
#    .gitignore.
rm -rf test-results playwright-report

# 3. Sobe o Metro web detached, com process group próprio (setsid) para o
#    teardown poder matar todo o grupo.
[[ -f "$LOG_FILE" ]] && mv "$LOG_FILE" "${LOG_FILE}.prev" 2>/dev/null || true
echo ">> subindo Metro web (EXPO_PUBLIC_GAUNTLET=1) -> $LOG_FILE"
setsid nohup ./run.sh --web --port "$PORT" > "$LOG_FILE" 2>&1 &
METRO_PID=$!

# 4. Health-check: poll ate HEALTH_TIMEOUT segundos. Aborta cedo se o
#    Metro morrer.
PRONTO=0
for ((i = 1; i <= HEALTH_TIMEOUT; i++)); do
  if ! kill -0 "$METRO_PID" 2>/dev/null; then
    echo "ERRO: Metro morreu (PID $METRO_PID) apos ${i}s sem bindar" >&2
    echo "--- ultimas 20 linhas de $LOG_FILE ---" >&2
    tail -n 20 "$LOG_FILE" 2>/dev/null >&2 || true
    exit 1
  fi
  if curl -sf "$URL" > /dev/null 2>&1; then
    PRONTO=1
    break
  fi
  sleep 1
done

if [[ $PRONTO -ne 1 ]]; then
  echo "ERRO: Metro nao bindou em ${HEALTH_TIMEOUT}s" >&2
  echo "--- ultimas 20 linhas de $LOG_FILE ---" >&2
  tail -n 20 "$LOG_FILE" 2>/dev/null >&2 || true
  exit 1
fi

echo "OK: Metro web pronto em $URL/_dev/gauntlet"

# 5. Roda a suite. --config aponta para o harness; flags extras passam.
echo ">> rodando runner e2e (playwright)"
set +e
npx playwright test --config "$CONFIG" "$@"
STATUS=$?
set -e

echo ">> runner e2e terminou com exit $STATUS"
# teardown roda no trap EXIT; propaga o status do playwright.
exit "$STATUS"
