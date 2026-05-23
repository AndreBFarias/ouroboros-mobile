# R-INT-3-HC-PASSOS-CONFLITO-PESSOA_B — Sufixo `-pessoa_<x>` no path canônico de passos

**Tipo:** fix (path canônico — prevenção de sync-conflict)
**Prioridade:** P1 (bloqueia release com 2 celulares syncando via Syncthing)
**Estimativa:** 45min
**Tranche:** R-INT (integrações Health Connect)
**Fase:** pós-validação PASSOS

## Contexto

Edge case detectado após merge de `R-INT-3-HC-AUTOPULL-PASSOS`. Quando 2
celulares (pessoa_a + pessoa_b) sincronizam o mesmo Vault via Syncthing,
ambos os dispositivos disparam `puxadorPassos` no mesmo dia local e
chamam `escreverPassos(vaultRoot, data, total, autor, ...)`. O writer
delega para `passosPath(date)` em `src/lib/vault/paths.ts:133` que
gera `markdown/passos-YYYY-MM-DD.md` **sem incluir a pessoa**.

Resultado: dois devices escrevem no mesmo path com totais diferentes
(cada wearable conta passos do próprio dono). Syncthing detecta o
conflito e gera arquivos `.sync-conflict-<timestamp>-<deviceId>.md`,
poluindo o Vault e perdendo o agregado de uma das pessoas.

A armadilha `A5` do `VALIDATOR_BRIEF.md` §4 (linhas 501-502) já
prescreve o padrão canônico para esse cenário: **sufixo
`-pessoa_a` / `-pessoa_b` no filename** quando o registro é
escrito por uma pessoa específica. O helper `humorPath` já segue
essa convenção implicitamente (humor diário é por pessoa via
listagem); passos precisa do mesmo tratamento explícito no path.

## Dependências

- **Bloqueia:** release com 2 celulares ativos (cenário família
  `vaultCompartilhado=true`).
- **Bloqueado por:** nada. `R-INT-3-HC-AUTOPULL-PASSOS` já está
  mergeada em `main` (HEAD `86df505`).

## Escopo (touches autorizados)

### Arquivos a modificar

1. **`src/lib/vault/paths.ts`** (modificar):
   - Função `passosPath(date: Date)` em linhas 131-135.
   - Nova assinatura: `passosPath(date: Date, pessoa: PessoaAutor): string`.
   - Importar `PessoaAutor` de `@/lib/schemas/pessoa` no topo do
     arquivo (ainda não importado lá; conferir via leitura antes
     de adicionar).
   - Retorno: `` `markdown/passos-${formatDateYmd(date)}-${pessoa}.md` ``.
   - Atualizar comentário acima da função: substituir
     "markdown/passos-YYYY-MM-DD.md" por
     "markdown/passos-YYYY-MM-DD-<pessoa>.md" e mencionar
     "Armadilha A5: sufixo de pessoa evita sync-conflict Syncthing
     entre 2 celulares no mesmo dia".

2. **`src/lib/vault/passos.ts`** (modificar):
   - Linha 66: `const rel = passosPath(dataDate);` vira
     `const rel = passosPath(dataDate, parsed.data.autor);`.
   - `parsed.data.autor` já é `PessoaAutor` validado pelo
     `PassosSchema` (linha 57). Não precisa import novo.
   - Atualizar comentário no topo do arquivo (linhas 1-3):
     substituir referência ao path antigo
     "markdown/passos-YYYY-MM-DD.md" por
     "markdown/passos-YYYY-MM-DD-<pessoa>.md" e citar A5.

### Arquivos a NÃO tocar (OFF-LIMITS)

- **`src/lib/health/puxadores/passos.ts`** — o puxador já passa
  `autor` para `escreverPassos` (linha 164). Nenhuma mudança
  necessária aqui. Confirmado via leitura.
- **`src/lib/schemas/passos.ts`** — schema não muda; `autor`
  continua obrigatório no meta.
- **Lógica de agregação por dia** — escopo é apenas path.
  Agregado continua somando `count` por `endTime` em dia local.
