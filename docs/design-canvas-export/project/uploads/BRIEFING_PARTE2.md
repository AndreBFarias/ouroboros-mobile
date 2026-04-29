# Briefing Parte 2: User Flows e Lista de 18 Telas

```
DOC: BRIEFING_PARTE2.md
USO: cole no design_canvas como continuacao do briefing parte 1
LANG: PT-BR
```

---

## Decisoes recentes (overrides do briefing parte 1)

- **Dual muted scheme:** `--muted: #c9c9cc` para texto legivel, `--muted-decor:
  #6272a4` apenas para decoracao/hints/separadores
- **Filtro pessoa:** chip avatar circular 32dp permanente no canto direito do
  header. "A" `--purple`, "V" `--pink`, sobreposicao AV para "ambos". Tap
  expande dropdown inline com 3 opcoes
- **Tab "+":** abre menu radial de captura (nao navega)
- **Anotacoes wireframe:** sobrias em `--muted-decor`, fora do frame, label
  micro 11px. Sem amarelo redline
- **Path .md visivel apenas em:** Telas 06, 17, 23

---

## Os 4 user flows criticos

Desenhar como diagramas horizontais no topo do canvas, antes dos artboards
individuais. Cada flow mostra 3-6 telas conectadas por setas, com a acao do
usuario rotulando cada seta.

### Flow 1 - Comprovante de PIX via share sheet

Demonstra: zero friccao em entrada externa de dados.

```
[App do banco com PDF do PIX gerado]
     | tap "compartilhar"
     v
[Android share sheet nativo]
     | tap icone do Ouroboros
     v
[Tela 17 - receber arquivo]
     | preview + categoria detectada (pix) + pessoa
     | tap "salvar no inbox"
     v
[Toast verde "salvo"]
     | volta automatico pro app do banco
```

Detalhe critico: o app do Ouroboros NUNCA abre por completo. E uma tela
modal que aparece, processa, fecha. Tempo total: 5 segundos.

### Flow 2 - Registrar tristeza por conflito

Demonstra: captura emocional com contexto, sem desencorajar.

```
[Qualquer tela com FAB visivel]
     | tap FAB
     v
[Tela 14 - menu radial expandido]
     | tap TRIGGER (botao vermelho)
     v
[Tela 18 - diario emocional, modo trigger]
     | preencher: chips de emocao + intensidade
     | textarea "o que aconteceu?"
     | chips "com quem"
     | textarea estrategia de resposta + "funcionou?"
     | tap "registrar"
     v
[Toast "registrado. respira."]
     | volta pra tela anterior
```

### Flow 3 - Evento positivo com lugar

Demonstra: registrar momentos compartilhados rapidamente.

```
[Qualquer tela com FAB visivel]
     | tap FAB
     v
[Tela 14 - menu radial]
     | tap VITORIA (botao amarelo)
     v
[Tela 20 - registro de evento]
     | textarea "o que aconteceu?"
     | input "onde" + botao "usar localizacao atual"
     | chips "com quem" (vitoria pre-selecionada)
     | chip categoria
     | foto opcional
     | slider "como foi" 1-5
     | tap "registrar"
     v
[Toast "anotado. tao bom."]
```

### Flow 4 - Scanner de nota fiscal alta resolucao

Demonstra: captura por camera com OCR preview.

```
[Tela 14 - FAB expandido]
     | tap CAMERA (botao laranja)
     v
[Tela 16 - viewfinder com auto-deteccao de bordas]
     | apontar pro recibo, indicador "documento detectado"
     | tap captura (botao branco grande)
     v
[Sub-tela de preview do scanner]
     | imagem auto-deskew
     | OCR preview em ciano sobre os campos detectados
     | form: valor, data, descricao, categoria, pessoa
     | tap "salvar"
     v
[Toast "salvo em alta resolucao"]
     | volta pra tela anterior
```

---

## Lista oficial das 18 telas

Numeracao continua das 6 telas ja existentes (01-06). As 18 novas vao de 07
a 24, sequenciais.

### Secao A - Movimento e memorias (telas 07-13)

