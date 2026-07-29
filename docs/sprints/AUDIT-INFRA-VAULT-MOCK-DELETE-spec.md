# AUDIT-INFRA-VAULT-MOCK-DELETE — o Vault mock do Gauntlet não implementa exclusão

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (infraestrutura de teste; nenhum E2E consegue provar que
            um item sumiu, e vários já foram escritos como se conseguissem)
DEPENDE:    nenhuma
ORIGEM:     achado [INFRA-VMD] da auditoria de 2026-07-28. Encontrado na
            execução da Fase 1, ao escrever o E2E da AUDIT-P1-4: a limpeza
            de duplicatas de agenda apaga arquivos, e no Gauntlet nada
            acontecia. A investigação mostrou que reader.ts e writer.ts têm
            branch de mock para web/dev, e o caminho de exclusão não tem —
            os módulos chamam StorageAccessFramework.deleteAsync direto.
```

## Problema (o mock cobre leitura e escrita, não exclusão)

### A assimetria

`reader.ts` e `writer.ts` desviam para o mock em web/dev:

```ts
// src/lib/vault/reader.ts:34   (dentro de readVaultFile)
  if (Platform.OS === 'web' && __DEV__) {
// src/lib/vault/reader.ts:62   (dentro de listVaultFolder)
  if (Platform.OS === 'web' && __DEV__) {
// src/lib/vault/writer.ts:63   (dentro de writeVaultFile)
  if (Platform.OS === 'web' && __DEV__) {
```

O motivo está escrito no cabeçalho do próprio mock:

```
// src/lib/dev/vaultMockStore.ts (cabecalho)
// V4.0 (INFRA-VAULT-WEB-MOCK, 2026-05-08): store auxiliar do Gauntlet
// (web/dev only) para simular o SAF nativo. Em web,
// StorageAccessFramework.{read,write,readDirectory}AsStringAsync lanca
// UnavailabilityError pois o SAF nao existe no DOM.
```

A enumeração `{read,write,readDirectory}` é literalmente o escopo entregue —
e `delete` não está nela. A store expõe `getArquivo`, `setArquivo`, `listar`,
`listarPasta`, `setEventos` e `limpar`. Não há **nenhuma** operação que remova
uma única URI: `limpar()` zera o mapa inteiro e serve ao reset entre casos
E2E, não a simular uma exclusão do app.

Enquanto isso, os módulos que apagam arquivo não passam por `writer.ts` — cada
um chama o SAF direto. Onze arquivos, nove deles em `src/lib/vault/`:

```
src/lib/vault/agenda.ts        await StorageAccessFramework.deleteAsync(arquivoUri);
src/lib/vault/alarmes.ts       await StorageAccessFramework.deleteAsync(uri);
src/lib/vault/contadores.ts    await StorageAccessFramework.deleteAsync(uri);
src/lib/vault/exercicios.ts    await StorageAccessFramework.deleteAsync(origemUri);
src/lib/vault/grupo_treino.ts  await StorageAccessFramework.deleteAsync(uri);
src/lib/vault/marcos.ts        await StorageAccessFramework.deleteAsync(origemUri);
src/lib/vault/rotina.ts        await StorageAccessFramework.deleteAsync(uri);
src/lib/vault/tarefas.ts       await StorageAccessFramework.deleteAsync(origemUri);
src/lib/vault/treinos.ts       await StorageAccessFramework.deleteAsync(origemUri);
src/lib/treinos/migrarDraftsParaTreinoSessao.ts
src/lib/boot/limparDuplicatasAgenda.ts
```

Em web, cada uma dessas chamadas levanta `UnavailabilityError`, cai no
`catch` local e o arquivo permanece no mapa do mock, para sempre.

### A consequência: E2E cego para remoção

No Gauntlet, **nenhuma remoção de arquivo é observável**. Qualquer caso que
queira provar "o item sumiu" está estruturalmente impedido. Não é hipótese;
o repo tem os dois lados registrados.

Um comentário que acredita no contrário:

```
// src/lib/vault/rotina.ts:105-109
// Apaga arquivo de rotina. Idempotente: nao falha se nao existe.
// SAF.deleteAsync no nativo; em web cai em no-op silencioso (writer
// usa mock store que nao tem delete explicito; o efeito e equivalente
// para a UI porque listarRotinas para de retornar o arquivo apos
// reload do mock root).
```

A justificativa não se sustenta. `listarRotinas` lê do mesmo mapa em que o
arquivo continua; o "reload do mock root" a que o texto se refere é o
`limpar()` do reset, que apaga tudo — não é equivalente a apagar um item.
O comentário descreve um comportamento que o mock não tem.

E um caso E2E que nasceu com um passo impossível:

```
// tests/e2e/playwright/m37-1-2-cache-agenda-md.e2e.ts:3-9
// Verifica que apos refactor (cache JSON unico -> N .md em
// agenda/<pessoa>/) a UI continua identica em comportamento:
//   1. Seed Gauntlet com 3 eventos mockados via calendarApi.
//   2. Navegar /agenda; verificar que os 3 aparecem na grid mensal e
//      que o evento do dia atual esta na lista do dia.
//   3. Re-seed simulando delete remoto (lista com 2 eventos); verificar
//      que o terceiro some da UI.
```

O passo 3 nunca foi implementado. As duas únicas ocorrências de "terceiro" no
arquivo estão nesse cabeçalho — o corpo do caso, nas 124 linhas, não tem
re-seed nem assert de sumiço. Prova arqueológica de que o autor pretendeu
cobrir remoção, tentou, e a lacuna de infraestrutura ganhou.

O caso mais recente é explícito sobre o bloqueio, e devolve `INCONCLUSIVO`
em vez de mascarar:

```
// tests/e2e/playwright/audit-p1-4-agenda-evento-duplicado.e2e.ts:22-28
// LIMITE CONHECIDO (achado colateral desta sprint): useVaultMock ainda
// nao implementa delete -- reader/writer tem branch web mock, o caminho
// de exclusao (StorageAccessFramework.deleteAsync) nao. Enquanto essa
// lacuna de infra nao for fechada, o passo 4 nao consegue remover nada
// em web e o caso devolve INCONCLUSIVO com o motivo literal, em vez de
// FAIL.
```

Esse caso vira `PASS` sozinho, sem nenhuma edição, assim que esta sprint
entrar. É o teste de aceitação natural do trabalho.

## Escopo (mínimo)

1. `apagarArquivo(uri: string): boolean` em `src/lib/dev/vaultMockStore.ts`.
   Remove a URI do `Map` e devolve se havia algo. Idempotente: apagar duas
   vezes não quebra, a segunda devolve `false`. Segue o padrão das ações
   existentes (`set` sobre uma cópia do `Map`, para o zustand notificar).
2. `deleteVaultFile(uri: string): Promise<void>` canônico em
   `src/lib/vault/writer.ts`, com o mesmo `if (Platform.OS === 'web' && __DEV__)`
   que `writeVaultFile` já usa em `:63`; fora desse branch, delega para
   `StorageAccessFramework.deleteAsync`. Preservar a semântica atual de cada
   caller — todos já engolem a falha de exclusão, e não é esta sprint que
   muda isso.
3. Adoção incremental pelos módulos. Trocar a chamada direta ao SAF por
   `deleteVaultFile` nos nove módulos de `src/lib/vault/` e nos dois de fora
   (`migrarDraftsParaTreinoSessao.ts`, `limparDuplicatasAgenda.ts`). Um
   commit por módulo, ou por grupo coeso — a lista está na tabela do Problema.
4. **Armadilha obrigatória a cada adoção:** 23 suítes mockam
   `@/lib/vault/writer` com **apenas** `{ writeVaultFile }`, no formato

   ```ts
   jest.mock('@/lib/vault/writer', () => ({
     __esModule: true,
     writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
   }));
   ```

   Um módulo que passe a importar `deleteVaultFile` recebe `undefined` dessas
   suítes e quebra na chamada. Cada adoção exige acrescentar `deleteVaultFile`
   ao mock local da suíte correspondente. É a mesma armadilha que
   `src/lib/vault/leituraLote.ts:10-16` documenta como a razão de
   `readVaultFiles` morar fora de `reader.ts`:

   ```
   // Por que readVaultFiles vive AQUI e nao em reader.ts: os testes unit
   // dos listar* mockam '@/lib/vault/reader' com apenas
   // { listVaultFolder, readVaultFile }. Se readVaultFiles morasse em
   // reader.ts, esses mocks parciais o tornariam undefined e quebrariam as
   // suites.
   ```

   Avaliar, no início da sprint, se `deleteVaultFile` deve nascer em
   `writer.ts` ou num módulo próprio pelo mesmo argumento. A decisão precisa
   ficar escrita no cabeçalho do arquivo escolhido.
5. Corrigir o comentário de `src/lib/vault/rotina.ts:105-109`, que hoje
   afirma uma equivalência que não existe. Depois desta sprint ele passa a
   ser verdade — reescrever para descrever o mecanismo real, não a esperança.
6. Implementar o passo 3 de `tests/e2e/playwright/m37-1-2-cache-agenda-md.e2e.ts`,
   que está prometido no cabeçalho desde M37.1.2 e nunca existiu: re-seed com
   dois eventos, assert de que o terceiro sumiu da grid e da lista do dia.
7. Rodar `tests/e2e/playwright/audit-p1-4-agenda-evento-duplicado.e2e.ts` sem
   alterá-lo e confirmar `PASS` no lugar de `INCONCLUSIVO`. Depois disso,
   remover do cabeçalho do caso o bloco `LIMITE CONHECIDO` de `:22-28`, que
   deixa de valer.
8. NÃO-objetivo: exclusão de binários (jpg, m4a, mp4, pdf). O mock guarda
   `Map<string, string>` de conteúdo textual; mídia no Gauntlet tem mocks
   próprios (`adicionarFotoMock` e afins). Escopo desta sprint é `.md`.
9. NÃO-objetivo: atualizar `docs/FEATURES-CANONICAS.md`. Nenhuma feature de
   usuário é introduzida, modificada ou removida — o alvo é exclusivamente a
   infraestrutura de teste. Comportamento em aparelho fica byte a byte igual.

## Proof-of-work

```bash
npx tsc --noEmit                                     # exit 0
npm test                                             # 361 suites, sem regressao

# nenhum modulo pode mais chamar o SAF de exclusao direto
rg -n "StorageAccessFramework\.deleteAsync" src/     # so em src/lib/vault/writer.ts

# o mock passa a ter a operacao
rg -n "apagarArquivo" src/lib/dev/vaultMockStore.ts

# aceitacao: o caso da AUDIT-P1-4 vira PASS sem ser editado
./gauntlet.sh
npm run test:e2e:web -- --grep audit-p1-4            # PASS (era INCONCLUSIVO)
npm run test:e2e:web -- --grep m37-1-2               # PASS com o passo 3 implementado
npm run test:e2e:web                                 # suite inteira sem novo FAIL

./scripts/smoke.sh                                   # verde
```

Screenshots em `docs/sprints/AUDIT-INFRA-VAULT-MOCK-DELETE-screenshots-gauntlet/`
(agenda com três eventos e, depois do re-seed, com dois — a evidência visual
de que a remoção passou a ser observável).

Validação de runtime real (Nível B, emulador): apagar uma rotina e uma tarefa
em aparelho e conferir que o `.md` sumiu do Vault. A troca de call site não
pode mudar nada em nativo.

```bash
adb shell run-as com.ouroboros.mobile ls files/Ouroboros/markdown/ | grep rotina-
```

## Commit

```
feat: audit-infra-vault-mock-delete exclusao observavel no vault mock do gauntlet
```
