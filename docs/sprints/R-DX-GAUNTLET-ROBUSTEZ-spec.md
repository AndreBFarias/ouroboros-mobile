# R-DX-GAUNTLET-ROBUSTEZ — Gauntlet nao morre mais pos-bundle / orphan worktree

**Tipo:** dx (robustez de tooling)
**Prioridade:** P2
**Estimativa:** 0.5d
**Fase:** infra

## Origem (sofrimento empirico 2026-05-25)

Na sessao maratona, o Gauntlet falhou repetidamente:
1. **Metro morre pos-bundle:** `./gauntlet.sh` lanca o Metro detached, ele bundla
   (`Web Bundled ...`) e depois **morre sem bindar a porta** — `curl localhost:8081`
   retorna 000, nenhum processo `expo start` vivo. Sem erro claro no log.
2. **Orphan worktree no file-map:** apos limpar worktrees, o file-map do Metro do
   main referencia worktree deletado → `ENOENT: watch '.../.claude/worktrees/agent-XYZ/modules/widget-homescreen/...'` → Metro crasha.
3. **Wrapper `nohup ... &`** dentro de tool de background mata o Metro.
4. Sem health-check: o operador so descobre que morreu ao tentar navegar (perda de tempo).

## Objetivo

Tornar `./gauntlet.sh` robusto e auto-diagnostico:

1. **Pre-flight de higiene** (antes de subir Metro):
   - `git worktree prune` (remove refs orfas).
   - Limpar caches que guardam paths de worktree morto: `/tmp/metro-cache`,
     `/tmp/metro-file-map-*`, `node_modules/.cache/metro`, `.expo` (idempotente,
     so se existirem).
2. **Health-check pos-launch:** apos lancar o Metro, fazer poll do endpoint
   (`/_dev/gauntlet` ou `/status`) por ate N segundos (ex: 90s, cobrindo o
   primeiro bundle web lento). Se **bindar** → imprime `OK: Gauntlet pronto em
   http://localhost:<porta>/_dev/gauntlet`. Se **morrer/nao bindar** → imprime
   `ERRO: Metro morreu/nao bindou` + as ultimas ~20 linhas do log
   (`/tmp/gauntlet-expo-<porta>.log`) + dica (rodar `--clear`). Exit nao-zero
   nesse caso (pra o chamador saber).
3. **Deteccao de morte:** se o PID do Metro nao esta mais vivo durante o poll,
   abortar o poll cedo com a mensagem de erro (nao esperar os 90s atoa).
4. **Nao depender de `nohup &` do chamador:** o script ja faz o detach interno;
   documentar que NAO se deve envolver `./gauntlet.sh` em `nohup ... &` externo.

## Escopo / Entregaveis

- `gauntlet.sh` (MODIFICAR): pre-flight de higiene + health-check + deteccao de
  morte + mensagens claras. Preservar flags atuais (`--auto-port`, `--clear`,
  `--port`, `--record`, worktree support).
- Opcional: `scripts/gauntlet-doctor.sh` (novo) se a logica de diagnostico ficar
  grande demais pro gauntlet.sh — senao inline.

## Investigacao obrigatoria
```bash
sed -n '1,80p' gauntlet.sh            # estrutura atual (detach, porta, log)
grep -n "metro-cache\|prune\|curl\|localhost\|8081\|nohup\|&" gauntlet.sh
ls /tmp/metro-cache /tmp/metro-file-map-* 2>/dev/null  # caches que poluem file-map
```

## OFF-LIMITS
- NAO mudar o comportamento do Gauntlet em runtime (a UI `/_dev/gauntlet` e o
  `window.__gauntlet` ficam como estao). So o script de boot.
- NAO tocar codigo do app.

## Acceptance
1. `./gauntlet.sh --auto-port` sobe e imprime `OK: ... pronto` quando o Metro
   binda, OU `ERRO: ...` + tail do log quando morre — nunca silencioso.
2. Pre-flight remove caches/refs orfas (idempotente).
3. Rodar 2x seguidas funciona (sem residuo da run anterior travando).
4. `shellcheck gauntlet.sh` sem erros novos (se o projeto usa).

## Verificacao
```bash
bash -n gauntlet.sh                    # syntax
./gauntlet.sh --auto-port              # deve imprimir OK pronto OU ERRO+log, nunca silencio
# (depois Ctrl-C / matar Metro)
./scripts/check_anonimato.sh
```

## Referencias
- Achado INFRA-METRO-WORKTREE-ORFAO (proof-of-work R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO).
- gauntlet.sh atual + VALIDATOR_BRIEF §1.9 (politica de validacao visual).
