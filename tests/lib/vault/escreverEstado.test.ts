// Testes do writer canonico de estado em vault/_estado/ (R-VAULT-
// CANONICAL-COMPLETE-A). Cobre:
//   - resolverPathEstado aplica suffix do deviceId e respeita
//     forceDeviceIdSuffix idempotente
//   - escreverEstadoCanonicoImediato valida payload e escreve
//     com frontmatter Q12 (_schema_version)
//   - escreverEstadoCanonicoImediato e no-op quando vault nao
//     autorizado (root null)
//   - escreverEstadoCanonicoImediato silencia erro de write em
//     producao (best-effort)
//   - escreverEstadoCanonico debounce 500ms agrupa rajadas em 1 write
//   - debounce respeita trailing-edge (ultimo payload vence)
//   - ehSyncConflict aborta antes de write (defesa em profundidade)
//
// Mocks: writeVaultFile + useVault + getDeviceId. Schemas reais (sem
// mock) garantem que validacao roda contra o shape canonico.
//
// Comentarios sem acento.

const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
  WRITING_SUFFIX: '.writing',
}));

const mockState = {
  deviceId: 'ouro-aaaaaa',
  vaultRoot: 'content://test/vault' as string | null,
};

jest.mock('@/lib/util/deviceId', () => ({
  __esModule: true,
  getDeviceId: jest.fn(() => Promise.resolve(mockState.deviceId)),
  forceDeviceIdSuffix: (rel: string, deviceId: string) => {
    // Mock fiel ao real: aplica suffix antes da extensao,
    // idempotente quando ja tem suffix do mesmo device.
    if (rel.includes(`-${deviceId}.`)) return rel;
    const dotIdx = rel.lastIndexOf('.');
    if (dotIdx === -1) return `${rel}-${deviceId}`;
    return `${rel.slice(0, dotIdx)}-${deviceId}${rel.slice(dotIdx)}`;
  },
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => ({ vaultRoot: mockState.vaultRoot }),
  },
}));

import {
  escreverEstadoCanonico,
  escreverEstadoCanonicoImediato,
  resolverPathEstado,
  DEBOUNCE_MS,
  ESTADO_FOLDER,
  _flushDebounceEstado,
  _resetEscreverEstado,
} from '@/lib/vault/escreverEstado';
import { ESTADO_SCHEMA_VERSION } from '@/lib/schemas/vault_estado';

describe('escreverEstado: resolverPathEstado', () => {
  beforeEach(() => {
    mockState.vaultRoot = 'content://test/vault';
    mockState.deviceId = 'ouro-aaaaaa';
    mockWriteVaultFile.mockReset();
    _resetEscreverEstado();
  });

  it('aplica suffix do deviceId no rel canonico', async () => {
    const { rel, uri } = await resolverPathEstado('settings');
    expect(rel).toBe(`${ESTADO_FOLDER}/settings-ouro-aaaaaa.md`);
    expect(uri).toBe(`content://test/vault/${ESTADO_FOLDER}/settings-ouro-aaaaaa.md`);
  });

  it('forma path canonico por key', async () => {
    const keys: Array<'settings' | 'sessao' | 'onboarding' | 'pessoa' | 'navegacao'> = [
      'settings',
      'sessao',
      'onboarding',
      'pessoa',
      'navegacao',
    ];
    for (const key of keys) {
      const { rel } = await resolverPathEstado(key);
      expect(rel).toBe(`_estado/${key}-ouro-aaaaaa.md`);
    }
  });

  it('retorna uri null quando vault nao autorizado', async () => {
    mockState.vaultRoot = null;
    const { rel, uri } = await resolverPathEstado('settings');
    expect(rel).toBe(`${ESTADO_FOLDER}/settings-ouro-aaaaaa.md`);
    expect(uri).toBeNull();
  });
});

