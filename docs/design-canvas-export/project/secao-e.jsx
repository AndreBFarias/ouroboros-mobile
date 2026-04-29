/* global PhoneFrame, BackHeader, PlainHeader, TabBar, DualState, Annot, DCSection, DCArtboard */

// ============================================================
// SECAO E - Quatro funcoes adicionais
// 25 microfone + transcricao
// 26 alarme
// 27 to-do
// 28 contador "dias sem X"
// ============================================================

// ─── 25. Microfone + transcricao ──────────────────────────────
const Screen25_Mic = ({ filled }) => {
  // bars representando waveform
  const bars = Array.from({ length: 32 }).map((_, i) => {
    const h = filled
      ? 20 + Math.abs(Math.sin(i * 0.6)) * 60 + Math.random() * 12
      : 6 + Math.abs(Math.sin(i * 0.3)) * 10;
    return h;
  });

  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Áudio rápido" person="A" />}
      tabBar={null}
    >
      {/* timer + estado */}
      <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 14 }}>
        <div style={{
          fontSize: 32, color: filled ? 'var(--red)' : 'var(--muted-decor)',
          fontWeight: 500, letterSpacing: '0.04em',
        }}>{filled ? '00:14' : '00:00'}</div>
        <div style={{
          fontSize: 11, color: filled ? 'var(--red)' : 'var(--muted)',
          marginTop: 4, letterSpacing: '0.06em',
        }}>{filled ? '● gravando' : 'pronto pra gravar'}</div>
      </div>

      {/* waveform */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 3, height: 100, padding: '0 8px', marginBottom: 18,
      }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 4, height: h,
            background: filled ? 'var(--red)' : 'var(--bg-elev)',
            borderRadius: 2,
            opacity: filled ? (0.5 + (i % 3) * 0.2) : 1,
          }} />
        ))}
      </div>

      {/* botao grande de gravar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: filled ? 'var(--red)' : 'var(--purple)',
          color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: filled ? 22 : 30, fontWeight: 500,
          boxShadow: filled
            ? '0 0 0 8px rgba(255,85,85,0.18)'
            : '0 4px 16px rgba(189,147,249,0.35)',
        }}>{filled ? '■' : '◉'}</div>
      </div>

      {/* transcricao ao vivo */}
      <div className="cap" style={{ marginBottom: 6 }}>Transcrição ao vivo</div>
      <div style={{
        background: 'var(--bg-alt)', borderRadius: 10, padding: 14,
        minHeight: 110, marginBottom: 14,
        fontSize: 13, lineHeight: 1.6,
        color: filled ? 'var(--fg)' : 'var(--muted-decor)',
        fontStyle: filled ? 'normal' : 'italic',
      }}>
        {filled
          ? <>Lembrar de ligar pro médico segunda. Comprar ração e pagar boleto da luz amanhã antes das <span style={{ color: 'var(--cyan)' }}>17h</span><span style={{ color: 'var(--purple)', animation: 'blink 1s infinite' }}>|</span></>
          : 'a transcrição aparece aqui enquanto você fala. som claro funciona melhor.'}
      </div>

      {filled && (
        <>
          <div className="cap" style={{ marginBottom: 6 }}>Detectado</div>
          <div style={{ marginBottom: 14 }}>
            <span className="chip on">To-do · 1 item</span>
            <span className="chip on-cy">Prazo · 17h amanhã</span>
            <span className="chip">Contato · médico</span>
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
        <button className="btn btn-out" disabled={!filled}>Descartar</button>
        <button className="btn btn-grn" disabled={!filled}>Salvar</button>
      </div>
    </PhoneFrame>
  );
};

