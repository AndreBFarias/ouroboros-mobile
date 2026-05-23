# R-INT-3-HC-DOC-METADATA-CLARIFY — ESCLARECER lastModifiedTime EM buildInsertMetadata

**Tipo**: docs
**Prioridade**: P3-low
**Estimativa**: 5min
**Tranche**: R-INT
**Fase**: 3 (anti-debito pos sub-sprint B/C)

## Fonte canônica

Minúcia catalogada pelo validador-sprint durante a validação da
sub-sprint B/C da Onda 3P (BRIDGE-NATIVA-C). Em
`modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt:157`,
o campo `lastModifiedTime = Instant.now()` é cosmético — o Health
Connect sobrescreve este valor server-side ao persistir o registro.
Zero impacto em runtime, mas confunde leitor futuro que pode achar
que o cliente controla este timestamp.

A função `buildInsertMetadata(recordingMethod: Int): Metadata` mora
em `Utils.kt:154-162` e é usada por `buildExerciseSession`,
`buildWeight`, `buildBodyFat` e `buildMenstruationFlow` para
fornecer o `Metadata` canônico dos inserts.

## Hipóteses técnicas

1. **Localização confirmada via Read direto**:
   - `Utils.kt:154` — declaração da função `buildInsertMetadata`.
   - `Utils.kt:157` — `/* lastModifiedTime = */ Instant.now(),`.
   - O comentário `// Metadata canonico para inserts...` já existe
     em `Utils.kt:152-153`, mas não menciona o caráter cosmético do
     `lastModifiedTime`.

2. **Aritmética documental**:
   - Linhas modificadas esperadas: ~2 (uma linha de comentário nova
     acima do `lastModifiedTime`, ou estendendo o comentário do
     cabeçalho da função).
   - Arquivos tocados: 1 (`Utils.kt`).
   - Diff esperado: aproximadamente `+2 / -0` linhas (puro acréscimo
     de comentário).

3. **Consolidação recomendada com R-INT-3-HC-DOC-VERSION-FIX**:
   Ambas sprints são P3, docs, mexem apenas em comentários Kotlin/TS
   da bridge HC, e somam ~6 linhas alteradas. Sugestão durável: o
   executor pode pegar AS DUAS no mesmo worktree e commit, mantendo
   commit message conjunto tipo:
   `docs: clarifica metadata hc e corrige mencao versao sdk r-int-3-hc-doc`.
   Decisão final fica com o orquestrador na hora do dispatch.

## APIs reutilizáveis

Nenhuma — sprint puramente textual em comentário Kotlin.

## Entregáveis

### Arquivos novos

Nenhum.

### Arquivos modificados

- `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt`
  (próximo à linha 157, dentro da função `buildInsertMetadata`) —
  adicionar comentário inline ou estender o comentário do cabeçalho
  (`Utils.kt:152-153`) para esclarecer que `lastModifiedTime` é
  cosmético.

**Texto canônico sugerido (sem acento, convenção comentário Kotlin):**

Opção A (inline, acima da linha 157):
```kotlin
  // HC sobrescreve lastModifiedTime server-side ao persistir; Instant.now()
  // serve apenas para satisfazer o construtor Metadata.
  /* lastModifiedTime = */ Instant.now(),
```

Opção B (estender comentário do cabeçalho da função, linhas 152-153):
```kotlin
// Metadata canonico para inserts. recordingMethod ajustavel por caller
// (ExerciseSession=ACTIVELY_RECORDED, demais=MANUAL_ENTRY).
// lastModifiedTime e cosmetico — HC sobrescreve server-side no persist.
```

Executor escolhe a opção mais legível para o estilo do arquivo. A
preferência leve é Opção A (proximidade visual ao campo confuso).

### Testes

Sprint documental — sem teste novo. Validação por grep determinístico.

### Documentação

- [ ] `docs/FEATURES-CANONICAS.md` — não se aplica.
- [ ] `STATE.md` — não se aplica.
- [ ] `ROADMAP.md` — não se aplica.
- [ ] `CHANGELOG.md` `[Unreleased]` — registrar bullet curto em
  `### Documentacao` (ou consolidado com R-INT-3-HC-DOC-VERSION-FIX
  se aglomerar).
- [ ] `VALIDATOR_BRIEF.md` — não se aplica.

## Dependências

- **Bloqueia**: nenhuma.
- **Bloqueado por**: nenhuma (sub-sprint B/C já fechou em HEAD 86df505).
- **Consolidação sugerida**: R-INT-3-HC-DOC-VERSION-FIX (mesmo
  worktree, mesmo commit, mesma janela de execução).
