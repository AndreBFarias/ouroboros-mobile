# AUDIT-AUTOMATIZAR-ROADMAP-FANTASMAS — Detecção automatizada de sprints fantasmas

> Sprint anti-débito derivada da consolidação 2026-05-15.
> Severidade: MÉDIA — afeta manutenção e DX/AIX do projeto, não
> runtime do app.

## 1. Objetivo

Automatizar a detecção de **sprints fantasmas** no `ROADMAP.md`
(marcadas `[todo]` mas já entregues). A auditoria manual de
2026-05-15 detectou 25 fantasmas em 47 pendências — drift que se
acumula sem fricção visível. Sem automação, a próxima sessão
fresh tem que repetir a varredura inteira.

## 2. Entregáveis

### 2.1 Script principal

**Arquivo novo**: `scripts/check_roadmap_fantasmas.sh`
(ou `.py` se a lógica de cross-reference ficar complexa).

**Comportamento**:

1. Lê todas as linhas do `ROADMAP.md` com marcadores
   `[todo]` / `[backlog]` / `[spec]` / `[wip]`.
2. Para cada linha, extrai:
   - **Sprint ID** (regex `M\d+(\.\d+)?(\.[a-z])?|Q\d+(\.[a-z])?|R-\w+|AUDIT-\w+|G\d+|M-[A-Z-]+`)
   - **Spec arquivo** (link na coluna)
3. Para cada Sprint ID, cruza com 3 fontes de evidência:
   - **Git log**: `git log --all --oneline --grep="<id>"` — retorna
     commits que mencionam o ID
   - **Código**: arquivos em `src/` ou `app/` com nome ou comentário
     mencionando o ID; rotas/componentes derivados (mapping
     manual no script para casos canônicos como M11→`saude-fisica.tsx`,
     M40→`app/index.tsx v2`)
   - **FEATURES-CANONICAS**: `grep -l "<id>" docs/FEATURES-CANONICAS.md`
4. Classifica cada sprint:
   - **FANTASMA** (alta confiança): tem commits + código + menção em
     FEATURES — recomenda marcar `[ok]`
   - **SUSPEITO** (média confiança): tem 1-2 evidências — pede
     revisão manual
   - **REAL** (baixa evidência): sem commits/código/FEATURES —
     mantém `[todo]`
5. Output formato:
   ```
   FANTASMA: M11
     commits: 3aef8e7, d7dbe69
     codigo: src/components/screens/SaudeFisicaScreen.tsx
     features: docs/FEATURES-CANONICAS.md:177
     acao: marcar [ok] no ROADMAP

   REAL: M37.2
     commits: nenhum
     codigo: nenhum
     features: nao mencionado
     acao: manter [todo]
   ```

### 2.2 Modo `--fix` (opcional)

**Comportamento**: se passado `--fix`, o script tenta substituir
`[todo]` por `[ok]` em todas as fantasmas com alta confiança,
adicionando nota inline `<!-- auto-marcado [ok] 2026-MM-DD: <evidência> -->`.

Modo seguro por padrão (só reporta).

### 2.3 Integração no smoke

**Arquivo**: `scripts/smoke.sh`

Adicionar bloco **warning não-bloqueante** após `test_contract_drift`:

```bash
echo ">> auditoria fantasmas ROADMAP (warning)"
if ! ./scripts/check_roadmap_fantasmas.sh --warn-only 2>/dev/null; then
  echo "AVISO: ROADMAP pode ter fantasmas — rode './scripts/check_roadmap_fantasmas.sh' pra auditar"
fi
```

Não falha o smoke. Apenas avisa.

### 2.4 Pre-push hook (opcional)

**Arquivo**: `hooks/pre-push`

Se sprint estiver fechando (commit de tipo `feat:` ou `fix:`
mencionando `[ok]`), rodar `check_roadmap_fantasmas.sh --no-fail`
e avisar quantos fantasmas potenciais existem.

### 2.5 Testes

**Arquivo novo**: `tests/scripts/check_roadmap_fantasmas.test.ts`
(ou shell test em `tests/scripts/` se for script bash).

Cenários:
- Sprint com 3 evidências → classificada FANTASMA
- Sprint com 0 evidências → classificada REAL
- Sprint com 1 evidência → classificada SUSPEITO
- Modo `--fix` substitui linha corretamente
- `--warn-only` retorna exit 0 mesmo com fantasmas

## 3. Restrições / OFF-LIMITS

Mesma lista de T1 (não tocar CLAUDE.md/STATE.md/ROADMAP.md em modo
manual — só via `--fix` explícito do dono).

**Adicional**:
- Não introduzir dependência npm nova. Script bash puro ou Python 3
  (já usado em `check_strings_ui_ptbr.py`).
- Não escrever no ROADMAP em modo padrão — só report.

## 4. Procedimento sugerido

1. Mapear specs canônicas → código (file lookup table) no início do
   script. Exemplos: `M11 → src/components/screens/SaudeFisicaScreen.tsx`,
   `M40 → app/index.tsx (M40 mencionado em comentário)`,
   `M30 → src/lib/alarmes/`.
2. Implementar regex de Sprint ID + cross-reference (git + grep).
3. Testar com a auditoria manual de 2026-05-15 como ground truth
   (script deve detectar os mesmos 25 fantasmas).
4. Integrar no smoke como warning.
5. Documentar uso em `docs/EAS-LOCAL-BUILD.md` (ou criar
   `docs/SCRIPTS.md` se ainda não existe).

## 5. Verificação

```bash
./scripts/check_roadmap_fantasmas.sh           # report
./scripts/check_roadmap_fantasmas.sh --fix     # auto-marca
./scripts/check_roadmap_fantasmas.sh --warn-only  # exit 0
./scripts/smoke.sh                             # passa com warning
```

## 6. Commit (único)

```
feat: audit-automatizar-roadmap-fantasmas script + smoke warning
```

## 7. Decisões tomadas

- **Bash ou Python**: começar com bash; se cross-reference ficar
  complexa, migrar para Python (já usado para PT-BR audit).
- **Modo padrão é report-only**: zero risco de auto-modificar ROADMAP
  sem revisão.
- **Warning não-bloqueante**: smoke não falha; apenas avisa. Razão:
  fantasmas não quebram runtime; falsos positivos do script (raros
  mas possíveis) não devem travar commits.
- **Map de Sprint ID → código canônico**: mantido no próprio script
  (não em arquivo externo) pra reduzir indireção. Atualiza-se quando
  features novas mudam de path.

## 8. Proof-of-work

1. Lista de arquivos criados.
2. Saída do script rodando contra `ROADMAP.md` atual — deve
   detectar zero fantasmas (já marcamos todos `[ok]` em 2026-05-15).
3. Saída do script rodando contra um snapshot histórico (ex:
   commit `5b1cd4e` antes da auditoria) — deve detectar os 25
   fantasmas conhecidos.
4. Smoke verde com novo warning.
5. Hash do commit.