- **Helpers legados** (`dailyPath`, `eventosPath`, etc.) — fora
  de escopo.
- **`humorPath`** — não modificar nesta sprint. Humor segue
  convenção própria (sufixo aplicado em runtime via writer
  específico; ver `daily/YYYY-MM-DD-pessoa_a.md` mencionado em
  `src/lib/vault/humor.ts:3-4`). Migração de `humorPath` para o
  mesmo padrão fica para sprint dedicada se necessário.

## Acceptance criteria

1. `passosPath(date, 'pessoa_a')` retorna
   `markdown/passos-2026-05-22-pessoa_a.md` para `date =
   new Date('2026-05-22T12:00:00Z')`.
2. `passosPath(date, 'pessoa_b')` retorna
   `markdown/passos-2026-05-22-pessoa_b.md` para mesmo `date`.
3. `escreverPassos(root, '2026-05-22', 5000, 'pessoa_a', ...)`
   escreve em `markdown/passos-2026-05-22-pessoa_a.md`.
4. `escreverPassos(root, '2026-05-22', 7000, 'pessoa_b', ...)`
   escreve em `markdown/passos-2026-05-22-pessoa_b.md` — path
   distinto, **zero colisão Syncthing**.
5. Tipo TypeScript de `passosPath` exige 2 args; chamadas com 1
   só param falham na compilação (verificar via `tsc --noEmit`).
6. Smoke verde (`./scripts/smoke.sh`).
7. `rg "markdown/passos-\\\$\\{formatDateYmd" src/lib/vault/paths.ts`
   retorna apenas a nova linha com `-${pessoa}` no final.

## Invariantes a preservar

- **Convenção layout-por-tipo (ADR-0023):** filename mantém
  prefixo `passos-` + data; pessoa é sufixo após data, antes de
  `.md`. Ordem consistente com convenção PT-BR (mais específico
  no fim).
- **Anonimato (Regra −1):** apenas identificadores genéricos
  `pessoa_a` / `pessoa_b`. Nomes reais nunca entram no path.
- **PT-BR completo em comentários** atualizados (`não`, `função`,
  `pessoa`, `sincronização`, `armadilha`).
- **Armadilha A5 do BRIEF** (`VALIDATOR_BRIEF.md:501-502`): este
  fix é exatamente a aplicação prescrita.
- **Idempotência do writer:** chamada repetida no mesmo dia +
  mesma pessoa continua regravando o mesmo arquivo (comportamento
  pré-existente, não alterado).
- **Comentários sem acento em `paths.ts`** — convenção shell/CI
  do projeto (linha 20 do arquivo declara isso). Manter padrão
  ao atualizar o comentário da função.

## Plano de implementação

1. Ler `src/lib/vault/paths.ts` integralmente para confirmar que
   `PessoaAutor` ainda não está importado lá (atualmente o
   arquivo tipa `pessoa` inline em `avatarPath` e
   `agendaEventoPath` como `'pessoa_a' | 'pessoa_b'` — pode-se
   manter esse padrão inline para consistência local, ou
   introduzir o import de `PessoaAutor`. **Decisão preferida:**
   inline `'pessoa_a' | 'pessoa_b'` em `passosPath` para igualar
   o padrão local existente em `paths.ts`. Caller continua usando
   o type `PessoaAutor` no `passos.ts`, que é estruturalmente
   compatível).
2. Modificar `passosPath` em `paths.ts`:
   - Linha 131-135: substituir 5 linhas por nova versão com
     parâmetro `pessoa` inline tipado.
3. Modificar `passos.ts`:
   - Linha 66: `passosPath(dataDate, parsed.data.autor)`.
   - Linhas 1-3: comentário com path atualizado + citação A5.
