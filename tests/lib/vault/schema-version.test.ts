// Q12: testes do carimbo defensivo _schema_version em todo arquivo
// persistido pelo Vault. Cobre:
//   1. stringifyFrontmatter sempre carimba _schema_version: 1 como
//      primeira chave do bloco YAML.
//   2. parseFrontmatter aceita arquivos SEM o campo (compat v0).
//   3. parseFrontmatter aceita arquivos com _schema_version: 1 e
//      Zod 4 strips a chave silenciosamente.
//   4. parseFrontmatter aceita _schema_version: 2 (forward-compat)
//      emitindo console.warn com mensagem canonica.
//   5. writeVaultFile (writer) injeta _schema_version no YAML
//      gravado via mock de SAF.
//   6. Companion midia (stringifyCompanionMidia) tambem carimba.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import YAML from 'yaml';

const mockWriteAsStringAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  makeDirectoryAsync: (...args: unknown[]) =>
    mockMakeDirectoryAsync(...args),
  StorageAccessFramework: {
    writeAsStringAsync: (...args: unknown[]) =>
      mockWriteAsStringAsync(...args),
  },
}));

import {
  parseFrontmatter,
  stringifyFrontmatter,
  VAULT_SCHEMA_VERSION,
} from '@/lib/vault/frontmatter';
import { writeVaultFile } from '@/lib/vault/writer';
import { stringifyCompanionMidia } from '@/lib/midia/companion';

const FixtureSchema = z.object({
  tipo: z.literal('humor'),
  data: z.string(),
  autor: z.enum(['pessoa_a', 'pessoa_b']),
  humor: z.number().int().min(1).max(5),
});

type FixtureMeta = z.infer<typeof FixtureSchema>;

const FIXTURE: FixtureMeta = {
  tipo: 'humor',
  data: '2026-05-12',
  autor: 'pessoa_a',
  humor: 4,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
});

describe('VAULT_SCHEMA_VERSION constante', () => {
  it('expoe valor 1 (contrato atual)', () => {
    expect(VAULT_SCHEMA_VERSION).toBe(1);
  });
});

describe('stringifyFrontmatter carimba _schema_version', () => {
  it('inclui _schema_version: 1 como primeira linha do YAML', () => {
    const raw = stringifyFrontmatter(FIXTURE, '');
    // YAML.stringify usa chave: valor; primeira linha apos --- deve ser
    // _schema_version.
    const linhas = raw.split('\n');
    expect(linhas[0]).toBe('---');
    expect(linhas[1]).toBe('_schema_version: 1');
  });

  it('preserva campos originais do meta apos o carimbo', () => {
    const raw = stringifyFrontmatter(FIXTURE, '');
    expect(raw).toContain('tipo: humor');
    expect(raw).toContain('data: 2026-05-12');
    expect(raw).toContain('autor: pessoa_a');
    expect(raw).toContain('humor: 4');
  });

  it('round-trip parse retorna meta sem _schema_version (zod strips)', () => {
    const raw = stringifyFrontmatter(FIXTURE, 'corpo');
    const parsed = parseFrontmatter(raw, FixtureSchema);
    expect(parsed.meta).toEqual(FIXTURE);
    // Confirma que _schema_version foi removido pelo Zod (strip default).
    expect(parsed.meta as Record<string, unknown>).not.toHaveProperty(
      '_schema_version'
    );
  });
});

describe('parseFrontmatter tolerancia de versoes', () => {
  it('aceita arquivo SEM _schema_version (compat v0)', () => {
    const raw = [
      '---',
      'tipo: humor',
      'data: 2026-05-12',
      'autor: pessoa_a',
      'humor: 4',
      '---',
      '',
    ].join('\n');
    const parsed = parseFrontmatter(raw, FixtureSchema);
    expect(parsed.meta).toEqual(FIXTURE);
  });

  it('aceita arquivo com _schema_version: 1 sem warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = [
      '---',
      '_schema_version: 1',
      'tipo: humor',
      'data: 2026-05-12',
      'autor: pessoa_a',
      'humor: 4',
      '---',
      '',
    ].join('\n');
    const parsed = parseFrontmatter(raw, FixtureSchema);
    expect(parsed.meta).toEqual(FIXTURE);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('aceita arquivo com _schema_version: 2 emitindo console.warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = [
      '---',
      '_schema_version: 2',
      'tipo: humor',
      'data: 2026-05-12',
      'autor: pessoa_a',
      'humor: 4',
      '---',
      '',
    ].join('\n');
    const parsed = parseFrontmatter(raw, FixtureSchema);
    expect(parsed.meta).toEqual(FIXTURE);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toContain('_schema_version=2');
    expect(msg).toContain('versao atual 1');
    warnSpy.mockRestore();
  });
});

describe('writeVaultFile (writer) carimba arquivo gravado', () => {
  it('escreve YAML contendo _schema_version: 1 no destino SAF', async () => {
    const uri = 'content://test/Vault/markdown/humor-2026-05-12.md';
    await writeVaultFile(uri, FIXTURE, '');
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [destino, conteudo] = mockWriteAsStringAsync.mock.calls[0] as [
      string,
      string,
    ];
    expect(destino).toBe(uri);
    expect(conteudo.startsWith('---\n_schema_version: 1\n')).toBe(true);
    // Confirma que parseFrontmatter consegue ler de volta.
    const parsed = parseFrontmatter(conteudo, FixtureSchema);
    expect(parsed.meta).toEqual(FIXTURE);
  });
});

describe('stringifyCompanionMidia carimba companion .md', () => {
  it('inclui _schema_version: 1 na primeira linha apos ---', () => {
    const out = stringifyCompanionMidia({
      tipo: 'midia_foto',
      arquivo: 'foto-2026-05-12-abcd.jpg',
      data: '2026-05-12T18:00:00-03:00',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
    });
    const linhas = out.split('\n');
    expect(linhas[0]).toBe('---');
    expect(linhas[1]).toBe('_schema_version: 1');
    expect(linhas[2]).toBe('tipo: midia_foto');
  });

  it('YAML do companion parseia para objeto com _schema_version: 1', () => {
    const out = stringifyCompanionMidia({
      tipo: 'midia_audio',
      arquivo: 'audio-2026-05-12-xyz.m4a',
      data: '2026-05-12T18:00:00-03:00',
      autor: 'pessoa_b',
      para: { tipo: 'casal' },
    });
    const match = out.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(match).not.toBeNull();
    const obj = YAML.parse(match![1]) as Record<string, unknown>;
    expect(obj._schema_version).toBe(1);
    expect(obj.tipo).toBe('midia_audio');
    expect(obj.para).toBe('casal');
  });
});
