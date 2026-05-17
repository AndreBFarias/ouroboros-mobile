// Writer canonico para Evento de Contador (R-RECAP-5, 2026-05-16).
// Persiste arquivo em
//   markdown/evento-contador-<contadorId>-<YYYY-MM-DD>-<slug>-<deviceId>.md
//
// Padroes reutilizados (BRIEF §1.1.8):
//   - writeVaultFile: escrita atomica (.writing -> rename).
//   - forceDeviceIdSuffix: T2-LOCK-VAULT, sufixo do device sempre
//     aplicado para eliminar race condition Syncthing entre devices.
//   - vaultUriJoin: concatenacao canonica (limpa whitespace, %20,
//     barras duplas) -- sintoma A29 em OEMs MIUI/OneUI/HyperOS.
//
// Comportamento:
//   - Recebe meta validado (revalida defensivamente como saveEvento).
//   - Recebe body opcional (anotacao livre em prosa abaixo do
//     frontmatter).
//   - Devolve { uri, rel } para caller logar/exibir.
//
// Comentarios sem acento (convencao shell/CI).
import { eventoContadorPath, vaultUriJoin } from '@/lib/vault/paths';
import { writeVaultFile } from '@/lib/vault/writer';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';
import {
  EventoContadorSchema,
  type EventoContador,
} from '@/lib/schemas/evento_contador';

export interface EscreverEventoArgs {
  vaultRoot: string;
  meta: EventoContador;
  body?: string;
}

export interface EscreverEventoResult {
  uri: string;
  rel: string;
}

export async function escreverEventoContador(
  args: EscreverEventoArgs
): Promise<EscreverEventoResult> {
  const { vaultRoot, meta, body = '' } = args;

  // Defensivo: revalida o meta antes de tocar em I/O.
  const parsed = EventoContadorSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`evento_contador invalido: ${parsed.error.message}`);
  }

  // Reconstroi Date local a partir do YYYY-MM-DD para passar ao
  // helper de path. parseISO sem hora ancora em UTC; ajustamos pra
  // local (UTC-3) somando o offset, ja que formatDateYmd internamente
  // converte pra Sao Paulo.
  const [y, m, d] = parsed.data.data.split('-').map((s) => parseInt(s, 10));
  const dataLocal = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const relCanonico = eventoContadorPath(
    parsed.data.contadorId,
    dataLocal,
    parsed.data.slug
  );

  // T2-LOCK-VAULT: suffix sempre, mesmo em primeiro save do dia/slug.
  const deviceId = await getDeviceId();
  const rel = forceDeviceIdSuffix(relCanonico, deviceId);
  const uri = vaultUriJoin(vaultRoot, rel);

  await writeVaultFile<EventoContador>(uri, parsed.data, body);

  return { uri, rel };
}
