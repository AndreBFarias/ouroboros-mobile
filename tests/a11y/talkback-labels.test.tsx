// R-A11Y-TALKBACK (2026-05-17): sweep estatica de invariantes de
// acessibilidade para screen reader (TalkBack/VoiceOver). Le os
// arquivos .tsx em app/ e src/components/, parseia cada Pressable e
// TouchableOpacity interativo (com onPress / onLongPress), e checa
// invariantes:
//   1. accessibilityLabel presente (literal string ou JSX expression)
//   2. accessibilityRole presente quando interativo
//   3. accessibilityLabel sem acento (convencao TalkBack)
//   4. accessibilityLabel sem prefixo redundante "botao "/"button "
//   5. accessibilityLabel sem ser generico ("button", "pressable", "")
//
// Esta sprint focou em correcoes pontuais; o teste serve de regressao
// para impedir que novas sprints introduzam Pressables interativos sem
// label/role, mesmo que o validador-sprint nao pegue manualmente.
//
// Implementacao: leitura de arquivos via fs.readFileSync. Nao chama
// nenhum binario externo nem usa child_process; e teste estatico puro.
//
// Comentarios em codigo sem acento (convencao shell/CI).
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PRESSABLE_RE =
  /<(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback)\b/g;
const ACTIONABLE_RE = /\bonPress(?:In|Out|)?\s*=/;
const LONGPRESS_RE = /\bonLongPress\s*=/;
const SPREAD_RE = /\.\.\.(props|rest|forwardedProps)/i;
const ACCENT_RE = /[áéíóúâêôãõàçÁÉÍÓÚÂÊÔÃÕÀÇñÑ]/;

const GENERIC_LABELS = new Set([
  'button',
  'pressable',
  'touchable',
  'icon',
  '',
  '<no-label>',
  'label',
  'title',
]);

type AttrValue =
  | { kind: 'literal'; value: string }
  | { kind: 'expr' }
  | null;

interface ParsedTag {
  tagName: string;
  line: number;
  body: string;
  hasAction: boolean;
  hasSpread: boolean;
  label: AttrValue;
  role: AttrValue;
}

// Parse a partir do '<TagName' ate encontrar '>' considerando strings e
// chaves balanceadas.
function parseTagOpen(
  src: string,
  openIdx: number
): { end: number; body: string } | null {
  const m = src.slice(openIdx).match(/^<\w+/);
  if (!m) return null;
  let i = openIdx + m[0].length;
  let depth = 0;
  let inStr: string | null = null;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
    } else if (depth > 0) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
      else if (ch === '{') depth = 1;
      else if (ch === '>')
        return { end: i, body: src.slice(openIdx + m[0].length, i) };
      else if (ch === '/' && src[i + 1] === '>')
        return { end: i + 1, body: src.slice(openIdx + m[0].length, i + 1) };
    }
    i++;
  }
  return null;
}

function lineOf(src: string, idx: number): number {
  let n = 1;
  for (let i = 0; i < idx; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

function findAttr(body: string, attrName: string): AttrValue {
  const re = new RegExp(
    `${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{)`,
    ''
  );
  const m = body.match(re);
  if (!m) return null;
  if (m[1] !== undefined) return { kind: 'literal', value: m[1] };
  if (m[2] !== undefined) return { kind: 'literal', value: m[2] };
  return { kind: 'expr' };
}

function parseFile(filepath: string): ParsedTag[] {
  const src = fs.readFileSync(filepath, 'utf-8');
  const results: ParsedTag[] = [];
  PRESSABLE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRESSABLE_RE.exec(src)) !== null) {
    const openIdx = m.index;
    const parsed = parseTagOpen(src, openIdx);
    if (!parsed) continue;
    const body = parsed.body;
    results.push({
      tagName: m[1],
      line: lineOf(src, openIdx),
      body,
      hasAction: ACTIONABLE_RE.test(body) || LONGPRESS_RE.test(body),
      hasSpread: SPREAD_RE.test(body),
      label: findAttr(body, 'accessibilityLabel'),
      role: findAttr(body, 'accessibilityRole'),
    });
  }
  return results;
}

function walkTsx(rootDir: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.endsWith('.tsx')) out.push(full);
    }
  }
  walk(rootDir);
  return out;
}

const TSX_FILES = [
  ...walkTsx(path.join(REPO_ROOT, 'app')),
  ...walkTsx(path.join(REPO_ROOT, 'src', 'components')),
];

