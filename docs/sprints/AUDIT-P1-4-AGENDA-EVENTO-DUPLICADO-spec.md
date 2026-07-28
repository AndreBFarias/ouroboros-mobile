# AUDIT-P1-4-AGENDA-EVENTO-DUPLICADO — evento do Google que muda de dia vira duplicata permanente

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (dado errado e persistente na agenda: o mesmo compromisso
            aparece duas vezes, uma delas na data antiga)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-4] da auditoria de 2026-07-28. Encontrado ao confrontar
            `agendaEventoPath` (que embute a data no nome do arquivo) com a etapa
            de remoção de `sincronizarSnapshotAgenda` (que só remove ids ausentes
            do snapshot). Os dois estão certos isoladamente; juntos deixam órfão
            o arquivo da data antiga.
```

## Problema (chave de identidade divergente entre escrita e remoção)

O path de um evento carrega a **data**:

```ts
// src/lib/vault/paths.ts (agendaEventoPath)
export function agendaEventoPath(
  pessoa: 'pessoa_a' | 'pessoa_b',
  iso: string,
  eventId: string
): string {
  const ymd = iso.slice(0, 10);
  return `markdown/agenda-${pessoa}-${ymd}-${eventId}.md`;
}
```

`salvarEventoAgenda` deriva o `rel` desse helper a partir de `parsed.data.inicio`.
Logo, mudar `inicio` de dia **muda o nome do arquivo**.

A etapa de remoção, porém, indexa por `id`:

```ts
// src/lib/vault/agenda.ts:241-250
// Remove eventos cujo sincronizado_em e menor que o snapshot.
// (Equivalente a: ids do Vault que nao chegaram no snapshot novo.)
let removidos = 0;
for (const ev of atual) {
  if (idsRecebidos.has(ev.id)) continue;
  if (ev.sincronizado_em < sincronizadoEm) {
    await apagarEventoAgenda(vaultRoot, pessoa, ev.id);
    removidos += 1;
  }
}
```

E a checagem de existência, logo acima, também é por `id`:

```ts
// src/lib/vault/agenda.ts:223-232
const idsRecebidos = new Set<string>();
for (const ev of eventos) {
  idsRecebidos.add(ev.id);
  const evComTs: AgendaEvento = { ...ev, sincronizado_em: sincronizadoEm };
  const existente = atualPorId.get(ev.id);
  if (!existente) {
    await salvarEventoAgenda(vaultRoot, evComTs);
    adicionados += 1;
    continue;
  }
```

### Cenário de falha concreto

`pessoa_a` tem no Google Calendar um evento `id=ev_dentista`, `inicio` em
2026-08-03. O primeiro sync grava
`markdown/agenda-pessoa_a-2026-08-03-ev_dentista.md`.

A clínica remarca para 2026-08-10. O próximo refresh traz o mesmo `ev_dentista`
com `inicio` novo:

1. `atualPorId.get('ev_dentista')` **encontra** o arquivo antigo, então o fluxo cai
   em `eventosIguais` (`:233`) → diferente → `salvarEventoAgenda` (`:237`).
2. `salvarEventoAgenda` calcula o path a partir do `inicio` **novo** e grava
   `markdown/agenda-pessoa_a-2026-08-10-ev_dentista.md`. O arquivo de 08-03
   continua no disco intacto.
3. A etapa de remoção pula o registro porque `idsRecebidos.has('ev_dentista')` é
   `true` (`:245`).

Resultado: dois `.md` para o mesmo evento. `listarEventosAgenda` devolve ambos, a
tela de agenda mostra "Dentista" em 03/08 e em 10/08, e o card "Próximos" da Home
anuncia o compromisso na data errada. Na próxima remarcação vira três. Nenhuma
execução futura limpa: o `id` está sempre presente no snapshot, então a única
condição de remoção nunca é satisfeita.

O bug é ativado por qualquer remarcação vinda do Google. O caller real é
`salvarCacheEventos` (`src/lib/services/calendarCache.ts:89-111`), injetado em
`app/_layout.tsx:355`.

### Cobertura ausente

`tests/lib/vault/agenda.test.ts:238` (`describe('sincronizarSnapshotAgenda')`) tem
casos para adicionado, atualizado, removido, idempotência e o cenário combinado
(`:333`). Nenhum deles muda a **data** de um evento cujo `id` permanece — a única
combinação que produz o defeito.

## Escopo (mínimo)

1. Fazer `sincronizarSnapshotAgenda` remover o arquivo antigo quando o path
   derivado mudar. Duas rotas possíveis, escolher uma e justificar:
   - **(a) Remoção dirigida.** Antes de gravar um evento cujo `id` já existe,
     comparar `agendaEventoPath(pessoa, existente.inicio, id)` com
     `agendaEventoPath(pessoa, evComTs.inicio, id)`; se diferirem, chamar
     `apagarEventoAgenda(vaultRoot, pessoa, id)` antes de `salvarEventoAgenda`.
     `apagarEventoAgenda` (`agenda.ts`) já varre por sufixo `-<id>.md` e apaga
     **todos** os arquivos daquele id, independentemente da data no nome — ou seja,
     a função de limpeza necessária já existe e já é idempotente.
   - **(b) Tirar a data do path.** Alinha a agenda ao resto do layout-por-tipo
     (`criarTarefa` já fez essa escolha, `tarefas.ts:302-304`: *"tarefa não usa data
     no path"*), mas exige migração de todos os `.md` de agenda existentes.
     Escopo maior; se escolhida, dividir em sub-sprint própria.
2. Limpeza das duplicatas já criadas. Boot hook one-shot com flag em
   `FlagsBootState` (`src/lib/stores/sessao.ts:100-106`), no formato dos 5 flags
   existentes: para cada `pessoa`, agrupar os `.md` de agenda por `id` e, quando
   houver mais de um, manter apenas o de `sincronizado_em` mais recente e apagar os
   demais. Critério determinístico e seguro: o arquivo vencedor é o que o último
   sync escreveu, que por construção carrega o `inicio` corrente.
3. Regressão em `tests/lib/vault/agenda.test.ts`: evento com mesmo `id` e `inicio`
   em dia diferente resulta em **exatamente um** `.md`, no path novo, com o path
   antigo apagado. Teste do boot hook de limpeza com dois arquivos do mesmo `id`.
4. Atualizar `docs/FEATURES-CANONICAS.md` §13 (Calendário Google) e §9 (Tela Hoje,
   card "Próximos") — evento duplicado é comportamento visível.
5. Caso E2E em `tests/e2e/playwright/audit-p1-4-agenda-evento-duplicado.e2e.ts`
   (modelo: `tests/e2e/playwright/e2e-template.ts`), semeando o vault mock com um
   evento, re-sincronizando com a data alterada e assertando **contagem 1** na
   agenda e no card "Próximos". Precedentes de forma:
   `tests/e2e/playwright/m37-1-2-cache-agenda-md.e2e.ts` e
   `tests/e2e/playwright/r-home-2-proximos-eventos-merge.e2e.ts`.
6. NÃO-objetivo: o defeito de `eventosIguais` comparando `sincronizado_em`
   (`agenda.ts:266`), que anula o guard de idempotência e reescreve todos os `.md` a
   cada refresh. É bug independente, já catalogado em
   `docs/sprints/AUDIT-P1-7-BUGS-MEDIOS-spec.md` item 4. Cuidado na execução: as duas
   sprints tocam `sincronizarSnapshotAgenda`; ordenar o merge para evitar conflito.
7. NÃO-objetivo: mudar a estratégia de dedupe do scheduler
   (`src/lib/integracoes/scheduler.ts:15`), que já delega a deduplicação por
   `event.id` a esta função.

## Proof-of-work

```bash
npx tsc --noEmit                                   # exit 0
npm test -- agenda                                 # caso novo "muda de dia -> 1 arquivo" verde
npm test -- audit-p1-4                             # boot hook de limpeza de duplicatas

# confirma que a remocao dirigida entrou no caminho de escrita
rg -n "apagarEventoAgenda|agendaEventoPath" src/lib/vault/agenda.ts

./gauntlet.sh   # semear evento, remarcar para outro dia, conferir agenda e "Proximos"
npx playwright test tests/e2e/playwright/audit-p1-4-agenda-evento-duplicado.e2e.ts
./scripts/smoke.sh                                 # verde
```

Screenshots em `docs/sprints/AUDIT-P1-4-AGENDA-EVENTO-DUPLICADO-screenshots-gauntlet/`:
agenda antes da remarcação, depois da remarcação (uma entrada só) e o card
"Próximos" correspondente.

## Commit

```
fix: audit-p1-4 remove md antigo quando evento da agenda muda de dia
```
