# AUDIT-P2-10-ORFAOS-LIMPEZA — varredura de órfãos confirmados: o que remover e o que preservar

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: baixa (nenhum item causa defeito ao usuário hoje; o custo é de manutenção e
            de ruído em auditorias futuras)
DEPENDE:    nenhuma. O bloqueio de decisão do dono que existia em §5.2 (FiltrosBar) e
            §5.3 (OuroborosLogo) está resolvido — ver o campo DECISAO. Sprint liberada.
ORIGEM:     achados soltos de [P2] / [NI-09] / [NI-10] / [NI-11] / [NI-13] da auditoria de
            2026-07-28. Reverificados um a um nesta materialização em `main @ b5bf2db`.
            Dois deles não sobreviveram à verificação: `OuroborosLogo` é trabalho em curso
            e os componentes de Finanças têm preservação declarada em spec. Ambos viram
            NÃO-objetivo explícito abaixo.
DECISAO:    (dono, 2026-07-29) REMOVER os três órfãos com substituto nomeado —
            `FotoDetalhe.tsx` (120L), `calendario/Timeline.tsx` (57L) e
            `app/em-construcao.tsx` (45L), 222 linhas. `FiltrosBar.tsx` **sai desta
            sprint**: é a opção (B) do §5.2 e passa a ser escopo de
            `AUDIT-P2-11-FILTROSBAR-RECAP`. `OuroborosLogo` e os 4 componentes de
            Finanças seguem NÃO-objetivo, sem alteração.
