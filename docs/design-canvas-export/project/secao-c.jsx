/* global PhoneFrame, BackHeader, PlainHeader, TabBar, StatusBar, Avatar, AvatarBoth, PersonChip, DualState, Annot, AnnotLine, DCSection, DCArtboard */

// ============================================================
// SECAO C - Captura ativa (telas 14, 16, 17)
// ============================================================

// ─── Tela 14: FAB expandido (menu radial) ─────────────────────
// Overlay 50% sobre a tela atual + 6 botoes em arco subindo do FAB.
// FAB rotacionado 45° vira X. Tap fora fecha.

const Screen14_FAB = ({ filled = false }) => {
  // posições em arco semicircular subindo do FAB (bottom-right)
  // FAB em ~ (336, 720) dentro do .scr
  // raio 130, angulos de 110° (esquerda) até 230° (cima-esquerda) sentido anti-horario
  const fabX = 350, fabY = 730;
  const radius = 165;
  const items = [
    { id: 'humor',  color: 'var(--pink)',   icon: '♡',  label: 'humor' },
    { id: 'voz',    color: 'var(--cyan)',   icon: '◉',  label: 'voz' },
    { id: 'cam',    color: 'var(--orange)', icon: '▭',  label: 'camera' },
    { id: 'ex',     color: 'var(--green)',  icon: '⚇',  label: 'exercício' },
    { id: 'vit',    color: 'var(--yellow)', icon: '✧',  label: 'Vitória' },
    { id: 'trig',   color: 'var(--red)',    icon: '△',  label: 'trigger' },
  ];
  // distribute em arco de 110° (apontando esquerda) até 200° (apontando cima)
  // ou seja, 6 angulos entre 105 e 205 graus (medido do +x, sentido CCW = subindo/esquerda)
  const startA = 100, endA = 200;
  const step = (endA - startA) / (items.length - 1);

  return (
    <PhoneFrame
      time="22:14"
      header={
        filled ? null : <BackHeader title="Hoje" person="A" />
      }
      tabBar={null}
    >
      {/* tela base esmaecida */}
      <div style={{ position: 'absolute', inset: 0, opacity: filled ? 1 : 0.35, pointerEvents: 'none' }}>
        {/* mock simples da tela hoje pra dar contexto */}
        <div style={{ padding: '70px 18px 18px', color: 'var(--muted-decor)', fontSize: 12 }}>
          <div className="minicard" style={{ opacity: 0.6 }}>
            <div className="cap">Treino de hoje</div>
            <div className="val" style={{ fontSize: 14 }}>Rotina A — peito + costas</div>
          </div>
          <div className="minicard" style={{ opacity: 0.6 }}>
            <div className="cap">Humor</div>
            <div className="val" style={{ fontSize: 14 }}>3 / 5</div>
          </div>
        </div>
      </div>

      {filled && (
        <>
          {/* overlay escuro */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(13,14,19,0.55)',
            zIndex: 2,
          }} />

          {/* botoes radiais */}
          {items.map((it, i) => {
            const angle = (startA + step * i) * Math.PI / 180;
            const x = fabX + Math.cos(angle) * radius;
            const y = fabY - Math.sin(angle) * radius;
            return (
              <div key={it.id} style={{
                position: 'absolute',
                left: x - 24, top: y - 24,
                zIndex: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: it.color, color: 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}>{it.icon}</div>
                <div style={{
                  marginTop: 6, fontSize: 11, color: 'var(--fg)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                }}>{it.label}</div>
              </div>
            );
          })}
        </>
      )}

      {/* FAB */}
      <div style={{
        position: 'absolute',
        right: 22, bottom: 28,
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--purple)',
        color: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, fontWeight: 400,
        zIndex: 4,
        transform: filled ? 'rotate(45deg)' : 'none',
        transition: '200ms',
        boxShadow: '0 4px 14px rgba(189,147,249,0.4)',
      }}>+</div>
    </PhoneFrame>
  );
};

// ─── Tela 16: Camera scanner ───────────────────────────────────
// Estado A: viewfinder. Estado B: preview com OCR + form de validação.

const Screen16_Scanner = ({ filled = false }) => {
  if (!filled) {
    // viewfinder
    return (
      <PhoneFrame time="22:14" header={null} tabBar={null} bodyStyle={{ padding: 0 }}>
        {/* simulação de feed da camera */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #2a2c38 0%, #1a1b24 50%, #20222d 100%)',
          zIndex: 0,
        }} />

        {/* doc detectado simulado */}
        <div style={{
          position: 'absolute',
          left: '15%', right: '15%',
          top: '22%', bottom: '32%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          zIndex: 1,
          display: 'flex', flexDirection: 'column',
          padding: 14, gap: 4,
        }}>
          <div style={{ width: '60%', height: 8, background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ width: '40%', height: 6, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ marginTop: 12, width: '80%', height: 5, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ width: '70%', height: 5, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ width: '85%', height: 5, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ marginTop: 10, width: '50%', height: 5, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ width: '60%', height: 5, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ marginTop: 'auto', width: '40%', height: 8, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* cantos de mira em ciano */}
        {[
          { l: '15%', t: '22%', tr: 0, b: 1, r: 1, bo: 0 },
          { r: '15%', t: '22%', tl: 0, tr: 1, b: 1, bo: 0 },
          { l: '15%', b: '32%', tr: 0, br: 0, bl: 1, t: 1 },
          { r: '15%', b: '32%', tl: 0, bl: 1, t: 1, br: 0 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: c.l, right: c.r, top: c.t, bottom: c.b,
            width: 24, height: 24,
            borderTop:    c.t  ? '2px solid var(--cyan)' : 'none',
            borderRight:  c.tr ? '2px solid var(--cyan)' : 'none',
            borderBottom: c.b  ? '2px solid var(--cyan)' : 'none',
            borderLeft:   c.bl ? '2px solid var(--cyan)' : 'none',
            zIndex: 2,
          }} />
        ))}

        {/* indicador top "12 MP" */}
        <div style={{
          position: 'absolute', top: 50, left: 0, right: 0,
          textAlign: 'center', fontSize: 11, color: 'var(--muted)',
          zIndex: 3, fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.04em',
        }}>12 mp · alta qualidade</div>

        {/* indicador "documento detectado" */}
        <div style={{
          position: 'absolute', top: '78%', left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12, color: 'var(--cyan)',
          background: 'rgba(13,14,19,0.7)',
          padding: '6px 14px', borderRadius: 14,
          border: '1px solid var(--cyan)',
          zIndex: 3,
        }}>Documento detectado</div>

        {/* bottom bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 130,
          background: 'rgba(13,14,19,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 28px',
          zIndex: 4,
        }}>
          {/* galeria */}
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--bg-elev)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--muted)',
          }}>▦</div>

          {/* captura grande */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--fg)',
            border: '4px solid rgba(248,248,242,0.3)',
            boxShadow: '0 0 0 2px var(--fg)',
          }} />

          {/* flash */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'var(--yellow)',
          }}>⚡</div>
        </div>
      </PhoneFrame>
    );
  }

  // preview pos-captura com OCR
  return (
    <PhoneFrame
      time="22:15"
      header={<BackHeader title="Confirmar captura" person="A" />}
      tabBar={null}
    >
      {/* preview imagem com OCR overlay */}
      <div style={{
        position: 'relative',
        background: '#e8e5db',
        borderRadius: 8,
        height: 200,
        marginBottom: 14,
        overflow: 'hidden',
        padding: 16,
        fontFamily: 'serif',
        color: '#2a2820',
      }}>
        <div style={{ fontSize: 9, marginBottom: 4 }}>MERCADO XYZ — CNPJ 00.000.000/0001-00</div>
        <div style={{ fontSize: 7, color: '#5a584a', marginBottom: 12 }}>RUA EXEMPLO, 123 — SÃO PAULO/SP</div>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{ fontSize: 8 }}>28/04/2026  19:42</span>
          <span style={{
            position: 'absolute', inset: '-2px -4px',
            border: '1px solid var(--cyan)',
            background: 'rgba(139,233,253,0.15)',
          }} />
        </div>

        <div style={{ marginTop: 10, fontSize: 8 }}>
          <div>2x ARROZ TIO JOÃO 1KG ............. 18,90</div>
          <div>1x FEIJÃO CARIOCA 1KG ............... 9,50</div>
          <div>3x BANANA NANICA KG ................ 12,30</div>
        </div>

        <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>TOTAL: R$ 87,40</span>
          <span style={{
            position: 'absolute', inset: '-3px -5px',
            border: '1px solid var(--cyan)',
            background: 'rgba(139,233,253,0.15)',
          }} />
        </div>
      </div>

      {/* form de validação */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div className="cap" style={{ marginBottom: 4 }}>Valor</div>
          <input className="input" defaultValue="R$ 87,40" />
        </div>
        <div>
          <div className="cap" style={{ marginBottom: 4 }}>Data</div>
          <input className="input" defaultValue="28/04/2026" />
        </div>
      </div>

      <div className="cap" style={{ marginBottom: 4 }}>Descrição</div>
      <input className="input" defaultValue="mercado xyz — semana" style={{ marginBottom: 12 }} />

      <div className="cap" style={{ marginBottom: 6 }}>Categoria</div>
      <div style={{ marginBottom: 12 }}>
        <span className="chip on">Mercado</span>
        <span className="chip">Restaurante</span>
        <span className="chip">Transporte</span>
      </div>

      <div className="cap" style={{ marginBottom: 6 }}>Pessoa</div>
      <div style={{ marginBottom: 14 }}>
        <span className="chip on">André</span>
        <span className="chip">Vitória</span>
        <span className="chip">Ambos</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 'auto' }}>
        <button className="btn btn-out">Regravar</button>
        <button className="btn btn-grn">Salvar</button>
      </div>
    </PhoneFrame>
  );
};

