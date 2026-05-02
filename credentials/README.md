# Credenciais Android — release v1.0.0+

Este diretório contém referências às credenciais usadas no build de
release. **Os arquivos sensíveis (`keystore.jks`, `keystore.json`)
NÃO estão versionados** — estão listados no `.gitignore` da raiz.

## Política de geração

Use `eas credentials` para gerar e armazenar a keystore Android. EAS
mantém a chave em servidores próprios e baixa quando o build precisa
assinar. Backup manual segue para um local físico fora do
computador (USB criptografado, cofre).

## Geração inicial

```bash
EXPO_TOKEN='<seu-token-robot>' npx eas-cli credentials
# Selecione: Android → production → Set up a new keystore
# EAS gera keystore com 2048-bit RSA, 28 anos de validade.
```

Após confirmar, baixe o backup local:

```bash
EXPO_TOKEN='<seu-token-robot>' npx eas-cli credentials \
  --platform android --profile production
# Menu: Manage Keystore → Download Keystore → confirma diretório.
```

A keystore baixada cai em `credentials/keystore.jks` + metadados
em `credentials/keystore.json`. Ambos gitignored.

## Trocar keystore

**Atenção:** se a keystore atual for perdida, é impossível publicar
updates desta `package` (com.ouroboros.mobile) no Play Store ou
sideload sem reset do nome do pacote. Por isso o backup é crítico.

Trocar de keystore propositalmente requer:

1. Bump de `package` em `app.json` (ex.: `com.ouroboros.mobile.v2`).
2. Comunicar usuários para desinstalar a versão anterior.
3. Distribuir nova APK como instalação limpa.

Em outras palavras: tente ao máximo NÃO trocar.

## Distribuição

Esta sprint v1.0.0 é distribuída manualmente via ADB. Não há Play
Store. O APK assinado com a keystore acima é instalável em qualquer
Android compatível desde que o usuário ative "Install from unknown
sources" para o aplicativo de origem (gerenciador de arquivos / ADB).

Veja `docs/RELEASE.md` para o pipeline completo.
