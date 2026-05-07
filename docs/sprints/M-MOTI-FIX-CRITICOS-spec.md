# Sprint N2 — M-MOTI-FIX-CRITICOS

```
DEPENDE:    N1 (output do audit)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~3-5h variável (depende N1 output)
STATUS:     [todo]
```

## §1 Achado

N1 produziu lista priorizada de 38 motis. Esta sprint migra **APENAS
os de risco ALTO** (provavelmente 5-10) para Reanimated puro,
seguindo padrão estabelecido em A28 (`FrameAnim` em
`app/onboarding.tsx`).

M-BUNDLE-DIET-MOTI-REPLACE (16-21h) continua descopada para v1.1
para os de risco baixo/médio.

## §2 Tarefa

Para cada componente identificado em N1 como risco ALTO:

1. **Substituir `<MotiView from animate transition>` por
   `<Animated.View style>`** com:
   - `useSharedValue` para cada prop animada.
   - `useEffect` que dispara `withSpring` no mount.
   - `useAnimatedStyle` que lê os shared values.

2. **Padrão canônico** (igual ao A28 em `app/onboarding.tsx:198-225`):

   ```tsx
   import Animated, {
     useSharedValue,
     useAnimatedStyle,
     withSpring,
   } from 'react-native-reanimated';

   const opacity = useSharedValue(0);
   const translateX = useSharedValue(60);

   useEffect(() => {
     opacity.value = withSpring(1, { damping: 18, stiffness: 200 });
     translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
   }, []);

   const style = useAnimatedStyle(() => ({
     opacity: opacity.value,
     transform: [{ translateX: translateX.value }],  // sempre array em native
   }));

   return <Animated.View style={style}>...</Animated.View>;
   ```

3. **Remover import `from 'moti'`** se foi o único uso no arquivo.

4. **Testes**: snapshot tests podem mudar — atualizar `-u`.

5. **Commit incremental** por componente migrado (1 PR por commit).

## §3 Restrições

- Anonimato.
- TS strict 0 erros.
- Springs canônicos (`damping 18, stiffness 200`) — alinha com A28.
- Visual idêntico antes/depois (validar Gauntlet).
- **Não migrar componentes de risco baixo/médio** — descopados para
  v1.1.

## §4 Verificação

```bash
npm test --silent
./scripts/smoke.sh
./scripts/check_gauntlet_leak.sh
```

## §5 Validação Gauntlet

Para cada componente migrado:
- PNG ANTES (commit anterior, moti)
- PNG DEPOIS (este commit, Reanimated puro)
- Comparação visual: animação preserva intent.

## §6 Commit

```
fix: n2 moti fix criticos migra <N> componentes para reanimated puro
```

(`<N>` = quantidade real migrada)

## §7 Decisões

- **Não migrar todos os 38 preventivamente**: trade-off custo (16-21h)
  vs benefício (eliminar risco residual). Decisão dono 2026-05-06:
  fixar críticos + field test detecta resto.
- **Padrão A28 reusado**: consistência + manutenibilidade.
