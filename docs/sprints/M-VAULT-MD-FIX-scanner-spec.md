# Sprint M-VAULT-MD-FIX-scanner — Nota fiscal companion 1:1

```
DEPENDE:    M-VAULT-MD-AUDIT, M09 (scanner OCR)
BLOQUEIA:   M39
ESTIMATIVA: 1-2h
PRIORIDADE: média (M09 ainda em backlog dev-client)
```

## 1. Achado

M09 (scanner OCR) planeja salvar binário PDF em `assets/<id>.pdf`
e parsing `.md` em `inbox/financeiro/nota/<id>.md`. Quebra
convenção 1:1 (binário e companion no mesmo diretório com mesmo
basename).

## 2. Tarefa

Quando M09 for implementado, escrever em
`media/scanner/<data>-<rand>.pdf` + `media/scanner/<data>-<rand>.md`
companion. O `.md` em `inbox/financeiro/nota/` permanece como
referência semântica via wikilink `[[../media/scanner/<basename>]]`.

## 3. Verificação

Esta sprint pode ser **integrada à própria M09** quando essa for
executada (subseção da M09 já cobrindo o path canônico). Se M09
fechar antes desta, vira corretiva imediata.
