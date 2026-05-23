## R-INT-3-HC-AUTOPULL-VAULT-MIRROR — Espelhar `hcAutopullUltimaSync` no Vault canônico

**Tipo:** feature (cross-stack schema extension)
**Prioridade:** P3 (anti-débito)
**Estimativa:** 1-1.5h mobile + 1 issue sibling Python aberta
**Fase:** pós-3 (consolidação)
**Depende de:** `R-INT-3-HC-AUTOPULL-SCHEDULER` (fechada, commit `c477cce`)
**Bloqueia:** nada — pendência opcional para sibling ETL enxergar última sync HC

## Origem

Achado do validador-sprint na Onda 3P Fase B.1 (commit `c477cce`).
Decisão consciente do executor do `R-INT-3-HC-AUTOPULL-SCHEDULER`:
**não** incluir o campo `hcAutopullUltimaSync` no payload do mirror
Vault, registrada como comentário inline (linhas 402-410 do
arquivo `src/lib/stores/settings.ts`). Em prosa: o comentário diz
que o campo fica fora do payload do mirror porque
`EstadoSettingsSchema` é estrito e adicionar a chave força migração
cross-stack do sibling Python; SecureStore já garante persistência
confiável, e o mirror permanece como "snapshot exportável para
recap"; a entrada termina apontando que esta sprint
(`R-INT-3-HC-AUTOPULL-VAULT-MIRROR`) materializa o débito quando
houver demanda.

Esta spec é o follow-up declarado por aquele comentário.
Materializa o débito quando o dono decidir que o sibling Python
precisa enxergar tracking de última sync HC (por exemplo: para
cross-device awareness quando 2 celulares syncam ao mesmo Vault
e queremos saber qual fez sync mais recente, ou para um ETL
diagnosticar gaps de coleta).

## Contexto

O `R-INT-3-HC-AUTOPULL-SCHEDULER` introduziu o campo
`hcAutopullUltimaSync: Record<TipoHC, string | null>` no
`SettingsState` (`src/lib/stores/settings.ts:106`). Ele é persistido
em SecureStore via middleware `zustand/persist` (adapter
`secureStorage`), portanto sobrevive a restart do app e é
confiável para o flow de pull dentro do device.

Não é, porém, espelhado em
`vault/_estado/settings-<deviceId>.md`. O subscriber em
`src/lib/stores/settings.ts:402-418` deliberadamente omite o campo
ao chamar `escreverEstadoCanonico('settings', {...})`. Consequência:

- Sibling Python `protocolo-ouroboros` (ETL/recap) não enxerga
  carimbo de última sync HC.
- Em cenário com 2 devices apontando para o mesmo Vault
  (`vaultCompartilhado: true`), os dois mantêm tracking só local;
  nenhum dos sides vê o trabalho do outro.
- Recap/diagnóstico futuro não pode raciocinar sobre "última vez
  que o app puxou Steps do HC".

A `EstadoSettingsSchema` em
`src/lib/schemas/vault_estado.ts:47-93` é estrita (Zod 4 strip por
default — campos desconhecidos são removidos no parse, e o
subscriber só persiste 6 chaves explícitas), então adicionar o
campo no payload sem antes estender o schema seria no-op.

## Objetivo

Entregar 4 mudanças coordenadas para que `hcAutopullUltimaSync` se
torne parte do snapshot canônico do estado de settings no Vault:

1. **Estender** `EstadoSettingsSchema` em
   `src/lib/schemas/vault_estado.ts` com a chave opcional
   `hcAutopullUltimaSync`.
2. **Atualizar** o subscriber em `src/lib/stores/settings.ts:402-418`
   para incluir o campo no payload do `escreverEstadoCanonico`.
3. **Atualizar** o contrato cross-stack em
   `docs/CONTRACT-MOBILE-BACKEND.csv` (bloco `5.23 estado_settings`,
   linhas 176-183) com a nova chave.
4. **Abrir issue** no sibling Python `protocolo-ouroboros`
   pedindo parser do campo no leitor canônico (não bloqueia o
   merge mobile, mas precisa estar aberta para fechar o ciclo
   cross-stack).

