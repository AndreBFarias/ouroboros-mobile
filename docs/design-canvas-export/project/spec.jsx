/* global DCSection, DCArtboard */

// ============================================================
// SEÇÃO 0 — SPEC DE FEATURES
// Documento de design+engenharia denso, pronto pra alimentar
// um agente codador ou um dev humano. Não é um mockup; é a
// fonte da verdade do produto, renderizada com a mesma DNA
// visual do resto do canvas.
// ============================================================

const SpecCss = () =>
<style>{`
    .spec-doc, .spec-doc * { box-sizing: border-box; }
    .spec-doc {
      width: 100%;
      min-height: 100%;
      padding: 56px 56px 80px;
      background: var(--bg-page);
      color: var(--fg);
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 13px;
      line-height: 1.6;
      letter-spacing: 0.01em;
    }
    .spec-doc dl, .spec-doc dt, .spec-doc dd, .spec-doc ul, .spec-doc li, .spec-doc p, .spec-doc h1, .spec-doc h2, .spec-doc h3 {
      min-width: 0;
    }
    .spec-doc h1, .spec-doc h2, .spec-doc h3, .spec-doc h4, .spec-doc .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .spec-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      padding: 24px 28px;
      border: 1px solid var(--bg-elev);
      border-radius: 10px;
      background: var(--bg-alt);
      margin-bottom: 56px;
    }
    .spec-meta-cell .k {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .spec-meta-cell .v {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--cyan);
    }

    .spec-h1 {
      font-size: 40px;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0 0 12px;
      color: var(--fg);
    }
    .spec-sub {
      font-size: 15px;
      color: var(--muted);
      max-width: 720px;
      margin-bottom: 40px;
    }

    .spec-section {
      margin-bottom: 64px;
    }
    .spec-section-head {
      display: flex;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--bg-elev);
    }
    .spec-section-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--cyan);
      letter-spacing: 0.1em;
      min-width: 40px;
    }
    .spec-section-title {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.005em;
      color: var(--fg);
      flex: 1;
      min-width: 0;
    }
    .spec-section-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--muted);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .spec-cols-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .spec-cols-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .spec-cols-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 16px;
    }

    .spec-card {
      border: 1px solid var(--bg-elev);
      border-radius: 10px;
      background: var(--bg-alt);
      padding: 20px 22px;
    }
    .spec-card-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 12px;
    }
    .spec-card-body {
      font-size: 13px;
      line-height: 1.6;
      color: var(--fg);
    }
    .spec-card-body p { margin: 0 0 10px; }
    .spec-card-body p:last-child { margin: 0; }

    .spec-feature {
      border: 1px solid var(--bg-elev);
      border-radius: 10px;
      background: var(--bg);
      padding: 22px 24px;
      position: relative;
    }
    .spec-feature-id {
      position: absolute;
      top: 22px;
      right: 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--cyan);
      letter-spacing: 0.1em;
    }
    .spec-feature-name {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.005em;
      margin-bottom: 4px;
      padding-right: 70px;
    }
    .spec-feature-desc {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 14px;
      padding-right: 70px;
    }
    .spec-feature-grid {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: 10px 16px;
      font-size: 12px;
      line-height: 1.55;
    }
    .spec-feature-grid dt {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      padding-top: 2px;
    }
    .spec-feature-grid dd {
      margin: 0;
      color: var(--fg);
    }
    .spec-feature-grid dd code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: var(--cyan);
      background: var(--bg-alt);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .spec-feature-grid dd ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .spec-feature-grid dd ul li {
      padding-left: 14px;
      position: relative;
      margin-bottom: 4px;
    }
    .spec-feature-grid dd ul li:before {
      content: '·';
      position: absolute;
      left: 4px;
      color: var(--cyan);
      font-weight: 700;
    }

    .spec-features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .spec-code {
      background: var(--bg-alt);
      border: 1px solid var(--bg-elev);
      border-radius: 8px;
      padding: 16px 18px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      line-height: 1.65;
      color: var(--fg);
      white-space: pre;
      overflow-x: auto;
    }
    .spec-code .c { color: var(--cyan); }
    .spec-code .m { color: var(--muted); }
    .spec-code .y { color: var(--yellow); }
    .spec-code .g { color: var(--green); }

    .spec-token-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .spec-token {
      display: grid;
      grid-template-columns: 32px 160px 110px 1fr;
      gap: 16px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px dashed var(--bg-elev);
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .spec-token:last-child { border-bottom: none; }
    .spec-token .swatch {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .spec-token .name { color: var(--fg); }
    .spec-token .hex { color: var(--cyan); }
    .spec-token .use { color: var(--muted); font-family: 'Inter', sans-serif; font-size: 12px; }

    .spec-not {
      border: 1px solid rgba(255,107,107,0.25);
      background: rgba(255,107,107,0.05);
      border-radius: 10px;
      padding: 18px 22px;
    }
    .spec-not-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--red);
      margin-bottom: 10px;
    }
    .spec-not ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
    }
    .spec-not ul li {
      font-size: 12.5px;
      color: var(--fg);
      padding-left: 18px;
      position: relative;
    }
    .spec-not ul li:before {
      content: '✕';
      position: absolute;
      left: 0;
      top: 0;
      color: var(--red);
      font-size: 11px;
      line-height: 1.6;
    }

    .spec-flag {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      letter-spacing: 0.1em;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 6px;
      vertical-align: middle;
    }
    .spec-flag.core { background: rgba(74,222,128,0.12); color: var(--green); border: 1px solid rgba(74,222,128,0.25); }
    .spec-flag.add { background: rgba(78,205,196,0.12); color: var(--cyan); border: 1px solid rgba(78,205,196,0.25); }
    .spec-flag.sys { background: rgba(255,212,89,0.12); color: var(--yellow); border: 1px solid rgba(255,212,89,0.25); }

    .spec-flow {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .spec-flow-card {
      border: 1px solid var(--bg-elev);
      border-radius: 10px;
      background: var(--bg-alt);
      padding: 16px 18px;
    }
    .spec-flow-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--cyan);
      letter-spacing: 0.14em;
      margin-bottom: 4px;
    }
    .spec-flow-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .spec-flow-steps {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.7;
    }
    .spec-flow-steps strong { color: var(--cyan); font-weight: 400; }
  `}</style>;


