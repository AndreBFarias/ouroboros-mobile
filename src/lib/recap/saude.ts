// R-INT-3-HC-RECAP-CARD (2026-05-25) -- Agregador de saude para o
// Recap. Consolida os dados que o autopull HC abastece (passos,
// treinos, sono, medidas) numa estrutura unica consumida pelo
// RecapSecaoSaude.
//
// Reaproveita os readers canonicos do Vault (listarPassos, listarSono,
// listarTreinos, listarMedidas). Cada metrica e null quando nao ha
// dado no periodo, permitindo ao componente ocultar a linha ou a
// secao inteira (render condicional).
//
// Janela: resolverPeriodo converte a chave (dia/semana/mes/ano/
// personalizado) em {de, ate}. Para 'personalizado' o caller deve
// usar o componente que ja tem o range; aqui derivamos a janela de
// `periodo` + `ate` (mesma assinatura da spec). Quando periodo e
// 'personalizado' sem custom, caimos em 'semana' defensivamente para
// nao lancar (o RecapScreen so chama com periodos resolviveis).
//
// Comentarios sem acento (convencao shell/CI).
import { listarPassos } from '@/lib/vault/passos';
import { listarSono } from '@/lib/vault/sono';
import { listarTreinos } from '@/lib/vault/treinos';
import { listarMedidas } from '@/lib/vault/medidas';
import { resolverPeriodo, type PeriodoChave } from '@/lib/hooks/useRecap';

export interface SaudeRecap {
  // Total de passos no periodo e media por dia com registro.
  passos: { total: number; mediaDia: number } | null;
  // Quantidade de sessoes de treino e soma da duracao (em minutos).
  treinos: { total: number; duracaoMin: number } | null;
  // Media de horas por noite e quantidade de noites com registro.
  sono: { mediaHoras: number; noites: number } | null;
  // Ultima medida no periodo: peso, delta vs medida anterior, gordura.
  medidaUltima: { peso?: number; deltaPeso?: number; gordura?: number } | null;
}

// Converte um instante para chave de dia YYYY-MM-DD no fuso de São
// Paulo (UTC-3 fixo), alinhado com a forma como os writers gravam a
// `data` dos arquivos. Sem isso, comparar Date direto com a string
// YYYY-MM-DD do frontmatter sofreria shift de fuso na borda do dia.
function diaLocalYmd(d: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Resolve a janela {de, ate} em chaves de dia comparaveis com a `data`
// (YYYY-MM-DD) dos arquivos. `ate` vem do caller (normalmente "agora").
function janelaDias(
  periodo: PeriodoChave,
  ate: Date
): { deYmd: string; ateYmd: string } {
  const chave: PeriodoChave =
    periodo === 'personalizado' ? 'semana' : periodo;
  const range = resolverPeriodo(chave, ate);
  return {
    deYmd: diaLocalYmd(range.de),
    ateYmd: diaLocalYmd(range.ate),
  };
}

// Consolida os dados de saude do periodo num unico objeto. Campos sem
// dado retornam null para permitir render condicional no componente.
export async function calcularSaudeRecap(
  vaultRoot: string,
  periodo: PeriodoChave,
  ate: Date
): Promise<SaudeRecap> {
  const { deYmd, ateYmd } = janelaDias(periodo, ate);
  const dentro = (dataYmd: string): boolean =>
    dataYmd >= deYmd && dataYmd <= ateYmd;

  const [todosPassos, todosTreinos, todoSono, todasMedidas] =
    await Promise.all([
      listarPassos(vaultRoot),
      listarTreinos(vaultRoot),
      listarSono(vaultRoot),
      listarMedidas(vaultRoot, { periodo: 'tudo' }),
    ]);

  // Passos: soma do periodo e media por dia com registro (nao por dia
  // de calendario — dia sem arquivo nao conta no denominador).
  const passosPeriodo = todosPassos.filter((p) => dentro(p.data));
  const passos =
    passosPeriodo.length > 0
      ? (() => {
          const total = passosPeriodo.reduce((acc, p) => acc + p.total, 0);
          const mediaDia = Math.round(total / passosPeriodo.length);
          return { total, mediaDia };
        })()
      : null;

  // Treinos: data e ISO completo; usamos os 10 primeiros chars (dia)
  // para comparar com a janela.
  const treinosPeriodo = todosTreinos.filter((t) =>
    dentro(t.data.slice(0, 10))
  );
  const treinos =
    treinosPeriodo.length > 0
      ? {
          total: treinosPeriodo.length,
          duracaoMin: treinosPeriodo.reduce((acc, t) => acc + t.duracao_min, 0),
        }
      : null;

  // Sono: media de horas por noite. Cada arquivo e uma sessao; somamos
  // a duracao e dividimos pelo numero de sessoes no periodo.
  const sonoPeriodo = todoSono.filter((s) => dentro(s.data));
  const sono =
    sonoPeriodo.length > 0
      ? (() => {
          const totalMin = sonoPeriodo.reduce(
            (acc, s) => acc + s.duracao_min,
            0
          );
          const mediaHoras =
            Math.round((totalMin / sonoPeriodo.length / 60) * 10) / 10;
          return { mediaHoras, noites: sonoPeriodo.length };
        })()
      : null;

  // Medidas: a ultima do periodo. listarMedidas devolve desc, entao o
  // primeiro elemento dentro da janela e o mais recente. deltaPeso e
  // calculado contra a medida imediatamente anterior com peso (pode
  // estar fora do periodo — o delta semanal compara com o registro
  // previo, nao com o inicio da janela).
  const medidasPeriodo = todasMedidas.filter((m) => dentro(m.data));
  const ultima = medidasPeriodo.length > 0 ? medidasPeriodo[0] : null;
  let medidaUltima: SaudeRecap['medidaUltima'] = null;
  if (ultima) {
    medidaUltima = {};
    if (typeof ultima.peso === 'number') {
      medidaUltima.peso = ultima.peso;
      // Procura a proxima medida (mais antiga) com peso definido em toda
      // a lista (desc): primeiro elemento apos a ultima que tenha peso.
      const idxUltima = todasMedidas.indexOf(ultima);
      const anteriorComPeso = todasMedidas
        .slice(idxUltima + 1)
        .find((m) => typeof m.peso === 'number');
      if (anteriorComPeso && typeof anteriorComPeso.peso === 'number') {
        medidaUltima.deltaPeso =
          Math.round((ultima.peso - anteriorComPeso.peso) * 10) / 10;
      }
    }
    if (typeof ultima.gordura === 'number') {
      medidaUltima.gordura = ultima.gordura;
    }
    // Sem nenhum campo util (medida sem peso nem gordura) => trata como
    // ausente para nao renderizar linha vazia.
    if (
      medidaUltima.peso === undefined &&
      medidaUltima.gordura === undefined
    ) {
      medidaUltima = null;
    }
  }

  return { passos, treinos, sono, medidaUltima };
}
