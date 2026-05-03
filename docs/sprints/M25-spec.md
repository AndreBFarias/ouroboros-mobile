# Sprint M25 — OuroborosLogo + OuroborosLoader (SVG nativo animado)

```
DEPENDE:    M24 (sessao store opcional para detectar boot)
BLOQUEIA:   M26 (sheets opacas usam loader como fundo)
            M36 (Recap usa loader durante agregação)
            M37 (Calendar usa loader durante OAuth)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Criar componente React Native do logo Ouroboros animado (cobra
mordendo a cauda em SVG nativo com 4 anéis rotacionando em velocidades
diferentes), reutilizável como splash de boot, loader em telas pesadas
e marca de loja em onboarding/Settings. Substitui `assets/splash.png`
estático por componente animado real.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/brand/OuroborosLogo.tsx`
  — versão estática. Props:
  ```ts
  interface OuroborosLogoProps {
    tamanho?: number;       // default 320
    mostrarTexto?: boolean; // default true
  }
  ```
  Implementa fielmente o SVG de
  `versão desktop/ouroboros-redesign-v1/index.html` (linhas 110-194):
  - viewBox 320x320.
  - `<LinearGradient id="og1">` purple→pink.
  - `<RadialGradient id="og-glow">` purple 22% → 0%.
  - 4 grupos: ambient glow, outer dotted orbit, inner flow ring,
    main snake (4 arcos).
  - Cabeça com mandíbula superior/inferior + olho + língua bífida.
  - Wordmark "OUROBOROS" + "PROTOCOLO" (apenas se `mostrarTexto`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/brand/OuroborosLoader.tsx`
  — versão animada. Props:
  ```ts
  interface OuroborosLoaderProps {
    tamanho?: number;     // default 320
    compacto?: boolean;   // default false (96px sem texto)
  }
  ```
  Aplica 4 animações Reanimated 4 via `useSharedValue` +
  `withRepeat(withTiming(360, { duration }))`:
  - `gs-1` (snake principal): 90s linear.
  - `gs-2` (orbit dotted): 60s reverso.
  - `gs-3` (inner flow ring): 30s linear.
  - `gs-flow` (stroke-dashoffset): 6s linear.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/brand/index.ts`
  — barrel.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/brand/OuroborosLogo.test.tsx`
  — snapshot do SVG estático.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/brand/OuroborosLoader.test.tsx`
  — render + valor inicial das shared values.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — substituir `if (!loaded) return null;` por boot screen renderizando
  `<OuroborosLoader />` em fundo `bg-page`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/onboarding.tsx`
  — Frame 2 "Tudo pronto" troca placeholder ActivityIndicator (de M23)
  por `<OuroborosLoader compacto />`.

### Arquivos NÃO modificados

- `assets/splash.png` — mantém como fallback enquanto Expo splash
  nativa carrega antes do bundle JS.

## 3. APIs reutilizáveis

- `react-native-svg` — `<Svg>`, `<Circle>`, `<Path>`, `<G>`,
  `<LinearGradient>`, `<RadialGradient>`, `<Stop>`, `<Ellipse>`,
  `<Text>`, `<Defs>`. Já presente como dep transitiva (Lucide).
- `react-native-reanimated` 4.x — `useSharedValue`, `useAnimatedProps`,
  `withRepeat`, `withTiming`, `Easing.linear`, `cancelAnimation`.
  Já presente.
- `colors` em `src/theme/tokens.ts`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Componentes nova pasta:** `src/components/brand/` é nova
  categoria (até agora tinha `ui/`, `chrome/`, `data/`,
  `screens/` etc.). Adicionar barrel.
- **Boot hook:** seção 1.7 — boot screen no `app/_layout.tsx`.

## 4. Restrições

- **Regra −1**: SVG não contém texto fora do wordmark
  "OUROBOROS"/"PROTOCOLO" (que são ok — não são nomes de pessoas
  nem IA).
- Sem acentuação no SVG `<Text>` (acessibilidade screen reader).
- TS strict.
- Cores via `colors` tokens (purple, pink, cyan, bg, fg). Hex
  literais do SVG original (`#bd93f9`, `#ff79c6`, `#8be9fd`,
  `#0e0f15`, `#c77ab0`, `#f8f8f2`) batem com tokens.
- Reanimated `useAnimatedProps` (não `useAnimatedStyle`) para SVG —
  styles em SVG props não funciona bem.
- `cancelAnimation` no cleanup do `useEffect` para evitar leak.

## 5. Procedimento sugerido

1. Copiar SVG do `versão desktop/ouroboros-redesign-v1/index.html`
   linhas 110-194.
2. Converter cada `<g class="gs-1">` para `<G>` do react-native-svg.
3. Substituir `<linearGradient>` HTML por `<LinearGradient>` RN-SVG.
4. Implementar `OuroborosLogo` (estático) primeiro. Validar com
   snapshot test.
