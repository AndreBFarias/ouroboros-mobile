# R-INT-4 — M-INTEGRACOES-SPOTIFY-YOUTUBE-CONECTAR

**Tipo**: feature
**Prioridade**: P3-low (descopável para v1.1)
**Estimativa**: 4-6h
**Tranche**: R-INT
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-INT → R-INT-4.

Spotify: OAuth + leitura track atual / playlist. YouTube: oEmbed metadados (não requer OAuth).

**Decisão D2 = A** (dono confirmou em 2026-05-15): **ambos OK** —
Spotify (OAuth) + YouTube (oEmbed). Exceção explícita à filosofia
"sem rede de saída" autorizada para essas 2 integrações. ADR a
registrar documentando a exceção.

## Dependências

- **Bloqueia**: R-MEDIA-1 (preview Spotify)
- **Bloqueado por**: R-INT-1 (hub), Decisão D2

## OFF-LIMITS

Padrão T1. **Pode tocar**: novos `src/lib/services/spotifyAuth.ts`, `src/lib/services/youtubeOembed.ts`.

## Verificação canônica

```bash
./scripts/smoke.sh
# Modo aviao: sem chamadas externas se integracao desligada
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Decisão D2 confirmada pelo dono.
7. Validação: modo avião + integrações off = zero requests externos.
8. Achados colaterais.
