# ADR 0028 — Card "Vocês" reintroduz o estado do casal na Home (revisão parcial de ADR-0026/D1)

```
Status:     Aceito
Data:       2026-07-10
Sprint:     R-HOME-4a (Home viva — motor de feed adaptativo + card Vocês)
Depende:    ADR-0005 (Ausência de gamificação e julgamento)
            ADR-0010 (Estética: física acima de tempo, silêncio visual)
Revisa:     ADR-0026 (Tela Hoje foco em ação, Decisão D1 = Opção C) —
            parcialmente. O foco em ação (Próximos + To-do) permanece;
            só a remoção total do bloco de estado do casal é revista.
```

## Contexto

O ADR-0026 (R-HOME-1, 2026-05-15, Decisão D1 = Opção C) **removeu** a
`SecaoStatusCasal` da Tela Hoje por ser "redundante com o Recap modo
casal" e para otimizar a tela em direção a **ação** (o usuário abre o app
para fazer um registro, não para "só olhar").

A validação live pós-R-HOME-1/2/3 revelou um efeito colateral não
considerado por D1: em um **dia sem dados** a Tela Hoje virava duas
caixas cinzas dizendo "Nada nas próximas horas." e "Sem tarefas
pendentes.", amplificando o vazio. O dono descreveu como "vibe
estranha". O problema é **permanente** (qualquer dia sem eventos/tarefas
parece morto), não só no primeiro boot — é um problema de **cold start /
primeira impressão** que a decisão D1 não endereçou porque otimizava
"ação vs leitura", não "home viva vs home vazia".

A spec-mãe R-HOME-4 (Home viva) redesenha a Tela Hoje como um **feed
adaptativo de cards**: cada card só renderiza quando tem substância
(self-hide), e há **cards garantidos** que dão vida mesmo num dia sem
input. O primeiro card garantido — objeto desta sub-sprint R-HOME-4a — é
o card **Vocês**.

## Decisão

Reintroduzir um bloco de estado do casal na Home, agora como card
**Vocês** — **compacto** e diferente da antiga `SecaoStatusCasal`.

### Forma do card Vocês (R-HOME-4a)

- **Garantido**: sempre visível, no topo do feed. Nunca renderiza a
  palavra "Nada" nem caixa cinza de vazio.
- **Uma linha por pessoa** (`pessoa_a` = roxo, `pessoa_b` = rosa; nomes
  via `useNomeDe`, nunca hardcoded). Em modo `sozinho`, só `pessoa_a` e
  título singular "Você"; em `casal`/`amigos`, título "Vocês".
- **Registrou hoje** → `{nome} · {rótulo} · hoje`. O rótulo de humor é
  uma escala **poética e invariável de gênero** (travada pelo dono em
  R-HOME-4 §12): `1 difícil · 2 devagar · 3 na média · 4 leve ·
  5 radiante`. Nunca adjetivo que concorde com pessoa ("ótima"/"calmo"),
  porque o app não guarda gênero.
- **Não registrou hoje** → convite suave, tappável, com seta:
  `{nome} ainda não registrou hoje →`. Acolhimento, não cobrança (sem
  CTA de rodapé, ADR-0005).
- **Granularidade de tempo**: só **dia** (`hoje`/`ontem`/`há N dias`). O
  `HumorSchema` grava apenas `data` (YYYY-MM-DD), sem hora — "há 2h"
  exigiria mudança de schema (fora de escopo, R-HOME-4 §12).

### O que muda vs a antiga SecaoStatusCasal

A `SecaoStatusCasal` removida em D1 era um bloco **maior**, duo-only, com
avatares e "última atividade". O card Vocês é **compacto** (uma linha por
pessoa: humor recente + convite), funciona em modo sozinho, e muda de
"redundante com o Recap" para **"âncora emocional que dá vida à home e
reforça a identidade de app de casal a cada abertura"**.

### O motor de feed (contexto da decisão)

R-HOME-4a também converte as seções fixas (`SecaoProximos`,
`SecaoTodoHoje`, `BadgePassos`) em itens de um **registry** ordenado
(`FEED_CARDS` em `src/components/hoje/FeedHoje.tsx`). Cada card não-
garantido faz **self-hide** (`return null`) quando sem substância — o
empty state deixou de ser uma caixa "Nada ..." e passou a ser a
**ausência** do card. A ordem canônica passa a ser: Vocês → Próximos →
To-do → Passos (Passos agora depois do To-do).

## Consequências

### Positivas

- **Home viva em dia vazio**. O card garantido dá substância e um convite
  acolhedor mesmo sem nenhum registro — resolve o cold start.
- **Identidade de casal na primeira fold**, a cada abertura, sem
  gamificação nem comparativo entre as pessoas.
- **Sem caixas tóxicas de vazio** na Home. As telas dedicadas (`/todo`,
  `/agenda`) mantêm seus próprios empty states — não foram tocadas.
- **Registry extensível**: 4b/4c/4d inserem seus cards editando
  `FEED_CARDS` na posição da §2, sem tocar em `FeedHoje`.

### Negativas / custos

- **Mais um hook e um card no boot** (`useHumorCasal` + `CardVoces`).
  Mitigado por ser leitura leve de `listarHumor`, já usada por `useHoje`.
- **Revisão parcial de uma decisão recente** (ADR-0026 tem ~2 meses). O
  foco em ação de D1 permanece; apenas a remoção total do estado do casal
  é revista, com forma diferente (compacta, não o bloco antigo).

## Validação

- Unit: `rotuloHumor.test.ts`, `useHumorCasal.test.ts`,
  `CardVoces.test.tsx`, `FeedHoje.test.tsx` + `tests/app/index.test.tsx`
  atualizado ao novo layout.
- E2E `tests/e2e/playwright/r-home-4a-card-voces.e2e.ts`: dia vazio (card
  Vocês + convite, sem caixa "Nada"), dia cheio (linha de mood do dia),
  modo sozinho (título "Você").
- Prova de runtime no device: home vazia sem
  nenhuma caixa "Nada ...", cards garantidos presentes — validado ao vivo
  no device.
