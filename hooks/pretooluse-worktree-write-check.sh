#!/usr/bin/env bash
# Hook PreToolUse: deteta escrita fora do worktree atual.
#
# Sprint r-dx-executor-worktree-enforce-v2 (2026-05-17).
#
# Motivacao: 3 de 4 agents na Onda 3I (R-DX-1, R-DX-3, R-INT-4)
# escreveram direto no main em vez do worktree por aplicacao cega
# de paths absolutos vindos do Read inicial. Hook detective
# `agent-worktree-check.sh` (pre-commit) so detecta apos commit;
# este hook detecta antes do write.
#
# Modo atual: LOGGING-ONLY. Nao bloqueia, apenas registra em
# /tmp/worktree-bypass-<data>.log para auditoria. Decisao
# documentada no spec (Modo conservador inicial).
#
# Convencoes:
#   - shell script: sem acento em comentarios (convencao CI)
#   - exit 0 sempre (nao disrupta agente)
#   - silencioso em stdout/stderr (Claude Code captura)
#
# Entrada (stdin): payload JSON do PreToolUse com formato
#   {"tool_input": {"file_path": "..."}}
#
# Saida:
#   exit 0 sempre
#   side-effect: append em /tmp/worktree-bypass-<YYYYMMDD>.log
#                quando bypass detectado

set -uo pipefail

LOG_FILE="/tmp/worktree-bypass-$(date +%Y%m%d).log"

# No-op se jq nao disponivel (degrada silenciosamente)
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

# Le payload stdin (timeout 1s pra nao travar se stdin vazio)
PAYLOAD=$(timeout 1 cat 2>/dev/null || true)
if [[ -z "$PAYLOAD" ]]; then
  exit 0
fi

# Extrai file_path do payload
FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Detecta se estamos dentro de git repo
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null || echo "")
if [[ -z "$GIT_DIR" ]]; then
  exit 0
fi

GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null || echo "")
TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

# Resolve paths absolutos para comparacao confiavel
ABS_GIT_DIR=$(cd "$(dirname "$GIT_DIR")" 2>/dev/null && pwd)/$(basename "$GIT_DIR")
ABS_GIT_COMMON=$(cd "$(dirname "$GIT_COMMON_DIR")" 2>/dev/null && pwd)/$(basename "$GIT_COMMON_DIR")

# Se git-dir == git-common-dir, nao estamos em worktree: no-op
if [[ "$ABS_GIT_DIR" == "$ABS_GIT_COMMON" ]]; then
  exit 0
fi

# Resolve file_path para absoluto
if [[ "$FILE_PATH" = /* ]]; then
  ABS_FILE_PATH="$FILE_PATH"
else
  ABS_FILE_PATH="$(pwd)/$FILE_PATH"
fi

# Normaliza: remove . e .. (sem realpath para nao falhar em arquivo inexistente)
# Usa python para normalizacao confiavel (disponivel em todo dev env)
if command -v python3 >/dev/null 2>&1; then
  NORM_FILE_PATH=$(python3 -c "import os,sys; print(os.path.normpath(sys.argv[1]))" "$ABS_FILE_PATH" 2>/dev/null || echo "$ABS_FILE_PATH")
else
  NORM_FILE_PATH="$ABS_FILE_PATH"
fi

# Worktree root = TOPLEVEL
WORKTREE_ROOT="$TOPLEVEL"

# Compara prefixo: file_path deve comecar com worktree root
if [[ "$NORM_FILE_PATH" == "$WORKTREE_ROOT"/* || "$NORM_FILE_PATH" == "$WORKTREE_ROOT" ]]; then
  # Dentro do worktree: OK
  exit 0
fi

# Bypass detectado: loga
TIMESTAMP=$(date -Iseconds)
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
{
  echo "[$TIMESTAMP] BYPASS"
  echo "  tool: $TOOL_NAME"
  echo "  worktree_root: $WORKTREE_ROOT"
  echo "  file_path: $NORM_FILE_PATH"
  echo "  pwd: $(pwd)"
  echo ""
} >> "$LOG_FILE" 2>/dev/null || true

exit 0
