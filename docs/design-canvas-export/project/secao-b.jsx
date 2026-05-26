/* global PhoneFrame, BackHeader, PlainHeader, TabBar, StatusBar, Avatar, AvatarBoth, PersonChip, DualState, Annot, AnnotLine, DCSection, DCArtboard */

// ============================================================
// SECAO B - Estado interno (telas 15, 18, 19, 20)
// ============================================================

// reusable slider row
const SliderRow = ({ label, value, max = 5, color = 'var(--purple)' }) => {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="cap">{label}</span>
        <span style={{ color: 'var(--cyan)', fontSize: 14, fontWeight: 500 }}>{value}/{max}</span>
      </div>
      <div className="slider-track" style={{ marginTop: 8 }}>
        <div className="slider-fill" style={{ width: pct + '%', background: color }} />
        <div className="slider-thumb" style={{ left: pct + '%', background: color, boxShadow: `0 0 0 4px ${color}33` }} />
      </div>
    </div>
  );
};

// ─── Tela 15: Humor rápido ────────────────────────────────────
const Screen15_Humor = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Humor agora" person="A" />}
    tabBar={null}
  >
    <SliderRow label="Humor"     value={filled ? 3 : 0} />
    <SliderRow label="Energia"   value={filled ? 2 : 0} />
    <SliderRow label="Ansiedade" value={filled ? 4 : 0} color="var(--orange)" />
    <SliderRow label="Foco"      value={filled ? 3 : 0} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', marginBottom: 4 }}>
      <span className="fg" style={{ fontSize: 13 }}>Tomei medicação</span>
      <span className={'sw' + (filled ? ' on' : '')} />
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span className="fg" style={{ fontSize: 13 }}>Horas de sono ontem</span>
      <input className="input" style={{ width: 60, textAlign: 'center', minHeight: 36, padding: '6px 8px' }} defaultValue={filled ? '6' : ''} placeholder="—" />
    </div>

    <div className="cap" style={{ marginBottom: 6 }}>Tags rapidas</div>
    <div style={{ marginBottom: 12 }}>
      {filled ? (
        <>
          <span className="chip on">Trabalho pesado</span>
          <span className="chip">Exercício</span>
          <span className="chip on">Ansiedade alta</span>
          <span className="chip">Social</span>
          <span className="chip on">Dormi mal</span>
          <span className="chip">Conflito</span>
        </>
      ) : (
        <>
          <span className="chip">Trabalho pesado</span>
          <span className="chip">Exercício</span>
          <span className="chip">Social</span>
          <span className="chip">Sozinho</span>
          <span className="chip">Dormi mal</span>
          <span className="chip">Ansiedade alta</span>
          <span className="chip">Boa conversa</span>
          <span className="chip">Conflito</span>
        </>
      )}
    </div>

    <div className="cap" style={{ marginBottom: 4 }}>Uma frase sobre hoje (opcional)</div>
    <input
      className="input"
      placeholder="…"
      defaultValue={filled ? 'dia denso, mas terminou tranquilo.' : ''}
      style={{ marginBottom: 14 }}
    />

    <button className="btn btn-grn" style={{ marginTop: 'auto' }}>Salvar</button>
  </PhoneFrame>
);

// ─── Tela 18: Diario emocional ────────────────────────────────
const Screen18_Diario = ({ filled }) => {
  const isTrigger = true; // exemplo do flow 2
  const borderColor = isTrigger ? 'var(--red)' : 'var(--green)';
  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Registrar momento" person="A" />}
      tabBar={null}
    >
      {/* toggle trigger / Vitória */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span className={'chip on-red'} style={{ flex: 1, justifyContent: 'center', textAlign: 'center', padding: '8px' }}>Trigger</span>
        <span className={'chip'} style={{ flex: 1, justifyContent: 'center', textAlign: 'center', padding: '8px' }}>Vitória</span>
      </div>

      <div style={{
        borderLeft: filled ? `2px solid ${borderColor}` : '2px solid var(--bg-elev)',
        paddingLeft: 12,
      }}>
        <div className="cap" style={{ marginBottom: 6 }}>Como você está?</div>
        <div style={{ marginBottom: 12 }}>
          {filled ? (
            <>
              <span className="chip on-red">Tristeza</span>
              <span className="chip">Raiva</span>
              <span className="chip on-red">Frustração</span>
              <span className="chip">Ansiedade</span>
              <span className="chip">Medo</span>
              <span className="chip on-red">Solidão</span>
            </>
          ) : (
            <>
              <span className="chip">Tristeza</span>
              <span className="chip">Raiva</span>
              <span className="chip">Ansiedade</span>
              <span className="chip">Frustração</span>
              <span className="chip">Medo</span>
              <span className="chip">Solidão</span>
            </>
          )}
        </div>

        <SliderRow label="Intensidade" value={filled ? 4 : 0} color="var(--red)" />

        <div className="cap" style={{ marginBottom: 4 }}>O que aconteceu?</div>
        <textarea
          className="input"
          style={{ minHeight: 60, marginBottom: 12, resize: 'none' }}
          defaultValue={filled ? 'discussao com chefe sobre prazo. me senti ignorado.' : ''}
          placeholder="…"
        />

        <div className="cap" style={{ marginBottom: 6 }}>Com quem</div>
        <div style={{ marginBottom: 12 }}>
          <span className={'chip' + (filled ? ' on' : '')}>No trabalho</span>
          <span className="chip">Com Vitória</span>
          <span className="chip">Com família</span>
          <span className="chip">Sozinho</span>
        </div>

        {filled && (
          <>
            <div className="cap" style={{ marginBottom: 4 }}>O que você fez pra lidar?</div>
            <textarea
              className="input"
              style={{ minHeight: 50, marginBottom: 8, resize: 'none' }}
              defaultValue="sai do escritorio, caminhei 10min."
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className="fg" style={{ fontSize: 13 }}>Funcionou?</span>
              <span className="sw on" />
            </div>
          </>
        )}
      </div>

      <button className="btn-ghost" style={{
        background: 'transparent', border: '1px dashed var(--bg-elev)',
        padding: '10px', borderRadius: 8, color: 'var(--cyan)', fontSize: 12,
        marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
      }}> gravar audio</button>

      <button className={isTrigger ? 'btn btn-red' : 'btn btn-grn'}>
        Registrar
      </button>

      <div style={{ fontSize: 10, color: 'var(--muted-decor)', textAlign: 'center', marginTop: 8 }}>
        Salvo localmente. Ninguém ve além de vocês dois.
      </div>
    </PhoneFrame>
  );
};

