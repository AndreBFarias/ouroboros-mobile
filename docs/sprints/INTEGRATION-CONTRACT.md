# Contrato de Integração de Sprint

```
DOC: INTEGRATION-CONTRACT.md
STATUS: Contrato vivo | LANG: pt-BR
USO: Toda spec executável referencia este documento na §
    "Integração ao projeto". Ele lista os pontos canônicos onde
    sprints novas plugam tabs, schemas, stores, toggles, rotas
    de FAB, lembretes, sons, intent filters e features opt-in.
```

---

## Por que este documento existe

Sem um contrato explícito, sprints implementam features funcionais
mas **soltas**: tab que não aparece no navigator, schema que não está
no barrel, toggle órfão, rota não acessível pelo FAB. O resultado é
um APK que parece terminado mas tem lacunas de integração quando o
usuário tenta usar.

A regra é simples: **toda sprint que adiciona feature visível precisa
plugá-la nos pontos canônicos abaixo na mesma sprint, antes de
declarar concluída.** A § "Integração ao projeto" da spec descreve
exatamente quais pontos toca.

---

## 1. Pontos canônicos de integração

### 1.1 `app/(tabs)/_layout.tsx` — navigator de tabs

Criado na Sprint M00.5. Centraliza o `<Tabs>` do Expo Router com 5
abas fixas e abas condicionais por feature toggle.

**Abas fixas (sempre visíveis):**

| Ordem | Rota | Ícone (`lucide-react-native`) | Sprint dona |
|---|---|---|---|
| 1 | `/(tabs)/` (Hoje) | `Home` | M02 |
| 2 | `/(tabs)/memoria` | `Layers` | M11 |
| 3 | `/(tabs)/humor` | `BarChart3` | M10 |
| 4 | `/(tabs)/financas` | `Wallet` | M14 |
| 5 | `/(tabs)/settings` | `Settings` | M15 |

**Abas condicionais (só com toggle on em Settings):**

| Toggle key | Rota | Ícone | Sprint dona |
|---|---|---|---|
| `cicloMenstrual` | `/(tabs)/ciclo` | `Moon` | M14.5 |
| `alarmePessoal` | `/(tabs)/alarmes` | `BellRing` | M16 |
| `todoLeve` | `/(tabs)/todo` | `ListChecks` | M17 |
| `contadorDiasSem` | `/(tabs)/contadores` | `Hash` | M18 |
| `calendarioConquistas` | `/(tabs)/calendario` | `Calendar` | M11.5 |

**Sub-rotas com header próprio (não tabs):**

| Rota | Sprint dona |
|---|---|
| `/(tabs)/medidas/index` e `/medidas/novo` | M12 |
| `/(tabs)/exercicios/index`, `[slug]`, `novo` | M13 |
| `/(tabs)/settings/{editar-pessoa, adicionar-segunda-pessoa}` | M15 |
| `/(tabs)/calendario/[id]` | M11.5 |
| `/(tabs)/alarmes/{novo, [slug]}` | M16 |
| `/(tabs)/todo` (tela única) | M17 |
| `/(tabs)/contadores/{novo, [slug]}` | M18 |
| `/(tabs)/ciclo/{index, registrar}` | M14.5 |

**Rotas modais raiz (fora dos tabs):**

| Rota | Sprint dona |
|---|---|
| `/onboarding` | M03 |
| `/_components` (storybook dev) | M01 |
| `/humor-rapido` | M05 |
| `/diario-emocional` | M06 |
| `/eventos` | M07 |
| `/scanner` (modal full-screen) | M09 |
| `/share-receive` (intent receiver) | M08 |
| `/em-breve` | M04 (será removida na M13) |

**Regra de adição:** quando uma sprint adiciona tela nova, ela edita
`app/(tabs)/_layout.tsx` (se aba) ou `app/_layout.tsx` (se rota raiz)
para registrar o `<Tabs.Screen>` ou `<Stack.Screen>`. Nada fica
acessível só por deep link sem registro explícito.

### 1.2 `src/components/chrome/BottomTabs.tsx` — UI customizada da tab bar

Criado na Sprint M00.5. Customiza a aparência do `<Tabs>` do
Expo Router para usar a paleta Dracula, JetBrains Mono e indicador
2dp `--purple` em ativa. Tab condicional consome
`useSettings.featureToggles[key]` e renderiza `null` quando off.

