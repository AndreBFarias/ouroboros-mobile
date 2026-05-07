# Sprint I-DEVICES-INDEX — M-SAVE-DEVICES-INDEX-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1h
STATUS:     [todo]
```

> Padrão template.

## §1 Achado

Boot hook `atualizarDeviceIndex` (M38) atualiza `inbox/_devices.md`
com deviceId atual a cada boot. Path muda em H2 para
`markdown/_devices.md`.

## §2 Tarefa

- **Writer**: `src/lib/vault/devicesIndex.ts` — `vaultUriJoin`. Path
  `markdown/_devices.md`.
- **Boot hook**: `src/lib/boot/atualizarDeviceIndex.ts` continua
  plugado em `BOOT_HOOKS`.
- **Tests**: `tests/lib/vault/devicesIndex.test.ts` — primeiro boot
  cria, boot subsequente atualiza `ultima_atividade`, idempotência.
- **E2E**: pular (boot hook não é UI).
- **Screenshot**: `A-devices-index-md.png` (settings/dispositivos
  populando).

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
adb shell am start -n com.ouroboros.mobile/.MainActivity
# Aguardar boot. Settings → Dispositivos.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/_devices.md
```

## §6 Commit

```
feat: i-devices-index path por tipo + idempotente
```

## §7 Decisões

- **`_devices.md` em `markdown/` com underscore prefix**: padrão Obsidian
  para arquivos "system" (não-feature). Continua na lista plana com
  filtro por filename.
