# AUDIT-P2-1-SPOTIFY-YOUTUBE-ENTRADA — dar entrada de usuário ao OAuth de Spotify e YouTube

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (1.400 linhas de OAuth construídas e testadas, inalcançáveis; dois CTAs
            de "conectar" terminam em beco sem saída — a UI promete o que não existe)
DEPENDE:    nenhuma para o ramo YouTube. O ramo Spotify depende de um pré-requisito
            humano: cadastrar `spotify.client_id` em `env.json` (ver §Pré-requisito humano)
ORIGEM:     achados [P2-1] / [NI-16] / [IN-01] da auditoria de 2026-07-28. Encontrado por
            varredura de exports sem consumidor em `src/lib/integracoes/`. Reverificado
            nesta materialização em `main @ b5bf2db`: `grep -rn "autenticar" src app`
            devolve, para Spotify e YouTube, apenas as declarações de tipo e as definições
            dentro dos próprios stores. Nenhum caller de produção.
```

## Problema (feature completa e inalcançável)

Os dois fluxos de OAuth estão inteiros: `oauth.ts`, `client.ts`, `biblioteca.ts` e
`store.ts` de cada integração somam **1.400 linhas** (`wc -l`):

```
  88 src/lib/integracoes/spotify/biblioteca.ts       118 src/lib/integracoes/youtube/biblioteca.ts
 208 src/lib/integracoes/spotify/client.ts           199 src/lib/integracoes/youtube/client.ts
 208 src/lib/integracoes/spotify/oauth.ts            104 src/lib/integracoes/youtube/oauth.ts
 233 src/lib/integracoes/spotify/store.ts            242 src/lib/integracoes/youtube/store.ts
