# Briefing Parte 3: Spec técnica + Design system + ADRs

```
STATUS: SUPERSEDED — substituído por docs/BRIEFING.md v3.0.
NÃO SEGUIR. Este arquivo está mantido apenas como histórico do
protótipo exportado do claude.ai/design.

Mudanças que invalidam este documento:
- Stack técnica passou de Kotlin/Compose para Expo + React Native +
  NativeWind + Moti + Reanimated + gluestack-ui (ver docs/BRIEFING.md
  Seção 10 e docs/PLANO_TECNICO_APK.md ADR-006).
- Identidade de pessoas no código foi refatorada para PESSOA_A /
  PESSOA_B com lookup runtime (ver docs/CONTEXTO.md Seção 3 e
  Regra −1). Os nomes reais "André"/"Vitória" presentes nos schemas
  abaixo NÃO devem ser replicados em código novo.
- ADRs canônicas vivem em docs/ADRs/ deste repositório.

DOC: BRIEFING_PARTE3_SPEC.md (LEGADO)
USO: leitura histórica apenas.
LANG: PT-BR
```

---

## 1. Visão e princípios de design

### O que é
App pessoal de captura. Diário, humor, finanças e eventos compartilhados
entre duas pessoas (André + Vitória), com vault em markdown sincronizado
via Syncthing ou Obsidian Sync.

Mobile é o lado de **captura ativa**. Edição em massa, análise e
relatórios ficam no desktop. O app não tenta competir com Obsidian — tenta
deixar o vault rodando no bolso sem fricção.

### 5 princípios

1. **baixa fricção.** 1–2 taps pra registrar qualquer coisa.
2. **nada de gamificação.** sem streaks, badges, reforço positivo
   artificial.
3. **dados = arquivos.** tudo .md no vault. portável, auditável.
4. **dois donos.** sempre fica claro de quem é o registro.
5. **mobile captura, desktop processa.** não duplique funcionalidade.

---

## 2. Design system — tokens com hex

Paleta Dracula adaptada. Base + acentos.

### Base

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-page` | `#14151a` | fundo do canvas (fora das telas) |
| `--bg` | `#282a36` | fundo da tela |
| `--bg-alt` | `#1e1f29` | cards e containers |
| `--bg-elev` | `#44475a` | bordas e elevação |
| `--fg` | `#f8f8f2` | texto primário |
| `--muted` | `#c9c9cc` | texto secundário |
| `--muted-decor` | `#6272a4` | hints, separadores, anotações |

### Acentos

| Token | Hex | Uso |
|-------|-----|-----|
| `--purple` | `#bd93f9` | André · ações primárias |
| `--pink` | `#ff79c6` | Vitória · trigger negativo |
| `--cyan` | `#8be9fd` | valores · paths · voz |
| `--green` | `#50fa7b` | sucesso · confirmação |
| `--yellow` | `#f1fa8c` | vitória positiva · atenção |
| `--orange` | `#ffb86c` | títulos de tela · câmera |
| `--red` | `#ff5555` | trigger · destrutivo |

### Tipografia

- **Família única:** JetBrains Mono. Sem fonte sans secundária.
- Hierarquia: heading-1 24px · heading-2 18px · body 13–14px · caption
  12px · micro 11px.
- Letter-spacing +0.02em em micro caps.

### Spacing scale
- Base 4dp. Escala: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64.
- Hit area mínima 44dp.
- Padding interno padrão de card: 13dp uniforme.
- Border radius: 8dp (cards) · 14dp (chips) · 22dp (toasts).

### Motion
- Toda transição: `ease-out` 200ms.
- FAB radial expande em 240ms com spring leve.
- Toasts somem em 2s. Sem bounces, sem easing exagerado.

---

## 3. Arquitetura técnica

### Storage
Vault Obsidian em pasta local sincronizada via Syncthing ou Obsidian Sync.
Cada registro vira `.md` com YAML frontmatter. App tem permissão de
leitura/escrita na pasta via Storage Access Framework (SAF).

### Sync
Syncthing (ou Obsidian Sync) roda fora do app. Ouroboros não gerencia
sync — só observa o status (conectado / syncing / conflito) e mostra na
tela de ajustes. Conflitos são resolvidos no desktop via merge manual.
Mobile só sinaliza.