### 1.3 `src/lib/schemas/index.ts` — barrel de schemas zod

Criado na Sprint M00.5. Re-exporta todos os schemas do projeto.
Toda sprint que cria schema novo adiciona linha aqui.

```ts
// Crescimento esperado conforme as sprints fechadas:
export { PessoaIdSchema, PessoaAutorSchema } from './pessoa';
export { HumorSchema, type HumorMeta } from './humor';
export { EventoSchema, type EventoMeta, EventoModoSchema } from './evento';
export {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
  DiarioEmocionalModoSchema,
  ContextoSocialSchema,
} from './diario_emocional';
// adicionado por M06.5/M07.x:
export { MidiaSchema, type Midia, MidiaSpotifySchema, MidiaYoutubeSchema, MidiaFotoSchema, MidiaAudioSchema } from './midia';
// adicionado por M08:
export { InboxArquivoSchema, type InboxArquivoMeta } from './inbox_arquivo';
// adicionado por M09:
export { FinanceiroNotaSchema, type FinanceiroNotaMeta } from './financeiro_nota';
// adicionado por M10:
export { HumorHeatmapCacheSchema } from './humor_heatmap_cache';
// adicionado por M11:
export { TreinoSessaoSchema, type TreinoSessao } from './treino_sessao';
export { MarcoSchema, type Marco } from './marco';
// adicionado por M12:
export { MedidasSchema, type Medida } from './medidas';
// adicionado por M13:
export { ExercicioSchema, type Exercicio } from './exercicio';
// adicionado por M14:
export { FinancasCacheSchema } from './financas_cache';
// adicionado por M14.5:
export { CicloMenstrualSchema, type CicloMenstrual } from './ciclo_menstrual';
// adicionado por M16:
export { AlarmeSchema, type Alarme } from './alarme';
// adicionado por M17:
export { TarefaSchema, type Tarefa } from './tarefa';
// adicionado por M18:
export { ContadorSchema, type Contador } from './contador';
```

### 1.4 `src/lib/stores/index.ts` — barrel de stores zustand

Criado na Sprint M00.5. Re-exporta todos os stores.

```ts
export { usePessoa, nomeDe } from './pessoa';
export { useVault } from './vault';
export { useOnboarding } from './onboarding';
// adicionado por M15:
export { useSettings } from './settings';
// adicionado por sprints que precisem de cache em memória:
// (consultar a spec específica)
```

### 1.5 `src/lib/stores/settings.ts` — store de configurações

Criado na Sprint M15. Único ponto onde toggles de feature, lembretes,
biometria, sync e qualidade do scanner vivem. Persistido em
SecureStore via `secureStorage` adapter (chave `ouroboros.settings.v1`).

**Esquema canônico (M15 cria; outras sprints só consomem):**

```ts
interface SettingsState {
  somVibracao: {
    humor: boolean;        // default true
    vitoria: boolean;      // default true
    trigger: boolean;      // default false (momento delicado)
    fab: boolean;          // default true
    alarme: boolean;       // default true
  };
  lembretes: {
    medicacao: { ativo: boolean; horario: string };
    treino:    { ativo: boolean; horario: string };
    humor:     { ativo: boolean; horario: string };
  };
  pessoa: {
    ativa: PessoaAutor;
    vaultCompartilhado: boolean;
    tipoCompanhia: 'sozinho' | 'duo';
  };
  sync: {
    metodo: 'syncthing' | 'obsidian-sync' | 'nao-uso';
    qualidadeScanner: '8mp' | '12mp' | 'maxima';
  };
  featureToggles: {
    cicloMenstrual: boolean;       // default false (M14.5)
    alarmePessoal: boolean;         // default false (M16)
    todoLeve: boolean;              // default false (M17)
    contadorDiasSem: boolean;       // default false (M18)
    calendarioConquistas: boolean;  // default false (M11.5)
    widgetHomescreen: boolean;      // default false (M20)
  };
  privacidade: {
    biometriaAbrir: boolean;
    ocultarTranscricoes: boolean;
  };
  midia: {
    capPorRegistro: number;         // default 4 (M07.x)
    permitirAudio: boolean;         // default true; false desabilita gravação
  };
}
```

