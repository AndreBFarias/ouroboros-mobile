// AUDIT-P2-4 (2026-09-05) -- prova do gatilho das stats agregadas.
//
// Contexto: src/lib/stats/calcular.ts e src/lib/stats/escreverStats.ts
// eram um par fechado, sem um unico caller fora de src/lib/stats/. Os
// quatro arquivos _estado/stats-7d|30d|90d|all-<deviceId>.md, canonicos
// no contrato com o repositorio irmao (CONTRACT-MOBILE-BACKEND secoes
// 5.28 a 5.31), nunca existiram em Vault nenhum, e o ZIP de "Exportar
// estado completo" saia com 5 de 9 arquivos sem erro nem aviso. Esta
// suite cobre o gatilho que faltava: o BootHook statsAgregadasHook.
//
// POR QUE ESTE ARQUIVO NAO MOCKA @/lib/stats/escreverStats:
//
// Mockar o modulo provaria apenas que o hook chama a funcao. Nao e'
// suficiente aqui, porque o caminho ate o disco tem DOIS no-ops
// silenciosos ja mapeados: escreverEstadoCanonicoImediato devolve sem
// escrever quando o safeParse do payload falha (escreverEstado.ts, so
// console.warn em __DEV__), e escreverStatsAgregadas engole excecao de
// leitura (escreverStats.ts). Com os dois, a sprint poderia fechar
// verde sem produzir um unico .md. Entao aqui mockamos apenas as
// FOLHAS -- writeVaultFile, getDeviceId, os seis listadores de Vault e
// o store -- e deixamos rodar de verdade o trecho que interessa:
// hook -> escreverStatsAgregadas -> calcularStatsAgregadas ->
// EstadoStatsAgregadasSchema.safeParse -> writeVaultFile.
//
// Chegar em writeVaultFile ja e' a prova de que o payload passou pelo
// schema; se nao passasse, o writer teria devolvido antes.
//
// O harness de EXECUCAO (rodar o hook de verdade a partir de
// reagendarTodosBootHooks, com dynamic import lazy) so funciona porque
// a AUDIT-P1-9 habilitou babel-plugin-dynamic-import-node em env.test
// (babel.config.js); ver tests/lib/boot/dynamic-import-canario.test.ts.
//
// Comentarios sem acento (convencao shell/CI).
import { readFileSync } from 'fs';
import { join } from 'path';

const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
  WRITING_SUFFIX: '.writing',
}));

const DEVICE = 'ouro-aaaaaa';

jest.mock('@/lib/util/deviceId', () => ({
  __esModule: true,
  getDeviceId: () => Promise.resolve('ouro-aaaaaa'),
  forceDeviceIdSuffix: (rel: string, deviceId: string) => {
    if (rel.includes(`-${deviceId}.`)) return rel;
    const dot = rel.lastIndexOf('.');
    if (dot === -1) return `${rel}-${deviceId}`;
    return `${rel.slice(0, dot)}-${deviceId}${rel.slice(dot)}`;
  },
}));

const estado = {
  vaultRoot: 'content://test/vault' as string | null,
};

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => ({ vaultRoot: estado.vaultRoot }),
  },
}));

// Listadores do Vault: folhas de I/O. Fixture minima e suficiente para
// que calcularStatsAgregadas produza payload nao trivial (media de
// humor preenchida, countPorTipo com entrada).
//
// Data de ONTEM, nao de hoje: dentroUltimosDias (calcular.ts) resolve
// um 'YYYY-MM-DD' para meio-dia em -03:00, entao um registro datado de
// hoje cai no futuro -- e sai do periodo -- quando a suite roda de
// manha. Com ontem, o caso vale a qualquer hora do dia.
//
// A data e' calculada inline: factory de jest.mock e' hoisted e nao
// pode referenciar binding do escopo do modulo.
jest.mock('@/lib/vault/humor', () => ({
  __esModule: true,
  listarHumor: () =>
    Promise.resolve([
      {
        tipo: 'humor',
        data: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          return d.toISOString().slice(0, 10);
        })(),
        autor: 'pessoa_a',
        humor: 4,
        energia: 3,
        ansiedade: 2,
        foco: 3,
        tags: [],
      },
    ]),
}));
jest.mock('@/lib/vault/diario', () => ({
  __esModule: true,
  listarDiarios: () => Promise.resolve([]),
}));
jest.mock('@/lib/vault/eventos', () => ({
  __esModule: true,
  listarEventos: () => Promise.resolve([]),
}));
jest.mock('@/lib/vault/marcos', () => ({
  __esModule: true,
  listarMarcos: () => Promise.resolve([]),
}));
jest.mock('@/lib/vault/contadores', () => ({
  __esModule: true,
  listarContadores: () => Promise.resolve([]),
}));
jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: () => Promise.resolve([]),
}));

import { BOOT_HOOKS, reagendarTodosBootHooks } from '@/lib/boot/reagendamento';
import {
  EstadoStatsAgregadasSchema,
  PERIODOS_STATS,
} from '@/lib/schemas/vault_estado';

const ORIGINAL = [...BOOT_HOOKS];
const nomes = () => BOOT_HOOKS.map((h) => h.name);