## Escopo / Entregáveis

### Arquivos a MODIFICAR (mobile)

- `src/lib/schemas/vault_estado.ts` — estender
  `EstadoSettingsSchema` (linhas 47-93).
  - Importar `TipoHC` de `@/lib/health/tipos` no topo do arquivo
    (ainda não importado lá).
  - Adicionar campo opcional `hcAutopullUltimaSync` (shape: `z.record`
    sobre `z.enum` dos 7 literais HC, valor `z.string().nullable()`,
    encadeado com `.optional()`). Snippet ilustrativo para o
    executor (manter comentário **sem acento**, convenção do
    cabeçalho do arquivo, linha 24: "Comentarios sem acento"):
    ```ts
    // R-INT-3-HC-AUTOPULL-VAULT-MIRROR (2026-05-22): tracking
    // canonico do scheduler de pull do Health Connect. Mapa
    // tipo -> ISO 8601 do sucesso mais recente (ou null se nunca puxou).
    // Optional para tolerar settings antigos espelhados antes
    // desta sprint (mesmo padrao de recapAudioAnexadoAutoplay).
    hcAutopullUltimaSync: z
      .record(
        z.enum([
          'Steps',
          'ExerciseSession',
          'Weight',
          'BodyFat',
          'HeartRate',
          'SleepSession',
          'MenstruationFlow',
        ]),
        z.string().nullable()
      )
      .optional(),
    ```
  - Por que `optional` em vez de exigir presença: instalações
    reais persistiram `settings-<deviceId>.md` antes desta sprint;
    bloquear parse desses arquivos quebraria leitura do sibling.
    Convenção já usada na linha 77 (`recapAudioAnexadoAutoplay`)
    pelo mesmo motivo.
  - Por que `z.enum(...)` literal embutido em vez de importar
    constante: o schema de estado fica auto-contido (sem coupling
    com `@/lib/health/tipos`), e o TS já tem o tipo `TipoHC` para
    consumidores que importem em runtime. A duplicação dos 7
    literais é o trade-off explícito (validador-sprint vai notar
    e aceitar — alternativa é exportar uma const `TIPO_HC_VALORES`
    em `tipos.ts` e referenciar nos dois lugares; se preferir,
    extrair como sub-tarefa).

- `src/lib/stores/settings.ts` — atualizar subscriber em
  `:402-418`:
  - Remover o comentário antigo (sem acento) que declara o
    débito (linhas 403-409 atuais — começa com "hcAutopullUltimaSync
    ... fora do payload do mirror Vault" e termina apontando esta
    sprint como follow-up).
  - Substituir pelo comentário curto de entrega referenciando
    esta sprint. Snippet ilustrativo (manter **sem acento** por
    convenção do bloco):
    ```ts
    // R-INT-3-HC-AUTOPULL-VAULT-MIRROR (2026-05-22): hcAutopullUltimaSync
    // agora entra no mirror canonico. Sibling Python protocolo-ouroboros
    // pode ler tracking do sync HC mais recente por tipo. Issue sibling: <URL>.
    ```
  - Adicionar
    `hcAutopullUltimaSync: { ...state.hcAutopullUltimaSync }`
    no objeto passado para `escreverEstadoCanonico('settings', { ... })`.

### Arquivos a MODIFICAR (contrato)

- `docs/CONTRACT-MOBILE-BACKEND.csv` — bloco `5.23 estado_settings`
  (linhas 176-183).
  - Inserir **1 linha** representando o campo agregado (não 7
    linhas separadas — manter coerência com como `featureToggles`
    é representado em 1 linha agregada na linha 180):
    ```csv
    5.23,estado_settings,1,hcAutopullUltimaSync,object,não,"Mapa { Steps, ExerciseSession, Weight, BodyFat, HeartRate, SleepSession, MenstruationFlow } -> ISO 8601 do último pull HC bem-sucedido ou null. R-INT-3-HC-AUTOPULL-VAULT-MIRROR."
    ```
  - Inserir antes da linha 183 (`atualizadoEm`), preservando a
    ordem do bloco (atualizadoEm continua último).
  - Acentuação completa PT-BR ("não", "último") — o CSV usa
    acentuação PT-BR como visto em 178-182.

