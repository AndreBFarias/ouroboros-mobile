# R-SEC-6-NPM-AUDIT-FIX — Corrigir vulnerabilidades npm sem breaking (fix seguro + overrides postcss/uuid)

**Tipo**: fix (security)
**Prioridade**: P1-high (dono declarou urgente em 2026-05-26)
**Estimativa**: 1-2h
**Tranche**: R-SEC
**Fase**: pós-Onda 3P (paralela a v1.0.0)

## Fonte canônica

`npm audit` rodado em 2026-05-26 durante o setup (`santuario Protocolo-Mob-Ouroboros`
→ `install.sh`): **24 vulnerabilidades (1 low, 22 moderate, 1 high)**. Decisão do dono
via AskUserQuestion 2026-05-26: **fix seguro + overrides cirúrgicos**, mantendo Expo
SDK 54 (NÃO subir para 56 agora — breaking, risco às vésperas do v1.0.0). O upgrade de
SDK fica materializado em `docs/sprints/R-INFRA-EXPO-SDK-56-UPGRADE-spec.md` para depois.

As 24 vulnerabilidades têm **6 pacotes-raiz**; as outras 18 são a cadeia `@expo/*`
contada individualmente (transitiva de `postcss` + `uuid`). Nenhuma das vulnerabilidades
de build-time entra no bundle Hermes do APK release, e o app tem zero rede de saída
(ADR-0007) — o risco real em runtime é ínfimo, mas a HIGH e as moderate fáceis devem
ser zeradas.

## Hipóteses técnicas

1. **`npm audit fix` sem `--force` resolve a HIGH + 3 fáceis** — comprovado via
   `npm audit fix --dry-run` (2026-05-26): `fast-uri` 3.1.0→3.1.2 (**única HIGH** —
   path traversal + host confusion), `ws` 8.20.0→8.21.0 (memory disclosure),
   `brace-expansion` (DoS), `@tootallnate/once` (control flow), + bumps
   `expo-share-intent` 6.1.0→6.1.1 e `@expo/config-plugins` 55.0.9→55.0.10.
2. **`postcss` (<8.5.10) e `uuid` (<11.1.1) só saem com `--force` → Expo 56** —
   comprovado via árvore do `npm audit`: `postcss` vive em `@expo/metro-config`
   (build CSS do NativeWind); `uuid` em `xcode`/`@expo/config-plugins` (prebuild iOS).
   `npm audit fix --force` instalaria `expo@56.0.5` e `expo-splash-screen@56` (breaking).
3. **`overrides` cirúrgicos podem forçar a versão segura sem subir o SDK** — adicionar
   em `package.json` `"overrides": { "postcss": ">=8.5.10", "uuid": ">=11.1.1" }`
   força o resolver a usar a versão corrigida nas transitivas. **Risco**: o
   `@expo/metro-config`/`prebuild-config` pode depender de API antiga de `postcss`/`uuid`
   e quebrar o build. Mitigação: validar via `npx expo export --platform android`; se
   quebrar, reverter o override específico e documentar como risco aceito.
4. **`package.json` não tem campo `overrides` hoje** — comprovado: leitura integral do
   arquivo (2026-05-26) não mostra a chave; será adicionada na raiz do objeto.

## APIs reutilizáveis

Não aplicável — sprint de dependências, sem código de aplicação.

## Entregáveis

### Arquivos modificados

- `package.json` — bumps do `npm audit fix` + novo bloco `overrides` (postcss/uuid).
  **Dono autorizou tocar `package.json`/`package-lock.json` nesta sprint** (decisão
  AskUserQuestion 2026-05-26) — exceção explícita à regra OFF-LIMITS padrão.
- `package-lock.json` — regenerado pelo npm.
- `docs/SECURITY.md` — seção "Vulnerabilidades npm — risco aceito" listando o que
  sobrou (se sobrar), por que é build-time, e o vínculo com o upgrade SDK 56 futuro.
- `VALIDATOR_BRIEF.md` §4 — nota A44 (ou índice livre) registrando: vulns de toolchain
  Expo são build-time, não entram no bundle; `audit fix --force` proibido sem decisão
  do dono (puxa SDK 56).

### Testes

