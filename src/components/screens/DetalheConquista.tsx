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
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ExternalLink, MapPin, X } from '@/lib/icons';
import { Image as ExpoImage } from 'react-native';
import { Screen, Header } from '@/components/ui';
import { CoverMidia } from '@/components/data/CoverMidia';
import { WaveformPreview } from '@/components/midia/WaveformPreview';
import { MidiaPreviewSpotifyYoutube } from '@/components/midia/MidiaPreviewSpotifyYoutube';
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
  const vaultRoot = useVault((s) => s.vaultRoot);
  // Q6 (Onda Q): foto fullscreen modal. Tap no cover quando midia.tipo
  // === 'foto' abre Modal nativo com Image em escala max. Tap em
  // qualquer lugar fecha. Sem libs novas (Modal e' do react-native).
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);
  const ehFoto = conquista.midiaPrincipal.tipo === 'foto';
  const fotoUri =
    ehFoto && vaultRoot
      ? `${vaultRoot.endsWith('/') ? vaultRoot.slice(0, -1) : vaultRoot}/${(conquista.midiaPrincipal as { path: string }).path}`
      : null;

  return (
    <View style={{ gap: 16, marginTop: 8 }}>
      <Pressable
        onPress={() => {
          if (ehFoto && fotoUri) {
            haptics.light();
            setFotoExpandida(fotoUri);
          }
        }}
        disabled={!ehFoto || !fotoUri}
        accessibilityRole={ehFoto ? 'imagebutton' : undefined}
        accessibilityLabel={ehFoto ? 'expandir foto em tela cheia' : undefined}
        style={{
          width: '100%',
          height: 240,
          backgroundColor: colors.bgAlt,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <CoverMidia midia={conquista.midiaPrincipal} />
      </Pressable>

      {/* Q6 (Onda Q): fullscreen viewer da foto via Modal nativo. */}
      <Modal
        visible={fotoExpandida !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoExpandida(null)}
      >
        <Pressable
          onPress={() => setFotoExpandida(null)}
          accessibilityRole="button"
          accessibilityLabel="fechar foto"
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.95)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {fotoExpandida ? (
            <ExpoImage
              source={{ uri: fotoExpandida }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              accessibilityLabel="foto da conquista em tela cheia"
            />
          ) : null}
          <View
            style={{
              position: 'absolute',
              top: 48,
              right: 24,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color={colors.fg} strokeWidth={1.8} />
          </View>
        </Pressable>
      </Modal>

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
    // R-MEDIA-1: substitui o link cru por preview enriquecido com
    // thumbnail/titulo/autor via oEmbed cacheado. Fallback offline
    // renderiza logo + CTA "Abrir externamente".
    return (
      <MidiaPreviewSpotifyYoutube
        url={`https://www.youtube.com/watch?v=${midia.video_id}`}
      />
    );
  }
  if (midia.tipo === 'spotify') {
    const url =
      midia.url_oembed ?? `https://open.spotify.com/track/${midia.track_id}`;
    return <MidiaPreviewSpotifyYoutube url={url} />;
  }
  if (midia.tipo === 'audio') {
    // Q6 (Onda Q): substituido o fallback "indisponivel" pelo player
    // real via WaveformPreview (expo-av Audio.Sound, play/pause +
    // duracao). WaveformPreview ja existia mas era usado so no
    // CoverMidia compacto; agora aparece como controle inline tambem
    // no detalhe da conquista. Resolve queixa "preciso conseguir
    // abrir a midia".
    return <WaveformPreview path={midia.path} duracaoSeg={midia.duracao_seg} />;
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
