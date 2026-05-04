# Sprint M-BACKUP-AUTOMATICO — Backup periódico opt-in

```
DEPENDE:    M-EXPORT-COMPLETO (precisa exportarVaultZip robusto)
BLOQUEIA:   M41 (rede de segurança contra falha de Syncthing)
ESTIMATIVA: 3-4h
PRIORIDADE: alta (proteção de dados real)
```

## 1. Achado / motivação

Hoje:
- Vault sincroniza via Syncthing (manual, opt-in pelo usuário).
- Export ZIP existe mas é **manual** (usuário precisa lembrar).
- **Sem rede de segurança automática.** Se Syncthing falhar e
  usuário não exportar, dados estão num único device.

## 2. Objetivo

Backup automático **local** (sem nuvem — ADR-0007):
- 1 backup por semana → `Documents/Ouroboros-Backups/auto/<data>.zip`.
- Mantém últimos 4 backups (rotação).
- Toggle opt-in em Settings (default OFF — privacy-first).
- Notificação suave quando backup feito ("Backup semanal salvo.").
- Sem upload, sem nuvem, sem analytics.

## 3. Entregáveis

### Arquivos novos

- `src/lib/backup/agendarBackup.ts` — agenda via
  `expo-task-manager` + `expo-background-fetch` (ou similar
  permitido em Android sem dev-client).
- `src/lib/backup/executarBackup.ts` — chama
  `exportarVaultZip()` (M-EXPORT-COMPLETO) + escreve em pasta
  `auto/` + rotaciona.
- `src/components/settings/SecaoBackupAutomatico.tsx` — toggle +
  "Último backup: há 3 dias.".
- 3 testes Jest cobrindo agendamento, execução, rotação.

### Arquivos modificados

- `app/settings/index.tsx` — adicionar SecaoBackupAutomatico
  acima de "Exportar dados" manual.
- `useSettings` v3 — adicionar `backupAutomaticoSemanal: boolean`
  (default false).
- `app.json` — declarar permissões necessárias.

## 4. Verificação

- E2E `tests/e2e/playwright/m-backup-automatico.e2e.ts` mock
  agendamento (web não roda task manager, mas valida UI toggle).
- Manual Nível B (emulador): toggle ON → forçar trigger →
  arquivo `.zip` aparece em `auto/`.

## 5. Decisões tomadas

- **Default OFF**: privacy-first. Usuário ativa quando quiser.
- **4 backups rotacionados**: 1 mês de proteção sem encher disco.
- **Local-only**: ADR-0007.
- **Notificação respeitosa**: tom sóbrio, sem celebração ("Backup
  semanal salvo." — ponto final, sem emoji).
- **Frequência semanal fixa**: simplicidade. Customização entra em
  v1.1 se usuário pedir.
