// Monomark E3 -- wordmark + ponto (fiel a mount_E3, coreografias:953-966).
// Lockup estatico: um ponto em degrade (rosa->roxo) ao lado de "ouroboros"
// (mono, roxo) e, abaixo, "protocolo" (mono, secundario, tracking largo,
// caixa alta). Nao dirige a anatomia -- e' so composicao de texto + ponto.
// Usa as constantes de WORDMARK da geometria (fonte unica do nome).
//
// Comentarios sem acento (convencao shell/CI).
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { WORDMARK } from '../glifo/geometria';

export interface E3WordmarkProps {
  tamanho?: number;
}

let CONTADOR_GRAD = 0;

export function E3Wordmark({ tamanho = 12 }: E3WordmarkProps) {
  // id do degrade unico por instancia (evita colisao de url(#id) no DOM web)
  const idGrad = useRef<string | null>(null);
  if (idGrad.current === null) {
    CONTADOR_GRAD += 1;
    idGrad.current = `e3dot-${CONTADOR_GRAD}`;
  }
  const grad = idGrad.current;
  const raio = tamanho / 2;

  return (
    <View
      style={styles.wrap}
      accessibilityLabel="lockup ouroboros protocolo"
      accessibilityRole="image"
    >
      <View style={styles.linha}>
        <View style={styles.glow}>
          <Svg width={tamanho} height={tamanho}>
            <Defs>
              <LinearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#fc7ac8" />
                <Stop offset="1" stopColor={colors.purple} />
              </LinearGradient>
            </Defs>
            <Circle cx={raio} cy={raio} r={raio} fill={`url(#${grad})`} />
          </Svg>
        </View>
        <Text style={styles.primaria}>{WORDMARK.primaria.toLowerCase()}</Text>
      </View>
      <Text style={styles.secundaria}>{WORDMARK.secundaria}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  glow: {
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 7,
    elevation: 6,
  },
  primaria: {
    fontFamily: WORDMARK.fontFamily,
    fontSize: 22,
    fontWeight: '500',
    color: colors.purple,
    letterSpacing: 0.22,
  },
  secundaria: {
    fontFamily: WORDMARK.fontFamily,
    fontSize: 10,
    color: colors.mutedDecor,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
