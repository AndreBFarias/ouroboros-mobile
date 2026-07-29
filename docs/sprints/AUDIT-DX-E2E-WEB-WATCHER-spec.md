# AUDIT-DX-E2E-WEB-WATCHER — segunda execução do runner E2E web derruba o Metro

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: baixa (só afeta o ciclo local; nada em CI, nada em aparelho,
            nada no app entregue — mas o sintoma engana e custa tempo)
DEPENDE:    nenhuma
ORIGEM:     achado [DX-1] da auditoria de 2026-07-28. Encontrado na execução
            da Fase 1, ao rodar `npm run test:e2e:web` duas vezes seguidas
            para confirmar um caso: a primeira passou, a segunda falhou com
            ERR_CONNECTION_REFUSED. Verificado que o Metro morre com ENOENT
            de watch sobre o `outputDir` que o Playwright acabou de apagar.
```

## Problema (o Metro observa o diretório que o Playwright apaga ao iniciar)

### O sintoma, que aponta para o lugar errado

`npm run test:e2e:web` funciona na primeira execução e falha na **segunda**
consecutiva. O erro que aparece está dentro do caso E2E:

```
page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/_dev/gauntlet
```

Isso se lê como "o caso E2E está quebrado" ou "o Gauntlet não subiu". Nenhum
dos dois. O bundler morreu no meio do run, com:

```
ENOENT: no such file or directory, watch '<repo>/test-results/e2e-web'
```

O que torna o sintoma especialmente enganoso é a ordem em
`scripts/e2e-web.sh`: o script sobe o Metro, faz health-check com poll de até
90 s, imprime `OK: Metro web pronto em http://localhost:8081/_dev/gauntlet` e
**só então** chama o Playwright. No instante do health-check o Metro está
vivo. Ele morre depois, já dentro do run — então a mensagem de diagnóstico do
script (`ERRO: Metro morreu`) nunca dispara e a saída aponta só para o caso.

### O mecanismo

Três peças que, isoladas, estão corretas.

**Peça 1 — o Playwright escreve artefatos na raiz do repo.**

```ts
// tests/e2e/harness/playwright.config.ts
// Artefatos (screenshots de falha + relatorio HTML) vao para a RAIZ do
// repo (test-results/, playwright-report/), nao para dentro do dir-fonte
// do harness. Facilita o upload-artifact do CI (sub-sprint b) e mantem
// tests/e2e/harness limpo.
const RAIZ = path.resolve(__dirname, '../../..');
// ...
  outputDir: path.join(RAIZ, 'test-results', 'e2e-web'),
```

**Peça 2 — o Playwright limpa o `outputDir` ao iniciar.** É comportamento
documentado e desejado: cada run começa com a pasta de artefatos zerada.

**Peça 3 — o Metro observa a raiz do repo inteira.**

```js
// metro.config.js
const config = getDefaultConfig(__dirname);
```

`__dirname` é a raiz, e não há nada no arquivo que subtraia diretórios da
observação: `metro.config.js` customiza `resolver.unstable_conditionNames`,
`resolver.unstable_enablePackageExports` e `resolver.resolveRequest`, e não
declara `blockList` nem `watchFolders`.

A sequência que quebra:

1. **Run 1.** `test-results/` não existe quando o Metro sobe. O Playwright a
   cria durante o run. O Metro passa a observá-la. No fim, `scripts/e2e-web.sh`
   derruba o Metro pelo `trap` — e os diretórios ficam no disco. Não há
   limpeza: `test-results` e `playwright-report` não estão sequer no
   `.gitignore` (que só lista `.playwright-artifacts/`).
2. **Run 2.** O Metro sobe com `test-results/e2e-web` **já presente** e
   registra um watch sobre ela na indexação inicial. O health-check passa. O
   Playwright inicia, apaga o `outputDir` para zerar os artefatos, e o watch
   registrado aponta para um caminho que deixou de existir. O `ENOENT` sobe
   pela pilha do watcher, mata o processo do bundler, e a porta 8081 fecha.
3. Todo caso a partir daí devolve `ERR_CONNECTION_REFUSED`.

O run 1 funciona por sorte: a pasta nasce **depois** da indexação, e um
diretório criado durante a sessão não entra no mesmo caminho de falha que um
diretório observado desde o início.

### Alcance

