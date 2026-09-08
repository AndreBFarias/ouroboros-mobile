// Regressao da ressalva sobre a INT-HC-2 (2026-09-08): a guarda de merge
// do puxador de medidas cobria so' o frontmatter. O corpo do markdown --
// a prosa que a pessoa digita no proprio .md, pelo Obsidian ou por
// qualquer editor -- continuava indo para o disco como string vazia a
// cada rodada de autopull, e a sobreposicao de 48h da janela rele o mesmo
// dia mais de uma vez.
//
// POR QUE ESTE ARQUIVO NAO MOCKA @/lib/vault/medidas. Os dois testes
// vizinhos (puxadores/medidas.test.ts e autopull-duas-rodadas.test.ts)
// substituem escreverMedida por um Map de objetos; nesse formato o corpo
// nem existe, entao apaga-lo passa despercebido -- foi assim que o
// defeito sobreviveu a suite verde. Aqui o circuito roda inteiro:
// escreverMedida -> writeVaultFile -> stringifyFrontmatter -> YAML de
// verdade -> string no FS falso -> readVaultFile -> parseFrontmatter ->
// MedidasSchema. Falsos so' a bridge nativa do HC e o SAF.
//
// O vault root e' content:// de proposito: e' o unico scheme em que o
// writer grava direto, sem o rename atomico de file://.
//
// Comentarios sem acento (convencao shell/CI).

// FS falso: um Map de URI para conteudo cru do arquivo.
const mockArquivos = new Map<string, string>();

const mockReadRecords = jest.fn();