4. Atualizar `tests/lib/vault/passos.test.ts`:
   - 1º teste (linhas 20-31): asserção de path muda para
     `markdown/passos-2026-05-21-pessoa_a.md`.
   - 2º teste (linhas 33-52): asserção em `uri` muda para o
     mesmo path com sufixo.
   - 4º teste (linhas 65-76): asserção que `pessoa_b` gera path
     `markdown/passos-2026-05-21-pessoa_b.md` (adicionar
     `expect(out.rel).toBe(...)` após o `await`).
   - **Novo teste (8º cenário):** "pessoa_a e pessoa_b no mesmo
     dia geram paths distintos" — chamar `escreverPassos` 2x
     com mesma `data='2026-05-22'`, autores diferentes, validar
     que `mockWriteVaultFile` recebeu 2 URIs distintas com
     sufixos `-pessoa_a` e `-pessoa_b`.
5. Atualizar `tests/lib/health/puxadores/passos.test.ts`:
   - **Novo cenário 10:** "2 pessoas mesmo dia em devices distintos"
     — montar 2 mocks `useSettings` (1 com `pessoa_a`, outro com
     `pessoa_b`), rodar puxador 2x (resetar mock entre chamadas),
     validar que `mockEscreverPassos.mock.calls` mostra `autor`
     diferente em cada chamada. (Path não é asseratível
     diretamente aqui porque `escreverPassos` é mockado; o teste
     real de path está em `tests/lib/vault/passos.test.ts`. O
     teste aqui valida apenas que o autor correto é propagado).
   - **Alternativa simpler:** se o teste de propagação de autor
     já existe (cenário 7, linhas 203-231 já cobre `pessoa_b`),
     adicionar apenas asserção extra confirmando que o sufixo
     muda. Como `escreverPassos` é mockado, executor pode
     **omitir esse novo cenário no arquivo `puxadores/passos.test.ts`**
     se julgar redundante — cenário 7 já passa `autor` correto.
     **Decisão:** executor avalia. Mínimo obrigatório é o novo
     teste no `tests/lib/vault/passos.test.ts` (passo 4 acima).
6. Rodar `npx jest tests/lib/vault/passos.test.ts
   tests/lib/health/puxadores/passos.test.ts` → verde.
7. Rodar `npx tsc --noEmit` → verde (sem erros em chamadas a
   `passosPath`).
