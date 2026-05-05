// Testes do helper de contraste WCAG AA. Cobre parsing, luminancia,
// ratio e shortcuts. Casos canonicos derivados das cores Dracula
// definidas em src/theme/tokens.ts contra superficies bg, bgAlt, bgElev.
//
// Comentarios sem acento.
import {
  parseCor,
  ratioContraste,
  luminanciaRelativa,
  passaWcagAaTextoNormal,
  passaWcagAaTextoGrande,
  WCAG_AA_TEXTO_NORMAL,
  WCAG_AA_TEXTO_GRANDE,
} from '../../../src/lib/a11y/contraste';
import { colors } from '../../../src/theme/tokens';

describe('parseCor', () => {
  it('parseia hex curto #fff', () => {
    expect(parseCor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });
  it('parseia hex longo #ff79c6', () => {
    expect(parseCor('#ff79c6')).toEqual({ r: 255, g: 121, b: 198, a: 1 });
  });
  it('parseia hex com alpha #ff79c680', () => {
    const c = parseCor('#ff79c680');
    expect(c?.r).toBe(255);
    expect(c?.g).toBe(121);
    expect(c?.b).toBe(198);
    expect(c?.a).toBeCloseTo(0.5, 1);
  });
  it('parseia rgb()', () => {
    expect(parseCor('rgb(20, 21, 26)')).toEqual({ r: 20, g: 21, b: 26, a: 1 });
  });
  it('parseia rgba() com alpha', () => {
    const c = parseCor('rgba(189, 147, 249, 0.5)');
    expect(c?.r).toBe(189);
    expect(c?.a).toBe(0.5);
  });
  it('aceita espacos em volta', () => {
    expect(parseCor('  #14151a  ')).toEqual({ r: 20, g: 21, b: 26, a: 1 });
  });
  it('retorna null para string vazia ou invalida', () => {
    expect(parseCor('')).toBeNull();
    expect(parseCor('not-a-color')).toBeNull();
    expect(parseCor('#xyz')).toBeNull();
  });
});

describe('luminanciaRelativa', () => {
  it('preto = 0', () => {
    expect(luminanciaRelativa({ r: 0, g: 0, b: 0, a: 1 })).toBe(0);
  });
  it('branco = 1', () => {
    expect(luminanciaRelativa({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(
      1,
      5,
    );
  });
  it('cinza intermediario fica entre 0 e 1', () => {
    const L = luminanciaRelativa({ r: 128, g: 128, b: 128, a: 1 });
    expect(L).toBeGreaterThan(0.18);
    expect(L).toBeLessThan(0.25);
  });
});

describe('ratioContraste', () => {
  it('preto sobre branco = 21:1', () => {
    expect(ratioContraste('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('branco sobre preto = 21:1 (simetrico)', () => {
    expect(ratioContraste('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });
  it('mesma cor = 1:1', () => {
    expect(ratioContraste('#bd93f9', '#bd93f9')).toBeCloseTo(1, 5);
  });
  it('aceita objetos CorRgb diretamente', () => {
    const r = ratioContraste(
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 0, g: 0, b: 0, a: 1 },
    );
    expect(r).toBeCloseTo(21, 0);
  });
  it('lanca Error em cor invalida', () => {
    expect(() => ratioContraste('xxx', '#000')).toThrow(/cor.*invalida/i);
    expect(() => ratioContraste('#000', 'yyy')).toThrow(/cor.*invalida/i);
  });
});

describe('Dracula contra superficies', () => {
  // Tabela canonica esperada para a paleta Dracula contra cada
  // superficie. Valores foram calculados pela implementacao e
  // congelados aqui para detectar regressoes em cores ou formula.
  // Marca [PASS-AA] para ratio >= 4.5 (texto normal),
  // [PASS-LG] para ratio >= 3.0 (texto grande / icones), [FAIL] abaixo.
  const superficies = ['bgPage', 'bg', 'bgAlt', 'bgElev'] as const;
  const cores = [
    'fg',
    'muted',
    'mutedDecor',
    'purple',
    'pink',
    'cyan',
    'green',
    'yellow',
    'orange',
    'red',
  ] as const;

  type Linha = {
    cor: (typeof cores)[number];
    sobre: (typeof superficies)[number];
    ratio: number;
    aa: boolean;
    lg: boolean;
  };
  const tabela: Linha[] = [];
  cores.forEach((c) => {
    superficies.forEach((s) => {
      const ratio = ratioContraste(colors[c], colors[s]);
      tabela.push({
        cor: c,
        sobre: s,
        ratio: Number(ratio.toFixed(2)),
        aa: ratio >= WCAG_AA_TEXTO_NORMAL,
        lg: ratio >= WCAG_AA_TEXTO_GRANDE,
      });
    });
  });

  it('fg sobre todas superficies passa AA texto normal', () => {
    const fg = tabela.filter((l) => l.cor === 'fg');
    fg.forEach((l) => {
      expect(l.aa).toBe(true);
    });
  });

  it('muted sobre bg/bgAlt/bgPage passa AA texto normal', () => {
    const muted = tabela.filter(
      (l) => l.cor === 'muted' && l.sobre !== 'bgElev',
    );
    muted.forEach((l) => {
      expect(l.aa).toBe(true);
    });
  });

  it('mutedDecor falha AA texto normal sobre bg (uso decorativo apenas)', () => {
    const linha = tabela.find(
      (l) => l.cor === 'mutedDecor' && l.sobre === 'bg',
    );
    expect(linha).toBeDefined();
    expect(linha?.aa).toBe(false);
  });

  it('purple/pink/cyan/green/yellow/orange passam AA texto grande sobre bg', () => {
    const acento = tabela.filter(
      (l) =>
        ['purple', 'pink', 'cyan', 'green', 'yellow', 'orange'].includes(
          l.cor,
        ) && l.sobre === 'bg',
    );
    acento.forEach((l) => {
      expect(l.lg).toBe(true);
    });
  });

  it('red passa AA texto grande sobre bg (uso para erro/destrutivo)', () => {
    const linha = tabela.find((l) => l.cor === 'red' && l.sobre === 'bg');
    expect(linha?.lg).toBe(true);
  });

  it('texto bg (#282a36) sobre purple/green funciona como botao primario', () => {
    expect(passaWcagAaTextoNormal(colors.bg, colors.purple)).toBe(true);
    expect(passaWcagAaTextoNormal(colors.bg, colors.green)).toBe(true);
  });

  it('snapshot da tabela canonica para detectar regressao', () => {
    expect(tabela).toMatchSnapshot();
  });
});

describe('passaWcagAa* helpers', () => {
  it('texto normal exige >= 4.5', () => {
    expect(passaWcagAaTextoNormal('#ffffff', '#000000')).toBe(true);
    expect(passaWcagAaTextoNormal('#bd93f9', '#bd93f9')).toBe(false);
  });
  it('texto grande exige >= 3.0', () => {
    expect(passaWcagAaTextoGrande('#bd93f9', '#282a36')).toBe(true);
  });
  it('thresholds publicos coerentes com WCAG 2.1', () => {
    expect(WCAG_AA_TEXTO_NORMAL).toBe(4.5);
    expect(WCAG_AA_TEXTO_GRANDE).toBe(3.0);
  });
});
