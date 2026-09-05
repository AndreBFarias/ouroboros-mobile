#!/usr/bin/env bash
# Smoke test: anonimato + dados de teste + typecheck + lint + tests.
# Roda no pre-push e no CI. Os tres checks de codigo sao BLOQUEANTES:
# qualquer um deles reprovando aborta o script com exit 1.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo ">> anonimato (Regra -1)"
./scripts/check_anonimato.sh

# R-AUDIT-CI-GATES (2026-07-11): doctor de hooks advisory (non-block).
# Diagnostica core.hooksPath e a delegacao hook-projeto vs hook-global.
# Nunca reprova aqui (advisory): o gate que OBRIGA e' o ci.yml server-side.
echo ">> doctor de hooks (advisory)"
./scripts/doctor_hooks.sh || true

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
  # AUDIT-P3-2 (2026-09-05): esta linha tinha DOIS amortecedores --
  # `2>/dev/null` escondia a saida e `|| true` descartava o exit code.
  # Nasceu defensiva, antes de existir eslint.config.js, e ficou. Enquanto
  # existiu, nenhum erro de ESLint jamais reprovou um PR, porque este
  # script e' exatamente o que o job quality-gate do CI executa.
  # Avisos não reprovam: o ESLint so sai != 0 quando ha erro.
  if [[ -d src || -d app ]]; then
    npx --no-install eslint app/ src/ || { echo "ERRO: lint falhou"; exit 1; }
  fi

  echo ">> testes"
  if grep -q '"test"' package.json; then
    npm test --silent || { echo "ERRO: testes falharam"; exit 1; }
  fi
else
  echo ">> typecheck/lint/tests pulados (package.json ainda nao existe)"
fi

echo "OK: smoke test passou"
