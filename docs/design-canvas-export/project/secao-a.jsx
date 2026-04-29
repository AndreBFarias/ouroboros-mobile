/* global PhoneFrame, BackHeader, PlainHeader, TabBar, Avatar, AvatarBoth, PersonChip, DualState, Annot, DCSection, DCArtboard */

// ============================================================
// SECAO A - Movimento e memórias (telas 07-13)
// ============================================================

// reuse mini sparkline
const Spark = ({ data = [3, 4, 3, 5, 4, 3, 5, 4, 4, 5, 3, 4], color = 'var(--cyan)' }) => {
  const max = Math.max(...data);
  return (
    <div className="spark" style={{ height: 24 }}>
      {data.map((v, i) => (
        <span key={i} style={{ height: `${(v/max)*100}%`, background: color }} />
      ))}
    </div>
  );
};

// ─── Tela 07: Galeria de exercícios ──────────────────────────
const exGroups = [
  { name: 'supino reto', group: 'peito' },
  { name: 'supino inclinado', group: 'peito' },
  { name: 'crucifixo halter', group: 'peito' },
  { name: 'remada baixa', group: 'costas' },
  { name: 'puxada frontal', group: 'costas' },
  { name: 'agachamento', group: 'pernas' },
  { name: 'leg press', group: 'pernas' },
  { name: 'desenvolvimento', group: 'ombros' },
  { name: 'elevação lateral', group: 'ombros' },
  { name: 'prancha', group: 'core' },
];

const Screen07_Galeria = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Galeria" person="A" />}
    tabBar={<TabBar active="Rotinas" />}
  >
    <div style={{ marginBottom: 12, overflowX: 'hidden' }}>
      <span className="chip on">Todos</span>
      <span className="chip">Peito</span>
      <span className="chip">Costas</span>
      <span className="chip">Pernas</span>
      <span className="chip">Ombros</span>
      <span className="chip">Core</span>
    </div>

    <input className="input" placeholder="Buscar exercício…" style={{ marginBottom: 14, fontSize: 12 }} />

    {!filled ? (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}>⚇</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Nenhum exercício cadastrado ainda.<br/>toque + pra criar.
        </div>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, overflow: 'hidden' }}>
        {exGroups.slice(0, 6).map((ex, i) => (
          <div key={i} style={{
            background: 'var(--bg-alt)', borderRadius: 10, padding: 8,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{
              aspectRatio: 1, background: 'var(--bg-elev)', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted-decor)', fontSize: 22,
            }}>⚇</div>
            <div>
              <div style={{ color: 'var(--orange)', fontSize: 12 }}>{ex.name}</div>
              <div className="mut" style={{ fontSize: 10 }}>{ex.group}</div>
            </div>
          </div>
        ))}
      </div>
    )}

    <button className="btn-ghost" style={{
      marginTop: 8, background: 'transparent', border: '1px solid var(--bg-elev)',
      borderRadius: 8, padding: '10px', color: 'var(--purple)',
      fontSize: 12, fontFamily: 'inherit',
    }}>+ novo exercício</button>
  </PhoneFrame>
);

