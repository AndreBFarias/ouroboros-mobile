// Helper puro de mesclagem de fontes "proximos" da Tela Hoje (R-HOME-2).
//
// Combina tres fontes ja persistidas no Vault em uma timeline unica
// ordenada cronologicamente:
//   1. Agenda Google (M37.1.2 - listarEventosAgenda)
//      Eventos das proximas horas (mesma janela 4h dos alarmes).
//   2. Alarmes pessoais (M16/M30 - listarAlarmes)
//      Proximo disparo nas proximas 4h.
//   3. Tarefas com alarme vinculado hoje (M17/M31 - listarTarefas)
//      Disparo cai no dia local atual.
//
// Sem julgamento, sem priorizacao. Apenas "o que esta vindo nas
// proximas horas" (ADR-0005). Limite hard de 3 itens (R-HOME-1
// estabeleceu esse contrato visual).
//
// Funcao pura: nao toca Vault, nao toca rede. Recebe listas ja lidas
// e timestamp de referencia, devolve ItemProximo[] ordenado. Testavel
// sem mock.
//
// Comentarios sem acento (convencao shell/CI).
import type { AgendaEvento } from '@/lib/vault/agenda';
import type { ItemProximo, ProximoTipo } from '@/lib/hooks/useProximos';

// Re-export para callers do helper. Type imports nao alteram bundle.
export type { ItemProximo, ProximoTipo };

// Mesma janela do useProximos (4h). Mantida em constante para que o
// helper seja autossuficiente e testavel sem precisar reabrir o
// hook.
export const JANELA_PROXIMOS_MS = 4 * 60 * 60 * 1000;

// Limite hard de itens exibidos. Decisao de R-HOME-1, reafirmada
// em R-HOME-2 (timeline curta na Home).
export const LIMITE_PROXIMOS = 3;

// Hora HH:MM extraida de ISO datetime local (assumimos offset BRT
// embutido). Para exibicao apenas. Funcao identica a horaDeIso do
// useProximos; duplicada aqui para autossuficiencia do helper.
function horaDeIso(iso: string): string {
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '--:--';
}

// Converte AgendaEvento (frontmatter canonico do .md) em ItemProximo.
// Apenas eventos cujo `inicio` cai dentro da janela [agora, agora+4h]
// entram. Eventos passados sao filtrados; eventos no futuro alem da
// janela tambem (mantem coerencia com alarmes/tarefas: a Tela Hoje
// foca em curto prazo, nao em agenda geral).
function eventoParaItem(
  ev: AgendaEvento,
  agora: Date,
  limiteSuperior: Date
): ItemProximo | null {
  const inicio = new Date(ev.inicio);
  if (Number.isNaN(inicio.getTime())) return null;
  if (inicio < agora) return null;
  if (inicio > limiteSuperior) return null;
  return {
    tipo: 'evento',
    // Para eventos, o id estavel e o eventId do Google (ev.id) -
    // garante key unica no .map() da UI mesmo se mesma hora cruzar
    // com alarme/tarefa.
    id: ev.id,
    titulo: ev.titulo,
    hora: horaDeIso(ev.inicio),
    iso: ev.inicio,
  };
}

// Entrada do helper. Cada lista de eventos vem ja por pessoa
// (caller passa concatenacao quando necessario - duo). Alarmes e
// itensJa (alarme/tarefa ja construidos via useProximos.construirProximos)
// passam direto - reaproveitamos a logica de proximo disparo do hook
// para nao duplicar.
export interface MesclarEntrada {
  eventos: AgendaEvento[];
  itensAlarmesETarefas: ItemProximo[];
  agora: Date;
}

// Saida: lista ordenada cronologicamente, com itens de tres tipos.
// Limite hard de 3 itens (LIMITE_PROXIMOS). Empty array quando nada
// no horizonte.
export function mesclarAgendaAlarmes(entrada: MesclarEntrada): ItemProximo[] {
  const { eventos, itensAlarmesETarefas, agora } = entrada;
  const limiteSuperior = new Date(agora.getTime() + JANELA_PROXIMOS_MS);

  const itensEventos: ItemProximo[] = [];
  for (const ev of eventos) {
    const item = eventoParaItem(ev, agora, limiteSuperior);
    if (item) itensEventos.push(item);
  }

  const todos = [...itensEventos, ...itensAlarmesETarefas];

  todos.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));

  return todos.slice(0, LIMITE_PROXIMOS);
}

// Exporto helpers internos para testes unitarios.
export const __test__ = { horaDeIso, eventoParaItem };
