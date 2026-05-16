# R-RECAP-4 — M-RECAP-MEMORIAS-SLIDESHOW-V2

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 3-4h
**Tranche**: R-RECAP
**Fase**: 2

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-RECAP → R-RECAP-4.

Promove Q24.b.a (áudio ambient) e Q24.b.b (Ken Burns) do backlog para v1.0. Q24.b.c (export PNG stories) fica `[v2]`.

Adicionais:
- Auto-avanço 4s configurável
- Áudio anexado a `midia_audio:` toca em loop com fade 500ms
- Track ambient embutido CC0 (toggle settings default OFF — "sem rede de saída")
- Ken Burns 4 presets (zoom-in-top-left, zoom-out-center, pan-left-right, pan-bottom-top)
- Botão pausar

**Decisão pendente D3**: track ambient embutido OK? Confirmar com dono.

## Dependências

- **Bloqueia**: R-MEDIA-2 (autoplay áudio Recap)
- **Bloqueado por**: R0, R-CRIT-3 (mídia ausente), R-RECAP-3 (empty states)

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/recap-memorias.tsx`, `src/lib/hooks/useRecapMemorias.ts`, novo `src/lib/copy/recap-transicoes.ts` para 10+ frases de transição.

**Bundle**: 1 track CC0 ≤500KB se ambient ativado. Margin atual ~1.15MB.

## Verificação canônica

```bash
./scripts/smoke.sh
# Gauntlet: profile Reanimated 60fps validation
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Decisão D3 confirmada pelo dono (citar conversa).
7. Bundle size antes/depois (~500KB max delta).
8. Achados colaterais.
