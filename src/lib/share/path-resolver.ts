// Resolvedor de path canonico para arquivos recebidos via share
// intent (M08). A funcao principal `resolverDestino` toma a categoria
// (subtipo) escolhida pelo usuario, o mime type e a hora atual, e
// devolve o path relativo ao Vault root.
//
// Estrutura: <pasta>/YYYY-MM-DD-HHmmss[-slug].<ext>
//   - <pasta>: vem de src/lib/share/categorias.ts (mapa subtipo ->
//     folder).
//   - YYYY-MM-DD-HHmmss: usa formatDateYmdHms (UTC-3 fixo).
//   - slug opcional vem do nome amigavel do intent.
//   - <ext>: deduzida do mime type ou do nome de arquivo.
//
// O caller que ja tem vaultRoot autorizado concatena com o resultado
// para obter o URI completo da copia. Conflitos sao resolvidos pelo
// helper `aplicarSufixoNumerico` em camada acima (caller faz lookup
// via SAF.getInfoAsync; este modulo so monta nomes canonicos).
import { formatDateYmdHms } from '@/lib/vault/paths';
import { pastaParaSubtipo } from '@/lib/share/categorias';
import type { InboxArquivoSubtipo } from '@/lib/schemas/inbox_arquivo';
import { extensaoDe } from '@/lib/share/intent';

export interface ResolverDestinoArgs {
  readonly subtipo: InboxArquivoSubtipo;
  readonly mimeType: string;
  readonly agora: Date;
  // Slug opcional para anexar ao timestamp (ex: 'comprovante').
  // Fica em kebab-case ASCII; o resolver aplica saneamento minimo
  // mas nao remove acentos (espera-se que ja venha pronto).
  readonly slug?: string;
  // Nome amigavel do arquivo, usado para deduzir extensao quando o
  // mime type vem generico (ex: 'application/octet-stream').
  readonly nome?: string | null;
}

// Saneamento basico: lowercase + remove caracteres nao [a-z0-9-]. Nao
// faz NFD/diacriticos: o caller geralmente passa kebab-case ja
// pronto. Cap em 24 para nao explodir nomes de arquivo.
function sanitizarSlug(slug: string): string {
  const base = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const trim = base.replace(/^-+|-+$/g, '');
  if (trim.length === 0) return '';
  return trim.length <= 24 ? trim : trim.slice(0, 24).replace(/-+$/g, '');
}

// Devolve o path relativo (sem vaultRoot) do destino do arquivo.
// Nao toca em I/O: e funcao pura.
export function resolverDestino(args: ResolverDestinoArgs): string {
  const { subtipo, mimeType, agora, slug, nome } = args;
  const pasta = pastaParaSubtipo(subtipo);
  const ts = formatDateYmdHms(agora);
  const ext = extensaoDe(mimeType, nome ?? null);
  const slugSafe =
    typeof slug === 'string' && slug.trim().length > 0
      ? sanitizarSlug(slug)
      : '';
  const sufSlug = slugSafe.length > 0 ? `-${slugSafe}` : '';
  const sufExt = ext.length > 0 ? `.${ext}` : '';
  return `${pasta}/${ts}${sufSlug}${sufExt}`;
}

// Aplica sufixo numerico ao path para resolver conflito (-1, -2, ...).
// O caller passa o path canonico (sem sufixo) e o numero da tentativa.
// Pura: nao verifica existencia.
export function aplicarSufixoNumerico(rel: string, n: number): string {
  if (n <= 0) return rel;
  const dotIdx = rel.lastIndexOf('.');
  if (dotIdx === -1) return `${rel}-${n}`;
  return `${rel.slice(0, dotIdx)}-${n}${rel.slice(dotIdx)}`;
}

// Devolve o path .md companion para um arquivo dado. Substitui a
// extensao do binario por '.md' e mantem o resto do nome igual,
// preservando timestamp + slug. Permite que arquivo e metadata
// fiquem lado a lado na mesma pasta com correspondencia 1:1.
export function pathMdCompanion(rel: string): string {
  const dotIdx = rel.lastIndexOf('.');
  if (dotIdx === -1) return `${rel}.md`;
  return `${rel.slice(0, dotIdx)}.md`;
}