// ─── Tela 17: Share intent (receber arquivo) ──────────────────
// Modal full screen quando outro app envia arquivo via share sheet.
// PATH .md visivel em cyan mono. Tela 17 é uma das 3 telas com path visivel.

const Screen17_Share = ({ filled = false }) => (
  <PhoneFrame
    time="22:14"
    header={<PlainHeader>Salvar no inbox</PlainHeader>}
    tabBar={null}
  >
    {!filled ? (
      <>
        {/* preview vazio */}
        <div style={{
          background: 'var(--bg-alt)',
          border: '1px dashed var(--bg-elev)',
          borderRadius: 8,
          height: 280,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted-decor)', fontSize: 12,
          marginBottom: 14,
        }}>
          Aguardando arquivo do app de origem
        </div>

        <div className="cap" style={{ marginBottom: 6 }}>Tipo detectado</div>
        <div style={{ marginBottom: 14 }}>
          <span className="chip">Comprovante de Pix</span>
          <span className="chip">Extrato bancário</span>
          <span className="chip">Exame médico</span>
          <span className="chip">Nota fiscal</span>
          <span className="chip">Outro</span>
        </div>

        <div className="cap" style={{ marginBottom: 6 }}>Destino no inbox</div>
        <div className="path-mono" style={{ marginBottom: 14, opacity: 0.5 }}>
          Inbox/...
        </div>

        <button className="btn btn-grn" style={{ marginTop: 'auto' }} disabled>Salvar</button>
        <button className="btn btn-ghost" style={{ marginTop: 4 }}>Cancelar</button>
      </>
    ) : (
      <>
        {/* preview do PDF */}
        <div style={{
          background: '#f4f1e8',
          borderRadius: 8,
          height: 230,
          marginBottom: 8,
          padding: 18,
          color: '#2a2820',
          fontFamily: 'serif',
          position: 'relative',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 6 }}>BANCO XPTO — COMPROVANTE PIX</div>
          <div style={{ fontSize: 7, color: '#5a584a' }}>Id: E7f4-a8c2-...</div>

          <div style={{ marginTop: 14, fontSize: 7 }}>
            <div>De: ANDRÉ F. SILVA</div>
            <div>Para: MERCADO PADARIA LTDA</div>
            <div>Cnpj: ●●.●●●.●●●/0001-●●</div>
          </div>

          <div style={{ marginTop: 14, fontSize: 16, fontWeight: 700 }}>R$ 32,80</div>
          <div style={{ fontSize: 7, color: '#5a584a' }}>28/04/2026 — 19:42</div>

          <div style={{
            position: 'absolute', bottom: 8, right: 12,
            fontSize: 7, color: '#7a7868',
          }}>Pdf · 1 pagina</div>
        </div>
        <div className="mut" style={{ fontSize: 11, marginBottom: 14 }}>
          Comprovante-pix-2026-04-28.pdf · 240 kb
        </div>

        <div className="cap" style={{ marginBottom: 6 }}>Tipo detectado</div>
        <div style={{ marginBottom: 14 }}>
          <span className="chip on-grn">Comprovante de Pix</span>
          <span className="chip">Extrato bancário</span>
          <span className="chip">Nota fiscal</span>
          <span className="chip">Outro</span>
        </div>

        <div className="cap" style={{ marginBottom: 6 }}>Destino no inbox</div>
        <div className="path-mono" style={{ marginBottom: 14 }}>
          Inbox/financeiro/pix/2026-04-28-194203.pdf
        </div>

        <div className="cap" style={{ marginBottom: 6 }}>Pessoa</div>
        <div style={{ marginBottom: 14 }}>
          <span className="chip on">André</span>
          <span className="chip">Vitória</span>
          <span className="chip">Ambos</span>
        </div>

        <button className="btn btn-grn" style={{ marginTop: 'auto' }}>Salvar</button>
        <button className="btn btn-ghost" style={{ marginTop: 4 }}>Cancelar</button>
      </>
    )}
  </PhoneFrame>
);

