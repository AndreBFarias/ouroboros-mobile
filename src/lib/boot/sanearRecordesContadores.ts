// Boot helper AUDIT-P1-2-DIASENTRE-FUSO (2026-07-28): corrige os
// `recorde` de contador que ficaram inflados em +1 dia pelo
// truncamento UTC antigo de diasEntre.
//
// O defeito: registrarReset gravava recorde = max(recorde,
// diasEntre(inicio, agora)). `inicio` sempre foi YMD-local
// (formatDateYmd -> dataLocalYmd), mas `agora` era truncado pelos
// campos UTC do Date. Das 21:00 as 23:59 BRT o dia UTC ja tinha
// virado, entao a sequencia contava +1. Como recorde nunca decresce
// (Math.max), a inflacao ficou gravada para sempre.
//
// Por que da pra distinguir inflado de legitimo (deterministico):
//   - O lado ESQUERDO da conta nunca foi afetado: era sempre um YMD
//     ja em dia civil local.
//   - Logo, o intervalo que terminou no reset R foi inflado em
//     EXATAMENTE 1 se, e so se, o dia UTC de R difere do dia local de
//     R -- ou seja, R caiu na janela 21:00-23:59 BRT. Isso e legivel
//     direto do array `resets`, que preserva os ISO datetimes.
//   - Para i >= 1 o inicio daquela sequencia era formatDateYmd do
//     reset anterior, entao a duracao CORRETA de cada intervalo pos-
//     primeiro-reset e recomputavel exatamente.
//
// O unico ponto cego e a PRIMEIRA sequencia: seu `inicio` original foi
// escolhido pelo usuario na criacao (o date picker de novo.tsx aceita
// data retroativa) e foi sobrescrito pelo primeiro reset. Nao da pra
// recompor. Por isso NAO recomputamos essa sequencia a partir de
// criado_em -- isso apagaria recorde legitimo de quem criou o contador
// com data retroativa. Em vez disso, so descontamos o +1 quando o
// primeiro reset caiu comprovadamente na janela noturna.
//
// A regra final nunca aumenta o recorde e nunca desce abaixo do maior
// intervalo exatamente recomputado. Ela NAO e idempotente (aplicar duas
// vezes descontaria outro dia), entao o guarda e a flag one-shot
// useSessao.flags.recordesContadoresSaneados.
//
// Escreve de volta na MESMA uri lida, preservando o body (anotacao
// livre do usuario) e sem tocar arquivos de outros devices (T2-LOCK-
// VAULT: cada device so escreve o .md com o proprio suffix).
//
// Comentarios sem acento (convencao shell/CI).
import { dataLocalYmd } from '@/lib/datetime/local';
import { ContadorSchema, type Contador } from '@/lib/schemas/contador';
import { useSessao } from '@/lib/stores/sessao';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';
import { diasEntre } from '@/lib/util/diasEntre';
import { lerListagemMarkdown, readVaultFiles } from '@/lib/vault/leituraLote';
import { matchesFeaturePrefix } from '@/lib/vault/paths';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';

// Dia UTC de um ISO datetime, no formato YYYY-MM-DD. Reproduz o
// truncamento antigo de diasEntre (que lia os campos UTC do Date).
function diaUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// True quando o instante caiu na janela em que o dia UTC ja virou mas
// o dia local nao (21:00-23:59 em BRT). E exatamente a condicao que
// fazia a conta antiga devolver +1.
function ehJanelaDeInflacao(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return diaUtc(d) !== dataLocalYmd(d);
}

// Duracao correta, em dias civis locais, da sequencia que terminou no
// reset `fim` tendo comecado no reset `inicio`. Reproduz o `inicio`
// que registrarReset gravou na epoca: formatDateYmd(resetAnterior).
function duracaoEntreResets(inicio: string, fim: string): number {
  const dInicio = new Date(inicio);
  const dFim = new Date(fim);
  if (Number.isNaN(dInicio.getTime()) || Number.isNaN(dFim.getTime())) return 0;
  return diasEntre(dataLocalYmd(dInicio), dFim);
}

// Recorde saneado de um contador. Puro e deterministico: depende so de
// `recorde` e `resets`. Nunca sobe, nunca desce abaixo do maior
// intervalo exatamente recomputavel, e so desconta o +1 do primeiro
// intervalo quando o primeiro reset caiu na janela noturna.
export function recomputarRecordeSaneado(c: Contador): number {
  const gravado = c.recorde;
  // Recorde zerado nao tem o que sanear. Recorde > 0 sem nenhum reset
  // nao pode ter vindo de registrarReset (unico produtor): deixamos
  // intacto por nao ter evidencia nenhuma sobre sua origem.
  if (gravado <= 0 || c.resets.length === 0) return gravado;

  // Intervalos pos-primeiro-reset: exatamente recomputaveis.
  let exato = 0;
  for (let i = 1; i < c.resets.length; i += 1) {
    const d = duracaoEntreResets(c.resets[i - 1], c.resets[i]);
    if (d > exato) exato = d;
  }

  // Primeira sequencia: nao recomputavel (inicio original perdido), mas
  // sabemos se ela foi inflada em 1.
  const descontoPrimeiro = ehJanelaDeInflacao(c.resets[0]) ? 1 : 0;

  const saneado = Math.max(exato, gravado - descontoPrimeiro);
  // Clamp defensivo: a rotina so corrige para baixo. Se `exato` passar
  // do gravado (arquivo editado a mao, merge de Syncthing), mantemos o
  // valor do arquivo em vez de inventar um recorde novo.
  return Math.min(saneado, gravado);
}

// True quando o arquivo pertence a este device (ou e legado sem suffix
// de deviceId). forceDeviceIdSuffix lanca quando o rel carrega suffix
// de OUTRO device -- e o predicado canonico do T2-LOCK-VAULT.
function ehArquivoDesteDevice(uri: string, deviceId: string): boolean {
  try {
    forceDeviceIdSuffix(uri, deviceId);
    return true;
  } catch {
    return false;
  }
}

// Entry point do saneamento. One-shot por instalacao via
// useSessao.flags.recordesContadoresSaneados. Best-effort: falha de
// I/O em um arquivo nao impede os demais nem o boot.
export async function sanearRecordesContadores(
  vaultRoot: string
): Promise<void> {
  if (!vaultRoot) return;
  if (useSessao.getState().flags.recordesContadoresSaneados) return;

  const deviceId = await getDeviceId();
  const todos = await lerListagemMarkdown(vaultRoot);
  const arquivos = todos.filter(
    (u) =>
      !ehSyncConflict(u) &&
      matchesFeaturePrefix(u, 'contador-') &&
      ehArquivoDesteDevice(u, deviceId)
  );

  const lidos = await readVaultFiles(arquivos, ContadorSchema);
  for (const { uri, parsed } of lidos) {
    const atual = parsed.meta;
    const saneado = recomputarRecordeSaneado(atual);
    if (saneado >= atual.recorde) continue;
    try {
      await writeVaultFile<Contador>(
        uri,
        { ...atual, recorde: saneado },
        parsed.body
      );
    } catch {
      // Best-effort: um arquivo que falhou nao trava os outros.
    }
  }

  // Sobe a flag mesmo sem nenhuma correcao: a rotina nao pode rodar
  // duas vezes (ver nota de nao-idempotencia no topo).
  useSessao.getState().marcarFlagBoot('recordesContadoresSaneados');
}
