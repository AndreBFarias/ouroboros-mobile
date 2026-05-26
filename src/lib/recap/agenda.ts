// R-INT-2-CALENDAR-RECAP-CARD (2026-05-25) -- Agregador de agenda para
// o Recap. Consolida os eventos do Google Calendar (cache local .md no
// Vault, abastecido pelo OAuth sync de app/agenda.tsx) que caem dentro
// da janela do periodo num resumo unico consumido pelo RecapSecaoAgenda.
//
// Espelha o padrao de calcularSaudeRecap: mesma assinatura
// (vaultRoot, periodo, ate), mesma janela via resolverPeriodo, retorno
// null-quando-vazio (aqui o retorno inteiro e null se nao ha evento no
// periodo, permitindo ao container e ao componente ocultar a secao).
//
// Leitura: listarEventosAgenda(vaultRoot, pessoa) le N .md por pessoa.
// O schema AgendaEvento NAO tem campo `organizador` (so id/pessoa/
// titulo/inicio/fim/local/fonte/sincronizado_em), entao o resumo e por
// CONTAGEM DE DIAS com evento no periodo -- nao por organizador. Cobre
// ambas as pessoas (pessoa_a + pessoa_b), igual useProximos, para que
// duo veja a agenda do casal; em sozinho pessoa_b retorna [].
//
// Janela: como o evento tem `inicio` em ISO completo, comparamos o dia
// (primeiros 10 chars YYYY-MM-DD) com a janela em chaves de dia local
// de Sao Paulo (UTC-3 fixo), identico ao que calcularSaudeRecap faz
// para alinhar com a forma como os writers gravam a data.
//
// Comentarios sem acento (convencao shell/CI).
import { listarEventosAgenda } from '@/lib/vault/agenda';
import { resolverPeriodo, type PeriodoChave } from '@/lib/hooks/useRecap';

export interface AgendaRecap {
  // Total de eventos no periodo (somando pessoa_a + pessoa_b).
  totalEventos: number;
  // Quantos dias distintos do periodo tiveram ao menos um evento.
  diasComEvento: number;
  // Titulo do proximo evento a partir de `ate` (o primeiro evento cujo
  // inicio e >= ate, em ordem cronologica). Null quando todos os eventos
  // do periodo ja passaram em relacao a `ate`.
  proximoTitulo: string | null;
}

// Converte um instante para chave de dia YYYY-MM-DD no fuso de Sao
// Paulo (UTC-3 fixo), alinhado com a forma como os writers gravam a
// data dos arquivos. Identico ao helper de saude.ts (mantido local
// para nao criar dependencia cruzada entre agregadores).
function diaLocalYmd(d: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Resolve a janela {de, ate} em chaves de dia comparaveis com o dia
// (YYYY-MM-DD) do `inicio` dos eventos. Mesma logica defensiva de
// saude.ts: 'personalizado' sem custom cai em 'semana'.
function janelaDias(
  periodo: PeriodoChave,
  ate: Date
): { deYmd: string; ateYmd: string } {
  const chave: PeriodoChave =
    periodo === 'personalizado' ? 'semana' : periodo;
  const range = resolverPeriodo(chave, ate);
  return {
    deYmd: diaLocalYmd(range.de),
    ateYmd: diaLocalYmd(range.ate),
  };
}

// Consolida a agenda do periodo. Retorna null quando nao ha nenhum
// evento na janela (permite render condicional: secao oculta).
export async function calcularAgendaRecap(
  vaultRoot: string,
  periodo: PeriodoChave,
  ate: Date
): Promise<AgendaRecap | null> {
  const { deYmd, ateYmd } = janelaDias(periodo, ate);
  const dentro = (dataYmd: string): boolean =>
    dataYmd >= deYmd && dataYmd <= ateYmd;

  // Cobre ambas as pessoas. Devices sem OAuth conectado devolvem []
  // (pasta inexistente); .catch defensivo para nao quebrar o Recap por
  // um erro de leitura de uma das pessoas.
  const [eventosA, eventosB] = await Promise.all([
    listarEventosAgenda(vaultRoot, 'pessoa_a').catch(() => []),
    listarEventosAgenda(vaultRoot, 'pessoa_b').catch(() => []),
  ]);
  const eventos = [...eventosA, ...eventosB].filter((e) =>
    dentro(e.inicio.slice(0, 10))
  );

  if (eventos.length === 0) return null;

  // Dias distintos com evento: usa a chave de dia do inicio.
  const dias = new Set(eventos.map((e) => e.inicio.slice(0, 10)));

  // Proximo evento a partir de `ate`: o primeiro (cronologico) cujo
  // inicio ISO e maior ou igual ao instante `ate`. eventos vem de duas
  // listas ja ordenadas por inicio; reordenamos a uniao para garantir.
  const ateIso = ate.toISOString();
  const ordenados = [...eventos].sort((a, b) =>
    a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0
  );
  const proximo = ordenados.find((e) => e.inicio >= ateIso);

  return {
    totalEventos: eventos.length,
    diasComEvento: dias.size,
    proximoTitulo: proximo ? proximo.titulo : null,
  };
}
