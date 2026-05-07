// M38 -- helpers de path para o devices index. Modulo separado para
// evitar ciclo entre devicesIndex.ts e o barrel @/lib/vault.
//
// Comentarios sem acento.

// Path canonico do index de dispositivos no Vault. H2 layout-por-tipo
// (ADR-0023): arquivos administrativos do Mobile vivem em markdown/.
// O underscore no comeco do nome distingue como arquivo de sistema
// quando listado junto com humor-/diario-/etc.
export const INBOX_DEVICES_REL = 'markdown/_devices.md';

// Concatena root SAF e path relativo, normalizando barras. Mesma
// implementacao usada em humor/diario/eventos/etc.
export function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}
