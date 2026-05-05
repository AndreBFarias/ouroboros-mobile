# Sprint M-VAULT-MD-FIX-evento-fotos — Fotos de evento em `media/fotos/`

```
DEPENDE:    M-VAULT-MD-AUDIT
BLOQUEIA:   M39
ESTIMATIVA: 1-2h
PRIORIDADE: alta
```

## 1. Achado

Fotos anexadas a `evento` (M07) salvam em `assets/<id>.jpg` em vez
de `media/fotos/<basename>.jpg` + companion. `useFotosAgregadas`
consegue listar (varre múltiplos paths), mas o registro fica
fora da estrutura canônica do Obsidian.

## 2. Tarefa

`app/eventos.tsx` ou helper de save de evento escreve foto em
`media/fotos/eventos-<data>-<rand>.jpg` + companion `.md` com
`tipo: midia_foto` + `legenda: <legenda do evento>` + `evento_ref:
<slug evento>`. Backward-compat preservado.

## 3. Verificação

E2E + script `check_vault_estrutura.sh` retorna zero órfãos para
fotos de evento.
