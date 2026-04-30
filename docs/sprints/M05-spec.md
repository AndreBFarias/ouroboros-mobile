# Sprint M05 — Humor Rápido (Tela 15)

```
DEPENDE:    M02 fechada (Vault Bridge + writer/reader/paths funcionando)
            + M03 fechada (identidade dinâmica em SecureStore via usePessoa)
            + M04 fechada (rota /humor-rapido recebe push do FAB Radial)
BLOQUEIA:   M10 (Mini Humor consome daily/YYYY-MM-DD.md gerado aqui)
ESTIMATIVA: 3-4h
```

## 1. Objetivo

Implementar a Tela 15 do BRIEFING (§6, Seção B): **registro de humor
em até 30 segundos**. Bottom sheet 70%, quatro sliders de 1-5 (humor,
energia, ansiedade, foco), toggle de medicação, input numérico de horas
de sono, ChipGroup de tags rápidas (multi-select), textarea opcional
de uma linha e botão Salvar verde. Persiste o registro em
`daily/YYYY-MM-DD.md` no Vault via `vault/writer.ts`. Flow alvo: do
tap no botão Humor do FAB Radial até o toast `"Salvo."` em menos de
30 segundos.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/humor-rapido.tsx`
  — substitui o stub criado na M04. Renderiza um `<BottomSheet>` com
  snap point 70% que abre automaticamente ao montar a rota. Estado
  local controlado via `useState`/`useReducer`: 4 valores 1-5 (default
  3), `medicacao: boolean`, `horas_sono: number | null`, `tags:
  string[]`, `frase: string`. Botão Salvar em variant `success`
  chama o handler descrito em "Procedimento". Ao concluir, fecha o
  sheet e usa `router.back()` para retornar ao chamador (Tela 01).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/humor/saveHumor.ts`
  — função pura `saveHumor(meta: HumorMeta, vaultRoot: string):
  Promise<{ uri: string; conflito: boolean }>`. Resolve o path
  canônico via `dailyPath(new Date())`, resolve sufixo
  `-pessoa_a`/`-pessoa_b` se já existir arquivo do mesmo dia (ver
  Armadilha A5 em `VALIDATOR_BRIEF.md`), monta corpo Markdown a partir
  da `frase` e chama `writeVaultFile<HumorMeta>(uri, meta, body)`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/humor/tagsRapidas.ts`
  — const `TAGS_RAPIDAS: ChipOption[]` com slugs em snake_case
  (`trabalho_pesado`, `boa_conversa`, `cansaco`, `exercicio`,
  `foco_dificil`, `dormi_mal`, `treino_bom`, `dia_leve`). Helper
  `formatTag(slug)` converte para Sentence case na exibição
  (`'trabalho_pesado'` -> `'Trabalho pesado'`). Slug fica no
  frontmatter; UI exibe formatado.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/humor-rapido.test.tsx`
  — render do bottom sheet, default 3 nos 4 sliders, save chama
  `writeVaultFile` (mock) com payload válido pelo `HumorSchema`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/humor/saveHumor.test.ts`
  — caminho feliz, conflito de pessoa (sufixo aplicado), validação
  zod barra payload inválido (humor=0).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/humor/tagsRapidas.test.ts`
  — `formatTag` cobre underscores e múltiplas palavras.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/index.ts`
  — exportar `writeVaultFile` se ainda não estiver no barrel
  (verificar em runtime; M02 introduziu o módulo). Sem mudanças se já
  estiver lá.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/CHANGELOG.md`
  — entrada `[Unreleased]` com nota "Sprint M05 - tela 15 humor
  rapido com daily/YYYY-MM-DD.md persistido via writer.".

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/BottomSheet.tsx`
  — abre o sheet com `snapPoints={['70%']}` e `enablePanDownToClose`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Slider.tsx`
  — quatro instâncias para humor, energia, ansiedade, foco. Cada uma
  já dispara `haptics.selection()` por step (M01.3).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Input.tsx`
  — duas instâncias:
  1. `label="Medicação tomada"` com `autoCapitalize="sentences"`,
     placeholder `"Ex.: Fluoxetina 20mg (opcional)"`. Texto livre.
  2. `label="Horas de sono ontem"` com `keyboardType="numeric"`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Chip.tsx`
  — `<ChipGroup mode="multi" options={TAGS_RAPIDAS} />`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Textarea.tsx`
  — `<Textarea autoExpand placeholder="Uma frase sobre hoje" />`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Button.tsx`
  — variant `success` para o botão Salvar; `haptics.light()` é
  embutido no press do componente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/Toast.tsx`
  — `useToast().show('Salvo.', { type: 'success' })` no sucesso;
  `'Falha ao salvar. Verifique a pasta do Vault.'` no erro.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `dailyPath(date)` resolve `daily/YYYY-MM-DD.md`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/writer.ts`
  — `writeVaultFile<HumorMeta>(uri, meta, body)`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/permissions.ts`
  — `getVaultRoot()` para obter URI raiz. Se `null`, redirecionar
  para `/onboarding` (caso de borda; M03 já evita esse cenário).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/humor.ts`
  — `HumorSchema` e `HumorMeta`. Já contempla os 4 sliders, tags,
  frase, medicacao, horas_sono.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa.getState().pessoaAtiva` define o campo `autor`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/vault.ts`
  — `useVault.getState().vaultRoot` para concatenar com o path
  relativo retornado por `dailyPath`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/motion.ts`
  — `springs.snappy` para animar o botão Salvar (scale 0.97 já
  embutido no `<Button>`, mas o sheet usa `springs.default` ao subir).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — `haptics.light()` no save (já embutido em `<Button>`);
  `haptics.success()` opcional após gravar (chamada explícita).

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013). Ex: `"Humor"`, `"Energia"`, `"Ansiedade"`, `"Foco"`,
  `"Tomei medicação"`, `"Horas de sono ontem"`, `"Uma frase sobre
  hoje"`, `"Salvar"`.
