# AUDIT-P3-2-SMOKE-ESLINT-BLOQUEIA — fazer o smoke reprovar quando o ESLint reprova

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: alta (o único gate server-side não consegue ficar vermelho por lint)
DEPENDE:    AUDIT-P3-3 (o erro de lint que existe hoje em main é causado pelo
            plugin ausente; sem P3-3 esta sprint nasce derrubando o CI)
ORIGEM:     achado [P3-2] da auditoria de 2026-07-28. Leitura linha a linha de
            `scripts/smoke.sh` comparando os três checks de código: tsc e jest
            abortam com `exit 1`, o ESLint tem `2>/dev/null || true`. Confirmado
            empiricamente rodando `npx eslint app/ src/` no mesmo working tree
            em que `./scripts/smoke.sh` sai com exit 0.
```

## Problema (amortecedor duplo no único gate que obriga)

`scripts/smoke.sh` roda três checks de código em sequência. Dois
abortam o script, um não:

```bash
# scripts/smoke.sh:37
  npx --no-install tsc --noEmit || { echo "ERRO: typecheck falhou"; exit 1; }

# scripts/smoke.sh:39-42
  echo ">> lint"
  if [[ -d src || -d app ]]; then
    npx --no-install eslint app/ src/ 2>/dev/null || true
  fi

# scripts/smoke.sh:46
    npm test --silent || { echo "ERRO: testes falharam"; exit 1; }
```

A linha 41 tem **dois** amortecedores independentes para a mesma coisa:
`2>/dev/null` descarta o stderr (o operador nunca vê a saída do ESLint
no log do smoke) e `|| true` descarta o exit code (o script nunca
aborta). Basta um dos dois para neutralizar o check; existem os dois.

A origem é visível no cabeçalho do próprio script, `smoke.sh:2-3`:

```bash
# Smoke test: anonimato + dados de teste + (quando existir) typecheck +
# lint + tests. Roda no pre-push e no CI.
```

"quando existir" — a linha nasceu defensiva, numa fase em que o ESLint
ainda não estava configurado, e nunca foi endurecida depois que
`eslint.config.js` passou a existir.

Cenário de falha concreto, já materializado em `main`: o `smoke.sh` é
exatamente o que o job `quality-gate` de `.github/workflows/ci.yml:47-48`
executa. Logo, **nenhum erro de ESLint jamais reprova um PR**. Hoje já
existe um erro real convivendo com CI verde:

```
$ npx eslint app/ src/ > /tmp/lint.txt 2>&1; echo "LINT_EXIT=$?"
LINT_EXIT=1

