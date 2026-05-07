# Sprint K2 — M-MENU-NOMES

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## §1 Achado

Renomear seções do MenuLateral conforme decisão dono 2026-05-06:

- `'Ver'` → `'Acesso Rápido'`
- `'Opcionais'` → `'Utilitários'`

## §2 Tarefa

1. Em `src/components/chrome/MenuLateral.tsx`:
   - Substituir `titulo: 'Ver'` → `titulo: 'Acesso Rápido'`.
   - Substituir `titulo: 'Opcionais'` → `titulo: 'Utilitários'`.

2. Audit grep:
   ```bash
   grep -rn "'Ver'\|'Opcionais'" src/ app/ --include="*.tsx" --include="*.ts" | grep -v test
   ```
   Substituir TODAS as ocorrências relevantes.

3. Test: `tests/components/chrome/MenuLateral.test.tsx` — assert literal
   `'Acesso Rápido'` e `'Utilitários'` aparecem (não 'Ver' / 'Opcionais').

## §3 Restrições

- Sentence case + acentuação completa: `'Acesso Rápido'` (com acento
  agudo no "á" e "ó"), `'Utilitários'` (acento no "á").
- PT-BR audit hook valida.

## §4 Verificação

```bash
python3 scripts/check_strings_ui_ptbr.py  # deve detectar acentuação
npm test --silent -- --testPathPattern="MenuLateral"
```

## §5 Validação Gauntlet

PNG `A-menu-secoes-renomeadas.png` mostrando "Acesso Rápido" + "Registrar"
+ "Utilitários" como titulos das 3 seções.

## §6 Commit

```
feat: k2 menu nomes acesso rapido + utilitarios
```

## §7 Decisões

- **"Acesso Rápido"** vs "Atalhos": dono escolheu o primeiro.
- **"Utilitários"** vs "Extras": dono escolheu o primeiro.
