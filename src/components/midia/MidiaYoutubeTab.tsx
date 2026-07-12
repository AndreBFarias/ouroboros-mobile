// Aba YouTube do MidiaPicker. Dois modos (modelo Google Fotos):
//
//   - Conectado (useYouTubeAuth com token valido): lista a biblioteca
//     do usuario (Liked + Watch Later via youtube/biblioteca.ts). Toque
//     em um video preenche a MidiaYoutube (video_id + titulo +
//     thumbnail_url). Um atalho "Colar link" abre o input de URL como
//     alternativa.
//   - Desconectado: input "Cole o link do video" (fluxo original) +
//     CTA "Conectar YouTube" que navega para a guia de Integracoes.
//
// O mapeamento video -> MidiaYoutube e unico (paraMidia), reaproveitado
// pelos dois caminhos. Reproducao do video fica fora de escopo; cover
// estatico e o suficiente para o recap.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, useToast } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { extractYouTubeId, youtubeThumbnailUrl } from '@/lib/midia/youtubeId';
import { useYouTubeAuth } from '@/lib/integracoes/youtube/store';
import {
  listarVideosParaPicker,
  type VideoPicker,
} from '@/lib/integracoes/youtube/biblioteca';
import type { MidiaYoutube } from '@/lib/schemas/midia';

export interface MidiaYoutubeTabProps {
  onAdd: (m: MidiaYoutube) => void;
  desabilitado?: boolean;
}

const LINHA_THUMB = 56;

// Monta a MidiaYoutube canonica a partir de um id + opcionais.
function paraMidia(
  videoId: string,
  titulo?: string,
  thumb?: string | null
): MidiaYoutube {
  return {
    tipo: 'youtube',
    video_id: videoId,
    ...(titulo ? { titulo } : {}),
    thumbnail_url: thumb ?? youtubeThumbnailUrl(videoId),
  };
}

export function MidiaYoutubeTab({
  onAdd,
  desabilitado = false,
}: MidiaYoutubeTabProps) {
  const toast = useToast();
  const router = useRouter();
  const conta = useYouTubeAuth((s) => s.conta);
  const refreshIfNeeded = useYouTubeAuth((s) => s.refreshIfNeeded);

  const conectado =
    typeof conta.accessToken === 'string' &&
    conta.accessToken.length > 0 &&
    !conta.invalido;

  const [link, setLink] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  // Quando conectado, o usuario pode alternar para o input de URL.
  const [usarLink, setUsarLink] = useState<boolean>(false);

  const [videos, setVideos] = useState<VideoPicker[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Carrega a biblioteca quando conectado. Refresh do token primeiro;
  // erro/sem token resulta em lista vazia (biblioteca.ts ja trata).
  useEffect(() => {
    let ativo = true;
    if (!conectado || usarLink) {
      return;
    }
    setCarregando(true);
    (async () => {
      const token = await refreshIfNeeded();
      const itens = await listarVideosParaPicker(token);
      if (ativo) {
        setVideos(itens);
        setCarregando(false);
      }
    })().catch(() => {
      if (ativo) {
        setVideos([]);
        setCarregando(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, [conectado, usarLink, refreshIfNeeded]);

  const adicionarPorLink = () => {
    if (desabilitado) return;
    setErro(null);
    const videoId = extractYouTubeId(link);
    if (!videoId) {
      setErro('Link de YouTube inválido.');
      return;
    }
    haptics.light().catch(() => undefined);
    onAdd(paraMidia(videoId));
    setLink('');
    toast.show('Mídia adicionada.', 'success');
  };

  const selecionar = (v: VideoPicker) => {
    if (desabilitado) return;
    haptics.light().catch(() => undefined);
    onAdd(paraMidia(v.video_id, v.titulo, v.thumb));
    toast.show('Mídia adicionada.', 'success');
  };

  const irParaIntegracoes = () => {
    router.push('/integracoes');
  };

  // Input de URL compartilhado entre o modo desconectado e o atalho
  // "Colar link" do modo conectado.
  const renderInputLink = () => (
    <View style={{ gap: spacing.sm }}>
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
        onPress={adicionarPorLink}
        disabled={desabilitado || link.trim().length === 0}
      />
    </View>
  );

  // ===== Desconectado: URL + CTA conectar =====
  if (!conectado) {
    return (
      <View style={{ gap: spacing.sm }} accessibilityLabel="aba youtube">
        {renderInputLink()}
        <Button
          variant="ghost"
          label="Conectar YouTube"
          onPress={irParaIntegracoes}
        />
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
          accessibilityLabel="dica conectar youtube"
        >
          Conecte o YouTube para escolher da sua biblioteca.
        </Text>
      </View>
    );
  }

  // ===== Conectado, modo "Colar link" =====
  if (usarLink) {
    return (
      <View style={{ gap: spacing.sm }} accessibilityLabel="aba youtube">
        {renderInputLink()}
        <Button
          variant="ghost"
          label="Ver minha biblioteca"
          onPress={() => setUsarLink(false)}
        />
      </View>
    );
  }

  // ===== Conectado, modo biblioteca (default) =====
  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="aba youtube">
      {carregando ? (
        <View
          style={{ paddingVertical: spacing.md, alignItems: 'center' }}
          accessibilityLabel="carregando biblioteca youtube"
        >
          <ActivityIndicator color={colors.red} />
        </View>
      ) : videos.length === 0 ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
          }}
          accessibilityLabel="biblioteca youtube vazia"
        >
          Nenhum vídeo na sua biblioteca. Cole um link.
        </Text>
      ) : (
        <ScrollView
          style={{ maxHeight: 280 }}
          accessibilityLabel="lista biblioteca youtube"
        >
          <View style={{ gap: spacing.xs }}>
            {videos.map((v) => (
              <Pressable
                key={v.video_id}
                onPress={() => selecionar(v)}
                disabled={desabilitado}
                accessibilityRole="button"
                accessibilityLabel={`selecionar video ${v.titulo}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.xs,
                  borderRadius: radius.input,
                  backgroundColor: colors.bgElev,
                  opacity: desabilitado ? 0.5 : 1,
                }}
              >
                <Image
                  source={{
                    uri: v.thumb ?? youtubeThumbnailUrl(v.video_id),
                  }}
                  style={{
                    width: LINHA_THUMB,
                    height: LINHA_THUMB,
                    borderRadius: radius.input,
                  }}
                  resizeMode="cover"
                  accessibilityLabel={`thumbnail ${v.titulo}`}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.fg,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 13,
                    }}
                  >
                    {v.titulo}
                  </Text>
                  {v.canal ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.muted,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 11,
                      }}
                    >
                      {v.canal}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Button
        variant="ghost"
        label="Colar link"
        onPress={() => {
          setUsarLink(true);
          setErro(null);
        }}
      />
    </View>
  );
}