$ grep -n "error" /tmp/lint.txt
15:  121:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found  react-hooks/exhaustive-deps
46:x 23 problems (1 error, 22 warnings)
47:  0 errors and 11 warnings potentially fixable with the --fix option.
```

No mesmo working tree, `./scripts/smoke.sh` sai com exit 0. E o efeito
não é só sobre o erro que existe hoje: **qualquer regra futura que
alguém adicione ao `eslint.config.js` nasce decorativa**, porque o
único caminho em que ela seria consultada de forma obrigatória já
descarta o resultado.

## Tamanho do buraco a fechar (medido em 2026-07-28, `main` @ `b5bf2db`)

```
23 problems: 1 error, 22 warnings
11 dos 22 warnings sao auto-corrigiveis com --fix
```

Distribuição dos 23:

| Classe | Qtd | Onde | Custo de correção |
|---|---|---|---|
| `Definition for rule ... was not found` | 1 (erro) | `src/components/screens/RecapScreen.tsx:121` | zero nesta sprint — é AUDIT-P3-3 que resolve |
| `Unused eslint-disable directive` | 11 | `driveBackup.ts` (6), `driveResumo.ts` (2), `autopullBackgroundTask.ts` (2), `devLog.ts` (1) | `npx eslint --fix`, mecânico |
| `is defined but never used` / `is assigned a value but never used` | 11 | `app/todo.tsx` (6 símbolos de uma feature desplugada), `alarmesNotificacoes.ts:30`, `calcular.ts:282,285`, e demais | triagem manual: parte é código morto real, não deletar sem decidir |

Os 6 símbolos não usados em `app/todo.tsx:55,68,70,71,72,73`
(`silenciarSugestaoTarefa`, `SugestaoAlarmeTarefa`,
`calcularSilenciarAte`, `calcularSugestaoAlarme`, `estaSilenciado`,
`normalizarTituloFamilia`) formam um conjunto coerente — parecem uma
feature de sugestão de alarme implementada na camada de lógica e nunca
plugada, ou desplugada depois. Conforme o GUIDE, código morto se
**menciona**, não se deleta por conta própria: essa decisão é do dono e
fica fora do escopo desta sprint.

## Escopo (mínimo)

1. Zerar o erro e os warnings de `app/` e `src/` até o ESLint sair com
   exit 0. Ordem sugerida: (a) AUDIT-P3-3 mergeada elimina o erro
   único; (b) `npx eslint app/ src/ --fix` resolve os 11 `Unused
   eslint-disable directive`; (c) os 11 restantes de variável não usada
   entram em triagem manual — prefixo `_` onde o argumento é
   intencionalmente ignorado, e para os 6 de `app/todo.tsx` levar a
   decisão ao dono (religar a feature ou remover), sem deletar
   unilateralmente.
2. Trocar `scripts/smoke.sh:41` para o mesmo padrão das linhas vizinhas:
   `npx --no-install eslint app/ src/ || { echo "ERRO: lint falhou"; exit 1; }`.
   Remover o `2>/dev/null` junto — descartar o stderr esconde
   justamente a lista de arquivos que o operador precisa para corrigir.
3. Atualizar o comentário de cabeçalho `smoke.sh:2-3`, que ainda diz
   "(quando existir) typecheck + lint", para refletir que os três
   checks são bloqueantes.
4. NÃO-objetivo: adicionar regras novas ao `eslint.config.js` (é
   AUDIT-P3-3), mexer no `hooks/pre-commit` (é AUDIT-P3-8), tocar
   `test_contract_drift.sh` ou `check_roadmap_fantasmas.py` (é
   AUDIT-P3-5), deletar o código morto de `app/todo.tsx`.

## Trabalho de limpeza que esta sprint destrava

Este é o item que **torna o CI vermelho ao ser executado**, e é o
objetivo. Dimensionamento honesto para o dono sequenciar:

- **Bloqueio duro**: 1 erro. Só desaparece com AUDIT-P3-3 mergeada.
  Sem ela, o passo 2 desta sprint derruba `main` no primeiro push.
- **Trabalho mecânico**: 11 warnings, resolvidos por `--fix` em um
  comando.
- **Trabalho de julgamento**: 11 warnings de símbolo não usado, dos
  quais 6 exigem decisão de produto sobre uma feature inteira
  (`app/todo.tsx`).
- **Custo recorrente depois**: baixo. Com o gate ligado, cada PR
  carrega o próprio lint; a dívida não volta a acumular.

Se AUDIT-P3-3 for executada primeiro e revelar um volume grande de
avisos novos de `react-hooks` (a projeção dela estima esse cenário),
o passo 2 desta sprint deve esperar a estratégia de adoção daquela
sprint estabilizar — caso contrário o gate fica impossível de
satisfazer e alguém vai reintroduzir o `|| true`.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
npx eslint app/ src/; echo "LINT_EXIT=$?"     # 23 problems (1 error, 22 warnings), LINT_EXIT=1
./scripts/smoke.sh; echo "SMOKE_EXIT=$?"      # SMOKE_EXIT=0   <- a contradicao

# DEPOIS
npx eslint app/ src/; echo "LINT_EXIT=$?"     # 0 problems, LINT_EXIT=0
./scripts/smoke.sh; echo "SMOKE_EXIT=$?"      # SMOKE_EXIT=0

# prova de que o gate agora tem dente: introduzir um erro sintetico e
# confirmar que o smoke aborta, depois reverter
#   (ex.: adicionar `const naoUsado = 1;` num arquivo de src/ com a
#   regra elevada a error, rodar o smoke, confirmar exit != 0, git checkout)

npx tsc --noEmit                              # exit 0 (nao-regressao)
npm test                                      # 356 suites, 3351 passed (nao-regressao)
```

Sem device, sem E2E, sem Gauntlet: a sprint não toca UI. As correções
de warning são remoções de import e diretiva inerte; qualquer mudança
que altere comportamento visível está fora do escopo declarado.

## Commit

```
ci: audit-p3-2 smoke aborta quando eslint reprova e zera os 23 problemas de app e src
```
