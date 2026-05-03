# Sprint M27 — MenuLateral substitui bottom tabs e FABRadial

```
DEPENDE:    M26 (rotas modais funcionam com Screen opaco)
BLOQUEIA:   M28 (varredura de identidade ocorre depois da
            estrutura final), M36 (Recap precisa de item no menu),
            M37 (Calendar precisa de item no menu)
ESTIMATIVA: 6-7h
```

## 1. Objetivo

Substituir a navegação atual (bottom tabs + FAB radial à direita) por
**menu lateral único** acionado por FAB **purple à esquerda**. O menu
contém 3 seções: **Ver** (Hoje/Recap/Memórias/Humor/Calendário/
Finanças), **Registrar** (6 ações de captura) e **Opcionais**
(Tarefas/Alarmes/Contadores/Ciclo). Settings no rodapé.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuLateral.tsx`
  — drawer custom (não `@react-navigation/drawer`):
  - Animação: `<MotiView from={{ translateX: -300 }} animate={{
    translateX: aberto ? 0 : -300 }} transition={springs.default}>`.
  - Backdrop tap-close em `<Pressable absolute fill bg-black-50%>`.
  - Conteúdo interno scrollable (`<ScrollView>`).
  - Header: avatar pessoa ativa (foto + nome via `nomeDe`) + chip
    alternar pessoa se duo.
  - 3 seções com header micro-orange.
  - Rodapé fixo: link Settings.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/FABMenu.tsx`
  — FAB redondo 72dp purple no canto inferior **esquerdo**:
  - Position: `absolute`, `left: spacing.lg`, `bottom: spacing.xl`.
  - Ícone Menu (`lucide-react-native`).
  - `onPress`: abre `<MenuLateral>` via state global ou prop drilling.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/navegacao.ts`
  — store leve para abrir/fechar menu:
  ```ts
  interface NavegacaoState {
    menuAberto: boolean;
    abrir: () => void;
    fechar: () => void;
    alternar: () => void;
  }
  ```
  Não persistido (estado runtime).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/chrome/MenuLateral.test.tsx`
  — 3 seções renderizadas, items condicionais conforme
  `featureToggles`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/chrome/FABMenu.test.tsx`
  — FAB renderiza à esquerda, abre menu ao tocar.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — wrapper raiz renderiza:
  ```tsx
  <Stack> ... </Stack>
  <MenuLateral />     {/* fora da Stack, overlay global */}
  <FABMenu />         {/* fora da Stack, sempre visível em rotas não-modais */}
  ```
  FABMenu deve esconder em rotas modais (`/onboarding`,
  `/share-receive`, `/humor-rapido`, etc.) — usar `usePathname()`.
- **Mover** todos os arquivos `app/(tabs)/<rota>.tsx` para `app/<rota>.tsx`.
  **Nota factual**: `app/index.tsx` standalone NÃO existe hoje — a
  rota `/` resolve via `app/(tabs)/index.tsx`. O `git mv` cria o
  arquivo na raiz, sem merge.
  - `app/(tabs)/index.tsx` → `app/index.tsx` (cria arquivo na raiz).
  - `app/(tabs)/memoria.tsx` → `app/memoria.tsx`.
  - `app/(tabs)/humor.tsx` → `app/humor.tsx`.
  - `app/(tabs)/financas.tsx` → `app/financas.tsx`.
  - `app/(tabs)/calendario.tsx` → `app/calendario.tsx`.
  - `app/(tabs)/em-construcao.tsx` → `app/em-construcao.tsx`.
- **Mover** subgrupos `app/(tabs)/<grupo>/` para `app/<grupo>/` —
  cada subgrupo carrega seu `_layout.tsx` interno junto no `git mv`
  da pasta inteira; expo-router resolve `_layout.tsx` por diretório
  filho, então a casca interna continua funcionando sem edição:
  - `app/(tabs)/settings/` → `app/settings/` (inclui `_layout.tsx`,
    `index.tsx`, `editar-pessoa.tsx`, `adicionar-segunda-pessoa.tsx`).
  - `app/(tabs)/exercicios/` → `app/exercicios/` (inclui `_layout.tsx`,
    `index.tsx`, `novo.tsx`, `[slug]/`).
  - `app/(tabs)/medidas/` → `app/medidas/` (inclui `_layout.tsx`,
    `index.tsx`, `novo.tsx`).
  - `app/(tabs)/alarmes/` → `app/alarmes/` (inclui `_layout.tsx`,
    `index.tsx`, `novo.tsx`, `[slug].tsx`).
  - `app/(tabs)/contadores/` → `app/contadores/` (inclui `_layout.tsx`,
    `index.tsx`, `novo.tsx`, `[slug].tsx`).
  - `app/(tabs)/ciclo/` → `app/ciclo/` (inclui `_layout.tsx`,
    `index.tsx`, `registrar.tsx`).
  - `app/(tabs)/todo.tsx` → `app/todo.tsx` (arquivo único).
- **Apagar** `app/(tabs)/_layout.tsx` (Tabs Navigator) — não mais
  necessário.
- **Apagar** `src/components/chrome/BottomTabs.tsx` — substituído
  por `<MenuLateral>`.
- **Apagar** `tests/components/chrome/BottomTabs.test.tsx`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/index.tsx`
  — remover `<FABRadial>` (substituído por `<FABMenu>` global).
  Manter restante.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/navigation/captureRoutes.ts`
  — atualizar paths que tinham `(tabs)`: `/(tabs)/exercicios/novo`
  → `/exercicios/novo`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/navigation/rotasSemFAB.ts`
  — **NOVO** arquivo, lista canônica das rotas onde `<FABMenu>`
  deve sumir (vide CONTRACT §7.10):
  ```ts
  export const ROTAS_SEM_FAB = [
    '/onboarding',
    '/share-receive',
    '/humor-rapido',
    '/diario-emocional',
    '/eventos',
    '/scanner',
    '/recap',                    // M36 (cria a rota; FAB sumir já)
    // '/_components' fica VISIVEL com FAB para validacao (storybook dev)
  ] as const;
  export function rotaEsconderFAB(pathname: string): boolean {
    return ROTAS_SEM_FAB.some(r => pathname === r || pathname.startsWith(r + '/'));
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/index.ts`
  — exportar `useNavegacao`.
