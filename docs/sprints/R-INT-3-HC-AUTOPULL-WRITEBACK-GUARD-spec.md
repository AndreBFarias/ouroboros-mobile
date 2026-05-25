# R-INT-3-HC-AUTOPULL-WRITEBACK-GUARD — Guard contra loop de feedback HC->Vault->HC

**Tipo:** fix (guard de origem em writers com write-back HC)
**Prioridade:** P1 (bloqueia R-INT-3-HC-AUTOPULL-WIRING — sem este guard, ligar o
wiring com `healthConnectSync` on duplica registros no HC ao vivo)
**Estimativa:** 0.5d
**Fase:** 3 (Onda HC autopull)
**Depende de:** R-INT-3-HC-AUTOPULL-MEDIDAS + R-INT-3-HC-AUTOPULL-MENSTRUACAO (puxadores entregues)
**Bloqueia:** R-INT-3-HC-AUTOPULL-WIRING

## Origem

Achado colateral do executor de R-INT-3-HC-AUTOPULL-MEDIDAS (2026-05-25),
confirmado por investigacao do orquestrador:

- `escreverMedida` (`src/lib/vault/medidas.ts:136-146`) reescreve peso/gordura
  no HC via `escreverPesoEmHC`/`escreverBodyFatEmHC` quando
  `featureToggles.healthConnectSync` esta ligado.
- `escreverRegistroCiclo` (`src/lib/vault/ciclo.ts:189-197`) reescreve fluxo
  menstrual no HC via `escreverMenstruacaoEmHC` quando o toggle esta ligado e
  `fase === 'menstrual'`.
- O `insertRecords` da bridge nativa **nao dedupa** (documentado em
  `modules/health-connect/src/index.ts`).

Loop: autopull faz `HC -> Vault -> escreverMedida -> HC`. Como o registro
veio do HC e o insert reinjeta, cada sync com ambos os toggles ativos
(autopull via WIRING + write-back via healthConnectSync — acoplados pelo
mesmo toggle) cria duplicatas crescentes no HC.

`escreverPassos`, `escreverTreino` e `escreverSono` **nao** reescrevem no HC
— confirmado por grep. Guard limitado a medidas + menstruacao.

## Objetivo

Adicionar param opcional `pularSyncHC?: boolean` aos dois writers que
reescrevem no HC, e fazer os puxadores de autopull passarem `true`.

- Default (`undefined`/`false`): comportamento atual preservado — save manual
  da UI continua reescrevendo no HC (espelhamento bidirecional intencional).
- `pularSyncHC: true`: pula o bloco de write-back HC. Usado pelo autopull
  (dado ja veio do HC; reinjetar duplicaria).

## Escopo / Entregaveis

### Arquivos a MODIFICAR

1. `src/lib/vault/medidas.ts`
   - Assinatura: `escreverMedida(vaultRoot, meta, body = '', opts?: { pularSyncHC?: boolean })`.
   - Guard: `if (opts?.pularSyncHC) { ... pular bloco escreverPesoEmHC/escreverBodyFatEmHC ... }`.
     Pratica: envolver o `try` de write-back em `if (!opts?.pularSyncHC) { ... }`.
   - Comentario sem acento explicando o porque (anti-loop autopull).

2. `src/lib/vault/ciclo.ts`
   - Assinatura: `escreverRegistroCiclo(vaultRoot, meta, body = '', opts?: { pularSyncHC?: boolean })`.
   - Guard analogo no bloco `escreverMenstruacaoEmHC`.

3. `src/lib/health/puxadores/medidas.ts`
   - Na chamada a `escreverMedida(...)`, passar `{ pularSyncHC: true }` (4o arg,
     com `body = ''` no 3o). Comentario sem acento referenciando este guard.

4. `src/lib/health/puxadores/menstruacao.ts`
   - Na chamada a `escreverRegistroCiclo(...)`, passar `{ pularSyncHC: true }`.

### Arquivos a CRIAR

Nenhum.

### Investigacao obrigatoria (antes de codar)

