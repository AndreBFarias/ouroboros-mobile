# R-INFRA-SETTINGS-EXPORT-SHAPE — Interface canônica do shape exportado de `useSettings`

**Tipo**: refactor (infraestrutura de tipos)
**Prioridade**: P3
**Estimativa**: 30 min
**Tranche**: R-INFRA (anti-débito)

## 1. Contexto

`src/lib/services/exportarVault.ts:70-80` declara o shape exportado de
`useSettings` indiretamente:

```ts
settings: Omit<
  ReturnType<typeof useSettings.getState>,
  | 'setSomVibracao'
  | 'setPessoa'
  | 'setFeatureToggle'
  | 'setPrivacidade'
  | 'setMidia'
  | 'setRecap'
  | 'setHCAutopullUltimaSync'
  | 'resetar'
>;
```

O resultado prático: cada vez que `src/lib/stores/settings.ts` ganha
um setter novo (ex.: a Onda 3P adicionou `setHCAutopullUltimaSync` em
commit `c477cce`), três pontos precisam ser editados em cascata:

1. A união do `Omit<...>` em `exportarVault.ts` (excluir o setter novo).
2. O objeto literal montado em `gerarSnapshotSettings()`
   (`exportarVault.ts:202-212`) — precisa repetir cada campo escalar.
3. A fixture `snapshotValido()` em
   `tests/lib/services/restaurarVault.test.ts:132-211` — precisa
   incluir o campo novo no literal.

Evidência: o commit SCHEDULER (Onda 3P Fase B.1) custou +4L em
`exportarVault.ts` e +9L em `restaurarVault.test.ts` **apenas pela
ergonomia do tipo derivado**, sem mudar runtime.

Achado colateral do validador SCHEDULER recomenda extrair uma
interface canônica nomeada — `SettingsExportShape` — que sirva como
fonte única de verdade para o que sai no snapshot, eliminando a
cascata.

## 2. Objetivo

Substituir o tipo derivado por `Omit<...>` por uma interface canônica
nomeada (`SettingsExportShape`) declarada em
`src/lib/stores/settings.ts`. `exportarVault.ts` e
`restaurarVault.test.ts` consomem essa interface diretamente; novos
setters em `settings.ts` deixam de exigir edição em outros arquivos.

Refactor de tipo puro: nenhum comportamento runtime muda. Snapshot
gerado/restaurado deve ser bit-identical ao snapshot atual.

## 3. Escopo (touches autorizados)

### 3.1 Arquivos a modificar

- `src/lib/stores/settings.ts` — declarar e exportar
  `SettingsExportShape`; ajustar `DEFAULT_STATE_V2` para reutilizar
  a interface se a aritmética fechar sem quebrar tipagem do `persist`.
- `src/lib/services/exportarVault.ts` — substituir o `Omit<...>` em
  `SnapshotSettings.settings` por `SettingsExportShape`; remover
  comentário de manutenção da lista de setters (não precisa mais).
- `tests/lib/services/restaurarVault.test.ts` — tipar a fixture
  `snapshotValido()` derivando de `SettingsExportShape` (ex.:
  `const s: SettingsExportShape = {...}; return { ..., settings: s, ... }`).
  Não muda valores, só amarra o literal à interface.

### 3.2 Arquivos a NÃO tocar

- `src/lib/services/restaurarVault.ts` — consumidor de
  `SnapshotSettings`; o refactor é transparente.
- Schemas Zod em `src/lib/schemas/`.
- Subscriber `escreverEstadoCanonico('settings', ...)` em
  `settings.ts:402-418` — payload do mirror Vault permanece exatamente
  como está (R-INT-3-HC-AUTOPULL-VAULT-MIRROR fica como sprint
  separada se houver demanda).
- `src/lib/health/tipos.ts` (`TipoHC`) — consumido pela interface, não
  precisa mover.

### 3.3 Arquivos a criar

Nenhum (ficar em `settings.ts` evita indireção; arquivo dedicado é
overkill para uma única interface).

## 4. Acceptance criteria

1. `SettingsExportShape` existe em `src/lib/stores/settings.ts` como
   `export interface` e lista **apenas** os campos escalares/objetos
   que entram no snapshot (`somVibracao`, `pessoa`, `featureToggles`,
   `privacidade`, `midia`, `recap`, `hcAutopullUltimaSync`). Setters e
   `resetar` ficam **fora** da interface.
