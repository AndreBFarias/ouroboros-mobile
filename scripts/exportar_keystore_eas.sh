#!/bin/bash
# Q17.e -- Exporta keystore EAS + emite os 4 valores prontos pra colar
# (ou cadastrar via gh) no GitHub Secrets do repo ouroboros-mobile.
#
# Uso:
#   ./scripts/exportar_keystore_eas.sh           # gera + imprime instrucoes
#   ./scripts/exportar_keystore_eas.sh --apply   # gera + roda gh secret set
#
# Pre-requisitos:
#   - .env com EXPO_TOKEN ativo (export feito antes)
#   - eas-cli instalado
#   - gh CLI logado em account com permissao admin no repo
#
# Comentarios sem acento (convencao shell/CI).
set -eu

REPO="AndreBFarias/ouroboros-mobile"
TMP_DIR=$(mktemp -d -t ouroboros-keystore-XXXXXX)
trap 'shred -u "$TMP_DIR"/*.jks "$TMP_DIR"/*.txt 2>/dev/null; rmdir "$TMP_DIR" 2>/dev/null || true' EXIT

APPLY=false
if [ "${1:-}" = "--apply" ]; then
  APPLY=true
fi

echo "==> 1. Carregando EXPO_TOKEN do .env"
if [ -f .env ]; then
  set -a; . ./.env; set +a
else
  echo "[err] .env nao encontrado. Coloque EXPO_TOKEN=... e tente novamente."
  exit 1
fi

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "[err] EXPO_TOKEN nao definido apos source .env"
  exit 1
fi

echo "==> 2. Baixando credentials.json + keystore.jks via eas credentials"
echo "    (Menu interativo: production -> credentials.json -> Download)"
echo "    Se eas baixar tudo, o JKS fica em credentials/android/keystore.jks"
npx --yes eas-cli credentials --platform android

JKS_PATH="credentials/android/keystore.jks"
CREDS_PATH="credentials.json"
if [ ! -f "$JKS_PATH" ] || [ ! -f "$CREDS_PATH" ]; then
  echo "[err] $JKS_PATH ou $CREDS_PATH ausente. Execute 'Download credentials' no menu eas."
  exit 1
fi

echo "==> 3. Extraindo senhas de credentials.json"
KEYSTORE_PASSWORD=$(python3 -c "import json; print(json.load(open('$CREDS_PATH'))['android']['keystore']['keystorePassword'])")
KEY_ALIAS=$(python3 -c "import json; print(json.load(open('$CREDS_PATH'))['android']['keystore']['keyAlias'])")
KEY_PASSWORD=$(python3 -c "import json; print(json.load(open('$CREDS_PATH'))['android']['keystore']['keyPassword'])")

echo "==> 4. Validando keystore via keytool"
if ! keytool -list -keystore "$JKS_PATH" -storepass "$KEYSTORE_PASSWORD" >/dev/null 2>&1; then
  echo "[err] Senha do keystore nao bate. Abortando."
  exit 1
fi
SHA1=$(keytool -list -v -keystore "$JKS_PATH" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" | grep -E "^\s*SHA1:" | head -1 | awk '{print $2}')
echo "    SHA1: $SHA1"
EXPECTED="E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C"
if [ "$SHA1" != "$EXPECTED" ]; then
  echo "[warn] SHA1 NAO bate o cadastrado em Google Cloud Console (Q17.e canonico):"
  echo "  esperado: $EXPECTED"
  echo "  obtido:   $SHA1"
  echo "  Se voce rotacionou o keystore, atualize o OAuth client em https://console.cloud.google.com"
fi

echo "==> 5. Gerando base64 do .jks"
BASE64_FILE="$TMP_DIR/keystore.b64"
base64 -w0 "$JKS_PATH" > "$BASE64_FILE"

if $APPLY; then
  echo "==> 6. Cadastrando 4 secrets em $REPO via gh secret set"
  gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO" --body "$(cat "$BASE64_FILE")"
  gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO" --body "$KEYSTORE_PASSWORD"
  gh secret set ANDROID_KEY_ALIAS --repo "$REPO" --body "$KEY_ALIAS"
  gh secret set ANDROID_KEY_PASSWORD --repo "$REPO" --body "$KEY_PASSWORD"
  echo "==> 7. Verificando"
  gh api "repos/$REPO/actions/secrets" | python3 -m json.tool
else
  echo "==> 6. Comandos pra colar (ou rode com --apply pra automatizar):"
  echo ""
  echo "gh secret set ANDROID_KEYSTORE_BASE64 \\"
  echo "  --repo $REPO \\"
  echo "  --body \"\$(cat $BASE64_FILE)\""
  echo ""
  echo "gh secret set ANDROID_KEYSTORE_PASSWORD --repo $REPO --body '$KEYSTORE_PASSWORD'"
  echo "gh secret set ANDROID_KEY_ALIAS --repo $REPO --body '$KEY_ALIAS'"
  echo "gh secret set ANDROID_KEY_PASSWORD --repo $REPO --body '$KEY_PASSWORD'"
  echo ""
  echo "Lembre de apagar credentials/android/keystore.jks + credentials.json"
  echo "apos colar (sao gitignored mas evita deixar disco quente)."
fi

echo ""
echo "[ok] Q17.e script concluido. base64 em $BASE64_FILE (sera shred no trap exit)."
