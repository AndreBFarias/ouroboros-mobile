// M32: cobertura das 6 faixas + marcos. Comentarios sem acento.
import {
  mensagemApoio,
  marcoAtingido,
  MARCOS_DIAS,
} from '@/lib/contadores/mensagens';

describe('mensagemApoio', () => {
  it('dia 0 = recomeco sem julgamento', () => {
    expect(mensagemApoio(0)).toBe('Hoje começa de novo. Sem julgamento.');
  });

  it('dias < 5 = inicio dificil', () => {
    expect(mensagemApoio(1)).toContain('Os primeiros dias pesam mais');
    expect(mensagemApoio(4)).toContain('Os primeiros dias pesam mais');
  });

  it('dias < 30 = constancia', () => {
    expect(mensagemApoio(5)).toBe('Cada dia conta. Continue um de cada vez.');
    expect(mensagemApoio(29)).toBe('Cada dia conta. Continue um de cada vez.');
  });

  it('dias < 100 = habito com numero', () => {
    expect(mensagemApoio(30)).toBe('30 dias. Já está virando hábito.');
    expect(mensagemApoio(99)).toBe('99 dias. Já está virando hábito.');
  });

  it('dias < 365 = medio prazo com numero', () => {
    expect(mensagemApoio(100)).toBe('100 dias. Mais do que três meses.');
    expect(mensagemApoio(364)).toBe('364 dias. Mais do que três meses.');
  });

  it('dias >= 365 = um ano', () => {
    expect(mensagemApoio(365)).toBe('365 dias. Um ano e contando.');
    expect(mensagemApoio(730)).toBe('730 dias. Um ano e contando.');
  });

  it('dias negativos = trata como zero (defesa)', () => {
    expect(mensagemApoio(-1)).toBe('Hoje começa de novo. Sem julgamento.');
  });
});

describe('marcoAtingido', () => {
  it('retorna null abaixo do primeiro marco', () => {
    expect(marcoAtingido(0)).toBeNull();
    expect(marcoAtingido(4)).toBeNull();
  });

  it('retorna 5 entre 5 e 29', () => {
    expect(marcoAtingido(5)).toBe(5);
    expect(marcoAtingido(29)).toBe(5);
  });

  it('retorna 30 entre 30 e 99', () => {
    expect(marcoAtingido(30)).toBe(30);
    expect(marcoAtingido(99)).toBe(30);
  });

  it('retorna 100 entre 100 e 364', () => {
    expect(marcoAtingido(100)).toBe(100);
  });

  it('retorna 365 a partir de 365', () => {
    expect(marcoAtingido(365)).toBe(365);
    expect(marcoAtingido(1000)).toBe(365);
  });

  it('retorna null para negativos', () => {
    expect(marcoAtingido(-5)).toBeNull();
  });

  it('MARCOS_DIAS expoe os 4 marcos canonicos', () => {
    expect(MARCOS_DIAS).toEqual([5, 30, 100, 365]);
  });
});
