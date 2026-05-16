# R-MEDIA-LINKEXTERNO-CLEANUP — Remover dead code LinkExterno em DetalheConquista

**Tipo**: cleanup
**Prioridade**: P3-low
**Estimativa**: 30min
**Fase**: 3
**Origem**: achado colateral de R-MEDIA-1 (commit `8088c80`)

## Contexto

Em R-MEDIA-1, `MidiaPreviewSpotifyYoutube` substituiu o renderer `LinkExterno` em `src/components/screens/DetalheConquista.tsx` para os 2 únicos consumidores (YouTube + Spotify) em `MidiaInterativa`. A função `LinkExterno` (~30 linhas) e o import do ícone `ExternalLink` ficaram sem referência, mas não foram removidos durante a sprint conforme regra durá­vel "se notar código morto, mencione-o — não o delete".

## Objetivo

Remover dead code seguindo regra explícita do dono via sprint dedicada:

1. Buscar referências a `LinkExterno` em todo `src/` + `app/`:
   ```bash
   grep -rn "LinkExterno" src/ app/
   ```
2. Se ZERO referências (esperado), remover:
   - Função `LinkExterno` em `src/components/screens/DetalheConquista.tsx`
   - Import de `ExternalLink` (`lucide-react-native`) no mesmo arquivo, se único uso era em `LinkExterno`
3. Buscar componentes similares "LinkExterno" em outros arquivos:
   ```bash
   grep -rn "import.*LinkExterno" src/ app/
   ```
4. Se houver outros usos legítimos noutro arquivo, **não remover** o import lá — apenas o local.

## OFF-LIMITS

**Pode tocar**:
- `src/components/screens/DetalheConquista.tsx` (remover função + import obsoleto)

**Não pode tocar**:
- `MidiaPreviewSpotifyYoutube` (R-MEDIA-1 entregue)
- `MidiaInterativa` (renderer que orquestra escolha)
- Outros componentes que usam `ExternalLink` icon

## Verificação

```bash
./scripts/smoke.sh
# Esperado: 236/2192 testes verde (não pode regredir)
grep -rn "LinkExterno" src/ app/
# Esperado: zero matches
```

## Proof-of-work

1. Arquivos modificados (esperado: 1 arquivo, ~30 linhas removidas).
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit (OBRIGATÓRIO).
5. Path do worktree + branch.
6. Saída do grep confirmando 0 matches.

## Decisão

- Sprint pequena pra honrar regra durá­vel (mencionar, não deletar inline).
- P3 (low) porque não bloqueia nada e não tem impacto runtime.
- Pode ser feita junto com R-INFRA-WORKTREE-BOOTSTRAP ou outras sprints de DX.
