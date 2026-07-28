# AUDIT-P1-3-ALARME-TAREFA-CONCLUIDA — concluir tarefa não cancela o alarme companion

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (notificação dispara depois da tarefa já concluída; contradiz
            comentário do próprio arquivo e quebra a confiança no alarme)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-3] da auditoria de 2026-07-28. Encontrado ao seguir a
            cadeia marcarFeito -> escreverTarefa -> reagendarAlarmeCompanion e
            constatar que o guard de mudança do companion só olha
            data_hora_iso/recorrencia/ativo — `feito` não entra na conta.
            Confirmado que a suíte de `marcarFeito` não assere nada sobre
            cancelamento.
```

## Problema (efeito colateral ausente, com comentário afirmando o contrário)

`marcarFeito` grava `feito` e `feito_em` e nada mais:

```ts
// src/lib/vault/tarefas.ts:363-380
export async function marcarFeito(
  vaultRoot: string,
  rel: string,
  feito: boolean,
  agora: Date = new Date()
): Promise<Tarefa> {
  const atual = await lerTarefa(vaultRoot, rel);
  if (!atual) {
    throw new Error(`tarefa nao encontrada: ${rel}`);
  }
  const atualizado: Tarefa = {
    ...atual,
    feito,
    feito_em: feito ? agora.toISOString() : null,
  };
  await escreverTarefa(vaultRoot, rel, atualizado);
  return atualizado;
}
```

`escreverTarefa` **chama** `reagendarAlarmeCompanion` (`tarefas.ts:178`), então a
oportunidade de cancelar existe. Ela é descartada pelo guard de mudança:

```ts
// src/lib/vault/tarefas.ts:236-240
const dataMudou = alarmeAntigo?.data_hora_iso !== alarmeNovo?.data_hora_iso;
const recorrenciaMudou =
  alarmeAntigo?.recorrencia !== alarmeNovo?.recorrencia;