#### Tela 07 - Galeria de exercicios cadastrados
**Proposito:** navegar exercicios criados pelo usuario fora de contexto de
treino.
**Dados exibidos:**
- Header "galeria" + chip pessoa
- Filtros chips: todos, peito, costas, pernas, ombros, core, cardio
- Grid 2 colunas de cards 1:1 com GIF preview + nome em laranja
- Search opcional
- Botao secundario "+ novo" abre Tela 02
**Estado vazio:** "nenhum exercicio cadastrado ainda. toque + pra criar."

#### Tela 08 - Detalhe de exercicio
**Proposito:** ler instrucoes, ver historico, editar.
**Dados exibidos:**
- Header com voltar e nome em laranja
- GIF grande full width, aspect 1:1
- Chips de grupo muscular em ciano
- Linha "iniciante - halteres - 4 kg"
- Bloco instrucao em foreground
- Bloco dicas em muted, lista bullet
- Sparkline historico 12 execucoes
- "ultima vez: 23/04, 4 kg, 3x8" em muted
- Botoes: editar, adicionar a treino livre, excluir (red text)

#### Tela 09 - Heatmap de treinos (memorias)
**Proposito:** ver historico denso de treinos como heatmap GitHub-style.
**Dados exibidos:**
- Header "memorias" + chip pessoa
- Tabs: treinos (ativa) | fotos | marcos
- Heatmap 13 semanas x 7 dias
- Cores: vazio bg-elev, leve green 30%, medio green 60%, intenso green
- Hoje destacado com outline purple 2px
- Legenda "menos [|||||] mais"
- Stats: "26 treinos em 90 dias" cyan + "media 2/semana" muted
**Estado vazio:** "vai aparecer aqui assim que voce treinar."

#### Tela 10 - Modal de detalhe de dia passado
**Proposito:** ver o que foi feito num dia especifico.
**Dados exibidos:**
- Bottom sheet 60% altura
- Header "23 de abril, terca" laranja heading-2
- Subtitle "rotina B - 28 min - andre" cyan caption
- Lista compacta de exercicios: check verde + nome + "3x8 - 4 kg"
- Bloco observacoes em italic muted (se houver)
- Botoes: editar este treino, duplicar pra hoje

#### Tela 11 - Marcos (timeline gentil)
**Proposito:** ver conquistas sem gamificacao agressiva.
**Dados exibidos:**
- Header "marcos"
- Linha vertical bg-elev no esquerdo (timeline)
- Cards a direita do mais recente ao mais antigo:
  - Dot 12dp green na timeline
  - Card: data muted caption + frase do marco em foreground body
- Exemplos: "23/04: tres treinos nesta semana", "15/04: voltou apos 9 dias"
**Estado vazio:** "marcos vao aparecer com o tempo."
**Sem ranking, sem niveis, sem pontos.**

#### Tela 12 - Form de medidas corporais
**Proposito:** registrar 9 medidas semanais em <2 minutos.
**Dados exibidos:**
- Header "medidas - 28/04/2026" + chip pessoa
- Form 2 colunas, 9 campos: peso, cintura, peito, braco esq, braco dir,
  coxa esq, coxa dir, barriga, quadril
- Cada campo: label muted micro + input mono numerico + sufixo unidade
- Pre-preenchido com ultima medida em muted-decor
- Bloco fotos: 3 botoes 100x100dp (frente, costas, lado)
- Bloco reflexao: 3 textareas com prompts placeholder
- Botao "salvar" green full width fixo no bottom

#### Tela 13 - Comparativo de medidas
**Proposito:** ver evolucao + galeria comparativa de fotos.
**Dados exibidos:**
- Header "medidas" + chip pessoa
- Filtro periodo: 30d | 90d | tudo
- Grid 2 colunas de cards de medida:
  - Nome em laranja caption
  - Valor atual cyan heading-2
  - Sparkline 12 pontos
  - Delta vs primeira medida em muted (sem cor positiva/negativa)
- Bloco "fotos lado a lado": slider entre 2 datas, mostra frente/costas/lado
**Estado vazio:** "registre medidas pra comparar depois."

### Secao B - Estado interno (telas 15, 18, 19, 20)

