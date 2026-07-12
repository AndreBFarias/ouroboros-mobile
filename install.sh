#!/usr/bin/env bash
# install.sh — prepara o ambiente local do Ouroboros Mobile.
#
# O que faz:
#   1. Confere pre-requisitos (node 20+, npm, git)
#   2. Instala dependencias com --legacy-peer-deps (Armadilha A10)
#   3. Configura hooks de git (pre-commit, pre-push)
#   4. Cria pessoas.config.ts a partir do .example se nao existir
#   5. Roda smoke test para validar instalacao
#
# Uso: ./install.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo ">> verificando pre-requisitos"

# Node 20+
if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: node nao encontrado. Instale Node 20+ via nvm:"
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  echo "  nvm install 20"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "ERRO: node $NODE_MAJOR detectado. Precisa de 20+."
  exit 1
fi
echo "OK: node $(node --version)"

# npm
if ! command -v npm >/dev/null 2>&1; then
  echo "ERRO: npm nao encontrado."
  exit 1
fi
echo "OK: npm $(npm --version)"

# git
if ! command -v git >/dev/null 2>&1; then
  echo "ERRO: git nao encontrado."
  exit 1
fi
echo "OK: git $(git --version | awk '{print $3}')"

echo ""
echo ">> instalando dependencias (--legacy-peer-deps necessario por"
echo "   incompatibilidades Expo SDK 54 com React 19; normal)"
echo ">> instalando dependencias (npm install --legacy-peer-deps)"
echo "   pode demorar alguns minutos na primeira vez"
npm install --legacy-peer-deps

echo ""
echo ">> configurando hooks de git"
git config core.hooksPath hooks
chmod +x hooks/pre-commit hooks/pre-push 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
echo "OK: hooks ativos via core.hooksPath=hooks"

echo ""
echo ">> verificando pessoas.config.ts"
if [[ ! -f src/config/pessoas.config.ts ]]; then
  if [[ -f src/config/pessoas.config.example.ts ]]; then
    cp src/config/pessoas.config.example.ts src/config/pessoas.config.ts
    echo "OK: pessoas.config.ts criado a partir do example"
    echo "    edite se quiser trocar os defaults Nome_A / Nome_B"
  else
    echo "AVISO: pessoas.config.example.ts nao encontrado"
  fi
else
  echo "OK: pessoas.config.ts ja existe"
fi

echo ""
echo ""
echo ">> configurando atalho de duplo-clique do Gauntlet"
chmod +x ./gauntlet.sh ./run.sh ./uninstall.sh 2>/dev/null || true
if [[ -f ./Gauntlet.desktop ]]; then
  chmod +x ./Gauntlet.desktop
  # Marca .desktop como confiavel no GNOME/Files (evita prompt)
  if command -v gio >/dev/null 2>&1; then
    gio set "$ROOT/Gauntlet.desktop" "metadata::trusted" true 2>/dev/null || true
  fi
  # Permissao executavel + atributo "trusted" para Nautilus/Caja
  if command -v gio >/dev/null 2>&1; then
    gio set "$ROOT/Gauntlet.desktop" "metadata::xfce::trusted" true 2>/dev/null || true
  fi
  echo "OK: Gauntlet.desktop pronto. Duplo-clique em Files abre o Gauntlet"
  echo "    no navegador sem terminal. Tambem: ./gauntlet.sh"
else
  echo "AVISO: Gauntlet.desktop ausente na raiz; nao instalado"
fi

echo ""
echo ">> validando instalacao (smoke test)"
./scripts/smoke.sh

echo ""
echo "=================================================="
echo "INSTALACAO CONCLUIDA"
echo "=================================================="
echo ""
echo "Para iniciar o servidor de desenvolvimento:"
echo "  ./run.sh                  # Metro + QR para Expo Go (celular)"
echo "  ./run.sh --clear          # limpa cache do Metro antes de subir"
echo "  ./gauntlet.sh             # Metro web + Chrome silencioso (validacao visual)"
echo "  duplo-clique em Gauntlet.desktop em Files (mesmo efeito)"
echo ""
echo "Documentacao:"
echo "  README.md, ROADMAP.md, STATE.md, docs/BRIEFING.md,"
echo "  docs/CONTEXTO.md, docs/I2-OAUTH-CHECKLIST.md, docs/GAUNTLET.md"
