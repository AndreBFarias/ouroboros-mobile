# I2-OAUTH — Checklist de configuração no Google Cloud Console

> Spec original: `docs/sprints/M-OAUTH-REDIRECT-URI-FIX-spec.md`.
> Field test do APK `v1.0.0-alpha` revelou erro 400 `invalid_request`
> ao tentar conectar Google Calendar via OAuth. Causa típica:
> `redirect_uri` mismatch + falta de test user autorizado.
> Esta sprint **não pode ser orquestrada por mim** — depende de você
> logado no Google Cloud Console.

## TO DO (ordem sugerida)

1. Confirmar projeto certo no Google Cloud Console.
2. Adicionar `andre.dsbf@gmail.com` em Test Users.
3. Cadastrar SHA-1 (já consta `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C` mas confirmar).
4. Conferir Authorized redirect URIs.
5. Conferir scopes mínimos (`calendar.events.readonly`).
6. Voltar pro APK e testar OAuth real.

---

## Passo 1 — Acessar e selecionar projeto

```
https://console.cloud.google.com
```

- Login com `andre.dsbf@gmail.com`.
- Topo da página, clicar no nome do projeto atual e confirmar que é
  o projeto onde o `client_id` do Ouroboros está cadastrado.
- O `client_id` está em `env.json` (gitignored). Para conferir:
  ```bash
  cat env.json | grep client_id
  ```
- Se o projeto não existir ou for outro, criar um novo:
  `Selector de projeto → New Project → Name: ouroboros-mobile`.

## Passo 2 — OAuth consent screen

- Menu lateral → `APIs & Services` → `OAuth consent screen`.
- Tipo: **External**.
- App name: `Ouroboros`.
- User support email: `andre.dsbf@gmail.com`.
- Developer contact: idem.
- App domain (opcional, deixar em branco).
- Authorized domains (opcional, deixar em branco).
- Status do app: deve estar `Testing` (não Production).
- Salvar e continuar.

### Passo 2.1 — Test users (CRÍTICO)

Na mesma tela:

- Aba `Test users` → `+ ADD USERS`.
- Adicionar **`andre.dsbf@gmail.com`** (ou o email que você loga no celular).
- Salvar.

Se outro email for usado no app (ex: `vitoria@gmail.com`), adicionar
também. Sem test user, qualquer email **fora da lista** recebe
`Access blocked: ouroboros has not completed verification`.

## Passo 3 — Credentials → OAuth 2.0 Client IDs

- Menu lateral → `APIs & Services` → `Credentials`.
- Localizar o client OAuth 2.0 do tipo **Android** (deve ter o nome
  do app + package).
- Clicar para editar.

### Passo 3.1 — Package name

- Confirmar `Package name` = `com.ouroboros.mobile` (alinhado com
  `app.json`).

### Passo 3.2 — SHA-1 fingerprint

Confirmar que o SHA-1 abaixo está cadastrado (consta como durável em
2026-05-05):

```
E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C
```

Se for um **novo** keystore (release final em vez de dev-client),
gerar e adicionar **um segundo SHA-1**:

```bash
# pra dev-client APK atual
keytool -list -v -keystore credentials/keystore-dev.jks -alias <alias> | grep SHA1

# pra production APK (depois)
keytool -list -v -keystore credentials/keystore-prod.jks -alias <alias> | grep SHA1
```

(Cuidado: keystores ficam em `credentials/` que está gitignored.)

### Passo 3.3 — Authorized redirect URIs (se aplicável)

OAuth Android puro **não** usa redirect URI (usa SHA-1 + package).
Mas como o app suporta `expo-auth-session` em Expo Go via proxy,
verificar se há um **segundo client OAuth** do tipo **Web**:

- Se sim, em `Authorized redirect URIs` adicionar:
  ```
  https://auth.expo.io/@<seu-username>/ouroboros-mobile
  ```
  (Substituir `<seu-username>` pelo seu username Expo, visível em
  `expo whoami` ou `eas account view`.)

Para release APK custom-scheme, não precisa adicionar nada (scheme
`ouroboros://oauth-callback` é tratado pelo `expo-router` linking).

## Passo 4 — Habilitar API Calendar

- Menu → `APIs & Services` → `Library`.
- Buscar `Google Calendar API`.
- Click em **Enable**.

Sem isso, OAuth funciona mas a primeira chamada à API retorna
`SERVICE_DISABLED`.

## Passo 5 — Confirmar scopes

Em `OAuth consent screen` → aba `Scopes`:

- Adicionar `https://www.googleapis.com/auth/calendar.events.readonly`
  (escopo mínimo M37.1).
- (futuro M37.2 escrita: `https://www.googleapis.com/auth/calendar.events`).

## Passo 6 — Testar no APK

1. Instalar APK preview no celular.
2. Onboarding completo (escolher pasta vault).
3. Settings → Contas Google → Conectar.
4. Tela de consent abre — escolher `andre.dsbf@gmail.com`.
5. Conceder permissões.
6. Voltar para o app — agenda deve carregar com eventos do calendar.

### Se der `Access blocked: invalid_request`

Falta:
- SHA-1 errado/desatualizado (Passo 3.2).
- Package name errado (Passo 3.1).
- Test user não adicionado (Passo 2.1) — se o email logado **não**
  estiver em Test Users e app estiver em modo Testing.

### Se der `redirect_uri_mismatch`

- Verificar se está usando dev-client ou Expo Go.
- Em dev-client/release: scheme `ouroboros://oauth-callback` deve
  estar em `app.json` `scheme` field.
- Em Expo Go: cadastrar redirect Web no Passo 3.3.

### Se der `Service disabled`

- Habilitar Google Calendar API no Passo 4.

### Se der `invalid_client`

- `client_id` em `env.json` não bate com nenhum cliente cadastrado.
  Conferir `cat env.json` e comparar com o ID em
  `Credentials → OAuth 2.0 Client IDs`.

## Custos

OAuth + Calendar API são **gratuitos** dentro do tier free do Google
Cloud. Não exige cartão de crédito.

## Persistência de tokens (já implementado)

Após OAuth bem-sucedido:
- Access token + refresh token persistem em `expo-secure-store` na
  chave `ouroboros.google.v1` (M37.1, ADR-0018).
- Cache de eventos em `media/cache/agenda-<pessoa>.json` no Vault
  (Armadilha A20 do BRIEF).
- Privacidade: tokens **só** locais. Sem servidor próprio. Sem proxy.
- Settings → Contas Google permite revogar a qualquer momento.

## Status final esperado

Quando passar tudo:
- Sprint **I2-OAUTH** vira `[ok]` no ROADMAP.
- Toda fileira do field test fica destravada.
- Próxima ação: `eas build --profile=preview` (Bloco P / F1).
