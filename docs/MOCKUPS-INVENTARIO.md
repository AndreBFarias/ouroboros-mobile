# Inventário Canônico de Mockups Visuais

Este documento formaliza o estado dos artefatos visuais de referência
do projeto Ouroboros Mobile em 2026-05-01 (Sprint M19.x). É a fonte
canônica para responder à pergunta "onde está o mockup da Tela NN?".

Resumo em uma frase: existem dois bundles HTML standalone independentes,
cada um com sua própria numeração de Tela 25/26, e os screenshots
capturados a cada sprint em `docs/sprints/MNN-screenshots/` são o
registro de fato do estado real do app.

## 1. Bundles HTML standalone

| Arquivo | Tamanho | Status | Origem | Editável? |
|---------|---------|--------|--------|-----------|
| `docs/Ouroboros_24_telas-standalone.html` | 1.4 MB | frozen | exportado por ferramenta externa de design em 2026-04-28 a partir do JSX-fonte em `docs/design-canvas-export/project/` (cabeçalho original preservado em `docs/design-canvas-export/README.md`) | Não — qualquer regeneração depende de toolchain ainda inexistente |
| `docs/Ouroboros_telas_25_26-standalone.html` | 23 KB | editável manual | criado em M00.6 (commit do checkpoint visual M00.6) como contorno temporário para evitar regenerar o bundle de 22 telas | Sim — HTML/CSS puro escrito à mão, sem build |

A duplicidade é intencional: regenerar o bundle de 22 telas exigiria
reverse-engineering dos primitivos proprietários (`PhoneFrame`,
`BackHeader`, `DCSection`, `DCArtboard` etc.) usados no JSX-fonte. M00.6
optou pelo caminho cirúrgico de criar um arquivo separado para as 2
telas novas, deixando o bundle original intacto.

## 2. JSX-fonte (referência apenas)

Ficam em `docs/design-canvas-export/project/`. São o input que a
ferramenta externa consumiu para gerar o bundle de 22 telas. **Não há
toolchain local para reprocessá-los.**

| Arquivo | Telas cobertas | Sprint(s) que consumiram |
|---------|----------------|--------------------------|
| `secao-a.jsx` | 07, 08, 09, 10, 11, 12, 13 | M11, M11.5, M07, M14 |
| `secao-b.jsx` | 15, 18, 19, 20 | M05, M08, M07 |
| `secao-c.jsx` | 14 (FAB), 16, 17 | M03, M06.5, M09 |
| `secao-d.jsx` | 21, 22, 23, 24 | M04, M10, M13, M15 |
| `secao-e.jsx` | 25, 26, 27, 28 | M06.5, M16, M17, M18 |
| `primitives.jsx` | (componentes base) | n/a — só referência |
| `theme.css` | (paleta Dracula) | n/a — já portada para `src/theme/tokens.ts` |

## 3. Tabela canônica Tela → arquivo

Coluna "bundle" indica em qual HTML a Tela aparece renderizada. Coluna
"jsx-fonte" indica o arquivo de origem (apenas no namespace do bundle de
22 telas).

| Tela | Nome | Bundle | JSX-fonte | Sprint dona | Status sprint |
|------|------|--------|-----------|-------------|---------------|
| 01 | Hoje (timeline) | `Ouroboros_24_telas-standalone.html` | (no `secao-c.jsx` como background do FAB) | M03 | ok |
| 07 | Galeria de exercícios | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M11 | ok |
| 08 | Detalhe de exercício | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M11 | ok |
| 09 | Heatmap de treinos | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M11 | ok |
| 10 | Modal detalhe de dia passado | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M11 | ok |
| 11 | Marcos (timeline gentil) | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M11.5 | ok |
| 12 | Form de medidas corporais | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M07 | ok |
| 13 | Comparativo de medidas | `Ouroboros_24_telas-standalone.html` | `secao-a.jsx` | M07 | ok |
| 14 | FAB expandido (menu radial) | `Ouroboros_24_telas-standalone.html` | `secao-c.jsx` | M03 | ok |
| 15 | Humor rápido | `Ouroboros_24_telas-standalone.html` | `secao-b.jsx` | M05 | ok |
| 16 | Câmera scanner | `Ouroboros_24_telas-standalone.html` | `secao-c.jsx` | M06.5 | ok |
| 17 | Share intent (path .md visível) | `Ouroboros_24_telas-standalone.html` | `secao-c.jsx` | M09 | ok |
| 18 | Diário emocional (modo trigger) | `Ouroboros_24_telas-standalone.html` | `secao-b.jsx` | M08 | ok |
| 19 | Duas colunas (positivos / negativos) | `Ouroboros_24_telas-standalone.html` | `secao-b.jsx` | M07 | ok |
| 20 | Registro de evento com lugar | `Ouroboros_24_telas-standalone.html` | `secao-b.jsx` | M07 | ok |
| 21 | Mini humor (heatmap página cheia) | `Ouroboros_24_telas-standalone.html` | `secao-d.jsx` | M04 | ok |
| 22 | Finanças (modo leitura) | `Ouroboros_24_telas-standalone.html` | `secao-d.jsx` | M10 | ok |
| 23 | Ajustes (path .md visível) | `Ouroboros_24_telas-standalone.html` | `secao-d.jsx` | M13 | ok |
| 24 | Onboarding (3 frames) | `Ouroboros_24_telas-standalone.html` | `secao-d.jsx` | M15 | ok |
| 25 (namespace JSX) | Microfone com transcrição | `Ouroboros_24_telas-standalone.html` | `secao-e.jsx` | M06.5 | ok |
| 26 (namespace JSX) | Alarme / lembretes | `Ouroboros_24_telas-standalone.html` | `secao-e.jsx` | M16 | ok |
| 27 (namespace JSX) | To-do com tags por categoria | `Ouroboros_24_telas-standalone.html` | `secao-e.jsx` | M17 | ok |
| 28 (namespace JSX) | Contador "dias sem X" | `Ouroboros_24_telas-standalone.html` | `secao-e.jsx` | M18 | ok |
| 25 (namespace M00.6) | Calendário de conquistas | `Ouroboros_telas_25_26-standalone.html` | n/a (escrito à mão) | M11.5 | ok |
| 26 (namespace M00.6) | Widget homescreen | `Ouroboros_telas_25_26-standalone.html` | n/a (escrito à mão) | M20 | ok |

