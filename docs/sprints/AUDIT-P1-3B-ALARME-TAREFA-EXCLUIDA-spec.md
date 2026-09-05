# AUDIT-P1-3B-ALARME-TAREFA-EXCLUIDA — apagar tarefa deixa o alarme companion vivo

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (notificação órfã dispara para sempre, sem tela que a
            explique nem caminho de UI para desligá-la)
DEPENDE:    AUDIT-P1-3-ALARME-TAREFA-CONCLUIDA (mergeada; criou o helper
            desativarAlarmeCompanion que esta sprint reusa)
ORIGEM:     achado [P1-3B] da auditoria de 2026-07-28. Encontrado durante a
            execução da Fase 1, ao implementar a metade `marcarFeito` do
            contrato prometido em src/lib/schemas/tarefa.ts:25: o comentário
            promete cancelamento "em marcarFeito/excluir" e só a primeira
            metade existia. Verificado lendo excluirTarefa e o caller na
            tela — nenhum dos dois toca no alarme.
```

## Problema (a metade `excluir` do contrato nunca foi implementada)

### O que o código promete

Duas declarações, escritas em sprints diferentes, dizem que o cancelamento
tem que acontecer na exclusão.

O schema da tarefa, ao descrever o bloco `alarme`:

```
// src/lib/schemas/tarefa.ts:22-25
//  - alarme: bloco opcional para lembrar a tarefa via wrapper alarmes.
//    Default null. Quando ativo, o caller cria entry separada em
//    alarmes/<slug-tarefa>-alarme.md e popula slug_vinculado para
//    cancelamento idempotente em marcarFeito/excluir.
```

E o próprio `excluirAlarme`, que avisa explicitamente que não faz esse
trabalho por conta própria:

```ts
// src/lib/vault/alarmes.ts:150-154
// Apaga arquivo de alarme. Idempotente: não falha se não existe.
// T2-LOCK-VAULT (2026-05-15): tenta apagar tanto o arquivo canonico
// (legado pre-migration) quanto o com suffix do device atual. Em Web,
// no-op silencioso. Caller responsável por cancelar schedules antes
// (caso contrario as notificações persistem orfas).
```

### O que o código faz

`excluirTarefa` move o `.md` para a lixeira soft e nada mais:

```ts
// src/lib/vault/tarefas.ts:494-521
export async function excluirTarefa(
  vaultRoot: string,
  rel: string
): Promise<{ lixeiraPath: string }> {
  const origemUri = vaultUriJoin(vaultRoot, rel);
  const cacheBase = FileSystem.cacheDirectory ?? 'cache://';
  const lixeiraDir = `${cacheBase}lixeira/tarefas/`;
  // ...
  let raw: string;
  try {
    raw = await StorageAccessFramework.readAsStringAsync(origemUri);
    await FileSystem.writeAsStringAsync(lixeiraPath, raw);
    await StorageAccessFramework.deleteAsync(origemUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`falha ao mover para lixeira: ${msg}`);
  }
  return { lixeiraPath };
}
```

Nenhuma leitura de `atual.alarme?.slug_vinculado`, nenhuma chamada de
`cancelarAlarme`, nenhuma reescrita do companion. O único caller também não
compensa:

```tsx
// app/todo.tsx:435-448
  const handleConfirmarExclusao = useCallback(async () => {
    if (!vaultRoot || !tarefaParaExcluir) return;
    try {
      await excluirTarefa(vaultRoot, tarefaParaExcluir.rel);
      haptics.success();
      toast.show('Tarefa movida para a lixeira.', 'success');
      setModalExcluirVisivel(false);
      setTarefaParaExcluir(null);
      await carregar();
    } catch {
      haptics.error();
      toast.show('Falha ao excluir.', 'error');
    }
  }, [vaultRoot, tarefaParaExcluir, toast, carregar]);
```

### Por que a notificação volta sozinha

O companion permanece no Vault com `ativo: true`. E o reagendamento de boot
usa exclusivamente esse campo como critério:

```ts
// src/lib/services/alarmesNotificacoes.ts:391-401
  // Reagenda apenas ativos.
  for (const alarme of alarmes) {
    if (alarme.ativo) {
      // Erros de agendamento individual não quebram o boot.
      try {
        await agendarAlarme(alarme);
      } catch {
        // Ignora.
      }
    }
  }
