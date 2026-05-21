// Testes dos helpers de Vault para alarmes pessoais (M16). Cobre:
//  - listarAlarmes ordena por horario asc.
//  - listarAlarmes ignora arquivos malformados.
//  - lerAlarme retorna null para slug inexistente.
//  - escreverAlarme valida via schema antes de gravar.
//  - excluirAlarme nao falha em ausencia.
//
// Mocks: reader/writer/SAF deleteAsync para isolar I/O.
//
// T2-LOCK-VAULT (2026-05-15): escreverAlarme agora sempre aplica suffix
// '-<deviceId>'. lerAlarme busca suffix do device atual com fallback no
// canonico. excluirAlarme apaga ambos.
//
// Comentarios sem acento (convencao shell/CI).
import type { Alarme } from '@/lib/schemas/alarme';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import {
  listarAlarmes,
  lerAlarme,
  escreverAlarme,
  excluirAlarme,
} from '@/lib/vault/alarmes';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<Alarme> = {}): Alarme {
  return {
    tipo: 'alarme',
    slug: 'medicacao-manha',
    titulo: 'Medicação da manhã',
    horario: '08:30',
    dias_semana: [1, 2, 3, 4, 5],
    // M30: default 'semanal' explicito (output type zod required).
    recorrencia: 'semanal',
    tag: 'medicacao',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 5,
    criado_em: '2026-04-29T10:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
    historico_snoozes: [],
    silenciar_sugestao_ate: null,
    ...over,
  };
}

// Regex matcher canonico para path do alarme com suffix de deviceId
// no formato T2: markdown/alarme-<slug>-ouro-<6chars>.md.
function alarmeT2Regex(slug: string): RegExp {
  return new RegExp(`/markdown/alarme-${slug}-ouro-[a-z0-9]{6}\\.md$`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarAlarmes', () => {
  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarAlarmes(VAULT_ROOT);
    expect(out).toEqual([]);
  });

  it('ordena por horario asc, depois titulo', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/alarme-treino.md`,
      `${VAULT_ROOT}/markdown/alarme-agua.md`,
      `${VAULT_ROOT}/markdown/alarme-medicacao-manha.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('treino.md')) {
        return Promise.resolve({
          meta: fixture({
            slug: 'treino',
            titulo: 'Treino',
            horario: '18:00',
            tag: 'treino',
          }),
          body: '',
        });
      }
      if (uri.endsWith('agua.md')) {
        return Promise.resolve({
          meta: fixture({ slug: 'agua', titulo: 'Água', horario: '08:30' }),
          body: '',
        });
      }
      if (uri.endsWith('medicacao-manha.md')) {
        return Promise.resolve({
          meta: fixture({
            slug: 'medicacao-manha',
            titulo: 'Medicação da manhã',
            horario: '08:30',
          }),
          body: '',
        });
      }
      return Promise.resolve(null);
    });

    const out = await listarAlarmes(VAULT_ROOT);
    expect(out.map((a) => a.slug)).toEqual([
      'agua',
      'medicacao-manha',
      'treino',
    ]);
  });

  it('ignora arquivos malformados sem propagar erro', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/alarme-ok.md`,
      `${VAULT_ROOT}/markdown/alarme-quebrado.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('quebrado.md')) {
        return Promise.reject(new Error('schema invalido'));
      }
      return Promise.resolve({
        meta: fixture({ slug: 'ok', titulo: 'OK' }),
        body: '',
      });
    });

    const out = await listarAlarmes(VAULT_ROOT);
    expect(out.length).toBe(1);
    expect(out[0].slug).toBe('ok');
  });
});

describe('lerAlarme T2-LOCK-VAULT', () => {
  it('busca arquivo com suffix do device atual primeiro', async () => {
    mockReadVaultFile.mockResolvedValueOnce({ meta: fixture(), body: '' });
    const out = await lerAlarme(VAULT_ROOT, 'medicacao-manha');
    expect(mockReadVaultFile).toHaveBeenCalledTimes(1);
    const [uri] = mockReadVaultFile.mock.calls[0];
    expect(uri).toMatch(alarmeT2Regex('medicacao-manha'));
    expect(out).not.toBeNull();
    expect(out?.slug).toBe('medicacao-manha');
  });

  it('fallback no canonico (legado pre-migration) quando suffix ausente', async () => {
    mockReadVaultFile
      .mockResolvedValueOnce(null) // T2 path
      .mockResolvedValueOnce({ meta: fixture(), body: '' }); // canonico
    const out = await lerAlarme(VAULT_ROOT, 'medicacao-manha');
    expect(mockReadVaultFile).toHaveBeenCalledTimes(2);
    const [uriSuffix] = mockReadVaultFile.mock.calls[0];
    const [uriCanonico] = mockReadVaultFile.mock.calls[1];
    expect(uriSuffix).toMatch(alarmeT2Regex('medicacao-manha'));
    expect(uriCanonico).toBe(
      `${VAULT_ROOT}/markdown/alarme-medicacao-manha.md`
    );
    expect(out).not.toBeNull();
  });

  it('retorna null quando arquivo nao existe (nem suffix nem canonico)', async () => {
    mockReadVaultFile.mockResolvedValue(null);
    const out = await lerAlarme(VAULT_ROOT, 'nada');
    expect(out).toBeNull();
  });
});

