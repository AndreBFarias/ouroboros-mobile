# R-SEC-4-PROGUARD-CLEANUP — Limpeza de referência morta a react-native-health-connect em extraProguardRules + reforço opcional de -keep para records reflexionados

**Tipo:** cleanup (atualização de regra ProGuard pós-remoção de dependência upstream)
**Prioridade:** P3
**Estimativa:** 20 min
**Fase:** pós-Onda 3P Fase A
**Depende de:** `R-INT-3-HC-BRIDGE-NATIVA-D-CLEANUP-MIGRATION` (já fechada — removeu `react-native-health-connect` de `package.json`, do array `plugins` em `app.json:117` e o `postinstall` patch-package) **e** `R-INT-3-HC-LIVE-CHECKPOINT` (precisa alpha-32 build para validar release real).

## Contexto

A sub-sprint D da Onda 3P Fase A (bridge HC nativa cleanup migration) entregou três pontos cirúrgicos:

1. Removeu `"react-native-health-connect": "^3.5.3"` de `package.json.dependencies`.
2. Removeu `"react-native-health-connect"` do array `expo.plugins` em `app.json` (linha 117 ao tempo da sprint).
3. Removeu o `postinstall: "patch-package"` e o dev-dep `patch-package` (diretório `patches/` confirmado inexistente).

Contudo, o spec D explicitamente declarou OFF-LIMITS o bloco `expo.android.proguardRules.extraProguardRules` em `app.json:126` (verificado nesta sprint via `grep -n "extraProguardRules" app.json`). Esse bloco — string única JSON com `\n` literais — abre com um comentário-cabeçalho que lista as bibliotecas que **contribuem `consumerProguardFiles` próprios via AAR**, e a lista ainda inclui:

```
# react-native (core), react-native-reanimated, react-native-worklets,
# react-native-health-connect, expo-modules-core, react-native-svg,
# expo-notifications, expo-location.
```

Como a lib foi excluída, a menção a `react-native-health-connect` virou referência morta. Não afeta runtime (é comentário ProGuard, prefixado com `#`), mas:

- Polui auditoria futura — `grep react-native-health-connect app.json` ainda devolve 1 match e induz a engano.
- Pode confundir contribuidores e validações automáticas que se baseiam em "lib citada → instalada".
- O .aar do upstream contribuía regras próprias (`-keep class androidx.health.connect.client.records.**` em particular), que **não estão mais no projeto**. Hoje só temos `-keep class androidx.health.connect.client.** { *; }` e `-keep class androidx.health.platform.client.** { *; }` declarados explicitamente. Em release `enableMinifyInReleaseBuilds: true` + `enableShrinkResourcesInReleaseBuilds: true` (confirmado em `app.json:124-125`), record types resolvidos por reflexão dentro do nosso módulo `com.ouroboros.healthconnect` (em `modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/`) podem ser shrinkados se `androidx.health.connect.client.records.*` não tiver `-keep` explícito ou se a reflexão por `Class.forName` cair em record names canônicos que o R8 não preserva. Risco real: `ClassNotFoundException` em release build.

Por isso esta sprint dedicada: limpa a menção morta **e** reforça defensivamente a cobertura de `androidx.health.connect.client.records.*` para garantir que peso, treino, sono, FC, gordura corporal e menstruação não crashem em release shrink.

## Escopo (touches autorizados)

- **Arquivos a modificar:**
  - `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json` — única edição: o valor da chave `expo.plugins[<expo-build-properties>].android.extraProguardRules` (linha 126 confirmada via grep nesta sprint; o executor deve reconfirmar via `grep -n "extraProguardRules" app.json` antes de editar — número de linha pode ter shiftado entre sprints).
- **Arquivos a criar:** nenhum.
- **Arquivos NÃO a tocar (OFF-LIMITS):**
  - `modules/health-connect/**` — bridge nativa estável (Kotlin + JS). Zero Kotlin/TS nesta sprint.
  - `src/**` — bridge consumer não muda.
  - `tests/**` — sem regressão esperada (ProGuard não roda em Jest).
  - `package.json` — já saneado pela sub-sprint D.
  - Qualquer outra chave em `app.json` (permissões, plugins array, versionCode etc.).
  - `eas.json` — confirmado nesta exploração que `extraProguardRules` vive só em `app.json`.

