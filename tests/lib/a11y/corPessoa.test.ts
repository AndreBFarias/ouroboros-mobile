// P7 (2026-09-08) — piso de contraste da cor de pessoa.
//
// A decisao que esta sprint executa diz, com todas as letras, que a
// validacao de contraste entra JUNTO com a troca de cor, e nao depois:
// permitir escolher sem medir deixaria a pessoa cair numa combinacao
// ilegivel, que e o oposto do objetivo. Esta suite e a prova dessa
// metade.
//
// O caso que mais importa aqui e o PRIMEIRO: os dois defaults do
// projeto passam no proprio criterio. Um piso que reprovasse #bd93f9
// seria um numero inventado, nao uma medida — e so um teste que
// confronta o criterio com a paleta real pega isso.
//
// Comentarios sem acento (convencao dos testes de a11y).
import {
  avaliarCorPessoa,
  formatarRazao,
  mensagemRecusaCorPessoa,
  normalizarCor,
  COR_TEXTO_SOBRE_AVATAR,
  SUPERFICIES_TEXTO,
  SUPERFICIE_NAO_TEXTUAL,
} from '@/lib/a11y/corPessoa';
import { ratioContraste } from '@/lib/a11y/contraste';
import { colors } from '@/theme/tokens';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';

describe('avaliarCorPessoa — os defaults passam no proprio criterio', () => {
  it('roxo de pessoa_a passa', () => {
    const av = avaliarCorPessoa(PESSOAS_CONFIG.pessoa_a.cor);
    expect(av.ok).toBe(true);
    expect(av.motivo).toBeNull();
    expect(av.cor).toBe('#bd93f9');
  });

  it('rosa de pessoa_b passa', () => {
    const av = avaliarCorPessoa(PESSOAS_CONFIG.pessoa_b.cor);
    expect(av.ok).toBe(true);
    expect(av.motivo).toBeNull();
  });

  it('a margem devolvida quando passa e a medida mais apertada', () => {
    // Para o roxo, a medida mais apertada e a de bgElev (3.79 contra o
    // minimo 3.0); as outras tem folga maior em proporcao. Se um dia a
    // paleta mudar e outra medida ficar mais apertada, este teste
    // aponta onde.
    const av = avaliarCorPessoa(colors.purple);
    expect(av.ok).toBe(true);
    expect(av.minimo).toBe(3);
    expect(av.ratio).toBeCloseTo(
      ratioContraste(colors.purple, colors.bgElev),
      2
    );
  });
});

describe('avaliarCorPessoa — recusa', () => {
  it('recusa cor escura demais para o fundo das telas', () => {
    // #3a3a3a fica abaixo de 4.5 contra bg/bgAlt e some no aplicativo.
    const av = avaliarCorPessoa('#3a3a3a');
    expect(av.ok).toBe(false);
    expect(av.motivo).not.toBeNull();
    expect(av.ratio).toBeLessThan(av.minimo);
  });

  it('recusa preto, que reprova em todas as medidas', () => {
    const av = avaliarCorPessoa('#000000');
    expect(av.ok).toBe(false);
    expect(av.ratio).toBeLessThan(4.5);
  });

  it('recusa valor que nem forma cor, com motivo proprio', () => {
    const av = avaliarCorPessoa('roxinho');
    expect(av.ok).toBe(false);
    expect(av.motivo).toBe('formato');
    expect(av.cor).toBeNull();
  });

  it('recusa hex com canal alpha, porque a medida ignoraria a transparencia', () => {
    // parseCor le #rrggbbaa e rgba(); aceitar aqui seria medir uma cor
    // opaca e pintar uma semitransparente — mede uma, mostra outra.
    expect(avaliarCorPessoa('#bd93f980').motivo).toBe('formato');
    expect(avaliarCorPessoa('rgba(189, 147, 249, 0.3)').motivo).toBe('formato');
  });

  it('a recusa aponta a PIOR medida, nao a primeira que falhou', () => {
    const av = avaliarCorPessoa('#000000');
    const piores = [
      ...SUPERFICIES_TEXTO.map((s) => ratioContraste('#000000', colors[s])),
      ratioContraste('#000000', colors[SUPERFICIE_NAO_TEXTUAL]),
      ratioContraste(COR_TEXTO_SOBRE_AVATAR, '#000000'),
    ];
    expect(av.ratio).toBeCloseTo(Math.min(...piores), 2);
  });
});

