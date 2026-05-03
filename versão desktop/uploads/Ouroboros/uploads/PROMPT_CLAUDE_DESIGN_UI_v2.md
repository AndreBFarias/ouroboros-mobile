# Briefing de Redesign UI/UX — Protocolo Ouroboros Dashboard (v2)

```
DESTINO: Agente Claude focado em design (Claude.ai com Artifacts, Claude Code com skill frontend-design, ou desktop equivalente)
ENTREGÁVEL: ZIP estruturado contendo (1) tokens de design, (2) mockups HTML estáticos, (3) styleguide, (4) instruções de implementação para o Claude Code CLI consumir e aplicar no Streamlit real
LÍNGUA: PT-BR estrito em toda copy de UI, comentários e documentação. Acentuação completa obrigatória — sem palavras desacentuadas em texto de UI (ver `scripts/check_acentuacao.py` no repo).
VERSÃO: v2 — corrige defasagens da v1 vs. estado real do projeto em 2026-04-29
```

---

## QUEM ESTÁ FALANDO COM VOCÊ

Você é um agente de design trabalhando no projeto **Protocolo Ouroboros** — pipeline ETL pessoal de dados financeiros e documentos da vida adulta, escrito em Python + Streamlit, rodando local-first em Linux. O projeto está em produção, tem 2.066 testes verdes, 15 abas funcionais no dashboard, gauntlet anti-migue ativo, e segue uma cadeia de princípios formalizados em ADRs e meta-sprints.

Você não vai reinventar nada. Você vai **elevar o nível visual**, **organizar a navegação por domínios**, e **adicionar uma página nova (Inbox)** que materializa o paradigma agentic-first no UI. Você produz HTML/CSS/SVG estático, tokens, e um guia de implementação para o Claude Code CLI traduzir tudo isso para Streamlit.

Não escreva Python. Não toque no backend. Não invente nomes de página — use os nomes que já existem no projeto.

---

## ESTADO ATUAL — LEIA TODO ESTE BLOCO ANTES DE DESENHAR

### Stack visual

- Streamlit 1.x com tema customizado em `.streamlit/config.toml` (paleta Dracula).
- Plotly para gráficos.
- Sem componentes React custom.
- Widgets nativos: `st.tabs`, `st.dataframe`, `st.data_editor`, `st.metric`, `st.expander`, `st.sidebar`, `st.markdown(unsafe_allow_html=True)`.
- Drill-down via deeplink: `?cluster=<X>&tab=<Y>` na URL, persistente.

### As 15 abas reais (ordem do `src/dashboard/app.py`)

```
Cluster: Home
  1. Visão Geral
  2. Pagamentos
  3. Projeções
  4. Metas
  5. Contas
  6. Extrato

Cluster: Documentos
  7. Catalogação
  8. Completude
  9. Revisor                  ← Sprint D2: validação 4-way de transações
 10. Validação por Arquivo    ← Sprint VALIDAÇÃO-CSV-01: ETL × Opus × Humano por documento
 11. Busca Global
 12. Grafo + Obsidian

Cluster: Análise
 13. Categorias
 14. Análise
 15. IRPF
```

### Sprints relevantes que você precisa respeitar

| Sprint | O que entrega | Como afeta o redesign |
|---|---|---|
| `META-COBERTURA-TOTAL-01` | Lint AST + auditoria + contrato `ResultadoExtracao` | Schema canônico já existe — não invente outro |
| `VALIDAÇÃO-CSV-01` | CSV ETL × Opus × Humano + skill `/validar-arquivo` + aba Validação por Arquivo | A aba já existe — você redesenha, não cria |
| `D2 (Revisor 4-way)` | Aba Revisor para validação de transações | Coexiste com Validação por Arquivo, granularidades diferentes |
| `UX-123` | Mini-views no cluster Home com sufixo "hoje" | Padrão visual já estabelecido para tiles de Home |

### Princípios não-negociáveis do projeto

