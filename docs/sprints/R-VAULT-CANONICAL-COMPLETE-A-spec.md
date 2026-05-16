# R-VAULT-CANONICAL-COMPLETE-A — Schemas + writers + migration boot

**Tipo**: refactor + feature (parte A de 2 — schemas, writers, migration)
**Prioridade**: P1-high
**Estimativa**: 2-3h
**Tranche**: R-VAULT (split do `R-VAULT-CANONICAL-COMPLETE-spec.md` em 2026-05-16)
**Fase**: 2 (UX/integração — bloqueia rc2)
**Bloqueia**: R-VAULT-CANONICAL-COMPLETE-B, R-INT-1

## Fonte canônica

Spec original: [`R-VAULT-CANONICAL-COMPLETE-spec.md`](R-VAULT-CANONICAL-COMPLETE-spec.md) (marcado `[split]`).
Pedido durável do dono em 2026-05-15: "tudo do app deve ser salvo em
arquivo .md, configs, stats, tudo tudo mesmo".

Esta sprint A entrega **infraestrutura de persistência** do estado
heterogêneo (settings, sessão, onboarding, pessoa, navegação) em
`.md` legível pelo sibling Python. Sprint B (separada) entrega stats
agregadas + UI Settings + cross-repo integration.

## Objetivo

Garantir que **estado canônico do app** é persistido em `.md` no
`vault/_estado/` em path determinístico, com schemas validados,
writers idempotentes e migration boot one-shot. Sem mudar shape
dos stores existentes — apenas hook não-mutativo que escreve cópia
canônica em `.md`.

## Entregáveis

### Schemas em `src/lib/schemas/vault_estado.ts`

- `EstadoSettingsSchema` — todo o conteúdo de `useSettings`
- `EstadoSessaoSchema` — `useSessao` (flags + rascunhos)
- `EstadoOnboardingSchema` — `useOnboarding`
- `EstadoPessoaSchema` — nomes + fotos refs
- `EstadoNavegacaoSchema` — `useNavegacao` (ultima rota etc)

Cada schema com versão (`version: 1`) e backward-compat via
`z.preprocess` se houver mudança futura (padrão R0 lexical).

### Writers em `src/lib/vault/escreverEstado.ts`

- Função `escreverEstadoCanonico(key, schemaName, payload)` que:
  - Valida payload via schema apropriado
  - Renderiza `.md` com frontmatter (schema + timestamp + version)
  - Escreve atomicamente via `src/lib/atomicWrite.ts` (`.writing+rename`)
  - Aplica `forceDeviceIdSuffix` (utilitário T2) no nome
  - Filtra arquivos `.sync-conflict-*` (utilitário T1B6)
- Debounce 500ms agrupado por key (não-bloqueante na UI thread)
- Path canônico: `vault/_estado/<key>-<deviceId>.md`

### Hook em cada store

`src/lib/stores/`:

- `useSettings.ts` — após cada `set()`, dispara
  `escreverEstadoCanonico('settings', 'EstadoSettings', state)`
  (debounced)
- `useSessao.ts` — idem com `'sessao'` / `'EstadoSessao'`
- `useOnboarding.ts` — idem com `'onboarding'` / `'EstadoOnboarding'`
- `usePessoa.ts` — idem com `'pessoa'` / `'EstadoPessoa'`
- `useNavegacao.ts` — idem com `'navegacao'` / `'EstadoNavegacao'`

**SecureStore permanece como cache rápido** (zustand persist
intocado). Vault é canônico, SecureStore é cache + fallback offline.

### Migration boot

`src/lib/boot/migrarEstadoParaVault.ts`:

- Idempotente (flag `useSessao.flags.estadoMigradoParaVault`)
- Cold start lê estado atual de SecureStore (já hydrated pelo
  zustand persist) e dispara 5 writes one-shot em `vault/_estado/`
- Não apaga SecureStore — permanece como cache
- Roda após `gauntletBootstrap` no `_layout.tsx` (não bloqueia
  primeiro frame)

### Testes

`tests/lib/vault/escreverEstado.test.ts`:

- Round-trip por schema (settings/sessao/onboarding/pessoa/navegacao)
- Debounce agrupa writes consecutivos
- Atomic write resiste a crash entre `.writing` e `rename`
- DeviceId suffix sempre presente
- Filtro `.sync-conflict-*` honrado

`tests/lib/boot/migrarEstadoParaVault.test.ts`:

- Migration roda 1× só (flag idempotente)
- Migration não destrói estado prévio
- Migration tolera vault inacessível (no-op silencioso)

Esperado: **+10 a +15 testes novos** (225 -> ~240 suítes).

## OFF-LIMITS (Padrão T1)

**Pode tocar**:
- Criar `src/lib/schemas/vault_estado.ts`
- Criar `src/lib/vault/escreverEstado.ts`
- Criar `src/lib/boot/migrarEstadoParaVault.ts`
- Hook não-mutativo em cada `src/lib/stores/use*.ts` (NÃO mudar shape do state; só adicionar subscriber/listener que dispara o writer)
- Adicionar 1 linha em `app/_layout.tsx` chamando a migration boot

**Não pode tocar**:
- Schemas existentes em `src/lib/schemas/` (exceto criar o novo `vault_estado.ts`)
- Lógica interna dos stores (zustand persist permanece igual)
- Outros writers do vault (`escreverHumor`, `escreverDiario` etc — não relacionados a esta sprint)
- UI (Settings, Home, qualquer rota visual)

**Sibling**: Não tocar `protocolo-ouroboros` nesta sprint. Sprint B (separada) abre issue `etl-contract`.

## Dependências

- **Bloqueia**: R-VAULT-CANONICAL-COMPLETE-B (precisa schemas + writers), R-INT-1 (Hub Integrações lê estado)
- **Bloqueado por**: T2 (`488e7fa` — atomic write doutrina, já mergeada), T1B6 (`a49222f` — filtro sync-conflict, já mergeada)

## Verificação canônica

```bash
# 1. Smoke + testes
./scripts/smoke.sh

# 2. Inspecionar vault em runtime real (após boot)
adb shell run-as com.ouroboros.mobile ls files/Ouroboros/_estado/

# 3. Validar round-trip: mudar config no app, ver arquivo aparecer
# (validação manual via Gauntlet ou adb)

# 4. Drift contract NÃO sobe ainda (sprint B vai mexer)
./scripts/test_contract_drift.sh
```

## Proof-of-work

1. Lista de arquivos criados/modificados.
2. Saída `npx jest --silent 2>&1 | tail -5` — esperado +10 a +15 testes.
3. Saída `./scripts/smoke.sh`.
4. **Hash do commit (OBRIGATÓRIO)** + path do worktree.
5. `ls vault/_estado/` após cold start (5 arquivos esperados).
6. Achados colaterais (Edit-pronto ou sprint-ID nova).

## Decisões herdadas da spec original

- `vault/_estado/` é canônico — sibling lê de lá.
- SecureStore permanece como cache rápido + fallback offline.
- Stats agregadas vão na sprint B (separadas em `.md` por período).
- Migration idempotente — flag `estadoMigradoParaVault` no `useSessao`.
- Cross-repo é responsabilidade da sprint B (issue + drift contract).
