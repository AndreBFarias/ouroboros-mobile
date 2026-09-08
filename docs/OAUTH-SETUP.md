# OAuth Setup — Ouroboros Mobile

> Documento único e canônico de OAuth Google Calendar. Consolida o
> setup inicial no Cloud Console (`SETUP-OAUTH-GOOGLE.md` arquivado),
> o checklist de validação (`I2-OAUTH-CHECKLIST.md` arquivado) e a
> história das 4 camadas de fix descobertas na Onda Q22.B
> (2026-05-13).
>
> Sprint dona: AUDIT-T3-DX (2026-05-15).

## Pré-requisitos

- Uma conta Google autorizada como Test User, com acesso ao Google
  Cloud Console.
- Projeto Cloud `protocolo-ouroboros` (ou similar) criado.
- O aplicativo instalado. Desde a decisão P4 (2026-09-08) o código do
  cliente entra por **Configurações → Credenciais próprias**, dentro do
  aplicativo, e não por arquivo no repositório.
- `app.json` com `expo.android.package = "com.ouroboros.mobile"`.
- Keystore EAS canônico com SHA-1
  `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`.

## Passo 1 — Cloud Console (client iOS)

A v1.0 usa **OAuth client tipo iOS** (não Android, não Web). Decisão
durável da Onda Q22.B descrita no Troubleshooting abaixo.

1. Acessar https://console.cloud.google.com com a conta Google
   autorizada como Test User.
2. Confirmar projeto `protocolo-ouroboros` (ou criar via
   `Selector de projeto → New Project`).
3. `APIs & Services → Library → Google Calendar API → Enable`.
4. `APIs & Services → OAuth consent screen`:
   - User Type: **External**.
   - App name: `Ouroboros`.
   - User support email: a conta Google autorizada como Test User.
   - Developer contact: idem.
   - Status: **Testing** (não Production).
   - Aba **Test users**: adicionar a conta Google autorizada como Test
     User (e qualquer outro e-mail que vá logar no app). Sem isso, o
     usuário externo
     recebe `Access blocked: ouroboros has not completed verification`.
   - Aba **Scopes**: adicionar
     `https://www.googleapis.com/auth/calendar.events.readonly`
     (mínimo M37.1). Futuro escrita M37.2:
     `https://www.googleapis.com/auth/calendar.events`.
5. `APIs & Services → Credentials → Create Credentials → OAuth client ID`:
   - **Application type: iOS** (não Android, não Web).
   - Nome: `Ouroboros Mobile iOS`.
   - **Bundle ID**: `com.ouroboros.mobile` (idêntico ao
     `expo.android.package` do `app.json`).
   - Salvar. O client_id final tem formato
     `<numero>-<hash>.apps.googleusercontent.com`.
6. Baixar o JSON do client (botão "Download").

## Passo 2 — Colar o Código no Aplicativo

Do JSON baixado interessa uma linha só: o `client_id`, no formato
`<numero>-<hash>.apps.googleusercontent.com`.

1. Abra **Configurações** no aplicativo.
2. Na seção Pessoa, toque em **Credenciais próprias**.
3. Cole o valor no campo do bloco **Google** e toque em **Guardar**.

Um código só atende **Agenda, backup no Drive e YouTube**, porque os três
vivem no mesmo projeto do Cloud Console.

O valor fica no armazenamento protegido do aparelho (`SecureStore`, pela
store `src/lib/stores/credenciais.ts`). Não entra no pacote do aplicativo,
não vai para o repositório, não vai para o Vault e sai junto na
desinstalação. Não existe `client_secret` a guardar: o fluxo é PKCE, e nele
o `client_id` é público por desenho.

**O que mudou em 2026-09-08.** Antes, o arquivo `env.json` na raiz era
importado de forma estática por `src/lib/services/googleAuthFlow.ts`, o que
tinha duas consequências ruins: clone sem esse arquivo nem empacotava, e
quem instalava o pacote herdava a credencial de outra pessoa — batendo na
allowlist do consent screen sem entender o motivo. Hoje `env.json` não é
lido por nenhum módulo de `src/`, e o aplicativo sobe sem ele.

## Passo 3 — app.json scheme

`app.json` precisa de **dois schemes** (array): o canônico do app +
o reverso-DNS do client iOS para o redirect OAuth.

```json
{
  "expo": {
    "scheme": [
      "ouroboros",
      "com.googleusercontent.apps.<numero>-<hash>"
    ]
  }
}
```

