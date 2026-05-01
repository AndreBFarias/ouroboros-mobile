// Bloco "Quando" da Tela 20. Dois chips single-select: 'Agora'
// (default) e 'Outro horario'. Selecionar 'Outro horario' abre um
// time picker (DateTimePicker) que persiste a hora escolhida em
// dataCustom. Quando 'Agora' esta ativo, dataCustom permanece null e
// o save usa new Date(). MotiView com spring subtle expande/contrai
// uma area abaixo dos chips quando dataCustom esta ativo, exibindo
// a hora escolhida e permitindo reabrir o picker.
//
// Decisão M07 (spec seção 9, item 3): no Android usamos
// DateTimePicker nativo; no Web cai em <input type="time"> via
// fallback do proprio componente. UX consistente aceitavel para o
// estado atual; refinar em sprint futura se necessario.
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { MotiView } from 'moti';
import { Chip } from '@/components/ui';
import { springs } from '@/lib/motion';
import { colors, spacing } from '@/theme/tokens';

export type QuandoMode = 'agora' | 'outro';

export interface QuandoBlockProps {
  modo: QuandoMode;
  onChangeModo: (next: QuandoMode) => void;
  dataCustom: Date | null;
  onChangeDataCustom: (next: Date | null) => void;
  disabled?: boolean;
}

// Formata 'HH:mm' a partir de Date sem depender de Intl.DateTimeFormat
// (RN Web tem suporte parcial; mantemos format manual).
function formatHora(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function QuandoBlock({
  modo,
  onChangeModo,
  dataCustom,
  onChangeDataCustom,
  disabled = false,
}: QuandoBlockProps) {
  // No Android o DateTimePicker e modal e some após onChange. No iOS
  // ele e inline e fica visivel até o usuario fechar. No Web
  // também e inline. Esse flag controla a visibilidade local.
  const [pickerAberto, setPickerAberto] = useState(false);

  const abrirPicker = () => {
    if (disabled) return;
    onChangeModo('outro');
    setPickerAberto(true);
  };

  const handlePickerChange = (
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    // Android: 'set' = usuario confirmou; 'dismissed' = cancelou.
    // Em qualquer caso o picker deve fechar no Android.
    if (Platform.OS === 'android') {
      setPickerAberto(false);
    }
    if (event.type === 'dismissed') {
      // Se cancelou e não havia data antes, volta pra 'agora'.
      if (!dataCustom) {
        onChangeModo('agora');
      }
      return;
    }
    if (selecionado) {
      onChangeDataCustom(selecionado);
    }
  };

  const handleAgora = () => {
    if (disabled) return;
    onChangeModo('agora');
    onChangeDataCustom(null);
    setPickerAberto(false);
  };

  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="bloco quando">
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        Quando
      </Text>
      <View
        style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}
      >
        <Chip
          label="Agora"
          accent="purple"
          selected={modo === 'agora'}
          onPress={handleAgora}
          disabled={disabled}
        />
        <Chip
          label="Outro horário"
          accent="purple"
          selected={modo === 'outro'}
          onPress={abrirPicker}
          disabled={disabled}
        />
      </View>

      {modo === 'outro' && dataCustom ? (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={springs.subtle}
        >
          <Pressable
            onPress={abrirPicker}
            accessibilityRole="button"
            accessibilityLabel="reabrir time picker"
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 14,
                paddingVertical: spacing.xs,
              }}
            >
              {formatHora(dataCustom)}
            </Text>
          </Pressable>
        </MotiView>
      ) : null}

      {pickerAberto ? (
        <DateTimePicker
          value={dataCustom ?? new Date()}
          mode="time"
          is24Hour
          onChange={handlePickerChange}
        />
      ) : null}
    </View>
  );
}
