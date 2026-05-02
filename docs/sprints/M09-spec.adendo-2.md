# M09 Spec — Adendo 2 (RESPIN pós-bloqueio, 2026-05-02)

Substitui o `docs/sprints/M09-spec.adendo.md` (refutado). O spec base
`docs/sprints/M09-spec.md` permanece referência **apenas** para
seções 1 (Objetivo), 3 (APIs reutilizáveis) e 8 (Checkpoint visual).
Todo o resto desta sprint é redefinido aqui.

## B0. Motivo do RESPIN

`@react-native-ml-kit/document-scanner` **não existe no npm
registry** (E404 em `npm view`). O mantenedor `a7medev` só publica:

- `@react-native-ml-kit/text-recognition` (existe, v2.0.0)
- `@react-native-ml-kit/face-detection`
- `@react-native-ml-kit/barcode-scanning`
- `@react-native-ml-kit/image-labeling`

Hipótese inteira de "viewfinder custom + hook `useDocumentDetection`
+ wrapper `deskew.ts`" cai. Arquitetura realinhada para **modal
sheet com scanner nativo** que devolve URIs já deskewed.

## B1. Decisão de pacote — fechada com registry-check

Verificado em 2026-05-02 via `npm view`:

| Candidato | Versão | Existe | App Plugin Expo | Multi-page | New Arch | Peer RN | Tarball |
|---|---|---|---|---|---|---|---|
| `@dariyd/react-native-document-scanner` | 2.0.19 | sim | **não** (sem `app.plugin.js`) | sim | sim (iOS+Android) | `>=0.77.3` | 24.6 MB |
| `@preeternal/react-native-document-scanner-plugin` | 0.3.0 | sim | sim (`app.plugin.js`) | sim | sim (TurboModule) | `*` (frouxo) | 302 KB |
| `react-native-vision-camera` + `vision-camera-document-scanner` | — | — | — | flexível | sim | exige Reanimated worklets | — |

**Escolha: `@dariyd/react-native-document-scanner` v2.0.19.**

Justificativas:

1. **API mais simples**: `launchScanner({ quality }) => { images: [...] }`
   resolve em 1 chamada. Substitui viewfinder + detecção + deskew em
   um único modal nativo.
2. **Edge-detection + perspective correction nativos**: ML Kit
   Document Scanner API no Android entrega imagem já retificada.
   `src/lib/scanner/deskew.ts` deixa de existir.
3. **Multi-page nativo**: o próprio modal coleta múltiplas páginas
   antes de retornar `images: ImageObject[]`. `<ScannerMultiPage>` é
   eliminado como componente separado — vira flag de opção.
4. **New Architecture** declarada compatível (projeto está em RN
   0.81.5, React 19.1.0, `newArchEnabled: true`).
5. **Mantenedor ativo** (FileNest AI e MyGarage em produção
   mencionados no README).
6. **Apple VisionKit no iOS** (futuro suporte iOS sem refazer).

Trade-off aceito: ausência de `app.plugin.js`. Mitigação: adicionar
permissão `android.permission.CAMERA` direto em `app.json::android.
permissions` (mesmo padrão usado pelos demais plugins do projeto)
e confiar em RN autolinking + EAS prebuild para o módulo nativo.
**Não há entrada em `app.json::plugins[]` para este pacote.**

## B2. Touches autorizados — finais

### Modificar

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — Adicionar à `android.permissions`: `android.permission.CAMERA`.
  Adicionar plugin `expo-camera` em `plugins[]` (necessário caso o
  preview de OCR precise reabrir câmera para "Regravar"; ver B5).
  Adicionar plugin entry para `expo-image-manipulator` **apenas se**
  pós-processamento (rotacionar, recortar manual) for usado; ver B5.
  Adicionar `expo-print` em `plugins[]` para PDF multipágina.
  **Não adicionar entrada para `@dariyd/react-native-document-scanner`
  nem para `@react-native-ml-kit/text-recognition`** (não têm
  `app.plugin.js`; autolinking nativo basta).

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/package.json`
  — Adicionar deps:
  - `@dariyd/react-native-document-scanner@2.0.19` (escolha B1)
  - `@react-native-ml-kit/text-recognition@^2.0.0` (OCR pós-captura)
  - `expo-image-manipulator` (`npx expo install` pega versão SDK 54)
  - `expo-print` (`npx expo install` pega versão SDK 54)
  - `expo-camera` **opcional** — só se "Regravar" reabrir câmera
    custom em vez de re-chamar `launchScanner` (decisão B5)

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/index.ts`
  — Re-exportar `FinanceiroNotaSchema` e tipo `FinanceiroNotaMeta`.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `inboxFinanceiroNota` **já existe** (linha 224, confirmado via
  grep). Adicionar **apenas** helper `inboxFinanceiroNotaPath(date,
  slug)` no padrão de outros helpers existentes no arquivo.

