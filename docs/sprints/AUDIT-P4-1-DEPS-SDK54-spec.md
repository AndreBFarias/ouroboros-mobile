# AUDIT-P4-1-DEPS-SDK54 — saúde de dependências: módulo nativo duplicado, dependabot fora de fase e patches do SDK 54

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (risco de build nativo: duas versões de expo-constants/
            expo-linking coexistem na árvore, na cadeia do Share Intent
            e do deep link de OAuth)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-1]/[ES-01] da auditoria de 2026-07-28. Encontrado
            rodando `npx expo-doctor`, `npm ls expo` / `npm ls
            expo-constants expo-linking`, lendo `.github/dependabot.yml`
            e a saida de `gh pr list`, e `npm audit`. Todos os comandos
            foram re-executados nesta materialização (2026-07-28) para
            confirmar os números antes de escrever o spec.
```

## Problema (três achados de higiene de dependências, SDK 54 fixo)

### (a) Módulo nativo duplicado — expo-share-intent exige SDK 55

`npx expo-doctor` roda 18 checks e falha em 4, o primeiro sendo a
incompatibilidade de peer dependency:

```
android: expo-share-intent: your Expo SDK version does not match
requirements! v6.1.1 needs ^55, found 54.0.0.
...
Check that no duplicate dependencies are installed -- FALHOU
Found duplicates for expo-constants:
  - expo-constants@18.0.13 (at: node_modules/expo-constants)
  - expo-constants@55.0.16 (at: node_modules/expo-share-intent/node_modules/expo-constants)
Found duplicates for expo-linking:
  - expo-linking@8.0.12 (at: node_modules/expo-linking)
  - expo-linking@55.0.15 (at: node_modules/expo-share-intent/node_modules/expo-linking)
```

`package.json` fixa `"expo-share-intent": "^6.1.0"` (resolvido para
`6.1.1`), cujo `peerDependencies` declara `expo: "^55"`,
`expo-constants: ">=55.0.7"`, `expo-linking: ">=55.0.7"` — mas o
projeto roda **SDK 54** (`expo@54.0.34`). O npm não conseguiu unificar
as versões e instalou copias aninhadas dentro de
`node_modules/expo-share-intent/node_modules/`. `npm ls expo` confirma
o estado inválido:

```
+-- expo-share-intent@6.1.1
|   +-- expo-constants@55.0.16
|   +-- expo-linking@55.0.15
|       +-- expo-constants@55.0.16 deduped
+-- expo@54.0.34 invalid: "^55" from node_modules/expo-share-intent
```

Um build nativo Android só pode conter **uma** versão de cada módulo
nativo linkado. Duas versões de `expo-constants`/`expo-linking` na
mesma árvore é causa clássica de build silenciosamente quebrado ou
comportamento errático em runtime — e a dependência duplicada sustenta
justamente dois pontos sensíveis do app: o Share Intent Receiver
(`app/share-receive.tsx`, feature de recebimento de outro app) e o
deep link do fluxo OAuth (`app/oauthredirect.tsx`), que dependem de
`expo-linking`.

O PR #57 do Dependabot (ver item b) propõe subir `expo-share-intent`
para `8.0.1`, o que **agrava** o problema — exige SDK ainda mais novo.

### (b) Dependabot: 10 PRs abertos desde 12/07, alguns quebram o SDK 54

`gh pr list --state open` confirma exatamente 10 PRs, todos abertos em
`2026-07-12`:

| PR | Pacote | Salto | Compatível com SDK 54? |
|---|---|---|---|
| #58 | expo-web-browser | 15.0.11 para 57.0.0 | NÃO |
| #57 | expo-share-intent | 6.1.1 para 8.0.1 | NÃO (agrava o item a) |
| #56 | @testing-library/react-native | 13.3.3 para 14.0.1 | dev-only, revisar a parte |
| #55 | expo-router | 6.0.23 para 57.0.4 | NÃO |
| #54 | expo | 54.0.34 para 54.0.35 | sim (patch) |
| #53 | tailwindcss | 3.4.19 para 4.3.2 | NÃO (major) |
| #52 | eslint | 10.2.1 para 10.7.0 | sim (minor dev) |
| #51 | expo-auth-session | 7.0.11 para 57.0.2 | NÃO |
| #50 | @gorhom/bottom-sheet | 5.2.11 para 5.2.14 | sim (patch) |
| #49 | react-native-svg | 15.12.1 para 15.15.5 | sim (minor) |

Cinco PRs (#58, #57, #55, #53, #51) propõem saltos de major alinhados
ao SDK 57 — mergear qualquer um quebra o app no SDK 54 atual.

`.github/dependabot.yml` **já tem** uma clausula `ignore` — mas cobre
apenas dois nomes exatos, não um padrão `expo-*`:

```yaml
    ignore:
      - dependency-name: "react-native"
        update-types:
          - "version-update:semver-major"
      - dependency-name: "expo"
        update-types:
          - "version-update:semver-major"
