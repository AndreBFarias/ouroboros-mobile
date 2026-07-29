# AUDIT-P1-9-BOOT-HOOKS-INFRA — hooks de boot sem teste executável e disparados antes da hidratação

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (nenhuma das migrations que reorganizam o Vault do usuário
            jamais teve teste que provasse execução, e a única proteção
            contra rodar antes da hidratação das stores é acidental)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-9] da auditoria de 2026-07-28, em duas metades do
            mesmo sistema. A metade (a) apareceu na execução da Fase 1, ao
            tentar provar por mock de módulo que um hook estava plugado: o
            teste ficava verde com o hook plugado E com ele removido. A
            metade (b) apareceu ao comparar o `useEffect` que dispara os
            hooks com os efeitos vizinhos do mesmo arquivo — ele é o único
            com deps vazias. As duas juntas explicam por que a Fase 1
            mergeou com uma inconsistência conhecida de padrão entre
            sprints irmãs.
```

## Problema (a infraestrutura de boot não é observável em teste e não espera as stores)

São dois defeitos independentes do mesmo subsistema. Corrigir só um deixa o
outro sem rede de proteção, por isso a sprint trata os dois.

---

### (a) Falso-verde em Jest: nenhum hook de boot executa no harness

`reagendarTodosBootHooks` isola a falha de cada hook e engole a exceção:

```ts
// src/lib/boot/reagendamento.ts:36-44
export async function reagendarTodosBootHooks(): Promise<void> {
  for (const hook of BOOT_HOOKS) {
    try {
      await hook();
    } catch {
      // Isola falha: hook quebrado não impede demais.
    }
  }
}
```

O isolamento é correto em runtime — hook quebrado não pode travar o arranque.
Em Jest ele vira uma venda. Os 16 wrappers registrados usam `await import()`
lazy para quebrar o ciclo entre `@/lib/boot/*` e os módulos donos:

```ts
// src/lib/boot/reagendamento.ts:166-173
const migrarLayoutVaultHook: BootHook = async () => {
  const { useVault } = await import('@/lib/stores/vault');
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const { migrarVaultLayoutPorTipo } =
    await import('@/lib/boot/migrarVaultLayoutPorTipo');
  await migrarVaultLayoutPorTipo(vaultRoot);
};
```

`babel-preset-expo` converte os `import`/`export` estáticos para CJS mas
**preserva o `import()` dinâmico verbatim**. Verificado nesta auditoria
transformando um trecho equivalente com a config real do repo, sob os dois
valores possíveis do flag de caller:

```
# envName 'test', caller { supportsDynamicImport: true }  -> yield import('@/lib/x')
# envName 'test', caller { supportsDynamicImport: false } -> yield import('@/lib/x')
```

Ou seja: o flag do caller não muda nada, a saída é idêntica nos dois casos.
No ambiente CJS do Jest o VM rejeita esse `import()` com
`TypeError: A dynamic import callback was invoked without --experimental-vm-modules`,
e o `catch` de `:40-42` engole o erro. Consequência: **qualquer** teste que
chame `reagendarTodosBootHooks()` e espie um mock de módulo registra zero
chamadas — passa verde tanto com o hook plugado quanto sem ele.

O repo já mediu o efeito e o documentou por escrito, sem tempo para tratá-lo:

```
// tests/lib/boot/reagendamento-widget-todo.test.ts:15-27
// LIMITE DO HARNESS (medido nesta sprint, nao introduzido por ela):
// nao da para provar o registro invocando reagendarTodosBootHooks() e
// espiando um mock do modulo. [...] entao TODO mock de modulo registraria
// zero chamadas e o teste passaria a verde tanto com o hook plugado
// quanto sem ele [...]. Nenhum teste do repo executa a fila hoje pelo
// mesmo motivo
```

Aquela suíte contornou provando o *registro* (nome e índice dentro de
`BOOT_HOOKS`) em vez da *execução*. É uma prova indireta legítima para um
hook, e insustentável como padrão: ela não observa nada do que o hook faz.

**Alcance.** Todo hook que toca o Vault do usuário está nesse ponto cego:

| Wrapper | Linha | Migration que dispara |
|---|---|---|
| `migrarAssetsHook` | `reagendamento.ts:136-143` | M39 `assets/` -> `media/<categoria>/` |
| `migrarLayoutVaultHook` | `reagendamento.ts:166-173` | H2/ADR-0023 layout-por-tipo (8 passos, 22 listagens) |
| `migrarT2DeviceIdSuffixHook` | `reagendamento.ts:181-189` | AUDIT-T2 sufixo `-<deviceId>.md` |

Os módulos-alvo têm cobertura unitária boa (`migrarVaultLayoutPorTipo` tem
três suítes). O que **nunca** teve cobertura é a junção: que o boot de fato
chama essas funções, com o `vaultRoot` certo, na ordem declarada.

**O que não está quebrado.** No bundle Metro (mobile e web) o `import()`
dinâmico funciona normalmente — o defeito é exclusivo do harness CJS. Por
isso o Gauntlet consegue exercitar a fila inteira:

```ts
// src/lib/dev/gauntlet.ts:731-739
  disparaBootHooks: async () => {
    if (!GAUNTLET_ATIVO) return;
    const { reagendarTodosBootHooks } =
      await import('@/lib/boot/reagendamento');
    await reagendarTodosBootHooks();
  },
```

Isso define a estratégia: o E2E web é hoje a **única** prova de execução, e o
objetivo desta sprint é deixar de depender só dele.

---

### (b) Os hooks de boot disparam antes da hidratação das stores

`app/_layout.tsx` dispara a fila num efeito de deps vazias:

```tsx
// app/_layout.tsx:191-196
  // Boot hook: reagenda alarmes/limpeza/marcos auto/widget. M00.5
  // cria o orquestrador vazio; cada sprint dona faz BOOT_HOOKS.push
  // no proprio modulo.
  useEffect(() => {
    void reagendarTodosBootHooks();
  }, []);
```

Todos os efeitos vizinhos do mesmo componente fazem o oposto — guardam por
`appPronto` e declaram a dependência:

```tsx
// app/_layout.tsx:237-242  (R-VAULT-CANONICAL-COMPLETE-A)
  useEffect(() => {
    if (!appPronto) return;
    void import('@/lib/boot/migrarEstadoParaVault').then(
      ({ migrarEstadoParaVault }) => migrarEstadoParaVault()
    );
  }, [appPronto]);
```

O mesmo padrão em mais seis efeitos do arquivo — `:181-189` (splash),
`:251-257`, `:267-273`, `:284-337`, `:348-419` e `:432-439` —, sete no total
contra um único com deps vazias. `appPronto` vem de
`useAppPronto`, que só vira `true` depois da hidratação das três stores
críticas:

```ts
// src/lib/boot/useAppPronto.ts:39-41
  const onboardingHidratado = useHasHydrated(useOnboarding);
  const vaultHidratado = useHasHydrated(useVault);
  const sessaoHidratada = useHasHydrated(useSessao);
```

O que segura os hooks existentes hoje é o guard `if (!vaultRoot) return`
repetido em quase todos os wrappers. É proteção **acidental**, não desenhada:
ela cobre exatamente uma store das três. Se `useVault` já hidratou e
`useSessao` ainda não, o guard deixa passar e o hook lê a flag one-shot com o
valor default de `FLAGS_VAZIAS` (`src/lib/stores/sessao.ts:165-174`), ou seja
`false` — "ainda não rodou" — mesmo tendo rodado em boots anteriores.

**Cenário de falha concreto.** Duas rotinas one-shot recém-introduzidas caem
nisso:

```ts
// src/lib/boot/migrarVaultLayoutPorTipo.ts:534-538  (AUDIT-P1-5)
  const flags = useSessao.getState().flags;
  if (flags.vaultLayoutMigrado) {
    if (flags.vaultLayoutOrfaosVarridos) return resultado;
    return recuperarOrfaosVaultLayout(vaultRoot);
  }
```

```ts
// src/lib/boot/limparDuplicatasAgenda.ts:131-136  (AUDIT-P1-4)
export async function limparDuplicatasAgendaUmaVez(): Promise<void> {
  if (useSessao.getState().flags.duplicatasAgendaLimpas) return;
  const vaultRoot = useVault.getState().vaultRoot;
  // Sem Vault escolhido (ou store ainda nao hidratado): nao marca a
  // flag, para tentar de novo no proximo boot.
  if (!vaultRoot) return;
```

Com `useSessao` não hidratado, as duas leem `false` e reexecutam. Ambas são
idempotentes, então o resultado final continua correto — o custo é I/O.
E o custo não é trivial: `recuperarOrfaosVaultLayout` roda os 8 passos
completos, o que dá **22 listagens de pasta** por execução
(`executarPassosMigracao`, `migrarVaultLayoutPorTipo.ts:365-504`), cada uma
delas um `readDirectoryAsync` de SAF em `content://`. `limparDuplicatasAgenda`
varre `markdown/` para as duas pessoas. Isso deveria acontecer uma vez por
instalação e passa a acontecer no arranque interativo, sempre que a corrida
de hidratação cair do lado errado — que é justamente o boot frio, o mesmo em
que o app está mais lento.

**A divergência de padrão entre sprints irmãs.** A `AUDIT-P1-2`, da mesma
Fase 1, escapou do problema porque não usou `BOOT_HOOKS`:

```tsx
// app/_layout.tsx:251-257  (AUDIT-P1-2-DIASENTRE-FUSO)
  useEffect(() => {
    if (!appPronto) return;
    void import('@/lib/boot/sanearRecordesContadores').then(
      ({ sanearRecordesContadores }) =>
        sanearRecordesContadores(useVault.getState().vaultRoot ?? '')
    );
  }, [appPronto]);
```

Enquanto `AUDIT-P1-4` fez `BOOT_HOOKS.push(limparDuplicatasAgendaUmaVez)`
(`limparDuplicatasAgenda.ts:146`, com o import de side-effect em
`app/_layout.tsx:63`). Duas sprints da mesma onda, dois mecanismos
diferentes para a mesma necessidade — "rotina one-shot no boot que lê flag do
SecureStore" — e um deles correto por acidente. Enquanto o padrão canônico
não for único e documentado, a próxima sprint tem 50% de chance de escolher o
errado.

---

### Por que os dois juntos importam

A metade (b) é um defeito de ordenação que a metade (a) impede de testar.
Um teste que provasse "os hooks só rodam com as stores hidratadas" precisaria
executar `reagendarTodosBootHooks()` de verdade, e é exatamente o que o
harness não faz hoje. Resolver (a) destrava a prova de (b) e, de quebra, dá
pela primeira vez cobertura de execução às três migrations que reorganizam o
Vault do usuário.

## Escopo (mínimo)

1. Tornar o `import()` dinâmico executável no ambiente de teste. Adicionar
   `babel-plugin-dynamic-import-node` como devDependency (hoje ausente:
   não está em `package.json` nem em `node_modules/`) e habilitá-lo **apenas**
   em `env.test` de `babel.config.js`, preservando intactos os plugins atuais
   e a ordem obrigatória de `react-native-worklets/plugin` por último
   (Armadilha A1, documentada no próprio `babel.config.js`). O flag
   `supportsDynamicImport` do caller **não** resolve — medido nesta auditoria,
   a saída de `babel-preset-expo` é idêntica com `true` e com `false`.
2. Medir o impacto nas 361 suítes antes de qualquer outra mudança. A
   conversão de `import()` para `require()` torna síncrono o que hoje falha:
   suítes que dependiam de o dynamic import nunca resolver podem passar a
   executar código real. Rodar a suíte completa duas vezes e comparar
   contagem, tempo e lista de arquivos afetados. Se o custo for alto,
   restringir o plugin a um `overrides` por path de `src/lib/boot/`, e
   registrar a decisão no spec.
3. Teste-canário que falha se o dynamic import voltar a ser inexecutável.
   Um caso mínimo que faça `await import()` de um módulo real e afirme que o
   valor chegou. Sem ele, uma atualização de `babel-preset-expo` ou de
   `jest-expo` reintroduz o falso-verde em silêncio, e o sintoma volta a ser
   "tudo verde".
4. Converter a prova indireta em prova direta. Reescrever
   `tests/lib/boot/reagendamento-widget-todo.test.ts` para observar
   **execução** (mock de módulo registrando a chamada) em vez de nome e
   índice no array, e atualizar o bloco `LIMITE DO HARNESS` de `:15-27` — é
   documentação que passa a estar errada assim que o passo 1 entrar.
5. Cobertura de execução para as três migrations de Vault:
   `migrarAssetsHook`, `migrarLayoutVaultHook` e `migrarT2DeviceIdSuffixHook`.
   Cada uma com um caso que prova que o hook chama a função certa, com o
   `vaultRoot` corrente, e um caso que prova o inverso (sem `vaultRoot`, o
   hook é no-op). Uma remoção do `BOOT_HOOKS.push` correspondente tem que
   deixar a suíte vermelha — verificar isso à mão antes de fechar.
6. Corrigir o disparo: `app/_layout.tsx:194-196` passa a
   `if (!appPronto) return;` com deps `[appPronto]`, alinhado aos sete
   efeitos vizinhos que já fazem isso (`:182`, `:238`, `:252`, `:268`,
   `:285`, `:349`, `:433`). Verificar que nada na fila dependia de rodar antes da
   hidratação; os guards `if (!vaultRoot) return` permanecem como estão
   (defesa em profundidade, não são substituídos pelo novo guard).
7. Teste de ordenação, agora possível: com as stores não hidratadas, a fila
   não roda; após a hidratação, roda uma vez. É a regressão que fecha (b).
8. Unificar o padrão. Escolher `BOOT_HOOKS` como mecanismo canônico único
   para rotina one-shot de boot e registrar a decisão no cabeçalho de
   `src/lib/boot/reagendamento.ts` (que já mantém a lista canônica dos 16
   hooks e já ficou defasado uma vez, corrigido na AUDIT-P1-1A). Migrar para
   `BOOT_HOOKS` os dois `useEffect` diretos que hoje fazem o papel de hook
   one-shot (`migrarEstadoParaVault` em `:237-242` e `sanearRecordesContadores`
   em `:251-257`), **ou** documentar por escrito o critério que separa os dois
   mecanismos. Uma das duas coisas, não nenhuma.
9. Caso E2E em `tests/e2e/playwright/audit-p1-9-boot-hooks-infra.e2e.ts`
   (tipos `PlaywrightPageLike`/`ResultadoE2E` de
   `tests/e2e/playwright/e2e-template.ts`): com o Vault mock semeado,
   `__gauntlet.disparaBootHooks()` duas vezes seguidas; a segunda chamada não
   pode reexecutar as rotinas one-shot cujas flags já subiram. Assert sobre
   comportamento observável (contagem de arquivos no mock antes/depois), não
   sobre presença visual.
10. NÃO-objetivo: mexer no conteúdo de qualquer migration. Esta sprint muda
    **quando** e **como se prova** que elas rodam, nunca o que elas fazem.
11. NÃO-objetivo: atualizar `docs/FEATURES-CANONICAS.md`. Não há feature de
    usuário introduzida, modificada ou removida — o efeito visível é redução
    de I/O redundante no arranque, não mudança de comportamento.

## Proof-of-work

```bash
npx tsc --noEmit                                   # exit 0
npm test                                           # 361 suites, sem regressao

# metade (a): o canario prova que import() executa no harness
npm test -- dynamic-import                         # verde

# a prova de execucao precisa quebrar quando o hook e' desplugado.
# Remover manualmente migrarLayoutVaultHook do BOOT_HOOKS.push e rodar:
npm test -- reagendamento                          # DEVE ficar vermelho
git checkout src/lib/boot/reagendamento.ts         # restaura

# metade (b): o efeito nao pode mais ter deps vazias
rg -n -A3 "reagendarTodosBootHooks\(\)" app/_layout.tsx   # espera 'if (!appPronto) return;'

# E2E no Gauntlet
./gauntlet.sh
npm run test:e2e:web -- --grep audit-p1-9          # PASS
```

Screenshots em `docs/sprints/AUDIT-P1-9-BOOT-HOOKS-INFRA-screenshots-gauntlet/`
(estado do Vault mock antes e depois do segundo `disparaBootHooks`).

Validação de runtime real (Nível B, emulador): boot frio com o Vault já
migrado; conferir no log que a varredura de recuperação de layout não
reexecuta. Antes da correção ela aparece em boots repetidos.

```bash
adb logcat -s ReactNativeJS | grep migrarVaultLayout
```

## Commit

```
fix: audit-p1-9 boot hooks executaveis em jest e disparados so apos hidratacao
```
