// Testes do helper formatEmocao e das constantes de emocoes.
// Slugs em snake_case ASCII; o mapa de labels tem que restaurar
// diacriticos PT-BR onde a ortografia exige (frustracao, alivio,
// gratidao, conexao, solidao).
import {
  EMOCOES_NEGATIVAS,
  EMOCOES_POSITIVAS,
  EMOCOES_NEGATIVAS_OPTIONS,
  EMOCOES_POSITIVAS_OPTIONS,
  formatEmocao,
} from '@/lib/diario/emocoes';

describe('emocoes constantes', () => {
  it('lista de negativas tem 6 slugs unicos em snake_case', () => {
    expect(EMOCOES_NEGATIVAS).toHaveLength(6);
    const set = new Set(EMOCOES_NEGATIVAS);
    expect(set.size).toBe(6);
    for (const slug of EMOCOES_NEGATIVAS) {
      expect(slug).toMatch(/^[a-z_]+$/);
    }
  });

  it('lista de positivas tem 6 slugs unicos em snake_case', () => {
    expect(EMOCOES_POSITIVAS).toHaveLength(6);
    const set = new Set(EMOCOES_POSITIVAS);
    expect(set.size).toBe(6);
    for (const slug of EMOCOES_POSITIVAS) {
      expect(slug).toMatch(/^[a-z_]+$/);
    }
  });

  it('listas negativas e positivas nao se sobrepoem', () => {
    const neg = new Set<string>(EMOCOES_NEGATIVAS);
    for (const pos of EMOCOES_POSITIVAS) {
      expect(neg.has(pos)).toBe(false);
    }
  });

  it('OPTIONS negativas usam accent red e positivas accent green', () => {
    for (const opt of EMOCOES_NEGATIVAS_OPTIONS) {
      expect(opt.accent).toBe('red');
    }
    for (const opt of EMOCOES_POSITIVAS_OPTIONS) {
      expect(opt.accent).toBe('green');
    }
  });
});

describe('formatEmocao', () => {
  it('restaura diacritico em frustracao', () => {
    expect(formatEmocao('frustracao')).toBe('Frustração');
  });

  it('restaura diacritico em alivio', () => {
    expect(formatEmocao('alivio')).toBe('Alívio');
  });

  it('restaura diacritico em gratidao', () => {
    expect(formatEmocao('gratidao')).toBe('Gratidão');
  });

  it('restaura diacritico em conexao', () => {
    expect(formatEmocao('conexao')).toBe('Conexão');
  });

  it('restaura diacritico em solidao', () => {
    expect(formatEmocao('solidao')).toBe('Solidão');
  });

  it('mantem slugs sem diacritico em Sentence case', () => {
    expect(formatEmocao('alegria')).toBe('Alegria');
    expect(formatEmocao('raiva')).toBe('Raiva');
    expect(formatEmocao('paz')).toBe('Paz');
    expect(formatEmocao('orgulho')).toBe('Orgulho');
  });

  it('fallback mecanico para slugs desconhecidos', () => {
    expect(formatEmocao('nostalgia_branda')).toBe('Nostalgia branda');
    expect(formatEmocao('xyz')).toBe('Xyz');
  });

  it('fallback devolve a propria string para slug vazio', () => {
    expect(formatEmocao('')).toBe('');
  });
});
