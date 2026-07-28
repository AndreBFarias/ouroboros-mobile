# AUDIT-P3-8-HOOKS-DORMENTES — acordar os hooks locais e fechar a assimetria de quality gate entre os dois builds

```
STATUS:     materializada 2026-07-28 (achado da auditoria de gates de qualidade)
PRIORIDADE: média (o enforcement líquido de lint na cadeia inteira é zero, mas o
            caminho server-side existe e é o que de fato obriga)
DEPENDE:    nenhuma
ORIGEM:     achado [P3-8] da auditoria de 2026-07-28. O `doctor_hooks.sh` roda
            dentro do próprio smoke e emite o veredito DORMENTE em toda execução,
            atrás de um `|| true`. A varredura de gates confrontou esse veredito
            com o `|| true` do ESLint no smoke e fechou o círculo: o único ponto
            de bloqueio real de lint está desligado.
```

## Problema (a ironia estrutural: onde bloqueia está desligado, onde roda não bloqueia)

Diagnóstico literal, executado em 2026-07-28:

```
$ ./scripts/doctor_hooks.sh
== doctor de hooks (R-AUDIT-CI-GATES) ==
  repo:            <REPO_ROOT>
  core.hooksPath:  <HOME>/.config/git/hooks
  resolve para:    <HOME>/.config/git/hooks

  Verdict: DORMENTE (aviso)
  O core.hooksPath NAO resolve para <REPO_ROOT>/hooks e o hook global
  efetivo nao delega para este repo. Logo, os checks do PROJETO
  (anonimato, PT-BR, test-data, gitleaks, eslint staged) NAO rodam
  localmente no commit/push deste clone.

  Remediacao (qualquer uma resolve):
    (a) ./scripts/install-hooks.sh
        Passa a rodar os hooks do projeto, que agora ENCADEIAM o
        hook global de identidade quando presente (rodam OS DOIS).
    (b) Adicionar uma stanza de delegacao para este repo
        (<REPO_ROOT>) no hook global de identidade.

  Nota: independentemente da remediacao local, o gate que OBRIGA e'
  server-side (.github/workflows/ci.yml roda ./scripts/smoke.sh em
  todo PR e push pra main).

doctor_hooks: diagnostico concluido (advisory).
EXIT=0
```

O `core.hooksPath` deste clone aponta para o hook global do usuário, que
não delega para o repositório. Cinco checks do projeto — anonimato,
PT-BR, dados de teste, gitleaks e ESLint nos arquivos staged — não
rodam no commit local.

**A ironia a registrar:** o único ponto de toda a cadeia onde o ESLint
de fato **bloqueia** é `hooks/pre-commit:46`:

```bash
    npx --no-install eslint $STAGED || { echo "ERRO: eslint falhou nos arquivos staged"; exit 1; }
```

Padrão correto, `exit 1` explícito — e está desligado neste clone. Do
outro lado, onde o ESLint efetivamente **roda** em toda a árvore
(`scripts/smoke.sh:41`, dentro do job `quality-gate` do CI), o
resultado é descartado:

```bash
    npx --no-install eslint app/ src/ 2>/dev/null || true
```

O bloqueio existe onde não roda, e roda onde não bloqueia. **Resultado
líquido de enforcement de lint na cadeia inteira: zero.** É por isso
que `main` carrega um erro de lint com CI verde.

Fecha o círculo o fato de o próprio diagnóstico ser advisory:
`scripts/smoke.sh:15` chama `./scripts/doctor_hooks.sh || true`, e o
script termina com `EXIT=0` por construção. O aviso DORMENTE é impresso
em toda execução do smoke, no meio de saída extensa, e nunca reprova
nada.

### Assimetria menor, no mesmo tema

Dos dois workflows de build, apenas um roda quality gate antes do
Gradle.

`.github/workflows/build-android-apk.yml:79-82`:

```yaml
      - name: Quality gate (tsc + jest)
        run: |
          npx --no-install tsc --noEmit
          npm test --silent
```

`.github/workflows/build-dev-client.yml` **não tem esse step**. A
sequência dele vai de `Install npm deps` (`:66`) direto para
`Provision env.json` (`:70`) e depois `Expo prebuild Android` (`:92`) e
`Gradle assembleDebug` (`:142`). Nenhum `tsc`, nenhum `npm test` em
lugar nenhum do arquivo.

Cenário concreto: o dev-client é a ferramenta canônica de validação no
device (protocolo durável do arquivo de regras da raiz — dev-client mais Metro via
USB é o método padrão, e o APK release só no fim). Hoje é possível
disparar `build-dev-client.yml` de um commit com `tsc` vermelho,
esperar 90 minutos de build, instalar no aparelho e só então descobrir
o erro de tipo. Nada indica que a assimetria seja intencional: os dois
workflows são espelhos declarados um do outro
(`build-dev-client.yml:2` diz "espelha build-android-apk.yml"), e o
step de quality gate entrou apenas no de release, na sprint
R-AUDIT-CI-GATES.

## Escopo (mínimo)

