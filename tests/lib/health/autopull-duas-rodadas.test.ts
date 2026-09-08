// Teste de regressao da janela retroativa do autopull HC.
// INT-HC-2-JANELA-RETROATIVA (2026-09-08).
//
// POR QUE ESTE ARQUIVO EXISTE. Todo teste anterior da frente roda UMA
// vez com `since` injetado a mao (tests/lib/health/puxadores/*.test.ts).
// O defeito que esta sprint corrige so aparece ENTRE DUAS RODADAS: a
// rodada 1 avanca hcAutopullUltimaSync mesmo sem escrever nada, e a
// rodada 2 comeca depois do registro que a barreira do dia em curso
// descartou -- ou depois do registro que o app da pulseira publicou com
// atraso. Por isso aqui nao se passa `since`: as duas rodadas chamam
// orquestrarHCAutopull e deixam o estado avancar pelo caminho real do
// app (useSettings.hcAutopullUltimaSync).
//
// A bridge nativa e' substituida por um HC falso que FILTRA por tempo
// como o real: TimeRangeFilter.between filtra pelo tempo DO REGISTRO,
// nunca pelo tempo de insercao. O campo `publicadoEm` do falso modela a
// publicacao atrasada (o registro so fica visivel para leituras
// posteriores a esse instante). Sem esse filtro o teste passaria com o
// bug presente, que e' exatamente como o bug sobreviveu ate hoje.
//
// NAO PROVA NADA SOBRE PESO. A sonda de 2026-09-08 mostrou que o Mi
// Fitness nao declara WRITE_WEIGHT e que o unico registro de peso do
// aparelho e' orfao (Google Fit, 14/mai). Weight aparece aqui como
// registro sintetico, so para exercitar a guarda de merge do puxador de
// medidas. Ver docs/sprints/_AUDIT-2026-09-08-SONDA-HC-DEVICE-RESULTADO.md.
//
// Comentarios sem acento (convencao shell/CI).

// ---------------------------------------------------------------------
// HC falso: guarda registros por tipo e filtra por janela de tempo.
// ---------------------------------------------------------------------

interface RegistroFalso {
  // Instante em que o registro passou a existir no HC. Leitura anterior
  // a ele nao enxerga o registro (publicacao atrasada da pulseira).
  publicadoEm: string;
  // Payload cru, no shape que a bridge devolve.
  [k: string]: unknown;
}

const hcFalso = new Map<string, RegistroFalso[]>();

// Tipos de intervalo filtram por [startTime, endTime] contidos na
// janela; tipos instantaneos filtram por `time` dentro da janela.
const TIPOS_INTERVALO = new Set(['Steps', 'SleepSession', 'ExerciseSession']);

function dentroDaJanela(
  r: RegistroFalso,
  tipo: string,
  inicio: number,
  fim: number
): boolean {
  if (TIPOS_INTERVALO.has(tipo)) {
    const ini = new Date(r.startTime as string).getTime();
    const f = new Date(r.endTime as string).getTime();
    return ini >= inicio && f <= fim;
  }
  const t = new Date(r.time as string).getTime();
  return t >= inicio && t <= fim;
}

const mockReadRecords = jest.fn(
  async (
    tipo: string,
    opts: { timeRangeFilter: { startTime: string; endTime: string } }
  ) => {
    const inicio = new Date(opts.timeRangeFilter.startTime).getTime();
    const fim = new Date(opts.timeRangeFilter.endTime).getTime();
    const agora = Date.now();
    const todos = hcFalso.get(tipo) ?? [];
    const records = todos
      .filter((r) => new Date(r.publicadoEm).getTime() <= agora)
      .filter((r) => dentroDaJanela(r, tipo, inicio, fim))
      .map(({ publicadoEm: _p, ...resto }) => resto);
    return { records };
  }
);

jest.mock('../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) =>
    (mockReadRecords as unknown as (...a: unknown[]) => unknown)(...args),
}));

// ---------------------------------------------------------------------
// Vault falso: mantem o estado entre as duas rodadas, que e' o ponto.
// Escrever sobrescreve (mesma semantica de escreverPassos e
// escreverMedida, que gravam o arquivo inteiro sem merge).
// ---------------------------------------------------------------------

interface VaultFalso {
  passos: Map<string, number>;
  // Medida guarda meta E corpo: escreverMedida grava o arquivo inteiro,
  // entao um falso que so guardasse o meta nao enxergaria o corpo sendo
  // apagado. Prova pelo circuito real (YAML de verdade) em
  // tests/lib/health/puxadores/medidas-corpo-preservado.test.ts.
  medidas: Map<string, { meta: Record<string, unknown>; body: string }>;
  sono: Map<string, Record<string, unknown>>;
  treinos: Map<string, Record<string, unknown>>;
  ciclo: Map<string, Record<string, unknown>>;
}

