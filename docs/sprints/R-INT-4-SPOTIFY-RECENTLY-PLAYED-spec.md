# R-INT-4-SPOTIFY-RECENTLY-PLAYED — Puxar historico Spotify pra Recap

**Tipo:** feature (integracao read-only)
**Prioridade:** P2
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-4 (`dd37f26` — OAuth PKCE Spotify ja entregue)

## Contexto

OAuth Spotify entregue na Onda 3I.4. Store em `src/lib/integracoes/spotify/store.ts`. Falta puxador que abastece Recap com "Musicas que voce ouviu" no periodo.

## Objetivo

Criar `src/lib/integracoes/spotify/recentlyPlayed.ts`:

```ts
export interface MusicaTocada {
  spotify_track_id: string;
  titulo: string;
  artista: string;
  album: string;
  tocada_em: string;  // ISO 8601
  url: string;
  preview_url?: string;
}

export async function sincronizarMusicasRecentes(
  vaultRoot: string,
  agora: Date,
  limit: number = 50
): Promise<{ novos: number }>;
```

Logica:
1. Token Spotify via store.
2. `GET https://api.spotify.com/v1/me/player/recently-played?limit=50`.
3. Para cada track, persistir em `spotify/<data>-<track-id>.md` (idempotencia).
4. Recap secao "Musicas" agrega esses arquivos por periodo (semana/mes/ano).

## API auxiliar

`SpotifyTrackSchema` + writer `escreverSpotifyTrack`. Modal Recap mostra timeline ("Voce ouviu X musicas essa semana, top artistas: A, B, C").

## Escopo

### A. Investigacao

```bash
grep -rn "useSpotifyAuth\|spotify.*accessToken" src/lib/integracoes/spotify/ | head
ls src/lib/integracoes/spotify/recentlyPlayed.ts  # esperado 0
```

### B. Implementacao

1. `src/lib/schemas/spotify_track.ts` (novo).
2. `src/lib/vault/spotify.ts` (novo writer + reader).
3. `src/lib/integracoes/spotify/recentlyPlayed.ts` (novo).
4. `src/lib/integracoes/scheduler.ts`: entry Spotify (se ja existe do R-INT-2-CALENDAR-SYNC).
5. Recap consumer: helper `src/lib/recap/musicas.ts` (novo, agrega arquivos `spotify/*.md` por periodo).

### C. Testes

- `tests/lib/integracoes/spotify/recentlyPlayed.test.ts`: mocka fetch, valida shape + idempotencia.

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas,vault,integracoes/spotify,recap}/spotify*`, scheduler integracoes entry, tests.

**Nao pode tocar:** OAuth flow Spotify (R-INT-4), schemas nao relacionados, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live: ouvir musica no Spotify, abrir Ouroboros Recap > Musicas, ver track.
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde.
3. Hash + build APK.
4. Live: track aparece no Recap.

## Referencias

- Spotify API: https://developer.spotify.com/documentation/web-api/reference/get-recently-played
- OAuth R-INT-4: `R-INT-4-SPOTIFY-YOUTUBE-CONECTAR-spec.md`
