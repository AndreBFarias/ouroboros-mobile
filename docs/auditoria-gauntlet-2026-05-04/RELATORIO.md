# AUDITORIA GAUNTLET — 2026-05-04

Auditor: subagente externo cego (general-purpose).
Escopo: 30 itens em 7 seções (Anti-vazamento, Determinismo,
Robustez, UX `gauntlet.sh`, Cobertura, Instrumentação, Documentação).

## Resultado consolidado

- **Aprovados (SIM):** 4 — itens 8, 12, 19, 22
- **Reprovados (NÃO):** 12 — itens 2, 5, 7, 15, 17, 23, 24, 25, 26, 28, 30, parte sólida do 21
- **Parciais (PARCIAL):** 14 — itens 1, 3, 4, 6, 9, 10, 11, 13, 14, 16, 18, 20, 21, 27, 29

## Ações aplicadas neste ciclo

### Edits triviais (aplicados imediatamente)

1. **gauntlet.ts** — guard `GAUNTLET_ATIVO` envolvendo cada
   método público da API (item 3, 5).
2. **gauntlet.ts** — `aplicarSeed` agora reseta `menuAberto: false`
   para consistência com `aplicarReset` (item 6).
3. **biometriaGate.tsx** — `bypassReal = bypass && __DEV__`
   evita furo de biometria em release (item 4).
4. **gauntlet.sh** — validação de `comm` do PID antes de matar
   (item 15); rotação do log (item 17); `pkill -P` para derrubar
   processos filhos (item 18); mensagens de erro acionáveis
   (item 16).
5. **VALIDATOR_BRIEF.md** §1.9 — removida ambiguidade entre
   "Nível A proibido" e "permitido para debugging pontual"
   (item 29).
6. **template e2e** + 11 casos existentes — todos chamam
   `reset()` antes de `seed()` (item 20).

### APIs novas no `__gauntlet` (aplicadas)

7. **`aguardarBoot(timeoutMs?)`** — resolve quando fontes
   carregam e stores hidratam (item 24).
8. **`tempoDeBoot()`** — retorna ms entre primeiro mount e
   fontes prontas (item 25).
9. **`consoleErros()`** — buffer de `console.error` da sessão
   (item 27).
10. **`reset()` v2** — limpa todas as stores + menuAberto +
    pathnameRef + localStorage do persist em web (item 7).

### Componentes novos (aplicados)

11. **`app/_dev/showcase.tsx`** — placeholder funcional com
    lista das 24 telas linkando para cada rota (item 21).
12. **Seção Troubleshooting** em `docs/GAUNTLET.md` cobrindo
    Metro lento, chrome-error em sheet, oscilação de boot,
    React 19 ref deprecation (itens 28, 30).

## Sub-sprints abertas para refatorações maiores

13. **M-GAUNTLET-LEAK-CHECK** — script de CI que roda
    `expo export --platform android` + grep `__gauntlet`
    confirmando dead-code (item 1).
14. **M-GAUNTLET-SEED-V2** — implementar `seedHumores`,
    `seedDiarios`, `seedEventos` populando stores com fixtures
    realistas (item 23).
15. **M-GAUNTLET-FAST-BOOT** — pré-cachear fontes JetBrainsMono
    para encurtar boot de 30-60s (item 26).

Specs criadas em `docs/sprints/`.

## Pontos fortes detectados

- Arquitetura `Platform.OS === 'web' && __DEV__` é defensiva e
  auditável.
- `setUltimaRota(null)` faz unset corretamente.
- `setRouterRef`/`setPathnameRef` idempotentes.
- 11 casos E2E concretos com asserts mensuráveis.
- Relatório de revalidação 2026-05-03 transparente sobre 3 FAIL
  e 2 INCONCLUSIVO.

## Pontos críticos endereçados

- **API pública `gauntlet.*` sem guard `GAUNTLET_ATIVO`**
  (item 3) — RESOLVIDO via guard em cada método.
- **prop `bypass` da `BiometriaGate` sem guard interno**
  (item 4) — RESOLVIDO via `bypass && __DEV__`.
- **`reset()` incompleto** (item 7) — RESOLVIDO via reset v2
  com limpeza completa.
- **E2E não chamam `reset()` no início** (item 20) — RESOLVIDO
  no template e propagado.
- **sem sinal de boot completo** (itens 24-25) — RESOLVIDO via
  `aguardarBoot()` e `tempoDeBoot()`.
- **console.error não exposto** (item 27) — RESOLVIDO via
  `consoleErros()`.
- **Troubleshooting ausente** (itens 28, 30) — RESOLVIDO em
  `docs/GAUNTLET.md`.