## 4. Conflito de numeração Tela 25/26

A tabela acima mostra que Tela 25 e Tela 26 existem em dois namespaces
distintos:

- **Namespace JSX (bundle de 22 telas):** Tela 25 = Microfone, Tela 26
  = Alarme. Definidos em `secao-e.jsx` antes da Sprint M19 ser
  rebaseada. Specs M06.5 e M16 referenciam essa numeração.
- **Namespace M00.6 (bundle de 2 telas):** Tela 25 = Calendário de
  conquistas, Tela 26 = Widget homescreen. Definidos em
  `Ouroboros_telas_25_26-standalone.html` durante a Sprint M00.6.
  Specs M11.5 e M20 referenciam essa numeração.

Os dois namespaces **não compartilham o mesmo bundle de saída**, então
em runtime visual nunca colidem. A ambiguidade é puramente documental e
afeta cerca de trinta referências em specs e checkpoints já fechados.

**Decisão de M19.x:** não renomear nada. A renomeação coordenada (que
exigiria patch atravessando ROADMAP, STATE, várias specs `MNN-spec.md`,
checkpoints visuais e CHANGELOG) fica como item explícito do escopo da
Sprint M19 final, junto com a regeneração do bundle.

Quando uma sprint nova precisa referenciar uma das Telas 25 ou 26,
**deve obrigatoriamente citar o namespace** ("Tela 25 namespace JSX" ou
"Tela 25 namespace M00.6") para evitar leitura ambígua.

## 5. Screenshots por sprint — fonte canônica do estado real

Para qualquer dúvida do tipo "o app hoje está parecido com o mockup?",
a resposta autoritativa **não é** o HTML standalone. É o screenshot
capturado no celular físico (Nível C) ou emulador (Nível B) durante o
checkpoint visual da sprint que entregou aquela tela.

Localização: `docs/sprints/MNN-screenshots/`. O checkpoint correspondente
em `docs/sprints/MNN-checkpoint-visual.md` documenta delta versus o
mockup e desvios aceitos.

Os bundles HTML existem como referência de design intent. Os
screenshots existem como prova de implementação. As duas coisas
divergem propositadamente em alguns pontos (revisões de tom, ajustes
de spacing, ADRs estéticos posteriores ao M00) e a divergência é
sempre documentada no checkpoint visual.

## 6. Toolchain de regeneração — pendente

Existe um stub em `scripts/build-mockups.mjs` que documenta o desafio.
A Sprint M19 final é dona de transformar esse stub em build real,
escolhendo entre três caminhos descritos lá: replicar primitivos com
esbuild + react-dom/server, reescrever o JSX-fonte de forma
auto-contida, ou adotar uma ferramenta externa equivalente.

Até lá, qualquer mudança visual nos mockups segue o protocolo:

1. Telas 01–24 e 25–28 namespace JSX → bundle de 22 telas frozen.
   Edição manual é desencorajada (arquivo é minificado e gigante).
   Referência primária: o JSX-fonte mais o screenshot da sprint dona.
2. Telas 25–26 namespace M00.6 → editar manualmente
   `Ouroboros_telas_25_26-standalone.html`. Estrutura HTML/CSS é
   legível e mantida à mão.

## 7. Histórico

- 2026-04-28 — bundle de 22 telas exportado por ferramenta externa de
  design durante a configuração inicial. Arquivo em
  `docs/Ouroboros_24_telas-standalone.html` é congelado a partir desse
  ponto. JSX-fonte preservado em `docs/design-canvas-export/project/`
  apenas como referência. Identificação da ferramenta original fica
  preservada em `docs/design-canvas-export/README.md`.
- 2026-05-01 — durante a Sprint M00.6 (checkpoint visual de retomada
  pós-pausa), constatado que regenerar o bundle exige reverse-engineering
  de primitivos proprietários. Criado
  `docs/Ouroboros_telas_25_26-standalone.html` à mão para hospedar as
  duas Telas novas. Achado registrado como "M19.x bundle HTML toolchain"
  no checkpoint M00.6.
- 2026-05-01 — Sprint M19.x formaliza este inventário e o stub do
  build script. Renomeação de namespaces e construção da toolchain real
  ficam para a Sprint M19 final.