// ─── 26. Alarme / lembretes ───────────────────────────────────
const Screen26_Alarme = ({ filled }) => {
  const items = [
    { time: '08:00', label: 'Medicação · manhã', days: 'todo dia', tag: 'medicação', on: true,  color: 'var(--cyan)' },
    { time: '13:00', label: 'Medicação · meio-dia', days: 'seg–sex', tag: 'medicação', on: true, color: 'var(--cyan)' },
    { time: '19:30', label: 'Treino', days: 'seg / qua / sex', tag: 'exercício', on: true, color: 'var(--orange)' },
    { time: '21:00', label: 'Registrar humor', days: 'todo dia', tag: 'mente', on: false, color: 'var(--purple)' },
    { time: '22:30', label: 'Dormir', days: 'dom–qui', tag: 'rotina', on: true, color: 'var(--green)' },
  ];

  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Lembretes" person="A" />}
      tabBar={<TabBar active="Diario" />}
    >
      {!filled ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}>◷</div>
          <div className="mut" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            Nenhum lembrete configurado.
          </div>
          <button className="btn btn-pri" style={{ width: 200 }}>+ novo lembrete</button>
        </div>
      ) : (
        <>
          {/* próximo */}
          <div className="minicard" style={{ padding: 14, marginBottom: 14, borderLeft: '2px solid var(--cyan)' }}>
            <div className="cap" style={{ fontSize: 10 }}>Próximo</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--fg)' }}>Dormir</div>
                <div className="mut" style={{ fontSize: 11 }}>Em 16 minutos</div>
              </div>
              <div style={{ color: 'var(--cyan)', fontSize: 22, fontWeight: 500 }}>22:30</div>
            </div>
          </div>

          <div className="cap" style={{ marginBottom: 8 }}>Todos os lembretes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{
                background: 'var(--bg-alt)', borderRadius: 10, padding: '10px 12px',
                borderLeft: `2px solid ${it.color}`,
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: it.on ? 1 : 0.55,
              }}>
                <div style={{ minWidth: 56 }}>
                  <div style={{ color: it.color, fontSize: 16, fontWeight: 500 }}>{it.time}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>{it.label}</div>
                  <div className="mut" style={{ fontSize: 10 }}>{it.days} · {it.tag}</div>
                </div>
                <span className={'sw' + (it.on ? ' on' : '')} />
              </div>
            ))}
          </div>

          <button className="btn btn-pri" style={{ marginTop: 'auto' }}>+ novo lembrete</button>
        </>
      )}
    </PhoneFrame>
  );
};

