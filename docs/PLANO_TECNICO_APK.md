# Plano Técnico: Como Construir o APK Sem Quebrar

```
DOC: PLANO_TECNICO_APK.md
STATUS: Playbook operacional | VERSION: 3.0 | LANG: pt-BR
USO: Leia depois de CONTEXTO.md e BRIEFING.md. Este arquivo descreve
     COMO construir, validar, testar ao vivo e crescer o projeto sem
     introduzir regressão. Setup zero-Android-Studio via Expo Go.
     Inclui protocolo formal de sprint com TODO list dupla.
```

---

## 1. Protocolo de Sprint (Leia Antes de Tudo)

Este é o protocolo mais importante deste documento. **Toda sprint segue
este formato sem exceção.** Foi desenhado para garantir que:

1. O humano vê o progresso visual a cada sprint (não só código)
2. O agente prepara seu próprio plano antes de pedir aprovação humana
3. Cada sprint tem encerramento claro antes da próxima começar

### 1.1 Anatomia de Uma Sprint

Cada sprint tem 4 etapas obrigatórias:

```
┌──────────────────────────────────────────────────────┐
│  ETAPA 1: BRIEFING DA SPRINT                          │
│  Agente lê issue, gera TODO list interna,             │
│  pede confirmação ao humano antes de codar            │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│  ETAPA 2: IMPLEMENTAÇÃO                               │
│  Agente trabalha riscando itens da TODO interna       │
│  conforme conclui                                     │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│  ETAPA 3: CHECKPOINT VISUAL NO EMULADOR               │
│  Agente roda o App, captura screenshot/vídeo,         │
│  prepara comparativo com HTML standalone              │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│  ETAPA 4: TODO LIST FINAL (HUMANO)                    │
│  Agente entrega lista de validação para o humano      │
│  conferir no celular antes de aprovar PR              │
└──────────────────────────────────────────────────────┘
```

### 1.2 ETAPA 1: Briefing da Sprint (TODO Interna do Agente)

Antes de começar a codar, o agente cria um arquivo
`docs/sprints/MNN-todo-agente.md` com sua TODO list pessoal:

```markdown
# Sprint M05 — Humor Rápido (Tela 15) — TODO do Agente

Status: planejado | em_progresso | aguardando_humano | concluído

## Objetivo
Bottom sheet de humor rápido, registrar em <30s, gera arquivo
daily/YYYY-MM-DD.md com schema de humor.

## Decisões já tomadas (não mudar)
- Tela 15 do BRIEFING.md
- Schema humor em src/lib/schemas/humor.ts (já existe)
- Avatar pessoa permanece visível no header
- Salva em vault/daily/ ou inbox/mente/humor/ — DECIDIR antes de codar

## TODO técnica
- [ ] Criar rota app/humor-rapido.tsx (modal stack)
- [ ] Componente HumorSheet com 4 sliders + toggle + chips
- [ ] Conectar com store de pessoa ativa
- [ ] Validação zod antes de salvar
- [ ] Integrar haptic light no salvar
- [ ] Toast sucesso "salvo." em verde
- [ ] Animação spring_default no abrir/fechar
- [ ] Empty state se vier de tela vazia: "primeiro humor de hoje"

## Riscos identificados
- Conflito se ambas as pessoas registrarem mesmo dia: ver A5 em ARMADILHAS
- Bottom sheet height precisa ser 70% — testar em viewport 412x915

## Perguntas para o humano antes de começar
1. Salvar em vault/daily/ ou em vault/inbox/mente/humor/?
   (Recomendação: daily/ unifica humor + entrada do dia. Inbox separa
    se quiser pipeline diferente no desktop.)
2. Na tela 15, o slider "horas de sono" aceita decimal (7.5) ou só
   inteiro (7, 8)?
3. As tags rápidas estão hardcoded ou puxam de algum config?

## Estimativa
3-4 horas de implementação + 30 min de checkpoint visual.
```

**Regra:** o agente NÃO começa a codar até o humano responder essas
perguntas. Isso evita retrabalho e garante alinhamento.

### 1.3 ETAPA 2: Implementação

Agente trabalha riscando os itens da TODO interna conforme conclui:

```markdown
## TODO técnica
- [x] Criar rota app/humor-rapido.tsx (modal stack)
- [x] Componente HumorSheet com 4 sliders + toggle + chips
- [ ] Conectar com store de pessoa ativa  ← em progresso
- [ ] Validação zod antes de salvar
...
```

Atualização do arquivo é commitada junto com o código (`docs:
atualiza todo agente sprint M05`). Isso dá rastreabilidade.

### 1.4 ETAPA 3: Checkpoint Visual no Emulador (OBRIGATÓRIO)

**Antes de pedir review do humano, o agente DEVE:**

1. Rodar `npx expo start` e abrir no emulador Android (`a` no terminal)
2. Capturar screenshot de cada tela tocada na sprint:

```bash
# emulador Android via adb
adb exec-out screencap -p > docs/sprints/MNN-screenshots/01-tela-X.png
```

3. Capturar vídeo de 5-10s mostrando uma interação chave:

```bash
adb shell screenrecord --time-limit 10 /sdcard/sprint-MNN.mp4
adb pull /sdcard/sprint-MNN.mp4 docs/sprints/MNN-screenshots/
```

4. Abrir `Ouroboros 22 telas.html` no Chromium, dar zoom no artboard
   correspondente, capturar screenshot do mockup

5. Criar `docs/sprints/MNN-checkpoint-visual.md`:

```markdown
# Sprint M05 — Checkpoint Visual

## Tela 15 — Humor Rápido

### Implementação atual (emulador)
![implementação](./MNN-screenshots/01-tela-15.png)

### Mockup de referência (HTML standalone)
![mockup](./MNN-screenshots/02-tela-15-mockup.png)

### Diff visual notado

-  Paleta correta (verificado em pixel picker: #bd93f9 confere)
-  Padding lateral 20dp
-  Slider thumb 24dp, físico spring_default
-   Chip "boa_conversa" estourou a linha — precisa wrap
-   Bottom sheet height 70%, mas no emulador veio 60% — investigar

### Vídeo da interação chave
[abrir-fechar-bottom-sheet.mp4](./MNN-screenshots/sprint-MNN.mp4)

### Checklist estético inegociável
- [x] Springs em vez de durations
- [x] Haptic light no botão salvar
- [x] Feedback visual <16ms no press
- [x] Line-height ≥ 1.5
- [x] Sem bordas pesadas

### Pendências antes do PR
1. Corrigir wrap do chip
2. Investigar bottom sheet height
```

**Sem esses arquivos, o PR não passa do checklist.**

### 1.5 ETAPA 4: TODO List Final (Humano)

Após o checkpoint visual estar OK, o agente cria
`docs/sprints/MNN-todo-humano.md`:

```markdown
# Sprint M05 — Validação Humana

Olá! O Sprint M05 está pronto para sua revisão. Por favor confira no
celular real (não só no emulador) seguindo essa lista.

## 1. Setup
- [ ] Pull da branch: `git pull origin feat/M05`
- [ ] Reinstalar deps se necessário: `npm install`
- [ ] Rodar: `npx expo start`
- [ ] Escanear QR no Expo Go do celular

## 2. Fluxo crítico — Registrar Humor em <30s
Tente fazer o fluxo completo cronometrando:

- [ ] Abrir App
- [ ] Tap no FAB (canto inferior direito) — confere haptic light?
- [ ] Tap no botão HUMOR (rosa) — abre bottom sheet?
- [ ] Mover os 4 sliders — sente haptic selection a cada step?
- [ ] Marcar 2-3 chips de tags
- [ ] Tap em salvar — confere haptic light + toast verde "salvo."?
- [ ] Bottom sheet fecha sozinho?
- [ ] Tempo total: ___ segundos (alvo: <30s)

## 3. Validação visual
Compare com o mockup HTML:

- [ ] Cores batem (purple no botão salvar, cyan nos valores)
- [ ] Padding lateral generoso (~20dp)
- [ ] Texto em mono lowercase
- [ ] Sem caps lock em lugar nenhum
- [ ] Sem emoji em lugar nenhum

## 4. Casos especiais

- [ ] Tente fechar arrastando o bottom sheet pra baixo — funciona?
- [ ] Tente tocar fora do sheet — fecha?
- [ ] Sem internet, ainda salva? (deve salvar — App é offline-first)

## 5. Validação no Vault
Abra o Obsidian no celular e confira:

- [ ] Existe arquivo `vault/daily/2026-04-XX.md`?
- [ ] Frontmatter tem `tipo: humor`, `autor: pessoa_a` (ou `pessoa_b`)?
- [ ] Os valores dos 4 sliders estão lá?
- [ ] Tags estão lá como lista YAML?

## 6. Aprovação

- [ ] Tudo acima passou → comentar no PR: "Aprovado, pode merge"
- [ ] Algo falhou → descrever no PR e o agente corrige

Sem pressa. Se algo parecer estranho mesmo que não esteja na lista,
fale.
```

**O humano abre o PR no GitHub, vê esses três arquivos
(`MNN-todo-agente.md`, `MNN-checkpoint-visual.md`,
`MNN-todo-humano.md`), e tem clareza completa do estado da sprint.**

### 1.6 Estrutura de Pastas das Sprints

```
docs/
└─ sprints/
   ├─ M01-todo-agente.md
   ├─ M01-checkpoint-visual.md
   ├─ M01-todo-humano.md
   ├─ M01-screenshots/
   │  ├─ 01-screen-buttons.png
   │  ├─ 02-screen-inputs.png
   │  └─ sprint-M01.mp4
   ├─ M02-todo-agente.md
   ├─ M02-checkpoint-visual.md
   ├─ M02-todo-humano.md
   ├─ M02-screenshots/
   └─ ...
```

Todas as sprints versionadas. Histórico completo. Auditável.

---

## 2. Setup Inicial — Sprint M01 (Fundação Estética)

A primeira sprint é a mais importante esteticamente. Não é "hello world".
É **estabelecer os 14 componentes base premium** para que toda tela
seguinte herde estética de graça.

### 2.1 Pré-requisitos no Pop!_OS

```bash
# Node 20+ via nvm (se não tiver)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

# Expo CLI global
npm install -g expo eas-cli

# Instalar App Expo Go no celular via Play Store
# Nome: "Expo Go" — esse é o App que vai rodar nosso projeto sem build
```

### 2.2 Criar o Projeto

```bash
cd ~/Desenvolvimento/
npx create-expo-app ouroboros-mobile --template tabs
cd ouroboros-mobile

# Remover scaffolding que não vamos usar
rm -rf app/(tabs)/explore.tsx
```

### 2.3 Dependências Core (Paleta + Animações + Física)

```bash
# Tema e estilo
npx expo install nativewind tailwindcss
npx tailwindcss init

# Animações (essas são as estrelas — não pular)
npx expo install moti react-native-reanimated react-native-gesture-handler

# UI primitives premium
npm install @gluestack-ui/themed @gluestack-style/react
npx expo install @gorhom/bottom-sheet
npx expo install lucide-react-native expo-haptics expo-blur

# Fonts
npx expo install @expo-google-fonts/jetbrains-mono expo-font

# Storage e schemas
npx expo install expo-file-system expo-secure-store
npm install yaml zod

# Estado
npm install zustand
```

### 2.4 Dependências de Captura e Sistema

```bash
# Câmera e OCR
npx expo install expo-camera expo-image-manipulator
npm install @react-native-ml-kit/text-recognition

# Áudio
npx expo install expo-av
npm install @react-native-voice/voice

# Notificações e sistema
npx expo install expo-notifications expo-sharing
npx expo install expo-location expo-local-authentication expo-linking
```