```

Ou seja: mesmo que alguém cancelasse o schedule no SO no momento da exclusão,
`reagendarAlarmes` (plugado em `BOOT_HOOKS`, `reagendamento.ts:67-71`) o
recriaria no boot seguinte. É por isso que o desmonte precisa das duas
metades, e é exatamente o que a `AUDIT-P1-3` já registrou ao implementar a
metade da conclusão:

```
// src/lib/vault/tarefas.ts:370-373
//   2. companion .md regravado com ativo: false. Sem isso
//      reagendarAlarmes (BOOT_HOOKS, alarmesNotificacoes) recria o
//      schedule no próximo boot, porque a única condição que ele
//      olha é `alarme.ativo`.
```

### Cenário de falha concreto

`pessoa_a` cria a tarefa "Renovar receita" com alarme para as 9h de
segunda-feira, recorrente semanal. Na sexta a consulta é desmarcada e
`pessoa_a` apaga a tarefa — a tela confirma com "Tarefa movida para a
lixeira." e o item some da lista.

Toda segunda às 9h a notificação continua tocando. A tarefa não existe mais
em `/todo`, então não há long-press que a alcance; o alarme companion vive em
`markdown/alarme-<slug>-alarme.md`, cujo slug foi derivado da tarefa e que a
tela de alarmes pode nem listar de forma reconhecível. `pessoa_a` não tem
caminho de UI para desligar aquilo. E o boot reagenda todo dia, então
desinstalar o app e reinstalar com o mesmo Vault ressuscita a notificação.

## Escopo (mínimo)

1. Reusar o helper que a `AUDIT-P1-3` já criou, sem duplicá-lo:

   ```ts
   // src/lib/vault/tarefas.ts:383-401
   async function desativarAlarmeCompanion(
     vaultRoot: string,
     slug: string
   ): Promise<void>
   ```

   Ele já cobre as **duas metades** exigidas — `cancelarAlarme(slug)` para os
   schedules no SO e a regravação do companion com `ativo: false` — cada uma
   em seu próprio `try/catch` silencioso, e é idempotente (a regravação é
   pulada quando o companion já está inativo). Só cancelar o schedule não
   resolve: o boot recria.
2. `excluirTarefa` passa a ler a tarefa **antes** de mover o arquivo (é a
   última janela em que o `.md` ainda existe para dar o `slug_vinculado`),
   guarda `atual.alarme?.slug_vinculado` e, depois do move bem-sucedido,
   chama `desativarAlarmeCompanion`. A ordem importa: primeiro a operação
   canônica (a tarefa saiu do Vault), depois o efeito colateral silencioso —
   mesma ordem que `marcarFeito` já adota em `tarefas.ts:427-434`, com o
   comentário que a justifica.
3. Falha do desmonte não pode reverter a exclusão nem propagar erro à UI. O
   `handleConfirmarExclusao` de `app/todo.tsx:435-448` mostra
   "Falha ao excluir." em qualquer throw; a tarefa já foi para a lixeira
   nesse ponto, então o toast estaria mentindo. O helper já é silencioso nas
   duas metades — o cuidado é não envolver a chamada em algo que re-lance.
4. Decidir e registrar no código o que acontece com o **arquivo** do
   companion. `desativarAlarmeCompanion` deixa o `.md` no Vault com
   `ativo: false`, que é a decisão certa para `marcarFeito` (a tarefa
   continua existindo e pode ser reaberta). Numa exclusão a tarefa mãe não
   volta: avaliar chamar também `excluirAlarme(vaultRoot, slug)` — cujo
   cabeçalho, em `alarmes.ts:150-154`, diz literalmente que o caller cancela
   os schedules antes, o que o passo 1 já garante. Escolher uma das duas e
   escrever a razão em comentário; não deixar implícito.
5. Testes em `tests/lib/vault/tarefas.test.ts` (que já mocka
   `@/lib/vault/writer`): excluir tarefa com `alarme.slug_vinculado` cancela
   o schedule e grava `ativo: false` no companion; excluir tarefa sem alarme
   não chama nada; falha do desmonte não impede o retorno de `lixeiraPath`;
   excluir duas vezes é idempotente.
6. Caso E2E em `tests/e2e/playwright/audit-p1-3b-alarme-tarefa-excluida.e2e.ts`
   (tipos `PlaywrightPageLike`/`ResultadoE2E` de
   `tests/e2e/playwright/e2e-template.ts`): criar tarefa com alarme, apagar
   pela UI, afirmar que o companion no Vault mock ficou com `ativo: false`.
   O assert tem que ser sobre o **companion**, não sobre o sumiço do `.md` da
   tarefa: o Vault mock do Gauntlet não implementa exclusão de arquivo
   (achado `AUDIT-INFRA-VAULT-MOCK-DELETE`), então o move para a lixeira não
   é observável em web. A regravação do companion é uma escrita, e essa o
   mock suporta.
7. Atualizar `docs/FEATURES-CANONICAS.md` §10.3 (To-do Leve) e §10.2 (Alarme
   Pessoal): apagar a tarefa desmonta o alarme vinculado. É comportamento
   visível para o usuário.
8. NÃO-objetivo: mudar a semântica de reabrir. A decisão S2
   (`tarefas.ts:443-449`) diz que reabrir não re-agenda; exclusão não tem
   volta, então não há interação entre as duas.
9. NÃO-objetivo: varrer companions já órfãos em Vaults existentes. Quem
   apagou tarefas com alarme antes desta sprint continua com o companion
   ativo. Isso é uma rotina one-shot de boot com flag própria, com o mesmo
   desenho da recuperação de órfãos da `AUDIT-P1-5`, e merece sprint
   separada — registrar como achado, não implementar aqui.

## Proof-of-work

```bash
npx tsc --noEmit                                   # exit 0
npm test -- tarefas                                # casos de exclusao verdes
npm test -- alarmes                                # sem regressao