// ─── Tela 19: Lista positivos e negativos do dia ──────────────
const Screen19_Colunas = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Hoje em duas colunas" person="A" />}
    tabBar={<TabBar active="Diário" />}
  >
    <div style={{ marginBottom: 12 }}>
      <span className="chip on">Hoje</span>
      <span className="chip">Esta semana</span>
      <span className="chip">Este mes</span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
      {/* coluna positivos */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'var(--green)', fontSize: 18, fontWeight: 500, marginBottom: 10 }}>+ positivos</div>
        {filled ? (
          <>
            <div className="minicard" style={{ padding: 10, marginBottom: 8 }}>
              <div className="mut" style={{ fontSize: 10 }}>09:24</div>
              <div style={{ fontSize: 12 }}>Cafe com Vitória. Boa conversa.</div>
            </div>
            <div className="minicard" style={{ padding: 10, marginBottom: 8 }}>
              <div className="mut" style={{ fontSize: 10 }}>14:10</div>
              <div style={{ fontSize: 12 }}>Terminei a feature do dashboard.</div>
            </div>
            <div className="minicard" style={{ padding: 10, marginBottom: 8 }}>
              <div className="mut" style={{ fontSize: 10 }}>20:48</div>
              <div style={{ fontSize: 12 }}>Treino tranquilo. Sem pressa.</div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '20px 6px', textAlign: 'center', lineHeight: 1.6 }}>
            Registre algo bom de hoje.
          </div>
        )}
        <button className="btn-ghost" style={{
          marginTop: 'auto', background: 'transparent',
          border: '1px dashed var(--bg-elev)', borderRadius: 8,
          padding: '8px', fontSize: 11, color: 'var(--green)',
          fontFamily: 'inherit', cursor: 'pointer',
        }}>+ adicionar</button>
      </div>

      {/* coluna negativos */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: 'var(--red)', fontSize: 18, fontWeight: 500, marginBottom: 10 }}>− negativos</div>
        {filled ? (
          <>
            <div className="minicard" style={{ padding: 10, marginBottom: 8, borderLeft: '2px solid var(--red)' }}>
              <div className="mut" style={{ fontSize: 10 }}>16:32</div>
              <div style={{ fontSize: 12 }}>Discussao no trabalho. Me senti ignorado.</div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '20px 6px', textAlign: 'center', lineHeight: 1.6 }}>
            Nada hoje. Tudo bem.
          </div>
        )}
        <button className="btn-ghost" style={{
          marginTop: 'auto', background: 'transparent',
          border: '1px dashed var(--bg-elev)', borderRadius: 8,
          padding: '8px', fontSize: 11, color: 'var(--red)',
          fontFamily: 'inherit', cursor: 'pointer',
        }}>+ adicionar</button>
      </div>
    </div>
  </PhoneFrame>
);

