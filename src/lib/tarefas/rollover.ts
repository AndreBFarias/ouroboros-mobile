// Selector puro do card "Ainda de ontem" (R-HOME-4b, item 4 do feed da
// spec-mae §2). Sem I/O nem dependencia de Vault: opera sobre a lista
// ja carregada (TarefaListada[]) que o caller obtem via listarTarefas.
// Isso mantem o nucleo testavel sem mock de Vault e desacopla o card do
// formato do registry de feed (R-HOME-4a).
//
// Fronteira Hoje vs Ainda de ontem (decisao travada, spec-mae §12):
//   - To-do hoje  = tarefas pendentes com data === hoje (SecaoTodoHoje).
//   - Ainda de ontem = tarefas pendentes com data < hoje (aqui).
// As duas particoes sao disjuntas: toda tarefa pendente cai em exatamente
// um dos dois cards -> zero duplicacao.
//
// Comparacao de datas e string lexicografica pura sobre YYYY-MM-DD
// (data < hojeYmd), que coincide com a cronologica -- mesmo truque
// documentado em src/lib/vault/tarefas.ts:108-110.
//
// Comentarios sem acento (convencao shell/CI).
import type { TarefaListada } from '@/lib/vault/tarefas';
import { diasEntre } from '@/lib/util/diasEntre';

// Item do rollover: estende TarefaListada com a distancia em dias ate
// hoje e o rotulo PT-BR calmo ("ontem" / "ha N dias").
export interface TarefaRollover extends TarefaListada {
  diasAtras: number;
  rotulo: string;
}

// Rotulo PT-BR calmo para a distancia em dias. N=1 vira "ontem" (mais
// natural na home que "ha 1 dia"); N>=2 vira "ha N dias". Precedente de
// forma: src/lib/backup/executarBackup.ts:162-163. Tom sem cobranca
// (regra de tom / ADR-0005): apenas situa no tempo, nao pressiona.
export function rotularDiasAtras(dias: number): string {
  if (dias <= 1) return 'ontem';
  return `há ${dias} dias`;
}

// Seleciona as tarefas roladas de dias anteriores: pendentes com
// data < hojeYmd. Ordena por data desc (mais recente primeiro, empate
// por rel asc), espelhando a ordenacao de listarTarefas
// (src/lib/vault/tarefas.ts:111-125). Anexa diasAtras + rotulo.
//
// Devolve [] quando nao ha rollover -- o card usa isso para se auto-
// ocultar (return null), coerente com o feed adaptativo (spec-mae §1).
export function selecionarRollover(
  tarefas: TarefaListada[],
  hojeYmd: string
): TarefaRollover[] {
  return tarefas
    .filter((t) => !t.meta.feito && t.meta.data < hojeYmd)
    .sort((a, b) => {
      if (a.meta.data !== b.meta.data) {
        // Data desc: mais recente (maior YMD) primeiro.
        return a.meta.data < b.meta.data ? 1 : -1;
      }
      // Empate: rel asc (determinismo estavel).
      return a.rel < b.rel ? -1 : 1;
    })
    .map((t) => {
      const diasAtras = diasEntre(t.meta.data, hojeYmd);
      return { ...t, diasAtras, rotulo: rotularDiasAtras(diasAtras) };
    });
}
