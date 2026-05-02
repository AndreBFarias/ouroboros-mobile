// Tipos canonicos do calendario de conquistas (M11.5). Une eventos
// modo positivo e diario emocional modo vitoria em um shape comum
// para o timeline horizontal. Cada conquista carrega a midia
// principal (primeiro item de meta.midia) ja extraida em campo
// dedicado para o cover; o array completo fica em meta para o
// detalhe poder iterar.
//
// Origem e uniao discriminada para permitir navegacao tipada para a
// tela de detalhe correta no futuro (atualmente as duas usam o
// mesmo componente <DetalheConquista>).
import type { EventoMeta } from '@/lib/schemas/evento';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { Midia } from '@/lib/schemas/midia';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export type ConquistaOrigem = 'evento_positivo' | 'diario_vitoria';

export type MidiaCoverTipo = 'foto' | 'youtube' | 'spotify' | 'audio';

// Conquista unificada para a UI. Campos comuns saem para o topo;
// meta original fica acessivel para o detalhe.
export interface Conquista {
  // Id estavel: timestamp ISO da data + origem (garante unicidade
  // mesmo quando dois registros caem no mesmo segundo).
  id: string;
  origem: ConquistaOrigem;
  data: string;
  autor: PessoaAutor;
  // Frase principal. Em eventos: categoria ou bairro. Em diario:
  // primeira frase de meta.texto truncada em 120 chars.
  frase: string;
  // Local livre (bairro do evento ou lugar do diario, se houver).
  lugar: string | null;
  // Intensidade 1-5 (campo comum de ambos os schemas).
  intensidade: number;
  // Bairro especifico para o filtro. Eventos tem campo dedicado;
  // diario emocional nao tem bairro estruturado, fica null.
  bairro: string | null;
  // Midia principal (primeira do array). Sempre presente porque o
  // loader filtra midia.length > 0.
  midiaPrincipal: Midia;
  // Tipo da midia principal (atalho para o cover).
  tipoCover: MidiaCoverTipo;
  // Lista completa para a tela de detalhe.
  midias: Midia[];
  // Meta original tipada conforme a origem.
  meta: EventoMeta | DiarioEmocionalMeta;
}

// Resultado bruto do loader antes de aplicar filtros do estado.
export interface ConquistasLoadResult {
  conquistas: Conquista[];
  // Numero de arquivos lidos por origem (telemetria interna; util
  // para diagnosticar empty state inesperado).
  totaisPorOrigem: {
    evento_positivo: number;
    diario_vitoria: number;
  };
}