#### Tela 15 - Form de humor rapido
**Proposito:** registrar humor em 30 segundos.
**Dados exibidos:**
- Bottom sheet 70% altura
- Header "humor agora" laranja heading-2 + chip pessoa
- 4 sliders horizontais: humor, energia, ansiedade, foco (1-5)
- Track bg-elev, fill purple, valor cyan ao lado
- Toggle "tomei medicacao"
- Input numero "horas de sono ontem"
- Chips multi-select de tags rapidas: trabalho_pesado, exercicio,
  social, sozinho, dormi_mal, ansiedade_alta, boa_conversa, conflito
- Textarea opcional 1 linha "uma frase sobre hoje"
- Botao "salvar" green

#### Tela 18 - Diario emocional com contexto
**Proposito:** registrar tristeza, alegria, raiva com contexto rico para
analise posterior e suporte terapeutico.
**Dados exibidos:**
- Bottom sheet 90% altura
- Header "registrar momento" laranja
- Toggle inicial: trigger (negativo) ou vitoria (positivo)
- Borda esquerda do form muda: red 2px (trigger) ou green 2px (vitoria)
- Grid 3x2 de chips de emocao multi-select:
  - Negativos: tristeza, raiva, ansiedade, frustracao, medo, solidao
  - Positivos: alegria, alivio, gratidao, conexao, paz, orgulho
- Slider intensidade 1-5
- Textarea livre "o que aconteceu?" max 5 linhas
- Chips "com quem": sozinho, com vitoria, com familia, no trabalho, outro
- BLOCO CONDICIONAL (so aparece se trigger):
  - Textarea "o que voce fez pra lidar?"
  - Toggle "funcionou?"
- Botao opcional "gravar audio" abre push-to-talk inline
- Botao final green (vitoria) ou pink (trigger)
- Rodape micro muted: "salvo localmente. ninguem ve alem de voces dois."

#### Tela 19 - Lista positivos e negativos do dia
**Proposito:** visao do dia em 2 colunas, facil de adicionar e revisar.
**Dados exibidos:**
- Header "hoje em duas colunas" + chip pessoa
- Filtro temporal chips: hoje | esta semana | este mes
- Layout 2 colunas verticais 50% cada:
  - Esquerda titulo "+ positivos" green heading-2
  - Direita titulo "- negativos" red heading-2
  - Cards mini com hora muted micro + texto curto body
  - Tap em card abre Tela 18 com dados pre-preenchidos
- Botao flutuante "+ adicionar" no fim de cada coluna
**Estado vazio por coluna:**
- Positiva: "registre algo bom de hoje."
- Negativa: "nada hoje. tudo bem."

#### Tela 20 - Registro de evento com lugar
**Proposito:** registrar "fui a tal lugar com vitoria" rapidamente.
**Dados exibidos:**
- Bottom sheet 80% altura
- Header "registrar evento" laranja
- Textarea "o que aconteceu" placeholder "uma linha sobre o que aconteceu."
- Bloco "onde":
  - Input texto livre
  - Botao "usar localizacao atual" abre permissao Android
  - Se permitido: chip cyan mostrando bairro/cidade detectados
- Bloco "quando": chip "agora" (default) | "outro horario" (time picker)
- Chips multi-select "com quem": vitoria (auto-selecionada se vault
  compartilhado), amigo, familia, sozinho, outro
- Chips categoria: exercicio, rolezinho, compras, consulta, trabalho,
  evento_social, rotina, outro
- Bloco fotos opcional: botao "+ adicionar foto" + thumbnails 60x60dp
- Slider "como foi?" 1-5
- Botao "registrar" green full width

### Secao C - Captura ativa (telas 14, 16, 17)

#### Tela 14 - FAB expandido (menu radial de captura)
**Proposito:** 6 capturas rapidas em 1 tap.
**Dados exibidos:**
- Overlay escuro 50% sobre a tela atual (preserva contexto visivel)
- FAB original rotacionado 45 graus (vira X)
- 6 botoes circulares 48dp em arco semicircular subindo do FAB:
  - HUMOR pink, icon heart-pulse
  - VOZ cyan, icon mic
  - CAMERA orange, icon camera
  - EXERCICIO green, icon dumbbell
  - VITORIA yellow, icon trophy
  - TRIGGER red, icon alert-triangle