Só o ciclo local. Nenhum dos quatro workflows de `.github/workflows/`
(`ci.yml`, `anonymity-check.yml`, `build-android-apk.yml`,
`build-dev-client.yml`) executa a suíte E2E web hoje. Quando a sub-sprint `b`
de `R-CI-E2E-WEB` levar o runner ao CI, o checkout limpo mascara o defeito por
construção — todo run é sempre o run 1. O custo fica inteiro em quem itera na
máquina, que é justamente onde se roda a suíte várias vezes seguidas.

### Contorno atual

```bash
rm -rf test-results playwright-report && npm run test:e2e:web
```

Funciona sempre, e é conhecimento que não está escrito em lugar nenhum — o
cabeçalho de `scripts/e2e-web.sh` documenta três descobertas anteriores
(heap do node, `EXPO_PUBLIC_GAUNTLET`, health-check com poll) e não esta.

## Escopo (mínimo)

1. Subtrair os diretórios de artefato da observação do Metro. Acrescentar a
   `metro.config.js` uma `resolver.blockList` (via `exclusionList` de
   `metro-config`) cobrindo `test-results/` e `playwright-report/` na raiz do
   projeto. Cuidado com o que já existe no arquivo: a customização de
   `resolveRequest` e a chamada final `withNativeWind(config, ...)` precisam
   continuar intactas, e a `blockList` não pode capturar nada de `app/`,
   `src/` ou `node_modules/`.
2. Confirmar empiricamente que a `blockList` de fato remove o caminho do
   watcher nesta versão do Metro — em algumas versões ela afeta só a
   resolução de módulos. Se não resolver, o plano B é mover o `outputDir` do
   Playwright para fora da árvore observada (por exemplo `/tmp`), o que
   conflita com a intenção declarada no comentário de `playwright.config.ts`
   de facilitar o `upload-artifact` do CI — nesse caso, atualizar aquele
   comentário junto com a mudança. Escolher um dos dois e registrar a razão.
3. Cinto de segurança em `scripts/e2e-web.sh`: apagar `test-results/` e
   `playwright-report/` antes de subir o Metro, com o motivo em comentário
   no cabeçalho (que já tem a seção "Descobertas endereçadas"). Barato,
   independente da versão do Metro, e torna o contorno manual desnecessário
   mesmo se o passo 1 regredir numa atualização.
4. Acrescentar `test-results/` e `playwright-report/` ao `.gitignore`. Hoje
   ausentes — a única entrada relacionada é `.playwright-artifacts/`. Sem
   isso, um run local deixa artefatos como untracked no `git status`, o que
   polui a leitura do repo antes de commitar.
5. NÃO-objetivo: mexer em qualquer caso de `tests/e2e/playwright/`. Nenhum
   deles está errado; todos são vítimas do bundler morto.
6. NÃO-objetivo: levar a suíte E2E web ao CI. É a sub-sprint `b` de
   `R-CI-E2E-WEB`, com escopo próprio.
7. NÃO-objetivo: atualizar `docs/FEATURES-CANONICAS.md`. Nada muda para o
   usuário — é ferramenta de desenvolvimento.

## Proof-of-work

A prova é a reprodução e o desaparecimento dela. Antes da correção, com os
diretórios presentes, a segunda execução falha; depois, não falha.

```bash
# 1. reproduzir o defeito no estado atual
rm -rf test-results playwright-report
npm run test:e2e:web                                # run 1: verde
npm run test:e2e:web                                # run 2: ERR_CONNECTION_REFUSED
grep -n "ENOENT" /tmp/e2e-web-metro-8081.log        # a causa real, no log do Metro

# 2. aplicar a correcao e repetir SEM limpar entre os runs
npm run test:e2e:web                                # verde
npm run test:e2e:web                                # verde
npm run test:e2e:web                                # verde (tres seguidos)
grep -c "ENOENT" /tmp/e2e-web-metro-8081.log        # 0

# 3. a blockList nao pode ter quebrado a resolucao normal
npx tsc --noEmit                                    # exit 0
./gauntlet.sh                                       # bundle web sobe e /_dev/gauntlet carrega
npm test                                            # 361 suites, sem regressao

# 4. artefatos deixam de sujar o status do repo
npm run test:e2e:web && git status --porcelain      # sem test-results/ nem playwright-report/

./scripts/smoke.sh                                  # verde
```

Sem screenshots: a sprint não toca UI nem código do app. A evidência é a
saída dos três runs consecutivos e o log do Metro sem `ENOENT`.

## Commit

```
fix: audit-dx-e2e-web-watcher metro ignora artefatos do playwright na raiz
```
