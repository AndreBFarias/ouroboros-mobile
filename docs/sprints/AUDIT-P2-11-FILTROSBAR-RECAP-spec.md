# AUDIT-P2-11-FILTROSBAR-RECAP — religar os filtros de conquista dentro do Recap

```
STATUS:     materializada 2026-07-29 (decisão do dono sobre o §5.2 de AUDIT-P2-10)
PRIORIDADE: média (é capacidade que o usuário não tem hoje e que o ADR-0021 prometeu por
            escrito; o código pesado já está pronto e testado, falta a superfície)
DEPENDE:    nenhuma. Coordenada com `AUDIT-P2-10`, que por decisão do dono NÃO toca
            `FiltrosBar.tsx`, `useConquistas.ts` nem `conquistas/filtros.ts`. As duas
            sprints podem rodar em qualquer ordem sem conflito de arquivo.
ORIGEM:     opção (B) do §5.2 de `AUDIT-P2-10-ORFAOS-LIMPEZA-spec.md`, escolhida pelo dono
            em 2026-07-29 após a investigação de órfãos. É a "sprint subsequente" que o
            `ADR-0021:86-94` prometeu em 2026-05-07 e que nunca foi materializada.
DECISAO:    (dono, 2026-07-29) Religar a barra dentro do Recap (modo Calendário) com
            quatro filtros: pessoa, mídia, intensidade e bairro. O filtro "mês" é
            DESCARTADO — o calendário mensal já navega por mês e o controle seria
            redundante. Nenhum ativo SVG novo entra nesta sprint.
```

## Problema (cinco filtros implementados, testados e inalcançáveis)

`src/components/calendario/FiltrosBar.tsx` (233 linhas) implementa uma barra completa de
filtro de conquistas. O cabeçalho do arquivo (`:1-16`) e o render (`:119-218`) descrevem os
cinco controles:

| # | Filtro | Controle | Linhas do render | Função pura |
|---|---|---|---:|---|
| 1 | **pessoa** | `ChipGroup mode="single"` — nome A / nome B / rótulo de "ambos" vindo de `useNomeDe('ambos')`, ramificado por `tipoCompanhia` | `:121-140` | `filtrarPorPessoa` (`filtros.ts:48`) |
| 2 | **mês** | `Chip` em `ScrollView` horizontal: 'Tudo' / 'Este mês' / 'Mês passado' | `:142-157` | `filtrarPorMes` (`:77`) |
| 3 | **tipo de mídia** | `Chip` em `ScrollView` horizontal: 'Tudo' / 'Foto' / 'YouTube' / 'Spotify' / 'Áudio' | `:159-174` | `filtrarPorTipoMidia` (`:108`) |
| 4 | **intensidade** | **Dois `Slider`** 1-5 (mín e máx), com clamp cruzado para o mín nunca passar o máx | `:176-208` | `filtrarPorIntensidade` (`:117`) |
| 5 | **bairro** | `Input` livre com **debounce de 300 ms** e cleanup do timer no unmount | `:210-216` | `filtrarPorBairro` (`:131`) |

O comentário de `:10-13` justifica a escolha dos sliders: *"ChipGroup single seria menos
preciso para um range; sliders seguem o mesmo padrão visual usado no resto do app (energia,
ansiedade etc)"*. O cleanup do debounce (`:102-109`) explica que existe para *"evitar
disparar onBairro depois que o modal de filtros [foi] fechado durante janela de 300ms"*.

### Nenhum dos setters é chamado

`src/lib/hooks/useConquistas.ts` expõe os cinco setters mais `resetarFiltros` — definidos em
`:122-145` e devolvidos no objeto de retorno em `:154-159`:

```
:122  setFiltroPessoa       :134  setFiltroIntensidade
:126  setFiltroMes          :138  setFiltroBairro
:130  setFiltroTipoMidia    :142  resetarFiltros
```

