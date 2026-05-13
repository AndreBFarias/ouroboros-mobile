# Q17.d — Seção "Importados de Conexão Saúde" em Evolução

> **Tamanho:** Pequeno (2–4h)
> **Bloqueia v1.0.0?** Não — feature aditiva.
> **Pré-requisitos:** Q17.b (`lib/health/sync.ts` com readers prontos).

## Contexto

`src/lib/health/sync.ts` (Q17.b) já expõe leitores:

- `sincronizarTreinosDeHC(dias)` — ExerciseSessionRecord.
- `sincronizarPassosDeHC(dias)` — StepsRecord.
- `sincronizarPesoDeHC(dias)` — WeightRecord.

Mas nenhuma UI consome ainda. O usuário não vê passos da pulseira,
nem peso da balança inteligente, nem treinos externos. Esta sprint
liga o cano.

## Objetivo da sprint

Adicionar bloco "Importados de Conexão Saúde (últimos N dias)" no
topo da aba **Saúde Física → Evolução** (`MemoriasMarcosTab` ou
`EvolucaoCorporalTab`, dependendo de qual estiver ativa).

Exibe 3 cards horizontais:

1. **Passos** — total dos últimos 7 dias + delta vs semana anterior.
2. **Peso (HC)** — última leitura + delta vs anterior, com data.
3. **Treinos externos** — contagem dos últimos 30 dias + tap abre
   sheet listando cada `ExerciseSession` com origem + duração.

## Decisões técnicas firmes

- **Render apenas se conectado.** Hook `useHealthConnect` checa
  `settings.featureToggles.healthConnectSync` + permissions
  concedidas. Se off, bloco inteiro não renderiza (não polui UI).
- **Não persistir no Vault.** Dados de HC ficam apenas em RAM
  (cache do hook). Recap e exports não enxergam HC.
- **Pull on-demand.** A cada `focus` da tab roda `Promise.all` dos
  3 readers + atualiza state. Loading state via skeleton inline
  (não bloqueia render).
- **Erro silencioso.** Qualquer falha cai em "Dados indisponíveis"
  no card, sem toast (path não-crítico).

## Arquivos a criar/modificar

### Novos

1. `src/lib/hooks/useHealthConnectResumo.ts`
   - Hook que retorna `{ passos7dias, ultimoPeso, treinos30dias, loading, erro }`.
   - Internamente faz `Promise.all` dos 3 readers.
   - Computa deltas (`semana anterior` / `peso anterior`).

2. `src/components/saude/CardHCResumo.tsx`
   - Componente apresentacional (3 mini-cards lado a lado).
   - Variação `compact` (icon + número + delta) e `expandido`
     (mais detalhes em sheet).

3. `tests/lib/hooks/useHealthConnectResumo.test.tsx`
   - Mock dos 3 readers do `lib/health/sync.ts`.
   - Cobertura: loading inicial, dados completos, falha parcial,
     setting off (não chama readers).

### Modificações

- `src/components/screens/EvolucaoCorporalTab.tsx` (ou tab equivalente)
  - Importar `<CardHCResumo />` e renderizar no topo da ScrollView
    quando o hook retornar dados.

- `docs/FEATURES-CANONICAS.md` §3.7 — adicionar parágrafo sobre
  exibição em Evolução.

## Proof-of-work esperado

1. **Hook retorna dados quando HC conectado:**
   ```bash
   npx jest tests/lib/hooks/useHealthConnectResumo.test.tsx --silent
   # 6+ testes verde
   ```

2. **Bloco aparece em runtime:**
   ```bash
   # Pre: APK alpha-5+ instalado, HC conectado via /settings/integracoes,
   # com permissions concedidas.
   # Menu → Saúde Física → aba Evolução
   adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png /tmp/s.png
   # Visualmente: 3 cards no topo com passos, peso, treinos externos.
   ```

3. **Sem regressão quando HC off:**
   ```bash
   # /settings/integracoes → Desconectar
   # Voltar pra Evolução → bloco some, layout não quebra.
   ```

## Critérios de aceite

- [ ] Hook `useHealthConnectResumo` retorna estados corretos
- [ ] `CardHCResumo` renderiza 3 cards lado-a-lado
- [ ] Bloco aparece somente com HC conectado + permissions
- [ ] Pull on-demand no `focus` da tab (não em background)
- [ ] Falha silenciosa em qualquer leitor (UI fica em "Dados indisponíveis")
- [ ] 1892+6 testes verde
- [ ] Sprint `[ok]` em ROADMAP + FEATURES-CANONICAS §3.7

## Anti-débito

Se algum reader específico falhar consistentemente em algum device,
abrir Q17.d.x com diagnose (provavelmente vai apontar pra
limitação do provider HC do device).