```

## Problema (código morto confirmado, com dois falsos alvos)

Cinco itens foram levantados como código morto candidato a remoção. A verificação
confirmou três, desmentiu um e reclassificou outro. Cada subseção traz a evidência e a
recomendação individual.

### 5.1 `src/components/screens/FotoDetalhe.tsx` (120 linhas) — REMOVER

```
$ grep -rn "FotoDetalhe" --include="*.ts" --include="*.tsx" src app tests
src/components/screens/FotoDetalhe.tsx:21,37,41     (a propria definicao)
```

Três hits, todos dentro do próprio arquivo. Zero consumidores e **zero testes** — é o
único órfão desta varredura sem sequer cobertura Jest. Não existe
`src/components/screens/index.ts`, logo não há re-export por barril.

Redundância confirmada. O componente é um bottom sheet com a foto grande, rótulo de origem
(`Evento`/`Medida`/`Diário`/`Galeria`, `FotoDetalhe.tsx:13-19`), data formatada e dois
botões: "Abrir registro" e "Fechar". O caminho equivalente já existe e está vivo —
`app/galeria/index.tsx:159-173`:

```tsx
const renderItem = ({ item }: { item: ItemGaleria }) => (
  <CardItem
    item={item}
    onPress={() => {
      router.push({
        pathname: '/galeria/detalhe/[slug]',
        params: { slug: item.slug ?? item.data, tipo: item.tipo, data: item.data, uri: item.uri },
      });
    }}
  />
);
```

**Substituto nomeado: `app/galeria/detalhe/[slug].tsx`** (223 linhas). É rota real —
deep-linkável, com histórico de navegação — alcançável também por
`src/lib/recap/destinos.ts:51` e `app/recap-lista.tsx:232`. Cobre a mesma intenção
(detalhe de um item da galeria) com **mais** informação: frontmatter completo, contra só
metadata no sheet. Manter duas implementações concorrentes do mesmo gesto é o que produz
divergência.

**Quando e por que órfãou** (arqueologia de 2026-07-29, não estava no achado original):
o componente **perdeu o consumidor**, não foi abandonado. Commit `5684b16`, 2026-05-07
(*"l1 memorias-para-saude-fisica + 3 abas + fotos sai exercicios entra"*) deletou
`src/components/screens/MemoriasFotosTab.tsx`, e era **o** único consumidor:

```
$ git show 5684b16^:src/components/screens/MemoriasFotosTab.tsx | grep -n FotoDetalhe
3:// abre FotoDetalhe com metadata + atalho para registro origem.
40:import { FotoDetalhe } from './FotoDetalhe';
231:          <FotoDetalhe
```

A aba Fotos foi extinta; ninguém removeu o `FotoDetalhe` junto. Reforço para a execução:
os dois botões do sheet apontam para rotas `/(tabs)/...` que **não existem** desde M27, ou
seja, mesmo remontado hoje o componente navegaria para o vazio.

Ressalva honesta: o tipo `FotoAgregada` de `src/lib/hooks/useFotosAgregadas.ts` **é**
amplamente usado (galeria, saúde física, medidas) e não sai junto. Só o componente sai.

### 5.2 `src/components/calendario/Timeline.tsx` (57 linhas) — REMOVER

| Arquivo | Linhas | Evidência | Destino |
|---|---:|---|---|
| `src/components/calendario/Timeline.tsx` | 57 | `grep -rn "import.*Timeline\|<Timeline" src app tests` → **0 hits**. | **sai nesta sprint** |
| `src/components/calendario/FiltrosBar.tsx` | 233 | `grep -rn "\bFiltrosBar\b" src app tests` → 1 hit externo, **comentário** em `src/lib/stores/filtroEfetivo.ts:42`. Zero imports. | **fica** — `AUDIT-P2-11` |

Zero cobertura em `tests/` para os dois (não existe `tests/components/calendario/`). Não
existe `src/components/calendario/index.ts`, logo não há re-export por barril. O diretório
**continua existindo** depois desta sprint, com o `FiltrosBar.tsx` dentro.

Contexto: são resíduo do ADR-0021 (`docs/ADRs/0021-recap-calendario-unificado.md`,
Aceito, 2026-05-07), que unificou Recap e Calendário.

**`Timeline.tsx` — substituto nomeado em documento canônico.** É o único dos órfãos desta
varredura cuja substituição está declarada por escrito na fonte de verdade funcional do
projeto. `docs/FEATURES-CANONICAS.md:876-885` (§8, nota histórica do ADR-0021), literal:

> O componente legacy `CalendarioConquistasScreen` foi removido. A `<Timeline>`
> horizontal foi substituída pela visão calendário mensal + lista vertical do dia
> selecionado.

Concretamente, o substituto é **`src/components/screens/RecapModoCalendario.tsx`**: os dots
roxos no grid mensal fazem o papel de panorama do período, e a lista vertical do dia
selecionado (`:187-188`) faz o papel de leitura item a item — **mesmo `<ConquistaCard>`**
que a `<Timeline>` usava, **mesma fonte de dados** (`useConquistas`).
Trocou-se scroll horizontal por seleção de dia mais scroll vertical. Não é esquecimento: é
decisão registrada de que a representação vertical venceu. **Remoção sem ressalva.**

Nota de valor residual, para ler antes de apagar (não é argumento para manter): a lógica de
stagger de `Timeline.tsx:22-36` é um cálculo bem comentado de teto de 600 ms com piso de
30 ms por card, abandonando o piso acima de 20 itens. Se outra lista do app precisar de
stagger com teto, vale reler este arquivo no histórico antes de reinventar.

**`FiltrosBar.tsx` — decisão do dono de 2026-07-29: não sai desta sprint.** Escolhida a
opção **(B)** descrita abaixo. A barra é preservada e passa a ser montada dentro do modo
Calendário do Recap pela sprint **`AUDIT-P2-11-FILTROSBAR-RECAP`**, com um subconjunto dos
filtros. Consequência direta: **nada de `src/lib/hooks/useConquistas.ts` e de
`src/lib/conquistas/filtros.ts` é tocado aqui** — os cinco setters e os cinco
`filtrarPorX` continuam como estão, porque passam a ter consumidor real na sprint seguinte.
A subseção a seguir fica como registro do que motivou a decisão.

#### O efeito colateral: 5 filtros de conquista sem controle de usuário

`src/lib/conquistas/filtros.ts` exporta cinco filtros individuais — `filtrarPorPessoa`
(`:48`), `filtrarPorMes` (`:77`), `filtrarPorTipoMidia` (`:108`), `filtrarPorIntensidade`
(`:117`), `filtrarPorBairro` (`:131`) — combinados por `aplicarFiltros` (`:148`).

Nenhum dos cinco tem consumidor fora de `aplicarFiltros`: `grep -rn "filtrarPorPessoa|
filtrarPorMes|filtrarPorTipoMidia|filtrarPorIntensidade|filtrarPorBairro" src app tests`
devolve, fora do próprio `filtros.ts`, apenas `tests/lib/conquistas/filtros.test.ts`. São
`export` sem necessidade — usados só internamente e pela suíte.

