# AUDIT-P3-9-TEMPLATE-E2E-INEXISTENTE — a regra de E2E aponta para um arquivo que não existe

```
STATUS:     executada 2026-09-05 (materializada 2026-07-28, achado da
            auditoria de 2026-07-28). Escopo 1 já vinha resolvido pelo
            commit 52b69b1; escopo 2 fechado na árvore versionada nesta
            sprint; escopo 3 inaplicável. Ver a seção Execução.
PRIORIDADE: média (regra de processo mais citada do projeto aponta para o vazio;
            explica parte da erosão da cobertura E2E)
DEPENDE:    nenhuma
ORIGEM:     achado colateral da materialização de AUDIT-P1-1A. Ao montar o
            Proof-of-work do caso E2E, a varredura procurou o template que o
            arquivo de regras da raiz manda copiar e descobriu que nem o
            arquivo nem o
            diretório existem. Confirmado por `ls` direto nos dois caminhos.
```

## Problema (a regra manda copiar de um arquivo inexistente)

O arquivo de regras da raiz (cópia das Regras Invioláveis do `docs/CONTEXTO.md` §5) define
o que toda sprint que toca UI deve entregar. O item 2 da lista diz, na linha 250:

```
2. **1 caso E2E em `tests/e2e/playwright/m<NN>-*.e2e.ts`** copiado
   do template `docs/templates/e2e-template.e2e.ts`, com asserts
   sobre comportamento (não só presença visual).
```

O caminho citado não existe — e nem o diretório que o conteria:

```bash
$ ls docs/templates/e2e-template.e2e.ts
ls: cannot access 'docs/templates/e2e-template.e2e.ts': No such file or directory
$ ls docs/templates/
ls: cannot access 'docs/templates/': No such file or directory
```

O template real está em outro lugar, com outra extensão:

```bash
$ ls tests/e2e/playwright/e2e-template.ts
tests/e2e/playwright/e2e-template.ts
```

O efeito não é cosmético. Esta é a regra mais citada do processo: o arquivo de
regras da raiz afirma logo abaixo que "Validador-sprint **recusa** sprints novas sem caso E2E
correspondente". Quem segue a instrução ao pé da letra encontra um caminho morto
e resolve por conta própria — o que produz casos E2E sem forma comum. É
consistente com dois achados vizinhos da mesma auditoria: 113 arquivos E2E que
nenhum workflow executa (AUDIT-P3-4) e ao menos um caso sem nenhum `expect()`,
que observa a falha e retorna `INCONCLUSIVO` em vez de reprovar
(`tests/e2e/playwright/r-int-4-youtube-picker.e2e.ts`).

Provável origem: o scrub de 2026-07-12, que removeu 693 arquivos de `docs/` e
reescreveu a árvore pública. O `docs/templates/` foi levado junto e a referência
no arquivo de regras da raiz ficou pendurada.

## Escopo (mínimo)

1. Decidir e aplicar **uma** das duas reconciliações, sem deixar as duas meias:
   - **(a) Corrigir a referência** — apontar o arquivo de regras da raiz e
     `docs/CONTEXTO.md` §5
     para `tests/e2e/playwright/e2e-template.ts`, que é onde o template vive e
     onde o autor de um caso novo já está trabalhando; ou
   - **(b) Restaurar `docs/templates/`** — recriar o diretório com o template
     canônico e manter a referência atual.
   Recomendação: **(a)**. O template ao lado dos casos é o que o projeto de fato
   pratica hoje, e evita duas cópias divergindo.
2. Varrer as demais referências penduradas a `docs/templates/` no repositório
   (`grep -rn "docs/templates" --include='*.md' --include='*.sh' --include='*.py' .`)
   e reconciliar todas na mesma passada.
3. Verificar se o `VALIDATOR_BRIEF.md` §1.9 repete a referência quebrada e
   corrigir junto, já que é o documento que o validador lê.
4. NÃO-objetivo: escrever casos E2E novos, consertar os casos existentes que
   falham, ou ligar E2E no CI — são AUDIT-P3-4 e sprints próprias.

## Execução (2026-09-05)

Os três itens do escopo foram reconciliados assim:

**Escopo 1 — já resolvido antes desta sprint.** A opção (a) foi aplicada pelo
commit `52b69b1` (2026-07-29), cuja mensagem declara: "o template de caso e2e
vive em tests/e2e/playwright/e2e-template.ts, não no caminho inexistente que a
copia citava". Hoje `docs/CONTEXTO.md` §5 já aponta para o caminho real, no
item 2 da entrega obrigatória de sprint de UI, e o arquivo de regras da raiz
não carrega mais essa regra: a mesma reorganização o reduziu a um ponteiro de
99 linhas, e ele é ignorado pelo Git (consta no `.gitignore`). Nada a editar em
`docs/CONTEXTO.md` nem na raiz.

