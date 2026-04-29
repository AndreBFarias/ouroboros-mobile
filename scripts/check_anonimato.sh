#!/usr/bin/env bash
# Valida Regra -1 (CONTEXTO.md Secao 5): zero referencia a IA ou pessoas
# reais em codigo. Excecoes legitimas: pessoas.config.ts (default
# generico), proprio script, docs/ historicos.
set -euo pipefail

PROIBIDO_IA='claude|anthropic|openai|gpt-[0-9]|chatgpt|by ai|ai-generated|feito por|criado por|written by|made by'
NOMES_REAIS='Andr[eé]|Vit[oó]ria|Maria|Jo[aã]o'

# Anonimato IA: so codigo, exclui docs/, scripts/ e o proprio check
VIOLACOES_IA=$(grep -rniE "$PROIBIDO_IA" src/ app/ 2>/dev/null \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  | grep -viE 'api_key|provider|model|config|client|engine' || true)

if [[ -n "$VIOLACOES_IA" ]]; then
  echo "ERRO: anonimato IA violado em src/ ou app/:"
  echo "$VIOLACOES_IA"
  exit 1
fi

# Nomes reais: codigo + testes, exceto pessoas.config (seed) e
# pessoas.config.example (template). Tambem exclui docs/design-canvas-export/
# (legado obsoleto) e docs/sprints/ (historico).
VIOLACOES_NOMES=$(grep -rE "$NOMES_REAIS" src/ app/ tests/ 2>/dev/null \
  --include='*.ts' --include='*.tsx' --include='*.md' \
  | grep -v 'pessoas.config' || true)

if [[ -n "$VIOLACOES_NOMES" ]]; then
  echo "ERRO: nome real hardcoded fora de pessoas.config:"
  echo "$VIOLACOES_NOMES"
  exit 1
fi

echo "OK: anonimato preservado (Regra -1)"
