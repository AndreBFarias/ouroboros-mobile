# Setup da Credencial do Spotify

Passo a passo para qualquer pessoa que use o aplicativo, não só para quem o
escreveu. O código está pronto e testado; falta a credencial, que só você pode
criar porque exige login na sua conta.

Você precisa da sua própria porque o Spotify limita a cinco contas quem usa um
mesmo código em Development mode. Uma credencial emprestada seria recusada por
eles, sem dizer o motivo.

Enquanto você não fizer isso, o aplicativo funciona por inteiro — a integração
do Spotify fica desligada, e diz na tela que está desligada.

Tudo verificado em `src/lib/integracoes/spotify/oauth.ts` nesta data.

---

## O que o app precisa

| Item | Valor exato | Onde é lido |
|---|---|---|
| Onde você cola o código | Configurações → Credenciais próprias | `getClientIdSpotify()` |
| Redirect URI (dev-client e release) | `ouroboros://oauth-spotify-callback` | `pickClientId()` |
| Client secret | **nenhum** — o fluxo é PKCE | — |

Escopos que o app solicita (`SPOTIFY_SCOPES`), todos de leitura:

```
user-read-currently-playing
user-read-recently-played
user-top-read
playlist-read-private
```

O `scheme` `ouroboros` já está registrado em `app.json`, então não há nada a
mudar no app depois de obter a credencial.

---

## Passo 1 — criar o app no Dashboard

1. Entre em <https://developer.spotify.com/dashboard> com sua conta Spotify.
2. Crie um app novo. Nome e descrição são livres (algo como "Ouroboros" serve;
   não precisa mencionar nada além disso).
3. No campo de **Redirect URI**, adicione **exatamente** esta linha, sem barra
   no final e sem espaço:

   ```
   ouroboros://oauth-spotify-callback
   ```

   Isto é o ponto onde mais se erra. O Spotify compara a URI caractere por
   caractere com a que o app envia; qualquer diferença resulta em
   `INVALID_CLIENT: Invalid redirect URI` na tela de autorização.
4. Em qual API/SDK você vai usar, marque a opção de **Web API**.
5. Salve.

## Passo 2 — copiar o Client ID

No painel do app criado, copie o **Client ID**. É uma string hexadecimal de 32
caracteres.

**Não** copie o Client Secret. O fluxo é PKCE e o app não usa secret — guardar um
secret num aplicativo distribuído seria expô-lo, e o código não tem onde recebê-lo.

## Passo 3 — colar o código no aplicativo

Desde a decisão P4 (2026-09-08) o código entra pelo próprio aplicativo, e não
mais por arquivo no repositório:

1. Abra **Configurações**.
2. Na seção Pessoa, toque em **Credenciais próprias**.
3. Cole o Client ID no campo do bloco **Spotify** e toque em **Guardar**.

O valor fica no armazenamento protegido do aparelho. Não entra no pacote do
aplicativo, não vai para o repositório, não vai para o Vault e sai junto se você
desinstalar.

A tela avisa, sem bloquear, quando o código colado não tem a forma esperada de
32 caracteres — costuma significar que a cópia veio pela metade.

## Passo 4 — validar

Volte a **Integrações**. O card do Spotify sai de "Sem código" e passa a
convidar a conectar a conta.

A validação de ponta a ponta (autorizar de verdade e ver a conta conectada)
precisa de dev-client no celular, porque o redirect por scheme custom não
funciona no navegador.

---

## Se algo falhar

| Sintoma | Causa provável |
|---|---|
| `INVALID_CLIENT: Invalid redirect URI` | Redirect URI do Dashboard difere de `ouroboros://oauth-spotify-callback` |
| Card do Spotify segue em "Sem código" | O campo em Configurações → Credenciais próprias está vazio |
| `invalid_grant` no refresh | Autorização revogada em <https://www.spotify.com/account/apps/> — reconectar no app |
| Navegador abre e não volta ao app | Esperado no navegador; o scheme custom só resolve em dev-client ou release |

---

## Nota sobre o YouTube

O YouTube **não** precisa de credencial nova do Spotify: ele reusa a credencial
do Google, que você cadastra no bloco vizinho da mesma tela, seguindo
[`OAUTH-SETUP.md`](OAUTH-SETUP.md). Um código do Google atende Agenda, backup no
Drive e YouTube de uma vez, porque os três vivem no mesmo projeto do Cloud
Console.
