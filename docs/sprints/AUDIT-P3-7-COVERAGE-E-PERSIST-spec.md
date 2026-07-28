# AUDIT-P3-7-COVERAGE-E-PERSIST — teste do adapter de persistência e piso de cobertura contra regressão

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: alta (o módulo com maior raio de explosão do projeto não tem um único
            teste, e nada impede a cobertura de cair)
DEPENDE:    nenhuma
ORIGEM:     achado [P3-7] da auditoria de 2026-07-28. A varredura de cobertura
            rodou `npx jest --coverage` (o projeto não mede por padrão), cruzou
            os 252 arquivos de `src/lib` e os 73 de `app/` contra o conteúdo de
            `tests/` por caminho de import, e ordenou o resultado por raio de
            explosão em vez de por tamanho de arquivo.
```

## Problema (nada mede a cobertura, e o módulo mais crítico está a zero)

Não existe threshold em lugar nenhum:

```
$ grep -n "coverage\|collectCoverage\|coverageThreshold" jest.config.js ; echo "exit=$?"
exit=1

$ grep -rn "coverage" scripts/smoke.sh .github/workflows/ ; echo "exit=$?"
exit=1
```

E `package.json` tem `"test": "jest --watchAll=false"`, sem
`--coverage`, e nenhum outro script que mencione cobertura. O número
nunca é medido — nem local, nem em CI.

Medição feita na auditoria de 2026-07-28
(`npx jest --coverage --ci`, execução única):

```
Statements   : 74.27% ( 10574/14236 )
Branches     : 62.83% ( 5169/8226 )
Functions    : 74.26% ( 2136/2876 )
Lines        : 76.00% ( 9655/12703 )
```

O número em si é razoável. O problema é que, sem piso, ele pode cair a
qualquer merge sem que nada acuse — e a distância entre branches
(62,83%) e statements (74,27%) mostra onde a erosão já está: os
caminhos de erro e de borda.

### O buraco de maior raio de explosão

`src/lib/stores/persist.ts` — 38 linhas, adapter de storage do zustand,
e **nenhum teste o importa**:

```
$ grep -rn "lib/stores/persist" tests/ | wc -l
0
$ grep -rn "secureStorage" tests/ | wc -l
0
```

O módulo exporta um único símbolo, escolhido por plataforma:

```ts
// src/lib/stores/persist.ts:37-38
export const secureStorage: StateStorage =
  Platform.OS === 'web' ? webStorage : nativeStorage;
```

E é consumido pelas **8 stores** do app — verificado por grep:

```
src/lib/stores/pessoa.ts
src/lib/stores/vault.ts
src/lib/stores/settings.ts
src/lib/stores/sessao.ts
src/lib/stores/onboarding.ts
src/lib/stores/googleAuth.ts
src/lib/integracoes/spotify/store.ts
src/lib/integracoes/youtube/store.ts
```

Cenário de falha concreto: alguém troca `?? null` por `?? undefined` no
`getItem` do ramo nativo (`persist.ts:28`). O `persist` do zustand
interpreta `undefined` como "sem estado salvo", todas as 8 stores
reidratam vazias, e o app abre como se fosse a primeira instalação —
nomes de `pessoa_a`/`pessoa_b` sumidos, raiz do Vault esquecida,
onboarding refeito. Nenhum dos 3351 testes atuais falha, porque nenhum
exercita este arquivo. O tamanho do módulo (38 linhas, lógica trivial)
é justamente o que faz ninguém pensar em testá-lo; o raio de explosão é
o oposto do tamanho.

### Demais módulos de alto risco sem teste direto

Verificado por grep de caminho de import em `tests/`:

| Módulo | Refs em `tests/` | Por que importa |
|---|---|---|
| `src/lib/stores/persist.ts` | **0** | acima — adapter das 8 stores |
| `app/settings/vault.tsx` | **0** | tela de export/wipe/reset do Vault. Existe E2E de export (`r-vault-b-settings-export.e2e.ts`), mas os fluxos de wipe e reset — os destrutivos — não aparecem cobertos em lugar nenhum |
| `src/lib/schemas/financeiro.ts` | **0** | valida notificação financeira vinda de **outro app** via share intent Android. Entrada não confiável por natureza. Atenção ao falso positivo: os 2 matches de `schemas/financeiro` em `tests/` são de `schemas/financeiro_nota`, arquivo diferente. O consumo real é `src/lib/share/financeiroReceiver.ts:21` e `app/share-receive.tsx:36` |
| `app/share-receive.tsx` | **0** | a tela que recebe essa entrada não confiável. O E2E existente (`m-q10-share-financeiro.e2e.ts`) declara no próprio cabeçalho que exige checkpoint humano — não é prova automatizada |
| Pipeline do Scanner | parcial | `parsing.ts` e `saveNota.ts` têm teste; `launch.ts`, `multipage-pdf.ts` e `text-recognition.ts` têm **0**. O E2E existente documenta que o fluxo real usa ML Kit e câmera e não roda no Gauntlet web — cobre navegação, não parsing |
| `app/ciclo/registrar.tsx` | **0** | escreve dado de saúde sensível. Mitigado parcialmente por 2 E2E de persistência, sem teste isolado de validação de formulário |
| `src/lib/diario/transcribe.ts` | **0** | transcrição de áudio do diário. Fronteira nativa e assíncrona, consumida por 3 componentes de UI. Zero cobertura em qualquer nível |
| `src/lib/stores/hydrated.ts` | **0** | gate de "hidratação pronta" no boot. Bug aqui = corrida de boot, tela em branco ou render antes do Vault carregar |

## Escopo (mínimo)

Ordem deliberada: **teste primeiro, threshold depois**. Ligar um piso
sem antes cobrir o buraco conhecido é registrar a dívida como
aceitável.

1. **`tests/lib/stores/persist.test.ts`** — cobrir os dois ramos de
   `Platform.OS`, os três métodos (`getItem`, `setItem`, `removeItem`)
   em cada, e as bordas que o código já trata explicitamente:
   `window === undefined` e `window.localStorage` ausente no ramo web
   (`persist.ts:14,18,22`), e a conversão de `undefined` para `null` no
   `getItem` nativo (`persist.ts:28`) — a asserção que teria pego o
   cenário de falha descrito acima. Mockar `expo-secure-store` e
   `Platform` com `jest.mock`, seguindo o padrão já usado nas suítes de
   `tests/lib/stores/`.
2. **Threshold calibrado no patamar atual, não aspiracional.**
   Adicionar `coverageThreshold` global a `jest.config.js` com valores
   alguns pontos abaixo da medição do dia da execução (a medição de
   2026-07-28 dá `74/62/74/76`; usar algo como
   `statements: 72, branches: 60, functions: 72, lines: 73`). O
   objetivo é **impedir regressão**, não forçar subida. Um piso
   aspiracional nasce vermelho e é revertido na primeira semana.
   Remedir e recalibrar no momento da execução — os números podem ter
   mudado.
3. **Um caminho para coletar.** Script `"test:coverage": "jest
   --coverage --watchAll=false"` em `package.json`. Decidir e
   documentar onde o threshold é cobrado: rodar coverage em todo
   `npm test` encarece a suíte (46 s hoje, sem coverage); a opção mais
   barata é um step separado no `ci.yml` ou um job noturno. Registrar a
   escolha em comentário no `jest.config.js`.
