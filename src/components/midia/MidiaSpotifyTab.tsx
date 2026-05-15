// Aba Spotify do MidiaPicker (M07.x). Layout: input "Cole o link da
// musica" + botao "Adicionar". Ao adicionar, extrai track_id via
// regex, dispara fetch unico do oEmbed publico (sem auth) para
// pegar titulo e artista, e emite via onAdd. Sem rede recorrente.
//
// Erros silenciosos: link invalido = micro caption red abaixo do
// input; oEmbed offline = persiste so com track_id (caller mostra
// fallback bonito com cor verde Dracula no preview).
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Input, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { extractSpotifyTrackId } from '@/lib/midia/spotifyId';
import { fetchSpotifyOEmbed } from '@/lib/midia/spotifyOEmbed';
import type { MidiaSpotify } from '@/lib/schemas/midia';

export interface MidiaSpotifyTabProps {
  // Caller recebe a midia montada e empurra para o array do picker.
  // Tab nao guarda historico: limpa o input apos adicionar.
  onAdd: (m: MidiaSpotify) => void;
  // Quando true, botao Adicionar fica desabilitado (cap atingido).
  desabilitado?: boolean;
}

export function MidiaSpotifyTab({
  onAdd,
  desabilitado = false,
}: MidiaSpotifyTabProps) {
  const toast = useToast();
  const [link, setLink] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);

  const adicionar = async () => {
    if (desabilitado || carregando) return;
    setErro(null);
    const trackId = extractSpotifyTrackId(link);
    if (!trackId) {
      setErro('Link de Spotify inválido.');
      return;
    }

    setCarregando(true);
    // oEmbed enriquece com titulo e artista; falha = midia minima.
    const enriq = await fetchSpotifyOEmbed(link.trim());
    setCarregando(false);

    const midia: MidiaSpotify = {
      tipo: 'spotify',
      track_id: trackId,
      ...(enriq.title ? { titulo: enriq.title } : {}),
      ...(enriq.author_name ? { artista: enriq.author_name } : {}),
    };
    haptics.light().catch(() => undefined);
    onAdd(midia);
    setLink('');
    toast.show('Mídia adicionada.', 'success');
  };

  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="aba spotify">
      <Input
        label="Cole o link da música"
        placeholder="https://open.spotify.com/track/..."
        value={link}
        onChangeText={(v: string) => {
          setLink(v);
          if (erro) setErro(null);
        }}
        autoCapitalize="none"
        accessibilityLabel="campo link spotify"
      />
      {erro ? (
        <Text
          style={{
            color: colors.red,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
          accessibilityLabel="erro link spotify"
        >
          {erro}
        </Text>
      ) : null}
      <Button
        variant="primary"
        label={carregando ? 'Carregando…' : 'Adicionar'}
        onPress={adicionar}
        disabled={desabilitado || carregando || link.trim().length === 0}
      />
    </View>
  );
}
