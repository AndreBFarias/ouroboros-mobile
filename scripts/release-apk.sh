#!/usr/bin/env bash
# Pipeline de release v1.0.0+.
#
# Etapas:
#   1. Anonimato (Regra -1) + smoke + tsc + tests + expo export.
#   2. Disparar EAS build production (--profile production --no-wait).
#   3. Polling de status ate FINISHED ou ERRORED.
#   4. Download do .aab para builds/ouroboros-VERSAO.aab.
#   5. Tamanho do bundle Hermes (limite 12 MB).
#   6. Verificacao do versionName instalado (apos adb install).
#
# Pre-requisitos:
#   - EXPO_TOKEN exportado no ambiente.
#   - eas-cli instalado globalmente.
#   - app.json com version e versionCode atualizados.
#
# Uso:
#   EXPO_TOKEN='...' ./scripts/release-apk.sh
#
# Saida:
#   - builds/ouroboros-1.0.0.aab (assinado pelo keystore EAS)
#   - builds/ouroboros-1.0.0.apk (universal extraido do .aab via bundletool)
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "ERRO: defina EXPO_TOKEN antes de rodar (token robot do EAS)."
  exit 1
fi

VERSION=$(node -p "require('./app.json').expo.version")
echo "==> Versao alvo: $VERSION"

echo "==> 1/6 anonimato (Regra -1)"
./scripts/check_anonimato.sh

echo "==> 2/6 typecheck + tests + smoke"
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh

echo "==> 3/6 expo export (verifica que bundle JS empacota)"
EXPORT_DIR=$(mktemp -d)
npx expo export --platform android --output-dir "$EXPORT_DIR"
HERMES_SIZE=$(du -b "$EXPORT_DIR"/_expo/static/js/android/*.hbc 2>/dev/null | awk '{s+=$1} END {print s}')
HERMES_MB=$(awk "BEGIN { printf \"%.2f\", $HERMES_SIZE / 1024 / 1024 }")
echo "    Hermes bundle: ${HERMES_MB} MB"
LIMIT_MB=12
if awk "BEGIN { exit ($HERMES_MB > $LIMIT_MB) ? 0 : 1 }"; then
  echo "ERRO: bundle Hermes ${HERMES_MB} MB acima do limite ${LIMIT_MB} MB."
  echo "      Abrir M19.1 sub-sprint de otimizacao."
  exit 1
fi

echo "==> 4/6 disparar EAS build production (--no-wait)"
BUILD_OUT=$(eas build --platform android --profile production --non-interactive --no-wait --json 2>&1)
BUILD_ID=$(echo "$BUILD_OUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'])")
echo "    Build ID: $BUILD_ID"
echo "    Acompanhe em: https://expo.dev/accounts/andre_farias/projects/ouroboros-mobile/builds/$BUILD_ID"

echo "==> 5/6 polling status (a cada 60s, max 30 min)"
TENTATIVAS=0
MAX_TENTATIVAS=30
while [[ $TENTATIVAS -lt $MAX_TENTATIVAS ]]; do
  STATUS=$(eas build:view "$BUILD_ID" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('status'))")
  echo "    [$TENTATIVAS/$MAX_TENTATIVAS] status=$STATUS"
  if [[ "$STATUS" == "FINISHED" ]]; then
    break
  elif [[ "$STATUS" == "ERRORED" ]] || [[ "$STATUS" == "CANCELED" ]]; then
    echo "ERRO: build $STATUS. Ver logs em https://expo.dev/.../builds/$BUILD_ID"
    exit 1
  fi
  TENTATIVAS=$((TENTATIVAS+1))
  sleep 60
done

if [[ "$STATUS" != "FINISHED" ]]; then
  echo "ERRO: build nao terminou em ${MAX_TENTATIVAS} minutos."
  exit 1
fi

echo "==> 6/6 download do .aab"
BUILD_URL=$(eas build:view "$BUILD_ID" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['artifacts']['buildUrl'])")
mkdir -p builds
AAB_PATH="builds/ouroboros-${VERSION}.aab"
curl -L -o "$AAB_PATH" "$BUILD_URL"
echo "    .aab salvo em: $AAB_PATH"
echo "    Tamanho: $(du -h "$AAB_PATH" | cut -f1)"

echo "==> RELEASE PRONTA. Proxima etapa manual:"
echo "    1. bundletool build-apks --bundle=$AAB_PATH --output=builds/ouroboros-${VERSION}.apks"
echo "    2. unzip -p builds/ouroboros-${VERSION}.apks universal.apk > builds/ouroboros-${VERSION}.apk"
echo "    3. adb install -r builds/ouroboros-${VERSION}.apk"
echo "    4. git tag v${VERSION} -m 'release v${VERSION}'"
echo "    5. git push origin v${VERSION}"
