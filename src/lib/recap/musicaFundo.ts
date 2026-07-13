// R-RECAP-9 (2026-07-11) -- pool de trilhas animadas do slideshow
// Memorias (estilo Google Fotos "Memories"). Substitui o AMBIENT_TRACK
// fixo (drone CC0) por uma faixa alegre sorteada do pool a cada sessao.
//
// As 16 faixas sao de Kevin MacLeod (incompetech.com), licenca
// Creative Commons Attribution 4.0 (CC BY 4.0). A atribuicao obrigatoria
// e' satisfeita pela secao de creditos em /settings -> Sobre
// (ver assets/sounds/recap-musicas/CREDITS.md e docs/SOUNDS-LICENSES.md).
//
// require estatico de cada asset: o bundler Metro precisa de literais
// para empacotar o mp3 no APK (nao aceita path dinamico). Por isso o
// pool e' uma tabela fixa, um require por linha.
//
// Seletor deterministico: dado um seed numerico, escolhe um indice de
// forma estavel (sem Math.random no topo do modulo, para o comportamento
// ser testavel e reproduzivel). O unico estado de modulo e' o indice da
// ULTIMA faixa tocada nesta sessao (ultimoIndiceTocado), usado apenas
// para evitar repetir a mesma faixa duas vezes seguidas -- rotacao
// estavel por sessao, nao aleatoriedade oculta.
//
// Restricao estrutural: usa expo-av (via app/recap-memorias.tsx). Ver
// docs/sprints/R-INFRA-EXPO-AV-MIGRACAO-spec.md -- este pool amplia a
// superficie de audio a migrar para expo-audio pos-v1.0 (SDK 56).
//
// Comentarios sem acento (convencao shell/CI).

// Tipo de asset retornado por require() de um mp3 no React Native
// (numero opaco do registry de assets do Metro). Mantido como
// `number` porque e' isso que require devolve em runtime.
export type AssetModulo = number;

export interface MusicaFundo {
  // Slug estavel = nome do arquivo sem extensao. Usado em testes e logs.
  id: string;
  // Titulo humano (exibicao/creditos).
  titulo: string;
  // Autor (CC BY exige credito).
  autor: string;
  // Licenca declarada.
  licenca: string;
  // Asset empacotado (require estatico do mp3).
  asset: AssetModulo;
}

// Autor e licenca comuns a todas as faixas (Kevin MacLeod, CC BY 4.0).
const AUTOR = 'Kevin MacLeod';
const LICENCA = 'CC BY 4.0';

// Pool das 16 faixas alegre-caloroso (curadas: indie/acustico/lo-fi
// feliz, sem eletronico estridente -- decisao do dono R-RECAP-9 §6bis).
// Ordem fixa: o seletor deriva o indice do seed, entao a ordem aqui e'
// so' a base determinista da rotacao.
export const MUSICAS_FUNDO: readonly MusicaFundo[] = [
  {
    id: 'amazing-plan',
    titulo: 'Amazing Plan',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/amazing-plan.mp3'),
  },
  {
    id: 'beachfront-celebration',
    titulo: 'Beachfront Celebration',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/beachfront-celebration.mp3'),
  },
  {
    id: 'carefree',
    titulo: 'Carefree',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/carefree.mp3'),
  },
  {
    id: 'cheery-monday',
    titulo: 'Cheery Monday',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/cheery-monday.mp3'),
  },
  {
    id: 'fluffing-a-duck',
    titulo: 'Fluffing a Duck',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/fluffing-a-duck.mp3'),
  },
  {
    id: 'fun-in-a-bottle',
    titulo: 'Fun in a Bottle',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/fun-in-a-bottle.mp3'),
  },
  {
    id: 'happy-alley',
    titulo: 'Happy Alley',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/happy-alley.mp3'),
  },
  {
    id: 'itty-bitty-8-bit',
    titulo: 'Itty Bitty 8 Bit',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/itty-bitty-8-bit.mp3'),
  },
  {
    id: 'jaunty-gumption',
    titulo: 'Jaunty Gumption',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/jaunty-gumption.mp3'),
  },
  {
    id: 'life-of-riley',
    titulo: 'Life of Riley',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/life-of-riley.mp3'),
  },
  {
    id: 'monkeys-spinning-monkeys',
    titulo: 'Monkeys Spinning Monkeys',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/monkeys-spinning-monkeys.mp3'),
  },
  {
    id: 'off-to-osaka',
    titulo: 'Off to Osaka',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/off-to-osaka.mp3'),
  },
  {
    id: 'pixelland',
    titulo: 'Pixelland',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/pixelland.mp3'),
  },
  {
    id: 'sneaky-snitch',
    titulo: 'Sneaky Snitch',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/sneaky-snitch.mp3'),
  },
  {
    id: 'the-builder',
    titulo: 'The Builder',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/the-builder.mp3'),
  },
  {
    id: 'wallpaper',
    titulo: 'Wallpaper',
    autor: AUTOR,
    licenca: LICENCA,
    asset: require('../../../assets/sounds/recap-musicas/wallpaper.mp3'),
  },
] as const;