`src/lib/hooks/useConquistas.ts` expõe os cinco setters correspondentes
(`setFiltroPessoa`, `setFiltroMes`, `setFiltroTipoMidia`, `setFiltroIntensidade`,
`setFiltroBairro`, `:132-150`) mais `resetarFiltros`. O único consumidor do hook é
`src/components/screens/RecapModoCalendario.tsx:48`, que desestrutura apenas
`{ brutas, conquistas, loading, error }` — **nenhum setter é chamado**.

Consequência hoje: `useConquistas` sempre roda com `FILTROS_DEFAULT`
(`useConquistas.ts:69`). Os cinco filtros existem, funcionam, estão testados, e nenhum
usuário consegue mexer neles. A UI que os expunha era exatamente o `FiltrosBar`.

Duas saídas, e a escolha é do dono:

- **(A) Remover `FiltrosBar.tsx` e assumir que os filtros ficam sem controle.** Coerente
  com o ADR-0021, que descreve o modo Calendário do Recap como "grid mensal com dots +
  lista do dia" — sem barra de filtros. Nesse caso, os cinco setters de `useConquistas` e
  os quatro filtros não usados (`filtrarPorMes`, `filtrarPorTipoMidia`,
  `filtrarPorIntensidade`, `filtrarPorBairro`) também deveriam sair, ou viram a próxima
  geração de órfãos.
- **(B) Preservar `FiltrosBar.tsx` e montá-lo em `RecapModoCalendario.tsx`.** Devolve ao
  usuário o controle dos filtros. Deixa de ser limpeza e vira feature — sprint própria,
  fora desta.

**Recomendação original desta spec: (A) REMOVER**, porque manter UI construída e desmontada
"por precaução" é precisamente o mecanismo que gerou este catálogo. Registrada aqui porque
a recomendação era de **higiene**, sob esse critério.

**Decidido pelo dono em 2026-07-29: (B).** O eixo da decisão mudou — o dono quer a
capacidade de volta, e nesse eixo a higiene deixa de ser o critério dominante. Sustentação
por escrito, que a recomendação (A) teria descartado:

- `ADR-0021:86-94` **adiou**, não matou: *"a exposição visual desses filtros no novo modo
  fica documentada como melhoria futura (não bloqueia v1.0.0). O hook continua expondo os
  setters; uma sprint subsequente pode adicionar uma `<FiltrosBar>` embutida sem mexer no
  shape do hook."*
- `ADR-0021:111-114` reconhece a perda como **temporária**: *"usuário que dependia dos
  filtros perde-os temporariamente. Mitigação: os filtros voltam em sprint futura, agora
  embutidos no Recap."*
- `docs/FEATURES-CANONICAS.md:697-698` repete o compromisso: *"os 5 filtros M11.5 ficam no
  estado, exposição visual embutida volta em sprint subsequente"*.

Ou seja: a intenção nunca foi revogada, só nunca foi materializada em spec. A sprint
prometida agora existe — **`AUDIT-P2-11-FILTROSBAR-RECAP`** — e é lá que o item vive. Esta
sprint não toca `FiltrosBar.tsx`.

### 5.3 `OuroborosLogo` — PRESERVAR (trabalho em curso, NÃO-objetivo)

A auditoria registrou que a marca canônica não é renderizada em lugar nenhum. O grep
confirma:

