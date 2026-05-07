# Sprint K4 — M-FAB-MENU-SAFE-BOTTOM

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1h
STATUS:     [todo]
```

## §1 Achado

Screenshot 568a5521 (Tela Agenda) mostra o **FAB Menu roxo (esquerdo)
colado no botão de switch app do Android 3-button nav**. Mesmo problema
no FAB+ verde (direito) e em todos os FABs do app.

## §2 Tarefa

1. **Helper** em `src/components/chrome/safeBottom.ts`:

   ```ts
   import { Dimensions } from 'react-native';
   import { spacing } from '@/theme/tokens';

   const PCT_MIN_BOTTOM = 0.10; // 10% da altura

   export function useSafeBottomMargin(safeAreaInsetBottom: number): number {
     const { height } = Dimensions.get('window');
     return Math.max(spacing.xl, height * PCT_MIN_BOTTOM) + safeAreaInsetBottom;
   }
   ```

2. **Aplicar em**:
   - `src/components/chrome/FABMenu.tsx` (esquerdo roxo)
   - `src/components/chrome/MenuCapturaVerde.tsx` (direito verde, FAB+)
   - Qualquer outro FAB com posição absoluta inferior.

3. **Audit grep**:
   ```bash
   grep -rn "position: 'absolute'.*bottom" src/components/ --include="*.tsx" | head -10
   ```
   Garantir que cada FAB consome `useSafeBottomMargin`.

## §3 Restrições

- Anonimato.
- Cálculo runtime (não hardcode 10% = 240px assumindo 2400px altura) —
  `Dimensions.get('window').height` reativo.

## §4 Verificação

```bash
npm test --silent
./scripts/smoke.sh
```

## §5 Validação Gauntlet OU adb

**Gauntlet**: PNG `A-fabs-safe-bottom.png` mostrando 2 FABs com margem
adequada (frame 412×892).

**adb** validação humana em **2 cenários**:
- 3-button nav (Settings → Sistema → Navegação → 3 botões)
- Gesture nav (Settings → Sistema → Navegação → Gestos)

```bash
# Em ambos os cenários:
adb shell am start -n com.ouroboros.mobile/.MainActivity
adb exec-out screencap -p > /tmp/fabs-3button.png  # ou gesture
# Tocar nos FABs — não devem disparar gesto Android (overlap zero).
```

## §6 Commit

```
fix: k4 fabs safe bottom margem 10pct + safe-area-inset
```

## §7 Decisões

- **`Math.max(spacing.xl, 10%)`**: garante mínimo absoluto (24dp) +
  proporcional à altura.
- **Helper compartilhado**: evita duplicação de cálculo em cada FAB.