describe('escreverAlarme T2-LOCK-VAULT', () => {
  it('grava sempre com suffix de deviceId em markdown/alarme-<slug>-ouro-<id>.md', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture();
    const { rel, uri } = await escreverAlarme(VAULT_ROOT, meta, '');
    expect(rel).toMatch(
      /^markdown\/alarme-medicacao-manha-ouro-[a-z0-9]{6}\.md$/
    );
    expect(uri).toBe(`${VAULT_ROOT}/${rel}`);
    expect(uri).toMatch(alarmeT2Regex('medicacao-manha'));
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      uri,
      expect.objectContaining({ slug: 'medicacao-manha' }),
      ''
    );
  });

  it('rejeita meta invalido', async () => {
    const inv = fixture({ slug: 'INVALIDO MAIUSCULO' });
    await expect(escreverAlarme(VAULT_ROOT, inv)).rejects.toThrow(
      /alarme invalido/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  // I-ALARME: cobertura das 4 recorrencias canonicas (M30). Cada save
  // produz path canonico via vaultUriJoin e respeita schema.
  it('persiste recorrencia=unica com data_unica', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({
      slug: 'consulta-unica',
      titulo: 'Consulta médica',
      recorrencia: 'unica',
      dias_semana: [],
      data_unica: '2026-06-10T14:00:00-03:00',
    });
    const { rel } = await escreverAlarme(VAULT_ROOT, meta, '');
    expect(rel).toMatch(/^markdown\/alarme-consulta-unica-ouro-[a-z0-9]{6}\.md$/);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringMatching(alarmeT2Regex('consulta-unica')),
      expect.objectContaining({
        recorrencia: 'unica',
        data_unica: '2026-06-10T14:00:00-03:00',
      }),
      ''
    );
  });

  it('persiste recorrencia=diaria sem dias_semana', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({
      slug: 'agua-diaria',
      titulo: 'Água',
      recorrencia: 'diaria',
      dias_semana: [],
    });
    const { rel } = await escreverAlarme(VAULT_ROOT, meta, '');
    expect(rel).toMatch(/^markdown\/alarme-agua-diaria-ouro-[a-z0-9]{6}\.md$/);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringMatching(alarmeT2Regex('agua-diaria')),
      expect.objectContaining({ recorrencia: 'diaria' }),
      ''
    );
  });

  it('persiste recorrencia=semanal com 3 dias (seg-qua-sex)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({
      slug: 'treino-3x',
      titulo: 'Treino',
      recorrencia: 'semanal',
      dias_semana: [1, 3, 5],
      tag: 'treino',
    });
    const { rel } = await escreverAlarme(VAULT_ROOT, meta, '');
    expect(rel).toMatch(/^markdown\/alarme-treino-3x-ouro-[a-z0-9]{6}\.md$/);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringMatching(alarmeT2Regex('treino-3x')),
      expect.objectContaining({
        recorrencia: 'semanal',
        dias_semana: [1, 3, 5],
      }),
      ''
    );
  });

  it('persiste recorrencia=mensal com data_unica derivando dia', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({
      slug: 'aluguel-mensal',
      titulo: 'Aluguel',
      recorrencia: 'mensal',
      dias_semana: [],
      data_unica: '2026-06-05T09:00:00-03:00',
      tag: 'outro',
    });
    const { rel } = await escreverAlarme(VAULT_ROOT, meta, '');
    expect(rel).toMatch(/^markdown\/alarme-aluguel-mensal-ouro-[a-z0-9]{6}\.md$/);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringMatching(alarmeT2Regex('aluguel-mensal')),
      expect.objectContaining({
        recorrencia: 'mensal',
        data_unica: '2026-06-05T09:00:00-03:00',
      }),
      ''
    );
  });

  // I-ALARME: vaultUriJoin lanca erro claro quando root vazio
  // (sentinel de bug em estado anterior do app, ADR-0023).
  it('lanca erro quando vaultRoot vazio', async () => {
    const meta = fixture();
    await expect(escreverAlarme('', meta, '')).rejects.toThrow(
      /vaultUriJoin: root vazio/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  // I-ALARME: vaultUriJoin canonico (paths.ts:27) faz trim de
  // trailing whitespace, %20 e barras. Mesmo com root sujo, path
  // final fica limpo + suffix T2 (a ordem: trim root, depois suffix).
  it('produz path final via vaultUriJoin (limpa trailing %20 do SAF)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}%20`;
    const meta = fixture();
    const { uri } = await escreverAlarme(rootSujo, meta, '');
    expect(uri).toMatch(alarmeT2Regex('medicacao-manha'));
    expect(uri.startsWith(VAULT_ROOT)).toBe(true);
    // Sem barras duplas no path final (so a do scheme content://).
    expect(uri.split('//').length).toBe(2);
  });

  it('produz path final via vaultUriJoin (limpa trailing slashes)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}//`;
    const meta = fixture();
    const { uri } = await escreverAlarme(rootSujo, meta, '');
    expect(uri).toMatch(alarmeT2Regex('medicacao-manha'));
    expect(uri.startsWith(VAULT_ROOT)).toBe(true);
  });
});

describe('excluirAlarme T2-LOCK-VAULT', () => {
  it('apaga tanto arquivo com suffix (T2) quanto canonico (legado)', async () => {
    mockDeleteAsync.mockResolvedValue(undefined);
    await excluirAlarme(VAULT_ROOT, 'teste');
    expect(mockDeleteAsync).toHaveBeenCalledTimes(2);
    const [uriSuffix] = mockDeleteAsync.mock.calls[0];
    const [uriCanonico] = mockDeleteAsync.mock.calls[1];
    expect(uriSuffix).toMatch(alarmeT2Regex('teste'));
    expect(uriCanonico).toBe(`${VAULT_ROOT}/markdown/alarme-teste.md`);
  });

  it('nao propaga erro quando arquivo nao existe', async () => {
    mockDeleteAsync.mockRejectedValue(new Error('nao existe'));
    await expect(excluirAlarme(VAULT_ROOT, 'fantasma')).resolves.toBeUndefined();
  });
});
