// Aba YouTube do MidiaPicker (M07.x). Layout: input "Cole o link do
// video" + botao "Adicionar". Extrai video_id via regex que aceita
// watch?v=, youtu.be/ e shorts/. Thumbnail derivada do id sem
// chamada de rede (CDN do YouTube serve hqdefault.jpg para qualquer
// video publico).
//
// Erro silencioso: link invalido = micro caption red abaixo do
// input. Reproducao do video fica fora do escopo M07.x; cover
// estatico e o suficiente para conquistas.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Input, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { extractYouTubeId, youtubeThumbnailUrl } from '@/lib/midia/youtubeId';
import type { MidiaYoutube } from '@/lib/schemas/midia';

export interface MidiaYoutubeTabProps {
  onAdd: (m: MidiaYoutube) => void;
  desabilitado?: boolean;
}

export function MidiaYoutubeTab({
  onAdd,
  desabilitado = false,
}: MidiaYoutubeTabProps) {
  const toast = useToast();
  const [link, setLink] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);

  const adicionar = () => {
    if (desabilitado) return;
    setErro(null);
    const videoId = extractYouTubeId(link);
    if (!videoId) {
      setErro('Link de YouTube inválido.');
      return;
    }
    const midia: MidiaYoutube = {
      tipo: 'youtube',
      video_id: videoId,
      thumbnail_url: youtubeThumbnailUrl(videoId),
    };
    haptics.light().catch(() => undefined);
    onAdd(midia);
    setLink('');
    toast.show('Mídia adicionada.', 'success');
  };

  return (
    <View
      style={{ gap: spacing.sm }}
      accessibilityLabel="aba youtube"
    >
      <Input
        label="Cole o link do vídeo"
        placeholder="https://youtube.com/watch?v=..."
        value={link}
        onChangeText={(v: string) => {
          setLink(v);
          if (erro) setErro(null);
        }}
        autoCapitalize="none"
        accessibilityLabel="campo link youtube"
      />
      {erro ? (
        <Text
          style={{
            color: colors.red,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
          accessibilityLabel="erro link youtube"
        >
          {erro}
        </Text>
      ) : null}
      <Button
        variant="primary"
        label="Adicionar"
        onPress={adicionar}
        disabled={desabilitado || link.trim().length === 0}
      />
    </View>
  );
}
