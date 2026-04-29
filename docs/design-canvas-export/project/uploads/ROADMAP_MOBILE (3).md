# Ouroboros Mobile: Roadmap v2 (Consolidado)

```
DOC: ROADMAP_MOBILE.md
STATUS: RFC | VERSION: 2.0 | LANG: PT-BR
PILAR: dossie de vida adulta + captura sem friccao
HARDWARE: 2x Redmi Note 13 5G Pro
PRINCIPIO RAIZ: dois toques entre abrir e registrar uma acao
```

---

## Mudancas desde a v1

A v1 tratava o app como tracker de treino. A v2 reposiciona como **dossie
de vida adulta** completo. Mudancas concretas:

- **Vault compartilhado** entre as duas pessoas, nao um vault por celular
- **Cadastro dinamico de exercicios** pelo usuario (upload de GIF, definicao
  de grupos), substituindo lista hardcoded
- **Sync flexivel**: Obsidian Sync ou Syncthing, escolha em settings
- **Share intent receiver**: outros apps (banco, scanner, fotos) jogam
  arquivos no Ouroboros via share sheet do Android
- **Diario emocional com contexto**: nao so "humor 3/5", mas registro com
  emocao, intensidade, com-quem-aconteceu, estrategia de resposta
- **Lista positivos/negativos do dia**: visualizacao em duas colunas
- **Registro de evento com lugar**: "fui a tal lugar com vitoria",
  geolocalizacao opcional
- **Scanner em alta resolucao**: 200MP do sensor traseiro do Note 13, com
  auto-deskew antes de OCR
- **Mobile dispara, backend gera dossie medico**: app envia request, pipeline
  desktop produz PDF
- **Padroes cross-domain leves no mobile**: visualizacao consome cards
  pre-calculados pelo backend, nao roda analise no celular

---

## Visao

Transformar registros dispersos (markdown manual, planilhas, fotos no rolo,
print de PIX) em uma experiencia mobile fluida onde:

1. Concluir uma acao custa 1 a 2 toques
2. O app aceita arquivos vindos de qualquer canto do Android (share intent)
3. O usuario cadastra suas proprias rotinas, exercicios, categorias
4. Estado emocional fica registrado com contexto util pra terapia
5. Padroes nao-obvios (sono x ansiedade, exercicio x humor) emergem sem
   esforco do usuario
6. A qualquer momento da pra gerar PDF estruturado pra consulta medica

O app nao e o sistema. O sistema e o vault Obsidian compartilhado. O app
escreve nele. O backend desktop le e processa. Mobile e desktop sao duas
faces da mesma fonte de verdade.

---

## Principios de design

1. **Dois toques ate uma vitoria registrada.** Mais que isso, e burocracia.
2. **Estado vazio nunca culpa.** "Voltou hoje" no lugar de "5 dias quebrados".
3. **Offline-first.** Sync acontece em background, app funciona sem rede.
4. **Visual identico ao desktop.** Paleta Dracula, JetBrains Mono, mesma
   linguagem de cores (laranja=heading, ciano=numero, lavanda=ativo).
5. **Vault compartilhado nativo.** Filtro de pessoa em toda tela com dados
   pessoais.
6. **Share intent first-class.** O app nunca e a unica porta de entrada.

---

## Stack confirmado

```
Frontend:       SvelteKit 2 + TypeScript
Wrapper:        Capacitor 6 + Android 14 SDK
Estado:         Svelte stores + IndexedDB
Tema:           CSS variables Dracula (compartilhado com dashboard Streamlit)
Tipografia:     JetBrains Mono local (woff2)
GIFs:           Capacitor Filesystem lendo direto do vault
OCR mobile:     ML Kit Text Recognition (preview)
OCR oficial:    Tesseract no backend desktop (fonte de verdade)
Audio:          Capacitor Voice Recorder
Transcricao:    Whisper.cpp local OU endpoint local-only
Sync:           Obsidian Sync (default) ou Syncthing (alternativa)
Build:          npm run build + cap sync android + cap open android
Hardware alvo:  Redmi Note 13 5G Pro (1080x2400, sensor 200MP)
```

