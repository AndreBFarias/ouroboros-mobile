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
  — `<ItemTarefa>` mostra ícone da categoria à esquerda; chip
  pequeno do destino se não for "mim".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/todo/ItemTarefa.tsx`
  — render categoria + destino visualmente (ícone 16dp + chip
  micro).
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
# 3. Marcar feito: tarefa some, alarme cancelado automaticamente
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

Sprint pronta para execução sem perguntas pendentes.
