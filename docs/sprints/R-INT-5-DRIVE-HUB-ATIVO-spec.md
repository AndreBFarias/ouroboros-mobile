# R-INT-5-DRIVE-HUB-ATIVO — Hub de Integracoes: Drive deixa de ser "Em breve"

**Tipo:** feature (consumer UI)
**Prioridade:** P2
**Estimativa:** 0.5d
**Fase:** 3 (Onda 3Q.B)
**Depende de:** R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (scope Drive + upload + tracking ja entregues)

## Contexto

No hub de Integracoes (`src/components/screens/IntegracoesScreen.tsx`) o Google
Drive e o unico card ainda como placeholder `estado: 'em_breve'` ("Em breve").
Apos R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (backup ZIP -> Drive), o card deve virar
**ativo**, refletindo o estado real.

## Objetivo

Card Drive no hub passa a exibir estado real: Conectado/Desconectado (via o
store/scope do Drive criado em R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO) + resumo:
N backups no Drive, MB total, ultimo backup (data). Acoes: "Fazer agora"
(dispara upload) e "Restaurar" (lista backups do Drive -> baixa -> restaura via
fluxo `restaurarVault` existente). Se o passo OAuth Drive humano (R-SEC-1) ainda
nao foi feito, o card mostra Desconectado + CTA conectar (sem quebrar).

## Investigacao obrigatoria
```bash
grep -n "em_breve\|drive\|Drive" src/components/screens/IntegracoesScreen.tsx     # card placeholder atual
ls src/lib/integracoes/google/driveBackup.ts                                       # modulo de R-INT-5-BACKUP (depende)
grep -n "backupDriveAutomatico\|driveUltimoBackup\|driveBackups" src/lib/stores/settings.ts  # tracking
grep -n "restaurar" src/lib/services/restaurarVault.ts                             # fluxo de restore reuso
```

## Escopo
1. `src/components/screens/IntegracoesScreen.tsx` (MODIFICAR): descritor Drive de
   `em_breve` -> ativo, lendo estado real (token Drive + tracking de backups).
   Acoes "Fazer agora" / "Restaurar".
2. Se faltar um agregador de metadados de backup Drive (N, MB, ultimo), criar
   `src/lib/integracoes/google/driveResumo.ts` (le do tracking/Drive API).
3. Reuso de `restaurarVault` para o "Restaurar". NAO reimplementar restore.

## OFF-LIMITS
- NAO tocar o fluxo de upload (R-INT-5-BACKUP) nem outros cards do hub.
- NAO tocar OAuth flow. NAO tocar docs canonicos de raiz.

## Tom / regras
Anonimato (-1), comentarios SEM acento, strings UI COM acento PT-BR, tom sobrio.

## Testes + E2E
- `tests/components/screens/IntegracoesScreen.test.tsx` (estender): card Drive
  ativo/desconectado, acoes presentes.
- E2E `tests/e2e/playwright/r-int-5-drive-hub-ativo.e2e.ts` (mock store Drive).

## Validacao visual
UI → Gauntlet (mock estado Drive via store). Screenshot do card ativo. Supervisor valida.

## Referencias
- Hub: `src/components/screens/IntegracoesScreen.tsx`.
- Backup module: `src/lib/integracoes/google/driveBackup.ts` (R-INT-5-BACKUP).
- Restore: `src/lib/services/restaurarVault.ts`.