---

## Wave 1: Fundacao (M01 a M03)

### M01 - Bootstrap do projeto mobile

**Objetivo:** app rodando no celular com tema Dracula, mesmo que so com
tela "hello".

**Deliverables:**
- Repo `ouroboros-mobile` criado, GPL-3.0
- SvelteKit + TypeScript + Capacitor 6 setados
- Estrutura de pastas estabelecida
- `src/theme/dracula.css` com paleta completa
- JetBrains Mono local (woff2) carregada
- APK debug instalado em ambos celulares
- README com setup passo-a-passo no Pop!_OS

**Tempo:** 4h | **Prioridade:** P0 | **Dependencias:** nenhuma

**Validacao:**
```bash
npm run dev && npm run build && npx cap sync && npx cap open android
```

---

### M02 - Vault bridge com sync flexivel

**Objetivo:** o app le e escreve no mesmo vault que o desktop, suportando
duas opcoes de sync que o usuario escolhe em settings.

**Deliverables:**
- Modulo `src/lib/vault/` com API tipada (readFile, writeFile, listDir,
  exists, watch)
- Capacitor Filesystem apontando pra diretorio publico Android
- Permissao MANAGE_EXTERNAL_STORAGE configurada (Android 11+)
- Documentacao de configuracao Obsidian Sync (default)
- Documentacao de configuracao Syncthing (alternativa)
- Tela basica de status de sync (sera melhorada em M24)
- Teste manual: arquivo criado no app aparece no desktop em <60s

**Tempo:** 8h | **Prioridade:** P0 | **Dependencias:** M01

---

### M03 - Schemas tipados compartilhados

**Objetivo:** o app entende os 12 schemas YAML que o backend usa.

**Deliverables:**
- `src/lib/schemas/` com types TypeScript pra:
  - Humor, ExercicioSessao, ExercicioDefinicao, MedidaCorporal,
    DiarioTexto, Questionario, ExameMedico, Vitoria, Trigger,
    EventoCompartilhado, MedicacaoTomada, MedicacaoDefinicao
- Parser YAML frontmatter em `src/lib/vault/frontmatter.ts`
- Funcoes de leitura/escrita tipadas
- Validacao em runtime (zod ou similar)
- Testes com fixtures reais

**Tempo:** 6h | **Prioridade:** P0 | **Dependencias:** M01, M02

---

## Wave 2: Treino e cadastro dinamico (M04 a M07)

### M04 - Cadastro dinamico de exercicios

**Objetivo:** usuario cria proprios exercicios, anexa GIF do vault ou da
camera/galeria, define grupos. Substitui qualquer lista hardcoded.

**Deliverables:**
- Tela `/exercicios/novo` (Tela 02 do mockup)
- Form com: nome, grupos musculares (multi-chip), equipamento, nivel,
  series, reps, descricao
- Upload de GIF ou imagem:
  - Origem 1: arquivo do vault (`vault/assets/exercicios/`)
  - Origem 2: galeria do Android
  - Origem 3: nova captura via camera
- Salva em `vault/assets/exercicios/catalogo.yaml` (catalogo crescente)
- GIF/imagem copiado pra `vault/assets/exercicios/<slug>.gif`
- Tela `/exercicios/[id]/editar` permite editar exercicio existente
- Validacao: nome unico, GIF anexado obrigatorio
- Estado vazio em galeria: "nenhum exercicio cadastrado. toque + pra criar."

**Tempo:** 10h | **Prioridade:** P0 | **Dependencias:** M03

---

### M05 - Tela "Hoje" adaptativa

**Objetivo:** abrir o app e ver o que importa hoje sem rolar — proxima
rotina sugerida + cards de outros dominios.

