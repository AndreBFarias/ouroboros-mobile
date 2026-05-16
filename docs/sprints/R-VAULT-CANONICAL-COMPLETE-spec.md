# R-VAULT-CANONICAL-COMPLETE — Tudo em .md (configs + stats + sessão)

**Tipo**: refactor + feature
**Prioridade**: P1-high
**Estimativa**: 4-6h
**Tranche**: R-VAULT (nova, derivada do pedido durável do dono em 2026-05-15)
**Fase**: 2 (UX/integração — bloqueia rc2)

## Fonte canônica

Pedido do dono em 2026-05-15: "lembrando que tudo do app deve ser
salvo em arquivo .md, configs, stats, tudo tudo mesmo. A ideia é
deixar eles e integrar eles com o projeto desktop que só lê os .md
e as configs de datas de forma que possamos trabalhar em séries
históricas e analisar profundamente nossa própria vida e ir criando
um diário de fato."

## Objetivo

Garantir que **100% do estado relevante** do app é persistido
em `.md` legível pelo sibling Python desktop. Hoje há estado em
3 lugares heterogêneos:

1. **`.md` no Vault** (canônico — humor, diário, eventos, marcos,
   medidas, ciclo, contadores, tarefas, alarmes, rotinas, treinos,
   exercícios, grupos, mídias, agenda cache, finanças cache) → OK
2. **`zustand persist` em SecureStore** (settings, sessão,
   onboarding, navegação, pessoas) → **NÃO LEGÍVEL pelo desktop**
3. **RAM efêmera** (stats agregadas calculadas on-demand,
   estado de UI) → **PERDIDO entre sessões + invisível pro desktop**

Esta sprint **migra (2) + (3) para .md** no Vault em path canônico
`vault/_estado/`.

## Entregáveis

### Schemas novos

`src/lib/schemas/vault_estado.ts`:
- `EstadoSettingsSchema` — todo o conteúdo de `useSettings`
- `EstadoSessaoSchema` — `useSessao` (flags + rascunhos)
- `EstadoOnboardingSchema` — `useOnboarding`
- `EstadoPessoaSchema` — nomes + fotos
- `EstadoNavegacaoSchema` — `useNavegacao` (ultima rota etc)
- `StatsAgregadasSchema` — métricas calculadas (humor médio 7d/30d/90d,
  count por tipo, streaks, etc) — cache atualizado em writes

### Writers em sync com stores

`src/lib/vault/escreverEstado.ts`:
- Hook em cada store: ao mudar, dispara debounced write (500ms)
  para `vault/_estado/<key>.md`
- Frontmatter com schema + timestamp + version
- Backward-compat: SecureStore permanece como cache rápido +
  fallback se Vault inacessível

### Stats agregadas

`src/lib/stats/calcular.ts`:
- Função pura `calcularStatsAgregadas(periodo: '7d' | '30d' | '90d' | 'all')`
- Lê do Vault, agrega
- Escreve `vault/_estado/stats-<periodo>.md` com timestamp da última
  atualização
- Re-roda em batch a cada save de humor/diário/etc (debounce 30s)

### Migration boot

`src/lib/boot/migrarEstadoParaVault.ts`:
- Idempotente (flag `useSessao.flags.estadoMigradoParaVault`)
- Lê estado atual de SecureStore
- Escreve no Vault `vault/_estado/`
- Não apaga SecureStore (continua como cache)

### Cross-repo: schema canônico

`docs/SCHEMA-VAULT-ESTADO.md`:
- Documenta o que cada `vault/_estado/<key>.md` contém
- Versão pra sibling Python ler sem ambiguidade
- Adicionar entries em `docs/CONTRACT-MOBILE-BACKEND.csv` (Q21 ETL)
  cobrindo o novo schema (drift check vai detectar campos faltantes)

### Sibling: issue `etl-contract`

Abrir issue no `AndreBFarias/protocolo-ouroboros`:
- Título: "feat: ler vault/_estado/ pra séries históricas"
- Body: link pra `docs/SCHEMA-VAULT-ESTADO.md` + lista de novos arquivos
- Label: `etl-contract`

### UI Settings (opcional)

Botão "Exportar estado completo" em Settings → gera ZIP
`<deviceId>-<timestamp>-estado-completo.zip` (snapshot manual).

## Dependências

- **Bloqueia**: R-INT-1 (Hub Integrações — ler estado de integrações
  do `.md` em vez de só do store)
- **Bloqueado por**: T2 (`488e7fa` — atomic write doutrina),
  T1B6 (`a49222f` — filtro sync-conflict)

## OFF-LIMITS

Padrão T1. **Pode tocar**: criar `src/lib/vault/escreverEstado.ts`,
`src/lib/stats/calcular.ts`, `src/lib/boot/migrarEstadoParaVault.ts`,
`src/lib/schemas/vault_estado.ts`, novo doc
`docs/SCHEMA-VAULT-ESTADO.md`. Modificar stores `src/lib/stores/*.ts`
**apenas** para hookar o sync (não mudar shape).

**Sibling**: read-only do `protocolo-ouroboros` + abrir issue
`etl-contract`.

## Verificação canônica

```bash
./scripts/smoke.sh
./scripts/test_contract_drift.sh  # validar que 174 → ~250+ campos
# Live test:
# 1. Mudar config no app → arquivo .md aparece em vault/_estado/settings.md
# 2. Reabrir app → estado carrega do .md (fallback SecureStore funciona)
# 3. cd ../protocolo-ouroboros && python -c "from src.ingestor import lerEstado; print(lerEstado())"
```

## Proof-of-work

1. Lista de arquivos criados/modificados.
2. Saída `npx jest --silent | tail -5` — esperado +10 testes (cada
   schema novo + writer + migration + stats).
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)**.
5. Path do worktree + branch.
6. Drift check antes/depois (174 → ~250+ campos auditados).
7. Snapshot do `vault/_estado/` em runtime real (`adb pull`).
8. Issue aberta no sibling com link.
9. Achados colaterais.

## Decisões tomadas

- **`vault/_estado/` é canônico** — sibling lê de lá.
- **SecureStore permanece como cache rápido** — não-canônico mas
  preserva performance + fallback offline.
- **Stats em `.md` separados** (`stats-7d.md`, `stats-30d.md` etc) —
  facilita parse incremental pelo sibling.
- **Migration idempotente** — rodar em qualquer cold start sem
  destruir estado prévio.
- **Cross-repo via issue + drift contract** — não força sibling a
  mudar; ele decide quando consumir.
