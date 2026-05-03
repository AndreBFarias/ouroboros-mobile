# Sprint M33 — Campo `para` em Diário/Evento/Contador/Marco (anotação para o casal)

```
DEPENDE:    M31 (linha de base de pessoa_destino em Tarefa)
BLOQUEIA:   M40 (Home v2 — status do casal usa `para`)
ESTIMATIVA: 3-4h
```

## 1. Objetivo

Permitir que o usuário registre conquistas, eventos, contadores e
marcos **para a outra pessoa do casal** (anotação dedicada).
Adicionar campo `para` (`mim` / `outra(pessoa)` / `casal`) em 4
schemas e atualizar UIs para chip "Para: [Eu] [Vitória] [Casal]".

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/diario_emocional.ts`
  — adicionar:
  ```ts
  para: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('mim') }),
    z.object({ tipo: z.literal('outra'), pessoa: PessoaAutorSchema }),
    z.object({ tipo: z.literal('casal') }),
  ]).default({ tipo: 'mim' }),
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/evento.ts`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/contador.ts`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/marco.ts`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/SeletorPara.tsx`
  — novo componente compartilhado (similar ao
  `<SeletorPessoaDestino>` da M31, mas só 3 opções: mim/parceiro/
  casal). Exportado em `src/components/ui/index.ts`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/diario-emocional.tsx`
  — adicionar `<SeletorPara value={para} onChange={setPara} />` antes
  do botão Registrar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/novo.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SheetNovoMarco.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useHoje.ts`
  — adicionar filtro opcional por `para`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/schemas/diario_emocional.test.ts`,
  `evento.test.ts`, `contador.test.ts`, `marco.test.ts` — cobrir
  campo `para`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/ui/SeletorPara.test.tsx`
  — novo teste.

### Arquivos NÃO modificados

- Schemas Tarefa (M31 já tem `pessoa_destino` — semântica equivalente
  mas separada).

## 3. APIs reutilizáveis

- `useRotuloPessoa()` (M28) para labels.
- `<ChipGroup mode="single">`.
- `usePessoa.tipoCompanhia` / `pessoaAtiva` para esconder "Para
  [parceiro]" se sozinho.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Schemas:** 4 schemas estendidos com mesmo padrão `para`
  discriminado.
- **Componente UI compartilhado:** `<SeletorPara>` no barrel `ui/`.
- **Sem mudança em rotas, app.json.**

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais. `para.outra.pessoa` é
  PessoaAutor (`pessoa_a` / `pessoa_b`), nunca string livre. Nome
  vem de `usePessoa.nomes` runtime.
- Sentence case + acentuação PT-BR ("Para mim", "Para Vitória",
  "Para o casal").
- TS strict.
- Migração: arquivos `.md` v1 sem campo `para` ganham default
  `{ tipo: 'mim' }` ao serem lidos.
- Quando `tipoCompanhia === 'sozinho'`, `<SeletorPara>` esconde
  opções "outra" e "casal" (renderiza só "Para mim" — efetivamente
  campo invisível).

## 5. Procedimento sugerido

1. Atualizar 4 schemas (`diario_emocional`, `evento`, `contador`,
   `marco`) adicionando `para`.
2. Criar `<SeletorPara>`:
   ```tsx
   export function SeletorPara({ value, onChange }) {
     const tipoCompanhia = useOnboarding(s => s.tipoCompanhia);
     const pessoaAtiva = usePessoa(s => s.pessoaAtiva);
     const nomes = usePessoa(s => s.nomes);
     if (tipoCompanhia === 'sozinho') return null;
     const outroAutor = pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a';
     const opcoes = [
       { value: 'mim', label: 'Para mim' },
       { value: 'outra', label: `Para ${nomes[outroAutor]}` },
       { value: 'casal', label: 'Para o casal' },
     ];
     return (
       <ChipGroup mode="single" value={mapValue(value)}
         onChange={(v) => onChange(parseValue(v, outroAutor))}
         options={opcoes} />
     );
   }
   ```
3. Plugar `<SeletorPara>` em 4 telas de criação.
4. Atualizar testes de schemas e teste novo do componente.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m33-export && rm -rf /tmp/m33-export

# Manual:
# 1. Sozinho: SeletorPara invisível em todas as 4 telas
# 2. Duo: chips "Para mim / Para Vitória / Para o casal" visíveis
# 3. Salvar evento "Para Vitória" → frontmatter tem
#    para: { tipo: 'outra', pessoa: 'pessoa_b' }
```

## 7. Commit

```
feat: m33 campo para em diario evento contador marco anotacao casal
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M33-screenshots/`:
- `A-evento-para-mim.png` — chip "Para mim" selecionado.
- `A-evento-para-parceiro.png` — chip "Para Vitória" selecionado.
- `A-evento-para-casal.png` — chip "Para o casal" selecionado.

## 9. Decisões tomadas

- **Campo `para` separado de `autor`**: `autor` continua sendo quem
  REGISTRA (André logado); `para` é quem RECEBE/É O TEMA da anotação.
- **Discriminado por tipo**: tipo seguro; UI mapeia para chips
  visualmente.
- **Sozinho esconde o componente**: sem fricção em modo único.
- **Default `{ tipo: 'mim' }`**: backward-compat com arquivos v1.
- **Não em Tarefa**: M31 já tem `pessoa_destino`. Diferente
  semanticamente (`pessoa_destino` é quem deve fazer; `para` é tema/
  destinatário emocional).

Sprint pronta para execução sem perguntas pendentes.
