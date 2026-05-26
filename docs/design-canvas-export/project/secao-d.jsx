/* global PhoneFrame, BackHeader, PlainHeader, TabBar, Avatar, AvatarBoth, PersonChip, DualState, Annot, DCSection, DCArtboard */

// ============================================================
// SECAO D - Sistema e visualização (telas 21, 22, 23, 24)
// ============================================================

// ─── Tela 21: Mini humor (pagina cheia) ───────────────────────
const Screen21_HumorPage = ({ filled }) => {
  // 90 cells (13 weeks × 7 days approx)
  const cells = [];
  for (let i = 0; i < 91; i++) {
    if (!filled) { cells.push(''); continue; }
    const r = Math.random();
    let cls = '';
    if (r > 0.85) cls = 'lvl-1';        // humor 1 = red
    else if (r > 0.72) cls = 'lvl-2';   // humor 2 = orange
    else if (r > 0.55) cls = 'lvl-3';   // humor 3 = yellow
    else if (r > 0.30) cls = 'lvl-4';   // humor 4 = cyan
    else if (r > 0.10) cls = 'lvl-5';   // humor 5 = green
    cells.push(cls);
  }
  const styleFor = lvl => {
    if (lvl === 'lvl-1') return { background: 'rgba(255,85,85,0.7)', borderColor: 'var(--red)' };
    if (lvl === 'lvl-2') return { background: 'rgba(255,184,108,0.6)', borderColor: 'var(--orange)' };
    if (lvl === 'lvl-3') return { background: 'rgba(241,250,140,0.6)', borderColor: 'var(--yellow)' };
    if (lvl === 'lvl-4') return { background: 'rgba(139,233,253,0.7)', borderColor: 'var(--cyan)' };
    if (lvl === 'lvl-5') return { background: 'var(--green)', borderColor: 'var(--green)' };
    return {};
  };
  return (
    <PhoneFrame
      time="22:14"
      header={<BackHeader title="Humor" person="A" />}
      tabBar={<TabBar active="Diário" />}
    >
      {!filled ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}></div>
          <div className="mut" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            Registre seu humor pra começar a ver padrões.
          </div>
          <button className="btn btn-pri" style={{ width: 220 }}>Registrar humor agora</button>
        </div>
      ) : (
        <>
          <button className="btn btn-pri" style={{ marginBottom: 14 }}>Registrar humor agora</button>

          <div className="cap" style={{ marginBottom: 6 }}>Últimos 90 dias</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 3, marginBottom: 12 }}>
            {cells.map((lvl, i) => (
              <div key={i} className="hm" style={{ ...styleFor(lvl), ...(i === 88 ? { boxShadow: '0 0 0 1.5px var(--purple)' } : {}) }} />
            ))}
          </div>

          {/* legenda 5 níveis */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 10, color: 'var(--muted)' }}>
            <span>1</span>
            {['lvl-1','lvl-2','lvl-3','lvl-4','lvl-5'].map(l => (
              <span key={l} className="hm" style={{ width: 14, height: 14, ...styleFor(l) }} />
            ))}
            <span>5</span>
          </div>

          <div className="minicard" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="cap" style={{ fontSize: 10 }}>Media 30d</div>
              <div style={{ color: 'var(--cyan)', fontSize: 18, fontWeight: 500 }}>3.4</div>
            </div>
            <div>
              <div className="cap" style={{ fontSize: 10 }}>Registros</div>
              <div style={{ color: 'var(--cyan)', fontSize: 18, fontWeight: 500 }}>22 / 30</div>
            </div>
            <div>
              <div className="cap" style={{ fontSize: 10 }}>Sequência</div>
              <div style={{ color: 'var(--cyan)', fontSize: 18, fontWeight: 500 }}>5 dias</div>
            </div>
          </div>

          <div className="cap" style={{ marginTop: 14, marginBottom: 6 }}>Modo sobreposto · André + Vitória</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 3, position: 'relative' }}>
            {cells.map((lvl, i) => {
              const r2 = (i * 17 + 3) % 100;
              let lvl2 = '';
              if (r2 > 85) lvl2 = 'lvl-1';
              else if (r2 > 65) lvl2 = 'lvl-3';
              else if (r2 > 35) lvl2 = 'lvl-4';
              else if (r2 > 12) lvl2 = 'lvl-5';
              return (
                <div key={i} className="hm" style={{ position: 'relative', ...styleFor(lvl), opacity: 0.55 }}>
                  <span style={{ position: 'absolute', inset: 0, ...styleFor(lvl2), opacity: 0.55, borderRadius: 3 }} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </PhoneFrame>
  );
};

// ─── Tela 22: Mini financeiro (readonly) ──────────────────────
const Screen22_Financeiro = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Finanças" person="A" />}
    tabBar={<TabBar active="Diário" />}
  >
    <div style={{
      fontSize: 10, color: 'var(--muted)', textAlign: 'center',
      padding: '6px 10px', background: 'var(--bg-alt)',
      borderRadius: 6, marginBottom: 12,
      letterSpacing: '0.05em',
    }}>
      Modo leitura · edição no desktop
    </div>

    {!filled ? (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 36, color: 'var(--muted-decor)', marginBottom: 10 }}></div>
        <div className="mut" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Rode o pipeline no desktop pra carregar dados.
        </div>
      </div>
    ) : (
      <>
        <div className="minicard" style={{ padding: 16 }}>
          <div className="cap">Gasto está semana</div>
          <div style={{ color: 'var(--cyan)', fontSize: 30, fontWeight: 500, marginTop: 4 }}>R$ 487,30</div>
          <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>Abaixo da media de 4 semanas</div>
        </div>

        <div className="cap" style={{ marginTop: 14, marginBottom: 6 }}>Top categorias</div>
        <div className="minicard" style={{ padding: 12 }}>
          {[
            ['Mercado', 'R$ 187,40', 100],
            ['Transporte', 'R$ 124,80', 66],
            ['Restaurante', 'R$ 92,30', 49],
            ['Saúde', 'R$ 58,80', 31],
            ['Outros', 'R$ 24,00', 12],
          ].map(([n, v, w], i) => (
            <div key={i} style={{ marginBottom: i === 4 ? 0 : 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span>{n}</span>
                <span style={{ color: 'var(--cyan)' }}>{v}</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-elev)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: w + '%', background: 'var(--cyan)', opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="cap" style={{ marginTop: 14, marginBottom: 6 }}>Últimas transações</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
          {[
            ['Mercado padaria', 'Mercado', '−R$ 32,80', 'cy'],
            ['Uber', 'Transporte', '−R$ 18,40', 'cy'],
            ['Restituição', 'Transferência', '+R$ 240,00', 'gn'],
            ['Farmácia', 'Saúde', '−R$ 47,30', 'cy'],
            ['Mercado xyz', 'Mercado', '−R$ 87,40', 'cy'],
          ].map(([n, c, v, col], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--bg-elev)' }}>
              <div>
                <div>{n}</div>
                <div className="mut" style={{ fontSize: 10 }}>{c}</div>
              </div>
              <div style={{ color: col === 'gn' ? 'var(--green)' : 'var(--cyan)', fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      </>
    )}
  </PhoneFrame>
);

// ─── Tela 23: Settings (com path .md visivel) ─────────────────
const SettingRow = ({ label, control, hint }) => (
  <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bg-elev)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      {control}
    </div>
    {hint && <div style={{ fontSize: 10, color: 'var(--muted-decor)', marginTop: 2 }}>{hint}</div>}
  </div>
);
const SectionHd = ({ children }) => (
  <div style={{
    fontSize: 10, color: 'var(--orange)', letterSpacing: '0.08em',
    marginTop: 18, marginBottom: 6, textTransform: 'lowercase',
  }}>{children}</div>
);

const Screen23_Settings = ({ filled }) => (
  <PhoneFrame
    time="22:14"
    header={<BackHeader title="Ajustes" />}
    tabBar={<TabBar active="Diário" />}
  >
    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <SectionHd>Som e vibração</SectionHd>
      <SettingRow label="Som ao concluir treino" control={<span className={'sw' + (filled ? ' on' : '')} />} />
      <SettingRow label="Vibração ao concluir" control={<span className={'sw' + (filled ? ' on' : '')} />} />
      <SettingRow label="Som ao registrar humor" control={<span className={'sw'} />} />

      <SectionHd>Lembretes</SectionHd>
      <SettingRow
        label="Medicação"
        control={<span className="mut" style={{ fontSize: 12 }}>{filled ? '08:00' : 'desligado'}</span>}
      />
      <SettingRow
        label="Treino"
        control={<span className="mut" style={{ fontSize: 12 }}>{filled ? '19:30' : 'desligado'}</span>}
      />
      <SettingRow
        label="Humor diario"
        control={<span className="mut" style={{ fontSize: 12 }}>{filled ? '21:00' : 'desligado'}</span>}
      />

      <SectionHd>Pessoa</SectionHd>
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bg-elev)' }}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>Pessoa ativa</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="rd on" /><span style={{ fontSize: 12 }}>André</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="rd" /><span style={{ fontSize: 12 }}>Vitória</span></span>
        </div>
      </div>
      <SettingRow
        label="Vault compartilhado"
        control={<span className={'sw' + (filled ? ' on' : '')} />}
        hint="ambos veem todos os registros."
      />

      <SectionHd>Sync</SectionHd>
      {/* status card */}
      {filled ? (
        <div className="minicard" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 12 }}>Sincronizado há 2 min</span>
          </div>
          <div className="mut" style={{ fontSize: 9, marginTop: 4, marginBottom: 2, letterSpacing: '0.04em' }}>Último arquivo</div>
          <div className="path-mono">Inbox/mente/humor/2026-04-28.md</div>
        </div>
      ) : (
        <div className="minicard" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted-decor)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Não configurado</span>
          </div>
        </div>
      )}
      <button className="btn btn-out" style={{ marginBottom: 6 }}>Forcar sync</button>

      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bg-elev)' }}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>Metodo</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className={'rd' + (filled ? ' on' : '')} /><span style={{ fontSize: 12 }}>Obsidian sync</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="rd" /><span style={{ fontSize: 12 }}>Syncthing</span></span>
        </div>
      </div>

      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bg-elev)' }}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>Qualidade scanner</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="rd" /><span style={{ fontSize: 12 }}>8 mp</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className={'rd' + (filled ? ' on' : '')} /><span style={{ fontSize: 12 }}>12 mp</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="rd" /><span style={{ fontSize: 12 }}>Maxima</span></span>
        </div>
      </div>

      <SectionHd>Privacidade</SectionHd>
      <SettingRow label="Exigir biometria pra abrir" control={<span className={'sw' + (filled ? ' on' : '')} />} />
      <SettingRow label="Ocultar transcrições na lista" control={<span className="sw" />} />
      <button className="btn btn-out" style={{ marginTop: 8 }}>Exportar todos meus dados</button>
      <button className="btn-ghost" style={{
        background: 'transparent', border: 'none', color: 'var(--muted)',
        fontSize: 11, padding: 8, fontFamily: 'inherit', marginTop: 4,
      }}>Limpar cache local</button>

      <SectionHd>Sobre</SectionHd>
      <div className="mut" style={{ fontSize: 11, padding: '6px 0' }}>Versão 0.1.0</div>
      <div style={{ color: 'var(--purple)', fontSize: 12, padding: '4px 0' }}>Ver no github →</div>
      <div className="mut" style={{ fontSize: 11, padding: '4px 0 14px' }}>Licença: GPL-3.0</div>
    </div>
  </PhoneFrame>
);

