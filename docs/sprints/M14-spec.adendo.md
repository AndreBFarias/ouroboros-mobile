# M14 — Adendo de execução

Complementa `M14-spec.md`. Não substitui nada; soma checagens e
aritmética que estavam implícitas. Lido pelo executor antes de
começar.

## A. Aritmética de testes (baseline → projetado)

Baseline pós-M10 (`STATE.md` 2026-05-01):

- Testes passing: **912**
- Test suites: **103**

Esta sprint adiciona 5 arquivos de teste:

- `tests/schemas/financas-cache.test.ts` — ~4 casos (parse OK, schema_version inválido, top_categorias vazio, ultimas_transacoes com tipo `credito`).
- `tests/lib/vault/cacheFinancas.test.ts` — ~4 casos (lê e valida, arquivo ausente devolve null, JSON inválido devolve null com warn, schema inválido devolve null).
- `tests/components/financas/CardHero.test.tsx` — ~3 casos (render valor + delta, valor zero, delta `"em linha"`).
- `tests/components/financas/CardTopCategorias.test.tsx` — ~3 casos (render 5 itens, lista vazia oculta o card, percentual usado na barra).
- `tests/components/financas/ListaTransacoes.test.tsx` — ~5 casos (render 20 itens, despesa cyan, crédito green, autor pessoa_a/pessoa_b, lista vazia mostra microcopy).

**Projeção:** ~19-23 testes novos. **Resultado esperado:** 931-935 passing, 108 suites. Se `npm test` fechar fora dessa faixa, executor pausa e reporta antes de commitar.

## B. Hipótese implementacional (verificada via grep)

| Item | Status | Caminho |
|---|---|---|
| Stub redirect atual | confirmado | `app/(tabs)/financas.tsx` (12 linhas, redirect para `em-construcao?sprint=M14`) |
| Aba já registrada | confirmado | `app/(tabs)/_layout.tsx` linha 43 (`<Tabs.Screen name="financas" options={{ title: 'Financas' }} />`) — NÃO precisa adicionar, só substituir o stub |
| Cache backend | confirmado | `~/Protocolo-Ouroboros/.ouroboros/cache/financas-cache.json` existe com schema esperado (`schema_version`, `gerado_em`, `periodo_referencia`, `gasto_semana`, `gasto_semana_anterior`, `delta_textual`, `top_categorias[]`, `ultimas_transacoes[]`) |
| Barrel schemas | confirmado | `src/lib/schemas/index.ts` segue padrão `export { XSchema, type XMeta } from './x';` — adicionar bloco análogo para `FinancasCache` |
| Pasta de hooks | confirmado | `src/lib/hooks/` já tem `useHumorHeatmap.ts` — criar `useFinancasCache.ts` no mesmo padrão |

**Ajuste no entregável da spec §2:** o procedimento §5 menciona hook `useFinancasCache` que NÃO está listado em "Arquivos novos". Adicionar:

- `src/lib/hooks/useFinancasCache.ts` — hook que envolve `lerCacheFinancas` com estados `loading | empty | ok` e retry on `AppState` foreground (mesma assinatura de `useHumorHeatmap`).

## C. Decisão arquitetural a confirmar — Tela como componente vs inline

M10 fez `app/(tabs)/humor.tsx` ⇒ delega para `src/components/screens/MiniHumorScreen.tsx`. M14 spec §2 monta tudo em `app/(tabs)/financas.tsx` direto.

**Decisão:** seguir o padrão M10 para uniformidade — criar `src/components/screens/MiniFinanceiroScreen.tsx` e fazer `app/(tabs)/financas.tsx` apenas delegar. Razão: arquivos `app/(tabs)/*.tsx` ficam triviais e fáceis de auditar; toda complexidade vive em `src/components/screens/`. Não inflar a spec — adicionar `MiniFinanceiroScreen.tsx` como entregável e reduzir `financas.tsx` para 11 linhas tipo o `humor.tsx`.

## D. Fixture web/dev e checkpoint visual Nível A

Spec §8 já cobre. Reforço:

- Fixture obrigatória: `scripts/fixtures/financas-cache.json` (cache genérico, sem destinos reais — usar `"destino": "mercado generico"`, `"destino": "transferencia"`, etc.). Hook detecta `__DEV__ && Platform.OS === 'web'` e carrega fixture via `require`.
- Validação Nível A captura: empty state, OK state, banner sempre visível, despesa cyan, crédito green.
- Limitação SAF replicada de M10: empty state em web é o estado canônico quando fixture ausente; cache real só roda em Android (Nível B/C). Documentar no PR igual M10.

## E. Touches autorizados (lista mínima)

**Novos (10):**

- `app/(tabs)/financas.tsx` (substitui stub)
- `src/components/screens/MiniFinanceiroScreen.tsx`
- `src/components/financas/CardHero.tsx`
- `src/components/financas/CardTopCategorias.tsx`
- `src/components/financas/ListaTransacoes.tsx`
- `src/components/financas/BannerLeitura.tsx`
- `src/lib/schemas/financas-cache.ts`
- `src/lib/vault/cacheFinancas.ts`
- `src/lib/hooks/useFinancasCache.ts`
- `scripts/fixtures/financas-cache.json`

Mais 5 arquivos de teste em `tests/`.

**Modificados (1):**

- `src/lib/schemas/index.ts` — adicionar export do `FinancasCacheSchema`.

**NÃO tocar:**

- `app/(tabs)/_layout.tsx` (aba já está registrada — só o conteúdo do `financas.tsx` muda).
- Nenhum arquivo de sprints fechadas (M00.5, M02, M10 etc.).

## F. Checklist final (DoD complementar)

- [ ] Aritmética: `npm test` reporta 931-935 passing, 108 suites.
- [ ] `./scripts/check_anonimato.sh` exit 0 (zero referências a IA, zero nomes reais).
- [ ] Acentuação completa em UI (`Finanças`, `Atualizado em`, `Modo leitura. Edição no desktop.`, `Categorias mais frequentes`, etc.) — varredura final em arquivos novos.
- [ ] `accessibilityLabel` sem acento em todos os componentes novos.
- [ ] Comentários em `.ts`/`.tsx` sem acento.
- [ ] Commit message sem acento.
- [ ] Push automático para `origin main` se smoke verde (autorização durável 2026-04-30).
- [ ] Screenshots em `docs/sprints/M14-screenshots/` (empty + OK).
- [ ] Atualizar `STATE.md`, `CHANGELOG.md`, `VALIDATOR_BRIEF.md` com baseline novo.

Sprint pronta para execução.