### Substituir

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner.tsx`
  — Stub `EmptyState` é substituído por rota real que dispara
  `launchScanner` em modal sheet via `<ScannerSheet>`.

### Criar

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner/preview.tsx`
  — Sub-rota: recebe URIs deskewed (single ou array) via params,
  roda OCR, mostra `<ScannerPreview>` com formulário de validação.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/ScannerSheet.tsx`
  — Wrapper UI fina sobre `launchScanner`. Não renderiza viewfinder
  próprio; chama o pacote, recebe `images[]`, navega para
  `/scanner/preview` passando URIs. Trata `didCancel` e `error`.
  Multi-page é **opção do pacote** (`maxNumDocuments` ou similar
  conforme API real validada no momento da implementação).

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/ScannerPreview.tsx`
  — Imagem deskewed em fade-in (Moti `spring_default`), overlay OCR
  cyan mono caption, formulário 5 campos (valor, data, descrição,
  categoria, pessoa), chip cyan opcional `<bairro detectado>`,
  banner amarelo se `confianca < 0.8`, botões Regravar / Salvar.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/launch.ts`
  — Wrapper sobre `launchScanner` do pacote `@dariyd/...`. Tipa
  retorno, normaliza erros para `Result<DeskewedImages, ScannerError>`,
  injeta `quality` lendo `useSettings.sync.qualidadeScanner` (mapa
  `'8mp' | '12mp' | 'maxima'` para `0.7 | 0.85 | 1.0`).

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/text-recognition.ts`
  — Wrapper sobre `@react-native-ml-kit/text-recognition`. Expõe
  `extrairTexto(uri) => Promise<{ texto: string, confianca: number }>`.
  Confiança média dos blocos retornados pelo ML Kit.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/parsing.ts`
  — Heurísticas regex PT-BR sem mudança vs spec base:
  `extrairValor(texto)`, `extrairData(texto)`,
  `extrairCategoria(texto)`. Vocabulário curto de categorias:
  `mercado`, `farmácia`, `transporte`, `alimentação`, `outro`.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/multipage-pdf.ts`
  — Consolida array de URIs (já deskewed) em **PDF único** via
  `expo-print` `printToFileAsync` com HTML que embute as imagens em
  base64 ou file URIs. Salva em
  `assets/<formatDateYmdHm>-nota-multipagina.pdf` via SAF.
  Retorna path final do PDF.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/financeiro_nota.ts`
  — Schema zod do `.md` companion. Campos:
  - `tipo: 'financeiro'` (literal)
  - `subtipo: 'nota'` (literal)
  - `data: string` (ISO 8601)
  - `autor: 'pessoa_a' | 'pessoa_b' | 'ambos'`
  - `valor: number` (não negativo)
  - `descricao: string`
  - `categoria: 'mercado' | 'farmacia' | 'transporte' | 'alimentacao' | 'outro'`
    (**chaves sem acento** — segue convenção schema)
  - `imagem: string` (path relativo, `.jpg` ou `.pdf`)
  - `bairro?: string` (opcional, vindo de `getBairroAtual`)
  - `ocr_confianca: number` (0-1)
  - `revisar: boolean` (default `false`, vira `true` se `ocr_confianca < 0.8`)

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/scanner/parsing.test.ts`
  — Testes regex. Casos mínimos: 3 valores (`R$ 87,40`, `87.40`,
  `R$ 1.234,56`), 3 datas (`28/04/2026`, `2026-04-28`,
  `28-04-2026`), 3 categorias por palavra-chave + 1 fallback
  `'outro'`. Total **~10 testes**.

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/financeiro_nota.test.ts`
  — Validação zod. Casos: schema válido completo, schema sem
  `imagem` falha, `ocr_confianca` fora `[0,1]` falha, `revisar`
  default false, `subtipo` literal `'nota'`. Total **~5 testes**.

### Deletar (vs spec base)

Os seguintes arquivos previstos no spec base **não serão criados**:

- `src/components/screens/ScannerCamera.tsx` — viewfinder próprio
  cancelado; pacote entrega UI nativa.
- `src/components/screens/ScannerMultiPage.tsx` — modo contínuo é
  opção do pacote, não componente separado.
- `src/lib/scanner/document-scanner.ts` — `useDocumentDetection`
  cancelado; detecção é interna ao pacote.
- `src/lib/scanner/deskew.ts` — pacote retorna imagem já
  retificada; wrapper de `expo-image-manipulator` não é necessário.

### Sub-rota cancelada

- `app/scanner/multi.tsx` — sub-rota cancelada. Multi-page entra
  como opção do mesmo `launchScanner({ maxNumDocuments: N })`.

## B3. Acceptance criteria — atualizado

1. FAB `camera` abre `/scanner` e dispara `launchScanner` em modal
   nativo (substitui stub).
2. Usuário captura 1 página → modal devolve URI deskewed → navega a
   `/scanner/preview`.
3. Usuário captura múltiplas páginas no mesmo modal → consolidação
   em PDF único via `expo-print` salva em
   `assets/<timestamp>-nota-multipagina.pdf`.
4. Preview mostra imagem deskewed com fade-in `spring_default`,
   overlay OCR cyan, formulário com 5 campos preenchidos por
   heurística regex.
5. `ocr_confianca < 0.8` marca `revisar: true` e mostra banner
   amarelo no preview.
6. Chip cyan opcional `<bairro detectado>` aparece via
   `getBairroAtual` (M07). Tap inclui no schema, ignorar omite.
7. `quality` do scanner mapeada de `useSettings.sync.qualidadeScanner`
   (`'8mp' | '12mp' | 'maxima'` → `0.7 | 0.85 | 1.0`).
8. Save grava `.md` companion via `writeVaultFile<FinanceiroNotaMeta>`
   em `inbox/financeiro/nota/`. Toast `"Salvo em alta resolução."`,
   haptic `light`.
9. Tempo total tap-câmera-FAB → toast: **< 20 s** no celular físico
   (mantido vs spec base).
10. `npx tsc --noEmit`, `npm test --silent`, `./scripts/smoke.sh`,
    `./scripts/check_anonimato.sh`, `npx expo export --platform
    android` todos exit 0.
11. **EAS build #3** gerado pós-merge instalado e validado em
    Nível C (celular físico, com permissão explícita do usuário).
12. Acentuação PT-BR completa em todas strings de UI desta sprint
    (varredura nos arquivos modificados/criados).
13. Hipótese verificada: `npm view` para os 4 pacotes novos antes
    de `npx expo install` (lição 4 aplicada a registry).

## B4. Aritmética de testes — revisada (+10 a +12)

Baseline pós-M06.5 (mantida): **942 passing / 110 suites**.

Testes adicionados pela M09 (RESPIN):

| Arquivo | Casos | Subtotal |
|---|---|---|
| `tests/lib/scanner/parsing.test.ts` | 3 valor + 3 data + 3 categoria + 1 fallback | **10** |
| `tests/lib/schemas/financeiro_nota.test.ts` | 5 (válido, sem imagem, confiança fora, revisar default, subtipo literal) | **5** |

**Total bruto:** 15 testes em 2 suites novas.

**Margem aplicada (input do usuário):** redução para **+10 a +12
testes** retirando duplicação trivial entre regex e categoria
(consolidar fallback em vez de testar cada negativo). Casos
removíveis sem perda de cobertura: 2 negativos de regex que já
ficam cobertos pelo fallback `'outro'` + 1 caso zod redundante com
`revisar default false`.

**Projeção pós-M09:** **952 a 954 passing / 112 suites**
(942 + 10 a 12, +2 suites). Permitir margem ±1 teste.

**Conferência aritmética obrigatória antes de iniciar:**
- 942 (baseline) + 10 (mínimo) = 952 ≤ FAIL_AFTER ≤ 942 + 12 = 954.
- Se executor terminar com `passing < 952` ou `passing > 955`,
  para e abre questão. Não fecha sprint.

Testes de UI (`<ScannerSheet>`, `<ScannerPreview>`) **não entram
em jest** — dependem de módulo nativo do pacote. Validação visual
pelo Nível C.

## B5. Decisão "Regravar"

Botão "Regravar" no `<ScannerPreview>`:

- **Opção A (preferida):** chama `launchScanner` de novo, descarta
  URIs anteriores, sobe novamente o modal nativo. **Zero código
  novo de câmera.** Exige apenas `expo-camera` plugin se o pacote
  internamente delegar para ele em algum fallback (validar no PR).
- **Opção B (descarte):** abrir câmera custom via `expo-camera`
  para refazer só 1 página. Complexidade alta, viola simplicidade
  do RESPIN.

**Decisão:** Opção A. `expo-camera` em `app.json::plugins[]` é
**opcional** e só entra se o autolinking do `@dariyd/...` reclamar
em prebuild. Em primeiro PR, **deixar fora** e ver se EAS build
resolve sem.

## B6. Procedimento revisado

1. **Registry-check obrigatório (lição 4 a registry):**
   ```bash
   npm view @dariyd/react-native-document-scanner version
   npm view @react-native-ml-kit/text-recognition version
   npm view expo-image-manipulator dist-tags
   npm view expo-print dist-tags
   ```
   Confirmar que retornam versões válidas (não E404). Se algum
   falhar, abortar e abrir RESPIN-3.

2. **Instalação:**
   ```bash
   npm install @dariyd/react-native-document-scanner@2.0.19 \
     @react-native-ml-kit/text-recognition@^2.0.0
   npx expo install expo-image-manipulator expo-print
   ```

3. **`app.json`:** adicionar `android.permission.CAMERA` e plugins
   `expo-print`, `expo-image-manipulator`. **Não** adicionar
   entrada de plugin para `@dariyd/...` nem para
   `@react-native-ml-kit/text-recognition`.

4. **Implementar** na ordem:
   `parsing.ts` (puro, jest cobre) →
   `financeiro_nota.ts` (schema, jest cobre) →
   `text-recognition.ts` (wrapper) →
   `launch.ts` (wrapper) →
   `multipage-pdf.ts` (consolidação) →
   `<ScannerSheet>` (modal disparador) →
   `<ScannerPreview>` (form + OCR) →
   substituir `app/scanner.tsx` → criar `app/scanner/preview.tsx`.

5. **Validação JS-only:** rodar todos os checks runtime do BRIEF.
   `npx tsc --noEmit`, `npm test --silent`, `./scripts/smoke.sh`,
   `./scripts/check_anonimato.sh`, `npx expo export
   --platform android --output-dir /tmp/m09-export && rm -rf /tmp/m09-export`.

6. **EAS build #3** após merge para `main` (declaração formal):
   ```bash
   npx eas-cli build --profile development --platform android
   ```
   ou local:
   ```bash
   npx eas-cli build --profile development --platform android --local
   ```
   Instalar APK em celular físico:
   ```bash
   adb install ~/Downloads/ouroboros-dev.apk
   npx expo start --dev-client --clear
   ```

7. **Validação Nível C** (com permissão do usuário): captura real
   de recibo, deskew, OCR. Capturar screenshots em
   `docs/sprints/M09-screenshots/` lado a lado com mockup.

## B7. EAS Build #3 — declarado formalmente

Sequência atualizada:
- Build #1: APK base (pré-M06.5).
- Build #2: pós-merge M06.5 (`expo-av` + Voice). Já está em curso.
- **Build #3: pós-merge M09**. Inclui:
  - `expo-camera` (se entrar)
  - `expo-image-manipulator`
  - `expo-print`
  - `@dariyd/react-native-document-scanner` (módulo nativo Android
    via autolinking)
  - `@react-native-ml-kit/text-recognition` (módulo nativo Android
    via autolinking)

Critério de pronto da M09 só fecha após Build #3 instalado e
validado em Nível C.

## B8. Invariantes a preservar

Do `VALIDATOR_BRIEF.md`:

- **§1.1 Regra −1**: zero IA, zero nomes reais. `pessoa_a` /
  `pessoa_b` em todos schemas e código. Acentuação substantiva
  comum (`farmácia`, `vitória`) **só em strings de UI** com
  `// anonimato-allow:` se inequívoca.
