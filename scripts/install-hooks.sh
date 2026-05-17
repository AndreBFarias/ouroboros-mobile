#!/usr/bin/env bash
# Instala hooks do repo via core.hooksPath = hooks/.
# Sprint r-dx-executor-worktree-enforce (2026-05-16).
#
# Apos rodar, o git usa os scripts em hooks/ (pre-commit, pre-push,
# agent-worktree-check.sh) em vez de .git/hooks/. Isso e necessario
# para que o detective de worktree boundary execute em todos os commits.
#
# ATENCAO: setar core.hooksPath = hooks/ desabilita hooks instalados
# em .git/hooks/ (ex: hooks Universal de identidade do shell global do
# usuario). Os scripts em hooks/ devem ser auto-suficientes para os
# checks do projeto.
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
    echo "       Hooks Universal globais (em .git/hooks/) deixarao de rodar."
  fi
  git config --local core.hooksPath "$EXPECTED_PATH"
  echo "OK: core.hooksPath = $EXPECTED_PATH"
fi

# Garante bit de execucao nos hooks
chmod +x hooks/pre-commit hooks/pre-push hooks/agent-worktree-check.sh 2>/dev/null || true

echo ""
echo "Hooks ativos:"
ls -1 hooks/ | grep -v '\.sample$' | sed 's/^/  /'
echo ""
echo "Para reverter:  git config --local --unset core.hooksPath"