### Issue sibling (Python ETL)

- Repositório sibling: `protocolo-ouroboros` (path provável
  `~/Desenvolvimento/protocolo-ouroboros` — confirmar antes de
  abrir).
- Título sugerido:
  `etl: parser de estado_settings deve aceitar hcAutopullUltimaSync (R-INT-3)`
- Corpo:
  - Contexto: mobile passou a espelhar tracking de pulls HC no
    Vault (a partir do commit que fechar esta sprint).
  - Shape: `Record<TipoHC, string | null>` com 7 tipos canônicos.
  - Tarefa: estender o leitor `estado_settings` para parsear o
    novo campo opcional sem quebrar settings antigos (sem a chave).
  - Aceite: testar com fixture antiga (sem chave) e fixture nova
    (com chave preenchida para 1 tipo).
  - Não bloqueia merge mobile.
- URL da issue deve aparecer no comentário do subscriber
  (`src/lib/stores/settings.ts`) e nas notas desta spec após
  abertura.

## OFF-LIMITS

- **Não alterar comportamento de leitura/escrita do scheduler.**
  `setHCAutopullUltimaSync` continua escrevendo no store; o
  subscriber existente já dispara o mirror automaticamente em
  qualquer mudança de state. Esta sprint só estende o que vai
  no payload, sem tocar o fluxo de pull.
- **Não tocar** em `src/lib/health/autopullScheduler.ts`,
  `src/lib/health/tipos.ts`, nem nos 5 puxadores concretos
  (`R-INT-3-HC-AUTOPULL-{PASSOS,EXERCICIO,MEDIDAS,MENSTRUACAO,SLEEP}`).
- **Não alterar** outros schemas em `vault_estado.ts`
  (`EstadoSessaoSchema`, `EstadoOnboardingSchema`, etc.).
- **Não migrar** instalações existentes — `optional` no schema
  resolve compat retroativa.
- **Não implementar** o lado Python; só abrir a issue.

## Aritmética

- `src/lib/schemas/vault_estado.ts`: ~18L adicionadas (1 import +
  bloco de campo com comentário). Schema continua coeso e estrito;
  nenhuma chave existente alterada.
- `src/lib/stores/settings.ts`: balanço de ~0L (substitui 7L de
  comentário antigo por 3L de comentário de entrega + 1L de
  payload). Pode terminar entre -3L e +2L.
- `docs/CONTRACT-MOBILE-BACKEND.csv`: +1 linha.
- Total mobile: ~20-30L diff líquido, dentro do estimado
  ("~30-50L mobile" do prompt).

## Invariantes a preservar

- `EstadoSettingsSchema` continua **estrito**: chaves desconhecidas
  são strippadas no parse (default Zod 4). Adicionar o campo como
  conhecido não muda essa garantia.
- Tom anônimo das linhas adicionadas em código (Regra −1 do
  `CLAUDE.md`): zero menção a IA, autor, "by ...".
- Acentuação PT-BR completa em comentários, docstrings, CSV e
  spec; sem acento em commit messages (Regra de Linguagem).
- `accessibilityLabel` (não há na sprint, mas se houver toques
  em UI por acaso): sem acento (convenção screen reader já
  documentada).
- Convenção de import path: `@/lib/health/tipos` já estabelecida
  em `src/lib/stores/settings.ts:23` — manter.
- Convenção de comentário sem acento dentro de
  `vault_estado.ts` está documentada no header do próprio
  arquivo (linha 24: "Comentarios sem acento (convencao shell/CI).").
  **Atenção**: esse arquivo é exceção à regra PT-BR geral —
  adicionar o comentário do campo respeitando essa convenção
  do header. Já o CSV e o spec usam acento normal.

## Proof-of-work esperado

Comandos do contrato de runtime (rodar **na ordem**):

1. **Schema parse e tipo TS:**
   ```bash
   npx tsc --noEmit
   ```
   Esperado: exit 0. Schema válido, tipos inferidos coerentes,
   nenhum consumer quebrou (`escreverEstado.ts`, leitor
   canônico, etc.).