**Deliverables:**
- Tela `/` (Tela 01 do mockup)
- Card hero adaptativo:
  - Se ha rotina cadastrada e e dia de fazer: mostra "rotina A" + iniciar
  - Se nao ha rotina hoje: mostra ultimo registro + sugestao
- Strip de 7 dias com circulos `--bg-elev` (vazio) ou `--green` (ativo)
- Mini cards: humor, gasto da semana, ultimo diario
- Mensagem contextual em `--muted` ("voltou hoje", "voce foi", etc)
- FAB visivel
- Tudo le do vault, escreve nada

**Tempo:** 8h | **Prioridade:** P0 | **Dependencias:** M03, M04

---

### M06 - Sessao de treino com checkbox e GIF

**Objetivo:** durante o treino, marcar cada exercicio como concluido com
1 toque, ver o GIF inline, fechar quando terminar.

**Deliverables:**
- Tela `/treino/sessao` (Tela 03 do mockup)
- Cards de exercicio empilhados, com card ativo destacado em borda
  `--purple` 2px
- GIF renderizando inline via Capacitor Filesystem
- Stepper de series com botoes 40dp
- Input de peso atual (numpad)
- Checkbox 56dp `--green` quando marcado
- Botao "concluir rotina" gera arquivo .md em
  `vault/inbox/corpo/exercicio/YYYY-MM-DD.md`
- Toast aleatorio: "feito.", "anotado.", "voce foi.", "tao bom"

**Tempo:** 12h | **Prioridade:** P0 | **Dependencias:** M04, M05

---

### M07 - Persistencia + retomada de treino

**Objetivo:** se voce interromper um treino, ele esta exatamente onde voce
deixou ao reabrir.

**Deliverables:**
- Estado da sessao em IndexedDB, atualizado a cada checkbox
- Detecao de sessao em andamento ao reabrir o app
- Card "continuar treino?" com 2 opcoes
- Edicao de sessoes passadas em `/treino/historico/[data]`
- Validacao: nao permite criar 2 sessoes na mesma data por pessoa
- Botao "descartar treino" com confirmacao

**Tempo:** 6h | **Prioridade:** P1 | **Dependencias:** M06

---

## Wave 3: Galeria e memorias (M08 a M11)

### M08 - Galeria de exercicios cadastrados

**Objetivo:** navegar todos os exercicios disponiveis fora do contexto de
treino.

**Deliverables:**
- Tela `/exercicios` (Tela 07)
- Grid 2 colunas de cards com GIF preview + nome
- Filtros horizontais: todos, peito, costas, pernas, ombros, core, cardio
- Search por nome
- Tap abre Tela 08

**Tempo:** 6h | **Prioridade:** P1 | **Dependencias:** M04

---

### M09 - Detalhe de exercicio

**Objetivo:** ler instrucao completa, ver historico de execucoes.

**Deliverables:**
- Tela `/exercicios/[id]` (Tela 08)
- GIF grande full width
- Metadados: grupos, equipamento, nivel
- Instrucao + dicas
- Sparkline historico (12 ultimas execucoes)
- "ultima vez: 23/04, 4 kg, 3x8"
- Botoes: editar, adicionar a treino livre, excluir

**Tempo:** 6h | **Prioridade:** P1 | **Dependencias:** M04, M08

---

### M10 - Heatmap de treinos + memorias

**Objetivo:** ver historico denso de treinos como heatmap (estilo GitHub)
e mergulhar em qualquer dia.

**Deliverables:**
- Tela `/memorias` (Tela 09)
- Heatmap 13 semanas x 7 dias
- Cores por intensidade (`--green` 30/60/100%)
- Tap em quadrado abre modal Tela 10
- Stats: "26 treinos em 90 dias", "media 2/semana"
- Tabs: treinos, fotos, marcos
- Estado vazio gentil

**Tempo:** 10h | **Prioridade:** P1 | **Dependencias:** M06

