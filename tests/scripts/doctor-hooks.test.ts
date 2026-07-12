/**
 * Verdictos do doctor de hooks (R-AUDIT-CI-GATES).
 *
 * Simula o core.hooksPath num repo git temporario e assere os tres
 * verdictos do scripts/doctor_hooks.sh + o comportamento advisory/--strict/CI.
 * Sempre remove CI/GITHUB_ACTIONS do env antes de rodar (e re-injeta CI=1
 * so' onde o teste exige), pra ser deterministico rodando local ou no
 * proprio ci.yml.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'doctor_hooks.sh');

interface RunResult {
  status: number;
  output: string;
}

function git(repo: string, args: string[]): void {
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

function topLevel(repo: string): string {
  return execFileSync('git', ['-C', repo, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
}

function runDoctor(
  repo: string,
  args: string[],
  opts?: { ci?: boolean }
): RunResult {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.CI;
  delete env.GITHUB_ACTIONS;
  if (opts?.ci) {
    env.CI = '1';
  }
  try {
    const stdout = execFileSync('bash', [SCRIPT, ...args], {
      cwd: repo,
      encoding: 'utf8',
      env,
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

function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-hooks-'));
  git(dir, ['init', '-q']);
  return dir;
}

function makeFakeGlobal(preCommitBody: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-global-'));
  fs.writeFileSync(path.join(dir, 'pre-commit'), preCommitBody);
  return dir;
}

describe('doctor_hooks.sh — verdictos (R-AUDIT-CI-GATES)', () => {
  it('PROJETO ATIVO quando hooksPath resolve para <repo>/hooks', () => {
    const repo = makeRepo();
    try {
      fs.mkdirSync(path.join(repo, 'hooks'), { recursive: true });
      git(repo, ['config', 'core.hooksPath', 'hooks']);
      const r = runDoctor(repo, []);
      expect(r.status).toBe(0);
      expect(r.output).toContain('PROJETO ATIVO');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it('DORMENTE quando hooksPath aponta pro global sem delegacao (advisory exit 0)', () => {
    const repo = makeRepo();
    const fakeGlobal = makeFakeGlobal('#!/usr/bin/env bash\necho global\n');
    try {
      git(repo, ['config', 'core.hooksPath', fakeGlobal]);
      const r = runDoctor(repo, []);
      expect(r.status).toBe(0);
      expect(r.output).toContain('DORMENTE');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(fakeGlobal, { recursive: true, force: true });
    }
  });

  it('DORMENTE + --strict fora de CI reprova (exit != 0)', () => {
    const repo = makeRepo();
    const fakeGlobal = makeFakeGlobal('#!/usr/bin/env bash\necho global\n');
    try {
      git(repo, ['config', 'core.hooksPath', fakeGlobal]);
      const r = runDoctor(repo, ['--strict']);
      expect(r.status).not.toBe(0);
      expect(r.output).toContain('DORMENTE');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(fakeGlobal, { recursive: true, force: true });
    }
  });

  it('DORMENTE + --strict EM CI permanece advisory (exit 0)', () => {
    const repo = makeRepo();
    const fakeGlobal = makeFakeGlobal('#!/usr/bin/env bash\necho global\n');
    try {
      git(repo, ['config', 'core.hooksPath', fakeGlobal]);
      const r = runDoctor(repo, ['--strict'], { ci: true });
      expect(r.status).toBe(0);
      expect(r.output).toContain('CI (advisory forcado)');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(fakeGlobal, { recursive: true, force: true });
    }
  });

  it('GLOBAL COM DELEGACAO quando o hook global menciona o repo root', () => {
    const repo = makeRepo();
    const root = topLevel(repo);
    const fakeGlobal = makeFakeGlobal(
      `#!/usr/bin/env bash\n# delega para ${root}/hooks/pre-commit\n`
    );
    try {
      git(repo, ['config', 'core.hooksPath', fakeGlobal]);
      const r = runDoctor(repo, []);
      expect(r.status).toBe(0);
      expect(r.output).toContain('GLOBAL COM DELEGACAO');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(fakeGlobal, { recursive: true, force: true });
    }
  });
});
