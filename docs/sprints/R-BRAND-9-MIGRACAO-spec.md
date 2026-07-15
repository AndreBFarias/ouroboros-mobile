# SPRINT R-BRAND-9-MIGRACAO: aposentar a geração v1 dos loaders

## Contexto

A onda R-BRAND-SYSTEM decidiu **substituição total** (design doc §2.1):
o sistema novo (glifo canônico + 1 arquivo por conceito) substitui a
geração v1 em todos os pontos e os três componentes antigos são
aposentados. Esta é a sprint 6 da onda (design doc §5, linha 6): migrar
os consumidores atuais de `OuroborosLoader`, `OuroborosLoading` e
`OuroborosFechamento` para os conceitos novos e **deletar** os três
componentes v1, seus testes e toda referência fora de `docs/`.

O gate final é objetivo: `grep` por `OuroborosLoader|OuroborosLoading|
OuroborosFechamento` fora de `docs/` retorna vazio, smoke completo verde,
baseline Jest não regride.

### PRÉ-REQUISITO BLOQUEANTE (verificar no passo 0)

No commit atual (`9599450`), **R-BRAND-3 a R-BRAND-8 ainda NÃO estão
mergeadas**. O `git log` só mostra R-BRAND-1, R-BRAND-2 e o design doc;
os diretórios `src/components/brand/glifo/` e
`src/components/brand/conceitos/` **não existem** ainda. Sem os conceitos
novos (A1, A2, C1, C2, E2, E3, etc.) não há para onde migrar.

**Esta sprint só pode iniciar depois que R-BRAND-3 a R-BRAND-8 estiverem
mergeadas.** O passo 0.1 do executor confirma via `git log` e `ls` que os
conceitos-destino existem em disco. Se não existirem, a sprint está
bloqueada e o executor para imediatamente (não implemente stubs).

## Escopo (touches autorizados)

### Arquivos a modificar (migrar consumidor → conceito novo)

Consumidores de `OuroborosLoader` (13 arquivos, 13 sites JSX):

- `app/_layout.tsx` (import :20, JSX :440 `<OuroborosLoader />` full) → **A1** (splash do boot)
- `app/oauthredirect.tsx` (import :34, JSX :86 `<OuroborosLoader />` full) → **E2** (anel inline; ver §Decisões)
- `app/onboarding.tsx` (import :40, JSX :1034 `<OuroborosLoader compacto />`) → **E2** (anel inline; ver §Decisões)
- `app/scanner.tsx` (import :17, JSX :37 `compacto`) → **E2**
- `app/captura.tsx` (import :34, JSX :100 `compacto`) → **E2**
- `app/agenda.tsx` (import :36, JSX :462 `compacto`) → **E2**
- `app/humor-rapido.tsx` (import :39 `Loader+Fechamento`, JSX :207 `compacto`) → Loader → **E2**
- `app/eventos.tsx` (import :44, JSX :308 `compacto`) → **E2**
- `app/diario-emocional.tsx` (import :47 `Loader+Fechamento`, JSX :473 `compacto`) → Loader → **E2**
- `app/recap-memorias.tsx` (import :72, JSX :606 `compacto`) → **E2**
- `app/recap-lista.tsx` (import :19, JSX :264 `compacto`) → **E2**
- `src/components/screens/RecapScreen.tsx` (import :33, JSX :507 `compacto`) → **E2** (ver §Decisões)
- `src/components/screens/RecapModoCalendario.tsx` (import :19, JSX :109 `compacto`) → **E2**

Consumidores de `OuroborosLoading` (3 arquivos):

- `src/components/settings/SecaoBackupAutomatico.tsx` (import :22, JSX :235 `variant="sync" tamanho={22}`) → **C2** (digestão / onda contínua)
- `src/components/midia/MidiaSpotifyTab.tsx` (import :23, JSX :153 `variant="inline"`) → **E2**
- `src/components/midia/MidiaYoutubeTab.tsx` (import :20, JSX `variant="inline"`) → **E2**

Consumidores de `OuroborosFechamento` (2 arquivos, já listados acima):

- `app/humor-rapido.tsx` (`onConcluir` no save do humor) → **C1** (fechamento do ciclo)
- `app/diario-emocional.tsx` (`onConcluir` no save do diário) → **C1** (fechamento do ciclo)

Referências em comentário a limpar (senão o grep-gate falha):

- `src/lib/hooks/useRecap.ts` (:13, comentário "caller mostra OuroborosLoader")
- `src/lib/hooks/useReduceMotion.ts` (:11, comentário "OuroborosLoader em _layout")

