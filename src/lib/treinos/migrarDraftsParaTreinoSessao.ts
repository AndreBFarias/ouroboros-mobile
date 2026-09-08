// Migra drafts de treino livre criados pela M13
// (treinos/draft/<YYYY-MM-DD>-<slug>.md com tipo: treino_draft) para
// sessoes formais TreinoSessaoSchema em treinos/.
//
// EXE-2 (2026-09-08): a migracao passou a COLAPSAR POR DIA. Antes, cada
// draft virava uma sessao propria de 30 minutos -- e como o caminho que
// criava os drafts nomeava o arquivo pelo slug do EXERCICIO, cinco
// exercicios marcados num dia viravam cinco sessoes e 150 minutos. Agora
// os drafts do mesmo (dia, autor) viram UMA sessao com a uniao dos
// exercicios, e os 30 minutos sao estimativa DA SESSAO, nao de cada
// exercicio. O caminho de escrita novo (adicionarTreinoLivre) nao produz
// mais draft nenhum; esta migracao continua viva apenas pelo que ja esta
// no disco de quem usou o botao antes.
//
// Idempotencia, que aqui e' o ponto delicado. O `deleteVaultFile` do fim
// e' best-effort e engole o erro, entao um draft PODE reaparecer na
// rodada seguinte; antes da EXE-1 isso nao duplicava por acidente (o
// path colidia e sobrescrevia), e depois dela a hora entrou no nome e a
// remigracao passaria a duplicar. Duas travas, nesta ordem, sustentam a
// convergencia -- nao existe marcador de flag em disco, e o cabecalho
// antigo que citava `.ouroboros/cache/migracao-drafts-m11.flag` afirmava
// algo que nunca foi lido nem escrito por este modulo:
//
//   1. O destino nao deriva do conteudo nem da lista de drafts: e'
//      treinos/<dia>-0000-treino-livre-<autor>.md (slugTreinoLivre). A
//      hora e' sempre 0000 porque o draft so' carrega YYYY-MM-DD.
//   2. Antes de escrever, procura pela LISTAGEM a sessao de treino livre
//      que ja existe naquele dia para aquele autor e reescreve NELA. E'
//      o que impede o segundo cenario de duplicata: draft remigrado
//      depois que a sessao ja foi gravada em formato legado (sem hora,
//      de uma migracao anterior a EXE-1) ou com hora real (de um toque
//      em "Adicionar a treino livre"). A uniao de exercicios e' por
//      nome, entao remigrar o mesmo draft nao mexe em nada.
//
// Falha ao ESCREVER nao apaga draft nenhum do grupo: os drafts contam
// como ignorados e voltam na proxima rodada.
//
// Plugado em BOOT_HOOKS pela M11. Falha silenciosa em ambiente sem
// FileSystem (web mock).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { deleteVaultFile } from '@/lib/vault/remover';
import { useVault } from '@/lib/stores/vault';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { treinosPath } from '@/lib/vault/paths';
import { listarTreinosComRel } from '@/lib/vault/treinos';
import {
  ROTINA_TREINO_LIVRE,
  sessaoTreinoLivreDoDia,
  slugTreinoLivre,
} from '@/lib/treinos/treinoLivre';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { PessoaAutorSchema, type PessoaAutor } from '@/lib/schemas/pessoa';

// Estimativa neutra de duracao, POR SESSAO. O draft nao guarda horario
// nenhum, entao nao ha o que derivar; o usuario corrige pela Tela 10.
const DURACAO_ESTIMADA_MIN = 30;

// Series e reps de exercicio migrado. Preservados do comportamento
// anterior de proposito: mexer neles reescreveria dado de quem ja
// migrou, e nao e' o defeito que esta sprint conserta.
const SERIES_MIGRADA = 3;
const REPS_MIGRADA = 10;

const CORPO_SESSAO =
  'Sessao migrada automaticamente do draft criado em "Adicionar a treino livre".\n';