## Acceptance criteria

1. `grep "react-native-health-connect" app.json` retorna **0 matches** (referência morta extirpada).
2. `grep "com.ouroboros.healthconnect" app.json` retorna **≥ 1 match** (regra do bridge nativa preservada — não pode ter sumido por acidente de edit).
3. `grep "androidx.health.connect.client" app.json` retorna **≥ 1 match** (regra do SDK Health Connect preservada).
4. Nova regra defensiva presente: `grep -E "androidx\\.health\\.connect\\.client\\.records" app.json` retorna **≥ 1 match** (reforço para record types reflexionados — coberto por uma das duas formas abaixo, à escolha do executor com base no payload mais conservador):
   - Forma A (mantida pelo `**` que já existe — apenas adicionar comentário explícito sobre records): documentar que `androidx.health.connect.client.**` já abrange `records.*` e por isso a regra preexistente é suficiente. Esta forma satisfaz o critério 4 apenas se for adicionada uma linha de comentário literal contendo a string `androidx.health.connect.client.records` (para o grep do critério 4 passar).
   - Forma B (mais conservadora — recomendada): adicionar regra dedicada `-keepclasseswithmembernames class androidx.health.connect.client.records.** { *; }` logo após a regra existente `-keep class androidx.health.connect.client.** { *; }`. Garante preservação dos nomes de membros (campos/getters) acessados via reflexão por nome.
5. JSON continua válido após edit: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))"` exit 0.
6. Smoke Jest verde sem regressão: `./scripts/smoke.sh` mantém **289 suites / 2768 testes** (baseline declarada na sprint D — executor confirma baseline atual antes de editar, caso baseline tenha evoluído com novas suítes da Onda 3Q).
7. Validação real em release APK (alpha-32 ou superior): smoke test live no Xiaomi cobrindo as 6 superfícies HC sensíveis a shrink — peso, treino, gordura corporal, FC, sono, menstruação — **sem `ClassNotFoundException`** no logcat com filtro `adb logcat --pid $(adb shell pidof com.ouroboros.mobile) | grep -iE "ClassNotFound|NoSuchMethod|VerifyError"`.

## Invariantes a preservar

- Acentuação PT-BR em qualquer comentário em prosa que entre no `extraProguardRules` (o bloco já mistura inglês técnico e PT-BR — ver "Stack traces legiveis em crashes producao" no payload atual; manter consistência sem agravar — palavras PT-BR no comentário ProGuard ficam **sem acento** porque a string vai pra JSON e mesmo escapado o R8 não lê acento sem problemas, mas convenção do bloco existente é ASCII-safe; **não introduzir acento no comentário ProGuard nesta sprint** — manter padrão atual do bloco).
- **Acentuação PT-BR completa neste arquivo de spec** (validador-acentuação roda no `.md` que estou gerando agora — vide passo de validação ao final).
- Regra de Anonimato Absoluto (CLAUDE.md raiz): zero nome de IA ou autor no comentário do ProGuard. Comentário R-SEC-4 já é impessoal — manter assim.
- `enableMinifyInReleaseBuilds: true` e `enableShrinkResourcesInReleaseBuilds: true` permanecem inalterados.
- A regra `-keep class com.ouroboros.healthconnect.** { *; }` (bridge nativa local) é crítica — Expo Modules registry resolve por nome de classe via reflection. Não pode ser tocada.
- A regra `-keep class androidx.health.connect.client.** { *; }` é o coração da cobertura do SDK — não remover.
- Estrutura JSON do `app.json` (chaves, array `plugins`, ordem dos plugins) intocada.

## Plano de implementação

1. **Confirmar baseline.** Executor roda:
   ```bash
   grep -c "react-native-health-connect" app.json   # esperado: 1 (matches que vamos extirpar)
   grep -c "com.ouroboros.healthconnect" app.json   # esperado: 1
   grep -c "androidx.health.connect.client" app.json # esperado: 2 (.client.** + .platform.client.**)
   grep -n "extraProguardRules" app.json            # confirmar linha atual
   node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))" && echo "json ok"
   ```
