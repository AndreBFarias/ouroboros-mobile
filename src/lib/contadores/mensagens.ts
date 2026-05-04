// M32: mensagens de apoio sobrias para contador "Dias sem X" e
// indicador discreto de marcos. Funcoes puras, derivacao client-side
// -- nada persiste no schema (ADR-0005: zero gamificacao).
//
// Tom: sobrio, sem exclamacao, sem emoji, sem julgamento.
//
// Comentarios sem acento (convencao shell/CI).

export function mensagemApoio(dias: number): string {
  if (dias < 0) return mensagemApoio(0);
  if (dias === 0) return 'Hoje começa de novo. Sem julgamento.';
  if (dias < 5) return 'Os primeiros dias pesam mais. Você está aqui.';
  if (dias < 30) return 'Cada dia conta. Continue um de cada vez.';
  if (dias < 100) return `${dias} dias. Já está virando hábito.`;
  if (dias < 365) return `${dias} dias. Mais do que três meses.`;
  return `${dias} dias. Um ano e contando.`;
}

export const MARCOS_DIAS = [5, 30, 100, 365] as const;

export type MarcoDias = (typeof MARCOS_DIAS)[number];

export function marcoAtingido(dias: number): MarcoDias | null {
  if (dias < 0) return null;
  let ultimo: MarcoDias | null = null;
  for (const m of MARCOS_DIAS) {
    if (dias >= m) ultimo = m;
  }
  return ultimo;
}
