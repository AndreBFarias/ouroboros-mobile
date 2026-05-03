# Sprint M37 — Integração Google Calendar via OAuth (leitura + escrita)

```
DEPENDE:    M27 (menu lateral); M28 (rotuloPessoa); M25 (loader)
BLOQUEIA:   M40 (Home pode mostrar próximos eventos do calendário)
ESTIMATIVA: 10-12h (pode quebrar em M37.1 leitura + M37.2 escrita)
```

## 1. Objetivo

Permitir que o usuário (e o casal) conecte sua conta Google e
visualize agenda dos próximos 30 dias na nova rota `/agenda`. Permite
**criar evento** no Google Calendar pelo app. Tokens OAuth ficam só
no SecureStore local (zero servidor próprio).

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/googleAuth.ts`
  — store zustand persist:
  ```ts
  interface GoogleAuthState {
    contas: {
      pessoa_a: { accessToken: string | null; refreshToken: string | null; expiraEm: number; email: string | null };
      pessoa_b: { ... };
    };
    autenticar: (pessoa: PessoaAutor) => Promise<boolean>;
    revogar: (pessoa: PessoaAutor) => Promise<void>;
    refreshIfNeeded: (pessoa: PessoaAutor) => Promise<string | null>;
  }
  ```
  SecureStore (`ouroboros.google.v1`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/services/calendarApi.ts`
  — wrappers fetch:
  ```ts
  export async function listarEventos(token: string, de: Date, ate: Date): Promise<EventoCalendar[]>
  export async function criarEvento(token: string, evento: NovoEventoInput): Promise<EventoCalendar>
  export async function deletarEvento(token: string, id: string): Promise<void>
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/agenda.tsx`
  — rota raiz `/agenda`:
  - Header "Agenda" + chip pessoa (Eu / Vitória / Casal=união).
  - Calendar grid mensal (mesma lib `react-native-calendars` ou
    custom — aproveitar `<HumorHeatmap>` se possível).
  - Lista de eventos do dia selecionado.
  - FAB "Novo evento" → sheet com form.
  - Empty state: "Conecte seu Google Calendar" + botão sign-in.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/settings/contas-google.tsx`
  — sub-tela: lista contas conectadas + revogar + reconectar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/agenda/CalendarGrid.tsx`
  — calendário mensal com dots por dia.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/agenda/SheetNovoEvento.tsx`
  — form: título / data hora início / hora fim / descrição /
  `<SeletorPara>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/services/calendarApi.test.ts`
  — fetch mockados.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/agenda.test.tsx`
  — render por estado (não conectado / conectado / com eventos).

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — plugin `expo-auth-session` + scheme `ouroboros://oauth-callback`:
  ```json
  "plugins": [
    ...,
    [
      "expo-auth-session",
      { "scheme": "ouroboros" }
    ]
  ]
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/package.json`
  — adicionar deps:
  - `expo-auth-session`
  - `expo-web-browser`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/index.ts`
  — exportar `useGoogleAuth`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuLateral.tsx`
  — item "Agenda" na seção Ver (M27 + M36 já consolidaram).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/settings/index.tsx`
  — adicionar `<LinkSubTela>` "Contas Google" → `/settings/contas-google`.

### Arquivos NÃO modificados

- `app/calendario.tsx` (Calendário de Conquistas, M11.5) — fica
  como rota separada, **não substituída**. Calendário = retrospectiva
  (passado); Agenda = prospectiva (futuro).

## 3. APIs reutilizáveis

- `expo-auth-session` — OAuth flow.
- `expo-web-browser` — abrir browser para OAuth.
- `<SeletorPara>` (M33) — pessoa destino do evento.
- `secureStorage` adapter.
- `usePessoa.tipoCompanhia` — esconder seletor pessoa se sozinho.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **app.json:** plugin `expo-auth-session` novo.
- **package.json:** 2 deps novas (`expo-auth-session`,
  `expo-web-browser`).
- **Stores barrel:** `useGoogleAuth` exportada.
- **Rota raiz nova:** `/agenda`.
- **Sub-rota:** `/settings/contas-google`.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded. Email do user
  vem da resposta OAuth (runtime).
- **Privacidade absoluta**: tokens só em SecureStore local. Sem
  servidor próprio, sem analytics, sem proxy. Documentar em
  `docs/ADRs/0007-zero-telemetria.md` se necessário (ADR existente).
- Sentence case + acentuação PT-BR.
- TS strict.
- OAuth scopes mínimos: `https://www.googleapis.com/auth/calendar`
  (full read/write). Não pedir Drive nem Gmail.
- Cache local de eventos no SecureStore para offline (TTL 1h).

## 5. Procedimento sugerido

1. **Setup OAuth**:
   - Criar projeto Google Cloud (manual, fora do código): client OAuth
     Android + iOS + Web.
   - Documentar `clientId` em `docs/SETUP-OAUTH-GOOGLE.md` (não
     comitar secrets).
2. Implementar `useGoogleAuth` store.
3. Implementar fluxo OAuth com `expo-auth-session`:
   ```ts
   const [request, response, promptAsync] = useAuthRequest({
     clientId: GOOGLE_OAUTH_CLIENT_ID,
     scopes: ['https://www.googleapis.com/auth/calendar'],
     redirectUri: makeRedirectUri({ scheme: 'ouroboros' }),
   }, discovery);
   ```
4. Implementar `calendarApi.ts` (fetch v3).
5. Criar `<CalendarGrid>` (custom ou wrappa `react-native-calendars`).
6. Criar `<SheetNovoEvento>` form.
7. Criar `app/agenda.tsx` integrando tudo.
8. Criar `app/settings/contas-google.tsx`.
9. Plugar em MenuLateral + Settings.
10. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m37-export && rm -rf /tmp/m37-export

# Manual:
# 1. Menu lateral > Agenda > "Conecte sua conta" > OAuth completa
# 2. Eventos do dia atual aparecem
# 3. Tap FAB > Novo evento "Reunião" 14:00-15:00 > salvar
# 4. Ver evento criado no app E em https://calendar.google.com
```

## 7. Commit

```
feat: m37 google calendar integracao oauth leitura e escrita
```

## 8. Checkpoint visual

4 screenshots Nível A em `docs/sprints/M37-screenshots/`:
- `A-agenda-empty-conectar.png` — empty state com botão.
- `A-agenda-mes.png` — calendário mensal com dots.
- `A-agenda-evento-dia.png` — lista do dia selecionado.
- `A-novo-evento-sheet.png` — form de criação.

## 9. Decisões tomadas

- **Leitura + escrita** (vs só leitura): usuário confirmou que quer
  poder criar evento no Calendar pelo app.
- **2 contas Google (pessoa_a + pessoa_b)**: cada um do casal
  autentica separadamente. Modo "Casal" no chip pessoa une as duas
  agendas.
- **Sem servidor próprio**: tokens SecureStore. Refresh token
  permite renovar sem reabrir browser.
- **`expo-auth-session`** vs `@react-native-google-signin/google-signin`:
  primeiro é mais leve e funciona em web (futuro). Pode trocar
  depois se necessário.
- **Calendar separado de agenda**: `app/calendario.tsx` (M11.5) =
  conquistas passadas; `app/agenda.tsx` (M37) = compromissos
  futuros. Coexistem.
- **Quebrar em M37.1 (leitura) + M37.2 (escrita)**: opcional. Se
  estimativa exceder 10h, executar em duas iterações.
- **Cache local TTL 1h**: equilibra offline-first com
  freshness — usuário ainda vê eventos sem rede pelos próximos 60min.

Sprint pronta para execução sem perguntas pendentes.