```
$ grep -rn "OuroborosLogo" --include="*.ts" --include="*.tsx" src app tests
src/components/brand/index.ts:2,3                      barril
src/components/brand/OuroborosLogo.tsx:43,51,54        a propria definicao
src/components/brand/glifo/OuroborosGlifo.tsx:5        comentario
src/components/brand/glifo/geometria.ts:6              comentario
app/_dev/bench-c2.tsx:190                              comentario num bench
tests/components/brand/OuroborosLogo.test.tsx          3 casos
```

**Mas a verificação desmentiu a conclusão.** É trabalho ativo, não abandono:

1. `git status --short` mostra `src/components/brand/OuroborosLogo.tsx` **modificado e não
   commitado**, com 155 linhas alteradas. `git diff --stat` confirma.
2. A geometria do logo foi promovida para `src/components/brand/glifo/geometria.ts`, cujo
   cabeçalho (`:6`) declara: *"anterior em OuroborosLogo.tsx (valores byte-identicos)"*.
3. `docs/sprints/R-BRAND-9-MIGRACAO-spec.md:165-175` tem uma seção intitulada **"Decisão
   condicional — OuroborosLogo"**, que já enquadra exatamente esta pergunta e a deixa
   pendente de decisão dentro da onda `r-brand-system`.
4. Os dois commits mais recentes antes de `HEAD` (`7446be6`, `6d4b8dc`) materializam os
   specs dessa onda.

**Recomendação: PRESERVAR. NÃO-objetivo desta sprint.** Remover `OuroborosLogo` aqui
atropelaria uma onda em execução e uma decisão que já tem dono e lugar
(`R-BRAND-9-MIGRACAO`). Registrado para que auditorias futuras não o listem de novo sem
esse contexto.

### 5.4 Quatro componentes de Finanças (486 linhas) — PRESERVAR (NÃO-objetivo)

| Arquivo | Linhas |
|---|---:|
| `src/components/financas/BannerLeitura.tsx` | 87 |
| `src/components/financas/CardHero.tsx` | 91 |
| `src/components/financas/CardTopCategorias.tsx` | 124 |
| `src/components/financas/ListaTransacoes.tsx` | 184 |

O grep confirma que nenhum é importado em produção; o único hit externo é um comentário em
`src/components/screens/MiniFinanceiroScreen.tsx:7-11` que os chama de código morto.

**Mas a caracterização de "morte declarada em M35" está errada — M35 declarou o
oposto.** `docs/sprints/M35-spec.md`, seção "Arquivos NÃO modificados":

> - Cards de finanças (`CardHero`, `CardTopCategorias`, `ListaTransacoes`) — ficam
>   disponíveis, podem ser reativados em sprint futura sem perda.

E na seção "4. Restrições":

> - **Não apagar** componentes auxiliares de finanças (CardHero etc.) — ficam disponíveis
>   para retomada futura.

O comentário do próprio `MiniFinanceiroScreen.tsx:9-11` repete a intenção: *"permanecem no
repositorio como codigo morto. Quando o backend publicar o cache, basta restaurar esta
tela para a versao M14."* Os três componentes citados ainda têm suítes Jest verdes
(`tests/components/financas/`).

**Recomendação: PRESERVAR. NÃO-objetivo desta sprint.** É preservação deliberada,
documentada em spec e no código, esperando o pipeline de desktop publicar
`.ouroboros/cache/financas-cache.json`. Remover contrariaria uma restrição escrita de
M35. Se o dono quiser revogar essa decisão, é sprint própria que precisa tocar também
`src/lib/schemas/financas-cache.ts` e a decisão de produto sobre a aba.

### 5.5 `app/em-construcao.tsx` (45 linhas) — REMOVER

```
$ grep -rn "em-construcao\|em_construcao\|EmConstrucao" --include="*.ts" --include="*.tsx" --include="*.js" src app tests
app/em-construcao.tsx:17:export default function EmConstrucao() {
```

Um hit em todo o repositório: a própria declaração. Zero `router.push`, zero `<Link href>`,
zero `?sprint=` montado, zero teste.