describe('as tres medidas existem de fato', () => {
  it('mede a cor contra as superficies de tela', () => {
    // Cor que passa nas outras duas medidas e reprova so no fundo seria
    // impossivel de construir se esta medida nao existisse.
    const av = avaliarCorPessoa('#4a4a6a');
    expect(av.ok).toBe(false);
  });

  it('mede a inicial escura escrita dentro do avatar', () => {
    // A inicial do PersonAvatar e escrita em colors.bg sobre a cor.
    expect(COR_TEXTO_SOBRE_AVATAR).toBe(colors.bg);
    const av = avaliarCorPessoa(colors.purple);
    expect(ratioContraste(COR_TEXTO_SOBRE_AVATAR, colors.purple)).toBeGreaterThan(
      4.5
    );
    expect(av.ok).toBe(true);
  });

  it('a medida de elevacao usa o piso nao textual, e nao 4.5', () => {
    // O roxo canonico fica em 3.79 sobre bgElev: cobrar 4.5 ali
    // reprovaria o default do projeto.
    expect(ratioContraste(colors.purple, colors.bgElev)).toBeLessThan(4.5);
    expect(avaliarCorPessoa(colors.purple).ok).toBe(true);
  });
});

describe('normalizarCor', () => {
  it('apara espaco e baixa a caixa', () => {
    expect(normalizarCor('  #BD93F9 ')).toBe('#bd93f9');
  });
  it('expande a forma curta', () => {
    expect(normalizarCor('#FFF')).toBe('#ffffff');
  });
  it('devolve null para o que nao e hex opaco', () => {
    expect(normalizarCor('')).toBeNull();
    expect(normalizarCor('#12345')).toBeNull();
    expect(normalizarCor(undefined)).toBeNull();
    expect(normalizarCor(42)).toBeNull();
  });
});

describe('formatarRazao', () => {
  it('usa virgula decimal e a forma falada em PT-BR', () => {
    expect(formatarRazao(5.9)).toBe('5,9 para 1');
    expect(formatarRazao(3)).toBe('3,0 para 1');
  });
});

describe('mensagemRecusaCorPessoa — o texto que a pessoa le', () => {
  // A instrucao da sprint e explicita: ao recusar, dizer a razao obtida,
  // a minima, e que a escolha ficaria dificil de ler. Nada de "cor
  // invalida" seco.
  const av = avaliarCorPessoa('#000000');
  const msg = mensagemRecusaCorPessoa(av);

  it('traz a razao obtida e a razao minima, com numero', () => {
    expect(msg).toContain(formatarRazao(av.ratio));
    expect(msg).toContain(formatarRazao(av.minimo));
    expect(msg).toMatch(/\d,\d para 1/);
  });

  it('diz o que ficaria dificil de ler', () => {
    expect(msg).toMatch(/difícil de (ler|enxergar)|sumiria/);
  });

  it('sugere um caminho em vez de so barrar', () => {
    expect(msg).toMatch(/mais clara/);
  });

  it('nao culpa quem escolheu nem usa vocabulario de defeito', () => {
    const proibidos = [
      /\binválid/i,
      /\berro\b/i,
      /\bfalha/i,
      /!/,
      /\bvocê errou\b/i,
      /proibid/i,
    ];
    for (const padrao of proibidos) {
      expect(msg).not.toMatch(padrao);
    }
  });

  it('o caso de formato explica o formato esperado, sem jargao', () => {
    const texto = mensagemRecusaCorPessoa(avaliarCorPessoa('roxinho'));
    expect(texto).toContain('#bd93f9');
    expect(texto).not.toMatch(/hexadecimal|RGB|sRGB/i);
    expect(texto).not.toMatch(/!/);
  });

  it('cor aprovada nao gera texto nenhum', () => {
    expect(mensagemRecusaCorPessoa(avaliarCorPessoa(colors.purple))).toBe('');
  });

  it('cada motivo de recusa fala do lugar certo da interface', () => {
    // Sem isto, um unico texto generico serviria para tudo — e a
    // pessoa nao saberia o que exatamente ficaria ilegivel.
    const fundo = mensagemRecusaCorPessoa({
      cor: '#123456',
      ok: false,
      motivo: 'fundo',
      ratio: 2,
      minimo: 4.5,
    });
    const elevacao = mensagemRecusaCorPessoa({
      cor: '#123456',
      ok: false,
      motivo: 'elevacao',
      ratio: 2,
      minimo: 3,
    });
    const inicial = mensagemRecusaCorPessoa({
      cor: '#123456',
      ok: false,
      motivo: 'inicial',
      ratio: 2,
      minimo: 4.5,
    });
    expect(fundo).toMatch(/fundo das telas/);
    expect(elevacao).toMatch(/bordas/);
    expect(inicial).toMatch(/inicial/);
    expect(new Set([fundo, elevacao, inicial]).size).toBe(3);
  });
});
