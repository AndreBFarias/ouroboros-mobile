# AUDIT-T3-DX — DX/automação derivada da auditoria

> Sprint corretiva derivada da auditoria de 2026-05-15. Tranche 3
> de 3 (Tranche 1 corre em paralelo). Escopo: ferramentas que
> economizam tempo do dev e da IA assistente. **Sem mudar docs
> canônicos** (STATE/ROADMAP/HOW_TO_RESUME/VALIDATOR_BRIEF — esses
> o maestro arquiva manualmente em commit separado).

## 1. Objetivo

Reduzir fricções recorrentes de DX identificadas na auditoria:
formatação manual, debug sem playbook, OAuth setup espalhado em
2 docs, ausência de scripts utilitários.

## 2. Entregáveis

### D1 — Prettier integrado

**Criar `.prettierrc`** na raiz com:
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

(Ajustar se já houver convenção implícita no código — fazer
amostragem de 5 arquivos `.tsx` do projeto e calibrar antes de
escrever. Não inventar config nova.)

**Adicionar prettier ao `hooks/pre-commit`**: após o bloco de
checks PT-BR e antes do bloco de eslint nos staged. Roda
`npx prettier --write` apenas nos arquivos staged `.ts/.tsx/.js/.jsx`
e re-stagea (`git add`). Não pode falhar — apenas formata.

**Atenção**: o pre-commit atual já auto-fixa anonimato +
whitespace; integrar prettier no mesmo espírito (silencioso,
não-bloqueante salvo erro fatal).

### D2 — Scripts utilitários novos

**`scripts/diag.sh`**: diagnóstico runtime quando algo quebra.
```bash
#!/usr/bin/env bash
# Diagnostico runtime: ADB devices + Metro status + ultimas linhas logcat
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
echo "=== ADB devices ==="
adb devices 2>/dev/null || echo "adb nao encontrado"
echo ""
echo "=== Metro localhost:8081 ==="
if curl -sfm 2 http://localhost:8081 > /dev/null 2>&1; then
  echo "UP"
else
  echo "DOWN (rode ./run.sh ou ./gauntlet.sh)"
fi
echo ""
echo "=== App rodando? ==="
PID=$(adb shell pidof com.ouroboros.mobile 2>/dev/null || true)
if [[ -n "$PID" ]]; then
  echo "PID $PID"
  echo ""
  echo "=== Logcat (50 linhas) ==="
  adb logcat -d --pid="$PID" | tail -50
else
  echo "app nao esta rodando no device"
fi
```

**`scripts/fix-it.sh`**: prettier + eslint --fix em batch.
```bash
#!/usr/bin/env bash
# Aplica prettier + eslint --fix em src/ e app/ + reporta tsc residual
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
echo ">> prettier --write"
npx prettier --write "src/**/*.{ts,tsx}" "app/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}" 2>&1 | tail -3
echo ""
echo ">> eslint --fix"
npx eslint --fix "app/" "src/" 2>&1 | tail -5 || true
echo ""
echo ">> tsc --noEmit (erros residuais ficam para fix manual)"
npx tsc --noEmit 2>&1 | tail -10 || true
echo ""
echo "OK: fix-it batch concluido"
```

**`scripts/bump-versioncode.sh`**: incrementa `app.json
android.versionCode` em +1 (preserva indent JSON com `node`).
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
node -e "
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const cur = app.expo.android.versionCode;
app.expo.android.versionCode = cur + 1;
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
console.log('versionCode: ' + cur + ' -> ' + (cur + 1));
"
```

Todos com `chmod +x` e shebang `#!/usr/bin/env bash`.

### D3 — Consolidar OAuth setup em um doc único

**Criar `docs/OAUTH-SETUP.md`** que mescla:
- `docs/SETUP-OAUTH-GOOGLE.md` (setup inicial Cloud Console)
- `docs/I2-OAUTH-CHECKLIST.md` (checklist validação)
- Bloco "secrets do GH Actions" (de algum doc; verificar
  `docs/auditoria-*` se referência existe)
- Bloco "Troubleshooting Q22.B" (consolidar do CHANGELOG: 4
  camadas de fix — SHA-1 typo, client tipo iOS, redirect
  reverso-DNS, maybeCompleteAuthSession)

Estrutura sugerida:
```
# OAuth Setup — Ouroboros Mobile

## Pré-requisitos
## Passo 1 — Cloud Console (client iOS)
## Passo 2 — env.json
## Passo 3 — app.json scheme
## Passo 4 — _layout maybeCompleteAuthSession
## Passo 5 — keystore EAS em GitHub Secrets
## Checklist de validação live
## Troubleshooting (Q22.B 4 camadas)
## Histórico de incidentes
```

**Não deletar** os 2 docs antigos. Substituir conteúdo deles por
1 linha cada apontando para o novo:
```markdown
# (Arquivado em 2026-05-15)

Conteúdo consolidado em [`docs/OAUTH-SETUP.md`](OAUTH-SETUP.md).
```

### D4 — README clarifica `./run.sh` vs `./gauntlet.sh`

