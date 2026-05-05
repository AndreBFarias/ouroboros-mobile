# Sprint M-VAULT-MD-FIX-medidas-fotos — Fotos de medida em `media/fotos/`

```
DEPENDE:    M-VAULT-MD-AUDIT
BLOQUEIA:   M39 + M11.4 (evolução corporal)
ESTIMATIVA: 1-2h
PRIORIDADE: alta
```

## 1. Achado

Fotos de medida (M12 — frente/lado/costas) salvam em
`assets/<id>.jpg` em vez de
`media/fotos/medidas-<data>-{frente,lado,costas}.jpg` + companion.

Bloqueador para M11.4 (evolução corporal) que assume estrutura
canônica de fotos de medida.

## 2. Tarefa

`app/medidas/novo.tsx` ou helper escreve fotos no path canônico +
companion `.md` com `tipo: midia_foto` + `legenda: "Evolução
corporal — frente/lado/costas"` + `medida_ref: <slug medida>`.

## 3. Verificação

E2E + script + integração com M11.4 confirma fotos aparecendo no
SecaoEvolucaoCorporal.
