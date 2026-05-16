#!/usr/bin/env bash
# Smoke unit do scripts/check_roadmap_fantasmas.py.
#
# Cenarios cobertos:
#   1. Sprint com evidencia intra-roadmap (mesmo ID em [ok] e [todo])
#      -> classificada FANTASMA.
#   2. Sprint com 0 evidencias -> classificada REAL.
#   3. --warn-only retorna exit 0 mesmo com fantasmas.
#   4. --fix substitui [todo] por [ok] com comentario inline.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/check_roadmap_fantasmas.py"

if [[ ! -x "$SCRIPT" ]]; then
  echo "ERRO: $SCRIPT nao executavel"
  exit 1
fi

# Sandbox isolado: tmpdir com ROADMAP fixture
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

mkdir -p "$SANDBOX/docs" "$SANDBOX/src-vazio"

# Fixture: ROADMAP com 3 sprints
#   M01 (FANTASMA por intra-roadmap)
#   M02 (REAL: sem evidencias)
#   M03 (REAL: sem evidencias)
cat > "$SANDBOX/ROADMAP.md" <<'EOF'
# Roadmap fixture

## Fase teste

| Status | Sprint | Titulo | Estimativa |
|---|---|---|---|
| `[ok]` | M01 | Sprint entregue | 2h |
| `[todo]` | M01 | Sprint duplicada como pendente | 2h |
| `[todo]` | M02 | Sprint nunca implementada | 3h |
| `[backlog]` | M03 | Outra sprint pendente | 4h |
EOF

cat > "$SANDBOX/docs/FEATURES-CANONICAS.md" <<'EOF'
# Features canonicas
Sem mencao a sprints na fixture.
EOF

# Caso 1+2: report default detecta FANTASMA mas mantem REAL
saida_report=$(python3 "$SCRIPT" --roadmap "$SANDBOX/ROADMAP.md" --features "$SANDBOX/docs/FEATURES-CANONICAS.md" --code-root "$SANDBOX/src-vazio" --no-git || true)
if ! grep -q "FANTASMA: M01" <<< "$saida_report"; then
  echo "ERRO caso 1: M01 deveria ser FANTASMA"
  echo "Saida:"
  echo "$saida_report"
  exit 1
fi
if ! grep -q "REAL: M02" <<< "$saida_report"; then
  echo "ERRO caso 2: M02 deveria ser REAL"
  echo "Saida:"
  echo "$saida_report"
  exit 1
fi
if ! grep -q "REAL: M03" <<< "$saida_report"; then
  echo "ERRO caso 2b: M03 deveria ser REAL"
  echo "Saida:"
  echo "$saida_report"
  exit 1
fi
echo "OK caso 1+2: FANTASMA M01, REAL M02, REAL M03 detectados"

# Caso 3: --warn-only retorna exit 0 mesmo com fantasma
set +e
python3 "$SCRIPT" --roadmap "$SANDBOX/ROADMAP.md" --features "$SANDBOX/docs/FEATURES-CANONICAS.md" --code-root "$SANDBOX/src-vazio" --no-git --warn-only > /dev/null 2>&1
exit_warn=$?
set -e
if [[ "$exit_warn" -ne 0 ]]; then
  echo "ERRO caso 3: --warn-only deveria retornar exit 0, retornou $exit_warn"
  exit 1
fi
echo "OK caso 3: --warn-only exit 0"

# Caso 3b: sem --warn-only e com fantasma retorna exit 1
set +e
python3 "$SCRIPT" --roadmap "$SANDBOX/ROADMAP.md" --features "$SANDBOX/docs/FEATURES-CANONICAS.md" --code-root "$SANDBOX/src-vazio" --no-git > /dev/null 2>&1
exit_default=$?
set -e
if [[ "$exit_default" -ne 1 ]]; then
  echo "ERRO caso 3b: sem --warn-only deveria retornar exit 1, retornou $exit_default"
  exit 1
fi
echo "OK caso 3b: default exit 1 com fantasma"

# Caso 4: --fix substitui [todo] por [ok]
cp "$SANDBOX/ROADMAP.md" "$SANDBOX/ROADMAP.md.original"
python3 "$SCRIPT" --roadmap "$SANDBOX/ROADMAP.md" --features "$SANDBOX/docs/FEATURES-CANONICAS.md" --code-root "$SANDBOX/src-vazio" --no-git --fix > /dev/null
# Verifica que M01 [todo] virou [ok] e tem comentario inline
linha_m01=$(grep "M01 | Sprint duplicada" "$SANDBOX/ROADMAP.md" || true)
if [[ -z "$linha_m01" ]]; then
  echo "ERRO caso 4: linha M01 sumiu apos --fix"
  cat "$SANDBOX/ROADMAP.md"
  exit 1
fi
if ! grep -q "\`\[ok\]\`" <<< "$linha_m01"; then
  echo "ERRO caso 4: M01 deveria ter virado [ok] apos --fix"
  echo "Linha:"
  echo "$linha_m01"
  exit 1
fi
if ! grep -q "auto-marcado" <<< "$linha_m01"; then
  echo "ERRO caso 4: comentario inline auto-marcado ausente"
  echo "Linha:"
  echo "$linha_m01"
  exit 1
fi
# M02 e M03 devem continuar pendentes (REAL nao eh tocado)
linha_m02=$(grep "M02 | Sprint nunca implementada" "$SANDBOX/ROADMAP.md" || true)
if ! grep -q "\[todo\]" <<< "$linha_m02"; then
  echo "ERRO caso 4: M02 (REAL) nao deveria ter sido tocado"
  echo "Linha:"
  echo "$linha_m02"
  exit 1
fi
echo "OK caso 4: --fix aplicou [ok] em M01, manteve M02 [todo]"

# Caso 5: re-rodar apos --fix nao detecta mais fantasma
saida_pos_fix=$(python3 "$SCRIPT" --roadmap "$SANDBOX/ROADMAP.md" --features "$SANDBOX/docs/FEATURES-CANONICAS.md" --code-root "$SANDBOX/src-vazio" --no-git --warn-only || true)
# Procura por "FANTASMA: M" (com sprint ID) no grupo de detalhamento;
# nao "FANTASMA: 0" do resumo.
if grep -qE "FANTASMA: [A-Z]" <<< "$saida_pos_fix"; then
  echo "ERRO caso 5: ainda detecta FANTASMA apos --fix"
  echo "Saida:"
  echo "$saida_pos_fix"
  exit 1
fi
echo "OK caso 5: --fix idempotente; nenhum fantasma residual"

# Caso 6: JSON output valido
saida_json=$(python3 "$SCRIPT" --roadmap "$SANDBOX/ROADMAP.md.original" --features "$SANDBOX/docs/FEATURES-CANONICAS.md" --code-root "$SANDBOX/src-vazio" --no-git --json --warn-only)
python3 <<PY
import json
data = json.loads('''$saida_json''')
assert 'resultado' in data
assert len(data['resultado']) >= 3
PY
if [[ $? -ne 0 ]]; then
  echo "ERRO caso 6: JSON output invalido"
  echo "Saida:"
  echo "$saida_json"
  exit 1
fi
echo "OK caso 6: --json output valido"

echo "TUDO OK: 6/6 casos passaram"
