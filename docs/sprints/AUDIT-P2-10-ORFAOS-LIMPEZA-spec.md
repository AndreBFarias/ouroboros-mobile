# AUDIT-P2-10-ORFAOS-LIMPEZA — varredura de órfãos confirmados: o que remover e o que preservar

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: baixa (nenhum item causa defeito ao usuário hoje; o custo é de manutenção e
            de ruído em auditorias futuras)
DEPENDE:    nenhuma. Dois itens têm bloqueio de decisão do dono antes da execução —
            ver §5.2 (FiltrosBar) e §5.3 (OuroborosLogo)
ORIGEM:     achados soltos de [P2] / [NI-09] / [NI-10] / [NI-11] / [NI-13] da auditoria de
            2026-07-28. Reverificados um a um nesta materialização em `main @ b5bf2db`.
            Dois deles não sobreviveram à verificação: `OuroborosLogo` é trabalho em curso
            e os componentes de Finanças têm preservação declarada em spec. Ambos viram
            NÃO-objetivo explícito abaixo.
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

`app/galeria/detalhe/[slug].tsx` (223 linhas) é rota real, alcançável também por
`src/lib/recap/destinos.ts:51` e `app/recap-lista.tsx:232`. Cobre a mesma intenção
(detalhe de um item da galeria) com mais informação (frontmatter completo). Manter duas
implementações concorrentes do mesmo gesto é o que produz divergência.

Ressalva honesta: o tipo `FotoAgregada` de `src/lib/hooks/useFotosAgregadas.ts` **é**
amplamente usado (galeria, saúde física, medidas) e não sai junto. Só o componente sai.

### 5.2 `src/components/calendario/` (290 linhas) — REMOVER, com decisão do dono antes

| Arquivo | Linhas | Evidência |
|---|---:|---|
| `src/components/calendario/FiltrosBar.tsx` | 233 | `grep -rn "\bFiltrosBar\b" src app tests` → 1 hit, **comentário** em `src/lib/stores/filtroEfetivo.ts:42`. Zero imports. |
| `src/components/calendario/Timeline.tsx` | 57 | `grep -rn "import.*Timeline\|<Timeline" src app tests` → **0 hits**. |

Zero cobertura em `tests/`. Não existe `src/components/calendario/index.ts`.

Contexto: são resíduo do ADR-0021 (`docs/ADRs/0021-recap-calendario-unificado.md`,
Aceito, 2026-05-07), que unificou Recap e Calendário. `docs/FEATURES-CANONICAS.md:854-859`
registra que o `CalendarioConquistasScreen` foi removido e que *"a `<Timeline>`
horizontal foi substituída pela visão calendário mensal + lista vertical do dia
selecionado"*.

- **`Timeline.tsx`** — substituição declarada em documento canônico. Remoção sem ressalva.
- **`FiltrosBar.tsx`** — remoção sela um efeito colateral que precisa ser decidido, não
  herdado.

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

**Recomendação: (A) REMOVER**, porque manter UI construída e desmontada "por precaução" é
precisamente o mecanismo que gerou este catálogo. Mas a remoção fecha uma porta de
produto, então **exige confirmação explícita do dono registrada antes da execução**. Sem
essa confirmação, executar apenas a remoção de `Timeline.tsx`.

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

O contrato que a criou está em `docs/sprints/INTEGRATION-CONTRACT.md` §5.2 ("Rota órfã"),
e descreve um padrão de navegação por abas (`app/(tabs)/_layout.tsx`,
`app/(tabs)/em-construcao.tsx`) que não corresponde mais à estrutura de rotas do app. O
cabeçalho do próprio arquivo (`app/em-construcao.tsx:1-6`) diz que ele *"permanece como
fallback generico para deep link manual"* — mas nenhum deep link do app o produz, e um
deep link digitado à mão para uma rota que não existe já cai em `+not-found`.