- **Remover import de `<FABRadial>`** em `app/index.tsx` (após
  remover uso no JSX) para evitar warning ESLint
  `unused-imports/no-unused-imports`. Se houver outros imports
  pendurados em barrel `@/components/ui` que ficam órfãos, limpar
  na mesma sprint.

### Arquivos NÃO modificados

- `<FABRadial>` em `src/components/ui/FABRadial.tsx` — fica como
  componente UI puro disponível mas não mais usado nas telas. Pode
  ser removido em sprint futura se não houver uso novo.

## 3. APIs reutilizáveis

- `useSettings.featureToggles` — controla quais items das "Opcionais"
  mostrar.
- `usePessoa.nomes` + `nomeDe` — nome no header.
- `<PersonAvatar>` — header.
- `useRouter` para navegação ao tocar item.
- `routeForCapture` (em `captureRoutes.ts`) — paths das 6 ações de
  captura.
- `springs` em `src/lib/motion.ts`.
- `usePathname()` do expo-router para detectar rotas modais.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Layout raiz:** `app/_layout.tsx` — adiciona overlays
  `<MenuLateral>` + `<FABMenu>`.
- **Apaga** `app/(tabs)/_layout.tsx` e `BottomTabs.tsx` (decisão
  estrutural — refundação).
- **Move** todas as rotas de `(tabs)` para raiz (ainda registradas
  pelo expo-router file-based; rotas continuam funcionando, apenas
  sem o navigator de tabs).
- **Stores:** `useNavegacao` novo no barrel.
- **`captureRoutes.ts`:** paths atualizados.

**Bump:** `INTEGRATION-CONTRACT.md` versão 1.1 — seção 1.1 reescrita
para refletir menu lateral em vez de tabs.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded. Nomes via
  `nomeDe()`.
- Sentence case + acentuação PT-BR completa em labels.
- `accessibilityLabel` sem acento.
- TS strict.
- FAB principal deve esconder em rotas onde é distrativo — lista
  canônica em `src/lib/navigation/rotasSemFAB.ts` (criada nesta
  sprint, vide CONTRACT §7.10). `app/_layout.tsx` consome via
  `rotaEsconderFAB(usePathname())`.
