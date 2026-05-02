// Testes dos 5 filtros do calendario (M11.5, adendo A4): pessoa,
// mes, tipo midia, intensidade, bairro. Cobre cenarios isolados +
// composicao via aplicarFiltros.
import {
  filtrarPorPessoa,
  filtrarPorMes,
  filtrarPorTipoMidia,
  filtrarPorIntensidade,
  filtrarPorBairro,
  aplicarFiltros,
  FILTROS_DEFAULT,
} from '@/lib/conquistas/filtros';
import type { Conquista } from '@/lib/conquistas/types';
import type { Midia } from '@/lib/schemas/midia';

function midiaFoto(): Midia {
  return { tipo: 'foto', path: 'p.jpg' };
}

function midiaYoutube(): Midia {
  return { tipo: 'youtube', video_id: 'abc123' };
}

function midiaSpotify(): Midia {
  return { tipo: 'spotify', track_id: 'xyz' };
}

function midiaAudio(): Midia {
  return { tipo: 'audio', path: 'a.m4a' };
}

function fake(
  partial: Partial<Conquista> & { id: string; data: string }
): Conquista {
  const m = partial.midiaPrincipal ?? midiaFoto();
  return {
    id: partial.id,
    origem: 'evento_positivo',
    data: partial.data,
    autor: partial.autor ?? 'pessoa_a',
    frase: 'Teste',
    lugar: partial.lugar ?? null,
    intensidade: partial.intensidade ?? 3,
    bairro: partial.bairro ?? null,
    midiaPrincipal: m,
    tipoCover: m.tipo === 'foto' || m.tipo === 'youtube' || m.tipo === 'spotify' || m.tipo === 'audio' ? m.tipo : 'foto',
    midias: [m],
    meta: { tipo: 'evento' } as never,
  };
}

describe('filtrarPorPessoa', () => {
  const lista: Conquista[] = [
    fake({ id: '1', data: '2026-04-01', autor: 'pessoa_a' }),
    fake({ id: '2', data: '2026-04-02', autor: 'pessoa_b' }),
    fake({ id: '3', data: '2026-04-03', autor: 'pessoa_a' }),
  ];

  it("'ambos' devolve a lista intacta", () => {
    expect(filtrarPorPessoa(lista, 'ambos')).toHaveLength(3);
  });

  it("'pessoa_a' devolve so pessoa_a", () => {
    const out = filtrarPorPessoa(lista, 'pessoa_a');
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.autor === 'pessoa_a')).toBe(true);
  });

  it("'pessoa_b' devolve so pessoa_b", () => {
    const out = filtrarPorPessoa(lista, 'pessoa_b');
    expect(out).toHaveLength(1);
    expect(out[0].autor).toBe('pessoa_b');
  });
});

describe('filtrarPorMes', () => {
  const agora = new Date('2026-04-15T12:00:00Z');
  const lista: Conquista[] = [
    fake({ id: '1', data: '2026-04-10' }),
    fake({ id: '2', data: '2026-03-20' }),
    fake({ id: '3', data: '2025-12-05' }),
  ];

  it("'tudo' devolve lista intacta", () => {
    expect(filtrarPorMes(lista, 'tudo', agora)).toHaveLength(3);
  });

  it("'este_mes' filtra abril/2026", () => {
    const out = filtrarPorMes(lista, 'este_mes', agora);
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2026-04-10');
  });

  it("'mes_passado' filtra marco/2026", () => {
    const out = filtrarPorMes(lista, 'mes_passado', agora);
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2026-03-20');
  });

  it("'mes_passado' em janeiro voltea para dezembro do ano anterior", () => {
    const ag = new Date('2026-01-15T12:00:00Z');
    const lista2 = [
      fake({ id: '1', data: '2025-12-20' }),
      fake({ id: '2', data: '2026-01-05' }),
    ];
    const out = filtrarPorMes(lista2, 'mes_passado', ag);
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2025-12-20');
  });

  it('objeto { ano, mes } filtra mes especifico', () => {
    const out = filtrarPorMes(lista, { ano: 2025, mes: 12 }, agora);
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe('2025-12-05');
  });
});