// Roda somente o hook de nome `nome`. A fila inteira dispararia os
// outros 16 hooks e seus efeitos colaterais.
async function rodarSomente(nome: string): Promise<void> {
  const alvo = ORIGINAL.find((h) => h.name === nome);
  if (!alvo) throw new Error(`hook "${nome}" nao esta em BOOT_HOOKS`);
  BOOT_HOOKS.length = 0;
  BOOT_HOOKS.push(alvo);
  await reagendarTodosBootHooks();
}

describe('BOOT_HOOKS: registro do hook de stats agregadas', () => {
  it('inclui statsAgregadasHook exatamente uma vez', () => {
    expect(nomes().filter((n) => n === 'statsAgregadasHook')).toHaveLength(1);
  });

  it('roda DEPOIS das migrations que definem o layout do Vault', () => {
    // As stats leem o Vault inteiro via listarHumor e irmaos, que
    // varrem MARKDOWN_FOLDER. Antes destas migrations a varredura sairia
    // de um layout que ainda vai mudar.
    const lista = nomes();
    const iStats = lista.indexOf('statsAgregadasHook');
    const iLayout = lista.indexOf('migrarLayoutVaultHook');
    const iDeviceId = lista.indexOf('migrarT2DeviceIdSuffixHook');
    expect(iLayout).toBeGreaterThanOrEqual(0);
    expect(iDeviceId).toBeGreaterThanOrEqual(0);
    expect(iStats).toBeGreaterThan(iLayout);
    expect(iStats).toBeGreaterThan(iDeviceId);
  });

  it('roda ANTES do dreno do widget, que e o ultimo por contrato proprio', () => {
    const lista = nomes();
    expect(lista.indexOf('statsAgregadasHook')).toBeLessThan(
      lista.indexOf('sincronizarWidgetTodoHook')
    );
  });

  it('nao usa o caminho debounced de escreverStats', () => {
    // Guarda de decisao, sobre o fonte. agendarRecalculoStats existe
    // para agrupar rajada de mutacao; numa unica chamada por boot ele
    // so' abriria uma janela de 30s em que o app pode ir a background
    // ou ser morto sem escrever nada -- e ainda deixaria quatro
    // setTimeout de 30s pendurados no worker do Jest, que usa timers
    // reais (jest.config.js, fakeTimers.doNotFake). Se alguem trocar
    // por agendarRecalculoStatsTodos, este caso reprova.
    const fonte = readFileSync(
      join(__dirname, '../../../src/lib/boot/reagendamento.ts'),
      'utf8'
    );
    const bloco = fonte.slice(
      fonte.indexOf('const statsAgregadasHook'),
      fonte.indexOf('const sincronizarWidgetTodoHook')
    );
    expect(bloco.length).toBeGreaterThan(0);
    expect(bloco).toContain("await import('@/lib/stats/escreverStats')");
    expect(bloco).toContain('await escreverStatsAgregadas(periodo)');
    expect(bloco).not.toContain('agendarRecalculo');
  });
});

describe('BOOT_HOOKS: execucao do hook de stats agregadas', () => {
  beforeEach(() => {
    estado.vaultRoot = 'content://test/vault';
    mockWriteVaultFile.mockReset();
    mockWriteVaultFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    BOOT_HOOKS.length = 0;
    BOOT_HOOKS.push(...ORIGINAL);
  });

  it('escreve os 4 arquivos de stats, um por periodo, no path canonico', async () => {
    await rodarSomente('statsAgregadasHook');

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(4);
    const uris = mockWriteVaultFile.mock.calls.map((c) => c[0] as string);
    expect(uris).toEqual(
      PERIODOS_STATS.map(
        (p) => `content://test/vault/_estado/stats-${p}-${DEVICE}.md`
      )
    );
  });

  it('o payload escrito e um EstadoStatsAgregadas valido do periodo certo', async () => {
    // Chegar aqui ja implica safeParse verde dentro do writer; o assert
    // explicito localiza a falha caso o schema e o calculador divirjam.
    await rodarSomente('statsAgregadasHook');

    PERIODOS_STATS.forEach((p, i) => {
      const meta = mockWriteVaultFile.mock.calls[i][1];
      const r = EstadoStatsAgregadasSchema.safeParse(meta);
      expect(r.success).toBe(true);
      expect((meta as { periodo: string }).periodo).toBe(p);
    });
  });

  it('leva os dados do Vault para dentro do payload', async () => {
    // Sem isto, um calculador que devolvesse zeros passaria nos casos
    // acima. A fixture tem um humor 4 de hoje.
    await rodarSomente('statsAgregadasHook');

    const meta7d = mockWriteVaultFile.mock.calls[0][1] as {
      humorMedio7d: number | null;
      countPorTipo: Record<string, number>;
      ultimaAtualizacao: string;
    };
    expect(meta7d.humorMedio7d).toBe(4);
    expect(meta7d.countPorTipo.humor).toBe(1);
    expect(Number.isNaN(Date.parse(meta7d.ultimaAtualizacao))).toBe(false);
  });

  it('sem vaultRoot e no-op: nao escreve nada e nao lanca', async () => {
    estado.vaultRoot = null;
    await expect(rodarSomente('statsAgregadasHook')).resolves.toBeUndefined();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });
});
