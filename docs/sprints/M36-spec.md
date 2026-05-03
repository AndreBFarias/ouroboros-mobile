# Sprint M36 — Tela Recap: agregação de período (Conquistas/Crises/Evoluções/Números)

```
DEPENDE:    M27 (menu lateral); M28 (rotuloPessoa); M30 (alarmes);
            M31 (tarefas v2); M32 (contador apoio); M33 (campo `para`);
            M25 (OuroborosLoader durante agregação)
BLOQUEIA:   M40 (Home v2 — botão Recap no header)
ESTIMATIVA: 6-8h
```

## 1. Objetivo

Criar a tela `/recap` que agrega todos os registros do Vault em um
período (semana / mês / ano / personalizado) e mostra 5 seções:
**Conquistas** (vitórias, marcos, contadores em sequência, **tarefas
concluídas agregadas**), **Crises** (triggers ordenados por
intensidade), **Evoluções** (deltas humor + contadores em alta +
treinos a mais), **Tarefas concluídas** (detalhe agrupado por
categoria — decisão usuário 2026-05-03) e **Números** (totais
agregados incluindo `tarefas_concluidas`). Usado como espelho
otimista em momento de crise — usuário vê em números o que
conquistou, incluindo tudo que tirou da lista de tarefas.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/recap.tsx`
  — rota raiz modal `/recap`. Renderiza `<RecapScreen>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/RecapScreen.tsx`
  — container principal:
  - Header "Recap" + botão fechar (X).
  - `<ChipGroup mode="single">` período: Semana / Mês / Ano /
    Personalizado.
  - Quando "Personalizado": dois `<DateTimePicker>` (de/até).
  - Loading: `<OuroborosLoader compacto />`.
  - 4 seções renderizadas após `useRecap` retornar dados.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useRecap.ts`
  — hook que dado `{ de: Date, ate: Date }` lê do Vault tudo do
  período via helpers existentes (`listarHumor`, `listarDiarios`,
  `listarEventos`, `listarMarcos`, `listarContadores`,
  `listarTreinos`, `listarTarefas`) e agrega em `RecapData`:
  ```ts
  interface RecapData {
    conquistas: ConquistaItem[];      // vitórias diário + marcos + contadores em sequência + tarefas concluídas
    crises: CriseItem[];
    evolucoes: EvolucaoItem[];
    tarefasConcluidas: TarefaConcluidaItem[];  // detalhe da seção Tarefas
    numeros: {
      registros: number; treinos: number; fotos: number;
      eventos_positivos: number; eventos_negativos: number;
      tarefas_concluidas: number;     // novo (decisão usuário 2026-05-03)
    };
  }
  ```
  Filtro de tarefas no período: `feito === true && feito_em >= de
  && feito_em <= ate`. Ordenação por `feito_em desc`. Tarefas
  pendentes são ignoradas no Recap (são "intenção", não conquista).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/RecapSecaoConquistas.tsx`
  — lista de cards verde-borda com ícone + frase ("Você teve 3
  conquistas esta semana", individual cada uma).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/RecapSecaoCrises.tsx`
  — lista de cards red-borda + microcopy "Você passou por isso e
  está aqui."
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/RecapSecaoEvolucoes.tsx`
  — sparkline cyan + delta humor médio + contadores em alta.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/RecapSecaoNumeros.tsx`
  — grid 2×3 (era 2×2; adicionado card "Tarefas concluídas") de
  cards com número grande + label.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/RecapSecaoTarefas.tsx`
  — nova seção: lista compacta de tarefas concluídas no período
  com ícone categoria à esquerda, título centro, dia da conclusão
  à direita ("seg 28/04"). Agrupa por categoria com subtotais
  ("Trabalho — 5 concluídas", "Casa — 2 concluídas"). Empty state
  silencioso (não renderiza seção quando 0).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/hooks/useRecap.test.ts`
  — agregação por período.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/screens/RecapScreen.test.tsx`
  — render por período + estado vazio.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — registrar `<Stack.Screen name="recap" options={{ presentation:
  'modal' }} />`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuLateral.tsx`
  — item "Recap" na seção "Ver" (M27 já preparou estrutura).

### Arquivos NÃO modificados

- `app/index.tsx` (Home) — M40 adiciona botão Recap no header.

## 3. APIs reutilizáveis

- `listarHumor` em `src/lib/vault/humor.ts` (se não existir, criar
  helper análogo a `listarDiarios`).
