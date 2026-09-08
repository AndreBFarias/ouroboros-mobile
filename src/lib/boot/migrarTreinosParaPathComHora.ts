// Boot hook one-shot EXE-1 (2026-09-08): renomeia sessoes de treino do
// formato legado 'treinos/YYYY-MM-DD-<slug>.md' para o formato com hora
// 'treinos/YYYY-MM-DD-HHmm-<slug>.md'.
//
// Contexto: ate a EXE-1 a identidade de uma sessao no disco era so'
// (dia, slug-da-rotina). Duas execucoes da mesma rotina no mesmo dia
// resolviam para o mesmo arquivo e a segunda truncava a primeira -- sem
// erro, sem lixeira, sem versao anterior. A hora no nome fecha o buraco
// dali para a frente; esta migracao alinha o que ja esta gravado, para
// que a listagem, a edicao e a exclusao falem de um formato so'.
//
// O QUE ESTA MIGRACAO NAO FAZ, e nao pode fazer: recuperar sessao ja
// sobrescrita. writeVaultFile trunca o arquivo (writer.ts:92) e nao ha
// copia anterior em lugar nenhum. Ela renomeia o que existe. Nao cria
// sessao, nao duplica sessao para "compensar", nao estima duracao. Por
// isso a contagem de listarTreinos e' identica antes e depois: migracao
// que aumenta a contagem esta com bug de colisao, migracao que diminui
// esta perdendo arquivo. A colisao do item 3 preserva essa contagem --
// o legado vira a copia com sufixo e o ocupante fica onde esta, dois
// arquivos antes e dois depois.
//
// DECISAO EXPLICITA sobre colisao (2026-09-08, ressalva do painel): ela
// NAO e' falha, entao NAO segura a flag. Retentar nao teria o que
// refazer -- a origem legada ja foi renomeada nesta mesma passada -- e
// em vault sob Syncthing um boot a mais so' aumenta a janela para uma
// terceira copia. A consequencia, que fica escrita porque e' o custo da
// decisao: a copia com sufixo e' PERMANENTE. Se dois devices pareados
// rodarem a one-shot cada um com um lado da pasta ja sincronizado, a
// mesma sessao pode terminar como '-<slug>.md' e '-<slug>-2.md'. O app
// nao apaga nenhuma das duas por conta propria; quem resolve e' o
// usuario pela aba Treinos. Cada colisao sai no devLog com o par
// (origem, destino) justamente para ser localizavel.
//
// Travas de seguranca, todas obrigatorias:
//   1. A leitura e' POR PASTA (listVaultFolder), nunca por regex de
//      nome. O conjunto de basenames existentes sai dessa mesma
//      listagem -- sem getInfoAsync, que inverte o resultado em
//      content:// (pasta legivel vira "inexistente").
//   2. Nada e' apagado sem o destino existir: o delete da origem so'
//      roda depois de a escrita do destino ter retornado sem erro.
//   3. Colisao nunca sobrescreve: o destino ja presente ganha sufixo
//      '-2' ate' '-9', e o caso e' contado em `colisoes`. Estourado o
//      teto, nada e' escrito e o arquivo conta em `ignorados` -- sem
//      teto, o cenario do item 5 escreveria uma copia nova por boot,
//      para sempre.
//   4. A flag so' sobe quando `ignorados === 0`, mesmo criterio que a
//      AUDIT-P1-5 impos a vaultLayoutMigrado. Boot seguinte tenta de
//      novo o que falhou.
//   5. Delete da origem que lanca NAO autoriza, sozinho, desfazer o
//      destino: "lancou" nao e' o mesmo que "o arquivo continua la'".
//      Um delete que sai por arquivo ausente -- origem levada por sync
//      concorrente depois da listagem -- cai no mesmo catch, e o
//      rollback cego apagaria a unica copia restante, sumindo com a
//      sessao das duas pontas. Reconferencia por LISTAGEM antes de
//      desfazer; sem confirmacao, nada e' apagado.
//
// O slug do destino vem do NOME DO ARQUIVO antigo, nao de meta.rotina:
// arquivo que o usuario renomeou a mao no Obsidian continua com o nome
// que ele escolheu, so' com a hora inserida.
//
// Comentarios sem acento (convencao shell/CI).
import { useSessao } from '@/lib/stores/sessao';
import { useVault } from '@/lib/stores/vault';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { deleteVaultFile } from '@/lib/vault/remover';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { treinosPath } from '@/lib/vault/paths';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { devLog } from '@/lib/util/devLog';

