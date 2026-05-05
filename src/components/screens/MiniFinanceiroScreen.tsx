// Tela 22 (M14 + M35). Aba Financas em modo "Em desenvolvimento" para
// a v1.0 do app: o pipeline backend que publica financas-cache.json no
// Vault ainda nao esta pronto, entao a tela renderiza um EmptyState
// honesto em vez de tentar ler cache inexistente e expor mensagens
// internas como "Rode o pipeline no desktop".
//
// Schemas (src/lib/schemas/financas-cache.ts) e cards auxiliares
// (BannerLeitura, CardHero, CardTopCategorias, ListaTransacoes)
// permanecem no repositorio como codigo morto. Quando o backend
// publicar o cache, basta restaurar esta tela para a versao M14.
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Wallet } from '@/lib/icons';
import { EmptyState, Header, Screen } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export function MiniFinanceiroScreen(): ReactNode {
  return (
    <Screen>
      <Header title="Finanças" />
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingTop: spacing.huge,
        }}
        accessibilityLabel="financas em desenvolvimento"
      >
        <EmptyState
          Icon={Wallet}
          frase="Em desenvolvimento. Disponível em versão futura."
        />
      </View>
    </Screen>
  );
}
