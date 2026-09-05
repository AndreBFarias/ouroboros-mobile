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
# AUDIT-P3-8 (2026-09-05): o veredito do doctor era impresso so aqui, no meio
# de saida extensa, e se perdia -- quem le o smoke nunca notava que os hooks do
# projeto estavam DORMENTES neste clone. Agora a saida e' capturada UMA vez
# (sem reexecutar o doctor no fim, que duplicaria ~15 linhas e o custo) e a
# linha do veredito e' reemitida logo antes do "OK: smoke test passou".
# Continua advisory: nenhum exit 1 novo. O gate que OBRIGA e' o ci.yml
# server-side, e o CI não tem hooks locais.
set +e
doctor_out=$(./scripts/doctor_hooks.sh 2>&1)
rc_doctor=$?
set -e
if [[ -n "$doctor_out" ]]; then
  printf '%s\n' "$doctor_out"
fi
# As duas guardas (o `set +e` acima e o `|| true` abaixo) sao obrigatorias:
# com `set -euo pipefail` (linha 5), um doctor que sai != 0 ou um pipeline de
# extracao sem match abortariam o smoke inteiro num check que e' so aviso.
veredito_hooks=$(printf '%s\n' "$doctor_out" \
  | sed -n 's/^[[:space:]]*Verdict:[[:space:]]*/Verdict: /p' | head -1 || true)
if [[ -z "$veredito_hooks" ]]; then
  veredito_hooks="Verdict: INDETERMINADO (doctor_hooks.sh saiu $rc_doctor sem emitir veredito)"
fi

echo ">> dados de teste"
./scripts/check_test_data.sh

echo ">> strings UI PT-BR (acentuacao canonica)"
python3 scripts/check_strings_ui_ptbr.py

echo ">> contract drift (Mobile <-> Backend Python)"
./scripts/test_contract_drift.sh || true

echo ">> auditoria fantasmas (warning, nao-bloqueante)"
# AUDIT-P3-5 (2026-09-05): antes este bloco era um `if` sem `else`. Quando o
# script saia != 0 -- que era o caso desde que o ROADMAP.md sumiu no scrub --
# o bloco inteiro era pulado, o stderr ia para o log e nada chegava ao
# console. "sem fantasmas" e "o detector não rodou" ficavam indistinguiveis
# para quem le o smoke. Segue nao-bloqueante, mas agora e' visivel.
set +e
python3 scripts/check_roadmap_fantasmas.py --warn-only > /tmp/roadmap-fantasmas.log 2>&1
rc_fantasmas=$?
set -e
if [[ "$rc_fantasmas" -eq 0 ]]; then
  n=$(grep -cE "^  FANTASMA: [A-Z]" /tmp/roadmap-fantasmas.log || true)
  if [[ "$n" -gt 0 ]]; then
    echo "AVISO: $n sprint(s) fantasma - rode 'python3 scripts/check_roadmap_fantasmas.py' pra auditar"
  fi
else
  echo "AVISO: o detector de fantasmas NÃO RODOU (exit $rc_fantasmas). Saida:"
  sed 's/^/    /' /tmp/roadmap-fantasmas.log | head -20
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

# AUDIT-P3-8 (2026-09-05): veredito de hooks reemitido como última linha antes
# do OK. Elevar visibilidade, não severidade -- este echo nunca reprova.
echo ">> hooks locais deste clone -- $veredito_hooks"

echo "OK: smoke test passou"
