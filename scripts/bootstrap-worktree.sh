#!/usr/bin/env bash
# Bootstrap automatico de worktree agente: cria symlinks node_modules,
# env.json e .env (se existir) apontando pro main repo. Sem isso, jest
# falha em resolver yaml, typecheck falha em env.json e smoke quebra.
#
# Sprint r-infra-worktree-bootstrap (2026-05-17).
#
# Sprint r-infra-worktree-bootstrap-env-json (2026-05-22): exit != 0
# dentro de worktree quando symlink obrigatorio (node_modules, env.json)
# nao pode ser criado por origem ausente no main repo. .env continua
# opcional (gitignored). Fora de worktree segue exit 0 silencioso.
#
# Motivacao: achado recorrente em 10+ sprints (R-CRIT-4, T1B3, T1B6 etc).
# Bootstrap manual custa ~5min por sprint quando esquecido. Idempotente:
# rodar varias vezes nao quebra nada. No-op silencioso fora de worktree,
# sem bloquear workflow.
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

# Conta falhas de symlink obrigatorio (node_modules, env.json). Se >0 ao
# final, exit 1 pra que o operador veja o worktree quebrado em vez de
# descobrir via 6 suites jest falsamente vermelhas.
ERROS=0

# Symlink node_modules (obrigatorio)
if [[ ! -e node_modules ]]; then
  if [[ -d "$MAIN_REPO/node_modules" ]]; then
    ln -sfn "$MAIN_REPO/node_modules" .
    echo "OK: node_modules symlink criado"
  else
    echo "ERRO: node_modules ausente no main repo em $MAIN_REPO; jest e tsc vao falhar" >&2
    ERROS=$((ERROS + 1))
  fi
fi

# Symlink env.json (obrigatorio)
if [[ ! -e env.json ]]; then
  if [[ -f "$MAIN_REPO/env.json" ]]; then
    ln -sfn "$MAIN_REPO/env.json" .
    echo "OK: env.json symlink criado"
  else
    echo "ERRO: env.json ausente no main repo em $MAIN_REPO; jest e tsc vao falhar" >&2
    ERROS=$((ERROS + 1))
  fi
fi

# Symlink .env (opcional: gitignored, pode legitimamente nao existir)
if [[ ! -e .env ]] && [[ -f "$MAIN_REPO/.env" ]]; then
  ln -sfn "$MAIN_REPO/.env" .
  echo "OK: .env symlink criado"
fi

# Symlink expo-env.d.ts (opcional: gitignored, gerado por expo start/export).
# Sem ele, o `/// <reference types="expo/types" />` some e tsc/smoke falham com
# TS2882 'Cannot find module ../global.css' em app/_layout.tsx -- falso-positivo
# que quebrava o typecheck em worktree fresco. Achado confirmado por 4 sprints
# da onda contingente 2026-05-26 (DEDUP, SYNC-PAINEL, YOUTUBE, RECAP-7).
if [[ ! -e expo-env.d.ts ]] && [[ -f "$MAIN_REPO/expo-env.d.ts" ]]; then
  ln -sfn "$MAIN_REPO/expo-env.d.ts" .
  echo "OK: expo-env.d.ts symlink criado"
fi

# Verifica integridade: symlink obrigatorio broken tambem conta como erro
for f in node_modules env.json; do
  if [[ -L "$f" ]] && [[ ! -e "$f" ]]; then
    echo "ERRO: symlink $f esta broken (target nao existe)" >&2
    ERROS=$((ERROS + 1))
  fi
done

# .env broken e so aviso (opcional)
if [[ -L .env ]] && [[ ! -e .env ]]; then
  echo "AVISO: symlink .env esta broken (target nao existe)" >&2
fi

if [[ "$ERROS" -gt 0 ]]; then
  echo "ERRO: bootstrap incompleto ($ERROS symlink obrigatorio ausente); worktree quebrado" >&2
  exit 1
fi

exit 0
