# R-INT-3-HC-DOC-VERSION-FIX — CORRECAO MENCAO VERSAO SDK HC

**Tipo**: docs
**Prioridade**: P3-low
**Estimativa**: 15min
**Tranche**: R-INT
**Fase**: 3 (anti-debito pos sub-sprint B/C)

## Fonte canônica

Achado colateral catalogado pelo validador-sprint durante a validação
da sub-sprint B/C da Onda 3P (R-INT-3-HC-BRIDGE-NATIVA). Comentarios
de cabecalho em 4 pontos da bridge HC nativa referenciam versoes SDK
incorretas (`1.2.0-alpha04` ou `1.1.0-alpha11`), enquanto a versao
real resolvida pelo Gradle e a estavel `connect-client:1.1.0`
declarada em `modules/health-connect/android/build.gradle:58`.

Os comentarios datam da decisao inicial (sub-sprint A) quando o plano
era usar o alpha04 antes da virada para a versao estavel. A
implementacao atual usa 1.1.0; restou apenas residuo textual nos
cabecalhos. Zero impacto em runtime, mas confunde leitores futuros
e dispara duvida em onboarding de Opus em sessão fresh sobre qual
SDK esta efetivamente instalado.

## Hipóteses técnicas

1. **`build.gradle:58`** confirma `connect-client:1.1.0` como versao
   canonica via `rg "connect-client" modules/health-connect/`.
   Mapeamento empirico dos 4 pontos a corrigir:
   - `modules/health-connect/src/index.ts:5` cita `1.1.0-alpha11`
     (contexto: "rejeitado como obsoleto"; correto manter a frase,
     mas a versao mencionada deve ser a do pacote npm legado
     `react-native-health-connect@3.5.3` — verificar se permanece
     1.1.0-alpha11 ou virou outra).
   - `modules/health-connect/src/index.ts:7` cita
     `connect-client:1.2.0-alpha04` como versao da bridge propria —
     errado; deve ser `connect-client:1.1.0`.
   - `modules/health-connect/android/.../HealthConnectModule.kt:7`
     cita `connect-client 1.1.0-alpha11` como versao do pacote npm
     legado (manter texto se for fato; verificar package-lock).
   - `modules/health-connect/android/.../HealthConnectModule.kt:491`
     comenta `Health Connect 1.2.0-alpha04` — errado; deve ser
     `Health Connect 1.1.0`.

2. **Aritmetica documental** (lição 7 não se aplica strict — sem meta
   numerica de LOC; mas vale registrar):
   - Linhas modificadas esperadas: ~4 (uma por ocorrencia errada).
   - Arquivos tocados: 2 (`src/index.ts` e `HealthConnectModule.kt`).
   - Zero alteracao em `build.gradle` (1.1.0 ja e a versao correta
     instalada).
   - Diff esperado: aproximadamente `+4 / -4` linhas.

## APIs reutilizáveis

Nenhuma — sprint puramente textual em comentarios.

## Entregáveis

### Arquivos novos

Nenhum.

### Arquivos modificados

- `modules/health-connect/src/index.ts` (linhas 5 e 7) — atualizar
  mencao de versao para `connect-client:1.1.0` no contexto que
  descreve a bridge propria; deixar mencao a `1.1.0-alpha11` apenas
  se referir-se ao pacote npm legado `react-native-health-connect`.
- `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt`
  (linhas 7 e 491) — mesma logica: trocar `1.2.0-alpha04` por
  `1.1.0` quando referir a bridge propria.

### Testes

Sprint documental — sem teste novo. A validação e baseada em grep
determinístico (ver Proof-of-work).

### Documentação

- [ ] `docs/FEATURES-CANONICAS.md` — não se aplica (sem mudanca de
  feature).
- [ ] `STATE.md` — opcional; registrar linha em `[Unreleased]` se
  desejado.
- [ ] `ROADMAP.md` — não se aplica (sprint anti-debito P3).
- [ ] `CHANGELOG.md` `[Unreleased]` — registrar bullet em
  `### Documentacao` ou `### Correcoes`.
- [ ] `VALIDATOR_BRIEF.md` — não se aplica.

## Dependências

