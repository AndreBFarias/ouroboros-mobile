#!/usr/bin/env bash
# M-GAUNTLET-LEAK-CHECK: confirma que o bundle Android release nao
# contem o modulo Gauntlet. GAUNTLET_ATIVO = Platform.OS === 'web'
# && __DEV__ deveria virar dead-code em build mobile, mas Metro/
# Hermes so fazem tree-shake se detectarem o early-return. Este
# script roda export real e busca por marcadores residuais.
#
# Uso:
#   ./scripts/check_gauntlet_leak.sh
#
# Exit codes:
#   0 - bundle limpo, sem vazamento
#   1 - vazamento detectado (mostra match)
#   2 - falha no expo export
#
# Opcionalmente acionavel via:
#   ./scripts/smoke.sh --full
#
# Comentarios sem acento (convencao shell/CI).
set -euo pipefail

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

echo ">> rodando expo export --platform android (pode demorar 60-90s)..."
if ! npx expo export --platform android --output-dir "$TMP" > "$TMP/export.log" 2>&1; then
  echo "ERRO: expo export falhou. Veja log:"
  tail -30 "$TMP/export.log"
  exit 2
fi

# Hermes/Metro produz o bundle em _expo/static/js/android/.
JS_DIR="$TMP/_expo/static/js/android"
if [[ ! -d "$JS_DIR" ]]; then
  echo "ERRO: pasta de JS exportado nao encontrada em $JS_DIR"
  exit 2
fi

# Marcadores Gauntlet que NAO devem aparecer no bundle release.
# Hermes bytecode (.hbc) preserva strings de identificadores
# alcancaveis -- usamos grep -ao para contar matches no binario.
MARCADORES=(
  '__gauntlet'
  'instalarGauntlet'
  'aplicarSeed'
  'useGaleriaMock'
  'GAUNTLET_ATIVO'
  'adicionarFotoMock'
)

VAZAMENTOS=0
echo ">> verificando $JS_DIR/*.hbc"
# Desabilita set -e pois `grep -ao` com 0 matches retorna exit 1, o
# que abortaria o loop antes de validar todos os markers.
set +e
for marker in "${MARCADORES[@]}"; do
  count=$(grep -ao "$marker" "$JS_DIR"/*.hbc 2>/dev/null | wc -l)
  if [[ $count -gt 0 ]]; then
    echo "   FAIL: $marker  ($count matches)"
    VAZAMENTOS=$((VAZAMENTOS + count))
  else
    echo "   OK:   $marker  (0 matches)"
  fi
done

set -e
# Tamanho do bundle JS principal (sanity check para tracking).
BUNDLE_SIZE=$(du -sh "$JS_DIR"/*.hbc 2>/dev/null | head -1)

if [[ $VAZAMENTOS -gt 0 ]]; then
  echo ""
  echo "ERRO: $VAZAMENTOS vazamento(s) detectado(s) no bundle Android."
  echo "      Veja docs/sprints/M-GAUNTLET-DEAD-CODE-V2-spec.md para fix."
  if [[ -n "$BUNDLE_SIZE" ]]; then
    echo "      bundle: $BUNDLE_SIZE"
  fi
  exit 1
fi

echo ""
echo "OK: bundle Android sem gauntlet"
if [[ -n "$BUNDLE_SIZE" ]]; then
  echo "    bundle: $BUNDLE_SIZE"
fi
