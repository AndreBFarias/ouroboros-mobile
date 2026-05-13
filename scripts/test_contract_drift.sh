#!/usr/bin/env bash
# Q21 -- Drift check do contrato Mobile <-> Backend.
#
# Checa duas heuristicas leves (warning, nao falha o build):
#   1. CSV em docs/ esta sincronizado com o MD canonico (regen via
#      exportar_contrato.py e diff byte-a-byte).
#   2. Se schemas .ts em src/lib/schemas/ foram modificados mais
#      recentemente que docs/CONTRACT-MOBILE-BACKEND.md, alerta o
#      autor da sprint a atualizar o contrato manualmente.
#
# Exit 0 sempre (warning-only por design). Reporta no stderr quando
# detecta drift; smoke usa isso como check informativo nao bloqueante.
#
# Comentarios sem acento (convencao shell/CI).

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC_MD="$ROOT/docs/CONTRACT-MOBILE-BACKEND.md"
DOC_CSV="$ROOT/docs/CONTRACT-MOBILE-BACKEND.csv"
SCHEMAS_DIR="$ROOT/src/lib/schemas"

problemas=0

# 1) CSV em sync com MD?
if [ -f "$DOC_CSV" ]; then
  tmp_csv="$(mktemp)"
  python3 "$ROOT/scripts/exportar_contrato.py" > "$tmp_csv" 2>/dev/null
  if ! diff -q "$DOC_CSV" "$tmp_csv" >/dev/null 2>&1; then
    echo "AVISO drift: docs/CONTRACT-MOBILE-BACKEND.csv difere do regenerado." >&2
    echo "  Rode: python3 scripts/exportar_contrato.py > docs/CONTRACT-MOBILE-BACKEND.csv" >&2
    problemas=$((problemas + 1))
  fi
  rm -f "$tmp_csv"
else
  echo "AVISO: docs/CONTRACT-MOBILE-BACKEND.csv ausente. Rode o exportador." >&2
  problemas=$((problemas + 1))
fi

# 2) Schemas .ts mais novos que o MD?
if [ -f "$DOC_MD" ] && [ -d "$SCHEMAS_DIR" ]; then
  doc_mtime=$(stat -c %Y "$DOC_MD" 2>/dev/null || stat -f %m "$DOC_MD" 2>/dev/null || echo 0)
  novos=""
  for f in "$SCHEMAS_DIR"/*.ts; do
    [ -f "$f" ] || continue
    f_mtime=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)
    if [ "$f_mtime" -gt "$doc_mtime" ]; then
      novos="$novos $(basename "$f")"
    fi
  done
  if [ -n "$novos" ]; then
    echo "AVISO drift: schemas mais novos que docs/CONTRACT-MOBILE-BACKEND.md:" >&2
    echo " $novos" >&2
    echo "  Revise se os campos novos/alterados aparecem no MD canonico." >&2
    problemas=$((problemas + 1))
  fi
fi

if [ "$problemas" -eq 0 ]; then
  total=$(wc -l < "$DOC_CSV" 2>/dev/null || echo 0)
  echo "OK: contrato em sync com schemas ($((total - 1)) campos auditados)"
else
  echo "($problemas aviso(s) de drift -- nao falha o build)" >&2
fi

exit 0
