#!/usr/bin/env bash
# Instala hooks do repo via core.hooksPath = hooks/.
# Sprint r-dx-executor-worktree-enforce (2026-05-16).
#
# Apos rodar, o git usa os scripts em hooks/ (pre-commit, pre-push)
# em vez de .git/hooks/.
#
# NOTA (R-AUDIT-CI-GATES, 2026-07-11): o git aceita apenas UM
# core.hooksPath. Setar = hooks/ faz o git invocar so os hooks do projeto.
# Para nao perder o hook global de identidade, hooks/pre-commit e
# hooks/pre-push agora ENCADEIAM o hook global (~/.config/git/hooks/*)
# quando presente, propagando o exit code — com install-hooks rodado,
# rodam OS DOIS. No-op silencioso se o global estiver ausente (CI, outra
# maquina). Diagnostico do estado atual: scripts/doctor_hooks.sh.
#
# Idempotente: rodar varias vezes nao quebra nada.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

EXPECTED_PATH="hooks"

CURRENT=$(git config --local --get core.hooksPath 2>/dev/null || echo "")

# Aceita "hooks" puro ou caminho absoluto terminando em "/<REPO_ROOT>/hooks"
# (resolve para o mesmo destino). Recusa qualquer outro caminho.
EXPECTED_ABS="$REPO_ROOT/$EXPECTED_PATH"

if [[ "$CURRENT" == "$EXPECTED_PATH" ]] || [[ "$CURRENT" == "$EXPECTED_ABS" ]]; then
  echo "core.hooksPath ja aponta para $EXPECTED_PATH (atual: $CURRENT)"
else
  if [[ -n "$CURRENT" ]]; then
    echo "AVISO: core.hooksPath estava em: $CURRENT"
    echo "       O git passa a invocar so os hooks do projeto (hooks/), mas"
    echo "       eles ENCADEIAM o hook global de identidade quando presente —"
    echo "       rodam os dois. No-op se o global estiver ausente."
  fi
  git config --local core.hooksPath "$EXPECTED_PATH"
  echo "OK: core.hooksPath = $EXPECTED_PATH"
fi

# Garante bit de execucao nos hooks
chmod +x hooks/pre-commit hooks/pre-push 2>/dev/null || true

echo ""
echo "Hooks ativos:"
ls -1 hooks/ | grep -v '\.sample$' | sed 's/^/  /'
echo ""
echo "Para reverter:  git config --local --unset core.hooksPath"
