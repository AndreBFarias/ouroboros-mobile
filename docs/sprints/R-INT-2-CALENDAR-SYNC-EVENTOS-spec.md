# R-INT-2-CALENDAR-SYNC-EVENTOS — Puxar eventos do Google Calendar pra Tela Hoje

**Tipo:** feature (integracao read-only)
**Prioridade:** P1 (alto valor — usuario ja conectou conta)
**Estimativa:** 1d
**Fase:** 3
**Depende de:** Q0/Q22.B (OAuth Google Calendar ja entregue — `557319f`, `0148a1d`)

## Contexto

OAuth Google Calendar entregue na Onda Q (scope `calendar.events.readonly`). Loja de token em SecureStore. Cliente HTTP em `src/lib/integracoes/google/calendar.ts` (ja existe? verificar). Falta: puxador periodico que abastece a secao "Proximos" da Tela Hoje com eventos do Calendar.

R-HOME-2 (Onda 2C.3, `249f91e`) ja mescla "agenda + alarmes" em `Proximos`, mas atualmente Agenda vem so de mock ou helper interno. Esta sprint faz Agenda vir do **Google Calendar real**.

## Objetivo

Criar `src/lib/integracoes/google/calendarSync.ts`:

```ts
export interface EventoCalendar {
  id: string;
  titulo: string;
  inicio: string;   // ISO 8601
  fim: string;
  local?: string;
  organizador?: string;
  origem: 'google_calendar';
}

export async function sincronizarEventosCalendar(
  vaultRoot: string,
  agora: Date,
  janelaDias: number = 7
): Promise<{ novos: number; total: number }>;
```

Logica:
1. Token Google via store existente (`useGoogleCalendarAuth`).
2. Request `GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=now&timeMax=now+7d&singleEvents=true&orderBy=startTime`.
3. Para cada evento, persistir em `agenda/<data>-<slug>.md` (idempotencia via event.id).
4. Helper `mesclarAgendaAlarmes` (R-HOME-2) ja le esses arquivos — sem mudanca no consumer.

## Disparo

Adicionar `sincronizarEventosCalendar` na lista do scheduler **separadamente** do `executarAutopullHC` (HC e Calendar tem ciclos de auth/refresh diferentes). Ou: criar novo scheduler `executarAutopullIntegracoes` que cobre Calendar/Spotify/YouTube juntos.

**Decisao:** criar `src/lib/integracoes/scheduler.ts` separado do HC. Mesma pattern (allSettled, 1 entry por tipo, tracking ultima sync em SecureStore).

## Escopo

### A. Investigacao obrigatoria

```bash
grep -rn "useGoogleCalendarAuth\|calendar.events" src/lib/integracoes/google/ | head
# Confirma OAuth + cliente disponiveis

grep -n "mesclarAgendaAlarmes" src/lib/agenda/ src/components/  # consumer R-HOME-2
ls src/lib/integracoes/google/calendarSync.ts  # esperado nao existe antes
```

### B. Implementacao

1. `src/lib/schemas/agenda_evento.ts` (novo se nao existe).
2. `src/lib/vault/agenda.ts` (novo writer).
3. `src/lib/integracoes/google/calendarSync.ts` (novo).
4. `src/lib/integracoes/scheduler.ts` (novo orquestrador).
5. `app/_layout.tsx`: chamar scheduler integracoes no useEffect (gate por `featureToggles.googleCalendarSync`).

### C. Testes

- `tests/lib/integracoes/google/calendarSync.test.ts`: mocka fetch, valida shape evento + idempotencia.

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas,vault,integracoes/google}/calendar*`, `src/lib/integracoes/scheduler.ts`, `app/_layout.tsx` (entry hook), tests.

**Nao pode tocar:** OAuth flow (Q22.B), HC bridge, schemas nao relacionados, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live: criar evento "Reunião 14h" no Google Calendar via web, abrir Ouroboros,
# ver evento na secao "Proximos" da Tela Hoje + arquivo agenda/<data>-reuniao.md
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde.
3. Hash + build APK.
4. Live: evento real do Calendar aparece em Proximos.

## Referencias

- OAuth Q22.B: `Q22-OAUTH-spec.md`
- Helper merge agenda+alarmes: R-HOME-2 (`249f91e`)
- Calendar API: https://developers.google.com/calendar/api/v3/reference/events/list
