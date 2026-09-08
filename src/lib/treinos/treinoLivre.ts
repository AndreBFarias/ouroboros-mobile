// Identidade da sessao de "treino livre" -- a que nasce de tocar
// "Adicionar a treino livre" no detalhe do exercicio (Tela 08).
//
// EXE-2 (2026-09-08): antes desta sprint cada toque criava um DRAFT
// proprio, nomeado pelo slug do EXERCICIO
// (treinos/draft/<dia>-<exercicio>.md), e a migracao de boot convertia
// cada draft numa sessao de 30 minutos fixos. Cinco exercicios marcados
// num dia viravam "5 sessoes, 150 minutos" no Recap e disparavam o marco
// automatico de tres treinos na semana sem que ninguem tivesse treinado
// tres vezes. Agora o toque escreve direto UMA sessao por (dia, autor), e
// e' este modulo que responde "qual arquivo e' essa sessao".
//
// Duas responsabilidades, ambas compartilhadas entre o caminho novo
// (adicionarTreinoLivre) e a migracao dos drafts legados
// (migrarDraftsParaTreinoSessao), para que os dois nao possam divergir
// sobre onde a sessao mora:
//
//   1. slugTreinoLivre(autor) -- o nome do arquivo NAO deriva do
//      conteudo. Deriva de (dia, autor), que e' a chave de agrupamento.
//      O autor entra porque dois devices pareados por Syncthing gravam
//      no mesmo vault: sem ele, o treino livre de pessoa_a e o de
//      pessoa_b do mesmo dia colidiriam no mesmo caminho e o ultimo a
//      escrever venceria (o padrao descrito na secao 5.5 do briefing).
//   2. sessaoTreinoLivreDoDia / encontrarSessaoTreinoLivre -- procura a
//      sessao ja existente pela LISTAGEM, nunca remontando o path a
//      partir do conteudo. Isso e' o que faz o segundo exercicio do dia
//      cair no mesmo arquivo do primeiro mesmo quando o arquivo esta em
//      formato legado (sem hora, migrado antes da EXE-1) ou quando o
//      usuario renomeou a rotina pela Tela 10.
//
// Comentarios sem acento (convencao shell/CI).
import { listarTreinosComRel, type TreinoListado } from '@/lib/vault/treinos';
import { slugifyTreino } from '@/lib/treinos/slug';
import { isoToDataLocalYmd } from '@/lib/datetime/local';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Rotina canonica da sessao de treino livre. E' tambem o discriminador
// da busca: sessao com outra rotina no mesmo dia e' outro treino e nao
// recebe o exercicio marcado.
export const ROTINA_TREINO_LIVRE = 'Treino livre';

// Slug do arquivo da sessao de treino livre. Deriva so' de `autor`, que
// junto com o dia forma a chave; nada aqui depende da lista de
// exercicios, entao remigrar ou reabrir a mesma sessao resolve sempre
// para o mesmo caminho.
export function slugTreinoLivre(autor: PessoaAutor): string {
  return `${slugifyTreino(ROTINA_TREINO_LIVRE)}-${autor.replace(/_/g, '-')}`;
}

// Seleciona, numa listagem ja carregada, a sessao de treino livre do dia
// civil informado (YYYY-MM-DD no fuso do app) para o autor informado.
// Puro de proposito: a migracao lista a pasta UMA vez e chama isto por
// grupo, em vez de pagar uma listagem por grupo.
//
// Quando ha mais de uma (vault que ja veio com duplicata de antes desta
// sprint), devolve a mais recente: `listarTreinosComRel` ordena por data
// desc, e o filtro preserva essa ordem.
export function sessaoTreinoLivreDoDia(
  sessoes: TreinoListado[],
  dataYmd: string,
  autor: PessoaAutor
): TreinoListado | null {
  const doDia = sessoes.filter(
    (s) =>
      s.meta.autor === autor &&
      s.meta.rotina === ROTINA_TREINO_LIVRE &&
      isoToDataLocalYmd(s.meta.data) === dataYmd
  );
  return doDia.length > 0 ? doDia[0] : null;
}

// Versao que lista o Vault. Usada pelo caminho interativo, que precisa
// da sessao de um unico dia.
export async function encontrarSessaoTreinoLivre(
  vaultRoot: string,
  dataYmd: string,
  autor: PessoaAutor
): Promise<TreinoListado | null> {
  const sessoes = await listarTreinosComRel(vaultRoot, { autor });
  return sessaoTreinoLivreDoDia(sessoes, dataYmd, autor);
}