Barrel:

- `src/components/brand/index.ts` — remover os exports das linhas 4–12 (`OuroborosLoader`, `OuroborosLoading`, `OuroborosFechamento` e seus tipos). Manter o export de `OuroborosLogo` (linhas 2–3) enquanto ele tiver consumidor (ver §Decisões).

Docs (obrigatório no mesmo commit):

- `docs/FEATURES-CANONICAS.md` §1.2 (linhas 95–115) — a tabela hoje aponta C1/C2/E2 para os três componentes v1. Reescrever para apontar os conceitos novos (glifo + arquivos de conceito). Regra do projeto: sprint que remove/modifica feature atualiza FEATURES-CANONICAS no mesmo commit, senão o validador recusa.
- `tests/e2e/playwright/rbrand-loading.e2e.ts` — o E2E da R-BRAND-2 hoje afirma os loaders v1; atualizar os asserts para os conceitos novos, senão quebra ao deletar os componentes.

### Arquivos a criar

- `tests/e2e/playwright/rbrand-9-migracao.e2e.ts` (a partir de `tests/e2e/playwright/e2e-template.ts`) — E2E dos fluxos críticos migrados.
- `docs/sprints/R-BRAND-9-MIGRACAO-screenshots-gauntlet/` — PNGs da validação Gauntlet A+.

### Arquivos a deletar

- `src/components/brand/OuroborosLoader.tsx`
- `src/components/brand/OuroborosLoading.tsx`
- `src/components/brand/OuroborosFechamento.tsx`
- `tests/components/brand/OuroborosLoader.test.tsx` (12 testes)
- `tests/components/brand/OuroborosLoading.test.tsx` (12 testes)
- `tests/components/brand/OuroborosFechamento.test.tsx` (6 testes)

### Arquivos NÃO a tocar

- `src/components/brand/glifo/*` e `src/components/brand/conceitos/*` — entregues por R-BRAND-3 a R-BRAND-8; aqui só são **consumidos**, não modificados. Se um conceito precisar de ajuste para caber num consumidor, isso é achado colateral → sprint nova (protocolo anti-débito), não edição aqui.
- Assets nativos (`assets/icon.png`, `assets/splash.png`, `assets/notification-icon.png`) — R-BRAND-1, fora de escopo.
- Nomes reais de pessoas em código versionado (Regra −1). Tint `pessoa_a`/`pessoa_b` continua por `--purple`/`--pink`.

## Decisões de mapeamento (a confirmar no passo 0.3)

Os IDs de conceito abaixo seguem o **Mapa Conceito → Destino** do design
doc §4 e a convenção de nome do §3 (`A1NascerDaCobra.tsx` …
`G1PipelineVivo.tsx`, 1 arquivo por conceito em
`src/components/brand/conceitos/`). Os **nomes exatos de arquivo e a
assinatura de props NÃO foram confirmados via grep** — eles são criados
por R-BRAND-3 a R-BRAND-8. O executor confirma no passo 0.3 lendo o
`index.ts`/barril de `conceitos/` e usa a API real; se divergir do
esperado, para e reporta (lição 4: não assumir identificador não visto).

Pontos que exigem julgamento (o design doc §4 não tem entrada literal
para todos):

1. **oauthredirect** (loader full-screen de espera do redirect OAuth):
   mapeamento default **E2** (anel inline, espera indeterminada curta),
   coerente com a diretiva "inline → E2". Se o dono quiser a marca de
   boot completa nessa tela, avaliar A1 — decisão registrada no PR.
2. **onboarding :1034** é um spinner de "iniciando" no frame final, não a
   revelação do onboarding. **A2** (semente que expande) é adição NOVA de
   R-BRAND-4 e NÃO substitui este spinner. Este ponto migra para **E2**.
3. **RecapScreen :507** ("carregando recap"; `useRecap.ts` comenta que o
   modo ano pode levar 1–3s): default **E2**; se a agregação for longa o
   suficiente para justificar a onda contínua, avaliar **C2**. Registrar
   a escolha no PR.
4. **scanner :37**: é o loading de processamento, não o erro de OCR. **C3**
   (rejeição atenta) é o caso de OCR falhado, entregue por R-BRAND-5 e
   fora deste ponto. Este migra para **E2**.

## Acceptance criteria

