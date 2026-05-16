// R-RECAP-4 (2026-05-16): testes unitarios do componente KenBurns
// e do seletor deterministico de preset (presetParaSlide).
//
// Comentarios sem acento.
import { presetParaSlide } from '@/components/recap/KenBurns';

describe('presetParaSlide', () => {
  it('e determinista: mesmo slideId sempre retorna mesmo preset', () => {
    const a = presetParaSlide('vitorias');
    const b = presetParaSlide('vitorias');
    expect(a).toBe(b);
  });

  it('produz 4 presets canonicos para um conjunto de ids comuns', () => {
    const ids = ['abertura', 'numeros', 'vitorias', 'midias', 'crises'];
    const presets = ids.map(presetParaSlide);
    for (const p of presets) {
      expect([
        'zoom-in-top-left',
        'zoom-out-center',
        'pan-left-right',
        'pan-bottom-top',
      ]).toContain(p);
    }
  });

  it('rotaciona razoavelmente: 5+ ids unicos cobrem mais de 1 preset', () => {
    const ids = [
      'abertura',
      'numeros',
      'vitorias',
      'midias',
      'crises',
      'encerramento',
    ];
    const set = new Set(ids.map(presetParaSlide));
    expect(set.size).toBeGreaterThanOrEqual(2);
  });

  it('aceita string vazia (fallback no primeiro preset)', () => {
    const p = presetParaSlide('');
    expect(p).toBe('zoom-in-top-left');
  });
});
