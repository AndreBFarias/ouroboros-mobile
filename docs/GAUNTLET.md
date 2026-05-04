# Gauntlet — Validação visual unificada em Chrome

> **Status**: implementado em M-GAUNTLET (2026-05-03).
> **OBRIGATÓRIO** desde 2026-05-04 para qualquer sprint nova que
> toca UI. Substitui o pipeline 3-tentativas de Nível A puro.

## O que é

Camada de bypass dev-only que expõe controle determinístico do app
via JS API (`window.__gauntlet`) e interface dashboard
(`/_dev/gauntlet`). Em modo dev (`__DEV__`) o Gauntlet é instalado
automaticamente. Permite ao orquestrador (Claude) validar
visualmente o app web no Chrome sem ficar preso aos 6 problemas
estruturais documentados em `docs/sprints/M-GAUNTLET-spec.md` §1
(BiometriaGate redirect, useFonts oscilante, refs voláteis,
MouseEvent sintético, gorhom em web, etc).

## Como ativar (atalho recomendado)

```bash
./gauntlet.sh
```

O script:
1. Mata Metro órfão na porta 8081 (se houver).
2. Sobe `./run.sh --web` em background (log em `/tmp/gauntlet-expo.log`).
3. Aguarda Metro responder em `localhost:8081`.
4. Abre o navegador padrão direto em `/_dev/gauntlet`.
5. Mostra log em foreground; `Ctrl-C` derruba tudo limpo.

Em sessão fresca, `useFonts` SDK 54 web demora ~30-60s para resolver
na primeira navegação. Aguarde antes de interagir.

## Alternativa manual

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
./run.sh --web
```

Aguarde `localhost:8081` responder. Abra
`http://localhost:8081/_dev/gauntlet` no Chrome.

Em modo dev você verá:

- Banner amarelo "MODO GAUNTLET ATIVO" no topo.
- Frame mobile centralizado (largura 412dp, borda lateral discreta)
  garantindo que captura visual reflita celular real.
- Painel de estado JSON com snapshot dos stores (auto-refresh 500ms).
- Botões: Seed, Reset, Seed casal, Abrir menu, Fechar menu.
- Lista de rotas para navegação manual.

## Garantia anti-vazamento

`GAUNTLET_ATIVO` é avaliado em runtime como:

```ts
Platform.OS === 'web' && __DEV__
```

`__DEV__` é flag build-time do React Native que vira `false` em
release. Em mobile release Android/iOS, `Platform.OS !== 'web'` E
`__DEV__ === false` fazem o módulo ser dead-code. Build sem dev
não inclui o dashboard nas rotas (Redirect para `/`).

Verificação opcional após build:

```bash
npx expo export --platform android --output-dir /tmp/check-gauntlet
grep -rn "__gauntlet" /tmp/check-gauntlet/_expo/static/js/ \
  || echo "OK: gauntlet ausente em mobile bundle"
rm -rf /tmp/check-gauntlet
```

## API `window.__gauntlet`

Tipos completos em `src/lib/dev/gauntlet.ts` (`GauntletAPI`).

### Seed e reset

```js
// Modo sozinho (Nome_A, vault mock, onboarding done)
window.__gauntlet.seed();

// Modo casal (nomes customizados)
window.__gauntlet.seed({ nomeA: 'Alice', nomeB: 'Bob' });

// Reset total (zera stores)
window.__gauntlet.reset();
```

### Setters granulares

```js
window.__gauntlet.setNomes('Carol', 'Dan');
window.__gauntlet.setVaultRoot('web://mock-vault/Outros');
window.__gauntlet.setOnboardingDone(true);
window.__gauntlet.setUltimaRota('/memoria');
```

### Navegação

