// Testes da funcao saveEvento. Mocka writeVaultFile e readVaultFile
// do barrel '@/lib/vault' para isolar a logica pura sem tocar SAF;
// mocka expo-file-system/legacy.copyAsync e writeAsStringAsync para
// validar a copia das fotos e do companion .md sem mexer no
// filesystem real.
//
// M-VAULT-MD-FIX-evento-fotos (2026-05-04): destino dos binarios
// migrou de assets/<prefixo>-evento-<idx>.jpg para
// media/fotos/<YYYY-MM-DD>-eventos-<rand4>-<idx>.jpg + companion .md
// ao lado. Math.random e' fixado com spy para tornar rand
// deterministico (rand4 = "0000" quando random = 0).
import type { EventoMeta } from '@/lib/schemas/evento';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: EventoMeta; body: string } | null>,
  [string, unknown]
>();

jest.mock('@/lib/vault', () => {
  const actual = jest.requireActual('@/lib/vault');
  return {
    ...actual,
    writeVaultFile: (...args: [string, unknown, string]) =>
      mockWriteVaultFile(...args),
    readVaultFile: (...args: [string, unknown]) => mockReadVaultFile(...args),
  };
});

const mockCopyAsync = jest.fn<Promise<void>, [{ from: string; to: string }]>();
const mockWriteAsStringAsync = jest.fn<Promise<void>, [string, string]>();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: [{ from: string; to: string }]) =>
    mockCopyAsync(...args),
  writeAsStringAsync: (...args: [string, string]) =>
    mockWriteAsStringAsync(...args),
}));

