// Testes do exportador de estado canonico em ZIP
// (R-VAULT-CANONICAL-COMPLETE-B).
//
// Cobre:
//   - ZIP contem os 5 estados R-VAULT-A + 4 stats R-VAULT-B + _meta.md.
//   - Path de saida e cacheDirectory (efemero).
//   - Filtra .sync-conflict-* defensivamente.
//   - No-op com vault nao autorizado (motivo informativo).
//   - No-op quando cacheDirectory ausente (motivo informativo).
//   - _meta.md tem schema canonico (frontmatter + body humano).
//
// Mocks de expo-file-system/legacy (cacheDir + read/write), JSZip
// real (sem mock para garantir round-trip).
//
// Comentarios sem acento.

jest.mock('expo-file-system/legacy', () => {
  const arquivos = new Map<
    string,
    { content: string; encoding: 'utf8' | 'base64' }
  >();
  const dirs = new Set<string>(['file:///mock/cache', 'file:///mock/vault']);

  return {
    __esModule: true,
    cacheDirectory: 'file:///mock/cache/',
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
    readDirectoryAsync: jest.fn((uri: string) => {
      const base = uri.replace(/\/$/, '') + '/';
      const filhos: string[] = [];
      for (const k of arquivos.keys()) {
        if (k.startsWith(base)) {
          const resto = k.slice(base.length);
          // Pula entradas em subdir.
          if (!resto.includes('/')) {
            filhos.push(resto);
          }
        }
      }
      return Promise.resolve(filhos);
    }),
    readAsStringAsync: jest.fn(
      (uri: string, opt?: { encoding?: 'utf8' | 'base64' }) => {
        const sem = uri.replace(/\/$/, '');
        // Tenta resolver com decode para casar com encodeURIComponent.
        let entry = arquivos.get(sem);
        if (!entry) {
          try {
            entry = arquivos.get(decodeURIComponent(sem));
          } catch {
            entry = undefined;
          }
        }
        if (!entry) return Promise.reject(new Error(`ENOENT: ${uri}`));
        const wanted = opt?.encoding ?? 'utf8';
        if (entry.encoding === wanted) return Promise.resolve(entry.content);
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
        arquivos.set(uri.replace(/\/$/, ''), {
          content,
          encoding: opt?.encoding ?? 'utf8',
        });
        return Promise.resolve();
      }
    ),
    StorageAccessFramework: {
      readDirectoryAsync: jest.fn((uri: string) => {
        // Mesmo body do readDirectoryAsync acima -- mock unico.
        const base = uri.replace(/\/$/, '') + '/';
        const filhos: string[] = [];
        for (const k of arquivos.keys()) {
          if (k.startsWith(base)) {
            const resto = k.slice(base.length);
            if (!resto.includes('/')) filhos.push(`${base}${resto}`);
          }
        }
        return Promise.resolve(filhos);
      }),
      readAsStringAsync: jest.fn((uri: string) => {
        const entry = arquivos.get(uri.replace(/\/$/, ''));
        if (!entry) return Promise.reject(new Error('ENOENT'));
        return Promise.resolve(entry.content);
      }),
    },
    __arquivos: arquivos,
    __dirs: dirs,
  };
});

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

const mockVaultState = {
  vaultRoot: 'file:///mock/vault' as string | null,
};

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => ({ vaultRoot: mockVaultState.vaultRoot }),
  },
}));

import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { exportarEstadoCompletoZip } from '@/lib/vault/exportarEstadoCompleto';

const VAULT = 'file:///mock/vault';

const fsMock = FileSystem as unknown as {
  __arquivos: Map<string, { content: string; encoding: 'utf8' | 'base64' }>;
  __dirs: Set<string>;
};

function escreverEstado(filename: string, conteudo: string) {
  const path = `${VAULT}/_estado/${filename}`;
  fsMock.__arquivos.set(path, { content: conteudo, encoding: 'utf8' });
}

