// Teste de regressao do filtro sync-conflict em exportarVaultZip()
// (sprint AUDIT-T1B7-DRAFT-EXPORT-FIX, 2026-05-15).
//
// Cenario critico: usuario tem copias .sync-conflict-* no Vault (geradas
// pelo Syncthing em janela de conflito). Sem filtro, o ZIP de export
// incluiria essas copias. Ao restaurar num device limpo, perpetuaria o
// conflito original.
//
// Decisao (opcao A da spec, consistente com doutrina T1B6): filtra,
// nao preserva. Quem precisa reconciliar manualmente acessa pelo
// filesystem (Obsidian/explorer), nao via app.
//
// Comentarios sem acento (convencao shell/CI).

// Mock do expo-file-system/legacy com mapa em memoria. Estrategia
// identica ao tests/integration/export-restaure-roundtrip.test.ts mas
// reduzida ao minimo necessario para esta regressao.
jest.mock('expo-file-system/legacy', () => {
  const arquivos = new Map<
    string,
    { content: string; encoding: 'utf8' | 'base64' }
  >();
  const dirs = new Set<string>();
  dirs.add('file:///mock/cache');
  dirs.add('file:///mock/documents');

  function ensureParents(uri: string): void {
    const parts = uri.split('/');
    parts.pop();
    let acc = '';
    for (const p of parts) {
      acc = acc.length === 0 ? p : `${acc}/${p}`;
      if (acc.length > 0 && !acc.endsWith(':')) {
        dirs.add(acc);
      }
    }
  }

  return {
    __esModule: true,
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
    getInfoAsync: jest.fn((uri: string) => {
      const sem = uri.replace(/\/$/, '');
      if (arquivos.has(sem)) {
        return Promise.resolve({ exists: true, isDirectory: false, uri });
      }
      if (dirs.has(sem)) {
        return Promise.resolve({ exists: true, isDirectory: true, uri });
      }
      return Promise.resolve({ exists: false, isDirectory: false, uri });
    }),
    readDirectoryAsync: jest.fn((uri: string) => {
      const base = uri.replace(/\/$/, '') + '/';
      const filhos = new Set<string>();
      for (const k of arquivos.keys()) {
        if (k.startsWith(base)) {
          const resto = k.slice(base.length);
          const idx = resto.indexOf('/');
          filhos.add(idx === -1 ? resto : resto.slice(0, idx));
        }
      }
      for (const d of dirs) {
        if (d.startsWith(base) && d !== uri.replace(/\/$/, '')) {
          const resto = d.slice(base.length);
          const idx = resto.indexOf('/');
          filhos.add(idx === -1 ? resto : resto.slice(0, idx));
        }
      }
      return Promise.resolve([...filhos]);
    }),
    readAsStringAsync: jest.fn(
      (uri: string, opt?: { encoding?: 'utf8' | 'base64' }) => {
        const sem = uri.replace(/\/$/, '');
        const entry = arquivos.get(sem);
        if (!entry) {
          return Promise.reject(new Error(`ENOENT: ${uri}`));
        }
        const wanted = opt?.encoding ?? 'utf8';
        if (entry.encoding === wanted) {
          return Promise.resolve(entry.content);
        }
        if (entry.encoding === 'utf8' && wanted === 'base64') {
          return Promise.resolve(
            Buffer.from(entry.content, 'utf8').toString('base64')
          );
        }
        return Promise.resolve(
          Buffer.from(entry.content, 'base64').toString('utf8')
        );
      }
    ),
    writeAsStringAsync: jest.fn(
      (
        uri: string,
        content: string,
        opt?: { encoding?: 'utf8' | 'base64' }
      ) => {
        const encoding = opt?.encoding ?? 'utf8';
        const sem = uri.replace(/\/$/, '');
        arquivos.set(sem, { content, encoding });
        ensureParents(sem);
        return Promise.resolve();
      }
    ),
    StorageAccessFramework: {
      requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({
        granted: true,
        directoryUri: 'file:///mock/vault',
      }),
    },
    __arquivos: arquivos,
    __dirs: dirs,
  };
});

jest.mock('@/lib/vault/permissions', () => ({
  __esModule: true,
  loadVaultRoot: jest.fn(() => Promise.resolve('file:///mock/vault')),
}));

jest.mock('react-native', () => require('../../__support__/rnCssInteropMock.cjs')('android'));

import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { exportarVaultZip } from '@/lib/services/exportarVault';

const VAULT = 'file:///mock/vault';

const fsMock = FileSystem as unknown as {
  __arquivos: Map<string, { content: string; encoding: 'utf8' | 'base64' }>;
  __dirs: Set<string>;
};