Adicionar seção curta em `README.md` (após "Quickstart" ou onde
fizer sentido) com 5 linhas:

```markdown
### Quando usar cada um

| Comando | Para que | Dependências |
|---|---|---|
| `./gauntlet.sh` | Validação visual web rápida (UI, CSS, routing) | Nenhuma (Chrome) |
| `./run.sh` | Teste nativo no celular físico | Wi-Fi + QR code |
| `./run.sh --emulator` | Teste nativo no emulador Android | AVD configurado |
```

### D5 — install.sh documenta `--legacy-peer-deps`

No `install.sh`, antes da linha do `npm install --legacy-peer-deps`,
adicionar echo curto:

```bash
echo ">> instalando dependencias (--legacy-peer-deps necessario por"
echo "   incompatibilidades Expo SDK 54 com React 19; normal)"
```

(Não tocar a lógica; só o echo.)

## 3. Restrições e OFF-LIMITS

- **NÃO TOQUE** docs canônicos do projeto:
  - `CLAUDE.md`, `STATE.md`, `ROADMAP.md`, `HOW_TO_RESUME.md`,
    `VALIDATOR_BRIEF.md`, `CHANGELOG.md`
  - `docs/CONTEXTO.md`, `docs/BRIEFING.md`,
    `docs/FEATURES-CANONICAS.md`
  - `docs/ADRs/*`
  - `docs/sprints/*-spec.md` exceto esta sprint
- **NÃO INTRODUZA** dependência npm nova (prettier já está em
  devDependencies — package.json:103).
- **NÃO MUDE** lógica de checks existentes em `hooks/pre-commit`
  (anonimato, PT-BR, eslint) — apenas **adicione** prettier no
  início ou logo após o whitespace check.
- **NÃO ALTERE** os 2 docs antigos do OAuth além de substituí-los
  pela linha de redirect.
- **NÃO TOQUE** `scripts/` existentes — apenas crie os 3 novos.
- **NÃO ALTERE** `package.json` "scripts" — não criar npm script
  novo. Scripts em `scripts/` são invocados via path.

## 4. Procedimento sugerido

1. **D2 primeiro** (mais isolado): criar os 3 scripts novos com
   `chmod +x`. Testar `./scripts/bump-versioncode.sh` em dry-run
   (rodar, ver diff em `app.json`, reverter com
   `git checkout app.json`). `diag.sh` e `fix-it.sh` testar
   visualmente.
2. **D1**: criar `.prettierrc` (amostrar 5 arquivos do projeto
   antes de fixar `singleQuote` etc). Rodar
   `npx prettier --check 'src/**/*.tsx'` — se reportar muitas
   diferenças, calibrar config para reduzir noise. Adicionar
   bloco no `hooks/pre-commit` (testar com commit de teste em
   branch isolada).
3. **D5**: 2 linhas de echo em `install.sh`.
4. **D4**: tabela em `README.md`.
5. **D3 por último** (mais texto): consolidar OAuth setup.
   Verificar histórico Q22.B no `CHANGELOG.md` (read-only) para
   citar fielmente. Substituir os 2 docs antigos pela linha de
   redirect.

## 5. Verificação

```bash
./scripts/check_anonimato.sh                        # OK
python3 scripts/check_strings_ui_ptbr.py            # OK
./scripts/smoke.sh                                  # OK (não regrediu)
./scripts/diag.sh                                   # roda sem erro
./scripts/fix-it.sh                                 # roda sem erro
./scripts/bump-versioncode.sh                       # incrementa e reverte
ls -la .prettierrc                                  # existe
grep -c prettier hooks/pre-commit                   # >= 1
```

## 6. Commits (um por entregável)

```
chore: d1 prettierrc canonico + pre-commit autoformat
feat: d2 scripts diag fix-it bump-versioncode
docs: d3 consolida oauth setup em doc unico
docs: d4 readme clarifica run vs gauntlet
chore: d5 install documenta legacy-peer-deps
```

## 7. Proof-of-work esperado

1. Lista de arquivos criados/modificados.
2. Saída de cada script novo rodando uma vez (`diag.sh`,
   `fix-it.sh` com `--check`, `bump-versioncode.sh` revertido).
3. Saída de `git diff hooks/pre-commit` mostrando o bloco
   prettier adicionado.
4. Hash dos 5 commits.
5. Confirmação que `.prettierrc` não causou diffs gigantes em
   `src/` (rodar `npx prettier --check src/lib | wc -l` antes e
   depois — diferença deve ser zero ou pequena).

## 8. Decisões tomadas

- **Prettier config conservadora**: amostrar projeto antes de
  fixar; objetivo é zero regressão visual no diff inicial.
- **OAuth doc é mescla, não substituição**: os 2 antigos viram
  redirects; histórico preservado.
- **3 scripts são bash puro**: zero deps node, funcionam em
  qualquer máquina com bash + node + adb instalados.
- **D5 é cosmético** (echo informativo); não muda comportamento.
- **Arquivamento de docs canônicos (STATE, ROADMAP, prompts
  datados) fica fora desta sprint**: maestro faz manualmente em
  commit separado pós-T3.