- **REGRA -1 (Anonimato absoluto)**: nenhum nome próprio, IA, marca ou pessoa em código, mockup, comentário ou copy. Slugs ASCII em snake_case (ex: `validacao_arquivos` é nome de módulo, não substitui "validação" em copy de UI).
- **ADR-13 (Paradigma agentic)**: a sessão Claude Code é parte do pipeline, não cliente externo dele. UI deve refletir isso — Inbox tem instrução visível pro humano abrir o terminal e rodar a skill.
- **Princípio D7 (Cobertura observável, não gate)**: nada bloqueia o pipeline; tudo é registrado e exposto na UI para inspeção humana. Estados visuais são "verde / amarelo / vermelho" mas nunca "sucesso / fracasso" — é "graduado / em calibração / regredindo".
- **Anti-migue gauntlet**: todo PR roda lint AST + auditoria de cobertura + 2.066+ testes. UI não pode introduzir caminhos opacos.
- **Acentuação completa**: existe `scripts/check_acentuacao.py` que falha CI se algum `.py` ou `.md` tiver "validacao" em vez de "validação". Em mockups HTML/JSON também. Sem exceção.

### Tom estético do dono

Gótico-cyberpunk. Paleta Dracula refinada. Tipografia mono para dados (`JetBrains Mono`), sans para texto (`Inter`). **Densidade alta** — ele é analista de BI, lê dashboards o dia inteiro, prefere "muito dado por pixel" a "espaço em branco generoso". Zero emoji em UI séria. Animações sutis ou nenhuma.

---

## O QUE VOCÊ VAI ENTREGAR (ESTRUTURA DO ZIP)

```
ouroboros-redesign-v1/
├── README.md                              # Sumário executivo + plano de ondas
├── tokens/
│   ├── colors.json                        # Paleta Dracula refinada
│   ├── typography.json
│   ├── spacing.json
│   └── shadows.json
├── streamlit-theme/
│   └── config.toml                        # .streamlit/config.toml proposto
├── mockups/
│   ├── 00-shell-navegacao.html            # Layout-mãe: sidebar com clusters + topbar
│   ├── 01-visao-geral.html                # Redesign da landing do cluster Home
│   ├── 07-catalogacao.html                # Redesign
│   ├── 09-revisor.html                    # Redesign (Sprint D2 — granularidade transação)
│   ├── 10-validacao-arquivos.html         # Redesign (Sprint VALIDAÇÃO-CSV-01 — granularidade documento)
│   ├── 16-inbox.html                      # NOVA aba — drag-drop + fila + instrução skill
│   ├── 15-irpf.html                       # Redesign — pacote IRPF é a feature-killer
│   └── _components/
│       ├── kpi-card.html
│       ├── diff-viewer.html               # 2 colunas para comparar JSONs
│       ├── confidence-badge.html
│       ├── document-thumbnail.html        # SVG inline por tipo, sem imagens raster
│       ├── domain-switcher.html
│       ├── d7-status-pill.html            # Pill "graduado / em calibração / regredindo"
│       └── sprint-tag.html                # Marcador discreto de qual sprint trouxe a feature
├── styleguide/
│   ├── styleguide.html                    # Página única demonstrando todos os componentes
│   └── grid-system.html
└── implementation/
    ├── INSTRUCOES_PARA_CLAUDE_CODE.md     # Como o agente CLI traduz HTML → Streamlit real
    ├── streamlit-component-mapping.md     # Cada bloco HTML → qual st.* usar
    └── css-injection-guide.md             # Como injetar CSS via st.markdown
```

---

## DIRETRIZES DE DESIGN

### 1. Navegação por domínio (preserva os clusters existentes)

O projeto já tem `MAPA_ABA_PARA_CLUSTER` em `src/dashboard/componentes/drilldown.py`. Sua proposta de sidebar deve **espelhar exatamente** os clusters atuais (Home, Documentos, Análise) e adicionar **Inbox** como cluster próprio (porque é entrada de dados, não consumo).

```
┌─────────────────────────────┐
│ ⌬ OUROBOROS                 │
├─────────────────────────────┤
│ ▼ INBOX           [3 pend.] │  ← cluster novo, badge dinâmico
│    └ Inbox                  │
│                             │
│ ▼ HOME                      │
│    ├ Visão Geral            │
│    ├ Pagamentos             │
│    ├ Projeções              │
│    ├ Metas                  │
│    ├ Contas                 │
│    └ Extrato                │
│                             │
│ ▼ DOCUMENTOS                │
│    ├ Catalogação            │
│    ├ Completude             │
│    ├ Revisor                │
│    ├ Validação por Arquivo  │
│    ├ Busca Global           │
│    └ Grafo + Obsidian       │
│                             │
│ ▼ ANÁLISE                   │
│    ├ Categorias             │
│    ├ Análise                │
│    └ IRPF                   │
└─────────────────────────────┘
```

