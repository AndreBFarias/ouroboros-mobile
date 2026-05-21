# R-INFRA-WORKTREE-ENV-SYMLINK — Bootstrap robusto de symlinks em worktree fresh

**Tipo:** infra + DX
**Prioridade:** P2-medium
**Estimativa:** 1-2h
**Fase:** 3 (Onda 3K, achado colateral de R-INFRA-JEST-LEAK-HUNT-5)
**ADR sugerida:** nenhuma (extensão operacional de R-INFRA-WORKTREE-BOOTSTRAP existente)

## Contexto

`scripts/bootstrap-worktree.sh` + hook `hooks/post-checkout` já
existem (R-INFRA-WORKTREE-BOOTSTRAP fechada em 2026-05-17,
commit `c9d38c5`). Criam symlinks `node_modules`, `env.json`, `.env`
automaticamente após `git worktree add` ou `git checkout`.

Mas durante R-INFRA-JEST-LEAK-HUNT-5 o agente
`a49390704fe24f1d3` reportou que **precisou rodar
`bash scripts/bootstrap-worktree.sh` manualmente** mesmo o hook
post-checkout estando registrado. Hipótese: hook só dispara
quando o branch troca, mas `git worktree add --detach` ou
worktrees criados via API interna do harness podem não disparar
post-checkout. Outro cenário possível: hook roda mas falha
silenciosamente (degrade-gracioso por design).

Sem os symlinks, jest falha em resolver `yaml`, `env.json` é
undefined no `googleAuthFlow.ts`, 122+ suítes quebram em cascata.

## Hipotese técnica

1. Detectar se `git worktree add` programático bypassa
   `post-checkout` (vide: harness do Claude Code com
   `isolation: worktree`).
2. Adicionar fallback: hook `pre-commit` ou `post-checkout` que
   detecta worktree sem symlinks e roda bootstrap como segunda
   camada.
3. Alternativa robusta: integrar bootstrap em `scripts/smoke.sh`
   no início (idempotente, no-op fora de worktree).

## Escopo

### A. Investigação obrigatória

```bash
# Verificar quando hook dispara
cat hooks/post-checkout
ls -la /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/.claude/worktrees/agent-*/node_modules 2>&1 | head -5
# Esperar: symlinks OK ou ausentes? Confirmar empirical.

# Verificar mecanismo do harness ao criar worktree
cat hooks/post-checkout
```

### B. Fix canônico (escolher A ou B)

**Opção A — Hook adicional `pre-commit` defensivo:**

Modificar `hooks/pre-commit` para detectar se worktree fresh e
chamar `bootstrap-worktree.sh` como primeira etapa. Custa <1s em
worktree já bootstrapped (no-op), garante symlinks antes do
commit.

**Opção B — Integração em `smoke.sh`:**

Adicionar no topo de `scripts/smoke.sh`:

```bash
# Bootstrap worktree symlinks se necessário (idempotente)
if [ -f scripts/bootstrap-worktree.sh ]; then
  bash scripts/bootstrap-worktree.sh > /dev/null 2>&1 || true
fi
```

Custa <100ms quando symlinks ok. Garante que smoke nunca falha
por symlink ausente.

**Recomendação:** Opção B (smoke é gating de pre-push e dos agentes;
cobre 100% dos casos sem nenhuma adição de hook git novo).

### C. Documentação

Atualizar `docs/CONTEXTO.md` seção "Bootstrap automático de
worktree" mencionando o fallback no smoke.

## OFF-LIMITS

**Pode tocar:**
- `scripts/smoke.sh` (top do arquivo, antes dos checks)
- `scripts/bootstrap-worktree.sh` (se precisar tornar mais defensivo)
- `hooks/pre-commit` (opcional, se escolher Opção A)
- `docs/CONTEXTO.md` (subseção bootstrap)

**Não pode tocar:**
- Hook `post-checkout` original (preservar comportamento atual)
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md` (orquestrador)

## Verificação canônica

```bash
# Cenário 1: worktree fresh sem symlinks
git worktree add /tmp/test-bootstrap-fix HEAD
cd /tmp/test-bootstrap-fix
ls node_modules env.json .env 2>&1  # esperado: nao existe
bash scripts/smoke.sh  # deve criar symlinks e passar verde
ls -la node_modules env.json .env  # esperado: symlinks OK
cd -
git worktree remove --force /tmp/test-bootstrap-fix

# Cenário 2: worktree ja bootstrapped (idempotente)
bash scripts/smoke.sh  # no-op, baseline mantido

./scripts/check_anonimato.sh
./scripts/smoke.sh
```

## Proof-of-work esperado

1. Diff de `scripts/smoke.sh` (ou outro arquivo escolhido).
2. Demonstração empírica: worktree fresh → smoke roda → symlinks
   foram criados (output `ls -la` antes/depois).
3. Smoke verde no main após o fix.
4. Hash commit no worktree.

## Decisão

P2 porque consome 5-10min por dispatch novo de agente. Fix
mecânico — proteção em camada que elimina classe inteira de
falha.

## Origem

Achado colateral do agente `a49390704fe24f1d3` ao executar
`R-INFRA-JEST-LEAK-HUNT-5`. Citado textualmente:
"bash scripts/bootstrap-worktree.sh foi necessário para criar
symlinks node_modules, env.json, .env no worktree. Sem ele os
testes não rodam. Spec hunt-5 também lista isso."
