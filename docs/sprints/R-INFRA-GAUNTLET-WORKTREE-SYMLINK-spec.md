# R-INFRA-GAUNTLET-WORKTREE-SYMLINK — Gauntlet web no worktree não carrega rotas locais

**Tipo**: infra + DX
**Prioridade**: P2-medium
**Estimativa**: 2-3h
**Fase**: 3 (DX)
**Origem**: achado durá­vel R-INT-1 (commit `f4ec759`); afeta validação visual via Gauntlet em qualquer sprint paralela.

## Problema

Quando agent roda Gauntlet em worktree (`./gauntlet.sh` ou `npx expo start --web --port 8090`), o bundle JS compila mas exibe **"Welcome to Expo"** em vez das rotas do app. Resultado: Gauntlet só serve `/onboarding` ou tela default, impossibilitando validação visual de qualquer feature.

Causa: `require.context('./app', true, /\.tsx?$/)` em `expo-router/_ctx.web.js` resolve **relativo ao path real do bundle entry**, que está em `node_modules/expo-router/`. Como `node_modules` no worktree é symlink pro repo principal, o `require.context` resolve pro `app/` do REPO PRINCIPAL, não do worktree.

Sintoma:
- Worktree tem `app/integracoes.tsx`, `app/recap-memorias.tsx`, etc
- Bundle gerado: apenas `app/index.tsx` + `app/_layout.tsx` do REPO PRINCIPAL
- 50+ rotas do worktree não entram no bundle

## Impacto histórico

- **R-INT-1**: tentativa de capturar screenshot do hub falhou (página "Welcome to Expo")
- **R-VAULT-B**: capturou onboarding em vez de Settings com botão Exportar
- **R-HOME-1**: aplicou diff temporário no main pra capturar, reverteu depois
- **R-RECAP-2**: validou via playwright contra Metro no worktree em :8082 com env.json real (não symlink); outras tentativas Gauntlet falharam

Pattern recorrente: validação visual via Gauntlet **não confiável** em worktree atualmente.

## Objetivo

Permitir que `./gauntlet.sh` rodado de DENTRO de um worktree colete rotas do worktree, não do repo principal.

## Opções técnicas

### Opção A — Copiar `node_modules` em vez de symlink

Pró: resolve cleanly, `require.context` resolve corretamente.
Contra: ~1.5GB por worktree, lento, espalhamento de disco.

### Opção B — Wrapper `entry.ts` que injeta `require.context` próprio

Substituir o `expo-router/entry.bundle` por wrapper local que usa `require.context` ancorado em `__dirname` do worktree, não do node_modules.

Pró: zero overhead de disco.
Contra: precisa investigar API interna do expo-router, pode quebrar em upgrades.

### Opção C — Metro `projectRoot` explícito + `watchFolders`

Configurar `metro.config.js` do worktree (ou via env var EXPO_NO_METRO_WORKSPACE_ROOT=1 + EXPO_ROUTER_APP_ROOT) pra forçar `projectRoot` = worktree path. Já mencionado por R-HOME-1.

Pró: usa API documentada.
Contra: pode quebrar `monorepo` workflows futuros.

### Opção D — Workaround manual atual (aceitar)

Documentar protocolo em `HOW_TO_RESUME.md`: para validar visual em worktree, agent precisa fazer mini-build local com `app/` real do worktree, capturar, reverter. Custoso, não-determinístico, mas funciona.

**Recomendação**: começar com **Opção C** (env var + metro.config) — mais robusta com APIs públicas. Se quebrar, escalar pra Opção B.

## Entregáveis

### Investigação

1. Reproduzir bug em worktree fresh: `git worktree add .claude/worktrees/test`, `cd lá`, `./gauntlet.sh`, capturar Welcome to Expo.
2. Tentar Opção C: `EXPO_ROUTER_APP_ROOT=$(pwd)/app EXPO_NO_METRO_WORKSPACE_ROOT=1 npx expo start --web --port 8081`. Validar se rotas locais entram.
3. Se C falhar, tentar Opção B.

### Documentação

Atualizar `gauntlet.sh` com detecção de worktree (path contém `.claude/worktrees/`) e aplicar workaround automaticamente.

Atualizar `HOW_TO_RESUME.md` seção "Validação visual em worktree".

### Teste em sprint nova

Após fix, rodar `R-INT-1` re-validation: capturar screenshot real do hub Integrações em worktree.

## OFF-LIMITS

**Pode tocar**:
- `gauntlet.sh` (estender)
- `metro.config.js` se houver
- `HOW_TO_RESUME.md`
- Criar `scripts/gauntlet-worktree.sh` se necessário

**Não pode tocar**:
- `node_modules` (gerenciado por npm/pnpm)
- `app.json` em geral

## Verificação canônica

```bash
# Em worktree fresh
git worktree add .claude/worktrees/test
cd .claude/worktrees/test
ln -s ../../node_modules .
ln -s ../../env.json .
./gauntlet.sh
# Esperado: Chrome mostra Tela Hoje, NÃO "Welcome to Expo"
```

## Proof-of-work

1. Lista de arquivos modificados/criados.
2. Screenshot Gauntlet de worktree mostrando rota real (não Welcome).
3. Hash do commit.
4. Path do worktree usado pra teste.
5. Documentação atualizada em `HOW_TO_RESUME.md`.

## Decisões

- P2 porque afeta workflow paralelo (todos os executors), mas não bloqueia release (Jest cobre lógica).
- Pode coexistir com R-INFRA-WORKTREE-BOOTSTRAP (que linka node_modules) — provavelmente complementar.
