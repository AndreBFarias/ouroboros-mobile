#!/usr/bin/env bash
# gauntlet.sh v4 -- atalho silencioso para subir o Gauntlet (validacao visual web).
#
# Uso:
#   ./gauntlet.sh                  # padrao SILENCIOSO: sobe e abre navegador (porta 8081)
#   ./gauntlet.sh --clear          # limpa cache do Metro antes de subir
#   ./gauntlet.sh --verbose        # mostra log em foreground (debug)
#   ./gauntlet.sh --port 8082      # sobe na porta explicita (multi-worktree)
#   ./gauntlet.sh --auto-port      # detecta primeira porta livre em [8081-8099]
#
# O que faz:
#   1. Resolve porta efetiva (default 8081, ou --port, ou --auto-port).
#   2. Verifica porta -- so mata se for processo node/expo/metro;
#      em caso de processo desconhecido, falha com mensagem acionavel.
#   3. Aplica lock /tmp/gauntlet-port-<PORT>.lock pra evitar dupla
#      instancia na mesma porta.
#   4. Rotaciona /tmp/gauntlet-expo-<PORT>.log -> .prev para manter historico.
#   5. Sobe `./run.sh --web --port <PORT>` em background com setsid
#      (process group proprio).
#   6. Aguarda http://localhost:<PORT> responder.
#   7. Abre o navegador padrao em http://localhost:<PORT>/_dev/gauntlet.
#   8. Por padrao retorna imediato (background). --verbose mostra log.
#
# Pre-requisito: GAUNTLET_ATIVO depende de Platform.OS === 'web' && __DEV__.
# Em sessao fresca, useFonts SDK 54 web demora 30-60s para resolver
# na primeira navegacao. Aguarde antes de interagir.
#
# Suporte a git worktree (R-INFRA-GAUNTLET-WORKTREE-SYMLINK + R-DX-GAUNTLET-MULTI-PORTA):
# se rodado de .claude/worktrees/<id>/, exporta EXPO_ROUTER_APP_ROOT,
# EXPO_PROJECT_ROOT e EXPO_NO_METRO_WORKSPACE_ROOT pra forcar Metro
# a coletar rotas do worktree, nao do main (node_modules symlinkado
# resolve via realpath e contamina o `require.context` do
# expo-router/_ctx.web.js). Em main repo nao faz nada.
#
# Multi-porta (R-DX-GAUNTLET-MULTI-PORTA): permite multiplos worktrees
# rodarem Metro em paralelo (cada um em sua porta), com cache local
# por porta e lock pra evitar dupla instancia. metro.config.js tem
# shim de `expo-router/_ctx.web` pra desambiguar entre worktrees
# (cache compartilhado /tmp/metro-cache poderia contaminar).
#
# Comentarios sem acento.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

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
PORT_EXPLICIT=""
AUTO_PORT=0
i=1
while [[ $i -le $# ]]; do
  arg="${!i}"
  case "$arg" in
    --clear) CLEAR=1 ;;
    --verbose) VERBOSE=1 ;;
    --quiet) ;; # alias retro-compat -- agora e default
    --port)
      i=$((i + 1))
      PORT_EXPLICIT="${!i:-}"
      if ! [[ "$PORT_EXPLICIT" =~ ^[0-9]+$ ]]; then
        echo "ERRO: --port exige um numero (recebido: '$PORT_EXPLICIT')" >&2
        exit 1
      fi
      ;;
    --auto-port) AUTO_PORT=1 ;;
    *) echo "AVISO: flag desconhecida: $arg (ignorada)" ;;
  esac
  i=$((i + 1))
done

# Resolve porta efetiva:
#   - --port <num> tem precedencia absoluta;
#   - --auto-port escolhe primeira livre em [8081-8099] via scripts/auto-port.sh;
#   - default = 8081 (compat reversa total).
if [[ -n "$PORT_EXPLICIT" ]]; then
  PORT="$PORT_EXPLICIT"
elif [[ $AUTO_PORT -eq 1 ]]; then
  if [[ -x "$ROOT/scripts/auto-port.sh" ]]; then
    PORT=$("$ROOT/scripts/auto-port.sh" 8081 8099) || {
      echo "ERRO: auto-port nao encontrou porta livre em [8081-8099]" >&2
      exit 1
    }
  else
    echo "ERRO: --auto-port pedido mas scripts/auto-port.sh nao executavel" >&2
    exit 1
  fi
else
  PORT=8081
fi

# URLs derivadas e arquivos por porta (multi-instancia segura)
LOG_FILE="/tmp/gauntlet-expo-${PORT}.log"
LOCK_FILE="/tmp/gauntlet-port-${PORT}.lock"
URL_METRO="http://localhost:${PORT}"
URL_GAUNTLET="${URL_METRO}/_dev/gauntlet"

# Exporta porta pra que run.sh / expo cli usem
export EXPO_DEV_SERVER_PORT="$PORT"
export RCT_METRO_PORT="$PORT"

echo "Gauntlet iniciando em porta $PORT"

