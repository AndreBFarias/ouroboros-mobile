/* global PhoneFrame, PhoneScreen, StatusBar, TabBar, BackHeader, PersonFilter, Avatar, Annot */

// Pure presentational primitives that all 18 screens compose.
// Render a phone bezel + 412×915 screen area + tab bar.

const StatusBar = ({ time = '22:14' }) => (
  <div className="sb">
    <span>{time}</span>
    <span className="battery"></span>
  </div>
);

const BackHeader = ({ title, right, person, personExpanded = false, hideBack = false }) => (
  <div className="hd" style={{ position: 'relative' }}>
    {!hideBack && <span className="bk">‹</span>}
    <span className="ti">{title}</span>
    {right && <span className="rt">{right}</span>}
    {person && <PersonChip active={person} expanded={personExpanded} />}
  </div>
);

const PlainHeader = ({ children }) => (
  <div className="hd">
    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{children}</span>
  </div>
);

const TabBar = ({ active = 'hoje' }) => {
  const tabs = ['Hoje', 'Rotinas', 'Diário', 'Memória'];
  return (
    <div className="tb">
      {tabs.map(t => (
        <div key={t} className={'tab' + (active === t ? ' on' : '')}>{t}</div>
      ))}
      <div className={'tab tab-plus' + (active === '+' ? ' on' : '')}>+</div>
    </div>
  );
};

const Avatar = ({ who = 'A', size = '' }) => {
  const cls = `av av-${who.toLowerCase()} ${size === 'sm' ? 'av-sm' : size === 'lg' ? 'av-lg' : ''}`;
  return <span className={cls}>{who}</span>;
};

const AvatarBoth = ({ size = 'sm' }) => (
  <span className="av-both" style={{ width: size === 'sm' ? 44 : 58, height: size === 'sm' ? 28 : 38 }}>
    <Avatar who="A" size={size} />
    <Avatar who="V" size={size} />
  </span>
);

// Filtro pessoa: chip avatar 32dp permanente no canto direito do header.
// Tap expande dropdown inline com as 3 opcoes (A / V / AV).
// Persiste entre telas via store global. Nao aparece em onboarding, settings,
// nem modais de captura onde a pessoa ja eh determinada pelo conteudo.
const PersonChip = ({ active = 'A', expanded = false }) => {
  const cls = active === 'V' ? 'pf-chip v' : 'pf-chip a';
  const label = active === 'AV' ? null : (active === 'V' ? 'V' : 'A');
  return (
    <>
      {active === 'AV'
        ? <span style={{ marginLeft: 'auto' }}><AvatarBoth size="sm" /></span>
        : <span className={cls}>{label}</span>}
      {expanded && (
        <div className="pf-dropdown">
          <div className={'pf-opt' + (active === 'A' ? ' on' : '')}>
            <Avatar who="A" size="sm" /><span>André</span>
          </div>
          <div className={'pf-opt' + (active === 'V' ? ' on' : '')}>
            <Avatar who="V" size="sm" /><span>Vitória</span>
          </div>
          <div className={'pf-opt' + (active === 'AV' ? ' on' : '')}>
            <AvatarBoth size="sm" /><span>Ambos</span>
          </div>
        </div>
      )}
    </>
  );
};

// PhoneFrame: bezel + screen area with status + tab bar.
// Children render inside .bd (the body, between header and tab bar).
const PhoneFrame = ({ header, tabBar, children, bodyStyle, time = '22:14', screenRef }) => (
  <div className="ph">
    <div className="scr" ref={screenRef}>
      <StatusBar time={time} />
      {header}
      <div className="bd" style={bodyStyle}>{children}</div>
      {tabBar}
    </div>
  </div>
);

// Wireframe anotado sobrio. Label fica FORA do frame em --muted, linha 1px
// em --muted-decor liga ate o ponto na tela. Sem callout dramatico.
const Annot = ({ x, y, w, children }) => (
  <div className="annot" style={{ left: x, top: y, width: w || 'auto' }}>
    {children}
  </div>
);

// Linha conectando label a um ponto. start/end em coords absolutas do canvas.
const AnnotLine = ({ x1, y1, x2, y2 }) => {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1) || 1;
  const height = Math.abs(y2 - y1) || 1;
  return (
    <>
      <span className="annot-line" style={{ left, top, width, height }} />
      <span className="annot-dot" style={{ left: x2 - 3, top: y2 - 3 }} />
    </>
  );
};

// Two phones side by side inside a single artboard (estado vazio + preenchido)
const DualState = ({ left, right, leftLabel = 'Estado vazio', rightLabel = 'Estado preenchido' }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60,
    padding: '0 20px',
    alignItems: 'start',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {left}
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
        {leftLabel}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {right}
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
        {rightLabel}
      </div>
    </div>
  </div>
);

