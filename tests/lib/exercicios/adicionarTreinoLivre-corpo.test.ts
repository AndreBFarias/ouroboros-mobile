// Ressalva A6 da EXE-2: o segundo toque em "Adicionar a treino livre"
// no mesmo dia reescreve uma sessao que JA EXISTE no disco. A listagem
// que localiza essa sessao devolve so' `meta` e `rel`
// (TreinoListado, src/lib/vault/treinos.ts:59-62), nunca o corpo --
// entao regravar com a frase enlatada apagava o que o dono do Vault
// tivesse escrito no corpo do .md pelo Obsidian, sem erro e sem
// lixeira.
//
// Por que este arquivo existe em vez de mais um caso em
// adicionarTreinoLivre.test.ts: aquele arquivo mocka
// '@/lib/vault/reader' e '@/lib/vault/writer' e guarda o "disco" como
// Map de objetos { meta, body }. Um Map de objetos nao prova nada sobre
// serializacao: o corpo sobreviveria ali por ser a mesma referencia em
// memoria. Aqui o disco e' um Map de STRINGS e o unico mock e' o
// sistema de arquivos (expo-file-system/legacy). Escrita passa pelo
// writeVaultFile real -> stringifyFrontmatter real -> YAML real;
// leitura passa pelo readVaultFile real -> parseFrontmatter real. O
// arquivo intermediario e' texto .md de verdade, e a edicao "pelo
// Obsidian" e' feita sobre esse texto.
//
// Root content:// de proposito: e' o ramo que o writer usa sem
// moveAsync e o que a leitura de pasta faz por SAF, igual ao vault
// externo de quem sincroniza por Syncthing.
//
// Comentarios sem acento (convencao shell/CI).
import { parseFrontmatter } from '@/lib/vault/frontmatter';
import { TreinoSessaoSchema } from '@/lib/schemas/treino_sessao';

// Disco em texto. Chave: URI absoluta. Valor: o .md inteiro.
const mockDisco = new Map<string, string>();

jest.mock('expo-file-system/legacy', () => {
  const escrever = (uri: string, conteudo: string) => {
    mockDisco.set(uri, conteudo);
    return Promise.resolve();
  };
  const ler = (uri: string) => {
    const conteudo = mockDisco.get(uri);
    if (conteudo === undefined) {
      return Promise.reject(new Error(`ENOENT: ${uri}`));
    }
    return Promise.resolve(conteudo);
  };
  const listar = (folderUri: string) =>
    Promise.resolve(
      [...mockDisco.keys()].filter((u) => u.startsWith(`${folderUri}/`))
    );
  return {
    __esModule: true,
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    makeDirectoryAsync: jest.fn(() => Promise.resolve()),
    getInfoAsync: jest.fn((uri: string) =>
      Promise.resolve({ exists: mockDisco.has(uri), isDirectory: false, uri })
    ),
    writeAsStringAsync: jest.fn(escrever),
    readAsStringAsync: jest.fn(ler),
    readDirectoryAsync: jest.fn(listar),
    deleteAsync: jest.fn((uri: string) => {
      mockDisco.delete(uri);
      return Promise.resolve();
    }),
    moveAsync: jest.fn(({ from, to }: { from: string; to: string }) => {
      const conteudo = mockDisco.get(from);
      if (conteudo !== undefined) {
        mockDisco.set(to, conteudo);
        mockDisco.delete(from);
      }
      return Promise.resolve();
    }),
    StorageAccessFramework: {
      writeAsStringAsync: jest.fn(escrever),
      readAsStringAsync: jest.fn(ler),
      readDirectoryAsync: jest.fn(listar),
    },
  };
});

import { adicionarTreinoLivre } from '@/lib/exercicios/adicionarTreinoLivre';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';
// 2026-04-30T18:03 em America/Sao_Paulo.
const AGORA_1803 = new Date('2026-04-30T21:03:00.000Z');
const AGORA_1847 = new Date('2026-04-30T21:47:00.000Z');

