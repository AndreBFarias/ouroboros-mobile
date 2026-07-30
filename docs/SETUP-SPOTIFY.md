# Setup da credencial do Spotify

Passo a passo para o dono. O código do cliente já está pronto e testado — falta
apenas a credencial, que só você pode criar porque exige login na sua conta.

Tudo verificado em `src/lib/integracoes/spotify/oauth.ts` nesta data.

---

## O que o app precisa

| Item | Valor exato | Onde é lido |
|---|---|---|
| Chave no `env.json` | `spotify.client_id` | `getClientIdFromEnv()` |
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

## Passo 3 — colocar no `env.json`

O `env.json` fica na raiz do projeto e é **gitignored** (nunca vai para o
repositório). Hoje ele tem só o bloco `android`. Acrescente o bloco `spotify`
irmão dele:

```json
{
  "android": {
    "client_id": "... o que já está aí, não mexer ...",
    "project_id": "...",
    "auth_uri": "...",
    "token_uri": "...",
    "auth_provider_x509_cert_url": "..."
  },
  "spotify": {
    "client_id": "COLE_O_CLIENT_ID_AQUI"
  }
}
```

Atenção à vírgula depois do `}` que fecha o bloco `android` — sem ela o JSON
fica inválido e o app não sobe.

Se preferir, me avise depois de criar o app e eu faço a edição do `env.json`
a partir do valor que você colar aqui — mas lembre que o Client ID não é
segredo crítico (ele aparece na URL de autorização de qualquer forma), então
colar no chat é aceitável se for prático para você.

## Passo 4 — atualizar o exemplo versionado

Isto eu faço, é só me avisar: o `env.json.example` também não tem o bloco
`spotify`, e ele é o arquivo que documenta o formato para quem clonar o
repositório. Vou adicionar com placeholder.

## Passo 5 — validar

Depois do `env.json` preenchido:

```bash
# o app deve parar de reportar 'sem_client_id'
node -e "const e=require('./env.json'); console.log('client_id presente:', !!e.spotify?.client_id, '| tamanho:', e.spotify?.client_id?.length)"
```

A validação de ponta a ponta (autorizar de verdade e ver a conta conectada)
precisa de dev-client no celular, porque o redirect por scheme custom não
funciona no navegador. Faz parte do checkpoint da sprint
`AUDIT-P2-1-SPOTIFY-YOUTUBE-ENTRADA`.

---

## Se algo falhar

| Sintoma | Causa provável |
|---|---|
| `INVALID_CLIENT: Invalid redirect URI` | Redirect URI do Dashboard difere de `ouroboros://oauth-spotify-callback` |
| App reporta `sem_client_id` | `env.json` sem o bloco `spotify`, ou JSON inválido |
| `invalid_grant` no refresh | Autorização revogada em <https://www.spotify.com/account/apps/> — reconectar no app |
| Navegador abre e não volta ao app | Esperado no navegador; o scheme custom só resolve em dev-client ou release |

---

## Nota sobre o YouTube

O ramo YouTube da mesma sprint **não** precisa de credencial nova: ele reusa o
`client_id` do Google que já está no `env.json`. A quebra dele é só de wiring, e
eu resolvo sem depender de você.