8. Rodar `./scripts/smoke.sh` → verde.
9. Atualizar `docs/FEATURES-CANONICAS.md` se a feature "passos
   diários" estiver listada lá com path antigo. Buscar via `rg
   "passos-YYYY-MM-DD" docs/FEATURES-CANONICAS.md` antes.
10. Commit `fix: sufixo pessoa no path canonico de passos (A5
    syncthing)` impessoal.

## Aritmética

- `src/lib/vault/paths.ts`: +0L a -2L (substituição inline de
  ~3L por ~3L; comentário pode crescer ~2L para citar A5).
  Líquido: ~+2L.
- `src/lib/vault/passos.ts`: +0L (substituição de 1 argumento na
  chamada; comentário do topo ganha 1-2L para citar A5). Líquido:
  ~+1L.
- `tests/lib/vault/passos.test.ts`: +25L (1 novo teste com 2
  asserções + ajustes em 3 testes existentes).
- `tests/lib/health/puxadores/passos.test.ts`: +0 a +25L
  (cenário 10 opcional).
- **Total esperado:** +30 a +55L distribuídos em 4 arquivos.
  Bem dentro do que o usuário descreveu ("~15L em 2 arquivos +
  2 testes novos" — leve excesso por causa de comentários e
  ajustes em testes existentes; ainda cirúrgico).

## Testes

### Testes a modificar

- `tests/lib/vault/passos.test.ts`:
  - Teste "escreve no path canonico..." (linha 20): asserção do
    path muda.
  - Teste "passa meta validado..." (linha 33): asserção do `uri`
    muda.
  - Teste "aceita pessoa_b como autor" (linha 65): adicionar
    asserção do path.

### Testes a adicionar

- `tests/lib/vault/passos.test.ts`:
  - **Novo:** "pessoa_a e pessoa_b no mesmo dia geram paths
    distintos (A5 Syncthing)". 2 chamadas a `escreverPassos`,
    mesmo `data='2026-05-22'`, autores `pessoa_a` e `pessoa_b`,
    assert que `mockWriteVaultFile` foi chamado com 2 URIs
    diferentes, sufixos `-pessoa_a.md` e `-pessoa_b.md`.

### Baseline

- FAIL_BEFORE = 0 (suite passos.test.ts atualmente 7/7 verde,
  puxadores/passos.test.ts 11/11 verde).
- FAIL_AFTER esperado = 0. Tests existentes adaptados + 1 novo
  adicionado (em vault/passos.test.ts).

## Proof-of-work esperado

1. **Diff final** mostrando 2-4 arquivos modificados.
2. **Runtime real:**
   ```bash
   npx jest tests/lib/vault/passos.test.ts \
     tests/lib/health/puxadores/passos.test.ts \
     tests/lib/vault/paths.test.ts
   npx tsc --noEmit
   ./scripts/smoke.sh
   ```
   Todas verdes.
3. **Acentuação periférica:**
   ```bash
   python3 scripts/check_strings_ui_ptbr.py
   python3 ~/.config/zsh/scripts/validar-acentuacao.py --paths \
     docs/sprints/R-INT-3-HC-PASSOS-CONFLITO-PESSOA_B-spec.md
   ```
   Exit 0 nos 2 scripts.
4. **Hipótese verificada (lição 4):**
   ```bash
   rg "passosPath\(" src/ tests/
   ```
   Deve mostrar apenas chamadas com 2 argumentos (date + pessoa).
   Nenhuma chamada com 1 argumento residual.
5. **Verificação canônica do path novo:**
   ```bash
   rg "markdown/passos-" src/ tests/
   ```
   Deve mostrar paths sempre com sufixo de pessoa, exceto em
   strings de comentário/doc que mencionem o template
   `<pessoa>` literal.

## Riscos e não-objetivos

### Riscos

- **Risco baixo:** chamadas externas a `passosPath`. Confirmado
  via `rg "passosPath" src/ tests/`: apenas 3 ocorrências (1
  declaração em `paths.ts`, 1 import em `passos.ts`, 1 chamada
  em `passos.ts`). Zero callers fora desses.
- **Risco baixo:** retrocompatibilidade com arquivos antigos
  já no Vault (formato sem sufixo). **Fora de escopo desta
  sprint** — usuários atuais (1 device) têm arquivos
  `passos-YYYY-MM-DD.md` no Vault sem sufixo. Esses arquivos
  continuam legíveis (não há migration nesta sprint). Se uma
  feature de leitura/recap começar a listar passos via prefixo
  `passos-`, ambos os formatos (com e sem sufixo) serão
  capturados — comportamento aceitável durante transição.
  Sprint dedicada de migração fica registrada como
  **achado colateral** se necessário.

### Não-objetivos

- Migrar arquivos antigos (`passos-YYYY-MM-DD.md` sem sufixo)
  para o novo formato. Não nesta sprint.
- Aplicar o mesmo padrão A5 a `humorPath`, `medidasPath`,
  `cicloPath`. Se necessário, sprints dedicadas.
- Adicionar listagem por pessoa (`listarPassos(pessoa)`). Fora
  de escopo.
- Alterar contrato `Puxador` ou `autopullScheduler`.

## Referências

- BRIEF: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md` §4 A5 (linhas 501-502).
- Sprint precedente: `docs/sprints/R-INT-3-HC-AUTOPULL-PASSOS-spec.md`
  (introduziu `passosPath` sem sufixo).
- Arquivo canônico (sem sufixo, padrão semelhante): `src/lib/vault/humor.ts:3-4`
  cita explicitamente "daily/YYYY-MM-DD-pessoa_a.md" como variante
  A5 — confirma que o padrão é convenção do projeto.
- ADR-0023 (layout-por-tipo): `docs/ADRs/`.
- Schema `PassosSchema` com `autor: PessoaAutor`:
  `src/lib/schemas/passos.ts`.

---

**Achado colateral previsto:** se executor identificar callers
externos de `passosPath` (vindos de futuras features de recap ou
listagem) durante a implementação, **registrar como sprint
derivada** via `Task(subagent_type: planejador-sprint)` sem
desviar do escopo desta. Por hora, `rg` confirma 0 callers
externos.
