# R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO — Backup automatico do Vault no Google Drive

**Tipo:** feature (integracao write-only — backup off-device)
**Prioridade:** P2 (durabilidade dos dados — usuario perde celular = perde tudo se sem Drive)
**Estimativa:** 1-1.5d
**Fase:** 3
**Depende de:** Q22.B (OAuth Google entregue) + R-BACKUP-AUTO (`88fe9be` — backup local Vault semanal)

## Contexto

Hub Integracoes (`IntegracoesScreen.tsx`) mostra Google Drive como "Em breve" placeholder. R-BACKUP-AUTO (Onda 3C.1) faz backup ZIP local em `OuroborosVault/_backups/auto/`. Falta upload desse ZIP pro Google Drive (off-device safety net).

## Objetivo

Adicionar scope `drive.file` ao OAuth Google existente + criar puxador que faz upload do ultimo ZIP de backup pro Drive semanalmente.

```ts
// src/lib/integracoes/google/driveBackup.ts
export interface DriveBackupResultado {
  uploadado: boolean;
  fileId?: string;
  bytes?: number;
  erro?: string;
}

export async function fazerBackupDrive(
  vaultRoot: string,
  agora: Date
): Promise<DriveBackupResultado>;
```

Logica:
1. Token Google via store (mesmo que Calendar — adicionar scope no fluxo OAuth).
2. Listar ZIPs em `OuroborosVault/_backups/auto/` — pegar mais recente.
3. Verificar se ja foi uploadado (file metadata no Drive via custom property `ouroboros_backup_sha256`).
4. `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` com multipart body.
5. Criar pasta `Ouroboros Backups/` no Drive se nao existe (`spaces=drive`).
6. Retornar fileId.

## API auxiliar

Estender `src/lib/integracoes/google/oauth.ts` com scope `https://www.googleapis.com/auth/drive.file` (incremental authorization — nao re-pede outros scopes).

Hub Integracoes: card Drive deixa de ser "Em breve" e passa a mostrar "Conectado: 12 backups, 245 MB" + botao "Fazer backup agora" / "Restaurar do Drive".

## Escopo

### A. Investigacao obrigatoria

```bash
grep -rn "drive.file\|googleapis.com/drive" src/lib/integracoes/google/ | head  # esperado 0 antes
grep -n "OuroborosVault/_backups/auto" src/  # confirma R-BACKUP-AUTO writer
grep -n "Em breve\|Google Drive" src/components/screens/IntegracoesScreen.tsx
```

### B. Implementacao

1. `src/lib/integracoes/google/oauth.ts`: adicionar scope drive.file.
2. `src/lib/integracoes/google/driveBackup.ts` (novo).
3. `src/lib/integracoes/scheduler.ts`: entry drive (1x/semana).
4. `src/components/screens/IntegracoesScreen.tsx`: descritor Drive vira ativo (deixa de ser placeholder).
5. `app/settings/contas-google.tsx`: toggle "Backup automatico no Drive" + botoes manuais.

### C. Testes

- `tests/lib/integracoes/google/driveBackup.test.ts`: mocka fetch upload + listing, valida idempotencia (mesmo sha256 nao re-upa).

## OFF-LIMITS

**Pode tocar:** `src/lib/integracoes/google/{oauth,driveBackup}.ts`, `src/lib/integracoes/scheduler.ts`, `src/components/screens/IntegracoesScreen.tsx`, `app/settings/contas-google.tsx`, tests.

**Nao pode tocar:** R-BACKUP-AUTO writer local (preservar), HC bridge, schemas nao relacionados, CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/smoke.sh
# Live: rodar backup local (R-BACKUP-AUTO), abrir Integracoes > Drive > "Fazer backup agora",
# verificar arquivo no drive.google.com/drive/folders/Ouroboros%20Backups.
```

## Proof-of-work

1. Lista arquivos + diff oauth scopes.
2. Jest verde.
3. Hash + build APK.
4. Live: arquivo ZIP no Drive.

## Decisao pendente dono (antes de despachar)

- **Periodicidade do backup Drive:** 1x/semana (igual local), 1x/dia, ou so manual? **Default proposto: 1x/semana automatico + botao manual sempre disponivel.**
- **Quantos backups manter no Drive?** Manter os ultimos N e deletar antigos, ou nunca apagar? **Default proposto: ultimos 12 (3 meses)**.

## Referencias

- Drive API upload: https://developers.google.com/drive/api/v3/manage-uploads#multipart
- R-BACKUP-AUTO writer local: `R-BACKUP-AUTO-spec.md`
- Hub Integracoes: `R-INT-1-HUB-UTILITARIOS-spec.md`