// ============================================================
// helpers
// ============================================================

const Feature = ({ id, name, flag, desc, telas, comportamento, validacao, dados }) =>
<div className="spec-feature">
    <div className="spec-feature-id">{id}</div>
    <div className="spec-feature-name">
      {flag && <span className={`spec-flag ${flag}`}>{flag === 'core' ? 'core' : flag === 'add' ? 'add' : 'sys'}</span>}
      {name}
    </div>
    <div className="spec-feature-desc">{desc}</div>
    <dl className="spec-feature-grid">
      {telas && <><dt>telas</dt><dd>{telas}</dd></>}
      {comportamento && <><dt>comporta-<br />mento</dt><dd>{comportamento}</dd></>}
      {validacao && <><dt>validação</dt><dd>{validacao}</dd></>}
      {dados && <><dt>persiste em</dt><dd>{dados}</dd></>}
    </dl>
  </div>;


const Token = ({ swatch, name, hex, use }) =>
<div className="spec-token">
    <div className="swatch" style={{ background: swatch }}></div>
    <div className="name">{name}</div>
    <div className="hex">{hex}</div>
    <div className="use">{use}</div>
  </div>;


// ============================================================
// componente principal
// ============================================================

const Spec = () =>
<DCSection id="spec" title="Seção 0 — Especificação de produto">

    <DCArtboard id="spec-doc" label="Spec de features para implementação" width={2000} height={8400}>
      <SpecCss />
      <div className="spec-doc">

        {/* META HEADER */}
        <div className="spec-meta">
          <div className="spec-meta-cell">
            <div className="k">produto</div>
            <div className="v">ouroboros</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">plataforma</div>
            <div className="v">android nativo</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">target</div>
            <div className="v">redmi note 13 pro · 412×915dp</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">storage</div>
            <div className="v">obsidian vault · markdown</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">release</div>
            <div className="v">v1 · 2 pessoas (andré + vitória)</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">telas</div>
            <div className="v">18 core + 4 função adicional</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">flows críticos</div>
            <div className="v">4 jornadas</div>
          </div>
          <div className="spec-meta-cell">
            <div className="k">stack sugerida</div>
            <div className="v">kotlin + jetpack compose</div>
          </div>
        </div>

        <h1 className="spec-h1">Ouroboros — spec de produto</h1>
        <div className="spec-sub">
          Documento denso, pronto pra alimentar um agente codador ou dev humano construindo o app. Cada feature
          tem escopo, telas envolvidas, comportamento crítico, validação e onde persiste. Ler junto com as 22
          telas e os 4 user flows nas seções de baixo.
        </div>

        {/* ============================================== */}
        {/* 1. VISAO E PRINCIPIOS */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">01</span>
            <span className="spec-section-title">Visão e princípios de design</span>
            <span className="spec-section-tag">filosofia</span>
          </div>
          <div className="spec-cols-2">
            <div className="spec-card">
              <div className="spec-card-title">o que é</div>
              <div className="spec-card-body">
                <p>App pessoal de captura. Diário, humor, finanças e eventos compartilhados entre duas pessoas (André + Vitória), com vault em markdown sincronizado via Syncthing.</p>
                <p>Mobile é o lado de <strong>captura ativa</strong>. Edição em massa, análise e relatórios ficam no desktop. O app não tenta competir com Obsidian — tenta deixar o vault rodando no bolso sem fricção.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">5 princípios</div>
              <div className="spec-card-body">
                <p><strong>1. baixa fricção.</strong> 1–2 taps pra registrar qualquer coisa.</p>
                <p><strong>2. nada de gamificação.</strong> sem streaks, badges, reforço positivo artificial.</p>
                <p><strong>3. dados = arquivos.</strong> tudo .md no vault. portável, auditável.</p>
                <p><strong>4. dois donos.</strong> sempre fica claro de quem é o registro.</p>
                <p><strong>5. mobile captura, desktop processa.</strong> não duplique funcionalidade.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 2. ARQUITETURA TECNICA */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">02</span>
            <span className="spec-section-title">Arquitetura técnica</span>
            <span className="spec-section-tag">infra</span>
          </div>
          <div className="spec-cols-3">
            <div className="spec-card">
              <div className="spec-card-title">storage</div>
              <div className="spec-card-body">
                <p>Vault Obsidian em pasta local sincronizada via Syncthing. Cada registro vira <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>.md</code> com YAML frontmatter.</p>
                <p>App tem permissão de leitura/escrita na pasta via Storage Access Framework.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">sync</div>
              <div className="spec-card-body">
                <p>Syncthing roda em background. App não gerencia sync — só observa o status (conectado/syncing/conflito) e mostra na tela de ajustes.</p>
                <p>Conflitos são resolvidos no desktop via merge manual. Mobile só sinaliza.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">ocr e ml</div>
              <div className="spec-card-body">
                <p>ML Kit do Google rodando 100% on-device. Sem chamada de rede, sem upload de imagem.</p>
                <p>Detecção de bordas: OpenCV via JNI ou ML Kit document scanner. Auto-crop antes do OCR.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">privacidade</div>
              <div className="spec-card-body">
                <p>Zero tráfego de saída do app. Nenhum analytics, telemetria ou crash reporter remoto.</p>
                <p>Biometria (BiometricPrompt) protege abertura. Falha em 3 tentativas → modo PIN.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">share intents</div>
              <div className="spec-card-body">
                <p>App registra intent filter pra <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>image/*</code> e <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>application/pdf</code>.</p>
                <p>Compartilhamento abre Activity transparente, processa, salva, fecha. Sem tab bar.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">notificações</div>
              <div className="spec-card-body">
                <p>WorkManager pra lembretes diários (humor noturno) e alarmes pessoais.</p>
                <p>Notificações expandem com <em>Reply</em> direto: humor pode ser registrado sem abrir o app.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 3. MODELO DE DADOS */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">03</span>
            <span className="spec-section-title">Modelo de dados — schema dos arquivos .md</span>
            <span className="spec-section-tag">contrato com o vault</span>
          </div>
          <div className="spec-cols-2" style={{ marginBottom: 16 }}>
            <div>
              <div className="spec-card-title" style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                estrutura de pastas
              </div>
              <pre className="spec-code">{`vault/
├─ daily/
│  └─ 2025-01-22.md           ← humor + entrada do dia
├─ eventos/
│  └─ 2025-01-22-cafe.md      ← evento positivo/negativo
├─ financas/
│  ├─ 2025-01-22-pix.md       ← comprovante (share intent)
│  └─ 2025-01-22-nota.md      ← scanner alta resolução
├─ tarefas/
│  └─ 2025-01-22-comprar.md   ← to-do
├─ contadores/
│  └─ dias-sem-x.md           ← um arquivo por contador
└─ alarmes/
   └─ remedio-08h.md          ← um arquivo por alarme`}</pre>
            </div>
            <div>
              <div className="spec-card-title" style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                exemplo · evento positivo
              </div>
              <pre className="spec-code"><span className="m">---</span>{`
`}<span className="c">tipo:</span>{` evento
`}<span className="c">data:</span>{` 2025-01-22T10:30:00-03:00
`}<span className="c">autor:</span>{` andré
`}<span className="c">humor:</span>{` 4
`}<span className="c">tags:</span>{` [positivo, café, vitória]
`}<span className="c">lugar:</span>{` "padaria do bairro"
`}<span className="c">com:</span>{` [vitória]
`}<span className="m">---</span>{`

café da manhã com a vi.
`}<span className="g">conversa boa, sem pressa.</span></pre>
            </div>
          </div>
          <div className="spec-cols-2">
            <div>
              <div className="spec-card-title" style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                exemplo · comprovante pix
              </div>
              <pre className="spec-code"><span className="m">---</span>{`
`}<span className="c">tipo:</span>{` financas
`}<span className="c">subtipo:</span>{` pix
`}<span className="c">data:</span>{` 2025-01-22T14:12:00-03:00
`}<span className="c">autor:</span>{` andré
`}<span className="c">valor:</span>{` 87.40
`}<span className="c">destino:</span>{` "mercado luiza"
`}<span className="c">categoria:</span>{` mercado
`}<span className="c">imagem:</span>{` ./assets/2025-01-22-pix.jpg
`}<span className="c">ocr_confianca:</span>{` 0.94
`}<span className="m">---</span></pre>
            </div>
            <div>
              <div className="spec-card-title" style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                exemplo · contador "dias sem"
              </div>
              <pre className="spec-code"><span className="m">---</span>{`
`}<span className="c">tipo:</span>{` contador
`}<span className="c">titulo:</span>{` "dias sem fumar"
`}<span className="c">inicio:</span>{` 2024-11-03
`}<span className="c">autor:</span>{` andré
`}<span className="c">resets:</span>{`
  - 2024-11-08
  - 2024-12-15
`}<span className="m">---</span>{`

`}<span className="m"># histórico</span>{`
streak atual começou em 15/12.`}</pre>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 4. DESIGN SYSTEM */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">04</span>
            <span className="spec-section-title">Design system — tokens e componentes-base</span>
            <span className="spec-section-tag">visual</span>
          </div>
          <div className="spec-cols-2" style={{ marginBottom: 18 }}>
            <div className="spec-card">
              <div className="spec-card-title">paleta · base</div>
              <div className="spec-token-row">
                <Token swatch="#14151a" name="--bg-page" hex="#14151a" use="fundo do canvas" />
                <Token swatch="#282a36" name="--bg" hex="#282a36" use="fundo da tela" />
                <Token swatch="#1e1f29" name="--bg-alt" hex="#1e1f29" use="cards e containers" />
                <Token swatch="#44475a" name="--bg-elev" hex="#44475a" use="bordas e elevação" />
                <Token swatch="#f8f8f2" name="--fg" hex="#f8f8f2" use="texto primário" />
                <Token swatch="#c9c9cc" name="--muted" hex="#c9c9cc" use="texto secundário" />
                <Token swatch="#6272a4" name="--muted-decor" hex="#6272a4" use="hints e separadores" />
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">paleta · acentos (dracula)</div>
              <div className="spec-token-row">
                <Token swatch="#bd93f9" name="--purple" hex="#bd93f9" use="andré · ações primárias" />
                <Token swatch="#ff79c6" name="--pink" hex="#ff79c6" use="vitória · trigger" />
                <Token swatch="#8be9fd" name="--cyan" hex="#8be9fd" use="valores · paths · voz" />
                <Token swatch="#50fa7b" name="--green" hex="#50fa7b" use="sucesso · confirmação" />
                <Token swatch="#f1fa8c" name="--yellow" hex="#f1fa8c" use="vitória positiva · atenção" />
                <Token swatch="#ffb86c" name="--orange" hex="#ffb86c" use="títulos · câmera" />
                <Token swatch="#ff5555" name="--red" hex="#ff5555" use="trigger · destrutivo" />
              </div>
            </div>
          </div>

          <div className="spec-cols-3">
            <div className="spec-card">
              <div className="spec-card-title">tipografia</div>
              <div className="spec-card-body">
                <p><code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>JetBrains Mono</code> · única família · UI, dados, paths, código.</p>
                <p>Hierarquia: heading-1 24px · heading-2 18px · body 13–14px · caption 12px · micro 11px. Letter-spacing +0.02em em micro caps.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">spacing scale</div>
              <div className="spec-card-body">
                <p>Base 4dp. Escala: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64.</p>
                <p>Hit area mínima 44dp. Padding interno padrão de card: 20dp horizontal, 16dp vertical.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">motion</div>
              <div className="spec-card-body">
                <p>Toda transição usa easing <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>ease-out · 200ms</code>. FAB radial expande em <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>240ms</code> com spring leve.</p>
                <p>Toasts somem em 2s. Sem bounces, sem easing exagerado.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 5. FEATURES POR SECAO */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">05</span>
            <span className="spec-section-title">Features — agrupadas por seção do canvas</span>
            <span className="spec-section-tag">22 features · core + add + sys</span>
          </div>

          {/* SECAO A */}
          <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, marginTop: 8 }}>
            seção A — núcleo do diário
          </h3>
          <div className="spec-features-grid" style={{ marginBottom: 28 }}>
            <Feature
            id="F-01"
            flag="core"
            name="Hoje · feed do dia"
            desc="Tela inicial. Mostra entradas do dia ordenadas por hora, com badge do autor."
            telas="01 (vazia) · 02 (com 6 entradas)"
            comportamento="Pull-to-refresh força releitura do vault. Tap em entrada abre detalhe somente-leitura. Long press copia path .md pra clipboard."
            validacao="Se vault não foi configurado → empty state com CTA pra ajustes. Se vazio → ilustração + 'comece registrando'."
            dados="leitura de daily/YYYY-MM-DD.md + eventos/ filtrados por data" />
          
            <Feature
            id="F-02"
            flag="core"
            name="Detalhe de entrada"
            desc="Vista somente-leitura de um registro. Mostra frontmatter como metadados estruturados + corpo markdown renderizado."
            telas="03 (entrada texto) · 04 (com imagem anexa)"
            comportamento="Tap no path .md no rodapé copia. Botão 'abrir no obsidian' dispara intent de share. Sem botão editar — edição é desktop."
            validacao="Markdown renderizado com biblioteca tipo Markwon. Imagens carregadas do path relativo do vault."
            dados="leitura única do .md selecionado" />
          
            <Feature
            id="F-03"
            flag="core"
            name="Linha do tempo · busca + filtros"
            desc="Histórico cronológico reverso. Filtros por autor, tipo, tag, intervalo. Busca full-text no corpo dos .md."
            telas="05 (lista cheia) · 06 (filtros aplicados)"
            comportamento="Filtros são chips no topo, multi-seleção. Busca debounce 300ms. Resultado destaca match no preview."
            validacao="Index in-memory atualizado on file watch. Vault > 1000 arquivos: indexação assíncrona com Room."
            dados="leitura recursiva do vault inteiro" />
          
          </div>

          {/* SECAO B */}
          <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, marginTop: 8 }}>
            seção B — captura passiva (humor + eventos)
          </h3>
          <div className="spec-features-grid" style={{ marginBottom: 28 }}>
            <Feature
            id="F-04"
            flag="core"
            name="Registro de humor (1–5)"
            desc="Captura emocional rápida. Escala de 5 níveis com cor (1 red → 5 green). Opcional: tags + nota curta."
            telas="07 (slider) · 08 (com tags) · 21 (heatmap)"
            comportamento="Slider haptic em cada parada. Tags são chips pré-definidas + freeform. Salva em daily/YYYY-MM-DD.md no campo 'humor:'."
            validacao="1 registro por pessoa por dia. Re-registro substitui o valor com confirmação."
            dados="daily/YYYY-MM-DD.md · campos humor, humor_tags, humor_nota" />
          
            <Feature
            id="F-05"
            flag="core"
            name="Lembrete noturno de humor"
            desc="Notificação às 22h (configurável) com inline reply de 5 emojis. Registra sem abrir o app."
            telas="(notificação · não tem tela própria)"
            comportamento="WorkManager schedule. Inline action via NotificationCompat.Action com RemoteInput. Reply tap → grava + dismiss notification."
            validacao="Se já registrou hoje → notificação não aparece. Snooze adia 1h."
            dados="daily/YYYY-MM-DD.md" />
          
            <Feature
            id="F-06"
            flag="core"
            name="Evento positivo / negativo"
            desc="Captura momento marcante com tipo (+/−), tags, lugar opcional, pessoa(s) envolvida(s)."
            telas="09 (form vazio) · 10 (preenchido) · 11 (toast salvo)"
            comportamento="Form bottom sheet. Lugar via geocoding reverso (opt-in). Pessoas: chips com André/Vitória + freeform."
            validacao="Texto obrigatório (≥3 chars). Toast confirma com microcopy: 'anotado. tao bom.' (positivo) / 'registrado. respira.' (negativo)."
            dados="eventos/YYYY-MM-DD-slug.md" />
          
          </div>

          {/* SECAO C */}
          <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, marginTop: 8 }}>
            seção C — captura ativa (FAB + scanner + share)
          </h3>
          <div className="spec-features-grid" style={{ marginBottom: 28 }}>
            <Feature
            id="F-07"
            flag="core"
            name="FAB radial · 4 ações"
            desc="Botão flutuante que expande em menu radial: humor · evento · scanner · texto livre."
            telas="14 (base) · 14 (expandido)"
            comportamento="Tap rotaciona FAB 45° (vira X) e abre 4 botões em arco. Tap fora ou no X fecha. Cada ação abre o sheet/modal correspondente."
            validacao="Acessível via gesto (back fecha). Labels micro 11px sob cada botão."
            dados="—" />
          
            <Feature
            id="F-08"
            flag="core"
            name="Scanner de nota fiscal · alta resolução"
            desc="Câmera com auto-detecção de bordas. Captura, auto-crop, OCR, form pré-preenchido."
            telas="16 (viewfinder) · 16 (preview pós-captura)"
            comportamento="Cantos cyan aparecem quando 4 bordas são detectadas. Captura 72dp branco no centro. ML Kit document scanner + text recognition."
            validacao="OCR confiança < 0.7 → marca campo como 'revisar'. Imagem original salva em assets/, referenciada por path relativo."
            dados="financas/YYYY-MM-DD-slug.md + assets/YYYY-MM-DD-slug.jpg" />
          
            <Feature
            id="F-09"
            flag="core"
            name="Share intent · comprovante pix"
            desc="App recebe imagem/PDF via share sheet, detecta tipo (pix/boleto), faz OCR, salva. Sem abrir tela cheia do app."
            telas="17 (modal aguardando) · 17 (pix detectado)"
            comportamento="Activity transparente. Path .md de destino visível em ciano mono — atualiza em tempo real conforme tipo é detectado. Tempo total < 5s."
            validacao="Se não conseguir extrair valor + destino, modal expande pra form mínimo. Cancel descarta."
            dados="financas/YYYY-MM-DD-slug.md" />
          
          </div>

          {/* SECAO D */}
          <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, marginTop: 8 }}>
            seção D — sistema e visualização
          </h3>
          <div className="spec-features-grid" style={{ marginBottom: 28 }}>
            <Feature
            id="F-10"
            flag="core"
            name="Heatmap de humor"
            desc="Página cheia. Grid de dias × meses com intensidade colorida. Modo single-author ou sobreposto (ambas as pessoas)."
            telas="21 (vazio · com dados · sobreposto)"
            comportamento="Tap em célula → preview da entrada. Toggle no topo alterna single/overlap. Modo sobreposto: 2 heatmaps a 50% opacity, interseção mais escura."
            validacao="5 níveis fixos (red → green). Sem normalização — valor cru."
            dados="leitura agregada de daily/*.md" />
          
            <Feature
            id="F-11"
            flag="core"
            name="Finanças · modo leitura"
            desc="Dashboard read-only. Totais, categorias, comparativo mensal. Banner reforça: 'edição é no desktop'."
            telas="22 (vazio) · 22 (com dados)"
            comportamento="Sem botão adicionar. Subtitle 'abaixo da média' sempre neutro — nunca verde/vermelho. Pipeline rodado pelo desktop popula um cache .json."
            validacao="Se cache .json não existe → empty state explicativo."
            dados="leitura de .ouroboros/financas-cache.json" />
          
            <Feature
            id="F-12"
            flag="core"
            name="Ajustes · vault, sync, biometria"
            desc="Configurações do app. Pessoa ativa, path do vault, status do Syncthing, biometria, lembretes."
            telas="23 (primeira abertura) · 23 (configurado)"
            comportamento="Radio horizontal pra pessoa ativa (André / Vitória). Vault compartilhado por padrão. Path do último arquivo sincronizado em ciano mono."
            validacao="Indicador colorido de status: cyan (ok), yellow (syncing), red (conflito)."
            dados="SharedPreferences + DataStore" />
          
            <Feature
            id="F-13"
            flag="core"
            name="Onboarding · 3 frames"
            desc="Primeira abertura. Escolher pessoa, configurar lembretes, conectar vault. Sem checklist, tour ou vídeo."
            telas="24a · 24b · 24c"
            comportamento="3 perguntas sequenciais. Frame 3 → app abre direto na tela 01 (Hoje). Pode ser pulado a qualquer momento."
            validacao="Sem pessoa selecionada → bloqueio do botão next. Demais campos opcionais."
            dados="DataStore" />
          
          </div>

          {/* SECAO E */}
          <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, marginTop: 8 }}>
            seção E — funções adicionais (4 features extras)
          </h3>
          <div className="spec-features-grid" style={{ marginBottom: 8 }}>
            <Feature
            id="F-14"
            flag="add"
            name="Microfone + transcrição"
            desc="Captura por voz. Grava áudio + transcreve on-device, gera .md com transcrição + áudio anexado."
            telas="E1 (gravando · waveform) · E1 (transcrição preview)"
            comportamento="Hold-to-talk no FAB radial. Waveform live. Solta → transcrição via SpeechRecognizer (offline package). Edita texto antes de salvar."
            validacao="Sem mic permission → onboarding inline. Áudio < 3s descartado."
            dados="daily/YYYY-MM-DD.md + assets/YYYY-MM-DD-HHmm.m4a" />
          
            <Feature
            id="F-15"
            flag="add"
            name="Alarme pessoal"
            desc="Alarmes recorrentes (remédio, sono, ritual). Cada alarme é um arquivo .md, editável no desktop."
            telas="E2 (lista) · E2 (form criar)"
            comportamento="AlarmManager + setExactAndAllowWhileIdle. Notificação full-screen intent. Snooze 5/10/30min."
            validacao="Hora obrigatória. Recorrência: dias da semana ou diário. Som customizável."
            dados="alarmes/slug.md" />
          
            <Feature
            id="F-16"
            flag="add"
            name="To-do leve"
            desc="Lista de tarefas simples. Sem projetos, sem subtarefas, sem due date complexo. Apenas: texto, autor, feito/não feito."
            telas="E3 (lista vazia) · E3 (com 4 items)"
            comportamento="Swipe direita → completa. Swipe esquerda → arquiva. Tap no checkbox toggle. Items completos vão pro fim com strikethrough."
            validacao="Lista limitada a 20 itens visíveis — força foco. Arquivados ficam no .md mas somem da view."
            dados="tarefas/YYYY-MM-DD-slug.md" />
          
            <Feature
            id="F-17"
            flag="add"
            name="Contador 'dias sem X'"
            desc="Contador de streak pessoal. Cada contador é um arquivo .md com data de início e histórico de resets."
            telas="E4 (lista cards) · E4 (detalhe contador)"
            comportamento="Card grande mostra número de dias. Tap longo → reset com confirmação. Histórico de resets visível no detalhe."
            validacao="Sem gamificação — sem celebração visual em milestones. Apenas o número. Reset registra timestamp em 'resets:'."
            dados="contadores/slug.md" />
          
          </div>
        </div>

        {/* ============================================== */}
        {/* 6. USER FLOWS */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">06</span>
            <span className="spec-section-title">User flows críticos · referência</span>
            <span className="spec-section-tag">4 jornadas · diagramas abaixo</span>
          </div>
          <div className="spec-flow">
            <div className="spec-flow-card">
              <div className="spec-flow-num">flow 01</div>
              <div className="spec-flow-name">Comprovante pix via share sheet</div>
              <div className="spec-flow-steps">
                whatsapp <strong>→</strong> share <strong>→</strong> ouroboros <strong>→</strong> ocr automático <strong>→</strong> path .md visível <strong>→</strong> salvar <strong>→</strong> fecha
              </div>
            </div>
            <div className="spec-flow-card">
              <div className="spec-flow-num">flow 02</div>
              <div className="spec-flow-name">Registrar tristeza por conflito</div>
              <div className="spec-flow-steps">
                FAB <strong>→</strong> humor 2 <strong>→</strong> tag "conflito" <strong>→</strong> nota curta <strong>→</strong> toast "registrado. respira."
              </div>
            </div>
            <div className="spec-flow-card">
              <div className="spec-flow-num">flow 03</div>
              <div className="spec-flow-name">Evento positivo com lugar</div>
              <div className="spec-flow-steps">
                FAB <strong>→</strong> evento + <strong>→</strong> texto + lugar + pessoa <strong>→</strong> toast "anotado. tao bom."
              </div>
            </div>
            <div className="spec-flow-card">
              <div className="spec-flow-num">flow 04</div>
              <div className="spec-flow-name">Scanner de nota fiscal</div>
              <div className="spec-flow-steps">
                FAB <strong>→</strong> scanner <strong>→</strong> auto-detecta bordas <strong>→</strong> captura <strong>→</strong> ocr + form <strong>→</strong> salvar
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 7. ESTADOS ESPECIAIS */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">07</span>
            <span className="spec-section-title">Estados especiais — empty, error, permission</span>
            <span className="spec-section-tag">edge cases</span>
          </div>
          <div className="spec-cols-3">
            <div className="spec-card">
              <div className="spec-card-title">empty states</div>
              <div className="spec-card-body">
                <p>Sempre com microcopy específico, nunca genérico. Ex: "comece registrando", "edição é no desktop", "vault não conectado".</p>
                <p>Sem ilustração elaborada — apenas tipografia + 1 ícone monocromático opcional.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">erros</div>
              <div className="spec-card-body">
                <p>Erro de OCR → form manual. Erro de sync → banner persistente em ajustes. Erro de I/O no vault → modal bloqueante com path do problema.</p>
                <p>Nunca toast pra erro crítico. Toast = info; modal/banner = problema.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">permissões</div>
              <div className="spec-card-body">
                <p>Câmera, mic, storage e notificação pedidas <em>just in time</em>, no momento do uso. Cada negação tem fallback: scanner desabilitado, mic invisível, etc.</p>
                <p>Settings sempre tem deep-link pra reabilitar.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 8. NAO-FEATURES */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">08</span>
            <span className="spec-section-title">Não-features — o que <em>não</em> construir</span>
            <span className="spec-section-tag">anti-requisitos</span>
          </div>
          <div className="spec-not">
            <div className="spec-not-title">explicitamente fora do escopo</div>
            <ul>
              <li>streaks visíveis com fogo, troféus ou celebração</li>
              <li>rede social, feed compartilhado público, comentários</li>
              <li>ranking entre André e Vitória, comparativo competitivo</li>
              <li>push motivacional ("você consegue!", "não desista")</li>
              <li>analytics, telemetria ou crash reporter remoto</li>
              <li>edição em massa ou bulk operations no mobile</li>
              <li>relatórios PDF / export — fica no desktop</li>
              <li>integração com bancos, open banking, scraping de extrato</li>
              <li>IA generativa pra "sugerir como você se sente"</li>
              <li>dark mode opcional — só tem dark, é a identidade</li>
              <li>tour interativo, tooltips persistentes, coach marks</li>
              <li>widget de homescreen na v1 (talvez v2)</li>
            </ul>
          </div>
        </div>

        {/* ============================================== */}
        {/* 9. ADRs */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">09</span>
            <span className="spec-section-title">ADRs — decisões de arquitetura</span>
            <span className="spec-section-tag">por que · não como</span>
          </div>
          <div className="spec-cols-2">
            <div className="spec-card">
              <div className="spec-card-title">adr-001 · vault em markdown puro</div>
              <div className="spec-card-body">
                <p><strong style={{ color: 'var(--cyan)' }}>contexto:</strong> precisamos de storage que sobreviva ao app sumir. SQLite seria mais rápido, mas opaco.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>decisão:</strong> arquivos .md com YAML frontmatter, um por registro, organizados em pastas por tipo. Banco SQLite usado só como índice volátil (Room).</p>
                <p><strong style={{ color: 'var(--cyan)' }}>consequência:</strong> migração trivial pra qualquer app de notas. Backup = copiar pasta. Custo: I/O mais lento; mitigado com cache em memória.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">adr-002 · sync delegado ao syncthing</div>
              <div className="spec-card-body">
                <p><strong style={{ color: 'var(--cyan)' }}>contexto:</strong> dois usuários, dois aparelhos + 1 desktop. Sync próprio = backend + auth + conflitos.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>decisão:</strong> Syncthing roda fora do app. Ouroboros só observa status e mostra na UI. Conflitos resolvidos no desktop via merge manual.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>consequência:</strong> zero infra própria. Custo: usuário precisa configurar Syncthing uma vez — onboarding compensa.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">adr-003 · ml kit on-device, sem rede</div>
              <div className="spec-card-body">
                <p><strong style={{ color: 'var(--cyan)' }}>contexto:</strong> OCR e document scanner via API cloud seriam mais precisos.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>decisão:</strong> ML Kit local. Comprovantes financeiros e diários nunca saem do device. Zero tráfego de rede.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>consequência:</strong> qualidade ~90% do cloud, mas privacidade absoluta. Para casos limítrofes, fallback é form manual.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">adr-004 · mobile só captura · desktop processa</div>
              <div className="spec-card-body">
                <p><strong style={{ color: 'var(--cyan)' }}>contexto:</strong> tentação de espelhar tudo do desktop no mobile. Resultado típico: dois apps medianos.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>decisão:</strong> mobile = entrada de dados. Edição em massa, relatórios, pipelines de finanças = desktop. Mobile lê cache .json gerado pelo desktop.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>consequência:</strong> escopo mobile drasticamente menor → qualidade maior. Mobile sem dados se desktop nunca rodou (empty state explica).</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">adr-005 · sem gamificação, intencional</div>
              <div className="spec-card-body">
                <p><strong style={{ color: 'var(--cyan)' }}>contexto:</strong> diário de humor + finanças + eventos é tipicamente gamificado (streaks, badges, pushs motivacionais).</p>
                <p><strong style={{ color: 'var(--cyan)' }}>decisão:</strong> zero gamificação. Sem fogo de streak, sem celebração de milestone, sem ranking entre as 2 pessoas. Cores neutras pra dados financeiros.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>consequência:</strong> ferramenta de auto-conhecimento, não dopamina-trap. Usuário não sente vergonha de pular um dia.</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">adr-006 · jetpack compose · sem fragmentos</div>
              <div className="spec-card-body">
                <p><strong style={{ color: 'var(--cyan)' }}>contexto:</strong> Android tem 2 paradigmas vivos — Views/XML/Fragments e Compose.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>decisão:</strong> Compose ponta-a-ponta. Material 3 só pra primitivos (sheet, dialog, snackbar); tema custom escuro próprio.</p>
                <p><strong style={{ color: 'var(--cyan)' }}>consequência:</strong> base de código menor, animações triviais, hot reload viável. Custo: bibliotecas legadas exigem AndroidView wrapper (CameraX, etc.).</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* 10. STACK SUGERIDA */}
        {/* ============================================== */}
        <div className="spec-section">
          <div className="spec-section-head">
            <span className="spec-section-num">10</span>
            <span className="spec-section-title">Stack técnica sugerida</span>
            <span className="spec-section-tag">implementação</span>
          </div>
          <div className="spec-cols-4">
            <div className="spec-card">
              <div className="spec-card-title">linguagem · ui</div>
              <div className="spec-card-body">
                <p>Kotlin 2.0+ · Jetpack Compose · Material 3 (com tema custom escuro)</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">storage</div>
              <div className="spec-card-body">
                <p>Storage Access Framework pra vault · DataStore pra prefs · Room pra index full-text</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">ml · captura</div>
              <div className="spec-card-body">
                <p>ML Kit · CameraX · BiometricPrompt · SpeechRecognizer (offline)</p>
              </div>
            </div>
            <div className="spec-card">
              <div className="spec-card-title">background</div>
              <div className="spec-card-body">
                <p>WorkManager · AlarmManager · Notification w/ inline RemoteInput</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DCArtboard>

  </DCSection>;