// ─── Tela 08: Detalhe de exercício ─────────────────────────────
const Screen08_Detalhe = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title={filled ? 'supino reto com halteres' : 'novo exercício'} person="A" />}
    tabBar={null}
  >
    {filled ? (
      <>
        <div style={{
          aspectRatio: 1, background: 'var(--bg-elev)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted-decor)', fontSize: 38, marginBottom: 12,
          maxHeight: 230,
        }}>⚇ gif</div>

        <div style={{ marginBottom: 8 }}>
          <span className="chip" style={{ background: 'rgba(139,233,253,0.15)', color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>Peito</span>
          <span className="chip" style={{ background: 'rgba(139,233,253,0.15)', color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>Tríceps</span>
        </div>
        <div className="mut" style={{ fontSize: 12, marginBottom: 12 }}>Iniciante · halteres · 4 kg</div>

        <div className="cap">Como executar</div>
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>
          Deite no banco com pes apoiados. Halteres na linha do peito, palmas pra dentro. Empurre verticalmente sem travar cotovelos.
        </div>

        <div className="cap">Dicas</div>
        <ul style={{ fontSize: 11, color: 'var(--muted)', margin: 0, padding: '0 0 0 14px', lineHeight: 1.7 }}>
          <li>Respira na descida, expira no esforço.</li>
          <li>Se o ombro doer, reduz amplitude.</li>
        </ul>

        <div className="divider" />
        <div className="cap">Histórico</div>
        <Spark data={[3, 3, 4, 4, 3, 4, 5, 4, 4, 5, 4, 5]} />
        <div className="mut" style={{ fontSize: 11, marginTop: 6 }}>Última vez: 23/04 · 4 kg · 3x8</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button className="btn btn-out">Editar</button>
          <button className="btn btn-pri">+ treino livre</button>
        </div>
        <button className="btn-ghost" style={{
          background: 'transparent', border: 'none', color: 'var(--red)',
          fontSize: 11, fontFamily: 'inherit', marginTop: 4, padding: 8,
        }}>Excluir</button>
      </>
    ) : (
      <>
        <div className="gif-up" style={{ marginBottom: 14 }}>
          ⚇<br/>tocar pra adicionar gif
        </div>

        <div className="cap" style={{ marginBottom: 4 }}>Nome</div>
        <input className="input" placeholder="Ex: supino reto" style={{ marginBottom: 10 }} />

        <div className="cap" style={{ marginBottom: 6 }}>Grupo muscular</div>
        <div style={{ marginBottom: 12 }}>
          <span className="chip">Peito</span>
          <span className="chip">Costas</span>
          <span className="chip">Pernas</span>
          <span className="chip">Ombros</span>
          <span className="chip">Core</span>
        </div>

        <div className="cap" style={{ marginBottom: 4 }}>Como executar</div>
        <textarea className="input" placeholder="Descreva os passos…" style={{ minHeight: 70, resize: 'none', marginBottom: 12 }} />

        <div className="cap" style={{ marginBottom: 4 }}>Dicas</div>
        <textarea className="input" placeholder="Opcional…" style={{ minHeight: 50, resize: 'none', marginBottom: 14 }} />

        <button className="btn btn-grn" style={{ marginTop: 'auto' }}>Salvar</button>
      </>
    )}
  </PhoneFrame>
);

// ─── Tela 09: Heatmap de treinos ──────────────────────────────
const Screen09_Heatmap = ({ filled }) => {
  const cells = [];
  // 13 weeks × 7 days = 91 cells
  for (let i = 0; i < 91; i++) {
    if (!filled) {
      cells.push('');
    } else {
      const r = Math.random();
      let lvl = '';
      if (r > 0.55) lvl = 'lvl1';
      if (r > 0.75) lvl = 'lvl2';
      if (r > 0.88) lvl = 'lvl3';
      cells.push(lvl);
    }
  }
  // mark today (last cell column 13, row variable)
  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Memórias" person="A" />}
      tabBar={<TabBar active="Memória" />}
    >
      {/* tabs internas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--bg-elev)' }}>
        <span style={{ padding: '6px 12px', color: 'var(--purple)', borderBottom: '2px solid var(--purple)', fontSize: 12 }}>Treinos</span>
        <span style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: 12 }}>Fotos</span>
        <span style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: 12 }}>Marcos</span>
      </div>

      {!filled ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}>▦</div>
          <div className="mut" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Vai aparecer aqui assim que você treinar.
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Últimas 13 semanas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gridAutoRows: '1fr', gap: 3 }}>
              {cells.map((lvl, i) => (
                <div key={i} className={'hm ' + lvl + (i === cells.length - 5 ? ' today' : '')} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Menos</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <span className="hm" style={{ width: 10, height: 10 }} />
              <span className="hm lvl1" style={{ width: 10, height: 10 }} />
              <span className="hm lvl2" style={{ width: 10, height: 10 }} />
              <span className="hm lvl3" style={{ width: 10, height: 10 }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Mais</span>
          </div>

          <div className="minicard">
            <div style={{ color: 'var(--cyan)', fontSize: 16, fontWeight: 500 }}>26 treinos em 90 dias</div>
            <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>Media 2 / semana · última sequência: 4 dias</div>
          </div>

          <div className="cap" style={{ marginTop: 14 }}>Tipos mais frequentes</div>
          <div className="minicard" style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span>Rotina A</span><span style={{ color: 'var(--cyan)' }}>14×</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span>Rotina B</span><span style={{ color: 'var(--cyan)' }}>9×</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Livre</span><span style={{ color: 'var(--cyan)' }}>3×</span>
            </div>
          </div>
        </>
      )}
    </PhoneFrame>
  );
};

// ─── Tela 10: Modal detalhe de dia passado ────────────────────
const Screen10_Dia = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Memórias" person="A" />}
    tabBar={<TabBar active="Memória" />}
  >
    {/* heatmap esmaecido no fundo */}
    <div style={{ opacity: 0.2, marginBottom: 8, pointerEvents: 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 3 }}>
        {Array.from({ length: 91 }).map((_, i) => (
          <div key={i} className={'hm ' + (i % 4 === 0 ? 'lvl2' : i % 7 === 0 ? 'lvl3' : i % 3 === 0 ? 'lvl1' : '')} />
        ))}
      </div>
    </div>

    {/* bottom sheet 60% altura */}
    <div style={{
      position: 'absolute', bottom: 70, left: 0, right: 0,
      background: 'var(--bg-alt)',
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      padding: '14px 18px',
      height: filled ? '64%' : '40%',
      borderTop: '1px solid var(--bg-elev)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        width: 36, height: 4, background: 'var(--bg-elev)',
        borderRadius: 2, alignSelf: 'center', marginBottom: 14,
      }} />

      {filled ? (
        <>
          <div style={{ color: 'var(--orange)', fontSize: 18, fontWeight: 500 }}>23 de abril, terça</div>
          <div style={{ color: 'var(--cyan)', fontSize: 12, marginBottom: 14 }}>Rotina B · 28 min · André</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[
              ['Supino reto', '3x8 · 4 kg'],
              ['Remada baixa', '3x10 · 12 kg'],
              ['Agachamento', '4x6 · livre'],
              ['Prancha', '3x 30s'],
            ].map(([n, s], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="cb on" />
                <span style={{ flex: 1, fontSize: 13 }}>{n}</span>
                <span className="mut" style={{ fontSize: 11 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 11, color: 'var(--muted)', fontStyle: 'italic',
            padding: 10, background: 'var(--bg)', borderRadius: 8, marginBottom: 14,
          }}>
            "ombro direito doeu no supino. Reduzi peso."
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
            <button className="btn btn-out">Editar</button>
            <button className="btn btn-pri">Duplicar pra hoje</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: 'var(--orange)', fontSize: 18, fontWeight: 500 }}>15 de abril, terça</div>
          <div className="mut" style={{ fontSize: 12, marginBottom: 14 }}>Nenhum treino registrado</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 14 }}>
            <span style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>
              Dia em branco. Sem registros pra mostrar.
            </span>
          </div>
        </>
      )}
    </div>
  </PhoneFrame>
);

// ─── Tela 11: Marcos (timeline gentil) ────────────────────────
const Screen11_Marcos = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Marcos" person="A" />}
    tabBar={<TabBar active="Memória" />}
  >
    <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--bg-elev)' }}>
      <span style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: 12 }}>Treinos</span>
      <span style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: 12 }}>Fotos</span>
      <span style={{ padding: '6px 12px', color: 'var(--purple)', borderBottom: '2px solid var(--purple)', fontSize: 12 }}>Marcos</span>
    </div>

    {!filled ? (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}>○</div>
        <div className="mut" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Marcos vão aparecer com o tempo.
        </div>
      </div>
    ) : (
      <div style={{ position: 'relative', paddingLeft: 20, flex: 1 }}>
        {/* linha vertical */}
        <div style={{
          position: 'absolute', left: 6, top: 4, bottom: 0,
          width: 1, background: 'var(--bg-elev)',
        }} />

        {[
          ['28/04', 'Três treinos nesta semana.'],
          ['23/04', 'Pesou 2 kg menos que na primeira medida.'],
          ['18/04', 'Quatro registros de humor seguidos.'],
          ['15/04', 'Voltou após 9 dias parado.'],
          ['08/04', 'Primeiro treino completo da rotina B.'],
          ['28/03', 'Cadastrou 12 exercícios.'],
        ].map(([date, text], i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 18 }}>
            <div style={{
              position: 'absolute', left: -19, top: 4,
              width: 12, height: 12, borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 0 3px var(--bg)',
            }} />
            <div className="mut" style={{ fontSize: 11, marginBottom: 2 }}>{date}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{text}</div>
          </div>
        ))}
      </div>
    )}
  </PhoneFrame>
);