Domínios futuros (Saúde, Garantias, Patrimônio) **não aparecem** ainda — só apareçam quando o backend tiver schema. Não polua o sidebar com placeholders.

### 2. Paleta Dracula refinada com cor de validação humana

```
--bg-base:        #0e0f15
--bg-surface:     #1a1d28
--bg-elevated:    #232735
--border-subtle:  #313445
--border-strong:  #4a4f63

--text-primary:   #f8f8f2
--text-secondary: #a8a9b8
--text-muted:     #6c6f7d

--accent-purple:  #bd93f9
--accent-pink:    #ff79c6
--accent-cyan:    #8be9fd
--accent-green:   #50fa7b
--accent-yellow:  #f1fa8c
--accent-orange:  #ffb86c
--accent-red:     #ff5555

# Estados D7 (cobertura observável, não gate)
--d7-graduado:    #6b8e7f   # mate, deliberadamente menos vibrante que --accent-green
--d7-calibracao:  #f1fa8c
--d7-regredindo:  #ffb86c
--d7-pendente:    #6c6f7d

# Estados de validação humana
--humano-aprovado:   #6b8e7f
--humano-rejeitado:  #ff5555
--humano-revisar:    #f1fa8c
```

Documente em `tokens/colors.json` com nomes semânticos. Cada token deve incluir contraste calculado contra `--bg-base` e `--bg-surface`.

### 3. Tipografia

- Headings: `Inter` 600.
- Corpo: `Inter` 400.
- Dados monetários, hashes, JSON, sha8, chaves NFe, CNPJ, CPF: `JetBrains Mono` 400/500.
- `font-variant-numeric: tabular-nums` em toda coluna numérica.
- Escala: 11/12/13/14/16/18/20/24/32/40 px.
- Self-host obrigatório (sem Google Fonts em produção).

### 4. Densidade alta

- Padding interno de cards: 12-16px.
- Linha de tabela: 32px de altura.
- Sidebar: 240px de largura.
- KPI tiles: 160-200px de largura, 96px de altura.

### 5. Aba 16 — Inbox (NOVA, mockup crítico)

Esta página **não existe** no projeto ainda. Você cria. Ela materializa ADR-13 no UI: o usuário coloca arquivos, vê a fila, e é orientado a abrir o terminal.

Layout vertical:

**Header (60px):**
- Título: "Inbox"
- Badge: "N arquivos aguardando extração agentic"
- Ação secundária: "Abrir pasta no gerenciador"

**Zona de drop (220px):**
- Caixa com `st.file_uploader` estilizado.
- Área tracejada com ícone central, hint: "Arraste PDF, imagem, CSV, XLSX, OFX..."
- Lista compacta dos tipos suportados pelos 21+ extratores.

**Fila de arquivos (resto):**
- Tabela densa: thumbnail (32x32 SVG por tipo) | filename | tamanho | sha8 | status | data registro | ação.
- Status: `aguardando` (cinza), `extraído` (verde-mate D7), `falhou` (vermelho), `pulado-duplicado` (amarelo).
- Ação por linha: `Ver sidecar` (abre painel lateral com JSON), `Re-registrar`.

**Painel lateral (deslizante, 480px à direita quando ativo):**
- Aba 1: JSON do sidecar `data/inbox/.extracted/<sha>.json`.
- Aba 2: comparação rápida com extração legacy se já existe.
- Aba 3: histórico de tentativas no `validacao_arquivos.csv` para esse sha8.

**Bloco de instrução fixo no rodapé (visível, não escondido):**

```
┌──────────────────────────────────────────────────────────────┐
│ Para extrair os arquivos pendentes:                          │
│                                                              │
│ 1. Abra o Claude Code CLI no terminal, na raiz do projeto.   │
│ 2. Digite: /validar-arquivo                                  │
│ 3. Volte aqui — a fila atualiza sozinha.                     │
│                                                              │
│ Por que terminal? ADR-13 — paradigma agentic.                │
│ Sem custo de API. Sem cron. Humano-no-loop deliberado.       │
└──────────────────────────────────────────────────────────────┘
```