const ativoMudou = alarmeAntigo?.ativo !== alarmeNovo?.ativo;
if (!dataMudou && !recorrenciaMudou && !ativoMudou) return;
```

Concluir uma tarefa não muda nenhum dos três. O guard sai por `return` e o
schedule nativo continua vivo.

### A contradição, nos dois sentidos

O comentário de `reabrirTarefa` afirma que o cancelamento **já aconteceu**:

```
// src/lib/vault/tarefas.ts:387-393
// S2 (M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR): nao re-agenda o alarme
// companion ao reabrir. Quando o usuario reabre uma tarefa, o alarme
// original ja foi cancelado por marcarFeito (decisao M30); a sprint S2
// decidiu manter o companion cancelado e exigir edicao explicita do
// alarme para re-ativar.
```

Enquanto o comentário de `criarTarefa` descreve o mesmo cancelamento no **futuro**:

```
// src/lib/vault/tarefas.ts:264-266
// gravado dentro do meta.alarme da tarefa para cancelamento idempotente
// posterior (marcarFeito futuro pode chamar cancelarAlarme(slug)).
```

`src/lib/schemas/tarefa.ts:99` repete a mesma promessa. Os dois lados descrevem o
mesmo mecanismo; nenhum dos dois está implementado.

### Cenário de falha concreto

`pessoa_a` cria a tarefa "Tomar remédio" com alarme para 08:00. Às 07:00 ela toma o
remédio e marca a tarefa como concluída na Home. Às 08:00 a notificação toca. Ela
abre o app, a tarefa está riscada, e o alarme insiste. Em recorrência `diaria` ou
`semanal` o schedule persiste indefinidamente, porque `reagendarAlarmes`
(`src/lib/services/alarmesNotificacoes.ts:347`, plugado em `BOOT_HOOKS` via
`src/lib/boot/reagendamento.ts:54-57`) re-cria o schedule a cada boot enquanto o
`Alarme` companion tiver `ativo: true` no Vault.

### API de cancelamento já existe e já está importada neste arquivo

```ts
// src/lib/services/alarmesNotificacoes.ts:266
export async function cancelarAlarme(slug: string): Promise<void>
```

Varre por prefixo `${ID_PREFIX}${slug}.` e cobre todos os sufixos (`.dN`, `.once`,
`.daily`, `.monthly`, `.snooze`) — documentado em `alarmesNotificacoes.ts:104-105`.
É idempotente e no-op em web. Já está importada em `tarefas.ts:48` e usada em
`tarefas.ts:223` no branch de toggle-off. Cobertura existente:
`tests/lib/services/alarmesNotificacoes.test.ts:198-215`.

### Cobertura ausente

`tests/lib/vault/tarefas.test.ts:352-392` (`describe('marcarFeito')`) tem três
casos e nenhum assere sobre `cancelarAlarme`. O mock existe e está cabeado em
`tests/lib/vault/tarefas-reagendar.test.ts:48` — a infraestrutura para o teste de
regressão já está pronta, só nunca foi apontada para `marcarFeito`.

## Escopo (mínimo)

1. Em `marcarFeito`, quando `feito === true` e
   `atual.alarme?.slug_vinculado` estiver preenchido, cancelar o schedule via
   `cancelarAlarme(slug_vinculado)`. Envolver em `try/catch` silencioso, no mesmo
   formato de `tarefas.ts:221-227` — a tarefa já foi persistida e uma falha de
   cancelamento não pode derrubar o fluxo.
2. Decidir o destino do `Alarme` companion no Vault e implementar de forma
   consistente com a decisão S2 (`tarefas.ts:387-393`): a sprint S2 declara que
   ao reabrir o companion **permanece cancelado** e exige edição explícita. Para
   que essa premissa seja verdadeira, o companion precisa ter `ativo: false`
   gravado no `.md`, senão o próximo boot o ressuscita via `reagendarAlarmes`.
   Recomendação: gravar `ativo: false` no companion, não apagá-lo (preserva
   histórico e mantém `slug_vinculado` válido).
3. Alinhar os comentários contraditórios: `tarefas.ts:264-266` (futuro),
   `tarefas.ts:387-393` (passado) e `src/lib/schemas/tarefa.ts:99` passam a
   descrever o comportamento real.
4. Regressão em `tests/lib/vault/tarefas.test.ts`: concluir tarefa com
   `alarme.slug_vinculado` chama `cancelarAlarme` com o slug certo; concluir
   tarefa sem alarme não chama nada; falha de `cancelarAlarme` não propaga.
   Reusar o padrão de mock de `tests/lib/vault/tarefas-reagendar.test.ts:40-50`.
5. Atualizar `docs/FEATURES-CANONICAS.md` §9 (Tela Hoje) — o vínculo
   tarefa/alarme é comportamento visível ao usuário.
6. Caso E2E em `tests/e2e/playwright/audit-p1-3-alarme-tarefa-concluida.e2e.ts`
   (modelo: `tests/e2e/playwright/e2e-template.ts`), assertando o estado do
   companion no Vault mock depois de concluir a tarefa — não apenas a presença do
   check na UI. Precedente de forma: `tests/e2e/playwright/m-save-tarefa.e2e.ts`.
7. NÃO-objetivo: mexer em `reabrirTarefa`. A decisão S2 (não re-agendar ao
   reabrir) permanece; esta sprint apenas torna a premissa dela verdadeira.
8. NÃO-objetivo (fica registrado, entra em sprint própria): o achado
   relacionado em `src/lib/vault/tarefas.ts:257-271` / `:286-294`, onde o comentário
   declara que *"Falha ao agendar/escrever alarme não impede a criação da tarefa:
   o alarme companion fica como TODO (slug_vinculado preenchido mas sem schedule
   garantido)"* e o `catch {}` de `:292-294` engole a falha sem log nem sinal na
   UI. É **decisão consciente e documentada**, direção oposta a esta sprint
   (criação tolerante vs. conclusão que precisa ser estrita) e mexer nela junto
   embaralharia a regressão. Merece sprint separada sobre visibilidade de falha
   de agendamento.

## Proof-of-work

```bash
npx tsc --noEmit                                  # exit 0
npm test -- tarefas                               # casos novos de cancelamento verdes
npm test -- tarefas-reagendar                     # regressao S2 intacta
npm test -- alarmesNotificacoes                   # cancelarAlarme inalterado

# confirma que marcarFeito passou a usar a API que ja estava importada
rg -n "cancelarAlarme" src/lib/vault/tarefas.ts   # :48 import, :223 toggle-off, + novo em marcarFeito

./gauntlet.sh   # criar tarefa com alarme, concluir, inspecionar o companion no vault mock
npx playwright test tests/e2e/playwright/audit-p1-3-alarme-tarefa-concluida.e2e.ts
./scripts/smoke.sh                                # verde
```

Checkpoint Nível C recomendado ao final: a prova definitiva é o celular não
notificar às 08:00 depois de concluir às 07:00 — API nativa de notificação, fora
do alcance do Gauntlet. Screenshots em
`docs/sprints/AUDIT-P1-3-ALARME-TAREFA-CONCLUIDA-screenshots-gauntlet/`.

## Commit

```
fix: audit-p1-3 marcarfeito cancela alarme companion e desativa o md
```
