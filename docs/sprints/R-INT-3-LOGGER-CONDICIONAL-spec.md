# R-INT-3-LOGGER-CONDICIONAL — Gate __DEV__ nos console.log de debug (health/integracoes)

**Tipo**: fix (qualidade / pré-v1.0.0)
**Prioridade**: P3-low
**Estimativa**: 1h
**Tranche**: R-INT

## Fonte canônica

`_BACKLOG.md` (contingente). Os ~15 `console.log('[hc-autopull]', ...)`,
`console.log('[integracoes]', ...)` em `src/lib/health/{autopullScheduler,sync,autopullBackgroundTask}.ts`
e `src/lib/integracoes/scheduler.ts` aparecem no logcat do **APK release** (são logs de
debug operacional). Para v1.0.0, devem ser silenciados em produção.

## Hipóteses técnicas (validar via grep)

1. Há ~15 `console.log` com prefixos `[hc-autopull]`/`[integracoes]` (grep:
   `grep -rn "console.log('\[" src/lib/health src/lib/integracoes`). São logs de
   diagnóstico, não erros (esses usam toast/console.warn).
2. `__DEV__` é flag build-time (false em release) — gate idiomático.

## Entregáveis

- Helper `src/lib/util/devLog.ts` — `devLog(...args)` que só loga se `__DEV__` (no-op em
  release). Comentário explicando.
- Substituir os `console.log('[hc-autopull]'/'[integracoes]', ...)` de diagnóstico por
  `devLog(...)` nos arquivos health/integracoes. **Não** tocar `console.warn`/`console.error`
  (erros reais devem aparecer em release).
- Teste: `tests/lib/util/devLog.test.ts` — loga com `__DEV__=true`, no-op com `false`.

## OFF-LIMITS
- Pode: `src/lib/util/devLog.ts` (novo), os console.log de diagnóstico em
  `src/lib/health/**` e `src/lib/integracoes/**`, teste. Não: console.warn/error;
  outros domínios; `package.json`.
- **EXECUTAR POR ÚLTIMO** na onda (toca arquivos que defineTask/dedup/painel mexem) —
  o orquestrador integra após os outros para evitar conflito.

## Restrições
- Comentários sem acento; commit sem acento; TS strict; worktree.
- Não alterar a semântica dos logs (só gatear por __DEV__).

## Verificação canônica
```bash
./scripts/bootstrap-worktree.sh && npx tsc --noEmit
npm test --silent -- --testPathPattern="devLog|health|integracoes"
./scripts/smoke.sh
# dead-code: npx expo export --platform android + grep dos prefixos no bundle (esperado: ausentes ou inertes)
```

## Proof-of-work
1. diff. 2. jest verde. 3. smoke. 4. hash+branch. 5. achados→sprint.
