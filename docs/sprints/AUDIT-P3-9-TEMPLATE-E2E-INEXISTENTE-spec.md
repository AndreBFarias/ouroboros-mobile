# AUDIT-P3-9-TEMPLATE-E2E-INEXISTENTE — a regra de E2E aponta para um arquivo que não existe

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
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

## Proof-of-work

```bash
# nenhuma referencia pendurada sobra
grep -rn "docs/templates" --include='*.md' --include='*.sh' --include='*.py' . \
  | grep -v node_modules                        # 0 linhas, ou so caminhos que existem

# o caminho citado pela regra existe de fato
# (o arquivo de regras da raiz e resolvido pelo cabecalho que o declara copia)
REGRAS_RAIZ=$(grep -ln 'Cópia das regras do' ./*.md)
test -f "$(grep -oP '(?<=template `)[^`]+' "$REGRAS_RAIZ" | head -1)" && echo OK   # OK

# gates do projeto seguem verdes (mudanca e so de documentacao)
./scripts/smoke.sh                              # exit 0
```

## Commit

```
docs: audit-p3-9 corrige referencia do template e2e para o caminho real
```