import { saveEvento } from '@/lib/eventos/saveEvento';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const baseMeta: EventoMeta = {
  tipo: 'evento',
  data: '2026-04-29T15:30:00-03:00',
  autor: 'pessoa_a',
  modo: 'positivo',
  lugar: 'padaria da esquina',
  bairro: 'Vila Madalena',
  com: ['pessoa_b'],
  categoria: 'rolezinho',
  intensidade: 4,
  fotos: [],
  // M07.x: positivo exige ao menos uma midia. Saveevento nao reaplica
  // refine, mas mantemos populado para refletir o caminho real.
  midia: [{ tipo: 'foto', path: 'assets/2026-04-29-1530-stub.jpg' }],
  para: { tipo: 'mim' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockCopyAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  // Fixa relogio para path canonico determinista. 2026-04-29 12:00
  // UTC = 09:00 em Sao Paulo (UTC-3).
  jest.useFakeTimers().setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
  // Math.random fixado em 0 -> suffixCurto() retorna "0000". Mantem
  // rand4 deterministico nos asserts. Restaurado em afterEach.
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('saveEvento caminho feliz', () => {
  it('grava no path canonico com slug do bairro', async () => {
    const out = await saveEvento({
      meta: baseMeta,
      body: 'cafe da manha gostoso.',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/markdown\/evento-2026-04-29-vila-madalena\.md$/);
    expect(out.fotosGravadas).toEqual([]);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('markdown/evento-2026-04-29-vila-madalena.md');
    expect(meta).toMatchObject({
      tipo: 'evento',
      autor: 'pessoa_a',
      modo: 'positivo',
      lugar: 'padaria da esquina',
      bairro: 'Vila Madalena',
      categoria: 'rolezinho',
    });
    expect(body).toBe('cafe da manha gostoso.');
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('usa slug do texto quando bairro vazio', async () => {
    const semBairro: EventoMeta = { ...baseMeta, bairro: undefined };
    const out = await saveEvento({
      meta: semBairro,
      body: 'cafe da manha no parque.',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/markdown\/evento-2026-04-29-cafe-da-manha\.md$/);
  });

  it('usa slug da categoria quando bairro e texto vazios', async () => {
    const minimo: EventoMeta = {
      ...baseMeta,
      bairro: undefined,
      categoria: 'evento_social',
    };
    const out = await saveEvento({
      meta: minimo,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/markdown\/evento-2026-04-29-evento-social\.md$/);
  });

  it('normaliza root com barra final na concatenacao', async () => {
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: `${VAULT_ROOT}/`,
      fotos: [],
    });
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).not.toContain('//markdown/');
    expect(uri).toMatch(/\/markdown\/evento-/);
  });
});

describe('saveEvento fotos copiadas', () => {
  it('copia cada foto para jpg/ e atualiza meta.fotos (H2 layout-por-tipo)', async () => {
    const out = await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: ['file:///cache/img-temp-1.jpg', 'file:///cache/img-temp-2.jpg'],
    });
    expect(mockCopyAsync).toHaveBeenCalledTimes(2);
    expect(out.fotosGravadas).toHaveLength(2);
    // Paths gravados ficam relativos ao Vault sob media/fotos/ com
    // prefixo "eventos-" + rand4 + indice. Math.random fixado em 0
    // -> suffixCurto() = "0000". Data YYYY-MM-DD vem de formatDateYmd
    // que normaliza para Sao Paulo (UTC-3).
    expect(out.fotosGravadas[0]).toMatch(
      /^jpg\/2026-04-29-eventos-0000-1\.jpg$/
    );
    expect(out.fotosGravadas[1]).toMatch(
      /^jpg\/2026-04-29-eventos-0000-2\.jpg$/
    );
    // O meta gravado tem fotos com paths relativos (nao URIs locais).
    const [, metaGravado] = mockWriteVaultFile.mock.calls[0];
    expect((metaGravado as EventoMeta).fotos).toEqual(out.fotosGravadas);
  });

  it('cada copyAsync recebe URI completo de destino dentro do Vault', async () => {
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: ['file:///cache/img.jpg'],
    });
    const [arg] = mockCopyAsync.mock.calls[0];
    expect(arg.from).toBe('file:///cache/img.jpg');
    expect(arg.to).toMatch(/Vault\/jpg\/2026-04-29-eventos-0000-1\.jpg$/);
  });

  it('grava companion .md ao lado de cada foto', async () => {
    await saveEvento({
      meta: baseMeta,
      body: 'cafe da manha gostoso.',
      vaultRoot: VAULT_ROOT,
      fotos: ['file:///cache/img-1.jpg', 'file:///cache/img-2.jpg'],
    });
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(2);
    // Companion .md ao lado do binario: mesmo nome, extensao trocada.
    const [destino1, conteudo1] = mockWriteAsStringAsync.mock.calls[0];
    expect(destino1).toMatch(/Vault\/markdown\/2026-04-29-eventos-0000-1\.md$/);
    // Frontmatter canonico midia_foto com legenda referenciando o
    // evento de origem (rastreabilidade reversa galeria -> evento).
    expect(conteudo1).toContain('tipo: midia_foto');
    expect(conteudo1).toContain('arquivo: 2026-04-29-eventos-0000-1.jpg');
    expect(conteudo1).toContain('autor: pessoa_a');
    expect(conteudo1).toContain('para: mim');
    // Slug do evento base e' "vila-madalena" (bairro).
    expect(conteudo1).toContain('legenda: "evento 2026-04-29 vila-madalena"');
    const [destino2] = mockWriteAsStringAsync.mock.calls[1];
    expect(destino2).toMatch(/Vault\/markdown\/2026-04-29-eventos-0000-2\.md$/);
  });

  it('lista vazia de fotos nao chama copyAsync nem writeAsStringAsync', async () => {
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });
});

