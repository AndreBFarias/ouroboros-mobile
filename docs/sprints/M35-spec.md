# Sprint M35 — Aba Finanças: empty state honesto "Em desenvolvimento"

```
DEPENDE:    M27 (estrutura final de rotas)
BLOQUEIA:   nenhuma (paralela com M32/M33/M34)
ESTIMATIVA: 1-2h
```

## 1. Objetivo

Substituir a `<MiniFinanceiroScreen>` (que tenta ler cache backend
inexistente e mostra "Rode o pipeline desktop") por empty state
honesto: "Em desenvolvimento. Disponível em versão futura.". Remove
acoplamento com o cache backend que não chega na refundação v1.0.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MiniFinanceiroScreen.tsx`
  — substituir todo o conteúdo:
  ```tsx
  import { Wallet } from 'lucide-react-native';
  import { Header, Screen, EmptyState } from '@/components/ui';
  import { spacing } from '@/theme/tokens';
  import { View } from 'react-native';

  export function MiniFinanceiroScreen() {
    return (
      <Screen>
        <Header title="Finanças" />
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: spacing.huge }}>
          <EmptyState
            Icon={Wallet}
            frase="Em desenvolvimento. Disponível em versão futura."
          />
        </View>
      </Screen>
    );
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/screens/MiniFinanceiroScreen.test.tsx`
  — atualizar (ou criar): render contém EmptyState com texto
  "Em desenvolvimento".

### Arquivos depreciados (mantidos como código morto)

- `src/lib/hooks/useFinancasCache.ts` — adicionar comentário JSDoc
  `@deprecated v1.0 — não consumido enquanto pipeline backend não
  publicar cache no Vault`.
- `src/lib/cache/financas-cache-reader.ts` (se existir) — mesmo
  tratamento.

### Arquivos NÃO modificados

- `src/lib/schemas/financas-cache.ts` — schema fica para uso futuro.
- Cards de finanças (`CardHero`, `CardTopCategorias`,
  `ListaTransacoes`) — ficam disponíveis, podem ser reativados em
  sprint futura sem perda.

## 3. APIs reutilizáveis

- `<Screen>`, `<Header>`, `<EmptyState>`.
- `lucide-react-native` `Wallet`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- Sem mudança em rotas (aba Finanças continua acessível via menu
  lateral).
- Nenhum schema/store novo.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR.
- TS strict.
- **Não apagar** componentes auxiliares de finanças (CardHero etc.)
  — ficam disponíveis para retomada futura.

## 5. Procedimento sugerido

1. Substituir conteúdo de `MiniFinanceiroScreen.tsx`.
2. Adicionar `@deprecated` em `useFinancasCache`.
3. Atualizar (ou criar) teste.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m35-export && rm -rf /tmp/m35-export

# Manual web:
./run.sh --web
# Menu lateral > Finanças > tela mostra "Em desenvolvimento. Disponível em versão futura."
```

## 7. Commit

```
fix: m35 financas empty state em desenvolvimento honesto
```

## 8. Checkpoint visual

1 screenshot Nível A em `docs/sprints/M35-screenshots/`:
- `A-financas-em-desenvolvimento.png`

## 9. Decisões tomadas

- **Não apagar código auxiliar de finanças**: CardHero, sparklines
  e schemas continuam no repo para retomada quando o pipeline
  backend gerar `financas-cache.json`. Sem necessidade de regredir
  trabalho.
- **`@deprecated` no hook**: sinaliza que não deve ser consumido
  até reativação. ESLint pode pegar futuros usos acidentais.
- **Texto sóbrio**: "Em desenvolvimento. Disponível em versão
  futura." — sem promessa de data, sem "em breve".

Sprint pronta para execução sem perguntas pendentes.
