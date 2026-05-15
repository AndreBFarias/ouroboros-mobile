// Testes dos helpers de Vault para alarmes pessoais (M16). Cobre:
//  - listarAlarmes ordena por horario asc.
//  - listarAlarmes ignora arquivos malformados.
//  - lerAlarme retorna null para slug inexistente.
//  - escreverAlarme valida via schema antes de gravar.
//  - excluirAlarme nao falha em ausencia.
//
// Mocks: reader/writer/SAF deleteAsync para isolar I/O.
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
    ...over,
  };
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

describe('lerAlarme', () => {
  it('retorna meta quando arquivo existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: fixture(),
      body: '',
    });
    const out = await lerAlarme(VAULT_ROOT, 'medicacao-manha');
    expect(out).not.toBeNull();
    expect(out?.slug).toBe('medicacao-manha');
  });

  it('retorna null quando arquivo nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await lerAlarme(VAULT_ROOT, 'nada');
    expect(out).toBeNull();
  });

  it('chama reader com URI markdown/alarme-<slug>.md (H2 layout-por-tipo)', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await lerAlarme(VAULT_ROOT, 'meu-alarme');
    expect(mockReadVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/alarme-meu-alarme.md`,
      expect.anything()
    );
  });
});

describe('escreverAlarme', () => {
  it('grava em markdown/alarme-<slug>.md (H2 layout-por-tipo)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture();
    const { rel, uri } = await escreverAlarme(VAULT_ROOT, meta, '');
    expect(rel).toBe('markdown/alarme-medicacao-manha.md');
    expect(uri).toBe(`${VAULT_ROOT}/markdown/alarme-medicacao-manha.md`);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/alarme-medicacao-manha.md`,
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
    expect(rel).toBe('markdown/alarme-consulta-unica.md');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/alarme-consulta-unica.md`,
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
    expect(rel).toBe('markdown/alarme-agua-diaria.md');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringContaining('alarme-agua-diaria.md'),
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
    expect(rel).toBe('markdown/alarme-treino-3x.md');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringContaining('alarme-treino-3x.md'),
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
    expect(rel).toBe('markdown/alarme-aluguel-mensal.md');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.stringContaining('alarme-aluguel-mensal.md'),
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

  // I-ALARME: vaultUriJoin canonico (paths.ts:27) faz, em ordem:
  //  1. trim() externo,
  //  2. replace(/\s+$/, '') trailing whitespace,
  //  3. replace(/%20+$/, '') trailing %20 percent-encoded,
  //  4. replace(/\/+$/, '') trailing slashes.
  //
  // Para um root tipico SAF contaminado com trailing %20 (sintoma A29),
  // o path final fica limpo. Cobertura aqui garante que o caller
  // (escreverAlarme) realmente roteia pelo helper canonico, e nao mais
  // pelo joinUri local que existia antes desta sprint.
  it('produz path final via vaultUriJoin (limpa trailing %20 do SAF)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    // Root contaminado: trailing %20 (sintoma A29 em OEMs MIUI/OneUI).
    const rootSujo = `${VAULT_ROOT}%20`;
    const meta = fixture();
    const { uri } = await escreverAlarme(rootSujo, meta, '');
    expect(uri).toBe(`${VAULT_ROOT}/markdown/alarme-medicacao-manha.md`);
    // Sem barras duplas no path final (so a do scheme content://).
    expect(uri.split('//').length).toBe(2);
  });

  it('produz path final via vaultUriJoin (limpa trailing slashes)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    // Root contaminado: barras duplicadas no fim.
    const rootSujo = `${VAULT_ROOT}//`;
    const meta = fixture();
    const { uri } = await escreverAlarme(rootSujo, meta, '');
    expect(uri).toBe(`${VAULT_ROOT}/markdown/alarme-medicacao-manha.md`);
  });
});

describe('excluirAlarme', () => {
  it('chama SAF.deleteAsync com URI correto', async () => {
    mockDeleteAsync.mockResolvedValueOnce(undefined);
    await excluirAlarme(VAULT_ROOT, 'teste');
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/alarme-teste.md`
    );
  });

  it('nao propaga erro quando arquivo nao existe', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error('nao existe'));
    await expect(
      excluirAlarme(VAULT_ROOT, 'fantasma')
    ).resolves.toBeUndefined();
  });
});
