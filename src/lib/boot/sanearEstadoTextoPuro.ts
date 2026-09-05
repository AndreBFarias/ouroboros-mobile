// Boot hook one-shot AUDIT-P4-8: reescreve os .md de _estado deste
// device sem os campos sensiveis que versoes anteriores espelhavam.
//
// Contexto: ate esta sprint o espelho canonico de vault/_estado/
// carregava nome real e URI de foto das duas pessoas
// (pessoa-<deviceId>.md) e o corpo dos rascunhos ainda nao
// confirmados -- texto de diario, humor, ciclo (sessao-<deviceId>.md).
// O schema e os writers ja nao mandam esses campos, mas o arquivo que
// ficou no disco so seria reescrito na proxima mudanca de estado
// daquela key, e pode nunca acontecer: quem parou de trocar de pessoa
// ativa fica com o nome real em texto puro para sempre.
//
// A escrita e o mesmo snapshot que o subscriber da store faria, entao
// e idempotente e segura de repetir. A flag
// useSessao.flags.estadoTextoPuroSaneado existe so para nao pagar I/O
// de boot em quem ja saneou.
//
// LIMITACAO CONHECIDA: escreverEstadoCanonicoImediato resolve o path
// com o deviceId ATUAL (escreverEstado.ts resolverPathEstado ->
// forceDeviceIdSuffix), e escrever no arquivo de outro device e
// proibido por construcao desde AUDIT-T2 (lock por deviceId). Entao
// esta rotina limpa `pessoa-<deviceIdAtual>.md` e
// `sessao-<deviceIdAtual>.md`, e nada mais. Copias que o Syncthing
// trouxe de OUTRO aparelho pareado sao saneadas quando aquele
// aparelho der boot com esta versao -- cada device limpa a sua. Fica
// residual apenas o arquivo de um deviceId que nunca mais vai bootar
// (aparelho perdido, app reinstalado com id novo); esse caso pede
// varredura com delete e ficou fora desta sprint.
//
// Registro em BOOT_HOOKS acontece aqui, no proprio modulo (padrao
// declarado no cabecalho de reagendamento.ts e no CONTRACT secoes 1.7
// e 5.4), e app/_layout.tsx importa o modulo para o side-effect.
// Perfil de hook do CONTRACT 7.9: idempotente, nao-bloqueante, falha
// silenciavel.
//
// Comentarios sem acento (convencao shell/CI).
import { BOOT_HOOKS } from '@/lib/boot/reagendamento';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import { useVault } from '@/lib/stores/vault';
import { escreverEstadoCanonicoImediato } from '@/lib/vault/escreverEstado';

// Reescreve as duas keys com o payload reduzido. Exportada para teste
// e para uso manual; o guard de flag fica no wrapper abaixo.
export async function sanearEstadoTextoPuro(): Promise<void> {
  const pessoa = usePessoa.getState();
  // Mesmo payload do subscriber de usePessoa (pessoa.ts), sem nomes
  // nem fotos.
  await escreverEstadoCanonicoImediato('pessoa', {
    pessoaAtiva: pessoa.pessoaAtiva,
    filtroPessoa: pessoa.filtroPessoa,
  });

  const sessao = useSessao.getState();
  // Mesmo payload do subscriber de useSessao (sessao.ts), sem
  // rascunhos.
  await escreverEstadoCanonicoImediato('sessao', {
    ultimaRota: sessao.ultimaRota,
    permissoesPedidas: { ...sessao.permissoesPedidas },
    flags: { ...sessao.flags },
  });
}

// Entry point do boot hook. Idempotente via flag (mesmo padrao dos
// outros flags de FlagsBootState).
export async function sanearEstadoTextoPuroUmaVez(): Promise<void> {
  if (useSessao.getState().flags.estadoTextoPuroSaneado) return;
  const vaultRoot = useVault.getState().vaultRoot;
  // Sem Vault escolhido (ou store ainda nao hidratado): nao marca a
  // flag, para tentar de novo no proximo boot.
  if (!vaultRoot) return;

  try {
    await sanearEstadoTextoPuro();
  } catch {
    // Best-effort: falha de I/O nao pode travar o boot. O subscriber
    // de cada store reescreve o arquivo na proxima mudanca de estado.
  }
  useSessao.getState().marcarFlagBoot('estadoTextoPuroSaneado');
}

BOOT_HOOKS.push(sanearEstadoTextoPuroUmaVez);
