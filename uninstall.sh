#!/usr/bin/env bash
# uninstall.sh — remove artefatos locais para reset limpo.
#
# O que faz:
#   1. Para qualquer Metro/Expo rodando
#   2. Apaga node_modules, .expo, dist, web-build (regenerados pelo
#      install.sh)
#   3. Apaga caches de teste (coverage, .pytest_cache se houver)
#   4. NAO apaga .git, docs, src, app, scripts, hooks, configs
#   5. NAO apaga pessoas.config.ts nem o Vault em ~/Protocolo-Ouroboros
#
# Uso:
#   ./uninstall.sh        # interativo (pede confirmacao)
#   ./uninstall.sh --yes  # nao interativo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

CONFIRMA=""
for arg in "$@"; do
  if [[ "$arg" == "--yes" || "$arg" == "-y" ]]; then
    CONFIRMA="yes"
  fi
done

echo "=================================================="
echo "UNINSTALL OUROBOROS MOBILE"
echo "=================================================="
echo ""
echo "Vai apagar (regenerados pelo ./install.sh):"
echo "  - node_modules/"
echo "  - .expo/"
echo "  - dist/, web-build/"
echo "  - coverage/, .nyc_output/"
echo ""
echo "NAO toca em:"
echo "  - .git/ (commits e historico)"
echo "  - docs/, src/, app/, hooks/, scripts/, tests/"
echo "  - pessoas.config.ts (sua configuracao runtime)"
echo "  - ~/Protocolo-Ouroboros/ (Vault sincronizado via Syncthing)"
echo ""

if [[ -z "$CONFIRMA" ]]; then
  read -r -p "Continuar? [s/N] " resposta
  case "$resposta" in
    s|S|sim|SIM|y|Y|yes|YES) ;;
    *) echo "Abortado."; exit 0 ;;
  esac
fi

echo ""
echo ">> parando processos Expo/Metro"
pkill -f "expo start" 2>/dev/null || true
sleep 1

echo ">> apagando node_modules"
rm -rf node_modules

echo ">> apagando caches"
rm -rf .expo dist web-build coverage .nyc_output

echo ">> apagando logs"
find . -maxdepth 2 -name '*.log' -type f -delete 2>/dev/null || true

echo ""
echo "=================================================="
echo "UNINSTALL CONCLUIDO"
echo "=================================================="
echo ""
echo "Para reinstalar:"
echo "  ./install.sh"
