// Testes do nucleo puro do card "Relembrando" (R-HOME-4d, spec §3).
// Cobre:
//   - rotuloTempo: fronteiras 2/27/28/59/60/364/365/730.
//   - efeméride ganha da rotacao (e o mais antigo vence entre efemérides).
//   - rotacao estavel por dia: mesma escolha no mesmo dia; varia dia a dia.
//   - limiar: idade 1 excluida, idade 2 entra; limiar custom.
//   - pool vazio (ou tudo abaixo do limiar) -> null.
//
// Funcao pura, sem mocks. `hoje` e um Date UTC cujos campos de dia
// representam o "hoje" (o hook passa o Date ajustado a BRT).
//
// Comentarios sem acento (convencao shell/CI).
import {
  selecionarRelembranca,
  rotuloTempo,
  hashDia,
  LIMIAR_DIAS,
  type CandidatoRelembranca,
} from '@/lib/relembrando/selecionar';

// YYYY-MM-DD a partir dos campos UTC de um Date.
function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// String de data N dias antes de `base`.
function menosDias(base: Date, dias: number): string {
  return ymdUtc(new Date(base.getTime() - dias * 86_400_000));
}

function cand(over: Partial<CandidatoRelembranca> & { data: string }): CandidatoRelembranca {
  return {
    origem: 'reflexao',
    id: `id:${over.data}`,
    frase: 'lembranca',
    ...over,
  };
}

// 2026-07-10 (mes 6 = julho) em UTC.
const HOJE = new Date(Date.UTC(2026, 6, 10));

describe('rotuloTempo (fronteiras spec §2)', () => {
  it.each([
    [2, 'há 2 dias'],
    [27, 'há 27 dias'],
    [28, 'há 1 mês'],
    [59, 'há 1 mês'],
    [60, 'há 2 meses'],
    [364, 'há 12 meses'],
    [365, 'há 1 ano'],
    [729, 'há 1 ano'],
    [730, 'há 2 anos'],
  ])('idade %i -> "%s"', (idade, esperado) => {
    expect(rotuloTempo(idade as number)).toBe(esperado);
  });
});

describe('hashDia', () => {
  it('e deterministico e nao-negativo', () => {
    expect(hashDia('2026-07-10')).toBe(hashDia('2026-07-10'));
    expect(hashDia('2026-07-10')).toBeGreaterThanOrEqual(0);
  });

  it('difere entre dias distintos (varia a semente de rotacao)', () => {
    expect(hashDia('2026-07-10')).not.toBe(hashDia('2026-07-11'));
  });
});

describe('selecionarRelembranca — efeméride', () => {
  it('efeméride (mesmo mes/dia, ha 1 ano) ganha da rotacao', () => {
    const efem = cand({
      data: '2025-07-10', // mesmo 07-10 de HOJE, 365 dias atras
      origem: 'conquista',
      id: 'diario_vitoria:2025-07-10:pessoa_a',
      frase: 'Reencontro leve',
    });
    const recentes = [
      cand({ data: menosDias(HOJE, 5) }),
      cand({ data: menosDias(HOJE, 10) }),
      cand({ data: menosDias(HOJE, 15) }),
    ];
    const r = selecionarRelembranca([...recentes, efem], HOJE);
    expect(r).not.toBeNull();
    expect(r?.efemeride).toBe(true);
    expect(r?.rotuloTempo).toBe('há 1 ano');
    expect(r?.origem).toBe('conquista');
    expect(r?.id).toBe('diario_vitoria:2025-07-10:pessoa_a');
  });

  it('entre duas efemérides, o MAIS ANTIGO vence', () => {
    const umAno = cand({ data: '2025-07-10', id: 'a1' });
    const doisAnos = cand({ data: '2024-07-10', id: 'a2' });
    const r = selecionarRelembranca([umAno, doisAnos], HOJE);
    expect(r?.efemeride).toBe(true);
    expect(r?.id).toBe('a2');
    expect(r?.rotuloTempo).toBe('há 2 anos');
  });

  it('nao marca efeméride quando o mesmo mes/dia tem idade < 28 dias', () => {
    // 2026-06-10: mes/dia diferente de HOJE (07-10) -> nem entra como
    // efeméride; garante que so mes/dia igual dispara.
    const item = cand({ data: menosDias(HOJE, 30) });
    const r = selecionarRelembranca([item], HOJE);
    expect(r?.efemeride).toBe(false);
  });
});

describe('selecionarRelembranca — rotacao estavel por dia', () => {
  // Pool de datas absolutas antigas (mes/dia nunca batem os HOJEs de
  // julho, logo nunca viram efeméride). Rotacao pura por hashDia.
  const pool = [
    cand({ data: '2024-01-05', id: 'p1' }),
    cand({ data: '2024-01-06', id: 'p2' }),
    cand({ data: '2024-01-07', id: 'p3' }),
    cand({ data: '2024-01-08', id: 'p4' }),
    cand({ data: '2024-01-09', id: 'p5' }),
  ];

  it('mesmo dia -> mesma escolha (deterministico)', () => {
    const a = selecionarRelembranca(pool, HOJE);
    const b = selecionarRelembranca(pool, HOJE);
    expect(a?.id).toBe(b?.id);
    expect(a?.efemeride).toBe(false);
  });

  it('varia ao longo dos dias (rotacao real, nao fixa)', () => {
    const escolhas = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const dia = new Date(Date.UTC(2026, 6, 10 + i));
      const r = selecionarRelembranca(pool, dia);
      if (r) escolhas.add(r.id);
    }
    expect(escolhas.size).toBeGreaterThan(1);
  });
});

describe('selecionarRelembranca — limiar e vazio', () => {
  it('idade 1 e excluida; idade 2 entra', () => {
    const umDia = cand({ data: menosDias(HOJE, 1), id: 'd1' });
    const doisDias = cand({ data: menosDias(HOJE, 2), id: 'd2' });

    // So o de idade 1 -> nada acima do limiar -> null.
    expect(selecionarRelembranca([umDia], HOJE)).toBeNull();

    // So o de idade 2 -> entra e e escolhido (pool de 1).
    const r = selecionarRelembranca([doisDias], HOJE);
    expect(r?.id).toBe('d2');
    expect(r?.rotuloTempo).toBe('há 2 dias');
  });

  it('respeita LIMIAR_DIAS padrao = 2', () => {
    expect(LIMIAR_DIAS).toBe(2);
  });

  it('limiar custom exclui abaixo do valor passado', () => {
    const tresDias = cand({ data: menosDias(HOJE, 3) });
    expect(selecionarRelembranca([tresDias], HOJE, 5)).toBeNull();
    expect(selecionarRelembranca([tresDias], HOJE, 2)).not.toBeNull();
  });

  it('pool vazio -> null', () => {
    expect(selecionarRelembranca([], HOJE)).toBeNull();
  });

  it('data malformada e ignorada em silencio', () => {
    const ruim = cand({ data: 'nao-e-data', id: 'ruim' });
    const bom = cand({ data: menosDias(HOJE, 4), id: 'bom' });
    const r = selecionarRelembranca([ruim, bom], HOJE);
    expect(r?.id).toBe('bom');
  });
});
