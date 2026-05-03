# Sprint M-GAUNTLET — Teste visual unificado em Chrome controlável

```
DEPENDE:    M27.1 (boot screen estavel; pre-condicao para validar
            qualquer tela em web sem piscar)
BLOQUEIA:   M29 em diante (qualquer sprint que envolva UI nao pode
            seguir sem este teste; orquestrador precisa validar
            visualmente o que os agentes entregam)
ESTIMATIVA: 6-8h
PRIORIDADE: critica — projeto nao pode seguir sem isto
```

## 1. Contexto e justificativa

Durante a validação manual M22-M28 (2026-05-03), o orquestrador
tentou controlar o app web via playwright MCP e enfrentou 6
limitações estruturais que impedem validação confiável:

1. **`BiometriaGate` redireciona** qualquer rota direta para `/`
   antes do paint, impedindo navegação por URL.
2. **`useFonts` em SDK 54 web oscila** `loaded=true/false`,
   re-montando o boot screen sobre a Home (parcialmente fixado em
   M27.1 caminho A, mas o sintoma residual ainda existe em
   navegação rápida).
3. **`useConquistas` em web com vault mock** trava em
   `loading=true` (fixado em M27.1 caminho C, mas outras rotas
   podem ter padrão similar).
4. **`localStorage` seed** não é lido pelo `zustand persist`
   porque o formato muda entre versões e o adapter web do
   `expo-secure-store` usa chaves diferentes.
5. **`MouseEvent` sintético via `evaluate`** não dispara handlers
   do React-Native-Web — eventos sintéticos especiais só são
   produzidos por `browser_click` com ref fresh, e refs do
   snapshot invalidam a cada re-render do app.
6. **`@gorhom/bottom-sheet` em web** tem limitações de mount;
   sheets aparecem como apenas o backdrop sem conteúdo.

Resultado: tela "piscando sem parar", refs voláteis, navegação
imprevisível, validação visual quase impossível em web. Orquestrador
não consegue confirmar se o que os agentes implementam funciona.

**Decisão (2026-05-03)**: criar uma camada de bypass dev-only que
expõe controle determinístico do app via JS API, com seed síncrono
de stores e rotas dev showcase. **Todos os testes visuais futuros
do orquestrador passam a usar esta interface.**

## 2. Entregáveis

### 2.1 Arquivos novos

