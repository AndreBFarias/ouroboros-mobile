// R-HOME-4f: guarda de regressao do respiro inferior da home. O
// paddingBottom do feed (app/index.tsx) precisa reservar SEMPRE a zona
// vertical do FABMenu global -- base canonica (useSafeBottomMargin) +
// altura do FAB (FAB_ZONA_ALTURA) -- senao o FAB roxo cobre o ultimo
// card do feed ("Relembrando"). Testa o helper compartilhado
// useSafeBottomContentPadding contra useSafeBottomMargin (a MESMA fonte
// que o FAB usa para o bottom) em varios cenarios de inset: nav bar de
// 3 botoes / barra de gestos.
//
// Comentarios sem acento (convencao shell/CI).
import { Dimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import {
  useSafeBottomMargin,
  useSafeBottomContentPadding,
  FAB_ZONA_ALTURA,
} from '@/components/chrome/safeBottom';
import { spacing } from '@/theme/tokens';

describe('home paddingBottom reserva a zona do FAB (R-HOME-4f)', () => {
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    // Altura tipica de celular (892dp) para tornar o piso proporcional
    // (5% = 44.6dp apos R-HOME-4g) deterministico independente do device
    // de teste.
    getSpy = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 412, height: 892, scale: 3, fontScale: 1 });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  it.each([0, 24, 48])(
    'inset.bottom=%p: padding sempre >= base do FAB + altura do FAB',
    (inset: number) => {
      const { result: margin } = renderHook(() => useSafeBottomMargin(inset));
      const { result: padding } = renderHook(() =>
        useSafeBottomContentPadding(inset),
      );
      // Criterio da spec R-HOME-4f: o conteudo reserva ao menos ate o
      // topo do FAB (base + altura), garantindo que nada fica atras dele.
      expect(padding.current).toBeGreaterThanOrEqual(
        margin.current + FAB_ZONA_ALTURA,
      );
    },
  );

  it('reserva exatamente base + altura do FAB + respiro (spacing.lg)', () => {
    const { result: margin } = renderHook(() => useSafeBottomMargin(24));
    const { result: padding } = renderHook(() =>
      useSafeBottomContentPadding(24),
    );
    // toBeCloseTo: a base proporcional (altura*0.05) introduz erro de
    // ponto flutuante (892*0.05); a reserva liquida (padding - margin)
    // cancela a base e da' 84 (FAB 64 + respiro 20).
    expect(padding.current - margin.current).toBeCloseTo(
      FAB_ZONA_ALTURA + spacing.lg,
    );
  });

  it('FAB_ZONA_ALTURA casa o diametro real do FAB (64dp)', () => {
    // Guarda contra divergencia: FABMenu (roxo) e MenuCapturaVerde
    // (verde) usam 64dp; FABMenu importa esta mesma constante.
    expect(FAB_ZONA_ALTURA).toBe(64);
  });

  it('nunca regride ao valor fixo antigo (120), insuficiente em telas comuns', () => {
    // Guarda a regressao ao paddingBottom fixo antigo (120). Mesmo com a
    // base proporcional reduzida para 0.05 (R-HOME-4g), a reserva dinamica
    // (base ~44.6 + FAB 64 + respiro 20 = ~128.6) segue acima do 120 fixo,
    // preservando o respiro que impedia o FAB de cobrir o ultimo card.
    const { result: padding } = renderHook(() =>
      useSafeBottomContentPadding(0),
    );
    expect(padding.current).toBeGreaterThan(120);
  });
});

describe('R-HOME-4g: FAB abaixado (PCT_MIN_BOTTOM 0.05)', () => {
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    // Altura medida na spec R-HOME-4g secao 2 (~872dp) para reproduzir a
    // aritmetica da margem canonica do FAB de forma deterministica.
    getSpy = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 412, height: 872, scale: 3, fontScale: 1 });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  it('margem base = max(24, altura*0.05) = 43.6 sem inset', () => {
    const { result } = renderHook(() => useSafeBottomMargin(0));
    // 872*0.05 = 43.6 > piso spacing.xl (24), entao domina o proporcional.
    expect(result.current).toBeCloseTo(43.6);
  });

  it('nunca regride ao fator antigo 0.10 (que dava base 87.2dp)', () => {
    const { result } = renderHook(() => useSafeBottomMargin(0));
    // Com 0.10 a base seria 872*0.10 = 87.2; o guard crava que o fator
    // foi de fato abaixado. 43.6 fica bem abaixo de 87.2.
    expect(result.current).toBeLessThan(87.2);
  });

  it('topo do FAB (base + altura) fica abaixo do fim do card (~122dp)', () => {
    // Criterio da spec secao 2: card "Relembrando" termina ~122dp da base;
    // com 0.05 o topo do FAB (base 43.6 + FAB_ZONA_ALTURA 64 = 107.6dp)
    // cai abaixo desse limite, deixando o card visivel no topo da home.
    const { result } = renderHook(() => useSafeBottomMargin(0));
    expect(result.current + FAB_ZONA_ALTURA).toBeLessThan(122);
  });

  it('piso spacing.xl (24) ainda protege telas baixas', () => {
    // Em tela baixa (400dp) 400*0.05 = 20 < 24, entao o piso domina e o
    // FAB nao encosta na base. Guard de que a reducao nao removeu o piso.
    getSpy.mockReturnValue({ width: 320, height: 400, scale: 2, fontScale: 1 });
    const { result } = renderHook(() => useSafeBottomMargin(0));
    expect(result.current).toBe(spacing.xl);
  });

  it('+ safeAreaInsetBottom preservado (folga da nav bar, K4)', () => {
    // A diferenca entre insets deve ser exatamente o proprio inset: o
    // helper soma o safe-area, garantindo que o FAB nunca cole na nav bar.
    const { result: semInset } = renderHook(() => useSafeBottomMargin(0));
    const { result: comInset } = renderHook(() => useSafeBottomMargin(48));
    // toBeCloseTo: a base proporcional (872*0.05) carrega erro de ponto
    // flutuante, entao a diferenca sai 47.9999...; o que importa e que o
    // inset foi somado integralmente.
    expect(comInset.current - semInset.current).toBeCloseTo(48);
  });
});
