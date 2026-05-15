// Testes da logica pura de useProximos (M40). Cobre:
//  - Alarme inativo nao entra.
//  - Alarme diario com horario futuro hoje entra.
//  - Alarme fora da janela 4h nao entra.
//  - Alarme semanal pega o dia da semana correto.
//  - Tarefa com alarme hoje entra; tarefa de outro dia nao.
//  - Ordenacao cronologica.
import { construirProximos, __test__ } from '@/lib/hooks/useProximos';
import type { Alarme } from '@/lib/schemas/alarme';
import type { Tarefa } from '@/lib/schemas/tarefa';

const { proximoDisparo } = __test__;

function alarmeBase(over: Partial<Alarme> = {}): Alarme {
  return {
    tipo: 'alarme',
    slug: 'medicacao-manha',
    titulo: 'Medicação manhã',
    horario: '09:00',
    dias_semana: [1, 2, 3, 4, 5],
    recorrencia: 'semanal',
    tag: 'medicacao',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 5,
    criado_em: '2026-05-01T08:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
    ...over,
  } as Alarme;
}

function tarefaBase(over: Partial<Tarefa> = {}): Tarefa {
  return {
    tipo: 'tarefa',
    data: '2026-05-04',
    autor: 'pessoa_a',
    titulo: 'Comprar pão',
    feito: false,
    feito_em: null,
    categoria: 'casa',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    ...over,
  } as Tarefa;
}

test('proximoDisparo: alarme inativo devolve null', () => {
  const alarme = alarmeBase({ ativo: false });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  expect(proximoDisparo(alarme, agora)).toBeNull();
});

test('proximoDisparo: alarme diario futuro hoje entra', () => {
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '10:00',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const iso = proximoDisparo(alarme, agora);
  expect(iso).not.toBeNull();
  expect(iso!.includes('10:00')).toBe(true);
});

test('proximoDisparo: alarme diario passado vai para amanha', () => {
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '06:00',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const iso = proximoDisparo(alarme, agora);
  expect(iso).not.toBeNull();
  // ISO deve ser de 05/05 ou 06/05 dependendo do fuso de execucao,
  // mas garantidamente >= agora.
  expect(new Date(iso!).getTime()).toBeGreaterThanOrEqual(agora.getTime());
});

test('proximoDisparo: alarme semanal pega proximo dia listado', () => {
  // Domingo 2026-05-03; segunda 04. Lista [3=quarta]; pula 3 dias.
  const alarme = alarmeBase({
    recorrencia: 'semanal',
    dias_semana: [3],
    horario: '09:00',
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const iso = proximoDisparo(alarme, agora);
  expect(iso).not.toBeNull();
  // Quarta 06/05/2026.
  expect(iso!.startsWith('2026-05-06')).toBe(true);
});

test('construirProximos: filtra alarme fora da janela 4h', () => {
  // Alarme as 18h, agora 08h => fora dos 4h.
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '18:00',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos([alarme], [], agora);
  expect(itens).toEqual([]);
});

test('construirProximos: alarme dentro da janela aparece', () => {
  // Alarme as 09:30, agora 08:00 => dentro de 4h.
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '09:30',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos([alarme], [], agora);
  expect(itens.length).toBe(1);
  expect(itens[0].tipo).toBe('alarme');
  expect(itens[0].titulo).toBe('Medicação manhã');
  expect(itens[0].hora).toBe('09:30');
});

test('construirProximos: tarefa com alarme hoje entra; tarefa de outro dia nao', () => {
  const t1 = tarefaBase({
    titulo: 'Tarefa hoje',
    alarme: {
      ativo: true,
      data_hora_iso: '2026-05-04T15:00:00-03:00',
      recorrencia: 'unica',
    },
  });
  const t2 = tarefaBase({
    titulo: 'Tarefa amanha',
    alarme: {
      ativo: true,
      data_hora_iso: '2026-05-05T15:00:00-03:00',
      recorrencia: 'unica',
    },
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos(
    [],
    [
      { meta: t1, rel: 'tarefas/2026-05-04-tarefa-hoje.md' },
      { meta: t2, rel: 'tarefas/2026-05-04-tarefa-amanha.md' },
    ],
    agora
  );
  expect(itens.length).toBe(1);
  expect(itens[0].titulo).toBe('Tarefa hoje');
  expect(itens[0].tipo).toBe('tarefa');
  expect(itens[0].hora).toBe('15:00');
});

test('construirProximos: ordenacao cronologica asc', () => {
  const a1 = alarmeBase({
    slug: 'a-tarde',
    titulo: 'Tarde',
    recorrencia: 'diaria',
    horario: '11:00',
    dias_semana: [],
  });
  const a2 = alarmeBase({
    slug: 'a-manha',
    titulo: 'Manhã cedo',
    recorrencia: 'diaria',
    horario: '09:30',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos([a1, a2], [], agora);
  expect(itens.map((i) => i.titulo)).toEqual(['Manhã cedo', 'Tarde']);
});
