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

---

## Resultado da investigação (Passo 0) — 2026-05-26

Investigação concluída antes de qualquer linha de código. Evidência cruzada
de três fontes: docs oficiais (conhecimento + comentários já validados no
`client.ts`), grep no codebase e histórico de decisão no `ROADMAP.md`.

### O que a YouTube Data API v3 realmente permite (read-only, sem API paga)

- **Histórico de reprodução (watch history): indisponível.** O Google removeu
  o acesso ao histórico de reprodução via API pública em 2016, por privacidade.
  A playlist especial `HL` (history) não é recuperável via API; a playlist `WL`
  (Watch Later) retorna `403` para a maioria dos clientes OAuth (já tratado em
  `client.ts:getWatchLater` como lista vazia). Confirmado também pela spec irmã
  `R-INT-4-YOUTUBE-WATCH-HISTORY-spec.md` (linhas 11 e 94).
- **YouTube Music history: indisponível pelo caminho do projeto.** Não existe
  API oficial do YouTube Music. As bibliotecas que expõem esse dado (ex.:
  `ytmusicapi`) são engenharia reversa baseada em cookies/headers de navegador
  — **não** usam o token OAuth `youtube.readonly` que o app possui, são frágeis
  (quebram quando o Google muda endpoints internos) e contrariam o espírito do
  **ADR-0007** (sem dependência paga/instável). Logo, "música ouvida" não é
  obtível com as restrições do projeto.
- **Único sinal read-only estável: vídeos curtidos (`LL` / `videos?myRating=like`).**
  Já exposto por `client.ts:getLiked` e já agregado por
  `youtube/biblioteca.ts` (Liked + Watch Later, dedup por `video_id`).

### Por que o proxy "curtidos recentes" NÃO agrega valor novo aqui

1. **Já consumido.** `getLiked` já alimenta o **picker** de biblioteca YouTube
   (`MidiaYoutubeTab.tsx`, R-INT-4-YOUTUBE-PICKER, `878cb1e`, `[ok]`) — o
   usuário já navega seus curtidos para anexar a uma memória (modelo Google
   Fotos). Um agregador `musica.ts` espelhando isso seria redundante.
2. **O card de Recap passivo foi uma decisão arquitetural DESCOPADA** em
   2026-05-25 (auditoria dono + orquestrador, `ROADMAP.md` §3P.C):
   - `R-INT-4-YOUTUBE-RECAP-CARD` ("Card Conteúdo curtido") → `[descopado]`.
   - `R-INT-4-SPOTIFY-RECAP-CARD`, `-RECENTLY-PLAYED`, `-WATCH-HISTORY`,
     `-AGORA-TOCANDO` → todos `[descopado]`.
   - Razão registrada: o intento do dono ("anexar à recap como Google Fotos")
     foi servido pelo **picker**, não por cards passivos de histórico. O
     YouTube não tem camada de cache `.md` no Vault (diferente do Calendar, que
     alimenta `recap/agenda.ts`); criar uma ressuscitaria exatamente o padrão
     que o projeto rejeitou um dia antes.

### Decisão: DESCOPAR para v1.1 — documentação apenas, sem código novo

Conforme a própria ressalva da spec ("se a API não permitir, NÃO forçar —
documentar e descopar") e o precedente do `ROADMAP.md` §3P.C:

- **Não** implementar `src/lib/integracoes/youtube/musica.ts`.
- **Não** criar card de Recap nem `src/lib/recap/conteudo.ts` (revogaria a
  decisão de 2026-05-25).
- A capacidade read-only que existe (Liked/Watch Later) **permanece** servida
  pelo picker R-INT-4-YOUTUBE-PICKER — nenhuma regressão.
- Limitação registrada em `docs/FEATURES-CANONICAS.md` (seção 2.4, picker
  YouTube).
- **Reabrir só se** surgir caminho oficial e OAuth-compatível para histórico do
  YouTube/YT Music (improvável no horizonte v1.x), OU se o dono pedir
  explicitamente um agregador de "curtidos recentes" no Recap aceitando que é
  proxy de curtidas, não de reprodução.

**Status final desta sprint:** `[descopado v1.1]` — documental, sem mudança em
`src/`/`app/`. Sem validação visual (não toca UI).
