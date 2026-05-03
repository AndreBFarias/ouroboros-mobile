# Prompt para Claude Design — UI/UX `painel-mec`

> **Como usar**: cole o conteúdo abaixo (a partir de `## Briefing`) numa nova conversa do Claude Design (claude.ai/design ou claude.com/design). Anexe screenshots dos PDFs `funciona.pdf` e `antes_de_arrumar.pdf` que você tem do Looker atual. Anexe também o brasão e o logo do MEC se tiver, ou aponte para `https://www.gov.br/mec/pt-br`.

---

## Briefing

Estou refazendo um dashboard governamental que hoje vive em Looker Studio com 65 páginas distribuídas em 6 abas. O Looker tem limitações severas (mapas que não renderizam, gráficos pobres, exportação de PDF quebrada). Estou migrando para Streamlit + BigQuery + Plotly + Folium. Preciso da sua ajuda no **design system** e nos **mockups das telas**.

O contexto: este é um dashboard do Ministério da Educação do Brasil (MEC), via Secretaria de Gestão da Informação, Inovação e Avaliação de Políticas Educacionais (SEGAPE). Identidade visual padrão `gov.br`: azul institucional `#1351B4`, fontes da família `Rawline`/`Raleway`, brasão da República + logo MEC. O objetivo é manter aceitação institucional (designers do governo precisam reconhecer como "do gov.br") mas modernizar onde for possível.

## Identidade visual a importar

Crie um design system com estes tokens:

**Cores primárias:**
- `--primary-blue: #1351B4` (govbr azul institucional)
- `--primary-blue-dark: #0C326F`
- `--primary-blue-light: #5992ED`
- `--accent-yellow: #FFCD07` (govbr amarelo, usado com parcimônia)
- `--accent-green: #168821` (govbr verde, para indicadores positivos)
- `--accent-red: #E52207` (govbr vermelho, para indicadores negativos)

**Cores neutras:**
- `--gray-90: #1B1B1B` (texto principal)
- `--gray-60: #555555` (texto secundário)
- `--gray-30: #CCCCCC` (bordas)
- `--gray-10: #F8F8F8` (background painel)
- `--white: #FFFFFF`

**Tipografia:**
- Família principal: `Rawline` (fallback `Raleway`, fallback `system-ui`)
- Pesos: 300, 400, 500, 600, 700
- Escalas: 12px (caption), 14px (body), 16px (default), 20px (h3), 24px (h2), 32px (h1), 48px (KPI)

**Espaçamento:**
- Sistema de 4px (4, 8, 12, 16, 24, 32, 48, 64)
- Cards com border-radius 8px
- Sombras suaves (`0 1px 3px rgba(0,0,0,0.08)`)

## Telas que preciso

### 1. Header global (componente reusável)
Persistente em todas as 6 páginas. Conteúdo:
- Esquerda: logo MEC + brasão da República em SVG
- Centro-esquerda: breadcrumb "Brasil > [UF] > [Município]" se houver filtro ativo
- Centro-direita: dois indicadores grandes lado a lado:
  - **População (2025)**: número grande + ícone IBGE
  - **NSE (2023)**: número grande + ícone INEP
- Direita: botão verde "Painel Estratégico" (link), botão "Limpar Filtros", botão primário "Gerar Relatório"

Inspire-se no header atual (anexo `funciona.pdf`, página 1, topo) mas modernize: tipografia mais leve, sombra sutil em vez de borda dura, espaçamento mais generoso.

### 2. Barra de navegação entre as 6 abas
Horizontal, abaixo do header. Cada aba é um pill com ícone + nome:
- 🎓 Educação Básica - 1
- 🏫 Educação Básica - 2
- 📚 Educação Básica - 3
- 💰 Financiamento - 4
- 🎯 EPT/ Superior - 5
- 📈 Novo PAC - 6

Aba ativa: fundo `--primary-blue`, texto branco. Inativa: fundo branco, texto `--primary-blue`, hover com fundo `--gray-10`.

### 3. Barra de filtros global (sticky)
Logo abaixo da nav. Três campos:
- Selectbox "Estado" (com opção "Todos")
- Selectbox "Município" (filtra por UF selecionada; com opção "Todos")
- Selectbox "Esfera" (Municipal / Estadual / Federal / Privada / Todas)

