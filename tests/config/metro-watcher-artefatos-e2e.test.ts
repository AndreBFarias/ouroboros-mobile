// AUDIT-DX-E2E-WEB-WATCHER: trava a regra que mantem os artefatos do
// runner e2e web fora do watcher do Metro.
//
// O defeito (medido em 2026-09-05, /tmp/e2e-web-metro-8081.log):
//
//   Error: ENOENT: no such file or directory, watch '.../test-results/e2e-web'
//       at Object.watch (node:fs:2549:36)
//       at FallbackWatcher._watchdir (metro-file-map/.../FallbackWatcher.js:119)
//
// Sem watchman instalado, o metro-file-map usa o FallbackWatcher, que faz
// fs.watch() diretorio a diretorio. O Playwright apaga o outputDir ao
// iniciar o run; se isso acontece durante o crawl inicial do watcher, o
// fs.watch() sincrono sobre um diretorio que sumiu derruba o bundler, e
// todo caso posterior devolve ERR_CONNECTION_REFUSED -- sintoma que
// aponta para o caso e2e, nao para o Metro morto.
//
// O teste fecha o circuito nos consumidores reais, sem literal repetido:
//   1. os dois diretorios saem do playwright.config.ts REAL (outputDir e
//      o outputFolder do reporter html), entao mover um deles sem mexer
//      no metro.config.js reprova aqui;
//   2. o metro.config.js REAL e carregado num processo `node` limpo --
//      e' assim que o Metro o le, e nao sob o transform do jest;
//   3. o padrao e' combinado como o metro combina (createFileMap ->
//      ignorePattern -> ignorePatternForWatch) e entregue ao
//      FallbackWatcher REAL sobre uma arvore temporaria; a asercao e'
//      sobre `watcher.watched`, ou seja, sobre quem de fato entrou em
//      fs.watch.
//
// Comentarios sem acento.
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import playwrightConfig from '../e2e/harness/playwright.config';

const RAIZ = path.resolve(__dirname, '..', '..');

// Diretorios de artefato declarados pelo harness, relativos a raiz.
const DIR_OUTPUT = path.relative(RAIZ, String(playwrightConfig.outputDir));
const DIR_HTML = (() => {
  const entradas: unknown = playwrightConfig.reporter;
  const lista = Array.isArray(entradas) ? (entradas as unknown[]) : [];
  const html = lista.find((e) => Array.isArray(e) && e[0] === 'html') as
    | [string, { outputFolder?: string }]
    | undefined;
  return path.relative(RAIZ, String(html?.[1]?.outputFolder));
})();

// Diretorios de codigo que a blockList nao pode capturar por tabela.
const DIRS_CODIGO = ['app/(tabs)', 'src/lib', 'node_modules/alguma-lib'];

// Roda no processo filho: monta a arvore, sobe o watcher real e devolve
// os diretorios que ficaram sob fs.watch. Marcadores delimitam o JSON
// porque o require do metro.config.js pode imprimir avisos no stdout.
const SONDA = `
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const raiz = process.argv[1];
const dirs = JSON.parse(process.argv[2]);
const FallbackWatcher = require(
  path.join(raiz, 'node_modules/metro-file-map/src/watchers/FallbackWatcher.js')
).default;
const config = require(path.join(raiz, 'metro.config.js'));
// Mesma combinacao de metro/src/node-haste/DependencyGraph/createFileMap.js
const padroes = [].concat(config.resolver.blockList ?? []);
const ignored = new RegExp(
  padroes.map((r) => '(' + r.source + ')').join('|'),
  padroes[0] ? padroes[0].flags : ''
);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-watcher-'));
for (const d of dirs) fs.mkdirSync(path.join(tmp, d), { recursive: true });
(async () => {
  const w = new FallbackWatcher(tmp, { dot: true, globs: ['**/*'], ignored });
  await w.startWatching();
  const observados = Object.keys(w.watched)
    .map((d) => path.relative(tmp, d))
    .filter(Boolean)
    .sort();
  await w.stopWatching();
  fs.rmSync(tmp, { recursive: true, force: true });
  process.stdout.write('<<<' + JSON.stringify(observados) + '>>>');
})();
`;

function dirsObservados(dirs: string[]): string[] {
  const saida = execFileSync(
    'node',
    ['-e', SONDA, RAIZ, JSON.stringify(dirs)],
    {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const marcado = /<<<([\s\S]*)>>>/.exec(saida);
  if (!marcado) {
    throw new Error(`sonda nao devolveu JSON delimitado; saida:\n${saida}`);
  }
  return JSON.parse(marcado[1]) as string[];
}

describe('metro.config.js — artefatos do runner e2e web fora do watcher', () => {
  // A sonda sobe um processo node que carrega expo/metro-config inteiro.
  let observados: string[];

  beforeAll(() => {
    observados = dirsObservados([
      // Profundidade de proposito: se o watcher descer um nivel que seja,
      // o subdiretorio aparece na lista.
      path.join(DIR_OUTPUT, 'caso-qualquer', 'artefato'),
      path.join(DIR_HTML, 'data'),
      ...DIRS_CODIGO,
    ]);
  }, 60_000);

  it('nao registra fs.watch sobre o outputDir do playwright nem seus filhos', () => {
    const capturados = observados.filter(
      (d) => d === DIR_OUTPUT || d.startsWith(`${DIR_OUTPUT}${path.sep}`)
    );
    expect(capturados).toEqual([]);
  });

  it('nao registra fs.watch sobre o relatorio html do playwright', () => {
    const capturados = observados.filter(
      (d) => d === DIR_HTML || d.startsWith(`${DIR_HTML}${path.sep}`)
    );
    expect(capturados).toEqual([]);
  });

  it('continua observando app, src e node_modules (a blockList nao corta codigo)', () => {
    for (const dir of DIRS_CODIGO) {
      expect(observados).toContain(dir);
    }
  });
});
