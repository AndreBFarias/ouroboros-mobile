// Container principal do Recap (M36). Header com botao fechar (X),
// toggle de modo (Lista/Calendario, L2 M-RECAP-CALENDARIO-UNIFICAR),
// ChipGroup de periodo (Semana / Mes / Ano / Personalizado), loader
// durante agregacao e 5 secoes empilhadas em ScrollView no modo Lista
// ou calendario mensal com conquistas no modo Calendario.
//
// "Personalizado" abre dois inputs simples de data ISO (YYYY-MM-DD)
// para evitar dependencia de DateTimePicker nativo nesta primeira
// versao; refinamento visual fica para sprint futura.
//
// L2 (M-RECAP-CALENDARIO-UNIFICAR): Recap absorveu o antigo
// /calendario (Calendario de Conquistas). Toggle no header alterna
// entre 2 modos da mesma abstracao "conquistas em periodo". ADR-0021.
// Animacao do toggle usa Reanimated puro (nao moti) para mitigar A28
// — fade do conteudo via withTiming + useAnimatedStyle.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { X } from '@/lib/icons';
import { ChipGroup, EmptyState, Screen } from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import {
  useRecap,
  resolverPeriodo,
  type PeriodoChave,
  type PeriodoRange,
} from '@/lib/hooks/useRecap';
import { RecapSecaoConquistas } from './RecapSecaoConquistas';
import { RecapSecaoCrises } from './RecapSecaoCrises';
import { RecapSecaoReflexoes } from './RecapSecaoReflexoes';
import { RecapSecaoEvolucoes } from './RecapSecaoEvolucoes';
import { RecapSecaoTarefas } from './RecapSecaoTarefas';
import { RecapSecaoNumeros } from './RecapSecaoNumeros';
import { RecapModoCalendario } from './RecapModoCalendario';

// Q24.b (2026-05-13): 'memorias' nao e' um state interno -- tap nessa
// pill navega pra rota /recap-memorias (slideshow Wrapped full-screen).
type RecapModo = 'lista' | 'calendario' | 'memorias';

const PERIODOS = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
  { value: 'personalizado', label: 'Personalizado' },
] as const;

