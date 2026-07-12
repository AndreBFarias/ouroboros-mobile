// Detalhe + edicao de Rotina de Treino (Q11.a). Carrega via lerRotina,
// pre-preenche FormRotina com dados existentes, regrava em onSubmit
// (sobrescrevendo o .md). Botao "Apagar" remove o arquivo via
// removerRotina (sessoes ja salvas continuam intactas — snapshot
// imutavel, decisao spec §4.5).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play } from '@/lib/icons';
import { Header, Screen, useToast } from '@/components/ui';
import {
  FormRotina,
  type FormRotinaSubmit,
} from '@/components/treino/FormRotina';
import { SugestaoAlarmeRotina } from '@/components/treino/SugestaoAlarmeRotina';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  escreverRotina,
  lerRotina,
  removerRotina,
  silenciarSugestaoRotina,
} from '@/lib/vault/rotina';
import { listarTreinos } from '@/lib/vault/treinos';
import { escreverAlarme } from '@/lib/vault/alarmes';
import { agendarAlarme } from '@/lib/services/alarmesNotificacoes';
import { RotinaSchema, type RotinaMeta } from '@/lib/schemas/rotina';
import { AlarmeSchema, type Alarme } from '@/lib/schemas/alarme';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';
import {
  calcularSilenciarAte,
  calcularSugestaoAlarmeRotina,
  estaSilenciado,
} from '@/lib/treino/inteligenciaTemporal';
import { comTimeout } from '@/lib/util/comTimeout';

