// Testes do EventoContadorSchema (R-RECAP-5, 2026-05-16). Cobre
// caminho feliz, regex de data, slug, contadorId, humor 1-5,
// descricao max, tags, midias e helpers.
//
// Comentarios sem acento (convencao shell/CI).
import {
  EventoContadorSchema,
  slugifyDescricao,
  sufixoRandomEvento,
} from '@/lib/schemas/evento_contador';

const baseEvento = {
  tipo: 'evento_contador' as const,
  contadorId: 'sem-cigarro',
  data: '2026-05-16',
  slug: 'almoco-leve-ab12',
  humor: 4,
  descricao: 'Almoco leve com amigos no parque',
  tags: ['foco', 'gratidao'],
  midias: [],
  criado_em: '2026-05-16T14:00:00-03:00',
  autor: 'pessoa_a' as const,
  para: { tipo: 'mim' as const },
};

describe('EventoContadorSchema', () => {
  it('aceita evento completo com descricao + tags', () => {
    const out = EventoContadorSchema.parse(baseEvento);
    expect(out.tipo).toBe('evento_contador');
    expect(out.contadorId).toBe('sem-cigarro');
    expect(out.humor).toBe(4);
    expect(out.tags).toEqual(['foco', 'gratidao']);
  });

  it('aceita evento com midia foto e descricao vazia', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      descricao: '',
      midias: [{ tipo: 'foto', path: 'jpg/foto-2026-05-16-abc1.jpg' }],
    });
    expect(out.descricao).toBe('');
    expect(out.midias).toHaveLength(1);
  });

  it('aceita evento com midia audio', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      midias: [
        { tipo: 'audio', path: 'm4a/audio-2026-05-16-abc.m4a', duracao_seg: 30 },
      ],
    });
    expect(out.midias).toHaveLength(1);
    expect(out.midias[0].tipo).toBe('audio');
  });

  it('aceita evento com midia spotify + youtube', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      midias: [
        { tipo: 'spotify', track_id: '4iV5W9uYEdYUVa79Axb7Rh' },
        { tipo: 'youtube', video_id: 'dQw4w9WgXcQ' },
      ],
    });
    expect(out.midias).toHaveLength(2);
  });

  it('rejeita humor < 1', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, humor: 0 })
    ).toThrow();
  });

  it('rejeita humor > 5', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, humor: 6 })
    ).toThrow();
  });

  it('rejeita humor nao-inteiro', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, humor: 3.5 })
    ).toThrow();
  });

  it('rejeita descricao > 280 chars', () => {
    expect(() =>
      EventoContadorSchema.parse({
        ...baseEvento,
        descricao: 'x'.repeat(281),
      })
    ).toThrow();
  });

  it('rejeita evento sem descricao E sem midia', () => {
    expect(() =>
      EventoContadorSchema.parse({
        ...baseEvento,
        descricao: '',
        midias: [],
      })
    ).toThrow();
  });

  it('rejeita descricao com so espacos quando sem midia', () => {
    expect(() =>
      EventoContadorSchema.parse({
        ...baseEvento,
        descricao: '   ',
        midias: [],
      })
    ).toThrow();
  });

  it('rejeita tag > 16 chars', () => {
    expect(() =>
      EventoContadorSchema.parse({
        ...baseEvento,
        tags: ['x'.repeat(17)],
      })
    ).toThrow();
  });

  it('rejeita mais de 5 tags', () => {
    expect(() =>
      EventoContadorSchema.parse({
        ...baseEvento,
        tags: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toThrow();
  });

  it('aceita tag com acentuacao PT-BR', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      tags: ['gratidão', 'paz'],
    });
    expect(out.tags).toEqual(['gratidão', 'paz']);
  });

  it('rejeita tag com quebra de linha', () => {
    expect(() =>
      EventoContadorSchema.parse({
        ...baseEvento,
        tags: ['foco\nx'],
      })
    ).toThrow();
  });

  it('rejeita slug com maiusculas', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, slug: 'Almoco-Leve' })
    ).toThrow();
  });

  it('rejeita data fora do formato YYYY-MM-DD', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, data: '16/05/2026' })
    ).toThrow();
  });

  it('rejeita contadorId vazio', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, contadorId: '' })
    ).toThrow();
  });

  it('default tags [] quando ausente', () => {
    const { tags, ...semTags } = baseEvento;
    void tags;
    const out = EventoContadorSchema.parse(semTags);
    expect(out.tags).toEqual([]);
  });

  it('default midias [] quando ausente', () => {
    const { midias, ...semMidias } = baseEvento;
    void midias;
    const out = EventoContadorSchema.parse(semMidias);
    expect(out.midias).toEqual([]);
  });

  it('default descricao "" quando ausente E ha midia', () => {
    const { descricao, ...semDesc } = baseEvento;
    void descricao;
    const out = EventoContadorSchema.parse({
      ...semDesc,
      midias: [{ tipo: 'foto' as const, path: 'jpg/foo.jpg' }],
    });
    expect(out.descricao).toBe('');
  });

  it('aceita autor pessoa_b', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      autor: 'pessoa_b',
    });
    expect(out.autor).toBe('pessoa_b');
  });

  it('rejeita autor "ambos"', () => {
    expect(() =>
      EventoContadorSchema.parse({ ...baseEvento, autor: 'ambos' })
    ).toThrow();
  });

  it('aceita para casal', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      para: { tipo: 'casal' },
    });
    expect(out.para).toEqual({ tipo: 'casal' });
  });

  it('aceita para outra pessoa', () => {
    const out = EventoContadorSchema.parse({
      ...baseEvento,
      para: { tipo: 'outra', pessoa: 'pessoa_b' },
    });
    expect(out.para).toEqual({ tipo: 'outra', pessoa: 'pessoa_b' });
  });

  it('round-trip parse -> stringify -> parse', () => {
    const out1 = EventoContadorSchema.parse(baseEvento);
    const json = JSON.parse(JSON.stringify(out1));
    const out2 = EventoContadorSchema.parse(json);
    expect(out2).toEqual(out1);
  });
});

describe('slugifyDescricao', () => {
  it('remove acentos e troca espacos por hifen', () => {
    expect(slugifyDescricao('Almoço com amigos')).toBe('almoco-com-amigos');
  });

  it('remove caracteres especiais', () => {
    expect(slugifyDescricao('Cafe / pao !!')).toBe('cafe-pao');
  });

  it('colapsa hifens consecutivos', () => {
    expect(slugifyDescricao('a   b')).toBe('a-b');
  });

  it('retorna fallback "evento" para texto so com simbolos', () => {
    expect(slugifyDescricao('!!!')).toBe('evento');
  });

  it('limita a 32 chars', () => {
    const longo = 'a '.repeat(40);
    const out = slugifyDescricao(longo);
    expect(out.length).toBeLessThanOrEqual(32);
  });

  it('trata maiusculas', () => {
    expect(slugifyDescricao('ALMOCO LEVE')).toBe('almoco-leve');
  });
});

describe('sufixoRandomEvento', () => {
  it('gera 4 chars [a-z0-9]', () => {
    expect(sufixoRandomEvento()).toMatch(/^[a-z0-9]{4}$/);
  });

  it('valores variam entre chamadas', () => {
    const conjunto = new Set<string>();
    for (let i = 0; i < 8; i++) conjunto.add(sufixoRandomEvento());
    expect(conjunto.size).toBeGreaterThanOrEqual(3);
  });
});
