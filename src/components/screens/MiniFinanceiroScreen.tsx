// Tela 22 (M14). Container completo da aba Financas: header laranja
// "Finanças", banner de modo leitura no topo, card hero com gasto da
// semana, card top categorias com 5 itens e barras horizontais cyan
// e lista virtualizada das ultimas 20 transacoes.
//
// Empty state quando o cache esta ausente: orienta a rodar o pipeline
// no desktop. Quando o cache existe mas esta em formato desconhecido,
// exibe outro empty state alertando schema novo (ADR-0012).
//
// Read-only absoluto (ADR-0005): zero botao de adicionar/editar/
// excluir. Toda mutacao financeira fica no desktop.
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { EmptyState, Header, Screen } from '@/components/ui';
import { useFinancasCache } from '@/lib/hooks/useFinancasCache';
import { colors, spacing } from '@/theme/tokens';
import { BannerLeitura } from '@/components/financas/BannerLeitura';
import { CardHero } from '@/components/financas/CardHero';
import { CardTopCategorias } from '@/components/financas/CardTopCategorias';
import { ListaTransacoes } from '@/components/financas/ListaTransacoes';

export function MiniFinanceiroScreen(): ReactNode {
  const { cache, loading, error } = useFinancasCache();

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Header title="Finanças" />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BannerLeitura geradoEm={cache?.gerado_em ?? null} />

        {loading ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Carregando…
          </Text>
        ) : null}

        {!loading && error ? (
          <EmptyState
            frase="Cache em formato desconhecido. Rode o pipeline atualizado."
            Icon={Wallet}
          />
        ) : null}

        {!loading && !error && !cache ? (
          <EmptyState
            frase="Rode o pipeline no desktop pra carregar dados."
            Icon={Wallet}
          />
        ) : null}

        {!loading && !error && cache ? (
          <>
            <CardHero
              gastoSemana={cache.gasto_semana}
              periodoReferencia={cache.periodo_referencia}
              deltaTextual={cache.delta_textual}
            />
            <CardTopCategorias categorias={cache.top_categorias} />
            <ListaTransacoes transacoes={cache.ultimas_transacoes} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