1. `grep -rE "OuroborosLoader|OuroborosLoading|OuroborosFechamento" src/ app/ tests/` retorna **zero linhas** (a única presença permitida do termo é em `docs/`).
2. Os três arquivos de componente v1 e os três arquivos de teste v1 foram deletados do disco.
3. `src/components/brand/index.ts` não exporta mais os três componentes v1 nem seus tipos.
4. Cada um dos 16 consumidores renderiza o conceito novo designado no lugar exato do loader v1, preservando o layout do container (mesmo tamanho/centro; os `compacto` de 96px mapeiam para o tamanho equivalente do conceito).
5. Cada ponto migrado **preserva o comportamento de reduce-motion**: com `useReduceMotion` (sistema OU toggle) o movimento não arma (estado estático canônico) e a navegação/one-shot resolve imediato. Em especial os dois saves C1 (humor, diário) continuam voltando imediato com reduce-motion, sem cascata.
6. Cada ponto migrado **preserva os `accessibilityLabel` existentes** (ex: "agenda carregando", "carregando recap", "carregando calendario", "carregando biblioteca spotify", "fazendo backup", "concluindo") — sem acento, convenção screen reader.
7. `npx tsc --noEmit` retorna 0.
8. `./scripts/smoke.sh` verde (anonimato, dados de teste, strings UI PT-BR, tsc, eslint, jest).
9. Baseline Jest não regride: a única variação de contagem autorizada é a remoção dos 3 suites v1 (−30 testes). Nenhum outro suite cai.
10. `docs/FEATURES-CANONICAS.md` §1.2 atualizado no mesmo commit, apontando os conceitos novos.
11. E2E `rbrand-9-migracao.e2e.ts` verde no Gauntlet, com asserts de comportamento (não só presença) para boot, onboarding, save (C1) e recap.

## Invariantes a preservar

- **Reduce-motion incondicional** (design doc §3): `useReduceMotion` no topo, estado estático canônico definido pelo brand system; one-shots com `onConcluir` disparam imediato no mount. Preservar exatamente a semântica que hoje existe em `humor-rapido.tsx`/`diario-emocional.tsx` (R-AUDIT-A11Y-MOVIMENTO) e nos loaders compactos.
- **accessibilityLabel sem acento** (Regra de Linguagem, convenção screen reader) — o `check_strings_ui_ptbr.py` já ignora esses; não "corrigir" acento neles.
- **M25.2** (rn-svg-web não propaga `animatedProps` em `<G>`/`<Circle>`) e **A27** (Fabric rejeita transform string em SVG) — já resolvidos dentro dos conceitos novos; aqui só consumir. Não reintroduzir transform string.
- **Regra −1 (Anonimato)** — nenhum nome de IA/pessoa em código; D2 (sparks com nomes reais dos .md) é runtime local, não aparece nesta migração.
- **ADR-010 (estética)** — springs, silêncio visual, micro-interação pontual; o C1 continua "conclusão calma sem confete".
- **Tom** — zero emoji, zero exclamação, zero gamificação nos textos tocados.
- **GUIDE.md §3 (mudanças cirúrgicas)** — trocar só o componente do loader em cada site; não refatorar container, estilos ou lógica adjacente.

## Plano de implementação

0. **Gate de pré-requisito.**
   0.1 `git log --oneline | grep -iE "r-brand-[3-8]"` confirma as 6 sprints mergeadas. `ls src/components/brand/glifo/ src/components/brand/conceitos/` confirma os arquivos em disco. Se faltar qualquer conceito-destino (A1, A2, C1, C2, E2), **parar** — sprint bloqueada.
   0.2 `npm test` para capturar o baseline pós-R-BRAND-8: `N_suites` / `N_testes`. Anotar no PR.
   0.3 Ler o barril de `conceitos/` e confirmar nome de arquivo e assinatura de props reais de A1, C1, C2, E2 (e A2/E3 se necessário). Ajustar o mapeamento deste spec à API real.
