// M11.4 -- Subsecao "Evolucao corporal" da aba Marcos. Renderiza
// uma faixa horizontal de cards mensais com a foto frontal mais
// recente de cada medida + peso (ou travessao) + delta vs medida
// anterior. Tap em um card abre a Tela 13 (Comparativo de medidas)
// para que o usuario explore o snapshot completo.
//
// Tambem expoe um botao discreto "Registrar evolucao" no canto
// direito do cabecalho da secao, atalho para /medidas/novo. Esse
// atalho coexiste com o item "Adicionar marco" do MenuCapturaVerde
// unificado (M34.3): a interface acoesExtras/MemoriasScreen so
// aceita 1 acao por tab, entao a evolucao fica visivel no contexto
// da propria secao -- alem de ser reforcada pelo FAB verde.
//
// Empty state: quando nao ha medidas registradas, exibe um card
// neutro pedindo o primeiro registro.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import { useMedidas } from '@/lib/hooks/useMedidas';
import { useVault } from '@/lib/stores/vault';
import { colors, spacing } from '@/theme/tokens';
import { textPropsDecor } from '@/lib/a11y/textPropsDecor';
import { haptics } from '@/lib/haptics';
import type { Medida } from '@/lib/schemas/medidas';

const MESES_PT_CURTO: Record<number, string> = {
  0: 'jan',
  1: 'fev',
  2: 'mar',
  3: 'abr',
  4: 'mai',
  5: 'jun',
  6: 'jul',
  7: 'ago',
  8: 'set',
  9: 'out',
  10: 'nov',
  11: 'dez',
};

// Largura fixa de cada card mensal. Cabe ~2 cards e meio em frame
// 412dp -- intencional para sinalizar que a faixa tem mais conteudo
// alem do fold. Aspect ratio 3:4 mimetiza o crop padrao da camera.
const CARD_WIDTH = 132;
const CARD_HEIGHT = 176;

function formatarMesAno(iso: string): string {
  // iso e YYYY-MM-DD; nao usamos new Date(iso) para evitar shift de
  // timezone (UTC midnight vira dia anterior em BRT). Parse manual.
  const [yStr, mStr] = iso.split('-');
  const m = Number(mStr) - 1;
  return `${MESES_PT_CURTO[m] ?? ''} ${yStr}`;
}

function formatarPeso(valor: number | undefined): string {
  if (typeof valor !== 'number') return '—';
  return valor.toFixed(1).replace('.', ',');
}

// Calcula delta de peso entre medida atual e anterior. Devolve null
// quando nao ha referencia, ou quando a medida atual nao tem peso.
function calcularDeltaPeso(
  atual: Medida,
  anterior: Medida | undefined
): number | null {
  if (typeof atual.peso !== 'number') return null;
  if (!anterior || typeof anterior.peso !== 'number') return null;
  return atual.peso - anterior.peso;
}

function formatarDelta(delta: number | null): string {
  if (delta === null) return '';
  if (Math.abs(delta) < 0.05) return '=';
  const sinal = delta > 0 ? '+' : '-';
  return `${sinal}${Math.abs(delta).toFixed(1).replace('.', ',')}`;
}

// Calcula distancia em dias entre uma data ISO YYYY-MM-DD e hoje.
// Usado para o subtitulo "Ultima medida ha X dias.".
function diasDesde(iso: string, hoje: Date = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  // UTC midnight -- comparacao por dias inteiros e exata.
  const dataMedida = Date.UTC(y, m - 1, d);
  const dataHoje = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate()
  );
  return Math.max(0, Math.round((dataHoje - dataMedida) / 86_400_000));
}

function resolveUri(vaultRoot: string | null, rel: string): string {
  if (!vaultRoot) return rel;
  const trimmed = vaultRoot.endsWith('/')
    ? vaultRoot.slice(0, -1)
    : vaultRoot;
  return `${trimmed}/${rel}`;
}

// Encontra a foto frontal de uma medida. Suporta o path canonico
// atual (media/fotos/medidas-YYYY-MM-DD-frente.jpg) e o legado
// (assets/m-YYYY-MM-DD-frente.jpg). Quando ausente, devolve null.
function fotoFrontal(medida: Medida): string | null {
  for (const rel of medida.fotos) {
    if (rel.endsWith('-frente.jpg')) return rel;
  }
  // Fallback: primeira foto disponivel (qualquer lado).
  return medida.fotos[0] ?? null;
}