// ─── Tela 20: Registro de evento com lugar ────────────────────
const Screen20_Evento = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Registrar evento" person="A" />}
    tabBar={null}
  >
    <div className="cap" style={{ marginBottom: 4 }}>O que aconteceu</div>
    <textarea
      className="input"
      style={{ minHeight: 60, marginBottom: 12, resize: 'none' }}
      placeholder="Uma linha sobre o que aconteceu."
      defaultValue={filled ? 'jantamos no japones do bairro. comida boa, sem pressa.' : ''}
    />

    <div className="cap" style={{ marginBottom: 4 }}>Onde</div>
    <input
      className="input"
      placeholder="Lugar ou endereço"
      defaultValue={filled ? 'tora-tora — pinheiros' : ''}
      style={{ marginBottom: 6 }}
    />
    <button className="btn-ghost" style={{
      background: 'transparent', border: '1px solid var(--bg-elev)',
      borderRadius: 8, padding: '8px', fontSize: 12, color: filled ? 'var(--cyan)' : 'var(--muted)',
      fontFamily: 'inherit', cursor: 'pointer', marginBottom: 6,
      width: '100%', textAlign: 'center',
    }}>{filled ? ' pinheiros, São Paulo' : ' usar localização atual'}</button>

    <div className="cap" style={{ marginBottom: 4, marginTop: 8 }}>Quando</div>
    <div style={{ marginBottom: 12 }}>
      <span className="chip on">Agora</span>
      <span className="chip">Outro horário</span>
    </div>

    <div className="cap" style={{ marginBottom: 6 }}>Com quem</div>
    <div style={{ marginBottom: 12 }}>
      <span className={'chip' + (filled ? ' on-pnk' : '')}>Vitória</span>
      <span className="chip">Amigo</span>
      <span className="chip">Família</span>
      <span className="chip">Sozinho</span>
    </div>

    <div className="cap" style={{ marginBottom: 6 }}>Categoria</div>
    <div style={{ marginBottom: 12 }}>
      <span className="chip">Exercício</span>
      <span className={'chip' + (filled ? ' on' : '')}>Rolezinho</span>
      <span className="chip">Consulta</span>
      <span className="chip">Trabalho</span>
      <span className="chip">Evento social</span>
    </div>

    <div className="cap" style={{ marginBottom: 4 }}>Fotos (opcional)</div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {filled ? (
        <>
          <div style={{ width: 60, height: 60, borderRadius: 8, background: 'linear-gradient(135deg, #44475a, #6272a4)' }} />
          <div style={{ width: 60, height: 60, borderRadius: 8, background: 'linear-gradient(135deg, #6272a4, #44475a)' }} />
          <div style={{
            width: 60, height: 60, borderRadius: 8, background: 'transparent',
            border: '1px dashed var(--bg-elev)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', fontSize: 18,
          }}>+</div>
        </>
      ) : (
        <div style={{
          width: 60, height: 60, borderRadius: 8, background: 'transparent',
          border: '1px dashed var(--bg-elev)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', fontSize: 18,
        }}>+</div>
      )}
    </div>

    <SliderRow label="Como foi?" value={filled ? 4 : 0} color="var(--green)" />

    <button className="btn btn-grn" style={{ marginTop: 'auto' }}>Registrar</button>
  </PhoneFrame>
);

// ─── Wrapper de seção ─────────────────────────────────────────
const SecaoB = () => (
  <DCSection id="seção-b" title="Seção B — estado interno">

    <DCArtboard id="t15" label="15 — Humor rápido" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen15_Humor filled={false} />}
          right={<Screen15_Humor filled={true} />}
          leftLabel="Bottom sheet aberto · zerado"
          rightLabel="30s preenchidos"
          annotations={[
            { pin: 'L', at: [206, 740], text: '4 sliders de 1 a 5 · valor cyan ao lado.' },
            { pin: 'R', at: [206, 380], text: 'Chips multi-select · sem limite.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t18" label="18 — Diário emocional (modo trigger)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen18_Diario filled={false} />}
          right={<Screen18_Diario filled={true} />}
          leftLabel="Form vazio · trigger selecionado"
          rightLabel="Preenchido · bloco condicional ativo"
          annotations={[
            { pin: 'L', at: [206, 380], text: 'Borda esquerda red 2px no modo trigger · green se Vitória.' },
            { pin: 'R', at: [206, 600], text: 'Bloco "como lidou" só aparece no modo trigger.' },
            { pin: 'R', at: [206, 850], text: 'Rodapé micro reforça privacidade local.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t19" label="19 — Duas colunas (positivos / negativos)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen19_Colunas filled={false} />}
          right={<Screen19_Colunas filled={true} />}
          leftLabel="Dia em branco"
          rightLabel="3 positivos · 1 negativo"
          annotations={[
            { pin: 'L', at: [206, 460], text: 'Estado vazio · sem culpa · "Nada hoje. Tudo bem."' },
            { pin: 'R', at: [206, 380], text: 'Tap em card abre tela 18 com dados pré-preenchidos.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t20" label="20 — Registro de evento com lugar" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen20_Evento filled={false} />}
          right={<Screen20_Evento filled={true} />}
          leftLabel="Form vazio"
          rightLabel="Evento com Vitória · localização detectada"
          annotations={[
            { pin: 'L', at: [206, 360], text: 'Botão "usar localização" abre permissão Android · vira chip cyan se autorizado.' },
            { pin: 'R', at: [206, 480], text: 'Vitória pré-selecionada se vault compartilhado.' },
          ]}
        />
      </div>
    </DCArtboard>

  </DCSection>
);

window.SecaoB = SecaoB;
