/* global PhoneFrame, BackHeader, DCSection, DCArtboard */

// ============================================================
// FLOWS - 4 user flows criticos como diagramas horizontais
// no topo do canvas, antes dos artboards individuais.
// ============================================================

// ─── primitivos do diagrama ───────────────────────────────────

// "tela" mini representando um screen no flow (não e um phone real,
// e uma caixa estilizada com label e thumbnail abstrato)
const FlowStep = ({ num, title, sub, accent = 'var(--purple)', external = false, modal = false }) => (
  <div style={{
    width: 200,
    background: external ? 'var(--bg-page)' : 'var(--bg-alt)',
    border: external
      ? '1px dashed var(--muted-decor)'
      : `1px solid ${modal ? 'var(--orange)' : 'var(--bg-elev)'}`,
    borderRadius: 12,
    padding: 14,
    flexShrink: 0,
    position: 'relative',
  }}>
    {modal && (
      <div style={{
        position: 'absolute', top: -8, right: 12,
        fontSize: 9, color: 'var(--orange)',
        background: 'var(--bg)', padding: '1px 6px',
        borderRadius: 3, letterSpacing: '0.06em',
      }}>Modal</div>
    )}
    {external && (
      <div style={{
        position: 'absolute', top: -8, right: 12,
        fontSize: 9, color: 'var(--muted-decor)',
        background: 'var(--bg-page)', padding: '1px 6px',
        borderRadius: 3, letterSpacing: '0.06em',
      }}>App externo</div>
    )}
    <div style={{
      fontSize: 9, color: 'var(--muted-decor)', letterSpacing: '0.08em',
      marginBottom: 4,
    }}>{num}</div>
    <div style={{ fontSize: 13, color: accent, fontWeight: 500, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>{sub}</div>
  </div>
);

// seta com label da ação
const FlowArrow = ({ label }) => (
  <div style={{
    flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minWidth: 110, padding: '0 6px',
  }}>
    <div style={{
      fontSize: 10, color: 'var(--muted)',
      textAlign: 'center', lineHeight: 1.4,
      marginBottom: 4, fontStyle: 'italic',
    }}>{label}</div>
    <div style={{
      width: '100%', position: 'relative', height: 12,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--muted-decor)' }} />
      <div style={{
        width: 0, height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderLeft: '8px solid var(--muted-decor)',
      }} />
    </div>
  </div>
);

const FlowEnd = ({ text, color = 'var(--green)' }) => (
  <div style={{
    flexShrink: 0,
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 22,
    padding: '8px 16px',
    color, fontSize: 12,
    letterSpacing: '0.04em',
  }}>{text}</div>
);

// ─── flow row ─────────────────────────────────────────────────
const FlowRow = ({ children }) => (
  <div style={{
    display: 'flex', alignItems: 'center',
    gap: 0, padding: '20px 24px',
    overflowX: 'visible',
  }}>{children}</div>
);

const FlowTitle = ({ num, title, demo }) => (
  <div style={{ padding: '6px 24px 0' }}>
    <div style={{
      fontSize: 11, color: 'var(--muted-decor)',
      letterSpacing: '0.08em', marginBottom: 2,
    }}>flow {num}</div>
    <div style={{ fontSize: 18, color: 'var(--orange)', fontWeight: 500, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>demonstra: {demo}</div>
  </div>
);

// ─── 4 flows ──────────────────────────────────────────────────

const Flows = () => (
  <DCSection id="flows" title="User flows · 4 jornadas criticas">

    <DCArtboard id="flow1" label="Flow 1 — comprovante pix via share sheet" width={1500} height={340}>
      <FlowTitle num="1" title="Comprovante de pix via share sheet" demo="zero fricção em entrada externa de dados" />
      <FlowRow>
        <FlowStep num="origem" title="App do banco" sub="pdf do pix gerado" external accent="var(--muted)" />
        <FlowArrow label="Tap compartilhar" />
        <FlowStep num="android" title="Share sheet nativo" sub="grade de apps disponíveis" external accent="var(--muted)" />
        <FlowArrow label="Tap icone ouroboros" />
        <FlowStep num="tela 17" title="Receber arquivo" sub="preview + tipo detectado + path destino visivel" accent="var(--orange)" modal />
        <FlowArrow label="Salvar no inbox" />
        <FlowEnd text="toast verde · volta pro banco" />
      </FlowRow>
      <div style={{ padding: '0 24px 16px', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', maxWidth: 800 }}>
        Detalhe crítico: o ouroboros nunca abre por completo. Modal aparece, processa, fecha. Tempo total ~5s.
      </div>
    </DCArtboard>

    <DCArtboard id="flow2" label="Flow 2 — registrar tristeza por conflito" width={1500} height={340}>
      <FlowTitle num="2" title="Registrar tristeza por conflito" demo="captura emocional com contexto, sem desencorajar" />
      <FlowRow>
        <FlowStep num="origem" title="Qualquer tela" sub="fab visivel no canto" />
        <FlowArrow label="Tap fab" />
        <FlowStep num="tela 14" title="Menu radial" sub="6 botoes em arco" accent="var(--purple)" />
        <FlowArrow label="Tap trigger (vermelho)" />
        <FlowStep num="tela 18" title="Diario emocional" sub="modo trigger · borda red 2px · bloco condicional ativo" accent="var(--red)" />
        <FlowArrow label="Registrar" />
        <FlowEnd text='toast "registrado. respira."' />
      </FlowRow>
    </DCArtboard>

    <DCArtboard id="flow3" label="Flow 3 — evento positivo com lugar" width={1500} height={340}>
      <FlowTitle num="3" title="Evento positivo com lugar" demo="registrar momentos compartilhados rapidamente" />
      <FlowRow>
        <FlowStep num="origem" title="Qualquer tela" sub="fab visivel" />
        <FlowArrow label="Tap fab" />
        <FlowStep num="tela 14" title="Menu radial" sub="6 botoes em arco" accent="var(--purple)" />
        <FlowArrow label="Tap Vitória (amarelo)" />
        <FlowStep num="tela 20" title="Registro de evento" sub="textarea + lugar + chips + foto + slider" accent="var(--yellow)" />
        <FlowArrow label="Registrar" />
        <FlowEnd text='toast "anotado. tao bom."' />
      </FlowRow>
    </DCArtboard>

    <DCArtboard id="flow4" label="Flow 4 — scanner alta resolucao" width={1500} height={340}>
      <FlowTitle num="4" title="Scanner de nota fiscal alta resolucao" demo="captura por camera com ocr preview" />
      <FlowRow>
        <FlowStep num="tela 14" title="Menu radial" sub="fab expandido" accent="var(--purple)" />
        <FlowArrow label="Tap camera (laranja)" />
        <FlowStep num="tela 16a" title="Viewfinder" sub="auto-detecção de bordas · cantos cyan" accent="var(--orange)" />
        <FlowArrow label="Tap captura" />
        <FlowStep num="tela 16b" title="Preview + ocr" sub="auto-deskew · campos detectados em ciano · form de validação" accent="var(--cyan)" />
        <FlowArrow label="Salvar" />
        <FlowEnd text="alta resolução salva" />
      </FlowRow>
    </DCArtboard>

  </DCSection>
);

window.Flows = Flows;
