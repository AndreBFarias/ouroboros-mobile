# Sprint M-SOBRE-RELEASE-NOTES — Settings → Sobre

```
DEPENDE:    M15 (Settings v2)
BLOQUEIA:   M41 (release final — usuário precisa saber versão)
ESTIMATIVA: 2-3h
PRIORIDADE: média-alta (transparência de produto)
```

## 1. Achado / motivação

Hoje Settings não tem tela "Sobre". Usuário não sabe:
- Que versão está rodando.
- Qual commit/build.
- O que mudou desde a última versão.
- Onde ver o repositório (público GPL-3.0).

## 2. Objetivo

Tela `Settings → Sobre` com:
- Nome do app + versão (ex: "Ouroboros v1.0.0").
- Build number Android.
- Hash do commit (curto).
- Mini-changelog amigável (não markdown raw — formatação humana).
- Link para repositório GitHub.
- Créditos genéricos (Regra −1 anonimato — sem nome de autor).

## 3. Entregáveis

### Arquivos novos

- `app/settings/sobre.tsx` — tela acessível via link em
  `/settings`.
- `src/components/settings/SecaoSobre.tsx` — bloco com info do
  app.
- `src/lib/release/changelog.ts` — fonte estruturada do
  mini-changelog (objeto TS com array de entradas
  `{ versao, data, mudancas: string[] }`). Não importa
  CHANGELOG.md raw — humanizamos.
- `tests/components/settings/SecaoSobre.test.tsx` — render +
  versão correta.

### Arquivos modificados

- `app/settings/index.tsx` — adicionar `<LinkSubTela label="Sobre"
  para="/settings/sobre" />` no rodapé.
- `app.json` — `extra.commitHash` (preenchido em build via
  postinstall script ou EAS pre-build hook).

## 4. Verificação

- E2E `tests/e2e/playwright/m-sobre-release-notes.e2e.ts`:
  - Settings → tap "Sobre" → tela monta com versão "1.0.0".
  - Mini-changelog renderiza ≥ 3 entradas.
  - Link GitHub abre `https://github.com/AndreBFarias/ouroboros-mobile`.

## 5. Decisões tomadas

- **Mini-changelog em código TS estruturado** — não import de .md.
  Permite formatação amigável e tradução PT-BR sem markdown.
- **Hash do commit** via build env (`EXPO_PUBLIC_GIT_HASH`).
- **Sem analytics, sem opt-out** — ADR-0007 zero telemetria.