O contrato que a criou está em `docs/sprints/INTEGRATION-CONTRACT.md` §5.2 ("Rota órfã",
`:472` em diante), e descreve um padrão de navegação por abas — *"stub default em
`app/(tabs)/em-construcao.tsx` (criado em M00.5)"*, `:483-484` — para garantir que
*"toda rota declarada no navigator tem destino renderizável"*. Não era feature: era
dispositivo de integração, andaime para o usuário não tocar numa aba e crashar o app.

**Substituto nomeado: `+not-found`**, o fallback nativo do Expo Router. E o pressuposto do
contrato não existe mais: a estrutura `(tabs)` foi **dissolvida no M27** (`5db8c3e`,
2026-05-03, que trocou bottom tabs por menu lateral e no caminho moveu o arquivo de
`app/(tabs)/em-construcao.tsx` para `app/em-construcao.tsx`). Não há navigator com rota
declarada apontando para o vazio, então o problema que o stub resolvia **deixou de
ocorrer**.

O cabeçalho do próprio arquivo (`app/em-construcao.tsx:1-6`) se auto-preserva — *"permanece
como fallback generico para deep link manual"* — mas a auto-preservação não se sustenta
porque **não há emissor**: zero `router.push`, zero `<Link href>`, zero `?sprint=` montado
em todo o repositório, e um deep link digitado à mão para rota inexistente já cai em
`+not-found`.

**Recomendação: REMOVER.** É código morto por sucesso: todas as sprints que apontariam
para cá fecharam. Reativá-lo exigiria primeiro **recriar** o problema que ele resolve. Se
algum dia o padrão voltar a ser necessário, reescrever 45 linhas triviais é mais barato que
carregar um stub morto e reexplicá-lo em cada auditoria.

## Ligar ou remover — resumo

| Item | Linhas | Decisão do dono (2026-07-29) | Substituto nomeado |
|---|---:|---|---|
| 5.1 `FotoDetalhe.tsx` | 120 | **REMOVER** | `app/galeria/detalhe/[slug].tsx` |
| 5.2 `calendario/Timeline.tsx` | 57 | **REMOVER** | `RecapModoCalendario.tsx` (calendário mensal + lista vertical), declarado em `FEATURES-CANONICAS.md:876-885` |
| 5.5 `app/em-construcao.tsx` | 45 | **REMOVER** | `+not-found`; problema extinto com a dissolução de `(tabs)` no M27 |
| | **222** | total que sai desta sprint | |
| 5.2 `calendario/FiltrosBar.tsx` | 233 | **PRESERVAR** — opção (B) | vira feature: `AUDIT-P2-11-FILTROSBAR-RECAP` |
| 5.3 `OuroborosLogo` | — | **PRESERVAR** — NÃO-objetivo | trabalho ativo em `R-BRAND-9` |
| 5.4 Componentes de Finanças | 486 | **PRESERVAR** — NÃO-objetivo | M35 proíbe apagar, por escrito |

## Escopo (mínimo)

1. Deletar `src/components/screens/FotoDetalhe.tsx` (120 linhas).
2. Deletar `src/components/calendario/Timeline.tsx` (57 linhas). O diretório
   `src/components/calendario/` **permanece**, com o `FiltrosBar.tsx` dentro.
3. Deletar `app/em-construcao.tsx` (45 linhas) e marcar
   `docs/sprints/INTEGRATION-CONTRACT.md` §5.2 (`:472` em diante) como **histórica** —
   preferível a apagar, porque o contrato tem valor documental sobre por que o padrão
   existiu; sem isso a seção passa a descrever um arquivo inexistente e uma estrutura
   `app/(tabs)/` que não existe desde o M27.
4. **NÃO tocar `src/components/calendario/FiltrosBar.tsx`** — bloqueio resolvido pela
   decisão do dono de 2026-07-29 (opção B, §5.2). Por consequência, **não** remover os
   setters de `src/lib/hooks/useConquistas.ts` (definições em `:122-145`, reexport no
   objeto de retorno em `:154-159`) e **não** despublicar os cinco `filtrarPorX` de
   `src/lib/conquistas/filtros.ts` (`:48`, `:77`, `:108`, `:117`, `:131`): todos passam a
   ter consumidor real em `AUDIT-P2-11-FILTROSBAR-RECAP`. Mexer neles aqui criaria
   trabalho a desfazer na sprint seguinte.