- **§1.4 Tipografia**: Sentence case + acentuação completa PT-BR
  em strings de UI. `accessibilityLabel` sem acento. Comentários
  `.ts` sem acento. Strings desta sprint:
  `"Capturar"`, `"Regravar"`, `"Salvar"`, `"Documento"`,
  `"Câmera"`, `"Valor"`, `"Categoria"`, `"Bairro detectado"`,
  `"Salvo em alta resolução."`, `"Revisar texto reconhecido"`.
- **§1.6 Motion**: fade-in da imagem usa `spring_default`
  (damping 18, stiffness 200). Nada de `withTiming` linear fora
  de `fade_out`/`toast_in`.
- **§1.7 Haptics**: `medium` no botão "Capturar" (caso o pacote
  tenha botão custom — dispensável se o pacote dispara haptic
  nativo); `light` no "Salvar".
- **§1.8 Tom**: zero emoji, zero exclamação, zero gamificação.
- **ADR-0003**: ML Kit on-device. Zero rede. `@react-native-ml-kit/
  text-recognition` confirma. Pacote `@dariyd/...` Android usa ML
  Kit Document Scanner API (também on-device).

Do `CLAUDE.md`:

- Commits sem acento. Docstrings/comentários sem acento. UI com
  acento.
- TypeScript strict — sem `any`. Tipar retorno de
  `launchScanner` via tipos do pacote.