```bash
grep -n "export async function escreverMedida" src/lib/vault/medidas.ts          # 1
grep -n "escreverPesoEmHC\|escreverBodyFatEmHC" src/lib/vault/medidas.ts          # >=2 (write-back atual)
grep -n "export async function escreverRegistroCiclo" src/lib/vault/ciclo.ts      # 1
grep -n "escreverMenstruacaoEmHC" src/lib/vault/ciclo.ts                           # >=1
grep -n "escreverMedida" src/lib/health/puxadores/medidas.ts                       # >=1 (caller)
grep -n "escreverRegistroCiclo" src/lib/health/puxadores/menstruacao.ts            # >=1 (caller)
grep -rn "escreverMedida\|escreverRegistroCiclo" src/ app/ tests/ | grep -v "function escrever"  # mapear TODOS os callers (backward-compat)
```

O ultimo grep e critico: confirmar que nenhum caller existente quebra ao
adicionar o param opcional (params opcionais sao backward-compat por
construcao, mas mapear evita surpresa em chamadas com `body` posicional).

## OFF-LIMITS

- **NAO** toque o modulo nativo (`modules/health-connect/`), `insertRecords`,
  nem `src/lib/health/sync.ts` (as funcoes `escrever*EmHC` ficam como estao —
  o guard e no caller, nao na funcao HC).
- **NAO** toque `autopullScheduler.ts` nem os puxadores passos/exercicio/sleep
  (nao tem loop).
- **NAO** toque schemas, `app/_layout.tsx` (wiring e sprint separada).
- **NAO** mude defaults de `featureToggles`.
- **NAO** toque `CLAUDE.md` / `ROADMAP.md` / `STATE.md` / `VALIDATOR_BRIEF.md` / `Checkpoint.md`.

## Acceptance criteria

1. `escreverMedida` e `escreverRegistroCiclo` aceitam `opts?: { pularSyncHC?: boolean }`.
2. Com `pularSyncHC: true`, NENHUMA chamada a `escrever*EmHC` ocorre (verificavel via spy de teste).
3. Sem o param (ou `false`), write-back HC ocorre como hoje (regressao zero).
4. `puxadores/medidas.ts` e `puxadores/menstruacao.ts` passam `pularSyncHC: true`.
5. Callers manuais existentes (UI de medidas e ciclo) inalterados — continuam reescrevendo no HC.
6. `npx tsc --noEmit` exit 0.
7. `./scripts/smoke.sh` verde, sem regressao.

## Testes

- `tests/lib/vault/medidas.test.ts` (estender): caso "com pularSyncHC=true nao chama escreverPesoEmHC/escreverBodyFatEmHC" (spy/mock em `@/lib/health/sync`) + caso "sem opts mantem write-back".
- `tests/lib/vault/ciclo.test.ts` (estender): analogo para `escreverMenstruacaoEmHC`.
- `tests/lib/health/puxadores/medidas.test.ts` (estender): assert que o puxador chama `escreverMedida` com `pularSyncHC: true`.
- `tests/lib/health/puxadores/menstruacao.test.ts` (estender): analogo.

## Proof-of-work esperado

1. Diff dos 4 arquivos modificados (2 writers + 2 puxadores).
2. `grep -n "pularSyncHC" src/lib/vault/medidas.ts src/lib/vault/ciclo.ts src/lib/health/puxadores/medidas.ts src/lib/health/puxadores/menstruacao.ts` (>=1 cada).
3. `npx jest tests/lib/vault tests/lib/health --silent | tail -8`.
4. `./scripts/check_anonimato.sh` + `python3 scripts/check_strings_ui_ptbr.py` + `npx tsc --noEmit` + `./scripts/smoke.sh` todos exit 0.
5. Hash commit + branch/worktree.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
```

## Referencias

- Achado origem: proof-of-work do executor R-INT-3-HC-AUTOPULL-MEDIDAS (2026-05-25).
- Writers afetados: `src/lib/vault/medidas.ts:113`, `src/lib/vault/ciclo.ts:170`.
- Bridge sem dedup: `modules/health-connect/src/index.ts`.
- Sprint que depende deste guard: `docs/sprints/R-INT-3-HC-AUTOPULL-WIRING-spec.md`.
