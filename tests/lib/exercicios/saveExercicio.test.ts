// Testes do saveExercicio. Mocka escreverExercicio e
// expo-file-system/legacy.copyAsync/getInfoAsync para isolar logica
// de copia de GIF.
import type { Exercicio } from '@/lib/schemas/exercicio';

const mockEscreverExercicio = jest.fn();

// Mocka direto o modulo de exercicios do vault. Evita o barrel
// para nao puxar dependencias laterais.
jest.mock('@/lib/vault/exercicios', () => {
  const actual = jest.requireActual('@/lib/vault/exercicios');
  return {
    ...actual,
    escreverExercicio: (...args: unknown[]) => mockEscreverExercicio(...args),
  };
});

const mockCopyAsync = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

import { saveExercicio, GIF_MAX_BYTES } from '@/lib/exercicios/saveExercicio';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const exercicioBase: Exercicio = {
  tipo: 'exercicio',
  slug: 'agachamento-livre',
  nome: 'Agachamento livre',
  grupo_muscular: ['pernas'],
  nivel: 'intermediario',
  equipamento: 'barra',
  instrucao: 'desca ate paralela e suba.',
  dicas: [],
  gif: '',
  historico: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
  mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
  mockEscreverExercicio.mockResolvedValue({
    uri: 'content://test/exercicios/agachamento-livre.md',
  });
});

describe('saveExercicio', () => {
  it('grava sem GIF quando gifTemporario e null', async () => {
    const out = await saveExercicio({
      meta: exercicioBase,
      vaultRoot: VAULT_ROOT,
      gifTemporario: null,
    });
    expect(out.gifGravado).toBeNull();
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockEscreverExercicio).toHaveBeenCalledTimes(1);
  });

  it('copia GIF para gif/exercicio-<slug>.gif quando fornecido (H2 layout-por-tipo)', async () => {
    const out = await saveExercicio({
      meta: exercicioBase,
      vaultRoot: VAULT_ROOT,
      gifTemporario: 'file:///tmp/agachamento.gif',
    });
    expect(out.gifGravado).toBe('gif/exercicio-agachamento-livre.gif');
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'file:///tmp/agachamento.gif',
      to: expect.stringContaining('gif/exercicio-agachamento-livre.gif'),
    });
    // Meta passado a escreverExercicio inclui gif atualizado.
    expect(mockEscreverExercicio).toHaveBeenCalledWith(
      VAULT_ROOT,
      expect.objectContaining({
        gif: 'gif/exercicio-agachamento-livre.gif',
      }),
      ''
    );
  });

  it('rejeita GIF maior que 5MB', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({
      exists: true,
      size: GIF_MAX_BYTES + 1,
    });
    await expect(
      saveExercicio({
        meta: exercicioBase,
        vaultRoot: VAULT_ROOT,
        gifTemporario: 'file:///tmp/grande.gif',
      })
    ).rejects.toThrow(/limite/);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('rejeita meta invalido antes de tocar I/O', async () => {
    await expect(
      saveExercicio({
        meta: { ...exercicioBase, slug: 'Slug Invalido' },
        vaultRoot: VAULT_ROOT,
        gifTemporario: null,
      })
    ).rejects.toThrow(/exercicio invalido/);
    expect(mockEscreverExercicio).not.toHaveBeenCalled();
  });

  it('preserva body quando fornecido', async () => {
    await saveExercicio({
      meta: exercicioBase,
      body: 'corpo livre em markdown.',
      vaultRoot: VAULT_ROOT,
      gifTemporario: null,
    });
    expect(mockEscreverExercicio).toHaveBeenCalledWith(
      VAULT_ROOT,
      expect.anything(),
      'corpo livre em markdown.'
    );
  });

  // I-EXERCICIO: vaultUriJoin canonico limpa trailing %20 do SAF root
  // antes de copyAsync. Sem isso, copyAsync({ from, to }) lancava
  // IOException com 'directory cannot be created' (screenshot empirico
  // 466875db).
  it('produz path final do GIF via vaultUriJoin (limpa trailing %20)', async () => {
    const rootSujo = `${VAULT_ROOT}%20`;
    await saveExercicio({
      meta: exercicioBase,
      vaultRoot: rootSujo,
      gifTemporario: 'file:///tmp/agachamento.gif',
    });
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'file:///tmp/agachamento.gif',
      to: `${VAULT_ROOT}/gif/exercicio-agachamento-livre.gif`,
    });
    // Sem barras duplas no path final (so a do scheme content://).
    const callArg = mockCopyAsync.mock.calls[0][0] as { to: string };
    expect(callArg.to.split('//').length).toBe(2);
  });

  // I-EXERCICIO: cross-link frontmatter -- meta.gif aponta para o
  // path relativo do binario (gif/exercicio-<slug>.gif). Garante que
  // o leitor consegue achar o GIF a partir do .md.
  it('linka frontmatter gif ao path relativo do binario gravado', async () => {
    const out = await saveExercicio({
      meta: exercicioBase,
      vaultRoot: VAULT_ROOT,
      gifTemporario: 'file:///tmp/x.gif',
    });
    // Path relativo retornado em gifGravado bate com o que vai no
    // frontmatter (cross-link consistente).
    expect(out.gifGravado).toBe('gif/exercicio-agachamento-livre.gif');
    expect(mockEscreverExercicio).toHaveBeenCalledWith(
      VAULT_ROOT,
      expect.objectContaining({ gif: out.gifGravado }),
      ''
    );
  });

  // I-EXERCICIO: vaultUriJoin lanca erro claro quando root vazio
  // (sentinel de bug em estado anterior do app, ADR-0023). Cobre o
  // caso GIF -- vaultRoot vazio nao chega nem a tentar copy.
  it('lanca erro quando vaultRoot vazio (com GIF)', async () => {
    await expect(
      saveExercicio({
        meta: exercicioBase,
        vaultRoot: '',
        gifTemporario: 'file:///tmp/x.gif',
      })
    ).rejects.toThrow(/vaultUriJoin: root vazio/);
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockEscreverExercicio).not.toHaveBeenCalled();
  });
});