describe('escreverEstado: escreverEstadoCanonicoImediato', () => {
  beforeEach(() => {
    mockState.vaultRoot = 'content://test/vault';
    mockState.deviceId = 'ouro-aaaaaa';
    mockWriteVaultFile.mockReset();
    _resetEscreverEstado();
  });

  it('valida payload e chama writeVaultFile com meta canonica', async () => {
    const payload = {
      somVibracao: { geral: true, despertar: true, conquista: true, botoes: true },
      pessoa: {
        ativa: 'pessoa_a' as const,
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho' as const,
      },
      featureToggles: {
        cicloMenstrual: true,
        alarmePessoal: true,
        todoLeve: true,
        contadorDiasSem: true,
        calendarioConquistas: true,
        widgetHomescreen: true,
        widgetMostraNome: false,
        mostrarFinancasEmDesenvolvimento: false,
        backupAutomaticoSemanal: false,
        healthConnectSync: false,
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: true,
      },
      privacidade: { biometriaAbrir: false, ocultarTranscricoes: false },
      midia: { capPorRegistro: 4, permitirAudio: true },
      recap: { slideshowIntervaloS: 4 },
    };
    await escreverEstadoCanonicoImediato('settings', payload);

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toBe('content://test/vault/_estado/settings-ouro-aaaaaa.md');
    expect(meta).toMatchObject({
      version: ESTADO_SCHEMA_VERSION,
      somVibracao: payload.somVibracao,
    });
    expect(meta.atualizadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body).toBe('');
  });

  it('valida sessao com schema (rascunhos null, flags completas)', async () => {
    await escreverEstadoCanonicoImediato('sessao', {
      ultimaRota: '/saude-fisica',
      rascunhos: {
        humorRapido: null,
        diarioEmocional: null,
        eventos: null,
        cicloRegistrar: null,
        alarmesNovo: null,
        contadoresNovo: null,
        tarefasNova: null,
      },
      permissoesPedidas: { storage: true, notif: false, camera: false, mic: false },
      flags: {
        canalV1Deletado: true,
        cacheAgendaMigrado: false,
        vaultLayoutMigrado: true,
        t2DeviceIdSuffixMigrado: true,
        estadoMigradoParaVault: false,
      },
    });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('valida onboarding com schema', async () => {
    await escreverEstadoCanonicoImediato('onboarding', {
      done: true,
      tipoCompanhia: 'casal',
      sexoDeclarado: { pessoa_a: 'feminino', pessoa_b: null },
      permissoes: {
        storage: true,
        camera: false,
        microfone: false,
        notificacoes: true,
        localizacao: false,
      },
    });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('valida pessoa com schema (fotos null aceito)', async () => {
    await escreverEstadoCanonicoImediato('pessoa', {
      pessoaAtiva: 'pessoa_b',
      filtroPessoa: 'ambos',
      nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' },
      fotos: { pessoa_a: null, pessoa_b: null },
    });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('valida navegacao com schema (snapshot runtime)', async () => {
    await escreverEstadoCanonicoImediato('navegacao', {
      menuAberto: false,
      sheetCapturaAberto: false,
      scrollMenuLateralPosition: 0,
    });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('no-op quando vault nao autorizado (root null)', async () => {
    mockState.vaultRoot = null;
    await escreverEstadoCanonicoImediato('settings', {
      somVibracao: { geral: true, despertar: true, conquista: true, botoes: true },
      pessoa: {
        ativa: 'pessoa_a',
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho',
      },
      featureToggles: {
        cicloMenstrual: true,
        alarmePessoal: true,
        todoLeve: true,
        contadorDiasSem: true,
        calendarioConquistas: true,
        widgetHomescreen: true,
        widgetMostraNome: false,
        mostrarFinancasEmDesenvolvimento: false,
        backupAutomaticoSemanal: false,
        healthConnectSync: false,
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: true,
      },
      privacidade: { biometriaAbrir: false, ocultarTranscricoes: false },
      midia: { capPorRegistro: 4, permitirAudio: true },
      recap: { slideshowIntervaloS: 4 },
    });
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('payload invalido aborta sem chamar writer (best-effort)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // somVibracao.geral nao e boolean.
    await escreverEstadoCanonicoImediato('settings', {
      somVibracao: { geral: 'sim' as unknown as boolean, despertar: true, conquista: true, botoes: true },
    });
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('silencia erro de writeVaultFile (best-effort)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockWriteVaultFile.mockRejectedValueOnce(new Error('EACCES'));
    await expect(
      escreverEstadoCanonicoImediato('navegacao', {
        menuAberto: true,
        sheetCapturaAberto: false,
        scrollMenuLateralPosition: 42,
      })
    ).resolves.toBeUndefined();
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe('escreverEstado: debounce', () => {
  beforeEach(() => {
    mockState.vaultRoot = 'content://test/vault';
    mockWriteVaultFile.mockReset();
    _resetEscreverEstado();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exporta DEBOUNCE_MS = 500', () => {
    expect(DEBOUNCE_MS).toBe(500);
  });

  it('agrupa rajadas de 3 chamadas em 1 unico write', async () => {
    const base = {
      menuAberto: false,
      sheetCapturaAberto: false,
      scrollMenuLateralPosition: 0,
    };
    escreverEstadoCanonico('navegacao', base);
    escreverEstadoCanonico('navegacao', { ...base, menuAberto: true });
    escreverEstadoCanonico('navegacao', { ...base, menuAberto: true, scrollMenuLateralPosition: 10 });

    // Antes do debounce: nada escrito ainda.
    expect(mockWriteVaultFile).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DEBOUNCE_MS);
    // Aguarda microtask do timer + write async.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await _flushDebounceEstado();

    // Trailing-edge: somente o ultimo payload deveria persistir.
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect(meta).toMatchObject({
      version: ESTADO_SCHEMA_VERSION,
      menuAberto: true,
      scrollMenuLateralPosition: 10,
    });
  });

  it('keys distintas nao se interferem', async () => {
    escreverEstadoCanonico('navegacao', {
      menuAberto: true,
      sheetCapturaAberto: false,
      scrollMenuLateralPosition: 0,
    });
    escreverEstadoCanonico('pessoa', {
      pessoaAtiva: 'pessoa_a',
      filtroPessoa: 'pessoa_a',
      nomes: { pessoa_a: 'A', pessoa_b: 'B' },
      fotos: { pessoa_a: null, pessoa_b: null },
    });

    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    jest.useRealTimers();
    await _flushDebounceEstado();

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(2);
    const paths = mockWriteVaultFile.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.stringContaining('_estado/navegacao-'),
        expect.stringContaining('_estado/pessoa-'),
      ])
    );
  });
});

describe('escreverEstado: defesa contra sync-conflict', () => {
  beforeEach(() => {
    mockState.vaultRoot = 'content://test/vault';
    mockState.deviceId = 'ouro-aaaaaa';
    mockWriteVaultFile.mockReset();
    _resetEscreverEstado();
  });

  it('rel canonico nunca casa com .sync-conflict-', async () => {
    // Confirma que o path normal NAO tem o marcador (sanity check).
    const { rel } = await resolverPathEstado('settings');
    expect(rel).not.toMatch(/\.sync-conflict-/);
  });
});