### 2.5 Configurar NativeWind + Tailwind

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,tsx,ts}", "./src/**/*.{js,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        bg: '#282a36',
        'bg-alt': '#1e1f29',
        'bg-elev': '#44475a',
        fg: '#f8f8f2',
        muted: '#c9c9cc',
        'muted-decor': '#6272a4',
        purple: '#bd93f9',
        pink: '#ff79c6',
        cyan: '#8be9fd',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        orange: '#ffb86c',
        red: '#ff5555',
      },
      fontFamily: {
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
```

`babel.config.js` (adicionar plugins):

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],  // tem que ser ÚLTIMO
  };
};
```

### 2.6 Configurar Fonte JetBrains Mono

`app/_layout.tsx`:

```tsx
import { useFonts, JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  if (loaded) SplashScreen.hideAsync();
  if (!loaded) return null;

  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#282a36' },
    }} />
  );
}
```

### 2.7 Tokens, Presets e Config de Pessoas

`src/theme/tokens.ts`:

```ts
export const colors = {
  bg: '#282a36',
  bgAlt: '#1e1f29',
  bgElev: '#44475a',
  fg: '#f8f8f2',
  muted: '#c9c9cc',
  mutedDecor: '#6272a4',
  purple: '#bd93f9',
  pink: '#ff79c6',
  cyan: '#8be9fd',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  orange: '#ffb86c',
  red: '#ff5555',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, huge: 48, mega: 64,
} as const;
```

`src/lib/motion.ts`:

```ts
import type { MotiTransitionProp } from 'moti';

export const springs: Record<string, MotiTransitionProp> = {
  subtle:   { type: 'spring', damping: 22, stiffness: 220 },
  default:  { type: 'spring', damping: 18, stiffness: 200 },
  bouncy:   { type: 'spring', damping: 12, stiffness: 180 },
  snappy:   { type: 'spring', damping: 26, stiffness: 320 },
};

export const timing = {
  fadeOut: { type: 'timing' as const, duration: 180 },
  toastIn: { type: 'spring' as const, damping: 20, stiffness: 250 },
};
```

`src/lib/haptics.ts`:

```ts
import * as Haptics from 'expo-haptics';

export const haptics = {
  // toque em botão normal
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  // concluir treino, salvar item importante
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  // selection em slider, chip toggling
  selection: () => Haptics.selectionAsync(),
  // sucesso de operação (vitória registrada, dossiê gerado)
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  // erro grave
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
```

`src/lib/schemas/pessoa.ts`:

```ts
import { z } from 'zod';

// Identidade genérica de pessoa. Nunca usar nomes reais.
export const PessoaIdSchema = z.enum(['pessoa_a', 'pessoa_b', 'ambos']);
export type PessoaId = z.infer<typeof PessoaIdSchema>;

export const PessoaAutorSchema = z.enum(['pessoa_a', 'pessoa_b']);
export type PessoaAutor = z.infer<typeof PessoaAutorSchema>;
```

`src/config/pessoas.config.ts`:

```ts
import type { PessoaId } from '@/lib/schemas/pessoa';

// ÚNICO arquivo onde nomes reais aparecem.
// Editar aqui se trocar de usuário ou adaptar o app para outras pessoas.
// Pode ser gitignored se preferir; um pessoas.config.example.ts fica versionado.

export const PESSOAS_CONFIG: Record<PessoaId, { nome: string; inicial: string }> = {
  pessoa_a: { nome: 'Nome_A', inicial: 'A' },
  pessoa_b: { nome: 'Nome_B', inicial: 'B' },
  ambos:    { nome: 'Ambos', inicial: 'AB' },
};

// Helper para formatar exibição
export function nomeDe(pessoa: PessoaId): string {
  return PESSOAS_CONFIG[pessoa].nome;
}

export function inicialDe(pessoa: PessoaId): string {
  return PESSOAS_CONFIG[pessoa].inicial;
}
```

`src/lib/stores/pessoa.ts`:

```ts
import { create } from 'zustand';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';

interface PessoaStore {
  pessoaAtiva: PessoaAutor;          // pessoa_a ou pessoa_b
  filtroPessoa: PessoaId;            // pessoa_a, pessoa_b ou ambos
  setPessoaAtiva: (p: PessoaAutor) => void;
  setFiltroPessoa: (p: PessoaId) => void;
}

export const usePessoa = create<PessoaStore>((set) => ({
  pessoaAtiva: 'pessoa_a',
  filtroPessoa: 'pessoa_a',
  setPessoaAtiva: (p) => set({ pessoaAtiva: p }),
  setFiltroPessoa: (p) => set({ filtroPessoa: p }),
}));
```

### 2.8 14 Componentes Base (Essa É a Parte Importante)

Cada componente em `src/components/ui/`. Nascem premium. Exemplo do mais
crítico:

`src/components/ui/Button.tsx`:

```tsx
import { Pressable, Text } from 'react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

type Variant = 'primary' | 'success' | 'ghost' | 'destructive';

const styles: Record<Variant, { bg: string; text: string }> = {
  primary:     { bg: 'bg-purple', text: 'text-bg' },
  success:     { bg: 'bg-green', text: 'text-bg' },
  ghost:       { bg: 'bg-transparent border border-bg-elev', text: 'text-fg' },
  destructive: { bg: 'bg-red', text: 'text-fg' },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const v = styles[variant];

  return (
    <Pressable
      onPressIn={() => { setPressed(true); haptics.light(); }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      disabled={disabled}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={springs.snappy}
        className={`${v.bg} rounded-xl py-4 items-center`}
        style={{ minHeight: 56, opacity: disabled ? 0.4 : 1 }}
      >
        <Text className={`${v.text} font-mono-medium text-base`}>
          {label}
        </Text>
      </MotiView>
    </Pressable>
  );
}
```

Note: scale com spring físico, haptic light no press in, padding generoso,
mono font, cor como semântica, label em lowercase intencional (a UI é
lowercase, não os types/variants do código).

`src/components/ui/PersonAvatar.tsx`:

```tsx
import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import type { PessoaId } from '@/lib/schemas/pessoa';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';
import { springs } from '@/lib/motion';

interface Props {
  pessoa: PessoaId;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const corPorPessoa: Record<PessoaId, string> = {
  pessoa_a: 'bg-purple',
  pessoa_b: 'bg-pink',
  ambos: 'bg-purple',  // gradient feito via overlay
};

const sizeClasses = {
  sm: { wrapper: 'w-7 h-7', text: 'text-xs' },
  md: { wrapper: 'w-8 h-8', text: 'text-sm' },
  lg: { wrapper: 'w-14 h-14', text: 'text-xl' },
};

export function PersonAvatar({ pessoa, onPress, size = 'md' }: Props) {
  const [pressed, setPressed] = useState(false);
  const inicial = PESSOAS_CONFIG[pessoa].inicial;
  const cor = corPorPessoa[pessoa];
  const s = sizeClasses[size];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <MotiView
        animate={{ scale: pressed ? 0.96 : 1 }}
        transition={springs.snappy}
        className={`${cor} ${s.wrapper} rounded-full items-center justify-center`}
      >
        <Text className={`${s.text} font-mono-medium text-bg`}>
          {inicial}
        </Text>
      </MotiView>
    </Pressable>
  );
}
```

### 2.9 Sample Screen (Storybook Caseiro)

`app/_components.tsx` — tela acessível via deep link `exp://...?screen=_components`
que mostra todos os 14 componentes em isolamento. Crítico para validar
estética antes de codar telas reais.

```tsx
import { ScrollView, View, Text } from 'react-native';
import { Button, Input, Slider, Chip, Toggle, Card, PersonAvatar } from '@/components/ui';

export default function Components() {
  return (
    <ScrollView className="flex-1 bg-bg p-5">
      <Text className="text-orange font-mono-medium text-xl mb-4">botoes</Text>
      <Button label="primary action" onPress={() => {}} />
      <View className="h-3" />
      <Button label="success" onPress={() => {}} variant="success" />
      <View className="h-3" />
      <Button label="ghost" onPress={() => {}} variant="ghost" />
      <View className="h-3" />
      <Button label="destructive" onPress={() => {}} variant="destructive" />
      <View className="h-3" />
      <Button label="disabled" onPress={() => {}} disabled />

      <Text className="text-orange font-mono-medium text-xl mt-8 mb-4">avatares</Text>
      <View className="flex-row gap-3">
        <PersonAvatar pessoa="pessoa_a" />
        <PersonAvatar pessoa="pessoa_b" />
        <PersonAvatar pessoa="ambos" />
      </View>

      {/* Todos os outros componentes em sequência */}
    </ScrollView>
  );
}
```

### 2.10 Primeiro Teste no Celular

```bash
# No terminal do Pop!_OS
npx expo start

# Vai abrir QR code no terminal.
# Pegar celular, abrir Expo Go, escanear QR.
# App aparece rodando no celular em <30s.

# Para atualizar: salvar arquivo, espera <1s, App reload automático.
```

**Isso é mágica.** Sem build, sem APK, sem Android Studio. O código
TypeScript empacotado pelo Metro bundler chega ao celular via wifi.

### 2.11 Primeiro Commit

```bash
git init
git add .
git commit -m "feat: M01 fundacao estetica com 14 componentes base"
gh repo create ouroboros-mobile --private --license=GPL-3.0 --source=. --remote=origin --push
```

### 2.12 Definição de Pronto do M01

- [ ] Expo Go rodando o projeto no celular real
- [ ] Todos os 14 componentes base implementados em `src/components/ui/`
- [ ] Sample screen `_components.tsx` mostrando cada um
- [ ] Paleta Dracula correta (verificada com pixel picker no celular)
- [ ] JetBrains Mono carregada
- [ ] Springs configurados em `lib/motion.ts`
- [ ] Haptics configurados em `lib/haptics.ts`
- [ ] `pessoas.config.ts` criado e usado por `<PersonAvatar />`
- [ ] Toque em qualquer botão tem feedback visual <16ms + haptic light
- [ ] Toque em FAB tem haptic light + scale 0.97 com spring de volta
- [ ] Pelo menos 1 transição entre telas funcionando (hoje vazia → settings vazia, com slide horizontal)
- [ ] Checkpoint visual completo (ETAPA 3 do protocolo)
- [ ] TODO list final do humano gerada (ETAPA 4)
- [ ] PR aprovado e mergeado

Só depois desses checks, abrir issue do M02.

---

## 3. Fluxo de Validação ao Vivo

### 3.0 Protocolo canônico de teste no device (decisão durável 2026-05-25)

**Método padrão e SEMPRE preferido para validar no celular: dev-client +
Metro via USB.** O APK release do git NÃO é ferramenta de iteração — é só
distribuição, gerado no FINAL, depois de concluir todo o trabalho em aberto.

Regra de ouro:

- **Feature só de JS** (telas, stores, hooks, puxadores, lógica): o Metro
  entrega o código novo ao vivo no dev-client. **Sem build.**
- **Feature com código nativo NOVO** (ex: bridge `modules/health-connect/`,
  `modules/widget-homescreen/`): **rebuildar o dev-client primeiro** — um
  dev-client antigo não tem o módulo nativo novo, então a feature nativa
  no-opa ou falha. Dev-clients em `builds/dev-client-*.apk` anteriores à
  bridge HC (28aac2b, ~2026-05-22) NÃO testam o autopull HC.

Fluxo (helpers: `scripts/adb-install-bypass.sh`, `scripts/adb-vault-pull.sh`):

```bash
./scripts/adb-vault-pull.sh                          # BACKUP do Vault do device ANTES de trocar app
adb push builds/dev-client-<hash>.apk /data/local/tmp/app.apk
adb shell pm install -r -t /data/local/tmp/app.apk   # bypass HyperOS (A32)
adb reverse tcp:8081 tcp:8081
nohup npx expo start --dev-client > /tmp/metro.log 2>&1 &
# abrir app; navegação cega via `adb shell uiautomator dump`; `adb exec-out screencap`
```

**Cuidado com assinatura (wipe de dados):** instalar um dev-client (debug
keystore) por cima de um APK release (alpha-XX, EAS keystore) exige
**desinstalar** primeiro → **apaga dados do app no device** (SecureStore +
Vault interno se estiver em `documentDirectory`, A31). Por isso o
`adb-vault-pull.sh` ANTES é obrigatório. Idealmente dev-client e release
compartilham a mesma keystore (Q17.e) para permitir update in-place sem wipe.

**APK do git (release/preview) — SÓ no final.** Via
`.github/workflows/build-android-apk.yml` (push tag `v*-alpha-*`); EAS Free
Tier esgota cota mensal, por isso GitHub Actions. Nunca queimar build do git
para testar trabalho ainda em aberto.

### 3.1 Fast Refresh via Expo Go

```bash
npx expo start
# Escanear QR no Expo Go uma vez
# Salvar qualquer arquivo .tsx
# App no celular reload em <1s automaticamente
```

Simples assim.

### 3.2 Quando Precisar de Plugin Nativo (Build Customizado)

Algumas dependências (ML Kit OCR, voice recognition) não funcionam em
Expo Go puro. Precisam build customizado:

```bash
# Uma vez por projeto:
npx expo install expo-dev-client
npx eas build --profile development --platform android

# Instala um APK custom no celular (uma vez)
# Depois disso, expo start --dev-client funciona com fast refresh
# e tem acesso aos plugins nativos.
```

Isso é necessário a partir do M09 (scanner OCR). Antes disso, Expo Go
puro resolve.

### 3.3 Teste em Ambos os Celulares Simultaneamente

Vault compartilhado precisa ser testado **com 2 celulares em paralelo**
desde cedo, senão bug de sync sai caro depois.

Ambos celulares com Expo Go aberto, ambos escaneando o mesmo QR. Dois
celulares carregam o mesmo App conectado ao mesmo Metro bundler. Salvar
arquivo: ambos atualizam.

### 3.4 Inspeção via React DevTools

```bash
npx expo start
# Pressiona "j" no terminal para abrir DevTools no Chrome
```

Inspeciona componentes, props, estado, performance.

### 3.5 Validação Visual Lado-a-Lado

```bash
# Terminal 1: expo
npx expo start

# Terminal 2: abrir HTML standalone no Chromium
xdg-open ~/Desenvolvimento/ouroboros-mobile/docs/Ouroboros\ 22\ telas.html
```

Regra: cada tela só é considerada "pronta" depois de comparar lado-a-lado
e ter aprovação visual. **Screenshot do celular real** anexada no PR.

```bash
# Tirar screenshot do celular conectado via USB:
adb exec-out screencap -p > screenshots/MNN-tela.png
```

---

## 4. ADRs — Architecture Decision Records

> **AVISO — Os ADRs canônicos vivem agora em `docs/ADRs/`** como
> arquivos individuais formalizados durante a Sprint M00.docs em
> 2026-04-29 (commits `83c27f5`, `4951f6f`). 15 ADRs no total
> (0001-0011 originais + 0012-0015 novos). Esta seção mantém o
> resumo em prosa apenas para referência histórica. Sempre consulte
> os arquivos em `docs/ADRs/` (índice rápido em
> `docs/ADRs/INDEX.md`) para a versão atual.

Cada ADR vai em `docs/ADRs/NNNN-titulo-curto.md` e é imutável após
merged. Mudanças viram ADR nova com referência "supersedes ADR-NNNN".

### ADR-001: Vault em Markdown Puro

**Status:** Aceito

**Contexto:** precisamos de storage que sobreviva ao App sumir. SQLite
seria mais rápido, mas opaco — se o App for desinstalado, dado vai junto.

**Decisão:** arquivos `.md` com YAML frontmatter, um por registro,
organizados em pastas por tipo. SQLite usado só como índice volátil
(via op-sqlite), regenerável a partir do filesystem.

**Consequências:**
- Migração trivial para qualquer App de notas
- Backup = copiar pasta
- Usuário pode editar manualmente no Obsidian se quiser
- Backend desktop já lê esse formato
- I/O mais lento que SQLite — mitigado com cache em memória
- Frontmatter precisa ser validado em runtime (zod)

### ADR-002: Sync Delegado ao Syncthing/Obsidian Sync

**Status:** Aceito

**Contexto:** dois usuários, dois aparelhos + 1 desktop. Sync próprio
exigiria backend, auth e resolução de conflitos.

**Decisão:** sync roda fora do App. Ouroboros-mobile só observa status
e mostra na UI. Conflitos resolvidos no desktop via merge manual.

**Consequências:**
- Zero infra própria
- Usuários já têm Syncthing rodando
- Privacidade absoluta (p2p, sem nuvem terceira)
- Usuário precisa configurar sync uma vez — onboarding tela 24 frame 3 cobre
- Conflito de nome de arquivo possível — schemas mitigam com timestamp HHmmss

### ADR-003: ML Kit On-device, Sem Rede

**Status:** Aceito

**Contexto:** OCR e document scanner via API cloud seriam mais precisos.

**Decisão:** ML Kit local via @react-native-ml-kit, fallback Tesseract.js
se falhar. Zero tráfego de saída.

**Consequências:**
- Privacidade absoluta
- Funciona offline
- Grátis, sem rate limit
- Qualidade ~90% do cloud — fallback é form manual editável
- Modelo embarcado aumenta tamanho do APK em ~15MB

### ADR-004: Mobile Só Captura, Desktop Processa

**Status:** Aceito

**Contexto:** tentação de espelhar tudo do desktop no Mobile. Resultado
típico: dois Apps medianos.

**Decisão:** Mobile = entrada de dados. Edição em massa, relatórios,
pipelines de finanças = desktop. Mobile lê
`vault/.ouroboros/cache/*.json` gerado pelo desktop.

**Consequências:**
- Escopo Mobile drasticamente menor → qualidade maior
- Backend permanece source of truth
- Sem duplicação de lógica
- Mobile sem dados se desktop nunca rodou — empty state explica

### ADR-005: Sem Gamificação, Intencional

**Status:** Aceito

**Contexto:** diário de humor + finanças + eventos é tipicamente
gamificado (streaks, badges, push motivacional). Estudos mostram que
isso prejudica usuários com depressão e ansiedade — culpa por hiato vira
gatilho.

**Decisão:** zero gamificação. Sem fogo de streak, sem celebração de
milestone, sem ranking entre as 2 pessoas. Cores neutras para dados
financeiros.

**Consequências:**
- Ferramenta de auto-conhecimento, não dopamina-trap
- Usuário não sente vergonha de pular um dia

### ADR-006: Expo + React Native + NativeWind + Moti + Reanimated + gluestack-ui

**Status:** Aceito

**Contexto:** precisamos escolher entre 3 caminhos:
1. Kotlin/Compose nativo
2. Capacitor + Svelte (web em webview)
3. React Native + Expo (nativo via JS bridge)

Dev é cientista de dados, vem de Python. Não é dev mobile e não vai
manter código nativo. Estética é prioridade alta. Ecossistema com muito
material de treino para LLMs ajudarem futuramente é crítico.

**Decisão:** **Expo + React Native** com:
- nativewind 4 (Tailwind classes)
- moti (animações declarativas com spring)
- react-native-reanimated 3 (motor de animação 60fps na UI thread)
- gluestack-ui (primitivos com física nativa pré-configurada)
- @gorhom/bottom-sheet (sheets premium com gestos)
- expo-haptics (vibração sutil)

**Rationale:**

| Critério | Expo + RN | Capacitor + Svelte | Kotlin Compose |
|----------|-----------|---------------------|------------------|
| Build no terminal | sim, expo go zero-build | sim | precisa AS |
| Hot reload | <1s | <2s | recompile completo |
| Performance | nativa real, 60fps | webview, ok | melhor |
| Animações premium | reanimated nativa | CSS transitions | compose animation |
| Gestos fluidos | nativos | emulados | nativos |
| Haptics nativos | sim | limitado | sim |
| Ecossistema LLM ajuda | excelente | bom | médio |
| Curva para dev web | baixa | mínima | alta |
| Codebase reutilizável | RN web ou expo web | sim, PWA direto | não |

**Consequências positivas:**
- Dev cientista de dados consegue pedir ajuda de qualquer LLM com alta taxa de acerto
- Expo Go elimina fricção de build no Pop!_OS
- Componentes premium (gluestack, gorhom, moti) entregam visual nativo de qualidade
- Migração futura para nativo possível mantendo schemas como contrato

**Consequências negativas:**
- Bundle 4-6MB maior que nativo — irrelevante em 2026
- Algumas features (ML Kit, voice) exigem dev-client em vez de Expo Go puro — solucionável com `expo-dev-client`

### ADR-007: Zero Telemetria, Zero Analytics, Zero Crash Reporting Remoto

**Status:** Aceito

**Contexto:** prática padrão em Apps modernos é instrumentar com Firebase
Analytics, Sentry, Crashlytics. Todos exigem call de rede + envio de
dado.

**Decisão:** zero. Não instalamos analytics, não instalamos crash
reporter remoto. Crashes são logados localmente em
`vault/.ouroboros/cache/crashlog/YYYY-MM-DD.log`.

**Consequências:**
- Privacidade absoluta
- Compliance trivial (não há dado para LGPD reclamar)
- Usuário sabe que nada sai do device
- Debug remoto é mais difícil — mas o dev é o usuário, então logcat resolve

### ADR-008: Tema Custom em tokens.ts, Não Material 3

**Status:** Aceito

**Contexto:** Material 3 do Android tem dynamic color, theming engine,
componentes opinativos.

**Decisão:** **rejeitar Material 3 inteiro.** Tema Dracula custom em
`tokens.ts` + NativeWind. Gluestack-ui usado só pelos primitivos
(modais, sheets, gestos), com tema sobrescrito.

**Rationale:** identidade visual é parte da experiência. Usuário quer
Dracula, mono font, sobriedade. Material 3 trazendo arredondamentos,
sombras e cores do Android puxariam o App para "outro App generic
android" — exatamente o que queremos evitar.

### ADR-009: Validação por Anotação Runtime (zod)

**Status:** Aceito

**Contexto:** os `.md` no Vault têm frontmatter YAML que pode ser
escrito a mão no desktop ou por outro App. Não dá para confiar no
formato.

**Decisão:** todo schema em `src/lib/schemas/` exporta tipo TS +
validador zod. Leitura do Vault sempre passa por validador. Erro de
validação abre modal "arquivo X tem campo invalido: Y" sem quebrar a UI.

**Consequências:**
- Robustez contra edição manual mal feita
- Mensagens de erro humanas
- Pequeno overhead de runtime — irrelevante em volumes pessoais

### ADR-010: Estética Como Fundação, Não Polimento

**Status:** Aceito

**Contexto:** padrão da indústria é construir funcionalidade primeiro,
"polir" no fim. Resultado típico: nunca chega no polimento.

**Decisão:** **componentes base nascem premium na M01**. Springs no
lugar de durations, haptics integrados, padding generoso, cores
semânticas consistentes. Todas as telas seguintes herdam estética de
graça.

Cinco princípios inegociáveis (BRIEFING.md Seção 2):
1. Física acima de tempo (springs)
2. Silêncio visual e respiração
3. Hierarquia por contraste, não por borda
4. Micro-interações em momentos específicos
5. Transições com física natural

**Consequências positivas:**
- Não existe "sprint de polimento futuro" — desnecessária
- LLMs implementando telas seguintes copiam padrão premium dos componentes base
- Dev não tem que pensar em estética em cada tela — o sistema decide

**Consequências negativas:**
- M01 dura mais (~2x sprint normal) — vale o investimento

### ADR-011: Identidade de Pessoas Genérica (PESSOA_A / PESSOA_B)

**Status:** Aceito

**Contexto:** versões anteriores deste planejamento misturavam nomes
reais (`andre`, `vitoria`) hardcoded no código, schemas, exemplos. Find-
and-replace no futuro seria horrível, e quebrava o princípio de
anonimato (regra -1 em CONTEXTO.md).

**Decisão:** identidades genéricas `pessoa_a` e `pessoa_b` em todo o
código. Único arquivo com nomes reais é
`src/config/pessoas.config.ts`. Lookup via helpers `nomeDe()` e
`inicialDe()`. Frontmatter dos `.md` no Vault usa
`autor: pessoa_a` ou `autor: pessoa_b`. Backend desktop espelha o mesmo
config.

**Consequências:**
- Adaptar o App para outras pessoas é trocar 1 arquivo
- Find-and-replace nunca mais
- Aliasamento controlado — testes usam `pessoa_a` direto, sem nomes
- Demanda config compatível no protocolo-ouroboros — ADR equivalente
  no backend

---

## 5. Estrutura de Pastas Detalhada

```
ouroboros-mobile/
├─ android/                      # gerado por Capacitor; NÃO existe se Expo
├─ app/                          # Expo Router (file-based routing)
│  ├─ _layout.tsx                # root: providers, fonts, stack config
│  ├─ _components.tsx            # storybook caseiro (oculto)
│  ├─ (tabs)/                    # bottom tab navigator
│  │  ├─ _layout.tsx             # tab config
│  │  ├─ index.tsx               # tela 01 - hoje
│  │  ├─ rotinas.tsx             # tela 02/03
│  │  ├─ diario.tsx              # tela 04/19
│  │  └─ memoria.tsx             # tela 05/09
│  ├─ scanner.tsx                # tela 16 (modal full-screen)
│  ├─ receber.tsx                # tela 17 (share intent activity)
│  ├─ humor-rapido.tsx           # tela 15 (bottom sheet)
│  ├─ diario-emocional.tsx       # tela 18 (bottom sheet)
│  ├─ evento.tsx                 # tela 20 (bottom sheet)
│  ├─ exercicio/
│  │  ├─ novo.tsx                # tela 02
│  │  ├─ [id].tsx                # tela 08
│  │  └─ galeria.tsx             # tela 07
│  ├─ medidas/
│  │  ├─ index.tsx               # tela 13
│  │  └─ nova.tsx                # tela 12
│  ├─ humor.tsx                  # tela 21
│  ├─ financas.tsx               # tela 22
│  ├─ marcos.tsx                 # tela 11
│  ├─ dossie.tsx                 # tela 06
│  ├─ settings.tsx               # tela 23
│  └─ onboarding.tsx             # tela 24 (3 frames)
├─ src/
│  ├─ components/
│  │  ├─ ui/                     # 14 componentes base (M01)
│  │  ├─ chrome/
│  │  │  ├─ BottomTabs.tsx
│  │  │  ├─ FAB.tsx
│  │  │  ├─ FABRadial.tsx
│  │  │  └─ PersonFilter.tsx
│  │  └─ data/
│  │     ├─ Heatmap.tsx
│  │     ├─ Sparkline.tsx
│  │     └─ GifPlayer.tsx
│  ├─ lib/
│  │  ├─ vault/                  # API de leitura/escrita
│  │  │  ├─ reader.ts
│  │  │  ├─ writer.ts
│  │  │  ├─ frontmatter.ts
│  │  │  ├─ paths.ts
│  │  │  └─ index.ts
│  │  ├─ schemas/                # zod + types
│  │  │  ├─ pessoa.ts            # PESSOA_A / PESSOA_B
│  │  │  ├─ humor.ts
│  │  │  ├─ evento.ts
│  │  │  ├─ diario_emocional.ts
│  │  │  ├─ treino_sessao.ts
│  │  │  └─ index.ts
│  │  ├─ stores/                 # zustand stores
│  │  │  ├─ pessoa.ts
│  │  │  ├─ vault.ts
│  │  │  └─ ui.ts
│  │  ├─ ocr/
│  │  ├─ audio/
│  │  ├─ haptics.ts              # presets
│  │  ├─ motion.ts               # spring presets
│  │  └─ utils/
│  ├─ config/
│  │  └─ pessoas.config.ts       # ÚNICO arquivo com nomes reais
│  └─ theme/
│     └─ tokens.ts               # cores e spacing
├─ assets/
│  ├─ fonts/
│  └─ icons/
├─ scripts/
│  ├─ check_anonimato.sh
│  ├─ check_test_data.sh
│  ├─ smoke.sh
│  └─ build_apk.sh
├─ docs/
│  ├─ ADRs/                      # 1 arquivo por ADR
│  ├─ sprints/                   # TODO lists de cada sprint
│  │  ├─ M01-todo-agente.md
│  │  ├─ M01-checkpoint-visual.md
│  │  ├─ M01-todo-humano.md
│  │  ├─ M01-screenshots/
│  │  └─ ...
│  ├─ ARCHITECTURE.md
│  ├─ ARMADILHAS.md
│  ├─ Ouroboros 22 telas.html    # mockup canônico
│  ├─ BRIEFING.md
│  ├─ CONTEXTO.md
│  └─ PLANO_TECNICO_APK.md
├─ hooks/
│  ├─ pre-commit
│  └─ pre-push
├─ tests/
│  ├─ components/
│  ├─ schemas/
│  └─ vault/
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ app.json                      # Expo config
├─ babel.config.js
├─ metro.config.js
├─ tailwind.config.js
├─ tsconfig.json
├─ package.json
├─ CLAUDE.md
├─ CHANGELOG.md
├─ README.md
└─ LICENSE                       # GPL-3.0
```

---

## 6. Scripts Essenciais

### 6.1 scripts/check_anonimato.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Valida regra -1: zero referência a IA ou pessoas em código
# Exclui pessoas.config.ts, que é a exceção legítima
PROIBIDO_IA='claude|anthropic|openai|gpt-[0-9]|chatgpt|gemini|by ai|ai-generated|feito por|criado por|written by|made by'
NOMES_REAIS='Andr[eé]|Vit[oó]ria|Maria|Jo[aã]o'

# Anonimato IA
VIOLACOES_IA=$(grep -rniE "$PROIBIDO_IA" src/ app/ \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  | grep -viE "api_key|provider|model|config|client|engine" || true)

if [[ -n "$VIOLACOES_IA" ]]; then
  echo "ERRO: anonimato IA violado:"
  echo "$VIOLACOES_IA"
  exit 1
fi

# Nomes reais (ignora pessoas.config.ts)
VIOLACOES_NOMES=$(grep -rE "$NOMES_REAIS" src/ app/ tests/ \
  --include="*.ts" --include="*.tsx" --include="*.md" \
  | grep -v "pessoas.config" || true)

if [[ -n "$VIOLACOES_NOMES" ]]; then
  echo "ERRO: nome real hardcoded fora de pessoas.config.ts:"
  echo "$VIOLACOES_NOMES"
  exit 1
fi

echo "OK: anonimato preservado"
```

### 6.2 scripts/check_test_data.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Testes não podem ter nomes reais nem paths pessoais
NOMES='Andr[eé]|Vit[oó]ria|Maria|Jo[aã]o'
PATHS='/home/[a-z]+/'

VIOLACOES=$(grep -rE "$NOMES|$PATHS" tests/ || true)

if [[ -n "$VIOLACOES" ]]; then
  echo "ERRO: testes com dados pessoais:"
  echo "$VIOLACOES"
  exit 1
fi

echo "OK: testes com dados sintéticos"
```

### 6.3 scripts/smoke.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

echo ">> anonimato"
./scripts/check_anonimato.sh

echo ">> test data"
./scripts/check_test_data.sh

echo ">> typecheck"
npx tsc --noEmit

echo ">> lint"
npx eslint app/ src/

echo ">> tests"
npm test

echo "OK: smoke test passou"
```

### 6.4 scripts/build_apk.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

PROFILE=${1:-development}

if [[ "$PROFILE" != "development" && "$PROFILE" != "preview" && "$PROFILE" != "production" ]]; then
  echo "uso: ./scripts/build_apk.sh [development|preview|production]"
  exit 1
fi

./scripts/smoke.sh
npx eas build --profile "$PROFILE" --platform android --local
```

### 6.5 scripts/sprint_iniciar.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Cria estrutura inicial de uma sprint
SPRINT_ID=${1:-}
SPRINT_TITULO=${2:-}

if [[ -z "$SPRINT_ID" || -z "$SPRINT_TITULO" ]]; then
  echo "uso: ./scripts/sprint_iniciar.sh M05 'humor rapido'"
  exit 1
fi

DIR="docs/sprints/${SPRINT_ID}-screenshots"
mkdir -p "$DIR"

cat > "docs/sprints/${SPRINT_ID}-todo-agente.md" <<EOF
# Sprint ${SPRINT_ID} — ${SPRINT_TITULO} — TODO do Agente

Status: planejado

## Objetivo
[preencher]

## Decisões já tomadas (não mudar)
- [preencher]

## TODO técnica
- [ ] [item 1]

## Riscos identificados
- [preencher]

## Perguntas para o humano antes de começar
1. [pergunta 1]

## Estimativa
[Xh] de implementação + 30 min de checkpoint visual.
EOF

echo "OK: estrutura da sprint $SPRINT_ID criada em docs/sprints/"
echo "Próximo passo: preencher $DIR/../${SPRINT_ID}-todo-agente.md"
```

---

## 7. Hooks de Git

### hooks/pre-commit

```bash
#!/usr/bin/env bash
set -euo pipefail

./scripts/check_anonimato.sh
./scripts/check_test_data.sh

STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js)$' || true)
if [[ -n "$STAGED" ]]; then
  npx eslint $STAGED
