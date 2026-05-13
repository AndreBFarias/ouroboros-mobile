# Q22.B — OAuth Google bloqueado com erro 400 invalid_request

> **Status:** causa raiz identificada 2026-05-13 noite. **Typo de 1
> byte no SHA-1 cadastrado no Google Cloud Console**: 4º octeto
> mostra `43` quando o keystore EAS real tem `B3`. Fix: editar SHA-1
> no Cloud Console pra `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`.
> Aguardando propagação Google (5-30 min) + retest dono.
> **Tamanho:** Trivial (1 min no Cloud Console + retest).
> **Bloqueia v1.0.0?** Não — feature opcional, mas trivial de fixar.

## Reprodução (validação live alpha-4 2026-05-13)

1. App → drawer → Configurações → **Contas Google** → "Conectar".
2. Navegador abre tela `accounts.google.com`.
3. Conta seleciona `andre.dsbf@gmail.com`.
4. **Bug:** tela bloqueada:
   ```
   Acesso bloqueado: erro de autorização
   andre.dsbf@gmail.com

   You can't sign in to this app because it doesn't comply with
   Google's OAuth 2.0 policy for keeping apps secure.

   Erro 400: invalid_request
   ```

Não chega a mostrar consent screen — o Google rejeita antes de
sequer pedir autorização.

## Diagnóstico

App usa:
- **client_id**: `691237256846-sgqvc50rnut8p5emjq44sjfs6jg9tq5g.apps.googleusercontent.com`
- **Project**: `protocolo-ouroboros` (Google Cloud)
- **Scopes pedidos**: `calendar.events.readonly` + `openid` + `email`
- **Redirect URI**: `ouroboros://oauth-callback` (standalone) ou
  `auth.expo.io/...` (Expo Go via proxy)
- **Flow**: PKCE com `expo-auth-session`
- **Tipo OAuth client (Cloud Console)**: Android
  (`package_name=com.ouroboros.mobile`)

`calendar.events.readonly` é classificado como **sensitive scope**
pelo Google. Aplicações com sensitive scope em modo **Production**
exigem **verification**. Em modo **Testing** funciona OK até 100
test users.

### Causa raiz confirmada (2026-05-13 noite)

Auditoria do dono no Cloud Console encontrou:
- App em modo **Testing**, `andre.dsbf@gmail.com` cadastrado como
  test user, campos obrigatórios preenchidos — tudo OK.
- OAuth client tipo **Android** com `package_name=com.ouroboros.mobile`
  e SHA-1 cadastrado:
  ```
  E4:49:C8:43:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C
  ```

Mas o keystore EAS real (confirmado via `eas credentials --platform android`
e `keytool -list` local) tem SHA-1:
```
E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C
```

**Diferença no 4º octeto: `B3` no real, `43` no Cloud Console.** Typo
de transcrição. Google calcula SHA-1 do APK instalado, compara com
o cadastrado, não bate → `invalid_request`.

## Causas mais prováveis (em ordem)

### (1) Publishing status mudou para Production sem verification

Se o OAuth consent screen estiver com status **In production**
**sem ter passado por OAuth verification**, o Google bloqueia
qualquer login com sensitive scopes — erro idêntico ao observado.

### (2) Test users ausente em modo Testing

Se status = Testing mas o email `andre.dsbf@gmail.com` não está em
"Test users", o Google rejeita o login antes do consent screen.

### (3) OAuth consent screen incompleto

Campos obrigatórios faltando (App name, User support email,
Developer contact email, Authorized domains, Privacy policy URL,
Terms of service URL). Google bloqueia com policy error.

### (4) OAuth client type errado

Se o client `691237256846-sgqv...` está cadastrado como tipo
**Android** com `package_name=com.ouroboros.mobile` e `SHA-1=E4:49:...`,
o redirect URI custom-scheme `ouroboros://oauth-callback` **não é
suportado** — Android clients usam SHA-1 verification, não redirect
custom. Precisa ser "Web application" pra PKCE com custom scheme
funcionar, OU usar tipo Android com `signInIntent` do Google Play
Services.

## Fix imediato (descoberto 2026-05-13 noite)

1. https://console.cloud.google.com/apis/credentials?project=protocolo-ouroboros
2. Clicar no client `691237256846-sgqvc50rnut8p5emjq44sjfs6jg9tq5g`
3. Campo **SHA-1 certificate fingerprint** → editar valor para:
   ```
   E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C
   ```
   (4º octeto: **B3**, não 43)
4. Salvar
5. Aguardar 5-30 min de propagação Google
6. Retest: app → Configurações → Contas Google → Conectar.
   Tela consent deve aparecer.

## Passos para o dono resolver (mantidos para referência futura)

### Passo 1: abrir Cloud Console

URL direta:
```
https://console.cloud.google.com/apis/credentials/consent?project=protocolo-ouroboros
```

### Passo 2: verificar Publishing status

- Se **In production** → mudar para **Testing** (botão "Back to
  Testing"). Production sem verification = bloqueio garantido.

### Passo 3: garantir test users

- Página "OAuth consent screen" → seção **Test users** → "Add users".
- Adicionar: `andre.dsbf@gmail.com` (dono) e quaisquer outros emails
  que vão testar.
- Limite: 100 test users (sobra muita margem).

### Passo 4: preencher campos obrigatórios

Mesma página, seção **OAuth consent screen** edit:
- App name: `Ouroboros` (ou nome canônico do projeto)
- User support email: email do dono
- App logo: opcional
- App domain (vazio é OK em Testing)
- Authorized domains: vazio em Testing OK
- Developer contact information: email do dono
- Scopes: confirmar que `calendar.events.readonly` aparece na lista
  (pode precisar re-adicionar via "Add or remove scopes")

### Passo 5: verificar client type em Credentials

URL direta:
```
https://console.cloud.google.com/apis/credentials?project=protocolo-ouroboros
```

Encontrar o client `691237256846-sgqvc50rnut8p5emjq44sjfs6jg9tq5g`.
Anotar o "Application type":
- **Web application** → OK para PKCE com custom scheme.
- **Android** → precisa SHA-1 cadastrado
  (`E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`)
  E package name (`com.ouroboros.mobile`). Custom scheme
  `ouroboros://oauth-callback` **não funciona** para client tipo
  Android puro.

Se for tipo Android e quiser manter PKCE custom-scheme:
- Criar um client NOVO tipo "Web application" e usar o client_id
  desse novo no `env.json`. Adicionar `https://auth.expo.io/@...`
  e `ouroboros://oauth-callback` em "Authorized redirect URIs".

### Passo 6: clicar em "detalhes do erro" no print do bug

Na tela "Acesso bloqueado" há um link "detalhes do erro". Tap nele
mostra a mensagem técnica exata do Google (algo como
`redirect_uri_mismatch`, `invalid_client`, ou similar). Print isso
e me manda — encurta o diagnóstico drasticamente.

## Validação

1. Após passos 1-5, tentar novamente: app → Configurações → Contas
   Google → Conectar.
2. **PASS:** tela consent aparece pedindo permissão para Calendar
   readonly. Tap "Allow" → volta pro app, "Conectado".
3. **FAIL:** mandar print da nova tela de erro + detalhes do erro.

## Anti-débito

Quando v1.0 for publicada em Production e tiver >100 usuários,
abrir Q24 — OAuth verification process com Google (precisa privacy
policy hospedada, terms of service, vídeo de demo, etc.). Por ora
fica em Testing.
