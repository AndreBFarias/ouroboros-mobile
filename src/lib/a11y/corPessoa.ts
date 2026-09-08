// Validacao de contraste da cor que identifica uma pessoa (P7 das
// decisoes de 2026-09-08, "as cores de pessoa viram default editavel").
//
// POR QUE ESTE MODULO EXISTE
//
// Ate 2026-09-08 as cores #bd93f9 e #ff79c6 eram Regra Inviolavel: so
// mudavam recompilando o aplicativo. Isso e' o aplicativo decidindo
// sozinho algo que deveria ser escolha de quem o usa -- e o eixo de
// acessibilidade deste projeto e' CONTROLE, nao conformidade.
//
// A troca, porem, nao pode ser livre. A cor de pessoa nao e' decoracao:
// ela e' o fundo do avatar (com a inicial escrita por cima), e' o nome
// escrito em cor sobre as telas, e e' a borda que separa o registro de
// uma pessoa do da outra. Uma cor escura demais some no fundo escuro do
// aplicativo, e a pessoa perde a informacao que a cor carrega. Deixar
// escolher sem medir seria devolver a escolha e tirar a legibilidade --
// o oposto do objetivo.
//
// Por isso a validacao entra JUNTO com a troca, nunca depois.
//
// AS TRES MEDIDAS, E DE ONDE VEM CADA MINIMO
//
//   1. Cor sobre as superficies de tela (bgPage, bg, bgAlt) >= 4.5:1.
//      A cor e' usada como TEXTO (o nome da pessoa em CardVoces e em
//      DiaHumorModal), entao vale o minimo de texto normal do WCAG 2.1
//      SC 1.4.3.
//   2. Cor sobre bgElev (bordas e superficies elevadas) >= 3.0:1.
//      Ali a cor aparece como borda e icone, nao como corpo de texto:
//      o minimo aplicavel e' o de elemento nao textual, SC 1.4.11. O
//      proprio roxo canonico fica em 3.79:1 sobre bgElev -- cobrar 4.5
//      aqui reprovaria o default do projeto, o que seria uma regra
//      inventada, nao medida.
//   3. Texto escuro (colors.bg) sobre a cor >= 4.5:1. A inicial dentro
//      do PersonAvatar e' escrita em `text-bg` sobre o circulo colorido
//      (src/components/ui/PersonAvatar.tsx). Sem esta medida, uma cor
//      escura passaria pelas duas primeiras e apagaria a inicial.
//
// Os dois defaults passam nas tres com folga (roxo 5.90 / 3.79 / 5.90;
// rosa 5.97 / 3.84 / 5.97), e isso esta travado por teste: um criterio
// que reprovasse o proprio default seria bug de criterio.
//
// Todas as reprovacoes possiveis apontam para o mesmo lado -- cor
// escura demais --, porque as tres medidas comparam a cor com tons
// escuros. Por isso a mensagem pode sugerir "uma cor mais clara" sem
// mentir.
//
// Comentarios sem acento (convencao do modulo, igual a contraste.ts).
// Strings de UI em PT-BR com acentuacao completa.
import { colors } from '@/theme/tokens';
import {
  parseCor,
  ratioContraste,
  WCAG_AA_TEXTO_NORMAL,
  WCAG_AA_TEXTO_GRANDE,
} from '@/lib/a11y/contraste';

// Superficies onde a cor da pessoa aparece como texto.
export const SUPERFICIES_TEXTO = ['bgPage', 'bg', 'bgAlt'] as const;
// Superficie onde ela aparece so como borda, icone ou faixa.
export const SUPERFICIE_NAO_TEXTUAL = 'bgElev' as const;
// Cor da inicial escrita dentro do avatar colorido.
export const COR_TEXTO_SOBRE_AVATAR = colors.bg;

export type MotivoRecusaCor = 'formato' | 'fundo' | 'elevacao' | 'inicial';

export interface AvaliacaoCorPessoa {
  // Cor normalizada (minuscula, sem espaco em volta) quando reconhecida.
  cor: string | null;
  ok: boolean;
  // null quando a cor passa em tudo.
  motivo: MotivoRecusaCor | null;
  // Razao que decidiu -- a PIOR das medidas feitas. 0 quando nem deu
  // para ler a cor.
  ratio: number;
  // Minimo exigido pela medida que decidiu.
  minimo: number;
}

