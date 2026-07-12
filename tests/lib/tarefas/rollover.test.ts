// Unit do selector puro do card "Ainda de ontem" (R-HOME-4b). Cobre:
//   1. Fronteira sem duplicacao: so pendentes com data < hoje entram; a
//      de hoje e a ja-feita ficam de fora.
//   2. Rotulo: 1 -> "ontem"; >=2 -> "ha N dias".
//   3. diasEntreYmd: diferenca inteira de dias, imune a virada de mes.
//   4. Ordenacao: mais recente primeiro (data desc, empate por rel).
//
// Modulo puro: nenhum mock de Vault necessario (opera sobre
// TarefaListada[] em memoria).
//
// Comentarios sem acento (convencao shell/CI).
import {
  selecionarRollover,
  rotularDiasAtras,
  diasEntreYmd,
} from '@/lib/tarefas/rollover';
import type { TarefaListada } from '@/lib/vault/tarefas';
import type { Tarefa } from '@/lib/schemas/tarefa';

// Factory de TarefaListada valida. O selector le apenas
// meta.feito/meta.data/meta.titulo e rel; o resto vem de defaults do
// TarefaSchema para manter o tipo honesto.
function mkTarefa(
  rel: string,
  data: string,
  feito: boolean,
  titulo: string
): TarefaListada {
  const meta: Tarefa = {
    tipo: 'tarefa',
    data,
    autor: 'pessoa_a',
    titulo,
    feito,
    feito_em: feito ? '2026-07-10T10:00:00-03:00' : null,
    categoria: 'outro',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    silenciar_sugestao_ate: null,
  };
  return { meta, rel };
}

const HOJE = '2026-07-10';

describe('diasEntreYmd', () => {
  it('conta a diferenca inteira de dias', () => {
    expect(diasEntreYmd('2026-07-08', '2026-07-10')).toBe(2);
  });

  it('vira o mes corretamente (30/06 -> 01/07 = 1 dia)', () => {
    expect(diasEntreYmd('2026-06-30', '2026-07-01')).toBe(1);
  });

  it('mesmo dia = 0', () => {
    expect(diasEntreYmd('2026-07-10', '2026-07-10')).toBe(0);
  });

  it('vira o ano corretamente (31/12 -> 01/01 = 1 dia)', () => {
    expect(diasEntreYmd('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('rotularDiasAtras', () => {
  it('1 dia vira "ontem"', () => {
    expect(rotularDiasAtras(1)).toBe('ontem');
  });

  it('3 dias vira "ha 3 dias"', () => {
    expect(rotularDiasAtras(3)).toBe('há 3 dias');
  });

  it('10 dias vira "ha 10 dias"', () => {
    expect(rotularDiasAtras(10)).toBe('há 10 dias');
  });
});

describe('selecionarRollover', () => {
  it('fronteira sem duplicacao: so pendente de dia anterior entra', () => {
    const tarefas: TarefaListada[] = [
      mkTarefa('markdown/tarefa-hoje.md', HOJE, false, 'Tarefa de hoje'),
      mkTarefa(
        'markdown/tarefa-ontem-pend.md',
        '2026-07-09',
        false,
        'Comprar presente'
      ),
      mkTarefa(
        'markdown/tarefa-ontem-feita.md',
        '2026-07-09',
        true,
        'Tarefa ja feita'
      ),
    ];
    const out = selecionarRollover(tarefas, HOJE);
    expect(out).toHaveLength(1);
    expect(out[0].meta.titulo).toBe('Comprar presente');
    // A de hoje nao entra (vai para o card To-do hoje) e a feita tampouco.
    expect(out.some((t) => t.meta.titulo === 'Tarefa de hoje')).toBe(false);
    expect(out.some((t) => t.meta.titulo === 'Tarefa ja feita')).toBe(false);
  });

  it('anexa rotulo e diasAtras corretos por item', () => {
    const tarefas: TarefaListada[] = [
      mkTarefa('markdown/tarefa-a.md', '2026-07-09', false, 'A'),
      mkTarefa('markdown/tarefa-b.md', '2026-07-07', false, 'B'),
    ];
    const out = selecionarRollover(tarefas, HOJE);
    const a = out.find((t) => t.meta.titulo === 'A');
    const b = out.find((t) => t.meta.titulo === 'B');
    expect(a?.diasAtras).toBe(1);
    expect(a?.rotulo).toBe('ontem');
    expect(b?.diasAtras).toBe(3);
    expect(b?.rotulo).toBe('há 3 dias');
  });

  it('ordena mais recente primeiro (data desc)', () => {
    const tarefas: TarefaListada[] = [
      mkTarefa('markdown/tarefa-antiga.md', '2026-07-05', false, 'Antiga'),
      mkTarefa('markdown/tarefa-recente.md', '2026-07-09', false, 'Recente'),
      mkTarefa('markdown/tarefa-meio.md', '2026-07-07', false, 'Meio'),
    ];
    const out = selecionarRollover(tarefas, HOJE);
    expect(out.map((t) => t.meta.titulo)).toEqual([
      'Recente',
      'Meio',
      'Antiga',
    ]);
  });

  it('empate de data ordena por rel asc (determinismo estavel)', () => {
    const tarefas: TarefaListada[] = [
      mkTarefa('markdown/tarefa-z.md', '2026-07-09', false, 'Z'),
      mkTarefa('markdown/tarefa-a.md', '2026-07-09', false, 'A'),
    ];
    const out = selecionarRollover(tarefas, HOJE);
    expect(out.map((t) => t.rel)).toEqual([
      'markdown/tarefa-a.md',
      'markdown/tarefa-z.md',
    ]);
  });

  it('sem rollover devolve [] (card se auto-oculta)', () => {
    const tarefas: TarefaListada[] = [
      mkTarefa('markdown/tarefa-hoje.md', HOJE, false, 'Hoje'),
      mkTarefa('markdown/tarefa-feita.md', '2026-07-01', true, 'Feita antiga'),
    ];
    expect(selecionarRollover(tarefas, HOJE)).toEqual([]);
  });
});
