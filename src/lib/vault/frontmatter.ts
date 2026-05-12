// Parser/serializer de YAML frontmatter para arquivos .md do Vault.
// Formato esperado:
//
//   ---
//   _schema_version: 1
//   chave: valor
//   ---
//
//   corpo livre em markdown
//
// Faz round-trip preservando dados; o corpo e tudo após o segundo
// '---'. Se o arquivo não tiver frontmatter, retorna meta = null.
//
// Q12 (2026-05-12): introduzido carimbo defensivo _schema_version
// gravado no inicio do bloco YAML de todo arquivo escrito via
// stringifyFrontmatter. Backend Python (~/Desenvolvimento/protocolo-
// ouroboros) consome esse carimbo para decidir rotacao de schema
// v1 -> v2 sem reparsear todo Vault. Convencoes:
//  - Escrita SEMPRE carimba VAULT_SCHEMA_VERSION (1 hoje).
//  - Leitura aceita ausencia (compat v0) e versoes diferentes;
//    Zod 4 strips chaves desconhecidas por default, entao
//    schema.safeParse() ignora silenciosamente. Quando a versao
//    presente for diferente da atual, emitimos console.warn uma
//    vez (caller decide ignorar ou exibir diagnostico).
//  - VAULT_SCHEMA_VERSION e exportado para que reader.ts e testes
//    possam asserir contra a versao corrente.
//
// Contrato documentado em docs/CONTRACT-MOBILE-BACKEND.md (Q12).
//
// Comentarios sem acento (convencao shell/CI).
import YAML from 'yaml';
import type { ZodType } from 'zod';

export interface ParsedFrontmatter<T> {
  meta: T;
  body: string;
}

// Versao atual do contrato de frontmatter. Incrementar quando o shape
// canonico de qualquer schema mudar de forma incompativel para o
// backend Python (renomear campo, alterar enum, mudar tipo). Hoje
// vale 1 e cobre os 20 schemas inventariados em CONTRACT-MOBILE-BACKEND.
export const VAULT_SCHEMA_VERSION = 1 as const;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

// Parseia raw .md e valida o frontmatter contra um schema zod.
// Lanca Error se não houver frontmatter ou se o schema falhar.
export function parseFrontmatter<T>(
  raw: string,
  schema: ZodType<T>
): ParsedFrontmatter<T> {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('frontmatter ausente: esperado bloco --- ... --- no topo');
  }
  const yamlBlock = match[1];
  const body = match[2] ?? '';

  let raw_meta: unknown;
  try {
    raw_meta = YAML.parse(yamlBlock);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`yaml invalido: ${msg}`);
  }

  // Q12: aceita _schema_version ausente (compat v0) ou diferente da
  // versao atual (forward-compat). Zod 4 strips por default, entao
  // schema.safeParse remove o campo silenciosamente; aqui detectamos
  // versao incompativel ANTES do parse para registrar console.warn.
  // Caller nao precisa tratar; e diagnostico (nao bloqueia leitura).
  if (raw_meta && typeof raw_meta === 'object') {
    const ver = (raw_meta as Record<string, unknown>)._schema_version;
    if (typeof ver === 'number' && ver !== VAULT_SCHEMA_VERSION) {
      // eslint-disable-next-line no-console
      console.warn(
        `vault frontmatter _schema_version=${ver} difere da versao atual ${VAULT_SCHEMA_VERSION}; parse prossegue`
      );
    }
  }

  const result = schema.safeParse(raw_meta);
  if (!result.success) {
    throw new Error(`frontmatter invalido: ${result.error.message}`);
  }

  return { meta: result.data, body: body.trimStart() };
}

// Serializa meta + body de volta em string .md com frontmatter.
// Usa YAML.stringify com lineWidth grande para não quebrar valores
// longos (frase, texto). Mantem ordem de chaves do objeto.
//
// Q12: prepend _schema_version ao objeto antes da serializacao. A
// chave fica na primeira linha do bloco YAML para facilitar leitura
// humana e parse defensivo no backend Python (le 1 linha, decide
// rotacao). Se o caller ja passou _schema_version explicito (ex:
// migracao manual), o valor do meta tem precedencia via spread
// posterior.
export function stringifyFrontmatter<T>(meta: T, body: string): string {
  const metaComVersao = {
    _schema_version: VAULT_SCHEMA_VERSION,
    ...(meta as Record<string, unknown>),
  };
  const yamlBlock = YAML.stringify(metaComVersao, { lineWidth: 0 }).trimEnd();
  const trimmedBody = body.trim();
  if (trimmedBody.length === 0) {
    return `---\n${yamlBlock}\n---\n`;
  }
  return `---\n${yamlBlock}\n---\n\n${trimmedBody}\n`;
}
