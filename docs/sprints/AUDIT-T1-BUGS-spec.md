# AUDIT-T1-BUGS — Endurecimento pré-v1.0 (bugs latentes B1–B6)

> Sprint corretiva derivada da auditoria de 2026-05-15. Tranche 1
> de 3. Escopo: bugs latentes confirmados via grep no código.
> B7 (read-then-write race em saves) descopado para sprint futura
> (`AUDIT-T2-LOCK-VAULT-spec.md`).

## 1. Objetivo

Endurecer 6 pontos frágeis identificados na auditoria, sem mudar
contratos públicos nem comportamento esperado em caminho feliz.
Mantém 1932 testes verdes e adiciona testes novos cobrindo edge
cases.

## 2. Entregáveis (por bug)

### B1 — Atomic write em `file://` (writer.ts)
**Arquivo**: `src/lib/vault/writer.ts`
**Mudança**: na branch `file://` (não SAF `content://`), escrever para
`<uri>.writing` + `moveAsync({from: <uri>.writing, to: <uri>})`.
SAF nativo mantém comportamento atual (não suporta rename atômico —
documentado em comentário da função; preservar).

**Por quê**: vault default desde V4.0.2-5 é `documentDirectory`
(file://), onde o rename atômico É suportado por `FileSystem.moveAsync`.
App matado durante write não deixa frontmatter quebrado.

**Cleanup em boot**: adicionar varredura em `src/lib/boot/` (criar
`limparArquivosWritingOrfaos.ts` ou similar) que apaga `*.writing`
em vault root ao iniciar. Registrar no `_layout.tsx` ou em algum
boot hook existente (mapear).

### B2 — Wrap defensivo em `pickClientId()` (googleAuthFlow.ts)
**Arquivo**: `src/lib/services/googleAuthFlow.ts`
**Mudança**: adicionar `pickClientIdSafe(): ClientIdInfo | { erro: string }`.
Não remove `pickClientId()` (mantém para callers que querem throw).
`pickClientIdSafe` wrap em try/catch e retorna `{ erro }` em vez de
lançar.

**Mapear callers**: usar `grep -RIn "pickClientId" src/ app/` e
identificar se algum é invocado durante boot/render sem catch
upstream. Se sim, trocar para `pickClientIdSafe` e renderizar
estado de erro UI ("OAuth indisponível: env.json ausente").

### B3 — Toast em permissão negada (AvatarPicker e similares)
**Arquivo principal**: `src/components/ui/AvatarPicker.tsx:38`
**Mudança**: substituir `if (!perm.granted) return;` por:
```tsx
if (!perm.granted) {
  toast.show('Sem permissão de galeria.', 'error');
  return;
}
```

**Outros pickers com mesmo padrão**: buscar via grep
`grep -RIn "perm.granted\|permissions.granted" src/components/` e
auditar cada um. Aplicar mesmo padrão onde silencia sem aviso.

### B4 — Clamp defensivo no Slider (Slider.tsx)
**Arquivo**: `src/components/ui/Slider.tsx`
**Mudança**: no handler interno (provavelmente `onTick` ou similar
no contrato `SliderInternoProps`), aplicar
`const safe = Math.max(min, Math.min(max, next))` antes de
`onChange(safe)`.

**Por quê**: state racing pode passar valor fora de range. Schema
zod rejeita downstream com erro genérico. Clamp evita estado
inválido sem barulho.

### B5 — Prop `maxLength` opcional em Input (Input.tsx)
**Arquivo**: `src/components/ui/Input.tsx`
**Mudança**: adicionar à `InputProps`:
```ts
maxLength?: number;
```
Repassar a `<TextInput maxLength={maxLength}>`.

**Callers a auditar (opcional, não obrigatório nesta sprint)**:
- Forms de rotina (nome, descrição)
- Forms de grupo
- Sheets de frase, contador, alarme
- Campo nota em humor
Listar callers em achados colaterais; aplicar `maxLength` só nos
óbvios (nome: 60, descrição: 280). Demais ficam para sprint
follow-up.

### B6 — Filtro `.sync-conflict-*` em listadores do vault
**Arquivo central**: criar `src/lib/vault/syncConflict.ts` com:
```ts
export const SYNC_CONFLICT_REGEX = /\.sync-conflict-/i;
export function ehSyncConflict(nome: string): boolean {
  return SYNC_CONFLICT_REGEX.test(nome);
}
```

**Aplicar em todos os listadores**:
- `src/lib/vault/galeria.ts` (Q9 unificado)
- `src/lib/vault/agenda.ts`, `alarmes.ts`, `ciclo.ts`,
  `contadores.ts`, `diario.ts`, `eventos.ts`, `exercicios.ts`,
  `grupo_treino.ts`, `humor.ts`, `marcos.ts`, `medidas.ts`,
  `midiaCompanion.ts`, `rotina.ts`, `tarefas.ts`, `treinos.ts`
- `src/lib/vault/devicesIndex.ts`

Cada listador que itera `readDirectoryAsync` ou `listVaultFolder`
filtra `!ehSyncConflict(nome)`.

**Não modificar `reader.ts`** (`listVaultFolder` é low-level;
filtro é responsabilidade do caller para preservar visibilidade
em devicesIndex que pode querer ver conflitos).

## 3. Restrições e OFF-LIMITS

- **NÃO TOQUE** os seguintes arquivos (apenas o maestro modifica):
  - `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`,
    `HOW_TO_RESUME.md`, `VALIDATOR_BRIEF.md`
  - `docs/CONTEXTO.md`, `docs/BRIEFING.md`, `docs/FEATURES-CANONICAS.md`
  - `docs/ADRs/*` (qualquer ADR existente)
  - `docs/sprints/*-spec.md` exceto esta sprint
  - `.gitignore`, `.easignore`, `.github/workflows/*`, `app.json`,
    `eas.json`, `package.json` (não mudar deps)
  - Qualquer arquivo em `scripts/` ou `hooks/`
  - `PROMPT-CONTINUACAO-*.md`, `HANDOFF-PROMPT.md`
- **NÃO INTRODUZA** nova dependência npm.
- **NÃO REFATORE** código adjacente "de passagem".
- **NÃO REMOVA** comentários históricos do writer.ts (V4.0, V4.0.2,
  Q9, etc — são âncora de armadilhas).

## 4. Procedimento sugerido

1. **B6 primeiro** (mais isolado): criar `syncConflict.ts`, aplicar
   filtro nos 16 listadores. Rodar `npx jest src/lib/vault` e
   `npx jest tests/.../listar*` — devem passar.
2. **B5** depois: 1 linha em Input.tsx. Adicionar 1 teste
   `tests/components/ui/Input-maxLength.test.tsx`.
3. **B4**: clamp em Slider. Adicionar 1 teste
   `tests/components/ui/Slider-clamp.test.tsx` com valores fora de
   range.
4. **B3**: toast em AvatarPicker. Grep similar em outros pickers,
   reportar achados colaterais (não aplicar agora — vira spec
   nova se houver muitos).
5. **B2**: wrap defensivo em googleAuthFlow. Mapear callers via
   grep. Adicionar teste cobrindo env.json vazio.
6. **B1** por último (mais invasivo): writer.ts com `.writing +
   rename` no path file://. Criar `limparArquivosWritingOrfaos.ts`
   em `src/lib/boot/`. Wire no boot hook canônico (verificar onde
   estão os outros boot hooks; `_layout.tsx` ou
   `src/lib/boot/index.ts`). Adicionar 2 testes:
   `tests/lib/vault/writer-atomic.test.ts` (rename funciona) +
   `tests/lib/boot/limparOrfaos.test.ts`.

## 5. Verificação runtime-real

```bash
./scripts/check_anonimato.sh                        # OK
python3 scripts/check_strings_ui_ptbr.py            # OK
./scripts/test_contract_drift.sh                    # 174 campos
npx tsc --noEmit                                    # 0 errors
npx jest --silent                                   # >= 1932 + novos
./scripts/smoke.sh                                  # OK final
```

Baseline atual: 195 suítes / 1932 testes. Esperado pós-sprint:
>= 199 suítes / >= 1937 testes (5 testes novos mínimo: maxLength,
clamp, writer-atomic, limparOrfaos, pickClientIdSafe).

## 6. Commit (um por bug, sequencial)

```
fix: b1 atomic write em file:// via .writing+rename + cleanup orfaos boot
fix: b2 pickclientidsafe wrap defensivo + caller fallback
fix: b3 toast em avatarpicker permissao negada
fix: b4 clamp defensivo no slider range guard
feat: b5 maxlength opcional em input
fix: b6 filtro sync-conflict em todos listadores vault
```

Mensagens sem acento (convenção shell/CI).

## 7. Achados colaterais

Reportar ao maestro (não implementar) qualquer:
- Outro picker silenciando permissão negada
- Caller de `pickClientId` que não estava mapeado
- Listador de vault esquecido fora dos 16 listados
- Teste existente que quebra após o fix (causa raiz?)

## 8. Proof-of-work esperado

Ao concluir, executor reporta:
1. Lista de arquivos criados/modificados (max ~25).
2. Saída literal de `npx jest --silent` com contagem final.
3. Saída literal de `./scripts/smoke.sh`.
4. Hash dos 6 commits.
5. Mapa de callers de `pickClientId` antes/depois.
6. Lista de listadores tocados em B6.

## 9. Decisões tomadas

- **B1 só na branch file://**: SAF não suporta rename atômico.
  Aceitar limitação SAF para vaults externos (Syncthing pastas
  customizadas). Default `documentDirectory` cobre 99% dos casos
  reais pós-V4.0.2.
- **B2 cria função nova em vez de mudar `pickClientId`**: preserva
  callers que querem throw (testes, boot estrito).
- **B6 centraliza em util novo** em vez de modificar
  `listVaultFolder`: mantém low-level sem opinião.
- **B7 descopado**: read-then-write race exige lock-file ou
  deviceId desde o início. Vira `AUDIT-T2-LOCK-VAULT-spec.md`
  após esta.
- **`maxLength` defaults em callers fica para follow-up**: B5
  expõe a prop; ajustar formulários vira sprint cosmética.