---

### M11 - Marcos gentis

**Objetivo:** feedback positivo no fim de treino + timeline de marcos
acumulados, sem gamificacao agressiva.

**Deliverables:**
- Tela full screen apos concluir treino com marco contextual
- Tela `/memorias/marcos` (Tela 11) com timeline vertical
- Catalogo `src/lib/marcos/catalogo.ts` com regras declarativas:
  - "voltou hoje" (apos hiato 7+ dias)
  - "tres treinos esta semana"
  - "primeiro mes registrando"
  - "100 registros de humor"
- Frases por contexto (rotacionar): "feito.", "anotado.", "voce foi.",
  "tao bom.", "voltou hoje."
- Som opcional + vibracao opcional (toggleavel)

**Tempo:** 8h | **Prioridade:** P1 | **Dependencias:** M06, M10

---

## Wave 4: Captura emocional (M12 a M15)

### M12 - FAB com menu radial

**Objetivo:** botao flutuante presente em todas as telas, abre menu radial
com 6 capturas rapidas.

**Deliverables:**
- Componente `src/components/captura/FAB.svelte` (Tela 14)
- Animacao de expansao 200ms
- 6 botoes em arco: humor, voz, camera, exercicio, vitoria, trigger
- Cada botao com cor especifica e icone
- Tap fora fecha o menu
- Acessivel em todas as telas

**Tempo:** 8h | **Prioridade:** P1 | **Dependencias:** M03

---

### M13 - Diario emocional com contexto

**Objetivo:** registrar tristeza, raiva, alegria, alivio com contexto rico
pra analise posterior.

**Deliverables:**
- Tela `/diario/registrar` (Tela 18)
- Toggle inicial: trigger (negativo) ou vitoria (positivo)
- Borda esquerda do form em `--red` ou `--green` conforme tipo
- Grid de chips de emocao (multi-select):
  - Negativos: tristeza, raiva, ansiedade, frustracao, medo, solidao
  - Positivos: alegria, alivio, gratidao, conexao, paz, orgulho
- Slider intensidade 1-5
- Textarea livre "o que aconteceu?"
- Chips "com quem": sozinho, com vitoria, familia, trabalho, outro
- Bloco condicional (se trigger): estrategia de resposta + "funcionou?"
- Botao "gravar audio" inline (push-to-talk, salva separado)
- Salva em `vault/inbox/relacional/triggers/` ou `eventos/`
- Mensagem rodape: "salvo localmente. ninguem ve alem de voces dois."

**Tempo:** 10h | **Prioridade:** P1 | **Dependencias:** M12, M03

---

### M14 - Lista positivos/negativos do dia

**Objetivo:** visao do dia em duas colunas, fluida pra adicionar e revisar.

**Deliverables:**
- Tela `/diario/colunas` (Tela 19)
- Layout 2 colunas verticais:
  - Esquerda "+ positivos" `--green`
  - Direita "- negativos" `--red`
- Cards mini com hora + texto curto
- Tap abre Tela 18 com dados pre-preenchidos
- Botao flutuante "+ adicionar" embaixo de cada coluna
- Filtro temporal: hoje, esta semana, este mes
- Filtro pessoa
- Estado vazio por coluna ("registre algo bom de hoje", "nada hoje, tudo bem")

**Tempo:** 6h | **Prioridade:** P1 | **Dependencias:** M13

---

### M15 - Registro de evento com lugar

**Objetivo:** registrar "fui a tal lugar com vitoria" rapidamente, com
geolocalizacao opcional.

**Deliverables:**
- Tela `/eventos/registrar` (Tela 20)
- Textarea "o que aconteceu"
- Input "onde" + botao "usar localizacao atual" (Capacitor Geolocation)
- Time picker com default "agora"
- Chips multi-select "com quem" (vitoria pre-selecionada se vault
  compartilhado)
- Chips categoria: exercicio, rolezinho, compras, consulta, trabalho,
  evento_social, rotina, outro
