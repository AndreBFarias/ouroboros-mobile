// Registra o exercicio marcado em "Adicionar a treino livre" (Tela 08)
// na sessao de treino livre de HOJE, criando-a se ainda nao existir.
//
// EXE-2 (2026-09-08): este modulo escrevia um DRAFT
// (treinos/draft/<dia>-<slug>.md, tipo treino_draft) e o cabecalho
// antigo afirmava que, existindo draft do mesmo dia, ele "le o
// existente, concatena o slug novo e regrava... sem criar arquivos
// duplicados". Era o contrario do que o codigo fazia: o nome do arquivo
// carregava o slug do EXERCICIO, entao a leitura caia sempre no arquivo
// do proprio exercicio -- vazio na primeira vez. Cinco exercicios
// marcados num dia viravam cinco drafts, e a migracao de boot os
// convertia em cinco sessoes de 30 minutos: "5 sessoes, 150 minutos" no
// Recap e marco automatico de tres treinos na semana sem treino nenhum.
//
// O que o codigo faz agora, e que este cabecalho descreve de verdade:
//
//  - Procura a sessao de treino livre de hoje do autor pela LISTAGEM
//    (encontrarSessaoTreinoLivre), nunca remontando o path a partir do
//    conteudo. Achou: anexa o exercicio a lista dela e reescreve no
//    MESMO arquivo (relOverride com o `rel` que veio da listagem, EXE-1).
//    Nao achou: cria uma sessao nova.
//  - Ao anexar, RELE o arquivo antes de regravar e preserva o corpo que
//    estiver la'. A listagem devolve meta e rel, nunca o corpo, entao
//    regravar com a frase enlatada (CORPO_SESSAO) apagaria o que o dono
//    do Vault escreveu no .md pelo Obsidian, sem erro e sem lixeira. A
//    frase enlatada vale so' na criacao.
//  - Nao escreve mais nada em treinos/draft/. A pasta e o
//    `treinosDraftPath` continuam existindo porque a migracao ainda
//    consome os drafts que ficaram no disco de quem usou o botao antes.
//  - A duracao e' DERIVADA do tempo decorrido desde o inicio da sessao,
//    limitada a 1..240. Na criacao da' 1. Nenhuma constante multiplicada
//    pelo numero de exercicios entra na conta -- foi exatamente isso que
//    produziu os 150 minutos.
//  - Series e reps entram como 1x1, o minimo que o ExercicioSessaoSchema
//    aceita. O toque rapido nao informa nem um nem outro, e "3x10" seria
//    invencao da mesma classe dos 30 minutos. O usuario edita pela
//    Tela 10 (SheetNovoTreino).
//
// Por que `escreverTreino` e nao `saveTreino`: saveTreino empurra a
// sessao para o Health Connect quando o toggle esta ligado, e o
// clientRecordId de la deriva do INICIO calculado (data menos duracao).
// Como a duracao cresce a cada exercicio marcado, cada toque geraria um
// id diferente e portanto um registro HC novo -- a mesma supercontagem
// que esta sprint remove, so' que dentro do Health Connect.
//
// Comentarios sem acento (convencao shell/CI).
// Imports diretos aos modulos finais (nao ao barrel @/lib/vault) para
// evitar ciclo de carregamento durante jest.requireActual nos testes que
// mockam o barrel.
import { escreverTreino } from '@/lib/vault/treinos';
import { readVaultFile } from '@/lib/vault/reader';
import { formatDateYmd } from '@/lib/vault/paths';
import { isoComOffsetLocal } from '@/lib/datetime/local';
import {
  encontrarSessaoTreinoLivre,
  ROTINA_TREINO_LIVRE,
  slugTreinoLivre,
} from '@/lib/treinos/treinoLivre';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';

// Limites do campo duracao_min no TreinoSessaoSchema.
const DURACAO_MIN = 1;
const DURACAO_MAX = 240;

const CORPO_SESSAO =
  'Sessão de treino livre montada pelo detalhe do exercício. Séries, repetições e carga ficam em branco até você editar.\n';

export interface AdicionarTreinoLivreArgs {
  vaultRoot: string;
  exercicioSlug: string;
  autor: PessoaAutor;
}

export interface AdicionarTreinoLivreResult {
  uri: string;
  // Path relativo do arquivo da sessao (identidade estavel, EXE-1).
  rel: string;
  // true se criou a sessao do dia, false se anexou a uma existente.
  criadoNovo: boolean;
}