const MODOS: ReadonlyArray<{ value: RecapModo; label: string; a11y: string }> = [
  { value: 'lista', label: 'Lista', a11y: 'modo lista' },
  { value: 'calendario', label: 'Calendário', a11y: 'modo calendario' },
  { value: 'memorias', label: 'Memórias', a11y: 'modo memorias' },
];

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function RecapScreen() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<PeriodoChave>('semana');
  const [modo, setModo] = useState<RecapModo>('lista');

  // L2: opacity compartilhado para fade do conteudo ao trocar modo.
  // Reanimated puro (sem moti) por A28 — moti em boot path crasha em
  // New Arch. Aqui nao e boot, mas mantem padrao por seguranca.
  const opacidade = useSharedValue(1);
  const estiloConteudo = useAnimatedStyle(() => ({
    opacity: opacidade.value,
    flex: 1,
  }));

  // Range custom: defaults para os ultimos 7 dias para que o input
  // sempre tenha valor inicial visivel quando o usuario seleciona
  // 'personalizado'.
  const hoje = useMemo(() => new Date(), []);
  const seteDiasAtras = useMemo(() => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 6);
    return d;
  }, [hoje]);
  const [deStr, setDeStr] = useState<string>(formatYmd(seteDiasAtras));
  const [ateStr, setAteStr] = useState<string>(formatYmd(hoje));

  const range: PeriodoRange = useMemo(() => {
    if (periodo === 'personalizado') {
      const de = parseYmd(deStr) ?? seteDiasAtras;
      const ateBase = parseYmd(ateStr) ?? hoje;
      const ate = new Date(ateBase);
      ate.setHours(23, 59, 59, 999);
      return { de, ate };
    }
    return resolverPeriodo(periodo, hoje);
  }, [periodo, deStr, ateStr, hoje, seteDiasAtras]);

  const { data, loading } = useRecap(range);

  // L2: micro-fade out + fade in ao trocar modo. Curva linear curta
  // (180ms) — nao e movimento posicional, so opacidade.
  useEffect(() => {
    opacidade.value = 0;
    opacidade.value = withTiming(1, { duration: 180 });
  }, [modo, opacidade]);

  const fechar = () => {
    haptics.light();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const trocarPeriodo = (next: string | null) => {
    if (!next) return;
    haptics.selection();
    setPeriodo(next as PeriodoChave);
  };

  const trocarModo = (proximo: RecapModo) => {
    if (proximo === modo) return;
    haptics.selection();
    if (proximo === 'memorias') {
      // Q24.b: rota separada (slideshow full-screen). NAO atualiza
      // `modo` -- ao voltar do slideshow, usuario aterriza no modo
      // anterior preservado (Lista ou Calendario).
      router.push({
        pathname: '/recap-memorias' as never,
        params: {
          de: range.de.toISOString(),
          ate: range.ate.toISOString(),
        },
      });
      return;
    }
    setModo(proximo);
  };

  const totalSecoes =
    data === null
      ? 0
      : data.conquistas.length +
        data.crises.length +
        data.reflexoes.length +
        data.evolucoes.length +
        data.tarefasConcluidas.length;

  return (
    <Screen>
      <View style={{ flex: 1, gap: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          accessibilityLabel="cabecalho recap"
        >
          <Text
            style={{
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 22,
              color: colors.fg,
            }}
          >
            Recap
          </Text>
          <Pressable
            onPress={fechar}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="fechar recap"
          >
            <X size={24} color={colors.fg} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.bgAlt,
            borderRadius: 12,
            padding: 4,
            gap: 4,
          }}
          accessibilityLabel="toggle modo recap"
        >
          {MODOS.map((m) => {
            const ativo = m.value === modo;
            return (
              <Pressable
                key={m.value}
                onPress={() => trocarModo(m.value)}
                accessibilityRole="button"
                accessibilityLabel={m.a11y}
                accessibilityState={{ selected: ativo }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: ativo ? colors.purple : 'transparent',
                  alignItems: 'center',
                  minHeight: 44,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: ativo ? colors.bgPage : colors.fg,
                    fontFamily: ativo
                      ? 'JetBrainsMono_500Medium'
                      : 'JetBrainsMono_400Regular',
                    fontSize: 13,
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {modo === 'lista' ? (
          <ChipGroup
            mode="single"
            value={periodo}
            onChange={trocarPeriodo}
            options={PERIODOS.map((p) => ({
              value: p.value,
              label: p.label,
              accent: 'purple',
            }))}
          />
        ) : null}

        {modo === 'lista' && periodo === 'personalizado' ? (
          <View
            style={{ flexDirection: 'row', gap: 12 }}
            accessibilityLabel="periodo personalizado"
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  color: colors.muted,
                }}
              >
                De
              </Text>
              <TextInput
                value={deStr}
                onChangeText={setDeStr}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.mutedDecor}
                accessibilityLabel="data de"
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 14,
                  color: colors.fg,
                  backgroundColor: colors.bgAlt,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  color: colors.muted,
                }}
              >
                Até
              </Text>
              <TextInput
                value={ateStr}
                onChangeText={setAteStr}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.mutedDecor}
                accessibilityLabel="data ate"
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 14,
                  color: colors.fg,
                  backgroundColor: colors.bgAlt,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              />
            </View>
          </View>
        ) : null}

        <Animated.View style={estiloConteudo}>
          {modo === 'calendario' ? (
            <RecapModoCalendario />
          ) : loading ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 48,
              }}
              accessibilityLabel="carregando recap"
            >
              <OuroborosLoader compacto />
            </View>
          ) : data === null ? (
            <EmptyState frase="Nenhum registro neste período." />
          ) : totalSecoes === 0 ? (
            <EmptyState frase="Nenhum registro neste período." />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 32, gap: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <RecapSecaoConquistas itens={data.conquistas} />
              <RecapSecaoCrises itens={data.crises} />
              <RecapSecaoReflexoes itens={data.reflexoes} />
              <RecapSecaoEvolucoes itens={data.evolucoes} />
              <RecapSecaoTarefas itens={data.tarefasConcluidas} />
              <RecapSecaoNumeros numeros={data.numeros} range={range} />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}