const mockVault: VaultFalso = {
  passos: new Map(),
  medidas: new Map(),
  sono: new Map(),
  treinos: new Map(),
  ciclo: new Map(),
};

function mockSlugHcId(hcId: string): string {
  return hcId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

jest.mock('@/lib/vault/passos', () => ({
  __esModule: true,
  escreverPassos: async (
    _root: string,
    data: string,
    total: number
  ): Promise<{ uri: string; rel: string }> => {
    mockVault.passos.set(data, total);
    return { uri: `x/markdown/passos-${data}.md`, rel: `markdown/passos-${data}.md` };
  },
}));

jest.mock('@/lib/vault/medidas', () => ({
  __esModule: true,
  escreverMedida: async (
    _root: string,
    meta: { data: string },
    body: string = ''
  ): Promise<{ uri: string; rel: string }> => {
    mockVault.medidas.set(meta.data, { meta: { ...meta }, body });
    return {
      uri: `x/markdown/medidas-${meta.data}.md`,
      rel: `markdown/medidas-${meta.data}.md`,
    };
  },
  lerMedidaDoDia: async (_root: string, data: string) =>
    mockVault.medidas.get(data) ?? null,
}));

jest.mock('@/lib/vault/sono', () => ({
  __esModule: true,
  escreverSono: async (
    _root: string,
    dados: { data: string; fonte_hc_id?: string }
  ): Promise<{ uri: string; rel: string }> => {
    const nome = `sono-${dados.data}-hc-${mockSlugHcId(dados.fonte_hc_id ?? '')}.md`;
    mockVault.sono.set(nome, { ...dados });
    return { uri: `x/markdown/${nome}`, rel: `markdown/${nome}` };
  },
}));

jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  escreverTreino: async (
    _root: string,
    slug: string,
    meta: Record<string, unknown>
  ): Promise<{ uri: string; rel: string }> => {
    mockVault.treinos.set(slug, { ...meta });
    return { uri: `x/treinos/${slug}.md`, rel: `treinos/${slug}.md` };
  },
  listarTreinos: async () => Array.from(mockVault.treinos.values()),
}));

jest.mock('@/lib/vault/ciclo', () => ({
  __esModule: true,
  escreverRegistroCiclo: async (
    _root: string,
    meta: { data: string }
  ): Promise<{ uri: string; rel: string }> => {
    mockVault.ciclo.set(meta.data, { ...meta });
    return {
      uri: `x/markdown/ciclo-${meta.data}.md`,
      rel: `markdown/ciclo-${meta.data}.md`,
    };
  },
  lerRegistroCiclo: async (_root: string, data: string) =>
    mockVault.ciclo.get(data) ?? null,
}));

// O puxador de sono deduplica lendo a pasta markdown/ pelo reader
// canonico; o falso devolve os nomes ja escritos nesta execucao.
jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: async (folderUri: string) =>
    Array.from(mockVault.sono.keys()).map((nome) => `${folderUri}/${nome}`),
  readVaultFile: async () => null,
}));

import {
  orquestrarHCAutopull,
  janelaDeLeitura,
} from '@/lib/health/autopullScheduler';
import { puxadorPassos } from '@/lib/health/puxadores/passos';
import { puxadorSono } from '@/lib/health/puxadores/sleep';
import { puxadorMedidas } from '@/lib/health/puxadores/medidas';
import { puxadorExercicio } from '@/lib/health/puxadores/exercicio';
import { puxadorMenstruacao } from '@/lib/health/puxadores/menstruacao';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

// Calendario do cenario, em America/Sao_Paulo (UTC-3, sem horario de
// verao desde 2019). D = 2026-09-10.
const RODADA_1 = '2026-09-10T11:00:00.000Z'; // D 08:00 BRT
const RODADA_2 = '2026-09-11T12:00:00.000Z'; // D+1 09:00 BRT

const TODOS_PUXADORES = [
  puxadorPassos,
  puxadorExercicio,
  puxadorMedidas,
  puxadorMenstruacao,
  puxadorSono,
];

function limparHC(): void {
  hcFalso.clear();
}

function inserirNoHC(tipo: string, ...registros: RegistroFalso[]): void {
  const atuais = hcFalso.get(tipo) ?? [];
  hcFalso.set(tipo, [...atuais, ...registros]);
}

