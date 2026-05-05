// Componente reusavel de selecao de midia (M07.x). Quatro abas
// (Spotify / YouTube / Foto / Áudio) renderizadas via Chip-tabs no
// topo; sub-tela ativa abaixo. Lista preview dos itens ja
// adicionados em grid 2 colunas com botao 'X' overlay para remover.
//
// Props:
//   value -- array atual de Midia[] (controlled).
//   onChange -- caller atualiza estado externo.
//   obrigatorio -- quando true e value.length === 0, mostra micro
//     caption red avisando que ao menos uma midia e necessaria.
//
// Cap: vem de useSettings.midia.capPorRegistro (default 4 em M00.5).
// Quando atingido, abas desabilitam botoes de adicao.
//
// Toggle: useSettings.midia.permitirAudio === false esconde a aba
// Áudio sem quebrar o picker (cliente que desligou audio nao deve
// ver opcao). Default true.
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Music, Video, Image as ImageIcon, Mic, X } from '@/lib/icons';
import { Chip } from '@/components/ui';
import { MidiaSpotifyTab } from '@/components/midia/MidiaSpotifyTab';
import { MidiaYoutubeTab } from '@/components/midia/MidiaYoutubeTab';
import { MidiaFotoTab } from '@/components/midia/MidiaFotoTab';
import { MidiaAudioTab } from '@/components/midia/MidiaAudioTab';
import { colors, radius, spacing } from '@/theme/tokens';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import { youtubeThumbnailUrl } from '@/lib/midia/youtubeId';
import type { Midia } from '@/lib/schemas/midia';

export type MidiaTabKey = 'spotify' | 'youtube' | 'foto' | 'audio';

export interface MidiaPickerProps {
  value: Midia[];
  onChange: (next: Midia[]) => void;
  obrigatorio?: boolean;
}

const THUMB_SIZE = 80;

// Concatena root SAF e path relativo para Image source quando a
// midia e foto (path comeca com 'assets/').
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Cor de fundo do tile placeholder por tipo. Usada quando nao ha
// thumbnail (Spotify offline, audio sem preview). Verde Dracula
// 30% para Spotify; cyan 25% para audio; vermelho suave para
// erro hipotetico.
function fundoTilePorTipo(tipo: Midia['tipo']): string {
  if (tipo === 'spotify') return colors.bgElev;
  if (tipo === 'audio') return colors.bgElev;
  return colors.bgElev;
}

// Icone por tipo no tile placeholder.
function IconePorTipo({ tipo }: { tipo: Midia['tipo'] }) {
  const cor =
    tipo === 'spotify'
      ? colors.green
      : tipo === 'youtube'
        ? colors.red
        : tipo === 'audio'
          ? colors.cyan
          : colors.purple;
  if (tipo === 'spotify') {
    return <Music size={28} color={cor} strokeWidth={1.5} />;
  }
  if (tipo === 'youtube') {
    return <Video size={28} color={cor} strokeWidth={1.5} />;
  }
  if (tipo === 'audio') {
    return <Mic size={28} color={cor} strokeWidth={1.5} />;
  }
  return <ImageIcon size={28} color={cor} strokeWidth={1.5} />;
}

// Renderiza um tile de preview unico. Foto vira <Image>; YouTube
// vira <Image> da thumbnail derivada do id; Spotify e audio viram
// placeholder com icone.
function TilePreview({
  midia,
  vaultRoot,
  onRemove,
  idx,
}: {
  midia: Midia;
  vaultRoot: string | null;
  onRemove: () => void;
  idx: number;
}) {
  const conteudo = (() => {
    if (midia.tipo === 'foto' && vaultRoot) {
      return (
        <Image
          source={{ uri: joinUri(vaultRoot, midia.path) }}
          style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
          resizeMode="cover"
          accessibilityLabel={`thumbnail foto ${idx + 1}`}
        />
      );
    }
    if (midia.tipo === 'youtube') {
      return (
        <Image
          source={{
            uri: midia.thumbnail_url ?? youtubeThumbnailUrl(midia.video_id),
          }}
          style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
          resizeMode="cover"
          accessibilityLabel={`thumbnail youtube ${idx + 1}`}
        />
      );
    }
    return (
      <View
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fundoTilePorTipo(midia.tipo),
        }}
        accessibilityLabel={`tile ${midia.tipo} ${idx + 1}`}
      >
        <IconePorTipo tipo={midia.tipo} />
      </View>
    );
  })();

  return (
    <View
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: radius.input,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: colors.bgElev,
      }}
    >
      {conteudo}
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel="remover midia"
        hitSlop={6}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.red,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} color={colors.bg} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