// ─── Wrappers de artboard (estado vazio + preenchido lado a lado) ────

const SecaoC = () => (
  <DCSection id="seção-c" title="Seção C — captura ativa">

    <DCArtboard id="t14" label="14 — FAB expandido (menu radial)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen14_FAB filled={false} />}
          right={<Screen14_FAB filled={true} />}
          leftLabel="Estado base"
          rightLabel="Menu radial expandido"
          annotations={[
            { pin: 'L', at: [340, 760], text: 'FAB rotaciona 45° e vira X quando expandido.' },
            { pin: 'R', at: [206, 580], text: 'Tap fora ou no X fecha · slide-down 200ms.' },
            { pin: 'R', at: [206, 740], text: 'Labels micro 11px sob cada botão do menu radial.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t16" label="16 — Câmera scanner alta resolução" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen16_Scanner filled={false} />}
          right={<Screen16_Scanner filled={true} />}
          leftLabel="Viewfinder com auto-detecção"
          rightLabel="Preview pós-captura · OCR + form"
          annotations={[
            { pin: 'L', at: [206, 460], text: 'Cantos cyan aparecem quando 4 bordas são detectadas.' },
            { pin: 'L', at: [206, 760], text: 'Captura 72dp branco · galeria + flash nas laterais.' },
            { pin: 'R', at: [206, 380], text: 'Campos detectados destacados em ciano sobre a imagem.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t17" label="17 — Share intent (path .md visível)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen17_Share filled={false} />}
          right={<Screen17_Share filled={true} />}
          leftLabel="Aguardando arquivo"
          rightLabel="Pix detectado · pronto pra salvar"
          annotations={[
            { pin: 'L', at: [206, 280], text: 'Modal full screen · sem tab bar · processa e fecha.' },
            { pin: 'R', at: [206, 580], text: 'Path do destino aparece em ciano mono · atualiza com o tipo detectado.' },
            { pin: 'R', at: [206, 820], text: 'Tempo total do flow: ~5s · app não abre por completo.' },
          ]}
        />
      </div>
    </DCArtboard>

  </DCSection>
);

window.SecaoC = SecaoC;
