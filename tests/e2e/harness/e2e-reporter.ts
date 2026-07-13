// R-CI-E2E-WEB-a: reporter do runner e2e. Roda no PROCESSO PRINCIPAL
// (nao no worker), entao ve o resultado de TODOS os casos mesmo com o
// playwright reiniciando o worker apos cada falha (isolamento default).
// Imprime o sumario final: total, PASS, FAIL-real, INCONCLUSIVO, excecoes.
//
// Classificacao por caso:
//   - excecao      -> tem annotation 'excecao' (warn-only via
//                     e2e-exceptions.json). Nunca derruba o run.
//   - fail         -> result.status failed/timedOut/interrupted sem
//                     annotation de excecao. Derruba o run.
//   - inconclusivo -> passou com annotation 'inconclusivo' (warn-only).
//   - pass         -> passou limpo.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

type Classe = 'pass' | 'fail' | 'inconclusivo' | 'excecao' | 'outro';

interface Registro {
  classe: Classe;
  detalhe: string;
  statusPw: string;
}

function limparAnsi(s: string): string {
  // Remove sequencias de escape ANSI para o sumario ficar legivel.
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}

class E2eWebReporter implements Reporter {
  private registros = new Map<string, Registro>();

  onTestEnd(test: TestCase, result: TestResult): void {
    const nome = test.title;
    const anns = [
      ...((result as unknown as { annotations?: { type: string; description?: string }[] })
        .annotations ?? []),
      ...(test.annotations ?? []),
    ];
    const excecao = anns.find((a) => a.type === 'excecao');
    const inconclusivo = anns.find((a) => a.type === 'inconclusivo');

    let classe: Classe;
    let detalhe = '';
    if (excecao) {
      classe = 'excecao';
      detalhe = excecao.description ?? '';
    } else if (
      result.status === 'failed' ||
      result.status === 'timedOut' ||
      result.status === 'interrupted'
    ) {
      classe = 'fail';
      const msg = result.errors?.[0]?.message ?? '(sem mensagem)';
      detalhe = limparAnsi(msg).split('\n')[0] ?? msg;
    } else if (inconclusivo) {
      classe = 'inconclusivo';
      detalhe = inconclusivo.description ?? '';
    } else if (result.status === 'passed') {
      classe = 'pass';
    } else {
      classe = 'outro';
    }
    // Ultima tentativa vence (retries).
    this.registros.set(nome, { classe, detalhe, statusPw: result.status });
  }

  onEnd(result: FullResult): void {
    const entradas = Array.from(this.registros.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : 1
    );
    const porClasse = (c: Classe) => entradas.filter(([, v]) => v.classe === c);
    const pass = porClasse('pass');
    const fail = porClasse('fail');
    const inconclusivo = porClasse('inconclusivo');
    const excecoes = porClasse('excecao');
    const outro = porClasse('outro');

    const linhas: string[] = [];
    linhas.push('');
    linhas.push('=== SUMARIO E2E-WEB ===');
    linhas.push(`total executado: ${entradas.length}`);
    linhas.push(`PASS:            ${pass.length}`);
    linhas.push(`FAIL-real:       ${fail.length}`);
    linhas.push(`INCONCLUSIVO:    ${inconclusivo.length}`);
    linhas.push(`excecoes:        ${excecoes.length}`);
    if (outro.length > 0) linhas.push(`outros:          ${outro.length}`);
    linhas.push(`veredicto run:   ${result.status}`);

    if (fail.length > 0) {
      linhas.push('');
      linhas.push('FAIL-real (derrubam o run):');
      for (const [nome, v] of fail) {
        linhas.push(`  - ${nome}: ${v.detalhe.slice(0, 180)}`);
      }
    }
    if (inconclusivo.length > 0) {
      linhas.push('');
      linhas.push('INCONCLUSIVO (warn-only):');
      for (const [nome, v] of inconclusivo) {
        linhas.push(`  - ${nome}: ${v.detalhe.slice(0, 140)}`);
      }
    }
    if (excecoes.length > 0) {
      linhas.push('');
      linhas.push('excecoes aplicadas (warn-only):');
      for (const [nome, v] of excecoes) {
        linhas.push(`  - ${nome}: ${v.detalhe.slice(0, 140)}`);
      }
    }
    linhas.push('=== fim do sumario ===');
    // eslint-disable-next-line no-console
    console.log(linhas.join('\n'));
  }
}

export default E2eWebReporter;
