# R-VAULT-CANONICAL-COMPLETE-B — Stats agregadas + UI Settings + cross-repo

**Tipo**: refactor + feature (parte B de 2 — stats, UI export, cross-repo)
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-VAULT (split do `R-VAULT-CANONICAL-COMPLETE-spec.md` em 2026-05-16)
**Fase**: 2 (UX/integração — bloqueia rc2)
**Bloqueado por**: R-VAULT-CANONICAL-COMPLETE-A (precisa schemas + writers)

## Fonte canônica

Spec original: [`R-VAULT-CANONICAL-COMPLETE-spec.md`](R-VAULT-CANONICAL-COMPLETE-spec.md) (marcado `[split]`).
Parte A: [`R-VAULT-CANONICAL-COMPLETE-A-spec.md`](R-VAULT-CANONICAL-COMPLETE-A-spec.md).

Sprint A entregou infraestrutura (schemas + writers + migration boot).
Esta sprint B fecha a tese "tudo em .md" entregando **stats agregadas
em `.md`** + **UI de export** + **integração cross-repo** com o
sibling Python ETL.

## Objetivo

Permitir que o sibling Python desktop leia **séries históricas
calculadas** sem precisar reagregar do zero: stats por período
(7d/30d/90d/all) ficam em `.md` próprios, atualizadas reactively em
cada save de humor/diário/medida/conquista/crise/conexão/etc.

Adicionar botão "Exportar estado completo" em Settings (snapshot
manual). Abrir issue `etl-contract` no sibling para guiar consumo.

## Entregáveis

### Schema novo em `src/lib/schemas/vault_estado.ts`

- `StatsAgregadasSchema` — métricas calculadas com versão e
  timestamp. Campos: `humorMedio7d`, `humorMedio30d`, `humorMedio90d`,
  `humorMedioAll`, `countPorTipo` (record `tipo -> n`), `streaksAtuais`
  (record `id -> dias`), `topGatilhosUltimos90d` (top 5 por
  frequência), `topConquistas` (idem), `ultimaAtualizacao`.

### Calculador puro

`src/lib/stats/calcular.ts`:

- `calcularStatsAgregadas(periodo: '7d' | '30d' | '90d' | 'all'): StatsAgregadas`
- Lê do Vault via leitores canônicos existentes
  (`useHumorHistorico`, `useDiarioHistorico`, `useConquistas`,
  `useCrise`, `useGatilho`, `useMarcos`)
- 100% pura (sem side effects)
- Testável em isolamento

### Writers de stats

`src/lib/stats/escreverStats.ts`:

- Função `escreverStatsAgregadas(periodo)` que:
  - Chama `calcularStatsAgregadas(periodo)`
  - Valida via `StatsAgregadasSchema`
  - Escreve em `vault/_estado/stats-<periodo>-<deviceId>.md`
  - Atomic + suffix (utilitários T1/T2)
- Hook reactivo via subscriber dos stores de domínio (humor, diário,
  conquistas, crise, gatilho, marcos): debounce 30s agrupado por
  período. Não-bloqueante UI.

### UI Settings — "Exportar estado completo"

`app/settings/index.tsx` (ou seção existente equivalente):

- Botão "Exportar estado completo" abaixo da seção do Vault
- Toca: gera ZIP `<deviceId>-<timestamp>-estado-completo.zip` em
  `cacheDirectory` (efêmero, NÃO persiste no Vault)
- ZIP contém:
  - `vault/_estado/*.md` (5 arquivos sprint A + 4 stats sprint B)
  - `vault/_meta.md` com summary humano (totalArquivos, sizeMB,
    timestamps)
- Compartilha via `expo-sharing` (share intent nativo)
- Toast PT-BR "Estado exportado" no sucesso, toast erro no fail
- Acessibilidade: `accessibilityLabel="Exportar estado completo"`
  (sem acento, convenção screen reader)

### Doc canônico cross-repo

`docs/SCHEMA-VAULT-ESTADO.md` (novo, ~80-100 linhas):

- Lista cada `vault/_estado/<key>-<deviceId>.md`:
  - Path
  - Schema (apontar pra `src/lib/schemas/vault_estado.ts`)
  - Frequência de update
  - Exemplo de frontmatter + body
- Seção "Para o sibling Python ETL":
  - Como parsear (yaml-frontmatter + markdown body)
  - Como dedupe por deviceId
  - Como detectar staleness via `ultimaAtualizacao`