async function lerZip(zipPath: string): Promise<JSZip> {
  const b64 = await FileSystem.readAsStringAsync(zipPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return JSZip.loadAsync(b64, { base64: true });
}

describe('exportarEstadoCompletoZip: feliz', () => {
  beforeEach(() => {
    fsMock.__arquivos.clear();
    fsMock.__dirs.clear();
    fsMock.__dirs.add('file:///mock/cache');
    fsMock.__dirs.add(VAULT);
    mockVaultState.vaultRoot = VAULT;
  });

  it('ZIP contem todos os 9 arquivos canonicos + _meta.md', async () => {
    // 5 estados (R-VAULT-A)
    escreverEstado(
      'settings-ouro-aaaaaa.md',
      '---\nversion: 1\nsomVibracao:\n  geral: true\n---\n'
    );
    escreverEstado(
      'sessao-ouro-aaaaaa.md',
      '---\nversion: 1\nultimaRota: /home\n---\n'
    );
    escreverEstado(
      'onboarding-ouro-aaaaaa.md',
      '---\nversion: 1\ndone: true\n---\n'
    );
    escreverEstado(
      'pessoa-ouro-aaaaaa.md',
      '---\nversion: 1\npessoaAtiva: pessoa_a\n---\n'
    );
    escreverEstado(
      'navegacao-ouro-aaaaaa.md',
      '---\nversion: 1\nmenuAberto: false\n---\n'
    );
    // 4 stats (R-VAULT-B)
    escreverEstado(
      'stats-7d-ouro-aaaaaa.md',
      '---\nversion: 1\nperiodo: 7d\nhumorMedio7d: 4.5\n---\n'
    );
    escreverEstado(
      'stats-30d-ouro-aaaaaa.md',
      '---\nversion: 1\nperiodo: 30d\n---\n'
    );
    escreverEstado(
      'stats-90d-ouro-aaaaaa.md',
      '---\nversion: 1\nperiodo: 90d\n---\n'
    );
    escreverEstado(
      'stats-all-ouro-aaaaaa.md',
      '---\nversion: 1\nperiodo: all\n---\n'
    );

    const res = await exportarEstadoCompletoZip();
    expect(res.uri).not.toBeNull();
    expect(res.totalArquivos).toBe(9);

    const zip = await lerZip(res.uri!);
    // JSZip cria entrada implicita para diretorio (_estado/); filtramos
    // antes de comparar com a lista canonica de arquivos.
    const paths = Object.keys(zip.files)
      .filter((p) => !p.endsWith('/'))
      .sort();
    expect(paths).toEqual([
      '_estado/navegacao-ouro-aaaaaa.md',
      '_estado/onboarding-ouro-aaaaaa.md',
      '_estado/pessoa-ouro-aaaaaa.md',
      '_estado/sessao-ouro-aaaaaa.md',
      '_estado/settings-ouro-aaaaaa.md',
      '_estado/stats-30d-ouro-aaaaaa.md',
      '_estado/stats-7d-ouro-aaaaaa.md',
      '_estado/stats-90d-ouro-aaaaaa.md',
      '_estado/stats-all-ouro-aaaaaa.md',
      '_meta.md',
    ]);
  });

  it('path do ZIP fica em cacheDirectory (efemero)', async () => {
    escreverEstado('settings-ouro-aaaaaa.md', '---\nversion: 1\n---\n');
    const res = await exportarEstadoCompletoZip();
    expect(res.uri).not.toBeNull();
    expect(res.uri!.startsWith('file:///mock/cache/')).toBe(true);
    expect(res.uri!.endsWith('-estado-completo.zip')).toBe(true);
  });

  it('_meta.md tem frontmatter canonico + body humano', async () => {
    escreverEstado(
      'settings-ouro-aaaaaa.md',
      '---\nversion: 1\n---\nbody\n'
    );
    const res = await exportarEstadoCompletoZip();
    const zip = await lerZip(res.uri!);
    const metaText = await zip.file('_meta.md')!.async('text');
    expect(metaText).toMatch(/^---\n/);
    expect(metaText).toMatch(/schema: 1\n/);
    expect(metaText).toMatch(/total_arquivos: 1\n/);
    expect(metaText).toMatch(/exportado_em: \d{4}-\d{2}-\d{2}T/);
    expect(metaText).toContain('# Estado canonico do app Ouroboros');
    expect(metaText).toContain('## Arquivos incluidos');
    expect(metaText).toContain('_estado/settings-ouro-aaaaaa.md');
  });

  it('filtra .sync-conflict-* defensivamente', async () => {
    escreverEstado('settings-ouro-aaaaaa.md', '---\nversion: 1\n---\n');
    escreverEstado(
      'settings-ouro-aaaaaa.sync-conflict-20260516-093412-OURO1.md',
      '---\nversion: 1\nconflito: sim\n---\n'
    );
    const res = await exportarEstadoCompletoZip();
    expect(res.totalArquivos).toBe(1);
    const zip = await lerZip(res.uri!);
    const paths = Object.keys(zip.files).filter((p) => !p.endsWith('/'));
    expect(paths).not.toEqual(
      expect.arrayContaining([expect.stringContaining('.sync-conflict-')])
    );
  });

  it('sizeBytes acumula bytes UTF-8 dos estados', async () => {
    const conteudo = '---\nversion: 1\n---\n';
    escreverEstado('settings-ouro-aaaaaa.md', conteudo);
    const res = await exportarEstadoCompletoZip();
    expect(res.sizeBytes).toBe(Buffer.byteLength(conteudo, 'utf8'));
  });
});

describe('exportarEstadoCompletoZip: edge cases', () => {
  beforeEach(() => {
    fsMock.__arquivos.clear();
    fsMock.__dirs.clear();
    fsMock.__dirs.add('file:///mock/cache');
    fsMock.__dirs.add(VAULT);
    mockVaultState.vaultRoot = VAULT;
  });

  it('vault nao autorizado: uri null + motivo', async () => {
    mockVaultState.vaultRoot = null;
    const res = await exportarEstadoCompletoZip();
    expect(res.uri).toBeNull();
    expect(res.motivo).toContain('Vault');
  });

  it('pasta _estado/ vazia: ainda gera ZIP com _meta.md (totalArquivos=0)', async () => {
    const res = await exportarEstadoCompletoZip();
    expect(res.uri).not.toBeNull();
    expect(res.totalArquivos).toBe(0);
    const zip = await lerZip(res.uri!);
    const paths = Object.keys(zip.files).filter((p) => !p.endsWith('/'));
    expect(paths).toEqual(['_meta.md']);
    const metaText = await zip.file('_meta.md')!.async('text');
    expect(metaText).toMatch(/total_arquivos: 0\n/);
  });
});