2. **Testes Jest:**
   ```bash
   npm test -- --runInBand
   ```
   Esperado: baseline `1126/130` mantido ou superior. Se algum
   teste do `vault_estado.spec` valida shape exato, ajustar
   fixture (deve aceitar campo opcional ausente E presente).
   Anotar FAIL_BEFORE e FAIL_AFTER no proof.

3. **Drift contrato cross-stack:**
   ```bash
   ./scripts/test_contract_drift.sh
   ```
   Esperado: exit 0. Se o script comparar shape do CSV com
   schema Zod, a sincronia da linha adicionada vai ser
   verificada automaticamente.

4. **Acentuação PT-BR no código mobile:**
   ```bash
   python3 scripts/check_strings_ui_ptbr.py
   ```
   Esperado: exit 0. (Spec markdown não roda pelo script — esse
   olha `src/` e `app/`. Para o spec, usar
   `python3 ~/.config/zsh/scripts/validar-acentuacao.py --paths
   <path-do-spec>` antes de aceitar, mantendo exit 0.)

5. **Smoke geral:**
   ```bash
   ./scripts/smoke.sh
   ```
   Esperado: exit 0. Inclui type-check, lint, jest,
   `check_strings_ui_ptbr`, `check_anonimato`.

6. **Issue sibling aberta:**
   - Confirmar URL da issue criada (por ex. `https://github.com/...`).
   - Anexar URL no body do PR e neste spec (seção "Referências").

7. **FEATURES-CANONICAS.md:** verificar se há entrada sobre
   Health Connect/sync que precise menção do mirror. Se houver
   feature canônica "Sincronizar HC" listada, adicionar nota
   indicando que tracking agora está no Vault. Se não houver,
   nada a fazer (CLAUDE.md exige update só quando sprint
   "introduz, modifica ou remove feature" — este caso é
   refinamento interno do contrato cross-stack, não feature
   nova user-facing).

8. **Validação visual:** **não aplicável.** Esta sprint não
   toca UI. Gauntlet (Nível A+) só é obrigatório para sprints
   que mexem em UI (CLAUDE.md "Regra de Validação Visual").
   Validador-sprint deve aceitar ausência de E2E aqui, mesmo
   sendo regra para sprints UI.

9. **Hipótese verificada via rg:**
   ```bash
   rg "hcAutopullUltimaSync" src/ docs/
   rg "EstadoSettingsSchema" src/
   rg "5.23,estado_settings" docs/CONTRACT-MOBILE-BACKEND.csv
   ```
   Esperado: cada identificador citado nesta spec aparece nos
   arquivos mencionados (lição 4 do GUIDE.md).

## Testes

### Adicionar / ajustar

- Se existir `tests/lib/schemas/vault_estado.spec.ts` (ou similar
  cobrindo `EstadoSettingsSchema`), adicionar 2 casos:
  1. Parse de payload **sem** `hcAutopullUltimaSync` continua
     succeeding (compat retroativa).
  2. Parse de payload **com** `hcAutopullUltimaSync: { Steps:
     '2026-05-22T10:00:00-03:00', ExerciseSession: null, ... }`
     succeeding e tipa corretamente.
- Se houver teste do subscriber (provavelmente em
  `tests/lib/stores/settings.spec.ts`), adicionar caso:
  - Mockar `escreverEstadoCanonico` e disparar
    `setHCAutopullUltimaSync('Steps', '2026-05-22T10:00:00-03:00')`.
  - Assertar que o último call recebeu `hcAutopullUltimaSync` no
    payload.

### Baseline

- FAIL_BEFORE: ≤ baseline atual de smoke (consultar
  `Checkpoint.md` ou último run antes de iniciar).
- FAIL_AFTER esperado: ≤ FAIL_BEFORE. Sem regressão.

## Riscos e não-objetivos

### Riscos conhecidos

- **Compat retroativa:** se um teste já assume que
  `EstadoSettingsSchema.parse({...sem hcAutopull})` retorna o
  objeto sem a chave, ele continua passando (campo é
  `optional`). Risco baixo.
