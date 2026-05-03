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
- **Mover** todos os arquivos `app/(tabs)/<rota>.tsx` para `app/<rota>.tsx`:
  - `app/(tabs)/index.tsx` → `app/index.tsx` (consolidar com o
    arquivo já existente; o atual `app/(tabs)/index.tsx` substitui
    o `app/index.tsx` original, que é apenas re-export).
  - `app/(tabs)/memoria.tsx` → `app/memoria.tsx`.
  - `app/(tabs)/humor.tsx` → `app/humor.tsx`.
  - `app/(tabs)/financas.tsx` → `app/financas.tsx`.
  - `app/(tabs)/calendario.tsx` → `app/calendario.tsx`.
  - `app/(tabs)/em-construcao.tsx` → `app/em-construcao.tsx`.
- **Mover** subgrupos `app/(tabs)/<grupo>/` para `app/<grupo>/`:
  - `app/(tabs)/settings/` → `app/settings/`.
  - `app/(tabs)/exercicios/` → `app/exercicios/`.
  - `app/(tabs)/medidas/` → `app/medidas/`.
  - `app/(tabs)/alarmes/` → `app/alarmes/`.
  - `app/(tabs)/contadores/` → `app/contadores/`.
  - `app/(tabs)/ciclo/` → `app/ciclo/`.
  - `app/(tabs)/todo.tsx` → `app/todo.tsx`.
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
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/index.ts`
  — exportar `useNavegacao`.

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
- FAB principal deve esconder em rotas onde é distrativo:
  `/onboarding`, `/share-receive`, `/humor-rapido`,
  `/diario-emocional`, `/eventos`, `/scanner`, `/recap` (M36).
- Não regredir testes existentes — atualizar paths se algum teste
  referenciava `/(tabs)/...`.
- Drawer abre da **esquerda** (não direita).

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
6. Criar `MenuLateral` componente:
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
       { label: 'Humor', icone: Heart, color: pink, route: '/humor-rapido' },
       { label: 'Voz', icone: Mic, color: cyan, route: '/diario-emocional?modo=audio' },
       // ... 6 totais
     ]},
     { secao: 'Opcionais', items: featureToggles ? [
       { label: 'Tarefas', ... },
       // ... condicionais
     ] : [] },
   ], [featureToggles, nomes]);
   ```
7. Atualizar `app/_layout.tsx`: render overlays + esconder FAB em
   rotas modais.
8. Atualizar `app/index.tsx`: remover `<FABRadial>`.
9. Atualizar `captureRoutes.ts` paths.
10. Bump `INTEGRATION-CONTRACT.md` para v1.1.
11. Rodar todos os testes; corrigir paths quebrados.

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
- **FABRadial.tsx fica órfão**: pode ser removido em sprint futura
  caso nenhum uso surja. Por ora, manter (sem regressões).
- **Move de `(tabs)/` para raiz**: simplifica file-based routing;
  `app/(tabs)/` group fica vazio e é apagado.
- **FAB esconde em rotas modais**: conferido via `usePathname()`.
  Lista hardcoded de rotas modais.
- **Bump CONTRACT v1.1**: registra mudança estrutural de
  navegação.

Sprint pronta para execução sem perguntas pendentes.