// ─── Tela 12: Form de medidas corporais ───────────────────────
const Screen12_Medidas = ({ filled }) => {
  const fields = [
    ['Peso', 'kg', '74,8'], ['Cintura', 'cm', '82'],
    ['Peito', 'cm', '98'], ['Braço esq', 'cm', '32'],
    ['Braço dir', 'cm', '32,5'], ['Coxa esq', 'cm', '54'],
    ['Coxa dir', 'cm', '54'], ['Barriga', 'cm', '86'],
    ['Quadril', 'cm', '94'],
  ];
  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Medidas — 28/04" person="A" />}
      tabBar={null}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {fields.map(([label, unit, val], i) => (
          <div key={i}>
            <div className="cap" style={{ fontSize: 10 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                className="input"
                style={{ minHeight: 36, padding: '6px 8px', fontSize: 12, flex: 1 }}
                placeholder={filled ? '' : val}
                defaultValue={filled ? val : ''}
              />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{unit}</span>
            </div>
            {!filled && (
              <div style={{ fontSize: 9, color: 'var(--muted-decor)', marginTop: 2 }}>últ: {val}</div>
            )}
          </div>
        ))}
      </div>

      <div className="cap" style={{ marginBottom: 6 }}>Fotos</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['Frente', 'Costas', 'Lado'].map((p, i) => (
          <div key={i} style={{
            width: 100, height: 100, borderRadius: 8,
            background: filled ? 'linear-gradient(135deg, #44475a, #6272a4)' : 'transparent',
            border: filled ? 'none' : '1px dashed var(--bg-elev)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 6, fontSize: 10,
            color: filled ? 'var(--fg)' : 'var(--muted)',
            flex: 1,
          }}>{p}</div>
        ))}
      </div>

      <div className="cap" style={{ marginBottom: 6 }}>Reflexao (opcional)</div>
      <textarea
        className="input"
        style={{ minHeight: 50, marginBottom: 8, resize: 'none' }}
        placeholder="Como está se sentindo?"
        defaultValue={filled ? 'mais firme que mes passado. menos cansado a noite.' : ''}
      />
      <textarea
        className="input"
        style={{ minHeight: 50, marginBottom: 14, resize: 'none' }}
        placeholder="O que mudou na rotina?"
        defaultValue={filled ? 'incluindo treino 3x na semana e dormindo mais.' : ''}
      />

      <button className="btn btn-grn" style={{ marginTop: 'auto' }}>Salvar</button>
    </PhoneFrame>
  );
};

