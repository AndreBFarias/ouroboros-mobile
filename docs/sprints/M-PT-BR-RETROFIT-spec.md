# Sprint M-PT-BR-RETROFIT — Fix em batch das violações PT-BR detectadas

```
DEPENDE:    M-PT-BR-AUDIT (script + dicionário disponíveis)
BLOQUEIA:   nada crítico (gates só ativam quando lista vazia)
ESTIMATIVA: <30min (apenas 2 arquivos)
PRIORIDADE: média (qualidade UI)
```

## 1. Achado / motivação

Sprint anterior `M-PT-BR-AUDIT` (2026-05-04) implementou
`scripts/check_strings_ui_ptbr.py` + dicionário canônico (147 pares).
Primeiro run após integração detectou **2 violações reais** em paths
fora do escopo da AUDIT (regra anti-débito: AUDIT entrega só tooling,
não corrige strings).

Violações:

| arquivo | linha | contexto | original | sugestão |
|---|---|---|---|---|
| `src/lib/diario/permissions.ts` | 22 | `prop:message` (default arg de Error) | `'permissao de microfone negada'` | `'permissão de microfone negada'` |
| `app/_dev/gauntlet.tsx` | 93 | `prop:titulo` (componente `<Secao>`) | `"Acoes"` | `"Ações"` |
| `src/lib/dev/gauntletDashboard.tsx` | 99 | `prop:titulo` (componente `<Secao>`) | `"Acoes"` | `"Ações"` |

Ambas estão excluídas temporariamente via `.ptbr-violations.txt`
para manter smoke verde enquanto a retrofit não roda.

## 2. Objetivo

Corrigir as 2 strings, remover as 2 linhas do `.ptbr-violations.txt`
e validar que `python3 scripts/check_strings_ui_ptbr.py` retorna
exit 0 sem nenhuma exclusão.

## 3. Entregáveis

### Arquivos modificados

- `src/lib/diario/permissions.ts` linha 22:
  - de: `constructor(message = 'permissao de microfone negada') {`
  - para: `constructor(message = 'permissão de microfone negada') {`
  - **Atenção:** essa string vai como `Error.message` para UI via
    toast. Acentuação real é correta nesse fluxo. Verificar se algum
    teste mocka `MicPermissionError` por `.message === 'permissao...'`
    (string literal exata) e atualizar.

- `app/_dev/gauntlet.tsx` linha 93:
  - de: `<Secao titulo="Acoes">`
  - para: `<Secao titulo="Ações">`
  - **Contexto:** rota dev `/_dev/gauntlet`. Não afeta release
    (dead-code). Só validação manual via Gauntlet.

- `.ptbr-violations.txt`: remover as duas linhas listando os arquivos
  acima. Manter cabeçalho de comentários. Se ficar só com comentários,
  manter o arquivo (próxima sprint pode adicionar mais entradas).

### Verificação

- `python3 scripts/check_strings_ui_ptbr.py` retorna exit 0 sem usar
  `.ptbr-violations.txt` (excluir 0 paths).
- `npm test --silent` — 1300 testes passam (ou 1300 + N se algum
  mock de string literal precisou ser atualizado; **N esperado <= 2**).
- `./scripts/smoke.sh` — exit 0.
- `npx tsc --noEmit` — exit 0.

## 4. Restrições

- Anonimato (Regra -1).
- Não tocar nenhum outro arquivo além dos 3 listados.
- Se algum mock de teste quebrar por causa do `.message` mudado,
  atualizar o mock (e só) — não expandir escopo.

## 5. Decisões tomadas

- **Acentuação em `Error.message`**: é UI eventualmente (toast). Vale
  acentuar mesmo sendo string de exception.
- **`gauntlet.tsx` é dev-only mas vale acentuar**: consistência. Custo
  zero de mudar uma palavra.
- **`.ptbr-violations.txt` mantido como mecanismo**: futuras retrofit
  podem reutilizar quando novo backlog aparecer. Só deleção se ficar
  só com comentários E não houver perspectiva de novos casos.

## 6. Proof-of-work esperado

```bash
python3 scripts/check_strings_ui_ptbr.py --verbose 2>&1 | tail -3
# espera: arquivos varridos: 267 (excluidos 0 via .ptbr-violations.txt)
#         OK: zero violacoes.

git diff --stat
# espera: 3 arquivos (permissions.ts, gauntlet.tsx, .ptbr-violations.txt)

npm test --silent 2>&1 | tail -3
# espera: 1300+ tests passed
```
