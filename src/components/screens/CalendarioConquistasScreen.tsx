// Tela 25 — Calendário visual de conquistas (M11.5). Header laranja
// "Calendário", barra de filtros (5 filtros do adendo A4), timeline
// horizontal de cards. Empty state separa o caso global (nenhuma
// conquista no Vault) do caso filtrado (filtros excluíram tudo).
//
// Strings de UI em sentence case PT-BR com acentuação completa.
// Comentários em PT-BR com acentuação correta.
import { ScrollView, Text, View } from 'react-native';
import { Calendar, Sparkles } from 'lucide-react-native';
import { Screen, Header, EmptyState } from '@/components/ui';
import { useConquistas } from '@/lib/hooks/useConquistas';
import { Timeline } from '@/components/calendario/Timeline';
import { FiltrosBar } from '@/components/calendario/FiltrosBar';
import { colors } from '@/theme/tokens';

export function CalendarioConquistasScreen() {
  const {
    brutas,
    conquistas,
    loading,
    error,
    filtros,
    setFiltroPessoa,
    setFiltroMes,
    setFiltroTipoMidia,
    setFiltroIntensidade,
    setFiltroBairro,
  } = useConquistas();

  const sem = !loading && brutas.length === 0;
  const semAposFiltro =
    !loading && brutas.length > 0 && conquistas.length === 0;

  return (
    <Screen>
      <Header title="Calendário" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={{ marginTop: 8, marginBottom: 16 }}>
          <Text
            style={{
              color: colors.orange,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Conquistas
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            Momentos com mídia anexada vindos do diário emocional e dos
            eventos positivos.
          </Text>
        </View>

        <FiltrosBar
          filtros={filtros}
          onPessoa={setFiltroPessoa}
          onMes={setFiltroMes}
          onTipoMidia={setFiltroTipoMidia}
          onIntensidade={setFiltroIntensidade}
          onBairro={setFiltroBairro}
        />

        <View style={{ marginTop: 24, minHeight: 220 }}>
          {error ? (
            <EmptyState
              frase="Não foi possível carregar as conquistas."
              Icon={Calendar}
            />
          ) : loading ? (
            <View
              style={{
                paddingTop: 48,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                Carregando...
              </Text>
            </View>
          ) : sem ? (
            <EmptyState
              frase="Sua primeira conquista vai aparecer aqui."
              Icon={Sparkles}
            />
          ) : semAposFiltro ? (
            <EmptyState frase="Nada por aqui ainda." Icon={Calendar} />
          ) : (
            <Timeline conquistas={conquistas} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
