// Pool de frases de transicao para o modo Memorias do Recap
// (R-RECAP-4). Aparecem brevemente entre slides como susurros de
// continuidade, nao como narrativa imposta. Selecao deterministica
// por slide id + seed temporal (mesma sessao = mesmas frases).
//
// Filosofia (ADR-0005, anti-gamificacao, anti-acusacao):
// - Tom de testemunha calma, nao narrador entusiasta.
// - Sem exclamacao, sem comparativo, sem celebracao explicita.
// - Frases curtas, 3 a 8 palavras, ritmo de cortina caindo.
//
// As 12 variacoes rotacionam de forma deterministica para evitar
// repeticao chata em sessoes consecutivas. Mesma seed = mesma frase
// (idempotente).
//
// Strings PT-BR sentence case com acentuacao completa (regra UI).
// Comentarios sem acento (convencao shell/CI).

export const FRASES_TRANSICAO_MEMORIAS: ReadonlyArray<string> = [
  'O tempo passou.',
  'Ficou.',
  'Você esteve aqui.',
  'Algo permaneceu.',
  'Continua.',
  'Olhe de novo.',
  'Não se foi.',
  'Está registrado.',
  'Você seguiu.',
  'O período guardou.',
  'Repousa.',
  'Existe.',
];

// Pega frase deterministica baseada em string-seed (ex: slide id +
// timestamp do periodo). Hash simples por soma de char codes,
// modulo N. Idempotente: mesma seed -> mesma frase.
export function fraseTransicaoPara(seed: string): string {
  if (FRASES_TRANSICAO_MEMORIAS.length === 0) return '';
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h + seed.charCodeAt(i)) % 1_000_003;
  }
  const idx = h % FRASES_TRANSICAO_MEMORIAS.length;
  return FRASES_TRANSICAO_MEMORIAS[idx] ?? FRASES_TRANSICAO_MEMORIAS[0];
}
