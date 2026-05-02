// Funcoes puras de filtragem do calendario de conquistas (M11.5).
// Cinco filtros independentes, combinaveis pelo hook (useConquistas):
//   1. pessoa     — pessoa_a / pessoa_b / ambos.
//   2. mes        — 'este_mes' | 'mes_passado' | 'tudo' | { ano, mes }.
//   3. tipo midia — 'tudo' | 'foto' | 'youtube' | 'spotify' | 'audio'.
//   4. intensidade — [min, max] inclusivo (1-5).
//   5. bairro     — match case-insensitive contra meta.bairro (eventos)
//                   ou meta.lugar (diario nao tem bairro estruturado).
//
// Adendo M11.5 A4: 5 filtros entregues (nao 3 como sugeria a Secao 2
// do spec original). Decisao 10 do spec confirmou os 5.
//
// Cada funcao recebe a lista e o filtro; sem efeito colateral.
import type { Conquista, MidiaCoverTipo } from '@/lib/conquistas/types';
import type { PessoaId } from '@/lib/schemas/pessoa';

export type FiltroMes =
  | 'este_mes'
  | 'mes_passado'
  | 'tudo'
  | { ano: number; mes: number };

export type FiltroTipoMidia = 'tudo' | MidiaCoverTipo;

export interface FiltroIntensidade {
  min: number;
  max: number;
}

export interface FiltrosConquistas {
  pessoa: PessoaId;
  mes: FiltroMes;
  tipoMidia: FiltroTipoMidia;
  intensidade: FiltroIntensidade;
  bairro: string;
}

// Defaults canonicos: nada filtrado. Lista mostra tudo.
export const FILTROS_DEFAULT: FiltrosConquistas = {
  pessoa: 'ambos',
  mes: 'tudo',
  tipoMidia: 'tudo',
  intensidade: { min: 1, max: 5 },
  bairro: '',
};

// 1. Filtro por pessoa. 'ambos' devolve a lista intacta.
export function filtrarPorPessoa(
  conquistas: Conquista[],
  pessoa: PessoaId
): Conquista[] {
  if (pessoa === 'ambos') return conquistas;
  return conquistas.filter((c) => c.autor === pessoa);
}

// Helper interno: extrai ano/mes da data ISO. Usa UTC para evitar
// drift de fuso (datas no Vault ja vem com offset embutido).
function anoMesDeIso(iso: string): { ano: number; mes: number } {
  const d = new Date(iso);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

// Calcula ano/mes de referencia para 'este_mes' e 'mes_passado'.
// Recebe `agora` como parametro para testabilidade (default = new Date()).
function refMes(agora: Date): { atual: { ano: number; mes: number }; passado: { ano: number; mes: number } } {
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth() + 1;
  const atual = { ano, mes };
  const passado =
    mes === 1
      ? { ano: ano - 1, mes: 12 }
      : { ano, mes: mes - 1 };
  return { atual, passado };
}

// 2. Filtro por mes. Para testabilidade, aceita `agora` opcional.
export function filtrarPorMes(
  conquistas: Conquista[],
  mes: FiltroMes,
  agora: Date = new Date()
): Conquista[] {
  if (mes === 'tudo') return conquistas;

  if (mes === 'este_mes') {
    const { atual } = refMes(agora);
    return conquistas.filter((c) => {
      const am = anoMesDeIso(c.data);
      return am.ano === atual.ano && am.mes === atual.mes;
    });
  }

  if (mes === 'mes_passado') {
    const { passado } = refMes(agora);
    return conquistas.filter((c) => {
      const am = anoMesDeIso(c.data);
      return am.ano === passado.ano && am.mes === passado.mes;
    });
  }

  // Objeto { ano, mes }: filtro especifico.
  return conquistas.filter((c) => {
    const am = anoMesDeIso(c.data);
    return am.ano === mes.ano && am.mes === mes.mes;
  });
}

// 3. Filtro por tipo de midia.
export function filtrarPorTipoMidia(
  conquistas: Conquista[],
  tipo: FiltroTipoMidia
): Conquista[] {
  if (tipo === 'tudo') return conquistas;
  return conquistas.filter((c) => c.tipoCover === tipo);
}

// 4. Filtro por intensidade (range inclusivo).
export function filtrarPorIntensidade(
  conquistas: Conquista[],
  faixa: FiltroIntensidade
): Conquista[] {
  // Range completo (1-5) nao filtra nada — atalho de performance.
  if (faixa.min <= 1 && faixa.max >= 5) return conquistas;
  return conquistas.filter(
    (c) => c.intensidade >= faixa.min && c.intensidade <= faixa.max
  );
}

// 5. Filtro por bairro (substring case-insensitive). String vazia
// devolve a lista intacta. Para diario emocional (bairro === null)
// tenta casar contra `lugar` antes de descartar.
export function filtrarPorBairro(
  conquistas: Conquista[],
  query: string
): Conquista[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return conquistas;
  return conquistas.filter((c) => {
    const alvos: string[] = [];
    if (c.bairro) alvos.push(c.bairro.toLowerCase());
    if (c.lugar) alvos.push(c.lugar.toLowerCase());
    return alvos.some((a) => a.includes(q));
  });
}

// Aplica todos os filtros em ordem. Hook chama esta funcao para
// reduzir a lista bruta; cada filtro pode ser limpo individualmente
// (resetando para o valor default da chave).
export function aplicarFiltros(
  conquistas: Conquista[],
  filtros: FiltrosConquistas,
  agora: Date = new Date()
): Conquista[] {
  let out = conquistas;
  out = filtrarPorPessoa(out, filtros.pessoa);
  out = filtrarPorMes(out, filtros.mes, agora);
  out = filtrarPorTipoMidia(out, filtros.tipoMidia);
  out = filtrarPorIntensidade(out, filtros.intensidade);
  out = filtrarPorBairro(out, filtros.bairro);
  return out;
}
