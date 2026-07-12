// Card visual de um alarme na lista (M16). Conteudo:
//   - Linha 1: titulo (mono 16dp, fg) + Toggle inline na direita.
//   - Linha 2: horario grande (mono medium 24dp purple) ao lado da
//     trilha de 7 dots representando dias selecionados.
//   - Linha 3 (muted, micro): label da tag e som.
//
// Toggle inline alterna alarme.ativo. Caller injeta o handler que
// persiste no Vault e re-(des)agenda. Tap no card (fora do toggle)
// dispara onPressEditar (navegar para /alarmes/[slug]).
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Card, Toggle } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import {
  DIAS_SEMANA_LABELS,
  SOM_LABELS,
  TAG_LABELS,
  type Alarme,
} from '@/lib/schemas/alarme';

interface CardAlarmeProps {
  alarme: Alarme;
  onToggle: (next: boolean) => void;
  onPressEditar?: () => void;
}

export function CardAlarme({
  alarme,
  onToggle,
  onPressEditar,
}: CardAlarmeProps) {
  return (
    <Card
      onPress={onPressEditar}
      accessibilityLabel={`alarme ${alarme.titulo} ${alarme.horario}`}
    >
      <View style={{ gap: spacing.sm }}>
        {/* Linha 1: titulo + toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.base,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 16,
            }}
            numberOfLines={1}
          >
            {alarme.titulo}
          </Text>
          <Toggle
            value={alarme.ativo}
            onChange={onToggle}
            accessibilityLabel={`alternar alarme ${alarme.slug}`}
          />
        </View>

        {/* Linha 2: horario + dots dos dias */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.base,
          }}
        >
          <Text
            style={{
              color: alarme.ativo ? colors.purple : colors.muted,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 24,
              opacity: alarme.ativo ? 1 : 0.6,
            }}
          >
            {alarme.horario}
          </Text>

          <View
            style={{ flexDirection: 'row', gap: 6 }}
            accessibilityLabel="dias da semana"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((dia) => {
              const ativo = alarme.dias_semana.includes(dia);
              return (
                <View
                  key={dia}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: ativo ? colors.purple : 'transparent',
                    borderWidth: 1,
                    borderColor: ativo ? colors.purple : colors.mutedDecor,
                    opacity: alarme.ativo ? 1 : 0.5,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 9,
                      color: ativo ? colors.bg : colors.muted,
                    }}
                  >
                    {DIAS_SEMANA_LABELS[dia]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Linha 3 muted: tag + som */}
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            opacity: alarme.ativo ? 1 : 0.6,
          }}
        >
          {TAG_LABELS[alarme.tag]} · {SOM_LABELS[alarme.som]}
        </Text>
      </View>
    </Card>
  );
}
