#!/usr/bin/env node
// build-mockups.mjs
//
// STUB. Esta sprint (M19.x) entrega apenas a formalizacao documental do
// inventario de mockups visuais. A implementacao real do build pertence
// a Sprint M19 final.
//
// O bundle docs/Ouroboros_22_telas-standalone.html foi exportado por
// uma ferramenta externa de design a partir do JSX-fonte em
// docs/design-canvas-export/project/. Os JSX-fonte usam globais
// proprietarios da ferramenta (PhoneFrame, BackHeader, PlainHeader,
// TabBar, DualState, Annot, DCSection, DCArtboard, primitivos
// auxiliares). Nao ha implementacao local desses globais, e replicar
// exige trabalho de reverse-engineering nao trivial.
//
// Este stub existe para:
//   1. Marcar o ponto de entrada esperado da toolchain.
//   2. Documentar os 3 caminhos avaliados para a M19 final.
//   3. Falhar bonito (exit 0 com mensagem clara) ate la.
//
// Caminhos candidatos para M19 final:
//
//   Caminho A. Replicar primitivos + bundlar com esbuild
//     - Implementar PhoneFrame, BackHeader, PlainHeader, TabBar,
//       DualState, Annot, DCSection, DCArtboard como componentes React.
//     - Usar esbuild para transpilar os JSX-fonte em ESM rodavel.
//     - Renderizar com react-dom/server para HTML estatico.
//     - Embutir tudo (HTML + CSS + fonts inline) num unico arquivo
//       standalone.
//     - Custo estimado: ~1 sprint cheia (M19 final).
//     - Vantagem: toolchain 100% local, reversivel, controlavel.
//
//   Caminho B. Reescrever JSX-fonte de forma autocontida
//     - Refatorar secao-{a..e}.jsx + primitives.jsx para nao depender
//       de globais e sim de imports explicitos relativos.
//     - Mais simples que Caminho A no medio prazo, mas requer revisao
//       linha a linha do que cada primitivo faz.
//     - Custo: similar ao A, com vantagem de rodar sem build step
//       (modulos ES nativos no browser via <script type="module">).
//
//   Caminho C. Adotar ferramenta externa equivalente
//     - Avaliar Storybook, react-cosmos, ou similar como host dos
//       primitivos.
//     - Importar JSX-fonte como stories, exportar HTML estatico.
//     - Risco: tooling extra no repo, divergencia visual da ferramenta
//       original.
//
// Aviso anti-debito: nao implementar nenhum desses caminhos nesta
// sprint. M19.x e estritamente documental. Esta mensagem e o exit 0
// sao a saida esperada.

console.log('build-mockups (stub M19.x)');
console.log('');
console.log('Este script e um stub. A implementacao real do build de mockups');
console.log('e responsabilidade da Sprint M19 final.');
console.log('');
console.log('Inventario canonico atual: docs/MOCKUPS-INVENTARIO.md');
console.log('Estado dos bundles:');
console.log('  - docs/Ouroboros_22_telas-standalone.html ........... frozen');
console.log('  - docs/Ouroboros_telas_25_26-standalone.html ........ manual');
console.log('');
console.log('JSX-fonte de referencia (NAO regeneravel sem toolchain):');
console.log('  docs/design-canvas-export/project/secao-{a..e}.jsx');
console.log('  docs/design-canvas-export/project/primitives.jsx');
console.log('  docs/design-canvas-export/project/theme.css');
console.log('');
console.log('Para mais contexto, ver:');
console.log('  - docs/sprints/M00.6-checkpoint-visual.md (achado M19.x)');
console.log('  - docs/CONTEXTO.md sec. 7 (HTML standalone como fonte visual)');
console.log('');
console.log('Caminhos avaliados para a M19 final estao listados como');
console.log('comentarios no topo deste arquivo (Caminho A, B, C).');
console.log('');
console.log('stub OK');
process.exit(0);
