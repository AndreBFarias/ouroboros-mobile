# R-INT-4-YOUTUBE-PICKER — Escolher video da sua biblioteca YouTube (modelo Google Fotos)

**Tipo:** feature (consumer da integracao OAuth ja existente)
**Prioridade:** P3
**Estimativa:** 0.5-1d
**Fase:** 3
**Depende de:** R-INT-4 (OAuth YouTube + `youtube/client.ts`) + R-MEDIA-1 (MidiaYoutube + attach) + R-INT-4-SPOTIFY-PICKER (padrao irmao — fazer apos, copiar a forma)
**Substitui:** R-INT-4-YOUTUBE-WATCH-HISTORY (descopada — era timeline passiva; reescopada para picker ativo)

## Origem / contexto

Identico ao Spotify (ver `R-INT-4-SPOTIFY-PICKER-spec.md`): a integracao OAuth
YouTube existe (`src/lib/integracoes/youtube/{oauth,client,store}.ts`,
youtube.readonly + Data API v3) e aparece conectavel no hub, mas conectar nao faz
nada util. Intento do dono: navegar sua biblioteca → escolher um video → anexar
a um recap (modelo Google Fotos), nao timeline passiva.

## Objetivo

Quando o YouTube esta conectado, o fluxo de anexar video (`MidiaYoutubeTab`)
oferece escolher da biblioteca (liked videos / playlists via `youtube/client.ts`),
toque preenche a `MidiaYoutube` (video_id + titulo + canal). Fallback URL quando
desconectado. **Espelhar exatamente R-INT-4-SPOTIFY-PICKER.**

## Investigacao obrigatoria
```bash
sed -n '1,80p' src/lib/integracoes/youtube/client.ts        # quais fetchs existem (liked/playlists/search)
grep -n "MidiaYoutube\b" src/lib/schemas/midia.ts            # shape do attach
sed -n '1,80p' src/components/midia/MidiaYoutubeTab.tsx      # fluxo atual (URL)
# E ler R-INT-4-SPOTIFY-PICKER-spec.md + a implementacao ja entregue (biblioteca.ts) para copiar a forma
```

## Escopo
1. `src/lib/integracoes/youtube/biblioteca.ts` (NOVO): `listarVideosParaPicker(token)`
   agregando o que o client expoe (liked videos / playlist items), dedup por
   video_id, retorna `VideoPicker[] { video_id, titulo, canal, url, thumb? }`.
   Token via `useYouTubeAuth` + refresh. Erro/sem token → vazio.
2. `src/components/midia/MidiaYoutubeTab.tsx` (MODIFICAR): conectado → lista
   (toque seleciona, preenche `MidiaYoutube`); desconectado → URL + CTA "Conectar
   YouTube". Reaproveita o mapeamento video → `MidiaYoutube`.

## OFF-LIMITS
NAO tocar OAuth/client (so consumir), schema midia, criar card de Recap, docs raiz.

## Tom / regras
Anonimato (-1), comentarios SEM acento, strings UI COM acento. Rate limit / quota
YouTube Data API: cache curto.

## Testes
- `tests/lib/integracoes/youtube/biblioteca.test.ts` (mock client).
- `tests/components/midia/MidiaYoutubeTab.test.tsx` (estender: conectado lista / desconectado URL+CTA).

## Validacao visual
UI → Gauntlet (mock token via store). Screenshot picker + fallback. Supervisor valida na main.

## Referencias
- Irmao: `docs/sprints/R-INT-4-SPOTIFY-PICKER-spec.md` (mesma forma).
- Client: `src/lib/integracoes/youtube/client.ts`. Attach: `MidiaYoutubeTab.tsx`. Schema: `MidiaYoutube`.
