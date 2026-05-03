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

## Referências

- ADR-0007 (Zero Telemetria, Zero Analytics)
- BRIEF Armadilha A20 (SecureStore limit)
- BRIEF Armadilha A21 (Split clientId)
- Sprint M37.1, M37.2
- [Google OAuth 2.0 Mobile and Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [expo-auth-session docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