**Regra:** sprints opt-in (M14.5, M16, M17, M18, M11.5, M20)
**não criam** suas próprias chaves. Elas consomem
`useSettings.featureToggles[key]`. M15 é a única que altera o
shape do store.

### 1.6 `src/lib/navigation/captureRoutes.ts` — atalhos do FAB radial

Criado na M04. Mapa entre cada `FABRadialKey` e a rota concreta.

| Key do FAB | Rota | Sprint que ativou (deixou de ser stub) |
|---|---|---|
| `humor` | `/humor-rapido` | M05 |
| `voz` | `/diario-emocional?modo=audio` | M06 (modo) + M06.5 (audio real) |
| `camera` | `/scanner` | M09 |
| `exercicio` | `/(tabs)/exercicios/novo` | M13 (era `/em-breve`) |
| `vitoria` | `/diario-emocional?modo=vitoria` | M06 |
| `trigger` | `/diario-emocional?modo=trigger` | M06 |

**Regra de M13:** ao implementar a galeria, atualizar
`captureRoutes.ts` substituindo `/em-breve` por
`/(tabs)/exercicios/novo` e remover `app/em-breve.tsx`.

### 1.7 `app/_layout.tsx` — boot e gates globais

Mantido pela Sprint M01.1, modificado por sprints que precisam de
boot hooks. Pontos canônicos:

| Hook de boot | Sprint dona | Quando dispara |
|---|---|---|
| Carregamento de fontes JetBrains Mono | M01.1 | sempre |
| `Appearance.setColorScheme('dark')` + classlist Web | M01.1 | sempre |
| `<GestureHandlerRootView>` | M01.4 | sempre |
| `<ToastProvider>` | M01.4 | sempre |
| Gate de biometria (`LocalAuthentication`) | M15 | se `privacidade.biometriaAbrir` |
| `reagendarAlarmes()` | M16 | sempre (idempotente) |
| `Linking.addEventListener('url')` para share intent | M08 | sempre |
| `limparLixeiraExpirada()` (todo) | M17 | uma vez por dia |
| `verificarMarcosAuto()` (chama backend ou heurística) | M11 | uma vez por dia |
| Atualização do widget de homescreen | M20 | quando humor é salvo |

**Regra:** quem precisa de boot hook **adiciona o helper já dentro
da spec da feature**, não em sprint separada. M15 é dona do gate de
biometria; M16 do reagendamento; M08 do listener de URL etc.

### 1.8 `app.json` — plugins, permissões e intent filters

| Plugin / permissão | Sprint dona | Motivo |
|---|---|---|
| `expo-router` | M01.1 | routing |
| `expo-font` | M01.1 | JetBrains Mono |
| `expo-secure-store` | M01.2 | identidade runtime |
| `expo-image-picker` (PT-BR strings) | M03.2 | foto perfil + fotos eventos |
| `expo-location` (PT-BR strings) | M07 | bairro |
| `@react-native-community/datetimepicker` | M07 | time picker |
| `expo-camera` + permissão `CAMERA` | M09 | scanner |
| `expo-image-manipulator` | M09 | deskew |
| `@react-native-ml-kit/text-recognition` | M09 | OCR |
| `@react-native-ml-kit/document-scanner` | M09 | detecção cantos |
| `expo-dev-client` | M00.5 | dev-client setup |
| `expo-av` + permissão `RECORD_AUDIO` | M06.5 | microfone |
| `@react-native-voice/voice` | M06.5 | transcrição |
| `expo-notifications` + plugin canal `default` | M15 | lembretes |
| `expo-local-authentication` | M15 | biometria |
| `expo-sharing` | M15 | export ZIP |
| Intent filters (SEND `image/*` e `application/pdf`) | M08 | share receive |
| Widget config nativo | M20 | homescreen widget |

**Regra:** a sprint dona é a **única** que edita `app.json` para o
seu plugin. Conflitos de merge minimizados.

### 1.9 `eas.json` — profiles de build

Criado na Sprint M00.5 com 3 profiles:

```jsonc
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleDebug" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleRelease" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```

**Regra:** sprints que precisam de plugins nativos pesados (M06.5, M09)
**não criam** profile próprio; usam `development` da M00.5. Apenas
documentam que o APK dev-client precisa estar instalado antes do
checkpoint.

