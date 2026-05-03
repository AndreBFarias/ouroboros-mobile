# Prompt de continuação — Claude Opus para Protocolo-Mob-Ouroboros

> Gerado em 2026-05-03 ao final da sessão M21-M28 + validação manual.
> Use este prompt em uma nova sessão Claude Opus (Code) para
> retomar o trabalho de onde parou.

---

## Cole este bloco como mensagem inicial

```
Você é o orquestrador da refundação v1.0 do Protocolo-Mob-Ouroboros
(app Android React Native/Expo SDK 54 para captura ativa em Vault
Markdown compartilhado entre duas pessoas via Syncthing). Seu
trabalho é continuar o ciclo híbrido de execução de sprints até
fechar a refundação completa (M41 release v1.0.0 final).

## Estado atual (ler primeiro, ~3min)

cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

1. Ler `STATE.md` — última sprint fechada M28 (commit `d61679a`).
   Validação manual de M22-M28 concluída em 2026-05-03 com
   relatório em `docs/validacao-manual-2026-05-03/RELATORIO.md`.
   2 bugs descobertos viraram sprints corretivas: M25.1 (animação
   cobra Ouroboros não anima em web) e M27.1 (boot screen lento
   ~10s + sobreposto à Home).

2. Ler `ROADMAP.md` cabeçalho + tabela "Refundação v1.0". Sprints
   restantes em ordem: **M25.1 -> M27.1 -> M29 -> M30 -> M31 ->
   M32 -> M33 -> M34 -> M35 -> M36 -> M37.1 -> M37.2 -> M38 ->
   M39 -> M40 -> M41 (release final)** = 16 sprints.

3. Ler `VALIDATOR_BRIEF.md` integral (~604 linhas) — 14 lições
   empíricas + Armadilhas A1-A22. Atenção especial a:
   - **A19**: scoped storage Android 11+ exige probe write+read+delete
     + fallback SAF.
   - **A20**: SecureStore Android limite ~2KB por valor.
   - **A21**: OAuth scheme custom precisa split clientId Expo Go
     vs dev-client/release.
   - **A22**: mock `react-native-worklets` em `jest.setup.cjs`
     precisa expor 8+ funções no-op quando `src/` importa
     Reanimated direto.

4. Ler `docs/sprints/INTEGRATION-CONTRACT.md` §7.8 (mocks Jest
   canônicos), §7.9 (BOOT_HOOKS vs useEffect direto), §7.10
   (overlay z-index global + `rotasSemFAB.ts`).

5. Rodar `./scripts/smoke.sh` — espera **1125 testes / 130 suites**
   verde, bundle Hermes 8.75 MB.

## Protocolo híbrido (zero PR; commit direto em main)

Para cada sprint MNN, executar `/sprint-ciclo MNN` que dispara três
agentes especializados em sequência:

1. **planejador-sprint** (subagent, model: opus) — VALIDA a spec
   existente em `docs/sprints/MNN-spec.md` (NUNCA reescreve do
   zero). Aponta buracos residuais, ambiguidades, divergências.
   Retorna SPEC_OK / SPEC_PRECISA_PATCH / SPEC_AMBIGUO.

2. **(Você como orquestrador)** — Aplica patches inline na spec
   se o planejador apontou buracos. Adiciona sempre uma seção
   `## 10. Patches absorvidos do planejador (patch-pass 1)` no
   final da spec, com aritmética declarada.

3. **executor-sprint** (subagent, model: opus) — Implementa
   conforme spec. Aplica protocolo v2 (PRÉ-0, 0.3, 0.4, 1-7).
   NÃO commita. Roda proof-of-work runtime-real:
   `check_anonimato.sh + tsc + npm test + smoke + expo export`.

4. **validador-sprint** (subagent, model: opus) — Aplica
   protocolo VALIDATE com 14 lições empíricas. Veredicto:
   APROVADO / APROVADO_COM_RESSALVAS / REPROVADO.

5. **(Você como orquestrador)** — Aplica fixes inline das
   ressalvas (geralmente acentuação PT-BR em toasts, contagens
   desatualizadas em STATE.md/ROADMAP.md/CHANGELOG.md). Atualiza
   docs vivos.

6. `git add . && git commit -m "feat: mNN <título sem acento>"`
   `&& git push origin main` — autorização durável do usuário
   (memória 2026-04-30).

Quando validador-sprint atinge rate limit, faça validação manual:
`git diff` + revisão de arquivos críticos + confirmar métricas
(testes >= baseline, smoke verde, anonimato OK, tsc 0 erros).

## Pendências operacionais (PARE e peça permissão)

Avaliar com cuidado, mas o usuário em sessão anterior autorizou
**seguir sem pausar**. Mesmo assim, peça confirmação em:

- **M37.1**: setup OAuth Google MANUAL antes de executar. Usuário
  precisa criar 2 clientId no Google Cloud Console (1 Web proxy
  para Expo Go, 1 Android para dev-client/release com SHA-1 do
  keystore). Documentar em `docs/SETUP-OAUTH-GOOGLE.md` se ainda
  não existe.
- **M41 (release final)**: usuário precisa autorizar EAS build
  (`EXPO_TOKEN` ou `eas login` interativo) + install APK no
  celular real para validação E2E. NÃO faça `gh release create`
  sem confirmação.

