// Fixture da AUDIT-P2-11. Vive fora do arquivo de teste porque o
// factory do jest.mock nao pode referenciar variavel declarada no
// escopo do modulo de teste, e o mock do loader precisa devolver
// estas conquistas.
//
// Duas conquistas no MESMO dia, divergindo em tipoCover, bairro e
// intensidade -- é o que permite provar que cada filtro religado
// muda a lista do dia.
//
// Comentarios sem acento (convencao shell/CI).
import type { Conquista } from '@/lib/conquistas/types';

export const DIA_FIXTURE = '2026-08-12';

export const CONQUISTAS_FIX: Conquista[] = [
  {
    id: 'c-foto',
    origem: 'evento_positivo',
    data: `${DIA_FIXTURE}T15:00:00.000Z`,
    autor: 'pessoa_a',
    frase: 'Passeio no parque',
    lugar: 'Centro',
    intensidade: 5,
    bairro: 'Centro',
    midiaPrincipal: { tipo: 'foto', path: 'fotos/a.jpg' },
    tipoCover: 'foto',
    midias: [{ tipo: 'foto', path: 'fotos/a.jpg' }],
    meta: {} as Conquista['meta'],
  },
  {
    id: 'c-spotify',
    origem: 'evento_positivo',
    data: `${DIA_FIXTURE}T18:00:00.000Z`,
    autor: 'pessoa_a',
    frase: 'Musica boa',
    lugar: 'Asa Sul',
    intensidade: 2,
    bairro: 'Asa Sul',
    midiaPrincipal: { tipo: 'spotify', track_id: 'mock-track' },
    tipoCover: 'spotify',
    midias: [{ tipo: 'spotify', track_id: 'mock-track' }],
    meta: {} as Conquista['meta'],
  },
];