O **único** consumidor do hook é `src/components/screens/RecapModoCalendario.tsx:48`, que
desestrutura apenas quatro campos e nenhum setter:

```ts
const { brutas, conquistas, loading, error } = useConquistas();
```

Consequência: `useConquistas` roda **sempre** com `FILTROS_DEFAULT`
(`useConquistas.ts:68-71`), isto é `{ pessoa: 'ambos', mes: 'tudo', tipoMidia: 'tudo',
intensidade: { min: 1, max: 5 }, bairro: '' }` (`filtros.ts:39-45`) — nada filtrado. Os
cinco filtros existem, funcionam, estão testados (`tests/lib/conquistas/filtros.test.ts`) e
**nenhum usuário consegue mexer neles**.

A única exceção parcial é `pessoa`, que herda `filtroPessoaGlobal` no `useState` inicial e
no `resetarFiltros` (`:70`, `:143`) — o filtro global de pessoa do app entra por essa porta.
Os outros quatro estão 100% congelados no default.

### Sintoma colateral: um empty state inalcançável

`RecapModoCalendario.tsx:85-87` distingue duas ausências:

```ts
const sem = !loading && brutas.length === 0;
const semAposFiltro =
  !loading && brutas.length > 0 && conquistas.length === 0;
```

E `:123-125` renderiza um `<EmptyState frase="Nada por aqui ainda." />` para o segundo caso.
Esse galho existe justamente para "você filtrou e não sobrou nada", e hoje é praticamente
inalcançável — só o filtro global de pessoa pode chegar lá. Religar a barra torna o galho
alcançável de verdade, o que o transforma em superfície a revisar (item 6 do escopo), não
em código novo a escrever.

### A integração foi adiada por escrito, e a sprint prometida nunca existiu

`docs/ADRs/0021-recap-calendario-unificado.md:86-94`, seção "Filtros de Calendário",
literal:

> Os 5 filtros do antigo Calendário (pessoa, mês, tipo de mídia, intensidade, bairro)
> **não são expostos na UI inicial** do modo Calendário. `useConquistas` continua
> aplicando os defaults. A exposição visual desses filtros no novo modo fica documentada
> como melhoria futura (não bloqueia v1.0.0). O hook continua expondo os setters; uma
> sprint subsequente pode adicionar uma `<FiltrosBar>` embutida sem mexer no shape do hook.

E em Consequências / Negativas (`:111-114`): *"usuário que dependia dos filtros perde-os
temporariamente. Mitigação: os filtros voltam em sprint futura, agora embutidos no Recap."*
O mesmo compromisso está em `docs/FEATURES-CANONICAS.md:697-698`: *"os 5 filtros M11.5 ficam
no estado, exposição visual embutida volta em sprint subsequente"*.

**Essa sprint subsequente nunca foi materializada.** Não havia, até 2026-07-29, nenhum spec
em `docs/sprints/` planejando religar a barra: os únicos arquivos que a citavam eram M11.5
(origem), M28, o ADR-0021, o `FEATURES-CANONICAS.md` e a auditoria de 2026-07-28. Foi
promessa por escrito que caducou por esquecimento, não por revogação. Este spec é a sprint
que faltava.

## Dois fatos técnicos apurados — o que esta sprint NÃO precisa fazer

Registrados para evitar trabalho desnecessário no passo 0 da execução.

### 1. Nenhum ativo SVG novo é necessário

A barra é **inteiramente texto** hoje: `FiltrosBar.tsx:18-19` importa `ScrollView, Text,
View` do React Native e `Chip, ChipGroup, Input, Slider` de `@/components/ui`. **Zero import
de ícone.** Os rótulos saem de um helper local `Rotulo` (`:221-233`), que é um `Text`.

Verificado, não inferido:

- `find assets -name "*.svg"` devolve **0 arquivos**. Não existe nenhum SVG em `assets/`.
- Nenhum spec, mockup ou ADR prevê ativos SVG para estes filtros — nem `M11.5-spec.md`, nem
  o adendo, nem o ADR-0021 mencionam ícone por filtro.