### Drift contract

`docs/CONTRACT-MOBILE-BACKEND.csv` (ou `.md` se for o canônico):

- Adicionar ~80+ entries cobrindo novos campos dos 5 estados + 4
  stats (atualmente 174 campos auditados, deve subir pra ~250+)
- Rodar `./scripts/test_contract_drift.sh` e validar 0 drift

### Sibling: issue `etl-contract`

Abrir no `AndreBFarias/protocolo-ouroboros` via `gh issue create`:

- **Título**: `feat: ler vault/_estado/ pra series historicas`
- **Body** contendo:
  - Link pra `docs/SCHEMA-VAULT-ESTADO.md`
  - Lista dos 9 arquivos novos (`<key>-<deviceId>.md`)
  - Critérios de aceitação: parse yaml frontmatter, dedup por
    deviceId, expor via `lerEstado()` + `lerStatsAgregadas(periodo)`
- **Labels**: `etl-contract`, `cross-repo`

### Testes

`tests/lib/stats/calcular.test.ts`:

- Round-trip por período (7d/30d/90d/all)
- Edge cases: vault vazio, vault só com 1 item, vault com lacunas
  temporais
- Top-5 ranking determinístico (sort estável por count desc + slug asc)

`tests/lib/stats/escreverStats.test.ts`:

- Debounce 30s agrupa writes
- Schema validation falha vira no-op silencioso (log only)

`tests/lib/vault/exportarEstadoCompleto.test.ts`:

- ZIP contém todos os 9 arquivos
- Path em cacheDirectory (efêmero)
- Share intent disparado (mock `expo-sharing`)

Esperado: **+12 a +18 testes novos**.

## OFF-LIMITS (Padrão T1)

**Pode tocar**:
- Criar `src/lib/stats/calcular.ts`
- Criar `src/lib/stats/escreverStats.ts`
- Estender `src/lib/schemas/vault_estado.ts` com `StatsAgregadasSchema`
- Adicionar botão "Exportar estado completo" em `app/settings/index.tsx`
- Criar `src/lib/vault/exportarEstadoCompleto.ts`
- Criar `docs/SCHEMA-VAULT-ESTADO.md`
- Atualizar `docs/CONTRACT-MOBILE-BACKEND.csv`/`.md`
- Abrir issue no sibling via `gh issue create`

**Não pode tocar**:
- Stores existentes (sprint A já hookou)
- Schemas existentes além de `vault_estado.ts`
- Calculadores de stats existentes (se houver — só adicionar novo)
- Lógica do sibling Python (só doc + issue)

**Sibling**: Read-only do `protocolo-ouroboros` + abrir issue.

## Dependências

- **Bloqueia**: R-INT-1 (Hub Integrações lê stats agregadas).
- **Bloqueado por**: R-VAULT-CANONICAL-COMPLETE-A (schemas + writers + migration boot).

## Verificação canônica

```bash
# 1. Smoke + testes
./scripts/smoke.sh

# 2. Drift contract sobe 174 -> ~250+
./scripts/test_contract_drift.sh

# 3. Vault em runtime real
adb shell run-as com.ouroboros.mobile ls files/Ouroboros/_estado/
# Esperado: 5 estado + 4 stats = 9 arquivos

# 4. UI Settings export funciona (Gauntlet ou device)
# Toca "Exportar estado completo" -> share intent abre

# 5. Sibling lê (após issue + impl)
cd ../protocolo-ouroboros
.venv/bin/python -c "from src.ingestor import lerEstado; print(lerEstado())"
```

## Proof-of-work

1. Lista de arquivos criados/modificados.
2. Saída `npx jest --silent 2>&1 | tail -5` — esperado +12 a +18 testes.
3. Saída `./scripts/smoke.sh` + `./scripts/test_contract_drift.sh`.
4. **Hash do commit (OBRIGATÓRIO)** + path do worktree.
5. `ls vault/_estado/` após cold start + 5min de uso (9 arquivos esperados).
6. URL da issue `etl-contract` aberta no sibling.
7. Screenshot Gauntlet do botão "Exportar estado completo" funcionando.
8. Achados colaterais.

## Decisões herdadas da spec original

- Stats em `.md` separados (`stats-7d.md`, `stats-30d.md` etc) facilita parse incremental.
- Cross-repo via issue + drift contract — não força sibling a mudar; ele decide quando consumir.
- Export Settings é snapshot manual em cacheDirectory (efêmero, não polui Vault).
