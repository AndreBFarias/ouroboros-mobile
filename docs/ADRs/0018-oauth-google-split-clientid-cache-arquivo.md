# ADR-0018 — OAuth Google: split clientId, cache em arquivo, escopo mínimo

```
STATUS:     Aceito
DATA:       2026-05-02
SPRINTS:    M37.1 (leitura), M37.2 (escrita)
ESTENDE:    ADR-0007 (Zero Telemetria, Zero Analytics)
RELACIONADO: A20 (SecureStore limit), A21 (split clientId Expo Go vs custom-scheme)
```

## Contexto

A v1.0 de Ouroboros Mobile precisa integrar com Google Calendar
(leitura em M37.1, escrita em M37.2) sem servidor próprio,
mantendo a Regra de Zero Telemetria (ADR-0007). Tokens OAuth
ficam só no dispositivo. Durante o teste de auto-implementação
da spec original M37 em 2026-05-02, um agente independente
identificou 12 buracos técnicos, dos quais os 4 mais graves são
endereçados aqui.

## Decisão 1 — Split de clientId por ambiente

### Problema

`expo-auth-session` em Expo Go usa proxy `https://auth.expo.io/...`
porque scheme custom não está registrado. Em dev-client e release
APK, o redirect `ouroboros://oauth-callback` funciona nativamente.
Usar um único clientId quebra em produção com
`redirect_uri_mismatch`.

### Decisão

Manter **dois clientId Web/Android distintos** no Google Cloud
Console:

| Ambiente | clientId tipo | Redirect URI | Env var |
|---|---|---|---|
| Expo Go (dev) | OAuth Web | `https://auth.expo.io/@<owner>/ouroboros-mobile` | `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` |
| dev-client + release APK | OAuth Android | `ouroboros://oauth-callback` (gerado pelo package + SHA-1) | `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` |

Detecção em runtime via `Constants.appOwnership` (`'expo'` →
proxy; `'standalone'`/`'guest'` → custom-scheme). Implementação
em `src/lib/services/googleAuthFlow.ts::pickClientId()`.

### Consequências

- Setup Google Cloud manual exige criar 2 clientId (documentado
  em `docs/SETUP-OAUTH-GOOGLE.md`).
- Build de release exige SHA-1 do keystore production registrado
  no clientId Android. Sem isso, OAuth falha no APK distribuído.
- Env vars `EXPO_PUBLIC_*` são embedded no bundle (não secret),
  o que é OK porque clientId OAuth é público por design (security
  vem do redirect URI restrito).

## Decisão 2 — Cache de eventos em arquivo, não SecureStore

### Problema

`expo-secure-store` Android tem **limite ~2KB por valor**
(EncryptedSharedPreferences). 30 dias de eventos do Calendar
podem facilmente passar disso, com `setItemAsync` falhando ou
truncando silenciosamente (A20 do BRIEF).

### Decisão

Tokens OAuth (access + refresh + email + expira) — pequenos —
ficam em SecureStore sob `ouroboros.google.v1` (chave única,
serialização compacta).

Cache de eventos vai para arquivo no Vault sob
`media/cache/agenda-<pessoa>.json`. Estrutura:

```json
{
  "geradoEm": 1746234000000,
  "ttlMin": 60,
  "eventos": [
    { "id": "...", "titulo": "...", "inicio": "...", "fim": "...", "local": "...", "descricao": "..." }
  ]
}
```

Helpers em `src/lib/services/calendarCache.ts`:
- `salvarCacheEventos(vaultRoot, pessoa, eventos)`
- `lerCacheEventos(vaultRoot, pessoa)`
- `cacheEstaFresco(geradoEm, ttlMin = 60)`

### Consequências

- Cache aparece no desktop via Syncthing — bonus de
  introspecção.
- Cache não é encriptado em repouso (depende do device), mas só
  contém metadados de eventos do calendar (já potencialmente
  sincronizados via Syncthing entre 4 nós no protocolo Ouroboros
  do usuário). Privacidade preservada porque pasta canônica está
  isolada.
- Stale-while-revalidate: se offline, mostra cache antigo com
  banner; quando volta online, refresh e atualiza.

## Decisão 3 — Escopo mínimo, escalado por sprint

### Problema

Pedir escopo `https://www.googleapis.com/auth/calendar` (full
read+write+delete em todos os calendars) é desnecessário para
M37.1 (que só lê eventos). Princípio de menor privilégio.

### Decisão

| Sprint | Escopo OAuth | Permite |
|---|---|---|
| M37.1 | `calendar.events.readonly` | Listar eventos do calendar primary |
| M37.2 | `calendar.events` | Listar + criar + deletar eventos |

