// Card 160x200dp do calendário de conquistas (M11.5). Cover ocupa
// os 60% superiores (120dp), metadata abaixo (80dp). Tap navega
// para detalhe via push do Expo Router.
//
// Layout:
//   - Cover: 160x120dp, sem radius nas bordas inferiores (cola na
//     metadata).
//   - Tipo: micro caption em muted-decor (ex: "Foto", "Áudio").
//   - Frase: 2 linhas truncadas em fg.
//   - Data: micro caption em muted (ex: "12 abr 2026").
//
// Strings de UI em sentence case com acentuação completa PT-BR.
// Comentários sempre com acento.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius as radii } from '@/theme/tokens';
import { CoverMidia } from '@/components/data/CoverMidia';
import type { Conquista, MidiaCoverTipo } from '@/lib/conquistas/types';

const ROTULOS_TIPO: Record<MidiaCoverTipo, string> = {
  foto: 'Foto',
  youtube: 'YouTube',
  spotify: 'Spotify',
  audio: 'Áudio',
};

const MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dia = d.getUTCDate();
  const mes = MESES_ABREV[d.getUTCMonth()] ?? '';
  const ano = d.getUTCFullYear();
  return `${dia} ${mes} ${ano}`;
}

interface ConquistaCardProps {
  conquista: Conquista;
  // onPress opcional — quando ausente, navega via router para a
  // sub-rota de detalhe. Útil em testes para isolar render.
  onPress?: (conquista: Conquista) => void;
}

export function ConquistaCard({ conquista, onPress }: ConquistaCardProps) {
  const [pressed, setPressed] = useState(false);
  const router = useRouter();

  const handlePress = () => {
    haptics.light();
    if (onPress) {
      onPress(conquista);
      return;
    }
    router.push({
      pathname: '/calendario/[id]',
      params: { id: conquista.id },
    });
  };

  const rotuloTipo = ROTULOS_TIPO[conquista.tipoCover];
  const dataFormatada = formatarData(conquista.data);

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`conquista ${conquista.id}`}
    >
      <MotiView
        animate={{ scale: pressed ? 0.98 : 1 }}
        transition={springs.snappy}
        style={{
          width: 160,
          height: 200,
          borderRadius: radii.card,
          backgroundColor: colors.bgAlt,
          overflow: 'hidden',
          marginRight: 12,
        }}
      >
        <View style={{ width: '100%', height: 120 }}>
          <CoverMidia midia={conquista.midiaPrincipal} />
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 8,
            flex: 1,
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                lineHeight: 14,
              }}
            >
              {rotuloTipo}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: colors.fg,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 2,
              }}
            >
              {conquista.frase}
            </Text>
          </View>
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            {dataFormatada}
          </Text>
        </View>
      </MotiView>
    </Pressable>
  );
}
