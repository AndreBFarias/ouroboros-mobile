#!/usr/bin/env bash
# gc-metro-cache.sh -- GC de cache Metro orfao referente a worktrees deletados.
#
# Origem: R-INFRA-METRO-CACHE-GC (achado em R-DX-GAUNTLET-MULTI-PORTA).
#
# Problema:
#   /tmp/metro-cache mantem transformed code / source maps com referencias
#   textuais a worktrees ja removidos (ex: .claude/worktrees/agent-XXXX).
#   Em multi-worktree intensivo isto polui stack traces e cresce de tamanho
#   sem teto.
#
# Solucao:
#   - Le git worktree list (porcelain) -> set de paths de worktrees vivos.
#   - Varre /tmp/metro-cache/ top-level (dirs ou arquivos).
#   - Para cada entrada, faz grep -l por strings ".claude/worktrees/<id>".
#     Se a entrada referencia APENAS worktrees inexistentes (e nenhum vivo
#     nem o main repo), remove. Se referencia algum vivo, preserva. Se nao
#     referencia nenhum (cache neutro), preserva.
#
# Idempotente. Sem cache (-> /tmp/metro-cache ausente) e' no-op silencioso.
#
# Uso:
#   ./scripts/gc-metro-cache.sh
#   ./scripts/gc-metro-cache.sh --dry-run   # nao remove, so reporta
#   ./scripts/gc-metro-cache.sh --verbose   # debug detalhado por entrada
#
# Output:
#   linhas "removed: <path>"
#   summary "total removed: N"
#
# Comentarios sem acento.
set -euo pipefail

CACHE_ROOT="/tmp/metro-cache"
DRY_RUN=0
VERBOSE=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --verbose) VERBOSE=1 ;;
    -h|--help)
      sed -n '1,30p' "$0"
      exit 0
      ;;
    *)
      echo "AVISO: flag desconhecida: $arg (ignorada)" >&2
      ;;
  esac
done

log_debug() {
  [[ $VERBOSE -eq 1 ]] && echo "  [debug] $*" >&2 || true
}

# 1. Degradacao graciosa: cache ausente -> nada a fazer.
if [[ ! -d "$CACHE_ROOT" ]]; then
  log_debug "$CACHE_ROOT ausente; nada a varrer."
  echo "total removed: 0"
  exit 0
fi

# 2. Coleta set de worktrees vivos via git porcelain.
#    Saida tipica:
#      worktree /path/to/main
#      HEAD abc...
#      branch refs/heads/main
#      <linha em branco>
#      worktree /path/to/.claude/worktrees/agent-XXX
#      ...
ACTIVE_WORKTREES=()
MAIN_REPO=""
if command -v git >/dev/null 2>&1; then
  while IFS= read -r line; do
    if [[ "$line" == "worktree "* ]]; then
      wt_path="${line#worktree }"
      ACTIVE_WORKTREES+=("$wt_path")
      # Primeiro worktree listado e' o repo principal (git convention).
      [[ -z "$MAIN_REPO" ]] && MAIN_REPO="$wt_path"
    fi
  done < <(git worktree list --porcelain 2>/dev/null || true)
fi

log_debug "worktrees vivos: ${#ACTIVE_WORKTREES[@]}"
for wt in "${ACTIVE_WORKTREES[@]}"; do
  log_debug "  ativo: $wt"
done

# 3. Varre entradas top-level de /tmp/metro-cache.
#    Cada entrada pode ser dir (bucket por hash) ou arquivo (raro).
REMOVED=0
shopt -s nullglob dotglob

for entry in "$CACHE_ROOT"/*; do
  [[ -e "$entry" ]] || continue

  entry_name="$(basename "$entry")"
  log_debug "entry: $entry_name"

  # Busca referencias textuais a worktrees (vivos ou mortos) dentro
  # da entry. Limita por arquivo a 2MB pra evitar travar em bundles
  # gigantes. -a trata bin como texto (cache Metro guarda fontes JS).
  # Filtra por padrao generico ".claude/worktrees/" -- se nao casar
  # nada, e' cache neutro (compartilhado ou referente ao main).
  REFS_FOUND=()
  while IFS= read -r refline; do
    # refline tipico: "agent-a7318f4be5bdf508f"
    [[ -n "$refline" ]] && REFS_FOUND+=("$refline")
  done < <(
    grep -roahE --include="*" --binary-files=text \
      '\.claude/worktrees/[a-zA-Z0-9_-]+' "$entry" 2>/dev/null \
      | sed -E 's|.*\.claude/worktrees/([a-zA-Z0-9_-]+).*|\1|' \
      | sort -u
  )

  if [[ ${#REFS_FOUND[@]} -eq 0 ]]; then
    log_debug "  sem referencias a worktree (cache neutro), preservado"
    continue
  fi

  log_debug "  referencias a worktrees encontradas: ${REFS_FOUND[*]}"

  # Para cada referencia encontrada, checa se aquele worktree
  # ainda existe na lista de ativos.
  ANY_ALIVE=0
  for ref in "${REFS_FOUND[@]}"; do
    for wt in "${ACTIVE_WORKTREES[@]}"; do
      # Casa "agent-XXX" contra o basename do worktree path.
      if [[ "$(basename "$wt")" == "$ref" ]]; then
        ANY_ALIVE=1
        log_debug "  ref '$ref' corresponde a worktree vivo: $wt"
        break 2
      fi
    done
  done

  if [[ $ANY_ALIVE -eq 1 ]]; then
    log_debug "  preservado (referencia a worktree vivo)"
    continue
  fi

  # Todas as referencias sao a worktrees mortos. Remove.
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "would remove: $entry"
  else
    rm -rf "$entry"
    echo "removed: $entry"
  fi
  REMOVED=$((REMOVED + 1))
done

shopt -u nullglob dotglob

echo "total removed: $REMOVED"
