// R-CI-E2E-WEB-a: adaptador que transforma cada caso
// tests/e2e/playwright/*.e2e.ts num test() do runner de browser.
//
// Contrato do caso (tests/e2e/playwright/e2e-template.ts):
//   export default async (page: PlaywrightPageLike) => Promise<ResultadoE2E>
// O page real do runner satisfaz PlaywrightPageLike estruturalmente
// (goto, evaluate, screenshot, waitForTimeout), sem shim.
//
// Politica de status (spec R-CI-E2E-WEB-a):
//   - PASS         -> teste passa.
//   - FAIL         -> teste falha (derruba o run) + screenshot no outputDir.
//   - INCONCLUSIVO -> warn-only: passa, anotado no sumario. Bloco grande
//                     de casos e' inerentemente inconclusivo em web (APIs
//                     nativas, sheets sob A17); tratar como falha nasceria
//                     vermelho eterno.
//   - Caso na e2e-exceptions.json -> warn-only mesmo se FAIL (retrofit
//     pendente). Sair de warn-only = remover da lista.
//
// Nao roda por jest (testMatch do jest e' *.test.ts; este arquivo e'
// *.spec.ts e vive fora do glob). Comentarios sem acento.
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import type { ResultadoE2E } from '../playwright/e2e-template';

const CASES_DIR = path.resolve(__dirname, '../playwright');
const EXCEPTIONS_PATH = path.resolve(__dirname, 'e2e-exceptions.json');

// Carrega a lista de excecoes (warn-only). Estrutura:
//   { casos: [ { arquivo, razao } ] }
interface ExcecaoEntry {
  arquivo: string;
  razao: string;
}
const excecoes: Record<string, string> = (() => {
  try {
    const raw = fs.readFileSync(EXCEPTIONS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { casos?: ExcecaoEntry[] };
    const mapa: Record<string, string> = {};
    for (const c of parsed.casos ?? []) mapa[c.arquivo] = c.razao;
    return mapa;
  } catch {
    return {};
  }
})();

// Descobre os casos: todo *.e2e.ts em tests/e2e/playwright. O
// e2e-template.ts nao casa o sufixo, entao fica de fora por construcao.
const arquivos = fs
  .readdirSync(CASES_DIR)
  .filter((f) => f.endsWith('.e2e.ts'))
  .sort();

// O sumario agregado e' produzido pelo e2e-reporter.ts (roda no processo
// principal). Nao da' para agregar aqui num afterAll: o playwright
// reinicia o worker apos cada falha (isolamento default), zerando o
// estado de modulo. A classificacao PASS/FAIL/INCONCLUSIVO/excecao e'
// inferida pelo reporter a partir de result.status + annotations.

for (const arquivo of arquivos) {
  test(arquivo, async ({ page }, testInfo) => {
    const razaoExcecao = excecoes[arquivo];

    let resultado: ResultadoE2E;
    try {
      // Interop CJS/ESM: o import dinamico de um .ts transformado pode
      // aninhar o export default (mod.default.default) dependendo do
      // loader. Desembrulha as duas formas.
      const mod = (await import(path.join(CASES_DIR, arquivo))) as Record<
        string,
        unknown
      >;
      const direto = mod.default;
      const caso = (
        typeof direto === 'function'
          ? direto
          : (direto as Record<string, unknown> | undefined)?.default
      ) as ((p: unknown) => Promise<ResultadoE2E>) | undefined;
      if (typeof caso !== 'function') {
        throw new Error('caso nao exporta uma funcao default');
      }
      resultado = await caso(page);
    } catch (err) {
      resultado = {
        sprint: '?',
        aspecto: '?',
        status: 'FAIL',
        detalhe: `excecao ao carregar/rodar o caso: ${(err as Error).message}`,
        screenshots: [],
      };
    }

    const status = resultado?.status ?? 'FAIL';
    const detalhe = resultado?.detalhe ?? '(sem detalhe)';

    // Excecao: warn-only mesmo em FAIL (retrofit pendente).
    if (razaoExcecao) {
      testInfo.annotations.push({
        type: 'excecao',
        description: `${arquivo}: ${razaoExcecao} (status real=${status})`,
      });
      return;
    }

    if (status === 'FAIL') {
      // Screenshot para artifact (diagnostico assincrono no CI).
      try {
        await page.screenshot({
          path: testInfo.outputPath('fail.png'),
          fullPage: true,
        });
      } catch {
        // Pagina pode estar num estado que impede o screenshot; ignora.
      }
      expect(status, `caso ${arquivo} retornou FAIL: ${detalhe}`).not.toBe(
        'FAIL'
      );
      return;
    }

    if (status === 'INCONCLUSIVO') {
      testInfo.annotations.push({
        type: 'inconclusivo',
        description: `${arquivo}: ${detalhe}`,
      });
      return;
    }
    // PASS: nada a fazer.
  });
}
