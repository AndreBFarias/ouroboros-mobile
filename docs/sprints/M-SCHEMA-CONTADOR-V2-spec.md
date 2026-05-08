# Sprint G7 — M-SCHEMA-CONTADOR-V2

```
DEPENDE:    HEAD em 9c385b3 + I-CONTADOR fechada (55cab5f)
BLOQUEIA:   nada (cosmético schema)
ESTIMATIVA: ~1h + decisão dono
STATUS:     [todo]
```

## 1. Objetivo

Renomear campo `resets` para `historico_resets` em
`src/lib/schemas/contador.ts` se o dono decidir. Mantém migração lossless
(arquivos `.md` legados continuam lidos via alias schema).

## 2. Entregáveis

### Arquivos modificados (depende decisão)

- `src/lib/schemas/contador.ts` — campo + alias para backwards-compat.
- `src/lib/contadores/saveContador.ts` — usar nome novo.
- Componentes que consomem (se houver) — atualizar binding.
- `tests/lib/schemas/contador.test.ts`.

## 3. APIs reutilizáveis

- zod `.transform()` para alias backwards-compat.

## 4. Restrições

Padrão. Migração lossless: arquivos `.md` antigos com `resets:` são lidos
pelo schema via alias; novos arquivos escrevem `historico_resets:`. Dono
decide.

## 5. Validação

Gauntlet: criar contador com 3 resets, verificar arquivo `.md` reflete
nome novo. Carregar arquivo legado mock — não quebra.

## 6. Procedimento

1. Apresentar a decisão ao dono (rename vs manter).
2. Se rename: zod schema com alias + writers atualizados + testes.

## 7. Verificação

Smoke + tsc + testes.

## 8. Commit

```
refactor: m-schema-contador-v2 rename resets historico-resets
```

## 9. Checkpoint visual

Não há mudança visual.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.

## 10. Dúvidas em aberto

**Bloqueador**: dono decide se renomeia (`resets` → `historico_resets`)
ou se mantém. Só depois execução.