### OCR e ML
ML Kit do Google rodando 100% on-device. Sem chamada de rede, sem upload
de imagem. Detecção de bordas: ML Kit document scanner (auto-deskew antes
do OCR).

### Privacidade
Zero tráfego de saída do app. Nenhum analytics, telemetria ou crash
reporter remoto. Biometria (`BiometricPrompt`) protege abertura. Falha em
3 tentativas → modo PIN.

### Share intents
App registra intent filter para `image/*` e `application/pdf`.
Compartilhamento abre Activity transparente, processa, salva, fecha. Sem
tab bar.

### Notificações
WorkManager pra lembretes diários (humor noturno) e alarmes pessoais.
Notificações expandem com Reply direto: humor pode ser registrado sem
abrir o app.

---

## 4. Modelo de dados — schemas .md

### Estrutura de pastas do vault

```
vault/
├─ daily/
│  └─ 2026-04-28.md              ← humor + entrada do dia
├─ eventos/
│  └─ 2026-04-28-cafe.md         ← evento positivo/negativo com lugar
├─ inbox/
│  ├─ financeiro/
│  │  ├─ pix/
│  │  │  └─ 2026-04-28-143200.md
│  │  ├─ extrato/
│  │  ├─ exame/
│  │  └─ nota/
│  └─ mente/
│     ├─ humor/
│     │  └─ 2026-04-28.md
│     └─ diario/
│        └─ 2026-04-28-conflito.md
├─ treinos/
│  └─ 2026-04-28-rotina-b.md
├─ medidas/
│  └─ 2026-04-28.md
├─ marcos/
│  └─ 2026-04-28-tres-treinos-semana.md
├─ tarefas/
│  └─ 2026-04-28-pagar-luz.md
├─ alarmes/
│  └─ medicacao-08h.md
├─ contadores/
│  └─ dias-sem-fumar.md
├─ assets/
│  └─ 2026-04-28-pix.jpg
└─ .ouroboros/
   └─ cache/
      └─ financas-cache.json     ← gerado pelo desktop
```

### Schema · daily/YYYY-MM-DD.md (humor do dia)

```yaml
---
tipo: humor
data: 2026-04-28
autor: andre
humor: 4
energia: 3
ansiedade: 2
foco: 4
medicacao: true
horas_sono: 7
tags: [trabalho_pesado, exercicio, boa_conversa]
frase: "dia denso mas terminei tranquilo."
---
```

### Schema · eventos/YYYY-MM-DD-slug.md (evento com lugar)

```yaml
---
tipo: evento
data: 2026-04-28T10:30:00-03:00
autor: andre
modo: positivo                  # positivo | negativo
lugar: "padaria do bairro"
bairro: "bela vista"
com: [vitoria]
categoria: rolezinho
intensidade: 4                  # 1-5
fotos: [./assets/2026-04-28-cafe.jpg]
---

café da manhã com a vi.
conversa boa, sem pressa.
```

### Schema · inbox/financeiro/pix/YYYY-MM-DD-HHmmss.md

```yaml
---
tipo: financeiro
subtipo: pix
data: 2026-04-28T14:32:00-03:00
autor: andre
valor: 87.40
destino: "mercado luiza"
categoria: mercado
imagem: ./assets/2026-04-28-pix.jpg
ocr_confianca: 0.94
revisar: false
---
```

### Schema · inbox/mente/diario/YYYY-MM-DD-slug.md (diário emocional)

```yaml
---
tipo: diario_emocional
data: 2026-04-28T19:15:00-03:00
autor: andre
modo: trigger                   # trigger | vitoria
emocoes: [tristeza, frustracao]
intensidade: 4
com: [vitoria]
texto: "discussão sobre dinheiro. saí da conversa cedo."
estrategia: "respirei fundo e fui caminhar 20 min."
funcionou: true
audio: null                     # ou ./assets/2026-04-28-1915.m4a
---
```

### Schema · contadores/slug.md (dias sem X)

```yaml
---
tipo: contador
titulo: "dias sem fumar"
inicio: 2026-03-12
autor: andre
recorde: 47
resets:
  - 2026-02-08
  - 2026-03-11
---

# histórico
streak atual começou em 12/03.
```

### Schema · alarmes/slug.md

```yaml
---
tipo: alarme
titulo: "medicação · manhã"
hora: "08:00"
dias: [seg, ter, qua, qui, sex, sab, dom]
tag: medicacao
ativo: true
som: gentle
---
```

