#!/usr/bin/env bash
# extract-changelog-section.sh — extrai a secao mais recente do CHANGELOG.md.
#
# Uso:
#   ./scripts/extract-changelog-section.sh [CHANGELOG_PATH] > NOTAS.md
#
# Parametros:
#   CHANGELOG_PATH  caminho do CHANGELOG (default: CHANGELOG.md na raiz)
#
# Saida:
#   stdout = conteudo do primeiro bloco ### ... ate o proximo ### ou EOF.
#   stderr = mensagem informativa (titulo da secao extraida).
#   exit 0  sucesso
#   exit 1  CHANGELOG nao encontrado
#   exit 2  nenhum cabecalho ### encontrado
#
# Origem: R-OPS-1 (2026-05-17). Usado pelo workflow
# .github/workflows/build-android-apk.yml para gerar notes de release
# quando uma tag v*-alpha-* eh empurrada.

set -euo pipefail

CHANGELOG="${1:-CHANGELOG.md}"

if [ ! -f "$CHANGELOG" ]; then
  echo "ERRO: arquivo nao encontrado: $CHANGELOG" >&2
  exit 1
fi

# awk extrai o primeiro bloco delimitado por linhas comecando com "### ".
# Comportamento:
#   - Linha 1 com "### " encontrada -> liga flag, imprime ate proxima "### ".
#   - Para no segundo "### " ou no EOF.
#   - Pula ## (versao Keep a Changelog) — quem fecha bloco e' apenas ### .
awk '
  /^### / {
    if (in_block) { exit }
    in_block = 1
    print
    next
  }
  in_block { print }
' "$CHANGELOG"

# Recupera titulo da secao pra log informativo em stderr (nao polui stdout).
TITLE=$(awk '/^### /{ print; exit }' "$CHANGELOG")
if [ -z "$TITLE" ]; then
  echo "ERRO: nenhum cabecalho ### encontrado em $CHANGELOG" >&2
  exit 2
fi

echo "[extract-changelog-section] secao extraida: $TITLE" >&2
