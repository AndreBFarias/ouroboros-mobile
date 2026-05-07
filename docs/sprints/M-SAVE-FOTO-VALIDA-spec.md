# Sprint I-FOTO — M-SAVE-FOTO-VALIDA

```
DEPENDE:    H1, H2, H3
BLOQUEIA:   [BUILD APK PREVIEW], I-EVENTO (foto opcional em evento)
ESTIMATIVA: ~2h (mais complexo: ImagePicker + copy SAF + race fix)
STATUS:     [todo]
```

> Segue padrão `_TEMPLATE-SAVE-FEATURE.md` + race fix de BottomSheet.

## §1 Achado

Crash ao tocar FAB+ verde → MenuCapturaVerde → "Foto". Possíveis causas:

1. URI corrupta (parcialmente coberta por H1).
2. URI temp do `expo-image-picker` expira antes do `copyAsync` para Vault.
3. BottomSheet do MenuCapturaVerde fecha antes do save terminar (race).
4. Permissão CAMERA não concedida em runtime.

## §2 Tarefa

- **Lógica**: `src/lib/midia/capturarFoto.ts` (ou criar se não existe) —
  fluxo: pedir permissão (se já em J1, ignora) → ImagePicker abre →
  retorna URI temp → COPY para `<ext>/foto-YYYY-MM-DD-rand.<ext>` (jpg ou
  png conforme detecção) → criar companion `markdown/foto-YYYY-MM-DD-rand.md`
  → fechar BottomSheet APÓS save terminar.
- **Race fix**: setState do BottomSheet `aberto: false` SÓ depois de
  `await copyFotoToVault()` resolver (não no `onPress` síncrono).
- **Caller**: `src/components/chrome/MenuCapturaVerde.tsx` — handler
  do item "Foto" usa try/catch+timeout.
- **Tests**: `tests/lib/midia/capturarFoto.test.ts` — mock ImagePicker
  retornando URI temp + verificar copy + companion criado.
- **E2E**: `tests/e2e/playwright/m-save-foto.e2e.ts` — Gauntlet com
  ImagePicker mockado.
- **Screenshots**: `A-foto-bottomsheet-aberto.png`, `A-foto-salva.png`.

## §3 Restrições

(Padrão + race fix obrigatório.)

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="(capturarFoto|midia)"
```

## §5 Validação adb

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding + permissão CAMERA concedida em J1.
# FAB+ verde → "Foto" → tirar foto da câmera → confirmar.
adb shell run-as com.ouroboros.mobile ls /sdcard/Documents/Ouroboros/jpg/foto-*.jpg
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/foto-*.md
# Companion .md deve apontar para `../jpg/foto-YYYY-MM-DD-rand.jpg`.
```

## §6 Commit

```
feat: i-foto save foto valida bottomsheet race + companion + e2e
```

## §7 Decisões

- **BottomSheet fecha DEPOIS do save**: garante que se save falhar,
  usuário pode reagir. Custo: BottomSheet fica aberto ~1-2s. Aceito.
- **Companion .md em pasta separada (markdown/)**: parte do ADR-0023.
- **JPG vs PNG detectado por mimeType**: cada uma na pasta correta.
