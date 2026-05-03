# Validação Manual M22-M28 — 2026-05-03

Sessão de validação visual exaustiva do orquestrador (humano + IA),
controlando o navegador via playwright MCP, passando manualmente
pelo onboarding e checando todas as telas das sprints M22-M28.

## Setup

- `./run.sh --web` em background (Expo SDK 54).
- Playwright MCP em viewport 412×892 (mobile-like).
- 12 screenshots em `docs/validacao-manual-2026-05-03/`.

## Telas validadas

| # | Tela | Sprint dona | Status |
|---|---|---|---|
| 01 | Onboarding Frame 1 (nome) | M22 + M23 | OK |
| 02 | Onboarding Frame 2 (companhia) | M23 | OK |
| 03 | Onboarding Frame 3 (tudo pronto, checkmark verde) | M23 + M25 | OK |
| 04 | Home pós-onboarding (3 cards empty + FABMenu) | M27 | OK |
| 05 | MenuLateral aberto (3 seções) | M27 | OK |
| 06 | humor-rapido sheet opaco (cobra atrás) | M26 + M25 | A18 OK / cobra parada |
| 07 | humor-rapido frame 2 (1.5s depois) | M25 | **cobra não anima** |
| 08 | boot screen 320px (cobra full + wordmark) | M25 | wordmark OK / cobra parada |
| 09 | boot screen frame 2 (2s depois) | M25 | **cobra não anima** |
| 10 | reload `/` boot prolongado | — | boot demora ~10s |
| 11 | home após boot lento | M27 | overlay sobrepõe |
| 12 | settings/editar-pessoa (NOME_A via useNomeDe) | M28 | OK |

## ACHADOS BLOQUEANTES

### ACHADO #1 — Animação OuroborosLoader não funciona em web (M25)

**Sintoma**: a cobra não gira em nenhum frame capturado. Posição da
cabeça idêntica entre frames separados por 1.5s e 2s.

**Diagnóstico via DOM**:

- No loader compacto 96px (sheet humor-rapido): o atributo `rotation`
  do `<g>` é atualizado pelo Reanimated 4 (-300.534 → -309.534 em
  1.5s — mudou). MAS `react-native-svg-web` converte `<G rotation={N}
  originX={160} originY={160}>` para `<g transform="rotate(N)">`
  **sem cx/cy**. Sem ponto de origem, a rotação acontece em torno
  de (0,0), jogando o conteúdo pra fora do viewBox visível.
- No loader full 320px (boot screen): `rotation="0"` permanente
  nos 3 grupos animados — `useAnimatedProps` não está sequer
  propagando. Hipótese: o boot screen monta antes de Reanimated
  inicializar runtime web, e o `useEffect` com `withRepeat` só
  dispara após primeira frame que nunca acontece (boot termina
  antes).

**Fix proposto** (sprint M25.1):

```tsx
// src/components/brand/OuroborosLoader.tsx
// SUBSTITUIR:
const animatedPropsG1 = useAnimatedProps(() => ({
  rotation: rotacaoG1.value,
  originX: 160,
  originY: 160,
}));

// POR:
const animatedPropsG1 = useAnimatedProps(() => ({
  transform: `rotate(${rotacaoG1.value} 160 160)`,
}));
```

`react-native-svg` aceita `transform` como string (formato SVG
nativo) e em web converte 1:1 para o `transform` attribute. Em
nativo Android também funciona (RN-SVG faz parse).

**Arquivos a tocar**: `src/components/brand/OuroborosLoader.tsx`
(4 `useAnimatedProps`). Aritmética: 0 testes novos (snapshot tests
existentes podem precisar atualizar). Estimativa: 30min.

### ACHADO #2 — Boot screen lento e sobreposto à Home

**Sintoma**: ao recarregar `/` o boot screen aparece e demora ~10s
até a Home montar. Mesmo após Home aparecer, o screenshot
fullscreen mostra apenas o boot — o loader continua no DOM
sobreposto à Home (mas sem z-index alto detectado — apenas FABMenu
z=10).

**Diagnóstico parcial**:

- `bodyText` após 8s mostra "Hoje / A / Humor do dia / Carregando..."
  — Home está no DOM.
- Único z-index>0 é FABMenu (z=10). Nenhum overlay com z>10.
- Hipótese: o `_layout.tsx` early-return com `<OuroborosLoader />`
  re-renderiza após primeira hidratação, fazendo o loader montar
  e desmontar várias vezes. O screenshot pega o estado de re-paint.

**Fix proposto** (sprint M27.1 — não confundir com bug do M27 em si):

- Investigar `useFonts` em `app/_layout.tsx`: pode estar oscilando
  `loaded=true/false` (já era achado COLAT-01 do executor M28).
- Investigar `BiometriaGate`: timing de `setIsAuthenticated(true)`
  pode estar disparando após render inicial.
- Considerar fade transition entre loader e Stack para evitar
  "flash" de loader sobre Home.

**Arquivos a investigar**: `app/_layout.tsx` (gate fontes + biometria),
`src/components/auth/BiometriaGate.tsx` (se existir). Estimativa:
1-2h investigação + fix.

### ACHADO #3 — useConquistas em web fica preso em loading (já documentado)

Já registrado como COLAT-01 pelo executor M28. Rota `/calendario`
não estabiliza paint em Nível A. `lerConquistas(vaultRoot)` com
`vaultRoot` mock nunca resolve a Promise. Combina com Achado #2.

## ACHADOS POSITIVOS (tudo isso funciona)

- **M22 — Vault auto-criado**: onboarding monta, segue sem SAF.
- **M23 — Onboarding 3 frames**: indicador 3 segmentos, transições
  entre frames, sentence case PT-BR, acentuação completa em todas
  as strings ("começar", "você", "cabeçalho", "alguém", "Vault",
  "configurações").
- **M24 — Resume state e auto-save de rascunhos**: implícito
  funcionando — passei pelo onboarding e ele lembrou.
- **M25 — Componente OuroborosLogo + OuroborosLoader**: RENDER
  correto do glifo em ambos tamanhos (96px compacto e 320px full
  com wordmark). Apenas a animação está quebrada (Achado #1).
- **M26 — 4 rotas modais com Screen opaco**: humor-rapido tem
  fundo Dracula opaco (não preto, A18 resolvido) com OuroborosLoader
  compacto centralizado atrás. BottomSheet em si não monta em web
  (limitação conhecida do gorhom em web).
- **M27 — MenuLateral substitui tabs e FAB radial**: FABMenu purple
  72dp no canto inferior **esquerdo**. Drawer abre da esquerda
  com 3 seções (VER laranja com 6 itens / REGISTRAR laranja com 6
  ícones coloridos / Configurações no rodapé). Backdrop preto à
  direita. Avatar Nome_A no header.
- **M28 — Nomes reais via useNomeDe**: settings/editar-pessoa
  exibe "**NOME_A**" no título uppercase (vem do hook reativo) +
  input pré-preenchido "Nome_A". Defaults genéricos respeitam
  Regra −1.

## Próximos passos

1. Sprint M25.1 (1 spec dedicada) — fix da animação cobra.
2. Sprint M27.1 (1 spec dedicada) — fix do boot screen lento.
3. Continuar M29 → M41 conforme roadmap.