fi
```

### hooks/pre-push

```bash
#!/usr/bin/env bash
set -euo pipefail

./scripts/smoke.sh
```

### Setup dos Hooks (M01)

```bash
git config core.hooksPath hooks
chmod +x hooks/pre-commit hooks/pre-push
chmod +x scripts/*.sh
```

---

## 8. Testes

### 8.1 Unit Tests (Jest + Testing Library)

Prioridade: schemas, vault reader/writer, utils.

```bash
npm test
npm test -- --watch
```

Cobertura mínima esperada por módulo:

| Módulo | Cobertura |
|--------|-----------|
| `lib/schemas/` | 100% (validação crítica) |
| `lib/vault/` | 90%+ |
| `lib/utils/` | 80%+ |
| `lib/stores/` | 60%+ |
| `components/` | só smoke (renderiza sem erro) |

Exemplo:

```ts
// tests/schemas/humor.test.ts
import { describe, it, expect } from '@jest/globals';
import { humorSchema } from '@/lib/schemas/humor';

describe('humorSchema', () => {
  it('valida humor diario completo com pessoa_a', () => {
    const valido = {
      tipo: 'humor',
      data: '2026-04-28',
      autor: 'pessoa_a',     // nunca nome real, sempre genérico
      humor: 4,
      energia: 3,
      ansiedade: 2,
      foco: 4,
      medicacao: true,
      horas_sono: 7,
      tags: ['trabalho_pesado'],
      frase: 'dia denso.',
    };
    expect(() => humorSchema.parse(valido)).not.toThrow();
  });

  it('rejeita humor fora de 1-5', () => {
    const invalido = { tipo: 'humor', humor: 9, autor: 'pessoa_a' };
    expect(() => humorSchema.parse(invalido)).toThrow();
  });

  it('rejeita autor com nome real', () => {
    const invalido = { tipo: 'humor', autor: 'andre', humor: 4 };
    expect(() => humorSchema.parse(invalido)).toThrow();
  });
});
```

### 8.2 E2E Tests (Maestro)

Mais simples que Detox. Arquivos YAML.

```yaml
# tests/e2e/flow1-pix.yaml
appId: com.ouroboros.mobile
---
- launchApp
- assertVisible: "hoje"
- tapOn: "+"
- tapOn: "camera"
- assertVisible: "documento detectado"
```

Rodar:

```bash
maestro test tests/e2e/flow1-pix.yaml
```

### 8.3 Teste Manual Obrigatório Antes de PR

Cada PR fechando uma tela inclui:

- Screenshot da tela no celular real (`adb exec-out screencap -p > screenshots/MNN-tela.png`)
- Screenshot do artboard correspondente no HTML standalone
- Vídeo de 5-10s mostrando uma interação (transição, animação, haptic)

```bash
# Captura vídeo de 5-10s
adb shell screenrecord --time-limit 10 /sdcard/demo.mp4
adb pull /sdcard/demo.mp4 ./docs/sprints/MNN-screenshots/MNN-demo.mp4
```

---

## 9. CI (GitHub Actions)

### .github/workflows/ci.yml

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: ./scripts/check_anonimato.sh
      - run: ./scripts/check_test_data.sh
      - run: npx tsc --noEmit
      - run: npx eslint app/ src/
      - run: npm test
```

Build de APK release fica fora do CI no início. Quando estabilizar,
adicionar workflow `release.yml` triggered por tag `v*`.

---

## 10. Como Crescer Sem Quebrar

### 10.1 Ordem de Implementação

Já documentada em `BRIEFING.md` Seção 11 e em `ROADMAP_MOBILE.md`.

Cada wave é PR fechado, com smoke test passando, antes de começar a
próxima.

### 10.2 Regra de Feature Flag para Capturas em Construção

Quando uma sprint adicionar tela nova com entrada em outra tela (FAB ou
botão), a entrada **não aparece** até sprint completa. Controle em
`src/lib/stores/features.ts`:

```ts
import { create } from 'zustand';

export const useFeatures = create(() => ({
  humor_rapido: true,
  voz: false,        // wave 5
  camera: false,     // wave 5
  scanner: false,    // wave 5
  exercicio: true,
  vitoria: true,
  trigger: true,
}));
```

FAB renderiza só botões com flag `true`. Evita botão quebrado em build
intermediário.

### 10.3 Regra de Evolução de Schema

Quando schema mudar:

1. Criar ADR descrevendo mudança
2. Adicionar versão no frontmatter (`schema_version: 2`)
3. Validador zod aceita ambas as versões até próxima major
4. Backend desktop atualizado em paralelo (PR no protocolo-ouroboros)

**Nunca** quebrar leitura de `.md` antigo.

### 10.4 Regra de Migração do Vault

Se estrutura de pastas mudar:

1. ADR nova
2. Script de migração no desktop
3. Mobile detecta versão em `vault/.ouroboros/version`
4. Modal pedindo para rodar migração no desktop antes de continuar

### 10.5 Quando Atualizar Expo SDK Major

Trauma garantido. Fazer em sprint isolada com checklist:

- [ ] Rodar smoke completo antes
- [ ] Ler changelog do SDK novo (breaking changes)
- [ ] Atualizar via `npx expo install --fix`
- [ ] Testar manualmente os 4 flows críticos
- [ ] Testar em ambos os celulares
- [ ] Só então mergear

---

## 11. Checklist de PR

### Checklist Obrigatório em PR de Sprint

```markdown
## Sprint M__ — [título]

### Implementação
- [ ] Closes #__
- [ ] Telas implementadas: [lista]
- [ ] Schemas usados: [lista]
- [ ] Stores adicionados: [lista]

### Documentos da sprint (obrigatórios)
- [ ] `docs/sprints/MNN-todo-agente.md` (TODO interna do agente)
- [ ] `docs/sprints/MNN-checkpoint-visual.md` (screenshots + diff)
- [ ] `docs/sprints/MNN-todo-humano.md` (lista para o humano validar)
- [ ] `docs/sprints/MNN-screenshots/` com pelo menos:
      - 1 screenshot por tela tocada
      - 1 vídeo de 5-10s mostrando interação chave

### Validação técnica
- [ ] `./scripts/smoke.sh` passa
- [ ] Expo Go reload sem erros
- [ ] Hot reload funcionando via wifi
- [ ] Console sem warnings vermelhos

### Validação visual
- [ ] Comparado lado-a-lado com HTML standalone
- [ ] Paleta Dracula respeitada
- [ ] Tipografia mono em tudo
- [ ] Estados vazios implementados

### Validação estética (inegociável — ADR-010)
- [ ] Todas as transições usam spring, não duration linear
- [ ] Botões principais têm haptic light + scale 0.97
- [ ] Toques têm feedback visual <16ms
- [ ] Padding/spacing generoso (20dp lateral)
- [ ] Line-height >= 1.5 em todo texto
- [ ] Sem bordas pesadas — hierarquia por contraste

### Validação de comportamento
- [ ] Filtro pessoa funciona (se aplicável)
- [ ] FAB acessível (se não for tela full screen)
- [ ] Bottom tabs corretos
- [ ] Empty states com microcopy específico
- [ ] Toasts somem em 2.5s e podem ser dismissed por swipe
- [ ] Hit targets mínimos 44dp

### Regras invioláveis
- [ ] Zero emojis no código
- [ ] Zero exclamação em mensagens de feedback
- [ ] Zero referência a IA em src/ ou app/
- [ ] Zero nomes reais hardcoded fora de pessoas.config.ts
- [ ] Zero gamificação agressiva
- [ ] Zero call de rede de saída
- [ ] Commit messages impessoais

### Vault
- [ ] Schemas validados com zod
- [ ] Path destino correto (ver `lib/vault/paths.ts`)
- [ ] Frontmatter com `tipo:`, `data:`, `autor: pessoa_a|pessoa_b`
- [ ] Compatível com leitura do desktop
```

---

## 12. Armadilhas Conhecidas (`docs/ARMADILHAS.md`)

Documentar em arquivo dedicado conforme acontecem. Inicializar com:

### A1: Reanimated Babel Plugin Tem Que Ser Último

`react-native-reanimated/plugin` em `babel.config.js` precisa ser o
último da lista. Se não for, springs falham silenciosamente.

### A2: SAF (Storage Access Framework) em Android 13+

`expo-file-system` `documentDirectory` muda de comportamento em Android
13+. Usar `StorageAccessFramework.requestDirectoryPermissionsAsync` no
onboarding para pegar acesso ao Vault uma vez.

### A3: ML Kit Precisa de Dev-client

A partir do M09 (scanner), Expo Go puro não basta. Rodar
`eas build --profile development` uma vez para gerar APK custom com
plugins nativos.

### A4: Share Intent em PDFs com URI content://

Alguns Apps mandam `content://` URI ao invés de `file://`. Resolver com
`expo-file-system` que aceita ambos via intent.

### A5: Timestamp em Sync Conflitos

Dois celulares escrevendo `humor/2026-04-28.md` ao mesmo tempo geram
conflito Syncthing. Mitigação: usar `daily/2026-04-28-pessoa_a.md` e
`daily/2026-04-28-pessoa_b.md` (sufixo de pessoa).

### A6: Hot Reload Não Recarrega Mudanças em metro.config.js

Mudou config do bundler? Matar `expo start` e reabrir.

### A7: NativeWind 4 + Reanimated Tem Conflito de Babel

Certificar versões:
- `nativewind` >= 4.0.36
- `react-native-reanimated` >= 3.10
Ordem em babel.config: `nativewind/babel` antes de `reanimated/plugin`.

---

## 13. Arquivos Auxiliares no Repo

### CLAUDE.md (Regras Invioláveis)

Cabeçalho do projeto. Cópia das regras de `CONTEXTO.md` Seção 5. Checked-in
para ficar visível em qualquer ferramenta que abrir o repo.

### CHANGELOG.md

Formato keep-a-changelog. Atualizado em **toda PR**.

### README.md

Curto. Setup em 5 comandos. Link para docs/.

```markdown
# ouroboros mobile

App Android pessoal de captura, escreve em Vault Obsidian compartilhado.

## Setup

\`\`\`bash
git clone <repo>
cd ouroboros-mobile
npm install

# Editar nomes reais (ÚNICO arquivo com nomes pessoais):
cp src/config/pessoas.config.example.ts src/config/pessoas.config.ts
# editar pessoas.config.ts com os nomes reais

git config core.hooksPath hooks
chmod +x hooks/* scripts/*.sh
\`\`\`

## Desenvolvimento

\`\`\`bash
npx expo start
# escanear QR code com app Expo Go no celular
\`\`\`

## Docs

- [briefing](docs/BRIEFING.md)
- [contexto](docs/CONTEXTO.md)
- [plano técnico](docs/PLANO_TECNICO_APK.md)
- [arquitetura](docs/ARCHITECTURE.md)
- [armadilhas](docs/ARMADILHAS.md)
- [ADRs](docs/ADRs/)
- [sprints](docs/sprints/)

## Licença

GPL-3.0
```

---

## 14. Como o Claude Code do Desktop Deve Operar

Resumo executivo para o agente que vai implementar:

1. Ler `CONTEXTO.md`, `BRIEFING.md` e este arquivo (`PLANO_TECNICO_APK.md`)
   na ordem
2. Abrir `Ouroboros 22 telas.html` no Chromium para verificação visual
3. Abrir o repo `protocolo-ouroboros` só como referência (Vault, schemas
   parecidos), não tocar
4. Para cada sprint:
   - Criar `docs/sprints/MNN-todo-agente.md` (ETAPA 1)
   - **Esperar humano confirmar perguntas pendentes antes de codar**
   - Implementar marcando itens da TODO interna (ETAPA 2)
   - Rodar checkpoint visual com screenshots e vídeo (ETAPA 3)
   - Criar `docs/sprints/MNN-todo-humano.md` (ETAPA 4)
   - Pedir review do humano com link para os 3 arquivos
5. **Não pular para sprint seguinte até a anterior estar mergeada**
6. Cada PR passa pelo checklist da Seção 11
7. Armadilhas novas viram entrada em `docs/ARMADILHAS.md`
8. Decisões que mudam arquitetura viram nova ADR em `docs/ADRs/`
9. Commits sempre impessoais e sem acento (convenção shell/CI)
10. Comentários e textos de UI sempre em PT-BR com acentuação completa

Prompt sugerido para o Claude Code:

```
Leia docs/CONTEXTO.md, depois docs/BRIEFING.md, depois
docs/PLANO_TECNICO_APK.md nessa ordem. Abra docs/Ouroboros\ 22\ telas.html
no Chromium para ter referência visual. Implemente Sprint M01 conforme
seção 2 do PLANO_TECNICO_APK.md, com atenção especial aos 14 componentes
base premium e ao protocolo formal de sprint da seção 1. Antes de codar,
crie docs/sprints/M01-todo-agente.md e me apresente as perguntas
pendentes da seção "Perguntas para o humano". Pare e espere minha
resposta.
```

Sprint a sprint, com TODO list dupla, sem tentar fazer 5 sprints de uma
vez.

---

*"A única coisa pior que código desorganizado é código organizado de
um jeito que ninguém lembra mais por quê."*