```js
// Navega para rota qualquer (router.replace por baixo)
await window.__gauntlet.abrir('/memoria');

// Abre uma das 4 sheets opacas (humor-rapido, diario-emocional,
// eventos, scanner) garantindo seed minimo antes
await window.__gauntlet.abrirSheet('humor-rapido');

// Controle do MenuLateral
window.__gauntlet.abrirMenu();
window.__gauntlet.fecharMenu();
```

### Snapshot do estado

```js
const e = window.__gauntlet.estado();
// {
//   onboardingDone: boolean,
//   tipoCompanhia: 'sozinho' | 'casal' | 'amigos',
//   vaultRoot: string | null,
//   nomes: { pessoa_a: string, pessoa_b: string },
//   fotos: { pessoa_a: string | null, pessoa_b: string | null },
//   ultimaRota: string | null,
//   menuAberto: boolean,
//   rota: string,
// }
```

## Casos E2E (`tests/e2e/playwright/`)

Cada sprint nova que toca UI entrega 1 caso E2E em
`tests/e2e/playwright/m<NN>-<aspecto>.e2e.ts`. Template canônico em
`docs/templates/e2e-template.e2e.ts`.

Estrutura padrão de um caso:

```ts
import type { PlaywrightPageLike, ResultadoE2E }
  from '../../../docs/templates/e2e-template.e2e';

export default async function caseM30(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  // 1. Navegar para /_dev/gauntlet
  // 2. Aplicar seed via window.__gauntlet
  // 3. Navegar para tela alvo
  // 4. Asserts via page.evaluate
  // 5. Capturar screenshots
  // 6. Retornar { status: 'PASS' | 'FAIL', detalhe, screenshots }
}
```

**Não rodar via `npm test`** — `jest.config.testMatch` filtra por
`*.test.ts` e `*.test.tsx`, então arquivos `*.e2e.ts` são
naturalmente ignorados pelo Jest. Esses casos são executados pelo
orquestrador (Claude) usando o playwright MCP.

## Fluxo do orquestrador para validar uma sprint

1. Após executor entregar código, orquestrador escreve o E2E em
   `tests/e2e/playwright/m<NN>-*.e2e.ts`.
2. Sobe Gauntlet: `./gauntlet.sh` (em outra janela) ou
   `./run.sh --web` em background.
3. Carrega tools playwright via ToolSearch.
4. Navega `http://localhost:8081/_dev/gauntlet`, aguarda fontes,
   roda `__gauntlet.seed()` ou `setNomes()/setUltimaRota()` etc.
5. Executa o caso via `browser_evaluate({ function: ... })` ou
   `browser_click/type` direto. Clica e navega como app real.
6. Captura screenshots em `docs/sprints/M<NN>-screenshots-gauntlet/`.
7. Aprova ou reprova baseado no resultado.

Bugs descobertos viram sprints corretivas separadas
(`M<NN>.<x>-spec.md`), nunca fix inline na sprint que está sendo
validada.

## Limitações conhecidas

- Seed é **em memória** (setState direto). Reload da página perde o
  seed. Por design — quem quer persistir usa onboarding manual.
- Sheets do `@gorhom/bottom-sheet` em web ainda não montam
  corretamente (limitação upstream). Captura pega o fundo opaco e
  o loader compacto atrás (suficiente para A18).
- `useConquistas` em web com vaultRoot mock retorna lista vazia
  (M27.1 caminho C). Telas de calendário renderizam empty state em
  vez de dados reais.
- Reanimated em web tem latência de runtime (~500ms-1s). Para
  captura de animação confiável, aguardar 1.5s+ entre frames.

## Troubleshooting

Auditoria 2026-05-04 documentou os erros operacionais mais comuns.

### Metro não sobe em 60s
- Diagnóstico: `tail -100 /tmp/gauntlet-expo.log | grep -i error`.
- Causa comum: cache corrompido. Solução: `./gauntlet.sh --clear`
  (apaga `.expo/` e `node_modules/.cache`).
