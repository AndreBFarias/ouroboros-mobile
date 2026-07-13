// R-RECAP-9c (2026-07-13): testes do mapeamento progresso -> escala da
// barra de progresso do slideshow Memorias. A animacao em si e' Reanimated
// (mockado no Jest); aqui cravamos a logica pura que decide a largura de
// cada barra por estado.
//
// Comentarios sem acento.
import { escalaDe } from '@/components/recap/BarraProgresso';

describe('escalaDe (mapa progresso -> escala da barra)', () => {
  it('barra preenchida (slide passado) e cheia, ignora o progresso', () => {
    expect(escalaDe('preenchido', 0)).toBe(1);
    expect(escalaDe('preenchido', 0.3)).toBe(1);
    expect(escalaDe('preenchido', 1)).toBe(1);
  });

  it('barra vazia (slide futuro) fica em zero', () => {
    expect(escalaDe('vazio', 0)).toBe(0);
    expect(escalaDe('vazio', 0.7)).toBe(0);
    expect(escalaDe('vazio', 1)).toBe(0);
  });

  it('barra ativa reflete o progresso corrente (0 -> 1)', () => {
    expect(escalaDe('ativo', 0)).toBe(0);
    expect(escalaDe('ativo', 0.25)).toBe(0.25);
    expect(escalaDe('ativo', 0.5)).toBe(0.5);
    expect(escalaDe('ativo', 1)).toBe(1);
  });

  it('barra ativa clampa progresso fora de [0, 1]', () => {
    expect(escalaDe('ativo', -0.4)).toBe(0);
    expect(escalaDe('ativo', 1.8)).toBe(1);
  });

  it('a barra ativa nao fica presa em 50% (regressao do bug B2)', () => {
    // Antes do fix a barra ativa tinha width fixo '50%'. Agora a escala
    // acompanha o progresso: comeca perto de 0 e termina em 1.
    expect(escalaDe('ativo', 0.01)).toBeLessThan(0.5);
    expect(escalaDe('ativo', 0.99)).toBeGreaterThan(0.5);
  });
});
