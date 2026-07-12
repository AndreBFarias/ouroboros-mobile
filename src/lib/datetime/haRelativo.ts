// Helper PT-BR generico de tempo relativo: "ha 2 dias", "ha 3h",
// "ha 5 min", "agora mesmo". Sem prefixo (o caller compoe a frase:
// "Ultima sync: ha 3h", "Ultima rodada ha 5 min", etc.).
//
// R-INT-3-HC-SYNC-PAINEL (2026-05-26): extraido como helper canonico
// em src/lib/datetime/ porque o painel de sync HC precisava de uma
// frase relativa reutilizavel e nenhum helper existente era prefix-free
// (syncStatus.descreverDelta, driveResumo.textoUltimoUpload e
// executarBackup.descreverUltimoBackup ja embutem prefixo proprio).
// Nao refatoramos esses callers (fora de escopo); este helper cobre o
// caso novo e fica disponivel para futuros consumidores.
//
// Acentuacao completa nas strings de UI (regra invariante 1.4); o texto
// retornado vai direto para <Text>. Comentarios sem acento (convencao
// shell/CI).

const UM_MIN_MS = 60 * 1000;
const UMA_HORA_MS = 60 * UM_MIN_MS;
const UM_DIA_MS = 24 * UMA_HORA_MS;

// Converte um delta em milissegundos numa frase relativa PT-BR sem
// prefixo. Thresholds:
//   < 1 min  -> "agora mesmo"
//   < 1 hora -> "ha N min" (N >= 1)
//   < 1 dia  -> "ha Nh"    (N >= 1)
//   >= 1 dia -> "ha 1 dia" / "ha N dias"
// Delta negativo (relogio adiantado / data futura) cai em "agora mesmo".
export function haRelativoDeMs(deltaMs: number): string {
  if (!Number.isFinite(deltaMs) || deltaMs < UM_MIN_MS) return 'agora mesmo';
  if (deltaMs < UMA_HORA_MS) {
    const min = Math.max(1, Math.floor(deltaMs / UM_MIN_MS));
    return `há ${min} min`;
  }
  if (deltaMs < UM_DIA_MS) {
    const h = Math.max(1, Math.floor(deltaMs / UMA_HORA_MS));
    return `há ${h}h`;
  }
  const d = Math.max(1, Math.floor(deltaMs / UM_DIA_MS));
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

// Versao a partir de um ISO 8601 (ou null). Retorna null quando o ISO e
// vazio/invalido/null para o caller decidir a copy de "nunca" (ex.:
// "Nunca sincronizado"). `agora` injetavel para testes deterministicos.
export function haRelativoDeIso(
  iso: string | null | undefined,
  agora: number = Date.now()
): string | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return haRelativoDeMs(agora - ms);
}
