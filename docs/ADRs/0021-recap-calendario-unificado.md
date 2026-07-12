# ADR 0021 — Recap e Calendário de Conquistas unificados em uma tela só

```
Status:     Aceito
Data:       2026-05-07
Sprint:     M-RECAP-CALENDARIO-UNIFICAR (L2, plano end-to-end golden-zebra v1.0.0)
Depende:    M11.5 (Calendário Visual de Conquistas — Tela 25)
            M36 (Recap)
Substitui:  parte da decisão original de M11.5 que mantinha o
            Calendário de Conquistas como tela top-level separada,
            acessível via item próprio no menu lateral. Após L2 a
            mesma abstração (conquistas em período) é exposta como
            modo dentro do Recap.
```

## Contexto

Até a sprint L1 (golden-zebra), o app tinha duas telas distintas que
agregavam **conquistas em período**:

- `/recap` (M36) — Recap em lista por período (Semana, Mês, Ano,
  Personalizado), com cinco seções empilhadas (Conquistas, Crises,
  Evoluções, Tarefas, Números).
- `/calendario` (M11.5, Tela 25) — Calendário visual de conquistas
  com filtros por pessoa, mês, tipo de mídia, intensidade e bairro.
  Renderizado por `CalendarioConquistasScreen` consumindo
  `useConquistas`.

Ambas as telas exibiam **a mesma abstração subjacente** (conquistas
agregadas em um intervalo de tempo). A diferença era de
apresentação:

- Recap → seções por categoria + chips de período.
- Calendário → grid mensal com dots + filtros de mídia + timeline
  horizontal de cards.

Field test do APK `v1.0.0-alpha` (commit `ada414e`) mostrou que dois
itens distintos no menu lateral apontando para a mesma ideia
geravam ambiguidade no usuário: "Recap e Calendário são a mesma
coisa? São diferentes? Qual eu uso?"

Manter as duas telas dobrava a superfície de manutenção (dois
caminhos de filtro, dois empty states, dois testes E2E) sem
benefício de produto.

## Decisão

**Unificar Recap e Calendário em uma única tela** acessada pela rota
modal `/recap`, com toggle de **modo** no header alternando entre:

- **Lista** (default) — comportamento atual do Recap M36
  preservado integralmente: chips de período + cinco seções em
  ScrollView.
- **Calendário** — calendário mensal (`react-native-calendars` com
  locale PT-BR registrado em M37.1.1) com dots nos dias que têm
  conquistas, e abaixo a lista de conquistas do dia selecionado
  via `<ConquistaCard>`.

O toggle é um par de botões em pílula no topo da tela, abaixo do
header e acima do `<ChipGroup>` de período. Ativo recebe
`backgroundColor: colors.purple`. Animação de fade do conteúdo ao
trocar modo usa **Reanimated puro** (não Moti) — `useSharedValue` +
`withTiming` em `Animated.View` — para mitigar o risco residual A28
(MotiView no boot path em New Arch).

### Ações concretas

1. `RecapScreen.tsx` ganha state `modo: 'lista' | 'calendario'`,
   default `'lista'`.
2. Header acima do ChipGroup ganha 2 botões pill ("Lista",
   "Calendário").
3. Componente novo `RecapModoCalendario.tsx` migra a lógica do
   antigo `CalendarioConquistasScreen` reutilizando `useConquistas`.
4. `app/calendario.tsx` (rota raiz) é apagado.
5. Subrota `app/calendario/[id].tsx` (detalhe individual da
   conquista) **permanece** — `<ConquistaCard>` continua a
   navegar para ela via `pathname: '/calendario/[id]'`.
6. Item "Calendário" do `MenuLateral` (seção "Acesso Rápido") é
   removido.
7. `CalendarioConquistasScreen.tsx` é apagado (não tem mais
   consumidores).
8. Showcase dev (`app/_dev/showcase.tsx`) e dashboard Gauntlet
   (`src/lib/dev/gauntletDashboard.tsx`) trocam o link de
   `/calendario` por `/recap`.

### Filtros de Calendário

Os 5 filtros do antigo Calendário (pessoa, mês, tipo de mídia,
intensidade, bairro) **não são expostos na UI inicial** do modo
Calendário. `useConquistas` continua aplicando os defaults. A
exposição visual desses filtros no novo modo fica documentada como
melhoria futura (não bloqueia v1.0.0). O hook continua expondo os
setters; uma sprint subsequente pode adicionar uma `<FiltrosBar>`
embutida sem mexer no shape do hook.

## Consequências

### Positivas

- Menu lateral fica com 1 item a menos na seção "Acesso Rápido".
- Usuário tem ponto de entrada único para "ver minhas conquistas
  em algum período".
- Manutenção concentrada — um spec, um conjunto de testes, um
  caminho E2E.
- Coerência conceitual: a tela Recap é a vista panorâmica do
  Vault; alternar entre Lista e Calendário é só mudar a
  representação visual da mesma agregação.

### Negativas

- O modo Calendário inicial **não expõe os 5 filtros** que o
  `CalendarioConquistasScreen` expunha. Usuário que dependia dos
  filtros perde-os temporariamente. Mitigação: os filtros voltam
  em sprint futura, agora embutidos no Recap.
- Toggle `featureToggles.calendarioConquistas` em Settings perde
  função efetiva (não controla mais visibilidade de item de menu).
  Removê-lo é mudança na store + UI de Settings — fora do escopo
  desta sprint. Fica como achado colateral / sprint subsequente.
- Subrota `/calendario/[id]` permanece com nome legacy mesmo
  depois da unificação. Renomeá-la para `/recap/conquista/[id]`
  exigiria atualizar `<ConquistaCard>` e ajustar `app/`. Fora do
  escopo desta sprint.

## Validação

- Testes Jest atualizados em
  `tests/components/screens/RecapScreen.test.tsx` cobrem:
  - render do toggle com 2 modos
  - default modo "Lista"
  - troca de modo via tap no botão "Calendário"
  - cada modo renderiza conteúdo distinto
  - chips de período aparecem só no modo Lista
- E2E em `tests/e2e/playwright/m-recap-calendario-unificar.e2e.ts`
  navega para `/recap`, valida toggle, alterna para "Calendário",
  captura PNGs em `docs/sprints/M-RECAP-CALENDARIO-UNIFICAR-screenshots-gauntlet/`.

## Reversão

Para reverter, basta:

1. Restaurar `app/calendario.tsx` apontando para
   `CalendarioConquistasScreen` (recriar o arquivo) e re-adicionar
   `import { CalendarioConquistasScreen }` recriando o componente
   a partir do histórico git.
2. Re-adicionar item "Calendário" em `MenuLateral.tsx` seção
   "Acesso Rápido".
3. Reverter `RecapScreen.tsx` para o estado pré-L2 (sem state
   `modo`, sem toggle, sem `Animated.View` envolvendo o conteúdo).
4. Remover `RecapModoCalendario.tsx` e este ADR.

A reversão é puramente local — não há mudança de schema, store ou
formato de Vault.
