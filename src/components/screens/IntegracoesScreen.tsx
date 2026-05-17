// Tela /integracoes (R-INT-1, 2026-05-16) -- hub canonico de
// integracoes externas. Substitui a entrada unica de Health Connect
// (Q17, /settings/integracoes) por um agregador que expoe os
// servicos suportados em um so lugar.
//
// Cards renderizados:
//   1. Saude Fisica (Health Connect Android) -- detalhe completo em
//      /settings/integracoes (mantido para retrocompat e pra concentrar
//      o fluxo de permissoes).
//   2. Agenda (Google Calendar) -- detalhe em /settings/contas-google
//      (gerencia OAuth pessoa_a/pessoa_b). Last sync = max(ultimaConexao)
//      entre as duas contas.
//   3. Spotify (placeholder) -- R-INT-4 futura, "Em breve".
//   4. YouTube (placeholder) -- R-INT-4 futura, "Em breve".
//   5. Google Drive (placeholder) -- futura, "Em breve".
//
// Cada card mostra:
//   - Icone e nome canonico (PT-BR com acento)
//   - Estado: Conectado / Desconectado / Em breve
//   - Ultima sincronizacao em texto humano (reusa descreverDelta)
//   - Tap navega para a tela de detalhe (HC, Google) ou e desabilitado
//     com badge "Em breve" para placeholders.
//
// Decisao R-INT-1: NAO recriamos a logica OAuth nem o flow HC aqui.
// Hub e read-only sobre os stores existentes; navegacao para detalhe
// preserva todo o codigo entregue em Q17 e Q22.B.
//
// Comentarios sem acento (convencao shell/CI). Strings PT-BR sentence
// case com acentuacao. accessibilityLabel sem acento.
import { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  Calendar,
  Cloud,
  Music,
  Video,
  type LucideProps,
} from '@/lib/icons';
import { Header, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useGoogleAuth } from '@/lib/stores/googleAuth';
import { useSettings } from '@/lib/stores/settings';
import { verificarDisponibilidade } from '@/lib/health/availability';
import { listarPermissoesConcedidas } from '@/lib/health/permissions';
import type { ComponentType } from 'react';

export type EstadoIntegracao =
  | 'conectado'
  | 'desconectado'
  | 'indisponivel'
  | 'em_breve';

interface IntegracaoDescritor {
  // Slug ASCII para accessibilityLabel e key.
  slug: string;
  // Nome canonico exibido (PT-BR com acento).
  nome: string;
  // Icone do lucide shim.
  icone: ComponentType<LucideProps>;
  // Cor de destaque do icone.
  corIcone: string;
  // Estado computado.
  estado: EstadoIntegracao;
  // Texto de status (linha 2 do card). Ja em PT-BR sentence case.
  statusTexto: string;
  // Rota destino. null quando placeholder ('em_breve').
  rota: string | null;
}

interface CardIntegracaoProps {
  descritor: IntegracaoDescritor;
  onPress: () => void;
}

