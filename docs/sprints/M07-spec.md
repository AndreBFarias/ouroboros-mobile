# Sprint M07 — Eventos com Lugar (Tela 20)

```
DEPENDE:    M02 fechada (Vault Bridge: writer/reader/paths/schemas)
            + M03 fechada (identidade dinâmica)
            + M04 fechada (FAB Radial roteia para /eventos quando algum
              fluxo derivado for criado, embora hoje a tela seja aberta
              também via aba dedicada futura)
BLOQUEIA:   M07.x (mídia obrigatória estende o schema evento)
            + M11.5 (Calendário consome eventos com modo positivo)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Implementar a Tela 20 do BRIEFING (§6, Seção B): **registro de evento
com lugar e contexto**. Bottom sheet 80%, textarea "O que aconteceu?",
bloco "Onde" com input manual + botão `"Usar localização atual"`
(`expo-location`) + chip cyan mostrando bairro detectado, bloco
"Quando" com chip `"Agora"` default + chip `"Outro horário"` abrindo
time picker, ChipGroup multi de "com quem" (`pessoa_b` auto-selecionada
se duo), ChipGroup single de categoria, bloco fotos opcional via
`expo-image-picker`, slider de intensidade 1-5, botão Registrar verde
com `haptics.success()` leve. Persiste em
`eventos/YYYY-MM-DD-slug.md` via `vault/writer.ts`. Tempo-alvo do flow:
≤25s (BRIEFING §5).

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx`
  — substitui o stub criado na M04. Renderiza `<BottomSheet>` em
  snap 80%. Estado controlado:
  - `texto: string` (obrigatório, mínimo 1 caractere)
  - `lugar: string` (input manual, opcional)
  - `bairro: string | null` (preenchido por `expo-location`,
    opcional)
  - `quando: 'agora' | 'outro'` + `dataCustom: Date | null`
  - `com: PessoaId[]`
  - `categoria: EventoCategoria`
  - `fotos: string[]` (URIs locais)
  - `intensidade: 1..5` (default 4)
  - `modo: EventoModo` (default `'positivo'`)
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/eventos/LocalizacaoBlock.tsx`
  — bloco "Onde" com input + botão `"Usar localização atual"` +
  chip cyan exibindo bairro detectado. Chama
  `expo-location.getCurrentPositionAsync` -> `reverseGeocodeAsync`
  e extrai `district` ou `subregion` como bairro. Erros tratados
  silenciosamente (toast micro
  `"Não foi possível detectar o bairro."`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/eventos/QuandoBlock.tsx`
  — bloco "Quando". Dois chips single-select (`Agora` / `Outro
  horário`). Selecionar `Outro horário` abre `<DateTimePicker>`
  (`@react-native-community/datetimepicker`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/eventos/FotosBlock.tsx`
  — botão `"Adicionar foto"` + grid 3 colunas de thumbnails (URI
  local). Chama `expo-image-picker` `launchImageLibraryAsync`.
  Permite até 6 fotos por evento. Cada thumbnail tem botão `X`
  pequeno red para remover.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/eventos/categorias.ts`
  — const `EVENTO_CATEGORIAS = ['rolezinho','compras','consulta',
  'trabalho','evento_social','rotina','exercicio','outro']`. Helper
  `formatCategoria(slug)` converte para Sentence case
  (`'evento_social' -> 'Evento social'`). Type
  `EventoCategoria = typeof EVENTO_CATEGORIAS[number]`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/eventos/saveEvento.ts`
  — `saveEvento(meta, body, vaultRoot, fotos): Promise<{ uri:
  string }>`. Copia cada foto de URI temporário para
  `assets/<formatDateYmdHm>-evento-<idx>.jpg` e atualiza
  `meta.fotos` com paths relativos antes de chamar
  `writeVaultFile<EventoMeta>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/eventos/slug.ts`
  — `slugifyEvento(texto, categoria)` gera slug kebab-case com
  até 24 chars derivado do texto + categoria (ex.
  `cafe-da-manha-rolezinho`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/eventos.test.tsx`
  — render do sheet, troca de modo (positivo/negativo), validação
  trava save se `texto` vazio, foto adicionada.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/eventos/saveEvento.test.ts`
  — caminho feliz, fotos copiadas para `assets/` e meta atualizada.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/eventos/slug.test.ts`
  — `slugifyEvento` cobre acentos, espaços, pontuação.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — adicionar plugin `'expo-location'` com `locationAlwaysAndWhenInUsePermission:
  'Permitir detectar bairro para anotar onde foi.'`. Adicionar
  `expo-image-picker` plugin se ainda não estiver
  (`photosPermission`, `cameraPermission`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/package.json`
  — adicionar `expo-location` e `expo-image-picker` (verificar; M03.2
  já adicionou `expo-image-picker` para `AvatarPicker`). Adicionar
  `@react-native-community/datetimepicker` se ainda não estiver.
  Sempre via `npx expo install <pkg>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/CHANGELOG.md`
  — entrada `[Unreleased]` "Sprint M07 - tela 20 eventos com lugar
  persistido em eventos/.".

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/BottomSheet.tsx`
  — `snapPoints={['80%']}`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Textarea.tsx`
  — `<Textarea label="O que aconteceu?" autoExpand required>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Input.tsx`
  — input "Lugar" manual.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Chip.tsx`
  — chips para "Com quem", categoria, "Quando", e chip cyan do
  bairro detectado.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Slider.tsx`
  — slider intensidade 1-5.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Button.tsx`
  — variant `success` para Registrar; variant `ghost` para
  `"Usar localização atual"` e `"Adicionar foto"`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Toast.tsx`
  — toasts: `"Anotado."` (success),
  `"Não foi possível detectar o bairro."` (info), `"Falha ao
  salvar."` (red).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Toggle.tsx`
  — toggle modo `Positivo` ↔ `Negativo` (no header do sheet, similar
  ao toggle da Tela 18).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/evento.ts`
  — `EventoSchema` e `EventoMeta`. Já existe e cobre `tipo`, `data`
  (ISO 8601), `autor`, `modo`, `lugar?`, `bairro?`, `com[]`,
  `categoria?`, `intensidade`, `fotos[]`. Sem mudança de schema
  nesta sprint.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `eventosPath(date, slug)`, `assetsPath(filename)`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/writer.ts`
  — `writeVaultFile<EventoMeta>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa.getState()` para `autor` e auto-seleção de
  `pessoa_b` no chip "com quem". `nomeDe()` para labels.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/onboarding.ts`
  — `useOnboarding.getState().tipoCompanhia` para detectar duo
  e auto-selecionar `pessoa_b`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/vault.ts`
  — `useVault.getState().vaultRoot`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/motion.ts`
  — `springs.subtle` para abertura do bloco "Outro horário".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — `haptics.success()` leve no save bem sucedido (modo positivo);
  modo negativo segue mesma regra do diário (sem haptic).
- `expo-location` — `getCurrentPositionAsync`, `reverseGeocodeAsync`.
- `expo-image-picker` — `launchImageLibraryAsync`.
- `@react-native-community/datetimepicker` — `<DateTimePicker
  mode="time" />`.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013). Ex: `"Eventos"`, `"O que aconteceu?"`, `"Onde"`,
  `"Usar localização atual"`, `"Quando"`, `"Agora"`,
  `"Outro horário"`, `"Com quem"`, `"Categoria"`, `"Fotos"`,
  `"Como foi?"`, `"Registrar"`, `"Anotado."`. Categoria exibida via
  `formatCategoria` (`"Evento social"`).
- `accessibilityLabel` sem acento (ex:
  `'usar localizacao atual'`, `'registrar evento'`).
- Comentários em código sem acento.
- Mensagens de commit sem acento.
- TypeScript strict.
- Imports via alias `@/*`.
- **Não tocar** em `src/components/ui/*` (M01).
- **Não tocar** em `src/lib/schemas/evento.ts` — schema fechado.
  Esta sprint **não** adiciona campo `midia` (isso é M07.x).
- **Detecção de bairro é opcional.** Se permission negada ou sem
  GPS, o input manual continua disponível. Nunca bloquear o save
  por falta de localização.
- **Fotos são opcionais.** No máximo 6 (cap interno; UI
  desabilita botão `"Adicionar foto"` ao atingir).
- Em modo negativo: sem haptic no save (mesmo princípio M06).

## 5. Procedimento sugerido

1. Atualizar dependências (`npx expo install expo-location
   @react-native-community/datetimepicker`); confirmar
   `expo-image-picker` já presente desde M03.2.
2. Atualizar `app.json` com plugins e mensagens de permissão.
3. Criar `src/lib/eventos/categorias.ts` com const + helper.
4. Criar `src/lib/eventos/slug.ts`.
5. Criar `src/lib/eventos/saveEvento.ts`.
6. Criar 3 componentes em `src/components/eventos/`:
   - `LocalizacaoBlock.tsx`
   - `QuandoBlock.tsx`
   - `FotosBlock.tsx`
7. Implementar `app/eventos.tsx`:
   - `<BottomSheet snapPoints={['80%']}>` aberto on-mount.
   - Header com toggle modo positivo/negativo (default positivo) +
     borda esquerda animada (verde / vermelho), padrão idêntico ao
     da Tela 18 da M06.
   - `<Textarea>` "O que aconteceu?".
   - `<LocalizacaoBlock />`.
   - `<QuandoBlock />`.
   - `<ChipGroup mode="multi" label="Com quem">` com auto-seleção
     de `pessoa_b` se `tipoCompanhia` !== `'sozinho'`.
   - `<ChipGroup mode="single" label="Categoria"
     options={EVENTO_CATEGORIAS.map(c => ({ id: c, label:
     formatCategoria(c) }))} />`.
   - `<FotosBlock />`.
   - `<Slider label="Como foi?" min={1} max={5} step={1}>`.
   - Botão Registrar variant `success`.
8. `handleSave`:
   - monta `meta: EventoMeta` com:
     - `tipo: 'evento'`.
     - `data` em ISO 8601 -03:00 (do `quando`).
     - `autor: pessoaAtiva`.
     - `modo`.
     - `lugar`, `bairro`, `com`, `categoria`, `intensidade`.
     - `fotos: []` (paths preenchidos por `saveEvento` após copiar).
   - valida com `EventoSchema.safeParse`.
   - chama `saveEvento(meta, body='', vaultRoot, fotos)`.
   - sucesso modo positivo: `haptics.success()` + toast `"Anotado."`.
   - sucesso modo negativo: toast `"Registrado."` (sem haptic).
   - erro: toast `"Falha ao salvar."`.
   - fechar sheet, `router.back()`.
9. Testes (3 arquivos novos).
10. Comandos da seção 6.
11. Commit.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m07-export && rm -rf /tmp/m07-export
```

Todos exit 0. Total de testes deve aumentar (esperado: +6 a +9).

## 7. Commit

```
feat: m07 eventos com lugar tela 20 com fotos opcionais
```

## 8. Checkpoint visual

Esta sprint **toca UI** (Tela 20 nova) **e** envolve APIs nativas
(localização, image picker, datetimepicker). Política de 3 níveis
(`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** valida render do sheet,
  troca de modo (positivo/negativo), comportamento dos chips e
  inputs, botão Registrar. Localização e fotos podem cair em
  fallback web (`navigator.geolocation`) ou ficar mockadas.
  Capturar 4 screenshots: sheet vazio modo positivo, sheet
  preenchido com bairro detectado e 2 fotos, time picker aberto,
  toast `"Anotado."`.
- **APIs nativas — Nível B (emulador Android):**
  `./scripts/start-emulator.sh`. Validar permissão de localização
  do emulador (deve aceitar coordenadas mockadas via DDMS),
  galeria mock, e que `expo-image-picker` retorna URIs reais.
  Capturar mais 3 screenshots cobrindo image picker, datetimepicker
  e bairro detectado.
- **Final — Nível C (celular físico):** **só com permissão
  explícita do usuário**. Validar GPS real (bairro detectado bate
  com onde está o usuário), galeria real e que o `.md` aparece
  em `~/Protocolo-Ouroboros/eventos/` com fotos copiadas para
  `assets/` no desktop após sync via Syncthing.

Salvar capturas em `docs/sprints/M07-screenshots/`. Comparar com
artboard "tela 20 — eventos" de
`docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

Resolvidas em 2026-04-30 com o humano (orquestrador registrou aqui
antes de disparar o executor):

1. **Auto-seleção `pessoa_b`**: comportamento uniforme. Se
   `tipoCompanhia === 'casal'` ou `'amigos'`, auto-marca
   `pessoa_b`. Se `'sozinho'`, não auto-marca. Sem chip "Amigos"
   pré-marcado nesta sprint — fica para sprint futura se a UX
   pedir diferenciação.
2. **Categoria `exercicio`**: **manter** na lista. Paralelo a M13
   (Galeria e Detalhe Exercício, que cobre dados estruturados de
   treino). Aqui em eventos é o registro casual ("fui na
   academia") sem séries/peso.
3. **Time picker**: Android nativo modal + fallback Web
   `<input type="time">` (UX consistente aceitável).
4. **Cap de 6 fotos**: aceito como arbitrário; ajusta-se depois com
   base em uso real.

Nenhuma dúvida pendente; executar.