Valor selecionado refletido em chips removíveis (X) à direita. Quando "Todos" + "Todos", chip único: "Brasil".

### 4. Layout de página de painel (template para as 6)
Grid de 12 colunas, gutter 24px. Padrões:
- **Cards de KPI** (3 ou 4 por linha, 3 colunas cada): número grande no topo, label embaixo, fonte da informação em cinza pequeno no rodapé do card
- **Cards de gráfico** (variável, 4-12 colunas): título à esquerda, ícone de info à direita (tooltip com fonte), gráfico Plotly preenchendo o card, fonte abaixo
- **Cards de mapa** (geralmente 6 colunas): título, controles de zoom no canto, legenda flutuante no canto inferior, mapa coroplético

Mostre o esqueleto da página "Educação Básica - 1" como exemplo concreto, replicando aproximadamente o layout do `funciona.pdf` página 1, mas com a estética nova.

### 5. Modal de exportação de PDF
Quando usuário clica "Gerar Relatório", abre modal com 3 opções em cards selecionáveis:

- **Avulso** (radio default): "Gerar PDF do município atualmente filtrado". Mostra qual município. Botão "Gerar agora" (síncrono, ~30-60s, com progress bar).
- **Lote por estado**: "Gerar 1 PDF para cada município de [UF]". Mostra contador (ex: "78 municípios em GO"). Botão "Iniciar lote". Avisa que vai demorar e usuário recebe link quando pronto.
- **Lote nacional**: "Gerar 1 PDF para cada um dos 5570 municípios do Brasil". Aviso destacado de tempo estimado (~12h) e que será entregue em arquivos `.tar.gz` por UF. Botão secundário, requer confirmação.

### 6. Tela de status de lote (assíncrona)
Quando lote rodando: dashboard simples mostrando:
- Progresso geral (barra)
- Progresso por UF (lista com ícones de status: ⏳ pendente, 🔄 processando, ✅ pronto, ⚠️ erro)
- Tempo estimado restante
- Botão "Baixar parcial" (pra UFs já completas)

### 7. Estados especiais
- **Loading de página**: skeleton dos cards com shimmer
- **Erro de query BigQuery**: card vermelho discreto no lugar do gráfico, com mensagem técnica colapsada e botão "Tentar de novo"
- **Sem dados pro filtro**: ilustração simples (não emoji) + "Não há dados para [filtro]" + sugestão de filtro alternativo
- **Conexão lenta**: toast no topo "Carregando dados (BigQuery está lento hoje)..."

### 8. Footer
Discreto. Conteúdo:
- "Elaborado pela Secretaria de Gestão da Informação, Inovação e Avaliação de Políticas Educacionais (SEGAPE/ME)."
- "O Padrão Digital de Governo utiliza as licenças CC0 1.0 Universal e MIT."
- Data de última atualização dos dados (vinda de query)
- Link discreto pro repositório

## Acessibilidade

- Contrastes WCAG AA mínimo (texto sobre fundo deve ter ratio ≥ 4.5:1)
- Foco visível em todos os elementos interativos (outline azul de 2px)
- Suporte a navegação por teclado (Tab, Enter, Esc no modal)
- ARIA labels em ícones-só-ícone
- Modo escuro opcional (versão dos tokens com inversão; pode ser fase 2)

## O que quero de output

1. **Design system completo** publicado, que outros projetos do MEC possam reusar
2. **Mockups interativos** (clicáveis entre estados) das 8 telas listadas
3. **Handoff bundle** pronto para passar pro Claude Code (que vai implementar em Streamlit) — com tokens em CSS vars e referências aos componentes Streamlit equivalentes (`st.metric`, `st.plotly_chart`, etc.)

## Restrição importante

Tudo em português. Labels, mensagens, tooltips, footer. Sem placeholder em inglês ("Lorem ipsum" tudo bem como dummy text mas labels finais em PT-BR).

## Referências anexas

- `funciona.pdf` (6 páginas) — como o painel atual fica QUANDO consegue renderizar (caso raro, depois de gambiarra de navegação manual)
- `antes_de_arrumar.pdf` — como ele fica quando NÃO consegue (cheio de "Erro do sistema"). Use isso como prova de que precisamos de algo mais robusto.

Comece pelo design system, valide comigo os tokens, depois siga para as telas.