2. `SnapshotSettings.settings` em `exportarVault.ts` tem tipo
   `SettingsExportShape` (sem `Omit<...>`).
3. `gerarSnapshotSettings()` ainda monta o objeto campo a campo
   (mantém comentário R-INT-3-HC-AUTOPULL-SCHEDULER da linha
   209-211); a única diferença é que TypeScript infere o tipo a partir
   da interface canônica.
4. Fixture `snapshotValido()` em `restaurarVault.test.ts` é tipada via
   `SettingsExportShape` (anotação local ou inline). Valores
   inalterados.
5. **Prova de abstração**: adicionar temporariamente um setter dummy
   em `settings.ts` (ex.: `setDummy: (v: boolean) => void;`) **não
   exige** nenhum touch em `exportarVault.ts` nem em
   `restaurarVault.test.ts` para o typecheck passar. (Setter dummy
   removido antes do commit final.)
6. `npx tsc --noEmit` exit 0.
7. `npm test` verde com mesmo total de testes (delta zero).
8. `./scripts/smoke.sh` exit 0 (inclui anonimato, PT-BR audit,
   typecheck, lint, tests).

## 5. Invariantes a preservar

- **Anonimato Absoluto** (CLAUDE.md Regra −1) — nenhum nome de IA,
  pessoa real, autor ou crédito em código novo. Comentários impessoais.
- **Comentários sem acento em código** (`.ts`/`.tsx`) — convenção
  shell/CI vigente em `exportarVault.ts` e em todo `src/`.
- **Schema `EXPORT_SCHEMA_VERSION = 1`** continua igual: o conteúdo do
  snapshot serializado não muda, só o tipo que o descreve.
- **Subscriber `escreverEstadoCanonico('settings', ...)`** em
  `settings.ts:402-418` permanece intocado — não incluir
  `hcAutopullUltimaSync` no payload Vault (deliberadamente
  out-of-scope, ver comentário existente).
- **Migrações `migrate` e `mesclarDefaults`** em `settings.ts`
  continuam operando sobre `SettingsState` (interface completa, com
  setters). `SettingsExportShape` é estritamente um subconjunto de
  `SettingsState` voltado ao snapshot.
- **Helpers internos** (`boolDefault`, `mesclarDefaults`,
  `filtrarBooleansConhecidos`) continuam privados ao módulo.

## 6. Plano de implementação

1. **Declarar `SettingsExportShape`** em `src/lib/stores/settings.ts`
   logo após a declaração de `SettingsState` e antes de
   `DEFAULT_STATE_V2`:
   ```ts
   // Subconjunto serializavel de SettingsState (campos exportados em
   // snapshot-settings.json). Setters e resetar ficam fora porque
   // funcoes nao serializam. R-INFRA-SETTINGS-EXPORT-SHAPE: fonte  // noqa-acento
   // unica para gerarSnapshotSettings() e fixture de restore tests.
   export interface SettingsExportShape {
     somVibracao: SettingsState['somVibracao'];
     pessoa: SettingsState['pessoa'];
     featureToggles: SettingsState['featureToggles'];
     privacidade: SettingsState['privacidade'];
     midia: SettingsState['midia'];
     recap: SettingsState['recap'];
     hcAutopullUltimaSync: SettingsState['hcAutopullUltimaSync'];
   }
   ```
   Usar lookup types (`SettingsState['somVibracao']`) garante que
   futuras mudanças nos sub-shapes (ex.: adicionar `Sleep2` em
   `hcAutopullUltimaSync`) propaguem automaticamente sem editar
   `SettingsExportShape`.
2. **Refatorar `exportarVault.ts:65-80`**:
   - Importar `SettingsExportShape` junto com `useSettings`:
     ```ts
     import { useSettings, type SettingsExportShape } from '@/lib/stores/settings';
     ```
   - Trocar:
     ```ts
     settings: Omit<
       ReturnType<typeof useSettings.getState>,
       | 'setSomVibracao'
       | ...
     >;
     ```
     por:
     ```ts
     settings: SettingsExportShape;
     ```
   - Remover comentário de manutenção da lista de setters (se houver).
