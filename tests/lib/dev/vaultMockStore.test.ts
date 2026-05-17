// V4.0 (INFRA-VAULT-WEB-MOCK) unit: store useVaultMock garante
// write+read, overwrite, listagem ordenada e exposicao via gauntlet API.
//
// R-INFRA-GAUNTLET-AGENDA-MOCK (2026-05-17): cobertura adicional do
// setEventos -- escreve cada AgendaEvento como .md em path canonico
// agenda-<pessoa>-YYYY-MM-DD-<id>.md, idempotente.
//
// Comentarios sem acento (convencao shell/CI).
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { gauntlet } from '@/lib/dev/gauntlet';
import type { AgendaEvento } from '@/lib/vault/agenda';

describe('useVaultMock (V4.0 INFRA-VAULT-WEB-MOCK)', () => {
  beforeEach(() => {
    useVaultMock.getState().limpar();
  });

  it('write + read: setArquivo persiste e getArquivo recupera', () => {
    const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
    const conteudo = '---\ndeviceId: abc\n---\nbody';
    useVaultMock.getState().setArquivo(uri, conteudo);
    expect(useVaultMock.getState().getArquivo(uri)).toBe(conteudo);
  });

  it('overwrite: chamadas repetidas com mesma uri substituem conteudo', () => {
    const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
    useVaultMock.getState().setArquivo(uri, 'v1');
    useVaultMock.getState().setArquivo(uri, 'v2');
    expect(useVaultMock.getState().getArquivo(uri)).toBe('v2');
    // Nao deve criar duas entradas.
    expect(useVaultMock.getState().listar().length).toBe(1);
  });

  it('listar retorna uris ordenadas alfabeticamente', () => {
    useVaultMock.getState().setArquivo('z/c.md', 'c');
    useVaultMock.getState().setArquivo('a/b.md', 'b');
    useVaultMock.getState().setArquivo('a/a.md', 'a');
    expect(useVaultMock.getState().listar()).toEqual([
      'a/a.md',
      'a/b.md',
      'z/c.md',
    ]);
  });

  it('gauntlet.lerVaultMock e listarVaultMock expoem o store', () => {
    const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
    useVaultMock.getState().setArquivo(uri, 'conteudo-teste');
    // Em jest, GAUNTLET_ATIVO=false (Platform.OS=ios default), entao
    // os helpers retornam fallback. Testamos isso em vez do branch web.
    // Para validar conteudo real do branch, usar testes de
    // reader/writer com Platform.OS mockado para 'web'.
    expect(gauntlet.lerVaultMock(uri)).toBeNull();
    expect(gauntlet.listarVaultMock()).toEqual([]);
  });
});