- Botao "+ adicionar foto" (galeria ou camera)
- Slider intensidade 1-5
- Salva em `vault/inbox/relacional/eventos/`

**Tempo:** 8h | **Prioridade:** P1 | **Dependencias:** M12

---

## Wave 5: Captura fisica e share intent (M16 a M19)

### M16 - Form de humor rapido

**Objetivo:** registrar humor diario em 30 segundos.

**Deliverables:**
- Bottom sheet `/humor/rapido` (Tela 15)
- 4 sliders: humor, energia, ansiedade, foco (1-5)
- Toggle "tomei medicacao"
- Input "horas de sono ontem"
- Chips de tags rapidas (multi-select)
- Textarea "uma frase sobre hoje"
- Salva em `vault/inbox/mente/humor/YYYY-MM-DD.md`

**Tempo:** 6h | **Prioridade:** P1 | **Dependencias:** M12

---

### M17 - Voice memo + transcricao

**Objetivo:** segurar push-to-talk, falar, soltar — audio + transcricao
salvos.

**Deliverables:**
- Bottom sheet `/diario/voz` (Tela 04 ja desenhada)
- Push-to-talk com timer visual + waveform animada
- Audio salvo em `vault/inbox/mente/diario/audio/`
- Transcricao via Whisper.cpp local (modelo small em portugues)
- Texto transcrito vira nota em `vault/inbox/mente/diario/`
- Permite editar transcricao antes de salvar

**Tempo:** 12h | **Prioridade:** P1 | **Dependencias:** M12

---

### M18 - Camera scanner alta resolucao

**Objetivo:** apontar a camera pra um recibo/PIX/exame e ele virar arquivo
no inbox correto, ja com OCR preview.

**Deliverables:**
- Tela `/scanner` (Tela 16)
- Viewfinder com cantos de mira `--cyan`
- Auto-deteccao de bordas de documento
- Captura no sensor 200MP (configuravel em settings: 8/12/maxima)
- Auto-deskew + auto-crop
- ML Kit Text Recognition pra OCR preview
- Form de validacao: valor, data, descricao, categoria, pessoa
- Salva em `vault/inbox/financeiro/raw/` (imagem) e
  `vault/inbox/financeiro/raw/` (txt do OCR)
- Pipeline desktop processa e classifica definitivamente

**Tempo:** 14h | **Prioridade:** P1 | **Dependencias:** M12

---

### M19 - Share intent receiver

**Objetivo:** outros apps (banco, scanner, fotos) jogam arquivos no
Ouroboros via share sheet do Android, sem o app precisar abrir
completamente.

**Deliverables:**
- AndroidManifest.xml com intent-filter ACTION_SEND e ACTION_SEND_MULTIPLE
- Capacitor plugin de share intent (community plugin ou custom)
- Tela modal `/receber` (Tela 17)
- Preview do arquivo recebido (PDF, imagem, texto)
- Heuristica de classificacao automatica:
  - Nome contem "pix" ou "comprovante" -> financeiro/pix/
  - Nome contem "extrato" ou "fatura" -> financeiro/extratos/
  - Nome contem "exame" ou "laudo" -> corpo/exames/
  - Nome contem "receita" -> corpo/medicacao/
  - Default -> financeiro/raw/
- Chips pra usuario sobrescrever classificacao
- Path destino mostrado em `--cyan` mono caption
- Filtro pessoa (andre/vitoria/ambos)
- Botao "salvar no inbox" -> salva e fecha modal (volta pro app de origem)
- Estado de conflito (arquivo com nome similar ja existe): renomear/substituir

**Tempo:** 12h | **Prioridade:** P1 | **Dependencias:** M02, M03

---

## Wave 6: Tracking corporal (M20 a M21)

### M20 - Form de medidas corporais

**Objetivo:** registrar 9 medidas semanais em <2 minutos com numpad
otimizado.

