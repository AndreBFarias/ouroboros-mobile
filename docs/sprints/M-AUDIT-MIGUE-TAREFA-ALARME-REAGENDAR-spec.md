# Sprint S2 — M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR

```
DEPENDE:    HEAD em 9c385b3
BLOQUEIA:   APK preview (saneamento débito I-TAREFA)
ESTIMATIVA: ~2h
STATUS:     [todo]
```

## 1. Objetivo

Fechar o `TODO M30` em `src/lib/vault/tarefas.ts:284`: implementar
re-agendamento do alarme companion quando a `data_hora_iso` da tarefa muda.
Comportamento esperado: ao editar tarefa com alarme vinculado, o alarme
companion no `markdown/alarme-<slug>.md` é atualizado e `expo-notifications`
é re-agendado via `agendarAlarme(slug)`.

## 2. Entregáveis

### Arquivos modificados

- `src/lib/vault/tarefas.ts` — função `marcarFeito` ou `editarTarefa`
  detecta mudança de `data_hora_iso` e dispara `cancelarAlarme(slug) +
  agendarAlarme(slug)`. Remove o `TODO M30`.
- `src/lib/services/notificacoesLembretes.ts` — confirmar que
  `agendarAlarme` é idempotente (cancela antigo antes de agendar novo).

### Arquivos novos

- `tests/lib/vault/tarefas-reagendar.test.ts` — caso "edita data_hora_iso de
  tarefa com alarme companion → alarme cancelado e re-agendado".

## 3. APIs reutilizáveis

- `src/lib/services/notificacoesLembretes.ts` (`agendarAlarme`, `cancelarAlarme`).
- `src/lib/vault/alarmes.ts` (`escreverAlarme` + lock-write).

## 4. Restrições

Padrão. Não introduzir dependência cíclica entre `tarefas.ts` e `alarmes.ts`
(usar passagem de função ou hook).

## 5. Validação Gauntlet OU validação humana adb

**Gauntlet:**
1. `__gauntlet.seed()`, abrir `/todo`, criar tarefa com alarme via FAB.
2. Editar a tarefa, mudar data_hora_iso.
3. Inspecionar mock vault: companion `alarme-<slug>.md` deve refletir nova data.

**Validação humana adb (alarme nativo):**
```bash
adb shell pm clear com.ouroboros.mobile
# instalar APK preview, criar tarefa+alarme, editar, conferir
adb shell dumpsys alarm | grep com.ouroboros
```

## 6. Procedimento sugerido

1. Ler `src/lib/vault/tarefas.ts` linhas 280-300 (TODO M30 está em `:284`).
2. Estender `salvarTarefa(tarefa)` (ou função equivalente de upsert) para
   detectar transição:
   ```ts
   const tarefaAntiga = await lerTarefa(slug); // lê arquivo .md anterior
   if (tarefaAntiga?.alarme_companion_slug && tarefa.alarme_companion_slug) {
     const dataMudou = tarefaAntiga.data_hora_iso !== tarefa.data_hora_iso;
     if (dataMudou) {
       await cancelarAlarme(tarefa.alarme_companion_slug);
       await agendarAlarme(tarefa.alarme_companion_slug, tarefa.data_hora_iso);
     }
   }
   ```
3. Garantir que `cancelarAlarme` é idempotente (se id não existe no
   `expo-notifications`, swallow erro).
4. Remover comentário `TODO M30:` em `tarefas.ts:284`.
5. Caso de teste em `tests/lib/vault/tarefas-reagendar.test.ts`:
   - cria tarefa com alarme em data X.
   - edita data para Y.
   - assert `cancelarAlarme(slug)` chamado 1x e `agendarAlarme(slug, Y)` chamado 1x.

## 7. Verificação

Smoke + tsc + testes.

## 8. Commit

```
fix: m-audit-migue-tarefa-alarme-reagendar fecha todo m30
```

## 9. Checkpoint visual

Não requer PNG novo (sprint sem mudança de UI).

### Checklist

- [ ] `STATE.md` atualizado.
- [ ] `CHANGELOG.md` atualizado.
- [ ] Comentário `TODO M30` em `tarefas.ts:284` removido (verificável via grep).

## 10. Dúvidas em aberto

Nenhuma.