export function MidiaPicker({
  value,
  onChange,
  obrigatorio = false,
}: MidiaPickerProps) {
  const cap = useSettings((s) => s.midia.capPorRegistro);
  const permitirAudio = useSettings((s) => s.midia.permitirAudio);
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [aba, setAba] = useState<MidiaTabKey>('spotify');

  const cheio = value.length >= cap;

  // Adiciona midia respeitando o cap. Caller ja validou que o tipo
  // bate com a aba; aqui so empurra no array.
  const adicionar = (m: Midia) => {
    if (cheio) return;
    onChange([...value, m]);
  };

  const remover = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  // Lista de abas que aparecem. Audio so aparece se permitirAudio.
  const abas: { key: MidiaTabKey; label: string }[] = [
    { key: 'spotify', label: 'Spotify' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'foto', label: 'Foto' },
    ...(permitirAudio ? [{ key: 'audio' as MidiaTabKey, label: 'Áudio' }] : []),
  ];

  // Se a aba ativa for 'audio' e permitirAudio virar false em
  // tempo real, defaulta para spotify para nao renderizar tab
  // invisivel.
  const abaEfetiva: MidiaTabKey =
    aba === 'audio' && !permitirAudio ? 'spotify' : aba;

  return (
    <View
      style={{ gap: spacing.sm }}
      accessibilityLabel="midia picker"
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        Mídia
      </Text>

      {/* Chips de aba */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
        }}
        accessibilityLabel="seletor de aba midia"
      >
        {abas.map((a) => (
          <Chip
            key={a.key}
            label={a.label}
            accent="cyan"
            selected={abaEfetiva === a.key}
            onPress={() => setAba(a.key)}
          />
        ))}
      </View>

      {/* Sub-tela da aba ativa */}
      <View>
        {abaEfetiva === 'spotify' ? (
          <MidiaSpotifyTab
            onAdd={adicionar}
            desabilitado={cheio}
          />
        ) : null}
        {abaEfetiva === 'youtube' ? (
          <MidiaYoutubeTab
            onAdd={adicionar}
            desabilitado={cheio}
          />
        ) : null}
        {abaEfetiva === 'foto' ? (
          <MidiaFotoTab
            onAdd={adicionar}
            desabilitado={cheio}
          />
        ) : null}
        {abaEfetiva === 'audio' && permitirAudio ? (
          <MidiaAudioTab
            onAdd={adicionar}
            desabilitado={cheio}
          />
        ) : null}
      </View>

      {/* Preview grid dos itens adicionados */}
      {value.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
          accessibilityLabel="grid midias adicionadas"
        >
          {value.map((m, idx) => (
            <TilePreview
              key={`${m.tipo}-${idx}`}
              midia={m}
              vaultRoot={vaultRoot}
              onRemove={() => remover(idx)}
              idx={idx}
            />
          ))}
        </View>
      ) : null}

      {/* Caption red quando obrigatorio e vazio */}
      {obrigatorio && value.length === 0 ? (
        <Text
          style={{
            color: colors.red,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
          accessibilityLabel="aviso midia obrigatoria"
        >
          Adicione pelo menos uma mídia para conquista.
        </Text>
      ) : null}

      {cheio ? (
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
          accessibilityLabel="aviso cap atingido"
        >
          Limite de {cap} mídias atingido.
        </Text>
      ) : null}
    </View>
  );
}
