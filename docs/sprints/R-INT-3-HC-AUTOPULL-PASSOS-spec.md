# R-INT-3-HC-AUTOPULL-PASSOS — Puxador `Steps` do HC para o Vault

**Tipo:** feature (puxador concreto + writer canônico + schema)
**Prioridade:** P1 (mais útil — usuário tem pedômetro 24/7)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** R-INT-3-HC-BRIDGE-NATIVA-B (`readRecords`) + R-INT-3-HC-AUTOPULL-SCHEDULER (`Puxador` contract)

## Contexto

`StepsRecord` do Health Connect entrega `startTime`, `endTime`, `count`, com dezenas/centenas de records por dia (cada wearable agrega janelas diferentes). O autopull soma o `count` por dia local (timezone do device) e materializa **um arquivo MD por dia fechado** no Vault: `markdown/passos-YYYY-MM-DD.md`.

Esta sprint entrega o **puxador concreto** que implementa o contrato `Puxador` definido em `src/lib/health/autopullScheduler.ts` (linhas 40-46), o **writer canônico** (`escreverPassos`), e o **schema Zod** (`PassosSchema`). O scheduler já está pronto e injeta puxadores em sprint dedicada de wiring (`R-INT-3-HC-AUTOPULL-WIRING`, fora desta sprint).

## Decisões registradas (ambiguidades resolvidas pelo dono)

1. **Atribuição de pessoa:** usa `useSettings.getState().pessoa.ativa` (campo canônico já existente, type `PessoaAutor = 'pessoa_a' | 'pessoa_b'`, default `'pessoa_a'`, ver `src/lib/stores/settings.ts:40,161`). **NÃO criar campo novo** `dispositivoPessoa` — o campo `pessoa.ativa` cobre exatamente esse caso (default pessoa_a do device).

2. **Idempotência sobrescrever-D-1:** apenas dias **completos** (`endTime < startOfTodayLocal`) viram MD. Dia em curso é ignorado. Dias já escritos podem ser **reescritos** em rodadas subsequentes (HC pode receber record retroativo do wearable). Sub-implicação: na primeira sync (`since=null`, scheduler converte em 7d atrás), o puxador escreve **6 MDs** (D-1 até D-6); o dia D fica para o próximo autopull (após meia-noite).

## Objetivo

Exportar `puxadorPassos: Puxador` (instância pronta, **não função solta**) cumprindo o contrato:

```ts
// Contrato canônico (não inventar, copiado de autopullScheduler.ts:40-46):
export interface Puxador<T = unknown> {
  tipo: TipoHC;
  puxar(opts: {
    since: string | null;
    pageSize: number;
  }): Promise<{ novos: number; erro: string | null }>;
}
```

Implementação:

```ts
// src/lib/health/puxadores/passos.ts
export const puxadorPassos: Puxador = {
  tipo: 'Steps',
  async puxar({ since, pageSize }) {
    // 1. Resolve janela: startTime = since ?? (now - 7d); endTime = now.
    // 2. readRecords('Steps', { timeRangeFilter: { operator: 'between',
    //    startTime, endTime } }).
    // 3. Agrupa records por dia local do device (Intl, timezone resolvido).
    // 4. Soma `count` por dia (`total_passos`).
    // 5. Filtra dias cujo limite endTime < startOfTodayLocal (dia em curso descartado).
    // 6. Lê pessoa = useSettings.getState().pessoa.ativa.
    // 7. Para cada dia filtrado, chama escreverPassos(data, total, pessoa).
    // 8. Retorna { novos: <dias gravados>, erro: null }.
    // Em erro de readRecords ou escrita: { novos: 0, erro: <msg> }.
  }
};
```

## Path canônico do Vault (ADR-0023, layout-por-tipo)

`markdown/passos-YYYY-MM-DD.md`

Convenção idêntica a `medidasPath`, `cicloPath`, `humorPath` (ver `src/lib/vault/paths.ts:127`). Helper novo `passosPath(date: Date)` adicionado em `src/lib/vault/paths.ts` (1 função de 3 linhas). **NÃO** colocar em raiz nem em pasta `passos/`. Tudo .md vive em `markdown/`.

## Schema (frontmatter MD)

`src/lib/schemas/passos.ts` (novo):

```ts
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

const DataYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD');

export const PassosSchema = z.object({
  tipo: z.literal('passos'),
  data: DataYmd,
  pessoa: PessoaAutorSchema,           // pessoa_a | pessoa_b
  total_passos: z.number().int().nonnegative(),
  fonte: z.literal('hc'),
  sincronizado_em: z.string(),          // ISO 8601
});
export type Passos = z.infer<typeof PassosSchema>;
```

