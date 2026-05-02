// Cover de mídia para cards do calendário (M11.5). Despacha por
// tipo:
//   - foto: <Image source={{ uri }}> com placeholder ImageOff em
//     erro (mídia órfã, decisão A5 do adendo).
//   - youtube: thumbnail HTTPS pública via youtubeThumbnailUrl.
//   - spotify: oEmbed cacheado (sem capa pública); fallback bonito
//     com fundo verde 30% + ícone Music + título quando disponível.
//   - audio: WaveformPreview decorativo determinístico (visual puro).
//
// Comentários em PT-BR com acentuação correta. Strings de UI em
// sentence case.
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { ImageOff, Music } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { youtubeThumbnailUrl } from '@/lib/midia/youtubeId';
import { getSpotifyOEmbedCached } from '@/lib/midia/spotifyOEmbedCache';
import { WaveformPreview } from '@/components/data/WaveformPreview';
import type { Midia } from '@/lib/schemas/midia';

interface CoverMidiaProps {
  midia: Midia;
  // Largura/altura em dp (cards do calendário usam 160 / 120).
  width?: number;
  height?: number;
}

export function CoverMidia({ midia, width, height }: CoverMidiaProps) {
  // Estado isolado para mídia órfã (foto que não carrega).
  const [erroFoto, setErroFoto] = useState(false);

  if (midia.tipo === 'foto') {
    if (erroFoto) {
      return (
        <PlaceholderImagemAusente width={width} height={height} />
      );
    }
    return (
      <Image
        source={{ uri: midia.path }}
        style={{
          width: width ?? '100%',
          height: height ?? '100%',
          backgroundColor: colors.bgElev,
        }}
        onError={() => setErroFoto(true)}
        accessibilityLabel="cover foto"
      />
    );
  }

  if (midia.tipo === 'youtube') {
    const url = youtubeThumbnailUrl(midia.video_id);
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: width ?? '100%',
          height: height ?? '100%',
          backgroundColor: colors.bgElev,
        }}
        accessibilityLabel="cover youtube"
      />
    );
  }

  if (midia.tipo === 'audio') {
    return (
      <WaveformPreview
        uri={midia.path}
        height={typeof height === 'number' ? height : undefined}
      />
    );
  }

  // Spotify — fallback bonito sempre presente; o título melhora
  // quando o cache do oEmbed retorna.
  return (
    <CoverSpotify midia={midia} width={width} height={height} />
  );
}

// Placeholder usado quando a foto não carrega (mídia órfã, decisão
// A5). Sem log de erro: arquivo deletado ou ainda sincronizando é
// estado esperado, não falha.
function PlaceholderImagemAusente({
  width,
  height,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <View
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        backgroundColor: colors.bgElev,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel="imagem indisponivel"
    >
      <ImageOff size={28} color={colors.muted} strokeWidth={1.5} />
    </View>
  );
}

interface CoverSpotifyProps {
  midia: Extract<Midia, { tipo: 'spotify' }>;
  width?: number;
  height?: number;
}

function CoverSpotify({ midia, width, height }: CoverSpotifyProps) {
  // Título inicial vem do meta salvo no Vault. Cache do oEmbed
  // enriquece caso o título seja vazio (compatibilidade com mídia
  // antiga gravada antes do M07.x).
  const [titulo, setTitulo] = useState<string | undefined>(midia.titulo);

  useEffect(() => {
    if (midia.titulo && midia.titulo.length > 0) return;
    if (!midia.url_oembed) return;
    let cancelado = false;
    void getSpotifyOEmbedCached(midia.url_oembed).then((res) => {
      if (cancelado) return;
      if (res.title) setTitulo(res.title);
    });
    return () => {
      cancelado = true;
    };
  }, [midia.titulo, midia.url_oembed]);

  // Fundo verde 30% (paleta Drácula). Cor literal apenas em tokens;
  // aqui montamos rgba diretamente via colors.green + alpha.
  const verdeFundo = `${colors.green}4D`;

  return (
    <View
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        backgroundColor: verdeFundo,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
      }}
      accessibilityLabel="cover spotify"
    >
      <Music size={32} color={colors.green} strokeWidth={1.5} />
      {titulo ? (
        <Text
          numberOfLines={2}
          style={{
            color: colors.fg,
            fontSize: 11,
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 14,
          }}
        >
          {titulo}
        </Text>
      ) : null}
    </View>
  );
}