#### Módulo central de bypass dev

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/dev/gauntlet.ts`
  — modulo central. Exporta:
  ```ts
  export const GAUNTLET_ATIVO: boolean;  // ler env + plataforma
  export interface GauntletAPI {
    seed(opts?: SeedOpts): void;
    reset(): void;
    setNomes(nomeA: string, nomeB?: string | null): void;
    setVaultRoot(root: string): void;
    setOnboardingDone(done: boolean): void;
    setUltimaRota(rota: string | null): void;
    abrir(rota: string): Promise<void>;
    abrirMenu(): void;
    fecharMenu(): void;
    abrirSheet(rota: 'humor-rapido' | 'diario-emocional' | 'eventos' | 'scanner'): Promise<void>;
    estado(): {
      onboardingDone: boolean;
      vaultRoot: string | null;
      nomes: { pessoa_a: string; pessoa_b: string | null };
      menuAberto: boolean;
      rota: string;
    };
  }
  export function instalarGauntlet(): void;  // anexa em window.__gauntlet
  ```
  - `GAUNTLET_ATIVO` = `Platform.OS === 'web' && process.env.EXPO_PUBLIC_GAUNTLET === '1'`.
  - `seed()`: chama `useOnboarding.setState({ done: true })`,
    `useVault.setState({ vaultRoot: 'web://mock-vault/Ouroboros',
    estaPronto: true })`,
    `usePessoa.setState({ nomes: { pessoa_a: 'Nome_A', pessoa_b: null } })`.
    Bypassa SecureStore inteiramente — usa setState direto.
  - `reset()`: chama `setState` com defaults zerados.
  - `abrir(rota)`: `router.replace(rota)` via referência exposta.
  - `abrirSheet(rota)`: abre via `router.push(rota)` mas garante
    que o BottomSheet monta forçando `index=0` e seta um flag
    `__gauntletSheetMontado` em `window`.

#### Bypass de gates em modo gauntlet

- Edits em arquivos existentes (NÃO arquivos novos):
  - `app/_layout.tsx`: importa `GAUNTLET_ATIVO`. Se ativo, chama
    `instalarGauntlet()` em `useEffect` no mount inicial.
    `<BiometriaGate>` recebe prop `bypass={GAUNTLET_ATIVO}` e em
    bypass renderiza `<>{children}</>` direto.
  - `src/lib/boot/biometriaGate.tsx`: aceita `bypass?: boolean`;
    quando `true`, pula auth e seta `isAuthenticated: true`
    imediatamente.

#### Rota dev showcase

- `app/_dev/_layout.tsx` — Stack interno só com header dev banner.
  Em produção (sem flag), retorna `<Redirect href="/" />`.
- `app/_dev/gauntlet.tsx` — dashboard com:
  - Banner topo: "MODO GAUNTLET ATIVO" cor amarelo Dracula.
  - Estado atual: nomes, vault, rota, menu aberto.
  - Botões: "Seed completo", "Reset", "Abrir menu", "Fechar menu".
  - Lista de rotas com link para cada uma das 24 telas + 4 sheets
    + 6 modais.
  - Painel "Inspecionar window.__gauntlet" com `JSON.stringify(estado())`
    auto-refresh a cada 500ms.
- `app/_dev/showcase.tsx` — todas as 24 telas em scroll vertical,
  cada uma envolta em `<View style={{ width: 412, height: 892 }}>`
  com label do número da tela. Permite captura visual de todas as
  telas em uma única navegação.
- `app/_dev/_layout.tsx` — **enforça enquadramento mobile** em
  todas as rotas `/_dev/*`:
  - Container raiz com `maxWidth: 412`, `marginHorizontal: 'auto'`,
    `minHeight: 892`, `borderLeftWidth: 1`, `borderRightWidth: 1`,
    `borderColor: colors.bgElev` para parecer um celular emoldurado
    no centro do viewport desktop.
  - Cor de fundo fora do frame: `colors.bgPage` mais escuro ou
    cinza neutro para contraste, simulando "wallpaper de mesa".
  - Em mobile real (Platform.OS !== 'web'), o frame é no-op
    (largura ocupa 100% como em qualquer rota normal).
  - Banner do modo gauntlet aparece DENTRO do frame, no topo do
    `_layout`.
  Isso garante que screenshots capturados via playwright (com
  viewport 412x892) saiam perfeitamente enquadrados, e que o
  orquestrador nunca veja a UI esticada em desktop.

#### Helpers de seed

- `src/lib/dev/seedDeterministico.ts` — gera dados sintéticos
  determinísticos para popular UI:
  ```ts
  export function seedHumores(): void;     // 90 dias de humor
  export function seedDiarios(): void;     // 30 entradas
  export function seedEventos(): void;     // 20 eventos
  export function seedExercicios(): void;  // 5 sessões
  export function seedTarefas(): void;     // 10 pendentes + 5 concluidas
  export function seedAlarmes(): void;     // 3 alarmes
  export function seedContadores(): void;  // 2 contadores
  export function seedCiclo(): void;       // 6 ciclos
  export function seedTudo(): void;        // chama todos
  ```
  Cada um escreve direto no store (não em arquivo), usando dados
  com timestamps relativos ao "hoje" para que UI mostre conteúdo
  realista em screenshots.

#### Testes E2E unificados

- `tests/e2e/playwright/` — diretório novo. Cada arquivo é um
  caso de teste que o orquestrador (Claude) pode rodar via
  playwright MCP:
  - `00-bootstrap.e2e.ts` — sobe expo, navega `/_dev/gauntlet?seed=1`,
    confirma que estado retornado tem `onboardingDone: true` e
    `vaultRoot` setado. Pré-requisito de todos os outros.
  - `m22-vault.e2e.ts` — verifica que `vaultRoot` setado em modo
    gauntlet bypassa onboarding e Home renderiza.
  - `m23-onboarding.e2e.ts` — `reset()` + navegar `/onboarding`,
    completar 3 frames com `type` real, confirmar redirect para `/`.
  - `m24-resume.e2e.ts` — seta `ultimaRota: '/memoria'`, recarrega,
    confirma redirect.
  - `m25-cobra-anima.e2e.ts` — navega `/_dev/showcase`, captura
    transform do `<G>` do `OuroborosLoader` em t=0 e t=1500ms,
    confirma que mudou (animação rodando).
  - `m26-sheets-opacas.e2e.ts` — para cada uma das 4 rotas modais,
    abre via `__gauntlet.abrirSheet()`, captura screenshot, confirma
    fundo Dracula opaco (não preto vazio).
  - `m27-menu-lateral.e2e.ts` — `__gauntlet.abrirMenu()`, captura
    screenshot, confirma 3 seções renderizadas.
  - `m28-nomes-reais.e2e.ts` — `setNomes('Alice', 'Bob')`, navega
    `/settings/editar-pessoa`, confirma que título mostra "ALICE" e
    "BOB" via `useNomeDe`.
  - Arquivos novos têm extensão `.e2e.ts` para que Jest os ignore
    (`testPathIgnorePatterns` em `jest.config.js` adiciona
    `/e2e/`).

#### Documentação

- `docs/GAUNTLET.md` — guia completo:
  - Como ativar (`EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web`).
  - O que cada API do `window.__gauntlet` faz.
  - Como adicionar novos casos E2E.
  - Como o orquestrador (Claude) deve usar para validar sprints
    futuras (substitui pipeline 3-tentativas atual).
- `VALIDATOR_BRIEF.md` §1.9 — adiciona Nível A+ (Gauntlet) entre
  A e B:
  > **Nível A+ — Gauntlet (default para validação visual de
  > qualquer sprint que toca UI):**
  > Sobe expo com flag, ativa `__gauntlet`, usa API JS
  > determinística para seed e navegação. Captura screenshots
  > previsíveis. Substitui o uso direto de Nível A (que tem 6
  > limitações estruturais documentadas em
  > `docs/sprints/M-GAUNTLET-spec.md` §1).

### 2.2 Arquivos modificados

- `app/_layout.tsx` — bypass de gates condicionado a `GAUNTLET_ATIVO`.
- `src/lib/boot/biometriaGate.tsx` — prop `bypass`.
- `jest.config.js` — adiciona `testPathIgnorePatterns: ['/e2e/']`.
- `package.json` — adiciona script `test:e2e` que documenta como
  rodar (orquestrador roda via playwright MCP, não via npm).
- `app/_components.tsx` — adiciona link "Modo Gauntlet (dev)"
  visível só quando `GAUNTLET_ATIVO`.
- `tsconfig.json` — confirma que `tests/e2e/**/*` está em include
  ou exclude conforme decisão.

### 2.3 Arquivos NÃO modificados

- Stores existentes (`useOnboarding`, `useVault`, `usePessoa`,
  `useSessao`, `useNavegacao`) — `setState` direto via zustand já
  é API pública.
- `app/_layout.tsx` overlays globais (FABMenu, MenuLateral) —
  Gauntlet não toca em z-index.

## 3. APIs reutilizáveis

- `zustand` `setState` direto bypassa `persist` middleware.
- `Platform.OS === 'web'` para guard de runtime.
- `process.env.EXPO_PUBLIC_*` para flags exposed ao bundle.
- `expo-router` `router.replace`/`router.push` para navegação
  programática.

## 4. Restrições

- **Regra −1 absoluta**: zero IA, zero nomes reais. Defaults
  genéricos `Nome_A`/`Nome_B` em todos os seeds. Banner do modo
  gauntlet sem assinatura.
- **GAUNTLET_ATIVO deve ser FALSE em produção sempre**. Build
  release usa `EAS_BUILD_PROFILE !== 'production'` ou similar
  para garantir. Linter custom em `scripts/check_gauntlet.sh`
  confirma que nenhum bundle production tem `EXPO_PUBLIC_GAUNTLET=1`.
- **Sentence case + acentuação PT-BR completa** em UI strings do
  banner e dashboard. `accessibilityLabel` SEM acento.
- **TS strict**.
- **`window.__gauntlet` SÓ existe em web + flag ativa**. Em mobile
  release, `window` nem está definido.
- **Não regredir** smoke (1126 testes / 130 suites). Testes E2E
  ficam fora do `npm test --silent`.
- **Não tocar** em arquivos de produção que afetam mobile real
  (boot, biometria, vault). Bypass é só em web + flag.
- **Frame mobile no `_dev` é obrigatório**: largura máxima 412dp
  centralizada, altura ≥ 892dp, borda lateral discreta. Em mobile
  nativo o frame é no-op. Garante que orquestrador veja sempre o
  layout real; UI esticada em desktop é falso positivo (esconde
  bugs de overflow horizontal e text wrap).

## 5. Procedimento sugerido

1. **Criar `src/lib/dev/gauntlet.ts`** com módulo base. Confirmar
   que `GAUNTLET_ATIVO` retorna `false` em mobile release (mock
   `Platform.OS = 'android'` em teste).
2. **Adicionar bypass em `BiometriaGate`** (prop `bypass`). Testar
   que prop default `false` mantém comportamento atual.
3. **Adicionar `instalarGauntlet()`** em `_layout.tsx` dentro de
   `useEffect` que SÓ roda quando `GAUNTLET_ATIVO`.
4. **Criar rotas `/_dev/_layout.tsx` e `/_dev/gauntlet.tsx`**.
   Validar via playwright direto que dashboard renderiza.
5. **Implementar `seedTudo()` e variantes**.
6. **Criar `/_dev/showcase.tsx`** com todas as telas.
7. **Escrever testes E2E** começando por `00-bootstrap.e2e.ts`.
   Cada teste E2E é um arquivo `.ts` com função exportada que o
   orquestrador chama via `npx playwright test` ou direto via MCP.
8. **Documentar em `docs/GAUNTLET.md`** e atualizar
   `VALIDATOR_BRIEF.md` §1.9.
9. **Validar fim-a-fim**:
   - `EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web`
   - Abrir `http://localhost:8081/_dev/gauntlet?seed=1`
   - Rodar a sequência de E2E manualmente via playwright MCP
   - Confirmar que cada um passa.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

