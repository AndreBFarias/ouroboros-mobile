// Aba Spotify do MidiaPicker (M07.x + R-INT-4-SPOTIFY-PICKER).
//
// Dois caminhos, escolhidos pelo estado da conta Spotify (modelo
// "Google Fotos"):
//
//   - Conectado: lista a biblioteca (recently-played + top-tracks via
//     listarFaixasParaPicker). Tocar uma faixa preenche a mesma
//     MidiaSpotify que o attach por URL produz. O input de URL fica
//     abaixo como alternativa.
//   - Desconectado: CTA "Conectar Spotify" (navega para a guia de
//     Integracoes) acima do input de URL atual.
//
// O fluxo de URL permanece intacto: extrai track_id via regex, dispara
// fetch unico do oEmbed publico (sem auth) para titulo/artista, emite
// via onAdd. Erros silenciosos: link invalido = micro caption red;
// oEmbed offline = persiste so com track_id.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, useToast } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { extractSpotifyTrackId } from '@/lib/midia/spotifyId';
import { fetchSpotifyOEmbed } from '@/lib/midia/spotifyOEmbed';
import { useSpotifyAuth } from '@/lib/integracoes/spotify/store';
import {
  listarFaixasParaPicker,
  type FaixaPicker,
} from '@/lib/integracoes/spotify/biblioteca';
import type { MidiaSpotify } from '@/lib/schemas/midia';

export interface MidiaSpotifyTabProps {
  // Caller recebe a midia montada e empurra para o array do picker.
  // Tab nao guarda historico: limpa o input apos adicionar.
  onAdd: (m: MidiaSpotify) => void;
  // Quando true, botao Adicionar fica desabilitado (cap atingido).
  desabilitado?: boolean;
}

// Converte uma faixa escolhida da biblioteca no mesmo shape MidiaSpotify
// que o attach por URL produz. titulo/artista opcionais respeitam o
// schema (so incluimos quando ha valor).
function faixaParaMidia(faixa: FaixaPicker): MidiaSpotify {
  return {
    tipo: 'spotify',
    track_id: faixa.track_id,
    ...(faixa.titulo ? { titulo: faixa.titulo } : {}),
    ...(faixa.artista ? { artista: faixa.artista } : {}),
  };
}

export function MidiaSpotifyTab({
  onAdd,
  desabilitado = false,
}: MidiaSpotifyTabProps) {
  const toast = useToast();
  const [link, setLink] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Estado da conta: conectado = token presente, nao marcado invalido.
  const conta = useSpotifyAuth((s) => s.conta);
  const conectado =
    typeof conta.accessToken === 'string' &&
    conta.accessToken.length > 0 &&
    !conta.invalido;

  // Lista da biblioteca. Carregada uma vez ao abrir a aba quando
  // conectado; sem token / erro -> lista vazia (cai no fallback URL).
  const [faixas, setFaixas] = useState<FaixaPicker[]>([]);
  const [carregandoLista, setCarregandoLista] = useState<boolean>(false);

  useEffect(() => {
    if (!conectado) {
      setFaixas([]);
      return;
    }
    let ativo = true;
    setCarregandoLista(true);
    void (async () => {
      const lista = await listarFaixasParaPicker();
      if (!ativo) return;
      setFaixas(lista);
      setCarregandoLista(false);
    })();
    return () => {
      ativo = false;
    };
  }, [conectado]);

  const escolherFaixa = useCallback(
    (faixa: FaixaPicker) => {
      if (desabilitado) return;
      haptics.light().catch(() => undefined);
      onAdd(faixaParaMidia(faixa));
      toast.show('Mídia adicionada.', 'success');
    },
    [desabilitado, onAdd, toast]
  );

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
      {conectado ? (
        <View style={{ gap: spacing.sm }} accessibilityLabel="biblioteca spotify">
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
            }}
          >
            Da sua biblioteca
          </Text>

          {carregandoLista ? (
            <View
              style={{ paddingVertical: spacing.base, alignItems: 'center' }}
              accessibilityLabel="carregando biblioteca spotify"
            >
              <ActivityIndicator color={colors.green} />
            </View>
          ) : faixas.length === 0 ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
              }}
              accessibilityLabel="biblioteca spotify vazia"
            >
              Nenhuma faixa recente encontrada. Cole o link abaixo.
            </Text>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {faixas.map((faixa) => (
                <Pressable
                  key={faixa.track_id}
                  onPress={() => escolherFaixa(faixa)}
                  disabled={desabilitado}
                  accessibilityRole="button"
                  accessibilityLabel={`faixa ${faixa.titulo}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.input,
                    backgroundColor: colors.bgAlt,
                    opacity: desabilitado ? 0.5 : 1,
                  }}
                >
                  {faixa.capa ? (
                    <Image
                      source={{ uri: faixa.capa }}
                      style={{ width: 40, height: 40, borderRadius: 6 }}
                      accessibilityLabel="capa do album"
                    />
                  ) : (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        backgroundColor: colors.bgElev,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.fg,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 13,
                      }}
                    >
                      {faixa.titulo}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.muted,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 11,
                      }}
                    >
                      {faixa.artista}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              marginTop: spacing.xs,
            }}
          >
            Ou cole um link
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
            }}
          >
            Conecte o Spotify para escolher da sua biblioteca.
          </Text>
          <Button
            variant="ghost"
            label="Conectar Spotify"
            onPress={() => {
              haptics.light().catch(() => undefined);
              router.push(
                '/settings/integracoes' as Parameters<typeof router.push>[0]
              );
            }}
            accessibilityLabel="conectar spotify"
          />
        </View>
      )}

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
