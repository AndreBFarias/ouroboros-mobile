// Testes do helper slugifyEvento (Tela 20). Estrategia em cascata:
// bairro > texto > categoria > 'evento'. Cobre acentos, espacos,
// pontuacao e cap de comprimento.
import { slugifyEvento } from '@/lib/eventos/slug';

describe('slugifyEvento prioridade bairro', () => {
  it('usa bairro quando presente, ignorando texto e categoria', () => {
    const slug = slugifyEvento({
      bairro: 'Vila Madalena',
      texto: 'foi tudo bem aqui',
      categoria: 'rolezinho',
    });
    expect(slug).toBe('vila-madalena');
  });

  it('remove acentos do bairro', () => {
    expect(slugifyEvento({ bairro: 'Liberdade São Paulo' })).toBe(
      'liberdade-sao-paulo'
    );
  });

  it('bairro vazio cai no proximo passo da cascata', () => {
    const slug = slugifyEvento({
      bairro: '',
      texto: 'cafe da manha',
      categoria: 'compras',
    });
    expect(slug).toBe('cafe-da-manha');
  });

  it('bairro null cai no proximo passo da cascata', () => {
    const slug = slugifyEvento({
      bairro: null,
      texto: 'cafe da manha',
    });
    expect(slug).toBe('cafe-da-manha');
  });
});

describe('slugifyEvento prioridade texto', () => {
  it('usa as 3 primeiras palavras do texto', () => {
    expect(
      slugifyEvento({ texto: 'cafe da manha com pessoa b no parque' })
    ).toBe('cafe-da-manha');
  });

  it('texto com pontuacao vira kebab limpo', () => {
    expect(slugifyEvento({ texto: 'almoço, conversa boa!' })).toBe(
      'almoco-conversa-boa'
    );
  });

  it('texto com acentos perde acentos no slug', () => {
    expect(slugifyEvento({ texto: 'reunião urgente hoje' })).toBe(
      'reuniao-urgente-hoje'
    );
  });
});

describe('slugifyEvento prioridade categoria', () => {
  it('usa categoria quando bairro e texto vazios', () => {
    expect(slugifyEvento({ categoria: 'evento_social' })).toBe('evento-social');
  });

  it('categoria simples vira o proprio slug', () => {
    expect(slugifyEvento({ categoria: 'rolezinho' })).toBe('rolezinho');
  });
});

describe('slugifyEvento fallback', () => {
  it('devolve "evento" quando nada esta presente', () => {
    expect(slugifyEvento({})).toBe('evento');
  });

  it('devolve "evento" para entradas todas vazias', () => {
    expect(
      slugifyEvento({ bairro: '   ', texto: '   ', categoria: '   ' })
    ).toBe('evento');
  });

  it('devolve "evento" quando entradas so tem pontuacao', () => {
    expect(slugifyEvento({ texto: '!!! ??? ...' })).toBe('evento');
  });
});

describe('slugifyEvento cap de comprimento', () => {
  it('respeita o cap de 24 chars sem cortar palavra no meio', () => {
    const longo = slugifyEvento({
      bairro: 'super-longo-nome-de-bairro-que-passa-do-cap',
    });
    expect(longo.length).toBeLessThanOrEqual(24);
    // Nao termina com hifen.
    expect(longo.endsWith('-')).toBe(false);
  });

  it('preserva slug curto sem cortar', () => {
    const curto = slugifyEvento({ bairro: 'pinheiros' });
    expect(curto).toBe('pinheiros');
  });
});
