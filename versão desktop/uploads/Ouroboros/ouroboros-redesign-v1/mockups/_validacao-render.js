// Render — Validação por Arquivo (VALIDAÇÃO-CSV-01)
montarShell({
  clusterAtivo: 'apuracao',
  abaAtiva: 'validacao-arquivos',
  breadcrumb: ['Ouroboros', 'Apuração', 'Validação por Arquivo'],
  acoes: [
    { label: 'Salvar progresso', icon: 'save', primary: true },
    { label: 'Exportar CSV de divergências', icon: 'download' },
  ],
});

// Sparklines em SVG.
function sparkSvg(arr, color) {
  const w = 100, h = 18;
  const min = Math.min(...arr), max = Math.max(...arr);
  const span = Math.max(0.01, max - min);
  const pts = arr.map((v,i) => `${(i/(arr.length-1))*w},${h - ((v-min)/span)*h}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="spark"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.2"/></svg>`;
}

// Zona A — paridade global por tipo
const zonaA = VALIDACAO_TIPOS.map(t => {
  const cor = t.d7 === 'graduado' ? 'var(--d7-graduado)'
            : t.d7 === 'calibracao' ? 'var(--d7-calibracao)'
            : 'var(--d7-regredindo)';
  const sel = t.tipo === 'fatura_cartao' ? 'sel' : '';
  return `
    <div class="tipo-tile ${sel}" data-d7="${t.d7}" data-tipo="${t.tipo}" onclick="selecionarTipo('${t.tipo}', this)">
      <div class="nome">${t.tipo}</div>
      <div style="display:flex;align-items:baseline;gap:8px;">
        <div class="v">${Math.round(t.pct*100)}%</div>
        <div class="pct">${Math.round(t.total*t.pct)}/${t.total}</div>
      </div>
      ${sparkSvg(t.spark, cor)}
    </div>`;
}).join('');

// Zona C — tabela densa de linhas
function statusOpusPill(s) {
  if (s === 'ok')           return `<span class="pill pill-d7-graduado">ok</span>`;
  if (s === 'divergente')   return `<span class="pill pill-humano-rejeitado">divergente</span>`;
  if (s === 'apenas_opus')  return `<span class="pill pill-d7-calibracao">só Opus</span>`;
  if (s === 'apenas_etl')   return `<span class="pill pill-humano-rejeitado">só ETL</span>`;
  return `<span class="pill pill-d7-pendente">${s}</span>`;
}
function statusHumanoPill(s) {
  if (s === 'ok')      return `<span class="pill pill-humano-aprovado">aprovado</span>`;
  if (s === 'revisar') return `<span class="pill pill-humano-revisar">revisar</span>`;
  return `<span class="pill pill-humano-pendente">pendente</span>`;
}
function confBadge(c) {
  const pct = Math.round(c*100);
  const cor = c >= 0.85 ? 'var(--d7-graduado)' : c >= 0.65 ? 'var(--d7-calibracao)' : 'var(--d7-regredindo)';
  return `<span style="font-family:var(--ff-mono);font-size:11px;color:${cor};">${pct}%</span>`;
}

const zonaC = VALIDACAO_LINHAS.map(l => `
  <tr ${l.id === VALIDACAO_DIFF.selectedId ? 'style="background:rgba(189,147,249,0.06);"' : ''} onclick="selecionarLinha(${l.id})">
    <td class="col-mono" style="color:var(--text-muted);">${l.sha8}</td>
    <td>${l.filename}</td>
    <td><span class="pill" style="background:var(--bg-inset);color:var(--text-secondary);border-color:var(--border-subtle);">${l.tipo}</span></td>
    <td class="col-mono" style="color:var(--text-secondary);">${l.campo}</td>
    <td class="col-num" style="font-family:var(--ff-mono);">${l.valor_etl}</td>
    <td class="col-num" style="font-family:var(--ff-mono);${l.status_opus==='divergente'?'color:var(--accent-yellow);':''}">${l.valor_opus}</td>
    <td class="col-num" style="font-family:var(--ff-mono);color:var(--text-muted);">${l.valor_humano || '—'}</td>
    <td>${statusOpusPill(l.status_opus)}</td>
    <td>${statusHumanoPill(l.status_humano)}</td>
    <td>${confBadge(l.conf)}</td>
    <td><textarea class="hint-textarea" placeholder="hint para Opus…">${l.obs}</textarea></td>
    <td>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-icon btn-sm" title="Aprovar Opus">${glyph('check',12)}</button>
        <button class="btn btn-icon btn-sm" title="Aprovar ETL">${glyph('arrow-left',12)}</button>
        <button class="btn btn-icon btn-sm" title="Rejeitar ambos">${glyph('close',12)}</button>
      </div>
    </td>
  </tr>
`).join('');

// Diff: monta JSON colorido com linhas divergentes
function jsonLinhas(obj, outroObj) {
  const keys = Object.keys(obj.campos);
  const linhas = [];
  let ln = 1;
  linhas.push({ kind:'plain', txt: '{' });
  linhas.push({ kind:'plain', txt: `  "sha8": "${obj.sha8}",` });
  linhas.push({ kind:'plain', txt: `  "tipo_arquivo": "${obj.tipo_arquivo}",` });
  if (obj.extrator)  linhas.push({ kind:'plain', txt: `  "extrator": "${obj.extrator}",` });
  if (obj.extrator_referencia) linhas.push({ kind:'plain', txt: `  "extrator_referencia": "${obj.extrator_referencia}",` });
  if (obj.versao)    linhas.push({ kind:'plain', txt: `  "versao": "${obj.versao}",` });
  linhas.push({ kind:'plain', txt: `  "campos": {` });
  keys.forEach((k, i) => {
    const v = obj.campos[k];
    const v2 = outroObj.campos[k];
    const dif = String(v) !== String(v2);
    const isSemico = i === keys.length - 1 ? '' : ',';
    const line = `    "${k}": ${typeof v === 'number' ? v : '"' + v + '"'}${isSemico}`;
    linhas.push({ kind: dif ? 'diff' : 'plain', txt: line });
  });
  linhas.push({ kind:'plain', txt: '  }' });
  linhas.push({ kind:'plain', txt: '}' });
  return linhas.map((l, i) => {
    const cls = l.kind === 'diff' ? 'add' : '';
    return `<span class="line ${cls}"><span class="gut">${i+1}</span>${l.txt}</span>`;
  }).join('');
}

// Mount Zona D depois (chamamos render).
function renderDiff() {
  const opusHtml = jsonLinhas(VALIDACAO_DIFF.opus, VALIDACAO_DIFF.etl).replace(/(add)/, 'add'); // marcador add no Opus
  // converter linhas divergentes do ETL como 'del'
  const etlHtml  = jsonLinhas(VALIDACAO_DIFF.etl, VALIDACAO_DIFF.opus).replace(/class="line add"/g, 'class="line del"');
  document.getElementById('diff-mount').innerHTML = `
    <div class="diff-head">
      <div>
        <h3>${VALIDACAO_DIFF.opus.sha8} · fatura_c6_cartao_2026-03.pdf</h3>
        <div style="font-size: var(--fs-12); color: var(--text-muted); margin-top: 2px;">
          campo divergente: <code>total_fatura</code> · confiança Opus: 71%
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-sm">${glyph('eye',14)} Abrir PDF</button>
        <button class="btn btn-sm">${glyph('refresh',14)} Re-processar Opus</button>
        <button class="btn btn-sm btn-primary">${glyph('check',14)} Marcar Opus como verdade</button>
      </div>
    </div>
    <div class="diff-cols">
      <div class="diff-card">
        <div class="head"><span>ETL — c6_cartao v1.8.2</span><span style="color:var(--diff-removed-gutter);">${glyph('cog',12)} determinístico</span></div>
        <div class="diff-body">${etlHtml}</div>
      </div>
      <div class="diff-card">
        <div class="head"><span>Opus — referência</span><span style="color:var(--diff-added-gutter);">${glyph('sparkle',12)} agentic</span></div>
        <div class="diff-body">${opusHtml}</div>
      </div>
    </div>
    <div class="timeline">
      <div class="timeline-evt">${glyph('upload',12)} 14:32 · registrado</div>
      <div class="timeline-evt">${glyph('cog',12)} 14:32 · ETL c6_cartao v1.8.2</div>
      <div class="timeline-evt">${glyph('sparkle',12)} 14:35 · Opus extraiu (71%)</div>
      <div class="timeline-evt" style="border-color:var(--accent-yellow);color:var(--accent-yellow);">${glyph('warning',12)} divergência: total_fatura</div>
      <div class="timeline-evt" style="opacity:.4;">aguardando humano…</div>
    </div>
  `;
  hidratarGlyphs(document.getElementById('diff-mount'));
}

// Mount tudo
document.getElementById('main-root').innerHTML = `
  <div class="page-header">
    <div>
      <h1 class="page-title">VALIDAÇÃO POR ARQUIVO</h1>
      <p class="page-subtitle">Compara extração ETL determinística com extração Opus agentic. Hints viram catálogo de padrões. <strong style="color:var(--accent-purple);">VALIDAÇÃO-CSV-01</strong> · sprint atual.</p>
    </div>
    <div class="page-meta">
      <span class="sprint-tag">Sprint 4</span>
      <span class="pill pill-d7-calibracao">Em calibração</span>
    </div>
  </div>

  <h2 class="section-title">Zona A — Paridade global por tipo</h2>
  <div class="zona-a">${zonaA}</div>

  <div class="zona-b">
    <label>Tipo</label>
    <select><option>fatura_cartao</option><option>extrato_cc</option><option>todos</option></select>
    <label>Status Opus</label>
    <select><option>todos</option><option>ok</option><option>divergente</option><option>só Opus</option></select>
    <label>Status humano</label>
    <select><option>todos</option><option>pendente</option><option>aprovado</option><option>revisar</option></select>
    <label>Confiança</label>
    <input type="text" value="< 80%" style="width:80px;">
    <span style="color:var(--text-muted);font-family:var(--ff-mono);font-size:11px;">·</span>
    <label class="toggle"><input type="checkbox" checked> só divergências</label>
    <label class="toggle"><input type="checkbox"> agrupar por sha8</label>
    <label class="toggle"><input type="checkbox"> mostrar hints</label>
    <span style="margin-left:auto;font-family:var(--ff-mono);font-size:11px;color:var(--text-muted);">${VALIDACAO_LINHAS.length} linhas · 4 divergências</span>
  </div>

  <div class="layout-cd">
    <div class="zona-c">
      <table class="table">
        <thead><tr>
          <th>sha8</th><th>arquivo</th><th>tipo</th><th>campo</th>
          <th class="col-num">ETL</th><th class="col-num">Opus</th><th class="col-num">humano</th>
          <th>status Opus</th><th>status humano</th><th>conf.</th><th>hint</th><th>ações</th>
        </tr></thead>
        <tbody>${zonaC}</tbody>
      </table>
    </div>
    <div class="zona-d" id="diff-mount"></div>
  </div>
`;
hidratarGlyphs(document.getElementById('main-root'));
renderDiff();

function selecionarTipo(tipo, el) {
  document.querySelectorAll('.tipo-tile').forEach(t => t.classList.remove('sel'));
  el.classList.add('sel');
}
function selecionarLinha(id) { /* placeholder de interação */ }
