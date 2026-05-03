# Sprint M31 — TarefaSchema v2: categoria + pessoa_destino + alarme

```
DEPENDE:    M30 (alarmes funcionais para vincular)
BLOQUEIA:   M33 (campo "para" — refatoração cruzada de schemas)
ESTIMATIVA: 5-6h
```

## 1. Objetivo

Expandir `TarefaSchema` com 3 campos novos: `categoria` (8 opções
canônicas), `pessoa_destino` (mim/parceiro/casal/terceiro com nome) e
`alarme` (vinculado a um alarme em `alarmes/`). UI da
`SheetNovaTarefa` ganha esses campos como chips e toggle expansível.

**Mudança comportamental crítica (decisão usuário 2026-05-03)**:
ao marcar tarefa como feita, ela **NÃO some mais da UI**. Vai para
uma seção/aba "Concluídas" abaixo das pendentes, preservada com
`feito_em` (já no schema v1). O Recap (M36) puxa tarefas concluídas
do período como parte de "Conquistas" / "Números". Long-press na
tarefa concluída permite "Reabrir" (volta para pendentes) ou
"Apagar definitivo" (remove do Vault). Schema já suporta esse
comportamento — só a UI muda.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/tarefa.ts`
  — schema v2:
  ```ts
  export const TAREFA_CATEGORIAS = [
    'trabalho', 'casa', 'rotina', 'financas',
    'desenvolvimento_pessoal', 'obrigacoes', 'saude', 'outro',
  ] as const;
  export const TAREFA_CATEGORIA_LABELS: Record<TarefaCategoria, string> = {
    trabalho: 'Trabalho',
    casa: 'Casa',
    rotina: 'Rotina',
    financas: 'Finanças',
    desenvolvimento_pessoal: 'Desenvolvimento pessoal',
    obrigacoes: 'Obrigações',
    saude: 'Saúde',
    outro: 'Outro',
  };

  export const TarefaSchema = z.object({
    tipo: z.literal('tarefa'),
    data: DataYmd,
    autor: PessoaAutorSchema,
    titulo: z.string().min(1).max(200),
    feito: z.boolean(),
    feito_em: IsoDatetime.nullable(),
    categoria: z.enum(TAREFA_CATEGORIAS).default('outro'),
    pessoa_destino: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('mim') }),
      z.object({ tipo: z.literal('outra'), pessoa: PessoaAutorSchema }),
      z.object({ tipo: z.literal('casal') }),
      z.object({ tipo: z.literal('terceiro'), nome: z.string().min(1).max(60) }),
    ]).default({ tipo: 'mim' }),
    alarme: z.object({
      ativo: z.boolean(),
      data_hora_iso: IsoDatetime.nullable(),
      recorrencia: z.enum(['unica', 'diaria', 'semanal', 'mensal']),
      slug_vinculado: z.string().optional(),  // slug do alarme em alarmes/
    }).nullable().default(null),
  });
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/todo/SheetNovaTarefa.tsx`
  — campos novos:
  - `<ChipGroup mode="single">` Categoria com 8 slugs + ícones lucide
    (Briefcase, Home, Repeat, Wallet, Sparkles, Scale, Heart,
    HelpCircle).
  - `<SeletorPessoaDestino>` (componente novo): chips "Para mim /
    Para [Vitória] / Para o casal / Para outro" + input se "outro".
  - Toggle "Lembrar com alarme" → expande bloco DateTimePicker +
    chip recorrência. Ao salvar com alarme ativo, cria entry em
    `alarmes/<slug>.md` com `slug_vinculado` no schema.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/todo/SeletorPessoaDestino.tsx`
  — novo componente: chips dinâmicos baseados em `usePessoa.nomes`
  + input para "terceiro".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/tarefas.ts`
  — `criarTarefa()` ganha branch: se `meta.alarme.ativo`, cria
  alarme correspondente em `alarmes/<slug-tarefa>-alarme.md` antes
  de salvar a tarefa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/todo.tsx`
  — reorganizar lista em 2 seções:
  - **Pendentes** (default expandida): tarefas com `feito === false`,
    ordenação atual preservada (drag&drop M17).
  - **Concluídas** (collapsable, default colapsada se >5 itens):
    tarefas com `feito === true`, ordenadas por `feito_em desc`.
    Header da seção mostra contador "Concluídas (12)".
    Tap-no-header alterna expansão.
  - Cada `<ItemTarefa>` mostra ícone categoria + chip destino se ≠
    "mim". Item concluído tem opacidade 60% + line-through no título.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/todo/ItemTarefa.tsx`
  — render categoria + destino visualmente (ícone 16dp + chip
  micro). **Long-press em item concluído** abre `<MenuLongPress>`
  (já existe) com 2 ações novas:
  - "Reabrir" → set `feito: false` + `feito_em: null` + cancelar
    delete-pendente do alarme se houver.
  - "Apagar definitivo" → confirm + `removerTarefa()` (já existe).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/todo/SecaoConcluidas.tsx`
  — novo componente: header collapsable + lista de
  `<ItemTarefa modo="concluida">`. Empty state silencioso
  (não renderiza seção quando 0 concluídas).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/tarefas.ts`
  — adicionar `reabrirTarefa(vaultRoot, slug)`: set `feito: false`,
  `feito_em: null`, persist. Cancela alarme `slug_vinculado` se
  re-agendamento futuro for desejado (deixar como TODO inline; M30
  cuida da semântica de re-agendamento).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/tarefa.test.ts`
  — cobertura dos campos novos + migração v1→v2 (tarefas v1 ganham
  defaults).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/todo/SheetNovaTarefa.test.tsx`
  — criação com cada categoria/destino/alarme.

### Arquivos NÃO modificados

- `src/components/todo/MenuLongPress.tsx`, `BarraBusca.tsx`,
  `ListaArrastavel.tsx` — sem mudança.
- `app/alarmes/novo.tsx` — não muda; M30 já tem recorrência.

## 3. APIs reutilizáveis

- `escreverAlarme()` em `src/lib/vault/alarmes.ts`.
- `agendarAlarme()` em `src/lib/services/alarmesNotificacoes.ts`.
- `useRotuloPessoa()` (M28).
- `<ChipGroup>`, `<Toggle>`, `<DateTimePicker>` existentes.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Schema:** `TarefaSchema` v2 — campos novos com defaults.
- **Vault writer:** `criarTarefa` ganha branch que escreve alarme
  vinculado.
- **UI Tarefa:** consome `useRotuloPessoa` (M28) para destino.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded.
  `pessoa_destino.tipo === 'terceiro'` aceita nome livre — mas é
  digitado pelo usuário, não hardcoded.
- Sentence case + acentuação PT-BR.
- TS strict.
- Migração v1→v2: tarefas existentes ganham defaults (`categoria:
  'outro'`, `pessoa_destino: { tipo: 'mim' }`, `alarme: null`).
- Schema **discriminado** para `pessoa_destino` (não union plana).

## 5. Procedimento sugerido

1. Atualizar `TarefaSchema` com 3 campos.
2. Criar `<SeletorPessoaDestino>`:
   ```tsx
   const opcoes = useMemo(() => {
     const out = [
       { value: 'mim', label: 'Para mim' },
       { value: 'casal', label: 'Para o casal' },
     ];
     if (tipoCompanhia !== 'sozinho') {
       const outroAutor = pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a';
       out.splice(1, 0, {
         value: `outra:${outroAutor}`,
         label: `Para ${nomeDe(outroAutor)}`,
       });
     }
     out.push({ value: 'terceiro', label: 'Para outro' });
     return out;
   }, [tipoCompanhia, pessoaAtiva, nomes]);
   ```
3. Atualizar `<SheetNovaTarefa>` para incluir 3 campos novos.
4. Refatorar `criarTarefa()`:
   ```ts
   if (meta.alarme?.ativo && meta.alarme.data_hora_iso) {
     const slugAlarme = `${slug}-alarme`;
     await escreverAlarme(vaultRoot, alarmeFromTarefa(meta, slugAlarme));
     meta.alarme.slug_vinculado = slugAlarme;
   }
   await writeVaultFile(...);
   ```
5. Atualizar `<ItemTarefa>` para mostrar categoria/destino visualmente.
6. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m31-export && rm -rf /tmp/m31-export

# Manual:
# 1. Nova tarefa "Reunião de trabalho" categoria Trabalho, para Vitória,
#    alarme amanhã 14:00 → cria tarefa + alarme vinculado
# 2. Lista de tarefas: ícone Briefcase + chip "Para Vitória" no item
# 3. Marcar feito: tarefa MOVE para seção "Concluídas" (não some);
#    alarme cancelado automaticamente; arquivo .md preservado com
#    feito: true, feito_em: <timestamp>
# 4. Long-press em concluída: menu mostra "Reabrir" e "Apagar definitivo"
# 5. Reabrir: tarefa volta para Pendentes
# 6. Apagar definitivo: arquivo .md sai do Vault (confirmar via adb shell ls)
# 7. Próxima abertura do Recap (M36): seção "Conquistas" lista as
#    tarefas concluídas no período
```

