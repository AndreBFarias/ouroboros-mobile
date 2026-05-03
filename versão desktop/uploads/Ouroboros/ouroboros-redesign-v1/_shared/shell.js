/* Ouroboros — shell (sidebar + topbar) renderizado por JS.
   Cada mockup chama montarShell({clusterAtivo, abaAtiva, breadcrumb}). */

const CLUSTERS_OUROBOROS = [
  {
    id: 'inbox',
    nome: 'Inbox',
    glyph: 'inbox',
    badge: '3',
    abas: [
      { id: 'inbox', nome: 'Inbox', file: '16-inbox.html' },
    ],
  },
  {
    id: 'home',
    nome: 'Home',
    glyph: 'home',
    abas: [
      { id: 'visao-geral', nome: 'Visão Geral', file: '01-visao-geral.html' },
      { id: 'home-financas', nome: 'Finanças' },
      { id: 'home-documentos', nome: 'Documentos' },
      { id: 'home-analise', nome: 'Análise' },
      { id: 'home-metas', nome: 'Metas' },
    ],
  },
  {
    id: 'financas',
    nome: 'Finanças',
    glyph: 'financas',
    abas: [
      { id: 'extrato', nome: 'Extrato' },
      { id: 'contas', nome: 'Contas' },
      { id: 'pagamentos', nome: 'Pagamentos' },
      { id: 'projecoes', nome: 'Projeções' },
    ],
  },
  {
    id: 'documentos',
    nome: 'Documentos',
    glyph: 'docs',
    abas: [
      { id: 'busca-global', nome: 'Busca Global' },
      { id: 'catalogacao', nome: 'Catalogação', file: '07-catalogacao.html' },
      { id: 'completude', nome: 'Completude' },
      { id: 'revisor', nome: 'Revisor', file: '09-revisor.html' },
      { id: 'validacao-arquivos', nome: 'Validação por Arquivo', file: '10-validacao-arquivos.html' },
      { id: 'grafo-obsidian', nome: 'Grafo + Obsidian' },
    ],
  },
  {
    id: 'analise',
    nome: 'Análise',
    glyph: 'analise',
    abas: [
      { id: 'categorias', nome: 'Categorias' },
      { id: 'analise', nome: 'Análise' },
      { id: 'irpf', nome: 'IRPF', file: '15-irpf.html' },
    ],
  },
  {
    id: 'metas',
    nome: 'Metas',
    glyph: 'metas',
    abas: [
      { id: 'metas', nome: 'Metas' },
    ],
  },
];

function _sidebarHTML(clusterAtivo, abaAtiva) {
  const clusters = CLUSTERS_OUROBOROS.map((c) => {
    const itens = c.abas.map((a) => {
      const ativa = (c.id === clusterAtivo && a.id === abaAtiva);
      const href = a.file ? `./${a.file}` : '#';
      const cls = ativa ? 'sidebar-item active' : 'sidebar-item';
      const semMockup = !a.file ? '<span class="count">·</span>' : '';
      return `<a class="${cls}" href="${href}" data-aba="${a.id}">${a.nome}${semMockup}</a>`;
    }).join('');
    const badge = c.badge ? `<span class="badge">${c.badge}</span>` : '';
    return `
      <div class="sidebar-cluster">
        <div class="sidebar-cluster-header">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            ${glyph(c.glyph, 14)} ${c.nome}
          </span>
          ${badge}
        </div>
        ${itens}
      </div>`;
  }).join('');

  return `
    <aside class="sidebar" aria-label="Navegação">
      <div class="sidebar-brand">
        ${glyph('ouroboros', 18)}
        <span>Ouroboros</span>
      </div>
      <div class="sidebar-search">
        ${glyph('search', 14, 'sidebar-search-icon')}
        <input type="text" placeholder="Buscar fornecedor, sha8, valor..." aria-label="Buscar">
        <kbd>/</kbd>
      </div>
      ${clusters}
      <div style="margin-top:auto;padding:12px 16px;border-top:1px solid var(--border-subtle);font-size:11px;color:var(--text-muted);font-family:var(--ff-mono);">
        <div>v1.0 · 2.066 testes</div>
        <div style="margin-top:2px;">D7 · cobertura observável</div>
      </div>
    </aside>`;
}