- **Type drift entre `TipoHC` (`tipos.ts`) e `z.enum(...)` literal
  no schema:** se o time adicionar um tipo HC novo em
  `tipos.ts` (ex. `Distance`), o schema não vai aceitar até
  ser atualizado também. Mitigação: anotar no comentário do
  schema o fator de duplicação consciente, ou (alternativa)
  promover lista para constante exportada em `tipos.ts`. Optei
  por **duplicação** consciente para manter `vault_estado.ts`
  auto-contido (header da linha 1-3 declara que o arquivo é
  espelhamento canônico — coupling com `health/tipos` complicaria
  parsing isolado pelo sibling Python). Validador-sprint pode
  contestar e propor a constante; aceitar refator se pedirem.
- **Sibling Python desincronizado:** mobile passa a escrever o
  campo antes do sibling parsear. **Não bloqueia** — campo é
  novo, sibling antigo ignora silenciosamente (parse Python
  geralmente é tolerante a chaves extras). Issue sibling
  registra o débito para fechar quando ETL precisar.

### Não-objetivos

- **Não migrar** instalações persistidas (compat por `optional`).
- **Não implementar** parser Python — só abrir issue.
- **Não estender** outros schemas de estado (sessão, onboarding,
  etc.) — escopo restrito a settings.
- **Não exigir** o campo (mantém opcional).
- **Não criar** wiring novo — scheduler já dispara
  `setHCAutopullUltimaSync` quando puxador completa, e
  subscriber já dispara o mirror em qualquer mudança de state.

## Plano de implementação

1. **Verificar baseline:**
   ```bash
   git status
   ./scripts/smoke.sh
   ```
   (Confirma verde antes de iniciar.)
2. **Confirmar sibling Python path:**
   ```bash
   ls ~/Desenvolvimento/protocolo-ouroboros 2>/dev/null \
     || ls ~/Desenvolvimento/Protocolo-Ouroboros 2>/dev/null
   ```
3. **Estender `EstadoSettingsSchema`** em
   `src/lib/schemas/vault_estado.ts`:
   - Inserir campo opcional `hcAutopullUltimaSync` com `z.record`
     conforme bloco acima.
   - Comentário sem acento (convenção do header do arquivo).
4. **Atualizar subscriber** em `src/lib/stores/settings.ts:402-418`:
   - Substituir o comentário antigo (sem acento, declarando o
     débito) pelo comentário de entrega referenciando esta sprint.
   - Adicionar `hcAutopullUltimaSync: { ...state.hcAutopullUltimaSync }`
     no payload de `escreverEstadoCanonico`.
5. **Atualizar contrato** `docs/CONTRACT-MOBILE-BACKEND.csv`:
   - Inserir linha do campo antes da linha 183
     (`atualizadoEm`).
6. **Rodar testes:**
   ```bash
   npx tsc --noEmit
   npm test
   ./scripts/test_contract_drift.sh
   ./scripts/smoke.sh
   ```
7. **Abrir issue sibling** com `gh issue create -R <sibling>`.
8. **Anexar URL da issue** nos 2 lugares:
   - Comentário no subscriber `settings.ts`.
   - Seção "Referências" desta spec.
9. **Commit + push** (autorizado durável):
   ```bash
   git add -A
   git commit -m "feat: hc autopull mirror estado_settings vault canonico"
   git push origin main
   ```
10. **Atualizar `Checkpoint.md`** com sprint fechada.

## Referências

- BRIEF: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md`
- Sprint precedente: `docs/sprints/R-INT-3-HC-AUTOPULL-SCHEDULER-spec.md`
- Commit que materializou o débito: `c477cce` (Onda 3P Fase B.1)
- Schema canônico: `src/lib/schemas/vault_estado.ts:47-93`
- Subscriber Vault: `src/lib/stores/settings.ts:396-418`
- Tipos HC: `src/lib/health/tipos.ts` (7 literais)
- Contrato cross-stack: `docs/CONTRACT-MOBILE-BACKEND.csv:176-183`
- Issue sibling Python: `<URL será preenchida ao abrir>`
- Convenção campo opcional retroativo: linha 77 do
  `vault_estado.ts` (`recapAudioAnexadoAutoplay`).