Subir escopo de `readonly` → `events` exige reconsentimento
(Google obriga re-prompt). M37.2 trata isso explicitamente via
banner "Reautorize para criar eventos".

### Consequências

- Usuário vê 2 prompts ao longo da vida do app (uma vez por
  upgrade de escopo).
- Store `useGoogleAuth.contas[pessoa].escoposConcedidos: ['readonly' | 'write']`
  rastreia o estado.

## Decisão 4 — Sem servidor próprio, sem proxy próprio

### Problema

Implementações OAuth de exemplo geralmente sugerem backend para
guardar refresh token e fazer refresh server-side. Isso violaria
ADR-0007 (Zero Telemetria) e adicionaria infra para manter.

### Decisão

Tudo client-side:
- Refresh token vive em SecureStore.
- Refresh acontece localmente via POST direto a
  `oauth2.googleapis.com/token`.
- Revogação local via POST a
  `oauth2.googleapis.com/revoke`.
- Sem servidor próprio.
- Sem analytics, sem crash reporting (já vetado por ADR-0007).

### Consequências

- Refresh token Google **não expira** até revogado pelo usuário
  (em myaccount.google.com/permissions). Backup com root extrai
  o token — mesma postura de ADR-0007 sobre privacidade
  device-bound.
- Se usuário revogar externamente, próximo `refreshIfNeeded`
  recebe `400 invalid_grant`. Store chama `marcarInvalido`,
  zera tokens da conta, banner "Reconecte sua conta Google" na
  Agenda.

## Decisão 5 — Tratamento explícito de erros HTTP

```ts
// Em calendarApi.ts:
if (res.status === 401) { useGoogleAuth.getState().marcarInvalido(pessoa); throw new ApiError('invalido'); }
if (res.status === 403) { throw new ApiError('quota', { detalhe: await res.text() }); }
if (res.status === 429) { await backoffExponencial(retryAfter); /* retry uma vez */ }
if (res.status >= 500) { /* retry 1x; se falhar de novo, throw 'erro_google' */ }
```

UI em `app/agenda.tsx` reage por estado:
- `invalido` → banner reconectar.
- `quota` → toast "Limite Google atingido. Tente em 1 minuto."
- `erro_google` → toast "Erro ao buscar eventos. Tente novamente."

## Alternativas consideradas

- **`@react-native-google-signin/google-signin`**: GoogleSignIn
  oficial. Funciona bem mas força módulo nativo (não roda em web)
  e usa flow proprietário que é caixa-preta. `expo-auth-session`
  é padrão OAuth, transparente, e valida em testes via mock
  trivial.
- **Backend próprio com token storage**: rejeitado por ADR-0007.
- **Cache em SQLite (`expo-sqlite`)**: overkill para um JSON de
  ~30 eventos. Arquivo é mais simples e legível por humano via
  Obsidian.
- **Pedir escopo `calendar` full direto em M37.1**: rejeitado por
  princípio de menor privilégio. Custo: 1 prompt extra ao usuário
  em M37.2.

## Validação

- A21 documentada no BRIEF §4.
- A20 documentada no BRIEF §4.
- Spec M37.1 referencia este ADR em §9.
- Spec M37.2 referencia este ADR em §9.
- Setup manual documentado em `docs/SETUP-OAUTH-GOOGLE.md`
  (criado em M37.1).
- Testes em `tests/lib/services/calendarApi.test.ts` cobrem
  401/403/429/5xx.
- ADR-0007 ganha link cruzado para esta ADR na próxima edição.

## Adendo 2026-05-05 — env.json em vez de env vars EXPO_PUBLIC_*

Na execução real de M37.1, o dono do projeto criou um único OAuth
client tipo **Desktop/Installed** no Google Cloud Console e salvou
o JSON original em `env.json` (raiz, gitignored). Decisão durol:
o código lê `env.installed.client_id` em runtime via
`import env from '../../env.json'` em vez de
`process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`.

**Motivos:**

1. **Privacidade efetiva.** Env vars `EXPO_PUBLIC_*` são embedded
   no bundle JS do build, então ficam visíveis em qualquer extração
   do APK. `env.json` gitignored mantém o `client_id` longe do git
   e do bundle quando o build for feito com `--no-bundler` em
   ambiente sem o arquivo.
2. **Simplicidade.** Um único `client_id` Desktop cobre Expo Go
   (proxy `auth.expo.io`) e dev-client/release (custom scheme
   `ouroboros://oauth-callback`) porque `expo-auth-session` usa
   o mesmo `client_id` em ambos os fluxos quando combinado com
   `makeRedirectUri` que adapta por ambiente.