- Porta 8081 ocupada por processo desconhecido: o `gauntlet.sh` v2
  recusa matar e mostra o nome do processo. Mate manualmente
  conferindo o que é, ou rode `lsof -ti:8081 | xargs -r kill -9`
  com confiança.

### Browser abre em `chrome-error://chromewebdata/`
- Causa: `__gauntlet.abrirSheet()` em web. Limitação do
  `@gorhom/bottom-sheet` em React-Native-Web. O Gauntlet emite
  `console.warn` antes de tentar.
- Solução: validar sheets em Nível B (emulador `ouroboros-test`)
  com `./scripts/start-emulator.sh` + `./run.sh --emulator`.

### Boot screen oscila entre presente e ausente
- Causa: `useFonts` SDK 54 web demora 30-60s na primeira sessão
  fresh. M27.1 (useRef guard) cobre 95% dos casos. M27.3 (Suspense
  boundary, [todo]) cobre o residual.
- Solução: aguardar `__gauntlet.aguardarBoot(60000)` retornar
  `true` antes de interagir. Métrica disponível via
  `__gauntlet.tempoDeBoot()`.

### "Maximum update depth exceeded" no console
- Causa: alteração de variável de módulo (`let`) ou
  `sessionStorage` durante render em React 19 strict mode.
- Solução: usar `useState` ou `useRef`. Nunca mexer em estado
  externo durante render fora do contexto React.

### Animação parou no SVG
- Causa: `useAnimatedProps` não propaga em `react-native-svg-web`.
  M25.2 implementou bypass via `requestAnimationFrame` +
  `data-anim-id` + `setAttribute`.
- Diagnóstico: confirmar que `<g data-anim-id="og-g1-...">` existe
  no DOM e que o atributo `transform` muda entre amostras
  (`document.querySelector('[data-anim-id^="og-g1-"]').getAttribute('transform')`).

### `console.error` do browser não aparece no log do Metro
- Causa: log do Metro mostra Node, não browser. Auditoria
  2026-05-04 expôs `__gauntlet.consoleErros()` para inspecionar
  buffer do navegador.
- Uso: `window.__gauntlet.consoleErros()` retorna array de
  `{ ts, msg }`.

### `element.ref` deprecation warning (React 19)
- Origem: dependência transitiva (expo-router ou react-native-svg).
- Status: benigno, não afeta uso. Aguardando upstream atualizar
  para React 19 ref-as-prop.

## APIs novas pós-auditoria 2026-05-04

- `aguardarBoot(timeoutMs?: number): Promise<boolean>` — resolve
  `true` quando fontes carregaram e stores hidrataram (default
  60s).
- `tempoDeBoot(): number | null` — retorna ms entre primeiro mount
  e fontes prontas. `null` se ainda não completou.
- `consoleErros(): Array<{ts, msg}>` — buffer dos `console.error`
  capturados na sessão atual (até 200 entradas).
- `reset()` v2 — limpa todas as stores + menuAberto + pathnameRef
  + localStorage do persist em web.

## Próximos passos

- M-GAUNTLET-DEAD-CODE-V2 — refactor para tornar gauntlet
  realmente dead-code em release Android (achado de
  `M-GAUNTLET-LEAK-CHECK` 2026-05-04).

## Histórico de melhorias

- **M-GAUNTLET-LEAK-CHECK** (2026-05-04) — script
  `scripts/check_gauntlet_leak.sh` valida bundle Android sem
  marcadores Gauntlet.
- **M-GAUNTLET-SEED-V2** (2026-05-04) — fixtures determinísticas
  (humores-30d 33 registros, diarios-3, eventos-7) + API
  `seedComDados(fixture)`.
- **M-GAUNTLET-FAST-BOOT** (2026-05-04) — fontes JetBrainsMono
  pré-cacheadas em `public/fonts/` + `<link rel="preload">` em
  `app/+html.tsx`. Boot esperado <5s (vs 30-60s do `useFonts` SDK
  54 web sem preload).
