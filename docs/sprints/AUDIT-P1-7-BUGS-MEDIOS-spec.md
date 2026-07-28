# AUDIT-P1-7-BUGS-MEDIOS — quatro defeitos médios independentes de alarme, recap e agenda

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (nenhum destrói dado; todos degradam o que o usuário vê ou
            gastam recurso escasso — o cap de 64 schedules e a banda do Syncthing)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-7] da auditoria de 2026-07-28. Quatro defeitos pequenos,
            independentes entre si e sem sobreposição de arquivo, agrupados numa
            sprint só porque cada um sozinho não justifica o ciclo. Cada um foi
            verificado abrindo o arquivo e conferindo a cadeia de chamada.
```

## Problema

### 1. Alarme mensal aparece na Home todo dia do mês

`src/lib/hooks/useProximos.ts:143-155`:

```ts
if (alarme.recorrencia === 'mensal') {
  for (let offset = 0; offset < 2; offset++) {
    const p = partesLocaisBRT(agora);
    const mesAlvo = p.mes + offset;
    const anoAlvo = p.ano + (mesAlvo > 12 ? 1 : 0);
    const mesNorm = ((mesAlvo - 1) % 12) + 1;
    const candidatoIso = isoLocalBRT(anoAlvo, mesNorm, p.dia, hh, mm);
    if (new Date(candidatoIso).getTime() >= agora.getTime()) {
      return candidatoIso;
    }
  }
  return null;
}
```

`p = partesLocaisBRT(agora)` — `p.dia` é **o dia de hoje**, não o dia configurado.
O comentário de cabeçalho da função assume a aproximação
(`useProximos.ts:107`: *"'mensal' : aproximacao identica a diaria mas com mes
seguinte"*), mas o efeito não é "mês seguinte" e sim "hoje, sempre".

O dia configurado existe e está gravado. O agendador nativo o lê corretamente do
mesmo campo:

```ts
// src/lib/services/alarmesNotificacoes.ts:209-217
case 'mensal': {
  // day deriva de data_unica.getDate() quando presente; default 1.
  let day = 1;
  if (parsed.data.data_unica) {
    const date = new Date(parsed.data.data_unica);
    if (!Number.isNaN(date.getTime())) {
      day = date.getDate();
    }
  }
```

Os dois módulos discordam sobre o mesmo campo. Cenário: `pessoa_a` cria "Pagar
aluguel" para o dia 5, mensal. A notificação toca certo, no dia 5. Mas o card
"Próximos" da Home anuncia "Pagar aluguel" nos dias 1, 2, 3 … 31, todo mês.

### 2. Alarme `unica` já vencido é re-agendado a cada boot

`src/lib/services/alarmesNotificacoes.ts:169-191`:

```ts
case 'unica': {
  // data_unica garantido pelo cross-field do schema.
  const dataIso = parsed.data.data_unica;
  if (!dataIso) return { ids: [], estourou: false };
  const date = new Date(dataIso);
  if (Number.isNaN(date.getTime())) {
    return { ids: [], estourou: false };
  }
  const identifier = idOnce(parsed.data.slug);
  await Notifications.scheduleNotificationAsync({ /* trigger DATE, date */ });
```

Valida formato, não valida se `date` já passou. E nada no app grava
`ativo: false` depois do disparo — `ultimo_disparo` existe no schema
(`src/lib/schemas/alarme.ts:145`) e é inicializado como `null` em três produtores
(`src/lib/vault/tarefas.ts:350`, `src/lib/boot/migrarLembretes.ts:147`,
`app/rotinas/[slug].tsx:172`), mas nenhum consumidor o escreve depois de disparar.

Consequência via `reagendarAlarmes` (`:347`, plugado em `BOOT_HOOKS` por
`src/lib/boot/reagendamento.ts:54-57`), que filtra por `if (alarme.ativo)`: um
alarme único de 2026-03-01 continua sendo pedido ao SO em todo boot de 2026-07 em
diante. Ocupa uma vaga do cap global de 64 (`LIMITE_SCHEDULES`, checado em
`:147-150`), que é justamente o recurso que a função se dá ao trabalho de contar
antes de agendar. Alarmes válidos deixam de ser agendados por causa de alarmes
mortos.

### 3. Ids de conquista do Recap colidem e viram `key` duplicada no React

`src/lib/hooks/useRecap.ts:335`:

```ts
id: `marco:${m.data}:${m.autor}`,
```

`Marco.data` é preenchido por `nowIso()` de `src/lib/marcos/marcosAuto.ts:53-63`,
que formata só até o minuto (`:00` fixo nos segundos). Pior: os cinco critérios são
avaliados no mesmo laço e gravados na mesma execução
(`marcosAuto.ts:270-306`), então até **5 marcos do mesmo autor** nascem com o
`data` idêntico e produzem 5 ids idênticos.

`src/lib/hooks/useRecap.ts:357`:

```ts
id: `tarefa:${meta.data}:${meta.titulo}`,
```

`Tarefa.data` é YMD. Duas tarefas de mesmo título no mesmo dia — "Tomar remédio"
de manhã e à noite — colidem.

Os ids são usados como `key` de lista e como rótulo de acessibilidade:

```tsx
// src/components/screens/RecapSecaoConquistas.tsx:77-80
key={item.id}
onPress={() => abrir(item)}
accessibilityRole="button"
accessibilityLabel={`conquista ${item.id}`}
```

React com `key` duplicada reconcilia errado: itens somem, trocam de lugar ou
reaproveitam estado de animação do vizinho. E `abrir(item)` navega para o detalhe
pelo id, então o toque pode abrir a conquista errada.

### 4. `eventosIguais` compara um campo que muda a cada chamada

`src/lib/vault/agenda.ts:257-268`:

```ts
function eventosIguais(a: AgendaEvento, b: AgendaEvento): boolean {
  return (
    a.id === b.id &&
    a.pessoa === b.pessoa &&
    a.titulo === b.titulo &&
    a.inicio === b.inicio &&
    a.fim === b.fim &&
    a.local === b.local &&
    a.fonte === b.fonte &&
    a.sincronizado_em === b.sincronizado_em
  );
}
```

O último termo é o problema. `sincronizarSnapshotAgenda` carimba **todos** os
eventos com o timestamp do snapshot antes de comparar (`agenda.ts:226`), e o caller
real gera um timestamp novo a cada refresh:

```ts
// src/lib/services/calendarCache.ts:94-95
const agora = Date.now();
const sincronizadoEm = new Date(agora).toISOString();
```

Logo `a.sincronizado_em === b.sincronizado_em` é sempre falso em produção, o guard
de idempotência de `agenda.ts:233-236` nunca dispara, e **todos** os `.md` de agenda
são reescritos a cada refresh. O `writeVaultFile` toca o mtime de cada arquivo e o
Syncthing propaga a mudança para os 4 dispositivos — churn puro, zero informação
nova.

O comentário de `agenda.ts:202-203` promete o oposto: *"Idempotente: rodar 2x com a
mesma lista e mesmo timestamp resulta em {0, 0, 0}"*. Está literalmente correto — e
é exatamente por isso que o teste passa:

```
tests/lib/vault/agenda.test.ts:317
it('idempotencia: rodar 2x com mesma lista e mesmo ts -> {0,0,0}', …)
```

O teste chama `sincronizarSnapshotAgenda(VAULT_ROOT, 'pessoa_a', [eventoBase], TS_BASE)`
com o **mesmo** `TS_BASE` das duas vezes. É a única combinação em que o guard
funciona, e é a única que o caller real nunca produz.

## Escopo (mínimo)

1. **Alarme mensal.** Em `useProximos.ts:143-155`, derivar o dia de
   `alarme.data_unica` como `alarmesNotificacoes.ts:210-216` já faz (`getDate()`,
   default 1 quando ausente ou inválido), em vez de `p.dia`. Tratar meses curtos
   com o mesmo critério do agendador nativo, para que Home e notificação não voltem
   a divergir. Testes em `tests/lib/proximos/` (junto de
   `mesclarAgendaAlarmes.test.ts`, única suíte hoje no diretório) cobrindo dia 5
   visto do dia 12 (deve apontar para o dia 5 do mês seguinte) e do dia 3 (deve
   apontar para o dia 5 deste mês).
2. **Alarme `unica` vencido.** (a) Em `agendarAlarme` case `'unica'`
   (`alarmesNotificacoes.ts:169-191`), retornar `{ ids: [], estourou: false }`
   quando `date` já passou, antes de consumir vaga do cap. (b) Gravar
   `ativo: false` e `ultimo_disparo` no `.md` do alarme após o disparo de um
   `unica`, no listener que já existe
   (`src/lib/services/notificationResponseListener.ts:87`). Se (b) exigir mudança
   de arquitetura do listener, entregar (a) nesta sprint e materializar (b) como
   sub-sprint com id próprio.
3. **Ids de conquista.** Tornar os ids únicos por construção em
   `useRecap.ts:335` e `:357`. Sugestão mínima e determinística: incluir o `hash`
   do marco (já existe no schema e é calculado por
   `hashMarcoConteudo(autor, descricao)`, `marcosAuto.ts:282`) e, para tarefas,
   o `rel` do arquivo, que é único por construção desde T2-LOCK-VAULT
   (`tarefas.ts:306-311`). Conferir também `useRecap.ts:454`
   (`tarefa:${meta.feito_em}:${meta.titulo}`), que tem granularidade melhor mas
   herda a mesma forma. Teste assertando que `new Set(ids).size === ids.length`
   para um conjunto com 5 marcos do mesmo minuto e 2 tarefas homônimas do mesmo dia.
4. **`eventosIguais`.** Remover `a.sincronizado_em === b.sincronizado_em` da
   comparação (`agenda.ts:266`) — é metadado de sincronização, não conteúdo do
   evento. Corrigir `tests/lib/vault/agenda.test.ts:317` para chamar com **dois
   timestamps diferentes**, que é o cenário do caller real, e assertar
   `{0,0,0}` mesmo assim. Verificar que a etapa de remoção
   (`agenda.ts:241-250`), que depende de `ev.sincronizado_em < sincronizadoEm`,
   continua funcionando: o campo segue sendo gravado, só deixa de entrar na
   comparação de igualdade.
5. Atualizar `docs/FEATURES-CANONICAS.md`: §9 (Tela Hoje, card "Próximos") pelo
   item 1, §7 (Recap) pelo item 3, §13 (Calendário Google) pelo item 4.
6. Caso E2E em `tests/e2e/playwright/audit-p1-7-bugs-medios.e2e.ts` (modelo:
   `tests/e2e/playwright/e2e-template.ts`) cobrindo os dois itens visíveis na UI:
   alarme mensal do dia 5 **não** listado em "Próximos" num dia que não é 5
   (item 1) e ausência de conquistas duplicadas no Recap com marcos do mesmo minuto
   (item 3). Itens 2 e 4 não têm superfície no Gauntlet — item 2 é API nativa de
   notificação, item 4 é I/O de Vault; ambos ficam cobertos por Jest.
7. NÃO-objetivo: o evento duplicado por mudança de dia
   (`docs/sprints/AUDIT-P1-4-AGENDA-EVENTO-DUPLICADO-spec.md`). É bug distinto no
   mesmo arquivo; ordenar o merge das duas sprints para evitar conflito em
   `sincronizarSnapshotAgenda`.
8. NÃO-objetivo: refatorar os offsets fixos `-180` de `useProximos.ts:172-175` e
   `marcosAuto.ts:53-63` para o helper Intl canônico
   (`src/lib/datetime/local.ts`). Vale a sprint, não é esta.

## Proof-of-work

```bash
npx tsc --noEmit                                    # exit 0
npm test -- useProximos                             # mensal aponta para o dia configurado
npm test -- alarmesNotificacoes                     # unica vencido nao consome vaga do cap
npm test -- useRecap                                # ids unicos: Set.size === length
npm test -- agenda                                  # {0,0,0} com timestamps DIFERENTES

# item 4: o campo volatil saiu da comparacao mas continua gravado
rg -n "sincronizado_em" src/lib/vault/agenda.ts

# item 3: nenhum id de conquista sem componente unico
rg -n "id: \`(marco|tarefa|contador):" src/lib/hooks/useRecap.ts

./gauntlet.sh   # Home com alarme mensal dia 5 visto de outro dia; Recap com 5 marcos do mesmo minuto
npx playwright test tests/e2e/playwright/audit-p1-7-bugs-medios.e2e.ts
./scripts/smoke.sh                                  # verde
```

Screenshots em `docs/sprints/AUDIT-P1-7-BUGS-MEDIOS-screenshots-gauntlet/`: card
"Próximos" sem o alarme mensal fora do dia; seção Conquistas do Recap com os cinco
marcos distintos renderizados.

## Commit

```
fix: audit-p1-7 alarme mensal usa dia configurado, unica vencido nao agenda, ids de conquista unicos, agenda idempotente
```