O segundo scheme é literalmente `com.googleusercontent.apps.` +
o prefixo do `client_id` (até antes do `.apps.googleusercontent.com`).
Sem ele, o callback OAuth não encontra rota de retorno e o browser
fica aberto eternamente.

## Passo 4 — `_layout.tsx` maybeCompleteAuthSession

`app/_layout.tsx` precisa chamar `WebBrowser.maybeCompleteAuthSession()`
**top-level**, fora de qualquer hook ou guard, antes de qualquer
`AuthRequest.promptAsync` resolver:

```ts
import * as WebBrowser from 'expo-web-browser';

// Q22.B (2026-05-13): obrigatorio chamar antes de qualquer
// AuthRequest.promptAsync resolver. Sem isso, o callback OAuth
// vaza pro expo-router e exibe "Unmatched Route" em vez de fechar
// o browser + entregar o code pro app.
WebBrowser.maybeCompleteAuthSession();
```

Sem essa chamada top-level, o deep link de callback
(`com.googleusercontent.apps.<id>:/oauthredirect`) vaza pro
`expo-router` e o app mostra "Unmatched Route" em vez de fechar o
browser + entregar o `code`.

## Passo 5 — Keystore EAS em GitHub Secrets

Para que APKs gerados pelo workflow GitHub Actions
(`.github/workflows/build-android-apk.yml`) assinem com a mesma
keystore EAS canônica (e o SHA-1 bata o cadastrado no Cloud
Console), 4 GitHub Secrets precisam estar provisionados:

| Secret | Conteúdo |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 < keystore.jks` (output em 1 linha) |
| `ANDROID_KEYSTORE_PASSWORD` | senha do keystore |
| `ANDROID_KEY_ALIAS` | alias da key (geralmente `releaseKey`) |
| `ANDROID_KEY_PASSWORD` | senha da key |

Exportar do EAS:

```bash
./scripts/exportar_keystore_eas.sh
```

O script lê via `eas credentials` e gera as 4 strings prontas para
colar no GitHub `Settings → Secrets and variables → Actions`.

Workflow steps relevantes (já configurados):
- **Provision keystore**: decodifica `ANDROID_KEYSTORE_BASE64` para
  `android/app/release.keystore`.
- **Patch build.gradle signing**: anexa `signingConfigs.release` ao
  Gradle pós-prebuild.
- **Verify APK signature**: `apksigner verify --print-certs` e
  compara com SHA-1 canônico
  `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`.

Fallback gracioso quando secrets ausentes: build segue com debug
keystore mas OAuth quebra em runtime (SHA-1 não bate).

## Checklist de validação live

Sequência completa no celular real após `pm install -r` do APK:

1. Abrir Ouroboros Mobile. Concluir onboarding (escolher pasta
   Vault, pular biometria se quiser).
2. Settings → Contas Google → **Conectar conta Google**.
3. Tela de consent do Google abre no Chrome Custom Tab.
4. Escolher a conta Google autorizada como Test User.
5. Conceder permissões (`Ver eventos do seu calendário`).
6. Browser fecha automaticamente; app volta a primeiro plano.
7. Settings mostra "Conectado como a conta Google autorizada".
8. Voltar para tab Agenda → eventos do Google Calendar carregam
   (escopo `calendar.events.readonly`).

Se algum passo travar, consultar Troubleshooting.

## Troubleshooting (Q22.B 4 camadas)

A Onda Q22.B (`v1.0.0-alpha-7` → `alpha-11`, 2026-05-13 noite →
2026-05-14 madrugada) descobriu 4 causas raiz independentes do erro
`Erro 400: invalid_request`. As 4 estão fixadas no código atual; este
bloco existe como referência caso o problema reapareça em variantes.

### Camada 1 — Typo SHA-1

**Sintoma**: `invalid_request` ao tap em "Conectar conta Google".

**Causa raiz**: Cloud Console tinha `43` no 4º octeto do SHA-1 em
vez de `B3` (transcrição manual incorreta).

**Fix**: editar SHA-1 no Cloud Console (`Credentials → OAuth client
iOS → Bundle ID + SHA-1 list`) para o valor canônico
`E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C`.

Confirmar via:

```bash
apksigner verify --print-certs builds/<apk> | grep SHA-1
```

### Camada 2 — Tipo OAuth client incompatível

**Sintoma**: `invalid_request` persistindo após Camada 1 fix.

**Causa raiz**: OAuth client tipo **Android** no Cloud Console exige
Google Play Services `signInIntent` (fluxo via SDK Google nativo).
Custom scheme PKCE com `expo-auth-session` **não funciona** com
client Android. Documentado em
https://developers.google.com/identity/sign-in/android/start-integrating

**Fix**: criar **novo OAuth client tipo iOS** com Bundle ID
`com.ouroboros.mobile`. Apesar do nome "iOS", o `expo-auth-session`
PKCE via custom scheme funciona em Android com esse tipo (Google
trata como "client nativo genérico"). Cadastrar o novo `client_id`
em Configurações → Credenciais próprias.

### Camada 3 — Redirect URI custom scheme rejeitado

**Sintoma**: `invalid_request` ou `redirect_uri_mismatch` após
Camada 2 fix.

**Causa raiz**: iOS OAuth clients exigem redirect URI no formato
`com.googleusercontent.apps.<reverse-client-id>:/oauthredirect`,
não o scheme do app (`ouroboros://oauth-callback`).

