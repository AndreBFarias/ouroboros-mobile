# Sprint M06 — Diário Emocional (Tela 18)

```
DEPENDE:    M02 fechada (Vault Bridge funcionando, schemas e writer/reader)
            + M03 fechada (identidade dinâmica)
            + M04 fechada (FAB Radial roteia para /diario-emocional?modo=...)
BLOQUEIA:   M06.5 (F-14 Microfone integra inline a esta tela)
            + M07.x (mídia obrigatória usa o mesmo schema diario_emocional)
            + M11.5 (Calendário consome conquistas geradas aqui)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Implementar a Tela 18 do BRIEFING (§6, Seção B): **diário emocional
com contexto rico**. Bottom sheet 90% com toggle inicial trigger ↔
vitória que muda a borda esquerda do form (red 2px / green 2px). Grid
3x2 de chips de emoção multi-select (negativos quando trigger; positivos
quando vitória). Slider de intensidade 1-5. Textarea livre obrigatória.
ChipGroup multi "com quem" (autores + amigos/sozinho). Bloco condicional
em modo trigger: textarea estratégia + toggle "Funcionou?". Botão final
pink (trigger) ou green (vitória). Microcopy de rodapé:
`"Salvo localmente. Ninguém vê além de vocês dois."`. Persiste em
`inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md` via `vault/writer.ts`.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/diario-emocional.tsx`
  — substitui o stub criado na M04. Lê o param `modo` via
  `useLocalSearchParams<{ modo?: 'trigger' | 'vitoria' | 'audio' }>()`
  e ajusta o estado inicial. Quando `modo === 'audio'` (entrada pela
  ação Voz), inicializa em `vitoria` por default e marca flag interna
  `audioRequested` para a M06.5 acoplar (M06 só registra a flag; o
  bloco de gravação chega na M06.5). Renderiza um `<BottomSheet>` em
  snap 90%. Estado controlado:
  - `modo: 'trigger' | 'vitoria'`
  - `emocoes: string[]` (multi-select, slugs)
  - `intensidade: 1..5` (default 3)
  - `texto: string` (obrigatório, mínimo 1 caractere)
  - `com: PessoaId[]`
  - `estrategia?: string` (só visível em modo trigger)
  - `funcionou?: boolean` (só visível em modo trigger)
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/diario/EmocaoChips.tsx`
  — wrapper sobre `<ChipGroup mode="multi">` que recebe prop
  `modo: 'trigger' | 'vitoria'` e devolve a lista correspondente.
  Animação spring no troca de modo (`MotiView` com `from`/`animate`
  em `opacity` + `springs.subtle` por causa do hop visual).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/diario/emocoes.ts`
  — duas constantes: `EMOCOES_NEGATIVAS = ['tristeza','raiva','ansiedade','frustracao','medo','solidao']`
  e `EMOCOES_POSITIVAS = ['alegria','alivio','gratidao','conexao','paz','orgulho']`.
  Cada item em snake_case sem acento. Helper `formatEmocao(slug)`
  converte para Sentence case com acento (ex.
  `'frustracao' -> 'Frustração'`, `'alivio' -> 'Alívio'`,
  `'gratidao' -> 'Gratidão'`, `'solidao' -> 'Solidão'`,
  `'conexao' -> 'Conexão'`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/diario/saveDiario.ts`
  — função pura `saveDiario(meta: DiarioEmocionalMeta, body: string,
  vaultRoot: string): Promise<{ uri: string }>`. Resolve path via
  `diarioEmocionalPath(date, slug)` (slug derivado da primeira emoção
  ou de `'registro'` se vazio). Chama `writeVaultFile<DiarioEmocionalMeta>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/diario-emocional.test.tsx`
  — render do sheet, troca de modo muda o set de chips e a borda
  esquerda, validação trava save se `texto` vazio.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/diario/saveDiario.test.ts`
  — caminho feliz, payload com `funcionou` em modo `vitoria` é
  rejeitado pelo schema (já contemplado em
  `DiarioEmocionalSchema.refine`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/diario/emocoes.test.ts`
  — `formatEmocao` cobre 4 casos com acento (frustracao, alivio,
  gratidao, conexao) e mantém slugs sem acento intactos.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/CHANGELOG.md`
  — entrada `[Unreleased]` com nota "Sprint M06 - tela 18 diario
  emocional com modo trigger e vitoria persistido em inbox/mente/diario.".

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/BottomSheet.tsx`
  — `snapPoints={['90%']}` com `enablePanDownToClose`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Toggle.tsx`
  — toggle inicial trigger ↔ vitória, e toggle "Funcionou?" no bloco
  condicional.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Chip.tsx`
  — `<ChipGroup mode="multi">` para emoções e "com quem".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Slider.tsx`
  — slider intensidade 1-5.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Textarea.tsx`
  — textareas livre e estratégia.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Button.tsx`
  — variant `destructive` (red, modo trigger) ou `success` (green,
  modo vitória) para o botão final.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Toast.tsx`
  — toasts:
  - sucesso trigger: `"Registrado."` (sem haptic, momento delicado).
  - sucesso vitoria: `"Anotado."` + `haptics.success()` leve.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/diario_emocional.ts`
  — `DiarioEmocionalSchema` e `DiarioEmocionalMeta`. Já contém o
  refinement que bloqueia `funcionou` em modo `vitoria`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `diarioEmocionalPath(date, slug)`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/writer.ts`
  — `writeVaultFile<DiarioEmocionalMeta>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa.getState().pessoaAtiva` define `autor`. `nomeDe()`
  para renderizar chips de "com quem".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/vault.ts`
  — `useVault.getState().vaultRoot`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/motion.ts`
  — `springs.subtle` para troca da borda esquerda; `springs.default`
  para o sheet.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — `haptics.success()` leve **somente** quando modo === `vitoria`.
  Em modo `trigger` o save é silencioso (BRIEFING §2.5).

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013). Ex: `"Diário emocional"`, `"O que aconteceu?"`,
  `"Estratégia que tentou"`, `"Funcionou?"`, `"Com quem"`,
  `"Intensidade"`, `"Registrar"`, `"Anotar"`,
  `"Salvo localmente. Ninguém vê além de vocês dois."`.
- `accessibilityLabel` sem acento (ex: `'toggle modo trigger'`,
  `'chip emocao tristeza'`).
- Comentários em código sem acento.
- Mensagens de commit sem acento.
- TypeScript strict.
- Imports via alias `@/*`.
- **Não tocar** em `src/components/ui/*` (M01).
- **Não tocar** em `src/lib/schemas/diario_emocional.ts` — schema já
  está fechado e validado em M02. Se faltar campo, reportar como
  achado.
- Em modo trigger: **sem haptic no salvar** (BRIEFING §2.5,
  "momento delicado"). Em modo vitoria: `haptics.success()` leve.
- Texto do **rodapé** `"Salvo localmente. Ninguém vê além de vocês
  dois."` é micro caption muted, NÃO toast.

## 5. Procedimento sugerido

1. Criar `src/lib/diario/emocoes.ts` com as duas constantes e
   `formatEmocao`.
2. Criar `src/lib/diario/saveDiario.ts`:
   - slug derivado: pega primeira emoção do array (ou `'registro'`).
   - `uri = ${vaultRoot}/${diarioEmocionalPath(date, slug)}`.
   - body do `.md` recebe `texto` formatado em duas linhas se houver
     `estrategia` (corpo Markdown solto; frontmatter já guarda os
     campos estruturados).
   - `writeVaultFile<DiarioEmocionalMeta>(uri, meta, body)`.
3. Criar `src/components/diario/EmocaoChips.tsx`:
   - prop `modo: 'trigger' | 'vitoria'`.
   - lista vinda de `EMOCOES_NEGATIVAS`/`EMOCOES_POSITIVAS`.
   - exibe via `formatEmocao` mas guarda slug no estado.
4. Implementar `app/diario-emocional.tsx`:
   - `useLocalSearchParams` lê `modo` (default `'vitoria'`).
   - `<BottomSheet snapPoints={['90%']}>` aberto on-mount.
   - Header com `<Toggle label="Modo" value={modo === 'vitoria'}
     onChange>`. Renomear visualmente para chip-toggle se ergonômico
     melhor (decisão dentro do executor).
   - View com `borderLeftWidth: 2`, `borderLeftColor: modo ===
     'trigger' ? colors.red : colors.green`, animado via `MotiView`
     `springs.subtle`.
   - `<EmocaoChips modo={modo} />`.
   - `<Slider label="Intensidade" min={1} max={5} step={1} />`.
   - `<Textarea label="O que aconteceu?" autoExpand required />`.
   - `<ChipGroup mode="multi" label="Com quem"
     options={[
       { id: 'pessoa_a', label: nomeDe('pessoa_a') },
       { id: 'pessoa_b', label: nomeDe('pessoa_b') },
       { id: 'amigos', label: 'Amigos' },
       { id: 'sozinho', label: 'Sozinho' },
     ]} />`.
   - Bloco condicional `{modo === 'trigger' && (<>
       <Textarea label="Estratégia que tentou" autoExpand />
       <Toggle label="Funcionou?" />
     </>)}`.
   - Rodapé micro muted: `"Salvo localmente. Ninguém vê além de vocês dois."`.
   - Botão variant `destructive` se trigger, `success` se vitória.
5. `handleSave`:
   - monta `meta: DiarioEmocionalMeta` com:
     - `tipo: 'diario_emocional'`
     - `data: <ISO 8601 com offset -03:00>`
     - `autor: pessoaAtiva`
     - `modo`
     - `emocoes`
     - `intensidade`
     - `com`
     - `texto` (frontmatter copia o texto livre)
     - `estrategia: modo === 'trigger' ? estrategia : undefined`
     - `funcionou: modo === 'trigger' ? funcionou : undefined`
     - `audio: null` (M06.5 substitui).
   - valida `DiarioEmocionalSchema.safeParse(meta)`.
   - chama `saveDiario(meta, body, vaultRoot)`.
   - sucesso vitoria: `haptics.success()` + toast `"Anotado."`.
   - sucesso trigger: **sem haptic** + toast `"Registrado."`.
   - erro: toast `"Falha ao salvar. Verifique a pasta do Vault."`.
6. Escrever testes (3 arquivos novos).
7. Rodar comandos da seção 6.
8. Commit.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m06-export && rm -rf /tmp/m06-export
```

Todos exit 0. Total de testes deve aumentar (esperado: +6 a +9). Após
o save manual via Chrome web em modo trigger e modo vitoria, rodar
`ls ~/Protocolo-Ouroboros/inbox/mente/diario/` e validar que ambos
os arquivos aparecem com nome `YYYY-MM-DD-HHmm-<slug>.md`.

## 7. Commit

```
feat: m06 diario emocional tela 18 com modo trigger e vitoria
```

## 8. Checkpoint visual

Esta sprint **toca UI** (Tela 18 nova). Política de 3 níveis
(`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Capturar 6 screenshots:
  1. Sheet aberto em modo vitoria (chips positivos, borda esquerda
     verde, botão verde).
  2. Sheet aberto em modo trigger (chips negativos, borda esquerda
     vermelha, botão pink/red).
  3. Modo trigger com bloco condicional (textarea estratégia +
     toggle "Funcionou?").
  4. Sheet preenchido completo (modo trigger).
  5. Toast `"Registrado."` após salvar trigger.
  6. Toast `"Anotado."` após salvar vitoria.
- **APIs nativas — Nível B (emulador Android):**
  `./scripts/start-emulator.sh`. Validar que o save em modo trigger
  **não emite haptic** e que o save em modo vitoria emite
  `haptics.success()` leve.
- **Final — Nível C (celular físico):** **só com permissão explícita
  do usuário**. Validar fluxo real ponta-a-ponta + Syncthing carrega
  o `.md` no desktop em `~/Protocolo-Ouroboros/inbox/mente/diario/`.

Salvar capturas em `docs/sprints/M06-screenshots/`. Comparar com
artboard "tela 18 — diario emocional" de
`docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

- A spec assume que o ChipGroup "com quem" oferece 4 opções fixas
  (`pessoa_a`, `pessoa_b`, `amigos`, `sozinho`). BRIEFING §6 (Tela
  18) lista apenas chips genéricos sem detalhar o conjunto.
  Confirmar com humano se a lista pode ser expandida (terapeuta,
  familia) em sprint futura.
- Texto livre é obrigatório nesta sprint (mínimo 1 caractere). Se o
  usuário sentir fricção, podemos relaxar para opcional. Decisão
  atual: obrigatório, em linha com a função terapêutica do diário.
- O parâmetro `modo=audio` (vindo do botão Voz do FAB Radial) é
  aceito mas inicializa em `vitoria` por default. O bloco de
  gravação chega só na M06.5 — esta sprint **não** abre o
  microfone, apenas marca a flag interna. Confirmar se o
  comportamento provisório (silencioso, sem botão de gravação) é
  aceitável até M06.5.
