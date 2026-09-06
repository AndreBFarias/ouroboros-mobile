// AUDIT-INFRA-VAULT-MOCK-DELETE: reproduz o Gauntlet cego para
// remocao, e prova que deixou de ser.
//
// Ate esta sprint o mock web/dev do Vault cobria leitura (reader.ts) e
// escrita (writer.ts) e NAO cobria exclusao: os modulos chamavam
// StorageAccessFramework.deleteAsync direto, e em web o SAF nao existe
// no DOM. A chamada lancava, o catch do caller engolia, e o .md
// continuava no mapa do useVaultMock para sempre. Nenhum E2E conseguia
// provar que um item sumiu -- e casos foram escritos como se
// conseguissem.
//
// O ramo Platform.OS === 'web' e invisivel para a suite (o preset de
// teste reporta 'ios'), entao o defeito morava exatamente no galho que
// os testes nao visitavam. Aqui forcamos 'web', como
// tests/lib/conquistas/loader-web-mock.test.ts ja fazia para o reader.
//
// Sem o fix (deleteVaultFile + useVaultMock.apagarArquivo), os tres
// primeiros casos ficam vermelhos: o arquivo permanece no store e
// listarRotinas / listarEventosAgenda seguem devolvendo o item apagado.
//
// Comentarios sem acento (convencao shell/CI).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'web' },
}));

import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { deleteVaultFile } from '@/lib/vault/remover';
import {
  escreverRotina,
  listarRotinas,
  removerRotina,
} from '@/lib/vault/rotina';
import {
  apagarEventoAgenda,
  listarEventosAgenda,
  type AgendaEvento,
} from '@/lib/vault/agenda';
import type { RotinaMeta } from '@/lib/schemas/rotina';

const RAIZ = 'web://mock-vault/Ouroboros';

function rotina(over: Partial<RotinaMeta> = {}): RotinaMeta {
  return {
    tipo: 'rotina_treino',
    slug: 'treino-a',
    nome: 'Treino A',
    descricao: null,
    exercicios: [
      {
        nome: 'Agachamento',
        carga_kg: 40,
        series: 3,
        reps: '10',
        descanso_seg: 90,
        observacao: null,
      },
    ],
    data_criacao: '2026-09-05',
    autor: 'pessoa_a',
    categoria: 'outro',
    silenciar_sugestao_ate: null,
    ...over,
  };
}

function evento(over: Partial<AgendaEvento> = {}): AgendaEvento {
  return {
    id: 'ev-1',
    pessoa: 'pessoa_a',
    titulo: 'Reuniao',
    inicio: '2026-09-05T09:00:00-03:00',
    fim: '2026-09-05T10:00:00-03:00',
    fonte: 'google_calendar',
    sincronizado_em: '2026-09-05T07:00:00-03:00',
    ...over,
  };
}

beforeEach(() => {
  useVaultMock.getState().limpar();
});

describe('deleteVaultFile no vault mock web', () => {
  it('remove a uri do store e preserva as demais', async () => {
    const alvo = `${RAIZ}/markdown/rotina-treino-a.md`;
    const vizinho = `${RAIZ}/markdown/rotina-treino-b.md`;
    useVaultMock.getState().setArquivo(alvo, 'conteudo-a');
    useVaultMock.getState().setArquivo(vizinho, 'conteudo-b');

    await deleteVaultFile(alvo);

    expect(useVaultMock.getState().getArquivo(alvo)).toBeUndefined();
    expect(useVaultMock.getState().getArquivo(vizinho)).toBe('conteudo-b');
    expect(useVaultMock.getState().listar()).toEqual([vizinho]);
  });

  it('e idempotente: apagar uri ausente nao lanca', async () => {
    await expect(
      deleteVaultFile(`${RAIZ}/markdown/rotina-inexistente.md`)
    ).resolves.toBeUndefined();
  });
});