**Deliverables:**
- Tela `/medidas/nova` (Tela 12)
- Form em 2 colunas com 9 campos numericos
- Pre-preenchido com ultima medida em `--muted`
- Bloco de fotos: frente, costas, lado (camera ou galeria)
- 3 textareas de reflexao com prompts placeholder
- Salva em `vault/inbox/corpo/medidas/YYYY-MM-DD.md`
- Fotos em `vault/assets/progresso/`

**Tempo:** 6h | **Prioridade:** P2 | **Dependencias:** M03

---

### M21 - Comparativo de medidas

**Objetivo:** ver evolucao das medidas em sparklines + galeria comparativa
de fotos.

**Deliverables:**
- Tela `/medidas` (Tela 13)
- Grid 2 colunas de cards com sparkline 12 pontos
- Delta vs primeira medida em `--muted` (sem semantica positiva/negativa)
- Filtro periodo: 30d, 90d, tudo
- Bloco "fotos lado a lado" com slider entre 2 datas
- Mostra frente/costas/lado alinhadas

**Tempo:** 8h | **Prioridade:** P2 | **Dependencias:** M20

---

## Wave 7: Mini dashboards (M22 a M23)

### M22 - Mini humor (pagina cheia)

**Objetivo:** versao mobile da pagina de humor do dashboard desktop.

**Deliverables:**
- Tela `/humor` (Tela 21)
- Heatmap 90 dias com cores por nivel (vermelho a verde)
- Tap em quadrado abre modal de registro daquele dia
- Stats: media 30d, registros completos
- Modo "sobreposto" andre+vitoria
- Botao "registrar humor agora" no topo

**Tempo:** 8h | **Prioridade:** P2 | **Dependencias:** M16

---

### M23 - Mini financeiro readonly

**Objetivo:** consultar gastos sem abrir notebook.

**Deliverables:**
- Tela `/financas` (Tela 22)
- Banner "modo leitura. edicao no desktop"
- Card hero: gasto da semana
- Top categorias com barras horizontais
- Lista das ultimas 20 transacoes
- Le do XLSX exportado pelo pipeline desktop
- Sem botao de adicionar

**Tempo:** 6h | **Prioridade:** P2 | **Dependencias:** M02

---

## Wave 8: Sistema (M24 a M25)

### M24 - Settings completo

**Objetivo:** controlar todos os comportamentos do app, incluindo sync e
qualidade de scanner.

**Deliverables:**
- Tela `/settings` (Tela 23)
- Secoes:
  - Som e vibracao (toggles por evento)
  - Lembretes (medicacao, treino, humor diario, com horario)
  - Pessoa ativa (radio andre/vitoria) + toggle vault compartilhado
  - Sync (status colorido, forcar sync, escolha entre Obsidian
    Sync/Syncthing)
  - Qualidade scanner (8MP / 12MP / maxima dispositivo)
  - Privacidade (biometria pra abrir, ocultar transcricoes, exportar
    dados, limpar cache)
  - Sobre (versao, github, licenca)

**Tempo:** 10h | **Prioridade:** P1 | **Dependencias:** M02

---

### M25 - Onboarding 3 frames

**Objetivo:** primeiro uso, sem fricao, 3 telas e pronto.

**Deliverables:**
- Tela `/onboarding` (Tela 24)
- Frame 1: "voce e quem?" - escolha andre/vitoria com circulos coloridos
- Frame 2: "como deve te lembrar?" - 3 opcoes (manha, noite, so quando
  quiser)
- Frame 3: "como sincroniza?" - escolha Obsidian Sync ou Syncthing
- Sem checklist longo, sem tour, sem video
- Apos frame 3: app abre direto na tela "hoje"

**Tempo:** 6h | **Prioridade:** P1 | **Dependencias:** M02, M24

---

## Wave 9: Integracoes avancadas (M26 a M27)

### M26 - Solicitar dossie medico