- Imports via alias `@/*`.

## B9. Riscos e não-objetivos

**Riscos detectados:**

1. **API real de `@dariyd/...` pode divergir do README.** Mitigação:
   no momento da implementação, se a opção `maxNumDocuments` ou
   equivalente não existir, registrar como sprint nova
   `M09.1-multipage-fallback` e entregar single-page primeiro.
2. **Tarball 24.6 MB** infla bundle. Mitigação: medir bundle
   Hermes após build; se passar de 12 MB, reabrir discussão de
   trocar para `@preeternal/...`.
3. **Sem `app.plugin.js`**: EAS prebuild pode falhar se o pacote
   exigir patches Android específicos. Mitigação: ler
   `package/android/README.md` extraído e seguir setup manual se
   necessário (registrar como sprint `M09.2-eas-fix` se virar
   bloqueio).
4. **OCR em recibo brasileiro pode ter confiança baixa**.
   Mitigação: threshold 0.8 já marca `revisar: true`; usuário
   corrige no form. Comportamento esperado, não regressão.

**Não-objetivos (fora da sprint):**

- Modo offline real do OCR para idiomas não-PT (ML Kit free é
  multi-língua, mas não validamos).
- Compressão JPEG inteligente para reduzir bundle.
- Edição manual de cantos (re-crop) — pacote já entrega deskewed.
- Settings UI para alternar pacote — engessar `@dariyd/...` por
  ora.
