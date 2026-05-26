# R-INT-5-DRIVE-NOTIF-BACKUP — Notif silenciosa apos backup no Drive

**Tipo:** feature (loop reativo)
**Prioridade:** P3
**Estimativa:** 0.25d
**Fase:** 3 (Onda 3Q.C)
**Depende de:** R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (upload Drive ja entregue)

## Contexto

Apos um upload semanal de backup pro Drive bem-sucedido, o usuario nao tem
feedback. Esta sprint emite uma notificacao **silenciosa** (sem som) confirmando.

## Objetivo

No success path do upload Drive (`src/lib/integracoes/google/driveBackup.ts`),
emitir notif silenciosa: titulo "Backup salvo no Drive", corpo "X MB" (tamanho do
ZIP enviado). Sem som, sem vibracao, tom sobrio. So no sucesso; falha nao notifica
(ou notifica discretamente conforme decisao — default: so sucesso).

Decisao do dono (handoff §7): 1x/semana silenciosa.

## Investigacao obrigatoria
```bash
grep -n "success\|sucesso\|upload\|export async" src/lib/integracoes/google/driveBackup.ts  # success path
grep -n "scheduleNotificationAsync\|sound: false\|trigger: null" src/lib/services/alarmesNotificacoes.ts src/lib/notifications/metaPassos.ts  # padrao notif silenciosa (metaPassos ja faz isso)
```

## Escopo
1. `src/lib/integracoes/google/driveBackup.ts` (MODIFICAR): no success path, chamar
   helper de notif silenciosa com o tamanho. Best-effort (falha da notif nao
   derruba o backup). Reuso do padrao de `src/lib/notifications/metaPassos.ts`
   (`scheduleNotificationAsync({ trigger: null, sound: false })`).
2. Opcional: extrair helper `notificarBackupDrive(mb)` em
   `src/lib/notifications/driveBackup.ts` (novo) se ficar mais limpo.

## OFF-LIMITS
NAO mudar a logica de upload, OAuth, nem outros notifs. NAO tocar docs raiz.

## Tom / regras
Anonimato (-1), comentarios SEM acento, strings UI COM acento PT-BR. Notif
silenciosa (zero som), sobria, sem exclamacao.

## Testes
- `tests/lib/notifications/driveBackup.test.ts` (ou no teste do driveBackup):
  sucesso emite notif silenciosa com MB; falha nao emite (mock expo-notifications).

## Validacao
Sem UI nova de tela → sem Gauntlet. Disparo real validavel no device (Nivel C).

## Referencias
- Backup module: `src/lib/integracoes/google/driveBackup.ts` (R-INT-5-BACKUP).
- Padrao notif silenciosa: `src/lib/notifications/metaPassos.ts`.