5. Implementar `OuroborosLoader` aplicando animações:
   ```tsx
   const rotacaoG1 = useSharedValue(0);
   useEffect(() => {
     rotacaoG1.value = withRepeat(
       withTiming(360, { duration: 90000, easing: Easing.linear }),
       -1, false
     );
     return () => cancelAnimation(rotacaoG1);
   }, []);

   // ATENCAO (Patch 3 do planejador): RN-SVG nao aceita
   // `transform: [{ rotate: ... }]` em <G> via useAnimatedProps.
   // Usar `rotation` numerico + `originX`/`originY` para girar
   // em torno do centro do viewBox (160, 160 quando viewBox=320x320).
   const animatedPropsG1 = useAnimatedProps(() => ({
     rotation: rotacaoG1.value,
     originX: 160,
     originY: 160,
   }));
   ```
6. Repetir para gs-2 (60s reverso → `withTiming(-360, ...)`), gs-3
   (30s), gs-flow (stroke-dashoffset oscilante).
7. Atualizar `app/_layout.tsx` boot screen.
8. Atualizar `app/onboarding.tsx` Frame 2.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m25-export && rm -rf /tmp/m25-export

# Manual no Chrome web:
./run.sh --web
# Abrir http://localhost:19006 -> deve mostrar OuroborosLoader animado
# durante boot. Onboarding Frame 2 também usa.
```

## 7. Commit

```
feat: m25 ouroboros logo e loader svg nativo animado
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M25-screenshots/`:
- `A-loader-boot.png` — boot screen com loader.
- `A-loader-compacto.png` — modo compacto (96px sem texto).
- `A-logo-estatico.png` — versão estática.

Validar com `claude-in-chrome` MCP que a animação de fato roda
(capturar 2 screenshots com 1s de diferença e comparar rotação).

## 9. Decisões tomadas

- **react-native-svg em vez de Lottie**: zero dep nova, reaproveita
  o engine nativo. Lottie traria 2-3 MB no bundle.
- **4 animações independentes**: bate fielmente com o desktop
  original. Reanimated 4 lida bem com 4 shared values em paralelo.
- **`compacto` mode = 96px sem texto**: para overlays e loaders
  inline. Boot screen e Onboarding usam tamanho cheio (320px com
  texto).
- **Substituir `assets/splash.png`**: a splash nativa do Expo carrega
  PNG antes do bundle JS; `OuroborosLoader` aparece logo depois,
  durante carregamento de fontes (~500ms-1s). M41 (release final)
  pode regenerar PNG estático a partir de screenshot do
  componente para a splash inicial parecer já com o frame 0 do
  loader.
- **Animações em loop infinito**: `withRepeat(..., -1, false)` —
  velocidade constante, sem pause.

## 10. Patches absorvidos do planejador (M25 patch-pass 1)

### 10.1 Mock SVG do `jest.setup.cjs` (obrigatório, §7.8)

O mock atual de `react-native-svg` em `jest.setup.cjs` linhas 87-112
cobre `Svg/Circle/Path/G/Text/Defs/LinearGradient/Stop`, mas a spec
usa `<RadialGradient>` (id `og-glow`) e `<Ellipse>` (head dome). Sem
adicionar os stubs o snapshot quebra com `RadialGradient is not
defined`. Conforme INTEGRATION-CONTRACT §7.8 a sprint dona adiciona
o mock no mesmo commit:

```js
// dentro do return do jest.mock('react-native-svg', ...)
RadialGradient: stub('RadialGradient'),
Ellipse: stub('Ellipse'),
```

### 10.2 Decisão §7.9 — boot screen NÃO é BOOT_HOOK

O gate de fontes já é `useEffect` direto em `app/_layout.tsx`
(linhas 64-68). A boot screen substitui o `if (!loaded) return null;`
por uma View com `<OuroborosLoader />` — UI bloqueante visível
enquanto fontes carregam, não BOOT_HOOK (§7.9). O loader fica
**dentro** do early return (renderiza UI no lugar do `null`), não
substitui a montagem do Stack.

### 10.3 Fonte do wordmark no SVG `<Text>`

JetBrains Mono carrega via `expo-font` no mesmo `_layout.tsx` que
mostra a boot screen — durante o boot a fonte ainda não está
disponível. Decisão: o `<Text>` SVG do wordmark usa `fontFamily="monospace"`
literal (fallback do sistema). Quando o loader aparece pós-boot
(onboarding, telas pesadas), JetBrains Mono já está pronta — mas
mantemos `monospace` no SVG para consistência. Wordmark "estilizado"
fica reservado a `<Text>` RN nativo fora do SVG (não nesta sprint).

### 10.4 Aritmética de proof-of-work

- Baseline atual: **1103 testes / 126 suites** (commit 95d23dd).
- Sprint adiciona **2 suites novas**:
  - `OuroborosLogo.test.tsx` — snapshot 1 + props (mostrarTexto on/off, tamanho custom) 2 = **3 testes**.
  - `OuroborosLoader.test.tsx` — render 1 + valor inicial das 4 shared values 4 + cleanup com `cancelAnimation` 1 = **6 testes**.
- Esperado pós-sprint: **1112 testes / 128 suites** (+9 testes / +2 suites).
- Arquivos novos: 5. Modificados: 3 (`_layout.tsx`, `onboarding.tsx`,
  `jest.setup.cjs`). Linhas: ~450 (logo ~180 + loader ~220 + tests ~80).

Sprint pronta para execução sem perguntas pendentes.
