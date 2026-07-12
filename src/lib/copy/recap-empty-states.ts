// Pool de frases para empty state do Recap (R-RECAP-3).
//
// Filosofia (ADR-0005, anti-gamificacao, anti-acusacao):
// - Nem reforco positivo artificial ("que otimo!", "dia leve!").
// - Nem acusacao ("0 registros", "sem registros — registre mais!").
// - Tom: constatacao serena, convite suave, micro-prompt.
//
// As 12 variacoes rotacionam de forma deterministica via seed
// (periodo + ano + semana). Mesma seed = mesma frase em todo render
// — garante idempotencia: usuario que reabre o Recap na mesma semana
// nao ve uma frase diferente a cada toque.
//
// Strings PT-BR sentence case com acentuacao completa (regra UI).
// Comentarios sem acento (convencao shell/CI).

export const FRASES_RECAP_VAZIO: ReadonlyArray<string> = [
  'Um período mais quieto.',
  'Nada registrado neste intervalo.',
  'Sem rastros aqui ainda.',
  'O período passou sem entradas.',
  'Vazio é uma forma de tempo também.',
  'Se algo aconteceu, dá pra registrar agora.',
  'Nenhum registro neste período.',
  'Esse intervalo ficou em branco.',
  'O Recap espera por registros futuros.',
  'Nada chegou ao vault neste período.',
  'O período seguiu sem anotações.',
  'Sem entradas — talvez o tempo tenha passado mais leve.',
];

// Hash determinista simples (djb2 light). Entrada: string composta de
// chave do periodo + ano + semana ISO. Saida: indice estavel dentro
// do pool, independente de plataforma.
function hashStringParaIndice(seed: string, tamanho: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  // Math.abs porque o overflow de int32 pode retornar negativo.
  return Math.abs(h) % tamanho;
}

export interface SeedFrase {
  periodo: string;
  ano: number;
  semana: number;
}

// Escolhe uma frase do pool de forma deterministica. Mesma seed
// (periodo + ano + semana) sempre retorna a mesma frase, em qualquer
// render, em qualquer device.
export function escolherFrase(seed: SeedFrase): string {
  const chave = `${seed.periodo}|${seed.ano}|${seed.semana}`;
  const indice = hashStringParaIndice(chave, FRASES_RECAP_VAZIO.length);
  return FRASES_RECAP_VAZIO[indice];
}

// Helper: converte um range (de/ate) numa SeedFrase canonica baseada
// no inicio do range. Util para o RecapScreen que ja tem o range
// resolvido em mao. Calcula numero da semana ISO 8601.
export function seedDeRange(periodoChave: string, inicio: Date): SeedFrase {
  const ano = inicio.getFullYear();
  const semana = numeroSemanaIso(inicio);
  return { periodo: periodoChave, ano, semana };
}

// Numero da semana ISO 8601 (1-53). Algoritmo padrao: tira o dia da
// semana (segunda=1, domingo=7), pula para quinta-feira da semana
// corrente, depois divide pela primeira quinta-feira do ano.
function numeroSemanaIso(data: Date): number {
  const d = new Date(
    Date.UTC(data.getFullYear(), data.getMonth(), data.getDate())
  );
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = (d.getTime() - inicioAno.getTime()) / 86400000;
  return Math.ceil((diff + 1) / 7);
}
