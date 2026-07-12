// Preview enriquecido para URLs de Spotify e YouTube anexadas
// (R-MEDIA-1). Substitui o link cru por um cartao com thumbnail,
// titulo, autor e botao "Abrir externamente".
//
// Estados visuais:
//   - Loading: skeleton com cor de fundo do servico (verde Spotify,
//     vermelho/cinza YouTube) e icone tematico.
//   - Sucesso: thumbnail HTTPS do oEmbed + titulo + author_name +
//     CTA "Abrir externamente".
//   - Erro / offline (data === null): logo do servico + CTA "Abrir
//     externamente". Sem mensagem de erro para nao adicionar ruido --
//     o link continua acessivel.
//
// Detecta o servico via `detectarServico` (reusa logica do
// oembedClient). Para 'desconhecido' ou 'audio' o componente devolve
// null -- caller decide outro renderizador.
//
// Acessibilidade:
//   - accessibilityLabel sem acento (convencao screen reader, ver
//     regras de linguagem do projeto): "Abrir musica no Spotify" /
//     "Abrir video no YouTube".
//   - accessibilityRole "button" no CTA.
//
// Estetica (ADR-010):
//   - Sentence case nos textos visiveis.
//   - Espacamento generoso (padding 12, gap 8).
//   - Cores via tokens; cor do servico aplicada como acento.
//   - Sem emoji, sem exclamacao, sem gamificacao.
//
// Comentarios em PT-BR com acentuacao completa.
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink, Music, Play } from '@/lib/icons';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';
import { detectarServico } from '@/lib/midia/oembedClient';
import { obterOembed } from '@/lib/midia/oembedFetch';
import type { OembedData, ServicoMidia } from '@/lib/midia/oembedSchema';

interface Props {
  url: string;
}

interface ServicoVisual {
  cor: string;
  rotuloAbrir: string;
  // accessibilityLabel sem acento (screen reader).
  ariaAbrir: string;
}

function visualPara(servico: ServicoMidia): ServicoVisual | null {
  if (servico === 'spotify') {
    return {
      cor: colors.green,
      rotuloAbrir: 'Abrir no Spotify',
      ariaAbrir: 'Abrir musica no Spotify',
    };
  }
  if (servico === 'youtube') {
    return {
      cor: colors.red,
      rotuloAbrir: 'Abrir no YouTube',
      ariaAbrir: 'Abrir video no YouTube',
    };
  }
  return null;
}

export function MidiaPreviewSpotifyYoutube({ url }: Props) {
  // `servico` e `visual` derivam diretamente de `url`. Manter `url`
  // como unica dependencia do useEffect evita loop (objetos `visual`
  // recriados a cada render quebrariam a igualdade referencial).
  const servico = detectarServico(url);
  const visual = visualPara(servico);
  const suportado = visual !== null;

  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<OembedData | null>(null);

  useEffect(() => {
    if (!suportado) {
      setCarregando(false);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    void obterOembed(url).then((res) => {
      if (cancelado) return;
      setDados(res);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [url, suportado]);

  if (!visual) return null;

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        padding: spacing.md,
        gap: spacing.sm,
      }}
      accessibilityLabel={`preview ${servico}`}
    >
      {carregando ? (
        <Skeleton servico={servico} cor={visual.cor} />
      ) : dados ? (
        <Sucesso dados={dados} servico={servico} cor={visual.cor} />
      ) : (
        <Fallback servico={servico} cor={visual.cor} />
      )}

      <Pressable
        onPress={() => {
          haptics.light();
          void Linking.openURL(url);
        }}
        accessibilityRole="button"
        accessibilityLabel={visual.ariaAbrir}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.bg,
          borderRadius: 10,
        }}
      >
        <ExternalLink size={16} color={visual.cor} strokeWidth={1.5} />
        <Text
          style={{
            color: visual.cor,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {visual.rotuloAbrir}
        </Text>
      </Pressable>
    </View>
  );
}

function Skeleton({
  servico,
  cor,
}: {
  servico: ServicoMidia;
  cor: string;
}) {
  // Fundo translucido com a cor do servico (alpha 30%).
  const fundo = `${cor}26`;
  const Icone = servico === 'spotify' ? Music : Play;
  return (
    <View
      style={{
        backgroundColor: fundo,
        borderRadius: 10,
        minHeight: 96,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.base,
      }}
      accessibilityLabel="preview carregando"
    >
      <Icone size={28} color={cor} strokeWidth={1.5} />
    </View>
  );
}

function Sucesso({
  dados,
  servico,
  cor,
}: {
  dados: OembedData;
  servico: ServicoMidia;
  cor: string;
}) {
  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel={`preview ${servico} sucesso`}>
      <Image
        source={{ uri: dados.thumbnail_url }}
        style={{
          width: '100%',
          aspectRatio: 16 / 9,
          borderRadius: 10,
          backgroundColor: colors.bgElev,
        }}
        accessibilityLabel={`thumbnail ${servico}`}
      />
      <Text
        style={{
          color: colors.fg,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: '500',
        }}
        numberOfLines={2}
      >
        {dados.title}
      </Text>
      {dados.author_name ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 16,
          }}
          numberOfLines={1}
        >
          {dados.author_name}
        </Text>
      ) : null}
      {/* Acento sutil com a cor do servico no canto. Decorativo. */}
      <View
        style={{
          height: 2,
          width: 32,
          backgroundColor: cor,
          borderRadius: 1,
          opacity: 0.6,
        }}
      />
    </View>
  );
}

function Fallback({
  servico,
  cor,
}: {
  servico: ServicoMidia;
  cor: string;
}) {
  const fundo = `${cor}26`;
  const Icone = servico === 'spotify' ? Music : Play;
  const nomeServico = servico === 'spotify' ? 'Spotify' : 'YouTube';
  return (
    <View
      style={{
        backgroundColor: fundo,
        borderRadius: 10,
        minHeight: 96,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.base,
        gap: spacing.xs,
      }}
      accessibilityLabel={`preview ${servico} indisponivel`}
    >
      <Icone size={28} color={cor} strokeWidth={1.5} />
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          lineHeight: 16,
          textAlign: 'center',
        }}
      >
        {nomeServico}
      </Text>
    </View>
  );
}