4. **Registrar os demais módulos de alto risco** como fila explícita —
   os 8 da tabela acima — no `_BACKLOG.md` ou em spec própria, para não
   se perderem. Esta sprint cobre apenas `persist.ts`.
5. NÃO-objetivo: escrever teste para os outros 7 módulos da tabela
   (cada um é sprint própria, e vários exigem decisão de estratégia —
   RTL de tela, E2E, ou unitário da lógica extraída); subir os números
   de cobertura; mexer em `collectCoverageFrom`, que hoje não existe e
   cujo default do preset já produziu a medição citada.

## Trabalho de limpeza que esta sprint destrava

Esta sprint **não** deixa o CI vermelho se o passo 2 for respeitado —
o threshold é calibrado abaixo do estado atual por construção. O risco
é o oposto: um threshold alto demais trava PRs legítimos. A
recomendação de folga de 2 a 3 pontos existe para absorver a variação
natural entre execuções.

A fila que ela **torna explícita**:

- 7 módulos de alto risco sem teste direto (tabela acima), dos quais 3
  processam entrada não confiável ou dado sensível
  (`schemas/financeiro.ts` + `share-receive.tsx`, `ciclo/registrar.tsx`).
- 28 arquivos de `src/lib` sem teste direto no total (11,1% de 252) —
  a maioria de baixo risco, mas a lista está medida e disponível.
- Branch coverage em 62,83% contra 74,27% de statements: os caminhos de
  erro são sistematicamente menos testados que os caminhos felizes.
  Consistente com o achado paralelo de 6 testes cuja única asserção é
  `not.toBeNull()`/`toBeDefined()` sobre o caso positivo, sem verificar
  conteúdo. Fila separada, não desta sprint.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
grep -n "coverageThreshold" jest.config.js ; echo "exit=$?"        # exit=1
grep -rn "coverage" scripts/smoke.sh .github/workflows/ ; echo "exit=$?"  # exit=1
grep -rn "lib/stores/persist" tests/ | wc -l                       # 0
grep -rn "secureStorage" tests/ | wc -l                            # 0

# DEPOIS
npm test -- tests/lib/stores/persist.test.ts                       # N passed
grep -rn "lib/stores/persist" tests/ | wc -l                       # > 0

# medir e calibrar (rodar ANTES de fixar os numeros do threshold)
npx jest --coverage --ci --coverageReporters=text-summary
#   registrar os 4 percentuais no comentario do jest.config.js

# o piso tem dente: baixar o threshold artificialmente para acima do
# medido e confirmar que o jest sai != 0, depois reverter para o valor
# calibrado
npm run test:coverage; echo "COV_EXIT=$?"                          # COV_EXIT=0

npx tsc --noEmit                                                   # exit 0
npm test                                                           # 357 suites (356 + a nova)
./scripts/smoke.sh                                                 # exit 0
```

Sem device, sem E2E, sem Gauntlet: a sprint adiciona um teste unitário
e configuração de Jest. Nenhum arquivo de runtime é alterado.

## Commit

```
test: audit-p3-7 cobre o adapter de persistencia das 8 stores e adiciona piso de cobertura calibrado
```
