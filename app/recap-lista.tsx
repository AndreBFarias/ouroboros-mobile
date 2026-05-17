// Q24.a (2026-05-13) -- Tela "lista detalhada por tipo" do Recap.
// Acessada via tap nos cards do grid Numeros (RecapSecaoNumeros).
// Recebe via query params: tipo (registros/treinos/fotos/eventos_pos/
// eventos_neg/tarefas), de (ISO date), ate (ISO date).
//
// Reusa useRecap pra carregar o periodo (sem cache, consistente com
// o resto do Recap) e filtra pela chave canonica. Cada item renderiza
// como Pressable que navega pra rota de edicao existente quando
// disponivel; senao mostra toast "Em breve" (Q24.a.b/c cobrem rotas
// que ainda nao existem: treinos detalhe, eventos detalhe).
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Screen, EmptyState, useToast } from '@/components/ui';
import { Activity } from '@/lib/icons';
import { useRecap, type PeriodoRange } from '@/lib/hooks/useRecap';
import { OuroborosLoader } from '@/components/brand';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';

type RecapListaTipo =
  | 'registros'
  | 'treinos'
  | 'fotos'
  | 'audios'
  | 'videos'
  | 'eventos_pos'
  | 'eventos_neg'
  | 'tarefas';

const ROTULO_POR_TIPO: Record<RecapListaTipo, string> = {
  registros: 'Registros',
  treinos: 'Treinos',
  fotos: 'Fotos',
  audios: 'Áudios',
  videos: 'Vídeos',
  eventos_pos: 'Eventos positivos',
  eventos_neg: 'Eventos difíceis',
  tarefas: 'Tarefas concluídas',
};

interface ItemRender {
  id: string;
  titulo: string;
  subtitulo: string | null;
  data: string;
  destino: { pathname: string; params?: Record<string, string> } | null;
}

const MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