- `listarDiarios`, `listarEventos`, `listarMarcos`,
  `listarContadores`, `listarTreinos` (existentes).
- `<OuroborosLoader compacto />` (M25).
- `<ChipGroup>`, `<EmptyState>`, `<Card>`, `<SparklineMedida>`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Rota raiz modal:** `/recap` registrada em `app/_layout.tsx`.
- **MenuLateral:** seção Ver ganha item Recap (M27 já tinha
  placeholder).
- **Hook novo:** `useRecap` consome helpers existentes; sem schema
  novo.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded.
  Frases agregadas mostram "Você" / "André" via nomes runtime.
- **ADR-0005 (sem gamificação)**: tom esperançoso, **sem**
  exclamação, troféu, badge. Frases: "Você teve 3 conquistas",
  "Você passou por isso e está aqui", não "Parabéns!".
- Sentence case + acentuação PT-BR.
- TS strict.
- Loader visível durante agregação (pode levar 1-3s para Vault grande).
- Se período vazio: empty state "Nenhum registro neste período."

## 5. Procedimento sugerido

1. Criar helper `listarHumor` em `src/lib/vault/humor.ts` (se não
   existir) — espelhar pattern de `listarDiarios`.
2. Criar `useRecap` hook:
   ```ts
   export function useRecap(periodo: Periodo): { data: RecapData | null; loading: boolean } {
     const { de, ate } = resolverPeriodo(periodo);
     const vaultRoot = useVault(s => s.vaultRoot);
     const [data, setData] = useState<RecapData | null>(null);
     const [loading, setLoading] = useState(false);

     useEffect(() => {
       if (!vaultRoot) return;
       setLoading(true);
       agregar(vaultRoot, de, ate)
         .then(setData)
         .finally(() => setLoading(false));
     }, [vaultRoot, de.getTime(), ate.getTime()]);

     return { data, loading };
   }
   ```
3. Criar `<RecapScreen>` consumindo `useRecap`.
4. Criar 4 sub-componentes de seção.
5. Plugar item "Recap" em MenuLateral.
6. Registrar rota em `app/_layout.tsx`.
7. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m36-export && rm -rf /tmp/m36-export

# Manual:
# 1. Após semana de uso real (ou seed_vault_demo), navegar para Recap
# 2. Período "Esta semana": ver 4 seções preenchidas
# 3. Período "Este ano": agregação maior, loader aparece brevemente
```

## 7. Commit

```
feat: m36 recap conquistas crises evolucoes numeros por periodo
```

## 8. Checkpoint visual

5 screenshots Nível A em `docs/sprints/M36-screenshots/`:
- `A-recap-loading.png` — loader visível durante agregação.
- `A-recap-conquistas.png` — seção Conquistas preenchida.
- `A-recap-crises.png` — seção Crises com microcopy.
- `A-recap-evolucoes.png` — sparkline cyan.
- `A-recap-numeros.png` — grid de números.

## 9. Decisões tomadas

- **5 seções fixas**: Conquistas / Crises / Evoluções / Tarefas
  concluídas / Números. Cobrem o pedido do usuário ("ver em números
  o que conquistou", incluindo o trabalho operacional via tarefas).
- **Tarefas concluídas no Recap (decisão usuário 2026-05-03)**:
  M31 mudou comportamento — concluir tarefa não apaga, vai para
  seção "Concluídas" da tela `/todo` preservando `feito_em`. M36
  consome esse mesmo dado. Filtro: `feito === true && feito_em
  in [de, ate]`. Aparece em 3 lugares no Recap: contador agregado
  em "Conquistas" ("Você concluiu 17 tarefas esta semana"), seção
  detalhada "Tarefas concluídas" (lista agrupada por categoria) e
  card "Tarefas concluídas" em "Números".
- **Tom esperançoso (não eufórico)**: respeita ADR-0005. Microcopy
  "Você passou por isso e está aqui" valida sem celebrar.
- **`useRecap` lê tudo no momento da abertura**: sem cache. Vault
  pequeno (semanas/meses) é instantâneo; ano pode levar 1-3s
  (loader).
- **Personalizado opcional**: dois pickers de data lado a lado.
- **Sem `Recap` como tab**: rota modal acionada por header da Home
  (M40) e item do menu lateral (M27 + M36).
- **Tarefas pendentes ignoradas**: Recap é retrospectiva do que
  aconteceu, não lista de afazeres. Pendentes ficam na tela
  `/todo` (M31).

Sprint pronta para execução sem perguntas pendentes.