```

Isso bloqueia major bump do pacote `expo` em si, mas **não** cobre
`expo-router`, `expo-share-intent`, `expo-web-browser`,
`expo-auth-session` nem os demais `expo-*` — exatamente os pacotes que
geraram os PRs #58, #57, #55, #51. A correção do achado original
("ignore por major para pacotes `expo-*`") precisa ser mais específica
do que "o arquivo não tem ignore": o arquivo tem ignore, só que
incompleto — cobre só o pacote-base, não a familia inteira.

### (c) Patches dentro do próprio SDK 54

O mesmo `npx expo-doctor` reporta, na seção "Check that packages match
versions required by installed Expo SDK":

```
package           expected  found
expo              ~54.0.36  54.0.34
expo-file-system  ~19.0.23  19.0.22
expo-font         ~14.0.12  14.0.11
expo-router       ~6.0.24   6.0.23
```

Note que o PR #54 do Dependabot propõe `expo` `54.0.34 para 54.0.35`,
um patch intermediário que **não** alcança o `~54.0.36` esperado por
`expo install --check` — sinal de que o Dependabot rodou antes do
release mais recente do canal SDK 54. `npx expo install --check`
resolve os 4 pacotes de uma vez, sem depender do Dependabot.

### npm audit e o falso positivo já descartado

`npm audit` relata **13 vulnerabilidades (2 críticas, 10 altas, 1
baixa)** — todas na cadeia de build (`tar`, `shell-quote`, `postcss`
via `@expo/metro-config`/`@expo/cli`, `undici`, `ws`), não no APK final
distribuído. `npm audit fix --force` avisa que instalaria
`expo@57.0.8` — breaking change, não aplicar sem migração deliberada de
SDK.

Falso positivo já verificado e descartado: `js-yaml` aparece na lista
de auditoria, mas só entra via `@expo/xcpretty` (`js-yaml@4.1.1`) e via
`babel-plugin-istanbul`/`@istanbuljs/load-nyc-config`
(`js-yaml@3.14.2`) — ambas dependências de toolchain de build/teste. O
Vault do app importa o pacote **`yaml@2.8.3`**
(`src/lib/vault/frontmatter.ts:31`, `src/lib/vault/midiaCompanion.ts:17`),
que é um pacote diferente e **não consta** na lista de `npm audit`.

## Escopo (mínimo)

1. Fixar/ajustar `expo-share-intent` para a última versão que declara
   peer dependency compatível com SDK 54 (ou registrar formalmente,
   se não existir tal versão, que a resolução da duplicata fica
   pendente de migração de SDK — não mergear o PR #57 em hipotese
   alguma, já que ele só piora).
2. Adicionar em `.github/dependabot.yml` uma regra de `ignore` que
   cubra os pacotes `expo-*` individualmente (`expo-router`,
   `expo-share-intent`, `expo-web-browser`, `expo-auth-session`, e os
   demais usados pelo projeto) para major bumps — ou uma única entrada
   com `dependency-name: "expo-*"` se o schema do Dependabot usado
   aceitar wildcard (confirmar contra a versão do schema `version: 2`
   antes de aplicar).
3. Fechar (sem merge) os PRs incompativeis com o SDK 54: #58, #57, #55,
   #53, #51.
4. Rodar `npx expo install --check` e aplicar os 4 patches dentro do
   SDK 54 (`expo`, `expo-file-system`, `expo-font`, `expo-router`).
5. NÃO-objetivo: não migrar o projeto para SDK 55/56/57 (decisão de
   dono pendente — ver branches `backup-pre-sdk56`/`sdk56-experiment`);
   não rodar `npm audit fix --force` (aplicaria a mesma migração de SDK
   pela porta dos fundos); não revisar #56/#52/#50/#49 nesta sprint (não
   quebram o SDK 54, ficam para review normal de rotina).

## Proof-of-work

```bash
npx expo-doctor                              # 0 achados de duplicate deps
npm ls expo-constants expo-linking           # uma unica versao cada, sem 'invalid'
npm ls expo                                  # sem 'invalid: "^55"'
npx expo install --check                    # 4 pacotes patch resolvidos, sem pendencia
gh pr list --state open                      # PRs #58/#57/#55/#53/#51 fechados
npx tsc --noEmit                             # exit 0
./scripts/smoke.sh                           # verde
```

Sprint de infraestrutura de dependências, sem alteração de UI —
dispensa caso E2E novo (nenhum comportamento visível ao usuário muda).

## Commit

```
fix: audit-p4-1-deps-sdk54 resolve duplicata nativa do expo-share-intent e trava dependabot no sdk54
```
