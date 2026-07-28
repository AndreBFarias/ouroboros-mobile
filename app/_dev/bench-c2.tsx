// R-BRAND-3-GLIFO -- rota dev /_dev/bench-c2. Protótipo do benchmark do
// PIOR CASO (C2): um unico worklet useFrameCallback computa a onda
// gaussiana e escreve 47 shared values por frame (43 contas + 4 do rosto),
// sem re-render React. Instrumentacao de fps no proprio worklet, reportada
// por runOnJS a cada 1s. GATE da onda: fps sustentado >= 45 no device real
// (medido pelo dono; ver spec §7). Este protótipo NAO e' o C2 final (fiel
// vem na R-BRAND-5) -- e' so a carga do pior caso para o gate.
//
// A mesma tela hospeda o gallery dos monomarks E1/E2/E3 + o glifo estatico
// (paridade), servindo de alvo para o E2E e para os screenshots do Gauntlet.
// Dead-code em release (herda o gate MODO_DEV_WEB, como o gauntlet).
//
// Comentarios sem acento (convencao shell/CI).
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import { colors, spacing, typography } from '@/theme/tokens';
import { OuroborosGlifo } from '@/components/brand/glifo';
import { E1HeadOnly, E2RingOnly, E3Wordmark } from '@/components/brand/conceitos';

const N_CONTAS = 43;
const PERIODO_MS = 2400; // 1 volta da onda (igual a mount_C2)

export default function BenchC2() {
  const [rodando, setRodando] = useState(false);
  const [fps, setFps] = useState(0);

  // 47 shared values: 43 contas (num array) + 4 do rosto.
  const contas = useSharedValue<number[]>(new Array(N_CONTAS).fill(0.15));
  const cabeca = useSharedValue(0.3);
  const cauda = useSharedValue(0.3);
  const boca = useSharedValue(0.3);
  const olho = useSharedValue(0.3 * 0.65);

  // Instrumentacao de fps (contadores no UI thread).
  const frames = useSharedValue(0);
  const ultimoReport = useSharedValue(0);

  const frame = useFrameCallback((info) => {
    'worklet';
    const agora = info.timeSinceFirstFrame;
    const t = (agora / PERIODO_MS) % 1;

    // onda gaussiana viajando pelas 43 contas
    const arr: number[] = [];
    for (let i = 0; i < N_CONTAS; i++) {
      let d = Math.abs(t - i / N_CONTAS);
      if (d > 0.5) d = 1 - d;
      arr[i] = 0.15 + 0.85 * Math.exp(-d * d * 80);
    }
    contas.value = arr;

    // rosto em fase com a onda
    const dh = t > 0.5 ? 1 - t : t;
    const face = 0.3 + 0.7 * Math.exp(-dh * dh * 60);
    cabeca.value = face;
    cauda.value = face;
    boca.value = face;
    olho.value = face * 0.65;

    // fps: conta frames e reporta a cada ~1s
    frames.value += 1;
    if (agora - ultimoReport.value >= 1000) {
      const seg = (agora - ultimoReport.value) / 1000;
      runOnJS(setFps)(Math.round(frames.value / seg));
      frames.value = 0;
      ultimoReport.value = agora;
    }
  }, false);

  const alternar = () => {
    const proximo = !rodando;
    setRodando(proximo);
    frame.setActive(proximo);
    if (!proximo) {
      setFps(0);
      contas.value = new Array(N_CONTAS).fill(0.15);
      cabeca.value = 0.3;
      cauda.value = 0.3;
      boca.value = 0.3;
      olho.value = 0.3 * 0.65;
      frames.value = 0;
      ultimoReport.value = 0;
    }
  };

  if (!MODO_DEV_WEB) {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      contentContainerStyle={{ padding: spacing.md, alignItems: 'center' }}
    >
      <Text style={titulo}>Benchmark C2 (pior caso)</Text>
      <Text style={legenda}>
        47 escritas de shared value por frame (43 contas + rosto), 1 worklet
        useFrameCallback. Gate da onda: fps sustentado maior ou igual a 45 no
        device real.
      </Text>

      <View
        accessibilityLabel="benchmark c2 glifo"
        style={{ marginVertical: spacing.md }}
      >
        <OuroborosGlifo
          tamanho={240}
          hideWordmark
          driver={{ contas, cabeca, cauda, boca, olho }}
        />
      </View>

      <View
        accessibilityLabel="fps atual do benchmark"
        style={{
          backgroundColor: colors.bg,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: 8,
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            color: fps >= 45 || fps === 0 ? colors.green : colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.heading1.size,
            textAlign: 'center',
          }}
        >
          {fps} fps
        </Text>
      </View>

      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={rodando ? 'parar benchmark' : 'rodar benchmark'}
        style={{
          backgroundColor: rodando ? colors.red : colors.purple,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: 10,
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={{
            color: colors.bgPage,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
          }}
        >
          {rodando ? 'Parar' : 'Rodar benchmark C2'}
        </Text>
      </Pressable>

      <Text style={titulo}>Monomarks E1 / E2 / E3</Text>
      <Text style={legenda}>
        Alvos do E2E e da paridade visual. E1 pisca o olho, E2 gira o anel, E3
        é estático.
      </Text>

      <View style={{ gap: spacing.lg, marginTop: spacing.md, width: '100%' }}>
        <ItemConceito rotulo="E1 - head-only (olho pisca ~5,2s)">
          <View accessibilityLabel="conceito e1">
            <E1HeadOnly tamanho={120} />
          </View>
        </ItemConceito>

        <ItemConceito rotulo="E2 - só-anel (rotação 40s)">
          <View accessibilityLabel="conceito e2">
            <E2RingOnly tamanho={120} />
          </View>
        </ItemConceito>

        <ItemConceito rotulo="E3 - wordmark + ponto (estático)">
          <View accessibilityLabel="conceito e3">
            <E3Wordmark />
          </View>
        </ItemConceito>

        <ItemConceito rotulo="Glifo estático (paridade com OuroborosLogo)">
          <View accessibilityLabel="glifo estatico">
            <OuroborosGlifo tamanho={160} />
          </View>
        </ItemConceito>
      </View>
    </ScrollView>
  );
}

function ItemConceito({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
        }}
      >
        {rotulo}
      </Text>
      <View
        style={{
          backgroundColor: colors.bg,
          borderRadius: 12,
          padding: spacing.md,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const titulo = {
  color: colors.purple,
  fontFamily: 'JetBrainsMono_500Medium',
  fontSize: typography.heading2.size,
  marginTop: spacing.md,
  textAlign: 'center' as const,
};

const legenda = {
  color: colors.muted,
  fontSize: typography.caption.size,
  lineHeight: 18,
  textAlign: 'center' as const,
  marginTop: spacing.xs,
  maxWidth: 360,
};