```

A função que inicia a conexão nunca é chamada. `grep -rn "autenticar" --include="*.ts"
--include="*.tsx" src app` devolve, fora do `useGoogleAuth` (que é outra integração, viva
em `app/agenda.tsx:235`):

```
src/lib/integracoes/spotify/store.ts:54:  autenticar: () => Promise<AutenticarSpotifyResultado>;
src/lib/integracoes/spotify/store.ts:101:      autenticar: async () => {
src/lib/integracoes/youtube/store.ts:56:  autenticar: () => Promise<AutenticarYouTubeResultado>;
src/lib/integracoes/youtube/store.ts:100:      autenticar: async () => {
```

Apenas declaração e definição. **Zero call sites.** Consequência direta:
`conta.accessToken` fica `null` para sempre, o ramo "conectado" de
`MidiaSpotifyTab`/`MidiaYoutubeTab` nunca renderiza, e as bibliotecas
(`getRecentlyPlayed`, `getTopTracks`, playlists do YouTube) nunca são consultadas.

### O loop navegacional fechado

O CTA de conexão do Spotify navega, mas não conecta —
`src/components/midia/MidiaSpotifyTab.tsx:255-266`:

```tsx
<Button
  variant="ghost"
  label="Conectar Spotify"
  onPress={() => {
    haptics.light().catch(() => undefined);
    router.push(
      '/settings/integracoes' as Parameters<typeof router.push>[0]
    );
  }}
  accessibilityLabel="conectar spotify"
/>
```

O destino, `app/settings/integracoes.tsx`, tem 581 linhas e menciona Spotify **uma única
vez, num comentário** (`app/settings/integracoes.tsx:4`). É a tela de Health Connect. Ela
termina em `app/settings/integracoes.tsx:576`:

```tsx
        Próximas integrações em sprints futuras.
```

O YouTube fecha o mesmo laço por outro caminho —
`src/components/midia/MidiaYoutubeTab.tsx:121-123`:

```tsx
const irParaIntegracoes = () => {
  router.push('/integracoes');
};
```

`/integracoes` é o hub (`src/components/screens/IntegracoesScreen.tsx`), cujos descritores
de Spotify e YouTube apontam de volta para a mesma tela de Health Connect
(`IntegracoesScreen.tsx:549` e `:572`, ambos `rota: '/settings/integracoes'`). O próprio
comentário em `IntegracoesScreen.tsx:520-527` admite o improviso e cita uma subspec
`R-INT-4.B` que nunca foi materializada:

```tsx
// como ainda nao existe rota dedicada Spotify/YouTube, a v1 abre
// /settings/integracoes onde o usuario ve o status. Subspec
// R-INT-4.B podera criar /settings/spotify e /settings/youtube.
```

Cenário de falha concreto: `pessoa_a` abre um evento, escolhe anexar mídia, vai à aba
Spotify, toca "Conectar Spotify", cai numa tela de Health Connect e lê que as próximas
integrações vêm em sprints futuras. Dois toques até um beco sem saída, com o código de
conexão pronto e testado a um `onPress` de distância.

### Contradição entre documentação e código

`docs/FEATURES-CANONICAS.md:190-195` descreve o picker de biblioteca do YouTube como
entregue ("quando o YouTube está conectado, a aba lista a biblioteca"), mas a condição
"quando o YouTube está conectado" é inalcançável. Já
`docs/FEATURES-CANONICAS.md:484-487` ainda descreve Spotify e YouTube como placeholders
com badge "Em breve" e desabilitados no hub — o que também não bate com o código, que
já lê estado real dos stores. Os dois lados da documentação divergem do código, em
direções opostas.

## Ligar ou remover

**Recomendação: LIGAR**, em dois ramos com bloqueios diferentes.

Justificativa para não remover: o código está completo, coberto por testes, e é um
diferencial declarado do app (anexar a faixa que estava tocando a um evento ou a um
registro de humor). Remover 1.400 linhas funcionais para depois reescrevê-las é o pior
dos dois custos. O que falta é wiring de UI, não engenharia.

- **YouTube — ligar agora.** Não há bloqueio externo. O `client_id` é o mesmo do Google
  já presente em `env.json` (`src/lib/integracoes/youtube/oauth.ts:20-21`:
  *"mesmo env.json.android.client_id usado pelo Calendar"*). A quebra é 100% wiring.
- **Spotify — ligar atrás de pré-requisito humano.** Ver abaixo.

### Pré-requisito humano (bloqueia só o ramo Spotify)

`src/lib/integracoes/spotify/oauth.ts:74-78` lê uma chave que não existe:

```ts
const cid = env.spotify?.client_id;
// ...
'env.json sem spotify.client_id. Cadastre em https://developer.spotify.com/dashboard.'
```

Verificado: `env.json` (gitignored) tem apenas `android.{client_id, project_id, auth_uri,
token_uri, auth_provider_x509_cert_url}`; `env.json.example` tem exatamente o mesmo
conjunto. A chave `spotify` não existe em nenhum dos dois.

Ligar o Spotify exige que o dono cadastre um app no dashboard do Spotify e adicione
`spotify.client_id` ao `env.json` local. Sem esse passo, o botão só pode renderizar o erro
já previsto pelo código (`pickClientIdSeguro` devolve `{ erro }` em vez de lançar,
`oauth.ts:112-113`). O `env.json.example` também precisa ganhar a chave com valor stub,
para que o CI e um clone novo saibam que ela é esperada.

## Escopo (mínimo)

1. Criar a entrada real de conexão. Recomendação: **seções "Spotify" e "YouTube" em
   `app/settings/integracoes.tsx`**, substituindo o rodapé "Próximas integrações em
   sprints futuras." (`:565-577`). Motivo de preferir isto a criar `/settings/spotify` e
   `/settings/youtube`: os dois CTAs existentes já apontam para lá (direto ou via hub), e
   a tela já é o destino canônico de "detalhe de integração". Zero rota nova, zero
   descritor a reescrever.
2. Ligar o botão de cada seção a `useYouTubeAuth.getState().autenticar()` e
   `useSpotifyAuth.getState().autenticar()`, com os três estados que os stores já
   modelam: desconectado, conectado (mostrar `ultimaConexao`) e `invalido` (reconectar).
   Incluir a ação de desconectar.
3. Ramo Spotify: quando `pickClientIdSeguro` devolver `{ erro }` (chave ausente em
   `env.json`), renderizar estado explícito de indisponibilidade em vez de um botão que
   falha no toque. Adicionar `"spotify": { "client_id": "CHANGE_ME-stub-for-ci" }` a
   `env.json.example`.
4. Corrigir os descritores do hub (`IntegracoesScreen.tsx:520-577`): trocar o comentário
   que cita a subspec `R-INT-4.B` inexistente pela referência a esta sprint, e apontar a
   `rota` para a âncora correta da tela de integrações.
5. Atualizar `docs/FEATURES-CANONICAS.md`: §2.4 (Spotify/YouTube deixam de depender de
   uma condição inalcançável) e a listagem do hub em `:484-486` (deixam de ser
   "placeholder, badge Em breve"). Registrar explicitamente que o Spotify depende de
   credencial local do dono.
6. Caso E2E em `tests/e2e/playwright/audit-p2-1-spotify-youtube-entrada.e2e.ts`, copiado
   de `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento, não de presença:
   partindo da aba de mídia, o CTA "Conectar YouTube" leva a uma tela onde existe um
   controle de conexão acionável (e não ao texto "Próximas integrações em sprints
   futuras"). O OAuth real não roda no Gauntlet web; o assert é sobre o caminho de
   navegação chegar a um controle vivo.
7. NÃO-objetivo: criar as rotas dedicadas `/settings/spotify` e `/settings/youtube`.
8. NÃO-objetivo: implementar o card passivo de "tocando agora" (`getNowPlaying`,
   `src/lib/integracoes/spotify/client.ts:143`, também sem consumidor). Fica registrado
   como órfão remanescente após esta sprint.
9. NÃO-objetivo: tratar `SpotifyTokenExpiradoError`
   (`src/lib/integracoes/spotify/client.ts:100`) de forma especializada; o ramo
   `invalido` do store já cobre o caso pela via genérica.

## Proof-of-work

```bash
# 1. Antes: zero callers de autenticar fora dos stores
grep -rn "autenticar" --include="*.ts" --include="*.tsx" src app \
  | grep -v googleAuth | grep -v "app/agenda.tsx"     # so' as definicoes nos 2 stores

# 2. Depois: pelo menos 1 call site de producao para cada store
grep -rn "useSpotifyAuth.getState().autenticar\|useYouTubeAuth.getState().autenticar" \
  --include="*.tsx" src app                            # >= 1 hit cada

# 3. A frase-beco deixou de ser o fim da tela
grep -n "Proximas integracoes em sprints futuras\|Próximas integrações em sprints futuras" \
  app/settings/integracoes.tsx                         # 0 hits

# 4. env.json.example declara a chave nova
python3 -c "import json;print('spotify' in json.load(open('env.json.example')))"   # True

# 5. Gates do projeto
npx tsc --noEmit                                       # exit 0
npm test --silent                                      # baseline nao regride
./scripts/smoke.sh                                     # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: evento -> anexar midia -> aba YouTube -> "Conectar YouTube"
# esperado: chega num controle de conexao acionavel, nao no rodape "sprints futuras"
# screenshots em docs/sprints/AUDIT-P2-1-SPOTIFY-YOUTUBE-ENTRADA-screenshots-gauntlet/
```

Pré-requisito humano a confirmar antes de declarar o ramo Spotify concluído: `env.json`
local com `spotify.client_id` real cadastrado no dashboard do Spotify.

## Commit

```
feat: audit-p2-1 entrada de usuario para oauth spotify e youtube em settings integracoes
```
