#!/usr/bin/env bash
# Valida Regra -1 (CONTEXTO.md Secao 5): zero referencia a IA ou pessoas
# reais em codigo. Excecoes legitimas: pessoas.config.ts (default
# generico), proprio script, docs/ historicos.
#
# R-AUDIT-CI-GATES (2026-07-11): a exclusao antiga por substring larga
# (api_key|provider|model|config|client|engine) era um blind-spot no
# invariante numero-um: QUALQUER linha contendo uma dessas substrings era
# removida do scan mesmo quando mencionava IA. Exemplos que passavam:
#   const clientModel = "claude-4";          (client + model)
#   const providerId  = "anthropic";         (provider)
#   const engineName  = "openai";            (engine)
#   const config = { autor: "escrito por claude" };  (config)
# Trocada pelo mecanismo canonico ja usado no scan de nomes (abaixo) e no
# check_test_data.sh: so' o marker inline `// anonimato-allow: <razao>`
# isenta uma linha. Decisao consciente por linha, nao bypass cego.
set -euo pipefail

PROIBIDO_IA='claude|anthropic|openai|gpt-[0-9]|chatgpt|by ai|ai-generated|feito por|criado por|written by|made by'
NOMES_REAIS='Andr[eé]|Vit[oó]ria|Maria|Jo[aã]o'

# Escopo de scan: por padrao src/+app/ (codigo). Sobrescrevivel via env
# ANONIMATO_SCAN_DIRS (espaco-separado) para o teste de gate apontar num
# diretorio de fixtures temporario sem tocar o repo real.
IA_DIRS="${ANONIMATO_SCAN_DIRS:-src/ app/}"
NOMES_DIRS="${ANONIMATO_SCAN_DIRS:-src/ app/ tests/}"

# scan_ia <dir...>: imprime as linhas de codigo que mencionam IA fora do
# marker `anonimato-allow`. Stdout vazio = limpo.
scan_ia() {
  grep -rniE "$PROIBIDO_IA" "$@" 2>/dev/null \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    | grep -v 'anonimato-allow' || true
}

# --self-test: prova que o endurecimento REPROVA os 4 blind-spots
# historicos, que o marker isenta, e que codigo limpo passa. Reusado pelo
# teste de gate (tests/scripts/check-anonimato-gate.test.ts). Exit 0 se o
# gate esta' são; exit 1 se regrediu.
if [[ "${1:-}" == "--self-test" ]]; then
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  mkdir -p "$TMP/blindspot" "$TMP/permitido" "$TMP/limpo"

  cat > "$TMP/blindspot/blindspot.ts" <<'EOF'
const clientModel = "claude-4";
const providerId = "anthropic";
const engineName = "openai";
const config = { autor: "escrito por claude" };
EOF
  cat > "$TMP/permitido/permitido.ts" <<'EOF'
const x = "openai"; // anonimato-allow: nome de campo de config externa
EOF
  cat > "$TMP/limpo/limpo.ts" <<'EOF'
const soma = (a: number, b: number): number => a + b;
EOF

  RC=0

  echo ">> self-test 1/3: blind-spots devem ser REPROVADOS (esperado: 4 linhas)"
  BS="$(scan_ia "$TMP/blindspot")"
  N_BS=$(printf '%s\n' "$BS" | grep -c . || true)
  printf '%s\n' "$BS" | sed 's/^/    REPROVADO: /'
  if [[ "$N_BS" -eq 4 ]]; then
    echo "    OK (4/4 pegos)"
  else
    echo "    FALHA (esperava 4, pegou $N_BS)"
    RC=1
  fi

  echo ">> self-test 2/3: linha com anonimato-allow deve PASSAR"
  AL="$(scan_ia "$TMP/permitido")"
  if [[ -z "$AL" ]]; then
    echo "    OK (isenta pelo marker)"
  else
    echo "    FALHA (marker nao isentou): $AL"
    RC=1
  fi

  echo ">> self-test 3/3: codigo limpo deve PASSAR"
  LP="$(scan_ia "$TMP/limpo")"
  if [[ -z "$LP" ]]; then
    echo "    OK (limpo)"
  else
    echo "    FALHA (falso positivo): $LP"
    RC=1
  fi

  if [[ "$RC" -eq 0 ]]; then
    echo "OK: --self-test verde (gate de anonimato são)"
  else
    echo "ERRO: --self-test vermelho (gate de anonimato regrediu)"
  fi
  exit "$RC"
fi

# Anonimato IA: so codigo (src/+app/, ou ANONIMATO_SCAN_DIRS).
VIOLACOES_IA="$(scan_ia $IA_DIRS)"

if [[ -n "$VIOLACOES_IA" ]]; then
  echo "ERRO: anonimato IA violado em ${IA_DIRS}:"
  echo "$VIOLACOES_IA"
  exit 1
fi

# Nomes reais: codigo + testes, exceto pessoas.config (seed) e
# pessoas.config.example (template). Tambem exclui linhas com marker
# 'anonimato-allow:' (palavras comuns como 'Vitoria' = sucesso, conquista).
VIOLACOES_NOMES=$(grep -rE "$NOMES_REAIS" $NOMES_DIRS 2>/dev/null \
  --include='*.ts' --include='*.tsx' --include='*.md' \
  | grep -v 'pessoas.config' \
  | grep -v 'anonimato-allow' || true)

if [[ -n "$VIOLACOES_NOMES" ]]; then
  echo "ERRO: nome real hardcoded fora de pessoas.config:"
  echo "$VIOLACOES_NOMES"
  exit 1
fi

echo "OK: anonimato preservado (Regra -1)"
