// M38 -- helpers de path para o devices index. Modulo separado para
// evitar ciclo entre devicesIndex.ts e o barrel @/lib/vault.
//
// Comentarios sem acento.

// Path canonico do index de dispositivos no Vault. Sob 'inbox/' para
// alinhar com convencao de arquivos administrativos do Mobile (nao
// confundir com inbox/* que e share intent receiver). O underscore
// no comeco do nome distingue como arquivo de sistema.
export const INBOX_DEVICES_REL = 'inbox/_devices.md';

// Concatena root SAF e path relativo, normalizando barras. Mesma
// implementacao usada em humor/diario/eventos/etc.
export function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}
