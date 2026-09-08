/**
 * E2E do gate de tom (decisao P8, 2026-09-08).
 *
 * Prova, de ponta a ponta, que scripts/check_tom.py:
 *  - REPROVA arquivo de controle com emoji e com exclamacao plantados,
 *    nomeando caminho:linha e o caractere ofensor;
 *  - PASSA arquivo limpo;
 *  - nao confunde `!` OPERADOR com `!` PONTUACAO — o unico falso positivo
 *    que a arvore inteira produziu ao escrever o gate foi
 *    `(t) => !t.meta.feito && t.meta.data <` (src/lib/tarefas/rollover.ts:49),
 *    onde a seta do arrow function e a comparacao imitam uma tag JSX;
 *  - ignora emoji dentro de bloco de codigo de exemplo em .md, PRESERVANDO a
 *    numeracao de linha do arquivo original;
 *  - respeita a isencao por linha `tom-allow:`.
 *
 * Roda dentro do jest -> smoke.sh -> ci.yml: o gate testa a si mesmo, sem
 * device nem navegador (a sprint e infra pura).
 *
 * Os emojis das fixtures sao construidos em runtime a partir do codepoint,
 * no mesmo espirito do helper `tok` de check-anonimato-gate.test.ts: assim o
 * fonte deste teste nao carrega o caractere que o projeto proibe.
 *
 * Comentarios sem acento (convencao dos testes de gate).
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'check_tom.py');

// Fixtures montadas em runtime, sem literal no fonte.
const FESTA = String.fromCodePoint(0x1f389); // party popper
const CHECK = String.fromCodePoint(0x2705); // check mark button
const AVISO = String.fromCodePoint(0x26a0, 0xfe0f); // warning + seletor emoji

interface RunResult {
  status: number;
  output: string;
}

function runCheck(args: string[]): RunResult {
  try {
    const stdout = execFileSync('python3', [SCRIPT, ...args], {
      encoding: 'utf8',
    });
    return { status: 0, output: stdout };
  } catch (e) {
    const err = e as {
      status?: number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    return {
      status: err.status ?? 1,
      output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    };
  }
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tom-gate-'));
}

function escrever(dir: string, nome: string, linhas: string[]): string {
  const alvo = path.join(dir, nome);
  fs.writeFileSync(alvo, `${linhas.join('\n')}\n`);
  return alvo;
}

describe('check_tom.py — gate de tom (P8)', () => {
  it('reprova arquivo de controle com emoji e exclamacao, com caminho:linha e o caractere', () => {
    const dir = tempDir();
    try {
      const alvo = escrever(dir, 'sujo.tsx', [
        `// comentario de comemoracao ${FESTA}`,
        'export const A = () => <Text>Pronto!</Text>;',
        'export const B = () => <Chip label="Salvo!" />;',
        `const c = { titulo: 'Feito ${CHECK}' };`,
      ]);
      const r = runCheck([alvo]);
      expect(r.status).toBe(1);
      // emoji: linha 1 (comentario) e linha 4 (string de objeto literal)
      expect(r.output).toContain('sujo.tsx:1:');
      expect(r.output).toContain('U+1F389');
      expect(r.output).toContain('sujo.tsx:4:');
      expect(r.output).toContain('U+2705');
      // exclamacao: linha 2 (texto entre tags) e linha 3 (prop de UI)
      expect(r.output).toContain('sujo.tsx:2:');
      expect(r.output).toContain("[jsx-text] 'Pronto!'");
      expect(r.output).toContain('sujo.tsx:3:');
      expect(r.output).toContain("[prop:label] 'Salvo!'");
      expect(r.output).toContain('2 emoji, 2 exclamacao');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passa arquivo de codigo limpo', () => {
    const dir = tempDir();
    try {
      const alvo = escrever(dir, 'limpo.tsx', [
        'export const A = () => <Text>Pronto.</Text>;',
        'export const B = () => <Chip label="Salvo" />;',
      ]);
      const r = runCheck([alvo]);
      expect(r.status).toBe(0);
      expect(r.output).toContain('OK: tom preservado');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('nao acusa `!` operador logico (regressao do falso positivo de rollover.ts:49)', () => {
    const dir = tempDir();
    try {
      const alvo = escrever(dir, 'operador.ts', [
        "export const sel = (ts) => ts.filter((t) => !t.meta.feito && t.meta.data < '2026');",
        'export const dif = (a, b) => a.meta.data !== b.meta.data;',
      ]);
      const r = runCheck([alvo]);
      expect(r.status).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reprova emoji na prosa de .md e ignora o de dentro de bloco de codigo, sem deslocar a linha', () => {
    const dir = tempDir();
    try {
      const alvo = escrever(dir, 'doc.md', [
        '# Titulo', // 1
        '', // 2
        'Exemplo do que nao fazer:', // 3
        '', // 4
        '```ts', // 5
        `const x = '${FESTA}';`, // 6 — dentro da cerca, nao e violacao
        '```', // 7
        '', // 8
        `Span em crase \`${CHECK}\` tambem nao e violacao.`, // 9
        '', // 10
        `Prosa com ${AVISO} na linha 11.`, // 11 — unica violacao
      ]);
      const r = runCheck([alvo]);
      expect(r.status).toBe(1);
      expect(r.output).toContain('doc.md:11:');
      expect(r.output).toContain('U+26A0 U+FE0F');
      expect(r.output).toContain('1 emoji, 0 exclamacao');
      expect(r.output).not.toContain('doc.md:6:');
      expect(r.output).not.toContain('doc.md:9:');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('isenta a linha marcada com tom-allow', () => {
    const dir = tempDir();
    try {
      const alvo = escrever(dir, 'isento.md', [
        '# Titulo',
        '',
        `Citacao literal ${FESTA} <!-- tom-allow: o texto cita o proprio caractere proibido -->`,
      ]);
      const r = runCheck([alvo]);
      expect(r.status).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
