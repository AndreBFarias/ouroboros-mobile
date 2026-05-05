// Sprint M-EXPORT-COMPLETO (A5): roundtrip integral export -> apaga
// vault -> restaura -> diff zero. Prova que o ZIP gerado por
// exportarVaultZip() carrega informacao suficiente para reconstruir
// o estado do Vault byte-a-byte.
//
// Estrategia:
//   - Mock proprio de expo-file-system/legacy com mapa em memoria que
//     respeita encoding (utf8 vs base64) e structura de diretorios.
//   - Mock de loadVaultRoot() devolvendo um path estavel.
//   - Seed de 50+ registros (.md de varias categorias) + 3 fotos
//     mock (binarios pequenos com padroes determinosticos) + 1 audio
//     mock + companions + cache JSON + snapshot.
//   - Export -> apaga vault -> restaura com sobrescrever=true ->
//     compara cada arquivo (sha do mock = sha original).
//
// Nao toca SAF, RN, expo-sharing — modulo puro.
//
// Comentarios sem acento (convencao shell/CI).

// Mock do expo-file-system/legacy DEVE vir antes dos imports dos modulos
// sob teste (hoisting do jest.mock).
jest.mock('expo-file-system/legacy', () => {
  // Mapa de path -> { content, encoding }. Encoding 'utf8' ou 'base64'
  // para distinguir o tipo de leitura. Diretorios em set separado.
  // factory do jest.mock nao aceita declaracao de type em escopo
  // local; usamos generics inline.
  const arquivos = new Map<string, { content: string; encoding: 'utf8' | 'base64' }>();
  const dirs = new Set<string>();
  // Pasta documents/cache padrao de RN.
  dirs.add('file:///mock/cache/');
  dirs.add('file:///mock/documents/');

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
    makeDirectoryAsync: jest.fn((uri: string) => {
      dirs.add(uri.replace(/\/$/, ''));
      ensureParents(uri.replace(/\/$/, ''));
      return Promise.resolve();
    }),
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
    writeAsStringAsync: jest.fn(
      (uri: string, content: string, opt?: { encoding?: 'utf8' | 'base64' }) => {
        const encoding = opt?.encoding ?? 'utf8';
        const sem = uri.replace(/\/$/, '');
        arquivos.set(sem, { content, encoding });
        ensureParents(sem);
        return Promise.resolve();
      }
    ),
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
        // Conversao entre representacoes para que o mock se comporte
        // como o filesystem real (que armazena bytes, nao strings).
        if (entry.encoding === 'utf8' && wanted === 'base64') {
          return Promise.resolve(Buffer.from(entry.content, 'utf8').toString('base64'));
        }
        // base64 -> utf8: assume conteudo decodifica para utf8 valido.
        return Promise.resolve(
          Buffer.from(entry.content, 'base64').toString('utf8')
        );
      }
    ),
    deleteAsync: jest.fn((uri: string, _opt?: { idempotent?: boolean }) => {
      const sem = uri.replace(/\/$/, '');
      arquivos.delete(sem);
      // Tambem remove subpasta inteira: itera arquivos com prefix.
      const prefix = sem + '/';
      for (const k of [...arquivos.keys()]) {
        if (k.startsWith(prefix)) arquivos.delete(k);
      }
      for (const d of [...dirs]) {
        if (d.startsWith(prefix) || d === sem) dirs.delete(d);
      }
      return Promise.resolve();
    }),
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

// Mock de loadVaultRoot para devolver path estavel.
jest.mock('@/lib/vault/permissions', () => ({
  __esModule: true,
  loadVaultRoot: jest.fn(() => Promise.resolve('file:///mock/vault')),
  inicializarVaultCanonico: jest.fn(() =>
    Promise.resolve({ ok: true, vaultRoot: 'file:///mock/vault' })
  ),
}));

// Mock de Platform como Android (loadVaultRoot ja esta mockado mas
// exportarVault checa Platform.OS antes).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

import * as FileSystem from 'expo-file-system/legacy';
import { exportarVaultZip } from '@/lib/services/exportarVault';
import { restaurarVaultZip } from '@/lib/services/restaurarVault';
import { sha256Base64, sha256Utf8 } from '@/lib/crypto/sha256';

const VAULT = 'file:///mock/vault';

