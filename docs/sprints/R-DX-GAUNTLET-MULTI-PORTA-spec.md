# R-DX-GAUNTLET-MULTI-PORTA — Suporte multi-porta no gauntlet.sh

**Tipo**: infra (DX)
**Prioridade**: P3-low
**Estimativa**: 1-2h
**Tranche**: R-DX (extensão de R-DX-4)
**Fase**: 3
**Origem**: achado colateral de R-RECAP-3 (executor reportou bloqueio
em pipeline 3-tentativas porque Metro em 8081 já estava ocupado por
worktree paralelo)

## Contexto

Quando múltiplos executores rodam em paralelo via worktree, cada um
pode querer subir seu próprio Metro web para validação visual via
Gauntlet/playwright. Hoje o Metro só roda em porta fixa 8081 — segundo
executor que tenta `./gauntlet.sh` falha por colisão.

Resultado: validação visual em sprints paralelas é serializada
artificialmente. Executores reportam "impossível 3-tentativas" e
descopam o checkpoint visual.

## Objetivo

Permitir múltiplos Metros simultâneos via porta dinâmica:
- `./gauntlet.sh` (default) → 8081
- `./gauntlet.sh --port 8082` → 8082
- `./gauntlet.sh --auto-port` → escolhe primeira livre em [8081-8089]

Configura `adb reverse tcp:<port> tcp:<port>` correspondente.

## Entregáveis

### Modificar `gauntlet.sh`

- Aceitar `--port <num>` e `--auto-port`
- Detectar porta livre via `ss -ltn` ou similar
- Exportar `EXPO_DEV_SERVER_PORT=$PORT` (Metro respeita)
- Atualizar mensagem de boot: "Gauntlet em http://localhost:<port>/_dev/gauntlet"
- ADB reverse usar mesma porta

### Helper para executores

Atualizar prompt template do `executor-sprint` (em
`_TEMPLATE-FEATURE-V2.md` quando R-DX-1 fechar) com:
```bash
# Bootstrap worktree
PORT=$(./scripts/auto-port.sh)  # novo helper
./gauntlet.sh --port $PORT &
```

### Helper novo: `scripts/auto-port.sh`

Retorna primeira porta livre em [8081-8089].

### Documentação

Update em `docs/GAUNTLET.md`.

## Dependências

- **Bloqueia**: validação visual em paralelo (todos os agents Fase
  2+ que tocam UI)
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: `gauntlet.sh`, criar `scripts/auto-port.sh`,
`docs/GAUNTLET.md`, prompt template (se R-DX-1 já fechou).

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test:
./gauntlet.sh --port 8082 &  # outro terminal
curl http://localhost:8082/_dev/gauntlet  # esperado: HTTP 200
./gauntlet.sh --auto-port &  # outro terminal
# Deve detectar 8082 ocupada e escolher 8083
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Demo: 2 gauntlets simultâneos em portas distintas, ambos respondendo.
3. Hash do commit.
4. Path do worktree + branch.