### 1.10 `package.json` scripts

| Script | Função | Sprint dona |
|---|---|---|
| `start` | `expo start` | M01.1 |
| `android` | `expo start --android` | M01.1 |
| `web` | `expo start --web` | M01.1 |
| `typecheck` | `tsc --noEmit` | M01.2 |
| `lint` | `eslint app/ src/` | M01.1 |
| `test` | `jest --watchAll=false` | M01.2 |
| `test:e2e` | `maestro test tests/e2e/` | M19 |
| `build:dev` | `eas build --profile development --platform android` | M00.5 |
| `build:preview` | `eas build --profile preview --platform android` | M00.5 |
| `build:prod` | `eas build --profile production --platform android` | M19 |

### 1.11 `scripts/` shell

| Script | Função | Sprint dona |
|---|---|---|
| `check_anonimato.sh` | Regra −1 | M01 |
| `check_test_data.sh` | Dados de teste | M01 |
| `smoke.sh` | Smoke completo | M01 |
| `seed_vault_demo.sh` | Popular Vault | M02 |
| `start-emulator.sh` | AVD `ouroboros-test` | install-dev |
| `mirror-device.sh` | scrcpy | install-dev |
| `adb-wireless.sh` | ADB wifi | install-dev |
| `seed_exercicios_demo.sh` | Popular exercícios | M13 |
| `seed_marcos_demo.sh` | Popular marcos | M11 |
| `release-apk.sh` | Pipeline release | M19 |

---

## 2. Checklist obrigatório por sprint

A sprint **só pode declarar concluída** quando todos os itens
aplicáveis abaixo estão verdes.

### 2.1 Estrutural

- [ ] Tela acessível pelo `<Tabs>` (se aba fixa) **OU** pelo
      `<Stack>` raiz (se modal) **OU** por toggle em Settings (se
      opt-in).
- [ ] Schema novo (se houver) exportado em `src/lib/schemas/index.ts`.
- [ ] Store novo (se houver) exportado em `src/lib/stores/index.ts`.
- [ ] Plugin/permissão novo (se houver) registrado em `app.json` com
      strings PT-BR.
- [ ] Helper de boot (se houver) plugado em `app/_layout.tsx`.
- [ ] Atalho do FAB (se aplicável) atualizado em
      `src/lib/navigation/captureRoutes.ts`.
- [ ] Toggle de feature (se opt-in) consumido — não criado — em
      `useSettings.featureToggles`.

### 2.2 Qualidade

- [ ] `./scripts/check_anonimato.sh` exit 0.
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `npm test --silent` exit 0; total de testes igual ou maior que
      o estado anterior.
- [ ] `./scripts/smoke.sh` exit 0.
- [ ] `npx expo export --platform android --output-dir /tmp/<MNN>-export`
      exit 0; bundle Hermes documentado no commit.

### 2.3 Visual — validação Chrome MCP pelo orquestrador

Toda sprint integradora exige **validação visual via Chrome MCP**
conduzida pelo Claude principal (orquestrador), em duas camadas:

- [ ] **Camada 1 — Agente executor (interno):**
  - O `executor-sprint` invoca skill `validacao-visual` ou usa
    playwright headless durante a execução.
  - Captura screenshots em `docs/sprints/MNN-screenshots/A-*.png`
    cobrindo cada estado da feature (vazio, preenchido, erro).