# 1. Anonimato + tsc + smoke (sem regressão)
./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh

# 2. Confirma que GAUNTLET_ATIVO é false em build sem flag
npx expo export --platform android --output-dir /tmp/m-gauntlet-export
grep -rn "__gauntlet" /tmp/m-gauntlet-export/_expo/static/js/ || echo "OK: gauntlet ausente em mobile bundle"
rm -rf /tmp/m-gauntlet-export

# 3. Sobe web COM flag
EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web > /tmp/expo-gauntlet.log 2>&1 &
# espera ready
until curl -s http://localhost:8081 | grep -q "ouroboros-mobile"; do sleep 2; done

# 4. Roda testes E2E (orquestrador via playwright MCP):
#    - 00-bootstrap, m22, m23, m24, m25-cobra, m26-sheets, m27-menu, m28-nomes
#    Cada um deve passar visualmente (screenshots determinísticos).
```

## 7. Commit

```
feat: m gauntlet teste visual unificado em chrome controlavel
```

## 8. Checkpoint visual

Captura visual em `docs/sprints/M-GAUNTLET-screenshots/` (Nível A+):
- `A-dashboard.png` — `/_dev/gauntlet` com banner amarelo, painel
  de estado, botões.
- `A-showcase.png` — `/_dev/showcase` (full page) mostrando todas
  as 24 telas empilhadas.
- `A-cobra-anima-frame1.png` + `A-cobra-anima-frame2.png` —
  capturados via E2E `m25-cobra-anima.e2e.ts`, com 1.5s de
  diferença, transform diferente (provando animação).
- `A-menu-lateral-determinist.png` — capturado via
  `__gauntlet.abrirMenu()`, sem depender de click frágil em FAB.
- `A-sheet-humor-aberto.png` — capturado via
  `__gauntlet.abrirSheet('humor-rapido')`, sheet montado e
  visível com fundo Dracula.

## 9. Decisões tomadas

- **Por que frame 412dp no `_dev`?** Validar visual no Chrome
  desktop sem frame deixa o RN-Web esticar até a largura da
  janela, escondendo bugs reais (overflow, text wrap, posição
  absoluta de FAB, breakpoints implícitos de NativeWind). Frame
  garante que screenshot reflita exatamente o que o usuário verá
  no celular real.
- **Por que web e não emulador Android (Nível B)?** Emulador
  exige setup de hardware (KVM, GPU host), 8-15s boot, 3-5min
  cold start. Validação web com Gauntlet é instantânea. Nível B
  fica para final de sprint visual (M-GAUNTLET-screenshots) e
  para sprints que tocam APIs nativas (haptic, SAF).
- **Por que rota `/_dev/...` e não componente isolado?**
  Expo Router descobre rotas pelo file system. Rota dev é
  bloqueada em produção via `<Redirect />` no layout.
- **Por que `window.__gauntlet` e não Redux DevTools-style?**
  Simples. Orquestrador (Claude) só precisa de
  `page.evaluate('window.__gauntlet.seed()')` — sem deps externas.
- **Por que `Platform.OS === 'web'` no guard?** Garante que mesmo
  se `EXPO_PUBLIC_GAUNTLET=1` vazasse para release Android, o
  módulo nunca instala (Platform.OS ≠ 'web' em mobile).
- **Por que NÃO usar Detox/Maestro?** Detox precisa rebuild
  nativo, Maestro precisa setup adicional. Playwright + MCP já
  está disponível e o orquestrador já sabe usar.
- **Por que extensão `.e2e.ts` e não `.test.ts`?** Jest pula
  arquivos `.e2e.ts` via `testPathIgnorePatterns`, evita rodar
  E2E acidentalmente em smoke (eles precisam de browser real).

## 10. Aritmética de proof-of-work

- Baseline pós-M14.1+M25.1+M27.1: **1126 testes / 130 suites**
  (commit `13e649f`).
- Esperado pós-sprint:
  - Suítes Jest: **130 suítes mantidas** (e2e ignorados pelo
    Jest).
  - Testes Jest: **1126 + 5 a 10** (testes unitários do módulo
    `gauntlet.ts` e helpers de seed). Faixa: 1131-1136.
  - Testes E2E: **8 casos novos** em `tests/e2e/playwright/`
    (não contados no Jest).
  - Bundle Hermes Android: ≤ 8.85 MB (Gauntlet é dead code em
    mobile release).
  - Bundle web: leve aumento (+10-30 KB) pelos arquivos `_dev/`.
- FAIL_BEFORE = 0; FAIL_AFTER (Jest) = 0; E2E = 8 passing.

## 11. Plano de adoção pós-sprint

Após M-GAUNTLET fechar, **toda sprint que toca UI passa a
validar via Gauntlet** (substitui pipeline 3-tentativas atual):

1. Sprint nova entrega código.
2. Orquestrador escreve E2E novo em `tests/e2e/playwright/`
   nomeando `m<NN>-<aspecto>.e2e.ts`.
3. Roda via playwright MCP em modo gauntlet.
4. Captura screenshots em `docs/sprints/M<NN>-screenshots/`.
5. Aprova ou reprova baseado em E2E + visual.

VALIDATOR_BRIEF.md §1.9 atualizado para refletir essa mudança.
Sprints anteriores (M22-M28) podem ter suas validações
re-executadas em modo gauntlet para gerar os screenshots
faltantes (pendência R1 em M22, M24).

Sprint pronta para execução. Recomendo entrar em plan mode antes
de executar para alinhar com o usuário sobre escopo (este spec é
maior que sprints normais — pode valer dividir em
M-GAUNTLET.1 (módulo + bypass + dashboard) e M-GAUNTLET.2 (showcase
+ E2E + adoção)).
