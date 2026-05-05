// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — testes do executor.
// Cobre 3 caminhos canonicos:
//   1. Execucao feliz: gera backup novo no destino auto/.
//   2. Rotacao: ao chegar em 5 backups, descarta o mais antigo.
//   3. Helper textual descreverUltimoBackup em diferentes deltas.
//
// O servico exportarVaultZip do A5 e mockado para devolver URI fake
// no cacheDirectory; aqui validamos so o que e responsabilidade do
// executor (mover, rotacionar, ler timestamp).

// Mock do exportarVaultZip — devolve URI sintetico no cache.
// Variavel com prefixo 'mock' para passar guard do babel-jest factory
// (ver mensagem ao remover prefixo: jest mock factories nao podem
// referenciar identificadores externos exceto os com 'mock' no inicio).
const mockExportarVaultZip = jest.fn();
jest.mock('@/lib/services/exportarVault', () => ({
  __esModule: true,
  exportarVaultZip: () => mockExportarVaultZip(),
}));

// Mock customizado do expo-file-system/legacy. Substitui o mock global
// (que nao tem readDirectoryAsync nem moveAsync). Memoria por arquivo
// + memoria de mtime para simular ordenacao por carimbo de tempo.
jest.mock('expo-file-system/legacy', () => {
  const memoria = {
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    arquivos: new Map<string, string>(),
    dirs: new Set<string>(),
    mtimesS: new Map<string, number>(),
  };
  return {
    __esModule: true,
    documentDirectory: memoria.documentDirectory,
    cacheDirectory: memoria.cacheDirectory,
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
    makeDirectoryAsync: jest.fn((uri: string) => {
      memoria.dirs.add(uri);
      return Promise.resolve();
    }),
    getInfoAsync: jest.fn((uri: string) => {
      const dirHit = memoria.dirs.has(uri) || memoria.dirs.has(`${uri}/`);
      const arqHit = memoria.arquivos.has(uri);
      return Promise.resolve({
        exists: dirHit || arqHit,
        isDirectory: dirHit,
        uri,
        modificationTime: memoria.mtimesS.get(uri),
      });
    }),
    readDirectoryAsync: jest.fn((uri: string) => {
      const base = uri.endsWith('/') ? uri : `${uri}/`;
      const filhos: string[] = [];
      for (const k of memoria.arquivos.keys()) {
        if (k.startsWith(base) && !k.slice(base.length).includes('/')) {
          filhos.push(k.slice(base.length));
        }
      }
      return Promise.resolve(filhos);
    }),
    writeAsStringAsync: jest.fn((uri: string, content: string) => {
      memoria.arquivos.set(uri, content);
      return Promise.resolve();
    }),
    deleteAsync: jest.fn((uri: string) => {
      memoria.arquivos.delete(uri);
      memoria.mtimesS.delete(uri);
      return Promise.resolve();
    }),
    moveAsync: jest.fn(({ from, to }: { from: string; to: string }) => {
      const v = memoria.arquivos.get(from);
      if (v === undefined) return Promise.reject(new Error(`ENOENT ${from}`));
      memoria.arquivos.delete(from);
      memoria.arquivos.set(to, v);
      const mt = memoria.mtimesS.get(from);
      if (mt !== undefined) memoria.mtimesS.set(to, mt);
      memoria.mtimesS.delete(from);
      return Promise.resolve();
    }),
    copyAsync: jest.fn(({ from, to }: { from: string; to: string }) => {
      const v = memoria.arquivos.get(from);
      if (v === undefined) return Promise.reject(new Error(`ENOENT ${from}`));
      memoria.arquivos.set(to, v);
      return Promise.resolve();
    }),
    __memoria: memoria,
  };
});

// react-native: forca Platform.OS = 'android' para os testes que
// dependem do guard inicial (web => no-op).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

import * as FS from 'expo-file-system/legacy';
import {
  BACKUP_AUTO_SUBDIR,
  MAX_BACKUPS_AUTO,
  descreverUltimoBackup,
  executarBackup,
  lerUltimoBackupMs,
} from '@/lib/backup/executarBackup';

const memoria = (
  FS as unknown as {
    __memoria: {
      documentDirectory: string;
      cacheDirectory: string;
      arquivos: Map<string, string>;
      dirs: Set<string>;
      mtimesS: Map<string, number>;
    };
  }
).__memoria;

const PASTA_AUTO = `${memoria.documentDirectory}${BACKUP_AUTO_SUBDIR}/`;

beforeEach(() => {
  memoria.arquivos.clear();
  memoria.dirs.clear();
  memoria.mtimesS.clear();
  mockExportarVaultZip.mockReset();
});

