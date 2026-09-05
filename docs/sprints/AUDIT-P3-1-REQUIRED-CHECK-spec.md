# AUDIT-P3-1-REQUIRED-CHECK — tornar o quality-gate required check de fato e corrigir a afirmação sobre ele

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: alta (o gate que o arquivo de regras da raiz declara obrigatório
            não bloqueia nada hoje)
DEPENDE:    nenhuma
ORIGEM:     achado [P3-1] da auditoria de 2026-07-28. A varredura de gates de CI
            confrontou a afirmação do arquivo de regras da raiz sobre bloqueio
            server-side com a configuração real de branch protection lida via
            `gh api`. O único required check é `scan-commits`; `quality-gate`
            não está na lista.
            Verificado também que `scripts/setup-branch-protection.sh` já declara
            os contexts corretos, mas nunca foi aplicado ao repositório.
```

## Problema (documentação afirma um bloqueio que a configuração não tem)

O arquivo de regras da raiz (linhas 108-116) declara, em bloco de
citação destacado:

```
> **Onde o bloqueio de fato acontece (R-AUDIT-CI-GATES, 2026-07-11):**
> [...] O gate que **obriga
> de verdade** é server-side: `.github/workflows/ci.yml` roda
> `./scripts/smoke.sh` (que inclui esta auditoria PT-BR e o anonimato)
> em todo PR e push para `main`. Marcado como required check, um PR com
> string UI sem acento não mergeia, tenha ou não hooks locais.
```

A configuração real do repositório contradiz a leitura natural desse trecho:

```
$ gh api repos/:owner/:repo/branches/main/protection \
    --jq '{contexts: .required_status_checks.contexts,
           strict: .required_status_checks.strict,
           enforce_admins: .enforce_admins.enabled,
           linear_history: .required_linear_history.enabled,
           pr_reviews: (.required_pull_request_reviews // null)}'

{"contexts":["scan-commits"],"enforce_admins":false,"linear_history":false,"pr_reviews":null,"strict":true}
```

Ou seja: o único check obrigatório é `scan-commits` (de
`anonymity-check.yml`, que audita metadados de commit). O job
`quality-gate` de `.github/workflows/ci.yml:29-30` — o que roda
`./scripts/smoke.sh` com anonimato, dados de teste, PT-BR, tsc e jest —
**roda mas não bloqueia**. `enforce_admins: false` e
`required_pull_request_reviews: null` completam o quadro.

Cenário de falha concreto: um PR com `tsc` vermelho, teste unitário
falhando ou string de UI sem acento recebe um X vermelho do
`quality-gate` no Actions e **mergeia mesmo assim**, porque o botão de
merge só consulta `scan-commits`. A frase do arquivo de regras da raiz
é tecnicamente uma condicional ("Marcado como required check, ..."), mas
está redigida como constatação de estado no meio de um parágrafo que
afirma "o gate que **obriga** de verdade" — e foi lida como tal por
todas as sprints subsequentes.

Contradição adicional entre os dois documentos: o arquivo de regras da
raiz se declara "cópia das regras do `docs/CONTEXTO.md` Seção 5" e diz
que "em caso de divergência, o `CONTEXTO.md` é a fonte da verdade". Mas o
parágrafo acima **não existe** no `CONTEXTO.md`: a Seção 5 daquele
arquivo não tem nenhuma menção a `ci.yml`, `smoke.sh`, branch
protection ou required check. A única linha adjacente é a
`docs/CONTEXTO.md:288`, dentro da Regra Zero:

```
5. Validar (`scripts/check_anonimato.sh`, `npm run lint`, `npm test`)
```

que prescreve `npm run lint` como passo de validação — hoje vermelho em
`main` (ver AUDIT-P3-2). A cópia derivou da fonte declarada, e a fonte
está defasada.

Terceiro fato, este favorável: a remediação já existe em código.
`scripts/setup-branch-protection.sh:53` declara exatamente os contexts
desejados e o próprio script documenta, em `:48-52`, que ligar a
proteção é passo do dono:

```bash
CONTEXTS_JSON='{"strict":true,"contexts":["scan-commits","Build APK Android","quality-gate"]}'
```

O script nunca foi aplicado. E ele traz uma armadilha que precisa ser
resolvida antes de rodar: `Build APK Android`
(`.github/workflows/build-android-apk.yml:33`) só dispara em
`workflow_dispatch` e em push de tag `v*-alpha-*`
(`build-android-apk.yml:25-28`). Nunca reporta em `pull_request`. Com
esse context exigido e `strict: true`, todo PR ficaria eternamente em
"Expected — waiting for status to be reported", travando o merge de
qualquer coisa. O script também flipa `required_linear_history` de
`false` para `true`, mudança de política que precisa ser consciente.

## Escopo (mínimo)

1. Corrigir `scripts/setup-branch-protection.sh:53`: remover
   `Build APK Android` do `CONTEXTS_JSON` (nunca reporta em PR) e
   deixar `["scan-commits","quality-gate"]`. Registrar a razão em
   comentário no próprio script, sem acento (convenção shell/CI).
   Decidir explicitamente sobre `required_linear_history=true` — manter
   ou remover, mas documentar a escolha.
2. Corrigir o arquivo de regras da raiz, linhas 113-116: substituir a
   afirmação por uma
   descrição do estado real, no formato "o `quality-gate` roda em todo
   PR e push; ele só bloqueia merge quando estiver listado em branch
   protection — rode `./scripts/setup-branch-protection.sh --show` para
   conferir". Após a proteção ser ligada pelo dono, a frase pode voltar
   à forma assertiva.
3. Reconciliar `docs/CONTEXTO.md` Seção 5 com o arquivo de regras da
   raiz: portar o parágrafo de gates para a fonte da verdade declarada,
   e alinhar o passo 5 da Regra Zero (`docs/CONTEXTO.md:288`) com o da
   raiz (que manda rodar `./scripts/smoke.sh`).
4. Ação do dono, **fora de commit**: rodar
   `./scripts/setup-branch-protection.sh` no GitHub com `gh`
   autenticado e permissão de admin. Isto é configuração de
   repositório, não muda arquivo nenhum na árvore; nenhum passo desta
   sprint pode fingir que um commit liga a proteção.
5. NÃO-objetivo: mexer em `.github/workflows/ci.yml` (o job já existe e
   já roda), ligar `enforce_admins`, exigir revisão de PR (projeto de
   dono único), ou tornar `e2e-web` required (ver AUDIT-P3-4).

## Trabalho de limpeza que esta sprint destrava

Nenhum imediato. Hoje `./scripts/smoke.sh` sai com exit 0 em `main`
(verificado), então marcar `quality-gate` como required **não** deixa o
CI vermelho neste momento. É justamente por isso que esta sprint deve
ir **antes** de AUDIT-P3-2 e AUDIT-P3-3: liga o dente com o gate ainda
no rigor atual, e as sprints seguintes aumentam o rigor com o dente já
instalado. A ordem inversa (endurecer o smoke primeiro) travaria os
próprios PRs de correção.

## Proof-of-work

```bash
# ANTES (estado atual, ja verificado)
gh api repos/:owner/:repo/branches/main/protection \
  --jq '.required_status_checks.contexts'          # ["scan-commits"]

# dry-run do script corrigido: confere que "Build APK Android" saiu
./scripts/setup-branch-protection.sh --dry-run     # contexts sem o build de APK

# DEPOIS (acao do dono, fora de commit)
./scripts/setup-branch-protection.sh
gh api repos/:owner/:repo/branches/main/protection \
  --jq '.required_status_checks.contexts'          # ["scan-commits","quality-gate"]

# prova de nao-regressao: o gate continua verde no estado atual
./scripts/smoke.sh                                 # exit 0

# prova documental: a afirmacao antiga nao sobrevive em nenhum dos dois docs
# (o arquivo de regras da raiz e resolvido pelo cabecalho que o declara copia)
REGRAS_RAIZ=$(grep -ln 'Cópia das regras do' ./*.md)
grep -n "nao mergeia\|não mergeia" "$REGRAS_RAIZ" docs/CONTEXTO.md   # 0 ocorrencias
```

Sem device, sem E2E, sem Gauntlet: a sprint não toca UI nem código de
app. Evidência = saída do `gh api` antes e depois, mais o diff dos dois
documentos.

## Commit

```
ci: audit-p3-1 corrige contexts do setup-branch-protection e alinha regras da raiz e contexto.md ao estado real do gate
```

## Resultado (executada 2026-09-05)

Aplicado via API do GitHub, com autorização explícita do dono nesta sessão.

**Antes:** `required_status_checks.contexts = ["scan-commits"]`.
**Depois:** `["scan-commits", "quality-gate", "coverage-floor"]`, `strict: true`.

`enforce_admins` mantido em `false` de propósito — push direto do dono é o
fluxo real deste repositório, e ligá-lo quebraria o modo de trabalho sem
ganho de segurança, já que o dono é o único com acesso de escrita.

### Por que `Build APK Android` saiu da lista

O `scripts/setup-branch-protection.sh` listava esse check como required. Aquele
workflow **nunca** dispara em `pull_request` — só em `workflow_dispatch` e em
push de tag `v*-alpha-*`. Required check que não roda no PR fica pendente para
sempre, e o botão de merge não libera nunca. Rodar o script como estava
travaria todos os merges do repositório, que é o oposto do que ele existe para
fazer. O script foi corrigido nesta sprint e agora reflete o estado aplicado.

### Por que `e2e-web` ficou de fora

Roda em `pull_request`, então tecnicamente seria elegível. Mas nasceu em
2026-09-05 (`AUDIT-P3-4`), ainda não foi exercitado num PR real e leva cerca de
20 minutos dependendo de Metro e Playwright. Promovê-lo sem medir a
estabilidade repetiria exatamente o erro do `Build APK Android` — só que por
flakiness em vez de gatilho. É o candidato natural depois de alguns PRs com
histórico verde.

### Verificação

```
$ gh api repos/:owner/:repo/branches/main/protection --jq '.required_status_checks.contexts'
["scan-commits","quality-gate","coverage-floor"]
```

Backup do estado anterior em `/tmp/protecao-antes.json` no momento da execução.
Para reverter: `gh api -X PUT repos/:owner/:repo/branches/main/protection` com
`contexts` de volta em `["scan-commits"]`.