export default function RotinaDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  const [rotina, setRotina] = useState<RotinaMeta | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);
  // R-ROT-1-D: sessoes da rotina alimentam o helper temporal. Lista
  // filtrada por rotina_slug; vazio quando rotina nao tem historico
  // suficiente (helper devolve sugerir=false).
  const [sessoes, setSessoes] = useState<TreinoSessao[]>([]);
  // R-ROT-1-D: latch para esconder banner localmente apos acao do
  // usuario (aceitar ou rejeitar) sem precisar reler do disco.
  const [sugestaoDispensada, setSugestaoDispensada] =
    useState<boolean>(false);

  const carregar = useCallback(async () => {
    if (!vaultRoot || !slugParam) {
      setRotina(null);
      setSessoes([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lida = await lerRotina(vaultRoot, slugParam);
      setRotina(lida);
      // R-ROT-1-D: lista todas as sessoes vinculadas a esta rotina.
      // Pasta inexistente => [] silenciosamente.
      const hist = await listarTreinos(vaultRoot, { rotina_slug: slugParam });
      setSessoes(hist);
      setSugestaoDispensada(false);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, slugParam]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSubmit = useCallback(
    async (dados: FormRotinaSubmit) => {
      if (!vaultRoot || !rotina || salvando) return;
      setSalvando(true);
      try {
        const proposto: RotinaMeta = {
          ...rotina,
          nome: dados.nome,
          descricao: dados.descricao,
          exercicios: dados.exercicios,
        };
        const parsed = RotinaSchema.safeParse(proposto);
        if (!parsed.success) {
          toast.show('Dados inválidos.', 'error');
          return;
        }
        await comTimeout(escreverRotina(vaultRoot, parsed.data));
        void haptics.light();
        toast.show('Rotina atualizada.', 'success');
        setRotina(parsed.data);
      } catch (e) {
        void haptics.error();
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [vaultRoot, rotina, salvando, toast]
  );

  const handleApagar = useCallback(async () => {
    if (!vaultRoot || !rotina) return;
    try {
      await comTimeout(removerRotina(vaultRoot, rotina.slug));
      void haptics.light();
      toast.show('Rotina removida.', 'success');
      router.back();
    } catch {
      void haptics.error();
      toast.show('Não foi possível remover.', 'error');
    }
  }, [vaultRoot, rotina, toast, router]);

  // Q22.C (2026-05-13): movido pra antes dos early returns. Antes
  // estava apos os "if (carregando) return" / "if (!rotina) return",
  // disparando "Rendered more hooks than during the previous render"
  // ao terminar o load — guard rotina + slug interno cobre o caso
  // onde rotina ainda nao chegou.
  const handleIniciarTreino = useCallback(() => {
    if (!rotina) return;
    void haptics.light();
    router.push({
      pathname: '/treinos/executar/[slug]',
      params: { slug: rotina.slug },
    });
  }, [rotina, router]);

  // R-ROT-1-D: avalia padrao horario apenas quando rotina carregada e
  // nao esta silenciada. useMemo evita recomputar a cada render.
  const sugestao = useMemo(() => {
    if (!rotina) return { sugerir: false as const };
    if (estaSilenciado(rotina.silenciar_sugestao_ate)) {
      return { sugerir: false as const };
    }
    return calcularSugestaoAlarmeRotina(sessoes, rotina.slug);
  }, [rotina, sessoes]);

  // R-ROT-1-D: aceitar -> cria alarme companion via writer canonico.
  // Slug deriva da rotina + sufixo '-alarme' para nao colidir com
  // alarmes pre-existentes. Recorrencia 'diaria' (mais provavel para
  // rotina recorrente); usuario pode editar depois em /alarmes/[slug].
  const handleAceitarSugestao = useCallback(async () => {
    if (!vaultRoot || !rotina || !sugestao.sugerir || !sugestao.hora) return;
    const slugAlarme = `rotina-${rotina.slug}-alarme`;
    const agoraIso = new Date().toISOString().replace('Z', '+00:00');
    const proposto: Alarme = {
      tipo: 'alarme',
      slug: slugAlarme,
      titulo: rotina.nome,
      horario: sugestao.hora,
      dias_semana: [],
      recorrencia: 'diaria',
      tag: 'treino',
      som: 'gentle',
      ativo: true,
      snooze_minutos: 5,
      criado_em: agoraIso,
      ultimo_disparo: null,
      notification_ids: [],
      snooze_id: null,
      historico_snoozes: [],
      silenciar_sugestao_ate: null,
    };
    const parsed = AlarmeSchema.safeParse(proposto);
    if (!parsed.success) {
      toast.show('Não foi possível montar o alarme.', 'error');
      return;
    }
    try {
      await comTimeout(escreverAlarme(vaultRoot, parsed.data, ''));
      // agendarAlarme idempotente em re-tentativa; falha de schedule
      // (sem permissao, cap atingido) nao quebra a criacao.
      await agendarAlarme(parsed.data).catch(() => undefined);
      void haptics.light();
      toast.show('Alarme criado.', 'success');
      setSugestaoDispensada(true);
    } catch (e) {
      void haptics.error();
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível criar o alarme: ${msg}`, 'error');
    }
  }, [vaultRoot, rotina, sugestao, toast]);

  // R-ROT-1-D: rejeitar -> silencia sugestao por 30 dias gravando
  // silenciar_sugestao_ate na propria rotina. Latch local esconde
  // banner imediatamente sem esperar reload.
  const handleRejeitarSugestao = useCallback(async () => {
    if (!vaultRoot || !rotina) return;
    const ate = calcularSilenciarAte();
    try {
      await comTimeout(silenciarSugestaoRotina(vaultRoot, rotina.slug, ate));
      setSugestaoDispensada(true);
      setRotina({ ...rotina, silenciar_sugestao_ate: ate });
    } catch {
      // No-op: feature opcional, nao deve quebrar fluxo.
      setSugestaoDispensada(true);
    }
  }, [vaultRoot, rotina]);

  if (carregando) {
    return (
      <Screen>
        <Header title="Rotina" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!rotina) {
    return (
      <Screen>
        <Header title="Rotina" onBack={() => router.back()} />
        <View style={{ flex: 1, paddingTop: spacing.huge }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            Rotina não encontrada.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title={rotina.nome}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={handleIniciarTreino}
            accessibilityRole="button"
            accessibilityLabel="iniciar treino"
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: 'rgba(80, 250, 123, 0.16)',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.green,
            }}
          >
            <Play size={14} color={colors.green} strokeWidth={1.75} />
            <Text
              style={{
                color: colors.green,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              Iniciar
            </Text>
          </Pressable>
        }
      />
      {sugestao.sugerir && !sugestaoDispensada && sugestao.hora && (
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.sm }}>
          <SugestaoAlarmeRotina
            nomeRotina={rotina.nome}
            motivo={sugestao.motivo ?? ''}
            hora={sugestao.hora}
            onAceitar={handleAceitarSugestao}
            onRejeitar={handleRejeitarSugestao}
          />
        </View>
      )}
      <FormRotina
        inicial={{
          nome: rotina.nome,
          descricao: rotina.descricao ?? '',
          exercicios: rotina.exercicios,
        }}
        onSubmit={handleSubmit}
        onCancelar={() => router.back()}
        onApagar={handleApagar}
        rotuloSalvar="Salvar alterações"
        salvando={salvando}
      />
    </Screen>
  );
}
