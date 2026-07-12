// R-BACKUP-AUTO -- testes do schema BackupSnapshot.
//
// Cobre:
//   1. Schema valida shape completo + tipos.
//   2. Schema recusa shape invalido (versao errada, sha curto, origem
//      vazia, datetime sem offset).
//   3. Serializar -> parse round-trip preserva todos os campos.
//   4. parseFrontmatter ignora corpo apos o segundo '---'.
//   5. parseFrontmatter devolve null em texto invalido.

import {
  BackupSnapshotSchema,
  BACKUP_SNAPSHOT_SCHEMA_VERSION,
  serializarFrontmatter,
  parseFrontmatter,
  type BackupSnapshot,
} from '@/lib/schemas/backup_snapshot';

const SNAP_VALIDO: BackupSnapshot = {
  tipo: 'backup_snapshot',
  versao: BACKUP_SNAPSHOT_SCHEMA_VERSION,
  criado_em: '2026-05-17T03:42:00-03:00',
  origem: 'ouro-abc123',
  arquivos_incluidos: 42,
  bytes_totais: 1024 * 500,
  sha256: 'a'.repeat(64),
};

describe('BackupSnapshotSchema', () => {
  it('aceita shape valido completo', () => {
    const r = BackupSnapshotSchema.safeParse(SNAP_VALIDO);
    expect(r.success).toBe(true);
  });

  it('recusa versao errada', () => {
    const invalido = { ...SNAP_VALIDO, versao: 999 };
    const r = BackupSnapshotSchema.safeParse(invalido);
    expect(r.success).toBe(false);
  });

  it('recusa sha256 fora do formato hex 64', () => {
    const curto = { ...SNAP_VALIDO, sha256: 'abc' };
    const com_g = { ...SNAP_VALIDO, sha256: 'g'.repeat(64) };
    expect(BackupSnapshotSchema.safeParse(curto).success).toBe(false);
    expect(BackupSnapshotSchema.safeParse(com_g).success).toBe(false);
  });

  it('recusa origem vazia', () => {
    const semOrigem = { ...SNAP_VALIDO, origem: '' };
    expect(BackupSnapshotSchema.safeParse(semOrigem).success).toBe(false);
  });

  it('recusa criado_em sem offset/Z', () => {
    const semOffset = {
      ...SNAP_VALIDO,
      criado_em: '2026-05-17T03:42:00',
    };
    expect(BackupSnapshotSchema.safeParse(semOffset).success).toBe(false);
  });

  it('aceita criado_em com Z', () => {
    const comZ = {
      ...SNAP_VALIDO,
      criado_em: '2026-05-17T03:42:00.000Z',
    };
    expect(BackupSnapshotSchema.safeParse(comZ).success).toBe(true);
  });

  it('recusa arquivos_incluidos negativo', () => {
    const neg = { ...SNAP_VALIDO, arquivos_incluidos: -1 };
    expect(BackupSnapshotSchema.safeParse(neg).success).toBe(false);
  });
});

describe('serializarFrontmatter + parseFrontmatter round-trip', () => {
  it('preserva todos os campos canonicos', () => {
    const md = serializarFrontmatter(SNAP_VALIDO);
    expect(md.startsWith('---\n')).toBe(true);
    expect(md.includes('tipo: backup_snapshot')).toBe(true);
    expect(md.includes('versao: 1')).toBe(true);
    expect(md.includes('"' + SNAP_VALIDO.sha256 + '"')).toBe(true);
    const parsed = parseFrontmatter(md);
    expect(parsed).not.toBeNull();
    expect(parsed).toEqual(SNAP_VALIDO);
  });

  it('parseFrontmatter ignora corpo apos segundo ---', () => {
    const md =
      serializarFrontmatter(SNAP_VALIDO) +
      '\nCorpo livre: notas humanas sobre o backup.\nNao deve afetar parse.\n';
    const parsed = parseFrontmatter(md);
    expect(parsed).toEqual(SNAP_VALIDO);
  });

  it('parseFrontmatter devolve null em texto sem frontmatter', () => {
    expect(parseFrontmatter('apenas corpo, sem ---')).toBeNull();
  });

  it('parseFrontmatter devolve null em frontmatter com campo invalido', () => {
    const md =
      '---\n' +
      'tipo: backup_snapshot\n' +
      'versao: 1\n' +
      'criado_em: "2026-05-17T03:42:00-03:00"\n' +
      'origem: ""\n' +
      'arquivos_incluidos: 0\n' +
      'bytes_totais: 0\n' +
      'sha256: "abc"\n' +
      '---\n';
    expect(parseFrontmatter(md)).toBeNull();
  });
});