describe('filtrarPorTipoMidia', () => {
  const lista: Conquista[] = [
    {
      ...fake({ id: '1', data: '2026-04-01' }),
      midiaPrincipal: midiaFoto(),
      tipoCover: 'foto',
    },
    {
      ...fake({ id: '2', data: '2026-04-02' }),
      midiaPrincipal: midiaYoutube(),
      tipoCover: 'youtube',
    },
    {
      ...fake({ id: '3', data: '2026-04-03' }),
      midiaPrincipal: midiaSpotify(),
      tipoCover: 'spotify',
    },
    {
      ...fake({ id: '4', data: '2026-04-04' }),
      midiaPrincipal: midiaAudio(),
      tipoCover: 'audio',
    },
  ];

  it("'tudo' devolve lista intacta", () => {
    expect(filtrarPorTipoMidia(lista, 'tudo')).toHaveLength(4);
  });

  it("'foto' devolve so foto", () => {
    expect(filtrarPorTipoMidia(lista, 'foto')).toHaveLength(1);
  });

  it("'youtube' devolve so youtube", () => {
    expect(filtrarPorTipoMidia(lista, 'youtube')).toHaveLength(1);
  });

  it("'spotify' devolve so spotify", () => {
    expect(filtrarPorTipoMidia(lista, 'spotify')).toHaveLength(1);
  });

  it("'audio' devolve so audio", () => {
    expect(filtrarPorTipoMidia(lista, 'audio')).toHaveLength(1);
  });
});

describe('filtrarPorIntensidade', () => {
  const lista: Conquista[] = [
    fake({ id: '1', data: '2026-04-01', intensidade: 1 }),
    fake({ id: '2', data: '2026-04-02', intensidade: 3 }),
    fake({ id: '3', data: '2026-04-03', intensidade: 5 }),
  ];

  it('faixa completa (1-5) devolve lista intacta', () => {
    expect(filtrarPorIntensidade(lista, { min: 1, max: 5 })).toHaveLength(3);
  });

  it('faixa 3-5 devolve so 3 e 5', () => {
    const out = filtrarPorIntensidade(lista, { min: 3, max: 5 });
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.intensidade).sort()).toEqual([3, 5]);
  });

  it('faixa 4-4 devolve so quem tem 4 (lista vazia neste fixture)', () => {
    expect(filtrarPorIntensidade(lista, { min: 4, max: 4 })).toHaveLength(0);
  });
});

describe('filtrarPorBairro', () => {
  const lista: Conquista[] = [
    fake({ id: '1', data: '2026-04-01', bairro: 'Pinheiros' }),
    fake({ id: '2', data: '2026-04-02', bairro: 'Vila Madalena' }),
    fake({ id: '3', data: '2026-04-03', bairro: null, lugar: 'Pinheiros Plaza' }),
    fake({ id: '4', data: '2026-04-04', bairro: null, lugar: null }),
  ];

  it('string vazia devolve lista intacta', () => {
    expect(filtrarPorBairro(lista, '')).toHaveLength(4);
  });

  it("'pinheiros' (lower) casa case-insensitive contra bairro e lugar", () => {
    const out = filtrarPorBairro(lista, 'pinheiros');
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.id).sort()).toEqual(['1', '3']);
  });

  it("'vila' casa parcial", () => {
    const out = filtrarPorBairro(lista, 'vila');
    expect(out).toHaveLength(1);
    expect(out[0].bairro).toBe('Vila Madalena');
  });

  it('nao casa quando ambos bairro e lugar sao null', () => {
    const out = filtrarPorBairro(lista, 'qualquer');
    expect(out).toHaveLength(0);
  });
});

describe('aplicarFiltros (composicao)', () => {
  const agora = new Date('2026-04-15T12:00:00Z');
  const lista: Conquista[] = [
    fake({
      id: '1',
      data: '2026-04-10',
      autor: 'pessoa_a',
      bairro: 'Pinheiros',
      intensidade: 4,
    }),
    fake({
      id: '2',
      data: '2026-04-12',
      autor: 'pessoa_b',
      bairro: 'Vila Madalena',
      intensidade: 5,
    }),
    fake({
      id: '3',
      data: '2026-03-05',
      autor: 'pessoa_a',
      bairro: 'Pinheiros',
      intensidade: 2,
    }),
  ];

  it('default devolve lista intacta', () => {
    const out = aplicarFiltros(lista, FILTROS_DEFAULT, agora);
    expect(out).toHaveLength(3);
  });

  it('combina pessoa+mes+intensidade+bairro', () => {
    const out = aplicarFiltros(
      lista,
      {
        pessoa: 'pessoa_a',
        mes: 'este_mes',
        tipoMidia: 'tudo',
        intensidade: { min: 3, max: 5 },
        bairro: 'pinheiros',
      },
      agora
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('1');
  });

  it('combinacao nao casa nada devolve lista vazia', () => {
    const out = aplicarFiltros(
      lista,
      {
        pessoa: 'pessoa_b',
        mes: 'mes_passado',
        tipoMidia: 'tudo',
        intensidade: { min: 1, max: 5 },
        bairro: '',
      },
      agora
    );
    expect(out).toHaveLength(0);
  });
});
