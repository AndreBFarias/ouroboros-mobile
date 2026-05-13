# Q18 — Exercícios com GIF de execução

> **Tamanho:** Médio (6–10h)
> **Bloqueia v1.0.0?** Não. Candidata a v1.0.x (alpha-5/6).
> **Pré-requisitos:** Q11.a+b+c já entregue (rotinas + executor).

## Contexto

Hoje (`HEAD a1dd3c9`), cada Exercício individual no Vault
(`markdown/exercicio-<slug>.md`) tem campos `nome`, `grupo`,
`descricao`, mas **não tem mídia de execução**. Quando o usuário
abre a galeria de exercícios em `/exercicios`, vê só texto e
ícone genérico.

O pedido do dono (sessão 2026-05-12): "Crio cada exercício com cada
GIF de execução." — ou seja, anexar um GIF (ou MP4 curto, ou foto
sequencial) que mostra como fazer o movimento, exibido no detalhe
do exercício e durante a execução do treino (Q11.c).

## Objetivo da sprint

Adicionar campo `midia_execucao?: MidiaAudio | MidiaFoto | MidiaVideo`
ao schema do Exercicio, suportar upload via picker (galeria do
dispositivo) ou share intent, salvar em `m4a/`/`jpg/`/`mp4/`/`gif/`
no Vault, exibir no detalhe do exercicio E durante a execução
do treino (Q11.c) no painel "Exercício atual".

### Formatos aceitos

| Formato | Pasta Vault | Quem salva |
|---------|-------------|------------|
| `.gif`  | `gif/`      | Picker/share |
| `.mp4`  | `mp4/`     | Picker (recorta para ≤ 8s no save) |
| `.jpg`  | `jpg/`      | Picker/foto tirada na hora |

> **Decisão:** **não** suportar áudio (`.m4a`) porque "GIF" implica
> visual. Áudio em exercício faria sentido apenas como instrução
> falada — fica para sprint futura.

## Decisões técnicas firmes

- **Schema:** estender `ExercicioSchema` em
  `src/lib/schemas/exercicio.ts`:
  ```ts
  export const ExercicioSchema = z.object({
    // ... campos existentes
    midia_execucao: MidiaSchema.optional(),  // novo
  });
  ```

- **Limite de duração** para vídeo: 8 segundos (suficiente pra mostrar
  1 rep). Recorte automático no save via `expo-av Video.setPositionAsync`
  + `Audio.RecordingOptionsPresets.HIGH_QUALITY` (ou ffmpeg-kit se
  disponível). Sem ffmpeg disponível: rejeitar com toast "Vídeo > 8s
  — encurte antes de anexar".

- **Tamanho máximo de arquivo:** 5 MB (GIF), 8 MB (MP4), 2 MB (JPG).
  Validação no save, toast PT-BR explicativo.

- **Display:**
  - Tela `/exercicios/<slug>`: card grande no topo, autoplay loop
    (GIF/MP4) ou foto static, accessibilityLabel "media de execucao".
  - Tela executor `app/treinos/executar/<slug>`: card pequeno (96×96px)
    ao lado do nome do exercício, autoplay loop sem som.
  - Galeria `/exercicios`: thumbnail 64×64 no card de cada exercicio.

- **Picker:** reusar `MidiaPicker` existente
  (`src/components/midia/MidiaPicker.tsx`). Configurar pra aceitar
  apenas tipos visuais (`foto`/`video`) — esconder aba `Áudio`/`Spotify`/`YouTube`.

## Arquivos a criar/modificar

### Modificações

1. `src/lib/schemas/exercicio.ts`
   - Adicionar `midia_execucao: MidiaSchema.optional()` em `ExercicioSchema`.
   - Aceitar `.gif` no `MidiaFotoSchema.path` regex (atualmente aceita
     qualquer string ≥1 char — OK).

2. `src/components/screens/EdicaoExercicio.tsx` (ou similar; ver onde
   está o form de exercicio hoje)
   - Adicionar bloco "Mídia de execução" com `MidiaPicker` configurado
     pra `foto|video|gif`.

3. `src/components/screens/DetalheExercicio.tsx`
   - Renderizar a mídia no topo da tela. Player adequado pra cada tipo.

4. `app/treinos/executar/[slug].tsx`
   - No card "Exercício atual", adicionar mídia 96×96 se
     `exercicio.midia_execucao` existir.

5. `src/components/data/ExercicioCard.tsx` (galeria card)
   - Thumbnail 64×64 + fallback ícone Dumbbell se sem mídia.

6. `src/lib/vault/exercicios.ts`
   - `escreverExercicio` aceita `midia_execucao` no meta (já era
     `Partial`, deve passar pelo schema).

### Novos

- `src/components/exercicios/MidiaExecucaoPlayer.tsx`
  - Componente reusável que aceita `Midia` e renderiza correto:
    `<Image>` pra GIF/JPG, `<Video>` pra MP4. Loop+autoplay+mute.

- `tests/lib/schemas/exercicio-midia.test.ts`
  - Parse válido com midia_execucao, sem midia (optional), tipos válidos
    (foto/video/gif), rejeição de tipo `audio`.

- `tests/components/exercicios/MidiaExecucaoPlayer.test.tsx`
  - Render foto/video/gif → confere src correto + loop=true.

## Proof-of-work esperado

1. **Schema aceita GIF:**
   ```bash
   npx jest tests/lib/schemas/exercicio-midia.test.ts --silent
   # 6+ tests passa
   ```

2. **APK instalado + cadastrar exercício com GIF:**
   ```bash
   # Pre: dev-client ou APK alpha-5+
   # Menu → Saúde Física → Exercícios → FAB+ → Novo
   # Preencher nome "Agachamento"
   # Tap "Mídia de execução" → galeria → escolher um GIF
   # Salvar
   adb shell run-as com.ouroboros.mobile ls /data/user/0/com.ouroboros.mobile/files/Ouroboros/gif/ | head
   # Confirmar arquivo gif salvo
   ```

3. **Exibido na galeria:**
   ```bash
   adb shell uiautomator dump
   # Confirmar thumbnail aparece no card de Agachamento (vs ícone fallback)
   ```

4. **Reproduz durante executor:**
   ```bash
   # Criar rotina contendo o exercicio Agachamento
   # Iniciar treino
   # Confirmar mídia 96×96 autoplay loop ao lado do nome
   ```

5. **Validação visual via screenshot:**
   ```bash
   adb shell screencap -p /sdcard/exec.png && adb pull /sdcard/exec.png /tmp/exec.png
   # Read /tmp/exec.png e confirmar visualmente
   ```

## Critérios de aceite

- [ ] `ExercicioSchema` aceita campo `midia_execucao` opcional
- [ ] Picker funciona em form de criação/edição
- [ ] Arquivo persiste em pasta correta (`gif/`/`mp4/`/`jpg/`)
- [ ] Detalhe `/exercicios/<slug>` mostra mídia em destaque
- [ ] Galeria mostra thumbnail nos cards
- [ ] Executor (Q11.c) mostra mídia ao lado do exercício atual
- [ ] Rejeição clara de vídeo >8s ou arquivo >5MB
- [ ] 1892+5 testes verde (+5 novos mínimo)
- [ ] Sprint marcada `[ok]` em ROADMAP + FEATURES-CANONICAS

## Anti-débito

Achados colaterais sobre o player ou tamanho de arquivo geram
sub-sprints (Q18.x) ou viram limitações documentadas em
`docs/ADRs/Q18-MIDIA-EXECUCAO.md` se afetarem decisão durol.
