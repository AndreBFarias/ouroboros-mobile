# R-INT-4-YOUTUBE-WATCH-HISTORY — Puxar videos assistidos do YouTube pra Recap

**Tipo:** feature (integracao read-only)
**Prioridade:** P3
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-4 (`dd37f26` — OAuth scope youtube.readonly ja entregue)

## Contexto

OAuth YouTube entregue na Onda 3I.4. Store em `src/lib/integracoes/youtube/store.ts`. Atencao: **YouTube Data API v3 nao expoe watch history publica desde 2016** (Google removeu por privacy). Alternativas:

1. **Liked Videos** (`/videos?myRating=like`): videos que o usuario marcou like — substituto razoavel para "o que vi recentemente que valeu a pena".
2. **Subscriptions activity** (`/activities`): videos de canais inscritos que apareceram recentemente.
3. **YouTube Music history** (via API YT Music): musica ouvida no YT Music — sim, expoe.

Esta sprint cobre **(1) Liked Videos** (mais confiavel e estavel) + opcional (3) se conta tem YT Premium/Music.

## Objetivo

Criar `src/lib/integracoes/youtube/liked.ts`:

```ts
export interface VideoCurtido {
  youtube_video_id: string;
  titulo: string;
  canal: string;
  curtido_em: string;   // ISO 8601 (proxy: publishedAt do snippet)
  url: string;
  thumbnail?: string;
  duracao_seg?: number;
}

export async function sincronizarLikedVideos(
  vaultRoot: string,
  agora: Date,
  limit: number = 50
): Promise<{ novos: number }>;
```

Logica:
1. Token YouTube via store.
2. `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=50`.
3. Para cada video, persistir em `youtube/<data>-<video-id>.md` (idempotencia).
4. Recap secao "Conteudo" agrega.

## API auxiliar

`YouTubeVideoSchema` + writer. Reaproveita pattern de `src/lib/vault/spotify.ts` (sibling spec).

## Escopo

### A. Investigacao

```bash
grep -rn "useYouTubeAuth\|youtube.*accessToken" src/lib/integracoes/youtube/ | head
ls src/lib/integracoes/youtube/liked.ts  # 0 antes
```

### B. Implementacao

1. `src/lib/schemas/youtube_video.ts` (novo).
2. `src/lib/vault/youtube.ts` (novo writer + reader).
3. `src/lib/integracoes/youtube/liked.ts` (novo).
4. `src/lib/integracoes/scheduler.ts`: entry YouTube.
5. `src/lib/recap/conteudo.ts` (novo, agrega youtube + ouvido_externo).

### C. Testes

- `tests/lib/integracoes/youtube/liked.test.ts`: mocka fetch, valida shape + idempotencia.

## OFF-LIMITS

**Pode tocar:** `src/lib/{schemas,vault,integracoes/youtube,recap}/youtube*`, scheduler entry, tests.

**Nao pode tocar:** OAuth YouTube (R-INT-4), schemas nao relacionados, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live: curtir video YouTube via web/app oficial, abrir Ouroboros Recap > Conteudo, ver video.
```

## Proof-of-work

1. Lista arquivos.
2. Jest verde.
3. Hash + build APK.
4. Live.

## Limitacoes documentadas

- Watch history nao acessivel via API publica (Google removeu por privacy 2016).
- Liked Videos e proxy razoavel mas nao captura "videos que vi e nao curti".
- YT Music history em sprint futura R-INT-4-YOUTUBE-MUSIC-HISTORY se houver demanda.

## Referencias

- YouTube Data API v3: https://developers.google.com/youtube/v3/docs/videos/list (parametro `myRating=like`)
- Privacy removal context: https://support.google.com/youtube/answer/7549352