3. **Setup do dono já feito.** `client_id` válido já está em
   `env.json`; SHA-1 do keystore release/dev (mesmo) cadastrado.
4. **Fallback futuro.** Se Google rejeitar mismatch e for preciso
   2 clients (Web + Android), basta estender `pickClientId()` para
   ler `env.installed.client_id` + um campo opcional
   `env.android.client_id` futuro. Mudança backward-compat.

**Implicação técnica:**

- A Decisão 1 do ADR (split clientId) **continua válida
  conceitualmente** (detecção via `Constants.appOwnership`,
  `makeRedirectUri` por ambiente), mas operacionalmente a v1.0
  passa um único `clientId` em ambos os ramos.
- A2 do BRIEF §4 (split clientId) continua marcada como
  armadilha conhecida; só não é mais bloqueante na v1.0.
- Setup detalhado em `docs/SETUP-OAUTH-GOOGLE.md`.

## Adendo 2026-07-11 — M37.2 escrita: idempotência + atualização otimista

Entrega da escrita (criar / deletar evento) pela rota `/agenda`.
Detalha três pontos que a Decisão 3 deixou em aberto.

### Escopo escalado — implementação real

- A store passou a rastrear o escopo por conta em
  `useGoogleAuth.contas[pessoa].escoposConcedidos`, tipado como um
  **valor único** `'readonly' | 'write'` (opcional), não um array como
  a Decisão 3 sugeria — o nível é mutuamente exclusivo, não uma lista.
  O campo é derivado da string `scope` que o Google devolve no token
  (`escopoCalendarDaResposta`).
- `autenticar()` (conexão inicial) pede `calendar.events.readonly` →
  `escoposConcedidos: 'readonly'`. O novo
  `autenticarComEscopoEscrita(pessoa)` reexecuta o flow PKCE pedindo
  `calendar.events` (read+write) → `'write'`. Google obriga
  reconsentimento no browser; **não há upgrade silencioso**.
- Contas conectadas antes de M37.2 não trazem o campo (`undefined`);
  a UI trata `undefined` como readonly e mostra o banner "Reautorize
  para criar eventos". O FAB verde "Novo evento" só aparece com escopo
  `write`.

### Idempotência da criação

- `criarEvento` gera um **id de cliente base32hex** (`gerarEventoId`,
  alfabeto `0-9a-v`, 26 chars — dentro das regras do Calendar API para
  ids gerados pelo cliente) e o envia no corpo do POST. Um retry interno
  (5xx/429) **reusa o mesmo id**, então o Google deduplica: a segunda
  inserção com o mesmo id volta **409**, que mapeamos para
  `ApiError('conflito')` em vez de criar duplicata.
- Double-tap no botão "Criar" é coberto por `salvando` (botão
  desabilitado durante o I/O). Não há fila offline (decisão M37.2 §9):
  sem rede, o FAB avisa "Sem conexão" e não cria.
- `deletarEvento` é idempotente por natureza: 404/410 (evento já
  removido) resolvem sem erro.

### Atualização otimista do cache

- Após o POST 200/201, o evento entra imediatamente no estado da tela
  **e** no cache local via `adicionarEventoNoCache` (novo helper de
  `calendarCache.ts`), sem esperar o próximo `listarEventos` completo.
  Delete espelha via `removerEventoDoCache`. Ambos são best-effort
  (envoltos em `comTimeout`); falha de cache local não desfaz a escrita
  remota.
- **Nota sobre o path do cache:** a Decisão 2 descrevia
  `media/cache/agenda-<pessoa>.json` (JSON único). Desde M37.1.2 /
  ADR-0019 o cache é **um `.md` por evento** em
  `agenda/<pessoa>/YYYY-MM-DD-<eventId>.md`; os novos helpers delegam a
  `salvarEventoAgenda` / `apagarEventoAgenda` do módulo `vault/agenda`.
  O JSON único da Decisão 2 é legado.

### Roteamento por SeletorPara

O `<SeletorPara>` (M33) no form de novo evento roteia a escrita para a
conta Google da pessoa escolhida: `mim`/`casal` → conta ativa; `outra`
→ a conta do parceiro (exige que esse parceiro esteja conectado com
escopo `write`, senão toast orientando a reautorizar). Em modo sozinho o
seletor fica oculto e o default `mim` (conta ativa) vale.

## Referências

- ADR-0007 (Zero Telemetria, Zero Analytics)
- BRIEF Armadilha A20 (SecureStore limit)
- BRIEF Armadilha A21 (Split clientId)
- Sprint M37.1, M37.2
- [Google OAuth 2.0 Mobile and Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [expo-auth-session docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
