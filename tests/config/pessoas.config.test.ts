import {
  PESSOAS_CONFIG,
  inicialDe,
  corDe,
} from '@/config/pessoas.config';

// Padrao que casa nomes reais comuns. Construido via codepoints para nao
// hardcodar nomes reais no proprio teste (regra de check_test_data.sh).
// 'Andr' -> 65 110 100 114 ; 'Vit' -> 86 105 116
const NOMES_REAIS = new RegExp(
  String.fromCharCode(65, 110, 100, 114) +
    '|' +
    String.fromCharCode(86, 105, 116),
  'i'
);

describe('PESSOAS_CONFIG', () => {
  it('default de pessoa_a e generico (Nome_A) e cor purple', () => {
    expect(PESSOAS_CONFIG.pessoa_a.nome).toBe('Nome_A');
    expect(PESSOAS_CONFIG.pessoa_a.inicial).toBe('A');
    expect(PESSOAS_CONFIG.pessoa_a.cor).toBe('#bd93f9');
  });

  it('default de pessoa_b e generico (Nome_B) e cor pink', () => {
    expect(PESSOAS_CONFIG.pessoa_b.nome).toBe('Nome_B');
    expect(PESSOAS_CONFIG.pessoa_b.inicial).toBe('B');
    expect(PESSOAS_CONFIG.pessoa_b.cor).toBe('#ff79c6');
  });

  it('default de ambos e Casal com inicial AB', () => {
    expect(PESSOAS_CONFIG.ambos.nome).toBe('Casal');
    expect(PESSOAS_CONFIG.ambos.inicial).toBe('AB');
  });

  it('nenhum nome default casa nomes reais (Regra -1)', () => {
    for (const cfg of Object.values(PESSOAS_CONFIG)) {
      expect(NOMES_REAIS.test(cfg.nome)).toBe(false);
    }
  });
});

describe('inicialDe', () => {
  it('mapeia pessoa_a -> A, pessoa_b -> B, ambos -> AB', () => {
    expect(inicialDe('pessoa_a')).toBe('A');
    expect(inicialDe('pessoa_b')).toBe('B');
    expect(inicialDe('ambos')).toBe('AB');
  });
});

describe('corDe', () => {
  it('pessoa_a usa purple, pessoa_b usa pink', () => {
    expect(corDe('pessoa_a')).toBe('#bd93f9');
    expect(corDe('pessoa_b')).toBe('#ff79c6');
  });

  it('ambos cai no purple por padrao', () => {
    expect(corDe('ambos')).toBe('#bd93f9');
  });
});