- Não regredir testes existentes — **buscar todos os testes que
  referenciam `(tabs)`** com `grep -rn "(tabs)" tests/` e
  atualizar paths um a um.
- Drawer abre da **esquerda** (não direita).
- **z-index/overlay order obrigatório** (vide CONTRACT §7.10):
  `<Stack>` 0 → `<FABMenu>` 10 → `<MenuCapturaVerde>` 11 (M34)
  → `<MenuLateral>` 20 → `<BiometriaGate>` 30 → `<ToastProvider>`
  40. Declarar `zIndex` explícito nos style do `<MenuLateral>`,
  `<FABMenu>` para evitar surpresa.
- **Armadilha A18 preservada** após mover rotas modais: as 4
  rotas modais (`humor-rapido`, `diario-emocional`, `eventos`,
  `scanner`) já estão dentro de `<Screen padded={false}>` desde
  M26. M27 **não pode regredir essa garantia** ao mover/registrar
  rotas no `app/_layout.tsx`. Verificar `presentation:
  'transparentModal'` + `contentStyle: { backgroundColor: '#14151a' }`
  para cada uma.
- **Mock de `useSettings` nos testes** (vide CONTRACT §7.8):
  `MenuLateral.test.tsx` mockia `useSettings` retornando
  `{ featureToggles: { todoLeve, contadorDiasSem, alarmePessoal,
  cicloMenstrual, calendarioConquistas } }` em variantes
  on/off para testar render condicional da seção Opcionais.

## 5. Procedimento sugerido

1. **Mover arquivos** (com `git mv`):
   ```bash
   git mv 'app/(tabs)/index.tsx' app/index.tsx
   git mv 'app/(tabs)/memoria.tsx' app/memoria.tsx
   # etc para cada arquivo e grupo
   git rm 'app/(tabs)/_layout.tsx'
   ```
2. Atualizar imports em arquivos afetados (paths novos).
3. Apagar `BottomTabs.tsx` + teste.
4. Criar `useNavegacao` store leve.
5. Criar `FABMenu` componente.
6. Criar `MenuLateral` componente. **6 itens completos da seção
   "Registrar"** (cruzados com `captureRoutes.ts`):
   ```tsx
   const items = useMemo(() => [
     { secao: 'Ver', items: [
       { label: 'Hoje', icone: Home, route: '/' },
       { label: 'Recap', icone: BarChart, route: '/recap' },
       { label: 'Memórias', icone: Layers, route: '/memoria' },
       { label: 'Humor', icone: Heart, route: '/humor' },
       { label: 'Calendário', icone: Calendar, route: '/calendario' },
       { label: 'Finanças', icone: Wallet, route: '/financas' },
     ]},
     { secao: 'Registrar', items: [
       { label: 'Humor', icone: Heart, color: pink, route: routeForCapture('humor') },
       { label: 'Voz', icone: Mic, color: cyan, route: routeForCapture('voz') },
       { label: 'Câmera', icone: Camera, color: orange, route: routeForCapture('camera') },
       { label: 'Exercícios', icone: Dumbbell, color: green, route: routeForCapture('exercicio') },
       { label: 'Conquista', icone: Trophy, color: yellow, route: routeForCapture('vitoria') },
       { label: 'Crise', icone: AlertTriangle, color: red, route: routeForCapture('trigger') },
     ]},
     { secao: 'Opcionais', items: [
       featureToggles.todoLeve && { label: 'Tarefas', icone: ListChecks, route: '/todo' },
       featureToggles.alarmePessoal && { label: 'Alarmes', icone: BellRing, route: '/alarmes' },
       featureToggles.contadorDiasSem && { label: 'Contadores', icone: Hash, route: '/contadores' },
       featureToggles.cicloMenstrual && { label: 'Ciclo', icone: Moon, route: '/ciclo' },
     ].filter(Boolean) },
   ], [featureToggles, nomes]);
   ```
