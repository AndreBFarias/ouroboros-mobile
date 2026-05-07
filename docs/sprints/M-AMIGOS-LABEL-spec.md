# Sprint I2-AMIGOS — M-AMIGOS-LABEL

```
DEPENDE:    nada
BLOQUEIA:   I-HUMOR (label "Casal"/"Todos")
ESTIMATIVA: ~1h
STATUS:     [todo]
```

## §1 Achado

`tipoCompanhia: 'amigos'` não tem label próprio. Hoje
`useNomeDe('ambos')` retorna hardcoded `'Casal'` em
`src/config/pessoas.config.ts:15`. Literal `'Sobreposto'` aparece em
`MiniHumorScreen.tsx:81-95` (heatmap modo casal/amigos).

## §2 Tarefa concreta

1. **Refatorar `useNomeDe`** em `src/lib/stores/pessoa.ts`:

   ```ts
   import { useOnboarding } from '@/lib/stores/onboarding';

   export function useNomeDe(pessoa: PessoaAutor | 'ambos'): string {
     const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
     const nomeA = useOnboarding((s) => s.pessoa_a.nome) || 'Pessoa A';
     const nomeB = useOnboarding((s) => s.pessoa_b.nome) || 'Pessoa B';
     if (pessoa === 'pessoa_a') return nomeA;
     if (pessoa === 'pessoa_b') return nomeB;
     // 'ambos':
     if (tipoCompanhia === 'casal') return 'Casal';
     if (tipoCompanhia === 'amigos') return 'Todos';
     return 'Ambos'; // fallback
   }
   ```

2. **Substituir literal `'Sobreposto'`** em `MiniHumorScreen.tsx:81-95`
   por `useNomeDe('ambos')` reativo.

3. **Audit grep** em todo `src/` e `app/`:

   ```bash
   grep -rn "Sobreposto\|'Casal'\|\"Casal\"" src/ app/ --include="*.tsx" --include="*.ts" | grep -v test
   ```

   Substituir cada hardcoded por `useNomeDe('ambos')` quando aplicável.

4. **Tests**: `tests/lib/stores/pessoa.test.ts` — 4 casos:
   - `tipoCompanhia: 'casal'` → 'Casal'
   - `tipoCompanhia: 'amigos'` → 'Todos'
   - `tipoCompanhia: 'sozinho'` → 'Ambos' (não deveria aparecer)
   - `pessoa_a` / `pessoa_b` retorna nome real.

## §3 Restrições

- Anonimato Regra −1.
- PT-BR sentence case.
- TS strict 0 erros.
- Reatividade: trocar `tipoCompanhia` em runtime atualiza labels sem
  remount.

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="pessoa"
./scripts/smoke.sh
```

## §5 Validação Gauntlet

Gauntlet web seed `tipoCompanhia: 'amigos'` → navegar `/humor-rapido`
→ heatmap mostra label "Todos" (não "Casal", não "Sobreposto").

PNG `A-amigos-label-todos.png`.

## §6 Commit

```
feat: i2-amigos useNomeDe ramificado por tipoCompanhia + sobreposto removido
```

## §7 Decisões

- **`'Todos'` para amigos** (não "Grupo" ou "Coletivo"): mais natural
  em PT-BR, alinha com tipoCompanhia=amigos = pluralidade aberta.
- **`'Ambos'` fallback** apenas para defensividade — `tipoCompanhia`
  sempre é definido após onboarding.
