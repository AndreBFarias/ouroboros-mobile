# CODING AGENTS: READ THIS FIRST

> **Nota de estado (Sprint M19.x, 2026-05-01)**
>
> Esta pasta contém o JSX-fonte original que gerou o bundle
> `docs/Ouroboros_22_telas-standalone.html`. O bundle está **frozen**:
> não há toolchain local para regenerá-lo a partir destes JSX, porque
> os arquivos usam globais proprietários da ferramenta externa que os
> exportou (`PhoneFrame`, `BackHeader`, `DCSection`, `DCArtboard` etc.).
>
> Para Telas adicionadas após o bundle original (Tela 25 = Calendário
> de conquistas e Tela 26 = Widget homescreen, ambas no namespace
> M00.6), a edição é feita à mão em
> `docs/Ouroboros_telas_25_26-standalone.html` (HTML/CSS legível).
>
> Para Telas do bundle original (01–28 namespace JSX), referência
> primária é o JSX-fonte aqui mais o screenshot da sprint dona. Não
> tentar reabrir o bundle frozen para edição.
>
> Inventário canônico: [`docs/MOCKUPS-INVENTARIO.md`](../MOCKUPS-INVENTARIO.md).
> Toolchain de regeneração: stub em
> [`scripts/build-mockups.mjs`](../../scripts/build-mockups.mjs); build
> real fica para a Sprint M19 final.

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read `ouroboros-app/project/Ouroboros 18 telas.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `ouroboros-app/README.md` — this file
- `ouroboros-app/project/` — the `Ouroboros App` project files (HTML prototypes, assets, components)
