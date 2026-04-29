import {
  PessoaIdSchema,
  PessoaAutorSchema,
  isAutor,
} from '@/lib/schemas/pessoa';

describe('PessoaIdSchema', () => {
  it('aceita pessoa_a, pessoa_b e ambos', () => {
    expect(() => PessoaIdSchema.parse('pessoa_a')).not.toThrow();
    expect(() => PessoaIdSchema.parse('pessoa_b')).not.toThrow();
    expect(() => PessoaIdSchema.parse('ambos')).not.toThrow();
  });

  it('rejeita nomes reais', () => {
    expect(() => PessoaIdSchema.parse('andre')).toThrow();
    expect(() => PessoaIdSchema.parse('vitoria')).toThrow();
  });

  it('rejeita string vazia', () => {
    expect(() => PessoaIdSchema.parse('')).toThrow();
  });

  it('rejeita variantes acentuadas', () => {
    expect(() => PessoaIdSchema.parse('Pessoa_A')).toThrow();
    expect(() => PessoaIdSchema.parse('PESSOA_A')).toThrow();
  });
});

describe('PessoaAutorSchema', () => {
  it('aceita autor', () => {
    expect(PessoaAutorSchema.parse('pessoa_a')).toBe('pessoa_a');
    expect(PessoaAutorSchema.parse('pessoa_b')).toBe('pessoa_b');
  });

  it('rejeita ambos como autor', () => {
    expect(() => PessoaAutorSchema.parse('ambos')).toThrow();
  });
});

describe('isAutor', () => {
  it('retorna true para autores', () => {
    expect(isAutor('pessoa_a')).toBe(true);
    expect(isAutor('pessoa_b')).toBe(true);
  });

  it('retorna false para ambos', () => {
    expect(isAutor('ambos')).toBe(false);
  });
});