1. **Migrar boot** (`app/_layout.tsx`): trocar `<OuroborosLoader />` por A1 no bloco de hidratação do vault. Manter o `<FrameMobileDev>` e o `<View>` de centralização.
2. **Migrar os 12 loaders compactos** um a um para E2 (anel inline), preservando container, tamanho ~96px e `accessibilityLabel`. Ordem sugerida por área: captura (scanner, captura), agenda/eventos, recap (recap-lista, recap-memorias, RecapScreen, RecapModoCalendario), mídia via Loading (Spotify, Youtube), onboarding, oauthredirect, humor-rapido (só o Loader), diario-emocional (só o Loader).
3. **Migrar o backup** (`SecaoBackupAutomatico.tsx`): `OuroborosLoading variant="sync"` → C2, mantendo tamanho 22 e label "fazendo backup".
4. **Migrar os dois saves C1** (`humor-rapido.tsx`, `diario-emocional.tsx`): `OuroborosFechamento onConcluir=...` → C1, preservando a semântica de navegação (`router.back()`/`goBackOnce()` no fim da cascata; imediato com reduce-motion).
5. **Limpar comentários** em `useRecap.ts` e `useReduceMotion.ts` que citam `OuroborosLoader`.
6. **Podar o barril** (`index.ts`): remover exports v1, manter `OuroborosLogo` conforme §Decisões.
7. **Deletar** os 3 componentes v1 e os 3 testes v1.
8. **Atualizar** `docs/FEATURES-CANONICAS.md` §1.2 e o E2E `rbrand-loading.e2e.ts`.
9. **Escrever** `rbrand-9-migracao.e2e.ts` e rodar o Gauntlet.
10. **Gate de aposentadoria**: rodar o grep de zero-referência (AC1) e o smoke. Só então commit.

## Decisão condicional — OuroborosLogo (fora do gate hard)

`OuroborosLogo.tsx` **não** está no grep-gate (AC1 só cobre os 3
loaders). Hoje ele tem **zero consumidor** de runtime: `grep -rl
OuroborosLogo src/ app/` retorna apenas o próprio arquivo e o barril
(existem `tests/components/brand/OuroborosLogo.test.tsx` +
snapshot). O design doc §5 diz: "OuroborosLogo permanece se ainda tiver
consumidor estático, senão avaliar absorção pelo glifo".

Decisão para esta sprint: se, ao início (pós R-BRAND-3..8), o
`OuroborosGlifo`/E3 já cobrir o caso de logo estático e `OuroborosLogo`
seguir sem consumidor não-teste, **aposentá-lo também** (mesmo rito:
deletar componente + teste + snapshot, remover export do barril,
atualizar FEATURES-CANONICAS linha 89). Caso contrário, **mantê-lo**.
Não é bloqueante do gate desta sprint; registrar a escolha no PR.

## Aritmética

Meta objetiva: **grep de aposentadoria → 0 linhas** fora de `docs/`.

Referências atuais (medidas via grep no commit `9599450`):

- Imports reais: `OuroborosLoader` = 13, `OuroborosLoading` = 3, `OuroborosFechamento` = 2 → **18 sites de import** em **16 arquivos distintos** (humor-rapido e diario-emocional importam Loader+Fechamento no mesmo import).
- Comentários com o termo em `src/`: 2 (`useRecap.ts`, `useReduceMotion.ts`).
- Exports no barril: 6 linhas (3 componentes + 3 tipos).
- Arquivos de componente v1: 3. Arquivos de teste v1: 3.

Projeção após migração:

- `grep -rE "OuroborosLoader|OuroborosLoading|OuroborosFechamento" src/ app/ tests/` → **0** (todas as ocorrências acima resolvidas ou deletadas).
- Deve **fechar**: 18 imports migrados + 2 comentários limpos + 6 exports removidos + 3 componentes + 3 testes deletados = 0 referências restantes fora de `docs/`.

Aritmética Jest (baseline subtrativo):

- Suites deletados: 3 (`OuroborosLoader.test.tsx`, `OuroborosLoading.test.tsx`, `OuroborosFechamento.test.tsx`).
- Testes removidos: 12 + 12 + 6 = **30**.
- Projeção: `suites = N_suites − 3`, `testes = N_testes − 30`, onde `N_*` é o baseline medido no passo 0.2 (pós-R-BRAND-8). **Nenhum outro suite pode cair** — qualquer queda além de −3 suites / −30 testes é regressão e reprova AC9.

## Testes

- **Deletar** os 3 suites unitários v1 (autorizado; os componentes deixam de existir).
- **Novo E2E** `tests/e2e/playwright/rbrand-9-migracao.e2e.ts` (do template `e2e-template.ts`) cobrindo os fluxos mais críticos com asserts de comportamento:
  - **boot**: rota `_layout` mostra A1 durante hidratação; reduce-motion → estado estático canônico (usar `window.__gauntlet` para inspecionar fase/estado do conceito conforme design doc §7).
  - **onboarding**: frame final "iniciando" mostra E2, depois o Check; não regressão do fluxo do casal.
  - **save C1**: `m-save-humor`/`m-save-diario` continuam salvando e voltando; com reduce-motion o retorno é imediato (sem cascata). Reaproveitar a intenção dos E2E `m-save-humor.e2e.ts`/`m-save-diario.e2e.ts`.
  - **recap**: `RecapScreen` mostra E2 ao carregar; recap navega/agrega normal (reaproveitar `m36-recap`/`r-recap-*`).
