// EXE-3 -- as duas chaves de treino no agregado canonico de stats.
//
// O defeito que esta suite trava: countPorTipo nao tinha chave nenhuma
// de treino e escreverStats nem chamava listarTreinos. Como o schema e'
// z.record(string, number), a ausencia nao produzia erro de compilacao
// nem de schema -- era um numero que NUNCA existia no arquivo que o
// sibling Python le, e nao um numero errado. Por isso os casos aqui
// medem valor, e nao presenca de chave.
//
// Duas chaves e nao uma: 'treino_sessao' (cardinalidade) e
// 'treino_minutos' (soma de duracao_min). Contar sessao sem contar
// minuto deixaria a metade util do dado de fora de novo.
//
// Fixture canonico (spec EXE-3 secao 5), agora = 2026-09-08T12:00-03:00:
//   A  2026-09-07T07:00:00-03:00  45 min  dentro de 7d
//   B  2026-09-05T19:00:00-03:00  60 min  dentro de 7d
//   C  2026-08-20T18:00:00-03:00  30 min  fora de 7d, dentro de 30d
// Esperado em '7d': 2 sessoes / 105 minutos. Em 'all': 3 / 135.
//
// Comentarios sem acento (convencao shell/CI).

import { calcularStatsAgregadas } from '@/lib/stats/calcular';
import { EstadoStatsAgregadasSchema } from '@/lib/schemas/vault_estado';
import type { CalcularInput } from '@/lib/stats/calcular';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';
import { TreinoSessaoSchema } from '@/lib/schemas/treino_sessao';

const AGORA = new Date('2026-09-08T12:00:00-03:00');

// As sessoes passam pelo schema real antes de virarem fixture: um
// fixture que o proprio app rejeitaria provaria contagem sobre dado
// que nunca existiria no Vault.
function sessao(data: string, duracaoMin: number, rotina?: string): TreinoSessao {
  return TreinoSessaoSchema.parse({
    tipo: 'treino_sessao',
    data,
    autor: 'pessoa_a',
    ...(rotina != null ? { rotina } : {}),
    duracao_min: duracaoMin,
    exercicios: [{ nome: 'Agachamento', series: 3, reps: 12 }],
  });
}

const SESSAO_A = sessao('2026-09-07T07:00:00-03:00', 45, 'Rotina A');
const SESSAO_B = sessao('2026-09-05T19:00:00-03:00', 60, 'Rotina B');
const SESSAO_C = sessao('2026-08-20T18:00:00-03:00', 30);

// Input minimo; cada caso sobrescreve periodo e treinos.
function entrada(over: Partial<CalcularInput> = {}): CalcularInput {
  return {
    humor: [],
    diarios: [],
    eventos: [],
    marcos: [],
    contadores: [],
    tarefas: [],
    periodo: '7d',
    agora: AGORA,
    ...over,
  };
}

describe('stats/calcular: treino no countPorTipo', () => {
  it("'7d' conta 2 sessoes e 105 minutos com o fixture canonico", () => {
    const r = calcularStatsAgregadas(
      entrada({ periodo: '7d', treinos: [SESSAO_A, SESSAO_B, SESSAO_C] })
    );
    expect(r.countPorTipo.treino_sessao).toBe(2);
    expect(r.countPorTipo.treino_minutos).toBe(105);
  });

  it("'all' conta as 3 sessoes e 135 minutos (sem recorte temporal)", () => {
    const r = calcularStatsAgregadas(
      entrada({ periodo: 'all', treinos: [SESSAO_A, SESSAO_B, SESSAO_C] })
    );
    expect(r.countPorTipo.treino_sessao).toBe(3);
    expect(r.countPorTipo.treino_minutos).toBe(135);
  });

  it("'30d' alcanca a sessao de 19 dias atras: 3 e 135", () => {
    // Guarda do recorte: se o filtro de treino fosse copiado do de
    // tarefas (que exige feito_em) ou perdesse o `dias`, este caso e o
    // de '7d' nao poderiam dar numeros diferentes.
    const r = calcularStatsAgregadas(
      entrada({ periodo: '30d', treinos: [SESSAO_A, SESSAO_B, SESSAO_C] })
    );
    expect(r.countPorTipo.treino_sessao).toBe(3);
    expect(r.countPorTipo.treino_minutos).toBe(135);
  });

  it('sessao no futuro nao conta (mesmo predicado dos marcos)', () => {
    const amanha = sessao('2026-09-09T07:00:00-03:00', 50, 'Rotina A');
    const r = calcularStatsAgregadas(
      entrada({ periodo: '7d', treinos: [SESSAO_A, amanha] })
    );
    expect(r.countPorTipo.treino_sessao).toBe(1);
    expect(r.countPorTipo.treino_minutos).toBe(45);
  });

  it('vault sem treino nenhum conta zero, e nao chave ausente', () => {
    // A distincao importa: chave ausente e' o bug antigo; zero e' dado.
    const r = calcularStatsAgregadas(entrada({ periodo: '7d', treinos: [] }));
    expect(r.countPorTipo.treino_sessao).toBe(0);
    expect(r.countPorTipo.treino_minutos).toBe(0);
    expect(Object.keys(r.countPorTipo)).toContain('treino_sessao');
    expect(Object.keys(r.countPorTipo)).toContain('treino_minutos');
  });
});