describe('removerRotina no Gauntlet (o item precisa sumir da listagem)', () => {
  it('listarRotinas para de devolver a rotina apagada', async () => {
    await escreverRotina(RAIZ, rotina({ slug: 'treino-a', nome: 'Treino A' }));
    await escreverRotina(RAIZ, rotina({ slug: 'treino-b', nome: 'Treino B' }));
    expect((await listarRotinas(RAIZ, 'pessoa_a')).map((r) => r.slug)).toEqual([
      'treino-a',
      'treino-b',
    ]);

    await removerRotina(RAIZ, 'treino-a');

    // O assert que a infra antiga tornava impossivel: sobra so a outra.
    expect((await listarRotinas(RAIZ, 'pessoa_a')).map((r) => r.slug)).toEqual([
      'treino-b',
    ]);
    expect(
      useVaultMock.getState().getArquivo(`${RAIZ}/markdown/rotina-treino-a.md`)
    ).toBeUndefined();
  });
});

describe('apagarEventoAgenda no Gauntlet (o caso da AUDIT-P1-4)', () => {
  it('listarEventosAgenda para de devolver o evento apagado', async () => {
    useVaultMock
      .getState()
      .setEventos(RAIZ, 'pessoa_a', [
        evento({ id: 'ev-1' }),
        evento({ id: 'ev-2', titulo: 'Consulta' }),
      ]);
    expect(
      (await listarEventosAgenda(RAIZ, 'pessoa_a')).map((e) => e.id)
    ).toEqual(['ev-1', 'ev-2']);

    await apagarEventoAgenda(RAIZ, 'pessoa_a', 'ev-1');

    expect(
      (await listarEventosAgenda(RAIZ, 'pessoa_a')).map((e) => e.id)
    ).toEqual(['ev-2']);
  });
});

// --------------------------------------------------------------------
// Segunda rodada da mesma sprint: `deleteVaultFile` sozinho nao bastou.
//
// Em exercicios, marcos, tarefas e treinos a exclusao e a TERCEIRA
// linha de um try que comeca em `StorageAccessFramework.readAsStringAsync`,
// sem branch de mock. Em web a leitura lancava primeiro, o catch
// convertia em "falha ao mover para lixeira" e o delete -- ja
// corrigido -- nunca era alcancado. A assimetria seguia de pe uma
// linha acima do ponto corrigido, em 4 dos 11 call sites.
// --------------------------------------------------------------------
describe('moverArquivoParaLixeira no Gauntlet', () => {
  const ORIGEM = 'web://mock-vault/Ouroboros/markdown/exercicio-supino.md';
  const LIXEIRA = 'cache://lixeira/exercicios/20260905-120000-supino.md';

  beforeEach(() => {
    useVaultMock.getState().limpar();
  });

  it('tira o arquivo da origem', async () => {
    const { moverArquivoParaLixeira } = await import('@/lib/vault/remover');
    useVaultMock.getState().setArquivo(ORIGEM, '# supino');
    await moverArquivoParaLixeira(ORIGEM, LIXEIRA);
    expect(useVaultMock.getState().getArquivo(ORIGEM)).toBeUndefined();
  });

  it('preserva o conteudo no destino, e nao so apaga', async () => {
    const { moverArquivoParaLixeira } = await import('@/lib/vault/remover');
    useVaultMock.getState().setArquivo(ORIGEM, '# supino');
    await moverArquivoParaLixeira(ORIGEM, LIXEIRA);
    expect(useVaultMock.getState().getArquivo(LIXEIRA)).toBe('# supino');
  });

  it('lanca com a mensagem canonica quando a origem nao existe', async () => {
    // Semantica preservada dos quatro blocos que a primitiva substitui:
    // o SAF lanca ao ler arquivo ausente, e o catch prefixa a mensagem.
    const { moverArquivoParaLixeira } = await import('@/lib/vault/remover');
    await expect(moverArquivoParaLixeira(ORIGEM, LIXEIRA)).rejects.toThrow(
      /falha ao mover para lixeira/
    );
  });

  it('nao deixa a origem para tras quando o destino ja existia', async () => {
    const { moverArquivoParaLixeira } = await import('@/lib/vault/remover');
    useVaultMock.getState().setArquivo(ORIGEM, '# supino novo');
    useVaultMock.getState().setArquivo(LIXEIRA, '# lixo antigo');
    await moverArquivoParaLixeira(ORIGEM, LIXEIRA);
    expect(useVaultMock.getState().getArquivo(ORIGEM)).toBeUndefined();
    expect(useVaultMock.getState().getArquivo(LIXEIRA)).toBe('# supino novo');
  });
});
