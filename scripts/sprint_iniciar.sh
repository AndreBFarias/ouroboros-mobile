#!/usr/bin/env bash
# Cria estrutura inicial de uma sprint conforme protocolo formal
# (PLANO_TECNICO_APK.md Secao 1).
set -euo pipefail

SPRINT_ID=${1:-}
SPRINT_TITULO=${2:-}

if [[ -z "$SPRINT_ID" || -z "$SPRINT_TITULO" ]]; then
  echo "uso: ./scripts/sprint_iniciar.sh M05 'humor rapido'"
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
SPRINT_DIR="$ROOT/docs/sprints"
SHOTS_DIR="$SPRINT_DIR/${SPRINT_ID}-screenshots"

mkdir -p "$SHOTS_DIR"

cat > "$SPRINT_DIR/${SPRINT_ID}-todo-agente.md" <<EOF
# Sprint ${SPRINT_ID} — ${SPRINT_TITULO} — TODO do Agente

Status: planejado

## Objetivo

[preencher: o que fica funcionando ponta-a-ponta ao fim desta sprint]

## Decisões já tomadas (não mudar)

- [preencher: fontes BRIEFING.md, ADRs aplicáveis]

## TODO técnica

- [ ] [item 1]

## Riscos identificados

- [preencher]

## Perguntas para o humano antes de começar

1. [pergunta 1]

## Estimativa

[Xh] de implementação + 30 min de checkpoint visual.
EOF

echo "OK: estrutura da sprint $SPRINT_ID criada em $SPRINT_DIR/"
echo "Próximo passo: preencher $SPRINT_DIR/${SPRINT_ID}-todo-agente.md"
