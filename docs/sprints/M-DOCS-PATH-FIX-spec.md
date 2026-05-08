# Sprint G6 — M-DOCS-PATH-FIX

```
DEPENDE:    HEAD em 9c385b3
BLOQUEIA:   nada
ESTIMATIVA: ~0.3h
STATUS:     [todo]
```

## 1. Objetivo

Sanear referências a `TEMPLATE-spec.md` (caps + hífen) que apontam para
arquivo inexistente. O arquivo real é `_template-spec.md` (underscore +
lowercase). Achado durante O1 audit.

## 2. Entregáveis

### Arquivos modificados

- `VALIDATOR_BRIEF.md` — substituir `TEMPLATE-spec.md` por
  `_template-spec.md` em todas as ocorrências.
- `docs/sprints/M-GAUNTLET-PADRAO-VALIDATION-spec.md` (O1) — idem.
- Outros docs/scripts que possam referenciar — `git grep "TEMPLATE-spec"`
  e ajustar.

## 3. APIs reutilizáveis

N/A.

## 4. Restrições

Padrão. Sem mudança de comportamento — só fix de path.

## 5. Validação

```bash
git grep "TEMPLATE-spec\.md"  # zero hits
```

## 6. Procedimento

1. `git grep "TEMPLATE-spec"`.
2. `sed -i s/TEMPLATE-spec/_template-spec/g` nos arquivos relevantes.
3. Smoke.

## 7. Verificação

Smoke.

## 8. Commit

```
docs: m-docs-path-fix template-spec underscore lowercase
```

## 9. Checkpoint visual

Sprint documental — sem validação Gauntlet/adb.

### Checklist

- [ ] `STATE.md`.

## 10. Dúvidas em aberto

Nenhuma.
