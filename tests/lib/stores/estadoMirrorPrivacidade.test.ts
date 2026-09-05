// AUDIT-P4-8-ESTADO-TEXTO-PURO: o espelho canonico em vault/_estado/
// nao pode carregar dado sensivel em texto puro. Antes desta sprint o
// subscriber de usePessoa mandava `nomes` e `fotos` (nomes reais das
// duas pessoas) e o de useSessao mandava `rascunhos` (corpo do diario,
// humor e ciclo AINDA nao confirmados pelo usuario) para um .md que o
// Syncthing sincroniza e que o usuario pode copiar ou exportar.
//
// Mesmo raciocinio ja aplicado aos tokens OAuth em
// EstadoIntegracoesSchema: dado sensivel fica no SecureStore, o .md
// carrega so o que serve de diagnostico.
//
// Estrategia (mesma de settingsMirror.test.ts):
//   - escreverEstadoCanonico mockado para observar o payload.
//   - useVault.getState mockado com vaultRoot != null (subscriber so
//     dispara escrita quando o vault esta autorizado).
//   - stores REAIS para exercitar os subscribers registrados no
//     module load.
//
// A ultima metade prova o choke-point: mesmo que um caller futuro
// volte a passar os campos, o schema strippa antes do write (o
// writeVaultFile recebe `result.data`, nao o payload cru).
//
// Comentarios sem acento (convencao shell/CI).

const mockEscreverDebounced = jest.fn();

jest.mock('@/lib/vault/escreverEstado', () => ({
  __esModule: true,
  escreverEstadoCanonico: (...args: unknown[]) =>
    mockEscreverDebounced(...args),
  escreverEstadoCanonicoImediato: jest.fn().mockResolvedValue(undefined),
}));

const mockUseVaultState = {
  vaultRoot: 'content://test/vault' as string | null,
};
jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => mockUseVaultState,
  },
}));

import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import {
  EstadoPessoaSchema,
  EstadoSessaoSchema,
  ESTADO_SCHEMA_VERSION,
} from '@/lib/schemas/vault_estado';

const NOME_SECRETO = 'Nome_Secreto';
const TEXTO_SECRETO = 'texto secreto do diario nao confirmado';

// Ultimo payload espelhado para uma key, ou undefined se nenhum.
function ultimoPayload(key: string): Record<string, unknown> | undefined {
  const chamadas = mockEscreverDebounced.mock.calls.filter((c) => c[0] === key);
  if (chamadas.length === 0) return undefined;
  return chamadas[chamadas.length - 1][1] as Record<string, unknown>;
}

describe('mirror canonico de _estado: privacidade do payload', () => {
  beforeEach(() => {
    mockEscreverDebounced.mockClear();
    mockUseVaultState.vaultRoot = 'content://test/vault';
    usePessoa.getState().resetar();
    useSessao.getState().resetar();
    mockEscreverDebounced.mockClear();
  });

  it('payload de pessoa nao leva nomes nem fotos', () => {
    usePessoa.getState().setNome('pessoa_a', NOME_SECRETO);
    usePessoa.getState().setFoto('pessoa_a', 'file:///foto-pessoa-a.jpg');

    const payload = ultimoPayload('pessoa');
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty('nomes');
    expect(payload).not.toHaveProperty('fotos');
    expect(JSON.stringify(payload)).not.toContain(NOME_SECRETO);
    expect(JSON.stringify(payload)).not.toContain('file:///foto-pessoa-a.jpg');
  });

  it('payload de pessoa mantem os identificadores canonicos', () => {
    usePessoa.getState().setFiltroPessoa('ambos');

    const payload = ultimoPayload('pessoa');
    expect(payload).toMatchObject({
      pessoaAtiva: 'pessoa_a',
      filtroPessoa: 'ambos',
    });
  });

  it('payload de sessao nao leva o corpo dos rascunhos', () => {
    useSessao.getState().salvarRascunho('diarioEmocional', {
      texto: TEXTO_SECRETO,
    });

    const payload = ultimoPayload('sessao');
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty('rascunhos');
    expect(JSON.stringify(payload)).not.toContain(TEXTO_SECRETO);
  });

  it('payload de sessao mantem rota, permissoes e flags', () => {
    useSessao.getState().setUltimaRota('/saude-emocional');

    const payload = ultimoPayload('sessao');
    expect(payload).toMatchObject({ ultimaRota: '/saude-emocional' });
    expect(payload).toHaveProperty('permissoesPedidas');
    expect(payload).toHaveProperty('flags');
  });

  it('schema strippa nomes, fotos e rascunhos se um caller insistir', () => {
    const pessoa = EstadoPessoaSchema.safeParse({
      version: ESTADO_SCHEMA_VERSION,
      pessoaAtiva: 'pessoa_a',
      filtroPessoa: 'ambos',
      nomes: { pessoa_a: NOME_SECRETO, pessoa_b: NOME_SECRETO },
      fotos: { pessoa_a: null, pessoa_b: null },
      atualizadoEm: '2026-09-05T10:00:00-03:00',
    });
    expect(pessoa.success).toBe(true);
    expect(JSON.stringify(pessoa.data)).not.toContain(NOME_SECRETO);

    const sessao = EstadoSessaoSchema.safeParse({
      version: ESTADO_SCHEMA_VERSION,
      ultimaRota: null,
      rascunhos: { diarioEmocional: { texto: TEXTO_SECRETO } },
      permissoesPedidas: {
        storage: false,
        notif: false,
        camera: false,
        mic: false,
      },
      flags: {
        canalV1Deletado: false,
        cacheAgendaMigrado: false,
        vaultLayoutMigrado: false,
        t2DeviceIdSuffixMigrado: false,
        estadoMigradoParaVault: false,
      },
      atualizadoEm: '2026-09-05T10:00:00-03:00',
    });
    expect(sessao.success).toBe(true);
    expect(JSON.stringify(sessao.data)).not.toContain(TEXTO_SECRETO);
  });
});
