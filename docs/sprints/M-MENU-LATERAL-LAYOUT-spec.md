# Sprint K1 — M-MENU-LATERAL-LAYOUT

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~2h
STATUS:     [todo]
```

## §1 Achado

Reportado pelo dono:

1. Botão Configurações no rodapé do drawer **conflita com botões nav
   Android** (3-button + gesture).
2. Animação de slide do drawer balança demais.
3. Scroll position do drawer **perdida ao reabrir**.
4. Padding topo da foto/nome ≠ padding inferior do label "Acesso Rápido".

## §2 Tarefa concreta

1. **Safe area no rodapé**:

   ```tsx
   import { useSafeAreaInsets } from 'react-native-safe-area-context';
   const insets = useSafeAreaInsets();
   const paddingBottomCanonico = Math.max(spacing.xl, screenHeight * 0.10) + insets.bottom;
   ```

   Aplicar em `RodapeSettings` em `MenuLateral.tsx`.

2. **Scroll position persistente**:
   - Adicionar campo `scrollMenuLateralPosition: number` em
     `useNavegacao`.
   - `ScrollView ref + onScroll` salvam offset com debounce 200ms.
   - Ao abrir, `scrollTo({ y: offset, animated: false })` no `useEffect`
     do drawer.

3. **Animação suave**: trocar `springs.default` (damping 18, stiffness
   200) por `springs.subtle` (damping 22, stiffness 220) no MotiView
   de slide. Validar visualmente no Gauntlet.

4. **Paddings simétricos**:
   - Medir no Gauntlet via DOM inspection: padding-top do
     `CabecalhoPessoa` deve ser igual ao padding-bottom do label
     "Acesso Rápido".
   - Aplicar `paddingTop: spacing.xl` (mesmo do paddingBottom do
     label canônico).

## §3 Restrições

- Anonimato.
- Sem regressão em testes.
- Animação preserva intent de "drawer suave" (ADR-010 física natural).

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="MenuLateral"
./scripts/smoke.sh
```

## §5 Validação Gauntlet OU adb

**Gauntlet (Nível A)**: 3 PNGs:
- `A-menu-aberto-topo.png` (drawer aberto, scroll no topo)
- `A-menu-aberto-rolado.png` (drawer scrollado pra baixo)
- `A-menu-reaberto-mesma-posicao.png` (fechou e reabriu, posição preservada)

**adb** validação humana:

```bash
# Abrir drawer, rolar até "Configurações" no fim, fechar drawer.
# Reabrir drawer — esperado: posição igual à última.
# Botão "Configurações" não conflita com botões nav (espaço >= 10% altura).
adb shell wm size  # confirma resolução (ex: 1080x2400)
# Calcular: 2400 * 0.10 = 240px mínimo entre Configurações e bottom.
```

## §6 Commit

```
fix: k1 menu lateral layout safe area + scroll persist + animacao + paddings
```

## §7 Decisões

- **Scroll persiste só na sessão**: `useNavegacao` reseta no boot. Se
  usuário fechar app e reabrir, drawer começa do topo.
- **`springs.subtle`**: alinha com ADR-010 §2.1 "física acima de tempo".