3. **Refatorar `gerarSnapshotSettings()`** (`exportarVault.ts:195-226`)
   — manter a montagem campo a campo (clareza), mas declarar tipo
   explícito:
   ```ts
   const settings: SettingsExportShape = {
     somVibracao: s.somVibracao,
     pessoa: s.pessoa,
     featureToggles: s.featureToggles,
     privacidade: s.privacidade,
     midia: s.midia,
     recap: s.recap,
     hcAutopullUltimaSync: s.hcAutopullUltimaSync,
   };
   return {
     schema: EXPORT_SCHEMA_VERSION,
     exportadoEm: new Date().toISOString(),
     settings,
     onboarding: { ... },
     pessoa: { ... },
   };
   ```
   Ganho: typecheck reclama imediatamente se `SettingsExportShape`
   ganhar um campo novo e `gerarSnapshotSettings` esquecer de
   preencher.
4. **Refatorar fixture `snapshotValido()`** em
   `tests/lib/services/restaurarVault.test.ts:132-211`:
   ```ts
   import { useSettings, type SettingsExportShape } from '@/lib/stores/settings';
   ...
   function snapshotValido(): SnapshotSettings {
     const settings: SettingsExportShape = { /* literal atual sem mudancas */ };
     return {
       schema: EXPORT_SCHEMA_VERSION,
       exportadoEm: '2026-05-08T12:00:00.000Z',
       settings,
       onboarding: { ... },
       pessoa: { ... },
     };
   }
   ```
   Não mexer em valores. Só amarrar o literal ao tipo canônico.
5. **Prova de abstração** (verificação intermediária, não comitada):
   - Adicionar setter dummy em `settings.ts`:
     ```ts
     // TEMP: prova de abstracao R-INFRA-SETTINGS-EXPORT-SHAPE.
     setDummy: (valor: boolean) => void;
     ```
     mais a implementação no factory (`setDummy: () => set({})`).
   - Rodar `npx tsc --noEmit`. **Deve passar sem editar
     `exportarVault.ts` nem `restaurarVault.test.ts`**. Se o tsc
     reclamar nesses arquivos, a abstração falhou — investigar antes
     de prosseguir.
   - Remover o setter dummy.
6. **Smoke completo** (`./scripts/smoke.sh`) — verificar anonimato,
   PT-BR audit, typecheck, lint, testes.
7. **Commit único**:
   ```
   refactor: settings export shape canonico evita cascata em sprints futuras
   ```

## 7. Aritmética esperada

| Arquivo                                          | Linhas adicionadas | Linhas removidas | Saldo |
|--------------------------------------------------|-------------------:|-----------------:|------:|
| `src/lib/stores/settings.ts`                     | ~15 (interface + comentário) | 0 | +15 |
| `src/lib/services/exportarVault.ts`              | ~3 (typing explícito) | ~10 (`Omit<...>` colapsa) | −7 |
| `tests/lib/services/restaurarVault.test.ts`     | ~3 (anotação `SettingsExportShape`) | 0 | +3 |
| **Total**                                        | ~21 | ~10 | **+11** |

Faixa esperada: ~30-50L tocadas em 3 arquivos (incluindo imports e
comentários). Saldo final em torno de +10L. Refactor net-positive em
linhas porque a interface é nova; o ganho real está no fato de que
**sprints futuras que adicionarem setter param de tocar 3 arquivos
em cascata**.

## 8. Testes

Nenhum teste novo necessário. O refactor é tipo-puro:

- `tests/lib/services/restaurarVault.test.ts` — mesma fixture, novo
  tipo. Os 5 cenários existentes (`aborta sem mexer em stores`,
  `aborta com motivo schema-incompativel`, `aplica snapshot completo`,
  `rejeita snapshot sem chaves obrigatorias`, `tolera snapshot antigo
  sem sexoDeclarado/permissoes`) continuam passando.
- Baseline: testes verdes no commit `5060200` (HEAD atual antes da
  sprint). FAIL_BEFORE = 0; FAIL_AFTER esperado = 0.

## 9. Proof-of-work esperado

1. **Diff final** dos 3 arquivos (settings.ts, exportarVault.ts,
   restaurarVault.test.ts).
2. **Prova de abstração** (output do tsc com setter dummy temporário
   antes de remover):
   ```bash
   # Após adicionar setDummy em settings.ts
   npx tsc --noEmit
   # Esperado: exit 0 SEM mudancas em exportarVault.ts ou restaurarVault.test.ts.
   ```