- `accessibilityLabel` sem acento (ex: `'slider humor'`,
  `'toggle medicacao'`).
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
- Imports via alias `@/*`.
- **Não tocar** em `src/components/ui/*` (M01) — usar como estão. Se
  faltar API, reportar como achado.
- **Não tocar** em `src/lib/motion.ts`, `src/lib/haptics.ts`,
  `src/config/pessoas.config.ts`.
- `src/lib/schemas/humor.ts` **já foi atualizado** pelo orquestrador
  antes desta sprint (decisão 3 da §9): `medicacao` agora é
  `z.string().min(1).optional()` (texto livre opcional, não mais
  boolean). O executor não precisa tocar nesse arquivo, apenas
  consumir o tipo `HumorMeta` atualizado.
- Conflito A5 (`VALIDATOR_BRIEF.md` §4): se duo (`pessoa_b` configurada),
  resolver colisão de `daily/YYYY-MM-DD.md` com sufixo
  `-pessoa_a`/`-pessoa_b` antes de escrever.

## 5. Procedimento sugerido

1. Criar `src/lib/humor/tagsRapidas.ts` com const `TAGS_RAPIDAS` e
   helper `formatTag`.
2. Criar `src/lib/humor/saveHumor.ts`:
   - resolve URI completo: `${vaultRoot}/${dailyPath(now)}`.
   - antes de escrever, listar `daily/` via reader; se já existir
     arquivo do mesmo dia para `pessoa_b` e `pessoaAtiva === 'pessoa_a'`
     (ou vice-versa), aplicar sufixo `-${pessoaAtiva}.md`.
   - chamar `writeVaultFile<HumorMeta>` com `body` formatado a partir
     de `frase` (ou string vazia se omitida).
