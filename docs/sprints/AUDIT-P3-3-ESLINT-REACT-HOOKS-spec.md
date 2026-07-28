# AUDIT-P3-3-ESLINT-REACT-HOOKS — instalar e ativar o plugin de regras de hooks do React

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: alta (rules-of-hooks e exhaustive-deps nunca rodaram num app com 492
            chamadas de hook em 140 arquivos)
DEPENDE:    nenhuma
ORIGEM:     achado [P3-3] da auditoria de 2026-07-28. Partiu do único erro de
            lint em `main` — um `eslint-disable-next-line` apontando para uma
            regra que não existe. A investigação da causa mostrou que o pacote
            `eslint-plugin-react-hooks` nunca esteve em `node_modules/` nem em
            `package.json`, e que `eslint.config.js` carrega só `@typescript-eslint`.
```

## Problema (a ferramenta padrão para a classe de bug mais cara do projeto está ausente)

O plugin não existe em lugar nenhum do projeto:

```
$ grep -n "react-hooks" package.json eslint.config.js
(sem resultado; grep exit=1)

$ ls node_modules/eslint-plugin-react-hooks
ls: cannot access 'node_modules/eslint-plugin-react-hooks': No such file or directory
```

`eslint.config.js` carrega um único plugin e o próprio comentário do
arquivo admite que a configuração é provisória desde o começo do
projeto:

```js
// Configuracao ESLint flat-config (v9+).
// Mantem-se minima no M01.1; regras especificas serao adicionadas em M01.2+.
...
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
```

As regras específicas do "M01.2+" nunca chegaram. Consequência: as
regras `react-hooks/rules-of-hooks` e `react-hooks/exhaustive-deps`
**nunca rodaram uma vez** neste repositório.

O sintoma que expõe a ausência é o único erro de lint de `main`:

```
$ npx eslint app/ src/ 2>&1 | grep error
  121:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found  react-hooks/exhaustive-deps
