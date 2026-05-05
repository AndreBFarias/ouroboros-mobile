// Sub-tela de detalhe da conquista (M11.5). Recebe `id` (estável,
// formato `<origem>:<data>:<autor>`), busca a conquista correspondente
// no Vault e renderiza:
//   - Cover full width 16:9 (ou 4:3 quando áudio).
//   - Frase em fg, data em muted, lugar/bairro em cyan.
//   - Mídia interativa: link YouTube/Spotify (open external),
//     placeholder de áudio quando arquivo está ausente (decisão A5).
//
// Strings de UI em sentence case PT-BR com acentuação completa.
// Comentários em PT-BR com acentuação correta.
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { ExternalLink, FileX, MapPin } from '@/lib/icons';
import { Screen, Header } from '@/components/ui';
import { CoverMidia } from '@/components/data/CoverMidia';
import { lerConquistas } from '@/lib/conquistas/loader';
import { useVault } from '@/lib/stores/vault';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import type { Conquista } from '@/lib/conquistas/types';
import type { Midia } from '@/lib/schemas/midia';

interface DetalheConquistaProps {
  id: string;
  onVoltar?: () => void;
}

const MESES_LONGO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function formatarDataLonga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} de ${MESES_LONGO[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export function DetalheConquista({ id, onVoltar }: DetalheConquistaProps) {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [conquista, setConquista] = useState<Conquista | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!vaultRoot) {
        setLoading(false);
        return;
      }
      try {
        const { conquistas } = await lerConquistas(vaultRoot);
        if (cancelado) return;
        const achada = conquistas.find((c) => c.id === id) ?? null;
        setConquista(achada);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [vaultRoot, id]);

  return (
    <Screen>
      <Header title="Conquista" onBack={onVoltar} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {loading ? (
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginTop: 32,
              textAlign: 'center',
            }}
          >
            Carregando...
          </Text>
        ) : !conquista ? (
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginTop: 32,
              textAlign: 'center',
            }}
          >
            Conquista não encontrada.
          </Text>
        ) : (
          <Conteudo conquista={conquista} />
        )}
      </ScrollView>
    </Screen>
  );
}

function Conteudo({ conquista }: { conquista: Conquista }) {
  const dataLonga = formatarDataLonga(conquista.data);
  const lugar =
    conquista.bairro || conquista.lugar
      ? [conquista.bairro, conquista.lugar].filter(Boolean).join(' — ')
      : null;

  return (
    <View style={{ gap: 16, marginTop: 8 }}>
      <View
        style={{
          width: '100%',
          height: 240,
          backgroundColor: colors.bgAlt,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <CoverMidia midia={conquista.midiaPrincipal} />
      </View>

      <Text
        style={{
          color: colors.fg,
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {conquista.frase}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        {dataLonga}
      </Text>

      {lugar ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={14} color={colors.cyan} strokeWidth={1.5} />
          <Text
            style={{
              color: colors.cyan,
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {lugar}
          </Text>
        </View>
      ) : null}

      <MidiaInterativa midia={conquista.midiaPrincipal} />
    </View>
  );
}

function MidiaInterativa({ midia }: { midia: Midia }) {
  if (midia.tipo === 'youtube') {
    return (
      <LinkExterno
        rotulo="Abrir no YouTube"
        url={`https://www.youtube.com/watch?v=${midia.video_id}`}
      />
    );
  }
  if (midia.tipo === 'spotify') {
    const url =
      midia.url_oembed ?? `https://open.spotify.com/track/${midia.track_id}`;
    return <LinkExterno rotulo="Abrir no Spotify" url={url} />;
  }
  if (midia.tipo === 'audio') {
    // Decisão A5: detalhe verifica existência do arquivo via FileSystem
    // antes de mostrar player. Aqui mostramos a mensagem padrão de
    // áudio indisponível porque o player real fica para sub-sprint
    // dedicada (M11.5 entrega cover decorativo no card e mensagem de
    // fallback no detalhe).
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 12,
          backgroundColor: colors.bgAlt,
          borderRadius: 12,
        }}
      >
        <FileX size={18} color={colors.muted} strokeWidth={1.5} />
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 18,
            flex: 1,
          }}
        >
          Áudio não disponível neste dispositivo.
        </Text>
      </View>
    );
  }
  return null;
}

interface LinkExternoProps {
  rotulo: string;
  url: string;
}

function LinkExterno({ rotulo, url }: LinkExternoProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        void Linking.openURL(url);
      }}
      accessibilityRole="link"
      accessibilityLabel={`abrir ${rotulo}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
      }}
    >
      <ExternalLink size={18} color={colors.cyan} strokeWidth={1.5} />
      <Text
        style={{
          color: colors.cyan,
          fontSize: 13,
          lineHeight: 18,
          flex: 1,
        }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
