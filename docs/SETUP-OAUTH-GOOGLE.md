# Setup OAuth Google — Calendar API leitura

> Documento operacional para criar e configurar OAuth client no
> Google Cloud Console e plugar no app via `env.json` (raiz, gitignored).
> Sprint dona: M37.1.

## Contexto

A v1.0 de Ouroboros Mobile lê eventos do Google Calendar (escopo
`calendar.events.readonly`) sem servidor próprio. Tokens vivem em
SecureStore local; cache de eventos em arquivo no Vault. Detalhes
em ADR-0018.

## Estado atual (2026-05-05)

O dono do projeto já criou um OAuth client tipo "Desktop/Installed"
no projeto `protocolo-ouroboros` do Google Cloud Console e salvou
o JSON localmente em `env.json` (raiz, gitignored). O código lê o
`client_id` em runtime via `import env from '../../env.json'` e
`env.installed.client_id`. **Nada hardcoded** em código versionado.

Campos do `env.json` esperados:

```json
{
  "installed": {
    "client_id": "<redacted>.apps.googleusercontent.com",
    "project_id": "protocolo-ouroboros",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
  }
}
```

Pacote canônico: `com.ouroboros.mobile`.
SHA-1 dev/release: `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`
(extraído via `apksigner verify --print-certs` do APK production v1.0.0;
EAS reusa o mesmo keystore para dev-client).

## Reproduzir o setup do zero

Caso `env.json` precise ser refeito (perdeu, troca de keystore, novo
projeto Google Cloud), siga:

### 1. Criar projeto Google Cloud

1. Acesse https://console.cloud.google.com.
2. Crie projeto `protocolo-ouroboros` (ou similar).
3. Em "APIs & Services > Library", habilite **Google Calendar API**.

### 2. Criar OAuth consent screen

1. "APIs & Services > OAuth consent screen".
2. User Type: **External** (qualquer conta Google pode usar).
3. App name: `Ouroboros Mobile`.
4. Logo: opcional.
5. Authorized domains: deixe vazio (não há servidor).
6. Scopes: adicione `https://www.googleapis.com/auth/calendar.events.readonly`.
7. Test users: adicione e-mails dos donos do casal (até a app sair
   de "Testing" para "In production", apenas test users autenticam).
8. Salve.

### 3. Criar OAuth client(s)

A v1.0 usa **um único client** tipo "Desktop/Installed", que serve
tanto Expo Go (proxy `auth.expo.io`) quanto dev-client/release (custom
scheme `ouroboros://oauth-callback`), porque `expo-auth-session` usa
o mesmo `client_id` em ambos os fluxos quando configurado com
`makeRedirectUri` por ambiente.

**Decisão durol 2026-05-05**: ADR-0018 originalmente previa **2 clientes**
distintos (Web para proxy + Android para custom scheme) com env vars
`EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` e `_ANDROID`. A v1.0 simplificou
para 1 cliente "Desktop" que cobre os dois cenários e cabe em
`env.json` sem expor secrets em env vars `EXPO_PUBLIC_*` (que ficam
embedded no bundle). M37.2 ou sprint posterior reavalia se split é
necessário (em geral só vira problema se Google rejeitar mismatch).

Para criar:
1. "APIs & Services > Credentials > Create Credentials > OAuth client ID".
2. Application type: **Desktop app** (rotulada localmente como
   `Ouroboros mobile-desktop`).
3. Salve. Faça download do JSON (botão "Download OAuth client").
4. Renomeie o JSON baixado para `env.json` e coloque na **raiz** do
   repositório local (já gitignored em `.gitignore`).

### 4. Verificar `.gitignore`

```
env.json
```

deve estar listado (verificado no commit M37.1). Sem isso o
`client_id` vazaria em commits.

### 5. Validar no app

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
./run.sh --web                       # Nivel A com mock OAuth
./gauntlet.sh                         # Nivel A+ com bypass de gates
```

Em web `__DEV__`, `useGoogleAuth.autenticar()` injeta token sintético
e cache mock — não bate na rede real.

Para validação OAuth real (Nível B no emulador):

```bash
./scripts/start-emulator.sh
adb install -r builds/dev-client-*.apk
# /agenda > Conectar > prompt Google real > aceitar > eventos reais
```

### 6. Rotacionar credenciais

Se `env.json` vazar (commit acidental, push de fork), revogue
imediatamente em Google Cloud Console (Credentials > clica no
client > "Reset Secret" se aplicável; para "Desktop" type basta
deletar e recriar).

## Validação de SHA-1 do keystore

Em release Android, o OAuth client tipo Android (futuro) exige
SHA-1 do certificado de assinatura do APK. Comando para extrair:

```bash
apksigner verify --print-certs builds/release-v1.0.0.apk \
  | grep "SHA-1" | head -1
```

Esperado:

```
Signer #1 certificate SHA-1 digest: e449c8b3b489f92669aa311c38814344d37db38c
```

Em formato com `:`:

```
E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C
```

EAS production e dev-client reusam o mesmo keystore, então o SHA-1
é único.

## Checklist final M37.1

- [x] `env.json` na raiz (gitignored).
- [x] `client_id` Desktop type criado.
- [x] Calendar API habilitada.
- [x] OAuth consent screen com escopo `calendar.events.readonly`.
- [x] Test users incluem dono(s) do casal.
- [x] `googleAuthFlow.pickClientId()` lê de `env.json`.
- [x] Em web dev, mock OAuth dispensa rede real.

Para M37.2 (escrita), basta subir escopo para `calendar.events`
e re-prompt o usuário. Sem mudança em `env.json`.