- **Bloqueia**: nenhuma.
- **Bloqueado por**: nenhuma (sub-sprint B/C ja fechou).
- **Decisão pendente**: nenhuma.

## OFF-LIMITS

Padrão T1 (lição 9).

**Pode tocar**:
- `modules/health-connect/src/index.ts` — apenas comentarios das
  linhas 5 e 7.
- `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt`
  — apenas comentarios das linhas 7 e 491.
- `CHANGELOG.md` em `[Unreleased]` — registrar correcao.

**Não pode tocar**:
- Qualquer logica TypeScript ou Kotlin (sprint e 100% comentario).
- `modules/health-connect/android/build.gradle` — versao
  `1.1.0` ja e canonica; trocar quebraria a build.
- Demais arquivos da bridge.
- Testes Jest existentes.
- `package.json`, `tsconfig.json`, `babel.config.js`,
  `metro.config.js`, `pessoas.config.ts`.
- Qualquer string de UI visivel (zero impacto no app).

## Restrições

- **Regra −1** (Anonimato): zero crédito de autoria. Validado por
  `./scripts/check_anonimato.sh`.
- **Sem emojis** nos comentarios atualizados.
- **Comentários em código `.ts`/`.tsx`/`.kt` sem acento**
  (convenção shell/CI) — manter padrao existente.
- **TypeScript strict** — sprint não toca codigo executavel, mas
  `npx tsc --noEmit` deve permanecer verde.
- **Worktree obrigatório** (lição 3): trabalhar em
  `.claude/worktrees/agent-<id>/`, branch `worktree-agent-<id>`.

## Verificação canônica

```bash
# Preparação obrigatória:
git rev-parse --show-toplevel
./scripts/bootstrap-worktree.sh

# Asserts deterministicos pos-edicao:
grep -nrE "1\.2\.0-alpha04" modules/health-connect/   # esperado: 0 matches
grep -nrE "connect-client:1\.1\.0(\"|$| )" modules/health-connect/  # esperado: >= 2 matches (build.gradle + comentarios)
# Observacao: mencoes a 1.1.0-alpha11 podem permanecer SE referirem
# ao pacote npm legado react-native-health-connect@3.5.3. Conferir
# contexto linha a linha. Se permanecerem, registrar justificativa
# no commit.

# Checks de invariantes:
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit

# Smoke (1 run apenas — sprint documental):
./scripts/smoke.sh
```

Sprint documental — sem validação Gauntlet/adb.

Todos exit 0. Se algum quebrar, parar e reportar — não bypassar.

## Decisões herdadas

- **Versao canonica e `connect-client:1.1.0`** (estavel, Maven
  Central). A decisao de virar do `1.2.0-alpha04` para `1.1.0`
  ocorreu durante sub-sprint A; comentarios obsoletos sao apenas
  residuo textual não corrigido entao.
- **Mencoes a `1.1.0-alpha11` podem permanecer** se forem
  qualificadas como "versao do pacote npm legado
  `react-native-health-connect@3.5.3`", não da bridge propria.
  Validar contexto linha a linha durante a edicao.
- **Sem 3 runs de smoke** — sprint não toca codigo executavel;
  1 run sanity basta.

## Proof-of-work

1. `git diff --name-only` deve mostrar exatamente 2 arquivos:
   `modules/health-connect/src/index.ts` e
   `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt`
   (e opcionalmente `CHANGELOG.md`).
2. `git diff --stat` deve mostrar aproximadamente `+4 / -4` linhas.
3. `grep -nrE "1\.2\.0-alpha04" modules/health-connect/` retorna
   **0 matches** (criterio booleano de sucesso).
4. `./scripts/smoke.sh` últimas 10 linhas verdes.
5. `npx tsc --noEmit` exit 0.
6. **Hash do commit (OBRIGATÓRIO)** — `git rev-parse HEAD`.
7. Path do worktree + branch — `git rev-parse --show-toplevel` +
   `git branch --show-current`.
8. Commit message sugerido (sem acento, lowercase):
   `docs: corrige mencao de versao sdk hc para 1.1.0 r-int-3-hc-doc-version-fix`.
9. Achados colaterais — se houver qualquer outra mencao a versao
   incorreta detectada via grep, listar path:linha com proposta de
   sprint nova (NUNCA fix inline silencioso).