- [ ] **Camada 2 — Orquestrador (revisão cruzada):**
  - Após o agente devolver controle, o Claude principal carrega
    `claude-in-chrome` MCP via
    `ToolSearch select:mcp__claude-in-chrome__*`.
  - Conecta ao Metro web rodando, navega pelas rotas tocadas pela
    sprint, captura screenshots adicionais
    `docs/sprints/MNN-screenshots/V-*.png` (V de "Validação
    cruzada").
  - Compara com mockup HTML standalone se aplicável.
  - Confirma comportamento esperado: paleta Dracula, JetBrains
    Mono, transições com spring, sentence case + acentuação
    completa PT-BR.
- [ ] Consolidar `docs/sprints/MNN-checkpoint-visual.md` com
      ambas as camadas e parecer textual (aprovado / aprovado com
      ressalvas / reprovado).

**Expo Go no celular físico (Nível C) NÃO é exigência por sprint.**
Vira obrigatório apenas:

- Na **M19 (APK Release v1.0.0)** com smoke E2E completo dos 4
  flows críticos.
- Em sprints que envolvem **APIs nativas pesadas** que Chrome
  web não cobre (M06.5 microfone, M09 scanner ML Kit). Mesmo
  nessas, o orquestrador valida via Chrome o que for possível
  e o gate Expo Go fecha sob demanda do usuário.

Política substitui o checkpoint dual obrigatório anterior.
Decisão tomada em 2026-04-30 após M00.5 confirmar que validação
Chrome MCP pelo orquestrador é suficiente para o ciclo de sprint.

### 2.4 Documentação

- [ ] `STATE.md` atualizado com novo HEAD e próxima sprint.
- [ ] `ROADMAP.md` status da sprint vira `[ok]`.
- [ ] `CHANGELOG.md` entrada `[Unreleased]` documentando a sprint.
- [ ] `VALIDATOR_BRIEF.md` §4 (Armadilhas) ganha entrada nova se a
      sprint descobriu armadilha de plataforma.

---

## 3. Padrão da seção "Integração ao projeto" nas specs

Toda spec executável depois deste contrato inclui uma seção entre §3
(APIs reutilizáveis) e §4 (Restrições) com o template abaixo:

```markdown
## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** <descrição + path absoluto do arquivo onde o
  `<Tabs.Screen>` ou `<Stack.Screen>` é registrado>
- **Schema:** <schemas exportados em `src/lib/schemas/index.ts`>
- **Store:** <stores exportados em `src/lib/stores/index.ts`,
  ou consumidos sem criação>
- **app.json:** <plugins/permissões adicionados>
- **Boot hook:** <helper adicionado em `app/_layout.tsx`, se houver>
- **FAB:** <atualização em `captureRoutes.ts`, se houver>
- **Settings:** <toggle/seção consumida ou criada>
- **`app/em-breve.tsx`:** <removido se aplicável>

A seguir o checklist de integração da §2 do CONTRACT é replicado
como Definição de Pronto.
```

---

## 4. Padrão da seção "Decisões tomadas" nas specs

A seção "Dúvidas em aberto" do template original é substituída por
"Decisões tomadas". Toda dúvida da spec original tem uma decisão
explícita aqui, com a forma:

```markdown
## 9. Decisões tomadas

- **<tópico>:** <decisão> — <justificativa em 1 linha>
- ...

Sprint pronta para execução sem perguntas pendentes.
```

---

## 5. Anti-patterns que este contrato visa evitar

### 5.1 Feature solta

1. Sprint cria componente novo `<MidiaPicker>` em
   `src/components/midia/`.
2. Sprint adiciona campo `midia` ao schema.
3. Sprint **esquece** de plugar `<MidiaPicker>` na Tela 18 e Tela 20.
4. Tests de unidade passam (componente isolado) mas o usuário nunca
   vê o picker no fluxo real.

A § "Integração ao projeto" obriga a listar onde o componente é
**chamado**, não só onde existe.

### 5.2 Rota órfã

1. Sprint A registra `<Tabs.Screen name="humor" />` em
   `app/(tabs)/_layout.tsx`.
2. Sprint dona da tela `humor` (no caso, M10) ainda não foi
   executada.
3. Usuário toca a aba e o app crasha porque `app/(tabs)/humor.tsx`
   não existe.

**Padrão obrigatório:** sempre que uma sprint A registra rota X
mas a sprint dona B ainda não rodou, A precisa criar **stub default
em `app/(tabs)/em-construcao.tsx`** (criado em M00.5) e fazer a aba
X redirecionar para `em-construcao?sprint=BNN` até B substituir o
redirect direto pela tela real.

A regra: **toda rota declarada no navigator tem destino renderizável.**
Mesma lógica vale para sub-rotas filhas de tabs (`/(tabs)/medidas/novo`
quando M12 ainda não rodou, etc).

### 5.3 Schema cruzado sem refine compatibilidade

1. Sprint A adiciona campo obrigatório novo ao schema X via
   `.refine`.
2. Arquivos `.md` legados sem o campo passam a falhar parse no
   reader.
3. Tela 01 (Hoje) quebra ao tentar listar registros antigos.

**Padrão obrigatório:** todo refine novo precisa ter
`.optional()` ou `.default()` no campo, OU o schema ganha
`schema_version: 2` com migração explícita. Refines condicionais
(ex: `modo === 'vitoria' => midia.length >= 1`) só travam **novos
saves**, nunca leitura de arquivos legados.

### 5.4 Boot hook sem registro

1. Sprint cria função `verificarMarcosAuto()` em
   `src/lib/marcos/marcosAuto.ts`.
2. Sprint **esquece** de adicionar a função ao array `BOOT_HOOKS`
   em `src/lib/boot/reagendamento.ts`.
3. Função nunca executa em produção; ninguém percebe.

**Padrão obrigatório:** sprints que criam helper de boot
**ESSENCIAL** plugam no `BOOT_HOOKS` na mesma sprint. Lista de
hooks atual fica documentada em §1.7 deste contrato.

---

## 6. Versionamento deste contrato

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-04-30 | Versão inicial. Define pontos 1.1 a 1.11, checklist da §2, padrões §3 e §4. |
| 1.1 | 2026-05-02 | Refundação v1.0 (M21–M41). Mudanças estruturais listadas em §7. |

Mudança de shape de `useSettings`, de `app/(tabs)/_layout.tsx` ou
substituição da camada de navegação exige bump de versão deste
documento.

---

## 7. Mudanças da v1.1 (Refundação v1.0, sprints M21–M41)

A refundação reescreve pontos canônicos do contrato. As mudanças
abaixo entram em vigor sprint por sprint; specs M21–M41 referenciam
este §7 quando o ponto canônico que tocam mudou.

### 7.1 Navegação: menu lateral substitui bottom tabs (M27)

A partir da M27, `app/(tabs)/_layout.tsx` é **apagado** e
`app/(tabs)/<rota>.tsx` é movido para `app/<rota>.tsx` (rotas raiz).
A navegação principal passa a viver em
`src/components/chrome/MenuLateral.tsx` (drawer custom Moti, abre
da esquerda) acionado por `src/components/chrome/FABMenu.tsx` (FAB
purple no canto inferior **esquerdo** — substitui o `<FABRadial>`
do canto inferior direito).

**Implicações para o §1.1:**

- A tabela "Abas fixas (sempre visíveis)" e "Abas condicionais"
  continua válida como **mapa de rotas + ícones + features**, mas
  cada item agora é renderizado como `<Pressable>` 56dp em uma das 3
  seções do MenuLateral (Ver / Registrar / Opcionais), não como
  `<Tabs.Screen>`.
- Sub-rotas (ex: `medidas/novo`, `exercicios/[slug]`) continuam
  funcionando via `expo-router` file-based; só a casca de navegação
  muda.
- Rotas modais raiz ganham 4 novas em M22-M40: `/recap` (M36),
  `/agenda` (M37), `/settings/contas-google` (M37),
  `/settings/dispositivos` (M38).

**Regra atualizada:** sprints novas plugam tela em
`MenuLateral.tsx` (não em `_layout.tsx`). Tabela de seções:

| Seção | Itens canônicos | Sprint dona |
|---|---|---|
| Ver | Hoje, Recap, Memórias, Humor, Calendário, Finanças | M27, M36, M37 |
| Registrar | Humor, Voz, Câmera, Exercícios, Conquista, Crise | M27 (consome captureRoutes) |
| Opcionais | Tarefas, Alarmes, Contadores, Ciclo (gated por toggle) | M27 |

### 7.2 Captura: FAB radial vira FAB de menu + menu verde de mídia (M27, M34)

`<FABRadial>` (canto inferior direito, semicírculo de 6 botões) é
**removido** em M27. Substituído por:

- `<FABMenu>` purple (canto inferior **esquerdo**, ícone Menu) —
  abre `<MenuLateral>` global. Renderizado em `app/_layout.tsx`
  (exceto rotas modais).
- `<MenuCapturaVerde>` verde (canto inferior **direito** das tabs
  de Memórias) — menu pequeno de 4 ações (Foto/Música/Vídeo/Frase),
  M34.

`captureRoutes.ts` continua sendo fonte de verdade dos 6 destinos
históricos; agora é consumido pela seção "Registrar" do MenuLateral
em vez do FABRadial.

### 7.3 Settings v2: vibração simples + features default ON + sync removido (M29)

A partir da M29, `useSettings` migra de `ouroboros.settings.v1` para
`ouroboros.settings.v2` com migração one-shot. Mudanças no shape:

- `somVibracao` passa de 5 chaves para
  `{ geral, despertar, conquista, botoes }` (4 booleans, `geral`
  é mestre).
- `lembretes` **removido** do store. Migra para alarmes
  pré-cadastrados desligados (M30) via
  `migrarLembretesParaAlarmes()`.
- `sync` **removido** (sempre Syncthing-ready implicitamente; M22
  trata persistência canônica; M38 trata conflitos 4 nós).
- `qualidadeScanner` **removido** (sempre `maxima`; M29 documenta).
- `featureToggles` defaults: **todos `true`** (usuário desliga o
  que não quer; era todos `false`).

Tabela §1.5 fica obsoleta para v2; specs M21–M41 que tocam settings
referenciam este §7.3 explicitamente.

### 7.4 Schemas v2: tarefa, alarme, contador, diário, evento, marco (M30, M31, M33)

| Schema | Sprint dona | Mudança principal |
|---|---|---|
| `AlarmeSchema` | M30 | Adiciona `recorrencia: 'unica'\|'diaria'\|'semanal'\|'mensal'`. |
| `TarefaSchema` | M31 | Adiciona `categoria` (8 enum), `pessoa_destino` (discriminated union 4 tipos), `alarme` (objeto opcional). |
| `DiarioEmocionalSchema` | M33 | Adiciona `para` (discriminated union mim/outra/casal). |
| `EventoSchema` | M33 | Adiciona `para`. |
| `ContadorSchema` | M33 | Adiciona `para`. |
| `MarcoSchema` | M33 | Adiciona `para`. |
| `MidiaCompanionSchema` (novo) | M39 | Companion `.md` formal de cada binário em `media/<categoria>/`. |

Todos os adds são `.optional()` ou `.default(...)` para preservar
leitura de arquivos legados (ver anti-pattern §5.3).

### 7.5 Boot hooks novos (M22, M30, M38, M39)

| Hook de boot | Sprint dona | Quando dispara |
|---|---|---|
| `inicializarVaultCanonico()` | M22 | sempre (idempotente; cria 18 subpastas em `/sdcard/Documents/Ouroboros/`) |
| `migrarLembretesParaAlarmes()` | M30 | uma vez por install (deleta após sucesso) |
| `garantirDeviceId()` | M38 | sempre (idempotente; gera curto em SecureStore) |
| `migrarAssetsLegacyParaMedia()` | M39 | uma vez por install (idempotente) |
| `salvarUltimaRota()` (não boot, navigation listener) | M24 | em cada navegação |

Plugados em `src/lib/boot/reagendamento.ts` array `BOOT_HOOKS`
(mesmo padrão do M16/M17 antigos).

### 7.6 Rotas raiz novas (M22–M40)

Adicionadas ao `app/` na raiz (após M27 apagar `app/(tabs)/`):

| Rota | Sprint dona | Tipo |
|---|---|---|
| `/recap` | M36 | modal full-screen |
| `/agenda` | M37 | rota raiz |
| `/settings/contas-google` | M37 | sub-rota settings |
| `/settings/dispositivos` | M38 | sub-rota settings |

### 7.7 Permissões e plugins novos no `app.json` (M22, M37)

| Plugin / permissão | Sprint dona | Motivo |
|---|---|---|
| `WRITE_EXTERNAL_STORAGE` | M22 | Android <11 |
| `READ_EXTERNAL_STORAGE` | M22 | Android <11 |
| `MANAGE_EXTERNAL_STORAGE` | M22 | Android ≥11 (APK fora da Play Store) |
| `expo-auth-session` plugin + scheme `ouroboros://oauth-callback` | M37 | Google Calendar OAuth |
| `@react-native-google-signin/google-signin` | M37 | Google sign-in |

Permissão `expo-notifications` não é nova em M30 — só a chamada
proativa de `pedirPermissao()` no boot pós-onboarding via
`useSessao.permissoesPedidas.notif`.