# Lock cooperativo: se outra instancia ja' subiu nesta porta com
# Metro vivo, recusa pra evitar dupla limpeza de cache. flock e' a
# primitiva mais portavel disponivel.
if [[ -e "$LOCK_FILE" ]]; then
  OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    # Processo ainda vivo. Tenta validar que e' metro/node/expo;
    # se sim, recusa subir. Se for orfao zumbi, segue.
    CMD=$(ps -p "$OLD_PID" -o comm= 2>/dev/null | tr -d ' ' || echo "?")
    case "$CMD" in
      node|expo|metro|esbuild|npm|npx)
        echo "ERRO: gauntlet ja' rodando em $PORT (PID $OLD_PID, cmd $CMD)" >&2
        echo "   Use --port <outro> ou --auto-port pra escolher outra porta" >&2
        echo "   Ou pare: kill $OLD_PID && rm $LOCK_FILE" >&2
        exit 1
        ;;
    esac
  fi
  # Lock orfao (processo morreu). Limpa silencioso.
  rm -f "$LOCK_FILE" 2>/dev/null || true
fi

# 1. Limpa processos orfaos na porta efetiva (so node/expo/metro)
PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
  for PID in $PIDS; do
    CMD=$(ps -p "$PID" -o comm= 2>/dev/null | tr -d ' ' || echo "?")
    case "$CMD" in
      node|expo|metro|esbuild|npm|npx)
        kill -9 "$PID" 2>/dev/null || true
        ;;
      *)
        echo "ERRO: porta $PORT ocupada por '$CMD' (PID $PID)." >&2
        echo "   kill -9 $PID  ou  lsof -ti:$PORT | xargs -r kill -9" >&2
        exit 1
        ;;
    esac
  done
  sleep 1
fi

# 2. Rotaciona log especifico desta porta
[[ -f "$LOG_FILE" ]] && mv "$LOG_FILE" "${LOG_FILE}.prev" 2>/dev/null || true

# 3. Limpa cache se pedido.
#    Em worktree o cache global /tmp/metro-cache e /tmp/metro-file-map-*
#    e' compartilhado entre worktrees -- em paralelo poderia contaminar.
#    O shim de _ctx.web (metro.config.js + _ctx.web.local.js) ja' isola
#    o require.context, mas o transform cache pode reusar bundle com
#    EXPO_ROUTER_APP_ROOT inlinado errado. Por isso em worktree
#    auto-limpamos sempre o transform cache da PRIMEIRA execucao da
#    sessao (depois o cache vai naturalmente reescrever certo).
#
#    --clear forca limpeza completa em qualquer modo.
if [[ $CLEAR -eq 1 ]]; then
  rm -rf .expo 2>/dev/null || true
  rm -rf /tmp/metro-cache /tmp/metro-file-map-* /tmp/haste-* 2>/dev/null || true
elif [[ $WORKTREE_MODE -eq 1 ]]; then
  # Limpa cache local do worktree (.expo) mas preserva /tmp/metro-*
  # entre execucoes da mesma porta (acelera reboot).
  rm -rf .expo 2>/dev/null || true
  # Limpa file-map global apenas se for primeira instancia rodando
  # (nao ha' outros gauntlet ativos). Senao deixa pra nao quebrar
  # cache do worktree paralelo.
  OUTROS_GAUNTLETS=$(find /tmp -maxdepth 1 -name "gauntlet-port-*.lock" 2>/dev/null | wc -l)
  if [[ "$OUTROS_GAUNTLETS" -eq 0 ]]; then
    rm -rf /tmp/metro-file-map-* /tmp/haste-* 2>/dev/null || true
  fi
fi

# 4. Sobe Metro + Web em background, process group proprio.
#    run.sh --web aceita flags extras que vao para `expo start`;
#    passa --port pra Metro escutar no PORT escolhido.
setsid nohup ./run.sh --web --port "$PORT" > "$LOG_FILE" 2>&1 &
METRO_PID=$!
disown 2>/dev/null || true

# Registra lock cooperativo (PID do gauntlet, nao do filho)
echo "$METRO_PID" > "$LOCK_FILE"

# 5. Aguarda servidor responder (silencioso por padrao)
for i in {1..60}; do
  curl -sf "$URL_METRO" > /dev/null 2>&1 && break
  sleep 1
  if [[ $i -eq 60 ]]; then
    echo "ERRO: Metro nao subiu em 60s na porta $PORT." >&2
    echo "   tail -100 $LOG_FILE | grep -i error" >&2
    rm -f "$LOCK_FILE" 2>/dev/null || true
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
  echo "URL: $URL_GAUNTLET (log: $LOG_FILE)"
  exit 0
fi

# Modo verbose: mostra log e propaga Ctrl-C ao process group.
echo "=================================================="
echo "Gauntlet (modo --verbose, porta $PORT)"
echo "URL:    $URL_GAUNTLET"
echo "Log:    $LOG_FILE"
echo "Lock:   $LOCK_FILE"
echo "Stop:   Ctrl-C aqui ou kill -- -$METRO_PID"
echo "=================================================="

trap 'kill -- -$METRO_PID 2>/dev/null || true; kill $METRO_PID 2>/dev/null || true; rm -f "$LOCK_FILE" 2>/dev/null || true; exit 0' INT TERM

exec tail -f "$LOG_FILE"
