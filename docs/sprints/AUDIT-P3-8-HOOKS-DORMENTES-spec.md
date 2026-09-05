# AUDIT-P3-8-HOOKS-DORMENTES — fechar a assimetria de quality gate entre os dois builds e tornar o veredito de hooks visível

```
STATUS:     executada 2026-09-05 (materializada 2026-07-28, achado da
            auditoria de gates de qualidade). Escopos 1 e 4 já vinham
            resolvidos; escopos 2 e 3 fechados nesta sprint. O enunciado
            original caducou — ver a seção "Correção de rota".
PRIORIDADE: média
DEPENDE:    nenhuma
ORIGEM:     achado [P3-8] da auditoria de 2026-07-28.
DECISAO:    o veredito do doctor de hooks continua ADVISORY. Elevar
            visibilidade, não severidade — o CI não tem hooks locais e é lá
            que o smoke roda; o gate que obriga é server-side.
```

## Correção de rota (2026-09-05)

O enunciado original desta sprint **não se sustenta mais**, e o registro
disso vale mais que o texto que o substituiu. Verificado no clone antes de
executar:

| Item original | Estado real em 2026-09-05 |
|---|---|
| 1. "Rodar `install-hooks.sh`: o clone está DORMENTE" | **Falso.** `./scripts/doctor_hooks.sh` responde `Verdict: PROJETO ATIVO (OK)`; `core.hooksPath` resolve para `<repo>/hooks`. Nada a fazer. |
| 2. Quality gate ausente em `build-dev-client.yml` | **Confirmado.** Único defeito real. É o entregável desta sprint. |
| 3. Veredito do doctor se perde na saída do smoke | Mecanismo confirmado, dor atenuada. Entregue mesmo assim. |
| 4. "Documentar o passo de setup do clone" | **Já satisfeito.** `README.md:41` manda rodar `./install.sh`, e `install.sh:56-60` faz `git config core.hooksPath hooks`. Quem clona já ativa os hooks sem saber que existe `install-hooks.sh`. |

Duas afirmações do texto original também caducaram e foram removidas:

- **"Resultado líquido de enforcement de lint na cadeia inteira: zero."**
  Falso desde `aadcfd6` (AUDIT-P3-2). O ESLint no `scripts/smoke.sh` não
  tem mais `|| true`: hoje é `npx --no-install eslint app/ src/ || { echo
  "ERRO: lint falhou"; exit 1; }`, e é isso que o job `quality-gate` do CI
  executa. A citação `scripts/smoke.sh:41` do texto antigo já não existia.
- **A seção "Trabalho de limpeza que esta sprint destrava"**, que dimensionava
  8 arquivos com problema de lint e pedia ao dono sequenciar esta sprint
  contra AUDIT-P3-2/P3-3. As duas pousaram (`813fd2f`, `aadcfd6`), os hooks
  já estão ativos e `npx eslint app/ src/` sai 0. Não há atrito a sequenciar,
  e a seção foi apagada em vez de anotada.

## Problema (o que de fato restou)

Dos dois workflows de build, apenas um roda quality gate antes do Gradle.

`.github/workflows/build-android-apk.yml:79-82`:

```yaml
      - name: Quality gate (tsc + jest)
        run: |
          npx --no-install tsc --noEmit
          npm test --silent
```

`.github/workflows/build-dev-client.yml` **não tinha esse step**. A sequência
ia de `Install npm deps` direto para `Provision env.json`, depois
`Expo prebuild Android` e `Gradle assembleDebug`. Nenhum `tsc`, nenhum
`npm test` em lugar nenhum do arquivo — intocado desde `ff45c80`.

Cenário concreto: o dev-client é a ferramenta canônica de validação no
device (protocolo durável — dev-client mais Metro via USB é o método padrão,
e o APK release só no fim). Era possível disparar `build-dev-client.yml` de
um commit com `tsc` vermelho, esperar até 90 minutos de build, instalar no
aparelho e só então descobrir o erro de tipo. Nada indica que a assimetria
fosse intencional: os dois workflows se declaram espelhos
(`build-dev-client.yml:2` diz "espelha build-android-apk.yml"), e o step de
quality gate entrou apenas no de release, na sprint R-AUDIT-CI-GATES.

Em paralelo, o veredito do `doctor_hooks.sh` era impresso uma vez, no início
do smoke, no meio de saída extensa. Quem lê o smoke não notava um clone com
hooks dormentes.

## Entregue