3. **Verificação canônica** (`./scripts/smoke.sh`) exit 0:
   - `>> anonimato (Regra -1)` ok
   - `>> dados de teste` ok
   - `>> strings UI PT-BR (acentuacao canonica)` ok
   - `>> contract drift` ok ou warning não-bloqueante
   - `>> typecheck` ok
   - `>> lint` ok
   - `>> testes` ok (mesmo total de specs/testes que HEAD)
4. **Acentuação periférica** — varredura nos arquivos modificados:
   ```bash
   python3 scripts/check_strings_ui_ptbr.py
   ```
   Refactor não toca strings de UI, mas a verificação confirma que
   nada se quebrou.
5. **Hipótese verificada** — `rg "ReturnType<typeof useSettings"
   src tests` retorna **zero** ocorrências (todas migraram para
   `SettingsExportShape`).
6. **Hash do commit final** (após remover setter dummy).

## 10. Riscos e não-objetivos

### 10.1 Riscos identificados

- **R1**: tipagem com lookup types (`SettingsState['somVibracao']`)
  acopla `SettingsExportShape` à interface completa, o que é desejado.
  Se um sub-shape mudar drasticamente (ex.: `somVibracao` virar `enum`
  em vez de objeto), o snapshot herda automaticamente — pode quebrar
  schema v=1. **Mitigação**: o invariante atual já é que mudanças no
  shape de `somVibracao` bumpem `EXPORT_SCHEMA_VERSION`. Refactor não
  altera essa regra.
- **R2**: persist do zustand serializa o estado todo; se algum setter
  cair no `SettingsExportShape` por engano (via lookup type erôneo), o
  snapshot inclui função e quebra JSON. **Mitigação**: a interface
  lista campos explicitamente; setters não aparecem na lista, então
  não há caminho de inclusão acidental.
- **R3**: comentário no subscriber `escreverEstadoCanonico` em
  `settings.ts:402-418` fala que `hcAutopullUltimaSync` **não** entra
  no payload Vault. `SettingsExportShape` inclui esse campo
  deliberadamente (vai no snapshot do ZIP). Não confundir. **Mitigação
  textual**: o comentário do refactor explica que
  `SettingsExportShape` é para snapshot ZIP, **não** para Vault mirror.

### 10.2 Não-objetivos

- **NÃO** alterar runtime do export/restore.
- **NÃO** mudar `EXPORT_SCHEMA_VERSION` (continua 1).
- **NÃO** incluir `hcAutopullUltimaSync` no subscriber Vault — fica
  para sprint futura `R-INT-3-HC-AUTOPULL-VAULT-MIRROR` se houver
  demanda (já registrado como nota anti-débito no próprio comentário
  do subscriber).
- **NÃO** mover `SettingsExportShape` para arquivo dedicado
  (`src/lib/stores/settingsExportShape.ts`). Ficar em `settings.ts` ao
  lado de `SettingsState` reduz indireção; se aparecer mais um shape
  derivado no futuro, aí sim faz sentido mover.
- **NÃO** refatorar `SnapshotSettings.onboarding` ou
  `SnapshotSettings.pessoa` (seguem o padrão `ReturnType<typeof
  useOnboarding.getState>['...']` campo a campo, que **funciona** —
  são lookups individuais, não `Omit` em cascata).
- **NÃO** tocar `restaurarVault.ts` (consumidor transparente do tipo).

## 11. Referências

- BRIEF: `VALIDATOR_BRIEF.md` §1.1 (Anonimato), §1.4 (acentuação
  PT-BR em UI; código sem acento), §2 (Comandos de validação runtime),
  §5 (Checklist universal).
- Sprint origem do achado: **SCHEDULER** (Onda 3P Fase B.1, commit
  `c477cce` — adicionou `hcAutopullUltimaSync` ao snapshot).
- Precedente refactor infra: `R-DX-1` (sprint template) — estrutura
  proof-of-work + verificação canônica.
- Arquivo central: `src/lib/services/exportarVault.ts:70-80` (linha
  do `Omit<...>` a ser eliminado).
- Fixture de teste: `tests/lib/services/restaurarVault.test.ts:132-211`.