// Minutos decorridos entre o inicio da sessao e agora, limitados a
// 1..240. Sessao recem-criada da' 1 (o schema nao aceita 0); sessao
// aberta ha mais de 4h fica no teto, porque duracao maior que isso o
// usuario corrige na Tela 10 e nao ha de onde adivinhar.
function duracaoDerivada(inicioIso: string, agora: Date): number {
  const inicio = new Date(inicioIso).getTime();
  if (!Number.isFinite(inicio)) return DURACAO_MIN;
  const minutos = Math.round((agora.getTime() - inicio) / 60_000);
  if (!Number.isFinite(minutos)) return DURACAO_MIN;
  return Math.min(DURACAO_MAX, Math.max(DURACAO_MIN, minutos));
}

// URI absoluta do arquivo da sessao, montada EXATAMENTE como o
// `joinUri` interno de escreverTreino (src/lib/vault/treinos.ts:50-53).
// A duplicacao e' deliberada: o corpo precisa ser lido do mesmo arquivo
// que a escrita logo abaixo vai substituir. Montar a URI por outro
// caminho -- vaultUriJoin, por exemplo, que tambem apara espaco e %20
// no fim do root -- erraria o alvo num root com espaco final, a leitura
// voltaria null e a perda de corpo que esta leitura existe para evitar
// voltaria em silencio.
function uriDaSessao(vaultRoot: string, rel: string): string {
  const root = vaultRoot.endsWith('/') ? vaultRoot.slice(0, -1) : vaultRoot;
  return `${root}/${rel}`;
}

export async function adicionarTreinoLivre(
  args: AdicionarTreinoLivreArgs
): Promise<AdicionarTreinoLivreResult> {
  const { vaultRoot, exercicioSlug, autor } = args;

  if (!exercicioSlug || exercicioSlug.length === 0) {
    throw new Error('exercicio slug obrigatorio');
  }

  const agora = new Date();
  const hoje = formatDateYmd(agora);
  const existente = await encontrarSessaoTreinoLivre(vaultRoot, hoje, autor);

  if (existente) {
    // Mesmo exercicio marcado duas vezes nao vira dois itens; a sessao
    // e' reescrita mesmo assim porque a duracao decorrida mudou.
    const jaTem = existente.meta.exercicios.some(
      (e) => e.nome === exercicioSlug
    );
    const meta: TreinoSessao = {
      ...existente.meta,
      duracao_min: duracaoDerivada(existente.meta.data, agora),
      exercicios: jaTem
        ? existente.meta.exercicios
        : [
            ...existente.meta.exercicios,
            { nome: exercicioSlug, series: 1, reps: 1 },
          ],
    };
    // O corpo NAO vem da listagem: TreinoListado carrega so' `meta` e
    // `rel` (src/lib/vault/treinos.ts:59-62). Sem esta leitura, o
    // segundo toque do dia carimbava CORPO_SESSAO por cima do que o dono
    // do Vault tivesse escrito no corpo do .md pelo Obsidian -- perda
    // silenciosa, sem erro e sem lixeira. Custo: uma leitura a mais por
    // toque, e so' no ramo em que a sessao ja existe.
    //
    // Corpo vazio continua vazio (`??`, nao `||`): quem apagou a frase
    // enlatada nao a recebe de volta. Se o arquivo estiver ilegivel,
    // readVaultFile devolve null e a frase volta -- mas esse caso e'
    // praticamente inalcancavel aqui, porque a listagem que produziu
    // `existente` acabou de ler e parsear este mesmo arquivo.
    const atual = await readVaultFile(
      uriDaSessao(vaultRoot, existente.rel),
      TreinoSessaoSchema
    );
    const { uri, rel } = await escreverTreino(
      vaultRoot,
      slugTreinoLivre(autor),
      meta,
      atual?.body ?? CORPO_SESSAO,
      { relOverride: existente.rel }
    );
    return { uri, rel, criadoNovo: false };
  }

  const meta: TreinoSessao = {
    tipo: 'treino_sessao',
    data: isoComOffsetLocal(agora),
    autor,
    rotina: ROTINA_TREINO_LIVRE,
    duracao_min: DURACAO_MIN,
    exercicios: [{ nome: exercicioSlug, series: 1, reps: 1 }],
  };
  const { uri, rel } = await escreverTreino(
    vaultRoot,
    slugTreinoLivre(autor),
    meta,
    CORPO_SESSAO
  );
  return { uri, rel, criadoNovo: true };
}