// ─── 27. To-do ────────────────────────────────────────────────
const Screen27_Todo = ({ filled }) => {
  const today = [
    { text: 'Pagar boleto da luz', tag: 'urgente', tagColor: 'var(--red)', done: false },
    { text: 'Ligar pro médico', tag: 'saúde', tagColor: 'var(--cyan)', done: false },
    { text: 'Comprar ração', tag: 'casa', tagColor: 'var(--purple)', done: true },
    { text: 'Treino — rotina A', tag: 'exercício', tagColor: 'var(--orange)', done: true },
  ];
  const week = [
    { text: 'Marcar exame de sangue', tag: 'saúde', tagColor: 'var(--cyan)', done: false },
    { text: 'Renovar cnh', tag: 'burocracia', tagColor: 'var(--yellow)', done: false },
    { text: 'Ler artigo do guimarães', tag: 'leitura', tagColor: 'var(--pink)', done: false },
  ];

  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Pendências" person="A" />}
      tabBar={<TabBar active="Diario" />}
    >
      <div style={{ marginBottom: 12 }}>
        <span className="chip on">Hoje</span>
        <span className="chip">Esta semana</span>
        <span className="chip">Tudo</span>
        <span className="chip">Concluídas</span>
      </div>

      {!filled ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}>☐</div>
          <div className="mut" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Nada pendente. Respira.
          </div>
        </div>
      ) : (
        <>
          {/* progresso do dia */}
          <div className="minicard" style={{ padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="cap" style={{ fontSize: 10 }}>Hoje</span>
              <span style={{ color: 'var(--cyan)', fontSize: 12 }}>2 de 4</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-elev)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '50%', height: '100%', background: 'var(--green)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {today.map((it, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 8px',
                borderBottom: '1px solid var(--bg-elev)',
                opacity: it.done ? 0.5 : 1,
              }}>
                <span className={'cb' + (it.done ? ' on' : '')} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    textDecoration: it.done ? 'line-through' : 'none',
                    color: it.done ? 'var(--muted)' : 'var(--fg)',
                  }}>{it.text}</div>
                </div>
                <span className="chip" style={{
                  fontSize: 9, padding: '2px 8px',
                  color: it.tagColor, borderColor: it.tagColor,
                  background: 'transparent',
                }}>{it.tag}</span>
              </div>
            ))}
          </div>

          <div className="cap" style={{ marginBottom: 6 }}>Esta semana</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {week.map((it, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px',
                borderBottom: '1px solid var(--bg-elev)',
              }}>
                <span className="cb" />
                <div style={{ flex: 1, fontSize: 12 }}>{it.text}</div>
                <span className="chip" style={{
                  fontSize: 9, padding: '2px 8px',
                  color: it.tagColor, borderColor: it.tagColor,
                  background: 'transparent',
                }}>{it.tag}</span>
              </div>
            ))}
          </div>

          {/* input para novo */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            background: 'var(--bg-alt)', borderRadius: 10,
            padding: '10px 12px', marginTop: 'auto',
          }}>
            <span style={{ color: 'var(--muted)', fontSize: 18 }}>+</span>
            <input
              className="input"
              style={{ flex: 1, border: 'none', background: 'transparent', minHeight: 0, padding: 0, fontSize: 13 }}
              placeholder="Adicionar pendência…"
            />
          </div>
        </>
      )}
    </PhoneFrame>
  );
};

