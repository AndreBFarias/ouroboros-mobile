// Testes da funcao saveHumor. Mockamos writeVaultFile e readVaultFile
// do barrel '@/lib/vault' para isolar a logica pura sem tocar SAF.
//
// T2-LOCK-VAULT (2026-05-15): saveHumor agora sempre aplica suffix
// '-<deviceId>'. Race condition de read-then-write foi eliminada
// estruturalmente; SaveHumorResult perdeu o campo `conflito`.
import type { HumorMeta } from '@/lib/schemas/humor';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: HumorMeta; body: string } | null>,
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

import { saveHumor } from '@/lib/humor/saveHumor';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const baseHumor: HumorMeta = {
  tipo: 'humor',
  data: '2026-04-29',
  autor: 'pessoa_a',
  humor: 4,
  energia: 3,
  ansiedade: 2,
  foco: 4,
  tags: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Por padrao retorna null = arquivo nao existe.
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  // Fixa a data para os testes nao dependerem de today.
  jest.useFakeTimers().setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('saveHumor', () => {
  it('grava sempre com suffix de deviceId T2-LOCK-VAULT', async () => {
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    // T2: suffix sempre, mesmo em primeiro save do dia.
    expect(out.uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
    expect(meta).toMatchObject({
      tipo: 'humor',
      data: '2026-04-29',
      autor: 'pessoa_a',
    });
    // Corpo vazio: frase vai no frontmatter.
    expect(body).toBe('');
  });

  it('mesmo autor regravando: mesmo path (suffix do device atual)', async () => {
    // T2: existencia do canonico nao muda o path (sempre suffix).
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { ...baseHumor, humor: 1 },
      body: '',
    });
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    expect(out.uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
  });

  it('outra instalacao ja gravou: suffix sempre presente (sem race)', async () => {
    // T2: read-previo nao influencia path. Cada device escreve no seu
    // arquivo proprio sem competir pelo canonico.
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { ...baseHumor, autor: 'pessoa_b' },
      body: '',
    });
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    expect(out.uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
  });

  it('SaveHumorResult nao expoe mais o campo conflito (T2)', async () => {
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    // T2-LOCK-VAULT: removeu o campo conflito; cada device tem seu
    // proprio arquivo, conceito de conflito perde sentido no save.
    expect((out as { conflito?: boolean }).conflito).toBeUndefined();
  });

  it('rejeita payload invalido (humor=0)', async () => {
    const invalido = { ...baseHumor, humor: 0 } as HumorMeta;
    await expect(saveHumor(invalido, VAULT_ROOT)).rejects.toThrow(
      /humor invalido/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('normaliza root com barra final na concatenacao', async () => {
    await saveHumor(baseHumor, `${VAULT_ROOT}/`);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    // Nao deve haver '//' antes de markdown/.
    expect(uri).not.toContain('//markdown/');
    expect(uri).toMatch(
      /\/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/
    );
  });

  // I-HUMOR (M-SAVE-HUMOR-VALIDA): cobertura explicita dos 3 cenarios
  // de autor + edge case vaultRoot vazio + path final via vaultUriJoin
  // canonico (sem trailing space, sem %20 ofensivo, sem barras duplas).
  describe('I-HUMOR cenarios de autor', () => {
    it('autor pessoa_a grava no path canonico com suffix', async () => {
      const out = await saveHumor(
        { ...baseHumor, autor: 'pessoa_a' },
        VAULT_ROOT
      );
      expect(out.uri).toMatch(
        /markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/
      );
      const [uri, meta] = mockWriteVaultFile.mock.calls[0];
      expect(uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
      expect(meta).toMatchObject({ autor: 'pessoa_a' });
    });

    it('autor pessoa_b grava no path canonico com suffix', async () => {
      const out = await saveHumor(
        { ...baseHumor, autor: 'pessoa_b' },
        VAULT_ROOT
      );
      expect(out.uri).toMatch(
        /markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/
      );
      const [uri, meta] = mockWriteVaultFile.mock.calls[0];
      expect(uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
      expect(meta).toMatchObject({ autor: 'pessoa_b' });
    });

    it("autor 'ambos' rejeitado pelo schema (canonico atual: novo registro tem autor unico)", async () => {
      // PessoaAutorSchema (z.enum(['pessoa_a','pessoa_b'])) restringe
      // autor a um dos dois individuos. Sprint I2-AMIGOS define se/
      // como label "Casal"/"Todos" passa a entrar no autor; ate la,
      // saveHumor recusa 'ambos' com erro claro vindo do safeParse.
      const invalido = { ...baseHumor, autor: 'ambos' } as unknown as HumorMeta;
      await expect(saveHumor(invalido, VAULT_ROOT)).rejects.toThrow(
        /humor invalido/
      );
      expect(mockWriteVaultFile).not.toHaveBeenCalled();
    });
  });

  describe('I-HUMOR vaultRoot e path canonico', () => {
    it('vaultRoot vazio propaga erro claro do vaultUriJoin', async () => {
      await expect(saveHumor(baseHumor, '')).rejects.toThrow(/root vazio/);
      expect(mockWriteVaultFile).not.toHaveBeenCalled();
    });

    it('vaultRoot SAF com trailing space e %20 ofensivo limpa antes de concatenar', async () => {
      // Caso real: tree URI SAF do MIUI/HyperOS as vezes vem com
      // trailing %20 (espaco da pasta original do nome de pasta com
      // espaco). vaultUriJoin trata; saveHumor passa a contar com.
      const ROOT_SUJO =
        'content://com.android.externalstorage/tree/primary:Test%20';
      const out = await saveHumor(baseHumor, ROOT_SUJO);
      // T2: suffix sempre presente.
      expect(out.uri).toMatch(
        /^content:\/\/com\.android\.externalstorage\/tree\/primary:Test\/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/
      );
      const [uri] = mockWriteVaultFile.mock.calls[0];
      expect(uri).not.toMatch(/%20\/markdown/);
      expect(uri).not.toContain('//markdown');
    });

    it('rejeita payload sem campos obrigatorios (energia ausente)', async () => {
      // Sem energia o HumorSchema lanca; saveHumor propaga em
      // 'humor invalido: ...' antes de tocar I/O.
      const semEnergia = {
        tipo: 'humor',
        data: '2026-04-29',
        autor: 'pessoa_a',
        humor: 4,
        ansiedade: 2,
        foco: 4,
        tags: [],
      } as unknown as HumorMeta;
      await expect(saveHumor(semEnergia, VAULT_ROOT)).rejects.toThrow(
        /humor invalido/
      );
      expect(mockWriteVaultFile).not.toHaveBeenCalled();
    });
  });
});
