# Sprint M-GAUNTLET-DEAD-CODE-V2 — Tornar gauntlet realmente dead-code em release Android

```
DEPENDE:    M-GAUNTLET-LEAK-CHECK fechada (script detector ativo)
BLOQUEIA:   M41 (release final v1.0.0 — bundle nao pode vazar gauntlet)
ESTIMATIVA: 4-6h
PRIORIDADE: alta (antes de M41)
STATUS:     [todo]
```

## 1. Achado (M-GAUNTLET-LEAK-CHECK 2026-05-04)

`./scripts/check_gauntlet_leak.sh` detectou 5 markers presentes no
bundle Android Hermes mesmo apos `expo export --platform android`:

```
__gauntlet:        1 match
instalarGauntlet:  1 match
useGaleriaMock:    1 match
GAUNTLET_ATIVO:    1 match
adicionarFotoMock: 1 match
```

Causa raiz: `app/_layout.tsx` importa diretamente do `@/lib/dev/gauntlet`:

```ts
import {
  GAUNTLET_ATIVO,
  instalarGauntlet,
  marcarBootCompleto,
  setRouterRef,
  setPathnameRef,
} from '@/lib/dev/gauntlet';
```

Mesmo com `if (!GAUNTLET_ATIVO) return` em cada metodo, os
identificadores ficam reachable estaticamente — Metro/Hermes nao
fazem tree-shake de export ja referenciado.

## 2. Solucao proposta

Tres caminhos (avaliar e decidir o melhor):

### Caminho A — Modulo de bootstrap separado guardado por __DEV__

Criar `src/lib/dev/gauntletBootstrap.ts`:

```ts
// Comentarios sem acento.
import { Platform } from 'react-native';
declare const __DEV__: boolean;

export function instalarSeDev(routerLike: unknown): void {
  if (Platform.OS !== 'web' || !__DEV__) return;
  // require lazy: Metro nao inclui o modulo se este branch nao for
  // alcancado em build production.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const g = require('@/lib/dev/gauntlet');
  g.instalarGauntlet();
  g.setRouterRef(routerLike);
}
```

E no `_layout.tsx` substituir o import direto por:

```ts
import { instalarSeDev } from '@/lib/dev/gauntletBootstrap';
// ... no useEffect:
instalarSeDev(router);
```

Vantagem: `gauntlet.ts` so e require-d se `__DEV__` for true em
runtime, e Metro consegue eliminar o branch dead em release pois
sabe que `__DEV__ === false`.

### Caminho B — Babel plugin transform-define com __DEV__

Configurar babel-plugin-transform-define ou similar para que
`__DEV__` vire literal `false` em build production. Combinado com
DCE do Metro/Hermes, todo branch `if (__DEV__)` (e por extensao
`GAUNTLET_ATIVO` que depende dele) seria eliminado.

Vantagem: nao requer refactor de imports.
Desvantagem: requer ajuste de toolchain (babel.config.js + verify
em CI).

### Caminho C — `metro.config.js` com `serializer.processModuleFilter`

Excluir manualmente `src/lib/dev/gauntlet.ts` e dependentes do
bundle quando `process.env.NODE_ENV === 'production'`.

Vantagem: explicito.
Desvantagem: filter manual e fragil; quebra se path mudar.

## 3. Recomendacao

**Caminho A** (require lazy) e o mais robusto. Combina bem com a
politica zero-trust de cada metodo gauntlet ja ter `comGuard`
checkar `GAUNTLET_ATIVO` em runtime.

## 4. Entregaveis

- `src/lib/dev/gauntletBootstrap.ts` (novo).
- `app/_layout.tsx` substitui imports diretos por `instalarSeDev`.
- `app/_dev/_layout.tsx`, `app/_dev/gauntlet.tsx`, `app/_dev/showcase.tsx`:
  esses ja sao `app/_dev/*` (rotas dev only, redirect em release),
  podem manter import direto.
- `src/lib/midia/adicionarFotoManual.ts`,
  `src/lib/hooks/useFotosAgregadas.ts`: avaliar se merece refactor
  ou se o `GAUNTLET_ATIVO` importado ja foi DCE'd post-A. Se ainda
  vazar, mover guard para uma constante interna ao proprio modulo.
- `tests/lib/dev/gauntletBootstrap.test.ts`: stub `__DEV__` false e
  confirma que `require` nao foi chamado.

## 5. Verificacao

```bash
./scripts/check_gauntlet_leak.sh
# Esperado:
# OK: bundle Android sem gauntlet
#     bundle: <X> MB
```

5 markers devem zerar. Se 1+ persistir, investigar e iterar.

## 6. Aritmetica

- ~1143 + 2-3 testes do bootstrap.
- Bundle Hermes: deve reduzir 0.1-0.3 MB com DCE de gauntlet (
  ~30-50 KB de modulo).

Sprint pronta para execucao apos M40 / antes de M41.