Esse bloco é peça de design, não nota técnica escondida. Estilize com `--border-subtle` e tipografia mono.

### 6. Aba 10 — Validação por Arquivo (REDESIGN)

A aba já existe. Hoje é simples (`st.data_editor` + filtros). Você eleva. Layout em 4 zonas:

**Zona A — Barra de paridade global por tipo (80px):**
- Cards horizontais por `tipo_arquivo`: nome, total de docs, % graduado, sparkline 30 dias.
- Cor de fundo varia por estado D7. Clicável para filtrar.

**Zona B — Filtros (40px):**
- Tipo de arquivo, status humano, status Opus, intervalo de data.
- Toggle: "Apenas onde Opus e ETL discordam".

**Zona C — Tabela densa (40% da altura):**
- Colunas: thumbnail | filename | tipo | sha8 | data | campo | valor_etl | valor_opus | valor_humano | status_opus | status_humano | observações.
- Linha selecionável abre Zona D.
- Edição inline em `valor_humano`, `status_humano`, `observacoes_humano` via `st.data_editor` mantida.

**Zona D — Diff lado-a-lado (60% da altura quando ativa):**
- Coluna esquerda: card "REFERÊNCIA — OPUS" com JSON renderizado, syntax highlight, campos de baixa confiança em borda amarela.
- Coluna direita: card "ETL DETERMINÍSTICO" mesmo formato, com diff destacado.
- Topo: barra de ações `[Aprovar Opus]` `[Aprovar ETL]` `[Reprocessar com hint]` `[Marcar revisão humana]` + textarea de hint.
- Rodapé: timeline curta de decisões anteriores nesse sha8.

### 7. Aba 9 — Revisor (REDESIGN, distinção semântica)

A diferença Revisor × Validação por Arquivo precisa estar visualmente clara, porque granularidades diferentes confundem:

| | Revisor (Sprint D2) | Validação por Arquivo (VALIDAÇÃO-CSV-01) |
|---|---|---|
| Granularidade | Transação | Documento (sha8) |
| Pergunta | "Esta transação faz sentido?" | "O ETL extraiu igual ao Opus?" |
| 4-way | banco × extrator × categorizer × humano | ETL × Opus × Humano |
| Ação | Recategorizar, deduplicar, ajustar | Aprovar referência, melhorar ETL |

Adicione em ambas as abas um bloco "Quando usar esta aba" no topo, colapsável, claro. Tag visual `sprint-tag.html` no header indicando origem (D2 vs VALIDAÇÃO-CSV-01).

### 8. Aba 15 — IRPF (REDESIGN, feature-killer)

Esta é a aba que justifica o projeto inteiro pra qualquer pessoa que não é o dono. Foque em **gerar pacote IRPF** como ação primária:

- Header com seletor de ano fiscal e botão grande "Gerar pacote IRPF <ano>".
- Métricas: total de despesas dedutíveis, total de despesas médicas, total de educação, INSS pago, total de previdência.
- Lista de fichas IRPF mapeadas (Pagamentos Efetuados, Bens e Direitos, Rendimentos Tributáveis, Rendimentos Isentos).
- Por ficha: tabela de comprovantes vinculados, com link para o PDF original em `data/inbox/.processed/<YYYY-MM>/`.
- Bloco de gaps: "5 documentos sem `irpf_tag_sugerida` para 2025 — clique para revisar".

### 9. Componentes reusáveis (em `_components/`)

Cada componente é um HTML standalone que pode ser embed em qualquer página:

- **kpi-card**: número grande mono 32px, label em caps tracked 11px, delta com seta + cor contextual.
- **diff-viewer**: 2 colunas com sync de scroll, gutter `+/-`, syntax highlight JSON.
- **confidence-badge**: pill 0-100, fundo gradua verde-mate / amarelo / laranja / vermelho.
- **document-thumbnail**: 32x32 ou 96x96 SVG inline por `tipo_arquivo`. Sem imagens raster.
- **domain-switcher**: tabs grandes na topbar.
- **d7-status-pill**: pill "graduado / em calibração / regredindo / pendente" com tooltip explicativo.
- **sprint-tag**: marcador discreto monocromático que mostra qual sprint trouxe a feature (ex: `D2`, `VALIDAÇÃO-CSV-01`). Hover revela link para `docs/sprints/concluidos/`.

