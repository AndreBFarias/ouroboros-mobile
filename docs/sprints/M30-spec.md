# Sprint M30 — AlarmeSchema v2: recorrência + channel com vibração + lembretes integrados

```
DEPENDE:    M29 (settings v2)
BLOQUEIA:   M31 (tarefas com alarme vinculado)
ESTIMATIVA: 5-6h
```

## 1. Objetivo

Tornar alarmes funcionais de fato: vibração no channel Android, som
garantido, permissão de notificação pedida proativamente. Adicionar
campo `recorrencia` (única / diária / semanal / mensal) e migrar os 3
lembretes (medicação / treino / humor) que viviam em
`useSettings.lembretes` para alarmes pré-cadastrados desligados.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/alarme.ts`
  — adicionar campo:
  ```ts
  recorrencia: z.enum(['unica', 'diaria', 'semanal', 'mensal'])
    .default('semanal'),
  ```
  `dias_semana` continua, mas só relevante quando
  `recorrencia === 'semanal'`. `data_unica: z.string().optional()`
  para `recorrencia === 'unica'`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/services/alarmesNotificacoes.ts`
  — `agendarAlarme()` switch por `recorrencia`:
  - `unica`: trigger `DATE` com `data_unica`.
  - `diaria`: trigger `DAILY` com `hour/minute`.
  - `semanal`: continua trigger `WEEKLY` por dia da semana (atual).
  - `mensal`: trigger `MONTHLY` com `day/hour/minute`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/services/notificationActions.ts`
  — `registrarCategoriasAlarme()` adicionar canal Android com
  `vibrationPattern`:
  ```ts
  await Notifications.setNotificationChannelAsync(ALARME_CHANNEL_ID, {
    name: 'Ouroboros',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 500, 250],
    lightColor: '#bd93f9',
    enableVibrate: true,
    sound: 'gentle.wav',  // canal default
  });
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — boot hook chama `pedirPermissao()` (notificações) na primeira
  execução pós-onboarding (`useSessao.permissoesPedidas.notif === false`).
  Após pedir, marca via `useSessao.marcarPermissaoPedida('notif')`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/alarmes/novo.tsx`
  — adicionar `<ChipGroup mode="single">` "Recorrência":
  - "Única" → mostra DateTimePicker para `data_unica`.
  - "Diária" → esconde seletor de dias_semana.
  - "Semanal" → mostra `<SeletorDias>` (atual).
  - "Mensal" → mostra DateTimePicker mode `date` para escolher dia
    do mês (1-31).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/migrarLembretes.ts`
  — novo helper:
  ```ts
  export async function migrarLembretesParaAlarmes(
    vaultRoot: string
  ): Promise<void> {
    const lembretes = lerLembretesV1();  // do SecureStore antigo
    if (!lembretes) return;
    for (const chave of ['medicacao', 'treino', 'humor'] as const) {
      const slug = `lembrete-${chave}`;
      const existe = await lerAlarme(vaultRoot, slug);
      if (existe) continue;
      await escreverAlarme(vaultRoot, {
        tipo: 'alarme', slug,
        titulo: TITULOS[chave],
        horario: lembretes[chave]?.horario ?? '09:00',
        dias_semana: [],
        recorrencia: 'diaria',
        tag: chave === 'humor' ? 'outro' : chave as AlarmeTag,
        som: 'gentle',
        ativo: lembretes[chave]?.ativo ?? false,
        snooze_minutos: 5,
        criado_em: nowIso(),
        ultimo_disparo: null,
        notification_ids: [],
        snooze_id: null,
      });
    }
    apagarLembretesV1();  // limpa SecureStore antigo
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/reagendamento.ts`
  — adicionar `migrarLembretesParaAlarmes` ao `BOOT_HOOKS` (antes de
  `reagendarAlarmes`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/services/alarmesNotificacoes.test.ts`
  — cobrir 4 recorrências.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/boot/migrarLembretes.test.ts`
  — testar migração + idempotência.

### Arquivos NÃO modificados

- `src/lib/services/notificacoesLembretes.ts` — fica como código
  morto (não mais consumido pela UI). Pode ser apagado em sprint
  futura.

## 3. APIs reutilizáveis

- `expo-notifications` — `setNotificationChannelAsync`,
  `scheduleNotificationAsync` com triggers `DAILY`, `WEEKLY`,
  `MONTHLY`, `DATE`.
- `useVault.vaultRoot` para escrever alarmes pré-cadastrados.
- `useSessao.marcarPermissaoPedida` (M24).
- `escreverAlarme`, `lerAlarme`, `listarAlarmes` em `src/lib/vault/alarmes.ts`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Schema:** `AlarmeSchema` v2 — campo novo. Atualizar barrel em
  `src/lib/schemas/index.ts` se necessário.
- **Boot hook:** `migrarLembretesParaAlarmes` adicionado a
  `BOOT_HOOKS`.
- **app.json:** sem mudanças (permissões de notificação já
  declaradas via plugin).

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR completa em strings.
- TS strict.
- Migração de lembretes **idempotente**: rodar 2x não duplica
  alarmes.
- Permissão de notificação pedida apenas uma vez por instalação
  (controlada por `useSessao.permissoesPedidas.notif`).
- Em Web (`Platform.OS === 'web'`), permissão e channel são no-op.

## 5. Procedimento sugerido

1. Atualizar `AlarmeSchema` adicionando `recorrencia` + `data_unica`.
2. Refatorar `agendarAlarme()` com switch por recorrência.
3. Adicionar `vibrationPattern` ao channel em `notificationActions.ts`.
4. Criar `migrarLembretesParaAlarmes()` + plug em `BOOT_HOOKS`.
5. Atualizar UI `app/alarmes/novo.tsx`:
   - Chip recorrência no topo.
   - Mostrar `<SeletorDias>` apenas se semanal.
   - Mostrar DateTimePicker (`mode='date'`) se única ou mensal.
6. Boot hook: após onboarding done E `permissoesPedidas.notif === false`,
   chamar `pedirPermissao()` e marcar.
7. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m30-export && rm -rf /tmp/m30-export

# Manual emulador:
# 1. Criar alarme diário 09:00 → notificação dispara, vibra, toca som
# 2. Criar alarme único futuro → dispara só uma vez
# 3. Após reinstall: lembretes do v1 viram alarmes pré-cadastrados off
```

## 7. Commit

```
feat: m30 alarmes v2 recorrencia vibracao channel e migracao lembretes
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M30-screenshots/`:
- `A-novo-alarme-recorrencia.png` — chip recorrência visível.
- `A-recorrencia-unica-data.png` — modo "Única" com data picker.
- `A-recorrencia-mensal-dia.png` — modo "Mensal" com dia picker.

Validação Nível B (emulador) **obrigatória** para confirmar vibração:
capturar logcat enquanto alarme dispara e verificar
`Vibrator: pattern [0, 250, 500, 250]`.

## 9. Decisões tomadas

- **`recorrencia: 'semanal'` como default**: compatível com alarmes
  v1 sem migração de lógica (apenas migração de schema).
- **`data_unica` opcional + nullable**: só preenchido se
  `recorrencia === 'unica'`. Validação cruzada via `.refine()`.
- **`vibrationPattern: [0, 250, 500, 250]`**: 250ms pulse, 500ms
  pause, 250ms pulse. Nem invasivo nem fraco.
- **Migração de lembretes preservando horário e ativo**: usuário
  não perde configuração. Mas tag/som ganham defaults seguros
  (`gentle`, snooze 5min).
- **`notificacoesLembretes.ts` fica como código morto**: removido
  em sprint futura para evitar regressão durante migração.

Sprint pronta para execução sem perguntas pendentes.