2. **Smoke baseline antes de editar.** Confirmar `./scripts/smoke.sh` verde + capturar contagem real (suites/testes) como referência. Não editar com smoke vermelho preexistente.
3. **Edit cirúrgico via Edit tool** (Read antes obrigatório — política do projeto): localizar a substring exata `react-native-health-connect, expo-modules-core,` dentro do valor da chave `extraProguardRules` e substituir por `expo-modules-core,`. Lembrar: o JSON tem `\n` literais (não newlines reais), então o Edit precisa casar a sequência exata `react-native (core), react-native-reanimated, react-native-worklets,\\n# react-native-health-connect, expo-modules-core, react-native-svg,\\n` e produzir `react-native (core), react-native-reanimated, react-native-worklets,\\n# expo-modules-core, react-native-svg,\\n`. **Verificar** se o JSON.parse continua válido antes do próximo passo.
4. **Adicionar reforço de records (Forma B recomendada).** Localizar a substring `-keep class androidx.health.connect.client.** { *; }\\n-keep class androidx.health.platform.client.** { *; }` e inserir entre as duas linhas (ou imediatamente após a primeira) a regra `\\n-keepclasseswithmembernames class androidx.health.connect.client.records.** { *; }`. O payload final dessa parte fica:
   ```
   -keep class androidx.health.connect.client.** { *; }
   -keepclasseswithmembernames class androidx.health.connect.client.records.** { *; }
   -keep class androidx.health.platform.client.** { *; }
   ```
   (Lembrar: em JSON são `\n` literais.) Esta inserção sozinha satisfaz o critério 4 sem precisar adicionar comentário.
5. **Validação estática local.**
   - `grep "react-native-health-connect" app.json` → exit 1 (zero matches).
   - `grep "com.ouroboros.healthconnect" app.json` → exit 0, ≥ 1 match.
   - `grep "androidx.health.connect.client" app.json` → exit 0, ≥ 2 matches (regra ** + regra records).
   - `grep -E "androidx\\.health\\.connect\\.client\\.records" app.json` → exit 0, ≥ 1 match.
   - `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))"` → exit 0.
6. **Smoke pós-edit.** `./scripts/smoke.sh` continua verde sem variação de contagem.
7. **Validação real release (depende de alpha-32 da R-INT-3-HC-LIVE-CHECKPOINT).** Quando alpha-32 estiver disponível:
   - `./scripts/release-apk.sh` (ou pipeline equivalente — confirmar caminho atual do release script em uso).
   - Instalar no Xiaomi via `adb install -r alpha-32.apk` (ou bypass HyperOS conforme reference_dev_client_celular).
   - Capturar logcat filtrado: `adb logcat -c && adb logcat --pid $(adb shell pidof com.ouroboros.mobile) > /tmp/r-sec-4-logcat.txt` enquanto navega Saúde → 6 superfícies (peso, treino, gordura, FC, sono, menstruação).
   - `grep -iE "ClassNotFound|NoSuchMethod|VerifyError" /tmp/r-sec-4-logcat.txt` → esperado: zero matches.
8. **Commit.** Mensagem sem acento: `fix: r-sec-4 remove rn-hc morto e reforca proguard records`.
9. **Push** automático após smoke verde (autorização durável feedback_push_automatico).

## Aritmética

Não aplicável — esta sprint não tem meta de redução de linhas. Mudança é cirúrgica em uma única chave string do `app.json`:

- Linhas removidas no payload (textuais): 1 menção `react-native-health-connect,` no comentário-cabeçalho.
- Linhas adicionadas no payload (textuais): 1 regra ProGuard `-keepclasseswithmembernames class androidx.health.connect.client.records.** { *; }`.
- Delta líquido em `app.json`: zero linhas (a string é uma só com `\n` internos) — apenas o conteúdo da string muda.

## Testes

- **Jest:** zero novos testes (ProGuard não tem cobertura unitária possível em JS).
- **Baseline esperada:** mesma contagem da sprint D (sub-sprint executor confirma valor atual). Não pode regredir.
- **Validação real release:** logcat limpo de exceções de classe não encontrada nas 6 superfícies HC, instrumentada manualmente no Xiaomi.

## Proof-of-work esperado