## 7. Commit

```
feat: m31 tarefa v2 categoria pessoa destino e alarme vinculado
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M31-screenshots/`:
- `A-nova-tarefa-categoria.png` — chip categoria visível.
- `A-nova-tarefa-destino.png` — seletor pessoa destino.
- `A-nova-tarefa-alarme.png` — toggle alarme expandido.

## 9. Decisões tomadas

- **8 categorias fechadas**: cobre os casos do usuário (Trabalho /
  Casa / Rotina / Finanças / Desenvolvimento pessoal / Obrigações /
  Saúde / Outro).
- **`pessoa_destino` discriminado**: tipo seguro; `'terceiro'` exige
  nome livre.
- **Alarme vinculado em arquivo separado**: tarefa vive em
  `tarefas/`, alarme em `alarmes/<slug-tarefa>-alarme.md`.
  `slug_vinculado` cruza os dois. Marcar tarefa como feito cancela
  alarme automaticamente.
- **Migração v1→v2**: tarefas v1 ganham defaults — sem perda de
  dados.
- **`SeletorPessoaDestino` consciente do `tipoCompanhia`**: se
  sozinho, esconde "Para Vitória" e "Para o casal".
- **Concluir não apaga (decisão usuário 2026-05-03)**: tarefa
  feita vai para seção "Concluídas" abaixo das pendentes, ordenada
  por `feito_em desc`. Schema v1 já preserva `feito_em`; só a UI
  muda. Justificativa: usuário quer ver o que foi feito no Recap
  (M36 puxa do mesmo arquivo `.md`). Long-press em concluída abre
  menu "Reabrir" / "Apagar definitivo" — usuário escolhe se a
  tarefa some ou volta para pendentes.
- **Seção Concluídas collapsable se >5 itens**: evita poluir UI
  de pendentes quando houver muito histórico. Default colapsada.
- **`reabrirTarefa()` helper novo em `src/lib/vault/tarefas.ts`**:
  espelha semântica de `marcarFeito` mas inverte. TODO inline para
  re-agendamento de alarme cancelado (M30 decide convenção).

Sprint pronta para execução sem perguntas pendentes.