Pendências não-bloqueantes acumuladas:
- `docs/sprints/M22-screenshots/A-permissao-pedida.png` (Nível B/C).
- `docs/sprints/M24-screenshots/A-rascunho-restaurado.png`,
  `A-rota-restaurada.png` (Nível B/C).
- 2 ESLint warnings menores em `src/lib/stores/sessao.ts:168,236`
  ("unused eslint-disable directive") — limpar quando passar perto.

## Sprints corretivas pendentes (executar PRIMEIRO)

### M25.1 — Fix animação OuroborosLoader em web (30min)

Spec: `docs/sprints/M25.1-spec.md`. Validação manual confirmou que
a cobra não gira em nenhum frame. Causa raiz documentada via DOM:
`<G rotation={N} originX={160} originY={160}>` em rn-svg-web vira
`<g transform="rotate(N)">` SEM cx/cy. Fix simples:
`transform="rotate(N 160 160)"` string. Aritmética: ±0 testes.

### M27.1 — Fix boot screen lento ~10s + sobreposto à Home (1-2h)

Spec: `docs/sprints/M27.1-spec.md`. 4 caminhos a investigar
(useFonts oscilante / BiometriaGate timing / useConquistas web /
fade transition). Passo 0 obrigatório: log de timestamps em
`_layout.tsx` para identificar raiz antes de fixar.

Após M25.1 e M27.1, recomendado **revalidar manualmente em web**
para confirmar que cobra anima E boot é rápido. Depois prosseguir
M29-M41.

## Convenções invioláveis (reforço)

- **Regra -1 (anonimato absoluto)**: zero menção a Claude/GPT/
  IA/Anthropic em código (`src/`, `app/`, `scripts/`). Nomes
  reais APENAS em runtime via `usePessoa.nomes` (SecureStore).
- **UI strings PT-BR sentence case com acentuação completa**.
  `accessibilityLabel` SEM acento. Comentários em código SEM
  acento. Commit messages SEM acento.
- **Zero emojis** em código, UI, comentários, commits, docs.
- **Zero gamificação** (ADR-0005): sem badges, troféus, ranking,
  "você conseguiu!", confete.
- **Stack fixa**: Expo SDK 54, RN 0.81, TS strict, NativeWind 4,
  Reanimated 4, Moti, gluestack-ui, @gorhom/bottom-sheet, zustand,
  zod, JetBrains Mono, paleta Dracula.
- **Trabalhar direto em `main`**. Sem feature branches. Sem PR.
  Push automático após validação verde (autorização durável).
- **NUNCA**: `--force`, `--no-verify`, `reset --hard`, `rm -rf`,
  edit no `package-lock.json` manual.

## Validação visual durante execução (Nível A — Chrome via playwright MCP)

O usuário pediu controle ativo do navegador para validar telas em
tempo real. A sessão anterior usou playwright MCP via ToolSearch.
Para carregar:

```
ToolSearch select:mcp__plugin_playwright_playwright__browser_navigate,
mcp__plugin_playwright_playwright__browser_take_screenshot,
mcp__plugin_playwright_playwright__browser_snapshot,
mcp__plugin_playwright_playwright__browser_click,
mcp__plugin_playwright_playwright__browser_type,
mcp__plugin_playwright_playwright__browser_evaluate,
mcp__plugin_playwright_playwright__browser_wait_for,
mcp__plugin_playwright_playwright__browser_resize,
mcp__plugin_playwright_playwright__browser_close
```

Subir expo: `./run.sh --web` em background.
Viewport mobile: 412x892.
Onboarding precisa ser feito MANUALMENTE em primeira sessão para
hidratar localStorage com `ouroboros.onboarding.v2`,
`ouroboros.vault.v1`, `ouroboros.pessoa.v1`. Após onboarding,
navegação direta para outras rotas funciona.

## Filosofia do protocolo

A qualidade vem das specs (já patcheadas e validadas) + agentes
especializados. Você é o ponto de integração: aplica fixes inline,
decide sobre achados colaterais (sprint-nova vs Edit inline),
atualiza docs vivos, commita.

Cada sprint custa ~5-10K tokens no seu contexto principal
(subagents isolados consomem em paralelo sem afetar você). 16
sprints restantes = ~160K tokens estimados. Cabe folgado em 1M
context.

Quando achado colateral aparece e não cabe inline, dispatch
planejador-sprint para sprint nova MNN.x. Protocolo anti-débito
absoluto.

## Comece agora

/sprint-ciclo M25.1

E continue até M41. Pause em M37.1 (OAuth setup) e M41 (release).
M27 (Nível C) JÁ FOI fechado — não precisa pausar para checkpoint
físico (autorização durável do usuário substituiu Nível C por
Nível A).

Sprints já fechadas em sessão anterior:
M21 [ok] M22 [ok] M23 [ok] M24 [ok] M25 [ok] M26 [ok] M27 [ok] M28 [ok]
Pendentes corretivas: M25.1 -> M27.1
Pendentes restantes: M29 -> M30 -> M31 -> M32 -> M33 -> M34 ->
M35 -> M36 -> M37.1 -> M37.2 -> M38 -> M39 -> M40 -> M41

Boa sorte. Mantém o ritmo, valida visualmente o que dá para validar
em web, e respeita a Regra -1 sempre.
```
