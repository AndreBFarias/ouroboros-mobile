// Testes da integracao concreta do Google Calendar.
// R-INT-2-CALENDAR-SYNC-EVENTOS (2026-05-25).
//
// REUSO: a integracao nao recria schema/writer/cliente — ela orquestra
// deps injetadas (refreshToken, listar, sincronizarSnapshot). Os testes
// injetam fakes para validar:
//
//   1. Token null (conta nao conectada) -> no-op gracioso, novos 0, sem
//      erro, NAO chama listar nem sincronizarSnapshot.
//   2. vaultRoot null/'' -> no-op gracioso, NAO chama refreshToken.
//   3. Token OK -> mapeia EventoCalendar para AgendaEvento (pessoa +
//      fonte literal + sincronizado_em) e passa a sincronizarSnapshot.
//   4. Sincroniza AMBAS as pessoas (pessoa_a e pessoa_b).
//   5. Excecao em uma pessoa nao derruba a outra; erro agregado.
//   6. local opcional preservado; ausente nao quebra.
//
// Comentarios sem acento (convencao shell/CI).

import { criarIntegracaoCalendar } from '@/lib/integracoes/calendarSync';
import type { EventoCalendar } from '@/lib/services/calendarApi';
import type { AgendaEvento } from '@/lib/vault/agenda';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

function evento(id: string, local?: string): EventoCalendar {
  const e: EventoCalendar = {
    id,
    titulo: `Evento ${id}`,
    inicio: '2026-06-01T10:00:00.000Z',
    fim: '2026-06-01T11:00:00.000Z',
  };
  if (typeof local === 'string') e.local = local;
  return e;
}

describe('criarIntegracaoCalendar', () => {
  it('token null: no-op gracioso, nao chama listar nem snapshot', async () => {
    const listar = jest.fn(async () => [evento('a')]);
    const sincronizarSnapshot = jest.fn(async () => ({
      adicionados: 0,
      atualizados: 0,
      removidos: 0,
    }));
    const integracao = criarIntegracaoCalendar({
      refreshToken: async () => null,
      listar,
      sincronizarSnapshot,
      vaultRoot: 'file:///vault',
    });

    const res = await integracao.sincronizar();

    expect(res).toEqual({ novos: 0, erro: null });
    expect(listar).not.toHaveBeenCalled();
    expect(sincronizarSnapshot).not.toHaveBeenCalled();
  });

  it('vaultRoot vazio: no-op gracioso, nao chama refreshToken', async () => {
    const refreshToken = jest.fn(async () => 'tok');
    const integracao = criarIntegracaoCalendar({
      refreshToken,
      listar: async () => [evento('a')],
      sincronizarSnapshot: async () => ({
        adicionados: 1,
        atualizados: 0,
        removidos: 0,
      }),
      vaultRoot: '',
    });

    const res = await integracao.sincronizar();

    expect(res).toEqual({ novos: 0, erro: null });
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('token OK: mapeia EventoCalendar para AgendaEvento e persiste', async () => {
    const capturado: AgendaEvento[] = [];
    const integracao = criarIntegracaoCalendar({
      refreshToken: async () => 'tok',
      listar: async (_t, _de, _ate, pessoa) =>
        pessoa === 'pessoa_a' ? [evento('e1', 'São Paulo')] : [],
      sincronizarSnapshot: async (_root, _pessoa, eventos) => {
        capturado.push(...eventos);
        return { adicionados: eventos.length, atualizados: 0, removidos: 0 };
      },
      vaultRoot: 'file:///vault',
      agora: () => new Date('2026-05-25T12:00:00.000Z'),
    });

    const res = await integracao.sincronizar();

    expect(res.erro).toBeNull();
    expect(res.novos).toBe(1);
    const ev = capturado.find((e) => e.id === 'e1');
    expect(ev).toBeDefined();
    expect(ev?.pessoa).toBe('pessoa_a');
    expect(ev?.fonte).toBe('google_calendar');
    expect(ev?.sincronizado_em).toBe('2026-05-25T12:00:00.000Z');
    expect(ev?.local).toBe('São Paulo');
  });

  it('sincroniza ambas as pessoas', async () => {
    const pessoasVistas: PessoaAutor[] = [];
    const integracao = criarIntegracaoCalendar({
      refreshToken: async () => 'tok',
      listar: async (_t, _de, _ate, pessoa) => {
        pessoasVistas.push(pessoa);
        return [evento(`${pessoa}-1`)];
      },
      sincronizarSnapshot: async (_root, _pessoa, eventos) => ({
        adicionados: eventos.length,
        atualizados: 0,
        removidos: 0,
      }),
      vaultRoot: 'file:///vault',
    });

    const res = await integracao.sincronizar();

    expect(pessoasVistas.sort()).toEqual(['pessoa_a', 'pessoa_b']);
    expect(res.novos).toBe(2);
    expect(res.erro).toBeNull();
  });

  it('excecao em uma pessoa nao derruba a outra; erro agregado', async () => {
    const integracao = criarIntegracaoCalendar({
      refreshToken: async () => 'tok',
      listar: async (_t, _de, _ate, pessoa) => {
        if (pessoa === 'pessoa_a') throw new Error('quota');
        return [evento('b1')];
      },
      sincronizarSnapshot: async (_root, _pessoa, eventos) => ({
        adicionados: eventos.length,
        atualizados: 0,
        removidos: 0,
      }),
      vaultRoot: 'file:///vault',
    });

    const res = await integracao.sincronizar();

    // pessoa_b completou (1 novo); pessoa_a falhou (erro agregado).
    expect(res.novos).toBe(1);
    expect(res.erro).toContain('quota');
  });

  it('evento sem local: nao inclui campo local no AgendaEvento', async () => {
    const capturado: AgendaEvento[] = [];
    const integracao = criarIntegracaoCalendar({
      refreshToken: async () => 'tok',
      listar: async (_t, _de, _ate, pessoa) =>
        pessoa === 'pessoa_a' ? [evento('semlocal')] : [],
      sincronizarSnapshot: async (_root, _pessoa, eventos) => {
        capturado.push(...eventos);
        return { adicionados: eventos.length, atualizados: 0, removidos: 0 };
      },
      vaultRoot: 'file:///vault',
    });

    await integracao.sincronizar();

    const ev = capturado.find((e) => e.id === 'semlocal');
    expect(ev).toBeDefined();
    expect(ev?.local).toBeUndefined();
  });
});