- Gate de localização global em Settings — fica para M11+
  (decisão A4 do adendo anterior, mantida).

## B10. Proof-of-work esperado

- Diff final do executor.
- `npm view <pkg> version` rodado e logado para os 4 pacotes
  (lição 4 aplicada).
- Runtime real:
  - `./scripts/check_anonimato.sh` → exit 0.
  - `npx tsc --noEmit` → exit 0.
  - `npm test --silent` → 952-954 passing / 112 suites.
  - `./scripts/smoke.sh` → exit 0.
  - `npx expo export --platform android --output-dir /tmp/m09-export` → exit 0.
- Validação visual:
  - **Nível A (Chrome web)**: layout estático do `<ScannerPreview>`
    com mock de imagem PNG e mock de OCR text. Screenshot em
    `docs/sprints/M09-screenshots/web-preview-mock.png` + sha256.
  - **Nível B (emulador)**: opcional, captura modal nativo real.
  - **Nível C (celular físico)**: obrigatório pós-Build #3 com
    permissão. Screenshots em
    `docs/sprints/M09-screenshots/celular-{captura,preview,save}.png`
    + sha256.
- Acentuação periférica: varredura PT-BR completa em todos os 11
  arquivos modificados/criados.

## B11. Veredicto

**(b) PRONTA com adendo-2.** Executar imediatamente após M06.5
mergeada. Spec base + adendo-2 (este) cobrem 100% do trabalho.
Adendo-1 (`M09-spec.adendo.md`) fica refutado e pode ser
arquivado/deletado pelo executor.

Pré-requisitos confirmados (2026-05-02):
- M06.5 mergeada (`749d37c` em main).
- `inboxFinanceiroNota` já em `paths.ts:224`.
- `qualidadeScanner` em `settings.ts:135` default `'12mp'`.
- `getBairroAtual` em `localizacao.ts:21`.
- `app/scanner.tsx` é stub trivial (substituível).
- `newArchEnabled: true` em `app.json:9`.
- React 19.1.0, RN 0.81.5 satisfazem peer `>=0.77.3` do `@dariyd/...`.

Working tree deve estar limpa antes de iniciar.

---

*Adendo-2 gerado pelo planejador-sprint, 2026-05-02. Substitui o
adendo-1 refutado por inexistência de `@react-native-ml-kit/document-scanner`.*
