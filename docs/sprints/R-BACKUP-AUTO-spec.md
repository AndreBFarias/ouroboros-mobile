# R-BACKUP-AUTO — Backup automático semanal silencioso para o Vault

**Tipo**: feature
**Prioridade**: P2-medium
**Estimativa**: 3-4h
**Tranche**: R-BACKUP (nova, derivada do achado #6 + Decisão D6=Sim)
**Fase**: 3

## Fonte canônica

Briefing em [`/ONDA-R-BRIEFING.md`](../../ONDA-R-BRIEFING.md) §Achados → #6.

**Decisão**: D6 = SIM (dono autorizou em 2026-05-15).

## Objetivo

Backup automático semanal do Vault em ZIP timestamped, salvo
**dentro do próprio Vault** (path canônico — Syncthing cuida da
replicação pros 4 nós). Zero rede externa (consistente com
filosofia "sem rede de saída"). Toggle em Settings (default ON
após D6).

## Entregáveis

### Schema novo

`src/lib/schemas/backup_snapshot.ts`:
```ts
{
  tipo: 'backup_snapshot',
  versao: 1,
  criado_em: ISO timestamp,
  origem: deviceId,
  arquivos_incluidos: number,
  bytes_totais: number,
  sha256: string,  // checksum do ZIP pra validar integridade
}
```

### Boot hook

`src/lib/boot/agendarBackupAutomatico.ts`:
- Lê `useSettings.featureToggles.backupAutomatico` (novo, default true após D6)
- Lê `useSessao.flags.ultimoBackupAuto` (ISO timestamp ou null)
- Se passou ≥7 dias desde último → enfileira via
  `notifications.scheduleNotificationAsync` para rodar à noite
  (background-friendly)
- Filtro `.sync-conflict-*` aplicado (T1B6 doutrina)

### Writer

`src/lib/backup/executarBackupAutomatico.ts`:
- Usa `jszip` (já dependência) pra zipar tudo do Vault exceto:
  - `backups/` próprios (evitar recursão)
  - `*.sync-conflict-*` (filtro T1B6)
- Calcula sha256
- Escreve `backups/auto-<YYYY-MM-DD-HHMM>-<deviceId>.zip` no Vault
- Escreve companion `backups/auto-<YYYY-MM-DD-HHMM>-<deviceId>.md`
  com frontmatter do schema
- Atualiza `useSessao.flags.ultimoBackupAuto`
- Best-effort silencioso — falha não trava nada, só loga

### UI Settings

`app/settings/index.tsx` ou `app/settings/backup.tsx`:
- Toggle "Backup automático semanal"
- Lista últimos 4 backups (data + tamanho)
- Botão "Restaurar a partir de backup" (com confirmação Alert)
- Botão "Fazer backup agora" (manual trigger)

### Restore (escopo limitado, MVP)

`src/lib/backup/restaurarBackup.ts`:
- Confirma checksum sha256 do ZIP antes de extrair
- Extrai pra `<vault>/restore-temp/`
- Não sobrescreve direto — pede confirmação final via Alert
- Move pra Vault final atomicamente (T2 atomic write doutrina)
- Anti-débito: cenário "Vault corrompido pós-restore" precisa ter
  rollback path → registrar como AUDIT-T?-RESTORE-ROLLBACK se virar
  problema runtime

## Dependências

- **Bloqueia**: nada (feature isolada)
- **Bloqueado por**: T2 (`488e7fa` — atomic write em saves, doutrina)
  + T1B6 (`a49222f` — filtro sync-conflict)

## OFF-LIMITS

Padrão T1. **Pode tocar**: novos arquivos em `src/lib/backup/`,
`src/lib/schemas/backup_snapshot.ts`, `app/settings/backup.tsx`,
`src/lib/boot/agendarBackupAutomatico.ts`, settings store toggle.

## Verificação canônica

```bash
./scripts/smoke.sh
# Live test:
# 1. Settings → "Fazer backup agora"
# 2. Verificar arquivo .zip + companion .md em backups/
# 3. Validar checksum sha256
```

## Proof-of-work

1. Lista de arquivos criados/modificados.
2. Saída `npx jest --silent | tail -5` — esperado +5 testes (schema, writer, boot hook, hook UI, restore).
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Backup real gerado + companion .md válido + checksum confere.
7. Restore mockado funcional (pode descopar pra sub-sprint se complexo).
8. Achados colaterais.

## Decisões tomadas

- **Default ON** (D6=Sim, dono autorizou).
- **Frequência semanal** (não diária): equilíbrio entre proteção e tamanho do Vault.
- **Path canônico `backups/`** dentro do Vault: Syncthing replica pros 4 nós automaticamente.
- **Restore é MVP**: sub-sprint follow-up se houver caso real de corrupção.
- **Sem nuvem externa**: filosofia preservada.