describe('executarBackup — happy path', () => {
  it('gera backup novo na pasta auto/ e retorna URI canonica', async () => {
    // exportarVaultZip do A5 cria arquivo no cache e devolve URI.
    const cacheZip = `${memoria.cacheDirectory}ouroboros-export-20260504T120000.zip`;
    memoria.arquivos.set(cacheZip, 'ZIP-FAKE');
    mockExportarVaultZip.mockResolvedValue({
      uri: cacheZip,
      totalArquivos: 12,
    });
    const r = await executarBackup();
    expect(r.uri).not.toBeNull();
    expect(r.uri!.startsWith(PASTA_AUTO)).toBe(true);
    expect(r.uri!).toMatch(/backup-\d{8}T\d{6}\.zip$/);
    expect(r.totalArquivos).toBe(12);
    expect(r.rotacionados).toBe(0);
    // Arquivo origem foi movido (nao existe mais no cache).
    expect(memoria.arquivos.has(cacheZip)).toBe(false);
    // Arquivo destino existe.
    expect(memoria.arquivos.has(r.uri!)).toBe(true);
  });

  it('propaga motivo quando exportarVaultZip falha', async () => {
    mockExportarVaultZip.mockResolvedValue({
      uri: null,
      totalArquivos: 0,
      motivo: 'Vault não configurado.',
    });
    const r = await executarBackup();
    expect(r.uri).toBeNull();
    expect(r.motivo).toBe('Vault não configurado.');
    expect(r.rotacionados).toBe(0);
  });
});

describe('executarBackup — rotacao em 4 backups', () => {
  it(`mantem no maximo ${MAX_BACKUPS_AUTO} arquivos descartando o mais antigo`, async () => {
    // Pre-popula 4 backups antigos no destino. Nomes ordenados
    // lexicograficamente do mais antigo (01) para o mais recente (04).
    memoria.dirs.add(PASTA_AUTO);
    const antigos = [
      'backup-20260101T000000.zip',
      'backup-20260201T000000.zip',
      'backup-20260301T000000.zip',
      'backup-20260401T000000.zip',
    ];
    for (const nome of antigos) {
      memoria.arquivos.set(`${PASTA_AUTO}${nome}`, 'OLD');
    }
    // Quinto backup chega.
    const cacheZip = `${memoria.cacheDirectory}ouroboros-export-20260504T120000.zip`;
    memoria.arquivos.set(cacheZip, 'NEW');
    mockExportarVaultZip.mockResolvedValue({
      uri: cacheZip,
      totalArquivos: 20,
    });
    const r = await executarBackup();
    expect(r.uri).not.toBeNull();
    expect(r.rotacionados).toBe(1);
    // O backup mais antigo (Janeiro) deve ter sido descartado.
    expect(memoria.arquivos.has(`${PASTA_AUTO}${antigos[0]}`)).toBe(false);
    // Os outros 3 antigos + o novo permanecem (total 4).
    expect(memoria.arquivos.has(`${PASTA_AUTO}${antigos[1]}`)).toBe(true);
    expect(memoria.arquivos.has(`${PASTA_AUTO}${antigos[2]}`)).toBe(true);
    expect(memoria.arquivos.has(`${PASTA_AUTO}${antigos[3]}`)).toBe(true);
    expect(memoria.arquivos.has(r.uri!)).toBe(true);
  });
});

describe('lerUltimoBackupMs + descreverUltimoBackup', () => {
  it('le o mtime do backup mais recente', async () => {
    memoria.dirs.add(PASTA_AUTO);
    const recente = `${PASTA_AUTO}backup-20260504T120000.zip`;
    memoria.arquivos.set(recente, 'X');
    memoria.mtimesS.set(recente, 1714824000); // 2024-05-04T12:00:00Z em segundos
    const ms = await lerUltimoBackupMs();
    expect(ms).toBe(1714824000 * 1000);
  });

  it('retorna null quando nao ha backup', async () => {
    memoria.dirs.add(PASTA_AUTO);
    const ms = await lerUltimoBackupMs();
    expect(ms).toBeNull();
  });

  it('formata texto humano em PT-BR sentence case', () => {
    const agora = Date.now();
    expect(descreverUltimoBackup(null)).toBe(
      'Nenhum backup automático ainda.'
    );
    expect(descreverUltimoBackup(agora - 30 * 1000)).toBe(
      'Último backup: agora mesmo.'
    );
    expect(descreverUltimoBackup(agora - 5 * 60 * 1000)).toBe(
      'Último backup: há 5 min.'
    );
    expect(descreverUltimoBackup(agora - 3 * 60 * 60 * 1000)).toBe(
      'Último backup: há 3h.'
    );
    expect(descreverUltimoBackup(agora - 24 * 60 * 60 * 1000)).toBe(
      'Último backup: há 1 dia.'
    );
    expect(descreverUltimoBackup(agora - 7 * 24 * 60 * 60 * 1000)).toBe(
      'Último backup: há 7 dias.'
    );
  });
});
