# ADR 0006 — Stack Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Precisamos escolher entre 3 caminhos:

1. Kotlin/Compose nativo
2. Capacitor + Svelte (web em webview)
3. React Native + Expo (nativo via JS bridge)

Dev é cientista de dados, vem de Python. Não é dev mobile e não vai
manter código nativo. Estética é prioridade alta. Ecossistema com muito
material de treino para LLMs ajudarem futuramente é crítico.

## Decisão

**Expo + React Native** com:

- nativewind 4 (Tailwind classes)
- moti (animações declarativas com spring)
- react-native-reanimated 3 (motor de animação 60fps na UI thread)
- gluestack-ui (primitivos com física nativa pré-configurada)
- @gorhom/bottom-sheet (sheets premium com gestos)
- expo-haptics (vibração sutil)

## Rationale

| Critério | Expo + RN | Capacitor + Svelte | Kotlin Compose |
|----------|-----------|---------------------|------------------|
| Build no terminal | sim, expo go zero-build | sim | precisa AS |
| Hot reload | <1s | <2s | recompile completo |
| Performance | nativa real, 60fps | webview, ok | melhor |
| Animações premium | reanimated nativa | CSS transitions | compose animation |
| Gestos fluidos | nativos | emulados | nativos |
| Haptics nativos | sim | limitado | sim |
| Ecossistema LLM ajuda | excelente | bom | médio |
| Curva para dev web | baixa | mínima | alta |
| Codebase reutilizável | RN web ou expo web | sim, PWA direto | não |

## Consequências

### Positivas

- Dev cientista de dados consegue pedir ajuda de qualquer LLM com alta taxa de acerto
- Expo Go elimina fricção de build no Pop!_OS
- Componentes premium (gluestack, gorhom, moti) entregam visual nativo de qualidade
- Migração futura para nativo possível mantendo schemas como contrato

### Negativas

- Bundle 4-6MB maior que nativo — irrelevante em 2026
- Algumas features (ML Kit, voice) exigem dev-client em vez de Expo Go puro — solucionável com `expo-dev-client`
