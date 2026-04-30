# Sprint M04 — FAB Radial Integrado em Capturas Reais

```
DEPENDE:    M03 fechada (commit b23274a, onboarding 4 frames + identidade dinâmica)
            + M01 (componente <FABRadial> em src/components/ui/)
            + M02 (Vault Bridge, Tela 01)
BLOQUEIA:   M05 (Humor Rápido), M06 (Diário Emocional), M07 (Eventos),
            M06.5 (F-14 Microfone), M09 (Scanner OCR)
ESTIMATIVA: 2-3h
```

## 1. Objetivo

Substituir o toast "FAB radial chega na M04" da Tela 01 (`hoje`) pela
integração real do componente `<FABRadial>` com seus 6 destinos de
captura. Cada uma das 6 ações (`humor`, `voz`, `camera`, `exercicio`,
`vitoria`, `trigger`) passa a navegar via `expo-router` para a rota
correspondente, abrindo o bottom sheet ou tela específica de cada
captura. Esta sprint é a fundação da **Seção C — Captura Ativa** do
BRIEFING (§6, Tela 14): nenhuma captura roda sem ela.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/navigation/captureRoutes.ts`
  — mapa puro `Record<FABRadialKey, RouteDescriptor>` com `path` e
  `params` por ação. Centraliza o roteamento para que telas futuras
  (M05/M06/M07/M06.5/M09) consumam o mesmo contrato. Inclui helper
  `routeForCapture(key)` que retorna `{ pathname, params }` pronto para
  `router.push()`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/navigation/captureRoutes.test.ts`
  — verifica que cada `FABRadialKey` mapeia para um `pathname` não
  vazio, que `vitoria`/`trigger` apontam para `/diario-emocional` com
  `modo` distinto, e que `exercicio` aponta para o stub `/em-breve`.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/index.tsx`
  — remover o callback que mostrava `useToast().show('FAB radial chega
  na M04')`. Substituir por:
  ```tsx
  // captureRoutes resolve cada FABRadialKey para uma rota concreta;
  // exercicio fica como stub ate a sprint M13.
  const onCapture = (key: FABRadialKey) => {
    const route = routeForCapture(key);
    router.push(route);
  };
  ```
  Importar `useRouter` de `expo-router` e `routeForCapture`/`FABRadialKey`
  do novo `@/lib/navigation/captureRoutes`. Manter o componente
  `<FABRadial onSelect={onCapture} />` no mesmo lugar atual.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/em-breve.tsx`
  — nova rota stub que mostra um `<Screen>` simples com `<Header>`
  título "Em breve" laranja e `<EmptyState>` ícone `Hammer` muted-decor
  + frase muted: "Esta captura chega em uma sprint futura.". Usada
  pela ação `exercicio` (Tela 02 só será implementada em M13). Texto
  do botão de voltar via `<Header>` herdado.

> Nota: as rotas `/humor-rapido`, `/diario-emocional`, `/eventos`,
> `/scanner` ainda **não existem** neste momento. Esta sprint
> documenta o contrato delas em `captureRoutes.ts` e usa
> `router.push()` para resolução tardia. Se a rota destino ainda não
> existir, `expo-router` lança warning e cai em `+not-found.tsx`. Para
> evitar UX quebrada nos passos intermediários, M04 adiciona também
> stubs idempotentes de cada rota (descrito abaixo).

### Stubs idempotentes (uma vez só, removidos pelas sprints destino)

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/humor-rapido.tsx`
  — rota stub que renderiza `<Screen>` com `<Header>` "Humor rápido" +
  `<EmptyState>` "Esta captura chega na M05.". M05 substitui pelo
  bottom sheet real.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/diario-emocional.tsx`
  — rota stub. Aceita `useLocalSearchParams<{ modo?: 'trigger' | 'vitoria' | 'audio' }>()`
  e mostra apenas o modo recebido em micro caption muted ("Modo
  recebido: vitoria"), seguido de `<EmptyState>` "Esta captura chega
  na M06 / M06.5.". M06 substitui pelo form real; M06.5 ativa o
  modo `audio`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx`
  — rota stub. `<EmptyState>` "Esta captura chega na M07.".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner.tsx`
  — rota stub. `<EmptyState>` "Esta captura chega na M09 (dev-client).".

Cada stub usa apenas componentes de `@/components/ui` já existentes,
não cria nenhum novo componente nem nova dependência.

## 3. APIs reutilizáveis

Componentes, stores e libs **já existentes** que esta sprint deve
consumir sem reimplementar:

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/FABRadial.tsx`
  — exporta `FABRadial` e o tipo `FABRadialKey =
  'humor'|'voz'|'camera'|'exercicio'|'vitoria'|'trigger'`. Já dispara
  `haptics.light()` no select internamente; nada a refazer.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Screen.tsx`,
  `Header.tsx`, `EmptyState.tsx` — usados pelos stubs.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/index.ts`
  — barrel; importar tudo daqui (`@/components/ui`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/motion.ts`
  — `springs.default`/`springs.subtle` se algum stub precisar de fade
  no `<EmptyState>` (já vem de série no componente).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — não é chamado diretamente nesta sprint; o `<FABRadial>` já o
  consome internamente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — não tocado, mas o `<Header>` dos stubs herda o avatar via
  `usePessoa` indiretamente.
- `expo-router` (`useRouter`, `useLocalSearchParams`, `router.push`).
- `expo-router` file-based routing: arquivos em `app/` viram rotas
  automaticamente (já configurado em M01.1, ver `app/_layout.tsx`).

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013 revogou a regra original de "lowercase intencional"). Ex:
  `"Em breve"`, `"Esta captura chega na M05."`.
- `accessibilityLabel` sem acento (convenção screen reader).
- Comentários em código `.ts`/`.tsx` sem acento (convenção shell/CI).
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
- Imports via alias `@/*` configurado em `tsconfig.json`.
- **Não tocar** em `src/components/ui/FABRadial.tsx` — está fechado
  desde M01 e validado em checkpoint M01.5. Se faltar API, reportar
  como achado, não modificar.
- Não tocar em `src/lib/motion.ts`, `src/lib/haptics.ts`,
  `src/lib/schemas/*`, `src/config/pessoas.config.ts`.
- Stubs em `app/*.tsx` devem ser triviais: nenhum estado novo,
  nenhuma chamada a vault, nenhum schema novo.

## 5. Procedimento sugerido

1. Criar `src/lib/navigation/captureRoutes.ts` com o tipo
   `RouteDescriptor` (`{ pathname: string; params?: Record<string, string> }`)
   e a const `CAPTURE_ROUTES`. Fixar:
   - `humor`     -> `{ pathname: '/humor-rapido' }`
   - `voz`       -> `{ pathname: '/diario-emocional', params: { modo: 'audio' } }`
   - `camera`    -> `{ pathname: '/scanner' }`
   - `exercicio` -> `{ pathname: '/em-breve' }`
   - `vitoria`   -> `{ pathname: '/diario-emocional', params: { modo: 'vitoria' } }`
   - `trigger`   -> `{ pathname: '/diario-emocional', params: { modo: 'trigger' } }`
   Exportar `routeForCapture(key)` que devolve cópia segura.
2. Escrever teste em `tests/lib/navigation/captureRoutes.test.ts`:
   - cobre 6 keys, sem `pathname` vazio, sem `params` vazio quando
     declarado, e que `vitoria.params.modo !== trigger.params.modo`.
3. Criar 5 arquivos stub em `app/`: `em-breve.tsx`, `humor-rapido.tsx`,
   `diario-emocional.tsx`, `eventos.tsx`, `scanner.tsx`. Cada um com
   no máximo 30 linhas, usando `<Screen>`, `<Header>` e
   `<EmptyState>` do barrel.
4. Atualizar `app/index.tsx`:
   - remover handler antigo de toast.
   - importar `useRouter` (`expo-router`) e
     `routeForCapture, FABRadialKey` (`@/lib/navigation/captureRoutes`).
   - cabear `<FABRadial onSelect={(key) => router.push(routeForCapture(key))} />`.
5. Rodar `./scripts/check_anonimato.sh`, `npx tsc --noEmit`,
   `npm test --silent` e `./scripts/smoke.sh`.
6. Verificação Nível A no Chrome web (`./run.sh --web`):
   abrir `http://localhost:19006`, ir até a Tela 01, tocar FAB,
   tocar cada um dos 6 botões em sequência. Confirmar que cada
   tap navega para a rota stub correta com o título correspondente
   ("Em breve" / "Humor rápido" / "Diário emocional" / "Eventos"
   / "Scanner").
7. Commit com a mensagem da seção 7.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m04-export && rm -rf /tmp/m04-export
```

Todos exit 0. Total de testes deve manter ou aumentar (esperado: +3
testes em `tests/lib/navigation/captureRoutes.test.ts`).

## 7. Commit

```
feat: m04 fab radial integrado com 6 rotas de captura
```

## 8. Checkpoint visual

Esta sprint **toca UI** (Tela 01 ganha comportamento real do FAB e
cinco rotas stub novas). Política de 3 níveis (`VALIDATOR_BRIEF.md`
§1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Cobre o tap em cada um dos 6 botões do FAB
  Radial e a navegação para cada stub. Capturar 7 screenshots:
  Tela 01 com FAB fechado, Tela 01 com FAB aberto (overlay 50% +
  6 botões em arco), e 5 telas stub destino (`/em-breve`,
  `/humor-rapido`, `/diario-emocional?modo=vitoria`, `/eventos`,
  `/scanner`).
- **APIs nativas — Nível B (emulador Android):** dispensável nesta
  sprint (não há API nativa nova; haptic já é coberto pelo
  `<FABRadial>` testado em M01.5).
- **Final — Nível C (celular físico):** **só com permissão explícita
  do usuário** ao final da sprint, para validar a sensação real do
  FAB ao ser tocado num device com haptic motor.

Salvar capturas em
`docs/sprints/M04-screenshots/`. Comparar a Tela 01 com o artboard
"tela 14 — fab expandido" de `docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

**Resolvidas pelo humano em 2026-04-29 (antes do dispatch do executor):**

1. **Rotas com params (decisão fechada):** `/diario-emocional` recebe
   `modo=audio|vitoria|trigger` via query string. Idiomático em Expo
   Router v3. M06 implementa o ramo `vitoria`/`trigger`; M06.5
   adiciona `audio`. Esta sprint só documenta o contrato.

2. **Stub explícito "Em breve" para Exercício (decisão fechada):**
   `exercicio` aponta para rota `/em-breve` que renderiza
   `<EmptyState>` com mensagem "Galeria de exercícios chega na M13.".
   Transparência > ilusão de pronto. Quando M13 implementar, a rota
   real substitui o stub.

Sem dúvidas em aberto restantes. Pode executar.