describe('useVaultMock.setEventos (R-INFRA-GAUNTLET-AGENDA-MOCK)', () => {
  beforeEach(() => {
    useVaultMock.getState().limpar();
  });

  const VAULT = 'web://mock-vault/Ouroboros';

  function evt(over: Partial<AgendaEvento> = {}): AgendaEvento {
    return {
      id: 'ev-1',
      pessoa: 'pessoa_a',
      titulo: 'Reuniao',
      inicio: '2026-05-17T09:00:00-03:00',
      fim: '2026-05-17T10:00:00-03:00',
      fonte: 'google_calendar',
      sincronizado_em: '2026-05-17T07:00:00-03:00',
      ...over,
    };
  }

  it('grava .md em path canonico agenda-<pessoa>-<ymd>-<id>.md', () => {
    useVaultMock.getState().setEventos(VAULT, 'pessoa_a', [evt()]);
    const uri = `${VAULT}/markdown/agenda-pessoa_a-2026-05-17-ev-1.md`;
    const raw = useVaultMock.getState().getArquivo(uri);
    expect(raw).toBeDefined();
    expect(raw).toContain('id: ev-1');
    expect(raw).toContain('pessoa: pessoa_a');
    expect(raw).toContain('titulo: Reuniao');
    expect(raw).toContain('fonte: google_calendar');
  });

  it('grava 2 eventos em arquivos separados', () => {
    useVaultMock.getState().setEventos(VAULT, 'pessoa_a', [
      evt({ id: 'ev-a' }),
      evt({ id: 'ev-b', inicio: '2026-05-17T15:00:00-03:00' }),
    ]);
    const uris = useVaultMock.getState().listarPasta(`${VAULT}/markdown/`, '.md');
    expect(uris.length).toBe(2);
    expect(uris).toContain(
      `${VAULT}/markdown/agenda-pessoa_a-2026-05-17-ev-a.md`
    );
    expect(uris).toContain(
      `${VAULT}/markdown/agenda-pessoa_a-2026-05-17-ev-b.md`
    );
  });

  it('idempotente: regravar mesmo id+inicio sobrescreve sem duplicar', () => {
    useVaultMock
      .getState()
      .setEventos(VAULT, 'pessoa_a', [evt({ titulo: 'Original' })]);
    useVaultMock
      .getState()
      .setEventos(VAULT, 'pessoa_a', [evt({ titulo: 'Atualizado' })]);
    const uris = useVaultMock.getState().listarPasta(`${VAULT}/markdown/`, '.md');
    expect(uris.length).toBe(1);
    const raw = useVaultMock.getState().getArquivo(uris[0]);
    expect(raw).toContain('titulo: Atualizado');
    expect(raw).not.toContain('titulo: Original');
  });

  it('lista vazia nao escreve nada', () => {
    useVaultMock.getState().setEventos(VAULT, 'pessoa_a', []);
    expect(useVaultMock.getState().listar().length).toBe(0);
  });

  it('separa eventos por pessoa em paths distintos', () => {
    useVaultMock.getState().setEventos(VAULT, 'pessoa_a', [
      evt({ id: 'ev-1', pessoa: 'pessoa_a' }),
    ]);
    useVaultMock.getState().setEventos(VAULT, 'pessoa_b', [
      evt({ id: 'ev-1', pessoa: 'pessoa_b' }),
    ]);
    const uris = useVaultMock.getState().listar();
    expect(uris).toContain(
      `${VAULT}/markdown/agenda-pessoa_a-2026-05-17-ev-1.md`
    );
    expect(uris).toContain(
      `${VAULT}/markdown/agenda-pessoa_b-2026-05-17-ev-1.md`
    );
  });

  it('sanitiza id com caracteres proibidos', () => {
    useVaultMock.getState().setEventos(VAULT, 'pessoa_a', [
      evt({ id: 'ev:com/slash.dot' }),
    ]);
    const uris = useVaultMock.getState().listar();
    // sanitizarEventoId substitui : / . por _. Verifica somente
    // o basename do path (URI base contem :// e markdown/).
    const basename = uris[0].split('/').pop() ?? '';
    expect(basename).toContain('ev_com_slash_dot');
    expect(basename).not.toContain(':');
    expect(basename).not.toContain('/');
    expect(basename).not.toMatch(/\.[a-z]+\./); // .dot. virou _dot.
  });
});

describe('gauntlet.setEventosAgendaMock (R-INFRA-GAUNTLET-AGENDA-MOCK)', () => {
  beforeEach(() => {
    useVaultMock.getState().limpar();
  });

  it('expoe setEventosAgendaMock como funcao', () => {
    expect(typeof gauntlet.setEventosAgendaMock).toBe('function');
  });

  it('e no-op em mobile (GAUNTLET_ATIVO=false em Jest), retorna 0', () => {
    const r = gauntlet.setEventosAgendaMock('pessoa_a', [
      {
        id: 'ev-1',
        pessoa: 'pessoa_a',
        titulo: 'Teste',
        inicio: '2026-05-17T09:00:00-03:00',
        fim: '2026-05-17T10:00:00-03:00',
        fonte: 'google_calendar',
        sincronizado_em: '2026-05-17T07:00:00-03:00',
      },
    ]);
    expect(r).toBe(0);
    // Nada foi gravado.
    expect(useVaultMock.getState().listar().length).toBe(0);
  });

  it('expoe setArquivoMock como funcao no-op em mobile', () => {
    expect(typeof gauntlet.setArquivoMock).toBe('function');
    gauntlet.setArquivoMock('web://mock/x.md', 'qualquer');
    // Guard impede gravacao em Jest.
    expect(useVaultMock.getState().listar().length).toBe(0);
  });
});
