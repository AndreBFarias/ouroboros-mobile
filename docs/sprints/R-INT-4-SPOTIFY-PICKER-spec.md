# R-INT-4-SPOTIFY-PICKER — Escolher musica da sua biblioteca Spotify (modelo Google Fotos)

**Tipo:** feature (consumer da integracao OAuth ja existente)
**Prioridade:** P2
**Estimativa:** 0.5-1d
**Fase:** 3
**Depende de:** R-INT-4 (OAuth Spotify + `spotify/client.ts` ja entregues) + R-MEDIA-1 (MidiaSpotify schema + attach)
**Substitui:** R-INT-4-SPOTIFY-RECENTLY-PLAYED (descopada — era timeline passiva estilo Wrapped; reescopada para picker ativo)

## Origem / contexto (decisao do dono 2026-05-25)

Hoje conectar o Spotify na guia de Integracoes NAO faz nada util — a conexao
OAuth existe (`src/lib/integracoes/spotify/{oauth,client,store}.ts`, com
`getRecentlyPlayed`/`getTopTracks`/`getNowPlaying` prontos), mas nenhum consumidor
a usa. O unico jeito de anexar musica e colar URL (`MidiaSpotifyTab` + oEmbed).

Intento do dono (verbatim): "integrarmos essas plataformas de fora pra trazermos
pra ca. seja anexando uma musica ou video pra tocar num recap da vida. Igual o
google fotos faz." Ou seja: **navegar sua biblioteca conectada e escolher** —
nao colar URL, nao timeline passiva.

## Objetivo

Quando o Spotify esta conectado, o fluxo de anexar musica (`MidiaSpotifyTab`)
oferece **escolher da sua biblioteca**: lista os recently-played + top-tracks
(via `getRecentlyPlayed`/`getTopTracks` ja existentes), usuario toca uma faixa,
e isso preenche a mesma `MidiaSpotify` (track_id + titulo + artista) que o
attach por URL ja produz. Fallback: se nao conectado, mantem o input de URL atual.

## Escopo / Entregaveis

### Investigacao obrigatoria (antes de codar)
```bash
grep -n "getRecentlyPlayed\|getTopTracks" src/lib/integracoes/spotify/client.ts   # confirma API
grep -n "useSpotifyAuth\|accessToken\|refreshIfNeeded" src/lib/integracoes/spotify/store.ts
grep -n "MidiaSpotify\b" src/lib/schemas/midia.ts                                  # shape do attach
sed -n '1,80p' src/components/midia/MidiaSpotifyTab.tsx                            # fluxo atual (URL)
```

### Implementacao
1. `src/lib/integracoes/spotify/biblioteca.ts` (NOVO): `listarFaixasParaPicker(token)`
   → agrega `getRecentlyPlayed` + `getTopTracks` (dedup por track_id, ordena por
   recencia), retorna `FaixaPicker[] { track_id, titulo, artista, album?, url, capa? }`.
   Token via `useSpotifyAuth.getState()` + `refreshIfNeeded`. Erro/sem token → lista vazia.
2. `src/components/midia/MidiaSpotifyTab.tsx` (MODIFICAR): se conectado
   (`useSpotifyAuth` token valido), mostrar a lista de faixas (toque = seleciona,
   preenche `MidiaSpotify`); manter o input de URL como alternativa (ou aba secundaria).
   Se nao conectado, mostrar CTA "Conectar Spotify" (navega para a guia de
   Integracoes) + o input de URL atual. Reaproveita o mapeamento faixa → `MidiaSpotify`.
3. NAO criar timeline passiva no Recap. NAO tocar o schema `MidiaSpotify` (reuso).

## OFF-LIMITS
- NAO tocar OAuth flow (`oauth.ts`), `client.ts` (so consumir), schema midia.
- NAO criar card de Recap (isso era a versao descopada).
- NAO tocar docs canonicos de raiz.

## Tom / regras
Anonimato (Regra -1), comentarios SEM acento, strings UI COM acento PT-BR,
tom sobrio (zero emoji/exclamacao). Rate limit Spotify: cache curto, nao marteler.

## Testes
- `tests/lib/integracoes/spotify/biblioteca.test.ts`: agrega/dedup/ordena, sem token → vazio (mock client).
- `tests/components/midia/MidiaSpotifyTab.test.tsx` (estender): conectado mostra lista + seleciona; desconectado mostra URL + CTA.

## Validacao visual
UI → Gauntlet. Picker so renderiza com token Spotify (mock no Gauntlet via store).
Screenshot do picker com faixas + do fallback URL. Supervisor valida na main.

## Proof-of-work esperado
1. Diff de biblioteca.ts + MidiaSpotifyTab. 2. Confirmacao de reuso de getRecentlyPlayed/getTopTracks (sem recriar). 3. Jest + smoke verde. 4. E2E + screenshot. 5. Hash/branch.

## Referencias
- Client pronto: `src/lib/integracoes/spotify/client.ts` (getRecentlyPlayed/getTopTracks/getNowPlaying).
- Attach atual: `src/components/midia/MidiaSpotifyTab.tsx` + `fetchSpotifyOEmbed`.
- Schema: `MidiaSpotify` em `src/lib/schemas/midia.ts`.
