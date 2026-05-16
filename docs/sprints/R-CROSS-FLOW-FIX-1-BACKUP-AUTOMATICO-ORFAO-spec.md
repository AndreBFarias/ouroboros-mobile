# R-CROSS-FLOW-FIX-1 — Backup automático órfão no boot

**Tipo**: bug crítico
**Prioridade**: P1-high
**Estimativa**: 30-60min
**Tranche**: R-CROSS-FLOW (derivada de R-CROSS-FLOW-AUDIT)
**Fase**: 2

## Fonte canônica

Auditoria `docs/auditoria-cross-flow-2026-05-16/RELATORIO.md`
cenário 10. `avaliarBackupAutomatico` está declarado, exportado e
testado em `src/lib/backup/agendarBackup.ts`, mas **nenhum lugar
em `app/_layout.tsx` ou em qualquer helper de boot o chama**. Toggle
`backupAutomaticoSemanal: true` em Settings nunca aciona o backup
porque o avaliador nunca roda. O helper inteiro fica órfão (testes
mockam, runtime real ignora).

## Problema

```bash
# Comprovação:
grep -rn "avaliarBackup\|agendarBackup\b" app/_layout.tsx src/lib/boot/
# (vazio)

grep -rn "import.*agendarBackup\|backup/agendarBackup" src/ app/
# Apenas auto-references; nenhum caller no boot path.
```

Settings tem o toggle UI completo (`SecaoBackupAutomatico.tsx`
linha 24-84). O comentário em `agendarBackup.ts:7` diz "helper
plugado em `_layout` via `avaliarBackupAutomatico`" mas o plug não
existe.

## Solução

Em `app/_layout.tsx`:
1. Import `avaliarBackupAutomatico` de `@/lib/backup/agendarBackup`.
2. Em um `useEffect` montado uma única vez (idempotente — o helper
   já protege contra dupla-registro de timer), chamar
   `avaliarBackupAutomatico()` sem await (fire-and-forget).
3. Posicionar após o boot do Vault (depende de `useVault.vaultRoot`
   estar populado) — colocar dentro do effect que faz `bootCanonico`
   ou paralelamente.
4. Em `cancelarTimer()`: chamar no cleanup do useEffect (se
   `Platform.OS === 'web'` no-op interno; OK).

## Aceitação

- Toggle ON em Settings + `Date.now()` mockado para 8 dias após
  último backup → `executarBackup()` é chamado no próximo mount do
  `_layout`.
- Toggle OFF → timer não registra.
- E2E Jest: mock `executarBackup` + spy em `avaliarBackupAutomatico`
  chamado a partir do `_layout` mount.

## Dependências

- **Bloqueia**: nenhuma (backup é opt-in)
- **Bloqueado por**: nenhuma

## OFF-LIMITS

Padrão T1. **Pode tocar**: `app/_layout.tsx` (apenas import + useEffect),
`src/lib/backup/agendarBackup.ts` (apenas se precisar expor flag
de "iniciado" para evitar dupla-chamada em HMR).

## Verificação canônica

```bash
./scripts/smoke.sh
```

## Proof-of-work

1. Lista de arquivos modificados.
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Teste novo `tests/lib/backup/agendarBackup-boot.test.ts`
   verificando que mount do `_layout` chama `avaliarBackupAutomatico`.
7. Achados colaterais.