// Estado de sessao (NAO aleatorio): indice da ultima faixa retornada por
// sortearMusica. Serve unicamente para o desempate "nao repetir 2x
// seguidas". Reinicia a cada boot do bundle (comportamento desejado:
// rotacao dentro da sessao). Comeca em null (primeira sessao pode cair
// em qualquer faixa).
let ultimoIndiceTocado: number | null = null;

// Reduz um seed arbitrario a um indice valido do pool [0, n). Aceita
// qualquer numero (Date.now, hash, contador); normaliza negativos e
// fracionarios de forma estavel.
function indicePorSeed(seed: number): number {
  const n = MUSICAS_FUNDO.length;
  if (!Number.isFinite(seed)) return 0;
  const inteiro = Math.abs(Math.trunc(seed));
  return inteiro % n;
}

// Seletor puro-por-argumentos: dado um seed e (opcionalmente) o indice
// da faixa anterior, devolve o indice da faixa a tocar. Deterministico:
// mesmo (seed, anterior) sempre retorna o mesmo indice. Garante que o
// resultado NUNCA e' igual a `anterior` (quando ha mais de 1 faixa),
// deslocando +1 circular em caso de colisao -- evita repetir a mesma
// faixa duas vezes seguidas.
//
// Quando `anterior` e' omitido, usa o estado de sessao
// (ultimoIndiceTocado). Passar `anterior` explicito torna a funcao
// totalmente pura (usado nos testes).
export function sortearMusica(
  seed: number,
  anterior: number | null = ultimoIndiceTocado
): number {
  const n = MUSICAS_FUNDO.length;
  if (n === 0) return -1;
  if (n === 1) return 0;
  let idx = indicePorSeed(seed);
  if (anterior !== null) {
    const anteriorNorm = ((Math.trunc(anterior) % n) + n) % n;
    if (idx === anteriorNorm) {
      idx = (idx + 1) % n;
    }
  }
  return idx;
}

// Registra qual faixa foi efetivamente escolhida nesta sessao, para o
// proximo sorteio nao repeti-la. Chamado pela tela apos fixar a faixa da
// sessao. Idempotente: chamar 2x com o mesmo indice nao muda nada.
export function registrarMusicaTocada(idx: number): void {
  const n = MUSICAS_FUNDO.length;
  if (n === 0) return;
  ultimoIndiceTocado = ((Math.trunc(idx) % n) + n) % n;
}

// Helper de conveniencia: resolve a faixa pelo indice (clamp defensivo).
export function musicaPorIndice(idx: number): MusicaFundo {
  const n = MUSICAS_FUNDO.length;
  const seguro = ((Math.trunc(idx) % n) + n) % n;
  return MUSICAS_FUNDO[seguro];
}

// Reinicia o estado de sessao. Exposto apenas para testes deterministicos
// (garante que a ordem de execucao dos casos nao vaze entre eles).
export function _resetSessaoParaTeste(): void {
  ultimoIndiceTocado = null;
}