function CardIntegracao({ descritor, onPress }: CardIntegracaoProps) {
  const { icone: Icon, nome, corIcone, estado, statusTexto } = descritor;
  const desabilitado = estado === 'em_breve' || estado === 'indisponivel';

  // Rotulo curto do estado para o badge / chip.
  const rotuloEstado: Record<EstadoIntegracao, string> = {
    conectado: 'Conectado',
    desconectado: 'Desconectado',
    indisponivel: 'Indisponível',
    em_breve: 'Em breve',
  };
  // Cor do rotulo de estado:
  // - conectado    -> verde
  // - desconectado -> muted (neutro, evita alarmismo)
  // - indisponivel -> mutedDecor
  // - em_breve     -> mutedDecor
  const corEstado: Record<EstadoIntegracao, string> = {
    conectado: colors.green,
    desconectado: colors.muted,
    indisponivel: colors.mutedDecor,
    em_breve: colors.mutedDecor,
  };

  return (
    <Pressable
      onPress={() => {
        if (desabilitado) return;
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`card integracao ${descritor.slug}`}
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.bgElev,
        opacity: desabilitado ? 0.6 : 1,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Icon size={20} color={corIcone} strokeWidth={1.75} />
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
            lineHeight: 24,
            flex: 1,
          }}
        >
          {nome}
        </Text>
        <Text
          style={{
            color: corEstado[estado],
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.micro.size,
            lineHeight: 18,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
          accessibilityLabel={`estado ${descritor.slug} ${estado}`}
        >
          {rotuloEstado[estado]}
        </Text>
      </View>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {statusTexto}
      </Text>
    </Pressable>
  );
}

// Texto humano para "Última sincronizacao". Calculo manual em
// thresholds proximos a descreverDelta de syncStatus.ts (60s, 30min,
// 6h) pra manter consistencia visual com o CardStatus do Settings.
// Independente daquele util porque a copy ali diz "Atualizado" e
// aqui dizemos "Sincronizado".
function textoUltimaSync(epochMs: number | null): string {
  if (epochMs === null || epochMs <= 0) return 'Nunca sincronizado.';
  const d = new Date(epochMs);
  const delta = Date.now() - d.getTime();
  if (delta < 60 * 1000) return 'Sincronizado agora mesmo.';
  if (delta < 30 * 60 * 1000) {
    const min = Math.floor(delta / (60 * 1000));
    return `Sincronizado há ${min} min.`;
  }
  if (delta < 6 * 60 * 60 * 1000) {
    const h = Math.floor(delta / (60 * 60 * 1000));
    return `Sincronizado há ${h}h.`;
  }
  if (delta < 24 * 60 * 60 * 1000) {
    const h = Math.floor(delta / (60 * 60 * 1000));
    return `Última sincronização há ${h}h.`;
  }
  const dias = Math.floor(delta / (24 * 60 * 60 * 1000));
  if (dias === 1) return 'Última sincronização ontem.';
  return `Última sincronização há ${dias} dias.`;
}

export function IntegracoesScreen() {
  const router = useRouter();
  // Estado de Health Connect: lazy probe do SDK + ler quantos tipos
  // estao concedidos. Roda uma vez no mount (idempotente; o detalhe
  // /settings/integracoes refaz com mais profundidade).
  const [statusHC, setStatusHC] = useState<
    'available' | 'needs_update' | 'unavailable' | 'verificando'
  >('verificando');
  const [permissoesHC, setPermissoesHC] = useState<number>(0);
  // healthConnectSync e o toggle canonico do opt-in (Q17.c). Quando
  // ON significa que o usuario aceitou sync automatico ao salvar.
  const hcSyncToggle = useSettings((s) => s.featureToggles.healthConnectSync);
  // Estado das contas Google: pega max ultimaConexao das duas pessoas
  // para o "Última sincronizacao" do Calendar.
  const contas = useGoogleAuth((s) => s.contas);
  const pessoaA = contas.pessoa_a;
  const pessoaB = contas.pessoa_b;
  const contaAConectada =
    typeof pessoaA.accessToken === 'string' && pessoaA.accessToken.length > 0;
  const contaBConectada =
    typeof pessoaB.accessToken === 'string' && pessoaB.accessToken.length > 0;
  const algumGoogleConectado = contaAConectada || contaBConectada;
  const ultimaConexaoGoogle = Math.max(
    pessoaA.ultimaConexao ?? 0,
    pessoaB.ultimaConexao ?? 0
  );

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const s = await verificarDisponibilidade();
        if (cancelado) return;
        setStatusHC(s);
        if (s === 'available') {
          const lista = await listarPermissoesConcedidas();
          if (cancelado) return;
          setPermissoesHC(lista.length);
        }
      } catch {
        if (!cancelado) setStatusHC('unavailable');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Descritor Health Connect.
  // - estado:
  //   - permissoes > 0 -> conectado
  //   - status available, sem permissoes -> desconectado
  //   - status needs_update / unavailable -> indisponivel
  // - statusTexto: pequena explicacao.
  const descritorHC: IntegracaoDescritor = ((): IntegracaoDescritor => {
    if (statusHC === 'verificando') {
      return {
        slug: 'health_connect',
        nome: 'Saúde Física',
        icone: Activity,
        corIcone: colors.pink,
        estado: 'desconectado',
        statusTexto: 'Verificando disponibilidade…',
        rota: '/settings/integracoes',
      };
    }
    if (statusHC === 'unavailable') {
      return {
        slug: 'health_connect',
        nome: 'Saúde Física',
        icone: Activity,
        corIcone: colors.pink,
        estado: 'indisponivel',
        statusTexto: 'Conexão Saúde indisponível neste dispositivo.',
        rota: null,
      };
    }
    if (statusHC === 'needs_update') {
      return {
        slug: 'health_connect',
        nome: 'Saúde Física',
        icone: Activity,
        corIcone: colors.pink,
        estado: 'desconectado',
        statusTexto: 'Atualização da Conexão Saúde necessária.',
        rota: '/settings/integracoes',
      };
    }
    if (permissoesHC > 0) {
      const sufixo = hcSyncToggle ? ' (sync ligado)' : ' (sync desligado)';
      return {
        slug: 'health_connect',
        nome: 'Saúde Física',
        icone: Activity,
        corIcone: colors.pink,
        estado: 'conectado',
        statusTexto: `${permissoesHC} ${
          permissoesHC === 1 ? 'tipo conectado' : 'tipos conectados'
        }${sufixo}.`,
        rota: '/settings/integracoes',
      };
    }
    return {
      slug: 'health_connect',
      nome: 'Saúde Física',
      icone: Activity,
      corIcone: colors.pink,
      estado: 'desconectado',
      statusTexto: 'Toque para conectar à Conexão Saúde.',
      rota: '/settings/integracoes',
    };
  })();

  // Descritor Google Calendar.
  // Ultima sync = max(ultimaConexao_a, ultimaConexao_b).
  const descritorCalendar: IntegracaoDescritor = algumGoogleConectado
    ? {
        slug: 'google_calendar',
        nome: 'Agenda',
        icone: Calendar,
        corIcone: colors.cyan,
        estado: 'conectado',
        statusTexto: textoUltimaSync(
          ultimaConexaoGoogle > 0 ? ultimaConexaoGoogle : null
        ),
        rota: '/settings/contas-google',
      }
    : {
        slug: 'google_calendar',
        nome: 'Agenda',
        icone: Calendar,
        corIcone: colors.cyan,
        estado: 'desconectado',
        statusTexto: 'Toque para conectar uma conta Google.',
        rota: '/settings/contas-google',
      };

  // Placeholders R-INT-4 futura.
  const descritorSpotify: IntegracaoDescritor = {
    slug: 'spotify',
    nome: 'Spotify',
    icone: Music,
    corIcone: colors.green,
    estado: 'em_breve',
    statusTexto: 'Histórico de músicas no Recap.',
    rota: null,
  };
  const descritorYoutube: IntegracaoDescritor = {
    slug: 'youtube',
    nome: 'YouTube',
    icone: Video,
    corIcone: colors.red,
    estado: 'em_breve',
    statusTexto: 'Histórico de vídeos no Recap.',
    rota: null,
  };
  const descritorDrive: IntegracaoDescritor = {
    slug: 'google_drive',
    nome: 'Google Drive',
    icone: Cloud,
    corIcone: colors.yellow,
    estado: 'em_breve',
    statusTexto: 'Backup automático do Vault na nuvem.',
    rota: null,
  };

  const descritores: IntegracaoDescritor[] = [
    descritorHC,
    descritorCalendar,
    descritorSpotify,
    descritorYoutube,
    descritorDrive,
  ];

  const navegar = useCallback(
    (rota: string | null) => {
      if (rota === null) return;
      router.push(rota as Parameters<typeof router.push>[0]);
    },
    [router]
  );

  return (
    <Screen>
      <Header title="Integrações" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="lista integracoes"
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
            paddingBottom: spacing.sm,
          }}
        >
          Conecte serviços externos para enriquecer o Recap e o
          acompanhamento de saúde física.
        </Text>

        {descritores.map((d) => (
          <CardIntegracao
            key={d.slug}
            descritor={d}
            onPress={() => navegar(d.rota)}
          />
        ))}

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
            paddingTop: spacing.base,
            paddingHorizontal: spacing.base,
          }}
        >
          Novas integrações em sprints futuras.
        </Text>
      </ScrollView>
    </Screen>
  );
}

// Export-also nomeado para testes (mock direto da screen ao inves do
// app/integracoes wrapper). Tambem nomeado para alinhamento com outros
// screens em src/components/screens/ que exportam named.
export default IntegracoesScreen;
