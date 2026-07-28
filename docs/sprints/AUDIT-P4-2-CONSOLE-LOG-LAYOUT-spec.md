# AUDIT-P4-2-CONSOLE-LOG-LAYOUT — trocar console.log cru por devLog em app/_layout.tsx

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: baixa (fix de 4 linhas; o que vaza e metadado agregado, não
            o corpo do diário)
DEPENDE:    nenhuma (devLog.ts já existe e já está mergeado no código;
            não há spec individual rastreável em docs/sprints/ para a
            sprint que o criou — R-INT-3-LOGGER-CONDICIONAL e citada
            apenas no comentário de cabeçalho do próprio arquivo)
ORIGEM:     achado [P4-2]/[SE-03] da auditoria de 2026-07-28. Confirmado
            nesta materialização com `grep -n "console\." app/_layout.tsx`
            e `grep -rn "console\.log(" src/ app/`.
```

## Problema (as únicas 4 chamadas de console.log sem guarda de todo o projeto)

`app/_layout.tsx` tem 4 chamadas de `console.log` sem nenhuma guarda de
`__DEV__`:

```ts
// app/_layout.tsx:295 (dentro do wiring do HC autopull)
console.log('[hc-autopull]', 'wiring boot/foreground', {
  rodadoEm: r.rodadoEm,
  totalNovos,
  totalErros,
});
// app/_layout.tsx:302
console.log('[hc-autopull]', 'wiring erro', msg);

// app/_layout.tsx:366 (dentro do wiring de integracoes/Calendar)
console.log('[integracoes]', 'wiring boot/foreground', {
  rodadoEm: r.rodadoEm,
  totalNovos,
  totalErros,
});
// app/_layout.tsx:384
console.log('[integracoes]', 'wiring erro', msg);
```

`grep -rn "console\.log(" src/ app/` confirma que estas são **as
únicas 4** chamadas de `console.log` em todo `src/`+`app/` — o único
outro hit é a implementação interna de `src/lib/util/devLog.ts:19`, que
é exatamente o wrapper correto (gateado por `__DEV__`).

O cabeçalho de `devLog.ts` foi escrito precisamente para este caso —
cita os dois prefixos nominalmente:

```
// R-INT-3-LOGGER-CONDICIONAL: log de diagnostico que so emite em __DEV__.
//
// Os logs operacionais [hc-autopull]/[integracoes]/[hc-sync] poluiam o
// logcat do APK release (apareciam em producao). __DEV__ e flag
// build-time do React Native: Babel-preset-expo inlina como `false` em
// release, entao o corpo vira dead-code e os logs somem do bundle de
// producao.
```

Ou seja: o próprio código já documenta que esses dois prefixos
específicos precisavam migrar para `devLog` — os outros consumidores de
`[hc-autopull]`/`[integracoes]` (`src/lib/health/autopullScheduler.ts`,
`src/lib/integracoes/scheduler.ts`, `src/lib/health/sync.ts`) já usam
`devLog` corretamente. Só os 4 pontos em `app/_layout.tsx` ficaram para
trás.

Cenário concreto: `babel.config.js` não tem `transform-remove-console`
nem qualquer equivalente, então todo `console.*` não-gateado embarca no
bundle release. A cada boot e a cada retorno de foreground, o app
grava no logcat um objeto `{ rodadoEm, totalNovos, totalErros }` — uma
contagem agregada de registros novos somados de todos os puxadores de
Health Connect (passos, exercício, medidas, sono e **menstruação**) — e,
em caso de erro, a mensagem crua da exceção (`msg`, sem tipo nem
limite de conteúdo). Quem tiver acesso previamente autorizado por
depuração USB (o próprio protocolo de teste do projeto usa ADB
constantemente) roda `adb logcat` e coleta esses dados sem precisar de
root nem de acesso ao app.

## Escopo (mínimo)

1. Importar `devLog` de `@/lib/util/devLog` em `app/_layout.tsx` e
   trocar as 4 chamadas (`:295`, `:302`, `:366`, `:384`) de
   `console.log` para `devLog`, preservando os mesmos argumentos.
2. Confirmar com grep que `console.log(` desaparece de
   `app/_layout.tsx`.
3. NÃO-objetivo: não mexer nos 16 `console.error('save ... fail', e)`
   de outras telas (achado relacionado, de escopo maior — outra
   auditoria); não gatear `src/lib/vault/frontmatter.ts:76` nem
   `src/lib/services/restaurarVault.ts:297`; não adicionar
   `transform-remove-console` ao `babel.config.js` (mudança de build
   mais ampla, fora do escopo desta correção cirurgica de 4 linhas).

## Proof-of-work

```bash
grep -n "console\.log(" app/_layout.tsx        # 0 ocorrencias
grep -rn "console\.log(" src/ app/             # 0 ocorrencias fora de devLog.ts:19
npx tsc --noEmit                                # exit 0
npm test --silent                               # suite verde (356 suites)
./scripts/smoke.sh                               # verde
```

Sprint sem alteração visual nem comportamental observável pelo usuário
(troca de implementação de log) — dispensa caso E2E novo.

## Commit

```
fix: audit-p4-2-console-log-layout troca console.log cru por devlog em hc-autopull e integracoes
```