// Acessa o mapa interno do mock para seed/limpeza.
const fsMock = FileSystem as unknown as {
  __arquivos: Map<string, { content: string; encoding: 'utf8' | 'base64' }>;
  __dirs: Set<string>;
};

function escreverUtf8(rel: string, conteudo: string) {
  const path = `${VAULT}/${rel}`;
  fsMock.__arquivos.set(path, { content: conteudo, encoding: 'utf8' });
  // Garante diretorios pais.
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

// Gera blob binario com padrao deterministico para conferir bytes.
function blobDeterministico(seed: number, len: number): string {
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = (seed * 31 + i * 7) & 0xff;
  return Buffer.from(bytes).toString('base64');
}

function snapshotVault(): Map<string, string> {
  // Snapshot do conteudo bruto (encoding-agnostico): sha por path.
  const out = new Map<string, string>();
  for (const [k, v] of fsMock.__arquivos.entries()) {
    if (!k.startsWith(VAULT + '/')) continue;
    const rel = k.slice(VAULT.length + 1);
    if (v.encoding === 'utf8') {
      out.set(rel, sha256Utf8(v.content));
    } else {
      out.set(rel, sha256Base64(v.content));
    }
  }
  return out;
}

function limparVault() {
  for (const k of [...fsMock.__arquivos.keys()]) {
    if (k.startsWith(VAULT)) fsMock.__arquivos.delete(k);
  }
  for (const d of [...fsMock.__dirs]) {
    if (d.startsWith(VAULT)) fsMock.__dirs.delete(d);
  }
}

describe('export -> restaure roundtrip (M-EXPORT-COMPLETO A5)', () => {
  beforeEach(() => {
    // Limpa tudo entre testes.
    fsMock.__arquivos.clear();
    fsMock.__dirs.clear();
    fsMock.__dirs.add('file:///mock/cache');
    fsMock.__dirs.add('file:///mock/documents');
    fsMock.__dirs.add(VAULT);
    jest.clearAllMocks();
  });

  it('seed completo (50+ md + 3 fotos + 1 audio + cache) faz roundtrip byte-a-byte', async () => {
    // 1) Seed: 30 daily, 10 eventos, 5 marcos, 5 medidas, 2 contadores.
    for (let d = 1; d <= 30; d++) {
      const dia = String(d).padStart(2, '0');
      escreverUtf8(
        `daily/2026-04-${dia}.md`,
        `---\ndata: 2026-04-${dia}\nhumor: ${(d % 5) + 1}\n---\n\nDia ${d}.\n`
      );
    }
    for (let e = 1; e <= 10; e++) {
      escreverUtf8(
        `eventos/2026-04-${String(e).padStart(2, '0')}-evento-${e}.md`,
        `---\ndata: 2026-04-${String(e).padStart(2, '0')}\ntitulo: Evento ${e}\n---\n`
      );
    }
    for (let m = 1; m <= 5; m++) {
      escreverUtf8(`marcos/2026-04-${String(m).padStart(2, '0')}-marco-${m}.md`, `marco ${m}\n`);
    }
    for (let me = 1; me <= 5; me++) {
      escreverUtf8(
        `medidas/2026-04-${String(me).padStart(2, '0')}-medida.md`,
        `medida ${me}\n`
      );
    }
    for (let c = 1; c <= 2; c++) {
      escreverUtf8(`contadores/contador-${c}.md`, `contador ${c}\n`);
    }
    // 3 fotos mock (binarios)
    escreverBase64('media/fotos/2026-04-01-aaaa.jpg', blobDeterministico(1, 256));
    escreverBase64('media/fotos/2026-04-02-bbbb.jpg', blobDeterministico(2, 512));
    escreverBase64('media/fotos/2026-04-03-cccc.jpg', blobDeterministico(3, 1024));
    // Companions correspondentes.
    escreverUtf8(
      'media/fotos/2026-04-01-aaaa.md',
      '---\ntipo: foto\narquivo: 2026-04-01-aaaa.jpg\n---\n'
    );
    escreverUtf8(
      'media/fotos/2026-04-02-bbbb.md',
      '---\ntipo: foto\narquivo: 2026-04-02-bbbb.jpg\n---\n'
    );
    escreverUtf8(
      'media/fotos/2026-04-03-cccc.md',
      '---\ntipo: foto\narquivo: 2026-04-03-cccc.jpg\n---\n'
    );
    // 1 audio mock + companion.
    escreverBase64('media/audios/2026-04-01-dddd.m4a', blobDeterministico(7, 2048));
    escreverUtf8(
      'media/audios/2026-04-01-dddd.md',
      '---\ntipo: audio\narquivo: 2026-04-01-dddd.m4a\n---\n'
    );
    // Cache JSON.
    escreverUtf8(
      '.ouroboros/cache/humor-heatmap.json',
      JSON.stringify({ heat: [1, 2, 3], updated: '2026-04-30' }, null, 2)
    );
    escreverUtf8(
      '.ouroboros/cache/financas.json',
      JSON.stringify({ saldo: 1500.42 }, null, 2)
    );

    // Total de arquivos: 30 + 10 + 5 + 5 + 2 + 6 + 2 + 2 = 62.
    const snapBefore = snapshotVault();
    expect(snapBefore.size).toBe(62);

    // 2) Export.
    const res = await exportarVaultZip();
    expect(res.uri).not.toBeNull();
    expect(res.totalArquivos).toBeGreaterThanOrEqual(62);

    const zipPath = res.uri as string;
    expect(zipPath).toContain('ouroboros-export-');

    // 3) Apaga vault inteiro (mas preserva o ZIP no cache).
    limparVault();
    fsMock.__dirs.add(VAULT);
    const snapMidExport = snapshotVault();
    expect(snapMidExport.size).toBe(0);

    // 4) Restaura com sobrescrever=true (escreve direto em VAULT/).
    const restRes = await restaurarVaultZip(zipPath, { sobrescrever: true });
    expect(restRes.ok).toBe(true);
    expect(restRes.falhas).toEqual([]);
    expect(restRes.totalEscritos).toBeGreaterThanOrEqual(62);

    // 5) Diff: cada path do snapshot original existe e tem mesmo sha.
    const snapAfter = snapshotVault();
    for (const [path, sha] of snapBefore.entries()) {
      const restored = snapAfter.get(path);
      expect(restored).toBe(sha);
    }
    // Snapshot settings tambem foi gravado.
    expect(snapAfter.has('.ouroboros/snapshot-settings.json')).toBe(true);
  });

  it('restore default (sem sobrescrever) cria pasta restaurado-<data>/', async () => {
    escreverUtf8('daily/2026-05-01.md', 'oi\n');

    const res = await exportarVaultZip();
    expect(res.uri).not.toBeNull();

    // Apaga so o conteudo de daily/, mantem outros para garantir
    // append nao destrutivo.
    fsMock.__arquivos.delete(`${VAULT}/daily/2026-05-01.md`);

    const restRes = await restaurarVaultZip(res.uri as string);
    expect(restRes.ok).toBe(true);
    expect(restRes.raizDestino).toMatch(/restaurado-\d{4}-\d{2}-\d{2}$/);
    // O arquivo original NAO foi tocado em VAULT/daily; ele foi
    // restaurado dentro de restaurado-<data>/daily/.
    const dest = `${restRes.raizDestino}/daily/2026-05-01.md`;
    expect(fsMock.__arquivos.has(dest)).toBe(true);
  });

  it('zip corrompido devolve falha global com motivo', async () => {
    // Grava um "zip" invalido no cache.
    const fake = `file:///mock/cache/fake.zip`;
    fsMock.__arquivos.set(fake, {
      content: Buffer.from('nao sou zip').toString('base64'),
      encoding: 'base64',
    });

    const res = await restaurarVaultZip(fake);
    expect(res.ok).toBe(false);
    expect(res.motivo).toBeTruthy();
  });

  it('manifest divergente no schema rejeita restore', async () => {
    // Cria zip valido manualmente com manifest schema=999.
    const JSZip = require('jszip') as typeof import('jszip');
    const z = new JSZip();
    z.file('daily/2026-05-01.md', 'x');
    z.file(
      'MANIFEST.json',
      JSON.stringify({ schema: 999, exportadoEm: '', totalArquivos: 0, porSubpasta: {}, arquivos: [] })
    );
    const b64 = await z.generateAsync({ type: 'base64' });
    const fake = `file:///mock/cache/zip-schema-x.zip`;
    fsMock.__arquivos.set(fake, { content: b64, encoding: 'base64' });

    const res = await restaurarVaultZip(fake);
    expect(res.ok).toBe(false);
    expect(res.motivo).toMatch(/schema/i);
  });
});