- Cada botao com label embaixo em micro foreground
- Tap fora fecha o menu (slide-down 200ms)

#### Tela 16 - Camera scanner alta resolucao
**Proposito:** capturar recibos/PDFs com auto-deskew + OCR preview.
**Dados exibidos:**
- Tela full screen, viewfinder ao vivo
- Overlay com cantos de mira em cyan (auto-deteccao de documento)
- Indicador "documento detectado" aparece quando 4 cantos detectados
- Indicador resolucao no topo: "12 MP - alta qualidade"
- Bottom bar:
  - Galeria icon esquerda (40dp)
  - Botao captura grande centro (72dp redondo branco)
  - Flash toggle direita
- Modo continuo: 2 toques captura multiplas paginas

**Sub-tela apos captura (preview):**
- Imagem capturada com auto-deskew aplicado
- Overlay com texto OCR em cyan mono caption sobre os campos detectados
- Form de validacao:
  - "valor": input editavel pre-preenchido pelo OCR
  - "data": date picker pre-preenchida
  - "descricao": textarea pre-preenchida
  - "categoria": chip dropdown com sugestao OCR
  - "pessoa": chip andre/vitoria/ambos
- Botoes: regravar (outline) | salvar (green)

#### Tela 17 - Receber arquivo via share intent
**Proposito:** modal que aparece quando outro app envia arquivo via
share sheet do Android.
**Dados exibidos:**
- Modal full screen, fundo bg, header simples sem bottom tabs
- Header "salvar no inbox" laranja
- Preview do arquivo (top 50% da tela):
  - PDF: thumbnail primeira pagina + "PDF - 2 paginas"
  - Imagem: preview escala uniforme
  - Texto: primeiras 5 linhas mono caption
- Bloco "tipo detectado" - chips selecionaveis:
  - "comprovante de pix" (green selecionado)
  - "extrato bancario"
  - "exame medico"
  - "nota fiscal"
  - "outro"
- Bloco "destino no inbox":
  - **Path destino visivel em cyan mono caption:**
    `inbox/financeiro/pix/2026-04-28-hhmmss.pdf`
  - Atualiza dinamicamente conforme tipo selecionado
- Chip pessoa andre/vitoria/ambos
- Botao "salvar" green full width
- Botao "cancelar" texto muted

**Variante de conflito (arquivo similar ja existe):**
- Aviso yellow: "ja existe um arquivo com nome similar"
- Opcoes: renomear automaticamente | substituir | cancelar

### Secao D - Sistema e visualizacao (telas 21, 22, 23, 24)

#### Tela 21 - Mini humor (pagina cheia)
**Proposito:** versao mobile da pagina humor do dashboard desktop.
**Dados exibidos:**
- Header "humor" + chip pessoa (com modo "sobreposto" extra)
- Heatmap 90 dias 13x7
- Cores por nivel:
  - Sem registro: bg-elev
  - Humor 1: red 70%
  - Humor 2: orange 60%
  - Humor 3: yellow 60%
  - Humor 4: cyan 70%
  - Humor 5: green solid
- Tap em quadrado abre modal de registro do dia
- Stats: "media 30d: 3.4" cyan | "registros: 22 / 30" muted
- Modo sobreposto: heatmap andre + heatmap vitoria empilhados 50%
  opacity, intersecao mais escura
- Botao "registrar humor agora" no topo (atalho do FAB)

#### Tela 22 - Mini financeiro (somente leitura)
**Proposito:** consultar gastos sem abrir notebook.
**Dados exibidos:**
- Header "financas" laranja
- Banner micro muted: "modo leitura. edicao no desktop."
- Card hero:
  - "gasto esta semana" laranja caption
  - "R$ 487,30" cyan heading-1
  - "abaixo da media" muted caption (sempre neutro, nunca verde/vermelho)
- Card "top categorias":
  - Lista 5 itens com nome + valor + barra horizontal proporcional
  - Cor das barras: cyan (sem semantica)
- Lista das ultimas 20 transacoes:
  - Nome em body, categoria em caption muted
  - Valor cyan (despesa) ou green (credito)
  - Tap expande detalhes
- Sem botao de adicionar - readonly explicito
**Estado vazio:** "rode o pipeline no desktop pra carregar dados."

