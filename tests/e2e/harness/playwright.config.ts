// R-CI-E2E-WEB-a: config do runner e2e de browser (automacao headless).
//
// O harness roda os casos tests/e2e/playwright/*.e2e.ts contra um Metro
// web ja de pe (localhost:8081) com o Gauntlet ativo. Cada caso vira um
// test() gerado por e2e-runner.spec.ts.
//
// Decisoes-chave (spec R-CI-E2E-WEB-a):
//   - workers: 1  -> casos compartilham o mesmo Metro; paralelismo
//     brigaria pelo bundle e pelo estado global das stores.
//   - retries: 1  -> absorve flake do boot web (useFonts SDK 54 demora
//     30-60s no primeiro load fresh).
//   - timeout 90s por caso -> cobre o boot lento + os waitForTimeout que
//     os casos ja usam.
//   - viewport 1024x1200 -> altura >= 1000 e' obrigatoria: o frame mobile
//     e' 412x892 centralizado, e document.elementFromPoint (usado em
//     asserts de hit-test, ex.: R-HOME-5) devolve null fora do viewport.
//   - headless: true -> roda sem janela (local e CI).
//
// Comentarios sem acento (convencao shell/CI).
import path from 'path';
import { defineConfig } from '@playwright/test';

// Artefatos (screenshots de falha + relatorio HTML) vao para a RAIZ do
// repo (test-results/, playwright-report/), nao para dentro do dir-fonte
// do harness. Facilita o upload-artifact do CI (sub-sprint b) e mantem
// tests/e2e/harness limpo.
//
// AUDIT-DX-E2E-WEB-WATCHER: como os dois ficam DENTRO da arvore que o
// Metro observa, `resolver.blockList` em metro.config.js subtrai esses
// nomes do watcher -- sem isso o bundler morre com ENOENT quando o
// Playwright apaga o outputDir no inicio do run. Os nomes estao repetidos
// la; renomear ou mover qualquer um dos dois exige atualizar aquele
// padrao, e tests/config/metro-watcher-artefatos-e2e.test.ts reprova se
// os dois arquivos sairem de sincronia.
const RAIZ = path.resolve(__dirname, '../../..');

export default defineConfig({
  testDir: __dirname,
  testMatch: 'e2e-runner.spec.ts',
  timeout: 90_000,
  retries: 1,
  workers: 1,
  fullyParallel: false,
  // Nao sobe o Metro sozinho: scripts/e2e-web.sh cuida do boot/teardown.
  // Aqui so exigimos que localhost:8081 esteja respondendo.
  reporter: [
    ['list'],
    [
      'html',
      { open: 'never', outputFolder: path.join(RAIZ, 'playwright-report') },
    ],
    // Sumario agregado (total/PASS/FAIL/INCONCLUSIVO/excecoes) no main.
    ['./e2e-reporter.ts'],
  ],
  outputDir: path.join(RAIZ, 'test-results', 'e2e-web'),
  use: {
    headless: true,
    baseURL: 'http://localhost:8081',
    viewport: { width: 1024, height: 1200 },
    // Screenshot/trace so em falha ficam a cargo da politica de status do
    // runner (ele captura manualmente no branch FAIL para o artifact).
    actionTimeout: 0,
  },
});
