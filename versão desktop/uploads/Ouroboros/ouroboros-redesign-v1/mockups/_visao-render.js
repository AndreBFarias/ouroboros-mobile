// Render — Visão Geral (cluster Home)
montarShell({
  clusterAtivo: 'home', abaAtiva: 'visao-geral',
  breadcrumb: ['Ouroboros', 'Visão Geral'],
  acoes: [
    { label: 'Atualizar', icon: 'refresh' },
    { label: 'Ir para Validação', icon: 'expand', primary: true },
  ],
});

const ouroboros = `
<svg viewBox="0 0 220 220" width="220" height="220" fill="none">
  <defs><linearGradient id="og" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#bd93f9"/><stop offset="100%" stop-color="#ff79c6"/></linearGradient></defs>
  <circle cx="110" cy="110" r="80" stroke="url(#og)" stroke-width="1.2" stroke-dasharray="2 4" opacity=".4"/>
  <circle cx="110" cy="110" r="62" stroke="url(#og)" stroke-width="2"/>
  <path d="M 110 48 A 62 62 0 1 1 60 138" stroke="url(#og)" stroke-width="3" stroke-linecap="round"/>
  <polygon points="60,138 52,128 68,128" fill="#ff79c6"/>
  <text x="110" y="115" text-anchor="middle" font-family="ui-monospace" font-size="11" fill="#bd93f9" letter-spacing="2">OUROBOROS</text>
  <text x="110" y="132" text-anchor="middle" font-family="ui-monospace" font-size="9" fill="#7c7e8c" letter-spacing="1">extrai · valida · cataloga</text>
</svg>`;

const cluster = (file, ic, nome, desc, s1, v1, s2, v2) => `
  <a class="cluster-card" href="${file}">
    <div class="head"><span class="ic">${glyph(ic,18)}</span><h3>${nome}</h3></div>
    <div class="desc">${desc}</div>
    <div class="stats"><span><strong>${v1}</strong>${s1}</span><span><strong>${v2}</strong>${s2}</span></div>
  </a>`;

const tlItem = (when, ic, what) =>
  `<div class="tl-item"><span class="when">${when}</span><span class="ic">${glyph(ic,16)}</span><span class="what">${what}</span></div>`;

document.getElementById('main-root').innerHTML = `
  <div class="hero">
    <div>
      <span class="marca">SISTEMA AGENTIC-FIRST · v0.4 · MAR/2026</span>
      <h1>Os arquivos da sua vida financeira, normalizados.</h1>
      <p>Pipeline auto-referente. Cada arquivo é registrado pelo sha256, extraído em duas vias (ETL determinística + Opus agentic), validado por humano-no-loop, e catalogado para análise. Sprint atual: <code style="color:var(--accent-purple);">VALIDAÇÃO-CSV-01</code> — medindo paridade entre as duas extrações.</p>
    </div>
    <div class="ouroboros">${ouroboros}</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi up"><span class="l">Arquivos catalogados</span><span class="v">439</span><span class="d">+12 nas últimas 24h · 7 tipos</span></div>
    <div class="kpi"><span class="l">Paridade ETL ↔ Opus</span><span class="v">76%</span><span class="d">Meta sprint: 90% · em calibração</span></div>
    <div class="kpi warn"><span class="l">Aguardando humano</span><span class="v">23</span><span class="d">8 divergências · 15 baixa confiança</span></div>
    <div class="kpi bad"><span class="l">Skills regredindo</span><span class="v">2</span><span class="d">recibo_medico · cupom_fiscal</span></div>
  </div>

  <div class="dual">
    <div>
      <h2 style="font-family:var(--ff-mono);font-size:var(--fs-13);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin:0 0 var(--sp-2);">Os 5 clusters</h2>
      <div class="cluster-grid">
        ${cluster('16-inbox.html','inbox','Inbox','Entrada de dados. Drop por sha8.','aguardando','4','na fila','12')}
        ${cluster('10-validacao-arquivos.html','diff','Apuração','Valida arquivo-a-arquivo e transação-a-transação.','paridade','76%','pendentes','23')}
        ${cluster('07-catalogacao.html','folder','Catalogação','Banco normalizado. Consulta e relacionamento.','arquivos','439','transações','2.8k')}
        ${cluster('15-irpf.html','docs','Aplicações','Saídas. Pacote IRPF, relatórios, exportação.','app ativa','1','meta','★')}
        ${cluster('00-shell-navegacao.html','analise','Sistema','Skills, métricas, runs, ADRs, configuração.','skills','14','ADRs','9')}
        ${cluster('01-visao-geral.html','home','Home (aqui)','KPIs, sprint, atividade recente.','cluster','0','dia','hoje')}
      </div>
    </div>

    <div>
      <h2 style="font-family:var(--ff-mono);font-size:var(--fs-13);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin:0 0 var(--sp-2);">Atividade recente</h2>
      <div class="card" style="padding:var(--sp-4);">
        <div class="timeline">
          ${tlItem('14:32','upload','<strong>extrato_nubank_cc_2026-03.pdf</strong> registrado · <code>a3f9c1e2</code>')}
          ${tlItem('14:35','diff','Opus extraiu <code>b7d2a04f</code> com confiança 71% · <strong style="color:var(--accent-yellow);">divergência</strong>')}
          ${tlItem('13:52','check','Sprint <strong>VALIDAÇÃO-CSV-01</strong>: paridade 73% → 76%')}
          ${tlItem('12:10','warn','Skill <strong>recibo_medico</strong> regrediu para D7 41%')}
          ${tlItem('11:08','folder','12 arquivos catalogados · pipeline rodou em <code>43s</code>')}
          ${tlItem('09:00','info','ADR-13 ratificado: sessão de IA é parte do pipeline')}
        </div>
      </div>

      <h2 style="font-family:var(--ff-mono);font-size:var(--fs-13);letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin:var(--sp-5) 0 var(--sp-2);">Sprint atual</h2>
      <div class="card" style="padding:var(--sp-4);">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--sp-3);">
          <div>
            <div style="font-family:var(--ff-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);">Sprint 4 · 2026-04-22 → 2026-05-06</div>
            <div style="font-family:var(--ff-mono);font-size:18px;font-weight:500;margin-top:4px;">VALIDAÇÃO-CSV-01</div>
          </div>
          <span class="pill pill-d7-calibracao">em calibração</span>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">Ativar comparação ETL × Opus em todos os tipos de arquivo. Ler hints. Catalogar padrões. <strong style="color:var(--text-primary);">Próximo dia 6</strong>: review de paridade e graduação de skills D7 ≥ 90%.</div>
      </div>
    </div>
  </div>
`;
hidratarGlyphs(document.getElementById('main-root'));