Frontmatter exemplo:

```yaml
tipo: passos
data: 2026-05-21
pessoa: pessoa_a
total_passos: 8472
fonte: hc
sincronizado_em: 2026-05-22T20:30:00-03:00
```

## Timezone via Intl (corrige hardcode UTC-3)

Para agrupar records por dia local **do device** (não do projeto), usar `Intl.DateTimeFormat`:

```ts
function dataLocalYmd(date: Date, tz: string): string {
  // Formato YYYY-MM-DD em qualquer timezone IANA. 'en-CA' produz
  // canonicamente YYYY-MM-DD (ISO).
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const startOfTodayLocal = /* primeiro instante de hoje em deviceTz */;
```

`startOfTodayLocal` é calculado projetando `now` para YYYY-MM-DD no `deviceTz`, depois convertendo `YYYY-MM-DDT00:00:00` daquele dia em ISO local. O comparador final é `record.endTime < startOfTodayLocal` em comparação de strings ISO ou epoch ms.

**NÃO hardcode** `-180`, `TZ_OFFSET_MIN`, `UTC-3`. O `paths.formatDateYmd` existente (que usa UTC-3 fixo) **não** é usado neste puxador — usuário pode viajar / usar timezone diferente.

## Writer canônico

`src/lib/vault/passos.ts` (novo):

```ts
export async function escreverPassos(
  vaultRoot: string,
  data: string,                  // YYYY-MM-DD
  totalPassos: number,
  pessoa: PessoaAutor
): Promise<{ uri: string; rel: string }>;

export async function listarPassos(
  vaultRoot: string,
  filtros?: { periodo?: '7d' | '30d' | 'tudo'; hoje?: Date }
): Promise<Passos[]>;
```

Padrão idêntico a `src/lib/vault/medidas.ts:escreverMedida` (usa `writeVaultFile` + `vaultUriJoin` + `passosPath`). Sobrescreve incondicionalmente (decisão idempotência D-1).

## Escopo

### A. Investigação obrigatória (antes de codar)

```bash
# Confirma readRecords disponível na bridge:
grep -n "readRecords" modules/health-connect/src/index.ts                # ≥ 1 ocorrência
# Confirma contrato Puxador (linhas 40-46):
sed -n '40,46p' src/lib/health/autopullScheduler.ts
# Confirma pessoa.ativa em settings (linha 40,161):
grep -n "pessoa.*ativa\|PessoaAutor" src/lib/stores/settings.ts          # ≥ 2
# Confirma arquivos novos não existem ainda:
ls src/lib/schemas/passos.ts src/lib/vault/passos.ts src/lib/health/puxadores/passos.ts 2>&1
# (esperado: 3x "No such file or directory")
# Confirma pasta puxadores/ não existe:
ls -d src/lib/health/puxadores 2>&1                                       # esperado: "No such file or directory"
```

### B. Implementação (6 arquivos novos + 1 modificado)

1. `src/lib/schemas/passos.ts` (**novo**) — `PassosSchema` + tipo `Passos`.
2. `src/lib/vault/paths.ts` (**modificar +3L**) — adicionar `export function passosPath(date: Date): string` retornando `markdown/passos-${formatDateYmd(date)}.md`. **Esta é a única modificação fora de arquivo novo.** Função de 3 linhas no padrão de `medidasPath`.
3. `src/lib/vault/passos.ts` (**novo**) — `escreverPassos`, `listarPassos`.
4. `src/lib/health/puxadores/passos.ts` (**novo**, em pasta nova) — `puxadorPassos: Puxador`. Implementa `puxar({since, pageSize})`. Lê pessoa via `useSettings.getState().pessoa.ativa`. Usa Intl para timezone.
5. `tests/lib/schemas/passos.test.ts` (**novo**) — parse válido/inválido, fonte fixa em `'hc'`, total_passos negativo rejeitado.
6. `tests/lib/vault/passos.test.ts` (**novo**) — `escreverPassos` + reler com `readVaultFile(PassosSchema)` round-trip; `listarPassos` filtros 7d/30d/tudo; idempotência sobrescrever.
7. `tests/lib/health/puxadores/passos.test.ts` (**novo**) — 5+ cenários:
   - (a) `readRecords` retorna `[]` → `{ novos: 0, erro: null }`.
   - (b) 3 dias completos com múltiplos records → 3 MDs gravados, soma correta.
   - (c) Records do dia em curso pulados (filtro `endTime < startOfTodayLocal`).
   - (d) Primeira sync (`since=null`) com 7d de records: 6 MDs gravados (D-1..D-6), dia D pulado.
   - (e) Segunda chamada com mesmos records: sobrescreve sem duplicar (idempotência D-1).
   - (f) `readRecords` lança → `{ novos: 0, erro: <string> }`.
   - (g) `pessoa.ativa = 'pessoa_b'` → frontmatter sai com `pessoa: pessoa_b`.

