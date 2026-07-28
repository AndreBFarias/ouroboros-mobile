# AUDIT-P3-4-E2E-NO-CI — ligar a suíte E2E de browser no CI em duas velocidades

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: alta (113 casos E2E obrigatórios por regra, zero executados
            automaticamente; ~35 falhas reais em aberto e invisíveis)
DEPENDE:    nenhuma no código; a sub-sprint R-CI-E2E-WEB-b já está especificada
            e não entregue — esta sprint a retoma com escopo revisado
ORIGEM:     achado [P3-4] da auditoria de 2026-07-28. Partiu de um grep por
            "e2e|playwright" em `.github/workflows/` que não retorna nada,
            cruzado com a contagem de arquivos de caso e com a mensagem literal
            do commit de merge que registra o baseline vermelho.
```

## Problema (ativo de teste caro, obrigatório por regra, e inerte)

O arquivo de regras da raiz declara, na seção "Regra de Validação Visual
— Gauntlet OBRIGATÓRIO", que toda sprint que toca UI **deve** entregar um caso E2E
em `tests/e2e/playwright/`, e que o validador **recusa** sprint sem
ele. A regra foi obedecida: existem 113 casos.

```
$ ls tests/e2e/playwright/*.e2e.ts | wc -l
113

$ ls tests/e2e/playwright/ | grep -v '\.e2e\.ts$'
e2e-template.ts

$ grep -rniE "e2e|playwright" .github/workflows/
(sem resultado; grep exit=1)

$ ls .github/workflows/
anonymity-check.yml
build-android-apk.yml
build-dev-client.yml
ci.yml
```

Nenhum dos quatro workflows invoca a suíte. O runner existe e funciona
(`scripts/e2e-web.sh`, `package.json:15` → `"test:e2e:web"`), mas só
roda quando alguém digita o comando.

O baseline registrado em git é vermelho. Mensagem literal do commit de
merge:

```
$ git log --format='%s' -1 2eb01a6
merge: r-ci-e2e-web harness playwright real + apis de mock no gauntlet - baseline 109 casos (58 pass, 38 fail preexistentes, 13 inconclusivos)
```

E `tests/e2e/harness/e2e-exceptions.json` excepciona apenas **3**
arquivos (`m35-financas-empty.e2e.ts`,
`r-home-4d-relembrando.e2e.ts`, `r-int-4-youtube-picker.e2e.ts`), com
o próprio documento admitindo que a triagem do resto ficou fora de
escopo:

```
"O baseline completo do primeiro run (58 PASS / 38 FAIL-real / 13
INCONCLUSIVO em 109) alimenta a triagem futura dos demais FAIL
pre-existentes (fora do escopo desta entrega)."
```

38 falhas menos 3 excepcionadas = **~35 falhas reais em aberto**, das
quais o projeto não tem visibilidade nenhuma porque nada as executa.
Isso produz uma profecia autorrealizável: ninguém roda a suíte porque
ela está vermelha; ela continua vermelha porque ninguém roda.

O rastro do que faltava está no comentário do próprio config,
`tests/e2e/harness/playwright.config.ts:25`:

```
// do harness. Facilita o upload-artifact do CI (sub-sprint b) e mantem
```

Artefatos foram deliberadamente posicionados na raiz do repositório
para o upload do CI. Esse upload nunca foi escrito.

Cenário de falha concreto: uma sprint quebra a navegação do
`MenuLateral`. 20 dos 113 casos passariam a falhar. O PR mergeia
verde, porque o `quality-gate` não sabe da existência da suíte, e a
regressão só aparece quando alguém abrir o app no device.

### O que já existe e é aproveitável

A branch local `r-ci-e2e-web` **não tem trabalho pendente**:

```
$ git rev-list --left-right --count main...r-ci-e2e-web
16	0
```

Zero commits à frente de `main` — tudo dela já está mergeado (a branch
é apenas um ref velho, 16 commits atrás). Não há código a recuperar
lá.

O que existe de aproveitável é **especificação**, não código:
`docs/sprints/R-CI-E2E-WEB-spec.md:239-320` contém a sub-sprint
`R-CI-E2E-WEB-b` inteira e detalhada — acceptance criteria, plano de
implementação, invariantes (`NODE_OPTIONS=--max-old-space-size=4096`
obrigatório por causa de OOM real no bundle Metro,
`EXPO_PUBLIC_GAUNTLET=1`, `permissions: contents: read`, workflow
isolado para não arriscar o `quality-gate`). Aquele texto continua
válido e deve ser seguido, com uma revisão de escopo (abaixo).

## Escopo (mínimo)

O escopo de `R-CI-E2E-WEB-b` como escrito manda rodar a suíte inteira
em todo PR e push. Isso não é viável no custo atual (ver
§Dimensionamento). Esta sprint o revisa para **duas velocidades**:

1. **Subconjunto smoke em PR.** Criar
   `tests/e2e/harness/e2e-smoke.json` — lista explícita de nomes de
   arquivo que compõem o conjunto rápido. O título de cada teste do
   runner é o nome do arquivo (`e2e-runner.spec.ts:61-62`,
   `test(arquivo, ...)`), então o filtro sai de graça via
   `--grep` do playwright, sem tocar o runner. Composição inicial
   sugerida: as duas sentinelas (`00-bootstrap.e2e.ts`,
   `00-harness-sentinel.e2e.ts`) mais os casos `m-save-*.e2e.ts`
   (persistência, o invariante mais caro de quebrar) — alvo de tempo:
   suíte smoke completa em menos de 10 minutos incluindo o bundle.
   Todos os escolhidos precisam estar **verdes** antes de entrar na
   lista; um caso vermelho no smoke reintroduz o problema atual.
2. **Workflow `.github/workflows/e2e-web.yml`**, seguindo
   `R-CI-E2E-WEB-spec.md:250-296`: dispara em `pull_request` para
   `main` rodando apenas o subconjunto smoke, e em `schedule` (cron
   noturno) rodando a suíte completa. `workflow_dispatch` para execução
   manual sob demanda. `concurrency` com cancel-in-progress,
   `permissions: contents: read`, `timeout-minutes` folgado no job
   noturno.
3. **Artefatos**: `actions/upload-artifact@v4` com `if: always()` para
   `test-results/**` e o relatório do playwright — é o que o comentário
   de `playwright.config.ts:25` já preparou e nunca foi consumido.
4. **Registrar o baseline por caso.** Versionar a saída do run noturno
   num arquivo de baseline (nome de arquivo → status), para que uma
   degradação de PASS para INCONCLUSIVO seja detectável. Hoje não é: o
   status `INCONCLUSIVO` é warn-only por decisão documentada em
   `e2e-runner.spec.ts:12-15`, e sem baseline um caso que degradou é
   indistinguível de um que sempre foi inconclusivo.
5. NÃO-objetivo: corrigir os ~35 casos vermelhos (é a sprint de
   triagem, item seguinte na sequência); marcar `e2e-web` como required
   check (ação do dono, e só depois do primeiro run verde — ver
   AUDIT-P3-1); tocar `.github/workflows/ci.yml`; editar
   `scripts/setup-branch-protection.sh`.

## Dimensionamento e por que não a suíte inteira em PR

Números do config atual (`tests/e2e/harness/playwright.config.ts:32-34`):

```
timeout: 90_000     // 90 s por caso
retries: 1          // um retry por caso que falha
workers: 1          // sem paralelismo; todos compartilham o mesmo Metro
```

Pior caso aritmético: 113 casos x 90 s x 2 tentativas = 20.340 s, mais
de **5 h**, antes de contar o bundle web inicial (que o script já
espera até 90 s, `scripts/e2e-web.sh:30`). Mesmo o caso médio, com a
maioria dos casos resolvendo em poucos segundos, coloca a suíte
completa na faixa de dezenas de minutos — inaceitável no caminho
crítico de um PR, aceitável de sobra num cron noturno.

O paralelismo não é a saída fácil: `workers: 1` é decisão documentada
no config porque todos os casos compartilham um único Metro e um único
estado de Gauntlet. Subir workers exigiria isolamento de estado por
worker — sprint própria, não pré-requisito desta.

## Trabalho de limpeza que esta sprint destrava

Esta sprint **não** deixa o CI vermelho se o passo 1 for respeitado (só
casos verdes entram no smoke). Ela torna visível, no run noturno, um
volume de trabalho que hoje está escondido:

- **~35 casos FAIL reais** sem exceção registrada. Cada um precisa de
  triagem individual: regressão de verdade, seletor obsoleto,
  limitação de ambiente web que merece entrar em `e2e-exceptions.json`,
  ou caso mal escrito. Esta é a maior fila que a sprint destrava e
  merece sprint(s) própria(s) por lote.
- **13 casos INCONCLUSIVO** no baseline, num universo de 47 arquivos
  que contêm esse status. É warn-only por decisão consciente, mas com
  o baseline do passo 4 passa a ser mensurável — e alguns podem ser
  promovidos a asserção real.
- **Ao menos 1 caso sem nenhum `expect()`**:
  `tests/e2e/playwright/r-int-4-youtube-picker.e2e.ts` clica no CTA,
  observa que o ramo conectado não apareceu, atribui ao ambiente e
  retorna `INCONCLUSIVO` em vez de falhar. É o padrão mais perigoso da
  suíte — um teste que absorve o defeito que deveria denunciar. Vale um
  passe de auditoria sobre os 47 arquivos com `INCONCLUSIVO` procurando
  o mesmo padrão.
- **12 sprints com pasta `*-screenshots-gauntlet` e sem E2E
  localizável** (2 delas com justificativa transparente registrada no
  próprio diretório). Fila menor, mas é a regra de validação visual do
  projeto sendo descumprida em silêncio.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
grep -rniE "e2e|playwright" .github/workflows/ ; echo "exit=$?"   # sem saida, exit=1
ls tests/e2e/playwright/*.e2e.ts | wc -l                          # 113
git rev-list --left-right --count main...r-ci-e2e-web             # 16  0 (branch nao tem nada novo)

# DEPOIS - local, antes de abrir PR
scripts/e2e-web.sh --grep "00-bootstrap|00-harness-sentinel"      # sentinelas verdes
scripts/e2e-web.sh --grep "$(python3 -c "
import json;print('|'.join(json.load(open('tests/e2e/harness/e2e-smoke.json'))['casos']))")"
                                                                   # subconjunto smoke: 100% PASS

# DEPOIS - no Actions
#  - run de e2e-web.yml em PR: descobre N casos (N = tamanho do smoke),
#    todos PASS, artifacts publicados, tempo total < 10 min
#  - run noturno (workflow_dispatch para antecipar): descobre 113 casos,
#    sumario com contagem PASS/FAIL/INCONCLUSIVO, artifacts publicados
#  - ci.yml / quality-gate continua verde no mesmo PR (nao-regressao)

./scripts/smoke.sh                                                 # exit 0
```

Sem device. Sem caso E2E novo: esta sprint constrói a infraestrutura
que executa os casos existentes, não adiciona comportamento de app. A
evidência é o link do run no Actions com os artefatos anexados.

## Commit

```
ci: audit-p3-4 workflow e2e-web com subconjunto smoke em pr e suite completa noturna
```