# o desmonte tem que estar no caminho da exclusao
rg -n "desativarAlarmeCompanion" src/lib/vault/tarefas.ts   # 3 ocorrencias: def + marcarFeito + excluirTarefa

# E2E no Gauntlet
./gauntlet.sh
npm run test:e2e:web -- --grep audit-p1-3b         # PASS

./scripts/smoke.sh                                 # verde
```

Screenshots em
`docs/sprints/AUDIT-P1-3B-ALARME-TAREFA-EXCLUIDA-screenshots-gauntlet/`
(tarefa com alarme na lista, confirmação da exclusão, companion inativo no
Vault mock).

Validação de runtime real (Nível C, aparelho físico — envolve API nativa de
notificação): criar tarefa com alarme para daqui a poucos minutos, apagar a
tarefa, conferir que nada dispara e que um boot novo não reagenda.

```bash
adb shell dumpsys alarm | grep -i ouroboros        # sem schedule do slug apagado
```

## Commit

```
fix: audit-p1-3b excluir tarefa desmonta o alarme companion vinculado
```

## Resultado (executada 2026-09-05)

`excluirTarefa` passa a desmontar o alarme companion, como `marcarFeito` já
fazia. Reusa `desativarAlarmeCompanion` (AUDIT-P1-3), sem helper novo.

**Ordem:** move canônico primeiro, desmonte depois. O desmonte é silencioso nas
duas metades, então uma exclusão bem-sucedida nunca vira erro para o caller — o
toast "Tarefa movida para a lixeira." continua verdadeiro.

**Não chama `excluirAlarme`,** por três razões verificáveis: `alarmesNotificacoes`
só olha `alarme.ativo`, então companion inativo já é inerte no boot; o companion
segue listado em `/alarmes`, dando o caminho de UI que hoje não existe; e importar
`excluirAlarme` em `tarefas.ts` quebraria o mock parcial da suíte.

### Regressão que o plano original teria criado

A leitura da tarefa ficou **dentro de `try`**. O plano dizia que não era preciso,
porque `lerTarefa` devolve `null` para arquivo ausente — mas isso cobre só esse
caso. `parseFrontmatter` **lança** em três pontos (bloco `---` ausente, YAML
inválido, schema falho) e o erro propaga. Sem o `try`, um `tarefa-*.md`
corrompido por conflito de sync ou escrita truncada deixaria de ser **apagável
para sempre**: o throw viria antes do move, que hoje é byte a byte e funciona com
qualquer conteúdo, e a pessoa veria "Falha ao excluir." em toda tentativa. Há
teste dedicado para isso.

### Testes

`tests/lib/vault/tarefas.test.ts`: 43 → **48 casos**. Os 5 novos cobrem alarme
vinculado, tarefa sem alarme, falha ao cancelar, idempotência e a regressão de
parse acima.

Cabeamento próprio no `describe` novo, de propósito: `jest.clearAllMocks()` zera
registros de chamada mas **não** remove implementações (`resetMocks` não está
ligado em `jest.config.js`), então os mocks do describe da AUDIT-P1-3 vazam para
cá. Depender deles faria os casos passarem apenas com o arquivo rodando inteiro e
em ordem — coincidência, não contrato.

### Prova ancorada

O proof-of-work do spec (`rg -c 'desativarAlarmeCompanion' src/lib/vault/tarefas.ts`
esperando 3) **já dava 3 antes de qualquer mudança** — as linhas 383, 409 e 433
são definição, comentário e a chamada de `marcarFeito`. Não servia como critério.
Substituído por um grep ancorado no corpo da função, imune a deslocamento de linha:

```bash
awk '/export async function excluirTarefa/,/^\}/' src/lib/vault/tarefas.ts \
  | grep -c desativarAlarmeCompanion    # 1
```

### E2E não criado, com razão registrada

O passo 6 do spec parte de uma premissa falsa: que "o move para a lixeira não é
observável em web". Ele não é silencioso — ele **lança**. O shim web do
`expo-file-system` não expõe `readAsStringAsync`, então `tarefas.ts` cai no
`UnavailabilityError`, o catch converte em "falha ao mover para lixeira", e o
desmonte (que vem depois do move) nunca é alcançado no Gauntlet.

Um caso E2E aqui retornaria `INCONCLUSIVO` por construção, em toda execução, sem
proteger contra regressão alguma. Preferi não criar e registrar o motivo. A prova
é Jest, mais Nível C em aparelho: criar tarefa com alarme, apagar, conferir
`adb shell dumpsys alarm | grep -i ouroboros` sem o schedule do slug, reabrir o
app e confirmar que `reagendarAlarmes` não ressuscita.

Desbloquear o E2E depende de infra de mock de lixeira para web — achado colateral
que toca `excluirTarefa`, `excluirMarco` e `excluirExercicio`, e não pertence a
esta sprint.