#### Tela 23 - Settings (configuracoes)
**Proposito:** controlar todos comportamentos do app.
**Dados exibidos:**
- Header "ajustes"
- Lista agrupada de toggles e selects:

**Secao "som e vibracao":**
- som ao concluir treino [toggle]
- vibracao ao concluir [toggle]
- som ao registrar humor [toggle]

**Secao "lembretes":**
- lembrete de medicacao [toggle + horario]
- lembrete de treino [toggle + horario]
- lembrete de humor diario [toggle + horario]

**Secao "pessoa":**
- pessoa ativa [radio: andre / vitoria]
- vault compartilhado [toggle]
- nota muted: "ambos veem todos os registros."

**Secao "sync":**
- Card status com indicador colorido:
  - Verde: "sincronizado ha 2 min"
  - Amarelo: "ha 25 min sem sincronizar"
  - Vermelho: "conflito detectado em 1 arquivo"
- **Path visivel em muted micro:** "ultimo: inbox/mente/humor/2026-04-28.md"
- Botao "forcar sync"
- Selector "metodo" radio: obsidian sync | syncthing
- Selector "qualidade scanner" radio: 8MP / 12MP / maxima dispositivo

**Secao "privacidade":**
- exigir biometria pra abrir [toggle]
- ocultar transcricoes na lista [toggle]
- botao "exportar todos meus dados"
- botao "limpar cache local" (texto muted)

**Secao "sobre":**
- "versao 0.1.0"
- link "ver no github" purple
- "licenca: GPL-3.0"

#### Tela 24 - Onboarding (3 frames sequenciais)
**Proposito:** primeiro uso, sem fricao, 3 telas e pronto.

**Frame 1 de 3 - "voce e quem?"**
- Tela limpa, fundo bg
- Pergunta "voce e quem?" em laranja heading-1
- Subtitle "voces compartilham um vault. so escolha." em muted
- Dois cards lado a lado, 160x200dp cada:
  - Card 1: avatar circular "A" purple 80dp + "andre" embaixo
  - Card 2: avatar circular "V" pink 80dp + "vitoria" embaixo
- Tap define pessoa ativa, avanca pro frame 2

**Frame 2 de 3 - "como deve te lembrar?"**
- Pergunta laranja "como deve te lembrar?"
- Subtitle muted "voce pode mudar depois."
- 3 opcoes empilhadas:
  - Card A: "todo dia, manha" + time picker (default 09:00)
  - Card B: "todo dia, noite" + time picker (default 21:00)
  - Card C: "so quando eu quiser"
- Card selecionado: borda 2px purple
- Botao "continuar" purple no bottom

**Frame 3 de 3 - "como sincroniza?"**
- Pergunta laranja "como sincroniza?"
- Subtitle muted "voce pode trocar nas configuracoes."
- 2 opcoes empilhadas:
  - Card A: "obsidian sync" (recomendado se ja paga) + descricao 2 linhas
  - Card B: "syncthing" (gratuito, p2p) + descricao 2 linhas
- Botao "comecar" purple full width
- Sem checklist longo, sem tour, sem video

Apos frame 3: app abre direto na Tela 01 (hoje).

---

## Resumo: 18 telas em 4 secoes

| Secao | Telas | Quantidade |
|-------|-------|------------|
| A - Movimento e memorias | 07, 08, 09, 10, 11, 12, 13 | 7 |
| B - Estado interno | 15, 18, 19, 20 | 4 |
| C - Captura ativa | 14, 16, 17 | 3 |
| D - Sistema e visualizacao | 21, 22, 23, 24 | 4 |
| **Total** | | **18** |

---

## Sequencia de entrega sugerida

1. **Diagramas dos 4 user flows** (no topo do canvas, antes dos artboards)
2. **Secao C - Captura ativa** (3 telas) - sao o core do "friccao zero"
3. **Secao B - Estado interno** (4 telas) - cobertura emocional
4. **Secao A - Movimento e memorias** (7 telas) - maior volume
5. **Secao D - Sistema e visualizacao** (4 telas) - finaliza

Cada artboard com estado vazio + estado preenchido lado a lado, anotacoes
sobrias em muted-decor fora do frame.

Pronto pra comecar.
