// Secao Numeros do Recap (M36). Grid responsivo com numero grande +
// label neutro. ADR-0005: sem emoji, sem comparativo (X% melhor), so o
// numero e o que ele representa.
//
// Q24.a (2026-05-13): cada card vira Pressable que navega para
// /recap-lista?tipo=<chave>&de=...&ate=... permitindo o usuario
// abrir os registros originais por trás do numero (humor -> sheet
// humor, diario -> /diario-emocional?slug=, etc).
//
// R-RECAP-2 (2026-05-16): accessibilityLabel passa a usar chave
// canonica do tipo (sem acento) em vez do rotulo PT-BR. Antes,
// `abrir lista Tarefas concluidas` e `abrir lista Eventos dificeis`
// viravam strings com acento — screen reader nao lê acento direito
// (convencao). Padrao novo: `<count> <tipo> no periodo` onde tipo
// e' a chave canonica sem acento (registros / treinos / fotos /
// eventos pos / eventos neg / tarefas).
//
// R-RECAP-NUMEROS-AUDIOVIDEO-CARDS (2026-05-17): grid passa de 6
// para 8 cards. R-CRIT-3 fez useRecap.numeros expor `audios` e
// `videos` (midia standalone via FAB Câmera direto) mas o grid so
// renderizava 6 — os contadores ficavam invisiveis. Agora cada
// tipo tem seu card; tap em audios/videos navega para a galeria
// filtrada (o recap-lista redireciona analogo ao tipo=fotos).
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import type { NumerosRecap, PeriodoRange } from '@/lib/hooks/useRecap';

interface Props {
  numeros: NumerosRecap;
  range: PeriodoRange;
}

type TipoChave =
  | 'registros'
  | 'treinos'
  | 'fotos'
  | 'audios'
  | 'videos'
  | 'eventos_pos'
  | 'eventos_neg'
  | 'tarefas';

// R-RECAP-2: rotulo screen reader por tipo, sem acentuacao
// (convencao a11y). Usado em accessibilityLabel para evitar que
// "Tarefas concluidas" e "Eventos dificeis" virem strings acentuadas
// que o screen reader le mal. Visual continua com acento (`rotulo`).
const A11Y_LABEL_POR_TIPO: Record<TipoChave, string> = {
  registros: 'registros',
  treinos: 'treinos',
  fotos: 'fotos',
  audios: 'audios',
  videos: 'videos',
  eventos_pos: 'eventos positivos',
  eventos_neg: 'eventos dificeis',
  tarefas: 'tarefas concluidas',
};

interface CardNumero {
  rotulo: string;
  valor: number;
  tipo: TipoChave;
}

export function RecapSecaoNumeros({ numeros, range }: Props) {
  const router = useRouter();

  const cards: CardNumero[] = [
    { rotulo: 'Registros', valor: numeros.registros, tipo: 'registros' },
    { rotulo: 'Treinos', valor: numeros.treinos, tipo: 'treinos' },
    { rotulo: 'Fotos', valor: numeros.fotos, tipo: 'fotos' },
    { rotulo: 'Áudios', valor: numeros.audios, tipo: 'audios' },
    { rotulo: 'Vídeos', valor: numeros.videos, tipo: 'videos' },
    {
      rotulo: 'Eventos positivos',
      valor: numeros.eventos_positivos,
      tipo: 'eventos_pos',
    },
    {
      rotulo: 'Eventos difíceis',
      valor: numeros.eventos_negativos,
      tipo: 'eventos_neg',
    },
    {
      rotulo: 'Tarefas concluídas',
      valor: numeros.tarefas_concluidas,
      tipo: 'tarefas',
    },
  ];

  const abrir = (tipo: TipoChave) => {
    void haptics.light();
    router.push({
      pathname: '/recap-lista' as never,
      params: {
        tipo,
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  };

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao numeros">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Números
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {cards.map((card) => (
          <Pressable
            key={card.rotulo}
            onPress={() => abrir(card.tipo)}
            accessibilityRole="button"
            accessibilityLabel={`${card.valor} ${A11Y_LABEL_POR_TIPO[card.tipo]} no periodo`}
            style={{ width: '48%' }}
          >
            <Card>
              <View
                style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 28,
                    color: colors.fg,
                  }}
                >
                  {card.valor}
                </Text>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    color: colors.muted,
                    textAlign: 'center',
                    lineHeight: 18,
                  }}
                >
                  {card.rotulo}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
