// Boot hook one-shot AUDIT-P1-4: colapsa duplicatas de agenda que ja
// existem no Vault.
//
// Contexto: o path de cada evento embute a data
// (paths.ts agendaEventoPath => markdown/agenda-<pessoa>-<YMD>-<id>.md).
// Ate o fix desta sprint, um evento remarcado no Google era gravado no
// path da data nova sem que o .md da data antiga fosse apagado -- a
// etapa de remocao de sincronizarSnapshotAgenda so olha ids ausentes do
// snapshot, e o id continuava presente. Resultado: N copias do mesmo
// evento, uma por remarcacao, e a agenda mostrando o compromisso em
// datas que nao existem mais.
//
// sincronizarSnapshotAgenda agora limpa isso sozinho no proximo sync,
// mas so quando o sync roda. Vault de quem desligou o toggle
// googleCalendarSync (ou desconectou a conta Google) ficaria com a
// duplicata para sempre. Este hook fecha esse caso.
//
// Criterio de sobrevivencia por id: o .md de sincronizado_em mais
// recente -- por construcao e o que o ultimo sync escreveu, logo o que
// carrega o inicio corrente. Empate resolve por inicio e depois por uri,
// para o resultado nao depender da ordem de listagem do SAF.
//
// Idempotente e best-effort: arquivo malformado nao e apagado (some da
// leitura em lote e o grupo fica com uma copia so), falha de delete e
// tolerada (o proximo sync colapsa), e a flag
// useSessao.flags.duplicatasAgendaLimpas evita re-varredura em boots
// futuros. Sem vaultRoot ainda hidratado, sai sem marcar a flag para
// tentar de novo no proximo boot.
//
// Registro em BOOT_HOOKS acontece aqui, no proprio modulo (padrao
// declarado no cabecalho de reagendamento.ts e no CONTRACT secoes 1.7 e
// 5.4), e app/_layout.tsx importa o modulo para o side-effect. Perfil de
// hook do CONTRACT 7.9: idempotente, nao-bloqueante, falha silenciavel.
//
// Comentarios sem acento (convencao shell/CI).
import { deleteVaultFile } from '@/lib/vault/remover';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { AgendaEventoSchema, type AgendaEvento } from '@/lib/vault/agenda';
import {
  lerListagemMarkdown,
  readVaultFiles,
  type ArquivoLido,
} from '@/lib/vault/leituraLote';
import { matchesFeaturePrefix } from '@/lib/vault/paths';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { BOOT_HOOKS } from '@/lib/boot/reagendamento';
import { useSessao } from '@/lib/stores/sessao';
import { useVault } from '@/lib/stores/vault';

const PESSOAS: PessoaAutor[] = ['pessoa_a', 'pessoa_b'];

// Ordena copias do mesmo id da mais antiga para a mais nova. O ultimo
// elemento e o vencedor (fica no disco).
function compararCopias(
  a: ArquivoLido<AgendaEvento>,
  b: ArquivoLido<AgendaEvento>
): number {
  const tsA = a.parsed.meta.sincronizado_em;
  const tsB = b.parsed.meta.sincronizado_em;
  if (tsA !== tsB) return tsA < tsB ? -1 : 1;
  const inicioA = a.parsed.meta.inicio;
  const inicioB = b.parsed.meta.inicio;
  if (inicioA !== inicioB) return inicioA < inicioB ? -1 : 1;
  if (a.uri !== b.uri) return a.uri < b.uri ? -1 : 1;
  return 0;
}

// Agrupa os .md de agenda de uma pessoa por id do evento e apaga todas
// as copias exceto a vencedora. Retorna quantos arquivos foram apagados.
async function limparPessoa(
  pessoa: PessoaAutor,
  todosOsMd: string[]
): Promise<number> {
  const arquivos = todosOsMd.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, `agenda-${pessoa}-`)
  );
  // Menos de 2 arquivos nao tem como ter duplicata; evita a leitura.
  if (arquivos.length < 2) return 0;

  const lidos = await readVaultFiles(arquivos, AgendaEventoSchema);
  const porId = new Map<string, ArquivoLido<AgendaEvento>[]>();
  for (const item of lidos) {
    const id = item.parsed.meta.id;
    const grupo = porId.get(id);
    if (grupo) {
      grupo.push(item);
    } else {
      porId.set(id, [item]);
    }
  }

  let apagados = 0;
  for (const grupo of porId.values()) {
    if (grupo.length < 2) continue;
    const ordenado = [...grupo].sort(compararCopias);
    // Todos menos o ultimo (mais recente) saem.
    for (const perdedor of ordenado.slice(0, -1)) {
      try {
        await deleteVaultFile(perdedor.uri);
        apagados += 1;
      } catch {
        // Tolera falha (arquivo ja removido por sync concorrente, OEM
        // negando permissao). O proximo sync colapsa o que sobrar.
      }
    }
  }
  return apagados;
}

// Varre as duas pessoas e devolve o total de .md apagados. Exportada
// para teste e para uso manual; o guard de flag fica no wrapper abaixo.
export async function limparDuplicatasAgenda(
  vaultRoot: string
): Promise<number> {
  if (!vaultRoot) return 0;
  // Uma listagem de markdown/ para as duas pessoas (R-AUDIT-VAULT-PERF).
  const todosOsMd = await lerListagemMarkdown(vaultRoot);
  let apagados = 0;
  for (const pessoa of PESSOAS) {
    try {
      apagados += await limparPessoa(pessoa, todosOsMd);
    } catch {
      // Falha em uma pessoa nao impede a outra.
    }
  }
  return apagados;
}

// Entry point do boot hook. Idempotente via flag (mesmo padrao dos
// outros 5 flags de FlagsBootState).
export async function limparDuplicatasAgendaUmaVez(): Promise<void> {
  if (useSessao.getState().flags.duplicatasAgendaLimpas) return;
  const vaultRoot = useVault.getState().vaultRoot;
  // Sem Vault escolhido (ou store ainda nao hidratado): nao marca a
  // flag, para tentar de novo no proximo boot.
  if (!vaultRoot) return;

  try {
    await limparDuplicatasAgenda(vaultRoot);
  } catch {
    // Best-effort: falha de I/O nao pode travar o boot.
  }
  useSessao.getState().marcarFlagBoot('duplicatasAgendaLimpas');
}

BOOT_HOOKS.push(limparDuplicatasAgendaUmaVez);