// ─── Tela 24: Onboarding (3 frames) ───────────────────────────
const Screen24_OnbA = () => (
  <PhoneFrame time="22:14" header={null} tabBar={null}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 8px' }}>
      <div style={{ color: 'var(--orange)', fontSize: 26, fontWeight: 500, marginBottom: 8 }}>Você e quem?</div>
      <div className="mut" style={{ fontSize: 13, marginBottom: 36, lineHeight: 1.5 }}>
        Vocês compartilham um vault. Só escolha.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 14, padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          border: '2px solid transparent',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--purple)', color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 500,
          }}>A</div>
          <div style={{ fontSize: 16 }}>André</div>
        </div>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 14, padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          border: '2px solid transparent',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--pink)', color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 500,
          }}>V</div>
          <div style={{ fontSize: 16 }}>Vitória</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ textAlign: 'center', color: 'var(--muted-decor)', fontSize: 11, marginTop: 20 }}>
        1 / 3
      </div>
    </div>
  </PhoneFrame>
);

const Screen24_OnbB = () => (
  <PhoneFrame time="22:14" header={null} tabBar={null}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 0 20px' }}>
      <div style={{ color: 'var(--orange)', fontSize: 26, fontWeight: 500, marginBottom: 8 }}>Como deve te lembrar?</div>
      <div className="mut" style={{ fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
        Você pode mudar depois.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 12, padding: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '2px solid var(--purple)',
        }}>
          <div>
            <div style={{ fontSize: 14, marginBottom: 2 }}>Todo dia, manha</div>
            <div className="mut" style={{ fontSize: 11 }}>Antes do trabalho</div>
          </div>
          <span style={{ color: 'var(--cyan)', fontSize: 14 }}>09:00</span>
        </div>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 12, padding: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '2px solid transparent',
        }}>
          <div>
            <div style={{ fontSize: 14, marginBottom: 2 }}>Todo dia, noite</div>
            <div className="mut" style={{ fontSize: 11 }}>Antes de dormir</div>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>21:00</span>
        </div>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 12, padding: 16,
          border: '2px solid transparent',
        }}>
          <div style={{ fontSize: 14 }}>Só quando eu quiser</div>
          <div className="mut" style={{ fontSize: 11, marginTop: 2 }}>Sem lembretes automaticos</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-pri">Continuar</button>
      <div style={{ textAlign: 'center', color: 'var(--muted-decor)', fontSize: 11, marginTop: 10 }}>
        2 / 3
      </div>
    </div>
  </PhoneFrame>
);

