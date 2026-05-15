// Testes do hook auxiliar de SecaoStatusCasal (M40). Foca a logica
// pura calcularStatus / maisRecente — render visual e validado via
// E2E (Gauntlet). Aqui garantimos:
//  - Status com humor + diario + evento devolve a maior data.
//  - Pessoa sem registros devolve { humor: null, ultima: null }.
//  - Humor de outra pessoa nao vaza para o cartao errado.
import { __test__ } from '@/lib/hooks/useStatusCasal';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';

const { calcularStatus, maisRecente } = __test__;

function humorFake(autor: 'pessoa_a' | 'pessoa_b', iso: string): HumorMeta {
  return {
    tipo: 'humor',
    data: iso,
    autor,
    humor: 4,
    energia: 3,
    ansiedade: 2,
    foco: 4,
    frase: '',
    tags: [],
  };
}

function diarioFake(
  autor: 'pessoa_a' | 'pessoa_b',
  iso: string
): DiarioEmocionalMeta {
  // Cast amplo: o teste so consome `autor` e `data` do meta (campos
  // que calcularStatus usa). Evita carregar o schema completo no fake.
  return {
    tipo: 'diario_emocional',
    data: iso,
    autor,
    modo: 'vitoria',
    texto: 'teste',
    midia: [],
    para: { tipo: 'mim' },
    emocoes: [],
    intensidade: 3,
    com: [],
    contexto_social: [],
  } as unknown as DiarioEmocionalMeta;
}

function eventoFake(autor: 'pessoa_a' | 'pessoa_b', iso: string): EventoMeta {
  return {
    tipo: 'evento',
    data: iso,
    autor,
    modo: 'positivo',
    midia: [],
    para: { tipo: 'mim' },
    com: [],
    intensidade: 3,
    fotos: [],
  } as unknown as EventoMeta;
}

test('maisRecente: null + um item devolve o item', () => {
  const item = { tipo: 'humor' as const, iso: '2026-05-04T10:00:00-03:00' };
  expect(maisRecente(null, item)).toBe(item);
});

test('maisRecente: dois items devolve o de iso maior', () => {
  const antigo = { tipo: 'diario' as const, iso: '2026-05-04T08:00:00-03:00' };
  const novo = { tipo: 'evento' as const, iso: '2026-05-04T14:00:00-03:00' };
  expect(maisRecente(antigo, novo)).toBe(novo);
});

test('calcularStatus: pessoa sem registros devolve null/null', () => {
  const status = calcularStatus('pessoa_b', null, [], []);
  expect(status.humor).toBeNull();
  expect(status.ultima).toBeNull();
  expect(status.pessoa).toBe('pessoa_b');
});

test('calcularStatus: humor de outra pessoa nao entra', () => {
  const humor = humorFake('pessoa_a', '2026-05-04T07:00:00-03:00');
  const status = calcularStatus('pessoa_b', humor, [], []);
  expect(status.humor).toBeNull();
  expect(status.ultima).toBeNull();
});

test('calcularStatus: agrega humor + diario + evento, devolve mais recente', () => {
  const humor = humorFake('pessoa_a', '2026-05-04T07:00:00-03:00');
  const diario = diarioFake('pessoa_a', '2026-05-04T12:00:00-03:00');
  const evento = eventoFake('pessoa_a', '2026-05-04T18:30:00-03:00');
  const status = calcularStatus('pessoa_a', humor, [diario], [evento]);
  expect(status.humor).toEqual(humor);
  expect(status.ultima).toEqual({
    tipo: 'evento',
    iso: '2026-05-04T18:30:00-03:00',
  });
});

test('calcularStatus: filtra por autor — diario de outra pessoa ignorado', () => {
  const humor = humorFake('pessoa_a', '2026-05-04T07:00:00-03:00');
  const diarioOutra = diarioFake('pessoa_b', '2026-05-04T20:00:00-03:00');
  const status = calcularStatus('pessoa_a', humor, [diarioOutra], []);
  expect(status.ultima).toEqual({
    tipo: 'humor',
    iso: '2026-05-04T07:00:00-03:00',
  });
});
