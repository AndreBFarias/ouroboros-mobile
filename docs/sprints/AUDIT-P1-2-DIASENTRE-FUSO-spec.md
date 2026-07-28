# AUDIT-P1-2-DIASENTRE-FUSO — contador grava recorde inflado por truncamento UTC

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (dano permanente e irreversível em dado do usuário: `recorde`
            nunca decresce, então a inflação fica gravada para sempre)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-2] da auditoria de 2026-07-28. Encontrado ao cruzar o
            helper puro `diasEntre` com os produtores da string que ele consome:
            `Contador.inicio` é `DataYmd` gravado por `formatDateYmd`, que
            delega ao helper Intl BRT; `diasEntre` trunca por dia UTC. Verificado
            que a mesma classe já foi corrigida em dois módulos do projeto e que
            os call sites do contador ficaram para trás.
```

## Problema (off-by-one de fuso com efeito permanente)

`src/lib/util/diasEntre.ts:24-36` trunca **ambos** os lados por dia UTC:

```ts
function truncarUtcDia(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function diasEntre(a: Date | string, b: Date | string): number {
  const da = a instanceof Date ? a : parseYmdUtc(a);
  const db = b instanceof Date ? b : parseYmdUtc(b);
  const diff = truncarUtcDia(db) - truncarUtcDia(da);
  return Math.round(diff / MS_POR_DIA);
}
```

O comentário de cabeçalho do próprio arquivo (`diasEntre.ts:9-12`) admite a
aproximação: *"novo dia comeca a meia-noite UTC (proxy razoavel para meia-noite
local em UTC-3 …)"*. O proxy só vale enquanto os dois lados forem YMD. Não é o
caso: `Contador.inicio` é `DataYmd` (`src/lib/schemas/contador.ts:57`) gravado por
`formatDateYmd`, que desde R-INFRA-TIMEZONE-HELPER-CANONICO delega ao Intl com
`America/Sao_Paulo`:

```ts
// src/lib/vault/paths.ts:60-62
export function formatDateYmd(date: Date): string {
  return dataLocalYmd(date);
}
```

Quando o segundo argumento é um `Date` cru (`new Date()`), `truncarUtcDia` lê os
campos **UTC** desse instante. Das 21:00 às 23:59 BRT o dia UTC já virou, e
`diasEntre` devolve **+1**.

### Cenário de falha concreto

`pessoa_a` tem um contador com `inicio: '2026-07-20'`. Às 22:30 BRT do dia
2026-07-27 (= 2026-07-28T01:30Z) ela abre o card e vê **8 dias** em vez de 7. Ela
recai e toca "Resetei". `registrarReset` roda com esse mesmo `agora`:

```ts
// src/lib/vault/contadores.ts:157-165
const diasAtuais = diasEntre(atual.inicio, agora);
const novoRecorde = Math.max(atual.recorde, diasAtuais < 0 ? 0 : diasAtuais);

const atualizado: Contador = {
  ...atual,
  recorde: novoRecorde,
  resets: [...atual.resets, agora.toISOString()],
  inicio: formatDateYmd(agora),
};
```

`recorde` fica **8**. Como o `Math.max` nunca decresce e `recorde` sai de `0` na
criação (`app/contadores/novo.tsx:158`, único ponto que o inicializa), a inflação
é **permanente**: a partir dali a pessoa precisa de 9 dias reais para "bater o
recorde" que ela nunca fez.

O erro se propaga para leitura: `useRecap.ts:345` usa o corte `>= 7` para montar
conquistas e `:441` usa `>= 30` para evolução; ambos podem incluir um contador um
dia antes da hora. `stats/calcular.ts:237` grava `streaksAtuais` com o mesmo
número inflado.

### O projeto já resolveu esta classe duas vezes

- `src/lib/marcos/marcosAuto.ts:126-130` — comentário explícito:
  *"Janela ancorada em BRT: humor.data e YMD-local, entao 'hoje' e a janela dos
  últimos 7 dias tambem precisam ser YMD-local (não UTC). Antes, toISOString gerava
  YMD UTC e a noite (21h-23h59 BRT) o i=0 caia no dia seguinte, fora do conjunto
  -> o marco nunca disparava."* Solução: `dataLocalYmd(agora)` + `ymdMenosDias`,
  ou seja, **os dois lados viram YMD-local antes da comparação**.
- `src/lib/hooks/useRelembrando.ts:39-44` — solução alternativa, deslocar o `Date`
  antes de passar:
  ```ts
  // Date ajustado a BRT (-180 min): seus campos UTC representam o dia
  // local, casando com diasEntre (trunca por dia UTC) e com os YYYY-MM-DD
  // gravados no Vault.
  function hojeBrt(): Date {
    return new Date(Date.now() + -180 * 60_000);
  }
  ```
  Essa variante usa offset fixo `-180`, o que `src/lib/datetime/local.ts:9-14`
  desaconselha explicitamente em favor de Intl.

### Os 9 call sites de `diasEntre` (7 módulos)

| # | Local | Argumentos | Situação |
|---|---|---|---|
| 1 | `src/lib/vault/contadores.ts:157` | `inicio` YMD-BRT + `agora` (`new Date()`) | **contaminado — dano permanente** |
| 2 | `src/lib/stats/calcular.ts:237` | `c.inicio` YMD-BRT + `agora` | **contaminado** |
| 3 | `src/components/contadores/CardContador.tsx:41` | `contador.inicio` + `agora = new Date()` | **contaminado** |
| 4 | `app/contadores/[slug].tsx:135` | `contador.inicio` + `new Date()` | **contaminado** |
| 5 | `src/lib/hooks/useRecap.ts:345` | `c.inicio` + `agora` (`input.agora ?? new Date()`, `:280`) | **contaminado** (corte `>= 7`) |
| 6 | `src/lib/hooks/useRecap.ts:441` | `c.inicio` + `agora` | **contaminado** (corte `>= 30`) |
| 7 | `app/contadores/[slug].tsx:80` | dois ISO absolutos (`new Date(inicio)`, `new Date(fim)`) | variante branda: mede distância em dias UTC, não BRT; afeta só a duração exibida no histórico de resets |
| 8 | `src/lib/tarefas/rollover.ts:59` | duas strings YMD | **são** — truncamento é no-op |
| 9 | `src/lib/relembrando/selecionar.ts:112` | YMD + `hojeBrt()` já deslocado | **já corrigido** (padrão de referência) |

## Escopo (mínimo)

1. Levar `diasEntre` a comparar **dia civil local** dos dois lados, seguindo o
   padrão canônico de `marcosAuto.ts:126-130`: normalizar qualquer `Date` recebido
   para YMD via `dataLocalYmd` (`src/lib/datetime/local.ts:27`) antes de truncar,
   em vez do offset fixo `-180` de `useRelembrando.ts:42-44`. Strings YMD entram
   inalteradas (preserva o comportamento dos call sites 8 e 9 bit-a-bit).
2. Corrigir os 6 call sites contaminados da tabela acima. Se a correção for feita
   dentro de `diasEntre`, os 6 passam a estar corretos sem edição; nesse caso
   documentar isso no spec de execução em vez de tocar os arquivos.
3. Decidir e documentar o tratamento do call site 7 (`app/contadores/[slug].tsx:80`,
   dois ISO absolutos). Recomendação: passar pelo mesmo normalizador local, porque
   os `resets` são gravados com `agora.toISOString()` (UTC) e a duração exibida
   deve ser em dias BRT — é o mesmo dia que a pessoa viu no card.
4. **Saneamento dos recordes já inflados.** É viável e determinístico, porque
   `recorde` sai de `0` na criação (`app/contadores/novo.tsx:158`) e só cresce
   dentro de `registrarReset`; o `resets: array de ISO datetimes`
   (`src/lib/schemas/contador.ts:62`) preserva o histórico completo. Recomputar,
   por contador: para cada par consecutivo em `[criado_em, ...resets]`, a distância
   em dias BRT-corretos; `recorde_correto = max(distâncias)`. Se
   `recorde_gravado > recorde_correto`, reescrever com o correto. Isolar num boot
   hook one-shot com flag em `FlagsBootState` (`src/lib/stores/sessao.ts:100-106`),
   no mesmo formato dos 5 flags existentes.
5. **Re-baselinar os dois testes que hoje cravam a semântica UTC.**
   `tests/lib/util/diasEntre.test.ts` (80 linhas) tem 12 casos; 10 dão o mesmo
   resultado sob semântica de dia local e **2 mudam de valor**, porque são
   exatamente as formas do bug:
   - `:36-39` — `it('aceita mistura Date + string')`:
     `diasEntre('2026-04-01', new Date('2026-04-29T00:00:00Z'))` assere `28`. O
     `Date` é 2026-04-28 21:00 BRT, então o valor correto em dia civil local é
     **27**. É literalmente o par "YMD-BRT contra `Date` na janela da noite" que
     produz o defeito em produção.
   - `:47-51` — `it('atravessa meia-noite UTC corretamente')`:
     `2026-04-29T23:59:00Z` → `2026-04-30T00:01:00Z` assere `1`. Em BRT os dois
     instantes são 20:59 e 21:01 do **mesmo** 29/04, então o valor correto é **0**.

   Os dois precisam ser reescritos com a expectativa nova e o nome ajustado (o
   segundo deixa de ser "meia-noite UTC"). Ajustar também o cabeçalho do arquivo
   (`:1-3`) e o de `diasEntre.ts:1-16`, que descrevem a convenção UTC. Não há
   nenhum caso hoje na janela 21:00-23:59 BRT com um lado em YMD — a janela do
   defeito nunca foi testada.
6. Testes novos: janela 21:00-23:59 BRT em `tests/lib/util/diasEntre.test.ts`;
   `tests/lib/vault/contadores.test.ts:238-295` (`describe('registrarReset')`, hoje
   com 3 casos, todos fora da janela) ganha um reset às 22:30 BRT provando que o
   `recorde` **não** infla; teste do saneamento do item 4.
7. Atualizar `docs/FEATURES-CANONICAS.md` — o número de dias e o recorde do
   contador são comportamento visível ao usuário.
8. Caso E2E em `tests/e2e/playwright/audit-p1-2-diasentre-fuso.e2e.ts` (modelo:
   `tests/e2e/playwright/e2e-template.ts`), com o relógio do navegador fixado em
   23:30 BRT, assertando que o card mostra o número correto de dias. Precedente
   direto de forma: `tests/e2e/playwright/r-audit-datas-rollover-rotulo.e2e.ts`,
   que já exercitou uma troca de helper de dias na Home.
9. NÃO-objetivo: unificar `hojeBrt()` de `useRelembrando.ts` nem os outros offsets
   `-180` espalhados (`useProximos.ts:172-175`, `marcosAuto.ts:53-63`) — é
   refatoração de outra sprint.
10. NÃO-objetivo: parametrizar timezone por usuário. `TZ_DEFAULT` continua
    `America/Sao_Paulo`.

## Proof-of-work

```bash
npx tsc --noEmit                                   # exit 0
npm test -- diasEntre                              # casos novos da janela 21h-23h59 verdes
npm test -- contadores                             # registrarReset sem inflacao
npm test -- useRecap                               # cortes >=7 e >=30 inalterados fora da janela

# confirma que nenhum call site ficou usando Date cru contra YMD-BRT
rg -n "diasEntre\(" src/ app/                      # 9 ocorrencias, todas revisadas

# saneamento: contador semeado com recorde inflado volta ao valor recomputado
npm test -- audit-p1-2                             # teste do boot hook one-shot

./gauntlet.sh                                      # navegar /contadores com relogio em 23:30 BRT
npx playwright test tests/e2e/playwright/audit-p1-2-diasentre-fuso.e2e.ts
./scripts/smoke.sh                                 # verde
```

Screenshots em `docs/sprints/AUDIT-P1-2-DIASENTRE-FUSO-screenshots-gauntlet/`:
card do contador às 20:00 BRT e às 23:30 BRT com o mesmo número.

## Commit

```
fix: audit-p1-2 diasentre compara dia civil local e saneia recordes inflados
```