- **Decisão pendente**: orquestrador decide na hora do dispatch se
  vai aglomerar ou rodar separado.

## OFF-LIMITS

Padrão T1 (lição 9).

**Pode tocar**:
- `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt`
  — apenas comentário próximo à linha 157 ou ao cabeçalho da função
  `buildInsertMetadata` (linhas 152-153).
- `CHANGELOG.md` em `[Unreleased]` — bullet curto.

**Não pode tocar**:
- Qualquer lógica Kotlin (sprint é 100% comentário).
- Demais funções de `Utils.kt` (`buildExerciseSession`, `buildWeight`,
  `buildBodyFat`, `buildMenstruationFlow`, dispatchers).
- Qualquer outro arquivo da bridge HC.
- Testes Jest existentes.
- `package.json`, `tsconfig.json`, `babel.config.js`,
  `metro.config.js`, `pessoas.config.ts`.
- Qualquer string de UI visível (zero impacto no app).

## Restrições

- **Regra −1** (Anonimato): zero crédito de autoria. Validado por
  `./scripts/check_anonimato.sh`.
- **Sem emojis** no comentário adicionado.
- **Comentário em código `.kt` sem acento** (convenção shell/CI) —
  já refletido nas opções A/B acima (`e`, `cosmetico`, `metadata`).
- **TypeScript strict** — sprint não toca código TS, mas
  `npx tsc --noEmit` deve permanecer verde.
- **Worktree obrigatório** (lição 3): trabalhar em
  `.claude/worktrees/agent-<id>/`, branch `worktree-agent-<id>`.

## Verificação canônica

```bash
# Preparação obrigatória:
git rev-parse --show-toplevel
./scripts/bootstrap-worktree.sh

# Asserts deterministicos pos-edicao:
grep -n -A1 "lastModifiedTime" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt
# esperado: mostrar o comentario novo nas linhas adjacentes ao campo.

grep -nE "HC sobrescreve|cosmetico|server-side" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt
# esperado: >=1 match com a frase esclarecedora.

# Checks de invariantes:
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit

# Smoke (1 run apenas — sprint documental, zero runtime):
./scripts/smoke.sh
```

Sprint documental — sem validação Gauntlet/adb.

Todos exit 0. Se algum quebrar, parar e reportar — não bypassar.

## Decisões herdadas

- **`Metadata.lastModifiedTime` é cosmético no insert flow** —
  comportamento documentado do Health Connect (jetpack
  `androidx.health.connect.client`): o cliente envia o `Instant.now()`
  no construtor por exigência da assinatura, mas o serviço HC
  sobrescreve o campo no momento da persistência. Decisão durável
  registrada aqui para evitar confusão em onboarding futuro.
- **Sem 3 runs de smoke** — sprint não toca código executável; 1 run
  sanity basta.
- **Consolidação com R-INT-3-HC-DOC-VERSION-FIX é fortemente
  recomendada** — ambas P3, docs, mesmo módulo HC; o overhead de
  sprint separada não compensa para ~6 linhas totais.

## Proof-of-work

1. `git diff --name-only` deve mostrar exatamente 1 arquivo:
   `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt`
   (e opcionalmente `CHANGELOG.md`). Se aglomerado com
   R-INT-3-HC-DOC-VERSION-FIX, soma 2 arquivos da bridge + opcional
   CHANGELOG.
2. `git diff --stat` deve mostrar aproximadamente `+2 / -0` linhas
   (ou `+1 / -1` se Opção B reescrever o cabeçalho da função).
3. `grep -nE "HC sobrescreve|cosmetico" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/Utils.kt`
   retorna **>=1 match**.
4. `./scripts/smoke.sh` últimas 10 linhas verdes.
5. `npx tsc --noEmit` exit 0.
6. **Hash do commit (OBRIGATÓRIO)** — `git rev-parse HEAD`.
7. Path do worktree + branch — `git rev-parse --show-toplevel` +
   `git branch --show-current`.
8. Commit message sugerido (sem acento, lowercase):
   - Sozinho: `docs: clarifica metadata hc lastmodifiedtime cosmetico r-int-3-hc-doc-metadata-clarify`.
   - Aglomerado com VERSION-FIX: `docs: clarifica metadata hc e corrige mencao versao sdk r-int-3-hc-doc`.
9. Achados colaterais — se durante a edição surgir outra confusão
   semântica em `Utils.kt` ou nos consumidores de `buildInsertMetadata`,
   listar path:linha com proposta de sprint nova (NUNCA fix inline
   silencioso).
