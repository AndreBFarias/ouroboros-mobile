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
# Suporte a git worktree (R-INFRA-GAUNTLET-WORKTREE-SYMLINK): se rodado
# de .claude/worktrees/<id>/, exporta EXPO_ROUTER_APP_ROOT,
# EXPO_PROJECT_ROOT e EXPO_NO_METRO_WORKSPACE_ROOT pra forcar Metro
# a coletar rotas do worktree, nao do main (node_modules symlinkado
# resolve via realpath e contamina o `require.context` do
# expo-router/_ctx.web.js). Em main repo nao faz nada.
#
# Comentarios sem acento.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LOG_FILE="/tmp/gauntlet-expo.log"
URL_GAUNTLET="http://localhost:8081/_dev/gauntlet"
URL_METRO="http://localhost:8081"

# R-INFRA-GAUNTLET-WORKTREE-SYMLINK: detecta git worktree e aplica
# workaround Metro. Quando rodando em worktree
# (.claude/worktrees/<id>/), node_modules e env.json sao symlinks para
# o repo principal. Como expo-router/_ctx.web.js usa
# `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)` resolvido
# relativo ao path real do bundle entry (que pelo symlink resolve
# em node_modules do main), o `require.context` recolhe rotas do
# `app/` do REPO PRINCIPAL, nao do worktree -- Chrome exibe "Welcome
# to Expo" em vez das rotas reais.
#
# Workaround (Opcao C do spec): forca `EXPO_ROUTER_APP_ROOT` para o
# `app/` absoluto do worktree e desabilita resolucao de workspace
# do Metro. Em main repo vira no-op (variaveis nao exportadas).
WORKTREE_MODE=0
if [[ "$ROOT" == *"/.claude/worktrees/"* ]]; then
  WORKTREE_MODE=1
  export EXPO_ROUTER_APP_ROOT="$ROOT/app"
  export EXPO_PROJECT_ROOT="$ROOT"
  export EXPO_NO_METRO_WORKSPACE_ROOT=1
  echo "Worktree detectado em $ROOT"
  echo "  EXPO_ROUTER_APP_ROOT=$EXPO_ROUTER_APP_ROOT"
  echo "  EXPO_PROJECT_ROOT=$EXPO_PROJECT_ROOT"
  echo "  EXPO_NO_METRO_WORKSPACE_ROOT=1"
  echo "  (workaround Metro/expo-router symlink ativo)"

  # Garante que env.json seja arquivo regular no worktree, nao symlink.
  # Metro TreeFS so indexa arquivos dentro de rootDir; se env.json e'
  # symlink apontando pra fora do worktree (main repo), o resolver
  # devolve UnableToResolveError em '../../../env.json' importado por
  # src/lib/services/googleAuthFlow.ts (e mais 2 lugares). Solucao:
  # copia o env.json real do main pro worktree assim que detectar
  # symlink. Idempotente: se ja' for arquivo regular, no-op.
  if [[ -L "$ROOT/env.json" ]]; then
    MAIN_REPO=$(git -C "$ROOT" rev-parse --git-common-dir 2>/dev/null)
    if [[ -n "$MAIN_REPO" ]]; then
      MAIN_REPO=$(dirname "$MAIN_REPO")
      if [[ -f "$MAIN_REPO/env.json" ]]; then
        rm "$ROOT/env.json"
        cp "$MAIN_REPO/env.json" "$ROOT/env.json"
        echo "  env.json: symlink -> arquivo regular (copiado de $MAIN_REPO)"
      fi
    fi
  fi

  # node_modules pode permanecer como symlink: pacotes sao resolvidos
  # via nodeModulesPaths que percorre realpath. Mas se for tambem
  # arquivo regular ausente, alerta pra rodar o bootstrap.
  if [[ ! -e "$ROOT/node_modules" ]]; then
    echo "  AVISO: node_modules ausente. Rode:" >&2
    echo "    ln -sfn ../../../node_modules $ROOT/node_modules" >&2
  fi
else
  echo "Main repo detectado em $ROOT (modo normal)"
fi

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

# 3. Limpa cache se pedido (em worktree e auto-limpado pra evitar
#    transform cache contaminado por worktree anterior ou main)
if [[ $CLEAR -eq 1 || $WORKTREE_MODE -eq 1 ]]; then
  rm -rf .expo 2>/dev/null || true
  # /tmp/metro-cache e file-map sao globais por usuario; em worktree
  # eles guardam refs ao path real do worktree antigo. Sem limpar,
  # bundle gera erros tipo "Unable to resolve ../../../env.json"
  # apontando pra agent-XXX que nao existe mais.
  rm -rf /tmp/metro-cache /tmp/metro-file-map-* /tmp/haste-* 2>/dev/null || true
  # node_modules/.cache esta no symlink para o main; nao mexer ali
  # pra nao corromper o main repo
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
