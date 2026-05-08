# Sprint S4 — M-AUDIT-LABEL-GAUNTLET-DASHBOARD

```
DEPENDE:    HEAD em 9c385b3
BLOQUEIA:   nada (cosmético dev-only)
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Corrigir label "Configuracoes" em `src/lib/dev/gauntletDashboard.tsx:43`
(falta cedilha) e estender `scripts/check_strings_ui_ptbr.py` para
incluir `src/lib/dev/` no scan, evitando que strings UI dev-only
escapem da regra PT-BR.

## 2. Entregáveis

### Arquivos modificados

- `src/lib/dev/gauntletDashboard.tsx:43` — `'Configuracoes'` →
  `'Configurações'` (string UI visível em /_dev/gauntlet em modo dev).
- `scripts/check_strings_ui_ptbr.py` — incluir `src/lib/dev/` no
  argumento de scan. Confirmar que a violação seria detectada antes do fix.

## 3. APIs reutilizáveis

- `scripts/dicionario_ptbr_canonico.json` — par "configuracoes/configurações"
  já existe (147 pares curados).

## 4. Restrições

Padrão. Estender o scan **não** pode adicionar paths em `.ptbr-violations.txt`
(zero violações pré-existentes em `src/lib/dev/`).

## 5. Validação

**Gauntlet:**
1. Antes do fix: `python3 scripts/check_strings_ui_ptbr.py` retorna 1 violação.
2. Após fix: retorna 0.
3. PNG do dashboard com label correto em `docs/sprints/M-AUDIT-LABEL-GAUNTLET-DASHBOARD-screenshots-gauntlet/`.

## 6. Procedimento

1. Editar 1 caractere (`Configuracoes` → `Configurações`).
2. Atualizar argumento de scan no `.py`.
3. Re-rodar smoke.

## 7. Verificação

```bash
python3 scripts/check_strings_ui_ptbr.py
./scripts/smoke.sh
```

## 8. Commit

```
fix: m-audit-label-gauntlet-dashboard configuracoes com cedilha + scan dev
```

## 9. Checkpoint visual

1 PNG do `/_dev/gauntlet` com label correto.

### Checklist

- [ ] `STATE.md` atualizado.
- [ ] `CHANGELOG.md` atualizado.

## 10. Dúvidas em aberto

Nenhuma.
