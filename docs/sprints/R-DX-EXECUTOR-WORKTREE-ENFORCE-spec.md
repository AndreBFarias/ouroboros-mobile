# R-DX-EXECUTOR-WORKTREE-ENFORCE — Constraint técnico para honrar worktree boundaries

**Tipo**: infra + DX
**Prioridade**: P2-medium
**Estimativa**: 1-2h
**Fase**: 3 (DX)
**Origem**: achado durável recorrente — executor-sprint bypass de worktree isolation

## Histórico do problema

Bypass de worktree pelo executor já foi documentado em **3 ocasiões**:

1. Sessão pré-2026-05-15: AUTOMATIZAR-FANTASMAS commitou direto no main (commit `1304aba`). Trabalho preservado mas violou protocolo.
2. Sessão 2026-05-15 noite: instrução adicionada no prompt do R-FAB-2 reforçando "use `git rev-parse --show-toplevel`, não bypassar". Apesar disso, o executor ignorou.
3. Sessão 2026-05-16 noite (Onda 2A.4): R-FAB-2 voltou a bypassar — trabalhou no working tree do main em vez do worktree dedicado. Trabalho ficou em arquivos modificados no main local (não commitado pelo executor), exigindo que o orquestrador commitasse manualmente.

O padrão é claro: **a instrução textual no prompt é insuficiente**. Executor não tem incentivo de runtime para honrar a boundary.

## Objetivo

Adicionar **constraint técnico** que torna bypass impossível ou difícil. 3 opções:

### Opção A — Detection hook (pré-commit no agent runtime)

Hook que valida `$(git rev-parse --show-toplevel)` contra path-pattern `.claude/worktrees/agent-*`. Se não bate, falha o commit com mensagem clara.

- Pró: não-invasivo, fácil revert
- Contra: executor pode rodar fora de hook (e.g., chamar `git apply` direto)

### Opção B — Tornar main read-only para o agent

Quando agent é spawnado com `isolation: worktree`, montar o main directory como read-only durante a sessão dele. Apenas o worktree dele é writable.

- Pró: physical isolation
- Contra: pode quebrar outros workflows (gauntlet em main, etc)

### Opção C — Detection + auto-recovery pelo orquestrador

Orquestrador roda `git status` periódico durante agent execution; se detecta mudanças no main não autorizadas, faz `git stash` + move pro worktree do agent + reaplica.

- Pró: transparente pro agent
- Contra: complexidade no orquestrador

**Recomendação**: começar com Opção A (hook leve), avaliar se reduz incidência. Se não, escalar pra C.

## Entregáveis

### Hook pre-commit em `hooks/agent-worktree-check.sh`

```bash
#!/bin/bash
# Detecta se commit está sendo feito fora de worktree-agent quando agent
# context é detectado (via env var ou nome de branch).
TOPLEVEL=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current)

# Se branch é worktree-agent-*, exige que toplevel termine com o mesmo
if [[ "$BRANCH" == worktree-agent-* ]]; then
  EXPECTED_PATH=".claude/worktrees/${BRANCH#worktree-}"
  if [[ "$TOPLEVEL" != *"$EXPECTED_PATH" ]]; then
    echo "ERRO: branch $BRANCH não está no worktree esperado." >&2
    echo "       Toplevel atual: $TOPLEVEL" >&2
    echo "       Esperado: */$EXPECTED_PATH" >&2
    exit 1
  fi
fi

# Se está em main mas tem env CLAUDE_AGENT_ID, suspeita
if [[ "$BRANCH" == "main" && -n "${CLAUDE_AGENT_ID:-}" ]]; then
  echo "ERRO: agent ID $CLAUDE_AGENT_ID tentando commitar em main." >&2
  echo "       Use worktree dedicado." >&2
  exit 1
fi
```

### Integração

- Adicionar `hooks/agent-worktree-check.sh` ao git hooks padrão via `core.hooksPath`
- Documentar em `docs/CONTEXTO.md` na Seção "Execução de agentes"
- Atualizar template `executor-sprint` (se acessível) com nota sobre o constraint

### Telemetria

- Script `scripts/log_bypass_worktree.sh` que registra cada incidente em `docs/incidentes-worktree-bypass.md` com timestamp + sprint ID + arquivos afetados.
- Quando hook bloquear, log automático.

## OFF-LIMITS

**Pode tocar**: criar `hooks/agent-worktree-check.sh`, integrar via `core.hooksPath`, criar `scripts/log_bypass_worktree.sh`, atualizar `docs/CONTEXTO.md`.

**Não pode tocar**: lógica do executor-sprint (não acessível), nem outros hooks existentes (`pre-commit` PT-BR audit etc — coexistir).

## Verificação canônica

```bash
# 1. Hook detecta bypass intencional (teste manual)
git checkout main
CLAUDE_AGENT_ID=test git commit --allow-empty -m "teste"
# Esperado: ERRO + exit 1

# 2. Hook deixa passar commit legítimo em main (sem env var)
git commit --allow-empty -m "legitimo"
# Esperado: passa

# 3. Hook deixa passar commit em worktree-agent-* dentro do path correto
cd .claude/worktrees/agent-X
git checkout worktree-agent-X
git commit --allow-empty -m "no worktree"
# Esperado: passa
```

## Proof-of-work

1. Lista de arquivos criados.
2. Script de teste do hook (3 cenários acima).
3. Hash do commit (OBRIGATÓRIO).
4. Documentação atualizada em `docs/CONTEXTO.md`.
5. Incidentes históricos populados em `docs/incidentes-worktree-bypass.md` (3 entradas: AUTOMATIZAR-FANTASMAS, R-FAB-2 v1, R-FAB-2 v2).

## Decisões

- Hook é detectivo, não preventivo (commit falha mas trabalho não é perdido — arquivos permanecem).
- Não bloquear push (push é responsabilidade do orquestrador).
- Aceitar falsos negativos (agent sem CLAUDE_AGENT_ID em env vai escapar) — alvo é o caso comum.