describe('a11y TalkBack — varredura estatica', () => {
  it('encontra arquivos .tsx em app/ e src/components/', () => {
    expect(TSX_FILES.length).toBeGreaterThan(50);
  });

  it('todo Pressable interativo tem accessibilityLabel', () => {
    const violacoes: string[] = [];
    for (const file of TSX_FILES) {
      const rel = path.relative(REPO_ROOT, file);
      const tags = parseFile(file);
      for (const t of tags) {
        if (!t.hasAction) continue;
        if (t.hasSpread && !t.label && !t.role) continue;
        if (!t.label) {
          violacoes.push(
            `${rel}:${t.line}  <${t.tagName}> sem accessibilityLabel`
          );
        }
      }
    }
    if (violacoes.length > 0) {
      throw new Error(
        `Pressables interativos sem accessibilityLabel:\n${violacoes.join('\n')}`
      );
    }
  });

  it('todo Pressable interativo tem accessibilityRole', () => {
    const violacoes: string[] = [];
    for (const file of TSX_FILES) {
      const rel = path.relative(REPO_ROOT, file);
      const tags = parseFile(file);
      for (const t of tags) {
        if (!t.hasAction) continue;
        if (t.hasSpread && !t.label && !t.role) continue;
        if (!t.role) {
          violacoes.push(
            `${rel}:${t.line}  <${t.tagName}> sem accessibilityRole`
          );
        }
      }
    }
    if (violacoes.length > 0) {
      throw new Error(
        `Pressables interativos sem accessibilityRole:\n${violacoes.join('\n')}`
      );
    }
  });

  it('nenhum accessibilityLabel literal tem acento (convencao TalkBack)', () => {
    const violacoes: string[] = [];
    for (const file of TSX_FILES) {
      const rel = path.relative(REPO_ROOT, file);
      const tags = parseFile(file);
      for (const t of tags) {
        if (!t.label || t.label.kind !== 'literal') continue;
        if (ACCENT_RE.test(t.label.value)) {
          violacoes.push(
            `${rel}:${t.line}  accessibilityLabel com acento: '${t.label.value}'`
          );
        }
      }
    }
    if (violacoes.length > 0) {
      throw new Error(
        `accessibilityLabel literais com acento:\n${violacoes.join('\n')}`
      );
    }
  });

  it('nenhum accessibilityLabel literal e generico (button, pressable, etc)', () => {
    const violacoes: string[] = [];
    for (const file of TSX_FILES) {
      const rel = path.relative(REPO_ROOT, file);
      const tags = parseFile(file);
      for (const t of tags) {
        if (!t.label || t.label.kind !== 'literal') continue;
        const norm = t.label.value.trim().toLowerCase();
        if (GENERIC_LABELS.has(norm)) {
          violacoes.push(
            `${rel}:${t.line}  accessibilityLabel generica: '${t.label.value}'`
          );
        }
      }
    }
    if (violacoes.length > 0) {
      throw new Error(
        `accessibilityLabel genericas:\n${violacoes.join('\n')}`
      );
    }
  });

  it('nenhum accessibilityLabel literal tem prefixo redundante "botao "/"button "', () => {
    const violacoes: string[] = [];
    for (const file of TSX_FILES) {
      const rel = path.relative(REPO_ROOT, file);
      const tags = parseFile(file);
      for (const t of tags) {
        if (!t.label || t.label.kind !== 'literal') continue;
        const norm = t.label.value.trim().toLowerCase();
        if (norm.startsWith('botao ') || norm.startsWith('button ')) {
          violacoes.push(
            `${rel}:${t.line}  accessibilityLabel com prefixo redundante: '${t.label.value}'`
          );
        }
      }
    }
    if (violacoes.length > 0) {
      throw new Error(
        `accessibilityLabel com prefixo redundante:\n${violacoes.join('\n')}`
      );
    }
  });

  it('codebase tem cobertura mininima de accessibilityLabel (>= 100 instancias)', () => {
    let total = 0;
    for (const file of TSX_FILES) {
      const src = fs.readFileSync(file, 'utf-8');
      total += (src.match(/accessibilityLabel\s*=/g) ?? []).length;
    }
    expect(total).toBeGreaterThanOrEqual(100);
  });

  it('parser encontra pelo menos 100 instancias de Pressable/Touchable', () => {
    let total = 0;
    for (const file of TSX_FILES) {
      total += parseFile(file).length;
    }
    expect(total).toBeGreaterThanOrEqual(100);
  });
});
