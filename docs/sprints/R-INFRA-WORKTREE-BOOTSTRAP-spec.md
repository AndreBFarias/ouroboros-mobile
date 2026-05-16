# R-INFRA-WORKTREE-BOOTSTRAP — Script de bootstrap automático para worktrees

**Tipo**: infra
**Prioridade**: P3-low
**Estimativa**: 30-45min
**Tranche**: R-INFRA (nova, derivada do achado #2 de R-CRIT-4)
**Fase**: 3

## Origem

Achado colateral recorrente de T1B3 / T1B6 / R-CRIT-4: worktrees em
`.claude/worktrees/agent-*` não recebem `node_modules` nem `env.json`
automaticamente. Resultado: executor isolado precisa fazer
`ln -s ../../node_modules .` + `cp ../../env.json .` manualmente
antes de rodar smoke ou jest completo. Quando esquece, 75-78 suítes
falham por `lucide-react-native` resolver issue + typecheck falha
por env.json ausente.

## Objetivo

Automatizar o bootstrap de worktrees agent-* via script + hook git
`post-checkout` opcional. Eliminar fricção recorrente para 100% das
sprints futuras executadas via `isolation: worktree`.

## Entregáveis

### Script principal

`scripts/bootstrap-worktree.sh`:

```bash
#!/usr/bin/env bash
# Bootstrap de worktree agent-* — symlinks node_modules + env.json do main
set -euo pipefail

WORKTREE_DIR="${1:-$(pwd)}"
cd "$WORKTREE_DIR"

# Detecta se é worktree (existe .git como arquivo, não pasta)
if [[ ! -f .git ]]; then
  echo "Nao parece ser worktree git (espera .git como arquivo)"
  exit 1
fi

MAIN_DIR="$(git rev-parse --show-toplevel)"
MAIN_DIR="$(dirname "$(dirname "$(dirname "$MAIN_DIR")")")"

# Symlink node_modules (preserva espaço em disco)
if [[ ! -e node_modules ]] && [[ -d "$MAIN_DIR/node_modules" ]]; then
  ln -sf "$MAIN_DIR/node_modules" node_modules
  echo "OK: node_modules symlinkado de $MAIN_DIR"
fi

# Copy env.json (gitignored — não pode symlink se for testar isolado)
if [[ ! -e env.json ]] && [[ -f "$MAIN_DIR/env.json" ]]; then
  cp "$MAIN_DIR/env.json" env.json
  echo "OK: env.json copiado de $MAIN_DIR"
fi

echo "Bootstrap completo: $WORKTREE_DIR"
```

### Integração opcional via hook

`hooks/post-checkout` (criar ou estender se existir):

```bash
#!/usr/bin/env bash
# Se for checkout num worktree agent-*, roda bootstrap automaticamente
if [[ "$(pwd)" =~ /\.claude/worktrees/agent- ]]; then
  "$(git rev-parse --show-toplevel)/../../../scripts/bootstrap-worktree.sh" "$(pwd)"
fi
```

### Documentação

Adicionar seção em `docs/EAS-LOCAL-BUILD.md` (criado em R-DX-5) ou
em novo `docs/WORKTREES.md` documentando o protocolo.

### Update do prompt de executor-sprint

Prompts futuros pedem `./scripts/bootstrap-worktree.sh` como
primeiro comando antes de qualquer smoke/jest. Pode virar parte do
template `_TEMPLATE-FEATURE-V2.md` (R-DX-1).

## Dependências

- **Bloqueia**: melhora DX de todas as sprints com worktree
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `scripts/bootstrap-worktree.sh`,
criar `hooks/post-checkout` (se não existe — verificar antes), criar
`docs/WORKTREES.md`.

## Verificação canônica

```bash
# Criar worktree teste
git worktree add /tmp/test-bootstrap HEAD
cd /tmp/test-bootstrap
./scripts/bootstrap-worktree.sh
ls -la node_modules env.json  # esperado: ambos symlink/file
npx jest --silent | tail -5    # esperado: 220+ suítes passed
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
git worktree remove /tmp/test-bootstrap --force
```

## Proof-of-work

1. Script criado + executável.
2. Hook (se aplicável) criado.
3. Demo: worktree fresh → bootstrap → smoke verde sem ações manuais.
4. Documentação atualizada.
5. Hash do commit.

## Decisões tomadas

- **Symlink vs copy para `node_modules`**: symlink (economiza ~2GB
  disco por worktree).
- **Copy para `env.json`**: copy (gitignored, symlink pode causar
  ambiguidade se main rotacionar).
- **Hook opcional**: bootstrap explícito via script é mais previsível
  que hook automático. Documentar como primeiro passo no protocolo
  executor.