// Trecho da frase enlatada que o modulo escreve na CRIACAO da sessao.
const TRECHO_ENLATADO = 'montada pelo detalhe do exercício';

// O que o dono escreve no corpo do arquivo, fora do app.
const PROSA_DO_DONO = [
  '## Como foi',
  '',
  'Ombro esquerdo travou na terceira série. Baixei a carga e terminou bem.',
  'Anotação feita pelo Obsidian, com o app fechado.',
].join('\n');

// Edita o corpo do .md preservando o bloco de frontmatter, exatamente
// como um editor de markdown externo faria: mexe no texto depois do
// segundo '---', nunca no YAML.
function editarCorpoPeloObsidian(uri: string, corpo: string): void {
  const raw = mockDisco.get(uri);
  if (raw === undefined) throw new Error(`arquivo ausente no disco: ${uri}`);
  const match = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  if (!match) throw new Error(`arquivo sem frontmatter: ${uri}`);
  mockDisco.set(uri, `${match[1]}\n${corpo}\n`);
}

function arquivosDeTreino(): string[] {
  return [...mockDisco.keys()].filter((u) => u.includes('/treinos/'));
}

beforeEach(() => {
  mockDisco.clear();
  jest.useFakeTimers().setSystemTime(AGORA_1803);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('adicionarTreinoLivre: corpo do .md ja gravado', () => {
  it('preserva a prosa do dono ao anexar o segundo exercicio do dia', async () => {
    const criada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    // A criacao carimba a frase enlatada -- isso continua valendo.
    expect(mockDisco.get(criada.uri)).toContain(TRECHO_ENLATADO);

    editarCorpoPeloObsidian(criada.uri, PROSA_DO_DONO);

    jest.setSystemTime(AGORA_1847);
    const anexada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'agachamento',
      autor: 'pessoa_a',
    });

    expect(anexada.criadoNovo).toBe(false);
    expect(anexada.rel).toBe(criada.rel);
    expect(arquivosDeTreino()).toHaveLength(1);

    // O arquivo e' texto: a assercao le o texto e depois o parseia com o
    // parser real, fechando o circuito no consumidor.
    const raw = mockDisco.get(anexada.uri) ?? '';
    expect(raw).toContain('Ombro esquerdo travou na terceira série.');
    expect(raw).toContain('Anotação feita pelo Obsidian, com o app fechado.');
    expect(raw).not.toContain(TRECHO_ENLATADO);

    const relido = parseFrontmatter(raw, TreinoSessaoSchema);
    expect(relido.body.trim()).toBe(PROSA_DO_DONO);
    expect(relido.meta.exercicios.map((e) => e.nome)).toEqual([
      'supino',
      'agachamento',
    ]);
    // 18h03 -> 18h47.
    expect(relido.meta.duracao_min).toBe(44);
  });

  it('corpo apagado pelo dono continua apagado, sem a frase enlatada de volta', async () => {
    const criada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    editarCorpoPeloObsidian(criada.uri, '');

    const anexada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'remada',
      autor: 'pessoa_a',
    });

    const raw = mockDisco.get(anexada.uri) ?? '';
    expect(raw).not.toContain(TRECHO_ENLATADO);
    const relido = parseFrontmatter(raw, TreinoSessaoSchema);
    expect(relido.body.trim()).toBe('');
    expect(relido.meta.exercicios).toHaveLength(2);
  });

  it('marcar o MESMO exercicio de novo tambem nao apaga a prosa', async () => {
    const criada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    editarCorpoPeloObsidian(criada.uri, PROSA_DO_DONO);

    const repetida = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });

    const raw = mockDisco.get(repetida.uri) ?? '';
    const relido = parseFrontmatter(raw, TreinoSessaoSchema);
    expect(relido.body.trim()).toBe(PROSA_DO_DONO);
    expect(relido.meta.exercicios).toHaveLength(1);
  });
});