5. Atualizar `docs/FEATURES-CANONICAS.md`: §8 (nota histórica do ADR-0021, `:876-885`)
   registra a remoção do resíduo `Timeline.tsx` e que a exposição dos filtros passou a ter
   sprint própria; registrar também que a rota `/em-construcao` deixou de existir.
6. Caso E2E em `tests/e2e/playwright/audit-p2-10-orfaos-limpeza.e2e.ts`, copiado de
   `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: as rotas e telas que
   permanecem continuam navegáveis após a remoção — galeria abre detalhe de item, Recap
   abre no modo Calendário, Configurações renderiza inteira. O E2E aqui existe para provar
   que a remoção não levou vizinho junto, que é o único risco real desta sprint.
7. NÃO-objetivo: `OuroborosLogo` e o diretório `src/components/brand/` (§5.3), e
   `src/components/calendario/FiltrosBar.tsx` (§5.2, item 4 acima).
8. NÃO-objetivo: os quatro componentes de `src/components/financas/` e
   `src/lib/schemas/financas-cache.ts` (§5.4).
9. NÃO-objetivo: os órfãos triviais de export catalogados em [NI-16]
   (`getNowPlaying`, `SpotifyTokenExpiradoError`, `lerEventoAgenda`,
   `listarTodosEventosContador`, `driveHttpReal`) e a flag `recapAmbientAudio` ([NI-15]).
   Classes diferentes, sprints próprias.
10. NÃO-objetivo: a rota `/widget-config` ([P2-6]). Ela é hoje o único caminho de drenagem
    da fila do widget To-do (achado [P1-1]) e não pode ser removida antes daquele bug ser
    corrigido.

## Proof-of-work

```bash
# 1. Os arquivos removidos nao deixam referencia pendurada
grep -rn "FotoDetalhe" --include="*.ts" --include="*.tsx" src app tests          # 0 hits
grep -rn "calendario/Timeline" --include="*.ts" --include="*.tsx" src app tests  # 0 hits
ls src/components/calendario/                                                    # so' FiltrosBar.tsx
grep -rn "em-construcao\|EmConstrucao" --include="*.ts" --include="*.tsx" src app tests  # 0 hits

# 2. Os itens preservados continuam intactos (guarda contra remocao acidental)
test -f src/components/brand/OuroborosLogo.tsx && echo "OuroborosLogo preservado"
test -f src/components/calendario/FiltrosBar.tsx && echo "FiltrosBar preservado (AUDIT-P2-11)"
ls src/components/financas/*.tsx | wc -l                                         # 4
git diff --stat -- src/lib/hooks/useConquistas.ts src/lib/conquistas/filtros.ts   # vazio

# 3. Aritmetica da remocao (validar antes de executar)
#    FotoDetalhe 120 + Timeline 57 + em-construcao 45 = 222 linhas
#    FiltrosBar (233) NAO entra: opcao B, escopo de AUDIT-P2-11
wc -l src/components/screens/FotoDetalhe.tsx src/components/calendario/Timeline.tsx \
      app/em-construcao.tsx                                                      # 222 total

# 4. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test --silent                                    # baseline nao regride
npx --no-install eslint app/ src/                    # sem import quebrado
./scripts/smoke.sh                                   # verde

# 5. Validacao visual obrigatoria (a sprint remove arquivos de UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Galeria -> abrir item -> detalhe; Recap -> modo Calendario; Configuracoes
# esperado: nenhuma tela quebra; nenhum import morto derruba a rota
# screenshots em docs/sprints/AUDIT-P2-10-ORFAOS-LIMPEZA-screenshots-gauntlet/
```

## Commit

```
refactor: audit-p2-10 remove fotodetalhe timeline e em-construcao orfaos confirmados
```
