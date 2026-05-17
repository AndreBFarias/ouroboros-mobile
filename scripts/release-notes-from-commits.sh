#!/usr/bin/env bash
# release-notes-from-commits.sh — gera release notes consolidados
# a partir dos commits desde a tag anterior até HEAD.
#
# Uso:
#   ./scripts/release-notes-from-commits.sh > NOTAS.md
#   ./scripts/release-notes-from-commits.sh REF > NOTAS.md
#
# Parâmetros:
#   REF (opcional)  ref alvo (default: HEAD). Se HEAD está em uma tag,
#                   compara com a tag imediatamente anterior. Caso contrário,
#                   compara com a última tag alcançável a partir de REF~.
#
# Saída (stdout):
#   Markdown agrupado por tipo de commit (feat / fix / refactor / docs /
#   test / perf / style / chore). Cada seção lista commits no formato
#   "- subject". Seção sem commits imprime "- Nenhuma".
#
# Saída (stderr):
#   Log informativo do range usado.
#
# Exit codes:
#   0 sucesso (sempre, mesmo sem commits novos: imprime "- Nenhuma" em tudo).
#   1 ref inválida (git rev-parse falha).
#
# Origem: R-OPS-5 (2026-05-17). Usado pelo workflow
# .github/workflows/build-android-apk.yml para gerar notas de release
# como complemento ao extract-changelog-section.sh (R-OPS-1).

set -euo pipefail

REF="${1:-HEAD}"

# Valida que REF existe.
if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
  echo "ERRO: ref inválida: $REF" >&2
  exit 1
fi

# Determina tag anterior. Se REF aponta para uma tag, queremos a tag
# imediatamente anterior — então usamos REF~ como base de busca.
# Se REF não está em tag, REF também serve como base.
SEARCH_FROM="$REF"
if git describe --tags --exact-match "$REF" >/dev/null 2>&1; then
  # REF coincide com uma tag — pula essa tag para achar a anterior.
  SEARCH_FROM="${REF}~"
fi

PREV_TAG=""
if git describe --tags --abbrev=0 "$SEARCH_FROM" >/dev/null 2>&1; then
  PREV_TAG=$(git describe --tags --abbrev=0 "$SEARCH_FROM")
fi

if [ -n "$PREV_TAG" ]; then
  RANGE="${PREV_TAG}..${REF}"
  HEADER_REF="$PREV_TAG"
else
  # Nenhuma tag anterior alcançável: usa histórico completo até REF.
  RANGE="$REF"
  HEADER_REF="(início do histórico)"
fi

echo "[release-notes-from-commits] range: $RANGE" >&2

# Coleta todos os commits do range em variável temporária (uma chamada ao git).
COMMITS=$(git log "$RANGE" --pretty=format:"%s" --no-merges || true)

# Filtra por prefixo (case-insensitive) e formata como bullet.
# Imprime "- Nenhuma" se a seção ficar vazia.
print_section() {
  local title="$1"
  local prefix="$2"
  local matched

  matched=$(printf '%s\n' "$COMMITS" \
    | grep -iE "^${prefix}(\(|:)" \
    | sed 's/^/- /' \
    || true)

  echo "### $title"
  if [ -z "$matched" ]; then
    echo "- Nenhuma"
  else
    printf '%s\n' "$matched"
  fi
  echo ""
}

echo "## Mudanças desde $HEADER_REF"
echo ""

print_section "Features"     "feat"
print_section "Fixes"        "fix"
print_section "Refactor"     "refactor"
print_section "Docs"         "docs"
print_section "Performance"  "perf"
print_section "Testes"       "test"
print_section "Estilo"       "style"
print_section "Chore"        "chore"