// ─── 28. Contador "dias sem X" ────────────────────────────────
const Screen28_Contador = ({ filled }) => {
  const counters = [
    { label: 'Sem fumar', n: 47, color: 'var(--green)', record: 47, since: '12/03/2026' },
    { label: 'Sem álcool', n: 12, color: 'var(--cyan)', record: 28, since: '16/04/2026' },
    { label: 'Sem rolar feed', n: 3, color: 'var(--yellow)', record: 9, since: '25/04/2026' },
    { label: 'Sem dormir tarde', n: 0, color: 'var(--orange)', record: 6, since: 'reiniciado hoje' },
  ];

  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Contadores" person="A" />}
      tabBar={<TabBar active="Diario" />}
    >
      {!filled ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}>○</div>
          <div className="mut" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            Crie um contador pra acompanhar dias sem algo.
          </div>
          <button className="btn btn-pri" style={{ width: 220 }}>+ novo contador</button>
        </div>
      ) : (
        <>
          {/* destaque */}
          <div style={{
            background: 'var(--bg-alt)', borderRadius: 14, padding: 20,
            marginBottom: 14, textAlign: 'center',
            borderTop: '2px solid var(--green)',
          }}>
            <div className="cap" style={{ marginBottom: 6 }}>Sem fumar</div>
            <div style={{ color: 'var(--green)', fontSize: 64, fontWeight: 500, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>47</div>
            <div className="mut" style={{ fontSize: 12, marginTop: 4 }}>Dias · desde 12/03/2026</div>

            {/* mini barra recorde */}
            <div style={{ marginTop: 14, padding: '0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginBottom: 4 }}>
                <span>0</span><span>Recorde · 47 dias</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-elev)', borderRadius: 2 }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--green)', borderRadius: 2 }} />
              </div>
            </div>

            <button className="btn-ghost" style={{
              background: 'transparent', border: '1px solid var(--red)',
              color: 'var(--red)', borderRadius: 8, padding: '8px 16px',
              fontSize: 11, fontFamily: 'inherit', marginTop: 14, cursor: 'pointer',
            }}>Reiniciar</button>
          </div>

          <div className="cap" style={{ marginBottom: 8 }}>Outros contadores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {counters.slice(1).map((c, i) => (
              <div key={i} style={{
                background: 'var(--bg-alt)', borderRadius: 10, padding: '12px 14px',
                borderLeft: `2px solid ${c.color}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ minWidth: 50, textAlign: 'center' }}>
                  <div style={{ color: c.color, fontSize: 22, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{c.n}</div>
                  <div className="mut" style={{ fontSize: 9, marginTop: 2 }}>Dias</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{c.label}</div>
                  <div className="mut" style={{ fontSize: 10, marginTop: 1 }}>recorde · {c.record} dias</div>
                </div>
                <span style={{ color: 'var(--muted-decor)', fontSize: 14 }}>›</span>
              </div>
            ))}
          </div>

          <button className="btn-ghost" style={{
            marginTop: 12, background: 'transparent', border: '1px dashed var(--bg-elev)',
            borderRadius: 8, padding: '10px', color: 'var(--purple)',
            fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
          }}>+ novo contador</button>
        </>
      )}
    </PhoneFrame>
  );
};

// ─── Wrapper ──────────────────────────────────────────────────
const SecaoE = () => (
  <DCSection id="secao-e" title="Seção E — Funções adicionais">

    <DCArtboard id="t25" label="25 — Microfone + transcrição ao vivo" width={1100} height={1280}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen25_Mic filled={false} />}
          right={<Screen25_Mic filled={true} />}
          leftLabel="Pronto pra gravar · botão purple"
          rightLabel="Gravando · waveform red · transcrição ao vivo"
          annotations={[
            { pin: 'R', at: [206, 260], text: 'Waveform animada acompanha o volume do microfone em tempo real.' },
            { pin: 'R', at: [206, 540], text: 'Cursor pisca durante captura · texto aparece em tempo real.' },
            { pin: 'R', at: [206, 720], text: 'Chips detectados via on-device · sem enviar áudio pra servidor.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t26" label="26 — Alarme / lembretes" width={1100} height={1280}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen26_Alarme filled={false} />}
          right={<Screen26_Alarme filled={true} />}
          leftLabel="Sem lembretes · CTA único"
          rightLabel="5 lembretes ativos · próximo destacado"
          annotations={[
            { pin: 'R', at: [206, 220], text: 'Card "próximo" sempre no topo · contagem regressiva em muted.' },
            { pin: 'R', at: [206, 540], text: 'Cor do borderLeft segue a categoria (medicação cyan, treino orange, etc).' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t27" label="27 — To-do com tags por categoria" width={1100} height={1280}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen27_Todo filled={false} />}
          right={<Screen27_Todo filled={true} />}
          leftLabel='Vazio · "nada pendente. respira."'
          rightLabel="Hoje + Esta semana · barra de progresso"
          annotations={[
            { pin: 'L', at: [206, 460], text: 'Sem culpa por estar vazio · mensagem leve.' },
            { pin: 'R', at: [206, 380], text: 'Tag colorida por categoria · checkbox verde quando concluído.' },
            { pin: 'R', at: [206, 800], text: 'Input inline pra adicionar rápido · sem modal.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t28" label='28 — Contador "dias sem X"' width={1100} height={1280}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen28_Contador filled={false} />}
          right={<Screen28_Contador filled={true} />}
          leftLabel="Sem contadores cadastrados"
          rightLabel="4 contadores · destaque + lista compacta"
          annotations={[
            { pin: 'R', at: [206, 280], text: 'Número grande em mono · barra mostra progresso vs recorde pessoal.' },
            { pin: 'R', at: [206, 420], text: 'Recorde mostrado em muted · referência sem cobrança.' },
            { pin: 'R', at: [206, 740], text: 'Reiniciar é uma ação consciente · botão red ghost · sem reset acidental.' },
          ]}
        />
      </div>
    </DCArtboard>

  </DCSection>
);

window.SecaoE = SecaoE;
