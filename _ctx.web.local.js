// _ctx.web.local.js
//
// Shim local de expo-router/_ctx.web.js -- usado SOMENTE quando o
// gauntlet.sh detecta git worktree e ativa o resolver de
// metro.config.js. Em main repo o resolver e' no-op e este arquivo
// nao e' importado.
//
// Motivo (multi-porta + multi-worktree em paralelo):
//
//   Quando rodando em worktree, `node_modules` e' symlink para o main
//   repo. O `expo-router/_ctx.web.js` usa
//   `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)`.
//   `EXPO_ROUTER_APP_ROOT` e' inlinado pelo babel-preset-expo em
//   build-time como string literal computada via
//   `path.relative(path.dirname(_ctx.web.js fisico), appFolder)`.
//
//   Em sessao paralela com 2+ worktrees, o transform cache do Metro
//   (em `/tmp/metro-cache`) e file-map (em `/tmp/metro-file-map-*`)
//   sao compartilhados pelos processos. Resultado: o segundo worktree
//   reutiliza o transformado do primeiro -- com EXPO_ROUTER_APP_ROOT
//   apontando para o `app/` do PRIMEIRO worktree.
//
// Solucao:
//
//   metro.config.js (em worktree) re-roteia `require('expo-router/_ctx.web')`
//   para este arquivo (`<projectRoot>/_ctx.web.local.js`) via
//   `resolveRequest`. Como este arquivo vive na raiz do worktree e
//   chama `require.context('./app', ...)` com path literal estatico,
//   o Metro resolve `./app` relativo a este arquivo -- ou seja,
//   `<projectRoot>/app/` do worktree atual. Sem ambiguidade entre
//   main/worktree e sem dependencia do cache de babel-preset-expo
//   inline-env.
//
//   O regex e' copiado byte-a-byte de expo-router/_ctx.web.js para
//   manter paridade com o comportamento canonico (ignora +api,
//   +middleware, +html, +native-intent).
//
// Por que na raiz e nao em `app/`? Se estivesse em `app/`, ele
// proprio bateria o regex de rota (`./_ctx.web.local.js` casa em
// `\.[tj]sx?\$`) e o expo-router tentaria interpretar como rota
// `/_ctx/web/local`. Fora de `app/` o problema some.
//
// Comentarios sem acento.

export const ctx = require.context(
  // Path literal estatico: `./app` relativo a este shim.
  // Metro resolve em build-time como `<projectRoot>/app/`.
  './app',
  // Recursivo (subdiretorios).
  true,
  // Mesmo regex de expo-router/_ctx.web.js: pega .tsx/.jsx/.ts/.js mas
  // ignora +api, +middleware, +html, +native-intent.
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/,
  // Mesma flag de import mode (lazy/sync) que o canonico usa.
  process.env.EXPO_ROUTER_IMPORT_MODE,
);
