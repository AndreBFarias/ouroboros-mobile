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
      const conteudo = memoria.arquivos.get(uri);
      return Promise.resolve({
        exists: dirHit || arqHit,
        isDirectory: dirHit,
        uri,
        modificationTime: memoria.mtimesS.get(uri),
        // R-BACKUP-AUTO: writer e listador agora leem .size do .zip para
        // popular bytes_totais no companion .md e na UI.
        size: typeof conteudo === 'string' ? conteudo.length : undefined,
      });
    }),
    readAsStringAsync: jest.fn((uri: string) => {
      const v = memoria.arquivos.get(uri);
      if (v === undefined) return Promise.reject(new Error(`ENOENT ${uri}`));
      return Promise.resolve(v);
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
  BACKUP_FILENAME_RE,
  MAX_BACKUPS_AUTO,
  companionMdName,
  descreverUltimoBackup,
  executarBackup,
  lerUltimoBackupMs,
  listarBackupsArquivados,
} from '@/lib/backup/executarBackup';
import { parseFrontmatter } from '@/lib/schemas/backup_snapshot';

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
    // R-BACKUP-AUTO: nome do arquivo agora pode ter sufixo opcional
    // -<deviceId> (ex: backup-20260504T120000-ouro-abc123.zip). Sufixo
    // ausente continua aceito para backups gerados sem getDeviceId
    // (web/test fallback).
    expect(r.uri!).toMatch(/backup-\d{8}T\d{6}(-[a-zA-Z0-9-]+)?\.zip$/);
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
    expect(descreverUltimoBackup(null)).toBe('Nenhum backup automático ainda.');
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

// R-BACKUP-AUTO -- comportamento novo (companion .md + listador).

describe('R-BACKUP-AUTO -- companion .md gravado ao lado do .zip', () => {
  it('gera companion .md valido com schema BackupSnapshot', async () => {
    const cacheZip = `${memoria.cacheDirectory}ouroboros-export-r-backup-auto.zip`;
    // Payload base64-valido (PK\x03\x04 minimal zip header, b64 encoded).
    // sha256Base64 decodifica antes de hashear; precisa de string b64
    // valida para nao explodir.
    memoria.arquivos.set(cacheZip, 'UEsDBA==');
    mockExportarVaultZip.mockResolvedValue({
      uri: cacheZip,
      totalArquivos: 9,
    });
    const r = await executarBackup();
    expect(r.uri).not.toBeNull();
    // Companion .md tem mesmo basename, extensao .md.
    const companionUri = r.uri!.replace(/\.zip$/, '.md');
    expect(memoria.arquivos.has(companionUri)).toBe(true);
    const md = memoria.arquivos.get(companionUri)!;
    const parsed = parseFrontmatter(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.tipo).toBe('backup_snapshot');
    expect(parsed!.versao).toBe(1);
    expect(parsed!.arquivos_incluidos).toBe(9);
    // sha256 e' hex 64.
    expect(parsed!.sha256).toMatch(/^[0-9a-f]{64}$/);
    // origem nao-vazia (deviceId fallback ou real).
    expect(parsed!.origem.length).toBeGreaterThan(0);
    // r.snapshot exposto no resultado.
    expect(r.snapshot).toBeDefined();
    expect(r.snapshot!.sha256).toBe(parsed!.sha256);
  });

  it('rotacao apaga companion .md correspondente ao .zip descartado', async () => {
    memoria.dirs.add(PASTA_AUTO);
    const antigos = [
      'backup-20260101T000000-ouro-aaaaaa.zip',
      'backup-20260201T000000-ouro-bbbbbb.zip',
      'backup-20260301T000000-ouro-cccccc.zip',
      'backup-20260401T000000-ouro-dddddd.zip',
    ];
    for (const nome of antigos) {
      memoria.arquivos.set(`${PASTA_AUTO}${nome}`, 'OLD-ZIP');
      memoria.arquivos.set(
        `${PASTA_AUTO}${companionMdName(nome)}`,
        '---\ntipo: backup_snapshot\n---\n'
      );
    }
    const cacheZip = `${memoria.cacheDirectory}export-novo.zip`;
    memoria.arquivos.set(cacheZip, 'NEW');
    mockExportarVaultZip.mockResolvedValue({
      uri: cacheZip,
      totalArquivos: 20,
    });
    const r = await executarBackup();
    expect(r.rotacionados).toBe(1);
    // .zip mais antigo (Janeiro) descartado.
    expect(memoria.arquivos.has(`${PASTA_AUTO}${antigos[0]}`)).toBe(false);
    // Companion .md de Janeiro tambem descartado.
    expect(
      memoria.arquivos.has(`${PASTA_AUTO}${companionMdName(antigos[0])}`)
    ).toBe(false);
  });
});

describe('R-BACKUP-AUTO -- listarBackupsArquivados', () => {
  it('lista backups com data + tamanho + snapshot quando companion existe', async () => {
    memoria.dirs.add(PASTA_AUTO);
    const nome = 'backup-20260516T120000-ouro-abc123.zip';
    const uri = `${PASTA_AUTO}${nome}`;
    memoria.arquivos.set(uri, 'ZIP-PAYLOAD');
    memoria.mtimesS.set(uri, 1714824000);
    // Companion .md ao lado.
    const companion = `${PASTA_AUTO}${companionMdName(nome)}`;
    memoria.arquivos.set(
      companion,
      '---\n' +
        'tipo: backup_snapshot\n' +
        'versao: 1\n' +
        'criado_em: "2026-05-16T12:00:00Z"\n' +
        'origem: "ouro-abc123"\n' +
        'arquivos_incluidos: 42\n' +
        'bytes_totais: 1024\n' +
        'sha256: "' +
        'a'.repeat(64) +
        '"\n' +
        '---\n'
    );
    const lista = await listarBackupsArquivados();
    expect(lista.length).toBe(1);
    expect(lista[0].nome).toBe(nome);
    expect(lista[0].uri).toBe(uri);
    expect(lista[0].modificadoEmMs).toBe(1714824000 * 1000);
    expect(lista[0].bytes).toBeGreaterThan(0);
    expect(lista[0].snapshot).not.toBeNull();
    expect(lista[0].snapshot!.arquivos_incluidos).toBe(42);
  });

  it('lista backups antigos sem companion mantem snapshot=null', async () => {
    memoria.dirs.add(PASTA_AUTO);
    const nome = 'backup-20260101T000000.zip';
    memoria.arquivos.set(`${PASTA_AUTO}${nome}`, 'ZIP-OLD');
    const lista = await listarBackupsArquivados();
    expect(lista.length).toBe(1);
    expect(lista[0].snapshot).toBeNull();
  });

  it('ignora arquivos que nao casam o padrao backup-<TS>.zip', async () => {
    memoria.dirs.add(PASTA_AUTO);
    memoria.arquivos.set(`${PASTA_AUTO}arquivo-fora-do-padrao.zip`, 'X');
    memoria.arquivos.set(`${PASTA_AUTO}README.txt`, 'X');
    memoria.arquivos.set(`${PASTA_AUTO}backup-20260516T120000.zip`, 'OK');
    const lista = await listarBackupsArquivados();
    expect(lista.length).toBe(1);
    expect(lista[0].nome).toBe('backup-20260516T120000.zip');
  });
});

describe('R-BACKUP-AUTO -- BACKUP_FILENAME_RE', () => {
  it('aceita formato historico backup-<TS>.zip', () => {
    expect(BACKUP_FILENAME_RE.test('backup-20260516T120000.zip')).toBe(true);
  });

  it('aceita formato novo com deviceId backup-<TS>-<deviceId>.zip', () => {
    expect(BACKUP_FILENAME_RE.test('backup-20260516T120000-ouro-abc123.zip')).toBe(
      true
    );
  });

  it('recusa formatos fora do padrao', () => {
    expect(BACKUP_FILENAME_RE.test('arquivo-fora-do-padrao.zip')).toBe(false);
    expect(BACKUP_FILENAME_RE.test('backup-20260516.zip')).toBe(false);
    expect(BACKUP_FILENAME_RE.test('backup-20260516T120000.md')).toBe(false);
  });
});