**Recomendação: REMOVER.** É código morto por sucesso: todas as sprints que apontariam
para cá fecharam. A auto-preservação declarada no comentário não se sustenta porque não
há emissor de deep link.

## Ligar ou remover — resumo

| Item | Recomendação | Verificação |
|---|---|---|
| 5.1 `FotoDetalhe.tsx` | **REMOVER** | confirmou o achado |
| 5.2 `calendario/Timeline.tsx` | **REMOVER** | confirmou o achado |
| 5.2 `calendario/FiltrosBar.tsx` | **REMOVER**, após decisão do dono sobre os 5 filtros | confirmou o achado e o efeito colateral |
| 5.3 `OuroborosLogo` | **PRESERVAR** — NÃO-objetivo | **desmentiu**: trabalho ativo em `r-brand-system` |
| 5.4 Componentes de Finanças | **PRESERVAR** — NÃO-objetivo | **desmentiu**: M35 proíbe apagar, por escrito |
| 5.5 `app/em-construcao.tsx` | **REMOVER** | confirmou o achado |

## Escopo (mínimo)

1. Deletar `src/components/screens/FotoDetalhe.tsx`.
2. Deletar `src/components/calendario/Timeline.tsx`.
3. Deletar `app/em-construcao.tsx` e a referência obsoleta em
   `docs/sprints/INTEGRATION-CONTRACT.md` §5.2, ou marcar a seção como histórica.
4. **Bloqueio humano:** obter e registrar a decisão do dono sobre os cinco filtros de
   conquista (§5.2, opções A e B) antes de tocar `FiltrosBar.tsx`. Se A, deletar
   `FiltrosBar.tsx` e, no mesmo commit, remover os setters não usados de
   `src/lib/hooks/useConquistas.ts:132-150` e **despublicar** (remover o `export`, sem
   apagar a função) os cinco filtros individuais de `src/lib/conquistas/filtros.ts`, que
   continuam necessários internamente a `aplicarFiltros` mas não têm consumidor externo
   além dos testes — ajustando `tests/lib/conquistas/filtros.test.ts` para exercitá-los
   pela superfície pública `aplicarFiltros`. Se B, esta sprint não toca `FiltrosBar.tsx`
   e o item vira sprint de feature própria.
5. Atualizar `docs/FEATURES-CANONICAS.md`: §8 (nota do ADR-0021) registra a remoção do
   resíduo `src/components/calendario/`; registrar também que a rota `/em-construcao`
   deixou de existir.
6. Caso E2E em `tests/e2e/playwright/audit-p2-10-orfaos-limpeza.e2e.ts`, copiado de
   `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: as rotas e telas que
   permanecem continuam navegáveis após a remoção — galeria abre detalhe de item, Recap
   abre no modo Calendário, Configurações renderiza inteira. O E2E aqui existe para provar
   que a remoção não levou vizinho junto, que é o único risco real desta sprint.
7. NÃO-objetivo: `OuroborosLogo` e o diretório `src/components/brand/` (§5.3).
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
grep -rn "components/calendario" --include="*.ts" --include="*.tsx" src app tests # 0 hits
grep -rn "em-construcao\|EmConstrucao" --include="*.ts" --include="*.tsx" src app tests  # 0 hits

# 2. Os itens preservados continuam intactos (guarda contra remocao acidental)
test -f src/components/brand/OuroborosLogo.tsx && echo "OuroborosLogo preservado"
ls src/components/financas/*.tsx | wc -l                                         # 4

# 3. Aritmetica da remocao (validar antes de executar)
#    FotoDetalhe 120 + Timeline 57 + em-construcao 45 = 222 linhas
#    com a opcao A de 5.2, mais FiltrosBar 233 = 455 linhas
wc -l src/components/screens/FotoDetalhe.tsx src/components/calendario/Timeline.tsx \
      app/em-construcao.tsx src/components/calendario/FiltrosBar.tsx

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