1. **Rodar `./scripts/install-hooks.sh` neste clone.** É configuração
   local de git (`core.hooksPath` no escopo `--local`), não commit —
   nenhum arquivo da árvore muda. O script é idempotente e os hooks do
   projeto já encadeiam o hook global de identidade quando presente
   (`install-hooks.sh:8-14`), então nada se perde. Confirmar com
   `./scripts/doctor_hooks.sh` até o veredito deixar de ser DORMENTE.
2. **Adicionar o step de quality gate a
   `.github/workflows/build-dev-client.yml`**, idêntico ao de
   `build-android-apk.yml:79-82`, posicionado depois de
   `Install npm deps` e antes de `Provision env.json`. Fail-fast: sem
   sentido gastar 90 minutos de Gradle sobre um commit que não
   compila.
3. **Tornar o veredito DORMENTE visível sem torná-lo bloqueante.** O
   `doctor_hooks.sh` roda no smoke atrás de `|| true` e o aviso se
   perde na saída. Elevar a visibilidade — por exemplo, reemitir o
   veredito como última linha antes do `OK: smoke test passou` — sem
   mudar a natureza advisory. Bloquear seria errado: o CI não tem
   hooks locais e o smoke roda lá; o gate que obriga é e continua sendo
   o server-side.
4. **Documentar o passo de setup do clone.** O arquivo de regras da raiz
   já explica a condição, mas não a coloca no fluxo de quem clona pela
   primeira vez.
   Adicionar `./scripts/install-hooks.sh` ao `HOW_TO_RESUME.md` (ou ao
   README de setup, o que existir) como passo explícito, com o
   `doctor_hooks.sh` como verificação.
5. NÃO-objetivo: mexer no `|| true` do ESLint em `scripts/smoke.sh` (é
   AUDIT-P3-2, e ordená-lo depois desta sprint importa — ver abaixo);
   alterar `hooks/pre-commit` ou `hooks/pre-push`, que estão corretos;
   editar o hook global do usuário, que é ambiente pessoal e fora do
   repositório; marcar qualquer check como required (é AUDIT-P3-1).

## Trabalho de limpeza que esta sprint destrava

Esta sprint **torna o commit local vermelho antes de tornar o CI
vermelho** — e essa ordem é o ponto.

Com os hooks acordados, `hooks/pre-commit:46` passa a rodar o ESLint
sobre os arquivos staged de cada commit. Enquanto os 23 problemas
medidos em `main` não forem zerados (ver AUDIT-P3-2, que dimensiona: 1
erro, 22 warnings, 11 auto-corrigíveis), **qualquer commit que toque um
dos arquivos afetados será bloqueado localmente**. Os arquivos com
problema hoje são `src/components/screens/RecapScreen.tsx`,
`app/todo.tsx`, `src/lib/integracoes/google/driveBackup.ts`,
`driveResumo.ts`, `src/lib/health/autopullBackgroundTask.ts`,
`src/lib/util/devLog.ts`, `src/lib/services/alarmesNotificacoes.ts` e
`src/lib/stats/calcular.ts`.

Duas consequências práticas para o dono sequenciar:

- Se o objetivo é sentir o atrito e limpar, ligar os hooks **antes** de
  AUDIT-P3-2 é o caminho: o bloqueio aparece só nos arquivos tocados,
  de forma incremental, em vez de um CI vermelho de uma vez.
- Se há trabalho urgente nesses 8 arquivos, ligar os hooks vai
  interromper esse trabalho. Nesse caso, mergear AUDIT-P3-3 e
  AUDIT-P3-2 primeiro, e esta sprint depois.

O passo 2 (quality gate no dev-client) não destrava fila nenhuma: `tsc`
e jest estão verdes hoje, então o step nasce passando.

## Proof-of-work

```bash
# ANTES (verificado em 2026-07-28)
./scripts/doctor_hooks.sh | grep Verdict          # Verdict: DORMENTE (aviso)
grep -n "Quality gate" .github/workflows/build-dev-client.yml ; echo "exit=$?"   # exit=1
grep -n "Quality gate" .github/workflows/build-android-apk.yml                   # 79: Quality gate (tsc + jest)

# DEPOIS - hooks (acao local, fora de commit)
./scripts/install-hooks.sh
./scripts/doctor_hooks.sh | grep Verdict          # deixa de ser DORMENTE

# prova de que o hook bloqueia de fato: staged com erro de lint sintetico
# nao commita; reverter em seguida
#   (ex.: adicionar uma diretiva eslint-disable inutil num arquivo de src/,
#    git add, git commit -> ERRO: eslint falhou nos arquivos staged)

# DEPOIS - workflow
grep -n "Quality gate" .github/workflows/build-dev-client.yml   # step presente
#   run de build-dev-client.yml (workflow_dispatch): o step de quality
#   gate aparece antes do prebuild e passa

./scripts/smoke.sh                                # exit 0; veredito de hooks visivel no fim
npx tsc --noEmit                                  # exit 0
npm test                                          # 356 suites, 3351 passed
```

Sem device, sem E2E, sem Gauntlet: a sprint toca um workflow de CI, um
script de diagnóstico e documentação de setup. Nenhum código de app.

## Commit

```
ci: audit-p3-8 quality gate no build do dev-client e veredito de hooks visivel no smoke
```