// Normaliza o que a pessoa digitou: espaco em volta some, o hex vira
// minusculo (para que #BD93F9 e #bd93f9 sejam a mesma escolha) e a
// forma curta vira longa (#fff -> #ffffff), para que o valor guardado
// seja sempre comparavel.
//
// So' hex opaco de 3 ou 6 digitos. parseCor tambem le rgba() e hex de 8
// digitos, e os dois carregam ALPHA -- cor semitransparente teria uma
// razao de contraste diferente da que este modulo calcula, porque o
// calculo ignora o canal alpha. Aceitar seria medir uma cor e pintar
// outra.
const HEX_OPACO = /^#([0-9a-f]{3}|[0-9a-f]{6})$/;

export function normalizarCor(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim().toLowerCase();
  if (!HEX_OPACO.test(limpo)) return null;
  if (limpo.length === 4) {
    return (
      '#' +
      limpo
        .slice(1)
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  return parseCor(limpo) === null ? null : limpo;
}

// Mede a cor contra as tres regras acima. Devolve a PIOR medida, para
// que a mensagem fale do problema que de fato decidiu a recusa.
export function avaliarCorPessoa(valor: string): AvaliacaoCorPessoa {
  const cor = normalizarCor(valor);
  if (cor === null) {
    return { cor: null, ok: false, motivo: 'formato', ratio: 0, minimo: 0 };
  }

  const medidas: Array<{
    motivo: MotivoRecusaCor;
    ratio: number;
    minimo: number;
  }> = [];

  for (const superficie of SUPERFICIES_TEXTO) {
    medidas.push({
      motivo: 'fundo',
      ratio: ratioContraste(cor, colors[superficie]),
      minimo: WCAG_AA_TEXTO_NORMAL,
    });
  }
  medidas.push({
    motivo: 'elevacao',
    ratio: ratioContraste(cor, colors[SUPERFICIE_NAO_TEXTUAL]),
    minimo: WCAG_AA_TEXTO_GRANDE,
  });
  medidas.push({
    motivo: 'inicial',
    ratio: ratioContraste(COR_TEXTO_SOBRE_AVATAR, cor),
    minimo: WCAG_AA_TEXTO_NORMAL,
  });

  const reprovadas = medidas.filter((m) => m.ratio < m.minimo);
  if (reprovadas.length === 0) {
    // Passou: devolve a medida mais apertada, que e' a margem real.
    const maisApertada = medidas.reduce((pior, atual) =>
      atual.ratio / atual.minimo < pior.ratio / pior.minimo ? atual : pior
    );
    return {
      cor,
      ok: true,
      motivo: null,
      ratio: maisApertada.ratio,
      minimo: maisApertada.minimo,
    };
  }

  const pior = reprovadas.reduce((a, b) => (a.ratio < b.ratio ? a : b));
  return {
    cor,
    ok: false,
    motivo: pior.motivo,
    ratio: pior.ratio,
    minimo: pior.minimo,
  };
}

// Razao no formato que se le em voz alta em PT-BR: "5,9 para 1".
export function formatarRazao(ratio: number): string {
  return `${ratio.toFixed(1).replace('.', ',')} para 1`;
}

// Texto que a interface mostra ao recusar.
//
// O que ele PRECISA dizer, por decisao de produto: a razao obtida, a
// razao minima, e que a escolha ficaria dificil de ler. O que ele nao
// pode fazer: culpar quem escolheu. Nao existe "cor invalida", "erro"
// nem "falha" aqui -- existe uma cor que este fundo escuro nao
// sustenta, o que e' um fato sobre o fundo tanto quanto sobre a cor.
export function mensagemRecusaCorPessoa(av: AvaliacaoCorPessoa): string {
  if (av.ok) return '';
  if (av.motivo === 'formato') {
    return 'Esse valor ainda não forma uma cor. O formato começa com # e tem seis caracteres depois, como em #bd93f9. Também dá para tocar em uma das cores sugeridas acima.';
  }
  const obtido = formatarRazao(av.ratio);
  const minimo = formatarRazao(av.minimo);
  if (av.motivo === 'inicial') {
    return `A inicial escrita dentro do avatar ficaria em ${obtido} de contraste sobre essa cor, e a leitura confortável começa em ${minimo}. Do jeito que está, a letra sumiria dentro do círculo. Uma cor um pouco mais clara costuma resolver.`;
  }
  if (av.motivo === 'elevacao') {
    return `Essa cor fica em ${obtido} de contraste com as bordas e os cartões mais claros do aplicativo, e o mínimo para esse tipo de elemento é ${minimo}. Do jeito que está, a borda que separa uma pessoa da outra ficaria difícil de enxergar. Uma cor um pouco mais clara costuma resolver.`;
  }
  return `Essa cor fica em ${obtido} de contraste com o fundo das telas, e a leitura confortável começa em ${minimo}. Do jeito que está, o nome escrito nessa cor ficaria difícil de ler. Uma cor um pouco mais clara costuma resolver.`;
}
