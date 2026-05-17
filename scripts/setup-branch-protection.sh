#!/usr/bin/env bash
# Aplica branch protection em main do repositorio ouroboros-mobile.
#
# Idempotente: pode rodar quantas vezes precisar; o endpoint PUT
# sobrescreve a configuração com o estado declarado abaixo.
#
# Politica aplicada (alinhada com R-OPS-4):
#   - require_status_checks: scan-commits + Build APK Android (strict)
#   - required_pull_request_reviews: null (solo dev; sem revisor)
#   - enforce_admins: false (dono pode hotfix em emergencia)
#   - required_linear_history: true (rebase ou squash, sem merges sujos)
#   - allow_force_pushes: false
#   - allow_deletions: false
#   - restrictions: null (sem allowlist de pushers)
#
# Pre-requisitos:
#   - gh autenticado com escopo "repo" (gh auth status).
#   - Permissao admin no repositorio alvo.
#
# Uso:
#   ./scripts/setup-branch-protection.sh                       # aplica
#   ./scripts/setup-branch-protection.sh --dry-run             # mostra payload, não aplica
#   ./scripts/setup-branch-protection.sh --show                # le protection atual
#   REPO=owner/nome ./scripts/setup-branch-protection.sh       # override do alvo
#
# Saida em caso de sucesso: payload aplicado + linha "OK: branch
# protection aplicada".
set -euo pipefail

REPO="${REPO:-AndreBFarias/ouroboros-mobile}"
BRANCH="${BRANCH:-main}"
ACTION="${1:-apply}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERRO: gh CLI não encontrado. Instale via https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERRO: gh não autenticado. Rode 'gh auth login' antes." >&2
  exit 1
fi

# Status checks correspondem a check_run.name reportado pelo Actions.
# Verificação empírica em 2026-05-17 (R-OPS-4):
#   - anonymity-check.yml -> job id "scan-commits" -> check name "scan-commits"
#   - build-android-apk.yml -> job name "Build APK Android" -> check name "Build APK Android"
CONTEXTS_JSON='{"strict":true,"contexts":["scan-commits","Build APK Android"]}'

case "$ACTION" in
  --show)
    echo "Lendo protection atual de ${REPO}@${BRANCH}..." >&2
    gh api "repos/${REPO}/branches/${BRANCH}/protection" 2>/dev/null || {
      echo "AVISO: branch ${BRANCH} ainda não tem protection configurada." >&2
      exit 0
    }
    ;;

  --dry-run)
    echo "Payload que seria aplicado em ${REPO}@${BRANCH}:"
    echo "  required_status_checks   = ${CONTEXTS_JSON}"
    echo "  enforce_admins           = false"
    echo "  required_pull_request_reviews = null"
    echo "  restrictions             = null"
    echo "  required_linear_history  = true"
    echo "  allow_force_pushes       = false"
    echo "  allow_deletions          = false"
    echo "(dry-run: nada aplicado)"
    ;;

  apply | "")
    echo "Aplicando branch protection em ${REPO}@${BRANCH}..."
    gh api "repos/${REPO}/branches/${BRANCH}/protection" \
      --method PUT \
      --field "required_status_checks=${CONTEXTS_JSON}" \
      --field "enforce_admins=false" \
      --field "required_pull_request_reviews=null" \
      --field "restrictions=null" \
      --field "required_linear_history=true" \
      --field "allow_force_pushes=false" \
      --field "allow_deletions=false" \
      >/dev/null
    echo "OK: branch protection aplicada em ${REPO}@${BRANCH}"
    echo "Para inspecionar: ./scripts/setup-branch-protection.sh --show"
    ;;

  *)
    echo "Uso: $0 [apply|--dry-run|--show]" >&2
    echo "  apply     (default) aplica protection idempotente" >&2
    echo "  --dry-run mostra payload e sai" >&2
    echo "  --show    le protection atual do branch" >&2
    exit 2
    ;;
esac