interface CardEvolucaoProps {
  medida: Medida;
  anterior: Medida | undefined;
  vaultRoot: string | null;
  onPress: () => void;
}

function CardEvolucao({
  medida,
  anterior,
  vaultRoot,
  onPress,
}: CardEvolucaoProps): ReactNode {
  const foto = fotoFrontal(medida);
  const uri = foto ? resolveUri(vaultRoot, foto) : null;
  const peso = formatarPeso(medida.peso);
  const delta = calcularDeltaPeso(medida, anterior);
  const deltaStr = formatarDelta(delta);

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`abrir medida de ${formatarMesAno(medida.data)}`}
      style={{
        width: CARD_WIDTH,
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
            resizeMode="cover"
            accessibilityLabel={`foto frontal de ${formatarMesAno(medida.data)}`}
          />
        ) : (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            sem foto
          </Text>
        )}
      </View>
      <View style={{ padding: spacing.sm, gap: 2 }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 14,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {formatarMesAno(medida.data)}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 16,
              lineHeight: 22,
            }}
          >
            {peso}
          </Text>
          <Text
            {...textPropsDecor()}
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            kg
          </Text>
        </View>
        {deltaStr ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            {deltaStr === '=' ? '= vs anterior' : `${deltaStr} kg vs anterior`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export interface SecaoEvolucaoCorporalProps {
  // Override opcional para testes deterministicos do subtitulo
  // "Ultima medida ha X dias.".
  hoje?: Date;
}

export function SecaoEvolucaoCorporal({
  hoje,
}: SecaoEvolucaoCorporalProps = {}): ReactNode {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const { medidas } = useMedidas({ periodo: 'tudo' });

  // Cards na faixa: mais recente -> mais antiga (esquerda -> direita).
  // listarMedidas ja devolve desc por data; aproveitamos.
  const ordenadas = useMemo(() => medidas, [medidas]);

  const subtitulo = useMemo(() => {
    if (ordenadas.length === 0) return null;
    const dias = diasDesde(ordenadas[0].data, hoje);
    if (dias === 0) return 'Última medida hoje.';
    if (dias === 1) return 'Última medida ontem.';
    return `Última medida há ${dias} dias.`;
  }, [ordenadas, hoje]);

  const handleAbrirMedida = useCallback(
    (medida: Medida) => {
      // /medidas e a Tela 13 (comparativo). Passamos focus=YYYY-MM-DD
      // como hint para futura sprint que destaque a entrada; hoje a
      // tela ignora o param e abre o comparativo padrao.
      router.push({
        pathname: '/medidas',
        params: { focus: medida.data },
      });
    },
    [router]
  );

  const handleRegistrar = useCallback(() => {
    haptics.light();
    router.push('/medidas/novo');
  }, [router]);

  return (
    <View
      style={{ gap: spacing.sm, marginBottom: spacing.lg }}
      accessibilityLabel="secao evolucao corporal"
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ gap: 2 }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Evolução corporal
          </Text>
          {subtitulo ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 14,
              }}
            >
              {subtitulo}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleRegistrar}
          accessibilityRole="button"
          accessibilityLabel="registrar evolucao"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: 8,
            backgroundColor: colors.bgAlt,
          }}
        >
          <Plus size={14} color={colors.green} strokeWidth={2} />
          <Text
            style={{
              color: colors.green,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            Registrar evolução
          </Text>
        </Pressable>
      </View>

      {ordenadas.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: 12,
            padding: spacing.base,
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
              textAlign: 'center',
            }}
          >
            Sem registros corporais ainda.
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 16,
              textAlign: 'center',
            }}
          >
            O primeiro registro abre a evolução visual.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
        >
          {ordenadas.map((m, idx) => (
            <CardEvolucao
              key={m.data}
              medida={m}
              // ordenadas e desc; "anterior" cronologico e o proximo
              // index (mais antigo).
              anterior={ordenadas[idx + 1]}
              vaultRoot={vaultRoot}
              onPress={() => handleAbrirMedida(m)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