- Sem teste unitário novo (sprint de deps). O gate é o build + o smoke existente.
- Regressão proibida: `npm test` mantém **≥ 3061 testes verde** (baseline 2026-05-26).

### Documentação

- [ ] `STATE.md` atualizado (HEAD + métrica de vulns antes/depois).
- [ ] `ROADMAP.md` atualizado (tile R-SEC-6 → `[ok]`).
- [ ] `CHANGELOG.md` em `[Unreleased]` (contagem antes/depois + lista de pacotes).
- [ ] `docs/FEATURES-CANONICAS.md` — **não aplicável** (sem feature de usuário).

## Dependências

- **Bloqueia**: nada.
- **Bloqueado por**: nada (independente da R-DX-GAUNTLET-ONBOARDING-BYPASS — paths
  disjuntos; podem rodar em paralelo).
- **Decisão pendente**: nenhuma (dono já escolheu fix seguro + overrides).

## OFF-LIMITS

**Pode tocar**:
- `package.json` — overrides + bumps (autorizado pelo dono nesta sprint).
- `package-lock.json` — regenerado pelo npm.
- `docs/SECURITY.md`, `VALIDATOR_BRIEF.md`, `STATE.md`, `ROADMAP.md`, `CHANGELOG.md` — docs.

**Não pode tocar**:
- `src/**`, `app/**`, `tests/**` — nenhuma mudança de código nesta sprint.
- `app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json` — sem permissão.
- **NÃO rodar `npm audit fix --force`** — puxa Expo SDK 56 (breaking). Proibido.
- **NÃO subir versões de `expo`/`react-native`/`react`** — fica para a sprint de SDK.

## Restrições

- **Regra −1** (Anonimato): N/A (deps), mas o `check_anonimato.sh` deve seguir verde.
- **Sem emojis** em docs/commits.
- **Mensagens de commit sem acento** (convenção shell/CI).
- **TypeScript strict** deve continuar 0 erros após os bumps.
- **Build Hermes deve continuar verde** — gate crítico pós-overrides.

## Verificação canônica

```bash
git rev-parse --show-toplevel
./scripts/bootstrap-worktree.sh

# Baseline ANTES:
npm audit 2>&1 | tail -3            # registrar contagem inicial (24)
npm test --silent 2>&1 | tail -5    # registrar baseline (>=3061)

# Aplicar:
npm audit fix                       # SEM --force
# editar package.json: adicionar "overrides": { "postcss": ">=8.5.10", "uuid": ">=11.1.1" }
npm install --legacy-peer-deps      # regenera lock com overrides

# Validar (gates):
npm audit 2>&1 | tail -3            # HIGH=0, contagem reduzida
npx tsc --noEmit
npm test --silent 2>&1 | tail -5    # >= baseline
npx expo export --platform android --output-dir /tmp/r-sec-6-export && rm -rf /tmp/r-sec-6-export
./scripts/smoke.sh
```

Se `npx expo export` quebrar após os overrides: reverter o override culpado (postcss
OU uuid, isolar qual), rerodar export, e documentar o remanescente como risco aceito
em `docs/SECURITY.md`. **Não** declarar pronto com build vermelho.

## Decisões herdadas

- **Fix seguro + overrides, sem `--force`** (AskUserQuestion 2026-05-26) — manter SDK 54
  estável às vésperas do v1.0.0. O upgrade 54→56 é sprint dedicada futura.
- **Vulns de toolchain Expo = risco aceito** quando não removíveis sem breaking, porque
  são build-time (não entram no APK) e o app não tem rede de saída (ADR-0007).

## Proof-of-work

1. `git diff --name-only` (esperado: `package.json`, `package-lock.json`, docs).
2. `npm audit` antes (24) e depois (contagem final + HIGH=0).
3. `npm test --silent | tail -5` (≥ 3061 verde).
4. `npx expo export --platform android` exit 0 (bundle Hermes verde com overrides).
5. `./scripts/smoke.sh` (últimas 10 linhas).
6. Hash do commit — `git rev-parse HEAD`.
7. Path do worktree + branch.
8. Achados colaterais — se algum override quebrar o build, registrar qual e por quê em
   `docs/SECURITY.md` (NUNCA fix inline silencioso).
