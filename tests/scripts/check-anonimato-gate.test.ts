/**
 * E2E do gate de anonimato (R-AUDIT-CI-GATES).
 *
 * Prova, de ponta a ponta, que o scripts/check_anonimato.sh endurecido:
 *  - REPROVA os 4 blind-spots historicos disfarcados de campo de config
 *    (client/model/provider/engine/config) — o falso-negativo da exclusao
 *    por substring larga que existia ate esta sprint;
 *  - ISENTA uma linha com o marker inline `// anonimato-allow:`;
 *  - PASSA codigo limpo.
 *
 * Roda dentro do jest -> smoke.sh -> ci.yml: o gate testa a si mesmo, sem
 * device nem navegador (a sprint e' infra pura).
 *
 * As strings proibidas usadas nas fixtures sao construidas em runtime a
 * partir de fragmentos (helper `tok`), de modo que o proprio fonte deste
 * teste nao contenha o literal — o repo e' varrido por atribuicao (Regra
 * -1). O scan de IA do check_anonimato so' olha src/+app/, entao este
 * arquivo em tests/ nunca dispara o gate de qualquer forma.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'check_anonimato.sh');

// Constroi um token a partir de fragmentos, sem literal completo no fonte.
const tok = (...parts: string[]): string => parts.join('');
// Fixtures proibidas (montadas em runtime).
const F_MODELO = tok('cla', 'ude', '-son', 'net-4');
const F_PROVEDOR = tok('anthr', 'opic');
const F_ENGINE = tok('open', 'ai');
const F_AUTORIA = tok('escrito por ', 'cla', 'ude');

interface RunResult {
  status: number;
  output: string;
}

function runCheck(args: string[], scanDir?: string): RunResult {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (scanDir) {
    env.ANONIMATO_SCAN_DIRS = scanDir;
  } else {
    delete env.ANONIMATO_SCAN_DIRS;
  }
  try {
    const stdout = execFileSync('bash', [SCRIPT, ...args], {
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

function tempSrc(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anonimato-gate-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  return dir;
}

describe('check_anonimato.sh — gate endurecido (R-AUDIT-CI-GATES)', () => {
  it('--self-test sai 0 e reprova os 4 blind-spots', () => {
    const r = runCheck(['--self-test']);
    expect(r.status).toBe(0);
    expect(r.output).toContain('OK: --self-test verde');
    expect(r.output).toContain('clientModel');
    expect(r.output).toContain('providerId');
    expect(r.output).toContain('engineName');
    expect(r.output).toContain(F_AUTORIA);
  });

  it('reprova (exit != 0) fixture com os 4 blind-spots via override de escopo', () => {
    const dir = tempSrc();
    try {
      fs.writeFileSync(
        path.join(dir, 'src', 'blindspot.ts'),
        [
          `const clientModel = "${F_MODELO}";`,
          `const providerId = "${F_PROVEDOR}";`,
          `const engineName = "${F_ENGINE}";`,
          `const config = { autor: "${F_AUTORIA}" };`,
          '',
        ].join('\n')
      );
      const r = runCheck([], path.join(dir, 'src'));
      expect(r.status).not.toBe(0);
      expect(r.output).toContain('clientModel');
      expect(r.output).toContain('providerId');
      expect(r.output).toContain('engineName');
      expect(r.output).toContain(F_AUTORIA);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('isenta linha com marker // anonimato-allow (exit 0)', () => {
    const dir = tempSrc();
    try {
      fs.writeFileSync(
        path.join(dir, 'src', 'permitido.ts'),
        `const x = "${F_ENGINE}"; // anonimato-allow: nome de campo de config externa\n`
      );
      const r = runCheck([], path.join(dir, 'src'));
      expect(r.status).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passa codigo limpo (exit 0)', () => {
    const dir = tempSrc();
    try {
      fs.writeFileSync(
        path.join(dir, 'src', 'limpo.ts'),
        'export const soma = (a: number, b: number): number => a + b;\n'
      );
      const r = runCheck([], path.join(dir, 'src'));
      expect(r.status).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