// ─── Tela 13: Comparativo de medidas ──────────────────────────
const Screen13_Comparativo = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Medidas" person="A" />}
    tabBar={null}
  >
    <div style={{ marginBottom: 12 }}>
      <span className="chip">30d</span>
      <span className="chip on">90d</span>
      <span className="chip">Tudo</span>
    </div>

    {!filled ? (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 32, color: 'var(--muted-decor)', marginBottom: 10 }}>↕</div>
        <div className="mut" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Registre medidas pra comparar depois.
        </div>
      </div>
    ) : (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            ['Peso', '74,8 kg', '−2,1', [77, 76, 76, 75, 75, 75, 74, 75, 74, 74, 75, 74]],
            ['Cintura', '82 cm', '−3', [85, 85, 84, 84, 83, 83, 83, 83, 82, 82, 82, 82]],
            ['Peito', '98 cm', '+1', [97, 97, 97, 97, 98, 97, 98, 98, 98, 98, 98, 98]],
            ['Barriga', '86 cm', '−4', [90, 90, 89, 88, 88, 87, 87, 87, 86, 86, 86, 86]],
          ].map(([n, v, d, arr], i) => (
            <div key={i} className="minicard" style={{ padding: 10 }}>
              <div className="cap" style={{ fontSize: 10 }}>{n}</div>
              <div style={{ color: 'var(--cyan)', fontSize: 18, fontWeight: 500, marginTop: 2 }}>{v}</div>
              <Spark data={arr} />
              <div className="mut" style={{ fontSize: 10, marginTop: 4 }}>{d} vs primeira</div>
            </div>
          ))}
        </div>

        <div className="cap" style={{ marginBottom: 8 }}>Fotos lado a lado</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, aspectRatio: 0.75, borderRadius: 8, background: 'linear-gradient(135deg, #44475a, #5a5d75)' }} />
          <div style={{ flex: 1, aspectRatio: 0.75, borderRadius: 8, background: 'linear-gradient(135deg, #5a5d75, #6272a4)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
          <span>28/01</span><span>28/04</span>
        </div>
        <div className="slider-track">
          <div className="slider-fill" style={{ width: '100%' }} />
          <div className="slider-thumb" style={{ left: 0 }} />
          <div className="slider-thumb" style={{ left: '100%' }} />
        </div>
      </>
    )}
  </PhoneFrame>
);

