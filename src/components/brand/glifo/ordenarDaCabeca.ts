// Porte PURO de orderFromHead (docs/design/ouroboros/ouroboros-lib.js:123-155).
// Ordena as contas ao redor do centro do corpo, comecando pela conta mais
// proxima da ancora da cabeca (posicao do olho). Sem DOM, sem Reanimated:
// opera sobre dados {id,cx,cy} e roda em Node/Jest.
//
//   direction 'ccw' (anti-horario, pescoco -> cauda):
//     ordem[0]  = conta-01 (pescoco)
//     ordem[42] = conta-43 (perto da boca)
//   direction 'cw' (horario): a rotacao para a cabeca, sem inversao.
//
// A matematica e' identica a da lib canonica: atan2 relativo ao CENTRO do
// corpo, sort crescente por angulo, acha a conta de angulo mais proximo da
// ancora da cabeca, rotaciona o array para comecar nela, e inverte o resto
// so no 'ccw'.
//
// Comentarios sem acento (convencao shell/CI).
import { CENTRO, ANCORA_CABECA, type ContaComId } from './geometria';

export type Direcao = 'ccw' | 'cw';

export function ordenarDaCabeca(
  contas: ContaComId[],
  direction: Direcao = 'ccw'
): ContaComId[] {
  const CX = CENTRO.x;
  const CY = CENTRO.y;

  // angulo de cada conta relativo ao centro do corpo
  const arr = contas.map((conta) => ({
    conta,
    a: Math.atan2(conta.cy - CY, conta.cx - CX),
  }));

  // ordena crescente por angulo
  arr.sort((a, b) => a.a - b.a);

  // ancora da cabeca = angulo da posicao do olho
  const aHead = Math.atan2(ANCORA_CABECA.cy - CY, ANCORA_CABECA.cx - CX);

  // acha o indice da conta de angulo mais proximo da ancora
  let best = 0;
  let bt = 9e9;
  arr.forEach((o, i) => {
    let d = Math.abs(o.a - aHead) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bt) {
      bt = d;
      best = i;
    }
  });

  // rotaciona o array para comecar na conta da cabeca
  const rotated = arr
    .slice(best)
    .concat(arr.slice(0, best))
    .map((o) => o.conta);

  // ccw: mantem a primeira e inverte o resto; cw: sem inversao
  return direction === 'ccw'
    ? [rotated[0]].concat(rotated.slice(1).reverse())
    : rotated;
}