jest.mock('../../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

jest.mock('expo-file-system/legacy', () => {
  const ler = async (uri: string): Promise<string> => {
    const conteudo = mockArquivos.get(uri);
    // SAF nao distingue ausencia de falha de I/O; o reader trata os dois
    // como null. Lancar aqui e' o comportamento fiel.
    if (conteudo === undefined) throw new Error(`arquivo ausente: ${uri}`);
    return conteudo;
  };
  const escrever = async (uri: string, raw: string): Promise<void> => {
    mockArquivos.set(uri, raw);
  };
  const apagar = async (uri: string): Promise<void> => {
    mockArquivos.delete(uri);
  };
  return {
    __esModule: true,
    documentDirectory: 'file://test/',
    cacheDirectory: 'cache://test/',
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
    getInfoAsync: async (uri: string) => ({
      exists: mockArquivos.has(uri),
      uri,
      isDirectory: false,
    }),
    makeDirectoryAsync: async () => undefined,
    moveAsync: async ({ from, to }: { from: string; to: string }) => {
      const conteudo = mockArquivos.get(from);
      if (conteudo !== undefined) mockArquivos.set(to, conteudo);
      mockArquivos.delete(from);
    },
    copyAsync: async () => undefined,
    deleteAsync: apagar,
    readAsStringAsync: ler,
    writeAsStringAsync: escrever,
    readDirectoryAsync: async () => [],
    StorageAccessFramework: {
      readAsStringAsync: ler,
      writeAsStringAsync: escrever,
      deleteAsync: apagar,
      readDirectoryAsync: async () => Array.from(mockArquivos.keys()),
      requestDirectoryPermissionsAsync: async () => ({ granted: false }),
    },
  };
});

import { puxadorMedidas } from '@/lib/health/puxadores/medidas';
import { readVaultFile } from '@/lib/vault/reader';
import { MedidasSchema } from '@/lib/schemas/medidas';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';
const URI_DIA = `${VAULT_ROOT}/markdown/medidas-2026-09-09.md`;

// D = 2026-09-10, 08:00 em America/Sao_Paulo. 2026-09-09 e' dia fechado,
// entao passa pela barreira do dia em curso.
const AGORA = '2026-09-10T11:00:00.000Z';
const SINCE = '2026-09-08T03:00:00.000Z';

const PROSA = [
  'Medi depois do treino, com a fita nova.',
  '',
  'A cintura cedeu um dedo desde domingo; o quadril segue igual.',
].join('\n');

// Arquivo como a pessoa deixaria: frontmatter escrito a mao e prosa
// embaixo. Nao passa pelo stringifyFrontmatter de proposito -- o que se
// quer provar e' que o parser real le este texto e que o texto sobrevive.
const ARQUIVO_ESCRITO_A_MAO = [
  '---',
  '_schema_version: 1',
  'tipo: medidas',
  'data: 2026-09-09',
  'autor: pessoa_b',
  'cintura: 78',
  'fotos:',
  '  - jpg/medidas-2026-09-09-frente.jpg',
  'reflexao: Semana de rotina estável.',
  '---',
  '',
  PROSA,
  '',
].join('\n');

function pesoNoHC(kg: number): void {
  mockReadRecords.mockImplementation((tipo: string) => {
    if (tipo === 'Weight') {
      return Promise.resolve({
        records: [
          {
            time: '2026-09-09T13:00:00.000Z',
            weight: { inKilograms: kg },
            metadata: { id: 'peso-sintetico' },
          },
        ],
      });
    }
    return Promise.resolve({ records: [] });
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(AGORA));
  jest.clearAllMocks();
  mockArquivos.clear();
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useSettings.setState({
    pessoa: {
      ativa: 'pessoa_a',
      vaultCompartilhado: true,
      tipoCompanhia: 'sozinho',
    },
  });
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  useVault.setState({ vaultRoot: null });
});

describe('puxadorMedidas: o corpo do markdown do dia', () => {
  it('sobrevive a duas rodadas de autopull sobre o mesmo dia', async () => {
    mockArquivos.set(URI_DIA, ARQUIVO_ESCRITO_A_MAO);
    pesoNoHC(72.4);

    const r1 = await puxadorMedidas.puxar({ since: SINCE, pageSize: 1000 });
    const r2 = await puxadorMedidas.puxar({ since: SINCE, pageSize: 1000 });
    expect([r1.novos, r2.novos]).toEqual([1, 1]);
    expect([r1.erro, r2.erro]).toEqual([null, null]);

    // Fecha o circuito no consumidor: le o arquivo pelo reader real.
    const lido = await readVaultFile(URI_DIA, MedidasSchema);
    expect(lido).not.toBeNull();
    expect(lido?.meta).toMatchObject({
      tipo: 'medidas',
      data: '2026-09-09',
      autor: 'pessoa_b',
      cintura: 78,
      reflexao: 'Semana de rotina estável.',
      peso: 72.4,
    });
    expect(lido?.meta.fotos).toEqual(['jpg/medidas-2026-09-09-frente.jpg']);
    expect(lido?.body.trim()).toBe(PROSA);
  });

  it('nasce vazio quando o dia ainda nao tem arquivo', async () => {
    pesoNoHC(71.2);

    const r = await puxadorMedidas.puxar({ since: SINCE, pageSize: 1000 });
    expect(r).toEqual({ novos: 1, erro: null });

    const lido = await readVaultFile(URI_DIA, MedidasSchema);
    expect(lido?.meta).toMatchObject({
      tipo: 'medidas',
      data: '2026-09-09',
      autor: 'pessoa_a',
      peso: 71.2,
    });
    expect(lido?.body).toBe('');
  });

  it('arquivo do dia ilegivel nao trava a rodada nem propaga excecao', async () => {
    mockArquivos.set(URI_DIA, 'sem frontmatter nenhum, so texto solto\n');
    pesoNoHC(70.1);

    const r = await puxadorMedidas.puxar({ since: SINCE, pageSize: 1000 });
    expect(r).toEqual({ novos: 1, erro: null });

    const lido = await readVaultFile(URI_DIA, MedidasSchema);
    expect(lido?.meta.peso).toBe(70.1);
  });
});
