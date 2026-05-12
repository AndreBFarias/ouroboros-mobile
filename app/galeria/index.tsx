// Q9 (Onda Q): Galeria unificada / Vault Explorer. Mostra TUDO que o
// usuario salvou no Vault, agrupado por tipo de feature, com filtros
// rapidos em forma de chips (Tudo / Fotos / Audios / Videos / Textos /
// Mais). Tap em item abre /galeria/detalhe/[slug] read-only.
//
// Performance: listarItensGaleria nao carrega binarios. So le frontmatter
// do .md companion de cada item. Grid 2 colunas via FlatList numColumns.
// Recarrega ao focar (useFocusEffect) para refletir saves recentes.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Header, Screen } from '@/components/ui';
import { Image as ImageIcon } from '@/lib/icons';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import {
  listarItensGaleria,
  type ItemGaleria,
  type TipoGaleria,
} from '@/lib/vault/galeria';

// Tabs canonicas. 'value' bate com FiltroLogico abaixo; 'tipos' lista
// os tipos canonicos que o filtro abrange.
type FiltroLogico = 'tudo' | 'foto' | 'audio' | 'video' | 'texto' | 'mais';

interface AbaConfig {
  value: FiltroLogico;
  label: string;
  tipos: TipoGaleria[] | 'todos';
}

const ABAS: AbaConfig[] = [
  { value: 'tudo', label: 'Tudo', tipos: 'todos' },
  { value: 'foto', label: 'Fotos', tipos: ['foto'] },
  { value: 'audio', label: 'Áudios', tipos: ['audio'] },
  { value: 'video', label: 'Vídeos', tipos: ['video'] },
  { value: 'texto', label: 'Textos', tipos: ['diario', 'frase', 'nota'] },
  {
    value: 'mais',
    label: 'Mais',
    tipos: [
      'humor',
      'ciclo',
      'evento',
      'marco',
      'tarefa',
      'alarme',
      'contador',
      'exercicio',
      'scanner',
    ],
  },
];

// Cor de acento por tipo canonico. Tom Dracula sobrio; ADR-0005 proibe
// celebracao visual exagerada — usamos como faixa lateral de 3dp no
// card, sem fundo colorido.
const COR_POR_TIPO: Record<TipoGaleria, string> = {
  humor: colors.pink,
  diario: colors.purple,
  evento: colors.cyan,
  marco: colors.yellow,
  foto: colors.orange,
  audio: colors.cyan,
  video: colors.purple,
  frase: colors.green,
  tarefa: colors.muted,
  alarme: colors.red,
  contador: colors.muted,
  nota: colors.muted,
  ciclo: colors.red,
  exercicio: colors.green,
  scanner: colors.muted,
};

const ROTULO_TIPO: Record<TipoGaleria, string> = {
  humor: 'humor',
  diario: 'diário',
  evento: 'evento',
  marco: 'marco',
  foto: 'foto',
  audio: 'áudio',
  video: 'vídeo',
  frase: 'frase',
  tarefa: 'tarefa',
  alarme: 'alarme',
  contador: 'contador',
  nota: 'nota',
  ciclo: 'ciclo',
  exercicio: 'exercício',
  scanner: 'documento',
};

// YYYY-MM-DD -> dd/mm/aaaa.
function formatarData(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

export default function GaleriaIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [filtro, setFiltro] = useState<FiltroLogico>('tudo');
  const [itens, setItens] = useState<ItemGaleria[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setItens([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const out = await listarItensGaleria(vaultRoot);
      setItens(out);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const filtrados = useMemo(() => {
    const aba = ABAS.find((a) => a.value === filtro);
    if (!aba || aba.tipos === 'todos') return itens;
    const set = new Set(aba.tipos);
    return itens.filter((i) => set.has(i.tipo));
  }, [itens, filtro]);

  const renderItem = ({ item }: { item: ItemGaleria }) => (
    <CardItem
      item={item}
      onPress={() => {
        router.push({
          pathname: '/galeria/detalhe/[slug]',
          params: {
            slug: item.slug ?? item.data,
            tipo: item.tipo,
            data: item.data,
            uri: item.uri,
          },
        });
      }}
    />
  );

  return (
    <Screen>
      <Header title="Galeria" onBack={() => router.back()} />
      <View style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
        <BarraTabs valor={filtro} onChange={setFiltro} />
      </View>

      {carregando ? null : filtrados.length === 0 ? (
        <EmptyState
          frase="Nada salvo ainda."
          Icon={ImageIcon}
        />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(i) => i.uri}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={{
            gap: spacing.md,
            paddingBottom: spacing.xxl,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

interface BarraTabsProps {
  valor: FiltroLogico;
  onChange: (v: FiltroLogico) => void;
}

// Barra horizontal scrollavel de pills custom. Usamos Pressable inline
// em vez de Button.tsx (A34): no New Arch, Button generico com icone +
// label colapsa o flex-row em containers compactos. ChipGroup serviria
// mas queremos rolagem horizontal pura, sem wrap, com indicacao clara
// de selecao.
function BarraTabs({ valor, onChange }: BarraTabsProps) {
  return (
    <View
      className="flex-row"
      style={{ gap: spacing.sm, flexWrap: 'wrap' }}
      accessibilityRole="tablist"
    >
      {ABAS.map((aba) => {
        const ativo = aba.value === valor;
        return (
          <Pressable
            key={aba.value}
            onPress={() => onChange(aba.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            accessibilityLabel={`aba ${aba.label}`}
            hitSlop={8}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.chip,
              borderWidth: 1,
              borderColor: ativo ? colors.orange : colors.mutedDecor,
              backgroundColor: ativo ? colors.orange : 'transparent',
              minHeight: 36,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: ativo ? colors.bgPage : colors.muted,
                fontFamily: ativo
                  ? 'JetBrainsMono_500Medium'
                  : 'JetBrainsMono_400Regular',
                fontSize: 13,
              }}
            >
              {aba.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface CardItemProps {
  item: ItemGaleria;
  onPress: () => void;
}

function CardItem({ item, onPress }: CardItemProps) {
  const acento = COR_POR_TIPO[item.tipo];
  const rotulo = ROTULO_TIPO[item.tipo];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`abrir ${rotulo} ${item.titulo}`}
      style={{
        flex: 1,
        height: 160,
        backgroundColor: colors.bgElev,
        borderRadius: radius.card,
        borderLeftWidth: 3,
        borderLeftColor: acento,
        padding: spacing.md,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text
          numberOfLines={3}
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {item.titulo}
        </Text>
        {item.subtitulo ? (
          <Text
            numberOfLines={1}
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.micro.size,
            }}
          >
            {item.subtitulo}
          </Text>
        ) : null}
      </View>
      <View
        className="flex-row items-center justify-between"
        style={{ marginTop: spacing.sm }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
        >
          {formatarData(item.data)}
        </Text>
        <Text
          style={{
            color: acento,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {rotulo}
        </Text>
      </View>
    </Pressable>
  );
}
