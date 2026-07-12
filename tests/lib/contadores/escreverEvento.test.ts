// Testes do writer escreverEventoContador (R-RECAP-5, 2026-05-16).
// Valida path canonico T2 (com suffix de deviceId), validacao
// defensiva e erro claro em vaultRoot vazio.
//
// Mocks: writer/deviceId para isolar I/O.
//
// Comentarios sem acento (convencao shell/CI).
import type { EventoContador } from '@/lib/schemas/evento_contador';

const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import { escreverEventoContador } from '@/lib/contadores/escreverEvento';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<EventoContador> = {}): EventoContador {
  return {
    tipo: 'evento_contador',
    contadorId: 'sem-cigarro',
    data: '2026-05-16',
    slug: 'almoco-leve-abcd',
    humor: 4,
    descricao: 'Almoco leve no parque',
    tags: ['foco'],
    midias: [],
    criado_em: '2026-05-16T14:00:00-03:00',
    autor: 'pessoa_a',
    para: { tipo: 'mim' },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('escreverEventoContador', () => {
  it('grava arquivo com suffix de deviceId (T2-LOCK-VAULT)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture();
    const { rel, uri } = await escreverEventoContador({
      vaultRoot: VAULT_ROOT,
      meta,
    });
    // Path canonico: markdown/evento-contador-<contadorId>-<data>-<slug>.md
    // Com suffix T2: ...-<slug>-ouro-<6chars>.md.
    expect(rel).toMatch(
      /^markdown\/evento-contador-sem-cigarro-2026-05-16-almoco-leve-abcd-ouro-[a-z0-9]{6}\.md$/
    );
    expect(uri).toBe(`${VAULT_ROOT}/${rel}`);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [, gravado] = mockWriteVaultFile.mock.calls[0];
    expect(gravado).toEqual(
      expect.objectContaining({
        tipo: 'evento_contador',
        contadorId: 'sem-cigarro',
        humor: 4,
      })
    );
  });

  it('grava body vazio por default', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverEventoContador({
      vaultRoot: VAULT_ROOT,
      meta: fixture(),
    });
    const [, , body] = mockWriteVaultFile.mock.calls[0];
    expect(body).toBe('');
  });

  it('grava body customizado quando fornecido', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverEventoContador({
      vaultRoot: VAULT_ROOT,
      meta: fixture(),
      body: 'Anotacao livre adicional.',
    });
    const [, , body] = mockWriteVaultFile.mock.calls[0];
    expect(body).toBe('Anotacao livre adicional.');
  });

  it('rejeita meta invalido (humor fora de range)', async () => {
    const inv = fixture({ humor: 99 });
    await expect(
      escreverEventoContador({ vaultRoot: VAULT_ROOT, meta: inv })
    ).rejects.toThrow(/evento_contador invalido/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('rejeita meta sem descricao e sem midia', async () => {
    const inv = fixture({ descricao: '', midias: [] });
    await expect(
      escreverEventoContador({ vaultRoot: VAULT_ROOT, meta: inv })
    ).rejects.toThrow(/evento_contador invalido/);
  });

  it('lanca erro quando vaultRoot vazio (sentinel de bug)', async () => {
    await expect(
      escreverEventoContador({ vaultRoot: '', meta: fixture() })
    ).rejects.toThrow(/vaultUriJoin: root vazio/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('aceita meta com midias e descricao vazia', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverEventoContador({
      vaultRoot: VAULT_ROOT,
      meta: fixture({
        descricao: '',
        midias: [{ tipo: 'foto', path: 'jpg/foto-2026-05-16-abc.jpg' }],
      }),
    });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('preserva tags no frontmatter', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverEventoContador({
      vaultRoot: VAULT_ROOT,
      meta: fixture({ tags: ['gratidão', 'paz', 'foco'] }),
    });
    const [, gravado] = mockWriteVaultFile.mock.calls[0];
    expect((gravado as EventoContador).tags).toEqual([
      'gratidão',
      'paz',
      'foco',
    ]);
  });

  it('produz path com contadorId diferente', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture({ contadorId: 'sem-acucar' });
    const { rel } = await escreverEventoContador({
      vaultRoot: VAULT_ROOT,
      meta,
    });
    expect(rel).toMatch(/evento-contador-sem-acucar-/);
  });
});