- A estratégia de ícones do projeto é o shim `src/lib/icons.ts` (76 linhas), criado em
  `M-BUNDLE-DIET` para forçar tree-shake de `lucide-react-native` — e lucide renderiza **via
  `react-native-svg`**. Qualquer ícone adicionado ali já é SVG por construção.

Se a sprint **quiser** ícone por filtro (opcional, não exigido), o shim já tem quase tudo:
`MapPin` (`icons.ts:46`) para bairro, `Music` (`:51`) para Spotify, `Mic` (`:49`) ou
`Volume2` (`:70`) para áudio, `Image` / `ImageIcon` (`:39-40`) para foto, `Zap` (`:74`)
para intensidade. **Faltam exatamente dois exports** — `grep -n "Youtube\|User"
src/lib/icons.ts` devolve **0 hits**, ou seja `Youtube` e `User` não estão no shim. São duas
linhas de `export` no mesmo formato das vizinhas (o próprio cabeçalho do arquivo, `:10`,
documenta o procedimento: *"adicionar novo icone: importar do path direto e exportar
named"*), não arte nova.

### 2. O shape do hook não muda — a integração é de UI

O `ADR-0021:86-94` garante que a barra entra *"sem mexer no shape do hook"*, e a verificação
confirma: os setters já estão lá (`useConquistas.ts:122-145`, retornados em `:154-159`), só
não são desestruturados na linha 48 de `RecapModoCalendario.tsx`. Nada em
`src/lib/hooks/useConquistas.ts` nem em `src/lib/conquistas/filtros.ts` precisa ser
adicionado, renomeado ou reordenado.

## Escopo (mínimo)

1. **Montar a barra em `src/components/screens/RecapModoCalendario.tsx`**, desestruturando
   em `:48` os setters que o hook já expõe, além de `filtros` para alimentar as props
   controladas de `<FiltrosBar>` (`FiltrosBarProps` em `:31-38`: `filtros`, `onPessoa`,
   `onMes`, `onTipoMidia`, `onIntensidade`, `onBairro`).

2. **Superfície — resolver no passo 0 da execução, com evidência.** Não é decisão do dono
   pendente; é escolha de implementação, e o spec registra o que pesa em cada lado:
   - **Barra sempre visível** empurra o calendário para baixo numa tela já densa (grid
     mensal + lista vertical do dia).
   - **Bottom sheet atrás de um controle no header** preserva a densidade e é o que o
     desenho original parece pressupor: o cleanup de debounce em `FiltrosBar.tsx:102-109`
     fala explicitamente de *"modal de filtros fechado durante janela de 300ms"*.
   - **Recomendação: sheet.** Quem executar deve registrar a escolha e o motivo no
     proof-of-work, com screenshot dos dois estados (fechado e aberto).

3. **Filtros a religar: pessoa, mídia, intensidade e bairro.** Quatro dos cinco. O
   comportamento das funções puras não muda — elas já estão testadas e combinadas por
   `aplicarFiltros` (`filtros.ts:148`).

4. **Descartar o filtro "mês" — decisão do dono, 2026-07-29, e NÃO-objetivo.** O calendário
   mensal do Recap já navega por mês; um chip 'Tudo' / 'Este mês' / 'Mês passado' ao lado
   dele é semanticamente duplicado e cria a pergunta "o mês do chip ou o mês que estou
   vendo?". Execução: **não** renderizar o bloco `:142-157` da barra dentro do Recap e
   deixar `filtros.mes` no default `'tudo'` (`filtros.ts:41`), de modo que
   `filtrarPorMes` devolva a lista intacta. Duas saídas aceitáveis, à escolha de quem
   executa:
   - prop opcional na `FiltrosBar` (ex.: `mostrarMes`, default `true`) que suprime o bloco;
   - ou `onMes` recebendo um no-op e o bloco condicionado pela mesma prop.

   **Não** apagar `filtrarPorMes`, `setFiltroMes` nem o campo `mes` de
   `FiltrosConquistas` — o tipo aceita `{ ano, mes }` arbitrário (`filtros.ts:20-21`,
   `mesIgual` em `FiltrosBar.tsx:55-58`) e continua sendo contrato do hook.

5. **Preservar a regra de privacidade, sem regressão.** `FiltrosBar.tsx:87-96` e `:121-140`
   escondem a opção 'ambos' quando `vaultCompartilhado === false`, caindo para `pessoa_a`
   como default seguro (`:132-135`). É privacidade declarada em Configurações. Precisa
   virar **teste**, não intenção: com `vaultCompartilhado = false`, o chip de 'ambos' não
   é renderizado e o filtro efetivo nunca volta para 'ambos'.

6. **Indicador de filtro ativo.** Sem ele o usuário filtra, esquece, e lê a lista vazia
   como bug — sobretudo com a barra em sheet, onde o estado fica escondido. Mínimo
   aceitável: contador ou ponto no controle que abre a barra quando `filtros` difere de
   `FILTROS_DEFAULT`, mais um caminho visível para `resetarFiltros`
   (`useConquistas.ts:142-145`), que hoje não tem chamador nenhum. Revisar junto a frase do
   `semAposFiltro` (`RecapModoCalendario.tsx:123-125`, hoje *"Nada por aqui ainda."*), que
   passa a ser alcançável de verdade e precisa dizer que o vazio vem do filtro.

7. **Testes Jest.** Não existe hoje `tests/components/calendario/` — a `FiltrosBar` tem
   **zero** cobertura. Criar a suíte:
   - cada um dos quatro filtros religados chama o setter correspondente com o valor certo;
   - clamp cruzado dos dois sliders de intensidade (mín não passa o máx e vice-versa);
   - debounce do bairro: um `onBairro` após 300 ms, não um por tecla; e nenhum disparo após
     unmount (o cleanup de `:102-109`);
   - privacidade do item 5;
   - bloco de mês ausente (item 4);
   - integração em `RecapModoCalendario`: mudar um filtro muda a lista do dia selecionado.

8. **Atualizar `docs/FEATURES-CANONICAS.md`** — obrigatório pelo arquivo de regras da raiz.
   Dois pontos: `:697-698`, que hoje promete *"exposição visual embutida volta em sprint
   subsequente"*, passa a descrever os quatro filtros expostos e a superfície escolhida; e
   a nota histórica de §8 (`:876-885`) registra que a promessa do ADR-0021 foi cumprida em
   2026-07-29, com o "mês" descartado por redundância.

9. **Caso E2E** em `tests/e2e/playwright/audit-p2-11-filtrosbar-recap.e2e.ts`, copiado da
   estrutura de `tests/e2e/playwright/e2e-template.ts` (nome da função default
   `case_audit_p2_11_filtrosbar_recap`). Assert de **comportamento**, não de presença:
   semear conquistas de intensidades e bairros diferentes via `window.__gauntlet`, abrir o
   Recap no modo Calendário, aplicar um filtro e conferir que **a lista do dia selecionado
   muda** (item que sai da lista, contagem de dots que diminui); depois limpar o filtro e
   conferir que a lista volta ao estado anterior. Um assert extra de que o controle do
   filtro "mês" **não** existe.

10. **NÃO-objetivo:** mudar o shape de `src/lib/hooks/useConquistas.ts` (a integração é de
    UI — fato apurado 2) e tocar as funções puras de `src/lib/conquistas/filtros.ts`.

11. **NÃO-objetivo:** o **modo Lista** do Recap. Esta sprint mexe só no modo Calendário. Os
    chips de período do modo Lista são outro controle e não se fundem com estes filtros.

12. **NÃO-objetivo:** criar ativo `.svg` ou glifo autoral (fato apurado 1). Se a execução
    optar por ícones, o teto é acrescentar `Youtube` e `User` ao shim
    `src/lib/icons.ts` — duas linhas de `export`, nada mais.

13. **NÃO-objetivo:** restaurar a rota `/calendario`, o `CalendarioConquistasScreen` ou o
    item "Calendário" do `MenuLateral`. Decisão do dono de 2026-07-29, registrada em
    `AUDIT-P2-5-TOGGLE-MORTO-CONQUISTAS-spec.md`: a rota caiu por field test
    (`ADR-0021:37-44`) e não volta. Esta sprint devolve **a capacidade**, dentro do Recap —
    não a tela.

14. **NÃO-objetivo:** a `<Timeline>` horizontal, que tem substituição declarada em
    documento canônico e sai em `AUDIT-P2-10`.

## Proof-of-work

```bash
# 1. Antes: nenhum setter e' consumido e a barra nao tem consumidor
grep -n "useConquistas()" src/components/screens/RecapModoCalendario.tsx   # :48, 4 campos
grep -rn "\bFiltrosBar\b" --include="*.ts" --include="*.tsx" src app tests
#   1 hit externo, comentario em src/lib/stores/filtroEfetivo.ts:42

# 2. Depois: a barra e' montada e os setters sao desestruturados
grep -n "FiltrosBar" src/components/screens/RecapModoCalendario.tsx        # >= 2
grep -n "setFiltroPessoa\|setFiltroTipoMidia\|setFiltroIntensidade\|setFiltroBairro" \
     src/components/screens/RecapModoCalendario.tsx                        # 4 hits
grep -n "resetarFiltros" src/components/screens/RecapModoCalendario.tsx    # >= 1

# 3. O filtro "mes" NAO e' exposto, mas o contrato do hook sobrevive
grep -n "setFiltroMes\|onMes" src/components/screens/RecapModoCalendario.tsx  # 0 (ou no-op)
grep -n "filtrarPorMes" src/lib/conquistas/filtros.ts                      # :77 intacto
git diff --stat -- src/lib/conquistas/filtros.ts                           # vazio

# 4. Nenhum ativo SVG novo entrou
find assets -name "*.svg" | wc -l                                          # 0, antes e depois
git status --short assets/                                                 # vazio

# 5. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test -- filtros                                  # suite de filtros nao regride
npm test -- FiltrosBar                               # suite nova verde
npm test -- RecapModoCalendario                      # integracao verde
npm test --silent                                    # baseline nao regride
python3 scripts/check_strings_ui_ptbr.py             # rotulos com acentuacao completa
./scripts/check_anonimato.sh
./scripts/smoke.sh                                   # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# seed com conquistas de intensidades e bairros diferentes via window.__gauntlet
# navegar: Recap -> modo Calendario -> abrir filtros -> aplicar -> limpar
# esperado: a lista do dia muda ao filtrar e volta ao limpar; indicador de filtro ativo
#           aparece; nenhum controle de "mes" na barra
npm run test:e2e:web -- --grep audit-p2-11           # caso novo PASS
# screenshots em docs/sprints/AUDIT-P2-11-FILTROSBAR-RECAP-screenshots-gauntlet/
```

Aritmética a validar antes de executar: `FiltrosBar.tsx` tem **233 linhas** e sai do escopo
de remoção de `AUDIT-P2-10` (que passa a remover 222 linhas, não 455). Nenhuma linha de
`useConquistas.ts` ou de `filtros.ts` deve aparecer no diff desta sprint fora de import.

Checkpoint Nível C não é exigido: a sprint é só JS e não toca API nativa. Se for feito,
dev-client mais Metro mostra ao vivo, sem rebuild.

## Commit

```
feat: audit-p2-11 religa filtros de conquista no recap modo calendario sem o filtro de mes
```