// Re-cria o schema do draft inline (o formato que adicionarTreinoLivre
// escrevia ate a EXE-2) para validar leitura.
const TreinoDraftSchema = z.object({
  tipo: z.literal('treino_draft'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
  autor: PessoaAutorSchema,
  exercicios: z.array(z.string()).min(1),
});

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Extrai a data do path canonico treinos/draft/<YYYY-MM-DD>-<slug>.md.
// O slug do arquivo nao interessa mais para o destino (ele era o slug do
// exercicio, e e' justamente o que fazia um arquivo por exercicio), mas
// continua exigido pelo padrao: nome fora dele nao e' draft nosso.
function dataDoDraft(uri: string): string | null {
  const decoded = decodeURIComponent(uri);
  const match = decoded.match(/(\d{4}-\d{2}-\d{2})-([^/]+)\.md$/);
  return match ? match[1] : null;
}

// Drafts de um mesmo (dia, autor), que viram uma sessao so'.
interface GrupoDraft {
  data: string;
  autor: PessoaAutor;
  // Slugs de exercicio na ordem em que apareceram, sem repeticao.
  exercicios: string[];
  // URIs dos drafts consumidos por este grupo.
  uris: string[];
}

// Resultado da migracao para inspecao em testes / debug. `migrados`
// conta DRAFTS consumidos, nao sessoes escritas -- cinco drafts de um
// mesmo dia dao migrados = 5 e uma sessao.
export interface MigracaoDraftsResult {
  migrados: number;
  ignorados: number;
}

export async function migrarDraftsParaTreinoSessao(
  vaultRootArg?: string
): Promise<MigracaoDraftsResult> {
  // Caller pode passar root explicito (em testes); senao pega do
  // store. Sem root não ha o que migrar (Vault não concedido).
  const vaultRoot =
    typeof vaultRootArg === 'string' && vaultRootArg.length > 0
      ? vaultRootArg
      : useVault.getState().vaultRoot;
  if (!vaultRoot) return { migrados: 0, ignorados: 0 };

  // Treinos drafts (M11) ainda em layout legado: pasta 'treinos/draft'.
  const draftsFolderUri = joinUri(vaultRoot, 'treinos/draft');
  const arquivos = await listVaultFolder(draftsFolderUri, '.md');

  let ignorados = 0;
  // Chave: `${data}|${autor}`. Map preserva a ordem de insercao, entao a
  // ordem de escrita acompanha a ordem da listagem.
  const grupos = new Map<string, GrupoDraft>();

  for (const draftUri of arquivos) {
    // Filtro defensivo: copias geradas pelo Syncthing em janela de
    // conflito (sync-conflict-<YYYYMMDD>-<HHMMSS>-<dispid>) nao
    // viram TreinoSessao espelho. O arquivo continua no path
    // original para reconciliacao manual via Obsidian/Syncthing.
    // (sprint AUDIT-T1B7-DRAFT-EXPORT-FIX)
    if (ehSyncConflict(draftUri)) continue;

    const data = dataDoDraft(draftUri);
    if (!data) {
      ignorados++;
      continue;
    }

    let draft: { meta: z.infer<typeof TreinoDraftSchema>; body: string } | null;
    try {
      draft = await readVaultFile(draftUri, TreinoDraftSchema);
    } catch {
      ignorados++;
      continue;
    }
    if (!draft) {
      ignorados++;
      continue;
    }

    const chave = `${data}|${draft.meta.autor}`;
    const grupo = grupos.get(chave) ?? {
      data,
      autor: draft.meta.autor,
      exercicios: [],
      uris: [],
    };
    for (const nome of draft.meta.exercicios) {
      if (!grupo.exercicios.includes(nome)) grupo.exercicios.push(nome);
    }
    grupo.uris.push(draftUri);
    grupos.set(chave, grupo);
  }

  if (grupos.size === 0) return { migrados: 0, ignorados };

  // Uma listagem so' para todos os grupos: as chaves sao distintas, logo
  // nenhuma sessao escrita aqui e' alvo de um grupo posterior.
  const sessoesExistentes = await listarTreinosComRel(vaultRoot);

  let migrados = 0;

  for (const grupo of grupos.values()) {
    const existente = sessaoTreinoLivreDoDia(
      sessoesExistentes,
      grupo.data,
      grupo.autor
    );
    const base = existente?.meta;

    // Uniao por nome: o que ja esta na sessao fica como esta (inclusive
    // series/reps editados pelo usuario); so' o que falta entra.
    const exercicios = [...(base?.exercicios ?? [])];
    for (const nome of grupo.exercicios) {
      if (!exercicios.some((e) => e.nome === nome)) {
        exercicios.push({
          nome,
          series: SERIES_MIGRADA,
          reps: REPS_MIGRADA,
        });
      }
    }

    // Sessao existente manda na data e na duracao: ela pode ter horario
    // real e duracao derivada (veio de um toque), e a estimativa de 30
    // minutos daqui nao tem por que sobrescrever isso.
    const dataIso = base?.data ?? `${grupo.data}T00:00:00-03:00`;
    const sessao: TreinoSessao = {
      ...(base ?? {}),
      tipo: 'treino_sessao',
      data: dataIso,
      autor: grupo.autor,
      rotina: ROTINA_TREINO_LIVRE,
      duracao_min: base?.duracao_min ?? DURACAO_ESTIMADA_MIN,
      exercicios,
    };

    const parsed = TreinoSessaoSchema.safeParse(sessao);
    if (!parsed.success) {
      ignorados += grupo.uris.length;
      continue;
    }

    const novoRel =
      existente?.rel ??
      treinosPath(new Date(dataIso), slugTreinoLivre(grupo.autor));
    const novoUri = joinUri(vaultRoot, novoRel);

    // Quando `existente` aponta para uma sessao ja gravada, este write cai
    // em cima do arquivo dela. Gravar CORPO_SESSAO fixo apagaria a prosa
    // que a pessoa escreveu no corpo -- e este e' um hook de boot, que roda
    // sem ela pedir. Le o corpo atual e preserva.
    //
    // Corpo vazio continua vazio (`??`, nao `||`): quem apagou a frase
    // enlatada nao a recebe de volta. So' le no ramo em que a sessao ja
    // existe; no caminho de arquivo novo nao ha o que preservar.
    const atual = existente?.rel
      ? await readVaultFile(novoUri, TreinoSessaoSchema)
      : null;

    try {
      await writeVaultFile<TreinoSessao>(
        novoUri,
        parsed.data,
        atual?.body ?? CORPO_SESSAO
      );
    } catch {
      // Escrita falhou: nenhum draft do grupo e' apagado, e todos voltam
      // na proxima rodada.
      ignorados += grupo.uris.length;
      continue;
    }

    // So' depois da escrita boa. Falha ao apagar não reverte a migracao:
    // o draft fica como artefato e a rodada seguinte converge na mesma
    // sessao (a uniao por nome torna a remigracao um no-op de conteudo).
    for (const draftUri of grupo.uris) {
      try {
        await deleteVaultFile(draftUri);
      } catch {
        // ok.
      }
    }
    migrados += grupo.uris.length;
  }

  return { migrados, ignorados };
}