describe('saveEvento validacao', () => {
  it('rejeita meta com intensidade fora do intervalo', async () => {
    const invalido = { ...baseMeta, intensidade: 9 } as unknown as EventoMeta;
    await expect(
      saveEvento({
        meta: invalido,
        body: '',
        vaultRoot: VAULT_ROOT,
        fotos: [],
      })
    ).rejects.toThrow(/evento invalido/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('rejeita meta com data fora de ISO 8601', async () => {
    const invalido = {
      ...baseMeta,
      data: 'ontem de manha',
    } as unknown as EventoMeta;
    await expect(
      saveEvento({
        meta: invalido,
        body: '',
        vaultRoot: VAULT_ROOT,
        fotos: [],
      })
    ).rejects.toThrow(/evento invalido/);
  });
});

describe('saveEvento I-EVENTO vaultUriJoin canonico', () => {
  it('rejeita save quando vaultRoot vazio (helper canonico vaultUriJoin)', async () => {
    await expect(
      saveEvento({
        meta: baseMeta,
        body: 'cafe da manha gostoso.',
        vaultRoot: '',
        fotos: [],
      })
    ).rejects.toThrow(/vaultUriJoin/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('elimina trailing whitespace e %20 ofensivo no root SAF', async () => {
    // Cenario A29: tree URI SAF com trailing space (MIUI/OneUI/HyperOS).
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: `${VAULT_ROOT}%20`,
      fotos: [],
    });
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).not.toMatch(/%20\//);
    expect(uri).toMatch(/Vault\/markdown\/evento-/);
  });

  it('salva modo positivo no path canonico via vaultUriJoin', async () => {
    const out = await saveEvento({
      meta: { ...baseMeta, modo: 'positivo' },
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toBe(
      `${VAULT_ROOT}/markdown/evento-2026-04-29-vila-madalena.md`
    );
    const [, metaGravado] = mockWriteVaultFile.mock.calls[0];
    expect((metaGravado as EventoMeta).modo).toBe('positivo');
  });

  it('salva modo negativo no path canonico via vaultUriJoin', async () => {
    const negativo: EventoMeta = {
      ...baseMeta,
      modo: 'negativo',
      // Em negativo, midia nao e' obrigatoria pelo refine; mantemos
      // vazio para refletir caminho real do caller (FotosBlock + sem
      // MidiaPicker preenchido).
      midia: [],
    };
    const out = await saveEvento({
      meta: negativo,
      body: 'discussao desagradavel.',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toBe(
      `${VAULT_ROOT}/markdown/evento-2026-04-29-vila-madalena.md`
    );
    const [, metaGravado] = mockWriteVaultFile.mock.calls[0];
    expect((metaGravado as EventoMeta).modo).toBe('negativo');
    expect((metaGravado as EventoMeta).midia).toEqual([]);
  });

  it('positivo com foto cross-link: companion .md em markdown/<basename>.md e binario em jpg/<basename>.jpg', async () => {
    const out = await saveEvento({
      meta: baseMeta,
      body: 'almoco no lugar novo.',
      vaultRoot: VAULT_ROOT,
      fotos: ['file:///cache/foto.jpg'],
    });
    // Binario sob jpg/.
    expect(out.fotosGravadas[0]).toBe('jpg/2026-04-29-eventos-0000-1.jpg');
    // Companion .md ao lado, mesmo basename, em markdown/.
    const [companionUri] = mockWriteAsStringAsync.mock.calls[0];
    expect(companionUri).toBe(
      `${VAULT_ROOT}/markdown/2026-04-29-eventos-0000-1.md`
    );
    // copyAsync recebe URI completo do binario montado via vaultUriJoin.
    const [{ to: copyTo }] = mockCopyAsync.mock.calls[0];
    expect(copyTo).toBe(`${VAULT_ROOT}/jpg/2026-04-29-eventos-0000-1.jpg`);
  });

  it('sem bairro: slug deriva do texto livre via vaultUriJoin', async () => {
    const semBairro: EventoMeta = { ...baseMeta, bairro: undefined };
    const out = await saveEvento({
      meta: semBairro,
      body: 'rolezinho no parque.',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    // Slug deriva do texto via slugifyEvento (kebab-case ASCII).
    expect(out.uri).toMatch(
      new RegExp(
        `^${VAULT_ROOT.replace(/[/.]/g, '\\$&')}/markdown/evento-2026-04-29-[a-z0-9-]+\\.md$`
      )
    );
    expect(out.uri).not.toContain('//markdown/');
  });
});

describe('saveEvento conflito de path', () => {
  it('M38: aplica suffix deviceId quando arquivo canonico ja existe', async () => {
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      if (/-vila-madalena\.md$/.test(uri)) {
        return Promise.resolve({ meta: baseMeta, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    // M38: cobre 4 nos via -<deviceId> (substituiu -1/-2 numericos).
    expect(out.uri).toMatch(/-vila-madalena-ouro-[a-z0-9]{6}\.md$/);
  });

  it('M38: fallback timestamp se ate suffix deviceId colidir', async () => {
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      if (/-vila-madalena(-ouro-[a-z0-9]{6})?\.md$/.test(uri)) {
        return Promise.resolve({ meta: baseMeta, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/-vila-madalena-ouro-[a-z0-9]{6}-\d{10,}\.md$/);
  });
});