function formatarData(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MESES_ABREV[d.getUTCMonth()] ?? ''} ${d.getUTCFullYear()}`;
}

function parseTipo(raw: string | string[] | undefined): RecapListaTipo {
  const t = Array.isArray(raw) ? raw[0] : raw;
  switch (t) {
    case 'treinos':
    case 'fotos':
    case 'audios':
    case 'videos':
    case 'eventos_pos':
    case 'eventos_neg':
    case 'tarefas':
      return t;
    default:
      return 'registros';
  }
}

function parseDate(raw: string | string[] | undefined, fallback: Date): Date {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string' || v.length === 0) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default function RecapListaTela() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    tipo?: string;
    de?: string;
    ate?: string;
  }>();

  const tipo = parseTipo(params.tipo);
  // R-RECAP-LISTA-FIX-LOOP (2026-05-17): mesmo padrao de bug do
  // R-RECAP-FIX-LOOP em /recap-memorias. `hoje = new Date()` e
  // `seteDiasAtras = new Date(...)` recalculados a cada render
  // produziam timestamps com ms ligeiramente diferentes; `range.de
  // .getTime()` mudava render-a-render e re-disparava o useEffect
  // interno do useRecap (setLoading -> re-render -> loop "Maximum
  // update depth"). Solucao: memoizar via strings primitivas
  // params.de/params.ate; fallbacks calculados dentro do useMemo
  // ficam estaveis enquanto as strings de entrada nao mudarem.
  const deString = Array.isArray(params.de) ? params.de[0] : params.de;
  const ateString = Array.isArray(params.ate) ? params.ate[0] : params.ate;
  const range: PeriodoRange = useMemo(() => {
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      de: parseDate(deString, seteDiasAtras),
      ate: parseDate(ateString, hoje),
    };
  }, [deString, ateString]);

  const { data, loading } = useRecap(range);

  // R-CROSS-FLOW-AUDIT (2026-05-16): tipo='fotos' no recap-lista nao tem
  // dado direto (numeros.fotos e' contagem). Redirect para /galeria com
  // filtro inicial 'foto' em vez de empty state. Q24.a.d original ficava
  // sem destino navegavel — redirect rosa cirurgicamente em vez de mostrar
  // "nenhum item neste periodo".
  //
  // R-RECAP-NUMEROS-AUDIOVIDEO-CARDS (2026-05-17): mesma logica aplicada a
  // tipo='audios' (-> /galeria?filtro=audio) e tipo='videos'
  // (-> /galeria?filtro=video). Cards extras do grid Numeros (R-CRIT-3
  // expos contadores no NumerosRecap; este sprint adicionou cards visuais
  // + handler de navegacao). Mantemos o redirect estilo R-CROSS-FLOW.
  useEffect(() => {
    if (tipo === 'fotos') {
      router.replace(
        '/galeria?filtro=foto' as Parameters<typeof router.replace>[0]
      );
    } else if (tipo === 'audios') {
      router.replace(
        '/galeria?filtro=audio' as Parameters<typeof router.replace>[0]
      );
    } else if (tipo === 'videos') {
      router.replace(
        '/galeria?filtro=video' as Parameters<typeof router.replace>[0]
      );
    }
  }, [tipo, router]);

  const itens: ItemRender[] = useMemo(() => {
    if (!data) return [];

    if (tipo === 'tarefas') {
      return data.tarefasConcluidas.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        subtitulo: t.categoria,
        data: t.feito_em,
        destino: { pathname: '/todo', params: { focus: t.id } },
      }));
    }

    if (tipo === 'treinos') {
      // numeros.treinos e' contagem; Q24.a.b puxa via listarTreinos.
      return [];
    }

    if (tipo === 'fotos' || tipo === 'audios' || tipo === 'videos') {
      // Sem dado direto de fotos/audios/videos no useRecap (sao
      // contagens agregadas). Para esses tipos o useEffect acima
      // faz router.replace para /galeria?filtro=<tipo>; este return
      // [] e' defensivo enquanto o replace nao toma efeito.
      return [];
    }

    if (tipo === 'eventos_pos') {
      return data.conquistas
        .filter((c) => c.origem === 'evento_positivo')
        .map((c) => ({
          id: c.id,
          titulo: c.frase,
          subtitulo: 'Evento',
          data: c.data,
          destino: null,
        }));
    }

    if (tipo === 'eventos_neg') {
      return data.crises.map((c) => ({
        id: c.id,
        titulo: c.frase,
        subtitulo:
          c.origem === 'diario_trigger' ? 'Diário (trigger)' : 'Evento',
        data: c.data,
        destino:
          c.origem === 'diario_trigger'
            ? { pathname: '/diario-emocional', params: { slug: c.id } }
            : null,
      }));
    }

    // 'registros' (default): humor + diario + marco
    const registros: ItemRender[] = [];
    for (const r of data.reflexoes) {
      registros.push({
        id: r.id,
        titulo: r.frase,
        subtitulo: 'Diário',
        data: r.data,
        destino: {
          pathname: '/diario-emocional',
          params: { slug: r.id },
        },
      });
    }
    for (const c of data.conquistas) {
      if (c.origem === 'marco' || c.origem === 'diario_vitoria') {
        const subtituloRegistro = c.origem === 'marco' ? 'Marco' : 'Vitória'; // anonimato-allow: categoria diario, nao nome real
        registros.push({
          id: c.id,
          titulo: c.frase,
          subtitulo: subtituloRegistro,
          data: c.data,
          destino:
            c.origem === 'marco'
              ? {
                  pathname: '/galeria/detalhe/[slug]',
                  params: { slug: c.id },
                }
              : { pathname: '/diario-emocional', params: { slug: c.id } },
        });
      }
    }
    registros.sort((a, b) => (a.data > b.data ? -1 : 1));
    return registros;
  }, [data, tipo]);

  const navegar = (item: ItemRender) => {
    if (!item.destino) {
      void haptics.selection();
      toast.show('Edição em breve.', 'info');
      return;
    }
    void haptics.light();
    router.push({
      pathname: item.destino.pathname as never,
      params: item.destino.params,
    });
  };

  return (
    <Screen>
      <Header title={ROTULO_POR_TIPO[tipo]} onBack={() => router.back()} />

      {loading ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <OuroborosLoader compacto />
        </View>
      ) : itens.length === 0 ? (
        <View style={{ paddingTop: spacing.huge }}>
          <EmptyState frase="Nenhum item neste período." Icon={Activity} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.base,
            paddingTop: spacing.base,
            paddingBottom: spacing.huge,
            gap: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
              marginBottom: spacing.xs,
            }}
          >
            {`${itens.length} ${itens.length === 1 ? 'item' : 'itens'} no período.`}
          </Text>

          {itens.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => navegar(item)}
              accessibilityRole="button"
              accessibilityLabel={`abrir ${item.titulo}`}
              style={{
                backgroundColor: colors.bgAlt,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.bgElev,
                padding: spacing.base,
                gap: 6,
              }}
            >
              {item.subtitulo ? (
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 10,
                    lineHeight: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {item.subtitulo}
                </Text>
              ) : null}
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 14,
                  lineHeight: 22,
                }}
                numberOfLines={2}
              >
                {item.titulo}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 16,
                }}
              >
                {formatarData(item.data)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