function escreverUtf8(rel: string, conteudo: string) {
  const path = `${VAULT}/${rel}`;
  fsMock.__arquivos.set(path, { content: conteudo, encoding: 'utf8' });
  const partes = path.split('/');
  partes.pop();
  let acc = '';
  for (const p of partes) {
    acc = acc.length === 0 ? p : `${acc}/${p}`;
    if (acc.length > 0 && !acc.endsWith(':')) {
      fsMock.__dirs.add(acc);
    }
  }
}

function escreverBase64(rel: string, b64: string) {
  const path = `${VAULT}/${rel}`;
  fsMock.__arquivos.set(path, { content: b64, encoding: 'base64' });
  const partes = path.split('/');
  partes.pop();
  let acc = '';
  for (const p of partes) {
    acc = acc.length === 0 ? p : `${acc}/${p}`;
    if (acc.length > 0 && !acc.endsWith(':')) {
      fsMock.__dirs.add(acc);
    }
  }
}

async function lerZip(zipPath: string): Promise<JSZip> {
  const b64 = await FileSystem.readAsStringAsync(zipPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return JSZip.loadAsync(b64, { base64: true });
}

describe('exportarVaultZip — filtro sync-conflict (T1B7)', () => {
  beforeEach(() => {
    fsMock.__arquivos.clear();
    fsMock.__dirs.clear();
    fsMock.__dirs.add('file:///mock/cache');
    fsMock.__dirs.add('file:///mock/documents');
    fsMock.__dirs.add(VAULT);
    jest.clearAllMocks();
  });

  it('ZIP gerado nao contem .sync-conflict-* em markdown/ nem em jpg/', async () => {
    // Seed misto: arquivos legitimos + copias sync-conflict.
    escreverUtf8(
      'markdown/humor-2026-05-06.md',
      '---\ndata: 2026-05-06\nhumor: 3\n---\n'
    );
    escreverUtf8(
      'markdown/humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md',
      '---\ndata: 2026-05-06\nhumor: 4\n---\n'
    );
    escreverUtf8(
      'markdown/diario-2026-05-06-1500-x.md',
      '---\ntipo: diario\n---\n'
    );
    escreverUtf8(
      'markdown/diario-2026-05-06-1500-x.SYNC-CONFLICT-20260506-093412-OURO2.md',
      '---\ntipo: diario\n---\n'
    );
    // Binario legitimo + cobranca de variante de case no sufixo.
    escreverBase64('jpg/foto-2026-05-06-aaaa.jpg', Buffer.from([1, 2, 3, 4]).toString('base64'));
    escreverBase64(
      'jpg/foto-2026-05-06-aaaa.Sync-Conflict-20260506-093412-OURO3.jpg',
      Buffer.from([9, 8, 7, 6]).toString('base64')
    );

    const res = await exportarVaultZip();
    expect(res.uri).not.toBeNull();
    const zip = await lerZip(res.uri as string);

    // Lista todos os paths dentro do ZIP.
    const paths: string[] = [];
    zip.forEach((relPath) => {
      paths.push(relPath);
    });

    // Nenhum path do ZIP contem o marcador sync-conflict (case-insensitive).
    for (const p of paths) {
      expect(p.toLowerCase()).not.toMatch(/sync-conflict/);
    }

    // Os arquivos legitimos foram incluidos (sanidade).
    expect(paths).toContain('markdown/humor-2026-05-06.md');
    expect(paths).toContain('markdown/diario-2026-05-06-1500-x.md');
    expect(paths).toContain('jpg/foto-2026-05-06-aaaa.jpg');

    // MANIFEST.json tambem nao referencia paths sync-conflict.
    const manifestRaw = await zip.file('MANIFEST.json')?.async('string');
    expect(manifestRaw).toBeDefined();
    const manifest = JSON.parse(manifestRaw as string) as {
      arquivos: Array<{ path: string }>;
    };
    for (const entry of manifest.arquivos) {
      expect(entry.path.toLowerCase()).not.toMatch(/sync-conflict/);
    }
  });

  it('totalArquivos no resultado nao contabiliza copias sync-conflict', async () => {
    escreverUtf8('markdown/humor-2026-05-06.md', 'x');
    escreverUtf8(
      'markdown/humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md',
      'y'
    );
    escreverUtf8('markdown/humor-2026-05-07.md', 'z');

    const res = await exportarVaultZip();
    expect(res.uri).not.toBeNull();
    // 3 .md no vault, mas 1 e sync-conflict. Export inclui 2 mais o
    // snapshot-settings.json. totalArquivos >= 3 e exatamente o
    // numero esperado (legitimos + snapshot).
    expect(res.totalArquivos).toBe(3);
  });
});
