// R-INT-3 (2026-05-16): cobertura das funcoes de write em
// `src/lib/health/sync.ts` apos refactor pra emitir HCSyncFailEvent.
// Cobre 3 cenarios obrigatorios da spec:
//   1. no_module — modulo nativo ausente (Expo Go / web / Android < 8)
//   2. permission_denied — modulo presente lanca SecurityException
//   3. api_error — modulo presente lanca erro generico
//
// Cada cenario garante: (a) retorno boolean correto, (b) evento
// emitido com motivo correto, (c) mensagem PT-BR canonica.
//
// Padrao require() em vez de import dinamico: o jest deste projeto
// nao habilita VM modules ESM; o codigo testado e' CommonJS pos-Babel,
// entao trabalhamos no mesmo modelo (jest.resetModules entre cada
// teste + require por cenario).
//
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint D (2026-05-22): mocks migrados
// de 'react-native-health-connect' para o path relativo da bridge
// nativa local em ../../../modules/health-connect/src. Bridge usa
// requireOptionalNativeModule (devolve null em ambiente sem suporte),
// entao nao precisa mais de mock de Proxy lancante — bloco
// "hardening Reflect.get" foi removido com a migracao.
import type { HCSyncFailEvent } from '@/lib/health/eventBus';

const TREINO_BASE = {
  tipo: 'treino_sessao' as const,
  data: '2026-04-23T18:00:00-03:00',
  autor: 'pessoa_a' as const,
  rotina: 'Rotina A',
  duracao_min: 28,
  exercicios: [{ nome: 'supino', series: 3, reps: 8, carga_kg: 4 }],
};

beforeEach(() => {
  jest.resetModules();
});

describe('escreverTreinoEmHC — emit de falha', () => {
  it('cenario no_module: retorna false e emite motivo=no_module', async () => {
    // Forca o `carregarModulo` a retornar null mockando o pacote sem
    // os metodos esperados (typeof !== 'function' falha o check).
    // Em produto Android real, no_module ocorre quando o app HC nao
    // esta instalado / Android < 8. Em Expo Go (sem dev-client),
    // a Proxy do pacote lanca LINKING_ERROR -- isso vira api_error
    // pela classificacao, nao no_module. Estado real do alpha-11:
    // permission_denied ou api_error sao as falhas dominantes.
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: null,
        insertRecords: null,
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverTreinoEmHC } = require('@/lib/health/sync');
    const ok = await escreverTreinoEmHC(TREINO_BASE);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipo).toBe('treino');
    expect(eventos[0].motivo).toBe('no_module');
    expect(eventos[0].mensagem).toContain('Treino salvo localmente.');
    expect(eventos[0].mensagem).toContain('Conexão Saúde indisponível');
  });

  it('cenario permission_denied: retorna false e emite motivo=permission_denied', async () => {
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: jest.fn(),
        insertRecords: jest
          .fn()
          .mockRejectedValue(
            new Error(
              'SecurityException: permission denied for ExerciseSession'
            )
          ),
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverTreinoEmHC } = require('@/lib/health/sync');
    const ok = await escreverTreinoEmHC(TREINO_BASE);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].motivo).toBe('permission_denied');
    expect(eventos[0].mensagem).toContain('Sem permissão para gravar');
  });

  it('cenario api_error: retorna false e emite motivo=api_error', async () => {
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: jest.fn(),
        insertRecords: jest
          .fn()
          .mockRejectedValue(new Error('NullPointerException no provedor')),
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverTreinoEmHC } = require('@/lib/health/sync');
    const ok = await escreverTreinoEmHC(TREINO_BASE);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].motivo).toBe('api_error');
    expect(eventos[0].mensagem).toContain('Falha ao sincronizar');
  });
});

describe('escreverPesoEmHC — emit de falha', () => {
  it('input invalido nao emite evento (silente)', async () => {
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverPesoEmHC } = require('@/lib/health/sync');
    const ok = await escreverPesoEmHC(-5);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(0);
  });

  it('no_module emite evento com tipo=peso', async () => {
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: null,
        insertRecords: null,
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverPesoEmHC } = require('@/lib/health/sync');
    const ok = await escreverPesoEmHC(70.5);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipo).toBe('peso');
    expect(eventos[0].motivo).toBe('no_module');
  });

  it('sucesso quando modulo presente nao emite evento', async () => {
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: jest.fn(),
        insertRecords: jest.fn().mockResolvedValue(['uuid-1']),
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverPesoEmHC } = require('@/lib/health/sync');
    const ok = await escreverPesoEmHC(70.5);

    expect(ok).toBe(true);
    expect(eventos).toHaveLength(0);
  });
});

