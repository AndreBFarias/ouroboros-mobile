// M-GAUNTLET-FAST-BOOT: HTML root customizado para Expo Router web.
// Injeta <link rel="preload"> nas fontes JetBrainsMono servidas
// estaticamente em public/fonts/. Sem isto, useFonts SDK 54 web
// busca os assets do node_modules sob demanda (30-60s na 1a sessao
// fresh). Com preload, o browser baixa em paralelo ao bundle JS e
// a primeira render ja tem JetBrains disponivel.
//
// IMPORTANTE -- M-GAUNTLET-FAST-BOOT-FOLLOWUP (2026-05-04, NAO-FIX):
//
// Este arquivo so e processado pelo Expo Router quando
// `web.output: "static"` esta habilitado em app.json. Tres caminhos
// foram investigados e nenhum funciona limpo no SDK 54:
//
//   A) web.output: "static" -- quebra build com
//      "TypeError: Cannot destructure property '__extends' of
//       'n.default' as it is undefined" no SSR de framer-motion
//      (transitiva via moti). Causa: moti 0.30 + framer-motion ESM
//      nao se inicializa em Node SSR via expo-router 6.0.23.
//
//   B) web.output: "single" -- export funciona, mas o Expo Router
//      gera index.html padrao SEM ler +html.tsx (so static rendering
//      le este arquivo). Verificado em export real 2026-05-04: HTML
//      gerado tem so o template padrao do expo-router/cli.
//
//   C) Injecao JS no _layout.tsx (document.head.appendChild de
//      <link rel="preload">) -- funcionaria em dev e build mas
//      perde o ganho de paralelo: a fonte so comeca a baixar apos
//      o bundle JS parsear, anulando o objetivo da preload.
//
// Decisao: aguardar Expo SDK 55+ ou release moti que nao quebre SSR.
// Os arquivos preload (public/fonts/, public/styles/flash-inicial.css)
// continuam servidos pelo Metro em dev e disponiveis para uma futura
// sprint que retome o caminho A. Sem regressao funcional: apenas o
// ganho extra de preload nao se materializa.
//
// Tracking: VALIDATOR_BRIEF §4 A23.
//
// Este arquivo so e usado no build web (Expo Router executa o HTML
// gerado por React DOM Server). Em mobile (Android/iOS), o splash
// nativo e expo-splash-screen continuam o caminho canonico --
// useFonts so serve para garantir que useFonts hook resolva.
//
// Comentarios sem acento (convencao shell/CI).
import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* M-GAUNTLET-FAST-BOOT: pre-cache JetBrainsMono. Os arquivos
            sao servidos estaticamente pelo Expo Metro a partir de
            public/fonts/. crossOrigin obrigatorio para fontes
            cross-origin (mesmo same-origin, browsers exigem). */}
        <link
          rel="preload"
          href="/fonts/JetBrainsMono_400Regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/JetBrainsMono_500Medium.ttf"
          as="font"
          type="font/ttf"
          crossOrigin=""
        />

        {/* Expo Router padrao: reset de scroll para body em web. */}
        <ScrollViewStyleReset />

        {/* Folha de estilo estatica para fundo Dracula bgPage durante
            o flash inicial antes do React montar -- evita white flash.
            Servida de public/styles/flash-inicial.css. */}
        <link rel="stylesheet" href="/styles/flash-inicial.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
