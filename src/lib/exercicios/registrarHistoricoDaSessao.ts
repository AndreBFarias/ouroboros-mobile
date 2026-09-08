// EXE-3B: registrar uma sessao de treino passa a gravar carga, series e
// reps no historico de cada exercicio CADASTRADO que a sessao cita. Ate
// esta sprint o array `historico` do ExercicioSchema existia, a Tela 08
// desenhava o sparkline com ele e ninguem nunca escrevia ali -- os
// unicos toques no array eram carry-forward de edicao. O grafico ficava
// no empty state "Sem historico" para sempre.
//
// Decisoes de desenho (spec EXE-3B secao 3, nao reabrir):
//
//  - A ponte fica em `saveTreino`, o caminho da UI. O puxador do Health
//    Connect chama `escreverTreino` direto e o `nome` que ele grava e'
//    rotulo de tipo de exercicio do HC, nao exercicio cadastrado: fica
//    de fora de proposito.
//  - O casamento e' por slug (`slugifyExercicio` do nome livre do item)
//    e falha em SILENCIO. Nome digitado a mao no sheet e' legitimo e nao
//    vira exercicio cadastrado; sem arquivo, nao ha append e nao ha erro.
//  - Idempotencia pela `data` da sessao: regravar a mesma sessao
//    SUBSTITUI a entrada com aquela data em vez de acrescentar outra.
//    Sem isso, editar uma sessao tres vezes desenha tres pontos no
//    mesmo dia.
//  - Ordem ascendente por data. A Tela 08 le `historico[length - 1]`
//    como "Ultima vez" e o sparkline usa `slice(-maxPontos)`: os dois
//    assumem o mais recente no fim.
//  - Best-effort, nunca bloqueante. Falha em um exercicio nao derruba os
//    outros nem o save da sessao, que ja esta no disco.
//  - Carga ausente vira 0 (`carga_kg` e' opcional para peso corporal, e
//    `HistoricoExecucao.carga` e' obrigatorio). O grafico mostra a serie
//    de zeros pelo que ela e'; nao ha carga a inventar.
//
// Leitura por `readVaultFile` e nao por `lerExercicio`: o helper do
// vault devolve so o meta e descarta o body, e regravar o exercicio com
// body vazio apagaria a prosa que o dono do Vault tenha escrito no .md a
// mao. O que se le aqui e' exatamente o que `lerExercicio` le, mais o
// corpo que precisa voltar intacto ao disco.
//
// Comentarios sem acento (convencao shell/CI).
import { slugifyExercicio } from '@/lib/exercicios/slug';
import {
  ExercicioSchema,
  type HistoricoExecucao,
} from '@/lib/schemas/exercicio';
import type {
  ExercicioSessao,
  TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { escreverExercicio } from '@/lib/vault/exercicios';
import { exercicioPath, vaultUriJoin } from '@/lib/vault/paths';
import { readVaultFile } from '@/lib/vault/reader';

export interface RegistrarHistoricoDaSessaoArgs {
  vaultRoot: string;
  sessao: TreinoSessao;
}

export interface RegistrarHistoricoDaSessaoResult {
  // Quantos arquivos de exercicio foram reescritos com sucesso.
  atualizados: number;
}

// Instante da entrada para ordenacao. Sessoes do app carregam offset
// -03:00 e sessoes importadas do Health Connect podem carregar 'Z':
// ordenar por texto misturaria as duas familias. Data ilegivel cai no
// desempate por string, que ao menos e' estavel.
function instante(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.NaN : t;
}

function ordemPorData(a: HistoricoExecucao, b: HistoricoExecucao): number {
  const ta = instante(a.data);
  const tb = instante(b.data);
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
  return a.data.localeCompare(b.data);
}

// Um item por slug. Dois blocos do mesmo exercicio na mesma sessao sao
// uma entrada so': fica a de maior carga, porque e' ela que descreve o
// esforco do dia; empate mantem a primeira ocorrencia.
function agruparPorSlug(
  itens: readonly ExercicioSessao[]
): Map<string, ExercicioSessao> {
  const porSlug = new Map<string, ExercicioSessao>();
  for (const item of itens) {
    const slug = slugifyExercicio(item.nome);
    const atual = porSlug.get(slug);
    if (!atual) {
      porSlug.set(slug, item);
      continue;
    }
    if ((item.carga_kg ?? 0) > (atual.carga_kg ?? 0)) {
      porSlug.set(slug, item);
    }
  }
  return porSlug;
}

// Substitui a entrada com a mesma `data` (idempotencia) e devolve a
// lista ordenada ascendente.
function comEntrada(
  historico: readonly HistoricoExecucao[],
  entrada: HistoricoExecucao
): HistoricoExecucao[] {
  const semADaquelaData = historico.filter((h) => h.data !== entrada.data);
  return [...semADaquelaData, entrada].sort(ordemPorData);
}

export async function registrarHistoricoDaSessao(
  args: RegistrarHistoricoDaSessaoArgs
): Promise<RegistrarHistoricoDaSessaoResult> {
  const { vaultRoot, sessao } = args;
  if (!vaultRoot) return { atualizados: 0 };

  let atualizados = 0;

  for (const [slug, item] of agruparPorSlug(sessao.exercicios)) {
    try {
      const uri = vaultUriJoin(vaultRoot, exercicioPath(slug));
      const arquivo = await readVaultFile(uri, ExercicioSchema);
      // Sem arquivo: nome livre que nao e' exercicio cadastrado. Segue
      // em frente sem erro (decisao 3.2).
      if (!arquivo) continue;

      const entrada: HistoricoExecucao = {
        data: sessao.data,
        carga: item.carga_kg ?? 0,
        series: item.series,
        reps: item.reps,
      };

      await escreverExercicio(
        vaultRoot,
        {
          ...arquivo.meta,
          historico: comEntrada(arquivo.meta.historico, entrada),
        },
        arquivo.body
      );
      atualizados += 1;
    } catch {
      // Best-effort por exercicio: arquivo ilegivel, schema invalido ou
      // escrita rejeitada nao param os demais nem o save da sessao.
    }
  }

  return { atualizados };
}
