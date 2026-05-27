# R-INT-4-YOUTUBE-MUSIC-HISTORY — Histórico/biblioteca musical do YouTube no Recap (com ressalva de API)

**Tipo**: feature (investigação + implementação do viável)
**Prioridade**: P3-low
**Estimativa**: 2-4h (incerto — depende da viabilidade da API)
**Tranche**: R-INT-4

> **ATENÇÃO — viabilidade incerta.** A YouTube Data API v3 **não expõe histórico de
> reprodução** (o endpoint `watch history` foi descontinuado; o playlist `HL` não é
> acessível via API). Esta sprint primeiro **investiga** o que a API realmente permite e
> implementa o **proxy viável**, sem prometer "histórico real".

## Fonte canônica

`_BACKLOG.md` (contingente "se houver demanda"). Dono pediu execução (2026-05-26).

## Passo 0 — Investigação obrigatória (antes de codar)

Confirmar via docs (context7/web) e o client existente (`src/lib/integracoes/youtube/`):
- A Data API v3 NÃO dá histórico de reprodução. Alternativas reais:
  - **Liked videos** (`videos?myRating=like`) — já acessível (R-INT-4 usa para biblioteca).
  - **Playlists do usuário** (`playlists?mine=true`).
- **Decisão registrada no spec após investigação:** usar "vídeos curtidos recentes (música)"
  como proxy de "trilha do YouTube", OU documentar formalmente a limitação e descopar para
  v1.1 se nem o proxy agregar valor.

## Hipóteses técnicas (validar via grep)

1. `src/lib/integracoes/youtube/client.ts` + `biblioteca.ts` já fazem OAuth read-only +
   listam Liked/Watch Later (R-INT-4). Reusar o client; não recriar OAuth.
2. Recap consome via card (padrão `RecapSecaoMusicas`/`destinos.ts` se existir, senão
   espelhar `RecapSecaoConquistas`).

## Entregáveis (do que for viável)

- `src/lib/integracoes/youtube/musica.ts` — agrega "curtidos recentes" (proxy) via client.
- (se agregar valor) card no Recap + `src/lib/recap/conteudo.ts`. Senão: doc da limitação
  em FEATURES-CANONICAS + descopar para v1.1 (registrar decisão no spec).
- Testes do agregador.

## OFF-LIMITS
- Pode: `src/lib/integracoes/youtube/**` (exceto oauth.ts), `src/lib/recap/**`, componentes
  recap, testes. Não: OAuth/schema YouTube; `package.json`.

## Restrições
- Read-only sobre o client existente. UI PT-BR + acento. ADR-0007 (sem API paga). Worktree.
- **Honestidade técnica:** se a API não permitir, NÃO forçar — documentar e descopar.

## Verificação canônica
```bash
./scripts/bootstrap-worktree.sh && npx tsc --noEmit
npm test --silent -- --testPathPattern="youtube|recap"
./scripts/smoke.sh
```

## Proof-of-work
1. Resultado da investigação (o que a API permite). 2. diff. 3. jest verde. 4. smoke.
5. hash+branch. 6. Se descopado: decisão documentada no spec + FEATURES-CANONICAS.