**Objetivo:** mobile dispara request, backend desktop gera PDF estruturado.

**Deliverables:**
- Tela `/dossie` (Tela 06 ja desenhada)
- Selectores: periodo, pessoa, dominios a incluir (toggles)
- Botao "gerar pdf" cria arquivo de pedido em
  `vault/inbox/_solicitacoes/dossie-YYYYMMDD.yaml`
- Backend (sprint A22 do roadmap backend) detecta o pedido, gera PDF em
  `vault/dossies/`, e marca como concluido
- App detecta conclusao e mostra notificacao + botao "ver pdf"
- Compartilhar PDF via share intent reverso (Ouroboros -> Drive/email)

**Tempo:** 8h | **Prioridade:** P2 | **Dependencias:** M19, sprint
backend A22

---

### M27 - Notificacoes locais

**Objetivo:** lembretes baseados em settings + lembretes contextuais.

**Deliverables:**
- Capacitor Local Notifications configurado
- Notificacao diaria de humor (configuravel)
- Notificacao de treino baseada em rotina
- Notificacao de medicacao (multipla por dia)
- Notificacao contextual: "voce nao registrou humor ha 3 dias"
- Toggle de cada tipo em settings
- Linguagem sobria nas notificacoes ("hora do humor diario", nao
  "VOCE PERDEU O STREAK!")

**Tempo:** 8h | **Prioridade:** P2 | **Dependencias:** M16, M24

---

## Tabela mestre de sprints

| ID | Wave | Titulo | P# | Horas | Acumulado | Tela mockup |
|----|------|--------|-----|-------|-----------|-------------|
| M01 | 1 | Bootstrap projeto | P0 | 4 | 4 | - |
| M02 | 1 | Vault + sync flexivel | P0 | 8 | 12 | - |
| M03 | 1 | Schemas tipados | P0 | 6 | 18 | - |
| M04 | 2 | Cadastro dinamico exercicios | P0 | 10 | 28 | 02 |
| M05 | 2 | Tela hoje adaptativa | P0 | 8 | 36 | 01 |
| M06 | 2 | Sessao treino + checkbox | P0 | 12 | 48 | 03 |
| M07 | 2 | Persistencia + retomada | P1 | 6 | 54 | - |
| M08 | 3 | Galeria exercicios | P1 | 6 | 60 | 07 |
| M09 | 3 | Detalhe exercicio | P1 | 6 | 66 | 08 |
| M10 | 3 | Heatmap + memorias | P1 | 10 | 76 | 09, 10 |
| M11 | 3 | Marcos gentis | P1 | 8 | 84 | 11 |
| M12 | 4 | FAB menu radial | P1 | 8 | 92 | 14 |
| M13 | 4 | Diario emocional | P1 | 10 | 102 | 18 |
| M14 | 4 | Lista positivos/negativos | P1 | 6 | 108 | 19 |
| M15 | 4 | Registro evento + lugar | P1 | 8 | 116 | 20 |
| M16 | 5 | Form humor rapido | P1 | 6 | 122 | 15 |
| M17 | 5 | Voice memo + transcricao | P1 | 12 | 134 | 04 |
| M18 | 5 | Scanner alta resolucao | P1 | 14 | 148 | 16 |
| M19 | 5 | Share intent receiver | P1 | 12 | 160 | 17 |
| M20 | 6 | Form medidas | P2 | 6 | 166 | 12 |
| M21 | 6 | Comparativo medidas | P2 | 8 | 174 | 13 |
| M22 | 7 | Mini humor | P2 | 8 | 182 | 21 |
| M23 | 7 | Mini financeiro | P2 | 6 | 188 | 22 |
| M24 | 8 | Settings completo | P1 | 10 | 198 | 23 |
| M25 | 8 | Onboarding 3 frames | P1 | 6 | 204 | 24 |
| M26 | 9 | Solicitar dossie medico | P2 | 8 | 212 | 06 |
| M27 | 9 | Notificacoes locais | P2 | 8 | 220 | - |