1. **`.github/workflows/build-dev-client.yml`** — step `Quality gate (tsc +
   jest)` inserido entre `Install npm deps` e `Provision env.json`, idêntico
   ao de `build-android-apk.yml`. Sem o `if:` de cache do step de install: o
   gate tem de rodar sempre, e `node_modules` já está presente pelo cache ou
   pelo install.

   O gate roda **antes** do `Provision env.json` de propósito. É seguro
   porque `jest.config.js:76` mapeia `(\.\./)+env\.json$` para
   `tests/__fixtures__/env.mock.json`, e porque `src/types/env.d.ts:14`
   declara `module '*/env.json'` — é essa declaração, não o arquivo, que
   sustenta o `tsc` com `env.json` ausente no runner. Não inverter a ordem
   nem remover nenhum dos dois sem entender o acoplamento.

2. **`scripts/smoke.sh`** — a saída do doctor passa a ser capturada uma única
   vez na chamada que já existia, e a linha do veredito é reemitida logo
   antes do `OK: smoke test passou`. O doctor não é reexecutado (duplicaria
   ~15 linhas e o custo). Toda captura tem guarda contra o `set -euo
   pipefail` da linha 5 — `grep`/`sed` sem match sai 1 e abortaria o smoke
   inteiro, transformando um aviso em falso vermelho no CI. Nenhum `exit 1`
   novo.

3. **`docs/CONTEXTO.md`** — o parágrafo "Hooks locais — dormentes por padrão"
   apontava para esta sprint como ação pendente e descrevia o estado errado.
   Reescrito: os hooks são ativados pelo `./install.sh` do setup canônico, o
   caso dormente é a exceção, e o veredito agora aparece no fim do smoke.

## Não-objetivos (mantidos)

- Mexer no ESLint de `scripts/smoke.sh` (é AUDIT-P3-2, já entregue).
- Alterar `hooks/pre-commit` ou `hooks/pre-push`, que estão corretos.
- Editar o hook global do usuário — ambiente pessoal, fora do repositório.
- Marcar qualquer check como required (é AUDIT-P3-1, depende do dono).
- Tornar o `doctor_hooks.sh` bloqueante.
- Tocar código de app (`src/`, `app/`, `modules/`). Sem device, sem E2E, sem
  Gauntlet.
- Zerar os 17 warnings de lint. Não bloqueiam nada hoje.

`HOW_TO_RESUME.md` saiu do escopo: é **gitignored** (`.gitignore:89`), não
chega a quem clona, e escrever o passo de setup lá anularia o próprio
objetivo do item 4. O alvo versionado correto já estava coberto pelo
`README.md`; o que faltava era o `docs/CONTEXTO.md`.

## Proof-of-work

```bash
# ANTES
./scripts/doctor_hooks.sh | grep Verdict     # Verdict: PROJETO ATIVO (OK)
grep -n "Quality gate" .github/workflows/build-dev-client.yml ; echo $?   # 1
grep -n "Quality gate" .github/workflows/build-android-apk.yml            # 79
npx --no-install tsc --noEmit ; echo $?      # 0
npx --no-install eslint app/ src/ ; echo $?  # 0 (17 warnings, 0 errors)

# DEPOIS
grep -n "Quality gate" .github/workflows/build-dev-client.yml   # step presente
python3 -c "import yaml;yaml.safe_load(open('.github/workflows/build-dev-client.yml'))"
diff <(sed -n '/Quality gate/,+3p' .github/workflows/build-dev-client.yml) \
     <(sed -n '/Quality gate/,+3p' .github/workflows/build-android-apk.yml)  # vazio
bash -n scripts/smoke.sh
./scripts/smoke.sh                           # exit 0, veredito antes do OK
npx tsc --noEmit                             # exit 0
```

Prova de que a mudança do smoke é advisory: **não** basta forçar o doctor a
sair != 0 (ele sai 0 por construção, o veredito é string) nem rodar numa
worktree (`core.hooksPath` é config `--local`, por repositório; worktrees
ligadas herdam `PROJETO ATIVO`). O único jeito é um clone novo ou desfazer
temporariamente a config local — foi o caminho usado.

**Pendente de ação do dono, não bloqueia merge:** disparar
`build-dev-client.yml` por `workflow_dispatch` e confirmar que o step
`Quality gate (tsc + jest)` roda e passa antes do `Expo prebuild Android`.
O workflow só dispara por `workflow_dispatch` ou tag `devclient-*`, então
só esse run prova o item 1 em CI real.

## Achado separado (fora do escopo, para o dono)

`HOW_TO_RESUME.md:397` e `:403` documentam um `hooks/post-checkout` que
**não existe** — `ls -1 hooks/` devolve apenas `pre-commit` e `pre-push`. Não
foi criado nem corrigido aqui: o arquivo é local e o hook não é entregável
desta sprint.

## Commit

```
ci: audit-p3-8 quality gate no build do dev-client e veredito de hooks visivel no smoke
```