function _topbarHTML(breadcrumb, acoes) {
  const segs = breadcrumb.map((s, i) => {
    const last = i === breadcrumb.length - 1;
    const cls = last ? 'seg current' : 'seg';
    const sep = last ? '' : '<span class="sep">/</span>';
    return `<span class="${cls}">${s}</span>${sep}`;
  }).join('');
  const acoesHTML = (acoes || []).map((a) => {
    const cls = a.primary ? 'btn btn-primary btn-sm' : 'btn btn-sm';
    return `<button class="${cls}">${a.icon ? glyph(a.icon, 14) : ''} ${a.label}</button>`;
  }).join('');
  return `
    <header class="topbar">
      <nav class="breadcrumb" aria-label="Localização">${segs}</nav>
      <div class="topbar-actions">${acoesHTML}</div>
    </header>`;
}

/**
 * Monta sidebar + topbar dentro de um <div id="shell-root"> e devolve <main>.
 * @param {Object} opts
 * @param {string} opts.clusterAtivo - id do cluster
 * @param {string} opts.abaAtiva - id da aba
 * @param {string[]} opts.breadcrumb - segmentos
 * @param {Array} opts.acoes - [{label, icon, primary}]
 */
function montarShell(opts) {
  const root = document.getElementById('shell-root');
  if (!root) return;
  root.classList.add('shell');
  root.innerHTML =
    _sidebarHTML(opts.clusterAtivo, opts.abaAtiva) +
    _topbarHTML(opts.breadcrumb, opts.acoes) +
    '<main class="main" id="main-root"></main>';
  // Atalhos de teclado: g h, g i, g v, g r, g f, /, ?
  _instalarAtalhos();
}

function _instalarAtalhos() {
  let buffer = '';
  let timer = null;
  const mapa = {
    'gh': './01-visao-geral.html',
    'gi': './16-inbox.html',
    'gv': './10-validacao-arquivos.html',
    'gr': './09-revisor.html',
    'gf': './15-irpf.html',
    'gc': './07-catalogacao.html',
  };
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === '/') {
      e.preventDefault();
      const inp = document.querySelector('.sidebar-search input');
      if (inp) inp.focus();
      return;
    }
    if (e.key === '?') {
      _toggleAjuda();
      return;
    }
    if (e.key === 'Escape') {
      const overlay = document.getElementById('ajuda-overlay');
      if (overlay) overlay.remove();
      return;
    }
    buffer += e.key.toLowerCase();
    clearTimeout(timer);
    timer = setTimeout(() => { buffer = ''; }, 800);
    if (mapa[buffer]) {
      const dest = mapa[buffer];
      buffer = '';
      window.location.href = dest;
    }
  });
}

function _toggleAjuda() {
  const existente = document.getElementById('ajuda-overlay');
  if (existente) { existente.remove(); return; }
  const ov = document.createElement('div');
  ov.id = 'ajuda-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:60;display:grid;place-items:center;';
  ov.innerHTML = `
    <div class="card" style="min-width:480px;max-width:560px;">
      <div class="card-head">
        <h3 class="card-title">Atalhos de teclado</h3>
        <button class="btn btn-icon btn-ghost" onclick="document.getElementById('ajuda-overlay').remove()">${glyph('close',14)}</button>
      </div>
      <table style="width:100%;font-size:13px;">
        <tr><td style="padding:6px 0;"><kbd class="kbd">g h</kbd></td><td>Visão Geral</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">g i</kbd></td><td>Inbox</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">g v</kbd></td><td>Validação por Arquivo</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">g r</kbd></td><td>Revisor</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">g f</kbd></td><td>IRPF</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">g c</kbd></td><td>Catalogação</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">/</kbd></td><td>Focar busca</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">?</kbd></td><td>Esta ajuda</td></tr>
        <tr><td style="padding:6px 0;"><kbd class="kbd">Esc</kbd></td><td>Fechar overlay</td></tr>
      </table>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
}
