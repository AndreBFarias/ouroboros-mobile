// Parser/serializer de YAML frontmatter para arquivos .md do Vault.
// Formato esperado:
//
//   ---
//   chave: valor
//   ---
//
//   corpo livre em markdown
//
// Faz round-trip preservando dados; o corpo e tudo após o segundo
// '---'. Se o arquivo não tiver frontmatter, retorna meta = null.
import YAML from 'yaml';
import type { ZodType } from 'zod';

export interface ParsedFrontmatter<T> {
  meta: T;
  body: string;
}

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

  const result = schema.safeParse(raw_meta);
  if (!result.success) {
    throw new Error(`frontmatter invalido: ${result.error.message}`);
  }

  return { meta: result.data, body: body.trimStart() };
}

// Serializa meta + body de volta em string .md com frontmatter.
// Usa YAML.stringify com lineWidth grande para não quebrar valores
// longos (frase, texto). Mantem ordem de chaves do objeto.
export function stringifyFrontmatter<T>(meta: T, body: string): string {
  const yamlBlock = YAML.stringify(meta, { lineWidth: 0 }).trimEnd();
  const trimmedBody = body.trim();
  if (trimmedBody.length === 0) {
    return `---\n${yamlBlock}\n---\n`;
  }
  return `---\n${yamlBlock}\n---\n\n${trimmedBody}\n`;
}
