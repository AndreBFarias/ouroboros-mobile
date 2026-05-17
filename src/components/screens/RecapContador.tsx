// Recap do Contador (R-RECAP-5, 2026-05-16). Componente reutilizavel
// que renderiza:
//   - Timeline vertical com cards de eventos (data, humor, descricao,
//     tags, indicador de midias).
//   - Slideshow basico de fotos (se houver alguma) acima da timeline.
//
// Reusa padrao visual de RecapSecao* (cyan/purple borda esquerda,
// JetBrains Mono, sentence case). Sem emoji, sem celebracao.
//
// Slideshow:
//   - Auto-avance de 4s por foto via setInterval simples (sem moti
//     no boot path -- A28 safe).
//   - Tap no slideshow pausa/retoma. Indicador de progresso via
//     dots discretos.
//   - Quando 0 fotos, slideshow nao e renderizado.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { Card } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import type { EventoContador } from '@/lib/schemas/evento_contador';
import type { MidiaFoto } from '@/lib/schemas/midia';

interface Props {
  eventos: EventoContador[];
  vaultRoot: string | null;
}

// Formata YYYY-MM-DD para "DD/MM/YYYY".
function formatData(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

// Extrai fotos de todos os eventos numa lista plana, ordenando por
// data desc (mesmo ja sendo o sort do hook).
function extrairFotos(eventos: EventoContador[]): MidiaFoto[] {
  const out: MidiaFoto[] = [];
  for (const evento of eventos) {
    for (const midia of evento.midias) {
      if (midia.tipo === 'foto') {
        out.push(midia);
      }
    }
  }
  return out;
}

// Conta total de midias por tipo para o indicador.
function contarMidias(evento: EventoContador): {
  fotos: number;
  audios: number;
  videos: number;
  links: number;
} {
  let fotos = 0;
  let audios = 0;
  let videos = 0;
  let links = 0;
  for (const m of evento.midias) {
    if (m.tipo === 'foto') fotos += 1;
    else if (m.tipo === 'audio') audios += 1;
    else if (m.tipo === 'spotify' || m.tipo === 'youtube') {
      // youtube tambem conta como video; spotify como link
      if (m.tipo === 'youtube') videos += 1;
      else links += 1;
    }
  }
  return { fotos, audios, videos, links };
}

function Slideshow({
  fotos,
  vaultRoot,
}: {
  fotos: MidiaFoto[];
  vaultRoot: string | null;
}) {
  const [indice, setIndice] = useState<number>(0);
  const [pausado, setPausado] = useState<boolean>(false);

  useEffect(() => {
    if (pausado || fotos.length <= 1) return;
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % fotos.length);
    }, 4000);
    return () => clearInterval(id);
  }, [pausado, fotos.length]);

  if (fotos.length === 0) return null;

  const fotoAtual = fotos[indice] ?? fotos[0];
  const uri =
    vaultRoot && fotoAtual
      ? `${vaultRoot.replace(/\/+$/, '')}/${fotoAtual.path.replace(/^\/+/, '')}`
      : null;

  return (
    <Pressable
      onPress={() => {
        void haptics.selection();
        setPausado((p) => !p);
      }}
      accessibilityRole="button"
      accessibilityLabel={pausado ? 'retomar slideshow' : 'pausar slideshow'}
      style={{
        height: 220,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.bgAlt,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel="foto do evento"
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
            }}
          >
            Foto indisponível
          </Text>
        </View>
      )}
      {/* Dots de progresso */}
      <View
        style={{
          position: 'absolute',
          bottom: 8,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {fotos.map((_, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === indice ? colors.fg : colors.mutedDecor,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}

export function RecapContador({ eventos, vaultRoot }: Props) {
  const fotos = useMemo(() => extrairFotos(eventos), [eventos]);

  if (eventos.length === 0) {
    return (
      <View
        accessibilityLabel="recap contador vazio"
        style={{ gap: spacing.sm }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          Nenhum evento registrado para este contador.
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="recap contador"
      style={{ gap: spacing.base }}
    >
      {fotos.length > 0 ? (
        <Slideshow fotos={fotos} vaultRoot={vaultRoot} />
      ) : null}

      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Eventos
      </Text>

      {eventos.map((evento) => {
        const contagem = contarMidias(evento);
        const totalMidias =
          contagem.fotos + contagem.audios + contagem.videos + contagem.links;
        return (
          <Card key={`${evento.contadorId}-${evento.data}-${evento.slug}`}>
            <View
              style={{
                borderLeftWidth: 2,
                borderLeftColor: colors.cyan,
                paddingLeft: spacing.base,
                gap: spacing.xs,
              }}
              accessibilityLabel={`evento ${evento.slug}`}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {formatData(evento.data)}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                  accessibilityLabel={`humor ${evento.humor} de 5`}
                >
                  {`Humor ${evento.humor}/5`}
                </Text>
              </View>

              {evento.descricao.trim().length > 0 ? (
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 13,
                    lineHeight: 20,
                  }}
                >
                  {evento.descricao}
                </Text>
              ) : null}

              {evento.tags.length > 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.xs,
                  }}
                  accessibilityLabel="tags do evento"
                >
                  {evento.tags.map((tag) => (
                    <Text
                      key={tag}
                      style={{
                        color: colors.mutedDecor,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 11,
                        lineHeight: 16,
                      }}
                    >
                      {`#${tag}`}
                    </Text>
                  ))}
                </View>
              ) : null}

              {totalMidias > 0 ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 11,
                    lineHeight: 16,
                  }}
                  accessibilityLabel={`${totalMidias} mídias anexadas`}
                >
                  {`${totalMidias} mídia${totalMidias === 1 ? '' : 's'}`}
                </Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}