**Total:** 220h
**Realista em recuperacao de burnout (3-5h/semana):** 44-73 semanas
**MVP P0 (Waves 1-2):** 54h, ~12 semanas
**MVP funcional (Waves 1-5):** 160h, ~32 semanas

---

## Definicao de pronto

### MVP P0 (54h)
Voce abre o app, ve o que cadastrou de rotina, faz, marca tudo, fecha.
Sessao salva no vault. Backend desktop pega no proximo run.

### MVP funcional (160h)
Tudo do MVP P0 mais:
- Galeria de exercicios + memorias
- FAB com 6 capturas rapidas
- Diario emocional + voz + camera + share intent
- Lista positivos/negativos + eventos com lugar

Esse e o app que serve voces dois todo dia. Waves 6-9 sao expansao.

### Completo (220h)
Tudo. Inclui mini dashboards, settings completo, dossie medico, notificacoes.
Pode ser feito em ritmo lento sem perder valor a cada sprint.

---

## Riscos e mitigacoes

| Risco | Probabilidade | Mitigacao |
|-------|---------------|-----------|
| Capacitor Filesystem com limitacoes Android 13+ | Media | Fallback MediaStore API ou SAF |
| Whisper.cpp local muito lento no Note 13 | Media | Modelo small + fallback servidor local |
| ML Kit OCR offline insuficiente | Baixa | OCR mobile e preview, oficial e Tesseract no desktop |
| Share intent classificacao errada | Media | UI sempre mostra path destino + chip pra trocar |
| Conflitos de sync com vault compartilhado | Media | Cada arquivo nomeado com pessoa + timestamp |
| Build APK falhar no Pop!_OS | Baixa | Documentar passo a passo no README |
| **Abandono por burnout** | **Alta** | MVP em 12 sprints. Nao precisa terminar tudo. Cada sprint adiciona valor isoladamente. |

---

## Conexao com backend Ouroboros

Cada sprint mobile tem dependencia ou habilita uma sprint backend:

| Mobile | Habilita backend | Backend habilita |
|--------|------------------|------------------|
| M04 | A05 (catalogo dinamico) | - |
| M06 | A03 (extrator exercicio_sessao) | M10 (heatmap consome dados) |
| M13 | A06 (extrator trigger), A08 (extrator vitoria) | - |
| M14 | - | A06, A08 |
| M15 | A11 (extrator evento_compartilhado) | - |
| M16 | A02 (extrator humor) | M22 (mini humor) |
| M17 | A09 (transcricao backend opcional) | - |
| M18 | A07 (deteccao de tipo no inbox) | - |
| M19 | A07 (deteccao de tipo no inbox) | - |
| M20 | A04 (extrator medidas) | M21 (comparativo) |
| M22 | A02 + A12 (heatmap dataset) | - |
| M23 | (le do XLSX existente) | - |
| M26 | A22 (gerador de dossie PDF) | M26 (consome) |

Sequencia recomendada: avancar mobile e backend em paralelo, intercalando
sprints de cada lado conforme dependencias.

---

## Comandos uteis

```bash
# Setup inicial
gh repo create ouroboros-mobile --private --license=GPL-3.0
cd ouroboros-mobile
npm create svelte@latest .
npm install -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init OuroborosMobile com.ouroboros.mobile

# Dev
npm run dev
npm run build && npx cap sync android
npx cap open android

# Issues
gh issue create --title "mobile: M01 bootstrap projeto" \
  --label "P0-critical,type:infra,wave:1" \
  --body-file sprints/M01.md

# Branch da sprint
gh issue develop NUMERO --checkout

# PR
gh pr create --title "feat: M## titulo" --body "Closes #NUMERO"
gh pr merge --squash --delete-branch
```

---

*"O app que serve a vida que voces tentam ter, nao a vida ideal que nunca
vai existir."*
