# Sprint M14 — Mini Financeiro (Somente Leitura)

```
DEPENDE:    M02 (Vault Bridge + Tela 01) + MOB-bridge-2 (cache backend)
BLOQUEIA:   nenhuma sprint Mobile direta
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Entregar a **Tela 22 (Mini Financeiro)** em modo **somente leitura**,
consumindo o cache JSON gerado pelo backend desktop em
`~/Protocolo-Ouroboros/.ouroboros/cache/financas-cache.json`. A tela
mostra gasto da semana, top categorias, lista das últimas 20
transações. Sem qualquer botão de adicionar, editar ou apagar — toda
mutação fica no desktop. Empty state explícito quando o cache não
existe.

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/financas.tsx` — Tela 22. Header laranja + banner de
  modo leitura + card hero + card top categorias + lista últimas
  transações.
- `src/lib/schemas/financas-cache.ts` — Schema zod para
  `financas-cache.json` espelhando o formato definido em
  `docs/ADRs/0012-cache-mobile-readonly.md`.
- `src/lib/vault/cacheFinancas.ts` — Helper para ler e validar o
  cache. Funções:
  - `lerCacheFinancas(): Promise<FinancasCache | null>` — retorna
    null se arquivo não existe ou JSON inválido (com log do erro
    em console.warn).
  - `cacheFinancasPath(): string` — caminho canônico do JSON dentro
    do Vault.
- `src/components/financas/CardHero.tsx` — Card com gasto da semana
  (laranja heading + valor cyan heading-1 + delta textual em muted).
- `src/components/financas/CardTopCategorias.tsx` — Card com 5 itens
  (nome + valor + barra horizontal cyan).
- `src/components/financas/ListaTransacoes.tsx` — Lista virtualizada
  das últimas 20 transações.
- `src/components/financas/BannerLeitura.tsx` — Banner micro muted
  com texto `"Modo leitura. Edição no desktop."`.
- `tests/schemas/financas-cache.test.ts`
- `tests/lib/vault/cacheFinancas.test.ts`
- `tests/components/financas/CardHero.test.tsx`
- `tests/components/financas/CardTopCategorias.test.tsx`
- `tests/components/financas/ListaTransacoes.test.tsx`

### Arquivos modificados

- `src/lib/schemas/index.ts` — exportar `FinancasCacheSchema`.
- `app/(tabs)/_layout.tsx` — adicionar tab `financas` com ícone
  `Wallet` (lucide). Decisão de posição na barra: depois de
  `medidas`, antes de `mais`.

## 3. APIs reutilizáveis

- `src/components/ui/Card.tsx` — base dos 2 cards principais.
- `src/components/ui/Header.tsx` — header `"Finanças"` laranja.
- `src/components/ui/EmptyState.tsx` — empty state quando cache
  ausente.
- `src/lib/vault/paths.ts` — adicionar `cacheRootPath()` se não
  existir; reaproveitar `getVaultRoot()` da M02.
- `src/lib/motion.ts` — `spring_subtle` para entrada das barras
  horizontais (animação one-shot ao montar).
- `src/lib/haptics.ts` — não há haptic nesta tela (não tem ação).

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Os destinos de transações virão do cache (texto livre
  do backend); o frontend não filtra mas também não armazena.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict.
- Imports via alias `@/*`.
- **Read-only absoluto**: zero botão de adicionar / editar /
  excluir. Banner de modo leitura sempre visível no topo.
- **Sem cores positivas/negativas para deltas**: `delta_textual`
  vem do backend como string (`"abaixo da média"`, `"acima da
  média"`, `"em linha"`) e é renderizada em `--muted`. Sem verde
  para "abaixo" (poupou) ou vermelho para "acima" (gastou). ADR-0005.
- Despesas em `--cyan`, créditos em `--green`. Mantém contraste
  com paleta Dracula sem dramatizar.
- **Validação zod estrita**: cache em formato desconhecido cai em
  empty state com erro explícito
  (`"Cache em formato desconhecido. Rode o pipeline atualizado."`),
  conforme ADR-0012.
- Não tocar em arquivos fechados de sprints anteriores.

## 5. Procedimento sugerido

1. Criar `src/lib/schemas/financas-cache.ts` espelhando o JSON de
   ADR-0012 (campos: `schema_version`, `gerado_em`,
   `periodo_referencia`, `gasto_semana`, `gasto_semana_anterior`,
   `delta_textual`, `top_categorias[]`, `ultimas_transacoes[]`).
   Cada item de `top_categorias` tem `nome`, `valor`, `percentual`.
   Cada `ultimas_transacoes` tem `data`, `autor`, `tipo:
   'despesa'|'credito'`, `valor`, `destino`, `categoria`.
2. Implementar `src/lib/vault/cacheFinancas.ts`. `lerCacheFinancas`
   resolve `cacheFinancasPath`, faz `readAsStringAsync`, parseia
   JSON, valida com zod. Retorna null em qualquer falha (com log
   em `console.warn` para debug, sem expor erro ao usuário).
3. Implementar `BannerLeitura`, `CardHero`, `CardTopCategorias`,
   `ListaTransacoes`. Componentes "burros", recebem dados via
   props. Animação de entrada das barras de categoria via Moti +
   `spring_subtle`, com delay 60ms entre itens.
4. Implementar `app/(tabs)/financas.tsx`. Estado:
   `useFinancasCache` (hook custom que faz `lerCacheFinancas` no
   mount + retry quando volta do background). 3 estados:
   - **carregando**: skeleton dos cards (sem texto, fundo bg-elev).
   - **vazio**: EmptyState com texto
     `"Rode o pipeline no desktop pra carregar dados."`.
   - **OK**: BannerLeitura no topo + CardHero + CardTopCategorias +
     ListaTransacoes.
5. Adicionar tab em `app/(tabs)/_layout.tsx`.
6. Rodar smoke + tests + tsc + expo export. Capturar screenshot
   da tela com cache mock + screenshot da empty state.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m14-export && rm -rf /tmp/m14-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 7. Commit

```
feat: m14 mini financeiro readonly leitura de cache backend
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Para validação web sem cache real, criar
  fixture em `scripts/fixtures/financas-cache.json` (genérica, sem
  destinos reais; ex.: `"destino": "mercado generico"`) que o
  hook `useFinancasCache` carrega quando rodando em web no
  ambiente de dev (gate via `__DEV__ && Platform.OS === 'web'`).
  Validar:
  - Empty state quando fixture ausente.
  - Cards renderizados quando fixture presente.
  - Lista de transações com despesa em cyan e crédito em green.
  - Banner de modo leitura sempre visível.
- **APIs nativas — Nível B (emulador Android):** copiar
  fixture para `~/Protocolo-Ouroboros/.ouroboros/cache/` no
  emulador via `adb push`. Validar leitura real via SAF.
- **Final — Nível C (celular físico):** apenas com permissão.
  Validar leitura via Syncthing real do cache gerado pelo
  backend.

Capturar screenshots em `docs/sprints/M14-screenshots/`. Comparar com
artboard `Tela 22` do `docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

- A tela deve mostrar o `gerado_em` do cache em algum lugar (ex.:
  micro caption muted no banner, `"Atualizado em <data>"`)?
  Sugestão: sim, junto do banner para deixar claro a defasagem
  possível.
- Lista das últimas 20 transações: virtualizar com `FlatList` ou
  manter scrollview simples? Sugestão: `FlatList` com
  `initialNumToRender={20}` para não regredir performance.
- Quando crédito aparece (raro no escopo atual), badge ou cor
  apenas? Sugestão: cor `--green` no valor, sem badge, mantendo
  uniformidade visual.
