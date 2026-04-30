# Sprint M09 — Scanner OCR Alta Resolução (Tela 16)

```
DEPENDE:    M02 (Vault Bridge) + M04 (FAB Radial integrado, rota Câmera)
BLOQUEIA:   Flow 4 (Scanner alta resolução em <20s) e captura de notas
ESTIMATIVA: 6-8h (inclui build dev-client em ~25 min)
```

## 1. Objetivo

Permitir captura de recibos, notas fiscais e PDFs físicos pelo celular
com auto-deskew, OCR on-device e formulário de validação rico. Após
captura, a sub-tela de preview mostra a imagem retificada, o texto
reconhecido em cyan mono caption e o formulário de campos extraídos
(valor, data, descrição, categoria, pessoa). O usuário corrige o que
for necessário e salva em `inbox/financeiro/nota/` com binário em
`assets/`. Esta sprint requer **dev-client**: ML Kit não funciona em
Expo Go.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner.tsx`
  — Rota da Tela 16 acessível pelo FAB (Câmera). Renderiza
  `<ScannerCamera />` em modo full screen.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner/preview.tsx`
  — Sub-tela após captura. Renderiza `<ScannerPreview />` com imagem
  deskewed, overlay OCR e formulário de validação.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/ScannerCamera.tsx`
  — Viewfinder full screen com overlay de cantos cyan. Indicador
  "Documento detectado" aparece quando o ML Kit reconhece 4 cantos.
  Bottom bar: galeria à esquerda, botão captura 72dp branco no
  centro, flash toggle à direita. Modo contínuo via prop.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/ScannerPreview.tsx`
  — Imagem deskewed em fade-in, overlay OCR em cyan mono caption,
  formulário de validação editável (valor, data, descrição, categoria,
  pessoa), botões Regravar e Salvar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/document-scanner.ts`
  — Wrapper sobre `@react-native-ml-kit/document-scanner` para
  detecção ao vivo dos 4 cantos. Expõe hook
  `useDocumentDetection(cameraRef)` que devolve `{ detectado, cantos }`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/text-recognition.ts`
  — Wrapper sobre `@react-native-ml-kit/text-recognition` para OCR
  síncrono pós-captura. Expõe `extrairTexto(uri) => Promise<string>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/parsing.ts`
  — Heurísticas de extração: `extrairValor(texto)`, `extrairData(texto)`,
  `extrairCategoria(texto)`. Regex em português + lookup em
  vocabulário curto (`mercado`, `farmácia`, `transporte`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/scanner/deskew.ts`
  — Aplica `expo-image-manipulator` para retificar a foto usando
  os 4 cantos detectados.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/financeiro_nota.ts`
  — Schema zod do `.md` companion da nota fiscal. Campos: `tipo:
  'financeiro'`, `subtipo: 'nota'`, `data` ISO 8601, `autor`,
  `valor`, `descricao`, `categoria`, `imagem` (path relativo),
  `ocr_confianca` (0-1), `revisar` (bool).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/scanner/parsing.test.ts`
  — Testes das heurísticas (valor brasileiro `R$ 87,40`, datas
  `28/04/2026`, categoria `mercado`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/financeiro_nota.test.ts`
  — Testes do schema zod.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/eas.json`
  — Configuração de profile `development` (se ainda não existir),
  `preview` e `production`. Profile `development` com
  `developmentClient: true` e `distribution: internal`.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — Adicionar plugins `expo-camera`, `expo-image-manipulator`,
  `@react-native-ml-kit/text-recognition`,
  `@react-native-ml-kit/document-scanner` e
  `expo-dev-client`. Permissões `CAMERA` e `READ_EXTERNAL_STORAGE`
  no bloco `android.permissions`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/package.json`
  — Adicionar deps: `expo-camera`, `expo-image-manipulator`,
  `@react-native-ml-kit/text-recognition`,
  `@react-native-ml-kit/document-scanner`, `expo-dev-client`.
  Tudo via `npx expo install` para versão alinhada ao SDK 54.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — Adicionar `inboxFinanceiroNota` em `VAULT_FOLDERS` (também usado
  por M08).

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/writer.ts`
  — `writeVaultFile<FinanceiroNotaMeta>` para o `.md` companion.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `formatDateYmdHm`, `assetsPath`. Criar
  `inboxFinanceiroNotaPath(date, slug)` no padrão.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/index.ts`
  — `Screen`, `Header`, `Button`, `Input`, `Chip`, `ChipGroup`,
  `PersonAvatar`, `Toast`. Estética da Tela 16 herda de graça.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — `medium` no botão captura, `light` no Salvar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa()` para auto-preencher o ChipGroup pessoa.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais.
  Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- **ML Kit on-device** (ADR-0003): zero envio para nuvem, zero rede.
  Fallback Tesseract.js só se ML Kit falhar; nesta sprint só ML Kit.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
  Exemplos canônicos desta tela: `"Documento detectado"`,
  `"Câmera"`, `"Capturar"`, `"Regravar"`, `"Salvar"`,
  `"12 MP - alta qualidade"`, `"Valor"`, `"Categoria"`,
  `"Salvo em alta resolução."`.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`.
- Imports via alias `@/*`.
- **Requer dev-client**: o profile Expo Go puro não inclui
  `@react-native-ml-kit/*`. Documento de teste manual indica que o
  usuário precisa instalar APK gerado por
  `eas build --profile development --platform android` antes de
  testar no celular.
- Modo contínuo (2 toques captura múltiplas páginas) está fora do
  escopo desta sprint; deixar prop pronta mas desabilitada por
  default.

## 5. Procedimento sugerido

1. **Setup dev-client** (1ª vez):
   ```bash
   cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
   npx expo install expo-camera expo-image-manipulator \
     @react-native-ml-kit/text-recognition \
     @react-native-ml-kit/document-scanner expo-dev-client
   npx eas-cli build --profile development --platform android --local
   # ou remoto:
   npx eas-cli build --profile development --platform android
   ```
   Salvar o APK gerado em `~/Downloads/ouroboros-dev.apk` e
   instalar via `adb install`.
2. Configurar `app.json` com plugins e permissões.
3. Criar `eas.json` com 3 profiles padrão. Documentar no spec o
   comando exato de build.
4. Implementar `src/lib/scanner/document-scanner.ts` com hook de
   detecção em tempo real. Rate-limit a 5 fps para não saturar a
   thread.
5. Implementar `src/lib/scanner/text-recognition.ts` com OCR
   pós-captura.
6. Implementar `src/lib/scanner/parsing.ts` com heurísticas regex
   PT-BR. Cobrir casos: valor `R$ 87,40` / `87.40` / `R$ 1.234,56`,
   data `28/04/2026` / `2026-04-28`, categoria por palavras-chave.
7. Implementar `src/lib/scanner/deskew.ts` aplicando
   `expo-image-manipulator` para corrigir perspectiva.
8. Schema zod `financeiro_nota.ts` + testes.
9. `<ScannerCamera>`: viewfinder, overlay de cantos cyan,
   indicador "Documento detectado" quando 4 cantos OK, bottom bar.
10. `<ScannerPreview>`: imagem deskewed em fade-in, overlay OCR cyan,
    formulário com 5 campos, botões Regravar / Salvar.
11. Salvamento: copiar imagem para `assets/<timestamp>.jpg` via
    `StorageAccessFramework.copyAsync`, escrever `.md` companion via
    `writeVaultFile`. Toast verde "Salvo em alta resolução." haptic
    light.
12. Validar fluxo completo no dev-client. Tempo alvo do tap câmera
    no FAB ao toast em <20s.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m09-export && rm -rf /tmp/m09-export
```

Todos exit 0. Para validar na prática, é obrigatório:

```bash
npx eas-cli build --profile development --platform android
adb install ~/Downloads/ouroboros-dev.apk
npx expo start --dev-client --clear
```

Após instalar o APK, escanear o QR no app dev-client (não Expo Go).

## 7. Commit

```
feat: m09 scanner ocr tela 16 ml kit on device dev client
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Nível A (Chrome web):** **não cobre** ML Kit. Validar apenas
  o layout estático da Tela 16 e do preview com imagens
  pré-renderizadas via mocks.
- **Nível B (emulador Android):** valida a câmera virtual do
  emulador (cena pattern em movimento) e a integração com ML Kit.
  Usar dev-client APK no emulador.
- **Nível C (celular físico):** **só com permissão explícita**.
  Validar captura real de recibo de mercado, deskew e OCR.
  Capturar `docs/sprints/M09-screenshots/` lado a lado com mockup
  `docs/Ouroboros_22_telas-standalone.html` artboard "tela 16".

## 9. Dúvidas em aberto

- Modo contínuo (2 toques capturam múltiplas páginas) entra em M09
  ou em sprint sucessora? Hoje a spec deixa a prop preparada mas
  desabilitada.
- Threshold de confiança OCR para auto-marcar `revisar: true`:
  começar em 0,8 e ajustar após uso real?
- Tipo de mídia padrão para `inbox/financeiro/nota/`: `.jpg`
  (compressão) ou `.png` (lossless)? `.jpg` quality 0,9 parece bom
  trade-off.
- Permissão de localização para auto-preencher bairro do recibo:
  fora de escopo desta sprint, mas pensar num M07-like cruzado.
