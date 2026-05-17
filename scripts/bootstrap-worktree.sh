#!/usr/bin/env bash
# Bootstrap automatico de worktree agente: cria symlinks node_modules,
# env.json e .env (se existir) apontando pro main repo. Sem isso, jest
# falha em resolver yaml, typecheck falha em env.json e smoke quebra.
#
# Sprint r-infra-worktree-bootstrap (2026-05-17).
#
# Motivacao: achado recorrente em 10+ sprints (R-CRIT-4, T1B3, T1B6 etc).
# Bootstrap manual custa ~5min por sprint quando esquecido. Idempotente:
# rodar varias vezes nao quebra nada. Exit 0 sempre (no-op silencioso
# fora de worktree, sem bloquear workflow).
#
# Uso:
#   ./scripts/bootstrap-worktree.sh              # standalone
#   chamado por hooks/post-checkout              # automatico no checkout
#
# Convencoes:
#   - sem acento em comentarios .sh (convencao shell/CI)
#   - mensagens curtas no formato "OK:" / "AVISO:" / "ERRO:"

set -euo pipefail

TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

# No-op fora de git repo
if [[ -z "$TOPLEVEL" ]]; then
  exit 0
fi

# No-op fora de worktree (executa so quando estamos em .claude/worktrees/)
if [[ "$TOPLEVEL" != *".claude/worktrees/"* ]]; then
  exit 0
fi

cd "$TOPLEVEL"

# Resolve main repo: estamos em <main>/.claude/worktrees/<id>/, entao
# subir 3 niveis chega no main repo.
MAIN_REPO=$(cd ../../.. && pwd)

if [[ ! -d "$MAIN_REPO/.git" ]]; then
  echo "AVISO: main repo nao encontrado em $MAIN_REPO (.git ausente)" >&2
  exit 0
fi

# Symlink node_modules
if [[ ! -e node_modules ]]; then
  if [[ -d "$MAIN_REPO/node_modules" ]]; then
    ln -sfn "$MAIN_REPO/node_modules" .
    echo "OK: node_modules symlink criado"
  else
    echo "AVISO: $MAIN_REPO/node_modules nao existe; pule este worktree" >&2
  fi
fi

# Symlink env.json
if [[ ! -e env.json ]]; then
  if [[ -f "$MAIN_REPO/env.json" ]]; then
    ln -sfn "$MAIN_REPO/env.json" .
    echo "OK: env.json symlink criado"
  fi
fi

# Symlink .env (se existir no main; gitignored, pode nao estar presente)
if [[ ! -e .env ]] && [[ -f "$MAIN_REPO/.env" ]]; then
  ln -sfn "$MAIN_REPO/.env" .
  echo "OK: .env symlink criado"
fi

# Verifica integridade: alerta se symlink esta broken
for f in node_modules env.json .env; do
  if [[ -L "$f" ]] && [[ ! -e "$f" ]]; then
    echo "AVISO: symlink $f esta broken (target nao existe)" >&2
  fi
done

exit 0
