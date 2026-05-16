# R-MEDIA-1 — M-MIDIA-SPOTIFY-YOUTUBE-AUDIO-PREVIEW

**Tipo**: feature
**Prioridade**: P1-high
**Estimativa**: 3-4h
**Tranche**: R-MEDIA
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-MEDIA → R-MEDIA-1.

Mídia anexa (Spotify URL, YouTube URL, áudio local) renderiza preview com thumbnail + título + botão "Abrir externamente". Fallback offline: logo do serviço + botão.

Áudio anexado no Recap toca **autoplay** quando entra no viewport.

Cache em `cache/oembed/<hash-url>.json` TTL 7d.

**Decisão pendente D2**: Spotify/YouTube como integrações (rompe parcialmente "sem rede de saída")? oEmbed YouTube é GET único anonimizável. Spotify exige OAuth.

## Dependências

- **Bloqueia**: R-MEDIA-2 (autoplay audio Recap), R-INT-4 (Spotify connect)
- **Bloqueado por**: R0, R-CRIT-3 (mídia ausente)

## OFF-LIMITS

Padrão T1. **Pode tocar**: novo `src/lib/midia/oembedClient.ts`, novo `src/components/midia/MidiaPreviewSpotifyYoutube.tsx`, `src/lib/cache/oembedCache.ts`.

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test: anexar 3 URLs (Spotify + YouTube + audio local)
# Modo aviao: cada um cai para fallback
```

## Proof-of-work

1. Lista de arquivos modificados/criados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Decisão D2 confirmada pelo dono.
7. Validação modo avião: 3 previews caem para fallback.
8. Achados colaterais.
