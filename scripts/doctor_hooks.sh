#!/usr/bin/env bash
# doctor_hooks.sh — diagnostica o estado dos git hooks deste clone.
#
# R-AUDIT-CI-GATES (2026-07-11). O git aceita apenas UM core.hooksPath por
# clone: ou rodam os hooks do projeto (via scripts/install-hooks.sh) ou
# roda o hook global de identidade do usuario — nunca os dois, a menos que
# um DELEGUE ao outro. Esse doctor torna esse estado visivel e prescreve a
# saida quando os checks do projeto estao dormentes.
#
# Advisory por padrao (exit 0): em CI (runner sem hooks de humano) e em
# clone fresh nao deve reprovar espuriamente. O gate que OBRIGA de fato e'
# o .github/workflows/ci.yml (server-side). Flag --strict: em ambiente
# NAO-CI com verdict Dormente, sai != 0 (trava dura opcional local).
#
# Uso:
#   ./scripts/doctor_hooks.sh            # diagnostico advisory (exit 0)
#   ./scripts/doctor_hooks.sh --strict   # exit != 0 se Dormente fora de CI
set -uo pipefail

STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1

# Ambiente de CI: suaviza a mensagem e nunca reprova (o gate real e' o
# proprio smoke rodando no ci.yml; o runner nao tem hooks de humano).
EM_CI=0
if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" ]]; then
  EM_CI=1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "doctor_hooks: diretorio atual nao e um repo git; nada a diagnosticar."
  exit 0
}
cd "$REPO_ROOT"

# hooksPath efetivo: o git resolve local > global > default (.git/hooks).
# 'git config --get' sem escopo devolve exatamente o valor efetivo.
HOOKS_KEY="core.hooksPath"
CONFIGURADO="$(git config --get "$HOOKS_KEY" 2>/dev/null || echo "")"

if [[ -z "$CONFIGURADO" ]]; then
  EFETIVO_DESC=".git/hooks (default, nenhum core.hooksPath setado)"
  EFETIVO_ABS="$REPO_ROOT/.git/hooks"
else
  case "$CONFIGURADO" in
    /*) EFETIVO_ABS="$CONFIGURADO" ;;              # ja absoluto
    *)  EFETIVO_ABS="$REPO_ROOT/$CONFIGURADO" ;;   # relativo ao repo
  esac
  EFETIVO_DESC="$CONFIGURADO"
fi

PROJETO_HOOKS="$REPO_ROOT/hooks"
GLOBAL_PRE_COMMIT="$EFETIVO_ABS/pre-commit"

# Classificacao dos tres verdictos.
if [[ "$EFETIVO_ABS" == "$PROJETO_HOOKS" ]]; then
  VERDICT="projeto-ativo"
elif [[ -f "$GLOBAL_PRE_COMMIT" ]] && grep -qF "$REPO_ROOT" "$GLOBAL_PRE_COMMIT" 2>/dev/null; then
  VERDICT="global-delegacao"
else
  VERDICT="dormente"
fi

echo "== doctor de hooks (R-AUDIT-CI-GATES) =="
echo "  repo:            $REPO_ROOT"
echo "  core.hooksPath:  $EFETIVO_DESC"
echo "  resolve para:    $EFETIVO_ABS"
[[ "$EM_CI" -eq 1 ]] && echo "  ambiente:        CI (advisory forcado)"
echo ""

RC=0
case "$VERDICT" in
  projeto-ativo)
    echo "  Verdict: PROJETO ATIVO (OK)"
    echo "  Os hooks do projeto (hooks/pre-commit, hooks/pre-push) rodam no"
    echo "  commit/push: anonimato, PT-BR, test-data, gitleaks, eslint staged."
    echo "  O hook global de identidade e' encadeado por eles quando presente"
    echo "  (guarda de no-op se ausente). Server-side, o anonymity-check.yml"
    echo "  cobre metadados de commit."
    ;;
  global-delegacao)
    echo "  Verdict: GLOBAL COM DELEGACAO (OK)"
    echo "  O core.hooksPath aponta pro hook global, e o global delega para"
    echo "  este repo. Os dois rodam."
    ;;
  dormente)
    echo "  Verdict: DORMENTE (aviso)"
    echo "  O core.hooksPath NAO resolve para $PROJETO_HOOKS e o hook global"
    echo "  efetivo nao delega para este repo. Logo, os checks do PROJETO"
    echo "  (anonimato, PT-BR, test-data, gitleaks, eslint staged) NAO rodam"
    echo "  localmente no commit/push deste clone."
    echo ""
    echo "  Remediacao (qualquer uma resolve):"
    echo "    (a) ./scripts/install-hooks.sh"
    echo "        Passa a rodar os hooks do projeto, que agora ENCADEIAM o"
    echo "        hook global de identidade quando presente (rodam OS DOIS)."
    echo "    (b) Adicionar uma stanza de delegacao para este repo"
    echo "        ($REPO_ROOT) no hook global de identidade."
    echo ""
    echo "  Nota: independentemente da remediacao local, o gate que OBRIGA e'"
    echo "  server-side (.github/workflows/ci.yml roda ./scripts/smoke.sh em"
    echo "  todo PR e push pra main)."
    if [[ "$STRICT" -eq 1 && "$EM_CI" -eq 0 ]]; then
      echo ""
      echo "  --strict + ambiente local: reprovando (exit 3)."
      RC=3
    fi
    ;;
esac

echo ""
if [[ "$RC" -eq 0 ]]; then
  echo "doctor_hooks: diagnostico concluido (advisory)."
fi
exit "$RC"