**Fix**: dois pontos:

1. `app.json` `expo.scheme` vira array com dois entries:
   `["ouroboros", "com.googleusercontent.apps.<id>"]`.
2. `src/lib/services/googleAuthFlow.ts:pickClientId()` deriva
   redirect URI reverso-DNS automaticamente do `client_id`. Não
   hardcoda; lê a credencial cadastrada, em runtime.

### Camada 4 — `maybeCompleteAuthSession` faltando

**Sintoma**: browser abre, usuário concede, browser fica aberto e
mostra "Unmatched Route" em vez de fechar.

**Causa raiz**: `_layout.tsx` não chamava
`WebBrowser.maybeCompleteAuthSession()` top-level. Sem essa call, o
callback OAuth (deep link no scheme novo) vaza pro `expo-router` e
nunca fecha o browser nem entrega o `code` pro app.

**Fix**: adicionar chamada top-level no `app/_layout.tsx`, **fora**
de qualquer hook ou guard, antes de qualquer
`AuthRequest.promptAsync` resolver. Detalhes no Passo 4 acima.

### Outros erros comuns (legacy I2-OAUTH)

| Erro | Causa provável | Fix |
|---|---|---|
| `Access blocked: ouroboros has not completed verification` | E-mail não está em Test Users do consent screen. | Adicionar em `OAuth consent screen → Test users`. |
| `Service disabled` | Calendar API não habilitada no projeto. | `APIs & Services → Library → Google Calendar API → Enable`. |
| `invalid_client` | O código cadastrado não bate com o cliente do Cloud Console. | Comparar o valor em Configurações → Credenciais próprias com `Credentials → OAuth 2.0 Client IDs`. |
| `redirect_uri_mismatch` | Scheme errado em `app.json` ou client tipo errado. | Conferir Camada 2 e 3 acima. |

## Custos

OAuth + Google Calendar API são **gratuitos** no tier free do
Google Cloud. Sem cartão de crédito exigido.

## Persistência de tokens

Após OAuth bem-sucedido:

- Access token + refresh token persistem em `expo-secure-store` na
  chave `ouroboros.google.v1` (M37.1, ADR-0018).
- Cache de eventos em `media/cache/agenda-<pessoa>.json` no Vault
  (Armadilha A20 do BRIEF: SecureStore tem limite ~2KB por valor).
- Privacidade: tokens **só** locais. Sem servidor próprio, sem proxy.
- Settings → Contas Google permite revogar a qualquer momento.

## Histórico de incidentes

| Data | Evento | Sprint |
|---|---|---|
| 2026-05-05 | Setup inicial OAuth com client Desktop type (depois descoberta como inadequada). | M37.1 |
| 2026-05-13 madrugada | Q22.B causa raiz identificada (typo SHA-1 + tipo client errado). | Onda Q |
| 2026-05-13 noite → 2026-05-14 madrugada | Q22.B fix completo em 4 camadas (alpha-7 → alpha-11). | Q22.B |
| 2026-05-13 | Q17.e keystore EAS em GitHub Secrets — desbloqueia OAuth em APKs do CI local. | Q17.e |
| 2026-05-15 | Consolidação deste documento. | AUDIT-T3-DX |

## Rotacionar credenciais

Se o `client_id` precisar ser trocado:

1. Revogar imediatamente no Cloud Console
   (`Credentials → clica no client → Delete`).
2. Criar novo OAuth client iOS (Passo 1) com novo `client_id`.
3. Cadastrar o novo valor em Configurações → Credenciais próprias
   (o botão **Apagar** remove o anterior do aparelho).
4. Atualizar `app.json` `scheme` com novo reverso-DNS (Passo 3).
5. Não precisa mudar keystore nem SHA-1 (são do APK, não do client).
6. Re-build APK ou re-deploy via workflow CI.
