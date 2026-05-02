# M09 Spec — Adendo de prontidão (2026-05-01)

Adendo ao `docs/sprints/M09-spec.md` (275L). O spec base permanece
válido; os pontos abaixo refinam ambiguidades detectadas na revisão
de prontidão imediatamente antes da execução.

## A1. Hipótese de plugins nativos confirmada via grep

Estado atual de `package.json` (verificado 2026-05-01):

- `expo-image-picker` ~17.0.11 — **presente** (M00.5).
- `expo-location` ~19.0.8 — **presente** (M07).
- `expo-dev-client` ~6.0.21 — **presente** (M00.5).
- `expo-camera` — **ausente**.
- `expo-image-manipulator` — **ausente**.
- `expo-print` — **ausente**.
- `@react-native-ml-kit/text-recognition` — **ausente**.
- `@react-native-ml-kit/document-scanner` — **ausente**.

Estado atual de `app.json` plugins: já inclui `expo-router`,
`expo-font`, `expo-secure-store`, `expo-dev-client`,
`expo-image-picker`, `expo-location`, `expo-document-picker`,
`expo-notifications`, `expo-local-authentication`. Faltam os 5
plugins novos da M09.

Estado atual de `app/scanner.tsx`: stub trivial com `EmptyState`,
substituido nesta sprint pela rota real.

Hooks reaproveitáveis confirmados:

- `getBairroAtual` em `src/lib/eventos/localizacao.ts` (M07).
- `useSettings.sync.qualidadeScanner` default `12mp` em
  `src/lib/stores/settings.ts` (M00.5).

**Conclusão:** spec não inventou identificadores. As 5 deps novas
serão instaladas via `npx expo install` no passo 1 do procedimento.

## A2. Decisão de OCR — fechada

`@react-native-ml-kit/text-recognition` (Google ML Kit on-device,
free tier ilimitado, sem rede). Tesseract.js descartado por peso
(~10 MB) e por qualidade inferior em recibos brasileiros. Apple
Vision irrelevante (Android-only neste APK). ADR-0003 já privilegia
ML Kit.

`@react-native-ml-kit/document-scanner` para detecção dos 4 cantos
em tempo real (rate-limit 5fps na thread JS).

## A3. EAS build #3 obrigatório pós-merge

APK dev-client `15da107f` instalado **não** inclui expo-camera nem
ML Kit. EAS build #2 (em curso para M06.5) também não inclui — esses
plugins entram só com a M09.

Sequência de builds no roadmap:

1. Build #2 — pós-merge M06.5 (expo-av + Voice). Em curso.
2. Build #3 — pós-merge M09 (camera + manipulator + print + ML Kit
   x2). Esta sprint.

Critério de pronto da M09 só fecha após APK #3 instalado e validar
o flow inteiro tap-câmera → toast em <20s no celular físico
(Nível C, com permissão explícita do usuário).

## A4. Permission gate de localização

Permissões `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` já
estão no manifest via plugin `expo-location` (M07). O spec base
descreve o chip cyan `<bairro detectado>` como **opcional**: o
usuário toca para incluir, ignora para não.

Não há gate `permitirLocalizacao` em `useSettings` hoje. Decisão:
**não criar gate na M09**. O `getBairroAtual` da M07 já trata a
permissão runtime do SO (toast info quando devolve `null`). Spec
base permanece correto.

Se M11+ Settings de privacidade pedir o gate global, abre-se
sprint própria. Não escopo M09.

## A5. Multipágina — PDF único

Spec base já fechou (item 10): 2 toques no botão captura abre
`<ScannerMultiPage>`, "Concluir" gera **1 PDF único** via
`expo-print` `printToFileAsync` salvando em
`assets/<formatDateYmdHm>-nota-multipagina.pdf` com 1 `.md`
companion único. **Nenhuma ambiguidade.**

Imagens individuais não vão ao Vault separadamente — só o PDF
final. Trade-off: economia de espaço e UX coerente (1 evento = 1
nota).

## A6. Aritmética de testes

Baseline pós-M06.5: 942 passing / 110 suites.

Testes adicionados pela M09:

- `tests/lib/scanner/parsing.test.ts` — heurísticas regex PT-BR.
  Casos mínimos: 3 valores (`R$ 87,40`, `87.40`, `R$ 1.234,56`),
  3 datas (`28/04/2026`, `2026-04-28`, `28-04-2026`), 3 categorias
  por palavra-chave (`mercado`, `farmácia`, `transporte`),
  1 fallback "outro". Total ≈ **10 testes**.
- `tests/lib/schemas/financeiro_nota.test.ts` — validação zod.
  Casos: schema válido completo, schema sem `imagem` falha,
  `ocr_confianca` fora de [0,1] falha, `revisar` default false,
  `subtipo` literal `nota`. Total ≈ **5 testes**.

Projeção pós-M09: **≈ 957 passing / 112 suites** (942 + 15, +2
suites). Permitir margem ±2 testes por casos extras de regex que
o executor descobrir.

Testes de UI dos componentes ScannerCamera / ScannerPreview /
ScannerMultiPage **não** entram em jest (dependem de ML Kit e
camera nativos). Validação visual no Nível C.

## A7. Touches fora de escopo — mapa final

Modifica:
- `app.json` (plugins + permissões CAMERA/READ_EXTERNAL_STORAGE)
- `package.json` (5 deps novas)
- `src/lib/schemas/index.ts` (re-export)
- `src/lib/vault/paths.ts` (`inboxFinanceiroNota`,
  `inboxFinanceiroNotaPath`)

Substitui:
- `app/scanner.tsx` (stub vira rota real)

Cria (15 arquivos novos):
- `app/scanner/preview.tsx`, `app/scanner/multi.tsx` (sub-rotas)
- 3 screens em `src/components/screens/Scanner*.tsx`
- 4 libs em `src/lib/scanner/*.ts`
- 1 schema em `src/lib/schemas/financeiro_nota.ts`
- 2 testes em `tests/lib/scanner/` e `tests/lib/schemas/`

Não toca:
- M06.5 (`expo-av` / Voice) — sprint separada em curso.
- M07 (`getBairroAtual`) — só consome, não modifica.
- M00.5 (`useSettings.sync.qualidadeScanner`) — só consome.
- Vault writer / paths existentes — só estende.

## A8. Veredicto

**(b) PRONTA com adendo.** Executar imediatamente. O spec base
M09-spec.md cobre 95% do trabalho; este adendo fecha aritmética
de testes, confirma identificadores via grep, posiciona EAS
build #3 e descarta gate de localização.

Pré-requisito: M06.5 mergeada antes de M09 começar (evita conflito
em `package.json` e `app.json` plugins). Se M06.5 ainda em
revisão, segurar M09 na fila.

---

*Adendo gerado pelo planejador-sprint, 2026-05-01.*