const Screen24_OnbC = () => (
  <PhoneFrame time="22:14" header={null} tabBar={null}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 0 20px' }}>
      <div style={{ color: 'var(--orange)', fontSize: 26, fontWeight: 500, marginBottom: 8 }}>Como sincroniza?</div>
      <div className="mut" style={{ fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
        Você pode trocar nas configurações.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 12, padding: 16,
          border: '2px solid var(--purple)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 14 }}>Obsidian sync</div>
            <span className="chip" style={{ fontSize: 9, padding: '2px 8px' }}>Recomendado</span>
          </div>
          <div className="mut" style={{ fontSize: 11, lineHeight: 1.5 }}>
            Se você já usa obsidian sync no desktop, configura sozinho. E2ee pelo próprio app.
          </div>
        </div>
        <div style={{
          background: 'var(--bg-alt)', borderRadius: 12, padding: 16,
          border: '2px solid transparent',
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Syncthing</div>
          <div className="mut" style={{ fontSize: 11, lineHeight: 1.5 }}>
            Gratuito, peer-to-peer, sem servidor central. Requer instalação no desktop também.
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-pri">Começar</button>
      <div style={{ textAlign: 'center', color: 'var(--muted-decor)', fontSize: 11, marginTop: 10 }}>
        3 / 3
      </div>
    </div>
  </PhoneFrame>
);

// ─── Wrapper ──────────────────────────────────────────────────
const SecaoD = () => (
  <DCSection id="seção-d" title="Seção D — sistema e visualização">

    <DCArtboard id="t21" label="21 — Humor (heatmap página cheia)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen21_HumorPage filled={false} />}
          right={<Screen21_HumorPage filled={true} />}
          leftLabel="Sem registros · CTA único"
          rightLabel="22 registros + modo sobreposto André/Vitória"
          annotations={[
            { pin: 'R', at: [206, 380], text: '5 níveis de cor: 1 red, 2 orange, 3 yellow, 4 cyan, 5 green.' },
            { pin: 'R', at: [206, 660], text: 'Modo sobreposto: 2 heatmaps a 50% opacity · interseção mais escura.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t22" label="22 — Finanças (modo leitura)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen22_Financeiro filled={false} />}
          right={<Screen22_Financeiro filled={true} />}
          leftLabel="Pipeline ainda não rodou"
          rightLabel="Dados carregados do desktop"
          annotations={[
            { pin: 'L', at: [206, 280], text: 'Banner micro reforça: edição no desktop · sem botão adicionar.' },
            { pin: 'R', at: [206, 460], text: 'Subtitle "abaixo da média" sempre neutro · nunca verde/vermelho.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t23" label="23 — Ajustes (path .md visível)" width={1100} height={1240}>
      <div style={{ paddingTop: 20 }}>
        <AnnotatedDual
          left={<Screen23_Settings filled={false} />}
          right={<Screen23_Settings filled={true} />}
          leftLabel="Primeira abertura · tudo desligado"
          rightLabel="Configurado · sync ativo · biometria ligada"
          annotations={[
            { pin: 'L', at: [206, 380], text: 'Radio horizontal pra pessoa ativa · vault compartilhado por padrão.' },
            { pin: 'R', at: [206, 620], text: 'Path do último arquivo sincronizado em ciano mono · indicador colorido de status.' },
          ]}
        />
      </div>
    </DCArtboard>

    <DCArtboard id="t24" label="24 — onboarding (3 frames sequenciais)" width={1500} height={1100}>
      <div style={{ paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 30, padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Screen24_OnbA />
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.06em' }}>Frame 1 · Escolher pessoa</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Screen24_OnbB />
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.06em' }}>Frame 2 · Lembretes</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Screen24_OnbC />
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.06em' }}>Frame 3 · Sincronização</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '40px 60px 0', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--bg-elev)', borderRadius: 8, padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.55, color: 'var(--fg)' }}>
          3 perguntas · sem checklist · sem tour · sem vídeo.
        </div>
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--bg-elev)', borderRadius: 8, padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.55, color: 'var(--fg)' }}>
          Frame 3 → app abre direto na tela 01 (Hoje).
        </div>
      </div>
    </DCArtboard>

  </DCSection>
);

window.SecaoD = SecaoD;
