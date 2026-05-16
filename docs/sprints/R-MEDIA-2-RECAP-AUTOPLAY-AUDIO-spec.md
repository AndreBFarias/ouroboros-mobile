# R-MEDIA-2 — M-MIDIA-RECAP-AUTOPLAY-AUDIO

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Tranche**: R-MEDIA
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §R-MEDIA → R-MEDIA-2.

Áudios anexados a Reflexões/Conquistas tocam automaticamente no Recap (modo Memórias slideshow). **Separa áudio do item** do áudio ambient: se há áudio anexado, prioriza; senão, ambient (se ativado em settings).

Fade-in/out entre faixas se houver troca durante slideshow. Mute global no toggle.

## Dependências

- **Bloqueia**: nada
- **Bloqueado por**: R-MEDIA-1, R-RECAP-4

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/recap-memorias.tsx`, `src/lib/hooks/useRecapMemorias.ts`, controle expo-av.

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. E2E: slideshow com áudio anexado prioriza sobre ambient.
7. Achados colaterais.