7. Atualizar `app/_layout.tsx`:
   - Render overlays na ordem de zIndex declarada (vide
     restrição §4 e CONTRACT §7.10).
   - Esconder FAB consumindo `rotaEsconderFAB(usePathname())`.
   - **Verificar** que cada `<Stack.Screen>` modal tem
     `presentation: 'transparentModal'` +
     `contentStyle: { backgroundColor: '#14151a' }` (A18).
8. Atualizar `app/index.tsx`: remover `<FABRadial>` E remover
   import órfão.
9. Atualizar `captureRoutes.ts` paths.
10. **Buscar grep `(tabs)`** em `tests/` e `src/components/`:
    ```bash
    grep -rn "(tabs)" tests/ src/components/ | grep -v node_modules
    ```
    Para cada hit: trocar `(tabs)/X` por `X` direto. Conferidos
    canonicamente em M27-spec ao menos: `src/components/settings/LinkSubTela.tsx`,
    `src/components/exercicios/CardGaleria.tsx`,
    `tests/lib/navigation/captureRoutes.test.ts`,
    `tests/app/memoria.test.tsx`, `tests/app/settings/index.test.tsx`.
11. Bump `INTEGRATION-CONTRACT.md` para v1.1 (já feito na
    materialização inicial; só verificar §1.1 atualizada).
12. Rodar todos os testes; corrigir paths quebrados.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m27-export && rm -rf /tmp/m27-export

# Manual web:
./run.sh --web
# Confirmar:
#   - Sem bottom tabs visíveis
#   - FAB purple no canto inferior esquerdo
#   - Tap no FAB: menu lateral abre da esquerda
#   - 3 seções renderizadas com items
#   - Tap em item: navega corretamente
```

## 7. Commit

```
refactor: m27 menu lateral substitui bottom tabs e fab radial
```

## 8. Checkpoint visual

5 screenshots Nível A em `docs/sprints/M27-screenshots/`:
- `A-fab-esquerda.png` — FAB purple à esquerda na Home.
- `A-menu-aberto.png` — MenuLateral aberto com 3 seções.
- `A-secao-ver.png` — destaque da seção Ver.
- `A-secao-registrar.png` — destaque da seção Registrar.
- `A-secao-opcionais.png` — destaque com features ativadas.

## 9. Decisões tomadas

- **Drawer custom em vez de `@react-navigation/drawer`**: zero dep
  nova, animação Moti consistente com resto do app, integração com
  `useNavegacao` store leve para controle.
- **`featureToggles` continuam controlando "Opcionais"**: sprint
  M29 vira defaults para ON, mas a lógica condicional permanece.
- **FABRadial.tsx fica órfão**: import removido em `app/index.tsx`
  (sem warning lint), arquivo do componente preservado em
  `src/components/ui/FABRadial.tsx` (pode ser removido em sprint
  futura caso nenhum uso surja).
- **Move de `(tabs)/` para raiz**: simplifica file-based routing;
  `app/(tabs)/` group fica vazio e é apagado. Subgrupos
  (`settings/`, `exercicios/`, etc.) movem com seus `_layout.tsx`
  internos no mesmo `git mv` da pasta — expo-router resolve
  `_layout` por diretório filho, casca interna sobrevive sem
  edição.
- **`app/index.tsx` não existe hoje**: `git mv` de
  `(tabs)/index.tsx` cria o arquivo na raiz, sem merge. Nenhum
  arquivo pré-existente para consolidar.
- **FAB esconde em rotas modais**: lista canônica em
  `src/lib/navigation/rotasSemFAB.ts` consumida via
  `rotaEsconderFAB(usePathname())`. Storybook `/_components`
  mantém FAB visível propositalmente para validação.
- **z-index global declarado em CONTRACT §7.10**: padrão para
  qualquer overlay novo.
- **A18 (BRIEF §4) preservada na movimentação de rotas modais**:
  `presentation: 'transparentModal'` +
  `contentStyle: { backgroundColor: '#14151a' }` aplicado em cada
  `<Stack.Screen>` modal de `app/_layout.tsx`.
- **Bump CONTRACT v1.1**: registra mudança estrutural de
  navegação (já realizado na materialização).

Sprint pronta para execução sem perguntas pendentes.