// ─── Wrapper ──────────────────────────────────────────────────
const SecaoA = () => (
  <DCSection id="seção-a" title="Seção A — movimento e memórias">

    <DCArtboard id="t07" label="07 — galeria de exercícios" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen07_Galeria filled={false} />}
          right={<Screen07_Galeria filled={true} />}
          leftLabel="Vault novo · zero exercícios"
          rightLabel="10+ exercícios · grid 2 colunas"
          annotations={[
            { pin: 'L', at: [206, 480], text: 'Empty state sóbrio · sem culpa · sem CTA dramático.' },
            { pin: 'R', at: [206, 380], text: 'GIF preview · nome em laranja · grupo muscular em muted.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t08" label="08 — detalhe de exercício" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen08_Detalhe filled={false} />}
          right={<Screen08_Detalhe filled={true} />}
          leftLabel="Cadastro novo"
          rightLabel="Exercício com 12 execuções"
          annotations={[
            { pin: 'R', at: [206, 660], text: 'Sparkline das 12 últimas execuções · "última vez" em muted.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t09" label="09 — Heatmap de treinos" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen09_Heatmap filled={false} />}
          right={<Screen09_Heatmap filled={true} />}
          leftLabel="Usuário novo"
          rightLabel="26 treinos em 90 dias"
          annotations={[
            { pin: 'R', at: [206, 360], text: 'Heatmap 13×7 · 4 níveis de green · hoje com outline purple.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t10" label="10 — Detalhe de dia passado (bottom sheet)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen10_Dia filled={false} />}
          right={<Screen10_Dia filled={true} />}
          leftLabel="Dia sem treino"
          rightLabel="Rotina B · 28 min · 4 ex"
          annotations={[
            { pin: 'R', at: [206, 540], text: 'Observações em italic muted · só aparece se houver.' },
            { pin: 'R', at: [206, 820], text: '"Duplicar pra hoje" como atalho de retomada.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t11" label="11 — Marcos (timeline gentil, sem ranking)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen11_Marcos filled={false} />}
          right={<Screen11_Marcos filled={true} />}
          leftLabel="Vault recém-criado"
          rightLabel="6 marcos em 4 semanas"
          annotations={[
            { pin: 'R', at: [206, 400], text: 'Frases neutras · sem níveis · sem pontos · sem badges.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t12" label="12 — Form de medidas corporais" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen12_Medidas filled={false} />}
          right={<Screen12_Medidas filled={true} />}
          leftLabel="Form vazio · última medida em muted-decor"
          rightLabel="9 campos preenchidos + reflexão"
          annotations={[
            { pin: 'L', at: [206, 360], text: 'Última medida visível como hint · não pré-preenche o campo.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t13" label="13 — Comparativo de medidas" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen13_Comparativo filled={false} />}
          right={<Screen13_Comparativo filled={true} />}
          leftLabel="Sem medidas registradas"
          rightLabel="4 medidas + galeria comparativa"
          annotations={[
            { pin: 'R', at: [206, 360], text: 'Delta sem cor positiva/negativa · neutro proposital.' },
            { pin: 'R', at: [206, 800], text: 'Slider duplo entre 2 datas · sincroniza as 3 fotos.' },
          ]}
        />
      </div>
    </DCArtboard>

  </DCSection>
);

window.SecaoA = SecaoA;