async function rodarEm(iso: string, puxadores = TODOS_PUXADORES) {
  jest.setSystemTime(new Date(iso));
  return orquestrarHCAutopull(puxadores);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReadRecords.mockClear();
  limparHC();
  mockVault.passos.clear();
  mockVault.medidas.clear();
  mockVault.sono.clear();
  mockVault.treinos.clear();
  mockVault.ciclo.clear();
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useSettings.setState({
    pessoa: {
      ativa: 'pessoa_a',
      vaultCompartilhado: true,
      tipoCompanhia: 'sozinho',
    },
    hcAutopullUltimaSync: {
      Steps: null,
      ExerciseSession: null,
      Weight: null,
      BodyFat: null,
      HeartRate: null,
      SleepSession: null,
      MenstruationFlow: null,
    },
    hcAutopullUltimaRodada: undefined,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  useVault.setState({ vaultRoot: null });
});

describe('autopull HC em duas rodadas consecutivas', () => {
  // AC-1. Sessao de sono da madrugada de D, publicada pela pulseira as
  // 10:00 de D — depois da rodada das 08:00. Sem sobreposicao ela cai
  // entre as duas janelas e nao e' lida nunca mais.
  it('AC-1: sono publicado com atraso entra na rodada seguinte', async () => {
    inserirNoHC('SleepSession', {
      publicadoEm: '2026-09-10T13:00:00.000Z', // D 10:00 BRT
      startTime: '2026-09-10T03:30:00.000Z', // D 00:30 BRT
      endTime: '2026-09-10T09:00:00.000Z', // D 06:00 BRT
      metadata: { id: 'sono-noite-d', dataOrigin: { packageName: 'app.pulseira' } },
    });

    const r1 = await rodarEm(RODADA_1);
    expect(r1.tipos.find((t) => t.tipo === 'SleepSession')?.novos).toBe(0);
    expect(mockVault.sono.size).toBe(0);
    // A marca avancou mesmo sem nada escrito: e' esse avanco que abre o
    // buraco na janela seguinte.
    expect(useSettings.getState().hcAutopullUltimaSync.SleepSession).toBe(
      RODADA_1
    );

    const r2 = await rodarEm(RODADA_2);
    expect(r2.tipos.find((t) => t.tipo === 'SleepSession')?.novos).toBe(1);
    expect(Array.from(mockVault.sono.keys())).toEqual([
      'sono-2026-09-10-hc-sono-noite-d.md',
    ]);
  });

  // AC-2. A perda silenciosa dos passos: a barreira do dia em curso
  // descarta o dia D inteiro na rodada 1, e sem sobreposicao a rodada de
  // D+1 so enxerga a parte do dia que caiu depois das 08:00.
  it('AC-2: total do dia D fecha em 10000, nao nos 7000 do resto do dia', async () => {
    inserirNoHC(
      'Steps',
      {
        publicadoEm: '2026-09-10T10:00:00.000Z',
        startTime: '2026-09-10T05:00:00.000Z', // D 02:00 BRT
        endTime: '2026-09-10T10:00:00.000Z', // D 07:00 BRT
        count: 3000,
        metadata: { id: 'passos-manha' },
      },
      {
        publicadoEm: '2026-09-10T22:00:00.000Z',
        startTime: '2026-09-10T11:30:00.000Z', // D 08:30 BRT
        endTime: '2026-09-10T22:00:00.000Z', // D 19:00 BRT
        count: 7000,
        metadata: { id: 'passos-tarde' },
      }
    );

    await rodarEm(RODADA_1);
    // Dia em curso: nada escrito na rodada 1 (barreira preservada,
    // decisao 4.3 do spec).
    expect(mockVault.passos.size).toBe(0);

    await rodarEm(RODADA_2);
    expect(mockVault.passos.get('2026-09-10')).toBe(10000);
  });

  // AC-4. Guarda de dado do usuario: o dia ja tem medidas escritas a
  // mao e o puxador grava peso sintetico no mesmo dia.
  it('AC-4: peso sintetico do HC nao apaga cintura, fotos e reflexao', async () => {
    mockVault.medidas.set('2026-09-09', {
      meta: {
        tipo: 'medidas',
        data: '2026-09-09',
        autor: 'pessoa_a',
        cintura: 78,
        fotos: ['jpg/medidas-2026-09-09-frente.jpg'],
        reflexao: 'Semana de rotina estável.',
      },
      body: 'Medi depois do treino, com a fita nova.',
    });

    inserirNoHC('Weight', {
      publicadoEm: '2026-09-09T13:00:00.000Z',
      time: '2026-09-09T13:00:00.000Z', // D-1 10:00 BRT
      weight: { inKilograms: 72.4 },
      metadata: { id: 'peso-sintetico' },
    });

    await rodarEm(RODADA_1);
    await rodarEm(RODADA_2);

    const gravado = mockVault.medidas.get('2026-09-09');
    expect(gravado?.meta).toMatchObject({
      tipo: 'medidas',
      data: '2026-09-09',
      cintura: 78,
      reflexao: 'Semana de rotina estável.',
      peso: 72.4,
    });
    expect(gravado?.meta.fotos).toEqual([
      'jpg/medidas-2026-09-09-frente.jpg',
    ]);
    // Duas rodadas escreveram o mesmo dia; o corpo continua la.
    expect(gravado?.body).toBe('Medi depois do treino, com a fita nova.');
  });

  // AC-5. A janela maior rele mais; reler nao pode duplicar.
  it('AC-5: reler os mesmos registros nas duas rodadas nao duplica arquivo', async () => {
    inserirNoHC('SleepSession', {
      publicadoEm: '2026-09-09T12:00:00.000Z',
      startTime: '2026-09-09T03:30:00.000Z',
      endTime: '2026-09-09T09:00:00.000Z',
      metadata: { id: 'sono-d-1', dataOrigin: { packageName: 'app.pulseira' } },
    });
    inserirNoHC('ExerciseSession', {
      publicadoEm: '2026-09-09T22:00:00.000Z',
      startTime: '2026-09-09T20:00:00.000Z',
      endTime: '2026-09-09T21:00:00.000Z',
      exerciseType: 79,
      metadata: { id: 'treino-d-1', dataOrigin: { packageName: 'app.pulseira' } },
    });
    inserirNoHC('MenstruationFlow', {
      publicadoEm: '2026-09-09T12:00:00.000Z',
      time: '2026-09-09T12:00:00.000Z',
      flow: 2,
      metadata: { id: 'fluxo-d-1' },
    });

    const r1 = await rodarEm(RODADA_1);
    const escritos1 = {
      sono: mockVault.sono.size,
      treinos: mockVault.treinos.size,
      ciclo: mockVault.ciclo.size,
    };
    expect(escritos1).toEqual({ sono: 1, treinos: 1, ciclo: 1 });
    expect(r1.tipos.every((t) => t.erro === null)).toBe(true);

    const r2 = await rodarEm(RODADA_2);
    expect({
      sono: mockVault.sono.size,
      treinos: mockVault.treinos.size,
      ciclo: mockVault.ciclo.size,
    }).toEqual(escritos1);
    for (const tipo of ['SleepSession', 'ExerciseSession', 'MenstruationFlow']) {
      expect(r2.tipos.find((t) => t.tipo === tipo)?.novos).toBe(0);
    }
  });

  // A janela da segunda rodada precisa comecar antes da marca da
  // primeira, encostada na meia-noite local. Sem isso os casos acima
  // dependeriam de sorte.
  it('a janela da rodada 2 comeca na meia-noite local de 48h antes da marca', async () => {
    await rodarEm(RODADA_1, [puxadorPassos]);
    mockReadRecords.mockClear();
    await rodarEm(RODADA_2, [puxadorPassos]);

    const [, opts] = mockReadRecords.mock.calls[0];
    // RODADA_1 = 2026-09-10T11:00Z; menos 48h = 2026-09-08T11:00Z;
    // meia-noite BRT desse dia = 2026-09-08T03:00Z.
    expect(opts.timeRangeFilter.startTime).toBe('2026-09-08T03:00:00.000Z');
  });
});

// AC-3. A funcao pura, exercitada direto — e' ela que o resto herda.
describe('janelaDeLeitura', () => {
  it('AC-3: encosta na meia-noite local, nao mantem a hora do since', () => {
    const agora = new Date('2026-09-08T11:00:00.000Z');
    expect(janelaDeLeitura('2026-09-08T08:00:00-03:00', agora)).toBe(
      '2026-09-06T03:00:00.000Z'
    );
  });

  it('primeira sync (since null): 7 dias atras, tambem encostado', () => {
    const agora = new Date('2026-09-08T11:00:00.000Z');
    // 7 dias antes = 2026-09-01T11:00Z; meia-noite BRT = 2026-09-01T03:00Z.
    expect(janelaDeLeitura(null, agora)).toBe('2026-09-01T03:00:00.000Z');
  });

  it('since corrompido cai na janela default em vez de quebrar a rodada', () => {
    const agora = new Date('2026-09-08T11:00:00.000Z');
    expect(janelaDeLeitura('nao-e-uma-data', agora)).toBe(
      '2026-09-01T03:00:00.000Z'
    );
  });
});