**Escopo 2 — fechado aqui, na árvore versionada.** A varredura mostrou que
`docs/sprints/R-BRAND-8-RITUAIS-spec.md` (linhas 111 e 409) era o único spec
**versionado e ainda pendente** que mandava copiar do caminho morto; as duas
citações foram apontadas para `tests/e2e/playwright/e2e-template.ts`. As outras
duas ocorrências versionadas ficaram de propósito, porque citam o caminho para
**negá-lo**, e reescrevê-las inverteria o sentido do texto:

- `docs/sprints/R-BRAND-3-ESTADOS-VIVOS-spec.md:460` — "que não existe mais";
- `docs/sprints/AUDIT-P3-6-VALIDADOR-PTBR-ARG-POSICIONAL-spec.md:197` — descreve
  o mesmo defeito e delega a correção a esta sprint.

Este próprio arquivo cita o caminho dez vezes ao descrever o defeito; essas
menções também permanecem.

**Escopo 3 — inaplicável.** `VALIDATOR_BRIEF.md` não existe neste repositório
(`find` na árvore inteira retorna vazio) e é declarado ignorado no
`.gitignore`. Não há §1.9 a corrigir.

### Decisão registrada: material de processo não versionado ficou fora

Dezessete specs **não versionados** de `docs/sprints/` ainda citam
`docs/templates/e2e-template.e2e.ts`. Eles não foram tocados nesta sprint, e
isso é decisão, não esquecimento: `docs/sprints/` tem 460+ arquivos locais
contra 57 versionados, e mexer neles em lote tenta o `git add docs/sprints/`
que já vazou 883 specs internos para um remoto público uma vez.

O passivo não é pequeno e fica registrado aqui em vez de virar surpresa:
treze desses arquivos declaram `STATUS: [todo]` ou "em execução" no cabeçalho
— `R-HOME-4a` a `R-HOME-4e`, `R-AUDIT-HARDENING-MENOR`,
`R-AUDIT-PRIVACIDADE-LOC`, `R-AUDIT-RECAP-TECIDO`, `R-AUDIT-VAULT-PERF`,
`M-GAUNTLET-AUDITORIA`, `M-AUDIT-E2E-AMIGOS-LABEL`,
`M-AUDIT-MIGUE-FRASE-WEB-MOCK` e `FASE1-INTEGRACAO-POS-SCRUB` — e outros três
(`M-REVALIDACAO-M20-M28`, `R-DX-GAUNTLET-ONBOARDING-BYPASS`,
`R-RECAP-13-MENSAGENS-PROGRESSO`) não declaram status nenhum. Quem executar
qualquer um deles reencontra o caminho morto.

A mitigação é a fonte da verdade, que hoje está correta: o executor que
consultar `docs/CONTEXTO.md` §5 encontra o caminho certo, e é ela que manda.
Corrigir a citação local é trabalho de quem for executar cada uma dessas
sprints, com `git add` de lista explícita de arquivos se alguma delas for
versionada na ocasião.

## Proof-of-work

A proof-of-work original desta spec é **inexecutável** e foi substituída. O
bloco antigo resolvia o arquivo de regras da raiz por
`grep -ln 'Cópia das regras do' ./*.md`, que retorna vazio desde a
reorganização de 2026-07-29 (o cabeçalho mudou), e daí caía num `test -f ""`
que reprova onde não há defeito. O grep global também nunca zera: as menções
descritivas e as de negação sobrevivem por desenho. A prova correta é por
arquivo.

```bash
# 1. a fonte da verdade aponta para o caminho real, e o caminho existe
# (por grep, e nao por numero de linha: o CONTEXTO.md muda de tamanho)
grep -n 'e2e-template' docs/CONTEXTO.md     # tests/e2e/playwright/e2e-template.ts
test -f tests/e2e/playwright/e2e-template.ts && echo OK    # OK

# 2. o spec versionado e pendente nao manda mais copiar do caminho morto
grep -c 'docs/templates' docs/sprints/R-BRAND-8-RITUAIS-spec.md    # 0

# 3. o que sobra no tracked tree e so mencao descritiva ou de negacao
git grep -c 'docs/templates' -- '*.md'
# AUDIT-P3-6-...-spec.md:1   (nega o caminho)
# AUDIT-P3-9-...-spec.md:N   (descreve o defeito)
# R-BRAND-3-ESTADOS-VIVOS-spec.md:1  (nega o caminho)

# 4. nenhum codigo depende do caminho morto
grep -rnE 'docs/templates|e2e-template\.e2e' tests/ scripts/ src/ app/ .github/   # 0 linhas
```

## Commit

```
docs: audit-p3-9 corrige referencia do template e2e para o caminho real
```
