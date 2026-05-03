# Gauntlet — Validação visual unificada em Chrome

> **Status**: implementado em M-GAUNTLET (2026-05-03).
> **Substitui** o pipeline 3-tentativas de Nível A puro como
> default para validação visual de qualquer sprint que toca UI.

## O que é

Camada de bypass dev-only que expõe controle determinístico do app
via JS API (`window.__gauntlet`) e interface dashboard
(`/_dev/gauntlet`) em modo `EXPO_PUBLIC_GAUNTLET=1`. Permite ao
orquestrador (Claude) validar visualmente o app web no Chrome sem
ficar preso aos 6 problemas estruturais documentados em
`docs/sprints/M-GAUNTLET-spec.md` §1 (BiometriaGate redirect,
useFonts oscilante, refs voláteis, MouseEvent sintético, gorhom
em web, etc).

## Como ativar

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
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
Platform.OS === 'web' && process.env.EXPO_PUBLIC_GAUNTLET === '1'
```

Em mobile release Android/iOS, `Platform.OS !== 'web'` faz o módulo
ser dead-code mesmo se a env var vazar. Build sem flag não inclui
o dashboard nas rotas (Redirect para `/`).

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
2. Sobe expo: `EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web` em background.
3. Carrega tools playwright via ToolSearch.
4. Executa o caso via `browser_evaluate({ function: ... })` ou
   `browser_click/type` direto.
5. Captura screenshots em `docs/sprints/M<NN>-screenshots-gauntlet/`.
6. Aprova ou reprova baseado no resultado.

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

## Próximos passos

- M-REVALIDACAO-M20-M28 — primeira aplicação em massa: re-valida 11
  sprints concluídas via Gauntlet, gera relatório consolidado,
  abre corretivas para FAIL.
- VALIDATOR_BRIEF.md §1.9 atualizada com Nível A+ (Gauntlet)
  detalhado.
