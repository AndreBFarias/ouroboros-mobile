// R-RECAP-4 (2026-05-16): testes unitarios do componente KenBurns
// e do seletor deterministico de preset (presetParaSlide).
//
// R-AUDIT-A11Y-MOVIMENTO (2026-07-13): estende com render do componente
// para cobrir reduce-motion (transform estatico) + higiene de a11y
// (troca do label jargao "ken burns container" por
// importantForAccessibility="no-hide-descendants").
//
// Comentarios sem acento.
import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { presetParaSlide, KenBurns } from '@/components/recap/KenBurns';

// Shape minimo do no da arvore de teste (mesma abordagem de
// OuroborosLoader.test.tsx) para tipar os predicados de findAll.
type NoTeste = { props: Record<string, unknown> };

// Mock local do hook: os component tests controlam o booleano
// "posso animar?" diretamente. A logica do proprio hook (sistema OR
// toggle) e' coberta em tests/lib/hooks/useReduceMotion.test.tsx.
const mockUseReduceMotion = jest.fn();
jest.mock('@/lib/hooks/useReduceMotion', () => ({
  useReduceMotion: () => mockUseReduceMotion(),
}));

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

describe('KenBurns (reduce-motion + higiene de a11y)', () => {
  beforeEach(() => {
    mockUseReduceMotion.mockReset();
    mockUseReduceMotion.mockReturnValue(false);
  });

  // O container raiz do KenBurns e o unico no com
  // importantForAccessibility="no-hide-descendants".
  function styleDoContainer(tree: ReturnType<typeof render>) {
    const nos = tree.root.findAll(
      (n: NoTeste) =>
        !!n.props &&
        n.props.importantForAccessibility === 'no-hide-descendants'
    );
    return StyleSheet.flatten(
      (nos[0].props as { style: unknown }).style
    ) as { transform?: unknown };
  }

  it('nao expoe mais o label jargao "ken burns container"', () => {
    const tree = render(
      <KenBurns slideId="abertura">
        <Text>filho</Text>
      </KenBurns>
    );
    expect(tree.queryByLabelText('ken burns container')).toBeNull();
  });

  it('esconde os descendentes do leitor de tela (padrao do projeto)', () => {
    const tree = render(
      <KenBurns slideId="abertura">
        <Text>filho</Text>
      </KenBurns>
    );
    const nos = tree.root.findAll(
      (n: NoTeste) =>
        !!n.props &&
        n.props.importantForAccessibility === 'no-hide-descendants'
    );
    expect(nos.length).toBeGreaterThanOrEqual(1);
    expect(
      (nos[0].props as Record<string, unknown>).accessibilityElementsHidden
    ).toBe(true);
  });

  it('com reduce-motion aplica transform estatico (scale 1, sem zoom/pan)', () => {
    mockUseReduceMotion.mockReturnValue(true);
    const tree = render(
      <KenBurns slideId="abertura">
        <Text>filho</Text>
      </KenBurns>
    );
    expect(styleDoContainer(tree).transform).toEqual([{ scale: 1 }]);
  });

  it('sem reduce-motion aplica o transform animado (zoom/pan do preset)', () => {
    mockUseReduceMotion.mockReturnValue(false);
    // slideId 'abertura' -> preset pan-left-right (scale 1.1 + translateX):
    // nunca colapsa para o estatico [{ scale: 1 }].
    const tree = render(
      <KenBurns slideId="abertura">
        <Text>filho</Text>
      </KenBurns>
    );
    expect(styleDoContainer(tree).transform).not.toEqual([{ scale: 1 }]);
  });
});