### 10. Acessibilidade

- Contraste AA mínimo, AAA preferido em texto de corpo.
- Focus rings 2px em `--accent-purple`.
- Atalhos: `g h` (Visão Geral), `g i` (Inbox), `g v` (Validação por Arquivo), `g r` (Revisor), `g f` (IRPF), `/` (busca global), `?` (ajuda).
- Estados de loading com `aria-busy`.
- Tabelas com `role="table"` e `<th scope>`.

---

## INSTRUCOES_PARA_CLAUDE_CODE.md (o arquivo mais importante do ZIP)

Você escreve este documento. Ele é lido pelo Claude Code CLI que vai aplicar tudo no Streamlit. Conteúdo obrigatório:

1. **Sumário em 5 bullets** — qual problema o redesign resolve.
2. **Mapa de arquivos** — cada mockup → arquivo Streamlit real (use os caminhos verdadeiros: `src/dashboard/paginas/visao_geral.py`, `src/dashboard/paginas/validacao_arquivos.py`, etc.).
3. **Como injetar CSS custom** — bloco completo `st.markdown(<style>...</style>, unsafe_allow_html=True)` carregando os tokens. Snippet pronto.
4. **Componentes via `streamlit-elements` ou `streamlit-extras`** — liste, justifique, dê fallback se o dono recusar nova dependência.
5. **`.streamlit/config.toml` proposto completo.**
6. **Plano de migração em 4 ondas** (cada onda fecha como uma sprint própria — ver REDESIGN-DASHBOARD-01).
7. **Critério de "feito" por onda** — gauntlet, snapshots, rota de teste manual.
8. **Guarda de sincronia** — ao adicionar/remover aba, lembre o agente Claude Code que existem 3 lugares para atualizar: `ABAS_POR_CLUSTER`, `MAPA_ABA_PARA_CLUSTER` em `src/dashboard/componentes/drilldown.py`, e contadores em `tests/test_dashboard_app.py::test_mapa_aba_para_cluster_cobre_15_abas` (esse contador subirá para 16 quando Inbox entrar).
9. **Não-fazer** — não trocar Plotly, não adicionar React, não quebrar URLs deeplink, não tocar em `mappings/*.yaml` sem sprint própria, não introduzir nome de IA/marca/pessoa em copy ou mockup.

---

## RESTRIÇÕES INVIOLÁVEIS

- ❌ Sem dependências JS pesadas em produção. Tailwind CDN é tolerado em mockup HTML mas **não** no Streamlit final.
- ❌ Sem fontes externas em runtime. Self-host Inter e JetBrains Mono via diretório `assets/fonts/`.
- ❌ Sem ícones com licença restritiva. Use Lucide (MIT) ou desenhe SVG custom.
- ❌ Sem imagens raster. SVG ou CSS puro.
- ❌ Sem nome de pessoa, IA, fornecedor ou marca em copy, mockup ou comentário. Anonimato total (REGRA -1).
- ❌ Sem texto em inglês na UI. PT-BR estrito com acentuação completa. "Inbox", "sprint", "deeplink", "skill" são jargões técnicos do projeto e ficam.
- ❌ Sem caminho que esconda dado do humano. Princípio D7: tudo observável.
- ❌ Sem ação destrutiva sem confirmação dupla.

---

## PRIMEIRA AÇÃO

Antes de desenhar qualquer pixel:

1. Confirme em 5 linhas: o problema, a inversão agentic-first (ADR-13), a distinção Revisor × Validação por Arquivo, a navegação por cluster, e o papel do Inbox novo.
2. Pergunte ao dono UMA coisa que ainda esteja ambígua. Apenas uma. Se não houver, pule.
3. Comece por `tokens/` e `styleguide/`. Sem tokens, qualquer mockup é chute.
4. Em seguida, em ordem: `00-shell-navegacao.html`, `16-inbox.html`, `10-validacao-arquivos.html`, `09-revisor.html`. Essas quatro justificam o ZIP — se elas estão boas, o resto segue.
5. Empacote o ZIP só quando todas as 18 peças do mapa estiverem prontas. Não entregue parcial.

---

*"O código pertence a quem o executa, não a quem o escreve."*
*"Cobertura observável, não gate."*