### Schema · medidas/YYYY-MM-DD.md

```yaml
---
tipo: medidas
data: 2026-04-28
autor: andre
peso: 78.4
cintura: 84.0
peito: 102.0
braco_esq: 33.0
braco_dir: 33.5
coxa_esq: 56.0
coxa_dir: 56.5
barriga: 89.0
quadril: 96.0
fotos: [./assets/m-2026-04-28-frente.jpg, ./assets/m-2026-04-28-costas.jpg]
reflexao: "dorso sentindo melhor depois das semanas de cardio."
---
```

---

## 5. ADRs — Architecture Decision Records

### ADR-001 · Vault em markdown puro

- **Contexto:** precisamos de storage que sobreviva ao app sumir. SQLite
  seria mais rápido, mas opaco.
- **Decisão:** arquivos .md com YAML frontmatter, um por registro,
  organizados em pastas por tipo. Banco SQLite usado só como índice
  volátil (Room).
- **Consequência:** migração trivial pra qualquer app de notas. Backup =
  copiar pasta. Custo: I/O mais lento; mitigado com cache em memória.

### ADR-002 · Sync delegado ao Syncthing / Obsidian Sync

- **Contexto:** dois usuários, dois aparelhos + 1 desktop. Sync próprio =
  backend + auth + conflitos.
- **Decisão:** sync roda fora do app. Ouroboros só observa status e mostra
  na UI. Conflitos resolvidos no desktop via merge manual.
- **Consequência:** zero infra própria. Custo: usuário precisa configurar
  o sync uma vez — onboarding compensa.

### ADR-003 · ML Kit on-device, sem rede

- **Contexto:** OCR e document scanner via API cloud seriam mais precisos.
- **Decisão:** ML Kit local. Comprovantes financeiros e diários nunca saem
  do device. Zero tráfego de rede.
- **Consequência:** qualidade ~90% do cloud, mas privacidade absoluta. Pra
  casos limítrofes, fallback é form manual.

### ADR-004 · Mobile só captura · desktop processa

- **Contexto:** tentação de espelhar tudo do desktop no mobile. Resultado
  típico: dois apps medianos.
- **Decisão:** mobile = entrada de dados. Edição em massa, relatórios,
  pipelines de finanças = desktop. Mobile lê cache .json gerado pelo
  desktop.
- **Consequência:** escopo mobile drasticamente menor → qualidade maior.
  Mobile sem dados se desktop nunca rodou (empty state explica).

### ADR-005 · Sem gamificação, intencional

- **Contexto:** diário de humor + finanças + eventos é tipicamente
  gamificado (streaks, badges, pushs motivacionais).
- **Decisão:** zero gamificação. Sem fogo de streak, sem celebração de
  milestone, sem ranking entre as 2 pessoas. Cores neutras pra dados
  financeiros.
- **Consequência:** ferramenta de auto-conhecimento, não dopamina-trap.
  Usuário não sente vergonha de pular um dia.

### ADR-006 · Jetpack Compose · sem fragmentos

- **Contexto:** Android tem 2 paradigmas vivos — Views/XML/Fragments e
  Compose.
- **Decisão:** Compose ponta-a-ponta. Material 3 só pra primitivos (sheet,
  dialog, snackbar); tema custom escuro próprio.
- **Consequência:** base de código menor, animações triviais, hot reload
  viável. Custo: bibliotecas legadas exigem AndroidView wrapper (CameraX
  etc.).

---

## 6. User flows · tempo-alvo

| # | Flow | Tempo-alvo |
|---|------|------------|
| 1 | Comprovante de pix via share sheet | ≤ 5 segundos |
| 2 | Registrar tristeza por conflito | ≤ 30 segundos |
| 3 | Evento positivo com lugar | ≤ 25 segundos |
| 4 | Scanner de nota fiscal alta resolução | ≤ 20 segundos |

Todos medidos do tap inicial até o toast de confirmação.

---

## 7. Estados especiais

### Empty states
Sempre com microcopy específico, nunca genérico.
- "comece registrando" (feed do dia)
- "edição é no desktop" (finanças)
- "vault não conectado" (config inicial)
- "nada hoje. tudo bem." (coluna negativa)

Sem ilustração elaborada — apenas tipografia + 1 ícone monocromático
opcional.