### C. Aritmética prometida

- **Arquivos novos:** 6 (1 schema + 1 path-helper-add + 1 writer + 1 puxador + 3 testes — Total **6 novos arquivos**, contando `paths.ts` como modificado).
- **Arquivos modificados:** 1 (`src/lib/vault/paths.ts`, +3 linhas).
- **Linhas estimadas por arquivo:**
  - `schemas/passos.ts`: ~25L
  - `vault/passos.ts`: ~80L (writer + listar)
  - `health/puxadores/passos.ts`: ~120L (agrupamento + filtro + Intl + loop write)
  - 3 testes: ~80L cada = 240L total
  - `paths.ts` patch: +3L
- **Total novo:** ~465L. Nada acima de 300L num único arquivo.

## OFF-LIMITS (NÃO TOCAR nesta sprint)

- `src/lib/health/autopullScheduler.ts` — orquestrador já entregue, contrato congelado.
- `app/_layout.tsx` — wiring do scheduler é sprint dedicada (`R-INT-3-HC-AUTOPULL-WIRING`).
- Outros puxadores (`src/lib/health/puxadores/exercicio.ts`, `medidas.ts`, etc.) — sprints irmãs.
- `src/lib/stores/settings.ts` — campo `pessoa.ativa` já existe; **não criar `dispositivoPessoa`**.
- `MainActivity.kt`, manifest, ProGuard — bridge nativa congelada.
- `CLAUDE.md`, `ROADMAP.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md`.
- `docs/FEATURES-CANONICAS.md` — atualização agregada na sprint final da Onda 3 (multi-puxador).

## Invariantes a preservar

- **ADR-0023** layout-por-tipo: `markdown/passos-YYYY-MM-DD.md`, **não** `passos/YYYY-MM-DD.md`.
- **Regra Identidade de Pessoas:** sempre `pessoa_a` / `pessoa_b` no frontmatter; nomes reais nunca aparecem no MD.
- **Regra Anonimato Absoluto** (Regra −1): nenhum nome de IA, autor, criador em código novo.
- **Regra de Linguagem:** comentários sem acento (`// Le records ...`), strings UI com acento completo (não aplicável aqui — sem UI).
- **Acentuação PT-BR** em headings/prosa do spec e em mensagens de erro retornadas via `erro: string`.
- **Contrato `Puxador`** congelado em `autopullScheduler.ts:40-46`. **Copiar exatamente**.

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest tests/lib/health/puxadores/passos --silent 2>&1 | grep "Test Suites:" | tail -1; done
# Esperado: 3x "Test Suites: 1 passed" estável.
```

## Proof-of-work

1. Lista de arquivos criados/modificados (output de `git status --short`).
2. `npx jest --silent | tail -5` — baseline anterior + 3 suites novas verdes.
3. `git log -1 --format=%H` + grep `Puxador.*Steps` no diff.
4. **Live (Nível C, sob aprovação do dono):** caminhar 100+ passos com celular, ativar `puxadorPassos.puxar({since: null, pageSize: 1000})` via console dev-client, abrir Vault e confirmar `markdown/passos-YYYY-MM-DD.md` com `total_passos` ≥ 100.

## Não-objetivos (achados colaterais futuros)

- Wiring no `_layout.tsx` (`R-INT-3-HC-AUTOPULL-WIRING`).
- UI de status "Última sync HC" em `/settings/integracoes` (`R-INT-3-HC-SETTINGS-STATUS`).
- Card "Passos 7d" em `app/evolucao.tsx` (Q17.d já tem `CardHCResumo` — se precisar extender, sprint dedicada).
- Backfill histórico além de 7d (sprint dedicada se demandado).

## Referências

- Contrato `Puxador`: `src/lib/health/autopullScheduler.ts:40-46`.
- `TipoHC = 'Steps' | ...`: `src/lib/health/tipos.ts`.
- `readRecords('Steps', ...)`: `modules/health-connect/src/index.ts:239`.
- Pattern writer + schema: `src/lib/schemas/medidas.ts`, `src/lib/vault/medidas.ts`.
- Path helper canônico: `src/lib/vault/paths.ts:127` (`medidasPath`).
- ADR-0023 layout-por-tipo: `docs/ADRs/ADR-0023-vault-layout-por-tipo.md`.
- AndroidX Steps API: https://developer.android.com/reference/androidx/health/connect/client/records/StepsRecord