// Nome ja no formato novo: data + hora de 4 digitos.
const FORMATO_COM_HORA = /^\d{4}-\d{2}-\d{2}-\d{4}-/;
// Nome no formato legado: data + slug (o slug e' o resto ate' o .md).
const FORMATO_LEGADO = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/i;

export interface MigracaoTreinosHoraResultado {
  migrados: number;
  colisoes: number;
  ignorados: number;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${trimmedRoot}/${s}`;
}

// Ultimo segmento da URI, decodificado. listVaultFolder devolve URIs
// completas nos dois schemes (file:// com nome percent-encoded,
// content:// com o path do documento encodado inteiro).
function basenameDeUri(uri: string): string {
  const decoded = decodeURIComponent(uri);
  return decoded.split('/').pop() ?? '';
}

// Insere sufixo numerico antes da extensao: 'x.md' -> 'x-2.md'.
function comSufixo(basename: string, n: number): string {
  const stem = basename.replace(/\.md$/i, '');
  return `${stem}-${n}.md`;
}

// Teto do sufixo de colisao: '-2' ate' '-9'. Sem teto, o unico cenario
// que produz sufixo novo a cada boot -- delete da origem falhando de
// forma persistente, com o rollback do destino falhando junto -- faz o
// numero subir para sempre, uma copia por boot. Com teto, a pasta para
// de crescer e o arquivo passa a contar em `ignorados`.
const SUFIXO_COLISAO_MAX = 9;

// Migracao one-shot. `vaultRootArg` existe para teste e uso manual;
// sem ele o root sai do store (Vault nao concedido => no-op).
export async function migrarTreinosParaPathComHora(
  vaultRootArg?: string
): Promise<MigracaoTreinosHoraResultado> {
  const resultado: MigracaoTreinosHoraResultado = {
    migrados: 0,
    colisoes: 0,
    ignorados: 0,
  };

  if (useSessao.getState().flags.treinosPathHoraMigrado) return resultado;

  const vaultRoot =
    typeof vaultRootArg === 'string' && vaultRootArg.length > 0
      ? vaultRootArg
      : useVault.getState().vaultRoot;
  if (!vaultRoot) return resultado;

  const folderUri = joinUri(vaultRoot, 'treinos');
  const uris = await listVaultFolder(folderUri, '.md');

  // Conjunto de nomes que existem na pasta. A checagem de existencia do
  // destino sai daqui, nunca de getInfoAsync.
  const existentes = new Set<string>();
  for (const uri of uris) {
    const b = basenameDeUri(uri);
    if (b.length > 0) existentes.add(b);
  }

  // Ordem estavel: dois devices com o mesmo conteudo resolvem colisao
  // na mesma sequencia.
  const candidatos = [...uris].sort((a, b) =>
    basenameDeUri(a) < basenameDeUri(b) ? -1 : 1
  );

  for (const origemUri of candidatos) {
    if (ehSyncConflict(origemUri)) continue;
    const decoded = decodeURIComponent(origemUri);
    if (decoded.includes('/treinos/draft/')) continue;

    const basename = basenameDeUri(origemUri);
    if (FORMATO_COM_HORA.test(basename)) continue;
    const partes = basename.match(FORMATO_LEGADO);
    // Nome fora do padrao de sessao (helper, anotacao solta): fica onde
    // esta. Nao e' falha, entao nao entra em `ignorados`.
    if (!partes) continue;
    const slug = partes[2];

    let lido: { meta: TreinoSessao; body: string } | null;
    try {
      lido = await readVaultFile(origemUri, TreinoSessaoSchema);
    } catch {
      resultado.ignorados += 1;
      continue;
    }
    if (!lido) {
      resultado.ignorados += 1;
      continue;
    }

    const destinoRelBase = treinosPath(new Date(lido.meta.data), slug);
    const destinoBasenameBase = destinoRelBase.split('/').pop() ?? '';

    // Colisao: destino ja existe na pasta ou foi criado nesta rodada.
    let destinoBasename = destinoBasenameBase;
    let houveColisao = false;
    let n = 2;
    while (existentes.has(destinoBasename) && n <= SUFIXO_COLISAO_MAX) {
      destinoBasename = comSufixo(destinoBasenameBase, n);
      houveColisao = true;
      n += 1;
    }
    if (existentes.has(destinoBasename)) {
      // Teto estourado: NAO escreve copia nova. A origem fica intacta,
      // o caso conta em `ignorados` e a flag segura -- o boot seguinte
      // reavalia a pasta, que a essa altura precisa de intervencao pela
      // aba Treinos.
      devLog(
        '[migrarTreinosParaPathComHora] teto de colisao atingido',
        basename
      );
      resultado.ignorados += 1;
      continue;
    }

    const destinoRel = `treinos/${destinoBasename}`;
    const destinoUri = joinUri(vaultRoot, destinoRel);

    try {
      await writeVaultFile<TreinoSessao>(destinoUri, lido.meta, lido.body);
    } catch {
      // Destino nao existe: a origem fica intacta e o boot seguinte
      // tenta de novo (a flag nao sobe com ignorados > 0).
      resultado.ignorados += 1;
      continue;
    }

    existentes.add(destinoBasename);
    try {
      await deleteVaultFile(origemUri);
    } catch {
      // O delete da origem lancou -- e lancar NAO prova que o arquivo
      // continua no disco. Delete que sai por "arquivo nao encontrado"
      // (a origem sumiu por sync concorrente entre a listagem e agora)
      // cai exatamente aqui, e desfazer o destino nesse caso apagaria a
      // unica copia restante da sessao: ela sumiria das duas pontas.
      // Por isso reconferimos POR LISTAGEM, a mesma trava 1 -- nunca
      // getInfoAsync, que inverte o resultado em content://.
      const nomesAgora = new Set(
        (await listVaultFolder(folderUri, '.md')).map(basenameDeUri)
      );
      if (nomesAgora.has(basename)) {
        // Origem confirmada no disco: desfazemos o destino para nao
        // deixar a mesma sessao duas vezes na pasta (a contagem de
        // listarTreinos tem de ser identica antes e depois). A origem
        // continua la', entao o rollback nao perde dado nenhum, e o
        // boot seguinte tenta de novo -- a flag nao sobe com
        // `ignorados > 0`.
        try {
          await deleteVaultFile(destinoUri);
          existentes.delete(destinoBasename);
        } catch {
          // Melhor esforco: a duplicata fica visivel na aba Treinos e o
          // usuario resolve pela UI. Nada foi perdido.
        }
        resultado.ignorados += 1;
        continue;
      }
      if (!nomesAgora.has(destinoBasename)) {
        // Listagem inconclusiva: nem a origem nem o destino recem
        // escrito aparecem. Nao da' para afirmar sucesso nem para
        // autorizar descarte -- entao nada e' apagado, conta em
        // `ignorados` e o boot seguinte decide com uma listagem limpa.
        resultado.ignorados += 1;
        continue;
      }
      // Origem ausente e destino presente: o rename completou e o erro
      // veio depois do efeito. Segue como migrado.
    }
    existentes.delete(basename);

    resultado.migrados += 1;
    if (houveColisao) {
      resultado.colisoes += 1;
      // Visibilidade da decisao 3 do cabecalho: a copia com sufixo e'
      // permanente, entao o par (origem, destino) precisa aparecer no
      // log para que ela seja localizavel na aba Treinos.
      devLog('[migrarTreinosParaPathComHora] colisao', {
        origem: basename,
        destino: destinoBasename,
      });
    }
  }

  if (resultado.ignorados === 0) {
    useSessao.getState().marcarFlagBoot('treinosPathHoraMigrado');
  }
  if (
    resultado.migrados > 0 ||
    resultado.colisoes > 0 ||
    resultado.ignorados > 0
  ) {
    devLog('[migrarTreinosParaPathComHora]', resultado);
  }
  return resultado;
}