### Erros
- OCR falha → form manual.
- Sync falha → banner persistente em ajustes.
- I/O no vault → modal bloqueante com path do problema.
- **Toast = info; modal/banner = problema.** Nunca toast pra erro
  crítico.

### Permissões
Câmera, mic, storage e notificação pedidas just-in-time, no momento do
uso. Cada negação tem fallback:
- Sem câmera → scanner desabilitado.
- Sem mic → botão de voz invisível.
- Sem notificação → lembrete noturno desativado.
- Sem storage → modal bloqueante explicando.

Settings sempre tem deep-link pra reabilitar.

---

## 8. Anti-features — o que NÃO construir

Lista consolidada de tudo que está fora de escopo na v1:

- streaks visíveis com fogo, troféus ou celebração
- rede social, feed compartilhado público, comentários
- ranking entre André e Vitória, comparativo competitivo
- push motivacional ("você consegue!", "não desista")
- analytics, telemetria ou crash reporter remoto
- edição em massa ou bulk operations no mobile
- relatórios PDF / export complexo — fica no desktop
- integração com bancos, open banking, scraping de extrato
- IA generativa pra "sugerir como você se sente"
- dark mode opcional — só tem dark, é a identidade
- tour interativo, tooltips persistentes, coach marks
- widget de homescreen na v1 (talvez v2)
- backup automático na nuvem do app — Syncthing já cobre
- multi-idioma — só pt-BR

---

## 9. Funções adicionais (Seção E) — DECIDIR

Quatro features extras documentadas no design canvas. Decidir entrada
na v1 ou pra v2:

- **F-14 Microfone + transcrição:** captura por voz, transcreve
  on-device, gera .md + áudio anexado.
- **F-15 Alarme pessoal:** alarmes recorrentes salvos como .md.
- **F-16 To-do leve:** lista de tarefas sem projetos / subtarefas /
  due-date complexo.
- **F-17 Contador "dias sem X":** streak pessoal sem celebração visual.

**Decisão pendente:** marcar v1 ou v2 antes de iniciar build.

---

## 10. Stack técnica

### UI
- Kotlin 2.0+
- Jetpack Compose
- Material 3 (somente primitivos, com tema custom escuro)

### Storage
- Storage Access Framework — leitura/escrita do vault
- DataStore — preferências do app
- Room — índice full-text dos .md (volátil, regenerável)

### ML / Captura
- ML Kit — text recognition + document scanner
- CameraX — viewfinder e captura
- BiometricPrompt — abertura do app
- SpeechRecognizer (offline package) — transcrição on-device

### Background
- WorkManager — lembretes diários
- AlarmManager — alarmes pessoais (`setExactAndAllowWhileIdle`)
- NotificationCompat + RemoteInput — humor inline

---

## 11. Requisitos de privacidade explícitos

- Zero tráfego de rede de saída do app.
- Sem analytics, telemetria ou crash reporter remoto.
- Biometria local com fallback PIN.
- Botão "exportar todos meus dados" como primeira classe em ajustes.
- Botão "limpar cache local" sempre disponível.
- Permissões pedidas just-in-time, com fallback gracioso.
- Vault local apenas — sync delegado ao usuário.

---

## 12. Sequência de entrega sugerida

1. **Onboarding + tema** (3 frames + design system rodando)
2. **Tela 01 (hoje) + tela 06 (linha do tempo)** — leitura básica do
   vault funcionando
3. **FAB radial (tela 14)** — ponto de captura
4. **Humor rápido (tela 15)** + lembrete noturno via notificação
5. **Eventos (tela 20)** — captura com lugar
6. **Diário emocional (tela 18)** — captura com contexto rico
7. **Share intent (tela 17)** — pix sem abrir o app
8. **Scanner (tela 16)** — OCR e form
9. **Heatmap humor (tela 21)**
10. **Memorias / treinos (telas 09, 10, 11)**
11. **Medidas (telas 12, 13)**
12. **Galeria + detalhe exercício (telas 07, 08)**
13. **Finanças leitura (tela 22)**
14. **Settings (tela 23)**
15. **(opcional v1) Funções adicionais Seção E**

Cada etapa é PR fechado, com as telas envolvidas funcionando
ponta-a-ponta antes de passar pra próxima.

---

Pronto pra alimentar o Claude Code junto com Parte 1 e Parte 2.