describe('carregarModulo — defesa em profundidade do require', () => {
  it('require lancante (Proxy ou throw direto): nao propaga excecao e cai em no_module', async () => {
    // Defesa em profundidade do try/catch em carregarModulo(). A bridge
    // nativa local usa requireOptionalNativeModule (devolve null em
    // ambiente sem suporte) — Proxy lancante nao acontece em producao,
    // mas o try/catch permanece como rede de seguranca. Este teste
    // simula o cenario historico de Proxy ao acessar propriedade
    // (que era o shape do upstream react-native-health-connect@3.5.0).
    jest.doMock(
      '../../../modules/health-connect/src',
      () =>
        new Proxy(
          {},
          {
            get: () => {
              throw new Error(
                'TurboModuleRegistry: HealthConnect not available'
              );
            },
          }
        ),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverTreinoEmHC } = require('@/lib/health/sync');
    const ok = await escreverTreinoEmHC(TREINO_BASE);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].motivo).toBe('no_module');
    expect(eventos[0].tipo).toBe('treino');
  });

  it('plain object sem readRecords: retorna null e cai em no_module', async () => {
    // Modulo presente mas sem o metodo obrigatorio. Cobertura explicita
    // do branch typeof !== 'function'.
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        insertRecords: jest.fn(),
        // readRecords ausente
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverTreinoEmHC } = require('@/lib/health/sync');
    const ok = await escreverTreinoEmHC(TREINO_BASE);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].motivo).toBe('no_module');
  });

  it('plain object completo: carrega modulo e executa save', async () => {
    // Caminho feliz: modulo presente com todos os metodos. Garante
    // que o check typeof === 'function' nao quebra carregamento normal.
    const insertRecords = jest.fn().mockResolvedValue(['uuid-treino-1']);
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: jest.fn(),
        insertRecords,
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverTreinoEmHC } = require('@/lib/health/sync');
    const ok = await escreverTreinoEmHC(TREINO_BASE);

    expect(ok).toBe(true);
    expect(eventos).toHaveLength(0);
    expect(insertRecords).toHaveBeenCalledTimes(1);
  });

  it('Proxy lancante via availability.verificarDisponibilidade retorna unavailable', async () => {
    // Cobertura cruzada: o try/catch defensivo tambem se aplica a
    // availability.ts. Modulo que lanca em qualquer acesso cai em
    // 'unavailable' sem propagar excecao.
    jest.doMock(
      '../../../modules/health-connect/src',
      () =>
        new Proxy(
          {},
          {
            get: () => {
              throw new Error('LINKING_ERROR: HealthConnect not linked');
            },
          }
        ),
      { virtual: true }
    );

    const { verificarDisponibilidade } = require('@/lib/health/availability');
    const status = await verificarDisponibilidade();

    expect(status).toBe('unavailable');
  });

  it('Proxy lancante via permissions.listarPermissoesConcedidas retorna []', async () => {
    // Cobertura cruzada: try/catch defensivo em permissions.ts. Modulo
    // que lanca em qualquer acesso retorna lista vazia sem propagar
    // excecao.
    jest.doMock(
      '../../../modules/health-connect/src',
      () =>
        new Proxy(
          {},
          {
            get: () => {
              throw new Error('Platform not supported');
            },
          }
        ),
      { virtual: true }
    );

    const { listarPermissoesConcedidas } = require('@/lib/health/permissions');
    const lista = await listarPermissoesConcedidas();

    expect(lista).toEqual([]);
  });
});

describe('escreverBodyFatEmHC e escreverMenstruacaoEmHC — cobertura mínima', () => {
  it('body fat permission_denied emite tipo=gordura', async () => {
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: jest.fn(),
        insertRecords: jest
          .fn()
          .mockRejectedValue(new Error('Permission denied: BodyFat write')),
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverBodyFatEmHC } = require('@/lib/health/sync');
    const ok = await escreverBodyFatEmHC(18.5);

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipo).toBe('gordura');
    expect(eventos[0].motivo).toBe('permission_denied');
  });

  it('menstruacao api_error emite tipo=menstruacao', async () => {
    jest.doMock(
      '../../../modules/health-connect/src',
      () => ({
        readRecords: jest.fn(),
        insertRecords: jest
          .fn()
          .mockRejectedValue(new Error('ServiceUnavailable')),
      }),
      { virtual: true }
    );
    const eventBus = require('@/lib/health/eventBus');
    const eventos: HCSyncFailEvent[] = [];
    eventBus.subscribeHCSyncFail((e: HCSyncFailEvent) => eventos.push(e));

    const { escreverMenstruacaoEmHC } = require('@/lib/health/sync');
    const ok = await escreverMenstruacaoEmHC(
      new Date('2026-05-13T08:00:00Z'),
      2
    );

    expect(ok).toBe(false);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipo).toBe('menstruacao');
    expect(eventos[0].motivo).toBe('api_error');
  });
});
