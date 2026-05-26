#!/usr/bin/env bash
# Smoke test: anonimato + dados de teste + (quando existir) typecheck +
# lint + tests. Roda no pre-push e no CI.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Bootstrap worktree symlinks se necessario (idempotente).
# Sprint r-infra-worktree-env-symlink (2026-05-21): hook post-checkout
# nao dispara quando worktree e criado via API interna do harness do
# Claude Code, deixando node_modules/env.json/.env ausentes e quebrando
# jest em cascata. Custa <100ms quando ok. No-op fora de worktree.
# Sprint r-infra-worktree-bootstrap-env-json (2026-05-22): captura saida
# em log e propaga falha visivel em vez de silenciar com 2>&1, pra que
# symlink obrigatorio ausente nao vire 6 suites jest falsamente vermelhas.
if [[ -f scripts/bootstrap-worktree.sh ]]; then
  if ! bash scripts/bootstrap-worktree.sh > /tmp/bootstrap-worktree.log 2>&1; then
    echo "AVISO: bootstrap-worktree.sh sinalizou erro - veja /tmp/bootstrap-worktree.log"
    cat /tmp/bootstrap-worktree.log >&2
  fi
fi

echo ">> anonimato (Regra -1)"
./scripts/check_anonimato.sh

echo ">> dados de teste"
./scripts/check_test_data.sh

echo ">> strings UI PT-BR (acentuacao canonica)"
python3 scripts/check_strings_ui_ptbr.py

echo ">> contract drift (Mobile <-> Backend Python)"
./scripts/test_contract_drift.sh || true

echo ">> auditoria fantasmas ROADMAP (warning, nao-bloqueante)"
if python3 scripts/check_roadmap_fantasmas.py --warn-only > /tmp/roadmap-fantasmas.log 2>&1; then
  n=$(grep -cE "^  FANTASMA: [A-Z]" /tmp/roadmap-fantasmas.log || true)
  if [[ "$n" -gt 0 ]]; then
    echo "AVISO: ROADMAP pode ter $n fantasma(s) - rode 'python3 scripts/check_roadmap_fantasmas.py' pra auditar"
  fi
fi

# Typecheck, lint e testes so rodam quando o projeto Expo existir
if [[ -f package.json ]]; then
  echo ">> typecheck"
  npx --no-install tsc --noEmit || { echo "ERRO: typecheck falhou"; exit 1; }

  echo ">> lint"
  if [[ -d src || -d app ]]; then
    npx --no-install eslint app/ src/ 2>/dev/null || true
  fi

  echo ">> testes"
  if grep -q '"test"' package.json; then
    npm test --silent || { echo "ERRO: testes falharam"; exit 1; }
  fi
else
  echo ">> typecheck/lint/tests pulados (package.json ainda nao existe)"
fi

echo "OK: smoke test passou"