x 23 problems (1 error, 22 warnings)
```

O código em `src/components/screens/RecapScreen.tsx:118-123`:

```ts
  const params = useLocalSearchParams<{ periodo?: string }>();
  const periodoInicial = useMemo(
    () => parsePeriodoParam(params.periodo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
```

O supressor é inerte — não suprime nada, porque a regra não existe. Em
ESLint 10 (`$ npx eslint --version` → `v10.2.1`; `package.json:86` pede
`"eslint": "^10.2.1"`), uma diretiva `disable` apontando para regra
inexistente é promovida a **error**, não warning. Daí o único erro da
suíte.

Existe ainda uma confissão explícita no código, em `app/_layout.tsx:779-781`:

```
    // toast trocaria identidade entre renders; usamos snapshot via
    // useEffect uma unica vez na mount do gate. Plugin react-hooks
    // nao habilitado no eslint config do projeto.
```

O cenário de falha concreto não é o erro de lint — é o que fica
invisível. Dado um `useEffect` cujo array de dependências omite uma
variável que muda entre renders, o efeito captura o valor antigo em
closure e o app age sobre dado obsoleto: um save que grava o estado
anterior, um listener que aponta para uma `ref` já substituída, um
gate de boot que nunca reavalia. `exhaustive-deps` existe exatamente
para pegar essa classe, e ela é a mais cara deste projeto — o
`VALIDATOR_BRIEF.md` registra armadilhas de runtime documentadas de
refs voláteis e closure em `useFonts`/gates de boot.

Superfície exposta hoje, medida em `src/` e `app/`:

```
useEffect:   144 chamadas
useMemo:      85 chamadas
useCallback: 263 chamadas
arquivos com ao menos um dos tres: 140
```

492 sítios de hook em 140 arquivos, nenhum jamais analisado por
`rules-of-hooks` ou `exhaustive-deps`.

## Escopo (mínimo)

1. Adicionar `eslint-plugin-react-hooks` a `devDependencies` numa
   versão compatível com ESLint 10 e flat config. Confirmar o peer
   range antes de fixar a versão (`npm info eslint-plugin-react-hooks
   peerDependencies`) — o projeto instala com `--legacy-peer-deps`, o
   que mascara incompatibilidade em vez de reportá-la.
2. Registrar o plugin em `eslint.config.js`, no mesmo bloco de
   `files: ['**/*.ts', '**/*.tsx']`, preservando as regras existentes
   (`@typescript-eslint/no-unused-vars` e o `no-restricted-imports` do
   shim de ícones, que tem override próprio para `src/lib/icons.ts`).
3. **Adotar em dois tempos, não em um.** Nesta sprint:
   `'react-hooks/rules-of-hooks': 'error'` e
   `'react-hooks/exhaustive-deps': 'warn'`. Justificativa em §Trabalho
   de limpeza. Deixar comentário no `eslint.config.js` (sem acento,
   convenção shell/CI) registrando que `exhaustive-deps` sobe para
   `error` em sprint própria, com a data e o número de avisos do
   baseline.
4. Medir e versionar o baseline: rodar `npx eslint app/ src/ -f json`,
   contar avisos de `exhaustive-deps` por arquivo e registrar o total
   no próprio spec (linha de `## Resultado`) — sem isso, a sprint de
   promoção a `error` não tem alvo.
5. Auditar os 2 sítios que já mencionam o plugin:
   `src/components/screens/RecapScreen.tsx:121` (diretiva que passa a
   ser válida — confirmar que a supressão é de fato desejada e trocar o
   comentário-explicação por uma razão em uma linha) e
   `app/_layout.tsx:780` (comentário que diz que o plugin não está
   habilitado; corrigir o texto).
6. NÃO-objetivo: corrigir os arrays de dependência que os avisos
   revelarem. Cada correção de `exhaustive-deps` muda comportamento de
   runtime e precisa de validação própria; entram em sprint(s)
   separada(s) priorizadas pelo baseline. Também fora: promover
   `exhaustive-deps` a `error`, e mexer no `|| true` do
   `scripts/smoke.sh` (é AUDIT-P3-2).

## Trabalho de limpeza que esta sprint destrava

**Aviso explícito ao dono: esta sprint provavelmente revela muitos
avisos de uma vez.** 492 sítios de hook em 140 arquivos, nenhum nunca
analisado, e apenas 2 diretivas `react-hooks` em toda a árvore (das
quais 1 é comentário em prosa, não diretiva). Em bases desse porte a
primeira execução de `exhaustive-deps` costuma acusar dezenas de
avisos. O número exato só é conhecido depois de instalar — por isso o
passo 4 é obrigatório e o spec não finge saber o total.

Duas estratégias de adoção foram consideradas:

| Estratégia | Prós | Contras |
|---|---|---|
| **Escolhida — `rules-of-hooks: error`, `exhaustive-deps: warn`** | `rules-of-hooks` é binário e quase sempre já está limpo (violação dela quebra o app em runtime, então dificilmente sobreviveu); `exhaustive-deps` fica visível sem travar ninguém; a promoção a `error` vira sprint com alvo numérico | dívida fica registrada como warning e pode ser ignorada se ninguém olhar o log |
| Rejeitada — arquivo de baseline com supressões por arquivo | CI fica verde no dia 1 com a regra em `error` | 140 arquivos potencialmente na lista; baseline vira lista de exclusão permanente, o padrão que já falhou no projeto com `.ptbr-violations.txt` |

Interação com AUDIT-P3-2 (que faz o smoke abortar quando o lint
reprova): **esta sprint deve ser mergeada antes**. Ela remove o único
`error` existente (o supressor passa a apontar para regra real) e
mantém a novidade em `warn`, ou seja, entrega um lint com exit 0 para
AUDIT-P3-2 endurecer. Na ordem inversa, o gate nasce impossível de
satisfazer.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
npx eslint --version                                # v10.2.1
grep -n "react-hooks" package.json eslint.config.js # sem resultado
ls node_modules/eslint-plugin-react-hooks           # No such file or directory
npx eslint app/ src/ 2>&1 | tail -3                 # 23 problems (1 error, 22 warnings)

# DEPOIS
npm ls eslint-plugin-react-hooks                    # versao resolvida, sem "invalid"
npx eslint app/ src/ 2>&1 | tail -3                 # 0 errors, N warnings (N = baseline medido)
npx eslint app/ src/ -f json \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(sum(1 for f in d for m in f['messages'] if m.get('ruleId','').startswith('react-hooks/')))"
                                                    # total de avisos react-hooks -> registrar no spec

# a regra realmente roda (prova positiva, nao so' ausencia de erro):
#   inserir temporariamente um useEffect com dep faltando num arquivo de src/,
#   confirmar que o eslint acusa exhaustive-deps, e reverter

npx tsc --noEmit                                    # exit 0 (nao-regressao)
npm test                                            # 356 suites, 3351 passed (nao-regressao)
./scripts/smoke.sh                                  # exit 0
```

Sem device, sem E2E, sem Gauntlet: a sprint só adiciona uma dependência
de desenvolvimento e regras de análise estática. Nenhum arquivo de
runtime muda de comportamento — os dois arquivos tocados
(`RecapScreen.tsx`, `app/_layout.tsx`) mudam apenas comentário.

## Commit

```
ci: audit-p3-3 instala eslint-plugin-react-hooks com rules-of-hooks em error e exhaustive-deps em warn
```