describe('stats/calcular: retro-compat do campo opcional treinos', () => {
  it('chamada sem o campo `treinos` produz 0 e 0', () => {
    const semCampo = entrada({ periodo: '7d' });
    expect('treinos' in semCampo).toBe(false);
    const r = calcularStatsAgregadas(semCampo);
    expect(r.countPorTipo.treino_sessao).toBe(0);
    expect(r.countPorTipo.treino_minutos).toBe(0);
  });

  it('as duas chaves novas sao a UNICA diferenca entre passar e nao passar treinos', () => {
    // AC-1: nenhuma chave existente muda de valor. Comparar os dois
    // records inteiros pega qualquer efeito colateral do filtro novo
    // sobre humor/diario/marco/evento/contador/tarefa.
    const comDados = entrada({
      periodo: '7d',
      treinos: [SESSAO_A, SESSAO_B, SESSAO_C],
    });
    const semDados = entrada({ periodo: '7d' });

    const comTreino = calcularStatsAgregadas(comDados).countPorTipo;
    const semTreino = calcularStatsAgregadas(semDados).countPorTipo;

    const divergentes = Object.keys(comTreino).filter(
      (k) => comTreino[k] !== semTreino[k]
    );
    expect(divergentes.sort()).toEqual(['treino_minutos', 'treino_sessao']);
    expect(Object.keys(comTreino).sort()).toEqual(
      Object.keys(semTreino).sort()
    );
  });
});

describe('stats/calcular: o snapshot com treino continua canonico', () => {
  it('passa no EstadoStatsAgregadasSchema real', () => {
    // O schema e' record aberto, entao ele nao "confere" as chaves
    // novas -- este caso existe para provar o contrario do que o nome
    // sugere: chave nova NAO invalida stats-*.md, o que e' a licenca
    // para adiciona-la sem subir ESTADO_SCHEMA_VERSION.
    const r = calcularStatsAgregadas(
      entrada({ periodo: '7d', treinos: [SESSAO_A, SESSAO_B] })
    );
    const parsed = EstadoStatsAgregadasSchema.safeParse(r);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.countPorTipo.treino_sessao).toBe(2);
      expect(parsed.data.countPorTipo.treino_minutos).toBe(105);
    }
  });

  it('stats-*.md antigo, sem as chaves de treino, segue valido', () => {
    // Instalacao que nunca rodou esta versao tem o record com 9 chaves.
    // Se algum dia alguem trocar o record aberto por z.object, este caso
    // reprova antes de o app comecar a descartar arquivo de usuario.
    const antigo = {
      version: 1,
      periodo: '7d',
      humorMedio7d: null,
      humorMedio30d: null,
      humorMedio90d: null,
      humorMedioAll: null,
      countPorTipo: {
        humor: 1,
        diario_gatilho: 0,
        diario_conquista: 0,
        diario_reflexao: 0,
        marco: 0,
        evento_positivo: 0,
        evento_negativo: 0,
        contador: 0,
        tarefa_concluida: 0,
      },
      streaksAtuais: {},
      topGatilhosUltimos90d: [],
      topConquistas: [],
      ultimaAtualizacao: '2026-09-01T10:00:00.000Z',
      atualizadoEm: '2026-09-01T10:00:00.000Z',
    };
    const parsed = EstadoStatsAgregadasSchema.safeParse(antigo);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.countPorTipo.treino_sessao).toBeUndefined();
    }
  });
});
