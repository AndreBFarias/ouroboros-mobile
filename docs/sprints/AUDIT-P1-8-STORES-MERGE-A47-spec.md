# AUDIT-P1-8-STORES-MERGE-A47 — seis stores persistidos sem `merge` custom, classe A47

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (sem dano observável hoje — os shapes persistidos estão
            completos; é o guard contra a próxima chave aninhada que faltar)
DEPENDE:    nenhuma
ORIGEM:     achado [P1-7] da auditoria de 2026-07-28. Encontrado ao varrer todos
            os `persist(` do repositório e comparar cada bloco de opções com o de
            `settings.ts`, o único que ganhou `merge` custom na R-RECAP-9b. Cada
            store foi aberto para confirmar se tem objeto aninhado persistido —
            é o que separa risco real de ruído.
```

## Problema (guard ausente onde o projeto já reconheceu que ele é necessário)

### A armadilha, nas palavras do próprio projeto

`VALIDATOR_BRIEF.md:1218`:

> **A47.** **`zustand persist` com merge shallow padrão NÃO back-filla chaves
> nested novas em instalação já-versionada — `migrate` sozinho não cobre.**
> […] `migrate` **só roda quando a versão persistida < versão atual**. Instalações
> já-v2 (todos os usuários atuais) não disparam `migrate`; a hidratação cai no
> `merge` **shallow** padrão do zustand (`{...currentState, ...persistedState}`),
> onde o objeto `featureToggles` persistido — **sem** a chave nova
> `recapMusicaFundo` — **substitui o default inteiro** → a chave hidrata
> `undefined` → falsy → mudo. **Isto é sistêmico** […] **Invisível para a suíte e
> para o Gauntlet:** os testes chamam `resetar()` (defaults limpos) e o
> `window.__gauntlet.seed()` injeta o `DEFAULT_STATE_V2` completo […] O bug só
> aparece com **estado persistido orgânico** de uma versão anterior.

### O padrão a replicar

`src/lib/stores/settings.ts:449-461` é o único bloco de opções do repositório com
`merge`:

```ts
{
  name: 'ouroboros.settings.v2',
  storage: createJSONStorage(() => secureStorage),
  version: 2,
  // R-RECAP-9b (2026-07-11): merge custom que roda em TODA hidratacao
  // (nao so' em troca de versao, como o migrate). […]
  merge: mergeSettingsPersistido,
```

A função tem 12 linhas e duas propriedades que a tornam o padrão certo:

```ts
// src/lib/stores/settings.ts:617-628
export function mergeSettingsPersistido(
  persistedState: unknown,
  currentState: SettingsState
): SettingsState {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }
  return {
    ...currentState,
    ...mesclarDefaults(persistedState as Record<string, unknown>),
  };
}
```

Guard contra `null`/não-objeto, e spread de `currentState` **primeiro** — que é o
que preserva as ações do store, já que `mesclarDefaults` só devolve campos de
estado (`settings.ts:610-616` explica isso). `mesclarDefaults`
(`settings.ts:540-604`) faz o deep-merge propriamente dito, um sub-objeto por vez:
`{ ...DEFAULT_STATE_V2.<chave>, ...(ps.<chave> ?? {}) }`.

O comentário de `:606-608` registra a decisão de exportá-la: *"Exportada para o
teste de regressao exercitar o CODIGO REAL (cabeado em `merge` no persist config
acima) em vez de uma replica tautologica."* A regressão vive em
`tests/lib/stores/settings-merge-backfill.test.ts` e é o modelo de teste a copiar.

### As seis stores sem `merge`, com o objeto aninhado confirmado

Duas correções ao mapeamento original: as stores de Spotify e YouTube **não** ficam
em `src/lib/stores/`, e sim em `src/lib/integracoes/<serviço>/store.ts`.

| Store | Arquivo | Bloco `persist` | Objeto(s) aninhado(s) persistido(s) | `version`/`migrate` |
|---|---|---|---|---|
| `sessao` | `src/lib/stores/sessao.ts` | `:268-...` (`name` `:269`, `partialize` `:273-279`, `version: 5` `:288`, `migrate` `:289`) | `rascunhos` (7 chaves), `permissoesPedidas` (4), `flags` (5) | sim / sim |
| `onboarding` | `src/lib/stores/onboarding.ts` | `:113-116` | `sexoDeclarado` (2 chaves), `permissoes` (5) | não / não |
| `pessoa` | `src/lib/stores/pessoa.ts` | `:60-63` | `nomes` (2), `fotos` (2) | não / não |
| `googleAuth` | `src/lib/stores/googleAuth.ts` | `:402-407` (`partialize` `:406`) | `contas: { pessoa_a: ContaGoogle; pessoa_b: ContaGoogle }` — **dois níveis** | não / não |
| `spotify` | `src/lib/integracoes/spotify/store.ts` | `:227-231` (`partialize` `:230`) | `conta` | não / não |
| `youtube` | `src/lib/integracoes/youtube/store.ts` | `:236-240` (`partialize` `:239`) | `conta` | não / não |

Todas as seis têm objeto aninhado persistido. O escopo não precisa ser reduzido —
mas vale registrar a sétima store persistida, `src/lib/stores/vault.ts:22-25`, que
guarda só `vaultRoot: string | null`. Estado plano, sem sub-objeto, **fora** desta
sprint por não ter a forma da armadilha.

### Por que ainda não deu dano, e onde vai dar

Os shapes persistidos hoje estão completos, então o merge shallow acerta por sorte.
O risco é aditivo e já tem precedente documentado dentro do próprio código: os
comentários de `sessao.ts:78-99` mostram `FlagsBootState` crescendo sprint a sprint
(`canalV1Deletado` M30, `cacheAgendaMigrado` M37.1.2, `vaultLayoutMigrado` H2,
`t2DeviceIdSuffixMigrado` T2-LOCK-VAULT, `estadoMigradoParaVault`
R-VAULT-CANONICAL-COMPLETE-A). Cada uma dessas cinco adições foi, no momento em que
entrou, exatamente o cenário A47: instalação já existente hidrata a flag nova como
`undefined`.

Nas flags de boot o `undefined` cai para o lado seguro (falsy → o hook re-executa,
e todos são idempotentes por construção). Nas outras não há essa sorte:
`onboarding.permissoes` ganhando uma chave nova faz o app re-pedir uma permissão já
concedida; `pessoa.fotos` incompleto derruba o avatar de `pessoa_b` para a inicial;
`googleAuth.contas` tem **dois níveis** e um `mesclarDefaults` raso não bastaria —
precisa mesclar `contas.pessoa_a` e `contas.pessoa_b` individualmente.

### A segunda porta: `restaurarVault.aplicarSnapshot`

Verificado. `src/lib/services/restaurarVault.ts:286-361` é a outra entrada por onde
estado antigo chega aos stores, e ela já foi endurecida — **parcialmente**.

Coberto, com o raciocínio explícito em `:309-318` (*"esta e' a segunda porta, via
restore"*):

```ts
// src/lib/services/restaurarVault.ts:319-328
useSettings.setState({
  somVibracao: { ...DEFAULT_STATE_V2.somVibracao, ...snap.settings.somVibracao },
  pessoa: { ...DEFAULT_STATE_V2.pessoa, ...snap.settings.pessoa },
  featureToggles: {
    ...DEFAULT_STATE_V2.featureToggles,
    ...snap.settings.featureToggles,
  },
  privacidade: { ...DEFAULT_STATE_V2.privacidade, ...snap.settings.privacidade },
  midia: { ...DEFAULT_STATE_V2.midia, ...snap.settings.midia },
});
```

**Não** coberto — os sub-objetos de `onboarding` e `pessoa` entram inteiros, sem
back-fill:

```ts
// src/lib/services/restaurarVault.ts:346-358
if (snap.onboarding.sexoDeclarado) {
  onboardingPatch.sexoDeclarado = snap.onboarding.sexoDeclarado;
}
if (snap.onboarding.permissoes) {
  onboardingPatch.permissoes = snap.onboarding.permissoes;
}
useOnboarding.setState(onboardingPatch);
usePessoa.setState({
  pessoaAtiva: snap.pessoa.pessoaAtiva,
  filtroPessoa: snap.pessoa.filtroPessoa,
  nomes: snap.pessoa.nomes,
  fotos: snap.pessoa.fotos,
});
```

O guard de `:346` e `:349` cobre o sub-objeto **ausente por inteiro**, não o
sub-objeto **presente com chave faltando** — que é precisamente a forma do A47.
Restaurar um backup exportado antes de uma sprint que adicionou uma permissão ao
onboarding traz `permissoes` sem ela.

`sessao`, `googleAuth`, `spotify` e `youtube` **não** estão no snapshot
(`aplicarSnapshot` valida apenas `snap.settings`, `snap.onboarding` e `snap.pessoa`
em `:302-304`), então para essas quatro a segunda porta não existe.

## Escopo (mínimo)

1. Adicionar `merge` custom ao `persist` das seis stores da tabela, replicando a
   forma de `mergeSettingsPersistido` (`settings.ts:617-628`): guard para
   `persistedState` null/não-objeto, spread de `currentState` primeiro, deep-merge
   de cada sub-objeto contra o default do módulo. Cada store expõe uma função de
   merge **exportada**, pelo mesmo motivo registrado em `settings.ts:606-608` — o
   teste tem de exercitar o código real, não uma réplica.
2. Extrair os defaults que hoje são literais inline para constantes exportadas onde
   ainda não são. `sessao` já tem `RASCUNHOS_VAZIOS`, `PERMISSOES_VAZIAS` e
   `FLAGS_VAZIAS`; `onboarding` já tem `PERMISSOES_DEFAULT` e `SEXO_DEFAULT`;
   `pessoa`, `googleAuth` (`CONTA_VAZIA` em `:89`, `ESTADO_INICIAL` em `:98`),
   `spotify` e `youtube` precisam de verificação caso a caso.
3. Tratar `googleAuth.contas` com deep-merge de **dois níveis**: back-fill de
   `contas` e, dentro dele, de `contas.pessoa_a` e `contas.pessoa_b` contra
   `CONTA_VAZIA`. Um merge raso deixaria o bug de pé no ponto onde ele é mais
   provável.
4. Fechar a segunda porta em `restaurarVault.aplicarSnapshot`: aplicar o mesmo
   `{ ...DEFAULT, ...snap }` de `:319-328` aos sub-objetos de `onboarding`
   (`sexoDeclarado`, `permissoes`, `:346-352`) e de `pessoa` (`nomes`, `fotos`,
   `:353-358`). Não estender a `sessao`/`googleAuth`/`spotify`/`youtube`: essas
   quatro não estão no snapshot (`:302-304`).
5. Testes, um por store, no modelo de
   `tests/lib/stores/settings-merge-backfill.test.ts`: simular um `persistedState`
   orgânico ao qual falta uma chave dentro de um sub-objeto e assertar que a chave
   hidrata com o **default**, não `undefined`, e que a escolha orgânica do usuário
   nas chaves presentes é preservada. Suítes existentes a estender:
   `tests/lib/stores/sessao.test.ts`, `onboarding.test.ts`, `pessoa.test.ts`,
   `googleAuth.test.ts`. Spotify e YouTube não têm suíte de store — criar.
   Estender `tests/lib/services/restaurarVault.test.ts` para o item 4.
6. Registrar em `VALIDATOR_BRIEF.md` §4, no verbete A47, que o guard passou a ser
   sistêmico: as sete stores persistidas do repositório revisadas, seis com `merge`
   custom, `vault.ts` dispensada por ter estado plano. Isso fecha o verbete em vez
   de deixá-lo como lição de um caso único.
7. NÃO-objetivo: `docs/FEATURES-CANONICAS.md`. A sprint é defensiva e não altera
   nenhum comportamento observável — o estado hidratado hoje é idêntico ao de
   depois, porque os shapes estão completos. Se a execução descobrir alguma chave
   já faltando em instalação real, o achado promove a sprint e o arquivo passa a
   ser obrigatório.
8. NÃO-objetivo: caso E2E. `VALIDATOR_BRIEF.md:1218` é explícito de que o bug é
   **invisível para o Gauntlet**, porque `window.__gauntlet.seed()` injeta o
   default completo. Um E2E aqui daria falso verde, que é pior que ausência de
   teste. A validação real é Jest com `persistedState` orgânico, mais o checkpoint
   de Nível C do Proof-of-work.
9. NÃO-objetivo: adicionar `version`/`migrate` às stores que não têm. `merge` roda
   em toda hidratação e resolve o problema; `migrate` é para renomear e remapear
   chaves, o que nenhuma dessas seis precisa agora.

## Proof-of-work

```bash
npx tsc --noEmit                                   # exit 0
npm test -- stores                                 # 6 suites de back-fill verdes
npm test -- restaurarVault                         # segunda porta coberta para onboarding e pessoa

# todo persist do repo tem merge, exceto vault.ts (estado plano, dispensada)
rg -n "persist\(" src/ app/                        # 8 ocorrencias
rg -n "merge:" src/lib/stores/ src/lib/integracoes/  # 7 (settings + as 6 novas)

# checkpoint Nivel C: instalacao ORGANICA, unico cenario que reproduz o A47.
# Backup obrigatorio antes de qualquer troca de app.
./scripts/adb-vault-pull.sh
adb shell run-as com.ouroboros.mobile ls files/   # SecureStore preservado apos update in-place

./scripts/smoke.sh                                 # verde
```

Sem screenshots: a sprint não toca UI. Evidência = saída das suítes de back-fill e
a confirmação, no device com estado orgânico, de que nenhuma preferência,
permissão, nome, foto ou conta conectada se perdeu na atualização.

## Commit

```
refactor: audit-p1-8 merge custom nas 6 stores restantes e back-fill no aplicarsnapshot
```