3. Implementar `app/humor-rapido.tsx`:
   - `useEffect` no mount: abre o `<BottomSheet ref>` no snap 70%.
   - 4 `<Slider value min=1 max=5 step=1 onChange>` + label da grandeza.
   - `<Input label="Medicação tomada" placeholder="Ex.: Fluoxetina 20mg (opcional)" autoCapitalize="sentences" />` — texto livre opcional. Vazio é equivalente a omitido (não envia campo no frontmatter).
   - `<Input label="Horas de sono ontem" keyboardType="numeric" />`.
   - `<ChipGroup mode="multi" options={TAGS_RAPIDAS.map(({slug,label})
     => ({ id: slug, label }))} />`.
   - `<Textarea autoExpand placeholder="Uma frase sobre hoje (opcional)" />`.
   - `<Button variant="success" label="Salvar" onPress={handleSave} />`.
4. `handleSave`:
   - monta `meta: HumorMeta` a partir do estado local + `data` =
     `formatDateYmd(new Date())` + `autor` = `usePessoa.getState().pessoaAtiva`.
   - valida com `HumorSchema.safeParse(meta)`. Se erro, toast erro
     `"Algo ficou inconsistente. Tente de novo."` e mantém aberto.
   - chama `saveHumor(meta, vaultRoot)`. Se sucesso, fecha sheet,
     `useToast().show('Salvo.', { type: 'success' })`,
     `await haptics.success()`, `router.back()`.
   - Se erro de I/O, toast `"Falha ao salvar. Verifique a pasta do
     Vault."`.
5. Escrever testes:
   - `tests/app/humor-rapido.test.tsx`: render, defaults, mock de
     `saveHumor` é chamado com payload válido.
   - `tests/lib/humor/saveHumor.test.ts`: caminho feliz; conflito
     dispara sufixo; payload inválido bloqueia.
   - `tests/lib/humor/tagsRapidas.test.ts`: `formatTag('trabalho_pesado')
     === 'Trabalho pesado'`.
6. Rodar comandos da seção 6.
7. Commit.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m05-export && rm -rf /tmp/m05-export
```

Todos exit 0. Total de testes deve aumentar (esperado: +6 a +8 entre
os três arquivos novos de teste). Após o save, rodar
`cat ~/Protocolo-Ouroboros/daily/$(date +%F).md` e validar
manualmente que o frontmatter casa com `HumorSchema`.

## 7. Commit

```
feat: m05 humor rapido tela 15 com persistencia em daily
```

## 8. Checkpoint visual

Esta sprint **toca UI** (Tela 15 nova). Política de 3 níveis
(`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Abre Tela 01, toca FAB, toca botão Humor,
  preenche os 4 sliders + tags + frase, toca Salvar. Capturar 4
  screenshots: bottom sheet aberto vazio, sheet preenchido, toast
  `"Salvo."`, Tela 01 retornada com sheet fechado.
- **APIs nativas — Nível B (emulador Android):**
  `./scripts/start-emulator.sh`. Validar haptic do slider e do botão
  Salvar (Chrome não emite haptic).
- **Final — Nível C (celular físico):** **só com permissão explícita
  do usuário**. Validar fluxo real: tap FAB Humor -> sheet -> Salvar
  -> arquivo `.md` aparece em `~/Protocolo-Ouroboros/daily/` no
  desktop após sync via Syncthing.

Salvar capturas em `docs/sprints/M05-screenshots/`. Comparar com
artboard "tela 15 — humor rapido" de
`docs/Ouroboros_22_telas-standalone.html`.

## 9. Dúvidas em aberto

Resolvidas em 2026-04-30 com o humano (orquestrador registrou aqui
antes de disparar o executor):

1. **Frase opcional**: vai no **frontmatter** como `frase: "..."`
   (já modelado no `HumorSchema`). Corpo do `.md` fica vazio. Decisão
   (a). Sprint futura pode migrar para corpo se ficar mais idiomático
   no Obsidian.
2. **Tags rápidas**: lista **fechada** com 8 slugs. Decisão (a). Tag
   livre pode entrar como sprint futura se demanda surgir.
3. **Medicação**: vira **campo de texto livre opcional**. O schema
   `humor.ts` foi atualizado pelo orquestrador antes da sprint
   (`medicacao: z.string().min(1).optional()`). O componente passa a
   ser `<Input label="Medicação tomada" />`, não mais `<Toggle>`.
   Vazio = campo omitido no frontmatter.

Nenhuma dúvida pendente; executar.
