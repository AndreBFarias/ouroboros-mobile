// Helper puro: converte uma RotinaMeta em snapshot inicial de
// TreinoSessao para o SheetNovoTreino pre-preencher campos quando o
// usuario escolhe uma rotina como template (Q11.b).
//
// Snapshot imutavel: retornamos COPIA (mapeada via map). Mudancas
// futuras na rotina nao retroagem em sessoes ja salvas porque o
// .md do treino guarda os exercicios literais (decisao spec §4.5).
//
// Reps: rotina aceita string ("12", "8-10", "amrap", "ate falha");
// TreinoSessaoSchema exige number. Convencao: parseInt(reps, 10) ->
// se NaN ou <= 0, fallback 10. UI pode permitir refinamento manual
// no SheetNovoTreino antes de salvar. Decisao conservadora: 10
// representa pratica intermediaria comum (hipertrofia padrao).
//
// Carga: rotina aceita null (peso corporal); TreinoSessaoSchema usa
// optional (>= 0). null -> undefined.
//
// rotina (string nome) e' preservado no campo rotina da TreinoSessao.
// O schema atual nao tem rotinaRef estruturado {slug,nome} -- o nome
// e' suficiente como link humano. Q11.c (state machine de descanso)
// e quaisquer features futuras que exijam rastreamento por slug podem
// estender TreinoSessaoSchema em sprint dedicada.
//
// Comentarios sem acento (convencao shell/CI).
import type { RotinaMeta } from '@/lib/schemas/rotina';
import type {
  TreinoSessao,
  ExercicioSessao,
} from '@/lib/schemas/treino_sessao';

const REPS_FALLBACK = 10;

// Converte reps string da rotina em number para ExercicioSessao.
// Aceita "12" (exato), "8-10" (pega 8 como piso conservador), "amrap"
// e "ate falha" (fallback). Numeros invalidos (negativo, zero, NaN)
// caem em fallback 10.
function repsParaNumero(repsStr: string): number {
  const trimmed = repsStr.trim();
  if (trimmed.length === 0) return REPS_FALLBACK;
  // Faixa "8-10": pega o piso para nao subestimar volume; usuario
  // refina no slider do SheetNovoTreino se quiser o topo.
  const matchFaixa = trimmed.match(/^(\d+)\s*-\s*\d+$/);
  if (matchFaixa) {
    const piso = parseInt(matchFaixa[1], 10);
    return piso > 0 ? piso : REPS_FALLBACK;
  }
  const n = parseInt(trimmed, 10);
  if (Number.isFinite(n) && n > 0) return n;
  return REPS_FALLBACK;
}

export function sessaoFromRotina(
  rotina: RotinaMeta,
  data: string,
  autor: 'pessoa_a' | 'pessoa_b'
): Partial<TreinoSessao> {
  // Mapeia exercicios para o shape rigido do ExercicioSessao. Copia
  // por valor: cada item vira novo objeto, sem compartilhar referencia
  // com a rotina original. Imutabilidade garantida.
  const exercicios: ExercicioSessao[] = rotina.exercicios.map((e) => {
    const base: ExercicioSessao = {
      nome: e.nome,
      series: e.series,
      reps: repsParaNumero(e.reps),
    };
    if (typeof e.carga_kg === 'number' && e.carga_kg >= 0) {
      base.carga_kg = e.carga_kg;
    }
    if (e.observacao !== null && e.observacao.trim().length > 0) {
      base.observacao = e.observacao;
    }
    return base;
  });

  return {
    tipo: 'treino_sessao',
    data,
    autor,
    rotina: rotina.nome,
    exercicios,
  };
}