- Diff final restrito a `app.json` (uma chave alterada).
- Saída dos 5 greps de acceptance criteria (1, 2, 3, 4, 5).
- `./scripts/smoke.sh` exit 0 com contagem ≥ baseline.
- Logcat filtrado do release APK com zero `ClassNotFound|NoSuchMethod|VerifyError` durante navegação manual nas 6 superfícies HC (peso, treino, gordura corporal, FC, sono, menstruação).
- Validação de acentuação deste spec: `python3 scripts/validar-acentuacao.py --paths docs/sprints/R-SEC-4-PROGUARD-CLEANUP-spec.md` exit 0 (se o script existir; caso contrário, validador-acentuação universal `~/.config/zsh/scripts/validar-acentuacao.py`).
- Hipótese verificada antes de iniciar: `rg "react-native-health-connect" app.json` confirma 1 match remanescente; `rg "extraProguardRules" app.json` confirma chave existe.

## Riscos e não-objetivos

### Riscos

- **R1 — Quebrar JSON.** Edit via match-de-substring na string `extraProguardRules` pode produzir aspas/escapes mal-formados. Mitigação: rodar `node -e "JSON.parse(...)"` imediatamente após cada edit; se falhar, reverter via `git checkout -- app.json` e refazer.
- **R2 — Faltarem `-keep` rules.** Se Forma B for ignorada e ainda houver record type reflexionado que cai fora do glob `androidx.health.connect.client.**`, app crash em release com `ClassNotFoundException`. Mitigação: Forma B é a recomendada justamente para mitigar este caso; e a validação real release no Xiaomi é gate antes de declarar pronto.
- **R3 — Smoke regredir por efeito colateral inesperado** (improvável — ProGuard não roda em Jest). Mitigação: smoke verde antes e depois, comparar contagens.
- **R4 — Validação release depender de alpha-32 não disponível.** Esta sprint **pode parar no passo 6** (smoke verde + estático) e marcar `[blocked-on R-INT-3-HC-LIVE-CHECKPOINT]` no SPRINT_ORDER_MASTER se alpha-32 ainda não estiver publicado. Passo 7 (validação real) re-executa quando build alpha-32+ for emitido.

### Não-objetivos (anti-débito)

- **Não** revisar as regras ProGuard de outras libs (reanimated, worklets, svg etc.) — se algum problema aparecer com elas, sprint separada.
- **Não** mexer em `consumerProguardFiles` de módulos internos (`modules/widget-homescreen/`, `modules/health-connect/`) — escopo é apenas `app.json`.
- **Não** migrar `extraProguardRules` para arquivo externo `proguard-rules.pro` referenciado por path (refator possível mas é sprint nova, não esta).
- **Não** consolidar/desduplicar regras existentes — mesmo que `-keep class androidx.health.connect.client.** { *; }` torne a regra do critério 4 redundante em teoria, Forma B é mantida defensivamente; consolidação fica fora.
- Se durante validação real release surgir `ClassNotFoundException` de **outra** classe que não record (por exemplo, builders, request objects), **registrar como sprint nova** `R-SEC-5-PROGUARD-HC-EXTENDED` — não estourar escopo desta.

## Referências

- Sprint mãe: `docs/sprints/R-INT-3-HC-BRIDGE-NATIVA-D-CLEANUP-MIGRATION-spec.md` (passo 5 declarou OFF-LIMITS o `extraProguardRules` e justificou esta sprint).
- Sprint bloqueio: `R-INT-3-HC-LIVE-CHECKPOINT` (precisa alpha-32 para validação real).
- BRIEF: `VALIDATOR_BRIEF.md` (acentuação PT-BR, smoke gate, regra de anonimato).
- Arquitetura bridge nativa: `reference_hc_bridge_arquitetura.md` (memória do projeto — ProGuard rule `-keep class com.ouroboros.healthconnect.**` é obrigatória).
- CLAUDE.md raiz: Regra de Anonimato, Regra de Commits (sem acento), Regra de Validação Visual (não aplicável aqui — sem UI).
- Memória: `feedback_push_automatico` (push pós-smoke verde sem confirmar), `feedback_validacao_celular_real` (bugs OEM/New Arch só em runtime, dev-client antes de APK preview).
