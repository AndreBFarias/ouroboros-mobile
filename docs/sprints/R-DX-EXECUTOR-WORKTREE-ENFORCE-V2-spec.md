# R-DX-EXECUTOR-WORKTREE-ENFORCE-V2 — Hook PreToolUse bloqueia escrita fora do worktree

**Tipo**: infra+DX
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Fase**: 3 (anti-débito)
**Origem**: achado durável Onda 3I (2026-05-17). 3 de 4 agents (R-DX-1, R-DX-3, R-INT-4) escreveram direto no main em vez do worktree por aplicação cega de paths absolutos vindos do Read inicial. Hook detective `agent-worktree-check.sh` é só `pre-commit` — não bloqueia escrita.

## Problema

Quando executor é dispatchado com `isolation: worktree`, o ambiente garante `cwd` no worktree mas NÃO impede que `Edit`/`Write` recebam paths absolutos do main repo (porque o agent fez `Read /home/.../main-repo/arquivo.ts` antes e copiou o path).

Sintoma observado Onda 3I:
- Worktree `agent-a5c477bc58dd1be9c` permanece vazio.
- Working tree do main fica dirty com mods da sprint.
- Agent reporta "Branch: `main` (worktree)" ou "Writes foram para a raiz por causa de paths absolutos no Edit/Write".

Consequências:
- Cherry-pick clean impossível (não tem commit no worktree pra pickar).
- Orquestrador tem que adotar working tree dirty manualmente.
- Risco de mistura entre sprints paralelas (Onda 3I: dois worktrees escreveram simultaneamente no main).

## Solução

Hook `PreToolUse` em `~/.claude/settings.json` (ou `settings.local.json` do projeto) que, quando executor está num worktree:

1. Intercepta `Edit`/`Write`/`MultiEdit`/`NotebookEdit`.
2. Lê `file_path` do argumento.
3. Resolve caminho absoluto.
4. Verifica se o path está dentro do worktree atual (cwd ou subdir de cwd).
5. Se NÃO está, bloqueia com mensagem `BLOQUEADO: arquivo fora do worktree. Use path relativo ao cwd ou path dentro de <worktree-root>.`

## Solução alternativa (mais conservadora)

Em vez de bloquear, **logar** todas escritas fora do worktree em `/tmp/worktree-bypass-<timestamp>.log` para auditoria. Não bloqueia execução mas dá visibilidade. Menos disruptivo, suficiente pra detecção.

**Decisão recomendada**: começar logging-only. Se incidentes continuam, escalar pra bloqueio.

## Entregáveis

1. `hooks/pretooluse-worktree-write-check.sh`:
   - Lê stdin com payload PreToolUse do Claude Code
   - Detecta worktree via `git rev-parse --git-common-dir` ≠ `git rev-parse --git-dir`
   - Resolve absolute path do `file_path`
   - Compara com `pwd` (worktree root)
   - Modo logging: append em `/tmp/worktree-bypass-$(date +%Y%m%d).log`
   - Modo blocking: exit 2 com mensagem em stderr

2. Entrada em `.claude/settings.json` (ou `~/.claude/settings.json`):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/hooks/pretooluse-worktree-write-check.sh"
          }
        ]
      }
    ]
  }
}
```

3. Doc em `docs/CONTEXTO.md` seção "Worktree isolation" referenciando o hook.

## Verificação

```bash
# Setup
mkdir -p /tmp/test-wt && cd /tmp/test-wt
git init && touch a.txt && git add . && git commit -m init
git worktree add wt-test
cd wt-test

# Simula bypass: writeesta no main em vez do worktree
echo '{"tool_input":{"file_path":"/tmp/test-wt/a.txt"}}' | \
  ${REPO}/hooks/pretooluse-worktree-write-check.sh
# Esperado modo logging: exit 0 + linha em /tmp/worktree-bypass-*.log
# Esperado modo blocking: exit 2 + mensagem em stderr

# Write dentro do worktree (OK)
echo '{"tool_input":{"file_path":"/tmp/test-wt/wt-test/a.txt"}}' | \
  ${REPO}/hooks/pretooluse-worktree-write-check.sh
# Esperado: exit 0 sem log
```

## OFF-LIMITS

**Pode tocar**: criar `hooks/pretooluse-worktree-write-check.sh`, doc em `docs/CONTEXTO.md`. Atualizar `.claude/settings.json` (ou pedir ao dono pra atualizar `~/.claude/settings.json` global).

**Não pode tocar**: `agent-worktree-check.sh` (pre-commit, complementar — mantém função).

## Proof-of-work

1. Hook criado + executável.
2. Teste manual: bypass simulado loga (ou bloqueia, conforme modo).
3. Teste manual: write dentro do worktree não loga.
4. Hash commit.
5. Decisão sobre modo: logging-only inicialmente.

## Decisão

P2 porque cada bypass gera 5-15min de remediação manual + risco de race condition entre sprints paralelas. ROI: 30min hook elimina classe inteira de débito recorrente. Modo logging-only inicial pra não disruptar agentes que escolhem deliberadamente paths fora.