- **Atualizar** `rbrand-loading.e2e.ts` para afirmar os conceitos novos (C1/C2/E2) em vez dos componentes v1.
- Reduce-motion verificado nas **duas vias** (sistema e toggle) via `r-audit-a11y-movimento.e2e.ts` como referência de padrão.
- Baseline: `FAIL_BEFORE = 0`, esperado `FAIL_AFTER = 0`.

## Proof-of-work esperado

- **Diff final** completo (16 consumidores migrados + barril + 2 comentários + 3 deleções de componente + 3 deleções de teste + FEATURES-CANONICAS + E2E).
- **Grep de aposentadoria** (o gate objetivo):
  ```bash
  grep -rnE "OuroborosLoader|OuroborosLoading|OuroborosFechamento" src/ app/ tests/
  # esperado: nenhuma linha (exit 1 do grep)
  ```
- **Runtime real** (VALIDATOR_BRIEF §2, comandos do projeto):
  - Smoke: `./scripts/smoke.sh` (inclui anonimato, strings UI PT-BR, tsc, eslint, jest)
  - Typecheck isolado: `npx tsc --noEmit` → 0
  - Unit: `npm test` → suites = baseline − 3, testes = baseline − 30, nenhuma outra queda
- **Gauntlet A+** (validação visual obrigatória, VALIDATOR_BRIEF §1.9): rodar via Playwright MCP, navegar e clicar como app real os fluxos migrados. PNGs em `docs/sprints/R-BRAND-9-MIGRACAO-screenshots-gauntlet/` com sha256 registrado. Cobrir no mínimo: boot (A1), onboarding "iniciando" (E2), OAuth redirect (rota `/oauthredirect` no Gauntlet, ou documentar limitação se o redirect externo não for navegável), backup (C2), save humor/diário (C1), recap (E2).
- **E2E** `rbrand-9-migracao.e2e.ts` verde + `rbrand-loading.e2e.ts` atualizado verde.
- **Acentuação periférica**: rodar `python3 scripts/check_strings_ui_ptbr.py` (já no smoke) e varrer manualmente os arquivos modificados por strings UI sem acento introduzidas na migração.
- **FEATURES-CANONICAS.md** §1.2 reescrito e commitado no mesmo commit.
- **Hipótese verificada** (lição 4): `rg` dos nomes reais dos conceitos-destino (A1/C1/C2/E2) confirmando que existem em `src/components/brand/conceitos/` antes de importá-los; se ausentes, a sprint está bloqueada.

## Riscos e não-objetivos

- **Bloqueio de pré-requisito**: se R-BRAND-3..8 não estiverem mergeadas, a sprint não roda. É o risco número 1.
- **API divergente dos conceitos**: nomes/props reais dos conceitos podem diferir da convenção assumida (§Decisões). Mitigação: passo 0.3 lê a API real antes de migrar.
- **Reduce-motion nos saves C1**: é o ponto mais sensível (navegação depende do one-shot). Testar as duas vias antes de declarar `[ok]`.
- **OAuth redirect no Gauntlet**: o redirect externo pode não ser 100% navegável em web; se for o caso, documentar e validar a rota estática.
- **Não-objetivos** (viram sprint nova se aparecerem — protocolo anti-débito):
  - Ajustar/melhorar qualquer conceito de R-BRAND-3..8.
  - Widget nativo B2 (é R-BRAND-10, sprint 7 opcional).
  - Refatorar containers/estilos dos consumidores além da troca do loader.
  - Aposentar `OuroborosLogo` se ele ainda tiver consumidor (fica; ver §Decisão condicional).

## Referências

- Design doc da onda: `docs/sprints/_ONDA-R-BRAND-SYSTEM.md` (§2.1 substituição total, §4 mapa conceito→destino, §5 linha 6 esta sprint)
- BRIEF: `VALIDATOR_BRIEF.md` (§1.9 Gauntlet, §2 comandos runtime, §4 armadilhas M25.2/A27)
- Regras: `CLAUDE.md` (Regra −1, Regra de Linguagem, Validação Visual Gauntlet), `docs/FEATURES-CANONICAS.md` §1.2
- Precedente: R-BRAND-2-ANIMACOES (`docs/sprints/R-BRAND-2-ANIMACOES-screenshots-gauntlet/`, componentes C1/C2/E2 v1 que esta sprint aposenta), R-AUDIT-A11Y-MOVIMENTO (padrão reduce-motion)
- Template E2E: `tests/e2e/playwright/e2e-template.ts`
