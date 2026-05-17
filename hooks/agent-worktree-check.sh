#!/usr/bin/env bash
# Hook detective: bloqueia commit quando branch worktree-agent-* nao
# esta no diretorio esperado .claude/worktrees/agent-<id>/, ou quando
# variavel CLAUDE_AGENT_ID esta setada e a branch atual e main.
#
# Sprint r-dx-executor-worktree-enforce (2026-05-16).
#
# Motivacao: bypass de worktree boundaries pelo agente executor-sprint
# foi observado em 4 ocasioes ao longo de uma sessao. Instrucao textual
# no prompt e insuficiente; este hook age como detective runtime.
#
# Saidas:
#   0 = passa (branch nao e worktree-agent-*, OU branch esta no path
#       esperado, OU nao ha CLAUDE_AGENT_ID em main)
#   1 = falha (branch worktree-agent-* fora do worktree esperado, OU
#       agente tentando commitar diretamente em main)
#
# Bypass legitimo: `git commit --no-verify` pelo orquestrador apenas em
# casos manuais documentados.

set -euo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current 2>/dev/null || echo "")

# Cenario 1: branch agente em worktree errado
if [[ "$BRANCH" == worktree-agent-* ]]; then
  EXPECTED_SUFFIX=".claude/worktrees/${BRANCH#worktree-}"
  if [[ "$TOPLEVEL" != *"$EXPECTED_SUFFIX" ]]; then
    echo "ERRO: branch $BRANCH nao esta no worktree esperado." >&2
    echo "       Toplevel atual: $TOPLEVEL" >&2
    echo "       Esperado sufixo: $EXPECTED_SUFFIX" >&2
    echo "" >&2
    echo "       Agentes devem trabalhar dentro do worktree dedicado." >&2
    echo "       Veja docs/CONTEXTO.md secao 'Execucao de agentes'." >&2
    exit 1
  fi
fi

# Cenario 2: agente tentando commit direto em main
if [[ "$BRANCH" == "main" && -n "${CLAUDE_AGENT_ID:-}" ]]; then
  echo "ERRO: agente CLAUDE_AGENT_ID=$CLAUDE_AGENT_ID tentando commitar em main." >&2
  echo "       Use worktree dedicado em .claude/worktrees/agent-<id>/." >&2
  echo "       Veja docs/CONTEXTO.md secao 'Execucao de agentes'." >&2
  exit 1
fi

exit 0
