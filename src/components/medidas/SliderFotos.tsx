// Comparativo de duas fotos lado a lado com dropdowns de selecao de
// data. Cada lado mostra:
//   - Dropdown com a data atual selecionada (label muted-decor +
//     valor cyan + chevron). Tap abre lista vertical das datas
//     disponiveis para escolha.
//   - Foto 1:1 abaixo, fade cruzado spring_default ao trocar de
//     data.
//
// Default: lado esquerdo recebe a primeira data; lado direito a
// ultima. Quando ha so 1 data disponível, o dropdown direito repete
// a esquerda. Quando não ha fotos, mostra empty muted-decor.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { ChevronDown } from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

export interface FotoMedida {
  // YYYY-MM-DD da medida-mae.
  data: string;
  // URI absoluto da foto resolvido (file://, content:// ou http).
  uri: string;
  // Lado da foto ('frente' | 'costas' | 'lado'). Mostrado em micro
  // caps muted abaixo da imagem para ajudar comparativo.
  lado: 'frente' | 'costas' | 'lado';
}

export interface SliderFotosProps {
  // Lista completa de fotos disponiveis. Caller agrega a partir de
  // todas as medidas e passa em ordem cronologica asc (mais antiga
  // primeiro).
  fotos: FotoMedida[];
  // Largura disponível total. Cada lado fica com (largura -
  // gap)/2.
  largura: number;
}

// Formata YYYY-MM-DD em DD/MM/YYYY para exibicao.
function formatarDataBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Datas unicas extraidas das fotos, em ordem asc.
function extrairDatasUnicas(fotos: FotoMedida[]): string[] {
  const setData = new Set<string>();
  for (const f of fotos) setData.add(f.data);
  return Array.from(setData).sort();
}

interface DropdownDataProps {
  label: string;
  selecionada: string;
  opcoes: string[];
  onChange: (proxima: string) => void;
}

function DropdownData({
  label,
  selecionada,
  opcoes,
  onChange,
}: DropdownDataProps): ReactNode {
  const [aberto, setAberto] = useState(false);

  const handleAbrir = useCallback(() => {
    haptics.selection();
    setAberto((s) => !s);
  }, []);

  const handleEscolher = useCallback(
    (proxima: string) => {
      haptics.selection();
      onChange(proxima);
      setAberto(false);
    },
    [onChange]
  );

  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          color: colors.mutedDecor,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 10,
          lineHeight: 14,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={handleAbrir}
        accessibilityRole="button"
        accessibilityLabel={`escolher data ${label}`}
        accessibilityState={{ expanded: aberto }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.bgAlt,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: aberto ? colors.purple : colors.bgElev,
          paddingHorizontal: spacing.sm,
          paddingVertical: 8,
          gap: spacing.xs,
        }}
      >
        <Text
          style={{
            color: colors.cyan,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 12,
            lineHeight: 16,
          }}
          numberOfLines={1}
        >
          {formatarDataBR(selecionada)}
        </Text>
        <ChevronDown
          size={14}
          color={colors.muted}
          strokeWidth={1.6}
        />
      </Pressable>
      {aberto ? (
        <View
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.bgElev,
            paddingVertical: 4,
            gap: 0,
          }}
        >
          {opcoes.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => handleEscolher(opt)}
              accessibilityRole="button"
              accessibilityLabel={`data ${opt}`}
              accessibilityState={{ selected: opt === selecionada }}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color:
                    opt === selecionada ? colors.purple : colors.fg,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {formatarDataBR(opt)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface LadoComparativoProps {
  label: string;
  dataSelecionada: string | null;
  fotos: FotoMedida[];
  todasDatas: string[];
  onChange: (proxima: string) => void;
  largura: number;
}

function LadoComparativo({
  label,
  dataSelecionada,
  fotos,
  todasDatas,
  onChange,
  largura,
}: LadoComparativoProps): ReactNode {
  // Foto correspondente a data selecionada (primeira que casa). Se
  // não houver, mostra placeholder.
  const fotoSelecionada =
    dataSelecionada !== null
      ? fotos.find((f) => f.data === dataSelecionada) ?? null
      : null;

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      {dataSelecionada !== null ? (
        <DropdownData
          label={label}
          selecionada={dataSelecionada}
          opcoes={todasDatas}
          onChange={onChange}
        />
      ) : (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 10,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {label}
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
              paddingHorizontal: spacing.sm,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              —
            </Text>
          </View>
        </View>
      )}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={springs.default}
        key={fotoSelecionada?.uri ?? 'vazia'}
        style={{
          width: largura,
          height: largura,
          backgroundColor: colors.bgElev,
          borderRadius: 12,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {fotoSelecionada ? (
          <Image
            source={{ uri: fotoSelecionada.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessibilityLabel={`foto medida ${fotoSelecionada.data}`}
          />
        ) : (
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 16,
            }}
          >
            Sem foto
          </Text>
        )}
      </MotiView>
      {fotoSelecionada ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 10,
            lineHeight: 14,
            textTransform: 'uppercase',
            letterSpacing: 1,
            textAlign: 'center',
          }}
        >
          {fotoSelecionada.lado}
        </Text>
      ) : null}
    </View>
  );
}

export function SliderFotos({ fotos, largura }: SliderFotosProps) {
  // Memoiza extracao de datas para evitar identidade nova a cada
  // render (e portanto loop em useEffect).
  const datas = useMemo(() => extrairDatasUnicas(fotos), [fotos]);
  const primeira = datas.length > 0 ? datas[0] : null;
  const ultima = datas.length > 0 ? datas[datas.length - 1] : null;

  const [esq, setEsq] = useState<string | null>(primeira);
  const [dir, setDir] = useState<string | null>(ultima);

  // Quando o conjunto de datas muda (caller recarregou), reposiciona
  // selecao se o valor atual não existe mais. Usa useEffect para
  // evitar setState durante render. Dependencia em primeira/ultima
  // garante reset após hot reload.
  useEffect(() => {
    if (datas.length === 0) {
      setEsq(null);
      setDir(null);
      return;
    }
    setEsq((atual) =>
      atual !== null && datas.includes(atual) ? atual : datas[0]
    );
    setDir((atual) =>
      atual !== null && datas.includes(atual)
        ? atual
        : datas[datas.length - 1]
    );
  }, [datas]);

  if (datas.length === 0) {
    return (
      <View
        accessibilityLabel="sem fotos para comparar"
        style={{
          paddingVertical: spacing.xl,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
          }}
        >
          Sem fotos para comparar.
        </Text>
      </View>
    );
  }

  // Largura útil de cada lado: total - gap entre eles.
  const ladoLargura = Math.max(
    0,
    Math.floor((largura - spacing.sm) / 2)
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
      }}
      accessibilityLabel="comparativo de fotos"
    >
      <LadoComparativo
        label="Antes"
        dataSelecionada={esq}
        fotos={fotos}
        todasDatas={datas}
        onChange={setEsq}
        largura={ladoLargura}
      />
      <LadoComparativo
        label="Depois"
        dataSelecionada={dir}
        fotos={fotos}
        todasDatas={datas}
        onChange={setDir}
        largura={ladoLargura}
      />
    </View>
  );
}