// ─── AnnotatedDual ──────────────────────────────────────────
// DualState + annotation cards positioned BELOW the phones, with curved
// SVG leader lines from numbered pins (overlaid on the screen) to the
// matching numbered cards in a grid below. Each annotation:
//   { pin: 'L'|'R', at: [x, y], text: '…' }
// `at` coords are CSS pixels within the .scr area (412×915 screen body).
// Annotations are auto-numbered 1..N in array order.
const AnnotatedDual = ({
  left, right,
  leftLabel = 'Estado vazio', rightLabel = 'Estado preenchido',
  annotations = [],
}) => {
  // Phone column = 412 (screen) + 14 (bezel padding) = 426px wide.
  // Layout: 2 columns of 426 with 60px gap → total content = 912px.
  // Pins live inside .scr (412×915) starting at +7px from phone-column origin.
  const PHONE_W = 426;
  const PHONE_H = 915;
  const SCR_OFFSET = 7;
  const COL_GAP = 60;
  const LABEL_H = 32;

  const total = 2 * PHONE_W + COL_GAP;
  const leftX = 0;
  const rightX = PHONE_W + COL_GAP;

  // Card grid below: 4 cards per row, gap 32 (mais espaço entre cards).
  const CARD_W = 220;
  const CARD_GAP = 36;
  const CARDS_PER_ROW = Math.max(1, Math.floor((total + CARD_GAP) / (CARD_W + CARD_GAP)));
  const rows = Math.ceil(annotations.length / CARDS_PER_ROW);
  const CARD_H = 88;
  const ROW_GAP = 18;

  // Cards container sits below phone + label + a 32px gap.
  const cardsTop = PHONE_H + LABEL_H + 64;
  const cardCenterX = (i) => {
    const col = i % CARDS_PER_ROW;
    const rowWidth = Math.min(CARDS_PER_ROW, annotations.length - Math.floor(i / CARDS_PER_ROW) * CARDS_PER_ROW) * CARD_W +
      (Math.min(CARDS_PER_ROW, annotations.length - Math.floor(i / CARDS_PER_ROW) * CARDS_PER_ROW) - 1) * CARD_GAP;
    const startX = (total - rowWidth) / 2;
    return startX + col * (CARD_W + CARD_GAP) + CARD_W / 2;
  };
  const cardTopY = (i) => cardsTop + Math.floor(i / CARDS_PER_ROW) * (CARD_H + ROW_GAP);

  // Pin position in canvas coords (= phone column origin + scr offset + at)
  const pinPos = (a) => {
    const colX = a.pin === 'R' ? rightX : leftX;
    return [colX + SCR_OFFSET + a.at[0], SCR_OFFSET + a.at[1]];
  };

  const totalH = cardsTop + rows * (CARD_H + ROW_GAP) - ROW_GAP + 20;

  return (
    <div style={{ position: 'relative', width: total, height: totalH, margin: '0 auto' }}>
      {/* phones row */}
      <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', gap: COL_GAP }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: PHONE_W }}>
          {left}
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>{leftLabel}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: PHONE_W }}>
          {right}
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>{rightLabel}</div>
        </div>
      </div>

      {/* SVG leader lines */}
      <svg width={total} height={totalH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 3 }}>
        {annotations.map((a, i) => {
          const [px, py] = pinPos(a);
          const cx = cardCenterX(i);
          const cy = cardTopY(i);
          // curved cubic path from pin to top-center of card
          const midY = (py + cy) / 2;
          const d = `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy - 4}`;
          return (
            <g key={i}>
              <path d={d} stroke="var(--muted-decor)" strokeWidth="1" fill="none" strokeDasharray="2 3" opacity="0.7" />
              <circle cx={cx} cy={cy - 4} r="2.5" fill="var(--muted-decor)" />
            </g>
          );
        })}
      </svg>

      {/* numbered pins on phone */}
      {annotations.map((a, i) => {
        const [px, py] = pinPos(a);
        return (
          <div key={`pin-${i}`} style={{
            position: 'absolute', left: px - 11, top: py - 11,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--purple)', color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            boxShadow: '0 0 0 3px var(--bg), 0 2px 6px rgba(0,0,0,0.5)',
            zIndex: 5,
          }}>{i + 1}</div>
        );
      })}

      {/* annotation cards */}
      {annotations.map((a, i) => {
        const cx = cardCenterX(i);
        const cy = cardTopY(i);
        return (
          <div key={`card-${i}`} style={{
            position: 'absolute',
            left: cx - CARD_W / 2, top: cy,
            width: CARD_W, minHeight: CARD_H,
            background: 'var(--bg-alt)',
            border: '1px solid var(--bg-elev)',
            borderRadius: 8,
            padding: '10px 12px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, lineHeight: 1.55,
            color: 'var(--muted)',
            letterSpacing: '0.02em',
            zIndex: 4,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--purple)', color: 'var(--bg)',
              fontSize: 10, fontWeight: 600, marginRight: 8, marginBottom: 4,
              verticalAlign: 'middle',
            }}>{i + 1}</div>
            <span style={{ color: 'var(--fg)' }}>{a.text}</span>
          </div>
        );
      })}
    </div>
  );
};

Object.assign(window, {
  StatusBar, BackHeader, PlainHeader, TabBar,
  Avatar, AvatarBoth, PersonChip,
  PhoneFrame, Annot, AnnotLine, DualState, AnnotatedDual,
});
