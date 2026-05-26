# R-INFRA-JEST-ENV-MOCK-FLAKE — spotify/oauth.test.ts estavel no run completo (worktree)

**Tipo:** fix (flake de teste / infra)
**Prioridade:** P2
**Estimativa:** 0.25-0.5d
**Fase:** infra

## Origem (flake recorrente 2026-05-25)

`tests/lib/integracoes/spotify/oauth.test.ts` (4 testes) **falha no run completo**
do smoke **dentro de worktree** (`./scripts/smoke.sh` / `jest` full), mas:
- passa **isolada** (`npx jest .../oauth.test.ts` → 12/12);
- passa no run completo **na main** (env.json e arquivo real);
- so falha no worktree (env.json e **symlink** → resolucao do mock virtual
  `jest.doMock('../../../../env.json')` colide na ordem de carga das suites).

Multiplos executores tropecaram nisso (PROGUARD, SETTINGS-EXPORT, VAULT-MIRROR,
BACKGROUND) e tiveram que validar a suite isolada. E ruido recorrente.

## Objetivo

Tornar a suite robusta independente de env.json ser arquivo real ou symlink, e
da ordem de carga das suites — eliminando o flake no run completo em worktree.

## Investigacao obrigatoria
```bash
sed -n '1,60p' tests/lib/integracoes/spotify/oauth.test.ts   # como mocka env.json
grep -n "doMock\|jest.mock\|env.json\|resetModules\|isolateModules\|virtual" tests/lib/integracoes/spotify/oauth.test.ts
grep -n "env.json\|googleAuthFlow\|pickClientId" jest.setup.cjs
# reproduzir o flake no worktree (env.json symlink): rodar o smoke completo e ver a falha;
# rodar isolada e ver passar. Confirmar a causa (ordem de modulo / cache do require do symlink).
```

## Hipotese de fix (executor confirma a melhor)
- Usar `jest.isolateModules(() => { ... })` ou `beforeEach(() => jest.resetModules())`
  na suite pra garantir que o mock de env.json seja consistente independente de
  quem carregou antes; OU
- Tornar o mock de env.json **explicito e local** (mock factory deterministica que
  nao depende do arquivo fisico), evitando o `doMock` virtual sensivel a symlink; OU
- Se a causa for o symlink, alinhar `scripts/bootstrap-worktree.sh` para **copiar**
  env.json (arquivo real) em vez de symlink (igual o gauntlet.sh ja faz para Metro)
  — mas a correcao preferida e no TESTE (robusto em qualquer cenario), nao so no bootstrap.

Decisao do executor documentada no commit.

## Escopo
- `tests/lib/integracoes/spotify/oauth.test.ts` (e/ou `jest.setup.cjs` se o mock for global).
- Opcional: `scripts/bootstrap-worktree.sh` (se a decisao incluir copiar env.json).

## OFF-LIMITS
- NAO mudar `src/lib/integracoes/spotify/oauth.ts` (codigo de producao esta correto).
- NAO afrouxar asserts pra "passar" — o fix e de estabilidade de carga, nao de logica.

## Acceptance
1. `./scripts/smoke.sh` roda VERDE **dentro de um worktree** (env.json symlink) sem o flake spotify/oauth.
2. `npx jest tests/lib/integracoes/spotify/oauth.test.ts` continua 12/12 isolado.
3. Smoke na main continua verde (sem regressao).

## Verificacao
```bash
./scripts/check_anonimato.sh
npx jest tests/lib/integracoes/spotify/oauth.test.ts
./scripts/smoke.sh    # idealmente rodar dentro de um worktree pra provar o fix
```

## Referencias
- Achado COL-1 (proof-of-work R-INFRA-SETTINGS-EXPORT-SHAPE) + relatos de PROGUARD/VAULT-MIRROR/BACKGROUND.
- `scripts/smoke.sh:13-15` (comentario do flake). `scripts/bootstrap-worktree.sh`.
